# Change: Expansão do Background Atmosférico e Sincronização de Histórico

## Contexto
O background radial atmosférico com foco de luz central foi expandido para cobrir todas as telas da aplicação (não apenas a tela inicial), e as diretrizes de histórico de sessões foram consolidadas.

## Mudanças Realizadas
- Configurado `background: var(--bg-canvas-radial)` com `background-attachment: fixed` diretamente na tag `body` em `index.css`.
- Wrappers de carregamento e do board principal em `App.tsx` e `CreateBoardModal.tsx` ajustados para fundo transparente, viabilizando iluminação consistente por toda a aplicação.
