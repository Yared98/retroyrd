use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection, Result};
use crate::models::{ActionItem, Board, BoardPhase, Card, Column, SafetyCheckSummary};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        
        // Ativar modo WAL e constraints de foreign keys
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;"
        )?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                phase TEXT NOT NULL,
                facilitator_token TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS columns (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL,
                title TEXT NOT NULL,
                color TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                column_id TEXT NOT NULL,
                board_id TEXT NOT NULL,
                content TEXT NOT NULL,
                author_session_hash TEXT NOT NULL,
                parent_card_id TEXT,
                is_ai_generated INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS votes (
                board_id TEXT NOT NULL,
                card_id TEXT NOT NULL,
                session_hash TEXT NOT NULL,
                PRIMARY KEY (board_id, card_id, session_hash),
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
            );

            -- Tabela de Safety Check: SEM session_hash e SEM chave estrangeira para usuario
            -- Garantia inviolavel de seguranca psicologica e anonimato
            CREATE TABLE IF NOT EXISTS safety_checks (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL,
                score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
                created_at INTEGER NOT NULL,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS action_items (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL,
                description TEXT NOT NULL,
                owner TEXT,
                is_ai_generated INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'TODO',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );

            -- Migração: Renomear coluna antiga Action Items para Ideas & Kudos
            UPDATE columns SET title = 'Ideas & Kudos', color = '#06B6D4' WHERE title = 'Action Items';"
        )?;
        Ok(())
    }

    pub fn create_board(&self, board: &Board, default_columns: &[(&str, &str)]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        tx.execute(
            "INSERT INTO boards (id, title, phase, facilitator_token, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                board.id,
                board.title,
                board.phase.as_str(),
                board.facilitator_token,
                board.created_at
            ],
        )?;

        for (idx, (title, color)) in default_columns.iter().enumerate() {
            let col_id = ulid::Ulid::new().to_string();
            tx.execute(
                "INSERT INTO columns (id, board_id, title, color, order_index)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![col_id, board.id, title, color, idx as i32],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_board(&self, id: &str) -> Result<Option<Board>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, phase, facilitator_token, created_at FROM boards WHERE id = ?1"
        )?;
        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            let phase_str: String = row.get(2)?;
            let phase = BoardPhase::from_str(&phase_str).unwrap_or(BoardPhase::SafetyCheck);
            Ok(Some(Board {
                id: row.get(0)?,
                title: row.get(1)?,
                phase,
                facilitator_token: row.get(3)?,
                created_at: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_board_phase(&self, board_id: &str, phase: BoardPhase) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE boards SET phase = ?1 WHERE id = ?2",
            params![phase.as_str(), board_id],
        )?;
        Ok(())
    }

    pub fn get_columns(&self, board_id: &str) -> Result<Vec<Column>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, board_id, title, color, order_index FROM columns 
             WHERE board_id = ?1 ORDER BY order_index ASC"
        )?;
        let rows = stmt.query_map(params![board_id], |row| {
            Ok(Column {
                id: row.get(0)?,
                board_id: row.get(1)?,
                title: row.get(2)?,
                color: row.get(3)?,
                order_index: row.get(4)?,
            })
        })?;

        let mut columns = Vec::new();
        for col in rows {
            columns.push(col?);
        }
        Ok(columns)
    }

    pub fn create_card(&self, card: &Card) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO cards (id, column_id, board_id, content, author_session_hash, parent_card_id, is_ai_generated, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                card.id,
                card.column_id,
                card.board_id,
                card.content,
                card.author_session_hash,
                card.parent_card_id,
                if card.is_ai_generated { 1 } else { 0 },
                card.created_at
            ],
        )?;
        Ok(())
    }

    pub fn update_card(&self, card_id: &str, author_session_hash: &str, new_content: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "UPDATE cards SET content = ?1 WHERE id = ?2 AND author_session_hash = ?3",
            params![new_content, card_id, author_session_hash],
        )?;
        Ok(rows > 0)
    }

    pub fn delete_card(&self, card_id: &str, author_session_hash: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "DELETE FROM cards WHERE id = ?1 AND author_session_hash = ?2",
            params![card_id, author_session_hash],
        )?;
        Ok(rows > 0)
    }

    pub fn group_cards(&self, parent_card_id: &str, child_card_ids: &[String]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        for child_id in child_card_ids {
            tx.execute(
                "UPDATE cards SET parent_card_id = ?1 WHERE id = ?2",
                params![parent_card_id, child_id],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn ungroup_card(&self, card_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE cards SET parent_card_id = NULL WHERE id = ?1",
            params![card_id],
        )?;
        Ok(())
    }

    pub fn get_cards(&self, board_id: &str) -> Result<Vec<Card>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT c.id, c.column_id, c.board_id, c.content, c.author_session_hash, 
                    c.parent_card_id, c.is_ai_generated, c.created_at,
                    COALESCE(COUNT(v.card_id), 0) as vote_count
             FROM cards c
             LEFT JOIN votes v ON v.card_id = c.id
             WHERE c.board_id = ?1
             GROUP BY c.id
             ORDER BY c.created_at ASC"
        )?;

        let rows = stmt.query_map(params![board_id], |row| {
            let is_ai: i32 = row.get(6)?;
            Ok(Card {
                id: row.get(0)?,
                column_id: row.get(1)?,
                board_id: row.get(2)?,
                content: row.get(3)?,
                author_session_hash: row.get(4)?,
                parent_card_id: row.get(5)?,
                is_ai_generated: is_ai != 0,
                created_at: row.get(7)?,
                vote_count: row.get(8)?,
                is_masked: false,
            })
        })?;

        let mut cards = Vec::new();
        for c in rows {
            cards.push(c?);
        }
        Ok(cards)
    }

    pub fn toggle_vote(&self, board_id: &str, card_id: &str, session_hash: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT 1 FROM votes WHERE board_id = ?1 AND card_id = ?2 AND session_hash = ?3"
        )?;
        let exists = stmt.exists(params![board_id, card_id, session_hash])?;

        if exists {
            conn.execute(
                "DELETE FROM votes WHERE board_id = ?1 AND card_id = ?2 AND session_hash = ?3",
                params![board_id, card_id, session_hash],
            )?;
            Ok(false) // Voto removido
        } else {
            conn.execute(
                "INSERT INTO votes (board_id, card_id, session_hash) VALUES (?1, ?2, ?3)",
                params![board_id, card_id, session_hash],
            )?;
            Ok(true) // Voto adicionado
        }
    }

    pub fn get_user_votes(&self, board_id: &str, session_hash: &str) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT card_id FROM votes WHERE board_id = ?1 AND session_hash = ?2"
        )?;
        let rows = stmt.query_map(params![board_id, session_hash], |row| row.get(0))?;
        let mut card_ids = Vec::new();
        for cid in rows {
            card_ids.push(cid?);
        }
        Ok(card_ids)
    }

    pub fn submit_safety_check(&self, board_id: &str, score: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let id = ulid::Ulid::new().to_string();
        let now = chrono_or_now();
        conn.execute(
            "INSERT INTO safety_checks (id, board_id, score, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, board_id, score, now],
        )?;
        Ok(())
    }

    pub fn get_safety_summary(&self, board_id: &str) -> Result<SafetyCheckSummary> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT score FROM safety_checks WHERE board_id = ?1"
        )?;
        let rows = stmt.query_map(params![board_id], |row| row.get::<_, i32>(0))?;

        let mut count = 0;
        let mut sum = 0;
        let mut distribution = [0; 5];

        for score in rows {
            let s = score?;
            if (1..=5).contains(&s) {
                count += 1;
                sum += s;
                distribution[(s - 1) as usize] += 1;
            }
        }

        let average = if count > 0 {
            sum as f64 / count as f64
        } else {
            0.0
        };

        Ok(SafetyCheckSummary {
            count,
            average,
            distribution,
        })
    }

    pub fn create_action_item(&self, item: &ActionItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO action_items (id, board_id, description, owner, is_ai_generated, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                item.id,
                item.board_id,
                item.description,
                item.owner,
                if item.is_ai_generated { 1 } else { 0 },
                item.status,
                item.created_at
            ],
        )?;
        Ok(())
    }

    pub fn update_action_item_status(&self, id: &str, status: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE action_items SET status = ?1 WHERE id = ?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn get_action_items(&self, board_id: &str) -> Result<Vec<ActionItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, board_id, description, owner, is_ai_generated, status, created_at 
             FROM action_items WHERE board_id = ?1 ORDER BY created_at ASC"
        )?;
        let rows = stmt.query_map(params![board_id], |row| {
            let is_ai: i32 = row.get(4)?;
            Ok(ActionItem {
                id: row.get(0)?,
                board_id: row.get(1)?,
                description: row.get(2)?,
                owner: row.get(3)?,
                is_ai_generated: is_ai != 0,
                status: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;

        let mut items = Vec::new();
        for item in rows {
            items.push(item?);
        }
        Ok(items)
    }
}

pub fn chrono_or_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
