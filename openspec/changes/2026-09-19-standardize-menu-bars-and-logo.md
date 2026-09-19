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
3. **Responsividade**:
   - Ajustes em `@media (max-width: 768px)` para manter espaçamentos proporcionais e evitar quebras indesejadas em dispositivos móveis.
