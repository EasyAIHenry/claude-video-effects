// The cut: written by tools/build_cut.py. Until you run it, the reel uses the stand-in person.
// All times are seconds on the reel timeline.
export type CutLine = { id: string; start: number; end: number; text: string; fx: string; /** [start, end] of each hold (frozen picture, silent voice) */ holds?: [number, number][] };
export type Cut = {
  /** The cut picture in public/ (1080x1920, 30 fps), or 'stand-in'. */
  video: string;
  /** Person matte of the same cut (webm with alpha, from tools/make_matte.sh), or 'stand-in', or undefined. */
  matte?: string;
  /** Ungraded / raw version of the same cut, used as the "before" side of Before and After. */
  raw?: string;
  /** The cleaned voice in public/, or undefined. */
  voice?: string;
  /** Length of the reel in seconds. */
  total: number;
  lines: CutLine[];
};

export const CUT: Cut = {
  video: 'stand-in',
  matte: 'stand-in',
  raw: undefined,
  voice: undefined,
  total: 30,
  lines: [
    { id: 'L1', start: 0, end: 4, text: 'Here are seven effects Claude made for me.', fx: 'HeadlineWall' },
    { id: 'L2', start: 4, end: 8, text: 'It can spin my reels around my head. That is the orbit.', fx: 'Orbit' },
    { id: 'L3', start: 8, end: 12, text: 'This is a digital zoom.', fx: 'DigitalZoom' },
    { id: 'L4', start: 12, end: 16, text: 'Kill the lights. That is the spotlight.', fx: 'Spotlight' },
    { id: 'L5', start: 16, end: 20, text: 'Record a video, drop it into Claude, use the skill.', fx: 'Checklist' },
    { id: 'L6', start: 20, end: 24, text: 'Wait. This is the freeze and label.', fx: 'FreezeAndLabel' },
    { id: 'L7', start: 24, end: 30, text: 'This is what I filmed. This is what Claude sent back.', fx: 'BeforeAfter' },
  ],
};
