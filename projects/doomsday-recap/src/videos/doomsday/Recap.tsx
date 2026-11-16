// "The Road to Doomsday": an animated recap of every Marvel movie that leads into Avengers: Doomsday, in the skill's
// flat-characters-in-a-3D-toon-world style. One three.js world (world.ts) posed per frame from the shot table
// (story.ts); post = ink lines (own pass) -> Neutral tone map -> colour grade. On top, in HTML: subtitle captions
// timed to the narration words (current word highlighted), a movie-title chip per chapter, flashes and the end title.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass } from "./ink";
import { GradeEffect, GRADES } from "./grade";
import { LOOKS } from "./looks";
import { TOTAL, FLASHES, LIGHTNING, shotAt, SHOTS } from "./story";
import WORDS from "./words.json";

export const RECAP_FRAMES = TOTAL;
type W = { w: string; s: number; e: number; line: string; ch: number };
const words = WORDS as W[];
const FPS = 30;

const Inner: React.FC<{ f: number }> = ({ f }) => {
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(scene), [scene]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
      <primitive object={fx.ink} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const s = world.update(f, camera as THREE.PerspectiveCamera);
  const L = LOOKS[s.look];
  const g = L.grade;
  const tag = fx.grade as unknown as { _g?: string };
  if (tag._g !== g + s.a) { fx.ink.setGrade({ ...GRADES[g], vig: [("vig" in L ? (L as { vig?: number }).vig : undefined) ?? GRADES[g].vig[0], GRADES[g].vig[1]] }); tag._g = g + s.a; }
  const P = getInputProps() as { empty?: boolean; nopost?: boolean };
  world.root.visible = !P.empty; (globalThis as unknown as { __nosky?: boolean }).__nosky = !!(P as { nosky?: boolean }).nosky;
  return (<><primitive object={world.root} dispose={null} />{P.nopost ? null : post}</>);
};

// ---------------- captions ----------------
type Page = { a: number; b: number; ws: W[] };
const PAGES: Page[] = (() => {
  const out: Page[] = []; let cur: W[] = [];
  const flush = () => { if (cur.length) out.push({ a: Math.round(cur[0].s * FPS) - 2, b: 0, ws: cur }); cur = []; };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const len = cur.reduce((n, x) => n + x.w.length + 1, 0);
    if (prev && (prev.line !== w.line || /[.,?:!]$/.test(prev.w) && cur.length >= 2 || cur.length >= 4 || len + w.w.length > 22 || w.s - prev.e > 0.35)) flush();
    cur.push(w);
  });
  flush();
  out.forEach((p, i) => { const last = p.ws[p.ws.length - 1]; const next = out[i + 1]; p.b = Math.min(next ? next.a : 1e9, Math.round(last.e * FPS) + 10); });
  return out;
})();
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const p = PAGES.find((x) => f >= x.a && f < x.b);
  if (!p) return null;
  const pop = interpolate(f - p.a, [0, 4], [0.86, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1260, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 22px", transform: `scale(${pop})`,
      fontFamily: "Bangers", fontSize: 92, letterSpacing: 2, lineHeight: 1.08, textAlign: "center" }}>
      {p.ws.map((w, i) => {
        const on = f >= Math.round(w.s * FPS) - 1 && (i === p.ws.length - 1 || f < Math.round(p.ws[i + 1].s * FPS) - 1);
        return <span key={i} style={{ color: on ? "#ffd84a" : "#ffffff", WebkitTextStroke: "14px #120c18", paintOrder: "stroke fill", display: "inline-block",
          transform: on ? "translateY(-4px) scale(1.08)" : "none", textShadow: "0 6px 0 rgba(18,12,24,0.55)" }}>{w.w.toUpperCase()}</span>;
      })}
    </div>
  );
};

// ---------------- chapter chips ----------------
const CHIPS: [string, string][] = [
  ["THE ROAD TO DOOMSDAY", "every movie you need, in order"], ["X-MEN  ·  X2", "2000 · 2003"], ["IRON MAN → THE AVENGERS", "2008 – 2012"], ["AVENGERS: INFINITY WAR", "2018"],
  ["AVENGERS: ENDGAME", "2019"], ["LOKI  ·  SEASONS 1 & 2", "2021 – 2023 · series"], ["SPIDER-MAN: NO WAY HOME", "2021"], ["DOCTOR STRANGE IN THE MULTIVERSE OF MADNESS", "2022"],
  ["BLACK PANTHER: WAKANDA FOREVER", "2022"], ["ANT-MAN AND THE WASP: QUANTUMANIA", "2023"], ["THE MARVELS", "2023"], ["DEADPOOL & WOLVERINE", "2024"],
  ["CAPTAIN AMERICA: BRAVE NEW WORLD", "2025"], ["THUNDERBOLTS*", "2025"], ["THE FANTASTIC FOUR: FIRST STEPS", "2025"], ["SPIDER-MAN: BRAND NEW DAY", "2026"],
  ["AVENGERS: DOOMSDAY", "in theaters December 18, 2026"],
];
const CH_START = CHIPS.map((_, ch) => SHOTS.find((s) => s.ch === ch)!.a);
const Chip: React.FC<{ f: number }> = ({ f }) => {
  const ch = shotAt(f).ch, a = CH_START[ch];
  if (f >= 5710) return null;
  const k = interpolate(f - a, [0, 8], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
  const [title, sub] = CHIPS[ch];
  const num = ch === 0 ? "" : ch === 16 ? "NEXT" : String(ch).padStart(2, "0");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", transform: `translateY(${(1 - k) * -60}px)`, opacity: k }}>
      <div style={{ display: "flex", alignItems: "stretch", maxWidth: 940, background: "rgba(18,12,24,0.82)", border: "5px solid #120c18", borderRadius: 26, boxShadow: "0 8px 0 rgba(18,12,24,0.45)", overflow: "hidden" }}>
        {num ? <div style={{ background: ch === 16 ? "#3fae5a" : "#e0303a", color: "#fff", fontFamily: "Bangers", fontSize: 58, padding: "10px 22px 4px", display: "flex", alignItems: "center", letterSpacing: 2 }}>{num}</div> : null}
        <div style={{ padding: "12px 26px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: "#ffd84a", fontFamily: "Bangers", fontSize: title.length > 30 ? 44 : 54, letterSpacing: 1.5, lineHeight: 1.0 }}>{title}</div>
          <div style={{ color: "#e8e2f0", fontFamily: "Bangers", fontSize: 32, letterSpacing: 2, marginTop: 4 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
};

const EndTitle: React.FC<{ f: number }> = ({ f }) => {
  if (f < 5712) return null;
  const k = interpolate(f, [5712, 5728], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
  const d = interpolate(f, [5745, 5758], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -330 }}>
      <div style={{ fontFamily: "Bangers", fontSize: 150, color: "#d8dde4", WebkitTextStroke: "16px #120c18", paintOrder: "stroke fill", letterSpacing: 4, lineHeight: 0.95, textAlign: "center",
        transform: `scale(${0.6 + 0.4 * k})`, opacity: k, textShadow: "0 10px 0 rgba(18,12,24,0.6)" }}>AVENGERS<br /><span style={{ color: "#7dff9a", fontSize: 190 }}>DOOMSDAY</span></div>
      <div style={{ marginTop: 26, fontFamily: "Bangers", fontSize: 76, color: "#ffd84a", WebkitTextStroke: "10px #120c18", paintOrder: "stroke fill", letterSpacing: 3, opacity: d, transform: `translateY(${(1 - d) * 30}px)` }}>DECEMBER 18</div>
    </AbsoluteFill>
  );
};

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const ff = [new FontFace("Bangers", `url(${staticFile("fonts/Bangers-Regular.ttf")})`), new FontFace("Luckiest Guy", `url(${staticFile("fonts/LuckiestGuy-Regular.ttf")})`)];
    Promise.all(ff.map((x) => x.load())).then((l) => { l.forEach((x) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(x)); continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

const dpr = () => (getInputProps() as { dpr?: number }).dpr ?? 0.6667;
const hideUI = () => !!(getInputProps() as { noui?: boolean }).noui;
/** story time runs at 30 fps; the composition may run at 24 (frame mapped) or a fixed frame can be given (contact sheets) */
export const Recap: React.FC<{ frame?: number }> = ({ frame }) => {
  const raw = useCurrentFrame(), { fps } = useVideoConfig();
  const f = frame ?? Math.round((raw * 30) / fps);
  useFonts();
  const fl = FLASHES.find(([a, n]) => f >= a && f < a + n);
  const flash = fl ? (1 - (f - fl[0]) / fl[1]) * 0.9 : 0;
  const lightning = LIGHTNING.some((a) => f >= a && f < a + 3) ? 0.35 : 0;
  return (
    <AbsoluteFill style={{ background: "#10101a" }}>
      <ThreeCanvas width={1080} height={1920} dpr={dpr()} gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.2, far: 3000 }}>
        <Inner f={f} />
      </ThreeCanvas>
      {lightning > 0 && <AbsoluteFill style={{ background: "#e8fff0", opacity: lightning, mixBlendMode: "screen" }} />}
      {flash > 0 && <AbsoluteFill style={{ background: fl![2], opacity: flash }} />}
      {!hideUI() && <><Chip f={f} /><Captions f={f} /><EndTitle f={f} /></>}
    </AbsoluteFill>
  );
};
