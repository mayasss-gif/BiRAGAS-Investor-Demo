#!/bin/bash
# Double-click this file on macOS to start the presentation.
# It serves the deck locally so audio can autoplay reliably.

cd "$(dirname "$0")"
PORT=8765
PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Port $PORT busy — using a different port"
  PORT=$((RANDOM % 1000 + 8800))
fi
echo "Serving BiRAGAS presentation on http://127.0.0.1:$PORT"
python3 -m http.server $PORT --bind 127.0.0.1 &
SRV_PID=$!
sleep 1
open "http://127.0.0.1:$PORT/index.html"
echo ""
echo "Press Ctrl+C to stop the server when you're done."
trap "kill $SRV_PID 2>/dev/null; exit 0" INT TERM
wait $SRV_PID
