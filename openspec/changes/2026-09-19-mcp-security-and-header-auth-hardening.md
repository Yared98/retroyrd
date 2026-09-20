# Mudança: Blindagem de Segurança e Autenticação por Headers HTTP no MCP

**Data**: 19 de Setembro de 2026  
**Autor**: Agente AI Antigravity  
**Contexto**: Revisão do modelo de segurança e diferenciação de facilitador/participante nos servidores MCP do ecossistema Yrd.

---

## 1. Motivação
A auditoria identificou que clientes MCP modernos (como Claude Desktop, Cursor e Windsurf) enviam credenciais de autorização preferencialmente via cabeçalhos HTTP (`Authorization: Bearer <token>` ou `x-facilitator-token`), enquanto ferramentas críticas e mascaramento de recursos não consideravam headers, dependendo de parâmetros explícitos.

## 2. Alterações Realizadas
- **`backend/src/mcp.rs`**:
  - `handle_mcp_request` agora extrai `headers: HeaderMap` automaticamente pelo Axum.
  - Implementada a função de resolução de token `extract_facilitator_token`, com fallback em cascata (Argumentos do JSON-RPC ➔ Cabeçalho `Authorization: Bearer` ➔ Cabeçalho `x-facilitator-token`).
  - Atualizada leitura de recursos (`retro://board/{id}/state` e `retro://board/{id}/metrics`) para reconhecer facilitador autenticado via cabeçalho HTTP, evitando exposição de segredos na URI.
  - As ferramentas privilegiadas `change_phase` e `group_cards` agora aceitam o token via header ou argumento.
  - Adicionado teste unitário `test_mcp_read_resource_blind_mode_masking` com validação de header Bearer.
- **`openspec/specs/mcp-integration/spec.md`**:
  - Requisitos atualizados para refletir suporte obrigatório a cabeçalhos HTTP e modelo de permissões de facilitador vs participante.

## 3. Validação
- Executado `cargo test` no backend do RetroYrd: **12 testes unitários passaram (0 falhas)**.
