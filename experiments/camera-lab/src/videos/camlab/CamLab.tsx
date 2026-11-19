// Camera-move lab: the same 14 s "Butter Side Down" story filmed once per camera move (variants.ts), back to back
// in one composition ("CamReel", variant v = frame / CLIP), with a small numbered label on top. The title cards
// between the clips are a separate 2D composition ("CamCards", one frame per card).
// Post chain as the bridge / birthday shorts: InkPass -> lens blur pre + main -> camera motion blur -> bloom ->
// NEUTRAL tone map -> grade, MSAA.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { MotionBlur, camMotion, blurTiny } from "./blur";
import { CLIP } from "./timeline";
import { VARIANTS, camAt, rawCamAt, dofAt, storyAt, hiAt, optsAt } from "./variants";

export const REEL_FRAMES = VARIANTS.length * CLIP;
type PostToggles = { ink: boolean; lens: boolean; mblur: boolean; bloom: boolean; grade: boolean; msaa: number; label: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, mblur: true, bloom: true, grade: true, msaa: 4, label: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });
/** inputProps.only = variant index: the reel then shows that variant only (for stills / single renders) */
const onlyV = () => (getInputProps() as { only?: number }).only;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const useKit = () => {
  const [ok, setOk] = useState(false);
  const [handle] = useState(() => delayRender("camlab fonts"));
  useEffect(() => { loadKit().then(() => { setOk(true); continueRender(handle); }); }, [handle]);
  return ok;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const Inner: React.FC<{ v: number; f: number }> = ({ v, f }) => {
  const { camera, scene, size } = useThree();
  const world = useMemo(() => new World(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 28, nearScale: 1.2 }),
    mblur: new MotionBlur(),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => {
    const p: React.ReactElement[] = [];
    if (on.ink) p.push(<primitive key="ink" object={fx.ink} dispose={null} />);
    if (on.lens) { p.push(<primitive key="pre" object={fx.lens.pre} dispose={null} />); p.push(<primitive key="lens" object={fx.lens.main} dispose={null} />); }
    if (on.mblur) p.push(<primitive key="mb" object={fx.mblur} dispose={null} />);
    if (on.bloom) p.push(<primitive key="bloom" object={fx.bloom} dispose={null} />);
    p.push(<primitive key="tone" object={fx.tone} dispose={null} />);
    if (on.grade) p.push(<primitive key="grade" object={fx.grade} dispose={null} />);
    return <EffectComposer multisampling={on.msaa}>{p}</EffectComposer>;
  }, [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  const c = camAt(v, f), s = storyAt(v, f);
  world.update(s, c, cam, scene, optsAt(v, f));
  noInkFallback(world.root);
  // lens: focus distance along the view axis
  const d = dofAt(v, f, c);
  cam.getWorldDirection(fwd);
  fpt.set(...d.focus);
  fx.lens.focus = Math.max(0.12, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  // motion blur from the camera path over the shutter (no blur across a cut)
  const V0 = VARIANTS[v], sh = V0.shutter ?? 0.5, aspect = size.width / Math.max(1, size.height);
  const cut = V0.segs.some((g) => g.a > 0 && g.a > f - sh - 0.001 && g.a <= f);
  const m = cut ? null : camMotion(rawCamAt(v, f - sh), rawCamAt(v, f), aspect);
  fx.mblur.set(!m || blurTiny(m, size.height) ? { vel: [0, 0], rot: 0, zoom: 0 } : m, aspect);
  gradeFor(fx.grade, "day");
  void hiAt;
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const Label: React.FC<{ v: number; f: number }> = ({ v, f }) => {
  const { height } = useVideoConfig();
  const V0 = VARIANTS[v], k = height / 1920, hot = hiAt(v, f);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: "Fredoka, sans-serif" }}>
      <div style={{ position: "absolute", left: 36 * k, top: 40 * k, display: "flex", alignItems: "center", gap: 18 * k,
        background: "rgba(20,16,28,0.72)", borderRadius: 26 * k, padding: `${12 * k}px ${26 * k}px ${12 * k}px ${14 * k}px` }}>
        <div style={{ background: hot ? "#ffd84a" : "#ffffff", color: "#1c1626", borderRadius: 18 * k, minWidth: 92 * k, textAlign: "center",
          fontSize: 58 * k, lineHeight: `${76 * k}px`, fontWeight: 700 }}>{String(V0.n).padStart(2, "0")}</div>
        <div style={{ color: "#ffffff", fontSize: 46 * k, fontWeight: 700, letterSpacing: 1 * k }}>{V0.name}</div>
      </div>
      {hot && <div style={{ position: "absolute", left: 36 * k, top: 150 * k, background: "#ffd84a", color: "#1c1626", borderRadius: 14 * k,
        padding: `${4 * k}px ${16 * k}px`, fontSize: 30 * k, fontWeight: 700 }}>● {V0.move}</div>}
    </AbsoluteFill>
  );
};

export const CamReel: React.FC = () => {
  const F = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ok = useKit();
  const on = useMemo(toggles, []);
  if (!ok) return null;
  const only = onlyV();
  const v = only ?? Math.min(VARIANTS.length - 1, Math.floor(F / CLIP)), f = only !== undefined ? F % CLIP : F - v * CLIP;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.05, far: 1200 }}>
        <Inner v={v} f={f} />
      </ThreeCanvas>
      {on.label && <Label v={v} f={f} />}
    </AbsoluteFill>
  );
};

/** title card i (one frame each): number, move name, what it does, when to use it */
export const CamCards: React.FC = () => {
  const F = useCurrentFrame();
  const { height } = useVideoConfig();
  const ok = useKit();
  if (!ok) return null;
  const V0 = VARIANTS[Math.min(VARIANTS.length - 1, F)], k = height / 1920;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #2b2240 0%, #3b2e5a 55%, #4a3a6e 100%)", fontFamily: "Fredoka, sans-serif",
      color: "#fff", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 90 * k }}>
      <div style={{ fontSize: 300 * k, lineHeight: 1, fontWeight: 700, color: "#ffd84a" }}>{String(V0.n).padStart(2, "0")}</div>
      <div style={{ fontSize: 104 * k, fontWeight: 700, marginTop: 30 * k, lineHeight: 1.05 }}>{V0.name}</div>
      <div style={{ fontSize: 52 * k, marginTop: 50 * k, opacity: 0.92, lineHeight: 1.25, maxWidth: 880 * k }}>{V0.what}</div>
      <div style={{ fontSize: 42 * k, marginTop: 44 * k, color: "#bfe6ff", lineHeight: 1.3, maxWidth: 880 * k }}>Use it for: {V0.use}</div>
    </AbsoluteFill>
  );
};
