import React from 'react';
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const inter = loadFont('normal', { weights: ['600', '700', '800'], subsets: ['latin'] });
export const FONT = inter.fontFamily;

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/** Text safe zone for every effect: x 64..948, y 250..1470 (clear of the app UI on Reels / TikTok / Shorts). */
export const SAFE = { l: 64, r: 948, t: 250, b: 1470 };

export const COL = {
  white: '#FFFFFF',
  ink: '#111111',
  yellow: '#F4D35E', // active caption word, checklist ticks, labels
  card: '#16181B',
  cardLine: 'rgba(255,255,255,0.10)',
  dim: 'rgba(255,255,255,0.45)',
};

export const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const EASE = Easing.bezier(0.33, 0, 0.2, 1);
export const POP = Easing.bezier(0.34, 1.45, 0.64, 1);

/** 0 -> 1 -> 0 envelope over a clip of `dur` frames, with ease in/out ramps. */
export const envelope = (frame: number, dur: number, inF = 10, outF = 10) =>
  Math.min(
    interpolate(frame, [0, inF], [0, 1], { ...CL, easing: EASE }),
    interpolate(frame, [dur - outF, dur], [1, 0], { ...CL, easing: EASE }),
  );

/** A point in the 1080x1920 frame, e.g. the subject's face centre. */
export type Pt = { x: number; y: number };
export const DEFAULT_FACE: Pt = { x: 540, y: 640 };

/**
 * Use this as `src` (or `matteSrc`) when you have no footage yet. It draws a simple stand-in person
 * so every effect can be previewed in the Studio straight after `npm install`.
 */
export const STAND_IN = 'stand-in';

/** Resolve a src: absolute URLs / file paths pass through, anything else goes through staticFile(). */
export const src = (s: string) => (/^(https?:|file:|data:|\/)/.test(s) ? s : staticFile(s));

/** Props every effect shares. Effects are placed with <Sequence from={start} durationInFrames={duration}>. */
export type EffectBase = {
  /** Talking-head video (public/ path or URL), 1080x1920. STAND_IN draws a placeholder person. */
  src: string;
  /** Frame on the parent timeline where the effect starts. */
  start?: number;
  /** Length of the effect in frames. */
  duration: number;
  /** Source offset in frames (which part of the clip plays). Set it to `start` when src is the whole cut. */
  trimBefore?: number;
  /** Subject face centre in frame px. */
  face?: Pt;
  /** Optional label pill text, e.g. "#3 Digital Zoom". */
  label?: string;
};

/** Placeholder person: a room plus a head-and-shoulders figure that moves a little. `cutout` draws only the person. */
const StandIn: React.FC<{ cutout?: boolean; trimBefore?: number; style?: React.CSSProperties }> = ({ cutout, trimBefore = 0, style }) => {
  const f = useCurrentFrame() + trimBefore;
  const { x, y } = DEFAULT_FACE;
  const bob = Math.sin(f / 9) * 5;
  const sway = Math.sin(f / 23) * 10;
  const tiltDeg = Math.sin(f / 31) * 2.5;
  return (
    <AbsoluteFill style={style}>
      {cutout ? null : (
        <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 72% 18%, #45565e 0%, #232b30 55%, #14181b 100%)' }}>
          <div style={{ position: 'absolute', left: 90, top: 300, width: 250, height: 420, borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '3px solid rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', left: 700, top: 980, width: 300, height: 18, borderRadius: 9, background: 'rgba(255,255,255,0.08)' }} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 175,
              textAlign: 'center',
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 24,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            stand-in footage · put your clip in public/ and set it in src/reel/cut.ts
          </div>
        </AbsoluteFill>
      )}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(${sway} ${bob})`}>
          <path
            d={`M ${x - 370} 1920 L ${x - 370} 1160 Q ${x - 350} 930 ${x - 150} 900 L ${x + 150} 900 Q ${x + 350} 930 ${x + 370} 1160 L ${x + 370} 1920 Z`}
            fill="#2c3238"
          />
          <path d={`M ${x - 150} 900 L ${x} 1010 L ${x + 150} 900 Z`} fill="#c9977a" />
          <rect x={x - 58} y={y + 110} width={116} height={200} rx={40} fill="#c9977a" />
          <g transform={`rotate(${tiltDeg} ${x} ${y + 150})`}>
            <ellipse cx={x} cy={y} rx={132} ry={165} fill="#d9a98a" />
            <path d={`M ${x - 140} ${y - 10} Q ${x - 150} ${y - 190} ${x} ${y - 185} Q ${x + 150} ${y - 190} ${x + 140} ${y - 10} Q ${x + 100} ${y - 120} ${x} ${y - 115} Q ${x - 100} ${y - 120} ${x - 140} ${y - 10} Z`} fill="#2a1f1a" />
            <ellipse cx={x - 48} cy={y + 5} rx={11} ry={14} fill="#2a1f1a" />
            <ellipse cx={x + 48} cy={y + 5} rx={11} ry={14} fill="#2a1f1a" />
            <path d={`M ${x - 42} ${y + 80} Q ${x} ${y + 100 + Math.abs(Math.sin(f / 4)) * 14} ${x + 42} ${y + 80}`} stroke="#7a3b2e" strokeWidth={9} fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Plain full-frame talking head. Muted: audio is the caller's job (one audio track for the whole reel). */
export const Talk: React.FC<{ src: string; trimBefore?: number; style?: React.CSSProperties; transparent?: boolean }> = ({
  src: s,
  trimBefore = 0,
  style,
  transparent,
}) =>
  s === STAND_IN ? (
    <StandIn cutout={transparent} trimBefore={trimBefore} style={style} />
  ) : (
    <OffthreadVideo
      src={src(s)}
      trimBefore={trimBefore || undefined}
      muted
      transparent={transparent}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );

/** Small white rounded pill, top centre ("#3 Digital Zoom"), or top right when a card already sits top left. Pops in, fades out at the end. */
export const LabelPill: React.FC<{ text: string; duration?: number; y?: number; align?: 'center' | 'right' }> = ({ text, duration = 9999, y = 268, align = 'center' }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 9], [0.6, 1], { ...CL, easing: POP });
  const o = Math.min(interpolate(f, [0, 5], [0, 1], CL), interpolate(f, [duration - 6, duration], [1, 0], CL));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 2000 }}>
      <div
        style={{
          position: 'absolute',
          top: y,
          ...(align === 'right' ? { right: 1080 - SAFE.r, transformOrigin: 'right center' } : { left: '50%' }),
          transform: `${align === 'right' ? '' : 'translateX(-50%) '}scale(${s})`,
          opacity: o,
          background: COL.white,
          color: COL.ink,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: -0.4,
          padding: '12px 26px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
