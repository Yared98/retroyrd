# Especificação: Ciclo de Vida do Board e Máquina de Estados (FSM)

## 1. Visão Geral
Define o ciclo de vida completo de um board de retrospectiva, desde a criação pelo facilitador, geração de identificadores opacos, compartilhamento e controle rigoroso da Máquina de Estados Finita (FSM).

---

## 2. Requisitos (EARS)

### REQ-BL-001: Criação de Board
Quando um facilitador solicita a criação de um novo board, o sistema **DEVE** gerar um identificador criptograficamente seguro e opaco (ULID ou UUIDv4), criar as colunas padrão ("O que correu bem", "O que pode melhorar", "Ações/Dúvidas"), gerar um `facilitator_token` secreto e inicializar a fase como `SAFETY_CHECK`.

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
- Durante `VOTING`: Adição/remoção de votos dentro da cota configurada (ex: máx 5 por participante) é permitida.
- Durante `ACTION_ITEMS`: Criação e edição de itens de ação (manual ou via MCP) são permitidas. Votação e criação de cards de brainstorm são bloqueadas.
- Durante `ARCHIVED`: O board torna-se estritamente Read-Only. Nenhuma mutação é aceita.

---

## 3. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: Criação de Sessão
- **GIVEN** que um facilitador envia um payload de criação com o título "Sprint 42 Retro"
- **WHEN** a requisição é processada com sucesso
- **THEN** o sistema retorna `boardId`, `inviteUrl` e `facilitatorToken`
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
