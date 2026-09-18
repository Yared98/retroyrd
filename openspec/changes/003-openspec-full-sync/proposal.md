# Proposal: OpenSpec Full Sync — 2026-09-18

## Tipo
`spec-sync` | Sincronização de documentação com o código atual

## Escopo
Auditoria e atualização completa dos specs do RetroYrd para refletir o estado real da implementação.

## Mudanças Registradas

### `specs/board-lifecycle/spec.md` — v1.1 → v1.2
- **Adicionado**: Seção `API REST` com docs de `POST /api/boards`, `GET /api/boards/{id}`, `GET /api/boards/{id}/export`
- **Adicionado**: `REQ-BL-004` — Auto-purge de boards via `BOARD_RETENTION_DAYS` (padrão 60 dias, intervalo 24h)
- **Adicionado**: Cores padrão das colunas (`#10B981`, `#F43F5E`, `#06B6D4`)
- **Adicionado**: Cenário de aceite para auto-purge

### Pendências
- `specs/anonymity-safety/spec.md`: Verificar se cobre o mascaramento de safety_check por sessão hash
- `specs/realtime-sync/spec.md`: Verificar cobertura de heartbeat/ping-pong
