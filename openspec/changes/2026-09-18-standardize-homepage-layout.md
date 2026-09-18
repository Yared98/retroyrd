# Mudança: Padronização Estrutural da Homepage (RetroYrd, DailyYrd e PlanningYrd)

- **Data**: 2026-09-18
- **Autor**: Antigravity AI
- **Repositórios Impactados**: `retroyrd`, `dailyyrd`, `planningyrd`

## Contexto e Motivação
O usuário solicitou unificar a arquitetura de tela inicial dos três produtos do toolkit ágil, adotando como base a estrutura mais elegante e organizada da landing page do `PlanningYrd`:
1. Trazer para a landing page do PlanningYrd a barra completa de utilitários no canto superior direito (EcosystemSwitcher, Alternador de Idioma PT/EN, Alternador de Tema Claro/Escuro e Link GitHub).
2. Reformular a tela inicial de RetroYrd (`CreateBoardModal.tsx`) e DailyYrd (`HomeView.tsx`):
   - Hero banner centralizado externo ao card, contendo badge da marca com ícone `.brand-icon-box` iluminado, título `<h1>` e subtítulo `<p>`.
   - Card centralizado em glassmorphism (largura 480px, `border-radius: var(--radius-2xl)`) com abas de navegação internas ("Criar" vs "Entrar com Código").
   - Aba "Criar" preservando formulário específico de criação e destaques/pilares da ferramenta.
   - Aba "Entrar com Código" permitindo acesso direto informando o código da sessão e, no caso da Retro, token de facilitador opcional.
   - Histórico de sessões anteriores segregado por perfil (Facilitador vs Participante) integrado no card.
   - Rodapé consistente com largura padronizada de 480px.
