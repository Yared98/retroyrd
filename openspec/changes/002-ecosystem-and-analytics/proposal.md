# Change Proposal: 002 - Ecossistema Yrd Toolkit e Umami Analytics

## Motivação
Integrar o RetroYrd ao ecossistema unificado Yrd Agile Toolkit e habilitar monitoramento de uso anônimo e higienizado.

## Mudanças Principais
1. **Navegação Cruzada**:
   - Inclusão do dropdown `EcosystemSwitcher` no Header e CreateBoardModal.
2. **Rodapé Padronizado**:
   - `Footer.tsx` com link pessoal de autoria e atalhos para os repositórios GitHub.
3. **Analytics**:
   - Endpoint `/api/config` e rastreamento com rotas anonimizadas via Umami.
