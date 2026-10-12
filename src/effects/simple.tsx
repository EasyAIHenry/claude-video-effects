import React from 'react';
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { CL, COL, DEFAULT_FACE, EASE, EffectBase, FONT, LabelPill, POP, Pt, Talk } from '../core';

/** Wraps an effect body in a Sequence and adds the label pill. */
export const Shell: React.FC<{ p: EffectBase; children: React.ReactNode; name: string; labelAlign?: 'center' | 'right' }> = ({ p, children, name, labelAlign }) => (
  <Sequence from={p.start ?? 0} durationInFrames={p.duration} name={name}>
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ isolation: 'isolate', zIndex: 0 }}>{children}</AbsoluteFill>
      {p.label ? <LabelPill text={p.label} duration={p.duration} align={labelAlign} /> : null}
    </AbsoluteFill>
  </Sequence>
);

/* ---------------- #3 DigitalZoom ---------------- */
export type DigitalZoomProps = EffectBase & {
  /** Peak scale (1.0 = no zoom). */
  scale?: number;
  /** Frames to punch in / to come back out. */
  inFrames?: number;
  outFrames?: number;
  /** Camera viewfinder brackets and a blinking "REC 1.6x" tag around the face while zoomed. */
  brackets?: boolean;
};

const zoomK = (f: number, duration: number, inFrames: number, outFrames: number) =>
  Math.min(
    interpolate(f, [0, inFrames], [0, 1], { ...CL, easing: EASE }),
    interpolate(f, [duration - outFrames, duration], [1, 0], { ...CL, easing: EASE }),
  );

const ZoomBody: React.FC<DigitalZoomProps> = ({ src, trimBefore, duration, face = DEFAULT_FACE, scale = 1.55, inFrames = 12, outFrames = 14, brackets = true }) => {
  const f = useCurrentFrame();
  const k = zoomK(f, duration, inFrames, outFrames);
  const s = 1 + (scale - 1) * k;
  // Scale around the face, and slide the face toward frame centre-upper so it lands in a clean spot.
  const tx = (540 - face.x) * k * 0.6;
  const ty = (700 - face.y) * k * 0.6;
  // Brackets frame the zoomed face: 580 x 660 box centred on where the face ends up.
  const cx = face.x + tx;
  const cy = face.y + ty + 60;
  const g = (1 - k) * 60;
  const L = 70;
  const box = [cx - 290, cy - 330, cx + 290, cy + 330];
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <div
      key={`${sx}${sy}`}
      style={{
        position: 'absolute',
        left: x + sx * g - (sx < 0 ? 0 : L),
        top: y + sy * g - (sy < 0 ? 0 : L),
        width: L,
        height: L,
        borderLeft: sx < 0 ? '7px solid #fff' : undefined,
        borderRight: sx > 0 ? '7px solid #fff' : undefined,
        borderTop: sy < 0 ? '7px solid #fff' : undefined,
        borderBottom: sy > 0 ? '7px solid #fff' : undefined,
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
      }}
    />
  );
  const blink = Math.floor(f / 12) % 2 === 0;
  return (
    <>
      <Talk
        src={src}
        trimBefore={trimBefore}
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: `${face.x}px ${face.y}px` }}
      />
      {brackets ? (
        <AbsoluteFill style={{ opacity: k }}>
          {corner(box[0], box[1], -1, -1)}
          {corner(box[2], box[1], 1, -1)}
          {corner(box[0], box[3], -1, 1)}
          {corner(box[2], box[3], 1, 1)}
          <div
            style={{
              position: 'absolute',
              left: box[0],
              top: box[1] - 64,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 32,
              color: COL.white,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            <span style={{ width: 20, height: 20, borderRadius: 10, background: blink ? '#FF3B30' : 'rgba(255,59,48,0.35)' }} />
            REC {scale.toFixed(1)}x
          </div>
        </AbsoluteFill>
      ) : null}
    </>
  );
};
export const DigitalZoom: React.FC<DigitalZoomProps> = (p) => (
  <Shell p={p} name="DigitalZoom">
    <ZoomBody {...p} />
  </Shell>
);

/* ---------------- #4 Spotlight ---------------- */
export type SpotlightProps = EffectBase & {
  /** Darkness outside the spotlight, 0..1. */
  darkness?: number;
  /** Radius of the lit area in px (fully lit inside, falls off to dark at radius * 2.1). */
  radius?: number;
  /** Optional spot centre; defaults to slightly below the face so the chest is lit too. */
  centre?: Pt;
  /** Person matte (webm with alpha, same timing). With it the room darkens and the person stays fully lit. */
  matteSrc?: string;
  /** Frames for the lights to go off. Short, because it lands on a finger snap. */
  inFrames?: number;
  /** Frames for the lights to come back at the end (the effect holds dark to the end of the line). */
  outFrames?: number;
};
/**
 * Start it on the finger snap (tools/find_speech.py --snap finds it), not on a word, and run it to the end of the line.
 * Pair it with a snap SFX 1 frame before the start (public/sfx/snap.wav from tools/make_sfx.py).
 */
const SpotBody: React.FC<SpotlightProps> = ({ src, trimBefore, duration, face = DEFAULT_FACE, darkness = 0.84, radius = 300, centre, matteSrc, inFrames = 4, outFrames = 6 }) => {
  const f = useCurrentFrame();
  const k = Math.min(
    interpolate(f, [0, inFrames], [0, 1], { ...CL, easing: EASE }),
    interpolate(f, [duration - outFrames, duration], [1, 0], CL),
  );
  const c = centre ?? { x: face.x, y: face.y + 160 };
  return (
    <>
      <Talk src={src} trimBefore={trimBefore} />
      <AbsoluteFill
        style={{
          opacity: k,
          // long, smooth falloff (many stops) so there is no visible edge or ring
          background: `radial-gradient(ellipse ${radius * 1.5}px ${radius * 2.2}px at ${c.x}px ${c.y}px, ${[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]
            .map((t) => `rgba(0,0,0,${(darkness * (matteSrc ? 0.42 + 0.58 * t : 0.9 * t * t * (3 - 2 * t))).toFixed(3)}) ${Math.round(t * 100)}%`)
            .join(', ')})`,
        }}
      />
      {matteSrc ? (
        <>
          <Talk src={matteSrc} trimBefore={trimBefore} transparent style={{ opacity: k }} />
          {/* a soft vignette over everything, so the lit person still sits in the dark room */}
          <AbsoluteFill style={{ opacity: k, background: `radial-gradient(40% 30% at ${(c.x / 10.8).toFixed(1)}% ${(c.y / 19.2).toFixed(1)}%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)` }} />
        </>
      ) : null}
    </>
  );
};
export const Spotlight: React.FC<SpotlightProps> = (p) => (
  <Shell p={p} name="Spotlight">
    <SpotBody {...p} />
  </Shell>
);

/* ---------------- #5 Checklist ---------------- */
export type ChecklistItem = { text: string; /** local frame the item ticks */ at: number };
export type ChecklistProps = EffectBase & {
  title?: string;
  items: ChecklistItem[];
  /** Top-left corner of the card. Keep the card clear of the face box (it sits above and left of the head by default). */
  x?: number;
  y?: number;
  width?: number;
};
const Tick: React.FC<{ k: number }> = ({ k }) => (
  <div
    style={{
      width: 38,
      height: 38,
      borderRadius: 19,
      flex: '0 0 38px',
      border: `3px solid ${k > 0 ? COL.yellow : 'rgba(255,255,255,0.28)'}`,
      background: k > 0 ? COL.yellow : 'transparent',
      transform: `scale(${k > 0 ? interpolate(k, [0, 1], [0.6, 1]) : 1})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path
        d="M4 12.5 L10 18 L20 6"
        fill="none"
        stroke={COL.ink}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={30}
        strokeDashoffset={30 * (1 - k)}
      />
    </svg>
  </div>
);
const ChecklistBody: React.FC<ChecklistProps> = ({ src, trimBefore, duration, title = 'TO USE THESE EFFECTS', items, x = 64, y = 262, width = 430 }) => {
  const f = useCurrentFrame();
  const inK = interpolate(f, [0, 12], [0, 1], { ...CL, easing: POP });
  const outK = interpolate(f, [duration - 10, duration], [1, 0], { ...CL, easing: EASE });
  const done = items.filter((it) => f >= it.at).length;
  return (
    <>
      <Talk src={src} trimBefore={trimBefore} />
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          opacity: Math.min(interpolate(f, [0, 6], [0, 1], CL), outK),
          transform: `translateY(${(1 - inK) * -30}px) scale(${0.92 + 0.08 * inK})`,
          transformOrigin: 'top left',
          background: 'rgba(20,22,25,0.92)',
          border: `1.5px solid ${COL.cardLine}`,
          borderRadius: 26,
          padding: '20px 24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          fontFamily: FONT,
          color: COL.white,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 1.4, color: COL.dim }}>{title}</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: COL.dim, background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: 999 }}>
            {done} of {items.length}
          </div>
        </div>
        {items.map((it, i) => {
          const k = interpolate(f, [it.at, it.at + 8], [0, 1], { ...CL, easing: POP });
          const on = f >= it.at;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderTop: i ? `1.5px solid ${COL.cardLine}` : 'none' }}>
              <Tick k={on ? Math.min(1, k) : 0} />
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.15, color: on ? COL.white : 'rgba(255,255,255,0.38)' }}>{it.text}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};
export const Checklist: React.FC<ChecklistProps> = (p) => (
  <Shell p={p} name="Checklist" labelAlign="right">
    <ChecklistBody {...p} />
  </Shell>
);

/* ---------------- #6 FreezeAndLabel ---------------- */
export type FreezeAndLabelProps = EffectBase & {
  /** Label text next to the arrow. */
  text: string;
  /** Local frame the picture freezes on. Best: the first frame of a hold gap the cut builder inserted after the line. */
  freezeAt?: number;
  /** Local frame the picture moves again (the end of the hold). Default: stays frozen to the end of the effect. */
  unfreezeAt?: number;
  /** Point the arrow tip touches. Defaults to just right of the face. */
  target?: Pt;
  /** Where the label box sits (its centre). */
  labelAt?: Pt;
  /** Saturation while frozen (1 = untouched). */
  saturation?: number;
};
const FreezeBody: React.FC<FreezeAndLabelProps> = ({ src, trimBefore = 0, duration, face = DEFAULT_FACE, text, freezeAt = 0, unfreezeAt, target, labelAt, saturation = 0.55 }) => {
  const f = useCurrentFrame();
  const frozen = f >= freezeAt && (unfreezeAt === undefined || f < unfreezeAt);
  const k = Math.min(
    interpolate(f, [freezeAt, freezeAt + 8], [0, 1], { ...CL, easing: EASE }),
    unfreezeAt === undefined ? 1 : interpolate(f, [unfreezeAt, unfreezeAt + 4], [1, 0], CL),
  );
  const out = interpolate(f, [duration - 8, duration], [1, 0], CL);
  const flash = interpolate(f, [freezeAt, freezeAt + 2, freezeAt + 7], [0, 0.55, 0], CL);
  const tip = target ?? { x: face.x + 250, y: face.y + 120 };
  const lab = labelAt ?? { x: Math.min(tip.x + 40, 830), y: Math.max(tip.y - 330, 420) };
  // Arrow: from under the label, curving down to the tip.
  const sx = lab.x + 20;
  const sy = lab.y + 50;
  const path = `M ${sx} ${sy} C ${sx + 70} ${sy + 110}, ${tip.x + 110} ${tip.y - 30}, ${tip.x + 18} ${tip.y - 6}`;
  const draw = interpolate(f, [freezeAt + 4, freezeAt + 16], [0, 1], { ...CL, easing: EASE });
  const labK = interpolate(f, [freezeAt + 2, freezeAt + 12], [0, 1], { ...CL, easing: POP });
  return (
    <>
      <AbsoluteFill style={{ filter: `saturate(${1 - (1 - saturation) * k * out})` }}>
        {frozen ? (
          <Freeze frame={freezeAt}>
            <Talk src={src} trimBefore={trimBefore} />
          </Freeze>
        ) : (
          <Talk src={src} trimBefore={trimBefore} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <AbsoluteFill style={{ opacity: out }}>
        <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill={COL.white} />
            </marker>
          </defs>
          <path
            d={path}
            fill="none"
            stroke={COL.white}
            strokeWidth={7}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            markerEnd={draw > 0.95 ? 'url(#ah)' : undefined}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: lab.x,
            top: lab.y,
            transform: `translate(-50%, -50%) rotate(-3deg) scale(${labK})`,
            background: COL.yellow,
            color: COL.ink,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: -1,
            padding: '14px 26px',
            borderRadius: 18,
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </>
  );
};
export const FreezeAndLabel: React.FC<FreezeAndLabelProps> = (p) => (
  <Shell p={p} name="FreezeAndLabel">
    <FreezeBody {...p} />
  </Shell>
);
