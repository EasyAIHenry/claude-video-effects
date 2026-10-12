import React from 'react';
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from 'remotion';
import { Captions } from '../Captions';
import { Talk } from '../core';
import { BeforeAfter, HeadlineWall, Orbit } from '../effects/cards';
import { PalmProp } from '../effects/PalmProp';
import { Checklist, DigitalZoom, FreezeAndLabel, Spotlight } from '../effects/simple';
import { CUT } from './cut';
import { PALM } from './palm';
import { Placement, PLAN } from './plan';
import { WORDS } from './words';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Turns one plan entry into an effect on the reel. Every effect plays the same cut, offset to its start, so it stays in sync. */
const Effect: React.FC<{ p: Placement; fps: number }> = ({ p, fps }) => {
  const start = Math.round(p.at * fps);
  const duration = Math.max(1, Math.round(p.to * fps) - start);
  const local = (sec: number) => Math.round(sec * fps) - start;
  const props: any = p.props ?? {};
  const base = { src: CUT.video, start, duration, trimBefore: start, face: p.face, label: p.label };
  const matteSrc = CUT.matte;
  switch (p.fx) {
    case 'HeadlineWall':
      return <HeadlineWall {...base} matteSrc={matteSrc} {...props} />;
    case 'Orbit':
      return <Orbit {...base} matteSrc={matteSrc} {...props} />;
    case 'DigitalZoom':
      return <DigitalZoom {...base} {...props} />;
    case 'Spotlight':
      return <Spotlight {...base} matteSrc={matteSrc} {...props} />;
    case 'Checklist':
      return <Checklist {...base} {...props} items={(props.items ?? []).map((it: any) => ({ text: it.text, at: local(it.at) }))} />;
    case 'FreezeAndLabel':
      return <FreezeAndLabel {...base} {...props} freezeAt={local(props.freezeAt ?? p.at)} text={props.text ?? ''} />;
    case 'BeforeAfter':
      // "before" = the raw cut if build_cut.py made one, otherwise the same cut shown flat (washed out, like a log/HLG file).
      return (
        <BeforeAfter
          start={start}
          duration={duration}
          trimBefore={start}
          label={p.label}
          before={CUT.raw ?? <Talk src={CUT.video} trimBefore={start} style={{ filter: 'saturate(0.35) contrast(0.82) brightness(1.06)' }} />}
          after={CUT.video}
          {...props}
        />
      );
    case 'PalmProp':
      return <PalmProp start={start} duration={duration} track={PALM} {...props} hopAt={props.hopAt !== undefined ? local(props.hopAt) : undefined} />;
    default:
      return null;
  }
};

/** Your reel: the cut, the effects from plan.ts, captions from words.ts and the voice. */
export const MyReel: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Talk src={CUT.video} />
      {PLAN.map((p, i) => (
        <Effect key={i} p={p} fps={fps} />
      ))}
      <Captions words={WORDS} />
      {CUT.voice ? <Audio src={staticFile(CUT.voice)} /> : null}
    </AbsoluteFill>
  );
};
