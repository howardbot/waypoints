#!/usr/bin/env bash
# Refresh src/data/videos.json from YouTube. Asks for your API key without
# echoing it, so it never lands in shell history or any file.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${YOUTUBE_API_KEY:-}" ]]; then
  read -rsp "Paste your YouTube Data API v3 key (input is hidden), then press Return: " YOUTUBE_API_KEY
  echo
fi
if [[ -z "$YOUTUBE_API_KEY" ]]; then
  echo "No key entered; nothing changed." >&2
  exit 1
fi

YOUTUBE_API_KEY="$YOUTUBE_API_KEY" node scripts/fetch-videos.mjs
