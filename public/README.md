# public/

Remotion serves everything in this folder. Nothing here is committed except this note.

`tools/build_cut.py` and `tools/make_matte.sh` write:

- `talk.mp4`: the cut, 1080x1920, 30 fps
- `voice.wav`: the cleaned voice at -14 LUFS
- `raw.mp4`: the cut before the HLG conversion (HLG footage only), used as "before"
- `talk_matte.webm`: you, cut out, with alpha, same timing as `talk.mp4`

Put your own images here too and reference them by their path inside `public/`:

- `headlines/*.png`: screenshots for the Headline Wall
- `thumbs/*.jpg`: 9:16 reel thumbnails for the Orbit
- `prop.png`: a PNG with transparency for the Palm Prop

`sfx/` is committed: sound effects made with `tools/make_sfx.py` (riser, thud, whoosh, click, snap, powerdown, tick, freeze, pop). Re-run the script to remake them, or add your own and list them in `SFX` in `src/reel/plan.ts`.
