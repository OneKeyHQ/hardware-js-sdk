#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8080}"
URL="http://localhost:${PORT}/classic1s-webusb-reset-repro.html"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

cd "$SCRIPT_DIR"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/classic1s-webusb-repro-http.log 2>&1 &
SERVER_PID=$!

sleep 1

if command -v open >/dev/null 2>&1; then
  open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "Open this URL in Chromium: $URL"
fi

echo "Classic1S WebUSB repro server running at: $URL"
echo "HTTP log: /tmp/classic1s-webusb-repro-http.log"
echo "Press Ctrl+C to stop the local server."

wait "$SERVER_PID"
