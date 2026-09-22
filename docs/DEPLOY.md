# Deploying flappy-bird

arcade#42 (epic arcade#41: consolidating every arcade game onto `hetzner-sites` under
`*.adventurebuildr.com`). This covers the repo-side half only — build config and a deploy
script. The box side (nginx vhost, DNS, first sync) is the arcade lead's.

## Build

```bash
npm install
npm run build
```

Produces a static `dist/` (`index.html` + a hashed `assets/` dir) via Vite. Confirmed building
cleanly on 2026-09-21 from a fresh clone, despite no push since 2025-01-15.

## What it needs to run

This is a pure client-side SPA — **no node process, no server-side rendering, nothing to run on
the box.** Static files under a webroot, served by nginx, is the whole target.

At runtime in the browser it talks to one external Supabase project (`mbgoekwzincaggzfkxft`) for:
- the leaderboard (via `@supabase/supabase-js`, see below)
- sound effects and the README's screenshot, which are hardcoded public Supabase Storage URLs in
  `src/components/Game.tsx` — nothing the box needs to serve or proxy.

## Required build-time env vars

The leaderboard client (`src/lib/supabase.ts`) reads two `import.meta.env.VITE_*` vars, inlined
by Vite at build time:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**The build succeeds today with neither var set** — `createClient()` doesn't validate its
arguments at call time, so an unset/undefined URL and key only fail in the browser console at
runtime (leaderboard reads/writes will error; the game itself is unaffected). Set both before
building for a working leaderboard. Values are not this dev's to look for — arcade#42's own
instructions say the lead sources them from `~/.config/dev-secrets/arcade/secrets.env`.

```bash
VITE_SUPABASE_URL="…" VITE_SUPABASE_ANON_KEY="…" npm run build
```

**Security note, not this task's to fix**: this repo's `.env` is tracked in git (not
`.gitignore`'d) and is public. Whatever key is in there is already exposed; if it's live, it
should be rotated and untracked — flagging for the lead rather than touching a security-relevant
file outside this task's scope.

## Deploy script

`scripts/deploy.sh` rsyncs `dist/` to the box. It does not build — run `npm run build` first.

```bash
./scripts/deploy.sh
```

Reads `$HOME/.config/dev-secrets/arcade/secrets.env` if present (same canonical file the arcade
repo's own `scripts/deploy.sh` uses), then rsyncs to:

- `FLAPPY_BIRD_DEPLOY_HOST` (default `hetzner-sites`, the same box every other arcade game is on)
- `FLAPPY_BIRD_DEPLOY_PATH` (default `/var/www/flappy-bird.adventurebuildr.com`, matching the
  `flappy-bird.adventurebuildr.com` target arcade#41 names)

**This dev has no ssh access and has not run this script.** The default path is a guess that
follows the existing `<slug>.adventurebuildr.com` nginx pattern (arcade's
`docs/INVENTORY.md`) — confirm or override it to match whatever webroot the vhost actually uses
before running.

## Known cosmetic issues (not fixed — out of this task's scope)

- `dist/index.html` still has the Vite/React boilerplate `<title>Vite + React + TS</title>`.
- It references `/vite.svg`, which 404s — no `public/` dir exists in this repo to supply it.

Neither blocks the build or the deploy; noting them for whoever picks up the game-polish side.
