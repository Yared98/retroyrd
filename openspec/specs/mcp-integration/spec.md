# Especificação: Integração com Model Context Protocol (MCP)

## 1. Visão Geral
Define a camada de servidor MCP embutida no backend, expondo o estado da retrospectiva para leitura analítica por LLMs e ferramentas para mutação autônoma de cards, agrupamentos e controle de fases, com isolamento estrito de papéis (Participante vs. Facilitador).

---

## 2. Requisitos (EARS)

### REQ-MCP-001: Exposição de Resources
O servidor MCP **DEVE** fornecer os seguintes resources no formato JSON/Markdown estruturado:
- `retro://board/{board_id}/state`: Dump completo das colunas, cards consolidados, contagem de votos e itens de ação. Suporta privilégios de facilitador via query param `?token={token}` ou cabeçalho HTTP `Authorization: Bearer {token}`. No modo anônimo (`BRAINSTORM`), cards alheios permanecem mascarados (`••••••••`).
- `retro://board/{board_id}/metrics`: Métricas de participação, média e distribuição do Safety Check, volumetria de cards por coluna e tópicos mais votados. Suporta privilégios de facilitador via query param ou cabeçalho HTTP.

### REQ-MCP-002: Exposição de Tools e Controle de Acesso
O servidor MCP **DEVE** disponibilizar as seguintes ferramentas executáveis por LLMs:
- **`create_card`**: Parâmetros: `board_id` (string), `column_id` (string), `content` (string), `is_action_item` (boolean opcional), `facilitator_token` (string opcional). Insere um novo card ou item de ação com `is_ai_generated: true` e emite broadcast WebSocket imediato.
- **`group_cards`**: Parâmetros: `board_id` (string), `parent_card_id` (string), `child_card_ids` (array de strings), `facilitator_token` (opcional se fornecido no cabeçalho HTTP). Exige token de facilitador válido.
- **`change_phase`**: Parâmetros: `board_id` (string), `target_phase` (string), `facilitator_token` (opcional se fornecido no cabeçalho HTTP). Exige token de facilitador válido.

### REQ-MCP-003: Validação de FSM nas Ações de IA
A execução de tools pelo MCP **DEVE** respeitar rigorosamente a FSM do board:
- Injeção de cards normais é permitida em `BRAINSTORM` ou pré-cerimônia (observabilidade).
- Injeção de itens de ação é permitida em `ACTION_ITEMS`.
- Agrupamento é permitido apenas em `GROUPING`.
- Mutações em `ARCHIVED` são estritamente rejeitadas.

### REQ-MCP-004: Autenticação via Cabeçalhos HTTP Padrão
O endpoint MCP **DEVE** aceitar autenticação do facilitador tanto por parâmetro nos payloads JSON-RPC quanto pelos cabeçalhos padrão:
- `Authorization: Bearer <facilitator_token>`
- `x-facilitator-token: <facilitator_token>`

### REQ-MCP-005: Descoberta e Acesso Padronizado na Interface Web
A interface web **DEVE** disponibilizar um botão padronizado de MCP (`Bot` icon + "MCP" pill) tanto na tela inicial (`CreateBoardModal`) quanto na barra superior do board (`Header`). Ao ser acionado, a gaveta de telemetria MCP deve apresentar:
- URL do endpoint MCP (`/mcp`).
- Resource URIs contextualizados para o board atual ou modelo genérico.
- Configuração JSON para Claude Desktop e Cursor com 1 clique de cópia.
- Catálogo de ferramentas e instruções detalhadas de setup.

---

## 3. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: Agente de IA com Cabeçalho HTTP Autentica no MCP
- **GIVEN** que o agente envia requisição POST para `/mcp` contendo o cabeçalho `Authorization: Bearer <facilitator_token>`
- **WHEN** invoca `change_phase` ou lê `retro://board/{id}/state`
- **THEN** o servidor reconhece a identidade do facilitador sem exigir o token na URL ou nos argumentos do JSON-RPC.

### Cenário: LLM Gera Action Item via MCP
- **GIVEN** que o board está na fase `ACTION_ITEMS`
- **WHEN** um agente de IA invoca a tool `create_card` com `board_id: "01HGW"`, `column_id: "col_action"`, `content: "Adicionar retry no worker de pagamentos"`, `is_action_item: true`
- **THEN** o card é inserido no banco de dados com `is_ai_generated: true`
- **AND** um evento WebSocket `CARD_CREATE` é transmitido em tempo real para todos os clientes conectados ao board.
