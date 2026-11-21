// Story graphics for "Floor Zero, Part 6" (the finale): the cold-open hook, the HUD (to 06:00, then G), Part 5's ① ②
// over the recap, the branch badge, the VHS rewind, and the 2D inserts (canvas, drawn per frame): gold morning on G
// (one of you walking out, backlit), the badge going into the time clock (05:59 / 05:59:59), the phones ("On my way."),
// its hair beside yours, the three reflections it learned you from (the steel, the water, a dead screen), the full rules
// card (2, then 3), the epilogue's brushed steel (its badge reflected: YOU), and the title.
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { camAt, shotAt, SH, RECAP_ANCHORS, REWIND, branchAt, clamp01, TEASER, VOTES, TOTAL, hudLeftAt, hudFloorAt, glide,
  srcFrame, cue, T0, SLOT_A, SLOT_B, GOLD_A, GOLD_B, PHONE_A, PHONE_B, HAIR_FLASH, FLASHES, CARD_2D, RULE3_AT, STEEL_E, TITLE_AT } from "./story";
import { drawCardFull } from "./flood";
import { Pen, bodyFront, Outfit, FrontOpts } from "./toon";
import { YOU_O } from "./cast";

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

const useCanvas = (draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const cv = ref.current; if (!cv) return; const g = cv.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); draw(g); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};
/** a toon body drawn into its own canvas (so it can be tinted on its own) */
const bodyCanvas = (o: Outfit, fo: FrontOpts, mirror: boolean, h = 1000) => {
  const c = document.createElement("canvas"); c.width = Math.round(h * 0.6); c.height = h;
  const g = c.getContext("2d")!; const k = h / 1000;
  if (mirror) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.scale(k, k); bodyFront(new Pen(g), o, fo); return c;
};

/** G, morning: gold light through the lobby glass; one of you walking out, a silhouette */
const Gold: React.FC<{ k: number }> = ({ k }) => useCanvas((g) => {
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#2a1a0e"); sky.addColorStop(1, "#120a05"); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // the glass wall, blazing
  const gx0 = 150, gx1 = 930, gy0 = 360, gy1 = 1260;
  const glass = g.createLinearGradient(0, gy0, 0, gy1); glass.addColorStop(0, "#fff4d6"); glass.addColorStop(0.6, "#ffd27a"); glass.addColorStop(1, "#f2a640");
  g.fillStyle = glass; g.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  g.fillStyle = "#2a1a0e"; for (const x of [gx0, 410, 670, gx1 - 14]) g.fillRect(x, gy0, 14, gy1 - gy0); g.fillRect(gx0, 820, gx1 - gx0, 12);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.font = "900 54px Montserrat, sans-serif"; g.textAlign = "center"; g.fillText("G", W / 2, 320);
  // the floor: polished, catching the light
  const fl = g.createLinearGradient(0, gy1, 0, H); fl.addColorStop(0, "#b8803c"); fl.addColorStop(1, "#2a1a0e"); g.fillStyle = fl; g.fillRect(0, gy1, W, H - gy1);
  const bloom = g.createRadialGradient(W / 2, 820, 100, W / 2, 820, 900); bloom.addColorStop(0, "rgba(255,226,160,0.45)"); bloom.addColorStop(1, "rgba(255,226,160,0)"); g.fillStyle = bloom; g.fillRect(0, 0, W, H);
  // the walker: from behind, black against the glass, smaller as they near the doors; a long shadow toward us
  const sc = 1.25 - 0.55 * glide(k), feetY = 1720 - 400 * glide(k), ph = k * 6;
  const b = bodyCanvas(YOU_O, { mode: "stroll", phase: ph, back: true, ears: true, seed: 3 }, false, 1000);
  const bg = b.getContext("2d")!; bg.globalCompositeOperation = "source-atop"; bg.fillStyle = "#140c06"; bg.fillRect(0, 0, b.width, b.height);
  g.fillStyle = "rgba(20,12,6,0.45)"; g.beginPath(); g.ellipse(W / 2, feetY + 120 * sc, 70 * sc, 260 * sc, 0, 0, 7); g.fill();
  g.drawImage(b, W / 2 - 300 * sc, feetY - 975 * sc, 600 * sc, 1000 * sc);
  const haze = g.createLinearGradient(0, 0, 0, H); haze.addColorStop(0, "rgba(255,210,140,0.12)"); haze.addColorStop(1, "rgba(255,210,140,0)"); g.fillStyle = haze; g.fillRect(0, 0, W, H);
}, [k]);

/** the time clock, close: the LED time, a badge sliding into the slot, the clock takes it */
const Slot: React.FC<{ k: number; time: string; front: boolean; took: boolean; t: number }> = ({ k, time, front, took, t }) => useCanvas((g) => {
  g.fillStyle = "#1a0605"; g.fillRect(0, 0, W, H);
  const z = 1 + 0.12 * t; g.translate(W / 2, 700); g.scale(z, z); g.translate(-W / 2, -700);
  const red = g.createRadialGradient(W / 2, 700, 100, W / 2, 700, 1000); red.addColorStop(0, "rgba(160,30,20,0.5)"); red.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = red; g.fillRect(0, 0, W, H);
  g.fillStyle = "#2a2c30"; g.fillRect(90, 360, 900, 1000); g.strokeStyle = "#0d0e10"; g.lineWidth = 24; g.strokeRect(90, 360, 900, 1000);
  g.fillStyle = "#0a0b0c"; g.fillRect(150, 430, 780, 300);
  g.fillStyle = took ? "#ff6a4a" : "#ff3b2a"; g.font = `900 ${time.length > 5 ? 150 : 210}px Montserrat, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,60,30,0.8)"; g.shadowBlur = 30 + (took ? 0 : 18 * (0.5 + 0.5 * Math.sin(t * 40))); g.fillText(time, W / 2, 585); g.shadowBlur = 0;
  g.fillStyle = "#0d0e10"; g.fillRect(260, 860, 560, 56); // the slot
  g.fillStyle = took ? "#3cff7a" : "#3a0d0a"; g.beginPath(); g.arc(880, 888, 18, 0, 7); g.fill();
  g.fillStyle = "#6a655c"; g.font = "800 40px Montserrat, sans-serif"; g.fillText("INSERT BADGE", W / 2, 990);
  // the badge, going up into the slot from below, held by a hand
  const y = 1500 - 560 * glide(k);
  g.save(); g.beginPath(); g.rect(0, 888, W, H); g.clip();
  g.fillStyle = front ? "#e9e5da" : "#d9d6cf"; g.strokeStyle = "#1d1b22"; g.lineWidth = 10; g.beginPath(); g.roundRect(330, y, 420, 560, 26); g.fill(); g.stroke();
  if (front) {
    g.fillStyle = "#8d9db8"; g.fillRect(370, y + 300, 130, 170); g.fillStyle = "#3a3d45"; g.beginPath(); g.arc(435, y + 360, 38, 0, 7); g.fill();
    g.fillStyle = "#1d1b22"; g.font = "900 96px Montserrat, sans-serif"; g.fillText("YOU", 620, y + 390);
  }
  g.fillStyle = "#f5c9a0"; g.beginPath(); g.roundRect(380, y + 420, 320, 300, 80); g.fill(); g.stroke(); // the hand
  g.restore();
}, [k, time, front, took, t]);

/** a phone: the thread with Home; one of you types "On my way." */
const Phone6: React.FC<{ f: number; f0: number; mode: "it" | "you" }> = ({ f, f0, mode }) => useCanvas((g) => {
  g.fillStyle = "#07030a"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 900, 100, W / 2, 900, 900); glow.addColorStop(0, mode === "you" ? "rgba(255,200,120,0.3)" : "rgba(120,150,210,0.25)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const px = 170, py = 430, pw = 740, ph = 1420;
  g.fillStyle = "#121318"; g.beginPath(); g.roundRect(px - 26, py - 26, pw + 52, ph + 52, 90); g.fill();
  g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 70); g.clip();
  g.fillStyle = "#0c0d12"; g.fillRect(px, py, pw, ph);
  g.fillStyle = "#ffffff"; g.font = "800 30px Montserrat, sans-serif"; g.textBaseline = "middle"; g.textAlign = "left";
  // at G both phones have one bar again
  for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? "#ffffff" : "rgba(255,255,255,0.25)"; g.fillRect(px + 50 + i * 16, py + 66 - (i + 1) * 8, 10, (i + 1) * 8); }
  g.textAlign = "right"; g.fillStyle = "#ff4a3a"; g.fillText("1%", px + pw - 50, py + 54);
  g.fillStyle = "#1b1d24"; g.fillRect(px, py + 90, pw, 120);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.font = "900 40px Montserrat, sans-serif"; g.fillText("Home", W / 2, py + 150);
  const bubble = (txt: string, mine: boolean, y: number, a = 1) => {
    g.globalAlpha = a; g.font = "800 40px Montserrat, sans-serif"; const tw = g.measureText(txt).width + 80;
    g.fillStyle = mine ? "#2f7cf6" : "#2a2d36"; g.beginPath(); g.roundRect(mine ? px + pw - 60 - tw : px + 60, y, tw, 100, 44); g.fill();
    g.fillStyle = "#ffffff"; g.textAlign = "left"; g.fillText(txt, (mine ? px + pw - 60 - tw : px + 60) + 40, y + 50); g.globalAlpha = 1;
  };
  let y = py + 300;
  if (mode === "you") { bubble("Where are you??", false, y, clamp01((f - f0) / 6)); y += 140; }
  // typing: the composer fills letter by letter, then it sends
  const msg = "On my way.", t0 = f0 + (mode === "you" ? 40 : 10), n = Math.max(0, Math.min(msg.length, Math.floor((f - t0) / 2.2))), sent = f >= t0 + msg.length * 2.2 + 8;
  if (sent) bubble(msg, true, y, clamp01((f - (t0 + msg.length * 2.2 + 8)) / 5));
  g.fillStyle = "#1b1d24"; g.fillRect(px, py + ph - 240, pw, 240);
  g.fillStyle = "#2a2d36"; g.beginPath(); g.roundRect(px + 40, py + ph - 200, pw - 80, 90, 45); g.fill();
  g.fillStyle = "#ffffff"; g.textAlign = "left"; g.font = "700 38px Montserrat, sans-serif";
  if (!sent) g.fillText(msg.slice(0, n) + (Math.floor(f / 8) % 2 ? "|" : ""), px + 80, py + ph - 155);
  g.restore();
}, [f, f0, mode]);

/** your hair and its hair, side by side for a moment: the strand runs the other way */
const HairFlash: React.FC<{ a: number }> = ({ a }) => useCanvas((g) => {
  g.globalAlpha = a;
  g.fillStyle = "#1a0605"; g.fillRect(0, 0, W, H);
  const o: FrontOpts = { mode: "stand", expr: "neutral", seed: 3, blink: 0 };
  for (const [i, mirror] of [[0, false], [1, true]] as const) {
    const b = bodyCanvas({ ...YOU_O, badgeBack: true }, o, mirror, 2400);
    g.save(); g.beginPath(); g.rect(i * W / 2, 500, W / 2, 900); g.clip();
    g.drawImage(b, i * W / 2 + W / 4 - 720, 330, 1440, 2400);
    g.restore();
    g.fillStyle = "#ffffff"; g.font = "900 54px Montserrat, sans-serif"; g.textAlign = "center"; g.fillText(i ? "IT" : "YOU", i * W / 2 + W / 4, 1460);
  }
  g.fillStyle = "#ffffff"; g.fillRect(W / 2 - 4, 500, 8, 900);
}, [a]);

/** the three reflections it learned you from */
const Flash: React.FC<{ kind: string; k: number }> = ({ kind, k }) => {
  if (kind === "steel") return (
    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, #5e6a66 0px, #7d8a86 3px, #55605c 7px, #6f7c78 11px)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(170,200,190,0.25) 0%, rgba(10,16,14,0.75) 75%)" }} />
      <div style={{ position: "absolute", left: 300, top: 560, width: 480, height: 820, background: "rgba(40,70,140,0.55)", borderRadius: "180px 180px 40px 40px", filter: "blur(6px)" }} />
      <div style={{ position: "absolute", left: 360, top: 900, width: 360, height: 250, background: "rgba(236,232,222,0.92)", borderRadius: 22, border: "8px solid rgba(20,20,24,0.85)", filter: "blur(1.2px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 96, color: "#1d1b22", transform: "scaleX(-1)", letterSpacing: 4 }}>YOU</div>
        <div style={{ width: 86, height: 110, background: "#8d9db8" }} />
      </div>
      <Tag text="PART 3" />
    </div>);
  if (kind === "water") return <><WaterFace k={k} /><Tag text="PART 4" /></>;
  return <><DeadScreen k={k} /><Tag text="PART 5" /></>;
};
const Tag: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 60, top: 1560, fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 34, color: "rgba(255,255,255,0.75)", letterSpacing: 6 }}>{text}</div>
);
const WaterFace: React.FC<{ k: number }> = ({ k }) => useCanvas((g) => {
  g.fillStyle = "#06191c"; g.fillRect(0, 0, W, H);
  const b = bodyCanvas(YOU_O, { mode: "stand", expr: "smile", headTilt: -6, blink: 0, seed: 3 }, true, 2600); // a reflection: mirrored
  g.globalAlpha = 0.75; g.drawImage(b, W / 2 - 780, 340, 1560, 2600); g.globalAlpha = 1;
  g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(8,48,58,0.45)"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
  for (let i = 0; i < 3; i++) { const r = 200 + 500 * ((k + i / 3) % 1); g.strokeStyle = `rgba(200,235,240,${(0.25 * (1 - ((k + i / 3) % 1))).toFixed(3)})`; g.lineWidth = 8; g.beginPath(); g.ellipse(W / 2, 800, r, r * 0.8, 0, 0, 7); g.stroke(); }
}, [k]);
const DeadScreen: React.FC<{ k: number }> = ({ k }) => useCanvas((g) => {
  g.fillStyle = "#030504"; g.fillRect(0, 0, W, H);
  const pw = W * 0.96, ph = pw * 0.625, x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 - 40;
  g.fillStyle = "#111514"; g.fillRect(x0 - 34, y0 - 34, pw + 68, ph + 68); g.fillStyle = "#050707"; g.fillRect(x0, y0, pw, ph);
  g.save(); g.beginPath(); g.rect(x0, y0, pw, ph); g.clip(); g.globalAlpha = 0.4;
  g.translate(W / 2, y0 + ph * 0.6); g.scale(-0.78, 0.78); g.translate(-300, -430);
  bodyFront(new Pen(g), YOU_O, { mode: "stand", expr: "fear", seed: 3, blink: 0 }); g.restore();
  void k;
}, [k]);

/** the full card: rule 2, then rule 3 */
const Card: React.FC<{ hot: number; k: number }> = ({ hot, k }) => useCanvas((g) => {
  g.fillStyle = "#1a0605"; g.fillRect(0, 0, W, H);
  const cv = document.createElement("canvas"); cv.width = 720; cv.height = 1000; drawCardFull(cv.getContext("2d")!, 720, 1000, hot);
  const s = 1.32 + 0.1 * k, cy = hot === 3 ? 760 : 560;
  g.save(); g.translate(W / 2, 900); g.scale(s, s); g.translate(-360, -cy); g.drawImage(cv, 0, 0); g.restore();
  g.globalCompositeOperation = "multiply"; g.fillStyle = "#ffcfc4"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
  const vg = g.createRadialGradient(W / 2, 900, 300, W / 2, 900, 1100); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(40,0,0,0.6)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}, [hot, k]);

/** the epilogue: in the car's brushed steel, the one in the corner, reflected: its badge reads YOU */
const SteelYou: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, #5e6a66 0px, #7d8a86 3px, #55605c 7px, #6f7c78 11px)" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(190,200,170,0.25) 0%, rgba(10,16,14,0.75) 75%)" }} />
    <div style={{ position: "absolute", left: 300, top: 560, width: 480, height: 820, background: "rgba(120,124,130,0.6)", borderRadius: "180px 180px 40px 40px", filter: "blur(6px)" }} />
    <div style={{ position: "absolute", left: 398, top: 600, width: 14, height: 330, background: "rgba(200,40,34,0.85)", transform: "rotate(14deg)", filter: "blur(1px)" }} />
    <div style={{ position: "absolute", left: 668, top: 600, width: 14, height: 330, background: "rgba(200,40,34,0.85)", transform: "rotate(-14deg)", filter: "blur(1px)" }} />
    <div style={{ position: "absolute", left: 360, top: 900, width: 360, height: 250, background: "rgba(236,232,222,0.92)", borderRadius: 22, border: "8px solid rgba(20,20,24,0.85)", filter: "blur(1.2px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ width: 86, height: 110, background: "#8d9db8" }} />
      <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 96, color: "#1d1b22", letterSpacing: 4 }}>YOU</div>
    </div>
    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(0,0,0,0.06) 2px, rgba(255,255,255,0.03) 5px)" }} />
  </div>
);

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const g = srcFrame(f);
  const s = shotAt(g);
  const els: React.ReactNode[] = [];
  const rw = f >= REWIND[0] && f < REWIND[1];
  const inR = (r: [number, number], x = g) => x >= r[0] && x < r[1];
  const u = (r: [number, number]) => clamp01((g - r[0]) / (r[1] - r[0]));
  // ---- 2D inserts (by the source frame, so the rewind plays them backwards too) ----
  if (f < TEASER) els.push(<Gold key="goldT" k={0.15 + 0.5 * (f / TEASER)} />);
  if (inR(GOLD_A)) els.push(<Gold key="goldA" k={u(GOLD_A)} />);
  if (inR(GOLD_B)) els.push(<Gold key="goldB" k={u(GOLD_B)} />);
  if (inR(SLOT_A)) els.push(<Slot key="slotA" k={clamp01((g - cue(3, "swipes") + 4) / 14)} time="05:59" front={false} took={g >= cue(3, "takes")} t={u(SLOT_A)} />);
  if (inR(SLOT_B)) els.push(<Slot key="slotB" k={clamp01((g - cue(17, "swipe") + 4) / 14)} time="05:59:59" front={true} took={g >= cue(17, "badge") + 6} t={u(SLOT_B)} />);
  if (inR(PHONE_A)) els.push(<Phone6 key="phA" f={g} f0={PHONE_A[0]} mode="it" />);
  if (inR(PHONE_B)) els.push(<Phone6 key="phB" f={g} f0={PHONE_B[0]} mode="you" />);
  if (inR(HAIR_FLASH)) els.push(<HairFlash key="hair" a={Math.min(1, (g - HAIR_FLASH[0]) / 2, (HAIR_FLASH[1] - g) / 2)} />);
  for (const [a, b, kind] of FLASHES) if (g >= a && g < b) els.push(<Flash key={"fl" + kind} kind={kind} k={(g - a) / (b - a)} />);
  if (inR(CARD_2D)) els.push(<Card key="card" hot={g >= RULE3_AT ? 3 : 2} k={u(CARD_2D)} />);
  if (inR(STEEL_E)) els.push(<SteelYou key="steelE" />);
  // frame-1 hook text over the cold open (works muted)
  if (f < TEASER) {
    const a = clamp01((TEASER - f) / 4);
    els.push(
      <div key="hook" style={{ position: "absolute", top: 410, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#ffffff", fontSize: 84, lineHeight: 1.05, letterSpacing: 1, WebkitTextStroke: "14px #0d0a10", paintOrder: "stroke fill" }}>
        <div><span style={{ color: "#ffb347" }}>06:00.</span></div>
        <div>ONLY ONE</div>
        <div><span style={{ color: "#ff4a3a" }}>WALKS OUT</span>.</div>
      </div>);
  }
  // recap: Part 5's two choices
  if (s.id === 1 && f >= TEASER) els.push(...tags(1, f, RECAP_ANCHORS, TEASER + 6, [f > TEASER + 14 && f < TEASER + 44 ? 1 : 0, f >= TEASER + 44 ? 1 : 0], "r"));
  if (VOTES && s.id === 1 && f >= TEASER + 10) {
    const k = pop(f, TEASER + 10, 8);
    els.push(<div key="votes" style={{ position: "absolute", left: W / 2, top: 760, transform: `translate(-50%, -50%) scale(${k})`, background: "rgba(10,12,18,0.88)", border: "5px solid #ffb347", borderRadius: 26, padding: "14px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 40, color: "#ffffff", whiteSpace: "nowrap", textAlign: "center" }}>
      <div style={{ fontSize: 30, color: "#ffb347", letterSpacing: 4 }}>YOU VOTED</div>
      <div><span style={{ color: "#7fb0ff" }}>1</span> ONE {VOTES.a}% · <span style={{ color: "#ff7a6a" }}>2</span> TWO {VOTES.b}%</div>
    </div>);
  }
  // branch badge
  const br = branchAt(g);
  if (br && !rw && !inR(CARD_2D)) {
    const t = br === 1 ? RECAP_ANCHORS[0] : RECAP_ANCHORS[1], b0 = br === 1 ? SH[9].a : SH[2].a;
    els.push(<Pill key="badge" n={t.n} label={t.label} color={t.color} x={W / 2 - 90} y={430} s={0.85 * pop(f, b0, 8)} hot={0} />);
  }
  // VHS rewind
  if (rw) {
    const uu = f - REWIND[0], band = (uu * 61) % (H + 200) - 100;
    els.push(
      <div key="scan" style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)" }} />,
      <div key="band" style={{ position: "absolute", left: 0, top: band, width: W, height: 70, background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.05) 100%)" }} />,
      <div key="rw" style={{ position: "absolute", left: 80, top: 420, display: "flex", alignItems: "center", gap: 18, opacity: Math.floor(uu / 8) % 2 ? 1 : 0.85 }}>
        <svg width={110} height={64}><polygon points="52,0 52,64 0,32" fill="#ffffff" /><polygon points="108,0 108,64 56,32" fill="#ffffff" /></svg>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 58, color: "#ffffff", letterSpacing: 6, textShadow: "3px 0 0 rgba(255,40,60,0.7), -3px 0 0 rgba(40,200,255,0.7)" }}>REWIND</div>
      </div>);
  }
  // HUD: until the epilogue (none there)
  if (f >= TEASER && g < T0(20) && !rw && !inR(CARD_2D) && !inR(PHONE_A) && !inR(PHONE_B)) {
    const left = hudLeftAt(g), p = (n: number) => String(n).padStart(2, "0");
    const txt = `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;
    const jump = [0, 1, 2, 3].some((k) => Math.abs(hudLeftAt(g - k) - hudLeftAt(g - k - 1)) > 5) ? 1 : 0;
    els.push(<div key="hud" style={{ position: "absolute", right: 44, top: 396, background: "rgba(6,8,12,0.82)", border: "4px solid #ff4a3a", borderRadius: 18, padding: "6px 16px 8px", textAlign: "center", fontFamily: "Montserrat, sans-serif", color: "#ffffff", transform: `scale(${1 + 0.12 * jump})` }}>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 3, color: "#ffffff" }}>FLOOR {hudFloorAt(g)}<span style={{ color: "#ffb347" }}> · TO 06:00</span></div>
      <div style={{ fontWeight: 900, fontSize: 42, color: jump ? "#ffffff" : "#ff4a3a", letterSpacing: 2, textShadow: "0 0 12px rgba(255,60,40,0.6)" }}>{txt}</div>
    </div>);
  }
  // the title, over the last corner shot (no end card: the last frame loops into Part 1)
  if (f >= TITLE_AT) {
    const a = clamp01((f - TITLE_AT) / 24);
    els.push(<div key="title" style={{ position: "absolute", left: 0, top: 560, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 120, color: "#ffffff", letterSpacing: 14, WebkitTextStroke: "12px #0d0a10", paintOrder: "stroke fill", textShadow: "0 0 40px rgba(0,0,0,0.6)" }}>FLOOR<br />ZERO</div>);
  }
  void TOTAL; void camAt;
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
