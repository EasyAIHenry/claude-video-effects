// Word timings for the captions: written by tools/build_cut.py (whisper.cpp, snapped to the waveform).
// Seconds on the reel timeline. The demo words below are spaced evenly so the stand-in reel has captions.
import type { Word } from '../Captions';
import { CUT } from './cut';

const spread = (text: string, start: number, end: number): Word[] => {
  const ws = text.split(/\s+/).filter(Boolean);
  const step = (end - start - 0.4) / ws.length;
  return ws.map((w, i) => ({ text: w, start: start + 0.2 + i * step, end: start + 0.2 + (i + 0.85) * step }));
};

export const WORDS: Word[] = CUT.lines.flatMap((l) => spread(l.text, l.start, l.end));
