/**
 * The Arcade service (arcade#65, PROTOCOL.md in the arcade repo): a name for the leaderboard, the events of a game and its board.
 * Trimmed from golden-spike's client; pure apart from what is passed in, so the tests drive it with a stub fetch.
 * Nothing here ever throws into the game: a failed call is an answer like any other, and play goes on.
 */

export const ARCADE = 'https://arcade.adventurebuildr.com';
export const GAME = 'flappy-bird';

export interface Env {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  base: string;
  /** False when the browser knows it is offline: then nothing is sent at all. */
  online: () => boolean;
  /** Waits between retries; the tests pass one that does not. */
  wait: (ms: number) => Promise<void>;
  /** A fresh id for one game, 8 to 64 letters, digits, _ or -. */
  session: () => string;
  /** Milliseconds, for how long `started` has been trying. */
  now: () => number;
  /** A call that has not answered by then is given up, so a hung request never holds up the game's events. */
  timeoutMs: number;
}

export const browserEnv = (): Env => ({
  fetch: (url, init) => fetch(url, init),
  base: ARCADE,
  online: () => navigator.onLine !== false,
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  session: () => crypto.randomUUID(),
  now: () => Date.now(),
  timeoutMs: 4000,
});

/** The service's own rule for a name; its block list is checked there, and its answer is shown as it comes. */
export const validHandle = (s: string): boolean => /^[A-Za-z0-9_-]{3,12}$/.test(s);

type Reply = { status: number; body: unknown } | undefined;

/** One call with the player's cookie. Undefined when the service could not be reached or did not answer JSON. */
async function call(env: Env, path: string, init: RequestInit = {}): Promise<Reply> {
  if (!env.online()) return undefined;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), env.timeoutMs);
  try {
    const res = await env.fetch(env.base + path, {
      ...init,
      credentials: 'include',
      headers: init.body ? { 'content-type': 'application/json' } : undefined,
      signal: abort.signal,
    });
    return { status: res.status, body: await res.json().catch(() => undefined) };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

const errorOf = (r: Reply): string | undefined => {
  const e = (r?.body as { error?: unknown } | undefined)?.error;
  return typeof e === 'string' ? e : undefined;
};

export type Me = { kind: 'player'; handle: string } | { kind: 'none' } | { kind: 'unavailable' };

/** Who this browser is to the Arcade: a player with a name, nobody yet (404), or unknown because the call failed. */
export async function getMe(env: Env): Promise<Me> {
  const r = await call(env, '/api/v1/me');
  const handle = (r?.body as { handle?: unknown } | undefined)?.handle;
  if (r?.status === 200 && typeof handle === 'string') return { kind: 'player', handle };
  if (r?.status === 404) return { kind: 'none' };
  return { kind: 'unavailable' };
}

export async function claimHandle(env: Env, handle: string): Promise<{ ok: true; handle: string } | { ok: false; error: string }> {
  if (!validHandle(handle)) return { ok: false, error: 'A name is 3 to 12 letters, digits, _ or -.' };
  const r = await call(env, '/api/v1/me', { method: 'POST', body: JSON.stringify({ handle }) });
  if (r && (r.status === 200 || r.status === 201)) return { ok: true, handle };
  if (!r) return { ok: false, error: 'The Arcade cannot be reached right now. You can play on and pick a name later.' };
  return { ok: false, error: errorOf(r) ?? 'The Arcade did not take that name.' };
}

export interface Entry {
  rank: number;
  name: string;
  score: number;
}

export type Board = { ok: true; label: string; entries: Entry[] } | { ok: false };

export async function leaderboard(env: Env, board: string, window: 'all' | 'week' | 'friends'): Promise<Board> {
  const r = await call(env, `/api/v1/games/${GAME}/leaderboard?board=${encodeURIComponent(board)}&window=${window}&limit=10`);
  const b = r?.body as { board?: unknown; entries?: unknown } | undefined;
  if (r?.status !== 200 || typeof b?.board !== 'string' || !Array.isArray(b.entries)) return { ok: false };
  const entries = b.entries.filter(
    (e): e is Entry => typeof e?.rank === 'number' && typeof e?.name === 'string' && typeof e?.score === 'number',
  );
  return { ok: true, label: b.board, entries: entries.map(({ rank, name, score }) => ({ rank, name, score })) };
}

export type MatchType = 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai';

/** What one finished game earned, in the service's terms. */
export interface Report {
  /** 'abandoned' is a game left unfinished: it counts for nothing and carries no score. */
  result: 'win' | 'loss' | 'draw' | 'abandoned';
  duration_ms: number;
  scores?: { board: string; value: number }[];
}

type Sent = 'ok' | 'refused' | 'unreachable';

/** How late `started` may still reach the service: it starts the match's clock, and the manifest's min_match_ms leaves 5 s for this. */
export const START_BUDGET_MS = 4000;

/**
 * One event, retried while the service cannot be reached or is busy. The same session makes a retry harmless.
 * With a budget, no retry starts that would land later than that many milliseconds after the first try.
 */
async function send(env: Env, event: Record<string, unknown>, budget = Infinity): Promise<Sent> {
  const t0 = env.now();
  for (let attempt = 1; ; attempt++) {
    const r = await call(env, '/api/v1/events', { method: 'POST', body: JSON.stringify({ game: GAME, ...event }) });
    if (r && r.status === 200) return 'ok';
    if (r && r.status < 500 && r.status !== 429) return 'refused';
    if (attempt === 3 || !env.online() || env.now() - t0 + 1000 * attempt >= budget) return 'unreachable';
    await env.wait(1000 * attempt);
  }
}

export interface Match {
  /** Sends finished, then each score. Never rejects. */
  finish(report: Report): Promise<void>;
}

/** Starts a game on the service: `started` goes now, so the service's clock sees the whole game. */
export function startMatch(env: Env, matchType: MatchType): Match {
  const base = { session: env.session(), match_type: matchType };
  const started = send(env, { ...base, type: 'started' }, START_BUDGET_MS);
  return {
    async finish(report) {
      if ((await started) !== 'ok') return;
      const finished = await send(env, { ...base, type: 'finished', result: report.result, duration_ms: report.duration_ms });
      if (finished !== 'ok') return;
      for (const s of report.scores ?? []) await send(env, { ...base, type: 'score', board: s.board, value: s.value });
    },
  };
}
