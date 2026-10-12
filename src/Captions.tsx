import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CL, COL, FONT, POP, SAFE } from './core';

/** One word with times in seconds on the source clip. */
export type Word = { text: string; start: number; end: number };

export type CaptionsProps = {
  words: Word[];
  /** Seconds of source time at local frame 0 (set to trimBefore / fps when the clip is trimmed). */
  offsetSec?: number;
  /** Max words on screen at once. */
  maxWords?: number;
  /** Vertical centre of the caption line (chest area). */
  y?: number;
  fontSize?: number;
};

/** Split into phrases: break on punctuation, a pause > 0.35 s, or maxWords. */
const phrases = (words: Word[], maxWords: number) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const gap = next ? next.start - w.end : 99;
    if (cur.length >= maxWords || /[.,!?;:]$/.test(w.text) || gap > 0.35) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
};

/** Word-by-word captions: bold white sans on the chest, active word yellow. */
export const Captions: React.FC<CaptionsProps> = ({ words, offsetSec = 0, maxWords = 3, y = 1180, fontSize = 66 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = offsetSec + frame / fps;
  const groups = React.useMemo(() => phrases(words, maxWords), [words, maxWords]);
  const g = groups.find((p, i) => {
    const nextStart = groups[i + 1]?.[0].start ?? Infinity;
    return t >= p[0].start && t < Math.min(nextStart, p[p.length - 1].end + 0.6);
  });
  if (!g) return null;
  const since = (t - g[0].start) * fps;
  const pop = interpolate(since, [0, 6], [0.86, 1], { ...CL, easing: POP });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 1000 }}>
      <div
        style={{
          position: 'absolute',
          left: SAFE.l,
          width: SAFE.r - SAFE.l,
          top: y,
          transform: `translateY(-50%) scale(${pop})`,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize,
          letterSpacing: -1.5,
          lineHeight: 1.1,
          color: COL.white,
          textShadow: '0 3px 14px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {g.map((w, i) => {
          const active = t >= w.start && (t < w.end || i === g.length - 1 || t < g[i + 1].start);
          const said = t >= w.start;
          return (
            <span key={i} style={{ color: active ? COL.yellow : COL.white, opacity: said ? 1 : 0.28 }}>
              {w.text.replace(/[.,!?;:]+$/, '').toLowerCase()}
              {i < g.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
