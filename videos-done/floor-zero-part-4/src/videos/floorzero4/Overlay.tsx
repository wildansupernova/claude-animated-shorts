// Story graphics for "Floor Zero, Part 4": the cold-open hook text, the HUD (floor + the clock to 06:00, which jumps after
// the last light dies), Part 3's two tags over the recap, the branch badge (① WADE / ② CLIMB), the VHS rewind, the wrist
// insert (the grey print your reflection left), the security-feed inserts (one monitor, live; then the push-in on the one
// behind you: no face, badge UOY), and the new choice tags (① TURN AROUND / ② KEEP WALKING) on leader lines from their
// 3D anchors, pinned big at the top for the question. Nothing in the top ~20 %.
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { camAt, shotAt, SH, TAGS_AT, TAG1_HOT, TAG2_HOT, TAG_ANCHORS, RECAP_ANCHORS, REWIND, branchAt, clamp01, TEASER, VOTES, TOTAL, hudLeftAt, hudFloorAt, CTA_AT, WRIST, CCTV_PUSH, cctvAt, glide, smooth, WALLS } from "./story";
import { drawCCTV, clockOf, FIG_FACE, FIG_BADGE } from "./cctv";

const W = 1080, H = 1920;
/** the cold open shows the feed as it is with the one behind you (source frame of the feed) */
const WALL_SRC = 1940;
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

/** your right wrist, palm up, the badge in your hand; around the wrist, four grey finger marks and a thumb */
const Wrist: React.FC<{ a: number; k: number }> = ({ a, k }) => {
  const ink = "#141518", skin = "#f5c9a0", print = "rgba(92,101,108,0.9)";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, background: "radial-gradient(ellipse at 50% 45%, #0f2a2c 0%, #041012 70%)" }}>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><filter id="soft"><feGaussianBlur stdDeviation="2.2" /></filter></defs>
        <g transform={`translate(590 ${1060 - 14 * k}) rotate(-118) scale(${1.5 + 0.05 * k})`}>
          {/* forearm, from the sleeve to the hand */}
          <rect x={-980} y={-118} width={1060} height={236} rx={110} fill={skin} stroke={ink} strokeWidth={12} />
          <rect x={-1000} y={-150} width={640} height={300} rx={60} fill="#4f7cc4" stroke={ink} strokeWidth={12} />
          {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={-372 - i * 18} y1={-140} x2={-372 - i * 18} y2={140} stroke="rgba(20,30,60,0.45)" strokeWidth={6} />)}
          {/* the hand, closed on the badge */}
          <ellipse cx={170} cy={0} rx={150} ry={132} fill={skin} stroke={ink} strokeWidth={12} />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={250} y={-112 + i * 58} width={110} height={52} rx={26} fill={skin} stroke={ink} strokeWidth={10} />)}
          {/* the print: four fingers wrapped across the wrist, and a thumb */}
          <g filter="url(#soft)">
            {[0, 1, 2, 3].map((i) => <rect key={i} x={-120 + i * 44} y={-124} width={30} height={232 - (i === 0 || i === 3 ? 24 : 0)} rx={15} fill={print} />)}
            <ellipse cx={-40} cy={104} rx={62} ry={26} fill={print} />
          </g>
        </g>
        {/* the badge in your hand: YOU */}
        <g transform="translate(110 380) rotate(-14) scale(0.8)">
          <line x1={150} y1={210} x2={300} y2={520} stroke="#d23a2e" strokeWidth={22} />
          <rect x={0} y={0} width={320} height={220} rx={22} fill="#e9e5da" stroke={ink} strokeWidth={10} />
          <rect x={26} y={30} width={96} height={124} fill="#8d9db8" />
          <circle cx={74} cy={74} r={28} fill="#3a3d45" /><rect x={42} y={106} width={64} height={48} fill="#3a3d45" />
          <text x={146} y={98} fontFamily="Montserrat, sans-serif" fontWeight={900} fontSize={60} fill="#1d1b22">YOU</text>
          <text x={148} y={140} fontFamily="Montserrat, sans-serif" fontWeight={800} fontSize={22} fill="#6a6458">NIGHT SHIFT</text>
          <rect x={0} y={186} width={320} height={16} fill="#c8362c" />
        </g>
        {/* water still running off */}
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={500 + 90 * Math.sin(i * 2.1)} cy={(1200 + i * 120 + k * 400) % 1800} r={8 + 4 * (i % 3)} fill="rgba(200,235,240,0.5)" />)}
      </svg>
    </div>);
};

/** every monitor at once: a wall of the same live feed (the cold open, and "on every screen") */
const FeedWall: React.FC<{ f: number; push: number }> = ({ f, push }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#030605"; g.fillRect(0, 0, W, H);
    const c = cctvAt(f), k = 1 + 0.07 * push;
    g.translate(W / 2, 1150); g.scale(k, k); g.translate(-W / 2, -1150);
    const glow = g.createRadialGradient(W / 2, 1150, 200, W / 2, 1150, 1000);
    glow.addColorStop(0, "rgba(60,200,110,0.2)"); glow.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = glow; g.fillRect(-200, 0, W + 400, H);
    const mw = 500, mh = 312;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) {
      const x0 = 26 + q * (mw + 28), y0 = 640 + r * (mh + 44);
      g.fillStyle = "#101413"; g.fillRect(x0 - 12, y0 - 12, mw + 24, mh + 24);
      g.save(); g.beginPath(); g.rect(x0, y0, mw, mh); g.clip(); g.translate(x0, y0);
      drawCCTV(g, mw, mh, { t: c.t + 0.13 * (r * 2 + q), raise: c.raise, fig: c.fig, clock: clockOf(c.left) });
      g.restore();
    }
    const vg = g.createRadialGradient(W / 2, 1150, 300, W / 2, 1150, 1100);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)"); g.fillStyle = vg; g.fillRect(-200, 0, W + 400, H + 200);
  }, [f, push]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

/** one desk monitor, close: the live feed (drawn each frame), scaled up for the push-in */
const Feed: React.FC<{ f: number; sc: number; zoom: number; zx: number; zy: number }> = ({ f, sc, zoom, zx, zy }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#040806"; g.fillRect(0, 0, W, H);
    const pw = W * 0.96 * sc, ph = pw * 0.625, x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 - 40;
    const glow = g.createRadialGradient(W / 2, y0 + ph / 2, ph * 0.3, W / 2, y0 + ph / 2, ph * 1.3);
    glow.addColorStop(0, "rgba(60,200,110,0.18)"); glow.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.fillStyle = "#111514"; g.fillRect(x0 - 34 * sc, y0 - 34 * sc, pw + 68 * sc, ph + 68 * sc); // bezel
    g.save(); g.beginPath(); g.rect(x0, y0, pw, ph); g.clip(); g.translate(x0, y0);
    const c = cctvAt(f);
    drawCCTV(g, pw, ph, { t: c.t, raise: c.raise, fig: c.fig, clock: clockOf(c.left), zoom, zx, zy });
    g.restore();
    // glass: a soft diagonal sheen
    const sh = g.createLinearGradient(x0, y0, x0 + pw, y0 + ph);
    sh.addColorStop(0, "rgba(255,255,255,0.05)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(255,255,255,0.03)");
    g.fillStyle = sh; g.fillRect(x0, y0, pw, ph);
  }, [f, sc, zoom, zx, zy]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const s = shotAt(f);
  const els: React.ReactNode[] = [];
  const rw = f >= REWIND[0] && f < REWIND[1], signShot = s.id === 17;
  // the wall of monitors: under the cold open, and "on every screen" (until the push-in)
  const wall = f < TEASER || WALLS.some(([a, b]) => f >= a && f < b);
  if (wall) els.push(<FeedWall key="wall" f={f < TEASER ? f + WALL_SRC : f} push={f < TEASER ? f / TEASER : (() => { const w = WALLS.find(([a, b]) => f >= a && f < b)!; return (f - w[0]) / (w[1] - w[0]); })()} />);
  // frame-1 hook text over the cold open (works muted)
  if (f < TEASER) {
    const a = clamp01((TEASER - f) / 4);
    els.push(
      <div key="hook" style={{ position: "absolute", top: 410, width: W, textAlign: "center", opacity: a, fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#ffffff", fontSize: 84, lineHeight: 1.05, letterSpacing: 1, WebkitTextStroke: "14px #0d0a10", paintOrder: "stroke fill" }}>
        <div>IT'S <span style={{ color: "#ff4a3a" }}>RIGHT</span></div>
        <div><span style={{ color: "#ff4a3a" }}>BEHIND</span> YOU.</div>
      </div>);
  }
  // recap: Part 3's two choices
  if (s.id === 1 && f >= TEASER) els.push(...tags(1, f, RECAP_ANCHORS, TEASER + 6, [f > TEASER + 14 && f < TEASER + 44 ? 1 : 0, f >= TEASER + 44 ? 1 : 0], "r"));
  // the real Part 3 vote split (only when VOTES holds real numbers), silent
  if (VOTES && s.id === 1 && f >= TEASER + 10) {
    const k = pop(f, TEASER + 10, 8);
    els.push(<div key="votes" style={{ position: "absolute", left: W / 2, top: 700, transform: `translate(-50%, -50%) scale(${k})`, background: "rgba(10,12,18,0.88)", border: "5px solid #ffb347", borderRadius: 26, padding: "14px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 40, color: "#ffffff", whiteSpace: "nowrap", textAlign: "center" }}>
      <div style={{ fontSize: 30, color: "#ffb347", letterSpacing: 4 }}>YOU VOTED</div>
      <div><span style={{ color: "#7fb0ff" }}>1</span> WADE {VOTES.a}% · <span style={{ color: "#ff7a6a" }}>2</span> CLIMB {VOTES.b}%</div>
    </div>);
  }
  // branch badge
  const br = branchAt(f);
  const inR = (r: [number, number]) => f >= r[0] && f < r[1];
  const wrist = inR(WRIST), feed = s.id === 15 || inR(CCTV_PUSH);
  if (br && !wrist && !feed && !wall && !signShot && s.id !== 12) {
    const t = br === 1 ? RECAP_ANCHORS[0] : RECAP_ANCHORS[1], b0 = br === 1 ? SH[2].a : SH[6].a;
    els.push(<Pill key="badge" n={t.n} label={t.label} color={t.color} x={W / 2 - 90} y={430} s={0.9 * pop(f, b0, 8)} hot={0} />);
  }
  // the wrist: the grey print your reflection left
  if (wrist) els.push(<Wrist key="wrist" a={Math.min(clamp01((f - WRIST[0]) / 3), clamp01((WRIST[1] - f) / 4))} k={(f - WRIST[0]) / (WRIST[1] - WRIST[0])} />);
  // the security feed: one monitor, live (shot 15); then the push-in on the one behind you
  if (feed) {
    let sc = 1 + 0.12 * smooth((f - SH[15].a) / (SH[15].b - SH[15].a)), zoom = 1, zx = 320, zy = 200;
    if (inR(CCTV_PUSH)) {
      const [a, b] = CCTV_PUSH, u1 = glide((f - a - 6) / 60), u2 = glide((f - a - 90) / 44);
      sc = 1 + 0.9 * u1 + 0.94 * u2; zoom = 1 + 1.3 * u1 + 1.2 * u2;
      zx = 320 + (FIG_FACE[0] - 320) * u1 + (FIG_BADGE[0] - FIG_FACE[0]) * u2; zy = 200 + (FIG_FACE[1] - 200) * u1 + (FIG_BADGE[1] - FIG_FACE[1]) * u2;
      void b;
    }
    els.push(<Feed key="feed" f={f} sc={sc} zoom={zoom} zx={zx} zy={zy} />);
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
  // HUD: the floor and the clock to 06:00 (it jumps after every blackout)
  if (f >= TEASER && f < TOTAL && !rw && !wrist && !signShot) {
    const left = hudLeftAt(f), p = (n: number) => String(n).padStart(2, "0");
    const txt = `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;
    const jump = [0, 1, 2, 3].some((k) => hudLeftAt(f - k) - hudLeftAt(f - k - 1) > 60) ? 1 : 0;
    els.push(<div key="hud" style={{ position: "absolute", right: 44, top: 396, background: "rgba(6,8,12,0.82)", border: "4px solid #ff4a3a", borderRadius: 18, padding: "6px 16px 8px", textAlign: "center", fontFamily: "Montserrat, sans-serif", color: "#ffffff", transform: `scale(${1 + 0.12 * jump})` }}>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 3, color: "#ffffff" }}>FLOOR {hudFloorAt(f)}<span style={{ color: "#ffb347" }}> · TO 06:00</span></div>
      <div style={{ fontWeight: 900, fontSize: 42, color: jump ? "#ffffff" : "#ff4a3a", letterSpacing: 2, textShadow: "0 0 12px rgba(255,60,40,0.6)" }}>{txt}</div>
    </div>);
  }
  // the ask: one keystroke, only on the question
  if (f >= CTA_AT && (s.id === 19 || s.id === 20)) {
    const k = pop(f, CTA_AT, 8) * (1 + 0.04 * Math.sin(f * 0.25));
    els.push(<div key="cta" style={{ position: "absolute", left: W / 2, top: 790, transform: `translate(-50%, -50%) scale(${k})`, display: "flex", alignItems: "center", gap: 14, background: "#ffb347", border: "5px solid #0d0a10", borderRadius: 999, padding: "10px 30px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 46, color: "#0d0a10", letterSpacing: 2, whiteSpace: "nowrap" }}>
      COMMENT 1 OR 2
      <svg width={34} height={40}><polygon points="0,14 34,14 17,40" fill="#0d0a10" /><rect x={11} y={0} width={12} height={16} fill="#0d0a10" /></svg>
    </div>);
  }
  // the new choice
  if (f >= TAGS_AT) {
    const hot = (r: [number, number]) => (f >= r[0] && f < r[1] ? 0.5 + 0.5 * Math.sin((f - r[0]) * 0.35) : 0);
    if (s.id === 19) els.push(...tags(19, f, TAG_ANCHORS, TAGS_AT, [hot(TAG1_HOT), hot(TAG2_HOT)], "c"));
    else if (s.id === 20) TAG_ANCHORS.forEach((t, i) => els.push(<Pill key={"t" + i} n={t.n} label={t.label} color={t.color} x={W / 2} y={i === 0 ? 520 : 655} s={1.25} hot={0} />));
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
