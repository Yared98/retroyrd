# Governança do Projeto RetroYrd (AGENTS.md)

Este projeto adota a metodologia **Spec-Driven Development** através do diretório `openspec/`.

## Regras Obrigatórias para Agentes de IA
1. **Segurança Psicológica & Anonimato**:
   - `safety_checks` nunca associado a identidade de usuário, IP ou token.
   - Na fase de Brainstorming, os cards alheios permanecem mascarados.
2. **Máquina de Estados Finita (FSM)**:
   - Respeitar estritamente a progressão das fases (`SAFETY_CHECK` -> `BRAINSTORM` -> `GROUPING` -> `VOTING` -> `ACTION_ITEMS` -> `ARCHIVED`).
3. **Servidor MCP Nativo & Event Broker**:
   - Mutações via MCP (`POST /mcp`) propagam eventos via WebSocket para sincronização em tempo real.
4. **Sincronização Contínua do OpenSpec**:
   - Toda alteração funcional, de endpoint, segurança ou UI deve ser refletida em `openspec/specs/` e documentada em `openspec/changes/`.
   - Consulte `openspec/AGENTS.md` e as especificações em `openspec/specs/` para orientações detalhadas.
