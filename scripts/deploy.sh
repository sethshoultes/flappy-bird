#!/usr/bin/env bash
# Ships dist/ to the flappy-bird.adventurebuildr.com box.
# Run `npm run build` first — this script only deploys, it doesn't build.
#
# This is a static SPA (Vite + React, client-side Supabase leaderboard) — no
# node process to run on the box, just files under a webroot nginx serves.
#
# arcade#42: this dev has no ssh access and does not run this script — the
# arcade lead does, after confirming REMOTE_HOST/REMOTE_PATH match the vhost
# it sets up. See docs/DEPLOY.md for the full handoff.
set -euo pipefail

# Personal secrets (e.g. an ssh config alias's key, if one isn't already in
# ~/.ssh/config), if present. Sourced silently — never echo this file's
# contents. Same canonical file the arcade repo's own deploy.sh reads.
SECRETS_FILE="$HOME/.config/dev-secrets/arcade/secrets.env"
if [ -f "$SECRETS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
  set +a
fi

# hetzner-sites is the box every other arcade game already deploys to
# (docs/INVENTORY.md in the arcade repo, "Live on the games box"). Override
# either var if the lead's vhost ends up somewhere else.
REMOTE_HOST="${FLAPPY_BIRD_DEPLOY_HOST:-hetzner-sites}"
REMOTE_PATH="${FLAPPY_BIRD_DEPLOY_PATH:-/var/www/flappy-bird.adventurebuildr.com}"

# Overridable so a test can point this at a directory that doesn't exist
# without touching the real dist/.
DIST_DIR="${DEPLOY_DIST_DIR:-dist}"

if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "deploy.sh: $DIST_DIR/index.html not found — run \`npm run build\` first" >&2
  exit 1
fi

rsync -avz --delete "$DIST_DIR/" "$REMOTE_HOST:$REMOTE_PATH/"
