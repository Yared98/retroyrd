# Harmonização e Padronização Tipográfica do Ecossistema

## Contexto
Todos os quatro projetos do ecossistema (`retroyrd`, `dailyyrd`, `planningyrd` e `coffeeyrd`) possuíam pequenas discrepâncias em famílias de fontes, nomes de tokens e hierarquias semânticas (títulos, subtítulos e descrições).

## Mudanças Realizadas
1. **Padrão de Cor Temática por Projeto (Identidade Visual do Switch)**:
   - Cada projeto adota sua cor-chave em harmonia com o `EcosystemSwitcher`:
     - **RetroYrd**: Indigo (`#6366f1` / hover `#4f46e5`), glow índigo e iluminação sutil de fundo.
     - **CoffeeYrd**: Âmbar Quente (`#f59e0b` / hover `#d97706`), iluminação dourada e botões solares.
     - **DailyYrd**: Esmeralda Agilidade (`#10b981` / hover `#059669`), botões de ação e timer verde esmeralda.
     - **PlanningYrd**: Azul Royal Poker (`#3b82f6` / hover `#2563eb`), feltro da mesa e cartas selecionadas em azul.
   - Atualizados tokens `--color-primary`, `--color-primary-hover`, `--color-primary-glow`, `--border-primary`, `.brand-icon-box` e `--bg-canvas-radial` em todos os temas (Dark & Light).
2. **Padronização de Favicons (Identidade Visual do Ecossistema)**:
   - Substituição das data-URIs e arquivos legados do Vite por favicons em formato *squircle* com gradientes ricos e alto contraste nas abas dos navegadores:
     - **RetroYrd**: Gradiente Indigo (`#4f46e5` → `#6366f1`) com ícone **ShieldCheck** em branco.
     - **CoffeeYrd**: Gradiente Âmbar (`#d97706` → `#f59e0b`) com ícone **Coffee** em branco.
     - **DailyYrd**: Gradiente Esmeralda (`#059669` → `#10b981`) com ícone **Clock** em branco.
     - **PlanningYrd**: Gradiente Azul Royal (`#2563eb` → `#3b82f6`) com ícone **Layers** em branco.
   - Atualizados todos os `index.html` com `<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />` para invalidar o cache persistente dos navegadores.
2. **Google Fonts & Preconnect**:
   - `Plus Jakarta Sans` (pesos 400, 500, 600, 700, 800) carregado como sans-serif principal em todos os `index.html`.
   - `JetBrains Mono` (pesos 400, 500, 600) padronizado para elementos numéricos, timers, badges e blocos de código.
2. **Escala de Tokens no `:root` (`index.css`)**:
   - Tamanhos: `--text-2xs` (11px), `--text-xs` (12px), `--text-sm` (13px), `--text-base` (14px), `--text-md` (15px), `--text-lg` (17px), `--text-xl` (20px), `--text-2xl` (24px), `--text-3xl` (30px), `--text-4xl` (36px).
   - Pesos: `--font-normal: 400`, `--font-medium: 500`, `--font-semibold: 600`, `--font-bold: 700`, `--font-extrabold: 800`.
   - Entrelinhas: `--leading-tight: 1.25`, `--leading-snug: 1.375`, `--leading-normal: 1.5`, `--leading-relaxed: 1.625`.
   - Espaçamento: `--tracking-tight: -0.025em`, `--tracking-normal: 0em`, `--tracking-wide: 0.025em`.
3. **Hierarquia Semântica Global**:
   - `h1, .page-title`: `--text-3xl`, `--font-extrabold`, `--leading-tight`, `--tracking-tight`.
   - `h2, .section-title`: `--text-2xl`, `--font-bold`, `--leading-tight`, `--tracking-tight`.
   - `h3, .modal-title`: `--text-xl`, `--font-bold`, `--leading-snug`.
   - `h4, .card-title`: `--text-md`, `--font-semibold`, `--leading-snug`.
   - `p, .body-text`: `--text-base`, `--font-normal`, `--leading-normal`.
   - `.page-subtitle, .section-subtitle`: `--text-sm`, `--font-medium`, `--text-muted`.
   - `.description-text, .card-description`: `--text-sm`, `--font-normal`, `--text-muted`.
   - `.caption-text, .meta-text`: `--text-xs`, `--font-medium`, `--text-dim`.
   - `label, .field-label`: `--text-xs`, `--font-semibold`, uppercase, letter-spacing 0.05em.

## Validação
- Compilação e tipagem verificadas via `npm run build` com sucesso em todos os quatro projetos.
