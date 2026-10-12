import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { CL, COL, POP, src as resolve } from '../core';

/** [seconds on the reel timeline, x, y] palm centre in 1080x1920 px. Made by tools/palm_track.py from Apple Vision hand pose. */
export type PalmPoint = [number, number, number];

export type PalmPropProps = {
  /** Frame on the parent timeline where the prop appears. */
  start?: number;
  /** Frames it stays on the palm. */
  duration: number;
  /** Palm track. A single point works too if the hand stays still. */
  track: PalmPoint[];
  /** Image of the prop / mascot (public/ path or URL), standing on its bottom edge. A drawn blob is used when empty. */
  image?: string;
  /** Prop height in px. */
  size?: number;
  /** Width / height of the image. */
  aspect?: number;
  /** Local frame from which the prop hops (a cheer). */
  hopAt?: number;
};

/** Linear interpolation along the palm track at time t (seconds). */
const palmAt = (track: PalmPoint[], t: number): [number, number] => {
  if (track.length === 1 || t <= track[0][0]) return [track[0][1], track[0][2]];
  const i = track.findIndex((p) => p[0] >= t);
  if (i < 0) return [track[track.length - 1][1], track[track.length - 1][2]];
  const [t0, x0, y0] = track[i - 1];
  const [t1, x1, y1] = track[i];
  const k = (t - t0) / Math.max(0.001, t1 - t0);
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
};

const Blob: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M10 92 Q4 40 50 12 Q96 40 90 92 Z" fill={COL.yellow} stroke={COL.ink} strokeWidth={3} />
    <circle cx={38} cy={55} r={6} fill={COL.ink} />
    <circle cx={62} cy={55} r={6} fill={COL.ink} />
    <path d="M40 72 Q50 80 60 72" stroke={COL.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

const Body: React.FC<PalmPropProps> = ({ start = 0, duration, track, image, size = 340, aspect = 1, hopAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (start + f) / fps;
  const [px, py] = palmAt(track, t);
  const inK = interpolate(f, [0, 10], [0, 1], { ...CL, easing: POP });
  const outK = interpolate(f, [duration - 7, duration], [1, 0], { ...CL, easing: Easing.in(Easing.cubic) });
  const drop = (1 - interpolate(f, [0, 8], [0, 1], { ...CL, easing: Easing.out(Easing.bounce) })) * 240;
  const hop = hopAt !== undefined && f >= hopAt ? Math.abs(Math.sin(((f - hopAt) / fps) * Math.PI * 2.6)) * 70 : 0;
  const bob = Math.sin((f / fps) * Math.PI * 3) * 6;
  const squash = 1 + 0.06 * Math.sin((f / fps) * Math.PI * 6);
  const k = inK * outK;
  const w = size * aspect;
  const spark = interpolate(f, [0, 14], [0, 1], CL);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 45 }}>
      {/* contact shadow on the palm */}
      <div
        style={{
          position: 'absolute',
          left: px - 85 * k,
          top: py - 18,
          width: 170 * k,
          height: 34 * k,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(0,0,0,0.45), rgba(0,0,0,0))',
          opacity: Math.max(0, 1 - hop / 120),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: px - w / 2,
          top: py - 4 - size - hop - drop + bob,
          width: w,
          height: size,
          transform: `scale(${k}) scaleY(${squash})`,
          transformOrigin: '50% 100%',
          filter: 'drop-shadow(0 18px 22px rgba(0,0,0,0.35))',
        }}
      >
        {image ? <Img src={resolve(image)} style={{ width: w, height: size }} /> : <Blob size={size} />}
      </div>
      {spark > 0 && spark < 1
        ? Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const r = 60 + 190 * spark;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: px + Math.cos(a) * r - 9,
                  top: py - size / 2 + Math.sin(a) * r - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: i % 2 ? '#FF5A24' : COL.yellow,
                  opacity: 1 - spark,
                }}
              />
            );
          })
        : null}
    </AbsoluteFill>
  );
};

/**
 * Extra (not one of the 7): a prop or mascot that pops onto your open palm and follows it.
 * Hold your palm out, flat and still-ish, chest height, for at least 2 seconds.
 */
export const PalmProp: React.FC<PalmPropProps> = (p) => (
  <Sequence from={p.start ?? 0} durationInFrames={p.duration} name="PalmProp">
    <Body {...p} />
  </Sequence>
);
