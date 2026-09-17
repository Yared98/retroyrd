use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection, Result};
use crate::models::{ActionItem, Board, BoardPhase, Card, CardReaction, Column, SafetyCheckSummary};

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
                max_votes_per_user INTEGER NOT NULL DEFAULT 5,
                timer_seconds_remaining INTEGER NOT NULL DEFAULT 300,
                timer_is_running INTEGER NOT NULL DEFAULT 0,
                timer_ends_at INTEGER,
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

            CREATE TABLE IF NOT EXISTS card_reactions (
                card_id TEXT NOT NULL,
                emoji TEXT NOT NULL,
                session_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (card_id, emoji, session_hash),
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
            );

            -- Migração: Renomear coluna antiga Action Items para Ideas & Kudos
            UPDATE columns SET title = 'Ideas & Kudos', color = '#06B6D4' WHERE title = 'Action Items';"
        )?;

        // Migrações incrementais idempotentes
        let _ = conn.execute("ALTER TABLE boards ADD COLUMN max_votes_per_user INTEGER NOT NULL DEFAULT 5", []);
        let _ = conn.execute("ALTER TABLE boards ADD COLUMN timer_seconds_remaining INTEGER NOT NULL DEFAULT 300", []);
        let _ = conn.execute("ALTER TABLE boards ADD COLUMN timer_is_running INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE boards ADD COLUMN timer_ends_at INTEGER", []);

        Ok(())
    }

    pub fn create_board(&self, board: &Board, default_columns: &[(&str, &str)]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        tx.execute(
            "INSERT INTO boards (id, title, phase, facilitator_token, max_votes_per_user, timer_seconds_remaining, timer_is_running, timer_ends_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                board.id,
                board.title,
                board.phase.as_str(),
                board.facilitator_token,
                board.max_votes_per_user,
                board.timer_seconds_remaining,
                if board.timer_is_running { 1 } else { 0 },
                board.timer_ends_at,
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
            "SELECT id, title, phase, facilitator_token, max_votes_per_user, timer_seconds_remaining, timer_is_running, timer_ends_at, created_at 
             FROM boards WHERE id = ?1"
        )?;
        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            let phase_str: String = row.get(2)?;
            let phase = BoardPhase::from_str(&phase_str).unwrap_or(BoardPhase::SafetyCheck);
            let timer_is_running_i32: i32 = row.get(6).unwrap_or(0);
            Ok(Some(Board {
                id: row.get(0)?,
                title: row.get(1)?,
                phase,
                facilitator_token: row.get(3)?,
                max_votes_per_user: row.get(4).unwrap_or(5),
                timer_seconds_remaining: row.get(5).unwrap_or(300),
                timer_is_running: timer_is_running_i32 != 0,
                timer_ends_at: row.get(7)?,
                created_at: row.get(8)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_timer(&self, board_id: &str, seconds_remaining: i32, is_running: bool, ends_at: Option<i64>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE boards SET timer_seconds_remaining = ?1, timer_is_running = ?2, timer_ends_at = ?3 WHERE id = ?4",
            params![seconds_remaining, if is_running { 1 } else { 0 }, ends_at, board_id],
        )?;
        Ok(())
    }

    pub fn update_board_phase(&self, board_id: &str, phase: BoardPhase) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE boards SET phase = ?1 WHERE id = ?2",
            params![phase.as_str(), board_id],
        )?;
        Ok(())
    }

    pub fn update_vote_limit(&self, board_id: &str, limit: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE boards SET max_votes_per_user = ?1 WHERE id = ?2",
            params![limit, board_id],
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

    pub fn cleanup_expired_boards(&self, retention_days: i64) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let now = chrono_or_now();
        let cutoff_ms = now - (retention_days * 24 * 3600 * 1000);
        let count = conn.execute(
            "DELETE FROM boards WHERE created_at < ?1",
            params![cutoff_ms],
        )?;
        Ok(count)
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

        // Obter column_id do card pai
        let parent_col_id: String = tx.query_row(
            "SELECT column_id FROM cards WHERE id = ?1",
            params![parent_card_id],
            |row| row.get(0),
        )?;

        for child_id in child_card_ids {
            // Só agrupa se o card filho pertencer estritamente à mesma coluna do card pai
            // e NUNCA altera o column_id original do card
            tx.execute(
                "UPDATE cards 
                 SET parent_card_id = ?1
                 WHERE id = ?2 AND column_id = ?3",
                params![parent_card_id, child_id, parent_col_id],
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

    pub fn move_card(&self, card_id: &str, target_column_id: &str) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Mover o card para a nova coluna. Se era filho, desconecta do agrupamento antigo
        tx.execute(
            "UPDATE cards SET column_id = ?1, parent_card_id = NULL WHERE id = ?2",
            params![target_column_id, card_id],
        )?;

        // Se este card possui filhos agrupados sob ele, move todos os filhos juntos para manter o cluster coeso
        tx.execute(
            "UPDATE cards SET column_id = ?1 WHERE parent_card_id = ?2",
            params![target_column_id, card_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn toggle_reaction(&self, card_id: &str, emoji: &str, session_hash: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT 1 FROM card_reactions WHERE card_id = ?1 AND emoji = ?2 AND session_hash = ?3"
        )?;
        let exists = stmt.exists(params![card_id, emoji, session_hash])?;

        if exists {
            conn.execute(
                "DELETE FROM card_reactions WHERE card_id = ?1 AND emoji = ?2 AND session_hash = ?3",
                params![card_id, emoji, session_hash],
            )?;
            Ok(false)
        } else {
            let now = chrono_or_now();
            conn.execute(
                "INSERT INTO card_reactions (card_id, emoji, session_hash, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![card_id, emoji, session_hash, now],
            )?;
            Ok(true)
        }
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
                reactions: Vec::new(),
                is_masked: false,
            })
        })?;

        let mut cards = Vec::new();
        for c in rows {
            cards.push(c?);
        }

        // Carregar reações agrupadas para todos os cards deste board
        let mut react_stmt = conn.prepare(
            "SELECT r.card_id, r.emoji, r.session_hash 
             FROM card_reactions r
             JOIN cards c ON c.id = r.card_id
             WHERE c.board_id = ?1
             ORDER BY r.created_at ASC"
        )?;

        let mut reactions_map: std::collections::HashMap<String, std::collections::HashMap<String, Vec<String>>> =
            std::collections::HashMap::new();

        let react_rows = react_stmt.query_map(params![board_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;

        for r in react_rows {
            let (cid, emoji, shash) = r?;
            reactions_map
                .entry(cid)
                .or_default()
                .entry(emoji)
                .or_default()
                .push(shash);
        }

        for card in &mut cards {
            if let Some(emojis) = reactions_map.remove(&card.id) {
                for (emoji, users) in emojis {
                    let count = users.len() as i32;
                    card.reactions.push(CardReaction {
                        emoji,
                        count,
                        users,
                    });
                }
                card.reactions.sort_by(|a, b| b.count.cmp(&a.count));
            }
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
            // Verificar limite máximo de votos permitidos no board
            let max_votes: i32 = conn.query_row(
                "SELECT max_votes_per_user FROM boards WHERE id = ?1",
                params![board_id],
                |row| row.get(0),
            ).unwrap_or(5);

            if max_votes > 0 {
                let current_votes: i32 = conn.query_row(
                    "SELECT COUNT(*) FROM votes WHERE board_id = ?1 AND session_hash = ?2",
                    params![board_id, session_hash],
                    |row| row.get(0),
                ).unwrap_or(0);

                if current_votes >= max_votes {
                    return Ok(false); // Cota de votos atingida! Bloqueia novo voto.
                }
            }

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

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_db() -> Database {
        Database::new(":memory:").expect("Failed to create in-memory test database")
    }

    #[test]
    fn test_safety_check_summary() {
        let db = create_test_db();
        let board_id = "test_board_safety";
        let board = Board {
            id: board_id.to_string(),
            title: "Safety Test".to_string(),
            phase: BoardPhase::SafetyCheck,
            facilitator_token: "token123".to_string(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        db.create_board(&board, &[]).unwrap();

        db.submit_safety_check(board_id, 5).unwrap();
        db.submit_safety_check(board_id, 4).unwrap();
        db.submit_safety_check(board_id, 5).unwrap();
        db.submit_safety_check(board_id, 2).unwrap();

        let summary = db.get_safety_summary(board_id).unwrap();
        assert_eq!(summary.count, 4);
        assert_eq!(summary.average, 4.0);
        assert_eq!(summary.distribution[4], 2); // score 5: count 2
        assert_eq!(summary.distribution[3], 1); // score 4: count 1
        assert_eq!(summary.distribution[1], 1); // score 2: count 1
    }

    #[test]
    fn test_voting_quota_enforcement() {
        let db = create_test_db();
        let board_id = "test_board_voting";
        let board = Board {
            id: board_id.to_string(),
            title: "Voting Test".to_string(),
            phase: BoardPhase::Voting,
            facilitator_token: "token123".to_string(),
            max_votes_per_user: 2, // Cota de 2 votos
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        let cols = [("Col1", "#fff")];
        db.create_board(&board, &cols).unwrap();

        let columns = db.get_columns(board_id).unwrap();
        let col_id = &columns[0].id;

        for i in 1..=4 {
            let card = Card {
                id: format!("card_{}", i),
                column_id: col_id.clone(),
                board_id: board_id.to_string(),
                content: format!("Card {}", i),
                author_session_hash: "userA".to_string(),
                parent_card_id: None,
                is_masked: false,
                is_ai_generated: false,
                vote_count: 0,
                reactions: Vec::new(),
                created_at: 1000 + i,
            };
            db.create_card(&card).unwrap();
        }

        let session_hash = "voter_session";

        // Voto 1: Sucesso
        assert!(db.toggle_vote(board_id, "card_1", session_hash).unwrap());
        // Voto 2: Sucesso
        assert!(db.toggle_vote(board_id, "card_2", session_hash).unwrap());
        // Voto 3: Rejeitado (cota de 2 atingida)
        assert!(!db.toggle_vote(board_id, "card_3", session_hash).unwrap());

        // Desmarcar voto 2: Sucesso (voto removido)
        assert!(!db.toggle_vote(board_id, "card_2", session_hash).unwrap());

        // Agora voto 3 é aceito!
        assert!(db.toggle_vote(board_id, "card_3", session_hash).unwrap());
    }

    #[test]
    fn test_grouping_cards_same_column_only() {
        let db = create_test_db();
        let board_id = "test_board_grouping";
        let board = Board {
            id: board_id.to_string(),
            title: "Grouping Test".to_string(),
            phase: BoardPhase::Grouping,
            facilitator_token: "token123".to_string(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        let cols = [("Went Well", "#10B981"), ("To Improve", "#F43F5E")];
        db.create_board(&board, &cols).unwrap();

        let columns = db.get_columns(board_id).unwrap();
        let col1_id = &columns[0].id;
        let col2_id = &columns[1].id;

        let parent_card = Card {
            id: "card_parent".to_string(),
            column_id: col1_id.clone(),
            board_id: board_id.to_string(),
            content: "Parent Card".to_string(),
            author_session_hash: "userA".to_string(),
            parent_card_id: None,
            is_masked: false,
            is_ai_generated: false,
            vote_count: 0,
            reactions: Vec::new(),
            created_at: 1000,
        };
        let child_same_col = Card {
            id: "child_col1".to_string(),
            column_id: col1_id.clone(), // Mesma coluna 1
            board_id: board_id.to_string(),
            content: "Child in Col 1".to_string(),
            author_session_hash: "userB".to_string(),
            parent_card_id: None,
            is_masked: false,
            is_ai_generated: false,
            vote_count: 0,
            reactions: Vec::new(),
            created_at: 1001,
        };
        let child_diff_col = Card {
            id: "child_col2".to_string(),
            column_id: col2_id.clone(), // Coluna 2 diferente
            board_id: board_id.to_string(),
            content: "Child in Col 2".to_string(),
            author_session_hash: "userC".to_string(),
            parent_card_id: None,
            is_masked: false,
            is_ai_generated: false,
            vote_count: 0,
            reactions: Vec::new(),
            created_at: 1002,
        };
        db.create_card(&parent_card).unwrap();
        db.create_card(&child_same_col).unwrap();
        db.create_card(&child_diff_col).unwrap();

        // 1. Tentar agrupar child de coluna diferente -> deve ser bloqueado/ignorado
        db.group_cards("card_parent", &["child_col2".to_string()]).unwrap();
        let cards = db.get_cards(board_id).unwrap();
        let diff_card = cards.iter().find(|c| c.id == "child_col2").unwrap();
        assert_eq!(diff_card.parent_card_id, None);
        assert_eq!(&diff_card.column_id, col2_id);

        // 2. Agrupar child da mesma coluna -> Sucesso
        db.group_cards("card_parent", &["child_col1".to_string()]).unwrap();
        let cards = db.get_cards(board_id).unwrap();
        let same_card = cards.iter().find(|c| c.id == "child_col1").unwrap();
        assert_eq!(same_card.parent_card_id, Some("card_parent".to_string()));
        assert_eq!(&same_card.column_id, col1_id);

        // 3. Desagrupar (X) -> Mantém exatamente na coluna 1
        db.ungroup_card("child_col1").unwrap();
        let cards = db.get_cards(board_id).unwrap();
        let ungrouped = cards.iter().find(|c| c.id == "child_col1").unwrap();
        assert_eq!(ungrouped.parent_card_id, None);
        assert_eq!(&ungrouped.column_id, col1_id);
    }

    #[test]
    fn test_move_card_between_columns() {
        let db = create_test_db();
        let board_id = "test_board_move";
        let board = Board {
            id: board_id.to_string(),
            title: "Move Test".to_string(),
            phase: BoardPhase::Brainstorm,
            facilitator_token: "tok".to_string(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        let cols = [("Col1", "#10B981"), ("Col2", "#F43F5E")];
        db.create_board(&board, &cols).unwrap();

        let columns = db.get_columns(board_id).unwrap();
        let col1_id = &columns[0].id;
        let col2_id = &columns[1].id;

        let card = Card {
            id: "card_movable".to_string(),
            column_id: col1_id.clone(),
            board_id: board_id.to_string(),
            content: "To Move".to_string(),
            author_session_hash: "userA".to_string(),
            parent_card_id: None,
            is_masked: false,
            is_ai_generated: false,
            vote_count: 0,
            reactions: Vec::new(),
            created_at: 1000,
        };
        db.create_card(&card).unwrap();

        // Mover para a Coluna 2
        db.move_card("card_movable", col2_id).unwrap();

        let cards = db.get_cards(board_id).unwrap();
        let moved = cards.iter().find(|c| c.id == "card_movable").unwrap();
        assert_eq!(&moved.column_id, col2_id);
    }

    #[test]
    fn test_card_reactions_toggle_and_aggregate() {
        let db = create_test_db();
        let board_id = "test_board_react";
        let board = Board {
            id: board_id.to_string(),
            title: "React Test".to_string(),
            phase: BoardPhase::Grouping,
            facilitator_token: "tok".to_string(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        let cols = [("Col1", "#10B981")];
        db.create_board(&board, &cols).unwrap();

        let columns = db.get_columns(board_id).unwrap();
        let col1_id = &columns[0].id;

        let card = Card {
            id: "card_react".to_string(),
            column_id: col1_id.clone(),
            board_id: board_id.to_string(),
            content: "Reaction Test".to_string(),
            author_session_hash: "userA".to_string(),
            parent_card_id: None,
            is_masked: false,
            is_ai_generated: false,
            vote_count: 0,
            reactions: Vec::new(),
            created_at: 1000,
        };
        db.create_card(&card).unwrap();

        // 1. User 1 reage com 👏
        assert!(db.toggle_reaction("card_react", "👏", "user1").unwrap());
        // 2. User 2 reage com 👏
        assert!(db.toggle_reaction("card_react", "👏", "user2").unwrap());
        // 3. User 1 reage com 🚀
        assert!(db.toggle_reaction("card_react", "🚀", "user1").unwrap());

        let cards = db.get_cards(board_id).unwrap();
        let rc = cards.iter().find(|c| c.id == "card_react").unwrap();
        assert_eq!(rc.reactions.len(), 2);
        
        let clap = rc.reactions.iter().find(|r| r.emoji == "👏").unwrap();
        assert_eq!(clap.count, 2);
        assert!(clap.users.contains(&"user1".to_string()));
        assert!(clap.users.contains(&"user2".to_string()));

        let rocket = rc.reactions.iter().find(|r| r.emoji == "🚀").unwrap();
        assert_eq!(rocket.count, 1);
        assert!(rocket.users.contains(&"user1".to_string()));

        // 4. User 1 remove reação 👏 (toggle off)
        assert!(!db.toggle_reaction("card_react", "👏", "user1").unwrap());
        let cards_after = db.get_cards(board_id).unwrap();
        let rc_after = cards_after.iter().find(|c| c.id == "card_react").unwrap();
        let clap_after = rc_after.reactions.iter().find(|r| r.emoji == "👏").unwrap();
        assert_eq!(clap_after.count, 1);
        assert_eq!(clap_after.users, vec!["user2".to_string()]);
    }

    #[test]
    fn test_cleanup_expired_boards() {
        let db = create_test_db();
        let now = chrono_or_now();
        let sixty_five_days_ago = now - (65 * 24 * 3600 * 1000);

        let old_board = Board {
            id: "board_old".to_string(),
            title: "Old Board".to_string(),
            phase: BoardPhase::Archived,
            facilitator_token: "tok1".to_string(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: sixty_five_days_ago,
        };
        let new_board = Board {
            id: "board_new".to_string(),
            title: "New Board".to_string(),
            phase: BoardPhase::Brainstorm,
            facilitator_token: "tok2".to_string(),
            max_votes_per_user: 5,
            timer_seconds_remaining: 300,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: now,
        };

        db.create_board(&old_board, &[("Col1", "#10B981")]).unwrap();
        db.create_board(&new_board, &[("Col1", "#10B981")]).unwrap();

        // Limpeza com 60 dias de retenção
        let purged = db.cleanup_expired_boards(60).unwrap();
        assert_eq!(purged, 1);

        assert!(db.get_board("board_old").unwrap().is_none());
        assert!(db.get_board("board_new").unwrap().is_some());
    }
}
