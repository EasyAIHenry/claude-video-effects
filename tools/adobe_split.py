#!/usr/bin/env python3
"""Split the Adobe-enhanced file back into one WAV per take, and check each one lines up with the original.

usage: python3 tools/adobe_split.py <enhanced.mp3> [work/adobe/offsets.json] [clips_dir]
Writes work/adobe/enhanced/<take name>.wav (48 kHz mono, full length of the take). For each take it cross-correlates
3 s of the enhanced voice against the original at the loudest moment and prints the offset. MP3 encoders add a few ms
of delay at the start of the file; the script measures that on the first take and removes it from all of them.
Every take must print OK (within 2 ms). If one does not, do not use it: re-run that take on its own.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
enh = sys.argv[1]
offs = json.loads(Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "work" / "adobe" / "offsets.json").read_text())
clips = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "clips"
out = ROOT / "work" / "adobe" / "enhanced"
out.mkdir(parents=True, exist_ok=True)
SR = offs["sample_rate"]
tmp = tempfile.mkdtemp()


def load(path):
    w = f"{tmp}/{Path(path).stem}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vn", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", w], check=True)
    r = wave.open(w)
    return np.frombuffer(r.readframes(r.getnframes()), np.int16).astype(np.float32) / 32768


def offset_ms(orig, new):
    """Lag of `new` against `orig` in ms, measured on 3 s around the loudest second of the original."""
    hop = SR // 10
    n = min(len(orig), len(new)) // hop
    if n < 40:
        return 0.0, 0.0
    e = (orig[: n * hop].reshape(n, hop) ** 2).mean(1)
    c = int(np.clip(np.argmax(e) * hop, SR * 2, len(orig) - SR * 2))
    a = new[c - int(1.5 * SR): c + int(1.5 * SR)]
    b = orig[c - int(1.7 * SR): c + int(1.7 * SR)]
    a = (a - a.mean()) / (a.std() + 1e-9)
    b = (b - b.mean()) / (b.std() + 1e-9)
    cc = np.correlate(b, a, mode="valid")
    k = int(np.argmax(cc))
    return (k - int(0.2 * SR)) / SR * 1000, cc[k] / len(a)


E = load(enh)
shift = 0  # samples of encoder delay, measured on the first take
bad = 0
for i, (name, o) in enumerate(offs["takes"].items()):
    s0, n = int(round(o["start"] * SR)), int(round(o["length"] * SR))
    orig = load(clips / name)[:n]
    piece = E[s0 + shift: s0 + shift + n]
    ms, match = offset_ms(orig, piece)
    if i == 0 and abs(ms) > 0.5:
        shift = int(round(-ms / 1000 * SR))
        piece = E[s0 + shift: s0 + shift + n]
        ms, match = offset_ms(orig, piece)
        print(f"encoder delay {-shift / SR * 1000:+.1f} ms removed from every take")
    piece = np.pad(piece, (0, max(0, n - len(piece))))
    ok = abs(ms) <= 2
    bad += not ok
    with wave.open(str(out / f"{Path(name).stem}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(piece, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"{name:32s} offset {ms:+6.1f} ms  match {match:.2f}  {'OK' if ok else 'NOT ALIGNED'}")
print(f"wrote {len(offs['takes'])} takes to {out}" + ("" if not bad else f"  ({bad} not aligned: do not use those)"))
