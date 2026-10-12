#!/bin/bash
# QA for a finished render: length, loudness, true peak, and a contact sheet to look at.
# usage: tools/check_render.sh out/reel.mp4 [target_lufs]
# If the loudness is off by more than 1 LU it writes a fixed copy next to it: <name>-14lufs.mp4
set -euo pipefail
IN=$1
TARGET=${2:--14}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
SIZE=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$IN")
STATS=$(ffmpeg -nostats -i "$IN" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary:")
I=$(echo "$STATS" | awk '/I:/{print $2; exit}')
TP=$(echo "$STATS" | awk '/Peak:/{print $2; exit}')
echo "duration ${DUR}s | video ${SIZE} | loudness ${I} LUFS (target ${TARGET}) | true peak ${TP} dBTP"
OUT_DIR=$(dirname "$IN")
NAME=$(basename "$IN" .mp4)
# one frame per second, 6 across
ffmpeg -v error -y -i "$IN" -vf "fps=1,scale=270:-1,tile=6x$(( ( ${DUR%.*} + 6 ) / 6 ))" -frames:v 1 "$OUT_DIR/$NAME-sheet.jpg"
echo "contact sheet: $OUT_DIR/$NAME-sheet.jpg"
OFF=$(python3 -c "print(abs(float('$I') - float('$TARGET')) > 1.0)")
if [ "$OFF" = "True" ]; then
  ffmpeg -v error -y -i "$IN" -c:v copy -af "loudnorm=I=${TARGET}:TP=-1.0:LRA=11" -c:a aac -b:a 256k "$OUT_DIR/$NAME${TARGET}lufs.mp4"
  echo "loudness fixed: $OUT_DIR/$NAME${TARGET}lufs.mp4"
fi
