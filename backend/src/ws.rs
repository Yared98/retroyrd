use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::json;
use tracing::{error, info, warn};

use crate::{
    db::chrono_or_now,
    fsm::FsmGuard,
    models::{ActionItem, BoardPhase, BoardStateSnapshot, Card, WsMessage},
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub token: Option<String>,
    pub session_id: Option<String>,
}

pub async fn ws_handler(
    Path(board_id): Path<String>,
    Query(query): Query<WsQuery>,
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, board_id, query, state))
}

async fn handle_socket(
    socket: WebSocket,
    board_id: String,
    query: WsQuery,
    state: AppState,
) {
    let raw_session = query
        .session_id
        .unwrap_or_else(|| ulid::Ulid::new().to_string());
    let session_hash = AppState::compute_session_hash(&board_id, &raw_session);

    let board = match state.db.get_board(&board_id) {
        Ok(Some(b)) => b,
        Ok(None) => {
            warn!("Tentativa de conexao em board inexistente: {}", board_id);
            return;
        }
        Err(e) => {
            error!("Erro ao buscar board: {}", e);
            return;
        }
    };

    let is_facilitator = query
        .token
        .as_ref()
        .map(|t| t == &board.facilitator_token)
        .unwrap_or(false);

    info!(
        board_id = %board_id,
        is_facilitator = is_facilitator,
        session_hash = %session_hash[0..8],
        "Cliente WebSocket conectado"
    );

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let room_sender = state.get_room_sender(&board_id);
    let mut room_receiver = room_sender.subscribe();

    // 1. Enviar estado inicial sincronizado (Snapshot)
    if let Ok(snapshot) = build_snapshot(&state, &board_id, &session_hash, is_facilitator) {
        let sync_msg = WsMessage {
            msg_type: "SYNC_STATE".to_string(),
            payload: json!(snapshot),
            timestamp: chrono_or_now(),
        };
        if let Ok(text) = serde_json::to_string(&sync_msg) {
            let _ = ws_sender.send(Message::Text(text.into())).await;
        }
    }

    // 2. Tarefa para receber mensagens do broadcast da sala e enviar para este cliente WebSocket
    // Inclui heartbeat ping a cada 30s para evitar timeout de inatividade em proxies reversos (ex: Cloudflare Tunnel)
    let session_hash_clone = session_hash.clone();
    let mut send_task = tokio::spawn(async move {
        let mut ping_interval = tokio::time::interval(std::time::Duration::from_secs(30));
        // O primeiro tick é disparado imediatamente, então podemos ignorar ou deixá-lo passar
        ping_interval.tick().await;

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    if ws_sender.send(Message::Ping(Default::default())).await.is_err() {
                        break;
                    }
                }
                recv_res = room_receiver.recv() => {
                    match recv_res {
                        Ok(msg) => {
                            // Filtrar ou mascarar no broadcast se for mensagem de cards e fase for BRAINSTORM
                            let final_msg = mask_message_for_recipient(&msg, &session_hash_clone);
                            if let Ok(text) = serde_json::to_string(&final_msg) {
                                if ws_sender.send(Message::Text(text.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                        Err(_) => break,
                    }
                }
            }
        }
    });

    // 3. Tarefa para receber mensagens do cliente WebSocket e processar
    let state_clone = state.clone();
    let board_id_clone = board_id.clone();
    let session_hash_for_recv = session_hash.clone();
    let room_sender_clone = room_sender.clone();

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            if let Message::Text(text) = msg {
                if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                    process_client_message(
                        ws_msg,
                        &state_clone,
                        &board_id_clone,
                        &session_hash_for_recv,
                        is_facilitator,
                        &room_sender_clone,
                    )
                    .await;
                }
            }
        }
    });

    // Se uma das tarefas finalizar, encerra a outra
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    info!(board_id = %board_id, "Cliente WebSocket desconectado");
}

fn mask_message_for_recipient(msg: &WsMessage, recipient_session_hash: &str) -> WsMessage {
    if msg.msg_type == "ROOM_STATE_UPDATED" {
        if let Ok(mut payload) = serde_json::from_value::<serde_json::Map<String, serde_json::Value>>(msg.payload.clone()) {
            let is_brainstorm = payload.get("board")
                .and_then(|b| b.get("phase"))
                .and_then(|p| p.as_str())
                == Some("BRAINSTORM");

            if is_brainstorm {
                if let Some(cards_val) = payload.get_mut("cards") {
                    if let Some(cards_arr) = cards_val.as_array_mut() {
                        for card_val in cards_arr {
                            let author = card_val.get("author_session_hash").and_then(|a| a.as_str()).unwrap_or("");
                            if author != recipient_session_hash {
                                if let Some(card_obj) = card_val.as_object_mut() {
                                    card_obj.insert("content".to_string(), serde_json::json!("••••••••"));
                                    card_obj.insert("is_masked".to_string(), serde_json::json!(true));
                                }
                            }
                        }
                    }
                }
            }

            // Injetar session_hash no snapshot para o cliente identificar suas próprias autorias
            payload.insert("session_hash".to_string(), serde_json::json!(recipient_session_hash));

            return WsMessage {
                msg_type: msg.msg_type.clone(),
                payload: serde_json::Value::Object(payload),
                timestamp: msg.timestamp,
            };
        }
    }

    if msg.msg_type == "CARD_CREATED" || msg.msg_type == "CARD_UPDATED" {
        if let Ok(mut card) = serde_json::from_value::<Card>(msg.payload.clone()) {
            if card.is_masked && card.author_session_hash != recipient_session_hash {
                card.content = "••••••••".to_string();
                return WsMessage {
                    msg_type: msg.msg_type.clone(),
                    payload: serde_json::json!(card),
                    timestamp: msg.timestamp,
                };
            }
        }
    }

    msg.clone()
}

pub fn build_snapshot(
    state: &AppState,
    board_id: &str,
    session_hash: &str,
    is_facilitator: bool,
) -> Result<BoardStateSnapshot, String> {
    let board = state
        .db
        .get_board(board_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Board not found".to_string())?;

    let columns = state.db.get_columns(board_id).map_err(|e| e.to_string())?;
    let mut cards = state.db.get_cards(board_id).map_err(|e| e.to_string())?;
    let action_items = state
        .db
        .get_action_items(board_id)
        .map_err(|e| e.to_string())?;
    let user_voted_card_ids = state
        .db
        .get_user_votes(board_id, session_hash)
        .unwrap_or_default();

    let safety_summary = if is_facilitator || board.phase != BoardPhase::SafetyCheck {
        state.db.get_safety_summary(board_id).ok()
    } else {
        None
    };

    // Aplicar mascaramento no modo cego (BRAINSTORM)
    if board.phase == BoardPhase::Brainstorm {
        for card in &mut cards {
            if card.author_session_hash != session_hash {
                card.content = "••••••••".to_string();
                card.is_masked = true;
            }
        }
    }

    Ok(BoardStateSnapshot {
        board,
        columns,
        cards,
        action_items,
        safety_summary,
        user_voted_card_ids,
        is_facilitator,
        session_hash: session_hash.to_string(),
    })
}

async fn process_client_message(
    msg: WsMessage,
    state: &AppState,
    board_id: &str,
    session_hash: &str,
    is_facilitator: bool,
    room_sender: &tokio::sync::broadcast::Sender<WsMessage>,
) {
    let board = match state.db.get_board(board_id) {
        Ok(Some(b)) => b,
        _ => return,
    };

    let now = chrono_or_now();

    match msg.msg_type.as_str() {
        "SAFETY_SUBMIT" => {
            if !FsmGuard::can_submit_safety(board.phase) {
                return;
            }
            if let Some(score) = msg.payload.get("score").and_then(|v| v.as_i64()) {
                if (1..=5).contains(&score) {
                    let _ = state.db.submit_safety_check(board_id, score as i32);
                    broadcast_sync_to_room(state, board_id, room_sender).await;
                }
            }
        }

        "CARD_CREATE" => {
            if !FsmGuard::can_create_card(board.phase) {
                return;
            }
            let col_id = msg.payload.get("column_id").and_then(|v| v.as_str());
            let content = msg.payload.get("content").and_then(|v| v.as_str());

            if let (Some(col_id), Some(content)) = (col_id, content) {
                let card = Card {
                    id: ulid::Ulid::new().to_string(),
                    column_id: col_id.to_string(),
                    board_id: board_id.to_string(),
                    content: content.trim().to_string(),
                    author_session_hash: session_hash.to_string(),
                    parent_card_id: None,
                    is_masked: board.phase == BoardPhase::Brainstorm,
                    is_ai_generated: false,
                    vote_count: 0,
                    reactions: Vec::new(),
                    created_at: now,
                };
                if state.db.create_card(&card).is_ok() {
                    broadcast_sync_to_room(state, board_id, room_sender).await;
                }
            }
        }

        "CARD_UPDATE" => {
            if !FsmGuard::can_edit_card(board.phase) {
                return;
            }
            let card_id = msg.payload.get("card_id").and_then(|v| v.as_str());
            let content = msg.payload.get("content").and_then(|v| v.as_str());

            if let (Some(cid), Some(content)) = (card_id, content) {
                let _ = state.db.update_card(cid, session_hash, content.trim());
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "CARD_DELETE" => {
            if !FsmGuard::can_delete_card(board.phase) {
                return;
            }
            if let Some(card_id) = msg.payload.get("card_id").and_then(|v| v.as_str()) {
                let _ = state.db.delete_card(card_id, session_hash);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "CARD_GROUP" => {
            if !FsmGuard::can_group_cards(board.phase) {
                return;
            }
            let parent_id = msg.payload.get("parent_card_id").and_then(|v| v.as_str());
            let child_ids = msg.payload.get("child_card_ids").and_then(|v| v.as_array());

            if let (Some(pid), Some(children)) = (parent_id, child_ids) {
                let ids: Vec<String> = children
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
                let _ = state.db.group_cards(pid, &ids);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "CARD_UNGROUP" => {
            if !FsmGuard::can_group_cards(board.phase) {
                return;
            }
            if let Some(card_id) = msg.payload.get("card_id").and_then(|v| v.as_str()) {
                let _ = state.db.ungroup_card(card_id);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "CARD_MOVE" => {
            if board.phase == BoardPhase::SafetyCheck || board.phase == BoardPhase::Archived {
                return;
            }
            let card_id = msg.payload.get("card_id").and_then(|v| v.as_str());
            let target_col = msg.payload.get("target_column_id").and_then(|v| v.as_str());
            if let (Some(cid), Some(col_id)) = (card_id, target_col) {
                let _ = state.db.move_card(cid, col_id);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "CARD_REACT" => {
            if board.phase == BoardPhase::SafetyCheck || board.phase == BoardPhase::Archived {
                return;
            }
            let card_id = msg.payload.get("card_id").and_then(|v| v.as_str());
            let emoji = msg.payload.get("emoji").and_then(|v| v.as_str());
            if let (Some(cid), Some(em)) = (card_id, emoji) {
                let _ = state.db.toggle_reaction(cid, em, session_hash);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "VOTE_TOGGLE" => {
            if !FsmGuard::can_vote(board.phase) {
                return;
            }
            if let Some(card_id) = msg.payload.get("card_id").and_then(|v| v.as_str()) {
                let _ = state.db.toggle_vote(board_id, card_id, session_hash);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "ACTION_CREATE" => {
            if !FsmGuard::can_manage_actions(board.phase) {
                return;
            }
            let description = msg.payload.get("description").and_then(|v| v.as_str());
            let owner = msg.payload.get("owner").and_then(|v| v.as_str());

            if let Some(desc) = description {
                let item = ActionItem {
                    id: ulid::Ulid::new().to_string(),
                    board_id: board_id.to_string(),
                    description: desc.trim().to_string(),
                    owner: owner.map(|o| o.to_string()),
                    is_ai_generated: false,
                    status: "TODO".to_string(),
                    created_at: now,
                };
                let _ = state.db.create_action_item(&item);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "ACTION_UPDATE" => {
            if !FsmGuard::can_manage_actions(board.phase) {
                return;
            }
            let id = msg.payload.get("id").and_then(|v| v.as_str());
            let status = msg.payload.get("status").and_then(|v| v.as_str());
            if let (Some(id), Some(st)) = (id, status) {
                let _ = state.db.update_action_item_status(id, st);
                broadcast_sync_to_room(state, board_id, room_sender).await;
            }
        }

        "PHASE_CHANGE" => {
            if !is_facilitator {
                warn!("Tentativa não autorizada de mudar fase do board {}", board_id);
                return;
            }
            let target_str = msg.payload.get("target_phase").and_then(|v| v.as_str());
            if let Some(t_str) = target_str {
                if let Some(target_phase) = BoardPhase::from_str(t_str) {
                    if FsmGuard::can_transition(board.phase, target_phase) {
                        if state.db.update_board_phase(board_id, target_phase).is_ok() {
                            info!(board_id = %board_id, from = ?board.phase, to = ?target_phase, "Fase alterada com sucesso");
                            broadcast_sync_to_room(state, board_id, room_sender).await;
                        }
                    }
                }
            }
        }

        "UPDATE_VOTE_LIMIT" => {
            if !is_facilitator {
                warn!("Tentativa não autorizada de atualizar limite de votos no board {}", board_id);
                return;
            }
            if let Some(limit) = msg.payload.get("limit").and_then(|v| v.as_i64()) {
                if state.db.update_vote_limit(board_id, limit as i32).is_ok() {
                    info!(board_id = %board_id, limit = limit, "Limite de votos atualizado");
                    broadcast_sync_to_room(state, board_id, room_sender).await;
                }
            }
        }

        "TIMER_CONTROL" => {
            if !is_facilitator {
                warn!("Tentativa não autorizada de controlar o timer no board {}", board_id);
                return;
            }
            let action = msg.payload.get("action").and_then(|v| v.as_str()).unwrap_or("");
            let now_ms = chrono_or_now();

            match action {
                "START" => {
                    let seconds = msg.payload.get("seconds").and_then(|v| v.as_i64()).map(|s| s as i32)
                        .unwrap_or(board.timer_seconds_remaining);
                    let ends_at = now_ms + (seconds as i64 * 1000);
                    let _ = state.db.update_timer(board_id, seconds, true, Some(ends_at));
                }
                "PAUSE" => {
                    let remaining = if let Some(ends_at) = board.timer_ends_at {
                        let diff = (ends_at - now_ms) / 1000;
                        if diff > 0 { diff as i32 } else { 0 }
                    } else {
                        board.timer_seconds_remaining
                    };
                    let _ = state.db.update_timer(board_id, remaining, false, None);
                }
                "ADD_SECONDS" => {
                    let add = msg.payload.get("seconds").and_then(|v| v.as_i64()).unwrap_or(60) as i32;
                    let current_left = if board.timer_is_running {
                        if let Some(ends_at) = board.timer_ends_at {
                            let diff = (ends_at - now_ms) / 1000;
                            if diff > 0 { diff as i32 } else { 0 }
                        } else {
                            board.timer_seconds_remaining
                        }
                    } else {
                        board.timer_seconds_remaining
                    };
                    let new_total = (current_left + add).max(0);
                    let ends_at = if board.timer_is_running {
                        Some(now_ms + (new_total as i64 * 1000))
                    } else {
                        None
                    };
                    let _ = state.db.update_timer(board_id, new_total, board.timer_is_running, ends_at);
                }
                "RESET" => {
                    let seconds = msg.payload.get("seconds").and_then(|v| v.as_i64()).unwrap_or(300) as i32;
                    let _ = state.db.update_timer(board_id, seconds, false, None);
                }
                _ => {}
            }
            broadcast_sync_to_room(state, board_id, room_sender).await;
        }

        _ => {}
    }
}

pub async fn broadcast_sync_to_room(
    state: &AppState,
    board_id: &str,
    room_sender: &tokio::sync::broadcast::Sender<WsMessage>,
) {
    let now = chrono_or_now();
    let board = match state.db.get_board(board_id) {
        Ok(Some(b)) => b,
        _ => return,
    };
    let columns = state.db.get_columns(board_id).unwrap_or_default();
    let cards = state.db.get_cards(board_id).unwrap_or_default();
    let action_items = state.db.get_action_items(board_id).unwrap_or_default();
    let safety_summary = state.db.get_safety_summary(board_id).ok();

    let msg = WsMessage {
        msg_type: "ROOM_STATE_UPDATED".to_string(),
        payload: json!({
            "board": board,
            "columns": columns,
            "cards": cards,
            "action_items": action_items,
            "safety_summary": safety_summary,
        }),
        timestamp: now,
    };

    let _ = room_sender.send(msg);
}
