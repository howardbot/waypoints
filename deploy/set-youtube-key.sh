#!/usr/bin/env bash
# Store the YouTube Data API key on the server for the weekly video refresh.
# The key is read with hidden input and saved readable by this user only.
set -euo pipefail

file="${WAYPOINTS_DIR:-$HOME/waypoints}/youtube.env"
read -rsp "Paste your YouTube Data API v3 key (input is hidden), then press Return: " key
echo
if [[ -z "$key" ]]; then
  echo "No key entered; nothing changed." >&2
  exit 1
fi
umask 077
printf 'YOUTUBE_API_KEY=%s\n' "$key" > "$file"
chmod 600 "$file"
echo "Saved to $file (readable only by $(whoami))."
