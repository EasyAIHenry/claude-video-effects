// Where each effect goes. Claude writes this from the word timings: each effect starts on the word (or sound) that triggers it.
// All times are seconds on the reel timeline (the same clock as words.ts and cut.ts).
import type { Pt } from '../core';

export type Placement = {
  /** Which effect. */
  fx: 'HeadlineWall' | 'Orbit' | 'DigitalZoom' | 'Spotlight' | 'Checklist' | 'FreezeAndLabel' | 'BeforeAfter' | 'PalmProp';
  /** Start (seconds): the trigger word's start minus about 0.07 s. Spotlight: the finger snap (find_speech.py --snap). */
  at: number;
  /** End (seconds): usually the end of the line, or the start of the next line for a hard cut. */
  to: number;
  /** Optional top pill, e.g. "#2 Orbit". */
  label?: string;
  /** Face centre in px for this line (from tools/face_centres.py). Defaults to 540,640. */
  face?: Pt;
  /** Caption height while this effect runs. Orbit lines default to 1560 (below the ring). */
  captionY?: number;
  /** Effect props (see the effect's type in src/effects). Times inside are seconds on the reel timeline:
   *  Checklist items[].at, FreezeAndLabel freezeAt / unfreezeAt, PalmProp hopAt. */
  props?: Record<string, unknown>;
};

export const PLAN: Placement[] = [
  { fx: 'HeadlineWall', at: 0.6, to: 4, label: '#1 Headline Wall' },
  // Orbit on the stand-in: its face sits higher in frame than a real one, so the ring is nudged down.
  { fx: 'Orbit', at: 4.5, to: 8, label: '#2 Orbit', props: { ringOffset: 110, tilt: 380 } },
  { fx: 'DigitalZoom', at: 8.7, to: 12, label: '#3 Digital Zoom', props: { scale: 1.6 } },
  // Spotlight starts on the snap and holds to the end of the line.
  { fx: 'Spotlight', at: 13.2, to: 16, label: '#4 Spotlight' },
  {
    fx: 'Checklist',
    at: 16.2,
    to: 20,
    label: '#5 Checklist',
    props: {
      items: [
        { text: 'Record a video', at: 16.8 },
        { text: 'Drop it into Claude', at: 17.9 },
        { text: 'Use the skill', at: 19.0 },
      ],
    },
  },
  // Freeze holds in the pause after the line (a hold gap from build_cut.py), then the picture moves again.
  { fx: 'FreezeAndLabel', at: 20, to: 24, label: '#6 Freeze and Label', props: { freezeAt: 21.6, unfreezeAt: 22.6, text: 'me, mid-word' } },
  { fx: 'BeforeAfter', at: 26.2, to: 30, label: '#7 Before and After' },
  { fx: 'PalmProp', at: 24.2, to: 26.1, props: { hopAt: 25.2 } },
];

/** Sound effects: [seconds, file in public/sfx/, gain in dB]. tools/make_sfx.py makes the files. */
export type Sfx = [number, string, number];
export const SFX: Sfx[] = [
  // a 2.5 s riser under the hook line that lands on the cut to line 2, then a thud on the cut
  [4.0 - 2.5, 'riser.wav', -11],
  [4.0, 'thud.wav', -12],
  [4.5, 'whoosh.wav', -16],
  [8.7, 'click.wav', -12],
  // snap 1 frame before the lights go off, then a low power-down
  [13.2 - 0.03, 'snap.wav', -6],
  [13.2, 'powerdown.wav', -13],
  [16.8, 'tick.wav', -14],
  [17.9, 'tick.wav', -14],
  [19.0, 'tick.wav', -14],
  // freeze.wav swells for 0.7 s and hits on the freeze
  [21.6 - 0.7, 'freeze.wav', -9],
  [24.2, 'pop.wav', -14],
  [26.2, 'whoosh.wav', -14],
];

/** Settings for the MyReelFramed composition: the reel in a card on a dark frame, with your name and a comment line. */
export const FRAME = {
  name: 'Your Name',
  ctaSmall: 'For all 7 effects + the guide',
  keyword: 'EFFECTS',
};
