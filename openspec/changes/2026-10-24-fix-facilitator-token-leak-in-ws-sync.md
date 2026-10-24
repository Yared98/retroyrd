# Mudança: Correção de Vazamento do Facilitator Token no WebSocket e Snapshots

**Data**: 24 de Outubro de 2026  
**Autor**: Agente AI Antigravity  
**Contexto**: Vulnerabilidade de Broken Access Control / Privilege Escalation relatada no endpoint WebSocket `/ws/board/{board_id}`.

---

## 1. Motivação e Vulnerabilidade
Uma análise de segurança no aplicativo **RetroYrd** identificou que o endpoint WebSocket `GET /ws/board/{board_id}?session_id=...` retornava, no payload `SYNC_STATE`, o campo `facilitator_token` para qualquer conexão — inclusive participantes anônimos não autenticados (`is_facilitator: false`).
Como o `facilitator_token` é a credencial administrativa utilizada para avançar/retroceder fases da FSM (`change_phase`) e agrupar cards (`group_cards`), qualquer participante com o link de convite conseguia extrair o token do snapshot e assumir o controle total da retrospectiva.

## 2. Causa Raiz
A struct Rust `Board` em `backend/src/models.rs` derivava `Serialize` sem restrições no campo `pub facilitator_token: String`. Consequentemente, quando `build_snapshot` montava `BoardStateSnapshot` e serializava o payload da mensagem `SYNC_STATE` (ou broadcasts `ROOM_STATE_UPDATED`), o token secreto era serializado para JSON e enviado a todos os participantes conectados.

## 3. Alterações Realizadas
- **`backend/src/models.rs`**:
  - Adicionado `#[serde(skip_serializing, default)]` ao campo `pub facilitator_token: String` da struct `Board`.
  - O `facilitator_token` permanece persistido no SQLite e acessível internamente pelo backend, mas é categoricamente excluído de qualquer serialização JSON.
  - Adicionados testes unitários:
    - `test_board_serialization_does_not_leak_facilitator_token`
    - `test_board_state_snapshot_does_not_leak_facilitator_token`
- **`frontend/src/types.ts`**:
  - Removido `facilitator_token?: string;` da interface TypeScript `Board`, garantindo que o frontend utilize exclusivamente o token mantido em estado local/sessão do facilitador.
- **`AGENTS.md` e `openspec/AGENTS.md`**:
  - Incluído princípio mandatório: "Privacidade & Segurança de Tokens: O `facilitator_token` nunca deve ser serializado em structs de retorno público de Boards ou vazado em payloads JSON de WebSocket (`SYNC_STATE`, `ROOM_STATE_UPDATED`) ou recursos públicos MCP."
- **`openspec/specs/board-lifecycle/spec.md`**:
  - Adicionado requisito `REQ-BL-005: Isolamento e Sigilo do Facilitator Token` e cenário de aceite cobrindo a garantia de sigilo em conexões WebSocket e endpoints REST públicos.

## 4. Validação
- Backend: `cargo test` executado com sucesso (16 testes unitários aprovados, 0 falhas).
- Frontend: `npm run build` executado com sucesso (TypeScript typecheck + Vite bundle aprovados).
