use axum::{
    extract::State,
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

pub async fn handle_mcp_request(
    State(state): State<AppState>,
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
                        "description": "Full structured snapshot of columns, cards, vote counts and action items",
                        "mimeType": "application/json"
                    },
                    {
                        "uri": "retro://board/{board_id}/metrics",
                        "name": "Retrospective Board Metrics",
                        "description": "Analytics, participation, Psychological Safety distribution and vote rankings",
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
            
            read_resource(&state, uri).await
        }

        "tools/list" => {
            Ok(json!({
                "tools": [
                    {
                        "name": "create_card",
                        "description": "Inserts a new card or action item into the retrospective board in real time. Can be used to inject observability metrics or generate action plans from team feedback.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the retro board" },
                                "column_id": { "type": "string", "description": "Target column ID where the card will be added" },
                                "content": { "type": "string", "description": "Content of the card or action item description" },
                                "is_action_item": { "type": "boolean", "description": "Whether this is a committed action item (Phase 5)" }
                            },
                            "required": ["board_id", "content"]
                        }
                    },
                    {
                        "name": "group_cards",
                        "description": "Merges multiple semantically related cards under a parent card cluster during the GROUPING phase.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the retro board" },
                                "parent_card_id": { "type": "string", "description": "ID of the parent cluster card" },
                                "child_card_ids": { 
                                    "type": "array", 
                                    "items": { "type": "string" },
                                    "description": "List of card IDs to merge under the parent" 
                                }
                            },
                            "required": ["board_id", "parent_card_id", "child_card_ids"]
                        }
                    }
                ]
            }))
        }

        "tools/call" => {
            let params = req.params.as_ref().cloned().unwrap_or(json!({}));
            call_tool(&state, params).await
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

async fn read_resource(state: &AppState, uri: &str) -> Result<Value, JsonRpcError> {
    // Ex: retro://board/01HGW.../state ou retro://board/01HGW.../metrics
    let parts: Vec<&str> = uri.trim_start_matches("retro://").split('/').collect();
    if parts.len() < 3 || parts[0] != "board" {
        return Err(JsonRpcError {
            code: -32602,
            message: "Invalid resource URI format. Expected: retro://board/{board_id}/{state|metrics}".to_string(),
            data: None,
        });
    }

    let board_id = parts[1];
    let resource_type = parts[2];

    let board = state.db.get_board(board_id)
        .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?
        .ok_or_else(|| JsonRpcError { code: -32004, message: "Board not found".to_string(), data: None })?;

    match resource_type {
        "state" => {
            let columns = state.db.get_columns(board_id).unwrap_or_default();
            let cards = state.db.get_cards(board_id).unwrap_or_default();
            let action_items = state.db.get_action_items(board_id).unwrap_or_default();
            let safety = state.db.get_safety_summary(board_id).ok();

            let dump = json!({
                "board": board,
                "columns": columns,
                "cards": cards,
                "action_items": action_items,
                "safety_summary": safety,
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
            let safety = state.db.get_safety_summary(board_id).ok();
            let cards = state.db.get_cards(board_id).unwrap_or_default();
            let mut top_cards = cards.clone();
            top_cards.sort_by(|a, b| b.vote_count.cmp(&a.vote_count));
            top_cards.truncate(5);

            let metrics = json!({
                "board_id": board_id,
                "title": board.title,
                "phase": board.phase,
                "total_cards": cards.len(),
                "safety_check": safety,
                "top_5_voted_cards": top_cards,
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

async fn call_tool(state: &AppState, params: Value) -> Result<Value, JsonRpcError> {
    let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let args = params.get("arguments").cloned().unwrap_or(json!({}));

    match name {
        "create_card" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).unwrap_or("");
            let content = args.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let is_action = args.get("is_action_item").and_then(|v| v.as_bool()).unwrap_or(false);

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

            let now = chrono_or_now();
            let room_sender = state.get_room_sender(board_id);

            if is_action || board.phase == BoardPhase::ActionItems {
                let item = ActionItem {
                    id: ulid::Ulid::new().to_string(),
                    board_id: board_id.to_string(),
                    description: format!("{} (Injetado por IA)", content),
                    owner: Some("AI_AGENT".to_string()),
                    is_ai_generated: true,
                    status: "TODO".to_string(),
                    created_at: now,
                };
                state.db.create_action_item(&item)
                    .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?;
                broadcast_sync_to_room(state, board_id, &room_sender).await;

                info!(board_id = %board_id, "Action Item criado via MCP Tool");
                Ok(json!({
                    "content": [{
                        "type": "text",
                        "text": format!("Action Item '{}' created successfully via MCP.", item.description)
                    }]
                }))
            } else {
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
                    author_session_hash: "AI_AGENT".to_string(),
                    parent_card_id: None,
                    is_masked: false,
                    is_ai_generated: true,
                    vote_count: 0,
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

            let board = state.db.get_board(board_id)
                .map_err(|e| JsonRpcError { code: -32000, message: e.to_string(), data: None })?
                .ok_or_else(|| JsonRpcError { code: -32004, message: "Board not found".to_string(), data: None })?;

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

        _ => Err(JsonRpcError {
            code: -32601,
            message: format!("Tool not found: {}", name),
            data: None,
        }),
    }
}
