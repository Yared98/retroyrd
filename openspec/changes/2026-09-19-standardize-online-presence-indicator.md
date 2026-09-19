# Padronização do Indicador de Presença Online nos 4 Projetos Yrd

## Contexto
Durante a entrevista de alinhamento (`/grill-me`), foi decidido padronizar nos 4 projetos do ecossistema (**RetroYrd**, **PlanningYrd**, **CoffeeYrd**, **DailyYrd**) um indicador visual de presença em tempo real e status de conexão no Header principal de cada aplicação.

A solução cumpre estritamente os princípios de **Segurança Psicológica & Anonimato** da governança `AGENTS.md`, expondo apenas a contagem numérica agregada de conexões ativas na sala/sessão (`online_count`), sem vincular identidades de usuários ou revelar votos em etapas anônimas.

## Mudanças Realizadas
1. **Pílula Padronizada no Header**:
   - Ícone de participantes `Users` (`lucide-react`).
   - Ponto de status com micro-animação de pulso:
     - **Verde esmeralda** quando sincronizado/conectado (`N online`).
     - **Âmbar** com texto `Reconectando...` caso a conexão WebSocket caia ou esteja oscilando.
   - Posicionamento consistente ao lado dos utilitários de compartilhamento e tema.
   - Suporte completo a internacionalização (`pt` e `en`).

2. **RetroYrd**:
   - Backend (`ws.rs` e `models.rs`): Rastreamento de conexões via `room_sender.receiver_count()`, emissão de eventos `PRESENCE_UPDATE` no broadcast ao conectar e desconectar, e inclusão de `online_count` no snapshot inicial (`BoardStateSnapshot`).
   - Frontend: `useBoardSocket` trata `PRESENCE_UPDATE`, e `Header.tsx` renderiza o indicador de presença com o badge de reconexão.

3. **CoffeeYrd**:
   - Backend já mantinha `SessionHub.online_count` e transmitia em `SessionSnapshot`.
   - Frontend: Adição das chaves de i18n em `pt.ts` e `en.ts`, e renderização da pílula no `Header.tsx`.

4. **PlanningYrd**:
   - Backend já mantinha o ciclo de vida de participantes na memória com `PresenceUpdated`.
   - Frontend: Integração do status de reconexão e contagem de presença no `Header.tsx`, atualizando `i18n`.

5. **DailyYrd**:
   - Migração do antigo ícone `Radio` para o padrão unificado com `Users`, ponto pulsante verde e tratamento de estado de reconexão (`isConnected`).
