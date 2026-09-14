# Especificação: Integração com Model Context Protocol (MCP)

## 1. Visão Geral
Define a camada de servidor MCP embutida no backend, expondo o estado da retrospectiva para leitura analítica por LLMs e ferramentas para mutação autônoma de cards e agrupamentos.

---

## 2. Requisitos (EARS)

### REQ-MCP-001: Exposição de Resources
O servidor MCP **DEVE** fornecer os seguintes resources no formato JSON/Markdown estruturado:
- `retro://board/{board_id}/state`: Dump completo das colunas, cards consolidados, contagem de votos e itens de ação.
- `retro://board/{board_id}/metrics`: Métricas de participação, média e distribuição do Safety Check, volumetria de cards por coluna e tópicos mais votados.

### REQ-MCP-002: Exposição de Tools
O servidor MCP **DEVE** disponibilizar as seguintes ferramentas executáveis por LLMs:
- **`create_card`**: Parâmetros: `board_id` (string), `column_id` (string), `content` (string), `is_action_item` (boolean opcional). Insere um novo card marcado como `is_ai_generated: true` e emite broadcast WebSocket imediato para os participantes conectados.
- **`group_cards`**: Parâmetros: `board_id` (string), `parent_card_id` (string), `child_card_ids` (array de strings). Agrupa semanticamente múltiplos cards sob um card consolidado durante a fase `GROUPING`.

### REQ-MCP-003: Validação de FSM nas Ações de IA
A execução de tools pelo MCP **DEVE** respeitar rigorosamente a FSM do board:
- Injeção de cards normais é permitida em `BRAINSTORM` ou pré-cerimônia (observabilidade).
- Injeção de itens de ação é permitida em `ACTION_ITEMS`.
- Agrupamento é permitido apenas em `GROUPING`.
- Mutações em `ARCHIVED` são estritamente rejeitadas.

---

## 3. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: LLM Gera Action Item via MCP
- **GIVEN** que o board está na fase `ACTION_ITEMS`
- **WHEN** um agente de IA invoca a tool `create_card` com `board_id: "01HGW"`, `column_id: "col_action"`, `content: "Adicionar retry no worker de pagamentos"`, `is_action_item: true`
- **THEN** o card é inserido no banco de dados com `is_ai_generated: true`
- **AND** um evento WebSocket `CARD_CREATE` é transmitido em tempo real para todos os clientes conectados ao board.
