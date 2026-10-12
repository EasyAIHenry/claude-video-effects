// Where each effect goes. Claude writes this from the word timings: each effect starts on the word that triggers it.
// All times are seconds on the reel timeline (the same clock as words.ts and cut.ts).
import type { Pt } from '../core';

export type Placement = {
  /** Which effect. */
  fx: 'HeadlineWall' | 'Orbit' | 'DigitalZoom' | 'Spotlight' | 'Checklist' | 'FreezeAndLabel' | 'BeforeAfter' | 'PalmProp';
  /** Start (seconds): the trigger word's start time, minus about 0.07 s so it lands on the word. */
  at: number;
  /** End (seconds): usually the end of the line, or the start of the next line for a hard cut. */
  to: number;
  /** Optional top pill, e.g. "#2 Orbit". */
  label?: string;
  /** Face centre in px for this line (from the matte tool's faces.jsonl). Defaults to 540,640. */
  face?: Pt;
  /** Effect props (see the effect's type in src/effects). Times inside are seconds on the reel timeline:
   *  Checklist items[].at, FreezeAndLabel freezeAt, PalmProp hopAt. */
  props?: Record<string, unknown>;
};

export const PLAN: Placement[] = [
  { fx: 'HeadlineWall', at: 0.6, to: 4, label: '#1 Headline Wall' },
  { fx: 'Orbit', at: 4.5, to: 8, label: '#2 Orbit' },
  { fx: 'DigitalZoom', at: 8.7, to: 12, label: '#3 Digital Zoom', props: { scale: 1.6 } },
  { fx: 'Spotlight', at: 12.4, to: 16, label: '#4 Spotlight' },
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
  { fx: 'FreezeAndLabel', at: 20, to: 24, label: '#6 Freeze and Label', props: { freezeAt: 20.6, text: 'me, mid-word' } },
  { fx: 'BeforeAfter', at: 26.2, to: 30, label: '#7 Before and After' },
  { fx: 'PalmProp', at: 24.2, to: 26.1, props: { hopAt: 25.2 } },
];
