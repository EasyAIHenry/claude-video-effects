import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { CL, COL, DEFAULT_FACE, EASE, EffectBase, FONT, POP, src as resolve, Talk } from '../core';
import { Shell } from './simple';

/* Placeholder art so the pack works with no images. Pass real screenshots / thumbnails via `images`. */
const HEADLINES = [
  { kicker: 'TECH', head: 'Claude just edited a whole reel by itself', c: '#E8602C' },
  { kicker: 'NEWS', head: 'AI video tools are replacing editors?', c: '#2F6FEB' },
  { kicker: 'TREND', head: '7 effects every creator should steal', c: '#1F9D63' },
  { kicker: 'OPINION', head: 'Why your talking head feels flat', c: '#B23A8C' },
  { kicker: 'HOW-TO', head: 'Make captions that people read', c: '#C99A12' },
  { kicker: 'TOOLS', head: 'The free editor nobody talks about', c: '#5B5BD6' },
];

const HeadlineCard: React.FC<{ i: number; image?: string; w: number }> = ({ i, image, w }) => {
  if (image)
    return <Img src={resolve(image)} style={{ width: w, display: 'block', borderRadius: 18, boxShadow: '0 18px 40px rgba(0,0,0,0.35)' }} />;
  const h = HEADLINES[i % HEADLINES.length];
  return (
    <div style={{ width: w, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.35)', fontFamily: FONT }}>
      <div style={{ height: w * 0.42, background: `linear-gradient(135deg, ${h.c}, ${h.c}99)`, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 16, bottom: 14, width: w * 0.36, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.55)' }} />
        <div style={{ position: 'absolute', left: 16, bottom: 32, width: w * 0.22, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.35)' }} />
      </div>
      <div style={{ padding: '14px 16px 18px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.4, color: h.c }}>{h.kicker}</div>
        <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.12, letterSpacing: -0.4, color: COL.ink, marginTop: 6 }}>{h.head}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: '#ddd' }} />
          <div style={{ width: w * 0.35, height: 10, borderRadius: 5, background: '#e3e3e3', marginTop: 6 }} />
        </div>
      </div>
    </div>
  );
};

/* ---------------- #1 HeadlineWall ---------------- */
export type HeadlineWallProps = EffectBase & {
  /** Screenshot / headline card images. Placeholder cards are drawn when empty. */
  images?: string[];
  /** Transparent person matte of the same clip (webm with alpha, same timing). Puts cards truly behind the subject. */
  matteSrc?: string;
  /** Frames between each card flying out. */
  stagger?: number;
};

// Fan slots around and above the head (centres, rotation). Kept inside x 64..948 / y 250..1470.
const WALL = [
  { x: 210, y: 540, r: -8, s: 0.87 },
  { x: 815, y: 540, r: 8, s: 0.87 },
  { x: 420, y: 560, r: -3, s: 0.82 },
  { x: 660, y: 560, r: 3, s: 0.82 },
  { x: 205, y: 920, r: 6, s: 0.84 },
  { x: 815, y: 920, r: -6, s: 0.84 },
];

const WallBody: React.FC<HeadlineWallProps> = ({ src, trimBefore, duration, face = DEFAULT_FACE, images = [], matteSrc, stagger = 4 }) => {
  const f = useCurrentFrame();
  // Without a matte the cards sit in front of him, so drop the slots that would cover his head.
  const slots = matteSrc ? WALL : WALL.filter((sl) => Math.abs(sl.x - face.x) > 230 || sl.y > face.y + 120);
  const n = images.length ? Math.min(images.length, slots.length) : slots.length;
  const out = interpolate(f, [duration - 10, duration], [1, 0], { ...CL, easing: EASE });
  const cards = Array.from({ length: n }, (_, i) => {
    const slot = slots[i];
    const k = interpolate(f - i * stagger, [0, 16], [0, 1], { ...CL, easing: POP });
    const x = interpolate(k, [0, 1], [face.x, slot.x]);
    const y = interpolate(k, [0, 1], [face.y + 40, slot.y]);
    const fl = Math.sin((f + i * 23) / 22) * 8;
    const w = 300 * slot.s;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y + fl,
          opacity: Math.min(1, k * 3) * out,
          transform: `translate(-50%, -50%) rotate(${slot.r * k + Math.sin((f + i * 11) / 30) * 1.5}deg) scale(${0.35 + 0.65 * k})`,
        }}
      >
        <HeadlineCard i={i} image={images[i]} w={w} />
      </div>
    );
  });
  return (
    <>
      <Talk src={src} trimBefore={trimBefore} />
      {matteSrc ? (
        <>
          {cards}
          <Talk src={matteSrc} trimBefore={trimBefore} transparent />
        </>
      ) : (
        // No matte: the cards can only go in front, so keep them clear of the face (top band + outer edges).
        <AbsoluteFill>{cards}</AbsoluteFill>
      )}
    </>
  );
};
export const HeadlineWall: React.FC<HeadlineWallProps> = (p) => (
  <Shell p={p} name="HeadlineWall">
    <WallBody {...p} />
  </Shell>
);

/* ---------------- #2 Orbit ---------------- */
const THUMB_COLS = ['#E8602C', '#2F6FEB', '#1F9D63', '#B23A8C', '#C99A12', '#5B5BD6', '#D9443F', '#1A9AA8'];
const PhoneCard: React.FC<{ i: number; image?: string; w: number }> = ({ i, image, w }) => {
  const h = w * 16 / 9;
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.14, background: '#fff', padding: w * 0.045, boxShadow: '0 14px 30px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: w * 0.1,
          overflow: 'hidden',
          position: 'relative',
          background: image ? '#000' : `linear-gradient(160deg, ${THUMB_COLS[i % THUMB_COLS.length]}, #111 120%)`,
        }}
      >
        {image ? (
          <Img src={resolve(image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <div style={{ position: 'absolute', left: '50%', top: '38%', width: w * 0.36, height: w * 0.36, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', transform: 'translate(-50%,-50%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-38%,-50%)', width: 0, height: 0, borderTop: `${w * 0.07}px solid transparent`, borderBottom: `${w * 0.07}px solid transparent`, borderLeft: `${w * 0.11}px solid ${THUMB_COLS[i % THUMB_COLS.length]}` }} />
            <div style={{ position: 'absolute', left: '12%', bottom: '16%', width: '62%', height: w * 0.06, borderRadius: 6, background: 'rgba(255,255,255,0.8)' }} />
            <div style={{ position: 'absolute', left: '12%', bottom: '9%', width: '40%', height: w * 0.06, borderRadius: 6, background: 'rgba(255,255,255,0.5)' }} />
          </>
        )}
      </div>
    </div>
  );
};

export type OrbitProps = EffectBase & {
  /** Reel thumbnails (9:16). Placeholder phone cards are drawn when empty. */
  images?: string[];
  count?: number;
  /** Transparent person matte of the same clip (webm with alpha, same timing). Without it the behind pass is faked. */
  matteSrc?: string;
  /** Orbit radius in px (x), and vertical tilt of the ring in px. */
  radius?: number;
  tilt?: number;
  /** Turns per second. */
  speed?: number;
  /** Orbit centre height relative to the face (px, + = lower). */
  ringOffset?: number;
  /** Rough radius of the face in px. Front cards fade out while they overlap this circle, so nothing covers the face. */
  faceRadius?: number;
};

const OrbitBody: React.FC<OrbitProps> = ({
  src,
  trimBefore,
  duration,
  face = DEFAULT_FACE,
  images = [],
  count,
  matteSrc,
  radius = 380,
  tilt = 250,
  speed = 0.22,
  ringOffset = 60,
  faceRadius = 150,
}) => {
  const f = useCurrentFrame();
  const n = count ?? (images.length || 6);
  const grow = interpolate(f, [0, 14], [0, 1], { ...CL, easing: POP });
  const out = interpolate(f, [duration - 12, duration], [1, 0], { ...CL, easing: EASE });
  const cards = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (f / 30) * speed * Math.PI * 2;
    const z = Math.sin(a); // +1 = nearest the camera
    const x = face.x + Math.cos(a) * radius * grow;
    const y = face.y + ringOffset + z * tilt * grow;
    const depth = (z + 1) / 2; // 0 back .. 1 front
    const s = (0.62 + 0.38 * depth) * (0.4 + 0.6 * grow);
    return { i, x, y, z, s, depth, rotY: -Math.cos(a) * 32 };
  });
  const cardW = 140;
  const draw = (c: (typeof cards)[number], faked: boolean) => {
    const dx = Math.abs(c.x - face.x);
    const halfW = (cardW / 2) * c.s;
    const halfH = ((cardW * 16) / 9 / 2) * c.s;
    // Behind: with a matte the person covers them for real. Without one (faked) they dim and fade as they cross the head.
    // In front: fully visible when the card is clear of the face to the side, or its top edge is below the chin.
    const clearSide = interpolate(dx - halfW - faceRadius * 0.85, [0, 50], [0, 1], CL);
    const clearBelow = interpolate(c.y - halfH - (face.y + faceRadius), [-40, 10], [0, 1], CL);
    const vis =
      c.z < 0
        ? faked
          ? interpolate(dx, [radius * 0.15, radius * 0.6], [0, 0.55], CL)
          : 1
        : Math.max(clearSide, clearBelow);
    return (
      <div
        key={c.i}
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          zIndex: Math.round(c.depth * 100),
          opacity: out * Math.min(1, grow * 2) * vis,
          filter: faked && c.z < 0 ? 'blur(1.5px) brightness(0.85)' : c.z < 0 ? 'brightness(0.92)' : undefined,
          transform: `translate(-50%, -50%) perspective(900px) rotateY(${c.rotY}deg) scale(${faked && c.z < 0 ? c.s * 0.85 : c.s})`,
        }}
      >
        <PhoneCard i={c.i} image={images.length ? images[c.i % images.length] : undefined} w={cardW} />
      </div>
    );
  };
  const back = cards.filter((c) => c.z < 0);
  const front = cards.filter((c) => c.z >= 0);
  return (
    <>
      <Talk src={src} trimBefore={trimBefore} />
      {/* Each layer is its own stacking context, so the cards' depth order never lifts a back card above the matte. */}
      <AbsoluteFill style={{ isolation: 'isolate' }}>{back.map((c) => draw(c, !matteSrc))}</AbsoluteFill>
      {matteSrc ? <Talk src={matteSrc} trimBefore={trimBefore} transparent /> : null}
      <AbsoluteFill style={{ isolation: 'isolate' }}>{front.map((c) => draw(c, false))}</AbsoluteFill>
    </>
  );
};
export const Orbit: React.FC<OrbitProps> = (p) => (
  <Shell p={p} name="Orbit">
    <OrbitBody {...p} />
  </Shell>
);

/* ---------------- #7 BeforeAfter ---------------- */
export type BeforeAfterProps = Omit<EffectBase, 'src'> & {
  /** Left side ("before"): a video src or any React node. */
  before: string | React.ReactNode;
  /** Right side ("after"): a video src or any React node. */
  after: string | React.ReactNode;
  /** Slider position over time: [frame, x] keyframes (x in px). Default sweeps right -> centre. */
  keys?: [number, number][];
  beforeLabel?: string;
  afterLabel?: string;
  /** Height of the pills / handle. */
  pillY?: number;
};
const Side: React.FC<{ v: string | React.ReactNode; trimBefore?: number }> = ({ v, trimBefore }) =>
  typeof v === 'string' ? <Talk src={v} trimBefore={trimBefore} /> : <AbsoluteFill>{v}</AbsoluteFill>;

const pill = (bg: string, fg: string): React.CSSProperties => ({
  position: 'absolute',
  transform: 'translateY(-50%)',
  background: bg,
  color: fg,
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 30,
  padding: '10px 24px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
});

const BABody: React.FC<BeforeAfterProps> = ({ before, after, trimBefore, duration, keys, beforeLabel = 'before', afterLabel = 'after', pillY = 1400 }) => {
  const f = useCurrentFrame();
  const k = keys ?? [
    [0, 1080],
    [18, 1080],
    [42, 540],
    [Math.max(43, duration - 24), 540],
    [Math.max(44, duration - 4), 0],
  ];
  const x = interpolate(f, k.map((p) => p[0]), k.map((p) => p[1]), { ...CL, easing: EASE });
  const bOp = interpolate(x, [120, 260], [0, 1], CL);
  const aOp = interpolate(x, [820, 960], [1, 0], CL);
  return (
    <>
      <Side v={before} trimBefore={trimBefore} />
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${x}px)` }}>
        <Side v={after} trimBefore={trimBefore} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: x - 2, top: 0, width: 4, height: 1920, background: '#fff', boxShadow: '0 0 12px rgba(0,0,0,0.35)' }} />
      <div
        style={{
          position: 'absolute',
          left: x,
          top: pillY,
          transform: 'translate(-50%,-50%)',
          width: 64,
          height: 64,
          borderRadius: 32,
          background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path d="M9 6 L3 12 L9 18 M15 6 L21 12 L15 18" fill="none" stroke={COL.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ ...pill('rgba(20,22,25,0.72)', '#fff'), right: 1080 - x + 52, top: pillY, opacity: bOp }}>{beforeLabel}</div>
      <div style={{ ...pill(COL.yellow, COL.ink), left: x + 52, top: pillY, opacity: aOp }}>{afterLabel}</div>
    </>
  );
};
export const BeforeAfter: React.FC<BeforeAfterProps> = (p) => (
  <Shell p={{ ...p, src: '' }} name="BeforeAfter">
    <BABody {...p} />
  </Shell>
);
