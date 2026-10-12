#!/bin/sh
# Renders the share images with headless Chrome. Usage: share/render.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { # html out width height scale
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 \
    --force-device-scale-factor="$5" --window-size="$3,$4" --screenshot="$2" "file://$DIR/$1" 2>/dev/null
}
shot og.html "$DIR/../app/opengraph-image.png" 1200 630 1
shot slack.html "$DIR/slack-deck.png" 1600 3034 2
