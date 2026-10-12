#!/usr/bin/env python3
"""Join the voice of every take into ONE file for Adobe Podcast Enhance, so you upload and enhance once.

usage: python3 tools/adobe_join.py [clips_dir] [out_dir]
Writes work/adobe/all-takes.mp3 (mono 48 kHz, 1 s of silence between takes) and work/adobe/offsets.json
(take file -> start and length in the joined file). Then:
  1. Open https://podcast.adobe.com/enhance, upload all-takes.mp3, keep the Enhance v2 defaults, download the result.
  2. python3 tools/adobe_split.py <downloaded.mp3>   (splits it back per take and checks the alignment)
  3. Set ENHANCED_DIR = "work/adobe/enhanced" in tools/build_cut.py and run it.
Adobe's free tier limits the length of each file and the minutes per day: keep the joined file under the limit it shows,
or split your takes into two runs.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
clips = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "clips"
out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "work" / "adobe"
out.mkdir(parents=True, exist_ok=True)
SR, GAP = 48000, 1.0
tmp = tempfile.mkdtemp()
vids = sorted(p for p in clips.iterdir() if p.suffix.lower() in (".mp4", ".mov", ".m4v", ".mkv", ".wav", ".m4a"))
if not vids:
    sys.exit(f"no takes in {clips}")
parts, offsets, t = [], {}, 0.0
for v in vids:
    w = f"{tmp}/{v.stem}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(v), "-vn", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", w], check=True)
    r = wave.open(w)
    x = np.frombuffer(r.readframes(r.getnframes()), np.int16)
    offsets[v.name] = {"start": round(t, 6), "length": round(len(x) / SR, 6)}
    parts += [x, np.zeros(int(GAP * SR), np.int16)]
    t += len(x) / SR + GAP
allw = f"{tmp}/all.wav"
with wave.open(allw, "wb") as o:
    o.setnchannels(1)
    o.setsampwidth(2)
    o.setframerate(SR)
    o.writeframes(np.concatenate(parts).tobytes())
mp3 = out / "all-takes.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", allw, "-c:a", "libmp3lame", "-b:a", "128k", str(mp3)], check=True)
(out / "offsets.json").write_text(json.dumps({"sample_rate": SR, "gap": GAP, "takes": offsets}, indent=1))
print(f"{len(vids)} takes, {t / 60:.1f} min, {mp3.stat().st_size / 1e6:.1f} MB -> {mp3}")
print("offsets ->", out / "offsets.json")
