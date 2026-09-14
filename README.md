# 🛠️ Internal Retro (MVP)

Sistema de retrospectivas ágeis em tempo real, privado e auto-hospedado (**Zero Cost**), projetado para substituir ferramentas pagas como EasyRetro e contornar limitações de contas gratuitas (limite de boards, exportação e recursos bloqueados).

Projetado sob a metodologia **OpenSpec (Spec-Driven Development)** para orquestração com IAs e prototipado visualmente via **Stitch MCP**.

---

## 🎯 Objetivos Principais

* **Zero Cost:** Roda na infraestrutura interna existente via container único ou Docker Compose, com banco SQLite em arquivo único e zero custo de licenciamento.
* **Governança de Dados:** Informações sensíveis de retrospectivas nunca saem da rede interna da empresa.
* **Segurança Psicológica & Anonimato Real:** A tabela de `safety_checks` não possui chave estrangeira ou identificador de sessão. Modo Cego (*Blind Brainstorm*) ativo com mascaramento criptográfico em rede (`••••••••`).
* **Automação Bidirecional via IA (Servidor MCP):** Servidor MCP integrado expondo Resources e Tools para que LLMs extraiam insights e injetem Action Items no board em tempo real via WebSocket.

---

## 🏗️ Arquitetura e Tecnologias

| Componente | Tecnologia | Papel |
| :--- | :--- | :--- |
| **Backend** | **Rust** (Axum + Tokio + WebSockets) | Binário nativo ultrarrápido (< 20MB RAM), FSM tipada e Event Broker em memória via `tokio::sync::broadcast`. |
| **Persistência** | **SQLite (WAL Mode)** | Arquivo único persistido via volume Docker com alta concorrência assíncrona. |
| **Frontend** | **React + Vite + TypeScript** | SPA reativa consumindo estado em tempo real via WebSockets. Design system *Agile Cadence* prototipado via **Stitch MCP**. |
| **IA / MCP** | **Model Context Protocol** | Servidor nativo JSON-RPC 2.0 embutido (`/mcp`) com Resources e Tools para LLMs. |
| **Metodologia** | **OpenSpec (SDD)** | Especificações vivas em `openspec/specs/`, `AGENTS.md` e propostas em `openspec/changes/`. |

---

## 🔄 Ciclo de Vida da Retrospectiva (FSM de 6 Fases)

O board segue uma Máquina de Estados Finita rigorosa validada no backend em Rust:

```
[1. SAFETY_CHECK] ➔ [2. BRAINSTORM] ➔ [3. GROUPING] ➔ [4. VOTING] ➔ [5. ACTION_ITEMS] ➔ [6. ARCHIVED]
```

1. **SAFETY_CHECK**: Checagem de segurança psicológica (1 a 5). Votos anônimos sem identificador de rede. Resumo agregado visível apenas para o facilitador.
2. **BRAINSTORM**: Modo cego. Cada participante vê o texto dos próprios cards; cards alheios são mascarados no broadcast do servidor como `••••••••`.
3. **GROUPING**: Revelação simultânea de todos os cards. Agrupamento de cards sob tópicos comuns.
4. **VOTING**: Votação respeitando a cota configurada por participante.
5. **ACTION_ITEMS**: Criação de planos de ação manuais ou **injetados autonomamente por agentes de IA via MCP**.
6. **ARCHIVED**: Modo estritamente Read-Only. Bloqueio de qualquer mutação e exportação em Markdown.

---

## 🤖 Integração com IA (Model Context Protocol)

O backend opera como um **Servidor MCP** em `http://localhost:8080/mcp`.

### Resources Disponíveis
* `retro://board/{board_id}/state`: Snapshot consolidado das colunas, cards e contagem de votos.
* `retro://board/{board_id}/metrics`: Dados analíticos, média do Safety Check e tópicos mais votados.

### Tools Disponíveis
* **`create_card`**: Permite à IA criar cards ou planos de ação informando `board_id`, `content` e `is_action_item`. Reflete instantaneamente no WebSocket dos participantes.
* **`group_cards`**: Permite à IA consolidar cards semanticamente idênticos durante a fase `GROUPING`.

---

## 🚀 Como Executar

### Opção 1: Via Docker Compose (Recomendado para Produção / Zero Cost)

```bash
docker-compose up -d --build
```
A aplicação estará disponível em `http://localhost:8080` com persistência automática no volume `retro_data`.

---

### Opção 2: Desenvolvimento Local

#### 1. Backend (Rust)
```bash
cd backend
cargo run
```
O servidor iniciará em `http://localhost:8080`.

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
O frontend estará acessível em `http://localhost:5173` e se conectará automaticamente à API e WebSocket na porta `8080`.

---

## 📁 Estrutura de Diretórios

```text
retroyrd/
├── openspec/                         # Metodologia Spec-Driven Development
│   ├── AGENTS.md                     # Diretrizes e governança para agentes de IA
│   ├── specs/                        # Especificações vivas (EARS + GIVEN/WHEN/THEN)
│   │   ├── board-lifecycle/spec.md   # Criação e FSM de 6 fases
│   │   ├── anonymity-safety/spec.md  # Garantias de anonimato e blind brainstorm
│   │   ├── realtime-sync/spec.md     # Protocolo WebSocket e Event Broker
│   │   └── mcp-integration/spec.md   # Resources e Tools do MCP
│   └── changes/
│       └── 001-mvp-initial-setup/    # Proposta de mudança inicial
├── backend/                          # Backend em Rust (Axum)
│   ├── src/
│   │   ├── main.rs                   # Servidor HTTP, rotas e static serving
│   │   ├── db.rs                     # SQLite com WAL mode e queries
│   │   ├── fsm.rs                    # Finite State Machine estrita
│   │   ├── ws.rs                     # WebSocket broker e mascaramento em tempo real
│   │   ├── mcp.rs                    # Servidor nativo Model Context Protocol
│   │   ├── models.rs                 # Structs de domínio e mensagens
│   │   └── state.rs                  # AppState e hash SHA-256 de sessão
│   └── Cargo.toml
├── frontend/                         # Frontend SPA (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/               # Header, BoardColumn, RetroCardItem, Modais
│   │   ├── hooks/                    # useBoardSocket com sincronização e reconexão
│   │   ├── types.ts                  # Tipos TypeScript alinhados aos modelos Rust
│   │   ├── index.css                 # Design System "Agile Cadence" (Stitch MCP)
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```
