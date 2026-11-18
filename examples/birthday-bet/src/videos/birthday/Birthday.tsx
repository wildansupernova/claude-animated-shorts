// "The Birthday Bet" (v3, "Would you take this bet?"): our original ~54 s short about the birthday paradox, in the flat-characters-in-a-3D-toon-world
// style of templates/bridge. One three.js world (world.ts) posed per frame from the story timeline (story.ts).
// Post chain as the bridge short: InkPass -> lens blur pre + main -> bloom (emissive only) -> NEUTRAL tone map ->
// grade, MSAA. Place / time changes crossfade by stacking a second canvas. After "September ninth!" a record scratch
// freezes the picture (desaturated, creeping zoom, white flash). The story graphics (Overlay.tsx) and the burned-in
// captions (Captions.tsx) sit on top of everything.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Freeze, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { TOTAL, FLASH_AT, FREEZE, SHOTS, layersAt, dofAt } from "./story";
import { Captions } from "./Captions";
import { Overlay } from "./Overlay";

export const BIRTHDAY_FRAMES = TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; msaa: number; captions: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, msaa: 4, captions: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("birthday kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => {
    const passes: React.ReactElement[] = [];
    if (on.ink) passes.push(<primitive key="ink" object={fx.ink} dispose={null} />);
    if (on.lens && on.pre) passes.push(<primitive key="pre" object={fx.lens.pre} dispose={null} />);
    if (on.lens) passes.push(<primitive key="lens" object={fx.lens.main} dispose={null} />);
    if (on.bloom) passes.push(<primitive key="bloom" object={fx.bloom} dispose={null} />);
    passes.push(<primitive key="tone" object={fx.tone} dispose={null} />);
    if (on.grade) passes.push(<primitive key="grade" object={fx.grade} dispose={null} />);
    return <EffectComposer multisampling={on.msaa}>{passes}</EffectComposer>;
  }, [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number }> = ({ id, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.15, far: 1500 }}>
      <Inner id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const BirthdayShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  const on = useMemo(toggles, []);
  if (!kit) return null;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [0.85, 0.55, 0.3, 0.12][f - FLASH_AT] : 0;
  const frozen = f >= FREEZE[0] && f < FREEZE[1], fz = frozen ? f - FREEZE[0] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <AbsoluteFill style={frozen ? { filter: "saturate(0.3) contrast(1.12) brightness(1.04)", transform: `scale(${1 + 0.0035 * fz})` } : undefined}>
        <Freeze frame={FREEZE[0]} active={frozen}>
          {layersAt(frozen ? FREEZE[0] : f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
        </Freeze>
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      {on.captions && <Overlay />}
      {on.captions && <Captions />}
    </AbsoluteFill>
  );
};
