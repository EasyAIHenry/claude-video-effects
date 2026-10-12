---
name: claude-video-effects
description: Edit a talking-head video with seven effects in Remotion - Headline Wall, Orbit, Digital Zoom, Spotlight, Checklist, Freeze and Label, Before and After - plus captions and an optional prop on your palm. Picks the best take of each line, cuts on the waveform, cleans the voice, makes a person matte and hand track with Apple Vision, places each effect on the word that triggers it, renders at -14 LUFS and checks the result. Use when the user says "add video effects", "edit my talking-head video", "use the video effects skill", "orbit effect", "headline wall", "digital zoom", "spotlight effect", "checklist effect", "freeze and label", "before and after effect", "put something on my palm", or drops talking-head clips and asks for an effects reel.
---

# Claude Video Effects

You edit the user's talking-head takes into a vertical reel (1080x1920, 30 fps) with seven effects. Everything runs locally: ffmpeg, whisper.cpp, Apple Vision (macOS) and Remotion.

The project is the repo https://github.com/EasyAIHenry/claude-video-effects. If the current folder is not that project (no `src/effects/cards.tsx`), look for it in a `claude-video-effects/` subfolder first. If it is not there, clone it (into the current folder itself with `git clone <url> .` when the folder is empty), then `npm install`. Prerequisites: Node.js 18+, git, ffmpeg, whisper.cpp with a ggml model (default path `~/whisper.cpp/models/ggml-medium.en.bin`, or set `WHISPER_MODEL`), Python 3 with numpy, and on macOS the Xcode Command Line Tools for `swiftc`.

Effect details, props and the line that triggers each one: `references/effects.md` (in this skill folder). Read it before step 6.

## Rules for every edit

- Nothing covers the face. Ever. Cards go behind the head with the matte, labels and arrows sit beside it, the checklist sits above and to the side.
- Colour: `build_cut.py` applies a cool, neutral look by default (`LOOK = "cool"`), after the HLG to SDR lift when the footage is HLG. Warmer grades turned skin yellow in testing. Do not add any other grade; set `LOOK = None` if the user wants untouched colour.
- Hard cuts between lines. No transitions.
- Captions on the chest (y about 1180), 3 words at most, active word yellow. On Orbit lines they sit low (y 1560), below the ring; `MyReel` does that for you.
- All text inside the safe zone x 64..948, y 250..1470.
- Voice at -14 LUFS integrated, true peak under -1 dBTP.
- Every effect starts on its trigger word: the word's start time minus about 0.07 s. Two exceptions: the Spotlight starts on the finger snap, and Freeze and Label freezes on the first frame of the hold after its line.
- Show the user stills before the full render, and do not call it done until the QA in step 8 passes.

## Workflow

### 1. Record (the user)
Tell the user to film each line of the script as a separate take, phone or camera upright, 4K if they can. Several takes per line is fine. Filming tips per effect are in `references/effects.md` (sit a little back for the zoom, space around the head for the orbit, snap for the spotlight, a pause for the freeze, palm out for the prop).

### 2. Drop the clips in
The user puts every take in `clips/`. Ask for the script (the lines in order and which effect each line gets) if they have not given it. Check the format with `ffprobe` (size, fps, and `color_transfer`: `arib-std-b67` means HLG, so set `HLG = True` in `build_cut.py`).

### 3. Pick the best take of each line
```bash
WHISPER_MODEL=/path/to/ggml-medium.en.bin python3 tools/transcribe_takes.py
```
Read `clips/transcripts/*.txt`. For each line choose the take that says the full line cleanly, with no stumble and the most energy. When two are equal, take the later one. Then find exact cut points on the waveform:
```bash
python3 tools/find_speech.py clips/<take>.mp4 <from_s> <to_s>
```
It prints the speech islands and the cut: **0.08 s before the first word, 0.10 s after the last word**. If it reports a pause longer than about 0.45 s inside the line, split the line into two pieces there. For the Spotlight line add `--snap`: it prints the finger snap to the millisecond. Tell the user which take you picked for each line and why, in one short line each.

**A fluffed word.** If the best take has one word mumbled or wrong, and the user has a saved voice clone, a single word can be patched: generate just that word in their cloned voice, then add it to `PATCHES` in `build_cut.py` (take, start, end on the take, wav). End the patch before the next word's first consonant, or the join is audible. Patch one word at most per line, and tell the user which word you patched.

### 4. Clean the voice (optional, best result) and build the cut
**Adobe Podcast Enhance**, if the user has an Adobe account. Enhance every take in one go, so the voice sounds the same on every line:
```bash
python3 tools/adobe_join.py        # work/adobe/all-takes.mp3 (takes joined, 1 s gaps) + work/adobe/offsets.json
```
The user (or Claude in Chrome, with the user watching) uploads `all-takes.mp3` at https://podcast.adobe.com/enhance, keeps the Enhance v2 defaults, and downloads the result. Ask before any download. Then:
```bash
python3 tools/adobe_split.py ~/Downloads/<enhanced>.mp3   # work/adobe/enhanced/<take>.wav, alignment checked per take
```
Every take must print OK (within 2 ms, checked by cross-correlation against the original). Set `ENHANCED_DIR = "work/adobe/enhanced"` in `build_cut.py`. With an enhanced voice it uses a light EQ only; never stack denoise on top.

Then fill `TAKES` and `LINES` at the top of `tools/build_cut.py` (take ids, pieces, the line text exactly as said, the effect name). For the Freeze and Label line, give the piece that ends on the pause a third number, the hold in seconds (about 1.0): `[60.72, 62.97, 1.0]`. The picture holds that piece's last frame and the voice is silent for the hold, and `cut.ts` lists it under `holds`. Then:
```bash
WHISPER_MODEL=/path/to/ggml-medium.en.bin python3 tools/build_cut.py
```
It writes `public/talk.mp4`, `public/voice.wav` (denoise, de-mud, presence, de-ess when not enhanced, each line levelled, -14 LUFS), `public/raw.mp4` when HLG, `src/reel/cut.ts` and `src/reel/words.ts`. If it prints "word count differs", fix the spelling in `words.ts` by hand.

### 5. Person matte and hand tracking (macOS)
```bash
tools/make_matte.sh                      # public/talk_matte.webm + work/matte/faces.jsonl
python3 tools/face_centres.py            # face centre and size per line, for plan.ts
```
Only if a line uses the palm prop:
```bash
mkdir -p tools/bin && swiftc -O tools/vision/hands.swift -o tools/bin/hands
tools/bin/hands public/talk.mp4 <line_start_s> <line_length_s> work/hands.jsonl
python3 tools/palm_track.py work/hands.jsonl
```
Not on a Mac: skip the matte and the hand track (set `matte: undefined` in `cut.ts`). There are no face boxes either, so render one still per line (`npx remotion still ... --frame=<line middle>`), read it, and estimate the face centre and size yourself. The effects still work: Headline Wall keeps cards off the head, Orbit fakes the behind pass, Spotlight uses a soft vignette, the palm prop sits at one fixed point you choose. HLG conversion needs macOS (VideoToolbox), so ask the user to film with HDR video turned off.

### 6. Place the effects
Write `src/reel/plan.ts`: one entry per effect with `at` and `to` in seconds from `words.ts`, the `face` from `face_centres.py`, a label if the user wants the "#1 ..." pills, and the props from `references/effects.md`. Ask the user for images where an effect needs them (headline screenshots for the Headline Wall, reel thumbnails for the Orbit, a prop PNG for the palm) and put them in `public/`. Then type-check and look:
```bash
npx tsc --noEmit
npx remotion still src/index.ts MyReel out/check.png --frame=<trigger frame + 10> --scale=0.5
```
Render one still per effect, about 10 frames after its trigger, and read every still yourself. Check: face clear, cards behind the head where the matte says, text in the safe zone, caption readable. Fix and re-check before you show the user.

**Sound effects.** `public/sfx/` ships with generated SFX (re-make them with `python3 tools/make_sfx.py`). List them in `SFX` in `plan.ts` as `[seconds, file, dB]`:
- a 2.5 s `riser.wav` under the hook line that ENDS on the cut to line 2 (start = line 2 start - 2.5), plus `thud.wav` on the cut;
- `snap.wav` 1 frame before the Spotlight (skip it if the real snap is loud) and `powerdown.wav` on it;
- `freeze.wav` 0.7 s before the freeze frame (it swells and hits on the freeze);
- `tick.wav` on each checklist tick, `whoosh.wav` on the orbit start and the wipe, `pop.wav` for the palm prop.
Keep SFX 6 dB or more under the voice, and re-check loudness after.

**Framed look (optional).** `MyReelFramed` puts the reel in a big card (0.65 scale: x 189, y 270, w 702, h 1248) on a dark frame, with the user's name top left and a "Comment KEYWORD" line at y 1534. Set `FRAME` in `plan.ts`. Render it instead of `MyReel` when the user wants that look.

### 7. Render
```bash
npx remotion render src/index.ts MyReel out/reel.mp4          # or MyReelFramed
```

### 8. QA
```bash
tools/check_render.sh out/reel.mp4
```
It prints length, loudness and true peak, writes `out/reel-sheet.jpg` (one frame per second) and, if loudness is more than 1 LU off -14, a fixed copy. Then:
- Look at the contact sheet: no frame with anything over the face, no black or frozen gaps, no stray placeholder art.
- Play the cut points: no clicks, no clipped first or last words.
- Captions match the words said, spelled right (names, numbers, product names).
- Each effect starts on its word.
Report to the user: the file path, length, loudness, which take each line came from, and anything you were not sure about. Ask before you change their script or drop a line.
