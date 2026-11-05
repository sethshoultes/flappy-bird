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

At runtime in the browser it talks to one external service, the Arcade at
`https://arcade.adventurebuildr.com`, for the leaderboard (`src/arcade.ts`): who the player is, the
events of a run, and the top 10 of the `pipes` board. Sounds are bundled in `sounds/`.

## Build-time env vars

None. The build needs no settings, and the game plays with the Arcade unreachable: the leaderboard
then says it is unavailable and the local high score still works.

## Deploy script

`scripts/deploy.sh` rsyncs `dist/` to the box. It does not build — run `npm run build` first.

```bash
./scripts/deploy.sh
```

Reads `$HOME/.config/dev-secrets/arcade/secrets.env` if present (same canonical file the arcade
repo's own `scripts/deploy.sh` uses), then rsyncs to:

- `FLAPPY_BIRD_DEPLOY_HOST` (default `hetzner-sites`, the same box every other arcade game is on)
- `FLAPPY_BIRD_DEPLOY_PATH` (default `/home/flappybird/htdocs/flappy-bird.adventurebuildr.com`
  — CloudPanel's `/home/<site-user>/htdocs/<domain>` webroot layout, not `/var/www/<domain>`)

**The box side is done.** The site is live at https://flappy-bird.adventurebuildr.com (arcade#42)
and the path above is confirmed, not a guess — this dev still has no ssh access and doesn't run
this script itself; the arcade lead does.

## Known cosmetic issues

- `dist/index.html` referenced `/vite.svg`, which 404s — no `public/` dir exists in this repo to
  supply it. Not fixed; doesn't block the build or the deploy.
