# Especificação: Anonimato e Segurança Psicológica

## 1. Visão Geral
Define as garantias criptográficas e estruturais de anonimato, impedindo qualquer correlação de identidade de participantes em votos de segurança e ocultando conteúdo de cards em tempo real durante a fase de Brainstorm.

---

## 2. Requisitos (EARS)

### REQ-AS-001: Identificação Efêmera de Sessão
O sistema **DEVE** derivar um identificador de participante pseudoanônimo (`session_hash`) através do hash SHA-256 combinando a identificação do cliente (ex: IP, cabeçalho de sessão ou cookie temporário) e o `board_id`. O participante não precisa de conta nominal nem autenticação corporativa.

### REQ-AS-002: Desacoplamento Estrito do Safety Check
A tabela `safety_checks` **NÃO DEVE** conter colunas de chave estrangeira para usuário, nem armazenar `session_hash`, IP ou carimbo de tempo preciso que permita ataque de correlação temporal.

### REQ-AS-003: Mascaramento no Modo Cego (Blind Brainstorm)
Durante a fase `BRAINSTORM`, quando o servidor WebSocket transmitir eventos de cards criados ou listagem de estado:
- Se o destinatário do evento **FOR** o autor do card (`card.author_session_hash == recipient.session_hash`), o conteúdo de texto **DEVE** ser enviado normalmente.
- Se o destinatário do evento **NÃO FOR** o autor do card, o servidor **DEVE** substituir o texto por string vazia ou placeholder e marcar a flag `is_masked: true`. O conteúdo original nunca trafega pela rede para terceiros nessa fase.

### REQ-AS-004: Revelação de Conteúdo na Fase Grouping
Quando a fase transicionar para `GROUPING`, o servidor **DEVE** realizar um broadcast completo com `is_masked: false` e todos os textos reais de todos os cards.

---

## 3. Cenários de Aceite (GIVEN / WHEN / THEN)

### Cenário: Submissão de Safety Check
- **GIVEN** um board na fase `SAFETY_CHECK`
- **WHEN** um participante submete a nota `4`
- **THEN** o sistema armazena apenas `(id, board_id, score: 4)`
- **AND** nenhum dado de rede ou sessão do participante é persistido.

### Cenário: Recepção de Card de Terceiro em Brainstorm
- **GIVEN** que o Participante A cria um card com o texto `"Problemas de comunicação com produto"` na fase `BRAINSTORM`
- **WHEN** o servidor transmite o evento WebSocket para o Participante B
- **THEN** o payload recebido pelo Participante B possui `is_masked: true` e `content: "••••••••"`
- **AND** o payload recebido pelo Participante A possui `is_masked: false` e o texto original.
