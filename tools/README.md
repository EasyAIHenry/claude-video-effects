# tools

Run everything from the repo root. Each script explains itself at the top.

## Build the Vision tools once (macOS)

```bash
mkdir -p tools/bin
swiftc -O tools/vision/matte.swift -o tools/bin/matte
swiftc -O tools/vision/hands.swift -o tools/bin/hands
```

`make_matte.sh` builds `matte` for you if it is missing. Deprecation warnings from `swiftc` are expected.

## Order

```bash
export WHISPER_MODEL=~/whisper.cpp/models/ggml-medium.en.bin

python3 tools/transcribe_takes.py                 # 1. transcript of every take in clips/
python3 tools/find_speech.py clips/take-01.mp4 0 8  # 2. cut points for a line (0.08 s before, 0.10 s after)
# 3. edit TAKES and LINES at the top of tools/build_cut.py
python3 tools/build_cut.py                        # 4. public/talk.mp4, voice.wav, src/reel/cut.ts, words.ts
tools/make_matte.sh                               # 5. public/talk_matte.webm, work/matte/faces.jsonl
python3 tools/face_centres.py                     # 6. face centre per line for plan.ts
tools/bin/hands public/talk.mp4 24.2 2 work/hands.jsonl && python3 tools/palm_track.py work/hands.jsonl   # optional, palm prop
# 7. write src/reel/plan.ts, check stills, then:
npx remotion render src/index.ts MyReel out/reel.mp4
tools/check_render.sh out/reel.mp4                # 8. QA
```

## What each one does

- `transcribe_takes.py`: whisper.cpp on every clip, one `[start - end] text` line per segment.
- `find_speech.py`: 10 ms RMS against the noise floor; prints speech islands, the suggested in/out points and long pauses to split on.
- `build_cut.py`: the chosen pieces back to back, picture and voice in sync one to one. Voice chain: high-pass, FFT denoise, -3 dB at 250 Hz, +3 dB at 3 kHz, de-esser, each line levelled to the median, gentle compression, normalised to -14 LUFS. HLG footage is converted to SDR bt709 with VideoToolbox (`HLG = True`). Words come from whisper per piece, snapped to the nearest speech onset.
- `make_matte.sh`: Apple Vision person segmentation (accurate) per frame, feathered and attached as alpha to the cut (VP9 webm). Also face boxes per frame.
- `face_centres.py`: median face centre and size per line.
- `vision/hands.swift` + `palm_track.py`: Apple Vision hand pose per frame; the palm centre is the mean of the wrist and four knuckles, smoothed over 5 frames. Run it on the cut so the times are reel times.
- `check_render.sh`: duration, size, integrated loudness, true peak, a contact sheet, and a loudness-fixed copy if it is more than 1 LU off.
