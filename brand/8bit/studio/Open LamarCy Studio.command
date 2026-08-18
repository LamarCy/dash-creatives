#!/bin/bash
# ============================================================
#  LamarCy World Studio — double-click this file to open it.
#
#  It starts the tiny local server and opens the app in your
#  browser. Leave this Terminal window open while you work;
#  close it (or press Ctrl+C) when you're done.
#
#  If double-clicking ever stops working, run this once in
#  Terminal to make it executable again:
#      chmod +x "Open LamarCy Studio.command"
# ============================================================
set -u
cd "$(dirname "$0")" || exit 1

PORT=4173

# Find node. Homebrew installs are not on the PATH that Finder
# hands to a double-clicked script, so look in the usual places.
NODE=""
for candidate in \
  "$(command -v node 2>/dev/null)" \
  /opt/homebrew/bin/node \
  /opt/homebrew/opt/node@20/bin/node \
  /usr/local/bin/node
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then NODE="$candidate"; break; fi
done

if [ -z "$NODE" ]; then
  echo ""
  echo "  Node.js wasn't found, so the local server can't start."
  echo ""
  echo "  You can still use the app: open index.html in this folder"
  echo "  directly. Everything works except loading your edits to"
  echo "  presets.json (browsers block that over file://)."
  echo ""
  open "index.html"
  echo "  Press Return to close this window."
  read -r _
  exit 0
fi

# Already running? Just open the browser again.
if curl -s -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then
  echo "  Studio is already running on port $PORT — opening it."
  open "http://localhost:$PORT/"
  echo "  Press Return to close this window."
  read -r _
  exit 0
fi

echo ""
echo "  Starting the LamarCy World Studio…"
echo "  Exports land in your Downloads folder."
echo "  Keep this window open. Ctrl+C to stop."
echo ""

"$NODE" serve.mjs "$PORT" &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

# wait for it to answer before opening the browser
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then break; fi
  sleep 0.25
done

open "http://localhost:$PORT/"
wait $SERVER_PID
