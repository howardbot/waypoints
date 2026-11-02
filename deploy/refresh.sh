#!/usr/bin/env bash
# Runs on the server from systemd (see deploy/install.sh) and builds the site
# straight from GitHub, so nothing depends on a laptop.
#
#   refresh.sh            rebuild only if GitHub has new commits   (hourly timer)
#   refresh.sh --videos   refresh due YouTube videos, then rebuild  (daily timer)
#   refresh.sh --links    check every trip source link, then rebuild  (monthly timer)
#   refresh.sh --force    rebuild even if nothing changed
set -euo pipefail

# Everything is in main(), so bash reads the whole script before running any of it: the
# git reset below can replace this file mid-run.
main() {
local script_sum
script_sum="$(cksum < "$0")" # this script as it was when it started
BASE="${WAYPOINTS_DIR:-$HOME/waypoints}"
REPO="$BASE/repo"
PORT="${WAYPOINTS_PORT:-8096}"
NODE_IMAGE="node:20-alpine"
KEY_FILE="$BASE/youtube.env"   # YOUTUBE_API_KEY=..., written by set-youtube-key.sh
SITE_URL_FILE="$BASE/site-url"  # the site's tailnet address, written by install.sh
VIDEOS="$BASE/videos.json"     # last good YouTube results, kept outside the repo
FETCHED="$BASE/videos-fetched.json"  # when each trip's videos were fetched
LINKS="$BASE/link-status.json" # last source-link check, for the /status/ page
PHOTOS="$BASE/photos"          # Commons photos downloaded once, served by the site
BUILT="$BASE/.built-commit"

videos=false
links=false
force=false
for arg in "$@"; do
  case "$arg" in
    --videos) videos=true ;;
    --links) links=true ;;
    --force) force=true ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }

exec 9>"$BASE/.refresh.lock"
flock -w 900 9 || { log "Another refresh is still running; skipping"; exit 0; }

git -C "$REPO" fetch -q origin main
head="$(git -C "$REPO" rev-parse origin/main)"
if ! $videos && ! $links && ! $force && [[ -f "$BUILT" && "$(cat "$BUILT")" == "$head" ]]; then
  exit 0 # nothing new on GitHub
fi
git -C "$REPO" reset -q --hard "$head"
git -C "$REPO" clean -qfdx -e node_modules
# That may have updated this script: carry on with the new copy, once.
if [[ -z "${WAYPOINTS_RESTARTED:-}" && "$(cksum < "$REPO/deploy/refresh.sh")" != "$script_sum" ]]; then
  WAYPOINTS_RESTARTED=1 exec bash "$REPO/deploy/refresh.sh" "$@"
fi
log "Building $(git -C "$REPO" log -1 --format='%h %s')"

# Node runs in a throwaway container as this user, so the host needs no Node install.
mkdir -p "$BASE/.npm"
node_run() {
  sudo docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/npm \
    -v "$REPO:/app" -v "$BASE/.npm:/npm" -w /app "$@"
}
node_run "$NODE_IMAGE" npm ci --no-audit --no-fund --loglevel=error

# Use the server's videos when they're newer than the ones committed to GitHub.
if [[ -f "$VIDEOS" ]]; then
  committed="$(git -C "$REPO" log -1 --format=%ct -- src/data/videos.json)"
  if (( $(stat -c %Y "$VIDEOS") > ${committed:-0} )); then
    cp "$VIDEOS" "$REPO/src/data/videos.json"
    if [[ -f "$FETCHED" ]]; then cp "$FETCHED" "$REPO/src/data/videos-fetched.json"; fi
  fi
fi

# The last link check, kept outside the repo like the videos.
if [[ -f "$LINKS" ]]; then cp "$LINKS" "$REPO/src/data/link-status.json"; fi
if $links; then
  if node_run "$NODE_IMAGE" node scripts/check-links.mjs; then
    cp "$REPO/src/data/link-status.json" "$LINKS"
  else
    log "Link check failed; keeping the last result"
  fi
fi

# Photos: download any that are missing (only new ones after the first run), then serve them.
mkdir -p "$PHOTOS"
node_run -v "$PHOTOS:/photos" "$NODE_IMAGE" node scripts/fetch-photos.mjs /photos || log "Photo download incomplete; pages fall back to Wikimedia for the rest"
mkdir -p "$REPO/public/photos/commons"
cp -a "$PHOTOS/." "$REPO/public/photos/commons/"

# Look on organizers' pages for newly announced event dates (a few seconds; see /status/).
node_run "$NODE_IMAGE" node scripts/check-dates.mjs || log "Date check failed; building without it"

if $videos; then
  if [[ -f "$KEY_FILE" ]]; then
    if node_run --env-file "$KEY_FILE" "$NODE_IMAGE" node scripts/fetch-videos.mjs; then
      cp "$REPO/src/data/videos.json" "$VIDEOS"
      cp "$REPO/src/data/videos-fetched.json" "$FETCHED"
      log "YouTube videos refreshed"
    else
      log "YouTube refresh failed; keeping the last good videos"
      git -C "$REPO" checkout -q -- src/data/videos.json src/data/videos-fetched.json 2>/dev/null || true
      if [[ -f "$VIDEOS" ]]; then cp "$VIDEOS" "$REPO/src/data/videos.json"; fi
    fi
  else
    log "No $KEY_FILE yet; skipping the YouTube refresh"
  fi
fi

node_run "$NODE_IMAGE" npm test --silent
# The calendar feed links back to trips with the site's own address, kept out of the repo.
site_url="$(cat "$SITE_URL_FILE" 2>/dev/null || true)"
node_run -e SITE_URL="$site_url" "$NODE_IMAGE" npm run build --silent

# Swap the new build in, then recreate the container so its bind mount follows.
cp "$REPO/deploy/docker-compose.yml" "$REPO/deploy/nginx.conf" "$BASE/"
rm -rf "$BASE/site.new" "$BASE/site.old"
cp -a "$REPO/dist" "$BASE/site.new"
cd "$BASE"
if [[ -d site ]]; then mv site site.old; fi
mv site.new site
mkdir -p "$BASE/sync" # synced state, one file per person (see deploy/sync/server.mjs)
sudo WAYPOINTS_PORT="$PORT" WAYPOINTS_UID="$(id -u)" WAYPOINTS_GID="$(id -g)" WAYPOINTS_SITE_URL="$site_url" \
  docker compose -p waypoints up -d --force-recreate --remove-orphans
rm -rf site.old

for _ in $(seq 1 20); do
  if curl -fs -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  sleep 0.5
done
curl -fs -o /dev/null "http://127.0.0.1:$PORT/" || { log "Site did not come back up on port $PORT"; exit 1; }
echo "$head" > "$BUILT"
log "Live: $(git -C "$REPO" log -1 --format='%h %s')"
}

main "$@"
