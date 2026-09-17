use std::net::SocketAddr;
use std::path::PathBuf;
use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::info;

mod db;
mod fsm;
mod mcp;
mod models;
mod state;
mod ws;

use db::{chrono_or_now, Database};
use models::{Board, BoardPhase, CreateBoardRequest, CreateBoardResponse};
use state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .init();

    // Garantir pasta de persistência para o SQLite
    std::fs::create_dir_all("data").expect("Falha ao criar diretório data");
    let db_path = std::env::var("DATABASE_URL").unwrap_or_else(|_| "data/retro.db".to_string());
    
    let db = Database::new(&db_path).expect("Falha ao inicializar SQLite com WAL mode");
    let state = AppState::new(db);

    // Rotina periódica de auto-purge para higienização de boards antigos (Padrão: 60 dias)
    let retention_days: i64 = std::env::var("BOARD_RETENTION_DAYS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60);

    let cleanup_state = state.clone();
    tokio::spawn(async move {
        // Checar na inicialização e a cada 24 horas
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(24 * 3600));
        loop {
            interval.tick().await;
            match cleanup_state.db.cleanup_expired_boards(retention_days) {
                Ok(count) if count > 0 => {
                    tracing::info!(purged_boards = count, retention_days = retention_days, "Auto-purge: boards com mais de {} dias removidos com sucesso", retention_days);
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::warn!(error = %e, "Erro ao executar rotina de auto-purge de boards");
                }
            }
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Servir arquivos estáticos do frontend com fallback para index.html (suporte a SPA / F5 com 200 OK)
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let static_service = ServeDir::new(PathBuf::from(&static_dir))
        .fallback(get(spa_fallback));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/robots.txt", get(robots_txt_handler))
        .route("/api/config", get(client_config_handler))
        .route("/api/boards", post(create_board_handler))
        .route("/api/boards/{id}", get(get_board_handler))
        .route("/api/boards/{id}/export", get(export_board_handler))
        .route("/ws/board/{id}", get(ws::ws_handler))
        .route("/mcp", post(mcp::handle_mcp_request))
        .fallback_service(static_service)
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    info!("🚀 Retroyrd backend rodando em http://{}", addr);
    info!("🔗 WebSocket disponível em ws://{}/ws/board/{{board_id}}", addr);
    info!("🤖 Servidor MCP disponível em http://{}/mcp", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

async fn robots_txt_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/plain; charset=utf-8"),
            (header::HeaderName::from_static("x-robots-tag"), "noindex, nofollow, noarchive"),
        ],
        "# Bloqueio estrito de rastreadores e motores de busca\nUser-agent: *\nDisallow: /\n",
    )
}

#[derive(serde::Serialize)]
struct ClientConfig {
    umami_script_url: Option<String>,
    umami_website_id: Option<String>,
}

async fn client_config_handler() -> Json<ClientConfig> {
    Json(ClientConfig {
        umami_script_url: std::env::var("UMAMI_SCRIPT_URL").ok().filter(|s| !s.trim().is_empty()),
        umami_website_id: std::env::var("UMAMI_WEBSITE_ID").ok().filter(|s| !s.trim().is_empty()),
    })
}

async fn spa_fallback() -> impl IntoResponse {
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let index_file = PathBuf::from(&static_dir).join("index.html");
    match tokio::fs::read_to_string(index_file).await {
        Ok(html) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                (header::HeaderName::from_static("x-robots-tag"), "noindex, nofollow, noarchive"),
                (header::HeaderName::from_static("referrer-policy"), "no-referrer"),
            ],
            html,
        ).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "index.html não encontrado").into_response(),
    }
}

async fn create_board_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateBoardRequest>,
) -> Result<Json<CreateBoardResponse>, (StatusCode, String)> {
    let board_id = ulid::Ulid::new().to_string();
    let facilitator_token = ulid::Ulid::new().to_string();
    let now = chrono_or_now();

    let board = Board {
        id: board_id.clone(),
        title: if payload.title.trim().is_empty() {
            "Agile Retrospective".to_string()
        } else {
            payload.title.trim().to_string()
        },
        phase: BoardPhase::SafetyCheck,
        facilitator_token: facilitator_token.clone(),
        max_votes_per_user: payload.max_votes_per_user.unwrap_or(5),
        timer_seconds_remaining: 300,
        timer_is_running: false,
        timer_ends_at: None,
        created_at: now,
    };

    let default_cols = [
        ("Went Well", "#10B981"),
        ("To Improve", "#F43F5E"),
        ("Ideas & Kudos", "#06B6D4"),
    ];

    state
        .db
        .create_board(&board, &default_cols)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let invite_url = format!("/board/{}", board_id);

    info!(board_id = %board_id, title = %board.title, "Novo board criado");

    Ok(Json(CreateBoardResponse {
        id: board_id,
        title: board.title,
        facilitator_token,
        invite_url,
    }))
}

async fn get_board_handler(
    Path(board_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let board = state
        .db
        .get_board(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Board not found".to_string()))?;

    let columns = state
        .db
        .get_columns(&board_id)
        .unwrap_or_default();

    Ok(Json(serde_json::json!({
        "id": board.id,
        "title": board.title,
        "phase": board.phase,
        "created_at": board.created_at,
        "columns": columns,
    })))
}

async fn export_board_handler(
    Path(board_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let board = state
        .db
        .get_board(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Board not found".to_string()))?;

    let columns = state.db.get_columns(&board_id).unwrap_or_default();
    let cards = state.db.get_cards(&board_id).unwrap_or_default();
    let actions = state.db.get_action_items(&board_id).unwrap_or_default();
    let safety = state.db.get_safety_summary(&board_id).ok();

    let mut md = format!("# Retrospectiva: {}\n\n", board.title);
    md.push_str(&format!("* **Data**: {}\n", format_epoch_ms(board.created_at)));
    md.push_str(&format!("* **Fase Final**: {:?}\n", board.phase));
    if let Some(s) = safety {
        md.push_str(&format!("* **Safety Check (Média)**: {:.1} / 5.0 ({} votos)\n", s.average, s.count));
    }
    md.push_str("\n---\n\n");

    for col in columns {
        md.push_str(&format!("## {}\n\n", col.title));
        let top_cards: Vec<&crate::models::Card> = cards.iter().filter(|c| c.column_id == col.id && c.parent_card_id.is_none()).collect();
        if top_cards.is_empty() {
            md.push_str("_Nenhum card registrado._\n\n");
        } else {
            for c in top_cards {
                let ai_tag = if c.is_ai_generated { " [🤖 IA]" } else { "" };
                md.push_str(&format!("* {} (Votos: {}){}\n", c.content.replace('\n', " "), c.vote_count, ai_tag));
                
                let child_cards: Vec<&crate::models::Card> = cards.iter().filter(|child| child.parent_card_id == Some(c.id.clone())).collect();
                for child in child_cards {
                    let child_ai_tag = if child.is_ai_generated { " [🤖 IA]" } else { "" };
                    md.push_str(&format!("  * ↳ {}{}\n", child.content.replace('\n', " "), child_ai_tag));
                }
            }
            md.push('\n');
        }
    }

    md.push_str("## 🎯 Plano de Ação (Action Items)\n\n");
    if actions.is_empty() {
        md.push_str("_Nenhum plano de ação definido._\n");
    } else {
        for a in actions {
            let owner_str = a.owner.as_deref().unwrap_or("Não atribuído");
            let ai_tag = if a.is_ai_generated { " [🤖 Sugerido por IA via MCP]" } else { "" };
            md.push_str(&format!("- [{}] **{}** (Responsável: {}){}\n", if a.status == "DONE" { "x" } else { " " }, a.description, owner_str, ai_tag));
        }
    }

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/markdown; charset=utf-8".parse().unwrap());
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"retro-{}.md\"", board.id).parse().unwrap(),
    );

    Ok((headers, md))
}

fn format_epoch_ms(ms: i64) -> String {
    let secs = ms / 1000;
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let mut year = 1970;
    let mut days = days_since_epoch;
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if is_leap { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let days_in_month = [
        31, if is_leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ];
    let mut month = 1;
    for &dim in &days_in_month {
        if days < dim {
            break;
        }
        days -= dim;
        month += 1;
    }
    let day = days + 1;

    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02} UTC", year, month, day, hours, minutes, seconds)
}
