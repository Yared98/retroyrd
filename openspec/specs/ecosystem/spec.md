# RetroYrd - Ecosystem & Analytics Specification

## 1. Yrd Agile Toolkit Switcher
- O componente `EcosystemSwitcher` permite alternar entre `RetroYrd`, `DailyYrd` e `PlanningYrd` com detecção de ambiente dev/prod.
- Integrado na barra de navegação superior (`Header.tsx`) e na tela inicial (`CreateBoardModal.tsx`).

## 2. Rodapé Padronizado
- Exibe o texto "Desenvolvido por Yared" com links para `https://yared.com.br/` e repositório GitHub `https://github.com/Yared98/retroyrd`.

## 3. Umami Analytics com Foco em Privacidade
- Rota backend `GET /api/config` alimenta as credenciais do script Umami.
- Força `data-auto-track="false"` e higienização para rotas `/` e `/board` (sem IDs ou tokens na telemetria).

## 4. Design System & Tema Unificado
- Utiliza tema escuro "Agile Cadence" com paleta Slate/Obsidian (`--bg-canvas: #090d16`, `--bg-surface: #0f172a`, `--bg-surface-elevated: #1e293b`, `--bg-card: rgba(30, 41, 59, 0.7)`).
- Tela inicial com iluminação atmosférica via background radial gradient (`--bg-canvas-radial: radial-gradient(circle at 50% 20%, #151d32 0%, var(--bg-canvas) 80%)`).
- Cartões com acabamento glassmorphism (`backdrop-filter: blur(20px)`, `border-radius: var(--radius-2xl)`).

## 5. Ambient Background Global & Histórico de Sessões Recentes
- Background radial fixo no `body` (`background-attachment: fixed`), garantindo iluminação e profundidade visual em todas as telas (Home, Loading e Board).
- Histórico de sessões recentes com persistência local, segregando "Sessões que Facilitei" (preservando token de facilitador) e "Sessões que Participei".

## 6. Padronização da Estrutura da Homepage
- Arquitetura unificada com o modelo de referência do PlanningYrd em todo o ecossistema:
  - Controles de topo (EcosystemSwitcher, Alternador de Idioma PT/EN, Alternador de Tema Claro/Escuro, Link GitHub) posicionados no canto superior direito.
  - Hero banner centralizado posicionado externamente ao card com badge de marca com efeito `.brand-icon-box`, título `<h1>` e subtítulo `<p>`.
  - Glass Card centralizado de 480px com abas internas de navegação: "Criar Retrospectiva" e "Entrar com Código".
  - Aba Criar com formulário completo de criação e destaques dos pilares.
  - Aba Entrar com campos para código da sessão e token de facilitador.
  - Listas de sessões anteriores integradas ao card, com diálogo modal de exclusão.
  - Rodapé padronizado externo ao card alinhado à largura máxima de 480px.
