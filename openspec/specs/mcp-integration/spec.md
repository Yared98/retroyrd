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

### REQ-MCP-004: Descoberta e Acesso Padronizado na Interface Web
A interface web **DEVE** disponibilizar um botão padronizado de MCP (`Bot` icon + "MCP" pill) tanto na tela inicial (`CreateBoardModal`) quanto na barra superior do board (`Header`). Ao ser acionado, a gaveta de telemetria MCP deve apresentar:
- URL do endpoint MCP (`/mcp`).
- Resource URIs contextualizados para o board atual ou modelo genérico.
- Configuração JSON para Claude Desktop e Cursor com 1 clique de cópia.
- Catálogo de ferramentas e instruções detalhadas de setup.

---

## 3. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: LLM Gera Action Item via MCP
- **GIVEN** que o board está na fase `ACTION_ITEMS`
- **WHEN** um agente de IA invoca a tool `create_card` com `board_id: "01HGW"`, `column_id: "col_action"`, `content: "Adicionar retry no worker de pagamentos"`, `is_action_item: true`
- **THEN** o card é inserido no banco de dados com `is_ai_generated: true`
- **AND** um evento WebSocket `CARD_CREATE` é transmitido em tempo real para todos os clientes conectados ao board.

### Cenário: Usuário Acessa Configuração MCP na Interface
- **GIVEN** que o usuário está na página inicial ou em uma retrospectiva ativa
- **WHEN** clica no botão com ícone de Robô e rótulo "MCP"
- **THEN** a gaveta de telemetria MCP é exibida com a URL `${origin}/mcp` e o snippet JSON formatado pronto para cópia.
