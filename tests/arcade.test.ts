import { describe, expect, it } from 'vitest';
import { claimHandle, getMe, leaderboard, startMatch, type Env } from '../src/arcade';

type Call = { path: string; body: Record<string, unknown> | undefined };

/** A stub fetch answering from `reply(path, body, n)`; null means the network fails. */
function stub(reply: (c: Call, n: number) => { status: number; body?: unknown } | null) {
  const calls: Call[] = [];
  let n = 0;
  const env: Env = {
    fetch: async (url, init) => {
      const c = { path: url.replace('https://arcade.test', ''), body: init.body ? JSON.parse(init.body as string) : undefined };
      calls.push(c);
      const r = reply(c, n++);
      if (!r) throw new Error('network');
      return new Response(JSON.stringify(r.body ?? {}), { status: r.status });
    },
    base: 'https://arcade.test',
    online: () => true,
    wait: async () => {},
    session: () => 'session-0001',
    now: () => 0,
    timeoutMs: 1000,
  };
  return { env, calls };
}

describe('getMe', () => {
  it('reads a player on 200', async () => {
    expect(await getMe(stub(() => ({ status: 200, body: { handle: 'ann' } })).env)).toEqual({ kind: 'player', handle: 'ann' });
  });
  it('says none on 404', async () => {
    expect(await getMe(stub(() => ({ status: 404 })).env)).toEqual({ kind: 'none' });
  });
  it('says unavailable on a network failure and on a 200 without a handle', async () => {
    expect(await getMe(stub(() => null).env)).toEqual({ kind: 'unavailable' });
    expect(await getMe(stub(() => ({ status: 200, body: {} })).env)).toEqual({ kind: 'unavailable' });
  });
});

describe('claimHandle', () => {
  it('claims a free name', async () => {
    const { env, calls } = stub(() => ({ status: 201 }));
    expect(await claimHandle(env, 'ann_1')).toEqual({ ok: true, handle: 'ann_1' });
    expect(calls[0].body).toEqual({ handle: 'ann_1' });
  });
  it("shows the service's own refusal", async () => {
    expect(await claimHandle(stub(() => ({ status: 409, body: { error: 'That name is taken.' } })).env, 'ann')).toEqual({
      ok: false,
      error: 'That name is taken.',
    });
  });
  it('says so when the service is unreachable', async () => {
    const r = await claimHandle(stub(() => null).env, 'ann');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/cannot be reached/);
  });
  it('refuses a bad name without calling', async () => {
    const { env, calls } = stub(() => ({ status: 201 }));
    expect((await claimHandle(env, 'a!')).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe('leaderboard', () => {
  it('parses entries and asks for the pipes board of flappy-bird', async () => {
    const { env, calls } = stub(() => ({
      status: 200,
      body: { board: 'Pipes passed', entries: [{ rank: 1, name: 'ann', score: 12, extra: 1 }, { rank: 'x' }] },
    }));
    expect(await leaderboard(env, 'pipes', 'all')).toEqual({ ok: true, label: 'Pipes passed', entries: [{ rank: 1, name: 'ann', score: 12 }] });
    expect(calls[0].path).toBe('/api/v1/games/flappy-bird/leaderboard?board=pipes&window=all&limit=10');
  });
  it('fails on a bad shape, a non-200 and a network failure', async () => {
    expect(await leaderboard(stub(() => ({ status: 200, body: { board: 'x' } })).env, 'pipes', 'all')).toEqual({ ok: false });
    expect(await leaderboard(stub(() => ({ status: 500 })).env, 'pipes', 'all')).toEqual({ ok: false });
    expect(await leaderboard(stub(() => null).env, 'pipes', 'all')).toEqual({ ok: false });
  });
});

describe('startMatch', () => {
  const report = { result: 'loss' as const, duration_ms: 5000, scores: [{ board: 'pipes', value: 7 }] };

  it('sends started, finished, then the score, in order', async () => {
    const { env, calls } = stub(() => ({ status: 200 }));
    const m = startMatch(env, 'human-vs-ai');
    await m.finish(report);
    expect(calls.map((c) => c.body?.type)).toEqual(['started', 'finished', 'score']);
    expect(calls[2].body).toMatchObject({ game: 'flappy-bird', board: 'pipes', value: 7, session: 'session-0001' });
  });
  it('sends nothing more when started was refused', async () => {
    const { env, calls } = stub(() => ({ status: 403 }));
    await startMatch(env, 'human-vs-ai').finish(report);
    expect(calls.map((c) => c.body?.type)).toEqual(['started']);
  });
  it('sends no score event for a score of 0', async () => {
    const { env, calls } = stub(() => ({ status: 200 }));
    await startMatch(env, 'human-vs-ai').finish({ result: 'loss', duration_ms: 5000, scores: [] });
    expect(calls.map((c) => c.body?.type)).toEqual(['started', 'finished']);
  });
  it('stops after 3 tries on 5xx and then sends nothing more', async () => {
    const { env, calls } = stub(() => ({ status: 503 }));
    await startMatch(env, 'human-vs-ai').finish(report);
    expect(calls).toHaveLength(3);
    expect(calls.every((c) => c.body?.type === 'started')).toBe(true);
  });
  it('retries a 5xx and then carries on', async () => {
    const { env, calls } = stub((_c, n) => ({ status: n === 0 ? 503 : 200 }));
    await startMatch(env, 'human-vs-ai').finish(report);
    expect(calls.map((c) => c.body?.type)).toEqual(['started', 'started', 'finished', 'score']);
  });
});
