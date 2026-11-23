# Especificação: Token de Facilitador fora da URL

## 1. Problema
Com o token em `?token=` na barra de endereço, quem copia a URL para convidar o time entrega junto o
controle de facilitador. O token também ficava no histórico, em favoritos, em prints e em logs de proxy.

## 2. Regras
1. A barra de endereço **nunca** contém o token. Criar ou entrar num board leva a `/board/{id}`.
2. O token fica só no navegador (`localStorage` e `sessionStorage`, chave `facilitator_token_{boardId}`).
3. Ao abrir um link com `?token=` (formato antigo) ou `#token=` (link de facilitador), o app guarda o token
   e remove o parâmetro da URL com `history.replaceState`. Links antigos continuam funcionando.
4. Token com formato inválido (fora de `[A-Za-z0-9_-]{10,128}`) é descartado.
5. **Compartilhar** copia sempre o link de participante (`/board/{id}`), sem token.
6. **Link de facilitador** é um botão separado, só para o facilitador, que copia
   `/board/{id}#token={token}`. O fragmento (`#`) não é enviado ao servidor, não aparece em logs nem no Referer.
7. Implementação única em `frontend/src/utils/facilitatorToken.ts`.

## 3. Fora do escopo (próximo passo)
O WebSocket ainda envia o token na query (`/ws/board/{id}?token=`). O tráfego é `wss` (criptografado) e o
endereço não aparece ao usuário; mover para uma mensagem de autenticação após conectar é a evolução prevista.
