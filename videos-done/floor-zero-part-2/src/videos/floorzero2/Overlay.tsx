// Story graphics for "Floor Zero, Part 2": the series title, Part 1's two tags over the recap, the branch badge while a
// branch plays (② STAY IN, then ① STEP OUT), the VHS rewind (scanlines, a rolling tracking band, ◀◀ REWIND) and the new
// choice tags (① STAIRS / ② ELEVATOR): on leader lines from their 3D anchors in shot 19 (projected with the same camera
// as the render, camAt), then pinned big at the top for the question.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { RULE2, camAt, shotAt, SH, TAGS_AT, TAG1_HOT, TAG2_HOT, TAG_ANCHORS, RECAP_ANCHORS, REWIND, branchAt, clamp01, TEASER, VOTES, MSG, messageAt, TOTAL } from "./story";

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
  // frame-1 hook text over the cold open (works muted), then the series title once we land in the recap
  if (f < TEASER) {
    const a = clamp01((TEASER - f) / 4);
    els.push(
      <div key="hook" style={{ position: "absolute", top: 410, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#ffffff", fontSize: 92, lineHeight: 1.04, letterSpacing: 2, WebkitTextStroke: "14px #0d0a10", paintOrder: "stroke fill" }}>
        <div>IT TOOK <span style={{ color: "#ff4a3a" }}>A STEP</span>.</div>
        <div>NOBODY <span style={{ color: "#ffb347" }}>SAW</span>.</div>
      </div>);
  }
  // recap: Part 1's two choices
  if (s.id === 1 && f >= TEASER) els.push(...tags(1, f, RECAP_ANCHORS, TEASER + 6, [f > TEASER + 14 && f < TEASER + 44 ? 1 : 0, f >= TEASER + 44 ? 1 : 0], "r"));
  // the real Part 1 vote split (only when VOTES holds real numbers)
  if (VOTES && s.id === 1 && f >= 60) {
    const k = pop(f, 60, 8);
    els.push(<div key="votes" style={{ position: "absolute", left: W / 2, top: 640, transform: `translate(-50%, -50%) scale(${k})`, background: "rgba(10,12,18,0.88)", border: "5px solid #ffb347", borderRadius: 26, padding: "14px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 40, color: "#ffffff", whiteSpace: "nowrap", textAlign: "center" }}>
      <div style={{ fontSize: 30, color: "#ffb347", letterSpacing: 4 }}>YOU VOTED</div>
      <div><span style={{ color: "#7fb0ff" }}>1</span> STEP OUT {VOTES.out}% · <span style={{ color: "#ff7a6a" }}>2</span> STAY IN {VOTES.stay}%</div>
    </div>);
  }
  // branch badge
  const br = branchAt(f);
  if (br && !(f >= RULE2[0] && f < RULE2[1])) {
    const t = br === 2 ? RECAP_ANCHORS[1] : RECAP_ANCHORS[0], b0 = br === 2 ? SH[2].a : SH[11].a;
    els.push(<Pill key="badge" n={t.n} label={t.label} color={t.color} x={W / 2} y={430} s={0.9 * pop(f, b0, 8)} hot={0} />);
  }
  // VHS rewind
  if (f >= REWIND[0] && f < REWIND[1]) {
    const u = f - REWIND[0], band = (u * 61) % (H + 200) - 100;
    els.push(
      <div key="scan" style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)" }} />,
      <div key="band" style={{ position: "absolute", left: 0, top: band, width: W, height: 70, background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.05) 100%)" }} />,
      <div key="band2" style={{ position: "absolute", left: 0, top: (band * 1.7 + 900) % H, width: W, height: 18, background: "rgba(255,255,255,0.14)" }} />,
      <div key="rw" style={{ position: "absolute", left: 80, top: 420, display: "flex", alignItems: "center", gap: 18, opacity: Math.floor(u / 8) % 2 ? 1 : 0.85 }}>
        <svg width={110} height={64}><polygon points="52,0 52,64 0,32" fill="#ffffff" /><polygon points="108,0 108,64 56,32" fill="#ffffff" /></svg>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 58, color: "#ffffff", letterSpacing: 6, textShadow: "3px 0 0 rgba(255,40,60,0.7), -3px 0 0 rgba(40,200,255,0.7)" }}>REWIND</div>
      </div>);
  }
  // HUD (below the top ~20 % UI band): the floor from frame 1; the countdown joins once it is revealed
  if (f >= TEASER && f < TOTAL && !(f >= REWIND[0] && f < REWIND[1]) && !(f >= RULE2[0] && f < RULE2[1])) {
    const clock = f >= MSG[3] + 20;
    const left = messageAt(f).left, p = (n: number) => String(n).padStart(2, "0");
    const txt = `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;
    els.push(<div key="hud" style={{ position: "absolute", right: 44, top: 396, background: "rgba(6,8,12,0.82)", border: `4px solid ${clock ? "#ff4a3a" : "#8a929a"}`, borderRadius: 18, padding: "6px 16px 8px", textAlign: "center", fontFamily: "Montserrat, sans-serif", color: "#ffffff" }}>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 3, color: "#ffffff" }}>FLOOR 0<span style={{ color: "#ffb347" }}>{clock ? " · TO 06:00" : " · PART 2"}</span></div>
      {clock ? <div style={{ fontWeight: 900, fontSize: 42, color: "#ff4a3a", letterSpacing: 2, opacity: clamp01((f - MSG[3] - 20) / 8), textShadow: "0 0 12px rgba(255,60,40,0.6)" }}>{txt}</div> : null}
    </div>);
  }
  // the ask: one keystroke
  if (f >= TAGS_AT + 10 && (s.id === 19 || s.id === 20)) {
    const k = pop(f, TAGS_AT + 10, 8) * (1 + 0.04 * Math.sin(f * 0.25));
    els.push(<div key="cta" style={{ position: "absolute", left: W / 2, top: 690, transform: `translate(-50%, -50%) scale(${k})`, display: "flex", alignItems: "center", gap: 14, background: "#ffb347", border: "5px solid #0d0a10", borderRadius: 999, padding: "10px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 46, color: "#0d0a10", letterSpacing: 2, whiteSpace: "nowrap" }}>
      COMMENT 1 OR 2
      <svg width={34} height={40}><polygon points="0,14 34,14 17,40" fill="#0d0a10" /><rect x={11} y={0} width={12} height={16} fill="#0d0a10" /></svg>
    </div>);
  }
  // the new choice
  if (f >= TAGS_AT) {
    const hot = (r: [number, number]) => (f >= r[0] && f < r[1] ? 0.5 + 0.5 * Math.sin((f - r[0]) * 0.35) : 0);
    if (s.id === 19) els.push(...tags(19, f, TAG_ANCHORS, TAGS_AT, [hot(TAG1_HOT), hot(TAG2_HOT)], "c"));
    else if (s.id === 20) TAG_ANCHORS.forEach((t, i) => els.push(<Pill key={"t" + i} n={t.n} label={t.label} color={t.color} x={i === 0 ? 270 : 800} y={560} s={1.3} hot={0} />));
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
