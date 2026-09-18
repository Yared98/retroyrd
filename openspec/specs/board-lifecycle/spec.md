# Especificação: Ciclo de Vida do Board e Máquina de Estados (FSM)

**Versão:** 1.2.0 | **Atualizado:** 2026-09-18

## 1. Visão Geral
Define o ciclo de vida completo de um board de retrospectiva, desde a criação pelo facilitador, geração de identificadores opacos, compartilhamento e controle rigoroso da Máquina de Estados Finita (FSM). Inclui também o mecanismo de auto-purge para higienização de dados persistidos.

---

## 2. API REST

### `POST /api/boards`
Cria um novo board de retrospectiva.

**Request Body:**
```json
{
  "title": "Sprint 42 Retro",
  "max_votes_per_user": 5
}
```

**Response `201`:**
```json
{
  "id": "01HGW...",
  "title": "Sprint 42 Retro",
  "facilitator_token": "01HGX...",
  "invite_url": "/board/01HGW..."
}
```

- `max_votes_per_user`: Padrão `5` se omitido.
- `title`: Padrão `"Agile Retrospective"` se vazio.

### `GET /api/boards/{id}`
Retorna o estado atual do board com suas colunas.

**Response `200`:**
```json
{
  "id": "string",
  "title": "string",
  "phase": "SAFETY_CHECK | BRAINSTORM | GROUPING | VOTING | ACTION_ITEMS | ARCHIVED",
  "created_at": 1726700000000,
  "columns": [...]
}
```

### `GET /api/boards/{id}/export`
Gera e faz download de um relatório completo da retrospectiva em Markdown.

**Response `200`:** `Content-Type: text/markdown`

Inclui: colunas + cards (com hierarquia de agrupamentos), contagem de votos, cards gerados por IA (`[🤖 IA]`), itens de ação com responsáveis e status.

---

## 3. Requisitos (EARS)

### REQ-BL-001: Criação de Board
Quando um facilitador solicita a criação de um novo board, o sistema **DEVE** gerar um identificador criptograficamente seguro e opaco (ULID), criar as colunas padrão (`Went Well` #10B981, `To Improve` #F43F5E, `Ideas & Kudos` #06B6D4), gerar um `facilitator_token` secreto (ULID) e inicializar a fase como `SAFETY_CHECK`.

### REQ-BL-002: FSM de Fases da Retrospectiva
O sistema **DEVE** impor a seguinte sequência estrita de transição de fases, permitindo o avanço apenas para quem possui o `facilitator_token`:
1. `SAFETY_CHECK`
2. `BRAINSTORM`
3. `GROUPING`
4. `VOTING`
5. `ACTION_ITEMS`
6. `ARCHIVED`

### REQ-BL-003: Validação de Mutações por Fase
O sistema **DEVE** rejeitar qualquer mutação incompatível com a fase corrente:
- Durante `SAFETY_CHECK`: Apenas submissão de nota de segurança psicológica é permitida.
- Durante `BRAINSTORM`: Criação, edição e exclusão de cards pelo próprio autor são permitidas. Agrupamento e votação são bloqueados.
- Durante `GROUPING`: Agrupamento e merge de cards (manual ou via IA) são permitidos. Criação e edição de conteúdo de cards são bloqueadas.
- Durante `VOTING`: Adição/remoção de votos dentro da cota configurada (máx `max_votes_per_user` por participante) é permitida.
- Durante `ACTION_ITEMS`: Criação e edição de itens de ação (manual ou via MCP) são permitidas. Votação e criação de cards de brainstorm são bloqueadas.
- Durante `ARCHIVED`: O board torna-se estritamente Read-Only. Nenhuma mutação é aceita.

### REQ-BL-004: Auto-Purge de Boards Expirados
O sistema **DEVE** executar uma rotina automática de purge de boards com mais de N dias (configurável via variável de ambiente `BOARD_RETENTION_DAYS`, padrão: `60`). A rotina é executada na inicialização do servidor e a cada 24 horas via `tokio::time::interval`.

---

## 4. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: Criação de Sessão
- **GIVEN** que um facilitador envia um payload de criação com o título `"Sprint 42 Retro"`
- **WHEN** a requisição é processada com sucesso
- **THEN** o sistema retorna `id`, `invite_url` e `facilitator_token`
- **AND** o estado inicial do board é definido como `SAFETY_CHECK`.

### Cenário: Transição Não Autorizada de Fase
- **GIVEN** um board na fase `BRAINSTORM`
- **WHEN** um participante sem `facilitator_token` envia evento `PHASE_CHANGE` para `GROUPING`
- **THEN** o sistema rejeita a operação com erro de autorização
- **AND** o board permanece na fase `BRAINSTORM`.

### Cenário: Tentativa de Criar Card em Fase Arquivada
- **GIVEN** um board na fase `ARCHIVED`
- **WHEN** qualquer cliente tenta emitir um evento `CARD_CREATE`
- **THEN** o sistema rejeita a mutação com erro `INVALID_PHASE_ACTION`
- **AND** nenhum registro é criado no banco de dados.

### Cenário: Auto-Purge de Boards Antigos
- **GIVEN** que `BOARD_RETENTION_DAYS=60` está configurado
- **WHEN** a rotina periódica (24h) é disparada
- **THEN** todos os boards com `created_at` anterior a 60 dias são removidos do SQLite
- **AND** um log `purged_boards = N` é emitido se N > 0.
