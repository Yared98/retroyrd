# Mudança 004: Token de Facilitador Fora da Barra de Endereço

**Data**: 23 de Novembro de 2026  
**Contexto**: Eliminação do vazamento de credenciais administrativas do facilitador pela URL (`/board/{id}?token=...`).

---

## 1. Problema e Motivação
Quando o facilitador criava ou entrava em um board de retrospectiva, o token de autenticação administrativa (`facilitator_token`) era mantido diretamente na query string da URL (`/board/{id}?token=...`).
Ao convidar participantes copiando a URL da barra de endereços do navegador, o controle total de facilitação era involuntariamente concedido a qualquer membro da equipe. Além disso, o token era persistido no histórico de navegação, logs de proxy/servidor e Referer headers.

## 2. Solução Implementada
Seguindo a especificação em `openspec/specs/facilitator-token/spec.md` (portada do ecossistema coffeeyrd):

1. **Utilitário Centralizado (`frontend/src/utils/facilitatorToken.ts`)**:
   - `storeFacilitatorToken`: armazena em `localStorage` e `sessionStorage` sob a chave `facilitator_token_{boardId}`.
   - `getStoredFacilitatorToken`: recupera o token persistido.
   - `consumeTokenFromUrl`: consome tokens presentes em query string (`?token=`) ou fragmento (`#token=`), valida regex `^[A-Za-z0-9_-]{10,128}$`, persiste no storage e limpa a barra de endereço com `history.replaceState`.
   - `buildFacilitatorLink`: gera `/board/{id}#token={token}` para cofacilitação sem expor o token em requisições de rede.
   - `buildParticipantLink`: gera `/board/{id}` limpo.

2. **Inicialização e Criação no App (`frontend/src/App.tsx`)**:
   - Estado de `facilitatorToken` inicializado via `consumeTokenFromUrl(boardId)` com fallback para `getStoredFacilitatorToken(boardId)`.
   - Criação de board executa `window.history.pushState` sem o token na URL.
   - Atualiza `storeFacilitatorToken` ao invés de manter apenas em `sessionStorage`.

3. **Entrada e Sessões Recentes (`frontend/src/components/CreateBoardModal.tsx`)**:
   - `handleJoinSubmit` persiste o token via `storeFacilitatorToken` se digitado e navega sem token na URL.
   - Link de acesso de facilitador das sessões recentes aponta para `/board/{id}#token={token}`.

4. **Controles de Compartilhamento no Header (`frontend/src/components/Header.tsx`)**:
   - Botão "Convidar" copia estritamente o link de participante (`buildParticipantLink`).
   - Novo botão exclusivo para o facilitador autenticado ("Link de facilitador" com ícone `KeyRound`), copiando o link seguro de cofacilitação (`buildFacilitatorLink`).

5. **Internacionalização (`i18n`)**:
   - Chaves `header.btn_facilitator_link` e `header.tooltip_facilitator_link` adicionadas nos locales `pt.ts` e `en.ts`.
