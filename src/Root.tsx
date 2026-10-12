import React from 'react';
import { AbsoluteFill, Composition, Series } from 'remotion';
import { Captions, Word } from './Captions';
import { Pt, STAND_IN, Talk } from './core';
import { BeforeAfter, HeadlineWall, Orbit } from './effects/cards';
import { PalmProp } from './effects/PalmProp';
import { Checklist, DigitalZoom, FreezeAndLabel, Spotlight } from './effects/simple';
import { CUT } from './reel/cut';
import { MyReel, MyReelFramed } from './reel/MyReel';

// Single-effect demos on the stand-in person, 4 s each. Swap CLIP / MATTE for your own files in public/ to try them on you.
const CLIP = STAND_IN;
const MATTE = STAND_IN;
const FACE: Pt = { x: 540, y: 640 };
const D = 120;

/** Evenly spaced demo words for a line (real reels get whisper timings from tools/build_cut.py). */
const say = (text: string, start = 0.2, end = 3.8): Word[] => {
  const ws = text.split(' ');
  const step = (end - start) / ws.length;
  return ws.map((w, i) => ({ text: w, start: start + i * step, end: start + (i + 0.85) * step }));
};
const withCaps = (line: string, body: React.ReactNode, y = 1180) => (
  <AbsoluteFill>
    {body}
    <Captions words={say(line)} y={y} />
  </AbsoluteFill>
);

export const DemoHeadlineWall = () =>
  withCaps('here are seven effects Claude made for me', <HeadlineWall src={CLIP} matteSrc={MATTE} duration={D} face={FACE} label="#1 Headline Wall" />);
export const DemoOrbit = () =>
  withCaps('it can spin my reels around my head', <Orbit src={CLIP} matteSrc={MATTE} duration={D} face={FACE} label="#2 Orbit" ringOffset={110} tilt={380} />, 1560);
export const DemoDigitalZoom = () =>
  withCaps('this is a digital zoom', <DigitalZoom src={CLIP} duration={D} face={FACE} label="#3 Digital Zoom" />);
export const DemoSpotlight = () =>
  withCaps('just kill the lights', <Spotlight src={CLIP} matteSrc={MATTE} duration={D} face={FACE} label="#4 Spotlight" />);
export const DemoChecklist = () =>
  withCaps(
    'record a video drop it into Claude use the skill',
    <Checklist
      src={CLIP}
      duration={D}
      label="#5 Checklist"
      items={[
        { text: 'Record a video', at: 18 },
        { text: 'Drop it into Claude', at: 48 },
        { text: 'Use the skill', at: 78 },
      ]}
    />,
  );
export const DemoFreezeAndLabel = () =>
  withCaps('wait this is the freeze and label', <FreezeAndLabel src={CLIP} duration={D} face={FACE} freezeAt={14} unfreezeAt={74} text="me, mid-word" label="#6 Freeze and Label" />);
export const DemoBeforeAfter = () =>
  withCaps(
    'this is what I filmed and this is what Claude sent back',
    <BeforeAfter
      duration={D}
      label="#7 Before and After"
      before={<Talk src={CLIP} style={{ filter: 'saturate(0.35) contrast(0.82) brightness(1.06)' }} />}
      after={CLIP}
    />,
  );
export const DemoPalmProp = () =>
  withCaps(
    'and this little guy lives on my hand',
    <AbsoluteFill>
      <Talk src={CLIP} />
      <PalmProp duration={D} track={[[0, 760, 1500], [2, 740, 1480], [4, 770, 1510]]} hopAt={60} />
    </AbsoluteFill>,
  );

const ORDER: React.FC[] = [DemoHeadlineWall, DemoOrbit, DemoDigitalZoom, DemoSpotlight, DemoChecklist, DemoFreezeAndLabel, DemoBeforeAfter];

/** All seven back to back. */
export const AllEffects: React.FC = () => (
  <Series>
    {ORDER.map((C, i) => (
      <Series.Sequence key={i} durationInFrames={D}>
        <C />
      </Series.Sequence>
    ))}
  </Series>
);

const demos: [string, React.FC][] = [
  ['HeadlineWall', DemoHeadlineWall],
  ['Orbit', DemoOrbit],
  ['DigitalZoom', DemoDigitalZoom],
  ['Spotlight', DemoSpotlight],
  ['Checklist', DemoChecklist],
  ['FreezeAndLabel', DemoFreezeAndLabel],
  ['BeforeAfter', DemoBeforeAfter],
  ['PalmProp', DemoPalmProp],
];

export const Root: React.FC = () => (
  <>
    <Composition id="MyReel" component={MyReel} durationInFrames={Math.round(CUT.total * 30)} fps={30} width={1080} height={1920} />
    <Composition id="MyReelFramed" component={MyReelFramed} durationInFrames={Math.round(CUT.total * 30)} fps={30} width={1080} height={1920} />
    <Composition id="AllEffects" component={AllEffects} durationInFrames={D * ORDER.length} fps={30} width={1080} height={1920} />
    {demos.map(([id, C]) => (
      <Composition key={id} id={id} component={C} durationInFrames={D} fps={30} width={1080} height={1920} />
    ))}
  </>
);
