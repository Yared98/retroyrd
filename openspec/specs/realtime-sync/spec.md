# Especificação: Sincronização em Tempo Real (Event Broker WebSocket)

## 1. Visão Geral
Define o protocolo de comunicação bidirecional via WebSockets, modelo de mensagens JSON, canais de broadcast com isolamento por board e sincronização de estado com reconexão.

---

## 2. Requisitos (EARS)

### REQ-RT-001: Formato Unificado de Mensagens
Todas as mensagens que trafegam entre cliente e servidor **DEVEM** aderir ao esquema JSON:
```json
{
  "type": "<EVENT_TYPE>",
  "payload": { ... },
  "timestamp": 1726330000000
}
```

### REQ-RT-002: Tipos de Eventos Suportados
O servidor **DEVE** suportar os seguintes tipos de evento:
- `SYNC_STATE`: Enviado pelo servidor logo após a conexão WebSocket inicial com o snapshot filtrado da sala.
- `SAFETY_SUBMIT`: Submissão de nota (1 a 5).
- `CARD_CREATE`: Criação de novo card com `column_id` e `content`.
- `CARD_UPDATE`: Edição de conteúdo (apenas na fase `BRAINSTORM` e pelo autor).
- `CARD_DELETE`: Exclusão de card (apenas na fase `BRAINSTORM` e pelo autor).
- `CARD_GROUP`: Agrupamento de card secundário sob um card pai (fase `GROUPING`).
- `VOTE_TOGGLE`: Votação em card respeitando cota máxima de votos por sessão (fase `VOTING`).
- `ACTION_CREATE`: Criação de item de ação manual ou via IA (fase `ACTION_ITEMS`).
- `ACTION_UPDATE`: Atualização de status do item de ação (fase `ACTION_ITEMS`).
- `PHASE_CHANGE`: Avanço de fase pelo facilitador.
- `PRESENCE_UPDATE`: Notificação broadcast de atualização de contagem anônima de clientes WebSocket conectados na sala (`online_count`).

### REQ-RT-003: Isolamento por Sala (Board Channel)
O Event Broker no backend **DEVE** manter canais broadcast isolados para cada `board_id`. Uma mutação em uma sala nunca deve ser enviada para conexões de outros boards.

---

## 3. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: Conexão e Snapshot Inicial
- **GIVEN** que um cliente conecta ao endpoint `/ws/board/{boardId}`
- **WHEN** o handshake WebSocket é concluído
- **THEN** o servidor envia imediatamente a mensagem `SYNC_STATE` contendo a fase atual, as colunas, os cards (com o devido mascaramento de Brainstorm), a contagem atual de conexões online (`online_count`) e o resumo de votos/safety checks.

### Cenário: Entrada ou Saída de Participantes (Presença em Tempo Real)
- **GIVEN** que clientes estão conectados na sala `/ws/board/{boardId}`
- **WHEN** uma nova conexão é aceita ou uma conexão existente é encerrada
- **THEN** o servidor emite uma mensagem broadcast `PRESENCE_UPDATE` com a contagem atualizada de clientes ativos na sala (`online_count`), garantindo anonimato absoluto sem expor identificadores dos participantes.
