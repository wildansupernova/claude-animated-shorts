// Story graphics for "Floor Zero, Part 1": a small series title over the first two seconds, and the two numbered
// choice tags. In shot 26 each tag hangs on a leader line from its anchor in the 3D scene (projected with the same
// camera as the render: camAt); the hot tag pulses while the narrator names it. In the last shot both tags pin to the
// top of the frame, the way the question is left hanging.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { camAt, shotAt, SH, TAGS_AT, TAG1_HOT, TAG2_HOT, TAG_ANCHORS, clamp01 } from "./story";

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

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const s = shotAt(f);
  const els: React.ReactNode[] = [];
  // series title (first ~2.3 s)
  if (f < 76) {
    const a = Math.min(clamp01((f - 4) / 10), clamp01((76 - f) / 12));
    els.push(
      <div key="title" style={{ position: "absolute", top: 150, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", color: "#ffffff" }}>
        <div style={{ fontWeight: 900, fontSize: 64, letterSpacing: 14, WebkitTextStroke: "10px #0d0a10", paintOrder: "stroke fill" }}>FLOOR <span style={{ color: "#ffb347" }}>0</span></div>
        <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: 10, marginTop: 6, opacity: 0.85 }}>PART 1</div>
      </div>);
  }
  if (f >= TAGS_AT) {
    const hot = (r: [number, number]) => (f >= r[0] && f < r[1] ? 0.5 + 0.5 * Math.sin((f - r[0]) * 0.35) : 0);
    const hots = [hot(TAG1_HOT), hot(TAG2_HOT)];
    if (s.id === 26) {
      TAG_ANCHORS.forEach((t, i) => {
        const [ax, ay, z] = project(26, f, t.at);
        if (z > 1) return;
        const sc = pop(f, TAGS_AT + i * 5);
        if (sc <= 0) return;
        const [px, py] = t.pill;
        els.push(
          <svg key={"ln" + i} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, sc) }}>
            <line x1={px} y1={py + (ay > py ? 40 : -40)} x2={ax} y2={ay} stroke="#ffffff" strokeWidth={5} />
            <circle cx={ax} cy={ay} r={16} fill={t.color} stroke="#ffffff" strokeWidth={6} />
          </svg>,
          <Pill key={"p" + i} n={t.n} label={t.label} color={t.color} x={px} y={py} s={sc} hot={hots[i]} />);
      });
    } else if (s.id === 27) {
      TAG_ANCHORS.forEach((t, i) => els.push(<Pill key={"t" + i} n={t.n} label={t.label} color={t.color} x={i === 0 ? 290 : 790} y={300} s={1.4} hot={0} />));
    }
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
export const _keep = SH;
