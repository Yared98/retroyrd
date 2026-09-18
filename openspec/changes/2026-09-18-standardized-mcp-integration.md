# Change: Padronização da Interface de Descoberta e Configuração MCP

- **Data**: 2026-09-18
- **Autor**: Antigravity AI Agent
- **Status**: Implementado & Validado
- **Repositórios Alinhados**: RetroYrd, DailyYrd, PlanningYrd

## Contexto & Motivação
Para permitir que qualquer usuário (facilitador ou membro) conecte seus assistentes de IA (Claude Desktop, Cursor, Antigravity, VS Code Copilot) de forma intuitiva, implementamos uma interface de descoberta padronizada em todo o ecossistema Yrd Agile Toolkit.

## Alterações Realizadas
1. **Botão Padronizado**: Adicionado botão com ícone `Bot` e etiqueta "MCP" no cabeçalho e na landing page (`CreateBoardModal`), estilizado em conformidade com o design system.
2. **Suporte a Sessão Nula**: A gaveta `McpTelemetryDrawer` agora aceita `snapshot` opcional, permitindo consulta de parâmetros de conexão MCP diretamente na página inicial antes da criação de um board.
3. **Documentação de OpenSpec**: Atualizado `openspec/specs/mcp-integration/spec.md` com `REQ-MCP-004` e cenário de aceitação correspondente.
