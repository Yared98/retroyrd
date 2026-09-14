use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BoardPhase {
    SafetyCheck,
    Brainstorm,
    Grouping,
    Voting,
    ActionItems,
    Archived,
}

impl BoardPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            BoardPhase::SafetyCheck => "SAFETY_CHECK",
            BoardPhase::Brainstorm => "BRAINSTORM",
            BoardPhase::Grouping => "GROUPING",
            BoardPhase::Voting => "VOTING",
            BoardPhase::ActionItems => "ACTION_ITEMS",
            BoardPhase::Archived => "ARCHIVED",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "SAFETY_CHECK" => Some(BoardPhase::SafetyCheck),
            "BRAINSTORM" => Some(BoardPhase::Brainstorm),
            "GROUPING" => Some(BoardPhase::Grouping),
            "VOTING" => Some(BoardPhase::Voting),
            "ACTION_ITEMS" => Some(BoardPhase::ActionItems),
            "ARCHIVED" => Some(BoardPhase::Archived),
            _ => None,
        }
    }

    pub fn next_phase(&self) -> Option<Self> {
        match self {
            BoardPhase::SafetyCheck => Some(BoardPhase::Brainstorm),
            BoardPhase::Brainstorm => Some(BoardPhase::Grouping),
            BoardPhase::Grouping => Some(BoardPhase::Voting),
            BoardPhase::Voting => Some(BoardPhase::ActionItems),
            BoardPhase::ActionItems => Some(BoardPhase::Archived),
            BoardPhase::Archived => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Board {
    pub id: String,
    pub title: String,
    pub phase: BoardPhase,
    pub facilitator_token: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub id: String,
    pub board_id: String,
    pub title: String,
    pub color: String,
    pub order_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub column_id: String,
    pub board_id: String,
    pub content: String,
    pub author_session_hash: String,
    pub parent_card_id: Option<String>,
    pub is_masked: bool,
    pub is_ai_generated: bool,
    pub vote_count: i32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionItem {
    pub id: String,
    pub board_id: String,
    pub description: String,
    pub owner: Option<String>,
    pub is_ai_generated: bool,
    pub status: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyCheckSummary {
    pub count: i32,
    pub average: f64,
    pub distribution: [i32; 5], // index 0 = score 1, index 4 = score 5
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoardStateSnapshot {
    pub board: Board,
    pub columns: Vec<Column>,
    pub cards: Vec<Card>,
    pub action_items: Vec<ActionItem>,
    pub safety_summary: Option<SafetyCheckSummary>,
    pub user_voted_card_ids: Vec<String>,
    pub is_facilitator: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: serde_json::Value,
    #[serde(default)]
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBoardRequest {
    pub title: String,
    #[serde(default)]
    pub columns: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBoardResponse {
    pub id: String,
    pub title: String,
    pub facilitator_token: String,
    pub invite_url: String,
}
