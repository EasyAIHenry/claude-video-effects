#!/usr/bin/env python3
"""Build the cut for a talking-head reel: the best take of each line, cut on the waveform.

1. Drop your takes in clips/.
2. Run tools/transcribe_takes.py to get a transcript of every take with timestamps.
3. Pick the best take of each line and find its in/out points with tools/find_speech.py
   (cut 0.08 s before the first word and 0.10 s after the last word).
4. Fill in TAKES and LINES below, then run:  python3 tools/build_cut.py

Writes:
  public/talk.mp4    the cut picture, 1080x1920, 30 fps, SDR bt709
  public/raw.mp4     the same cut without the HLG conversion (only when HLG = True), for Before and After
  public/voice.wav   the cut voice, cleaned and levelled to VOICE_LUFS
  src/reel/cut.ts    line start/end times on the reel timeline
  src/reel/words.ts  word timings (seconds on the reel) for the captions

Needs: ffmpeg, whisper-cli (whisper.cpp) with a ggml model, python3 with numpy.
Picture and voice stay in sync one to one: every gap you add to the audio is added to the picture too.
"""
import json
import os
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

# ------------------------------------------------------------------ CONFIG ------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent  # the repo / Remotion project
CLIPS = ROOT / "clips"  # where your takes live
PUBLIC = ROOT / "public"
REEL = ROOT / "src" / "reel"

# take id -> file name in clips/
TAKES = {
    "A": "take-01.mp4",
    "B": "take-02.mp4",
}

# One entry per line of the script, in order:
#   (line id, take id, pieces, gap after the line in s, the line as you said it, the effect it triggers)
# pieces = [[in, out], ...] in seconds on the take. Use several pieces to drop a stumble or a long pause inside a line.
# A piece can carry a third number: the gap after that piece (default PIECE_GAP).
LINES = [
    ("L1", "A", [[1.32, 7.16]], 0.10, "Here are seven effects Claude made for me.", "HeadlineWall"),
    ("L2", "B", [[0.94, 3.10], [3.60, 5.54]], 0.10, "It can spin my reels around my head. That's the orbit.", "Orbit"),
]

WHISPER_MODEL = os.path.expanduser(os.environ.get("WHISPER_MODEL", "~/whisper.cpp/models/ggml-medium.en.bin"))
HLG = False  # True if the camera shot HLG / HDR (many phones and mirrorless cameras do). Converts to SDR bt709 (macOS, VideoToolbox).
ENHANCED_DIR = None  # optional: folder with a cleaned voice per take named <take id>.wav, same length as the take (e.g. from Adobe Podcast)
VOICE_LUFS = -14  # integrated loudness of the voice track
PIECE_GAP = 0.15  # silence between pieces inside a line
SR = 48000
FPS = 30
# --------------------------------------------------------------------------------------------------------------------------------------------

# Voice chains. LIGHT is for a voice that is already cleaned; LOCAL does the cleaning itself (denoise, de-mud, presence, de-ess).
LIGHT = "highpass=f=80,equalizer=f=250:width_type=o:width=1.2:g=-2,equalizer=f=3200:width_type=o:width=1.0:g=3.5,highshelf=f=5000:g=3"
LOCAL = (
    "highpass=f=90,afftdn=nr=10:nf=-50:tn=1,equalizer=f=250:width_type=o:width=1.2:g=-3,equalizer=f=3000:width_type=o:width=1.0:g=3,"
    "highshelf=f=7000:g=1.5,deesser=i=0.4:m=0.5:f=0.5"
)
tmp = tempfile.mkdtemp()


def take_path(t):
    return str(CLIPS / TAKES[t])


def run(*cmd):
    subprocess.run(list(cmd), check=True)


def read(p):
    w = wave.open(p)
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def write(p, x, ch=1):
    with wave.open(p, "wb") as o:
        o.setnchannels(ch)
        o.setsampwidth(2)
        o.setframerate(SR)
        o.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def pgap(pc):
    return pc[2] if len(pc) > 2 else PIECE_GAP


def piece_audio(take, a, b, i):
    out = f"{tmp}/p{i}.wav"
    enh = Path(ENHANCED_DIR) / f"{take}.wav" if ENHANCED_DIR else None
    src, chain = (str(enh), LIGHT) if enh and enh.exists() else (take_path(take), LOCAL)
    run("ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", src, "-vn", "-ac", "1", "-ar", str(SR), "-af", chain, out)
    x = read(out)
    n = int(round((b - a) * SR))
    x = np.pad(x, (0, max(0, n - len(x))))[:n]
    f = int(0.012 * SR)  # 12 ms fades so the cuts never click
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    return x


def speech_db(x):
    hop = SR // 100
    n = len(x) // hop
    r = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    return 20 * np.log10(np.sort(r)[n // 2:].mean())


# ---- voice: pieces back to back, each line levelled to the median, then compressed and normalised ----
segs, chunks, t, k = [], [], 0.0, 0
for lid, take, pieces, gap, text, fx in LINES:
    xs = []
    for j, pc in enumerate(pieces):
        xs.append(piece_audio(take, pc[0], pc[1], k))
        k += 1
        tail = pgap(pc) if j < len(pieces) - 1 else gap
        if tail:
            xs.append(np.zeros(int(round(tail * SR)), np.float32))
    x = np.concatenate(xs)
    dur = len(x) / SR
    segs.append({"id": lid, "take": take, "pieces": pieces, "gap": gap, "start": round(t, 3), "end": round(t + dur - gap, 3), "text": text, "fx": fx})
    chunks.append(x)
    t += dur
target = float(np.median([speech_db(c) for c in chunks]))
TAIL = 0.6  # room tone after the last line (the picture holds its last frame)
y = np.concatenate([c * (10 ** (max(-8, min(8, target - speech_db(c))) / 20)) for c in chunks] + [np.zeros(int(TAIL * SR), np.float32)])
total = round(len(y) / SR, 3)
raw = f"{tmp}/mix.wav"
write(raw, y)
mid = f"{tmp}/mix_c.wav"
run("ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "acompressor=threshold=-22dB:ratio=2:attack=8:release=140:makeup=1,alimiter=limit=0.9", mid)
r = subprocess.run(["ffmpeg", "-nostats", "-i", mid, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
I = float([ln for ln in r.splitlines() if ln.strip().startswith("I:")][-1].split()[1])
PUBLIC.mkdir(exist_ok=True)
run("ffmpeg", "-v", "error", "-y", "-i", mid, "-af", f"volume={VOICE_LUFS - I:.2f}dB,alimiter=limit=0.89", "-ac", "2", str(PUBLIC / "voice.wav"))


# ---- picture: the same pieces and gaps (last frame held through each gap), then 1080x1920 at 30 fps ----
def picture(name, to_sdr):
    vf, inputs, idx = [], [], {}
    for s in segs:
        if s["take"] not in idx:
            idx[s["take"]] = len(idx)
            hw = ["-hwaccel", "videotoolbox", "-hwaccel_output_format", "videotoolbox_vld"] if HLG else []
            inputs += [*hw, "-i", take_path(s["take"])]
        for j, pc in enumerate(s["pieces"]):
            g = pgap(pc) if j < len(s["pieces"]) - 1 else s["gap"]
            pad = f",tpad=stop_mode=clone:stop_duration={g}" if g else ""
            vf.append(f"[{idx[s['take']]}:v]trim={pc[0]}:{pc[1]},setpts=PTS-STARTPTS{pad}[v{len(vf)}]")
    if HLG:
        if to_sdr:
            # The VideoToolbox conversion leaves HLG footage a little flat, so the SDR version gets a gentle tone curve back.
            tail = ("scale_vt=w=1080:h=1920:color_matrix=bt709:color_primaries=bt709:color_transfer=bt709,hwdownload,format=p010le,format=yuv420p,"
                    "curves=master='0/0 0.25/0.33 0.6/0.74 1/1',eq=saturation=1.08")
        else:
            tail = "scale_vt=w=1080:h=1920,hwdownload,format=p010le,format=yuv420p"
    else:
        tail = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p"
    fc = ";".join(vf) + ";" + "".join(f"[v{i}]" for i in range(len(vf))) + f"concat=n={len(vf)}:v=1:a=0[vc];[vc]{tail},tpad=stop_mode=clone:stop_duration={TAIL},fps={FPS}[vo]"
    run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[vo]", "-c:v", "libx264", "-crf", "14",
        "-preset", "slow", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-t", f"{total}",
        str(PUBLIC / f"{name}.mp4"))


picture("talk", True)
if HLG:
    picture("raw", False)  # flat, straight-off-the-camera look for the "before" side

# ---- words: whisper per piece, token offsets mapped onto the reel, snapped to the nearest speech onset ----
w16 = f"{tmp}/m16.wav"
run("ffmpeg", "-v", "error", "-y", "-i", raw, "-ar", "16000", w16)
B = read(w16)
n = len(B) // 160
R = 20 * np.log10(np.sqrt((B[: n * 160].reshape(n, 160) ** 2).mean(1)) + 1e-9)
fl = np.percentile(R, 10)


def snap(tt):
    i0, i1 = max(1, int((tt - 0.10) * 100)), min(n - 1, int((tt + 0.10) * 100))
    on = [i for i in range(i0, i1) if R[i] > fl + 12 and R[i - 1] <= fl + 12]
    return round(min(on, key=lambda i: abs(i / 100 - tt)) / 100, 3) if on else round(tt, 3)


words = []
for s in segs:
    ws, off = [], s["start"]
    for j, pc in enumerate(s["pieces"]):
        a, b = pc[0], pc[1]
        p = f"{tmp}/{s['id']}_{j}.wav"
        run("ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", take_path(s["take"]), "-vn", "-ar", "16000", "-ac", "1", p)
        subprocess.run(["whisper-cli", "-m", WHISPER_MODEL, "-f", p, "-oj", "-ojf", "-of", p[:-4], "-l", "en", "-ml", "1"], check=True, capture_output=True)
        d = json.load(open(p[:-4] + ".json"))
        cur = None
        for sg in d["transcription"]:
            for tk in sg["tokens"]:
                tx = tk["text"]
                if tx.startswith("[_") or not tx.strip() or tx.strip() in (".", ",", '"', "?", "!"):
                    continue
                t0 = off + tk["offsets"]["from"] / 1000
                t1 = off + tk["offsets"]["to"] / 1000
                if tx.startswith(" ") or cur is None:
                    cur = [round(t0, 3), round(t1, 3), tx.strip()]
                    ws.append(cur)
                else:
                    cur[1] = round(t1, 3)
                    cur[2] += tx.strip()
        off += (b - a) + (pgap(pc) if j < len(s["pieces"]) - 1 else 0)
    # Use your script's spelling when whisper heard the same number of words.
    disp = s["text"].replace(",", "").replace(".", "").replace("?", "").replace("!", "").split()
    if len(ws) == len(disp):
        ws = [[x[0], x[1], d_] for x, d_ in zip(ws, disp)]
    else:
        print("  word count differs on", s["id"], "- check the spelling in words.ts:", [x[2] for x in ws])
    for x in ws:
        words.append({"text": x[2], "start": snap(x[0]), "end": x[1]})
    print(s["id"], f"{s['start']:6.2f}-{s['end']:6.2f}", s["text"])

REEL.mkdir(parents=True, exist_ok=True)
lines = [{"id": s["id"], "start": s["start"], "end": s["end"], "text": s["text"], "fx": s["fx"]} for s in segs]
(REEL / "cut.ts").write_text(
    "// Written by tools/build_cut.py. All times are seconds on the reel timeline.\n"
    "export type CutLine = { id: string; start: number; end: number; text: string; fx: string };\n"
    "export type Cut = { video: string; matte?: string; raw?: string; voice?: string; total: number; lines: CutLine[] };\n\n"
    f"export const CUT: Cut = {json.dumps({'video': 'talk.mp4', 'matte': 'talk_matte.webm' if (PUBLIC / 'talk_matte.webm').exists() else None, 'raw': 'raw.mp4' if HLG else None, 'voice': 'voice.wav', 'total': total, 'lines': lines}, indent=1).replace('null', 'undefined')};\n"
)
(REEL / "words.ts").write_text(
    "// Written by tools/build_cut.py: whisper.cpp word timings, seconds on the reel timeline.\n"
    "import type { Word } from '../Captions';\n\n"
    f"export const WORDS: Word[] = {json.dumps(words)};\n"
)
print("TOTAL", total, "s | voice", VOICE_LUFS, "LUFS | lines", len(segs), "| words", len(words))
print("Next: tools/make_matte.sh (person matte), then write src/reel/plan.ts and preview with npx remotion studio")
