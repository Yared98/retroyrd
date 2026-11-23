/**
 * Token de facilitador fora da barra de endereço (openspec/specs/facilitator-token/spec.md).
 *
 * O token fica só no armazenamento do navegador. Links antigos (`?token=`) e o link de facilitador
 * (`#token=`) são lidos uma vez, guardados e removidos da URL, para que copiar a barra de endereço
 * nunca compartilhe o controle da sessão. O fragmento (`#`) não é enviado ao servidor, a logs nem no Referer.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;
const storageKey = (boardId: string) => `facilitator_token_${boardId}`;

export function storeFacilitatorToken(boardId: string, token: string): void {
  try {
    localStorage.setItem(storageKey(boardId), token);
    sessionStorage.setItem(storageKey(boardId), token);
  } catch {
    /* armazenamento bloqueado: o token vale só nesta aba, em memória */
  }
}

export function getStoredFacilitatorToken(boardId: string): string | null {
  try {
    return sessionStorage.getItem(storageKey(boardId)) || localStorage.getItem(storageKey(boardId));
  } catch {
    return null;
  }
}

/** Lê `#token=` ou `?token=`, guarda para a sessão e limpa a barra de endereço. */
export function consumeTokenFromUrl(boardId: string | null): string | null {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const raw = hashParams.get('token') || url.searchParams.get('token');
  if (!raw) return null;

  url.searchParams.delete('token');
  hashParams.delete('token');
  const restHash = hashParams.toString();
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${restHash ? `#${restHash}` : ''}`);

  if (!TOKEN_PATTERN.test(raw)) return null;
  if (boardId) storeFacilitatorToken(boardId, raw);
  return raw;
}

/** Link explícito para cofacilitar ou abrir em outro dispositivo; o token vai no fragmento. */
export function buildFacilitatorLink(boardId: string, token: string): string {
  return `${window.location.origin}/board/${boardId}#token=${encodeURIComponent(token)}`;
}

export function buildParticipantLink(boardId: string): string {
  return `${window.location.origin}/board/${boardId}`;
}
