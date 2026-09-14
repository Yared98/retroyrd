# Design Técnico: 001-mvp-initial-setup

## 1. Arquitetura do Backend (Rust)
- **Framework**: `axum` v0.8+ sobre `tokio`.
- **Rotas HTTP**:
  - `POST /api/boards`: Cria novo board e retorna `{ id, facilitator_token, invite_url }`.
  - `GET /api/boards/:id`: Retorna informações públicas do board.
  - `GET /api/boards/:id/export`: Exporta board completo em Markdown / CSV.
  - `GET /ws/board/:id`: Handshake WebSocket com suporte a query params (`token` para facilitador, `session_id`).
  - `/mcp`: Endpoint HTTP/SSE JSON-RPC 2.0 para clientes MCP (ou modo stdio).
- **Banco de Dados**: SQLite gerenciado via `rusqlite` com flag `bundled` e modo WAL ativado:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  ```
- **FSM Estrita**: Implementada com `enum BoardPhase`:
  ```rust
  #[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
  pub enum BoardPhase {
      SafetyCheck,
      Brainstorm,
      Grouping,
      Voting,
      ActionItems,
      Archived,
  }
  ```
- **Event Broker**: Instância de `tokio::sync::broadcast::Sender<RoomEvent>` indexada por `board_id` em `Arc<DashMap<String, Room>>`.
- **Mascaramento no Broadcast**: Filtro por destinatário:
  ```rust
  if room.phase == BoardPhase::Brainstorm && card.author_session_hash != recipient_session_hash {
      card.content = "••••••••".to_string();
      card.is_masked = true;
  }
  ```

## 2. Arquitetura do Frontend (React + Vite)
- Design extraído dos protótipos visuais gerados via **Stitch MCP**.
- Componentes modulares:
  - `SafetyCheckView`: Slider/botoeira 1 a 5, gráfico de distribuição anônima.
  - `BrainstormBoardView`: Grid de colunas, cards em modo cego com indicador visual.
  - `GroupingView`: Drag and drop de cards, agrupador assistido por IA.
  - `VotingView`: Seletor de votos com cota regressiva ("3 votos restantes").
  - `ActionItemsView`: Lista de planos de ação, tag `IA Sugerido`, checkbox de conclusão.
  - `FacilitatorBar`: Barra de controle com botões de avanço de fase e timer regressivo.
- Comunicação: Hook customizado `useBoardWebSocket` com auto-reconnect exponencial e sincronização de estado.
