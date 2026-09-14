# Proposta de Mudança: 001-mvp-initial-setup

## 1. Contexto e Motivação
Desenvolvimento da versão inicial (MVP) do **Internal Retro**, um sistema de retrospectivas ágeis em tempo real, privado, sem custo de licenciamento (substituindo ferramentas pagas como EasyRetro), projetado com foco em segurança psicológica, anonimato e integração bidirecional com LLMs via MCP.

## 2. Escopo da Mudança

### Em Escopo (In Scope)
- Estrutura completa de especificações OpenSpec.
- Backend em **Rust** (Axum, Tokio, WebSockets, SQLite WAL com Rusqlite).
- Finite State Machine (FSM) de 6 fases da cerimônia.
- Anonimato estrito com mascaramento em rede no modo cego (Brainstorm).
- Servidor MCP embutido (JSON-RPC com Tools e Resources).
- Prototipação visual de todas as fases via **Stitch MCP**.
- Frontend SPA em React + Vite consumindo WebSockets.
- Configuração de containerização Docker e Compose com volume SQLite persistente.

### Fora de Escopo (Out of Scope)
- Autenticação corporativa pesada (SSO/OAuth SAML) - o sistema é baseado em `facilitator_token` e `session_hash` anônimo.
- Gravação de áudio ou videoconferência integrada (utiliza-se Slack/Teams/Meet em paralelo).
- Integração com Jira/Trello no MVP (delegada para a interface MCP).
