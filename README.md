# Claude Video Effects

Seven effects for talking-head videos, built in [Remotion](https://www.remotion.dev), and a Claude Code skill that edits your takes with them.

I made these for my reel "7 video effects Claude made for me". I recorded the lines, dropped the clips in, and Claude did the rest: picked the best take of each line, cut it, cleaned my voice, cut me out of the background, put each effect on the word that triggers it and rendered the reel. This repo is that setup with my footage taken out, so you can run it on yours.

## The effects

1. **Headline Wall**: headline cards fly out from behind your head and float around it.
2. **Orbit**: your reel thumbnails circle your head. The back half goes behind you, the front half passes under your chin.
3. **Digital Zoom**: a punch-in on your face with camera brackets and a blinking REC tag, then back out.
4. **Spotlight**: the room goes dark and you stay lit.
5. **Checklist**: a card in the top corner that ticks off three steps as you say them.
6. **Freeze and Label**: a white flash, the frame freezes, and a label with an arrow points at you.
7. **Before and After**: a wipe with a handle between what you filmed and what came back.

Plus word-by-word captions (active word in yellow), a label pill for "#1 ..." titles, and an extra: a prop or mascot that sits on your open palm and follows your hand.

## Quick start

```bash
git clone https://github.com/EasyAIHenry/claude-video-effects.git
cd claude-video-effects
npm install
npx remotion studio
```

The Studio opens with a stand-in person, so you can see every effect before you film anything:

- `MyReel`: the full reel, built from `src/reel/plan.ts`
- `AllEffects`: all seven back to back
- one composition per effect, to tune its props

Render: `npm run render` (writes `out/reel.mp4`).

## Using it with Claude Code

Copy the skill to where Claude Code looks for skills, either for all your projects:

```bash
cp -r skills/claude-video-effects ~/.claude/skills/
```

or for this project only:

```bash
mkdir -p .claude/skills && cp -r skills/claude-video-effects .claude/skills/
```

Then:

1. Record each line of your script as its own take.
2. Put the clips in `clips/`.
3. Tell Claude: "Use the claude-video-effects skill on my clips in clips/. Here's my script: ..." and say which line gets which effect.
4. Review the stills it shows you, ask for changes, and let it render.

### The two prompts from the guide

Setup, in an empty folder in Claude Code (the Code tab of the Claude desktop app):

```
Set up github.com/EasyAIHenry/claude-video-effects inside this folder itself, not in a subfolder, and run npm install. Install whatever is missing: Node.js 18 or newer, git, ffmpeg, whisper.cpp with the medium English model saved in ~/whisper.cpp/models/, numpy for Python, and on a Mac the Xcode command line tools. Copy skills/claude-video-effects into ~/.claude/skills. Then open the Remotion Studio so I can see the demo.
```

The edit, after your takes are in `clips/`:

```
Use the claude-video-effects skill. My takes are in clips/. Here is my script, one effect per line:

1. Everyone's talking about AI video, so here are 7 effects Claude made for me. (Headline Wall, starts on "talking")
2. It can spin my reels around my head. That's the orbit. (Orbit, starts on "spin")
3. ...

Pick the best take of each line and show me a still of every effect before you render.
```

Effect names: Headline Wall, Orbit, Digital Zoom, Spotlight, Checklist, Freeze and Label, Before and After, Palm Prop.

The skill file (`skills/claude-video-effects/SKILL.md`) has the whole workflow, and `references/effects.md` has the props, the line to say for each effect and filming tips.

## How the pipeline works

| Step | Tool | What it does |
|---|---|---|
| Transcribe takes | `tools/transcribe_takes.py` | whisper.cpp transcript of every take, with timestamps |
| Find cut points | `tools/find_speech.py` | speech islands from the waveform; cut 0.08 s before the first word and 0.10 s after the last |
| Build the cut | `tools/build_cut.py` | joins the chosen pieces, converts HLG to SDR, cleans and levels the voice to -14 LUFS, writes word timings for the captions |
| Person matte | `tools/make_matte.sh` + `tools/vision/matte.swift` | Apple Vision person segmentation, saved as a webm with alpha; also face boxes per frame |
| Face per line | `tools/face_centres.py` | the face centre and size each effect needs |
| Hand tracking | `tools/vision/hands.swift` + `tools/palm_track.py` | Apple Vision hand pose, smoothed into a palm track for the palm prop |
| Effects | `src/reel/plan.ts` | which effect starts on which word |
| QA | `tools/check_render.sh` | length, loudness, true peak, contact sheet, loudness fix if needed |

More in `tools/README.md`.

## Requirements

- Node.js 18 or newer
- ffmpeg (with libvpx for the matte, libx264 for the cut). On a Mac: `brew install ffmpeg`
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (`whisper-cli` on your PATH) and a model, e.g. `ggml-medium.en.bin`. On a Mac: `brew install whisper-cpp`, then download the model with the script in the whisper.cpp repo (`models/download-ggml-model.sh medium.en`). Point `WHISPER_MODEL` at it.
- Python 3 with numpy
- macOS 12 or newer with Xcode command line tools for the matte and hand tracking (`swiftc`). The effects still run without them, with a fallback for each.
- Claude Code, if you want Claude to do the edit for you

## Folder layout

```
skills/claude-video-effects/   the Claude Code skill
src/effects/                   the seven effects + palm prop
src/reel/                      your reel: cut.ts, words.ts, plan.ts, palm.ts, MyReel.tsx
src/Root.tsx                   compositions (MyReel, AllEffects, one per effect)
tools/                         cut, voice, matte, tracking and QA tools
clips/                         your takes (not committed)
public/                        generated media and your images (not committed)
```

## Licence

The code in this repo is MIT. See [LICENSE](LICENSE).

Remotion itself has its own licence: it is free for individuals, companies with up to 3 employees and non-profits, and larger companies need a company licence. Check [remotion.dev/license](https://www.remotion.dev/license) before you use it for a business.

Fonts load from Google Fonts through `@remotion/google-fonts`.
