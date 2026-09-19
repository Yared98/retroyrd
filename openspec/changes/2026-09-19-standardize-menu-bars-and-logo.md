# Padronização de Menu Bars e Navegação via Logo no RetroYrd

## Contexto
O cabeçalho (`Header.tsx`) do RetroYrd utilizava uma estrutura com botão mínimo de Home e sem a marca/logo do RetroYrd presente no cabeçalho durante a sessão. Além disso, a página inicial (`CreateBoardModal.tsx`) utilizava controles flutuantes no canto superior direito sem uma barra de menu padronizada (`app-header`) com o logo do projeto.

## Mudanças Realizadas
1. **Logo Padronizado e Clicável**:
   - Adicionada a marca `RetroYrd` com ícone `Sparkles` no padrão `brand-icon-box` (32x32px com gradiente e brilho).
   - O logo agora é um link `<a href="/" className="brand-logo">` que redireciona diretamente para a tela inicial `/` (executando callback `onHome`).
2. **Menu Bar Padronizado na Página Inicial**:
   - Substituídos os controles flutuantes absolutos por um menu bar superior fixo/pegajoso (`<header className="app-header">`).
   - Contém à esquerda a marca clicável e o `EcosystemSwitcher`.
   - Contém à direita os utilitários MCP, alternador de idioma (PT/EN), alternador de tema e link para o repositório GitHub.
4. **Arquitetura Unificada de 2 Níveis (Tier 1 & Tier 2)**:
   - Nível 1 (`.app-header`): Marca `RetroYrd` clicável para `/`, `EcosystemSwitcher`, título do board (badge com status dot e tag FAC), e ferramentas utilitárias à direita (Convidar, Exportar, MCP, Idioma, Tema, GitHub).
   - Nível 2 (`.session-sub-header`): Barra de fluxo do ritual contendo o Stepper de 6 fases com rolagem horizontal e controles primários (cota de votos, timer e navegação de fase).
   - Ocultação responsiva de rótulos de texto (`.header-btn-text` e `.ecosystem-switcher-label`) em telas `< 768px`.
