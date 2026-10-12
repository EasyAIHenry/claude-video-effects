#!/bin/bash
# Person matte for the cut, with Apple Vision (macOS 12+). Puts cards and props truly behind you.
# usage: tools/make_matte.sh [public/talk.mp4] [divisor]
#   writes public/talk_matte.webm (VP9 with alpha: you, cut out, on the same timing as the cut)
#   and work/matte/faces.jsonl (face boxes per frame: use them for the `face` centre of each effect)
# divisor = matte resolution (2 = 540x960, sharper; 4 = faster). Build the tool once first, see tools/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
IN=${1:-public/talk.mp4}
DIV=${2:-2}
BIN=tools/bin/matte
[ -x "$BIN" ] || { mkdir -p tools/bin; swiftc -O tools/vision/matte.swift -o "$BIN"; }
rm -rf work/matte && mkdir -p work/matte
"$BIN" "$IN" work/matte 1 "$DIV"
# Feather the matte edge slightly, then attach it as the alpha of the cut.
ffmpeg -v error -y -i "$IN" -framerate 30 -i work/matte/%05d.png \
  -filter_complex "[1:v]scale=1080:1920:flags=bicubic,format=gray,gblur=sigma=1.2[m];[0:v][m]alphamerge,format=yuva420p[v]" \
  -map "[v]" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 6M -auto-alt-ref 0 -shortest public/talk_matte.webm
# Point the reel at the matte.
if [ -f src/reel/cut.ts ]; then
  sed -i.bak 's/"matte": undefined/"matte": "talk_matte.webm"/; s/matte: undefined/matte: "talk_matte.webm"/' src/reel/cut.ts && rm -f src/reel/cut.ts.bak
fi
echo "matte: public/talk_matte.webm | faces: work/matte/faces.jsonl"
