#!/usr/bin/env python3
"""Find where speech starts and stops inside a window of a take, from the waveform.

usage: python3 tools/find_speech.py <take.mp4|.wav> <from_s> <to_s> [threshold_db]
Prints the speech islands (10 ms RMS above the noise floor + threshold, gaps under 120 ms merged)
and the suggested cut points: 0.08 s before the first word, 0.10 s after the last word.
"""
import subprocess
import sys
import tempfile
import wave

import numpy as np

p, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
th_db = float(sys.argv[4]) if len(sys.argv) > 4 else 14.0
if not p.lower().endswith(".wav"):
    w = tempfile.mktemp(suffix=".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-vn", "-ac", "1", "-ar", "48000", w], check=True)
    p = w
wf = wave.open(p)
sr = wf.getframerate()
x = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768
if wf.getnchannels() > 1:
    x = x.reshape(-1, wf.getnchannels()).mean(1)
hop = sr // 100
n = len(x) // hop
R = 20 * np.log10(np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
floor = np.percentile(R, 8)
i0, i1 = int(a * 100), min(n, int(b * 100))
on = R[i0:i1] > floor + th_db
isl, s = [], None
for k, v in enumerate(on):
    if v and s is None:
        s = k
    if not v and s is not None:
        isl.append((s, k))
        s = None
if s is not None:
    isl.append((s, len(on)))
merged = []
for s_, e_ in isl:
    if merged and s_ - merged[-1][1] < 12:
        merged[-1] = (merged[-1][0], e_)
    else:
        merged.append((s_, e_))
merged = [(s_, e_) for s_, e_ in merged if e_ - s_ > 3]
print(f"noise floor {floor:.1f} dB, threshold +{th_db:.0f} dB")
print("speech:", " | ".join(f"{(i0 + s_) / 100:.2f}-{(i0 + e_) / 100:.2f}" for s_, e_ in merged) or "none")
if merged:
    first, last = (i0 + merged[0][0]) / 100, (i0 + merged[-1][1]) / 100
    print(f"cut: in {max(0, first - 0.08):.2f}  out {last + 0.10:.2f}")
    gaps = [((i0 + merged[k][1]) / 100, (i0 + merged[k + 1][0]) / 100) for k in range(len(merged) - 1)]
    long = [f"{g0:.2f}-{g1:.2f}" for g0, g1 in gaps if g1 - g0 > 0.45]
    if long:
        print("long pauses (split into pieces here):", ", ".join(long))
