export type LeaderboardEntry = { name: string; score: number; playedAt: number };
const KEY = 'keepercam.leaderboard.v1';

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LeaderboardEntry => item && typeof item.name === 'string' && Number.isFinite(item.score) && Number.isFinite(item.playedAt)).sort((a,b)=>b.score-a.score).slice(0,10);
  } catch { return []; }
}

export function saveScore(name: string, score: number): LeaderboardEntry[] {
  const entries = [...getLeaderboard(), { name: name.trim().slice(0,24) || 'Вратарь', score, playedAt: Date.now() }].sort((a,b)=>b.score-a.score).slice(0,10);
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* Storage may be disabled or full. */ }
  return entries;
}
