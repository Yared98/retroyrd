export interface RecentSession {
  id: string;
  title: string;
  facilitatorToken: string;
  updatedAt: number;
}

const STORAGE_KEY = 'retroyrd_recent_sessions';

export function getRecentSessions(): RecentSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: RecentSession[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveRecentSession(session: { id: string; title: string; facilitatorToken: string }): void {
  try {
    if (!session.id || !session.facilitatorToken) return;
    const current = getRecentSessions().filter((s) => s.id !== session.id);
    const updated: RecentSession[] = [
      {
        id: session.id,
        title: session.title || 'Retrospectiva sem título',
        facilitatorToken: session.facilitatorToken,
        updatedAt: Date.now(),
      },
      ...current,
    ].slice(0, 15); // Guarda as 15 retrospectivas mais recentes

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar sessão recente:', err);
  }
}

export function removeRecentSession(id: string): RecentSession[] {
  try {
    const updated = getRecentSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
