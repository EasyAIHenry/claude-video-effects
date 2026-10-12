#!/usr/bin/env python3
"""Make the sound effects the reel uses, from scratch with numpy (no downloads, no licences to check).

usage: python3 tools/make_sfx.py [out_dir] [--riser-seconds 2.5]
Writes mono 48 kHz WAVs into public/sfx/:
  riser.wav      rising noise + saw sweep. Place it so it ENDS on the cut: start = next line start - riser length.
  thud.wav       low hit for the cut the riser lands on
  whoosh.wav     short air swoosh (orbit start, wipes)
  click.wav      UI click (zoom)
  snap.wav       finger-snap crack (spotlight; put it 1 frame before the lights go off, or skip it if your real snap is loud)
  powerdown.wav  falling tone (lights off)
  tick.wav       checklist tick
  freeze.wav     0.7 s swell that hits on the freeze: start it 0.7 s before the freeze frame
  pop.wav        pitched pop (palm prop, cards)
"""
import sys
import wave
from pathlib import Path

import numpy as np

args = [a for a in sys.argv[1:] if not a.startswith("--")]
OUT = Path(args[0]) if args else Path(__file__).resolve().parent.parent / "public" / "sfx"
RISER = float(sys.argv[sys.argv.index("--riser-seconds") + 1]) if "--riser-seconds" in sys.argv else 2.5
SR = 48000
rng = np.random.default_rng(7)
OUT.mkdir(parents=True, exist_ok=True)


def save(name, x, gain=0.9):
    x = np.asarray(x, float)
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    f = int(0.003 * SR)  # tiny fades, no clicks at the ends
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t(d):
    return np.arange(int(SR * d)) / SR


def lp(x, alpha):
    """One-pole low-pass; alpha can change over time (0..1, higher = brighter)."""
    y = np.zeros_like(x)
    s = 0.0
    al = np.broadcast_to(np.asarray(alpha, float), x.shape)
    for i in range(len(x)):
        s += al[i] * (x[i] - s)
        y[i] = s
    return y


def hp(x, alpha):
    return x - lp(x, alpha)


def sweep(f):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# riser: noise opening up + a saw sweeping up, growing to the end
d = RISER
tt = t(d)
u = tt / d
ph = 2 * np.pi * np.cumsum(180 + 1700 * u ** 2) / SR
saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
save("riser", (0.3 * lp(saw, 0.15) + 0.7 * lp(rng.normal(size=len(tt)), 0.02 + 0.4 * u ** 2)) * u ** 2.2, 0.7)
# thud: short low hit
tt = t(0.25)
save("thud", np.tanh(2 * (sweep(120 * np.exp(-tt * 12) + 45) * np.exp(-tt * 14) + 0.4 * lp(rng.normal(size=len(tt)), 0.2) * np.exp(-tt * 40))), 0.9)
# whoosh: filtered noise with a moving brightness peak
tt = t(0.45)
u = tt / 0.45
save("whoosh", lp(rng.normal(size=len(tt)), 0.015 + 0.35 * np.exp(-((u - 0.55) / 0.22) ** 2)) * np.sin(np.pi * u) ** 1.6, 0.75)
# click: UI tick
tt = t(0.05)
save("click", (np.sin(2 * np.pi * 2400 * tt) * 0.6 + hp(rng.normal(size=len(tt)), 0.5)) * np.exp(-tt * 160), 0.55)
# snap: bright crack with a body thump, very short
tt = t(0.3)
save("snap", hp(rng.normal(size=len(tt)), 0.55) * np.exp(-tt * 70) + 0.35 * sweep(np.full(len(tt), 1800.0)) * np.exp(-tt * 90) + 0.25 * sweep(220 * np.exp(-tt * 20) + 90) * np.exp(-tt * 30), 0.9)
# powerdown: falling tone, lights going off
tt = t(0.6)
save("powerdown", sweep(400 * np.exp(-tt * 5) + 40) * np.exp(-tt * 3.5) + 0.2 * lp(rng.normal(size=len(tt)), 0.05) * np.exp(-tt * 6), 0.7)
# tick
tt = t(0.03)
save("tick", np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt * 220), 0.5)
# freeze: 0.7 s reversed shimmer swelling up, then a glassy hit at 0.7 s that rings out
lead, ring = 0.7, 0.35
tt = t(lead + ring)
x = np.zeros_like(tt)
for fq in (1320, 1760, 2640, 3520):
    x += np.sin(2 * np.pi * fq * tt) * 0.25
swell = np.where(tt < lead, (tt / lead) ** 3, np.exp(-(tt - lead) * 9))
hit = np.where(tt >= lead, hp(rng.normal(size=len(tt)), 0.6) * np.exp(-np.clip(tt - lead, 0, None) * 45), 0)
save("freeze", x * swell + 0.8 * hit, 0.8)
# pop
tt = t(0.14)
save("pop", sweep(900 * np.exp(-tt * 18) + 320) * np.exp(-tt * 28) + 0.2 * hp(rng.normal(size=len(tt)), 0.4) * np.exp(-tt * 120), 0.7)
print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*.wav"))), "to", OUT)
