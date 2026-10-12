#!/usr/bin/env python3
"""Palm centre track for PalmProp, from Apple Vision hand pose.

usage:
  swiftc -O tools/vision/hands.swift -o tools/bin/hands          (once)
  tools/bin/hands public/talk.mp4 <start_s> <dur_s> work/hands.jsonl
  python3 tools/palm_track.py work/hands.jsonl [left|right|auto]
Writes src/reel/palm.ts: [seconds on the reel, x, y] for every frame, smoothed, in 1080x1920 px.
The palm centre is the mean of the wrist and the four knuckles. Run hands on the cut (public/talk.mp4),
so its times are already reel times.
"""
import json
import sys
from pathlib import Path

src = sys.argv[1]
want = sys.argv[2] if len(sys.argv) > 2 else "auto"
KEYS = ["wrist", "indexMCP", "middleMCP", "ringMCP", "littleMCP"]
track = []
for line in open(src):
    d = json.loads(line)
    best = None
    for h in d["hands"]:
        if want != "auto" and h["chir"] != want:
            continue
        pts = [h["pts"][k] for k in KEYS if k in h["pts"]]
        if len(pts) < 3:
            continue
        x = sum(p[0] for p in pts) / len(pts)
        y = sum(p[1] for p in pts) / len(pts)
        conf = sum(p[2] for p in pts) / len(pts)
        # auto: the most confident hand that is lowest in frame (an open palm held out at chest height)
        score = conf + y / 4000
        if best is None or score > best[2]:
            best = (x, y, score)
    if best:
        track.append([d["t"], best[0], best[1]])
if not track:
    sys.exit("no hands found: hold the palm open, facing up, fully in frame")
# 5-frame moving average to take out the jitter
sm = []
for i in range(len(track)):
    win = track[max(0, i - 2): i + 3]
    sm.append([round(track[i][0], 3), round(sum(p[1] for p in win) / len(win)), round(sum(p[2] for p in win) / len(win))])
out = Path(__file__).resolve().parent.parent / "src" / "reel" / "palm.ts"
out.write_text(
    "// Written by tools/palm_track.py. [seconds on the reel, x, y] palm centre in 1080x1920 px.\n"
    "import type { PalmPoint } from '../effects/PalmProp';\n\n"
    f"export const PALM: PalmPoint[] = {json.dumps(sm)};\n"
)
print(f"{len(sm)} points, {sm[0][0]:.2f}-{sm[-1][0]:.2f} s ->", out)
