#!/usr/bin/env python3
"""Median face centre for each line of the cut, from the matte tool's face boxes.

usage: python3 tools/face_centres.py [work/matte/faces.jsonl]
Reads src/reel/cut.ts for the line times and prints a `face: { x, y }` per line to paste into src/reel/plan.ts.
Every effect that works around the head (Headline Wall, Orbit, Digital Zoom, Spotlight, Freeze and Label) uses it.
"""
import json
import re
import statistics as st
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
faces = sys.argv[1] if len(sys.argv) > 1 else ROOT / "work" / "matte" / "faces.jsonl"
FPS = 30
txt = (ROOT / "src" / "reel" / "cut.ts").read_text()
cut = json.loads(re.sub(r"\bundefined\b", "null", txt.split("export const CUT: Cut = ", 1)[1].rsplit(";", 1)[0]))
boxes = {}
for line in open(faces):
    d = json.loads(line)
    if d["faces"]:
        # the biggest face in frame is the speaker
        b = max(d["faces"], key=lambda f: (f[2] - f[0]) * (f[3] - f[1]))
        boxes[d["i"]] = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[3] - b[1])
for ln in cut["lines"]:
    sel = [v for i, v in boxes.items() if ln["start"] * FPS <= i < ln["end"] * FPS]
    if not sel:
        print(f"{ln['id']}: no face found")
        continue
    x, y, h = st.median(s[0] for s in sel), st.median(s[1] for s in sel), st.median(s[2] for s in sel)
    print(f"{ln['id']} ({ln['fx']}): face: {{ x: {round(x)}, y: {round(y)} }}  // face box height {round(h)} px; if it is over 300, raise the Orbit radius and tilt")
