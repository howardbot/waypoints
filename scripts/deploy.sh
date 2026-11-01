#!/usr/bin/env bash
# Build the site and ship it to the server, reachable only on your tailnet.
#
# Settings come from .env.deploy (git-ignored). See .env.deploy.example.
#   DEPLOY_HOST     ssh target, e.g. ubuntu@your-server            (required)
#   SSH_KEY         private key for that host                      (optional)
#   DEPLOY_DIR      folder on the server, relative to its home      (default: waypoints)
#   WAYPOINTS_PORT  localhost port for the nginx container          (default: 8096)
#   TS_HTTPS_PORT   HTTPS port Tailscale Serve uses on the tailnet  (default: 8446)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  source .env.deploy
fi
: "${DEPLOY_HOST:?Set DEPLOY_HOST in .env.deploy (see .env.deploy.example)}"
DEPLOY_DIR="${DEPLOY_DIR:-waypoints}"
WAYPOINTS_PORT="${WAYPOINTS_PORT:-8096}"
TS_HTTPS_PORT="${TS_HTTPS_PORT:-8446}"

SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15)
SCP=(scp -q -o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH+=(-i "${SSH_KEY/#\~/$HOME}")
  SCP+=(-i "${SSH_KEY/#\~/$HOME}")
fi

echo "==> Testing and building"
npm test --silent
npm run build --silent

echo "==> Uploading to $DEPLOY_HOST:$DEPLOY_DIR"
"${SSH[@]}" "$DEPLOY_HOST" "mkdir -p '$DEPLOY_DIR' && rm -rf '$DEPLOY_DIR/site.new' && mkdir '$DEPLOY_DIR/site.new'"
tar -C dist -czf - . | "${SSH[@]}" "$DEPLOY_HOST" "tar -xzf - -C '$DEPLOY_DIR/site.new'"
"${SCP[@]}" deploy/docker-compose.yml deploy/nginx.conf "$DEPLOY_HOST:$DEPLOY_DIR/"

echo "==> Swapping in the new build and restarting the container"
"${SSH[@]}" "$DEPLOY_HOST" bash -s -- "$DEPLOY_DIR" "$WAYPOINTS_PORT" "$TS_HTTPS_PORT" <<'REMOTE'
set -euo pipefail
dir="$1"; port="$2"; ts_port="$3"
cd "$dir"
rm -rf site.old
if [[ -d site ]]; then mv site site.old; fi
mv site.new site
# Recreate so the bind mount points at the new folder.
sudo WAYPOINTS_PORT="$port" docker compose -p waypoints up -d --force-recreate --remove-orphans
rm -rf site.old
# Tailnet-only HTTPS. Only this port's handler is touched; other Serve config stays as it is.
sudo tailscale serve --bg --https="$ts_port" "http://127.0.0.1:$port" >/dev/null
for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$port/"; then break; fi
  sleep 0.5
done
curl -fsS -o /dev/null "http://127.0.0.1:$port/" && echo "Container is serving on 127.0.0.1:$port"
dns="$(tailscale status --json | python3 -c 'import sys, json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
echo "Live on your tailnet: https://$dns:$ts_port/"
REMOTE
