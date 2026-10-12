# The seven effects

Every effect lives in `src/effects/` and is placed from `src/reel/plan.ts`:

```ts
{ fx: 'Orbit', at: 7.07, to: 10.69, label: '#2 Orbit', face: { x: 610, y: 890 }, props: { radius: 430, tilt: 430 } }
```

- `at` / `to`: seconds on the reel timeline (same clock as `words.ts`). `at` = trigger word start minus about 0.07 s. `to` = end of the line, or the next line's start for a hard cut.
- `face`: from `tools/face_centres.py`. Default 540,640 is wrong for most footage, so always set it for effects that work around the head.
- `label`: optional white pill at the top ("#2 Orbit").
- Times inside `props` (Checklist `items[].at`, FreezeAndLabel `freezeAt`, PalmProp `hopAt`) are also reel seconds. `MyReel.tsx` converts them.
- Images go in `public/` and are referenced by their path inside it, e.g. `'headlines/1.png'`.

Shared props on every effect: `src`, `start`, `duration`, `trimBefore`, `face`, `label` (set for you by `MyReel.tsx`).

---

## 1. Headline Wall
Headline cards fly out from behind your head and float around it.

- **Trigger line:** "Everyone's talking about ..." Start on "talking" (or on the topic word).
- **Props:** `images?: string[]` (headline screenshots; placeholder cards when empty, up to 6), `stagger` (frames between cards, 4), `matteSrc` (set from `cut.ts`).
- **Tip:** with the matte the cards sit truly behind you. Without it, the slots that would cover your head are dropped. Crop screenshots to about 3:2 so they read at this size.
- **Sound:** this is usually the hook line. Put a 2.5 s `riser.wav` under its end so it lands on the cut to line 2, with `thud.wav` on the cut.
- **Filming:** leave space above and beside your head. Don't sit against the wall.

## 2. Orbit
Your reel thumbnails circle your head on a tilted ring.

- **Trigger line:** "It can spin my reels around my head." Start on "spin".
- **Props:** `images?` (9:16 thumbnails), `count` (images, or 7), `radius` (430, half-width of the ring), `tilt` (430, how far the ring tips toward the camera), `ringOffset` (-30, ring centre relative to the face centre), `speed` (0.3 turns per second), `cardWidth` (165).
- **How it moves:** the back half rides above the hair and passes behind the head (the matte covers it); the front half sweeps low across the chest. With tilt about equal to radius no card ever reaches the face, so cards never fade out mid-path. Captions for this line sit low (y 1560), below the ring.
- **Tip:** if the face is large in frame, raise `radius` and `tilt` together. If the back cards poke out of the top of the frame, lower `tilt` a little or move `ringOffset` down.
- **Filming:** leave about a head-width of space on each side of your head and some space above it.

## 3. Digital Zoom
A punch-in toward your face with camera brackets and a blinking REC tag, then back out.

- **Trigger line:** "This is a digital zoom." Start on "zoom". End it on the next beat (for example after "... to do this").
- **Props:** `scale` (1.55), `inFrames` (12), `outFrames` (14), `brackets` (true).
- **Tip:** keep `scale` at 1.6 or less on 1080p footage. Film 4K if you can and it stays sharp.
- **Filming:** sit a little further back than usual so the zoomed frame still has your shoulders.

## 4. Spotlight
The room goes dark and you stay lit.

- **Trigger:** a finger snap, not a word. Line: "If you want one line to hit, just kill the lights." Snap on "lights". `tools/find_speech.py <take> <from> <to> --snap` prints the snap to the millisecond; `at` = that time on the reel. `to` = the end of the line: it stays dark until the cut.
- **Props:** `darkness` (0.84), `radius` (300), `centre?` (defaults to just below the face), `inFrames` (4: the lights go off fast), `outFrames` (6), `matteSrc`.
- **Sound:** `snap.wav` 1 frame before (or the real snap if it is loud enough) and `powerdown.wav` on the snap.
- **Tip:** the matte keeps you fully lit with no halo. Without a matte it falls back to a soft vignette.
- **Filming:** snap close to your chest so the mic catches it.

## 5. Checklist
A dark card top left with three items that tick as you say them.

- **Trigger line:** "This is the checklist. Record a video, drop it into Claude and tell it to use my skill." The card pops on "checklist".
- **Props:** `items: { text, at }[]` (`at` = reel seconds, the item's first word + about 0.25 s), `title` ("TO USE THESE EFFECTS"), `x` (64), `y` (262), `width` (430).
- **Tip:** keep the card clear of your head. If `face_centres.py` puts your face high in frame, lower the card under the caption or shrink `width`. The label pill moves to the top right for this effect so the two never overlap.
- **Filming:** say the items in the same order as the card, with a small beat between them.

## 6. Freeze and Label
A white flash, the picture freezes in a real pause, a yellow label with an arrow points at you, then the line carries on.

- **Trigger:** the pause after a line, e.g. "And I'm saying this as someone who can't really edit." (pause) "This is the freeze and label."
- **How:** in `build_cut.py` give the piece that ends on the pause a hold: `[60.72, 62.97, 1.0]` holds 1.0 s. The picture holds that piece's last frame and the voice is silent, and `cut.ts` lists the hold. In `plan.ts` set `freezeAt` = hold start and `unfreezeAt` = hold end.
- **Props:** `text` (2 or 3 words), `freezeAt`, `unfreezeAt`, `target?` (arrow tip, defaults beside the face), `labelAt?`, `saturation` (0.55 while frozen).
- **Sound:** `freeze.wav` 0.7 s before `freezeAt`: it swells and hits on the freeze.
- **Tip:** cut the piece so its last frame has open eyes and a closed mouth (step a frame or two either way). The arrow tip goes beside the face, not on it.
- **Filming:** after the line, pause for half a second or more and hold still.

## 7. Before and After
A vertical wipe with a round handle between two versions of the same moment.

- **Trigger line:** "This is what I filmed. And this is what Claude sent back." Start the wipe on "sent back" or on "before and after".
- **Props:** `before` / `after` (a video path or any React node), `keys?: [frame, x][]` (slider path), `beforeLabel` ("before"), `afterLabel` ("after"), `pillY` (1400).
- **Tip:** with HLG footage `build_cut.py` writes `public/raw.mp4`, the flat straight-off-the-camera look, and `MyReel.tsx` uses it as "before". With SDR footage it shows a washed-out copy instead. For a location swap, render the "after" clip (for example an AI-generated background) to the same length and pass it as `after`.
- **Filming:** hold the same position through the line so the two sides line up.

## Extra: Palm Prop
A prop or mascot pops onto your open palm, follows it, and hops.

- **Trigger line:** any line where you hold your palm out, e.g. "And this little guy ...".
- **Props:** `image?` (a PNG with transparency, standing on its bottom edge; a drawn blob when empty), `size` (340), `aspect` (width / height of the image), `hopAt?` (reel seconds), `track` (from `src/reel/palm.ts`).
- **Tip:** run `tools/bin/hands` only over the line that needs it, then `tools/palm_track.py`. If the hand leaves the frame the prop holds the last position, so end the effect before you drop your hand.
- **Filming:** palm open and facing up, at chest height, fully in frame, for at least 2 seconds.

## Captions
`Captions` reads `words.ts`. Props: `maxWords` (3), `y` (1180), `fontSize` (66). Phrases break on punctuation, a pause over 0.35 s, or the word limit. Captions always draw above the effects, and the label pill above the captions.
