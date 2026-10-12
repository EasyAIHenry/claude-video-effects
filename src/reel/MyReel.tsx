import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { Captions } from '../Captions';
import { FONT, Talk } from '../core';
import { BeforeAfter, HeadlineWall, Orbit } from '../effects/cards';
import { PalmProp } from '../effects/PalmProp';
import { Checklist, DigitalZoom, FreezeAndLabel, Spotlight } from '../effects/simple';
import { CUT } from './cut';
import { PALM } from './palm';
import { FRAME, Placement, PLAN, SFX } from './plan';
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
      return (
        <FreezeAndLabel
          {...base}
          {...props}
          freezeAt={local(props.freezeAt ?? p.at)}
          unfreezeAt={props.unfreezeAt !== undefined ? local(props.unfreezeAt) : undefined}
          text={props.text ?? ''}
        />
      );
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

/** Caption height at time t: low (below the ring) on Orbit lines, or whatever a placement sets, else the chest. */
const captionY = (t: number) => {
  const p = PLAN.find((q) => t >= q.at - 0.3 && t < q.to && (q.captionY !== undefined || q.fx === 'Orbit'));
  return p ? p.captionY ?? 1560 : 1180;
};

/** The picture: the cut, the effects from plan.ts and the captions. */
export const ReelPicture: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Talk src={CUT.video} />
      {PLAN.map((p, i) => (
        <Effect key={i} p={p} fps={fps} />
      ))}
      <Captions words={WORDS} y={captionY} />
    </AbsoluteFill>
  );
};

const DB = (db: number) => Math.pow(10, db / 20);
/** The sound: the voice plus the SFX list from plan.ts. */
export const ReelSound: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {CUT.voice ? <Audio src={staticFile(CUT.voice)} /> : null}
      {SFX.map(([t, file, db], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(t * fps))} durationInFrames={Math.round(4 * fps)} layout="none">
          <Audio src={staticFile(`sfx/${file}`)} volume={DB(db)} />
        </Sequence>
      ))}
    </>
  );
};

/** Your reel, full screen. */
export const MyReel: React.FC = () => (
  <AbsoluteFill>
    <ReelPicture />
    <ReelSound />
  </AbsoluteFill>
);

/** The same reel in a big card (0.65 scale) on a dark frame, with your name top left and a "Comment KEYWORD" line under it. */
export const CARD = { x: 189, y: 270, w: 702, h: 1248 };
export const MyReelFramed: React.FC = () => {
  const k = CARD.w / 1080;
  return (
    <AbsoluteFill style={{ background: '#140c09', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 6px, rgba(0,0,0,0) 6px 13px)' }} />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(70% 45% at 15% 10%, rgba(255,90,36,0.28) 0%, rgba(0,0,0,0) 70%), radial-gradient(80% 50% at 90% 95%, rgba(255,90,36,0.18) 0%, rgba(0,0,0,0) 70%)',
        }}
      />
      <div style={{ position: 'absolute', left: 64, top: 160, fontFamily: FONT, fontWeight: 800, fontSize: 34, lineHeight: 1.05, color: '#fff' }}>{FRAME.name}</div>
      <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, transform: 'perspective(1800px) rotateY(-3deg)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', boxShadow: '0 34px 70px rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}>
          <div style={{ width: 1080, height: 1920, transform: `scale(${k})`, transformOrigin: '0 0' }}>
            <ReelPicture />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 64, width: 884, top: 1534, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: 'rgba(255,255,255,0.85)' }}>{FRAME.ctaSmall}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%' }}>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.6)' }} />
          <div style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 800, fontSize: 52, color: '#fff', whiteSpace: 'nowrap' }}>
            “Comment <span style={{ color: '#FF5A24' }}>{FRAME.keyword}</span>”
          </div>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.6)' }} />
        </div>
      </div>
      <ReelSound />
    </AbsoluteFill>
  );
};
