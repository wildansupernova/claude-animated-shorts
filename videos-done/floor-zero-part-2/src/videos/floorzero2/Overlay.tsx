// Story graphics for "Floor Zero, Part 2": the series title, Part 1's two tags over the recap, the branch badge while a
// branch plays (② STAY IN, then ① STEP OUT), the VHS rewind (scanlines, a rolling tracking band, ◀◀ REWIND) and the new
// choice tags (① STAIRS / ② ELEVATOR): on leader lines from their 3D anchors in shot 19 (projected with the same camera
// as the render, camAt), then pinned big at the top for the question.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { camAt, shotAt, SH, TAGS_AT, TAG1_HOT, TAG2_HOT, TAG_ANCHORS, RECAP_ANCHORS, REWIND, branchAt, clamp01 } from "./story";

const W = 1080, H = 1920;
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 80);
const project = (id: number, f: number, p: [number, number, number]) => {
  const c = camAt(id, f);
  cam.fov = c.fov; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z] as const;
};
const pop = (f: number, f0: number, n = 7) => { if (f < f0) return 0; const u = clamp01((f - f0) / n), s = 1.9; return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2; };

const Pill: React.FC<{ n: number; label: string; color: string; x: number; y: number; s: number; hot: number }> = ({ n, label, color, x, y, s, hot }) => (
  <div style={{
    position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${s * (1 + 0.08 * hot)})`, display: "flex", alignItems: "center", gap: 14,
    background: "rgba(10,12,18,0.86)", border: "5px solid #ffffff", borderRadius: 999, padding: "12px 30px 12px 14px",
    boxShadow: hot > 0 ? `0 0 ${30 * hot}px ${color}` : "0 6px 18px rgba(0,0,0,0.5)",
    fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 44, color: "#ffffff", letterSpacing: 1.5, whiteSpace: "nowrap",
  }}>
    <div style={{ width: 54, height: 54, borderRadius: 27, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{n}</div>
    {label}
  </div>
);
type Anchor = { n: number; label: string; color: string; at: [number, number, number]; pill: [number, number] };
const tags = (id: number, f: number, list: Anchor[], f0: number, hots: number[], key: string) => {
  const els: React.ReactNode[] = [];
  list.forEach((t, i) => {
    const [ax, ay, z] = project(id, f, t.at);
    if (z > 1) return;
    const sc = pop(f, f0 + i * 5);
    if (sc <= 0) return;
    const [px, py] = t.pill;
    els.push(
      <svg key={key + "ln" + i} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, sc) }}>
        <line x1={px} y1={py + (ay > py ? 40 : -40)} x2={ax} y2={ay} stroke="#ffffff" strokeWidth={5} />
        <circle cx={ax} cy={ay} r={16} fill={t.color} stroke="#ffffff" strokeWidth={6} />
      </svg>,
      <Pill key={key + "p" + i} n={t.n} label={t.label} color={t.color} x={px} y={py} s={sc} hot={hots[i] ?? 0} />);
  });
  return els;
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const s = shotAt(f);
  const els: React.ReactNode[] = [];
  // series title (first ~2.3 s)
  if (f < 70) {
    const a = Math.min(clamp01((f - 2) / 8), clamp01((70 - f) / 12));
    els.push(
      <div key="title" style={{ position: "absolute", top: 150, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", color: "#ffffff" }}>
        <div style={{ fontWeight: 900, fontSize: 64, letterSpacing: 14, WebkitTextStroke: "10px #0d0a10", paintOrder: "stroke fill" }}>FLOOR <span style={{ color: "#ffb347" }}>0</span></div>
        <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: 10, marginTop: 6, opacity: 0.85 }}>PART 2</div>
      </div>);
  }
  // recap: Part 1's two choices
  if (s.id === 1) els.push(...tags(1, f, RECAP_ANCHORS, 6, [f > 20 && f < 50 ? 1 : 0, f >= 50 ? 1 : 0], "r"));
  // branch badge
  const br = branchAt(f);
  if (br) {
    const t = br === 2 ? RECAP_ANCHORS[1] : RECAP_ANCHORS[0], b0 = br === 2 ? SH[2].a : SH[11].a;
    els.push(<Pill key="badge" n={t.n} label={t.label} color={t.color} x={W / 2} y={175} s={0.9 * pop(f, b0, 8)} hot={0} />);
  }
  // VHS rewind
  if (f >= REWIND[0] && f < REWIND[1]) {
    const u = f - REWIND[0], band = (u * 61) % (H + 200) - 100;
    els.push(
      <div key="scan" style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)" }} />,
      <div key="band" style={{ position: "absolute", left: 0, top: band, width: W, height: 70, background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.05) 100%)" }} />,
      <div key="band2" style={{ position: "absolute", left: 0, top: (band * 1.7 + 900) % H, width: W, height: 18, background: "rgba(255,255,255,0.14)" }} />,
      <div key="rw" style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 18, opacity: Math.floor(u / 8) % 2 ? 1 : 0.85 }}>
        <svg width={110} height={64}><polygon points="52,0 52,64 0,32" fill="#ffffff" /><polygon points="108,0 108,64 56,32" fill="#ffffff" /></svg>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 58, color: "#ffffff", letterSpacing: 6, textShadow: "3px 0 0 rgba(255,40,60,0.7), -3px 0 0 rgba(40,200,255,0.7)" }}>REWIND</div>
      </div>);
  }
  // the new choice
  if (f >= TAGS_AT) {
    const hot = (r: [number, number]) => (f >= r[0] && f < r[1] ? 0.5 + 0.5 * Math.sin((f - r[0]) * 0.35) : 0);
    if (s.id === 19) els.push(...tags(19, f, TAG_ANCHORS, TAGS_AT, [hot(TAG1_HOT), hot(TAG2_HOT)], "c"));
    else if (s.id === 20) TAG_ANCHORS.forEach((t, i) => els.push(<Pill key={"t" + i} n={t.n} label={t.label} color={t.color} x={i === 0 ? 270 : 800} y={300} s={1.3} hot={0} />));
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
