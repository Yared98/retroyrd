use axum::{
    extract::State,
    http::HeaderMap,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::info;

use crate::{
    db::chrono_or_now,
    fsm::FsmGuard,
    models::{ActionItem, BoardPhase, Card},
    state::AppState,
    ws::broadcast_sync_to_room,
};

#[derive(Debug, Deserialize)]
pub struct JsonRpcRequest {
    #[allow(dead_code)]
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

fn extract_facilitator_token(headers: &HeaderMap, args: &Value) -> Option<String> {
    if let Some(token) = args.get("facilitator_token").or_else(|| args.get("token")).and_then(|v| v.as_str()) {
        if !token.trim().is_empty() {
            return Some(token.trim().to_string());
        }
    }
    if let Some(auth) = headers.get("authorization").and_then(|v| v.to_str().ok()) {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            if !token.trim().is_empty() {
                return Some(token.trim().to_string());
            }
        }
    }
    if let Some(token) = headers.get("x-facilitator-token").and_then(|v| v.to_str().ok()) {
        if !token.trim().is_empty() {
            return Some(token.trim().to_string());
        }
    }
    None
}

pub async fn handle_mcp_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<JsonRpcRequest>,
) -> impl IntoResponse {
    let id = req.id.clone();
    let result = match req.method.as_str() {
        "initialize" => Ok(json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": { "subscribe": false, "listChanged": true },
                "tools": { "listChanged": true }
            },
            "serverInfo": {
                "name": "internal-retro-mcp",
                "version": "1.0.0"
            }
        })),

        "resources/list" => {
            Ok(json!({
                "resources": [
                    {
                        "uri": "retro://board/{board_id}/state",
                        "name": "Retrospective Board State",
                        "description": "Full structured snapshot of columns, cards, vote counts and action items. Supports ?token={facilitator_token} or Authorization: Bearer header for privileged access.",
                        "mimeType": "application/json"
                    },
                    {
                        "uri": "retro://board/{board_id}/metrics",
                        "name": "Retrospective Board Metrics",
                        "description": "Analytics, participation, Psychological Safety distribution and vote rankings. Supports ?token={facilitator_token} or Authorization: Bearer header.",
                        "mimeType": "application/json"
                    }
                ]
            }))
        }

        "resources/read" => {
            let uri = req.params.as_ref()
                .and_then(|p| p.get("uri"))
                .and_then(|u| u.as_str())
                .unwrap_or("");
            
            read_resource(&state, &headers, uri).await
        }

        "tools/list" => {
            Ok(json!({
                "tools": [
                    {
                        "name": "create_card",
                        "description": "Inserts a new card or action item into the retrospective board in real time. Can be created by participants or AI agents during the respective phases.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the retro board" },
                                "column_id": { "type": "string", "description": "Target column ID where the card will be added (optional for action items)" },
                                "content": { "type": "string", "description": "Content of the card or action item description" },
                                "is_action_item": { "type": "boolean", "description": "Whether this is an action item (Phase 5). Can be created collaboratively by team members or AI." },
                                "facilitator_token": { "type": "string", "description": "Optional facilitator access token (or via Authorization header)" }
                            },
                            "required": ["board_id", "content"]
                        }
                    },
                    {
                        "name": "group_cards",
                        "description": "Merges multiple semantically related cards under a parent card cluster during the GROUPING phase. Requires facilitator_token.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the retro board" },
                                "parent_card_id": { "type": "string", "description": "ID of the parent cluster card" },
                                "child_card_ids": { 
                                    "type": "array", 
                                    "items": { "type": "string" },
                                    "description": "List of card IDs to merge under the parent" 
                                },
                                "facilitator_token": { "type": "string", "description": "The facilitator access token of the retro board. Required (or via Authorization header)." }
                            },
                            "required": ["board_id", "parent_card_id", "child_card_ids"]
                        }
                    },
                    {
                        "name": "change_phase",
                        "description": "Advances or steps back the retrospective phase in the state machine (FSM). Requires facilitator_token.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the retro board" },
                                "target_phase": { 
                                    "type": "string", 
                                    "enum": ["SAFETY_CHECK", "BRAINSTORM", "GROUPING", "VOTING", "ACTION_ITEMS", "ARCHIVED"],
                                    "description": "Target phase to transition into" 
                                },
                                "facilitator_token": { "type": "string", "description": "The facilitator access token of the retro board. Required (or via Authorization header)." }
                            },
                            "required": ["board_id", "target_phase"]
                        }
                    }
                ]
            }))
        }

        "tools/call" => {
            let params = req.params.as_ref().cloned().unwrap_or(json!({}));
            call_tool(&state, &headers, params).await
        }

        _ => Err(JsonRpcError {
            code: -32601,
            message: format!("Method not found: {}", req.method),
            data: None,
        }),
    };

    match result {
        Ok(res) => Json(JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(res),
            error: None,
        }),
        Err(err) => Json(JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(err),
        }),
    }
}

async fn read_resource(state: &AppState, headers: &HeaderMap, uri: &str) -> Result<Value, JsonRpcError> {
    let clean_uri = uri.trim_start_matches("retro://");
    let (path_part, query_part) = match clean_uri.split_once('?') {
        Some((p, q)) => (p, Some(q)),
        None => (clean_uri, None),
    };

    let parts: Vec<&str> = path_part.split('/').collect();
    if parts.len() < 3 || parts[0] != "board" {
        return Err(JsonRpcError {
            code: -32602,
            message: "Invalid resource URI format. Expected: retro://board/{board_id}/{state|metrics}[?token={facilitator_token}]".to_string(),
            data: None,
        });
    }

    let board_id = parts[1];
    let resource_type = parts[2];

    let board = state.db.get_board(board_id)
        .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?
        .ok_or_else(|| JsonRpcError { code: -32004, message: "Board not found".to_string(), data: None })?;

    // Validar token da query string OU dos headers HTTP (Authorization: Bearer ou x-facilitator-token)
    let query_token = query_part.and_then(|q| {
        q.split('&').find_map(|pair| {
            let mut split = pair.split('=');
            let key = split.next()?;
            let val = split.next()?;
            if key == "token" || key == "facilitator_token" {
                Some(val.to_string())
            } else {
                None
            }
        })
    });

    let header_token = extract_facilitator_token(headers, &Value::Null);
    let provided_token = query_token.or(header_token);

    let is_facilitator = provided_token
        .as_deref()
        .map(|t| t == board.facilitator_token)
        .unwrap_or(false);

    match resource_type {
        "state" => {
            let columns = state.db.get_columns(board_id).unwrap_or_default();
            let mut cards = state.db.get_cards(board_id).unwrap_or_default();
            let action_items = state.db.get_action_items(board_id).unwrap_or_default();
            
            // Mascaramento de privacidade no modo cego (BRAINSTORM) caso o token de facilitador não seja fornecido
            if board.phase == BoardPhase::Brainstorm && !is_facilitator {
                for card in &mut cards {
                    card.content = "••••••••".to_string();
                    card.is_masked = true;
                }
            }

            // O sumário de segurança só é visível ao facilitador durante a fase SAFETY_CHECK
            let safety = if is_facilitator || board.phase != BoardPhase::SafetyCheck {
                state.db.get_safety_summary(board_id).ok()
            } else {
                None
            };

            let dump = json!({
                "board": board,
                "columns": columns,
                "cards": cards,
                "action_items": action_items,
                "safety_summary": safety,
                "is_facilitator": is_facilitator,
            });

            Ok(json!({
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": serde_json::to_string_pretty(&dump).unwrap_or_default()
                    }
                ]
            }))
        }

        "metrics" => {
            let safety = if is_facilitator || board.phase != BoardPhase::SafetyCheck {
                state.db.get_safety_summary(board_id).ok()
            } else {
                None
            };

            let cards = state.db.get_cards(board_id).unwrap_or_default();
            let mut top_cards = cards.clone();
            top_cards.sort_by(|a, b| b.vote_count.cmp(&a.vote_count));
            top_cards.truncate(5);

            if board.phase == BoardPhase::Brainstorm && !is_facilitator {
                for card in &mut top_cards {
                    card.content = "••••••••".to_string();
                    card.is_masked = true;
                }
            }

            let metrics = json!({
                "board_id": board_id,
                "title": board.title,
                "phase": board.phase,
                "total_cards": cards.len(),
                "safety_check": safety,
                "top_5_voted_cards": top_cards,
                "is_facilitator": is_facilitator,
            });

            Ok(json!({
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": serde_json::to_string_pretty(&metrics).unwrap_or_default()
                    }
                ]
            }))
        }

        _ => Err(JsonRpcError {
            code: -32602,
            message: format!("Unknown resource sub-type: {}", resource_type),
            data: None,
        }),
    }
}

async fn call_tool(state: &AppState, headers: &HeaderMap, params: Value) -> Result<Value, JsonRpcError> {
    let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let args = params.get("arguments").cloned().unwrap_or(json!({}));

    match name {
        "create_card" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).unwrap_or("");
            let content = args.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let is_action = args.get("is_action_item").and_then(|v| v.as_bool()).unwrap_or(false);
            let token = extract_facilitator_token(headers, &args);

            let board = state.db.get_board(board_id)
                .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?
                .ok_or_else(|| JsonRpcError { code: -32004, message: "Board not found".to_string(), data: None })?;

            if FsmGuard::is_read_only(board.phase) {
                return Err(JsonRpcError {
                    code: -32003,
                    message: "Board is archived. No mutations allowed.".to_string(),
                    data: None,
                });
            }

            let is_facilitator = token.as_deref().map(|t| t == board.facilitator_token).unwrap_or(false);
            let now = chrono_or_now();
            let room_sender = state.get_room_sender(board_id);

            if is_action || board.phase == BoardPhase::ActionItems {
                if !FsmGuard::can_manage_actions(board.phase) {
                    return Err(JsonRpcError {
                        code: -32003,
                        message: format!("Action items can only be created during ACTION_ITEMS phase. Current phase is: {:?}", board.phase),
                        data: None,
                    });
                }

                let item = ActionItem {
                    id: ulid::Ulid::new().to_string(),
                    board_id: board_id.to_string(),
                    description: format!("{} (Injetado por IA)", content),
                    owner: Some(if is_facilitator { "AI_FACILITATOR".to_string() } else { "AI_AGENT".to_string() }),
                    is_ai_generated: true,
                    status: "TODO".to_string(),
                    created_at: now,
                };
                state.db.create_action_item(&item)
                    .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?;
                broadcast_sync_to_room(state, board_id, &room_sender).await;

                info!(board_id = %board_id, is_facilitator = is_facilitator, "Action Item criado via MCP Tool");
                Ok(json!({
                    "content": [{
                        "type": "text",
                        "text": format!("Action Item '{}' created successfully via MCP.", item.description)
                    }]
                }))
            } else {
                if !FsmGuard::can_create_card(board.phase) {
                    return Err(JsonRpcError {
                        code: -32003,
                        message: format!("Cards can only be created during BRAINSTORM phase. Current phase is: {:?}", board.phase),
                        data: None,
                    });
                }

                let column_id = args.get("column_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| {
                        state.db.get_columns(board_id)
                            .ok()
                            .and_then(|cols| cols.first().map(|c| c.id.clone()))
                            .unwrap_or_default()
                    });

                let card = Card {
                    id: ulid::Ulid::new().to_string(),
                    column_id,
                    board_id: board_id.to_string(),
                    content: format!("{} (Gerado por IA)", content),
                    author_session_hash: if is_facilitator { "AI_FACILITATOR".to_string() } else { "AI_AGENT".to_string() },
                    parent_card_id: None,
                    is_masked: false,
                    is_ai_generated: true,
                    vote_count: 0,
                    reactions: Vec::new(),
                    created_at: now,
                };

                state.db.create_card(&card)
                    .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?;
                broadcast_sync_to_room(state, board_id, &room_sender).await;

                info!(board_id = %board_id, "Card criado via MCP Tool");
                Ok(json!({
                    "content": [{
                        "type": "text",
                        "text": format!("Card '{}' created successfully via MCP with ID {}.", card.content, card.id)
                    }]
                }))
            }
        }

        "group_cards" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).unwrap_or("");
            let parent_id = args.get("parent_card_id").and_then(|v| v.as_str()).unwrap_or("");
            let children = args.get("child_card_ids").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            let token = extract_facilitator_token(headers, &args);

            let board = state.db.get_board(board_id)
                .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?
                .ok_or_else(|| JsonRpcError { code: -32004, message: "Board not found".to_string(), data: None })?;

            if token.as_deref() != Some(&board.facilitator_token) {
                return Err(JsonRpcError {
                    code: -32001,
                    message: "Acesso negado: a ferramenta 'group_cards' requer o token de facilitador válido (facilitator_token).".to_string(),
                    data: None,
                });
            }

            if !FsmGuard::can_group_cards(board.phase) {
                return Err(JsonRpcError {
                    code: -32003,
                    message: format!("Cards can only be grouped during GROUPING phase. Current phase is: {:?}", board.phase),
                    data: None,
                });
            }

            let child_ids: Vec<String> = children.iter().filter_map(|c| c.as_str().map(|s| s.to_string())).collect();
            state.db.group_cards(parent_id, &child_ids)
                .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?;

            let room_sender = state.get_room_sender(board_id);
            broadcast_sync_to_room(state, board_id, &room_sender).await;

            info!(board_id = %board_id, count = child_ids.len(), "Cards agrupados via MCP Tool");
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Merged {} cards under parent card {} successfully via MCP.", child_ids.len(), parent_id)
                }]
            }))
        }

        "change_phase" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).unwrap_or("");
            let target_str = args.get("target_phase").and_then(|v| v.as_str()).unwrap_or("");
            let token = extract_facilitator_token(headers, &args);

            let board = state.db.get_board(board_id)
                .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?
                .ok_or_else(|| JsonRpcError { code: -32004, message: "Board not found".to_string(), data: None })?;

            if token.as_deref() != Some(&board.facilitator_token) {
                return Err(JsonRpcError {
                    code: -32001,
                    message: "Acesso negado: a alteração de fase requer o token de facilitador válido (facilitator_token).".to_string(),
                    data: None,
                });
            }

            let target_phase = BoardPhase::from_str(target_str).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: format!("Invalid target_phase: {}", target_str),
                data: None,
            })?;

            if !FsmGuard::can_transition(board.phase, target_phase) {
                return Err(JsonRpcError {
                    code: -32003,
                    message: format!("Invalid transition from {:?} to {:?}", board.phase, target_phase),
                    data: None,
                });
            }

            state.db.update_board_phase(board_id, target_phase)
                .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?;

            let room_sender = state.get_room_sender(board_id);
            broadcast_sync_to_room(state, board_id, &room_sender).await;

            info!(board_id = %board_id, from = ?board.phase, to = ?target_phase, "Fase alterada via MCP Tool");
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Board phase transitioned from {:?} to {:?} successfully via MCP.", board.phase, target_phase)
                }]
            }))
        }

        _ => Err(JsonRpcError {
            code: -32601,
            message: format!("Tool not found: {}", name),
            data: None,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::models::Board;

    fn setup_test_state() -> (AppState, String, String) {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        let board_id = "TEST_MCP_BOARD_01".to_string();
        let fac_token = "SECURE_FACILITATOR_SECRET_KEY".to_string();

        let board = Board {
            id: board_id.clone(),
            title: "MCP Security Board".to_string(),
            phase: BoardPhase::Brainstorm,
            facilitator_token: fac_token.clone(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        db.create_board(&board, &[("Went Well", "#10b981")]).unwrap();

        let cols = db.get_columns(&board_id).unwrap();
        let col_id = cols.first().unwrap().id.clone();

        let card = Card {
            id: "card-1".to_string(),
            column_id: col_id,
            board_id: board_id.clone(),
            content: "Confidential retro note".to_string(),
            author_session_hash: "PARTICIPANT_USER".to_string(),
            parent_card_id: None,
            is_masked: false,
            is_ai_generated: false,
            vote_count: 0,
            reactions: Vec::new(),
            created_at: 1000,
        };
        db.create_card(&card).unwrap();

        let state = AppState::new(db);

        (state, board_id, fac_token)
    }

    #[tokio::test]
    async fn test_mcp_read_resource_blind_mode_masking() {
        let (state, board_id, fac_token) = setup_test_state();
        let empty_headers = HeaderMap::new();

        // 1. Sem token: modo cego deve mascarar o conteúdo
        let unauth_uri = format!("retro://board/{}/state", board_id);
        let res_unauth = read_resource(&state, &empty_headers, &unauth_uri).await.unwrap();
        let text_unauth = res_unauth["contents"][0]["text"].as_str().unwrap();
        assert!(text_unauth.contains("••••••••"), "Cards devem estar mascarados para usuário comum");
        assert!(!text_unauth.contains("Confidential retro note"));

        // 2. Com token de facilitador na query string: conteúdo completo revelado
        let auth_uri = format!("retro://board/{}/state?token={}", board_id, fac_token);
        let res_auth = read_resource(&state, &empty_headers, &auth_uri).await.unwrap();
        let text_auth = res_auth["contents"][0]["text"].as_str().unwrap();
        assert!(text_auth.contains("Confidential retro note"), "Facilitador com token deve ver conteúdo");
        assert!(!text_auth.contains("••••••••"));

        // 3. Com token de facilitador via Header Authorization: Bearer
        let mut bearer_headers = HeaderMap::new();
        bearer_headers.insert("authorization", format!("Bearer {}", fac_token).parse().unwrap());
        let res_bearer = read_resource(&state, &bearer_headers, &unauth_uri).await.unwrap();
        let text_bearer = res_bearer["contents"][0]["text"].as_str().unwrap();
        assert!(text_bearer.contains("Confidential retro note"), "Facilitador com Authorization Header deve ver conteúdo");
    }

    #[tokio::test]
    async fn test_mcp_create_action_item_allowed_for_all_members_and_mcp() {
        let (state, board_id, _fac_token) = setup_test_state();
        let empty_headers = HeaderMap::new();

        // Avançar board para ACTION_ITEMS
        state.db.update_board_phase(&board_id, BoardPhase::ActionItems).unwrap();

        // 1. Criação de Action Item por membro comum / IA sem facilitator_token é permitida
        let call = json!({
            "name": "create_card",
            "arguments": {
                "board_id": board_id,
                "content": "Ajustar pipeline de CI",
                "is_action_item": true
            }
        });
        let res = call_tool(&state, &empty_headers, call).await.unwrap();
        let text = res["content"][0]["text"].as_str().unwrap();
        assert!(text.contains("Action Item"));

        let items = state.db.get_action_items(&board_id).unwrap();
        assert_eq!(items.len(), 1);
        assert!(items[0].description.contains("Ajustar pipeline de CI"));
    }

    #[tokio::test]
    async fn test_mcp_group_cards_requires_facilitator_token() {
        let (state, board_id, fac_token) = setup_test_state();
        let empty_headers = HeaderMap::new();
        state.db.update_board_phase(&board_id, BoardPhase::Grouping).unwrap();

        // Sem token -> erro -32001
        let unauth_call = json!({
            "name": "group_cards",
            "arguments": {
                "board_id": board_id,
                "parent_card_id": "card-1",
                "child_card_ids": ["card-2"]
            }
        });
        let err = call_tool(&state, &empty_headers, unauth_call).await.unwrap_err();
        assert_eq!(err.code, -32001);

        // Com token válido nos args
        let auth_call = json!({
            "name": "group_cards",
            "arguments": {
                "board_id": board_id,
                "parent_card_id": "card-1",
                "child_card_ids": [],
                "facilitator_token": fac_token
            }
        });
        let res = call_tool(&state, &empty_headers, auth_call).await.unwrap();
        assert!(res["content"][0]["text"].as_str().unwrap().contains("Merged 0 cards"));
    }

    #[tokio::test]
    async fn test_mcp_change_phase_requires_facilitator_token() {
        let (state, board_id, fac_token) = setup_test_state();
        let empty_headers = HeaderMap::new();

        // Sem token -> erro -32001
        let unauth_call = json!({
            "name": "change_phase",
            "arguments": {
                "board_id": board_id,
                "target_phase": "GROUPING"
            }
        });
        let err = call_tool(&state, &empty_headers, unauth_call).await.unwrap_err();
        assert_eq!(err.code, -32001);

        // Com token válido no header Authorization: Bearer
        let mut bearer_headers = HeaderMap::new();
        bearer_headers.insert("authorization", format!("Bearer {}", fac_token).parse().unwrap());

        let header_call = json!({
            "name": "change_phase",
            "arguments": {
                "board_id": board_id,
                "target_phase": "GROUPING"
            }
        });
        let res = call_tool(&state, &bearer_headers, header_call).await.unwrap();
        assert!(res["content"][0]["text"].as_str().unwrap().contains("transitioned"));
    }
}
