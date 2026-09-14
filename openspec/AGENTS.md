# OpenSpec: Instruções para Agentes de IA (AGENTS.md)

Este documento define as regras de governança, restrições arquiteturais e fluxos de desenvolvimento para agentes de IA operando no repositório **Internal Retro**.

---

## 1. Princípios Fundamentais (Invioláveis)

1. **Segurança Psicológica & Anonimato Real**:
   - NUNCA associar a tabela `safety_checks` a `user_id`, `session_hash`, IP ou qualquer dado identificador.
   - Na fase `BRAINSTORM`, os cards de outros usuários NUNCA devem ter o conteúdo de texto exposto via WebSocket. O payload deve conter `isMasked: true` e texto vazio/placeholder no backend antes do envio.
2. **Máquina de Estados Finita (FSM) Estrita**:
   - Qualquer mutação de card, voto ou etapa DEVE ser validada contra a fase ativa do board (`SAFETY_CHECK` -> `BRAINSTORM` -> `GROUPING` -> `VOTING` -> `ACTION_ITEMS` -> `ARCHIVED`).
   - Mutações inválidas para a fase atual DEVEM ser rejeitadas no backend (erro 400 / WS rejection).
3. **Zero Cost & Persistência Local**:
   - O banco de dados primário é SQLite em arquivo único com `PRAGMA journal_mode = WAL;`.
   - Não adicionar dependências de bancos externos em nuvem (ex: Postgres, Redis, DynamoDB). Toda a sincronização em tempo real é gerenciada em memória via Event Broker e persistida no SQLite.
4. **Integração MCP Nativa**:
   - O backend expõe Resources e Tools via Model Context Protocol (`@modelcontextprotocol/sdk`). Toda mutação acionada via MCP emite eventos no Event Broker que refletem imediatamente para os clientes WebSocket.

---

## 2. Metodologia OpenSpec (Spec-Driven Development)

Todas as alterações significativas no sistema devem seguir o fluxo OpenSpec:
- **`openspec/specs/`**: Fonte da Verdade viva do comportamento do sistema. Requisitos escritos em sintaxe EARS e cenários em GIVEN / WHEN / THEN.
- **`openspec/changes/<change-id>/`**: Propostas de alteração ativas contendo:
  - `proposal.md`: Motivação, escopo e justificativa.
  - `design.md`: Decisões técnicas de arquitetura e bibliotecas.
  - `tasks.md`: Checklist granular de implementação.
  - `specs/`: Delta specs (**## ADDED**, **## MODIFIED**, **## REMOVED**).
- **Não pratique "Vibe Coding"**: Ao implementar ou refatorar features, sempre consulte e mantenha os specs atualizados.

---

## 3. Estrutura de Comunicação WebSocket

O padrão de mensagens WebSocket deve seguir o formato:
```json
{
  "type": "CARD_CREATE | CARD_UPDATE | CARD_DELETE | CARD_GROUP | VOTE_TOGGLE | SAFETY_SUBMIT | PHASE_CHANGE",
  "payload": { ... },
  "timestamp": 1726330000000
}
```

---

## 4. Glossário do Domínio
- **Facilitador**: Usuário que criou a sessão e detém o token de administração (`facilitator_token`), responsável por avançar as fases da FSM.
- **Participante**: Membro da equipe conectado via link de convite, identificado por um `session_hash` efêmero.
- **Modo Cego (Blind Brainstorm)**: Mecanismo visual e de rede onde ninguém lê os cards alheios até a fase de agrupamento.
- **Action Item**: Tarefa gerada na fase 5, podendo ser criada por humanos ou injetada de forma autônoma por um agente via MCP (`is_ai_generated: true`).
