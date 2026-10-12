#!/usr/bin/env python3
"""Transcribe every take in clips/ with whisper.cpp so Claude can pick the best take of each line.

usage: python3 tools/transcribe_takes.py [clips_dir]
Writes clips/transcripts/<take>.txt with one "[start - end] text" line per segment (seconds on the take).
Set WHISPER_MODEL to your ggml model (default ~/whisper.cpp/models/ggml-medium.en.bin).
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

clips = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "clips")
model = os.path.expanduser(os.environ.get("WHISPER_MODEL", "~/whisper.cpp/models/ggml-medium.en.bin"))
out = clips / "transcripts"
out.mkdir(exist_ok=True)
tmp = tempfile.mkdtemp()
vids = sorted(p for p in clips.iterdir() if p.suffix.lower() in (".mp4", ".mov", ".m4v", ".mkv"))
if not vids:
    sys.exit(f"no video files in {clips}")
for v in vids:
    wav = f"{tmp}/{v.stem}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(v), "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
    subprocess.run(["whisper-cli", "-m", model, "-f", wav, "-oj", "-of", wav[:-4], "-l", "en"], check=True, capture_output=True)
    d = json.load(open(wav[:-4] + ".json"))
    lines = [f"[{s['offsets']['from'] / 1000:7.2f} - {s['offsets']['to'] / 1000:7.2f}] {s['text'].strip()}" for s in d["transcription"]]
    (out / f"{v.stem}.txt").write_text("\n".join(lines) + "\n")
    print(f"{v.name}: {len(lines)} segments")
print("transcripts in", out)
