// "Floor Zero, Part 1": our original interactive horror short (second person, ends on a numbered choice), in the
// flat-characters-in-a-3D-world style of templates/bridge, relit for night interiors (shade.ts ceiling pools).
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain as the bridge short:
// InkPass -> lens blur pre + main -> bloom (emissive only) -> NEUTRAL tone map -> grade, MSAA. Captions (Captions.tsx)
// and the choice tags / series title (Overlay.tsx) sit on top.
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode, EffectComposer as ComposerImpl } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, gradeFor } from "./grade";
import { Kit } from "./build";
import { TOTAL, SHOTS, layersAt, dofAt } from "./story";
import { Captions } from "./Captions";
import { Overlay } from "./Overlay";

export const FLOORZERO_FRAMES = TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; msaa: number; captions: boolean; none: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, msaa: 4, captions: true, none: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.6, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.62 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("floorzero kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const on = useMemo(toggles, []);
  // @react-three/postprocessing 3.2 builds its composer in an effect AFTER the first R3F frame, and Remotion advances R3F
  // once per frame: on a fresh mount that frame renders nothing. Hold the frame until the composer has its passes,
  // then advance once more.
  const composerRef = useRef<ComposerImpl | null>(null);
  const advance = useThree((st) => st.advance);
  const [hold] = useState(() => delayRender("floorzero composer"));
  useEffect(() => {
    let alive = true, n = 0;
    const tick = () => {
      if (!alive) return;
      const c = composerRef.current;
      if ((c && c.passes.length > 1) || on.none || n++ > 400) { advance(performance.now()); continueRender(hold); return; }
      setTimeout(tick, 10);
    };
    tick();
    return () => { alive = false; };
  }, [advance, hold, on.none]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.office, 1),
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
    return <EffectComposer ref={composerRef} multisampling={on.msaa}>{passes}</EffectComposer>;
  }, [fx, on]);

  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.15, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {on.none ? null : post}
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

export const FloorZeroShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  const on = useMemo(toggles, []);
  if (!kit) return null;
  return (
    <AbsoluteFill style={{ background: "#05070c" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
      {on.captions && <Overlay />}
      {on.captions && <Captions />}
    </AbsoluteFill>
  );
};
