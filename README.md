<div align="center">

# 🛠️ RetroYrd

**Retrospectivas Ágeis com Segurança Psicológica & Servidor MCP em Tempo Real**

*Uma alternativa robusta, privada e auto-hospedável (Zero Cost) para retrospectivas corporativas com mascaramento criptográfico, votação dot-voting e integração bidirecional com Inteligência Artificial.*

[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg?logo=rust)](https://www.rust-lang.org)
[![Axum](https://img.shields.io/badge/Axum-0.8-blue.svg)](https://github.com/tokio-rs/axum)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Design System](https://img.shields.io/badge/Design_System-Agile_Cadence-6366f1.svg)](https://github.com/Yared98)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[🚀 Teste a Demonstração Online](https://retro.yared.com.br)** • [Objetivos](#-objetivos-principais) • [Arquitetura](#-arquitetura-e-tecnologias) • [Como Executar](#-como-executar) • [Servidor MCP](#-integração-com-ia-model-context-protocol) • [Toolkit](#-yrd-agile-toolkit)

</div>

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

#### Variáveis de Ambiente Opcionais (`.env`)
Copie o arquivo `.env.example` para `.env` para customizar:
* `BOARD_RETENTION_DAYS`: Dias de inatividade antes do auto-purge de boards antigos (Padrão: `60`).
* `UMAMI_SCRIPT_URL`: URL do script do seu Umami Analytics (ex: `https://analytics.yared.com.br/script.js`).
* `UMAMI_WEBSITE_ID`: ID do site no Umami. Se não configurado, nenhuma telemetria é carregada.

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

---

## 🧰 Yrd Agile Toolkit

O **RetroYrd** faz parte do ecossistema de cerimônias ágeis corporativas sem custo de licenciamento:

| Ferramenta | Propósito | Link de Produção |
| :--- | :--- | :--- |
| **RetroYrd** | Retrospectivas Ágeis com Segurança Psicológica, Modo Cego e Servidor MCP | [retro.yared.com.br](https://retro.yared.com.br) |
| **DailyYrd** | Standups Diárias com Roleta de Fala, Spotlight de Bloqueios e Exportação Slack | [daily.yared.com.br](https://daily.yared.com.br) |
| **PlanningYrd** | Planning Poker em Tempo Real, Métricas de Consenso e Backlog de Histórias | [planning.yared.com.br](https://planning.yared.com.br) |
| **CoffeeYrd** | Lean Coffee com Dot-Voting, Timer, Notas Compartilhadas e Votação Romana | [coffee.yared.com.br](https://coffee.yared.com.br) |

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais detalhes.
Desenvolvido por **[Yared](https://yared.com.br)**.

