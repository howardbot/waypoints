#!/usr/bin/env bash
# The server builds the site from GitHub by itself: it checks for new commits
# every hour and refreshes YouTube videos every week (deploy/refresh.sh).
# This only asks it to pick up what you just pushed, right now.
#
# Settings come from .env.deploy (git-ignored). See .env.deploy.example.
#   DEPLOY_HOST  ssh target, e.g. ubuntu@your-server  (required)
#   SSH_KEY      private key for that host            (optional)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  source .env.deploy
fi
: "${DEPLOY_HOST:?Set DEPLOY_HOST in .env.deploy (see .env.deploy.example)}"

SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "${SSH_KEY:-}" ]]; then SSH+=(-i "${SSH_KEY/#\~/$HOME}"); fi

git fetch -q origin main
if [[ -n "$(git status --porcelain)" || "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "The server builds from GitHub: commit and push your changes first." >&2
  exit 1
fi

echo "==> Asking the server to rebuild from GitHub"
"${SSH[@]}" "$DEPLOY_HOST" \
  'sudo systemctl start waypoints-update.service; status=$?; journalctl -u waypoints-update.service --since "-15 min" --no-pager -o cat | tail -n 4; exit $status'
