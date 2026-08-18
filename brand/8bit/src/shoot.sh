#!/bin/bash
# Screenshot an HTML file with headless Chrome (Playwright is not installed on
# this machine; /opt/pw-browsers does not exist here). Usage:
#   bash brand/8bit/src/shoot.sh <input.html> <output.png> [width] [scale]
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
IN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT="$2"; W="${3:-1400}"; S="${4:-2}"; H="${5:-3000}"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor="$S" --window-size="$W,$H" \
  --screenshot="$OUT" --default-background-color=00000000 \
  --virtual-time-budget=4000 "file://$IN" 2>/dev/null
echo "wrote $OUT"
