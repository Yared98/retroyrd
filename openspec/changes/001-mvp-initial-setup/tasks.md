# Tarefas de Implementação: 001-mvp-initial-setup

## Checklist de Execução

- [x] **Fase 1: Fundação OpenSpec**
  - [x] Criar `openspec/AGENTS.md` com diretrizes de desenvolvimento para IAs.
  - [x] Criar specs vivas (`board-lifecycle`, `anonymity-safety`, `realtime-sync`, `mcp-integration`).
  - [x] Criar pacote de mudança inicial `001-mvp-initial-setup` (`proposal.md`, `design.md`, `tasks.md`).

- [x] **Fase 2: Prototipação Visual com Stitch MCP**
  - [x] Criar projeto no Stitch MCP (`create_project`).
  - [x] Gerar tela de Facilitador & Criação de Board (`generate_screen_from_text`).
  - [x] Gerar tela da fase Safety Check (`generate_screen_from_text`).
  - [x] Gerar tela da fase Brainstorm em Modo Cego (`generate_screen_from_text`).
  - [x] Gerar tela de Grouping, Voting & AI Action Items (`generate_screen_from_text`).

- [x] **Fase 3: Backend em Rust**
  - [x] Inicializar crate `backend` com Cargo.
  - [x] Configurar SQLite com `rusqlite` e `WAL` mode.
  - [x] Implementar migrações DDL e modelos de domínio.
  - [x] Implementar Finite State Machine (FSM) estrita (`BoardPhase`).
  - [x] Implementar Event Broker e servidor WebSocket em Axum.
  - [x] Implementar mascaramento de dados em tempo real no broadcast de Brainstorm.
  - [x] Implementar endpoints HTTP de criação, consulta e exportação de boards.

- [x] **Fase 4: Servidor MCP Integrado em Rust**
  - [x] Implementar protocolo JSON-RPC 2.0 / MCP.
  - [x] Implementar Resource `retro://board/{id}/state`.
  - [x] Implementar Resource `retro://board/{id}/metrics`.
  - [x] Implementar Tool `create_card` com emissão de evento WebSocket em tempo real.
  - [x] Implementar Tool `group_cards`.

- [x] **Fase 5: Frontend SPA (React + Vite)**
  - [x] Inicializar projeto Vite + React + TypeScript.
  - [x] Implementar Design Tokens e componentes inspirados no Stitch.
  - [x] Integrar hook WebSocket com suporte à FSM e sincronização em tempo real.
  - [x] Implementar visualizadores para cada uma das 6 fases da cerimônia.

- [x] **Fase 6: Containerização e Validação**
  - [x] Criar `Dockerfile` multi-stage com compilação de Rust e frontend.
  - [x] Criar `docker-compose.yml` com volume persistente para banco de dados.
  - [x] Validar compilação do Rust e bundle do frontend.
