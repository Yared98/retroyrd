use std::sync::Arc;
use dashmap::DashMap;
use tokio::sync::broadcast;
use sha2::{Digest, Sha256};
use crate::db::Database;
use crate::models::WsMessage;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub db_path: String,
    pub rooms: Arc<DashMap<String, broadcast::Sender<WsMessage>>>,
    pub admin_rate_limiter: Arc<DashMap<String, (u32, std::time::Instant)>>,
    pub admin_sessions: Arc<DashMap<String, std::time::Instant>>,
}

impl AppState {
    pub fn new(db: Database, db_path: String) -> Self {
        Self {
            db,
            db_path,
            rooms: Arc::new(DashMap::new()),
            admin_rate_limiter: Arc::new(DashMap::new()),
            admin_sessions: Arc::new(DashMap::new()),
        }
    }

    pub fn get_room_sender(&self, board_id: &str) -> broadcast::Sender<WsMessage> {
        self.rooms
            .entry(board_id.to_string())
            .or_insert_with(|| {
                let (tx, _rx) = broadcast::channel(100);
                tx
            })
            .value()
            .clone()
    }

    pub fn compute_session_hash(board_id: &str, raw_client_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(board_id.as_bytes());
        hasher.update(b":");
        hasher.update(raw_client_id.as_bytes());
        let result = hasher.finalize();
        hex::encode(result)
    }
}

pub mod hex {
    pub fn encode(bytes: impl AsRef<[u8]>) -> String {
        bytes.as_ref().iter().map(|b| format!("{:02x}", b)).collect()
    }
}
