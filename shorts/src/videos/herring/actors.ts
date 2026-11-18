// Herring short: the cast (herring, sonar operator, admiral, sailors, biologists, sub captain) and props.
import type { Ctx } from "../../lib/engine";
import { rnd, sprite, blinkAt, clamp01 } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, bubble, smoothClosed } from "../../lib/paint";
import { Outfit, INK, bodyFront, bodySide, Expr } from "../../lib/toon";

// ---------------- herring ----------------
export type FishExpr = "normal" | "smug" | "wink" | "shock" | "happy" | "puzzled" | "gulp" | "relief";
export type FishOpts = { f?: number; expr?: FishExpr; seed?: number; xray?: number; bladder?: number; tube?: number; mouthOpen?: number; silhouette?: string; look?: number; tail?: number };
const BODY: P[] = [[150, 4], [118, -30], [60, -54], [-10, -56], [-70, -40], [-112, -12], [-122, 0], [-112, 14], [-70, 36], [-10, 50], [60, 48], [118, 28]];
const bodyPts = (wag: number) => smoothClosed(BODY.map(([x, y]) => [x, y + (x < -40 ? wag * ((-40 - x) / 80) * 8 : 0)] as P), 5);

/** herring facing +x, centre (0, 0), body ~300 long; draw inside at() */
export const herring = (g: Ctx, o: FishOpts = {}) => {
  const { f = 0, expr = "normal", seed = 1, xray = 0, bladder = 0.6, tube = 0, mouthOpen = 0, silhouette, look = 0.3, tail = 1 } = o;
  const wag = Math.sin(f * 0.35 * tail + seed * 2) * tail;
  const body = bodyPts(wag);
  const ty = wag * 10;
  const tailPts: P[] = [[-112, 0], [-178, -52 + ty], [-160, ty], [-178, 52 + ty]];
  if (silhouette) {
    poly(g, tailPts, silhouette, 0); poly(g, body, silhouette, 0);
    poly(g, [[-20, -54], [30, -55], [2, -92]], silhouette, 0);
    return;
  }
  // tail + fins behind
  poly(g, tailPts, lg(g, -180, 0, -110, 0, [[0, "#3d6f99"], [1, "#7fa6c4"]]), 5);
  line(g, [[-118, 0], [-165, -36 + ty * 0.8]], rgba("#21405e", 0.5), 3); line(g, [[-118, 0], [-165, 36 + ty * 0.8]], rgba("#21405e", 0.5), 3);
  poly(g, [[-20, -54], [34, -55], [4, -94]], lg(g, 0, -95, 0, -50, [[0, "#3f6d96"], [1, "#6f9bc0"]]), 5);
  poly(g, [[-60, 38], [-30, 46], [-62, 66]], "#8fb1cc", 4);
  // body: dark blue back -> silver -> white belly
  path(g, body);
  g.fillStyle = lg(g, 0, -56, 0, 50, [[0, "#285a86"], [0.3, "#4f86b3"], [0.52, "#bcd4e4"], [0.78, "#e9f1f6"], [1, "#f9fbfd"]]);
  g.fill();
  // scale shimmer
  g.save(); path(g, body); g.clip();
  for (let i = 0; i < 7; i++) line(g, [[-90 + i * 30, -30], [-80 + i * 30, -10], [-90 + i * 30, 10]], "rgba(255,255,255,0.18)", 3);
  line(g, [[-110, -4], [-30, -14], [60, -16], [130, -6]], "rgba(255,255,255,0.55)", 6);
  if (xray > 0) {
    // cut-away window into the belly: guts, swim bladder balloon, duct to the vent
    g.globalAlpha = xray;
    poly(g, smoothClosed([[95, -2], [60, -36], [-20, -40], [-95, -14], [-100, 18], [-30, 38], [60, 34]], 5), "#f7d9d0", 4);
    // gut
    line(g, [[70, 18], [30, 26], [-20, 26], [-60, 22], [-96, 16]], "#c86a5a", 9);
    line(g, [[70, 18], [30, 26], [-20, 26], [-60, 22], [-96, 16]], INKC, 2);
    // swim bladder (balloon)
    const bw = 30 + 52 * bladder, bh = 8 + 17 * bladder;
    ell(g, -8, -14, bw, bh, lg(g, 0, -14 - bh, 0, -14 + bh, [[0, "#ffffff"], [1, "#d6ecf7"]]), 4);
    ell(g, -8 - bw * 0.4, -14 - bh * 0.35, bw * 0.18, bh * 0.22, "#ffffff", 0);
    // duct from the bladder to the gut / vent
    const tg = clamp01(tube);
    line(g, [[-8 - bw * 0.85, -10], [-60, 8], [-96, 16]], tg > 0 ? `rgba(255,214,74,${0.4 + 0.6 * tg})` : "#e9b9a9", 7 + 5 * tg);
    line(g, [[-8 - bw * 0.85, -10], [-60, 8], [-96, 16]], INKC, 2);
    g.globalAlpha = 1;
  }
  g.restore();
  path(g, body); g.lineWidth = 5; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  // gill + pectoral fin
  line(g, [[86, -30], [72, 0], [86, 30]], rgba("#21405e", 0.8), 4);
  poly(g, [[66, 18], [26, 30], [34, 44]], "#a9c6dc", 3.5);
  // eye
  const ex = 108, ey = -10;
  if (expr === "wink") {
    g.beginPath(); g.arc(ex, ey + 4, 13, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke();
  } else {
    const R = expr === "shock" ? 22 : 17;
    ell(g, ex, ey, R, R, "#ffffff", 4);
    const pr = expr === "shock" ? 6 : 8;
    ell(g, ex + look * 6, ey + 1, pr, pr, INKC, 0);
    if (expr === "smug" || expr === "relief") { // heavy lid
      g.save(); g.beginPath(); g.arc(ex, ey, R, 0, Math.PI * 2); g.clip();
      g.fillStyle = "#4f86b3"; g.fillRect(ex - R, ey - R, 2 * R, R * (expr === "relief" ? 1.05 : 0.95)); g.restore();
      line(g, [[ex - R, ey - R * 0.05], [ex + R, ey - R * 0.05 - (expr === "smug" ? 4 : 0)]], INKC, 5);
      ell(g, ex, ey, R, R, null, 4);
    }
    if (expr === "puzzled") line(g, [[ex - 16, ey - 28], [ex + 14, ey - 22]], INKC, 5);
    if (expr === "shock") line(g, [[ex - 16, ey - 34], [ex + 4, ey - 40], [ex + 18, ey - 33]], INKC, 5);
  }
  // mouth
  if (expr === "gulp" || mouthOpen > 0.05) {
    const m = Math.max(mouthOpen, expr === "gulp" ? 0.8 : 0);
    ell(g, 142, 10, 8 + 4 * m, 5 + 10 * m, "#5a1e28", 3.5);
  } else if (expr === "smug" || expr === "happy" || expr === "relief" || expr === "wink") {
    g.beginPath(); g.moveTo(124, 16); g.quadraticCurveTo(138, 26, 150, 12); g.lineWidth = 4.5; g.strokeStyle = INKC; g.lineCap = "round"; g.stroke();
  } else if (expr === "shock") ell(g, 140, 16, 7, 10, "#5a1e28", 3.5);
  else line(g, [[128, 16], [148, 12]], INKC, 4.5);
};

/** comic "pfft" marks + a burst of bubbles at the vent (fish space), t = frames since the toot */
export const toot = (g: Ctx, t: number, big = 1, seed = 1) => {
  if (t < 0) return;
  // little puff lines
  if (t < 16) {
    const a = 1 - t / 16;
    g.save(); g.globalAlpha = a;
    for (const k of [-1, 0, 1]) {
      const ang = Math.PI * 0.85 + k * 0.32, r0 = 40 + t * 3, r1 = r0 + 34 * big;
      line(g, [[-118 + Math.cos(ang) * r0, 20 + Math.sin(ang) * r0], [-118 + Math.cos(ang) * r1, 20 + Math.sin(ang) * r1]], INKC, 10);
      line(g, [[-118 + Math.cos(ang) * r0, 20 + Math.sin(ang) * r0], [-118 + Math.cos(ang) * r1, 20 + Math.sin(ang) * r1]], "#ffffff", 5);
    }
    g.restore();
  }
  // bubbles leave the vent backwards then rise
  const n = Math.round(10 * big);
  for (let i = 0; i < n; i++) {
    const born = i * 1.4, age = t - born;
    if (age < 0 || age > 60) continue;
    const r = (7 + 9 * rnd(seed, i)) * (0.7 + 0.5 * big);
    const x = -112 - age * (3.2 - age * 0.03) - rnd(seed, i + 3) * 10, y = 18 - age * age * 0.05 - age * 0.6 + Math.sin(age * 0.3 + i) * 5;
    bubble(g, x, y, r, Math.min(1, (60 - age) / 12));
  }
};

/** points inside a submarine outline (used to build the sub-shaped school), seeded grid with jitter */
export const subShapePoints = (L: number, n: number, seed = 3): P[] => {
  const pts: P[] = [];
  const r = L * 0.11;
  const inside = (x: number, y: number) => {
    const hull = Math.abs(y) < r * (x > L * 0.38 ? Math.sqrt(Math.max(0, 1 - ((x - L * 0.38) / (r * 1.2)) ** 2)) : x < -L * 0.3 ? 1 - (-L * 0.3 - x) / (L * 0.2) * 0.85 : 1);
    const sail = x > L * 0.04 && x < L * 0.24 && y < -r * 0.5 && y > -r * 2.2;
    return (hull && x > -L * 0.5 && x < L * 0.38 + r * 1.2) || sail;
  };
  let k = 0;
  while (pts.length < n && k < n * 40) {
    const x = (rnd(seed, k) - 0.5) * L * 1.1, y = -r * 2.3 + rnd(seed, k + 7777) * r * 3.4;
    if (inside(x, y)) pts.push([x, y]);
    k++;
  }
  return pts;
};

// ---------------- people ----------------
export const OPERATOR: Outfit = { jacket: "#355a8c", pants: "#2b3244", boots: INK, hat: "hair", hair: "#e0b45a", headset: true, buttons: "#d9dde0" };
export const ADMIRAL: Outfit = { jacket: "#1f2c52", pants: "#1d2440", boots: INK, hat: "navycap", capTop: "#f4f4f0", buttons: "#e8c45a", moustache: "#e9e4d6", build: "stout", sash: "#e8c45a" };
export const SAILOR: Outfit = { jacket: "#2c4c86", pants: "#24365f", boots: INK, hat: "sailor", cap: "#f4f4f0", buttons: "#f4f4f0", belt: null };
export const BIO1: Outfit = { jacket: "#f3f1ea", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#8a4f2a", glasses: true, buttons: "#c9ccd2" };
export const BIO2: Outfit = { jacket: "#eef2ee", pants: "#4a4458", boots: "#3a2a22", hat: "hair", hair: "#3a2a22", beard: "#3a2a22", buttons: "#c9ccd2", skin: "#f5c9a0" };
export const CAPTAIN: Outfit = { jacket: "#3a3d47", pants: "#2b2d34", boots: INK, hat: "navycap", capTop: "#2e3240", buttons: "#e8c45a", moustache: "#2a201a" };

export const person = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, opts: { expr?: Expr; seed?: number; mode?: "stand" | "stroll" | "march" | "sit" | "fall"; phase?: number; wave?: number; facing?: -1 | 0 | 1; tilt?: number; headTilt?: number; look?: number; flip?: boolean; side?: boolean; lift?: number } = {}) => {
  const seed = opts.seed ?? 1;
  const blink = blinkAt(f, seed);
  if (opts.side) sprite(g, x, y, h, (p) => bodySide(p, o, { expr: opts.expr, mode: (opts.mode as "march" | "stand") ?? "stand", phase: opts.phase, blink, seed, stride: 0.8 }), opts.flip);
  else sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opts.expr, mode: opts.mode ?? "stand", phase: opts.phase, blink, seed, wave: opts.wave, facing: opts.facing ?? 0, tilt: opts.tilt, headTilt: opts.headTilt, look: opts.look, lift: opts.lift }), opts.flip);
};

// ---------------- props ----------------
/** sonar console: desk with a round green scope, (x, y) = desk front-top centre */
export const sonarConsole = (g: Ctx, x: number, y: number, s: number, f: number, blips: P[] = [], glow = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -260, -330, 520, 330, 18, lg(g, 0, -330, 0, 0, [[0, "#5b6578"], [1, "#3c4456"]]), 5);
  rr(g, -300, 0, 600, 60, 10, "#4a5366", 5);
  // scope
  const R = 120;
  ell(g, 0, -170, R + 22, R + 22, "#2a303c", 5);
  ell(g, 0, -170, R, R, rg(g, 0, -170, 0, R, [[0, "#1b5e33"], [1, "#0b2a17"]]), 4);
  g.save(); g.beginPath(); g.arc(0, -170, R, 0, Math.PI * 2); g.clip();
  for (const r of [40, 80]) ell(g, 0, -170, r, r, null, 2, 0, "rgba(120,255,160,0.45)");
  line(g, [[-R, -170], [R, -170]], "rgba(120,255,160,0.35)", 2); line(g, [[0, -170 - R], [0, -170 + R]], "rgba(120,255,160,0.35)", 2);
  const a = f * 0.09;
  g.fillStyle = "rgba(120,255,160,0.35)";
  g.beginPath(); g.moveTo(0, -170); g.arc(0, -170, R, a - 0.7, a); g.closePath(); g.fill();
  line(g, [[0, -170], [Math.cos(a) * R, -170 + Math.sin(a) * R]], "rgba(190,255,200,0.95)", 4);
  for (const [bx, by] of blips) ell(g, bx, -170 + by, 9, 9, "rgba(190,255,200,0.95)", 0);
  g.restore();
  // knobs + lights
  for (let i = 0; i < 4; i++) ell(g, -200 + i * 40 + (i > 1 ? 280 : 0), -60, 13, 13, "#c9ccd2", 3.5);
  ell(g, -200, -270, 10, 10, f % 30 < 15 ? "#ff5a4a" : "#7a2a24", 3);
  ell(g, 200, -270, 10, 10, "#5aff7a", 3);
  if (glow > 0) {
    g.globalCompositeOperation = "lighter";
    g.fillStyle = rg(g, 0, -170, 0, 420, [[0, `rgba(90,255,140,${0.22 * glow})`], [1, "rgba(90,255,140,0)"]]);
    g.fillRect(-500, -600, 1000, 900);
  }
  g.restore();
};
/** hydrophone microphone on a cable (cable from (x, y0) down to (x, y)) */
export const hydrophone = (g: Ctx, x: number, y0: number, y: number, s = 1) => {
  line(g, [[x, y0], [x + 4, (y0 + y) / 2], [x, y - 40 * s]], INKC, 4);
  rr(g, x - 16 * s, y - 44 * s, 32 * s, 70 * s, 14 * s, lg(g, x - 16 * s, 0, x + 16 * s, 0, [[0, "#d7dce3"], [1, "#7d8796"]]), 4);
  for (let i = 0; i < 4; i++) line(g, [[x - 12 * s, y - 30 * s + i * 12 * s], [x + 12 * s, y - 30 * s + i * 12 * s]], "#3c4456", 3);
};
/** reel-to-reel tape (x, y centre), radius r, spin angle */
export const reel = (g: Ctx, x: number, y: number, r: number, a: number) => {
  ell(g, x, y, r, r, "#3b2f2a", 4);
  ell(g, x, y, r * 0.95, r * 0.95, "#c9ccd2", 3);
  for (let k = 0; k < 3; k++) {
    const b = a + (k * Math.PI * 2) / 3;
    ell(g, x + Math.cos(b) * r * 0.55, y + Math.sin(b) * r * 0.55, r * 0.22, r * 0.22, "#5b6578", 3);
  }
  ell(g, x, y, r * 0.16, r * 0.16, "#2a303c", 3);
};
export const tapeMachine = (g: Ctx, x: number, y: number, s: number, f: number, spin = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -220, -300, 440, 300, 16, lg(g, 0, -300, 0, 0, [[0, "#b9a07a"], [1, "#8a7352"]]), 5);
  reel(g, -105, -185, 85, f * 0.12 * spin); reel(g, 105, -185, 85, f * 0.12 * spin + 1);
  line(g, [[-105, -100], [0, -70], [105, -100]], "#3b2f2a", 4);
  rr(g, -150, -70, 300, 50, 8, "#4a3a2c", 4);
  for (let i = 0; i < 4; i++) rr(g, -130 + i * 70, -60, 45, 30, 6, "#e8e2d4", 3);
  g.restore();
};
export const fryingPan = (g: Ctx, x: number, y: number, s: number, f: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, 150, -18, 230, 30, 14, "#3a3d47", 4);
  ell(g, 0, 0, 175, 52, "#2a2d36", 5);
  ell(g, 0, -6, 155, 40, "#4a4f5c", 3);
  for (let i = 0; i < 3; i++) {
    const bx = -90 + i * 75, wig = Math.sin(f * 0.6 + i) * 3;
    path(g, [[bx - 40, -8 + wig], [bx - 10, -16 - wig], [bx + 20, -6 + wig], [bx + 40, -14 - wig], [bx + 40, 4 + wig], [bx + 20, 10 - wig], [bx - 10, 2 + wig], [bx - 40, 10 - wig]]);
    g.fillStyle = "#c8574a"; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INKC; g.stroke();
    line(g, [[bx - 34, 2], [bx - 10, -6], [bx + 20, 2], [bx + 34, -4]], "#f2d2b6", 5);
  }
  // sizzle sparks
  for (let i = 0; i < 9; i++) {
    const t = (f * 1.7 + i * 7) % 22, a = rnd(i, 3) * Math.PI - Math.PI;
    if (t > 14) continue;
    const r0 = 40 + t * 9;
    line(g, [[Math.cos(a) * r0 * 1.4, -10 + Math.sin(a) * r0 * 0.6], [Math.cos(a) * (r0 + 20) * 1.4, -10 + Math.sin(a) * (r0 + 20) * 0.6]], "#fff3a0", 4);
  }
  g.restore();
};
export const balloon = (g: Ctx, x: number, y: number, size: number, f: number, wiggle = 1, col = "#ff5a7a") => {
  const w = Math.sin(f * 1.3) * 0.12 * wiggle;
  g.save(); g.translate(x, y); g.rotate(w);
  path(g, smoothClosed([[0, 0], [size * 0.55, -size * 0.35], [size * 0.62, -size * 1.0], [0, -size * 1.42], [-size * 0.62, -size * 1.0], [-size * 0.55, -size * 0.35]], 6));
  g.fillStyle = lg(g, -size * 0.6, -size, size * 0.6, 0, [[0, light(col, 0.3)], [1, dark(col, 0.2)]]); g.fill();
  g.lineWidth = 5; g.strokeStyle = INKC; g.stroke();
  ell(g, -size * 0.25, -size * 1.0, size * 0.1, size * 0.18, "rgba(255,255,255,0.8)", 0, 0.5);
  poly(g, [[-12, 0], [12, 0], [6, 24], [-6, 24]], col, 4);
  g.restore();
};
/** golden fish trophy on a base */
export const trophy = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -70, -40, 140, 40, 6, "#5a3b2a", 4);
  rr(g, -40, -110, 80, 70, 10, lg(g, -40, 0, 40, 0, [[0, "#ffe27a"], [1, "#c8952c"]]), 4);
  g.save(); g.translate(0, -175); g.rotate(-0.5); g.scale(0.38, 0.38);
  herring(g, { expr: "smug" });
  g.restore();
  g.restore();
};
/** stylised red-brick tower with a spire + star (generic Moscow skyline silhouette piece) */
export const brickTower = (g: Ctx, x: number, y: number, h: number, col = "#a8443c") => {
  const w = h * 0.22;
  rr(g, x - w / 2, y - h * 0.55, w, h * 0.55, 2, lg(g, x - w / 2, 0, x + w / 2, 0, [[0, light(col, 0.1)], [1, dark(col, 0.35)]]), 4);
  rr(g, x - w * 0.4, y - h * 0.72, w * 0.8, h * 0.17, 2, dark(col, 0.1), 4);
  poly(g, [[x - w * 0.42, y - h * 0.72], [x + w * 0.42, y - h * 0.72], [x, y - h]], "#3e6b4f", 4);
  for (let i = 0; i < 4; i++) rr(g, x - w * 0.3 + i * w * 0.18, y - h * 0.5, w * 0.1, h * 0.06, 2, "#ffd36b", 2.5);
  // battlements
  for (let i = 0; i < 5; i++) poly(g, [[x - w / 2 + i * w * 0.22, y - h * 0.55], [x - w / 2 + i * w * 0.22 + w * 0.12, y - h * 0.55], [x - w / 2 + i * w * 0.22 + w * 0.06, y - h * 0.6]], dark(col, 0.1), 3);
  const sx = x, sy = y - h - h * 0.05, R = h * 0.05, sp: P[] = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r0 = k % 2 ? R * 0.42 : R; sp.push([sx + Math.cos(a) * r0, sy + Math.sin(a) * r0]); }
  poly(g, sp, "#e8322e", 3);
};
/** red flag on a pole (feet at x, y), `down` 0 = top of pole, 1 = lowered; `fall` rotates the pole (radians) */
export const redFlag = (g: Ctx, x: number, y: number, h: number, f: number, down = 0, fall = 0) => {
  g.save(); g.translate(x, y); g.rotate(fall);
  line(g, [[0, 0], [0, -h]], INKC, 9); line(g, [[0, 0], [0, -h]], "#d8d4cc", 5);
  ell(g, 0, -h, 9, 9, "#e8c45a", 3);
  const fw = h * 0.42, fh = h * 0.27, top = -h + 10 + down * (h * 0.62);
  const pts: P[] = [];
  for (let i = 0; i <= 12; i++) pts.push([(fw * i) / 12, top + Math.sin(i * 0.6 + f * 0.25) * 7 * (i / 12)]);
  const bot = pts.map(([px, py]) => [px, py + fh] as P).reverse();
  poly(g, [...pts, ...bot], lg(g, 0, top, fw, top + fh, [[0, "#e23a2e"], [1, "#b8261e"]]), 4);
  // hammer and sickle + star outline in the canton (Soviet flag)
  const cx = fw * 0.2, cy = top + fh * 0.36, k = fh * 0.2;
  g.save(); g.lineCap = "round";
  g.beginPath(); g.arc(cx, cy, k * 0.9, Math.PI * 0.85, Math.PI * 2.2); g.strokeStyle = "#f5cc2a"; g.lineWidth = k * 0.28; g.stroke();
  line(g, [[cx - k * 0.75, cy + k * 0.75], [cx + k * 0.55, cy - k * 0.55]], "#f5cc2a", k * 0.24);
  line(g, [[cx + k * 0.25, cy - k * 0.85], [cx + k * 0.85, cy - k * 0.25]], "#f5cc2a", k * 0.34);
  const R = k * 0.38, sp: P[] = [];
  for (let q = 0; q < 10; q++) { const a = -Math.PI / 2 + (q * Math.PI) / 5, r0 = q % 2 ? R * 0.42 : R; sp.push([cx + Math.cos(a) * r0, cy - k * 1.55 + Math.sin(a) * r0]); }
  path(g, sp); g.strokeStyle = "#f5cc2a"; g.lineWidth = 3; g.stroke();
  g.restore();
  g.restore();
};
/** chalkboard with a chalk drawing of a herring and bubbles */
export const chalkboard = (g: Ctx, x: number, y: number, w: number, h: number) => {
  rr(g, x - w / 2 - 18, y - h - 18, w + 36, h + 36, 10, "#8a5a34", 5);
  rr(g, x - w / 2, y - h, w, h, 4, lg(g, 0, y - h, 0, y, [[0, "#2f4a3c"], [1, "#24392e"]]), 4);
  g.save(); g.translate(x - w * 0.12, y - h * 0.5); g.scale(w / 900, w / 900);
  g.globalAlpha = 0.85;
  const ch = "rgba(240,240,230,0.9)";
  path(g, smoothClosed(BODY, 5)); g.lineWidth = 7; g.strokeStyle = ch; g.stroke();
  path(g, [[-112, 0], [-178, -52], [-160, 0], [-178, 52]]); g.stroke();
  ell(g, 108, -10, 14, 14, null, 6, 0, ch);
  ell(g, -8, -14, 70, 22, null, 6, 0, ch);
  for (let i = 0; i < 6; i++) ell(g, -200 - i * 40, 10 - i * 34, 12 + i * 3, 12 + i * 3, null, 5, 0, ch);
  line(g, [[-60, 70], [-100, 120], [-140, 90]], ch, 6);
  g.restore();
};
/** a coffee mug */
export const mug = (g: Ctx, x: number, y: number, s: number, col = "#e8e2d4") => {
  rr(g, x - 22 * s, y - 50 * s, 44 * s, 50 * s, 6 * s, col, 3.5);
  g.beginPath(); g.arc(x + 24 * s, y - 26 * s, 12 * s, -Math.PI / 2, Math.PI / 2); g.lineWidth = 6 * s; g.strokeStyle = INKC; g.stroke();
  ell(g, x, y - 50 * s, 22 * s, 6 * s, "#4a2a1a", 3);
};
export const seagull = (g: Ctx, x: number, y: number, s: number, f: number, flying = false) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (flying) {
    const fl = Math.sin(f * 0.4) * 20;
    line(g, [[-60, -10 - fl], [-25, -20], [0, 0], [25, -20], [60, -10 - fl]], INKC, 10);
    line(g, [[-60, -10 - fl], [-25, -20], [0, 0], [25, -20], [60, -10 - fl]], "#f4f4f0", 5);
  } else {
    ell(g, 0, 0, 50, 26, "#f4f4f0", 4);
    poly(g, [[-30, -8], [-80, -14], [-36, 12]], "#9aa4b0", 4);
    ell(g, 38, -26, 20, 18, "#f4f4f0", 4);
    poly(g, [[54, -26], [80, -22], [54, -18]], "#f2b23a", 3);
    ell(g, 44, -30, 3.5, 3.5, INKC, 0);
  }
  g.restore();
};
export const calendarPage = (g: Ctx, x: number, y: number, s: number, rot: number, num: number) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rr(g, -60, -70, 120, 140, 8, "#fbf7ee", 4);
  rr(g, -60, -70, 120, 34, 8, "#d8433c", 4);
  for (let i = 0; i < num % 5 + 2; i++) line(g, [[-36, -14 + i * 18], [36, -14 + i * 18]], "rgba(60,60,60,0.5)", 4);
  g.restore();
};
export const wave = (f: number, k = 0.2, a = 1) => Math.sin(f * k) * a;
export { bubble };
