#!/usr/bin/env bash
# One-time server setup, run from the repo clone at ~/waypoints/repo:
#
#   sudo bash deploy/install.sh
#
# Installs two systemd timers (hourly GitHub check, weekly YouTube refresh) and
# publishes the site to your tailnet only with Tailscale Serve.
#   WAYPOINTS_PORT  localhost port for the nginx container  (default: 8096)
#   TS_HTTPS_PORT   HTTPS port on the tailnet               (default: 8446)
set -euo pipefail

user="${SUDO_USER:-ubuntu}"
home="$(getent passwd "$user" | cut -d: -f6)"
base="$home/waypoints"
port="${WAYPOINTS_PORT:-8096}"
ts_port="${TS_HTTPS_PORT:-8446}"
units="$(cd "$(dirname "$0")" && pwd)/systemd"

for unit in waypoints-update.service waypoints-update.timer waypoints-videos.service waypoints-videos.timer; do
  sed -e "s|@USER@|$user|g" -e "s|@BASE@|$base|g" -e "s|@PORT@|$port|g" "$units/$unit" > "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable --now waypoints-update.timer waypoints-videos.timer

# Only this port's handler is touched; other Serve routes on the machine stay as they are.
tailscale serve --bg --https="$ts_port" "http://127.0.0.1:$port" >/dev/null

systemctl list-timers 'waypoints-*' --no-pager
