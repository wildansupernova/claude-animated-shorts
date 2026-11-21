// Story graphics for "Floor Zero, Part 5": the cold-open hook text, the HUD (floor + the clock to 06:00), Part 4's two tags
// over the recap, the branch badge, the VHS rewind, and the 2D inserts (canvas, drawn per frame): the wall of monitors
// (you turned round, it still behind you; then the monitors dying), one monitor (it one step behind, its legs never
// moving), a dead screen holding your reflection, the door on -5 and the wall of photos (the empty frame: YOU · 21 NOV),
// the phone (No Service; "Leaving now", "OK. See you soon"), the clock in the dark; then ① / ② on the two of you.
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { camAt, shotAt, SH, TAGS_AT, TAG1_HOT, TAG2_HOT, TAG_ANCHORS, RECAP_ANCHORS, REWIND, branchAt, clamp01, TEASER, VOTES, TOTAL, hudLeftAt, hudFloorAt, CTA_AT, cctvAt, glide, smooth,
  srcFrame, DIE0, DIE1, BLACK_W, DEAD_REFL, DOOR5, PHOTOS, PHONE, MSG_AT, THREAD_AT, SENT_AT, LIGHT_DIES, LIGHT_BACK, cue, T0 } from "./story";
import { drawCCTV, clockOf, CC } from "./cctv";
import { Pen, bodyFront, Outfit } from "./toon";
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
const hash = (i: number) => { const v = Math.sin(i * 127.1) * 43758.5453; return v - Math.floor(v); };
const staticNoise = (g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, seed: number) => {
  g.fillStyle = "#1a201c"; g.fillRect(x0, y0, w, h);
  for (let i = 0; i < 700; i++) { const a = hash(i * 3.1 + seed), b = hash(i * 7.7 + seed * 1.3), c = hash(i + seed * 2.9); g.fillStyle = `rgba(${200 * c},${255 * c},${215 * c},0.9)`; g.fillRect(x0 + a * w, y0 + b * h, 3, 2); }
};

/** every monitor at once; `dieAt` (frames) kills them one by one (a burst of static, then black) */
const FeedWall: React.FC<{ f: number; push: number; dieAt?: number[] }> = ({ f, push, dieAt }) => useCanvas((g) => {
  g.fillStyle = "#030605"; g.fillRect(0, 0, W, H);
  const c = cctvAt(f), k = 1 + 0.07 * push;
  g.translate(W / 2, 1150); g.scale(k, k); g.translate(-W / 2, -1150);
  const glow = g.createRadialGradient(W / 2, 1150, 200, W / 2, 1150, 1000);
  glow.addColorStop(0, "rgba(60,200,110,0.2)"); glow.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = glow; g.fillRect(-200, 0, W + 400, H);
  const mw = 500, mh = 312;
  for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) {
    const i = r * 2 + q, x0 = 26 + q * (mw + 28), y0 = 640 + r * (mh + 44), d = dieAt ? dieAt[i] : Infinity;
    g.fillStyle = "#101413"; g.fillRect(x0 - 12, y0 - 12, mw + 24, mh + 24);
    if (f >= d) { g.fillStyle = "#020303"; g.fillRect(x0, y0, mw, mh); continue; }
    if (f >= d - 4) { staticNoise(g, x0, y0, mw, mh, f * 13 + i); continue; }
    g.save(); g.beginPath(); g.rect(x0, y0, mw, mh); g.clip(); g.translate(x0, y0);
    drawCCTV(g, mw, mh, { t: c.t + 0.13 * i, raise: 0, fig: c.fig, clock: clockOf(c.left), turned: c.turned, walk: c.walk });
    g.restore();
  }
  const vg = g.createRadialGradient(W / 2, 1150, 300, W / 2, 1150, 1100);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)"); g.fillStyle = vg; g.fillRect(-200, 0, W + 400, H + 200);
}, [f, push, dieAt]);

/** one desk monitor, close: the live feed, optionally zoomed (zx, zy in the feed's 640 x 400 design space) */
const Feed: React.FC<{ f: number; sc: number; zoom: number; zx: number; zy: number }> = ({ f, sc, zoom, zx, zy }) => useCanvas((g) => {
  g.fillStyle = "#040806"; g.fillRect(0, 0, W, H);
  const pw = W * 0.96 * sc, ph = pw * 0.625, x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 - 40;
  const glow = g.createRadialGradient(W / 2, y0 + ph / 2, ph * 0.3, W / 2, y0 + ph / 2, ph * 1.3);
  glow.addColorStop(0, "rgba(60,200,110,0.18)"); glow.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = "#111514"; g.fillRect(x0 - 34 * sc, y0 - 34 * sc, pw + 68 * sc, ph + 68 * sc);
  g.save(); g.beginPath(); g.rect(x0, y0, pw, ph); g.clip(); g.translate(x0, y0);
  const c = cctvAt(f);
  drawCCTV(g, pw, ph, { t: c.t, raise: 0, fig: c.fig, clock: clockOf(c.left), zoom, zx, zy, walk: c.walk, turned: c.turned });
  g.restore();
}, [f, sc, zoom, zx, zy]);

/** a screen gone black, holding your reflection for a moment (mirrored, so its badge reads UOY) */
const DeadScreen: React.FC<{ k: number }> = ({ k }) => useCanvas((g) => {
  g.fillStyle = "#030504"; g.fillRect(0, 0, W, H);
  const pw = W * 0.96, ph = pw * 0.625, x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 - 40;
  g.fillStyle = "#111514"; g.fillRect(x0 - 34, y0 - 34, pw + 68, ph + 68);
  g.fillStyle = "#050707"; g.fillRect(x0, y0, pw, ph);
  g.save(); g.beginPath(); g.rect(x0, y0, pw, ph); g.clip();
  g.globalAlpha = 0.32 * Math.min(1, k * 4, (1 - k) * 4);
  g.translate(W / 2, y0 + ph * 0.6); g.scale(-0.78, 0.78); g.translate(-300, -430);
  bodyFront(new Pen(g), YOU_O, { mode: "stand", expr: "fear", seed: 3, blink: 0 });
  g.restore();
  const sh = g.createLinearGradient(x0, y0, x0 + pw, y0 + ph); sh.addColorStop(0, "rgba(160,190,180,0.08)"); sh.addColorStop(0.5, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(160,190,180,0.04)");
  g.fillStyle = sh; g.fillRect(x0, y0, pw, ph);
}, [k]);

const SEPIA = (g: CanvasRenderingContext2D) => {
  g.globalCompositeOperation = "color"; g.fillStyle = "#a8865a"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "multiply"; g.fillStyle = "#e9d6b4"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
};
/** -5: the landing door stands open, warm sepia light beyond it */
const Door5: React.FC<{ k: number }> = ({ k }) => useCanvas((g) => {
  const s = 1 + 0.5 * glide(k);
  g.fillStyle = "#120806"; g.fillRect(0, 0, W, H);
  g.translate(W / 2, 980); g.scale(s, s); g.translate(-W / 2, -980);
  g.fillStyle = "#2a1410"; g.fillRect(250, 420, 580, 1120);
  const lt = g.createLinearGradient(0, 470, 0, 1500); lt.addColorStop(0, "#d9b98a"); lt.addColorStop(1, "#8c6a44");
  g.fillStyle = lt; g.fillRect(300, 470, 480, 1060);
  // the frames on the far wall, glimpsed
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { g.fillStyle = "#3a2a1a"; g.fillRect(340 + q * 150, 560 + r * 220, 110, 150); g.fillStyle = "#b89a70"; g.fillRect(352 + q * 150, 572 + r * 220, 86, 112); }
  // the door, swung open toward us
  g.fillStyle = "#1c0c0a"; g.beginPath(); g.moveTo(780, 470); g.lineTo(960, 380); g.lineTo(960, 1640); g.lineTo(780, 1530); g.fill();
  g.fillStyle = "#e8e0d0"; g.font = "900 90px Montserrat, sans-serif"; g.textAlign = "center"; g.fillText("-5", 540, 395);
  const spill = g.createLinearGradient(0, 1530, 0, 1900); spill.addColorStop(0, "rgba(217,185,138,0.5)"); spill.addColorStop(1, "rgba(217,185,138,0)");
  g.fillStyle = spill; g.beginPath(); g.moveTo(300, 1530); g.lineTo(780, 1530); g.lineTo(980, 1900); g.lineTo(100, 1900); g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0); SEPIA(g);
}, [k]);

/** -5: a wall of photos, one for every Friday, each of someone from behind, facing a wall; the newest frame is empty */
const PH_O: Outfit[] = [
  { jacket: "#6b6f78", pants: "#2e3038", boots: "#1b1c20", skin: "#e8c7a8", hat: "hair", hair: "#2a1f18", buttons: "none" },
  { jacket: "#3e4a63", pants: "#272b36", boots: "#1b1c20", skin: "#c99572", hat: "hair", hair: "#121216", buttons: "none", build: "tall" },
  { jacket: "#7a5a44", pants: "#3a2f2a", boots: "#1b1c20", skin: "#f0d2b6", hat: "hair", hair: "#7a5a3a", buttons: "none" },
  { jacket: "#5b6b4e", pants: "#2c3328", boots: "#1b1c20", skin: "#a7714f", hat: "hair", hair: "#1a1410", buttons: "none" },
  { jacket: "#7b3b3f", pants: "#2e2628", boots: "#1b1c20", skin: "#eccdb0", hat: "hair", hair: "#3a2a22", buttons: "none" },
];
const HALE_O: Outfit = { jacket: "#727986", pants: "#3a3d45", boots: "#141518", skin: "#d9d2ca", hat: "hair", hair: "#121216", buttons: "none", build: "tall", collar: "#ece9e2" };
const NAMES = ["R. OKAFOR", "M. LINDQVIST", "J. PRAKASH", "S. MORENO", "T. NAKAMURA", "E. WALSH", "A. HADDAD", "L. CHEN", "K. MBEKI", "P. ROSSI",
  "N. IVANOVA", "C. DUBOIS", "B. SANTOS", "F. AHMED", "G. KOWALSKI", "H. TAN", "D. OKONJO", "I. BERG", "V. MARCHETTI", "Y. SATO", "O. NOWAK", "Z. KHAN",
  "W. HUGHES", "Q. LIANG", "U. FISCHER", "X. ROMERO", "A. LEVI", "B. ODUYA", "C. PARK", "D. SILVA", "E. KARLSSON", "F. MENDES", "G. ADEYEMI", "H. JANSEN",
  "I. RAHMAN", "J. COSTA", "K. VOGEL", "L. OYELARAN", "M. FERREIRA", "N. HOLM", "O. DIALLO", "P. NGUYEN", "R. BIANCHI", "S. EKSTROM", "T. MWANGI"];
/** Fridays back from 21 NOV: k = 0 is 21 NOV, 1 is 14 NOV, ... */
const friday = (k: number) => {
  const d = new Date(Date.UTC(2025, 10, 21 - 7 * k));
  return `${d.getUTCDate()} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getUTCMonth()]}`;
};
const COLSP = 5, ROWSP = 9, FW = 200, FH = 250, GX = 40, GY = 96;
const PhotoWall: React.FC<{ k: number; plate: number }> = ({ k, plate }) => useCanvas((g) => {
  // a slow pan across the wall, landing on the newest (empty) frame, then a push onto its plate
  const total = COLSP * ROWSP, empty = total - 1;
  const ex = (empty % COLSP) * (FW + GX), ey = Math.floor(empty / COLSP) * (FH + GY);
  // wide enough at the start to see all five columns (the dates read on, week by week), then in to the newest frame
  const pan = glide(k), sc = 0.82 + 0.68 * pan + 1.1 * glide(plate);
  const pl = glide(plate), cx0 = (COLSP * (FW + GX) - GX) / 2, cx = cx0 + (ex + FW / 2 - cx0) * pan - (FW / 2 + 20) * pl, cy = 520 + (ey + FH / 2 - 520) * pan + (FH / 2 + 30) * pl;
  g.fillStyle = "#6e5a40"; g.fillRect(0, 0, W, H);
  g.translate(W / 2, 900); g.scale(sc, sc); g.translate(-cx, -cy);
  for (let i = 0; i < total; i++) {
    const x = (i % COLSP) * (FW + GX), y = Math.floor(i / COLSP) * (FH + GY), wk = total - 1 - i;
    g.fillStyle = "#2b2016"; g.fillRect(x - 12, y - 12, FW + 24, FH + 24);
    g.fillStyle = "#cbb894"; g.fillRect(x, y, FW, FH);
    if (i !== empty) {
      // someone from behind, facing a blank wall
      g.fillStyle = "#b6a27c"; g.fillRect(x, y, FW, FH * 0.62);
      g.save(); g.beginPath(); g.rect(x, y, FW, FH); g.clip();
      g.translate(x + FW / 2, y + FH + 8); g.scale(0.27, 0.27); g.translate(-300, -975);
      bodyFront(new Pen(g), i === empty - 1 ? HALE_O : PH_O[(i * 7) % PH_O.length], { mode: "stand", back: true, ears: true, seed: 3 + (i % 5) });
      g.restore();
    }
    // the brass plate
    g.fillStyle = "#3a2c1c"; g.fillRect(x + 10, y + FH + 22, FW - 20, 44);
    g.fillStyle = "#f2e6cc"; g.font = "800 21px Montserrat, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const nm = i === empty ? "YOU" : i === empty - 1 ? "D. HALE" : NAMES[(i * 7) % NAMES.length];
    g.fillText(`${nm} · ${friday(wk)}`, x + FW / 2, y + FH + 45, FW - 28);
  }
  g.setTransform(1, 0, 0, 1, 0, 0); SEPIA(g);
  const vg = g.createRadialGradient(W / 2, 900, 300, W / 2, 900, 1150); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,10,0,0.7)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}, [k, plate]);

/** your phone: No Service, 1 %; a message gets through; the thread with Home */
const Phone: React.FC<{ f: number }> = ({ f }) => useCanvas((g) => {
  g.fillStyle = "#07030a"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 900, 100, W / 2, 900, 900); glow.addColorStop(0, "rgba(120,150,210,0.25)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const px = 170, py = 430, pw = 740, ph = 1420;
  g.fillStyle = "#121318"; g.beginPath(); g.roundRect(px - 26, py - 26, pw + 52, ph + 52, 90); g.fill();
  g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 70); g.clip();
  const thread = f >= THREAD_AT;
  g.fillStyle = thread ? "#0c0d12" : "#1b2a44"; g.fillRect(px, py, pw, ph);
  const left = hudLeftAt(f), s0 = 6 * 3600 - left, hh = String(Math.floor(s0 / 3600)).padStart(2, "0"), mm = String(Math.floor(s0 / 60) % 60).padStart(2, "0");
  g.fillStyle = "#ffffff"; g.font = "800 30px Montserrat, sans-serif"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("No Service", px + 50, py + 54);
  g.textAlign = "right"; g.fillStyle = "#ff4a3a"; g.fillText("1%", px + pw - 50, py + 54);
  if (!thread) {
    g.textAlign = "center"; g.fillStyle = "#ffffff"; g.font = "900 150px Montserrat, sans-serif"; g.fillText(`${hh}:${mm}`, W / 2, py + 270);
    if (f >= MSG_AT) {
      const a = clamp01((f - MSG_AT) / 6), yy = py + 470 - 30 * (1 - a);
      g.globalAlpha = a; g.fillStyle = "rgba(240,244,250,0.92)"; g.beginPath(); g.roundRect(px + 40, yy, pw - 80, 170, 34); g.fill();
      g.fillStyle = "#30b85a"; g.beginPath(); g.roundRect(px + 70, yy + 35, 70, 70, 18); g.fill();
      g.fillStyle = "#14161c"; g.textAlign = "left"; g.font = "900 34px Montserrat, sans-serif"; g.fillText("Home", px + 165, yy + 58);
      g.font = "700 32px Montserrat, sans-serif"; g.fillText("OK. See you soon", px + 165, yy + 112);
      heart(g, px + 470, yy + 112, 15);
      g.globalAlpha = 1;
    }
  } else {
    g.fillStyle = "#1b1d24"; g.fillRect(px, py + 90, pw, 120);
    g.fillStyle = "#ffffff"; g.textAlign = "center"; g.font = "900 40px Montserrat, sans-serif"; g.fillText("Home", W / 2, py + 150);
    // the sent bubble: "Leaving now" 05:41 (highlighted once the narration gets to it)
    const hot = f >= SENT_AT ? 0.5 + 0.5 * Math.sin((f - SENT_AT) * 0.3) : 0;
    g.fillStyle = "#8e96a8"; g.font = "700 26px Montserrat, sans-serif"; g.fillText("05:41", W / 2, py + 330);
    g.fillStyle = "#2f7cf6"; g.beginPath(); g.roundRect(px + pw - 420, py + 380, 360, 100, 44); g.fill();
    if (hot) { g.strokeStyle = `rgba(255,214,90,${(0.5 + 0.5 * hot).toFixed(3)})`; g.lineWidth = 10; g.stroke(); }
    g.fillStyle = "#ffffff"; g.font = "800 40px Montserrat, sans-serif"; g.textAlign = "center"; g.fillText("Leaving now", px + pw - 240, py + 430);
    g.fillStyle = "#8e96a8"; g.font = "700 24px Montserrat, sans-serif"; g.textAlign = "right"; g.fillText("Delivered", px + pw - 64, py + 510);
    // the reply
    const a = clamp01((f - THREAD_AT) / 6);
    g.globalAlpha = a; g.fillStyle = "#2a2d36"; g.beginPath(); g.roundRect(px + 60, py + 570, 470, 100, 44); g.fill();
    g.fillStyle = "#ffffff"; g.textAlign = "left"; g.font = "800 40px Montserrat, sans-serif"; g.fillText("OK. See you soon", px + 100, py + 620);
    heart(g, px + 490, py + 620, 16);
    g.fillStyle = "#8e96a8"; g.font = "700 24px Montserrat, sans-serif"; g.fillText(`${hh}:${mm}`, px + 70, py + 700);
    g.globalAlpha = 1;
  }
  g.restore();
}, [f]);
const heart = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  g.fillStyle = "#e2453c"; g.beginPath(); g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill();
};

/** in the dark: only the clock's red digits, faint */
const DarkClock: React.FC<{ a: number }> = ({ a }) => (
  <div style={{ position: "absolute", left: 0, top: 820, width: W, textAlign: "center", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 120, color: "#ff3b2a", opacity: a, textShadow: "0 0 30px rgba(255,40,20,0.7)", letterSpacing: 6 }}>05:57</div>
);

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const g = srcFrame(f);
  const s = shotAt(g);
  const els: React.ReactNode[] = [];
  const rw = f >= REWIND[0] && f < REWIND[1], signShot = s.id === 14;
  const inR = (r: [number, number], x = g) => x >= r[0] && x < r[1];
  // ---- 2D inserts (by the source frame, so the rewind plays them backwards too) ----
  const wallT: [number, number] = [T0(3), T0(4)], wallD: [number, number] = [T0(5), BLACK_W[0]];
  const DIES = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => Math.round(DIE0 + ((DIE1 - DIE0) * [5, 2, 7, 0, 4, 6, 1, 3][i]) / 7));
  let insert = false;
  if (inR(wallT)) { els.push(<FeedWall key="wallT" f={g} push={(g - wallT[0]) / (wallT[1] - wallT[0])} />); insert = true; }
  if (inR(wallD)) { els.push(<FeedWall key="wallD" f={g} push={(g - wallD[0]) / (wallD[1] - wallD[0])} dieAt={DIES} />); insert = true; }
  if (s.id === 8) {
    const z = glide((g - cue(8, "exactly") + 6) / 20);
    els.push(<Feed key="feed" f={g} sc={1 + 0.35 * z} zoom={1 + 0.75 * z} zx={322} zy={330} />); insert = true;
  }
  if (inR(DEAD_REFL)) { els.push(<DeadScreen key="dead" k={(g - DEAD_REFL[0]) / (DEAD_REFL[1] - DEAD_REFL[0])} />); insert = true; }
  if (inR(DOOR5)) { els.push(<Door5 key="door5" k={(g - DOOR5[0]) / (DOOR5[1] - DOOR5[0])} />); insert = true; }
  if (inR(PHOTOS)) {
    const k = clamp01((g - PHOTOS[0]) / (cue(13, "empty") + 4 - PHOTOS[0])), pl = clamp01((g - cue(13, "your") + 4) / 22);
    els.push(<PhotoWall key="photos" k={k} plate={pl} />); insert = true;
  }
  if (inR(PHONE)) { els.push(<Phone key="phone" f={g} />); insert = true; }
  if (inR([LIGHT_DIES, LIGHT_BACK])) els.push(<DarkClock key="dark" a={0.3 + 0.1 * Math.sin(g * 0.2)} />);
  // frame-1 hook text over the cold open (works muted)
  if (f < TEASER) {
    const a = clamp01((TEASER - f) / 4);
    els.push(
      <div key="hook" style={{ position: "absolute", top: 410, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#ffffff", fontSize: 84, lineHeight: 1.05, letterSpacing: 1, WebkitTextStroke: "14px #0d0a10", paintOrder: "stroke fill" }}>
        <div><span style={{ color: "#ff4a3a" }}>05:57.</span></div>
        <div>THERE ARE <span style={{ color: "#ffb347" }}>TWO</span></div>
        <div>OF YOU.</div>
      </div>);
  }
  // recap: Part 4's two choices
  if (s.id === 1 && f >= TEASER) els.push(...tags(1, f, RECAP_ANCHORS, TEASER + 6, [f > TEASER + 14 && f < TEASER + 44 ? 1 : 0, f >= TEASER + 44 ? 1 : 0], "r"));
  if (VOTES && s.id === 1 && f >= TEASER + 10) {
    const k = pop(f, TEASER + 10, 8);
    els.push(<div key="votes" style={{ position: "absolute", left: W / 2, top: 760, transform: `translate(-50%, -50%) scale(${k})`, background: "rgba(10,12,18,0.88)", border: "5px solid #ffb347", borderRadius: 26, padding: "14px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 40, color: "#ffffff", whiteSpace: "nowrap", textAlign: "center" }}>
      <div style={{ fontSize: 30, color: "#ffb347", letterSpacing: 4 }}>YOU VOTED</div>
      <div><span style={{ color: "#7fb0ff" }}>1</span> TURN AROUND {VOTES.a}% · <span style={{ color: "#ff7a6a" }}>2</span> KEEP WALKING {VOTES.b}%</div>
    </div>);
  }
  // branch badge
  const br = branchAt(g);
  if (br && !rw) {
    const t = br === 1 ? RECAP_ANCHORS[0] : RECAP_ANCHORS[1], b0 = br === 1 ? SH[2].a : SH[7].a;
    els.push(<Pill key="badge" n={t.n} label={t.label} color={t.color} x={W / 2 - 90} y={430} s={0.85 * pop(f, b0, 8)} hot={0} />);
  }
  // VHS rewind
  if (rw) {
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
  // HUD: the floor and the clock to 06:00 (the dark eats time)
  if (f >= TEASER && f < TOTAL && !rw && !signShot && !inR(PHONE)) {
    const left = hudLeftAt(g), p = (n: number) => String(n).padStart(2, "0");
    const txt = `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;
    const jump = [0, 1, 2, 3].some((k) => hudLeftAt(g - k) - hudLeftAt(g - k - 1) > 60 || hudLeftAt(g - k - 1) - hudLeftAt(g - k) > 60) ? 1 : 0;
    els.push(<div key="hud" style={{ position: "absolute", right: 44, top: 396, background: "rgba(6,8,12,0.82)", border: "4px solid #ff4a3a", borderRadius: 18, padding: "6px 16px 8px", textAlign: "center", fontFamily: "Montserrat, sans-serif", color: "#ffffff", transform: `scale(${1 + 0.12 * jump})` }}>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 3, color: "#ffffff" }}>FLOOR {hudFloorAt(g)}<span style={{ color: "#ffb347" }}> · TO 06:00</span></div>
      <div style={{ fontWeight: 900, fontSize: 42, color: jump ? "#ffffff" : "#ff4a3a", letterSpacing: 2, textShadow: "0 0 12px rgba(255,60,40,0.6)" }}>{txt}</div>
    </div>);
  }
  // ① and ②: on the two of you (each on its word), then pinned for the question
  if (f >= TAGS_AT && (s.id === 20 || s.id === 21)) {
    const hot = (r: [number, number]) => (f >= r[0] && f < r[1] ? 0.5 + 0.5 * Math.sin((f - r[0]) * 0.35) : 0);
    TAG_ANCHORS.forEach((t, i) => {
      const f0 = i === 0 ? TAGS_AT : cue(26) - 2, sc = pop(f, f0);
      if (sc <= 0) return;
      const [ax, ay, z] = project(s.id, f, t.at), [px, py] = t.pill;
      if (z <= 1) els.push(<svg key={"ln" + i} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, sc) }}><line x1={px} y1={py + 40} x2={ax} y2={ay} stroke="#ffffff" strokeWidth={5} /><circle cx={ax} cy={ay} r={16} fill={t.color} stroke="#ffffff" strokeWidth={6} /></svg>);
      els.push(<Pill key={"t" + i} n={t.n} label={t.label} color={t.color} x={px} y={py} s={sc * (s.id === 21 ? 1.25 : 1)} hot={hot(i === 0 ? TAG1_HOT : TAG2_HOT)} />);
    });
  }
  if (f >= CTA_AT && s.id === 21) {
    const k = pop(f, CTA_AT, 8) * (1 + 0.04 * Math.sin(f * 0.25));
    els.push(<div key="cta" style={{ position: "absolute", left: W / 2, top: 690, transform: `translate(-50%, -50%) scale(${k})`, display: "flex", alignItems: "center", gap: 14, background: "#ffb347", border: "5px solid #0d0a10", borderRadius: 999, padding: "10px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 46, color: "#0d0a10", letterSpacing: 2, whiteSpace: "nowrap" }}>
      COMMENT 1 OR 2
      <svg width={34} height={40}><polygon points="0,14 34,14 17,40" fill="#0d0a10" /><rect x={11} y={0} width={12} height={16} fill="#0d0a10" /></svg>
    </div>);
  }
  void insert; void smooth; void CC; void TAG1_HOT;
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
