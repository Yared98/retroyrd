# Change: Console Administrativo Seguro e Espaçoso (/admin) no RetroYrd

## Contexto & Motivação
Implementação de observabilidade administrativa centralizada, rastreamento de volume de dados (cards, boards, votos e action items) e controle manual de ciclo de vida com expurgo (> 60 dias), mantendo o alinhamento com a identidade visual espaçosa da Home e a paleta Indigo do RetroYrd.

## Especificação Técnica
1. **Segurança de Acesso**:
   - Autenticação via `ADMIN_TOKEN` com comparação em tempo constante (`constant_time_eq`) para proteção contra timing attacks.
   - Rate limiting de 5 tentativas a cada 15 minutos por endereço IP (retornando HTTP 429 quando excedido).
   - Sessão via cookie `HttpOnly; SameSite=Strict; Max-Age=7200` (`yrd_admin_session`) e suporte a `Authorization: Bearer <token>`.
2. **Endpoints Administrativos**:
   - `POST /api/admin/login`: Autenticação e emissão do cookie seguro.
   - `POST /api/admin/logout`: Revogação da sessão.
   - `GET /api/admin/verify`: Verificação de status de autorização.
   - `GET /api/admin/metrics`: Coleta de métricas (total de boards, ativos em 30d, cards, votos, action items, boards em memória e tamanho do SQLite).
   - `POST /api/admin/purge`: Disparo manual de expurgo de boards inativos (> 60 dias).
   - `DELETE /api/admin/boards/{id}`: Exclusão pontual de board com cascading delete.
3. **UI / Design System**:
   - Alinhamento total com a Home: layout fluido `.admin-layout`, `.admin-main` (`max-width: 1200px`), tipografia `Plus Jakarta Sans` e `JetBrains Mono`.
   - Grid de cartões KPI espaçoso com fundo `var(--bg-surface)`, bordas `var(--border-highlight)` e elevação suave.
   - Paleta de cores oficial RetroYrd: Indigo (`#6366f1` / `#4f46e5`), ícone `ShieldCheck`.
   - Tabela de boards com paginação visual, cópia rápida de ID e link direto para boards.
