// Painted-world toolkit for the 2.5D shorts: flat saturated fills, soft gradient shading, near-black ink outlines
// (~4 px at 1080 wide), blue/violet shadows, warm light. Everything draws in world pixels on a Canvas2D.
import type { Ctx } from "./engine";
import { rnd } from "./engine";

export const INKC = "#120d18";
export type P = [number, number];

export const path = (g: Ctx, pts: P[], close = true) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (close) g.closePath();
};
export const fillInk = (g: Ctx, fill: string | CanvasGradient | CanvasPattern | null, lw = 4, ink = INKC) => {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw > 0) { g.lineWidth = lw; g.strokeStyle = ink; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
};
export const poly = (g: Ctx, pts: P[], fill: string | CanvasGradient | null, lw = 4, ink = INKC) => { path(g, pts); fillInk(g, fill, lw, ink); };
export const line = (g: Ctx, pts: P[], col = INKC, lw = 4) => {
  path(g, pts, false); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
};
export const rr = (g: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient | null, lw = 4, ink = INKC) => {
  g.beginPath(); g.roundRect(x, y, w, h, r); fillInk(g, fill, lw, ink);
};
export const ell = (g: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient | null, lw = 4, rot = 0, ink = INKC) => {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); fillInk(g, fill, lw, ink);
};
export const lg = (g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
};
export const rg = (g: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]) => {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
};
/** colour helpers */
export const hex = (c: string) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const toHex = (r: number, g2: number, b: number) => "#" + [r, g2, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const mixc = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
export const dark = (c: string, k: number) => mixc(c, "#1b1340", k);
export const light = (c: string, k: number) => mixc(c, "#fff6e6", k);
export const rgba = (c: string, a: number) => { const [r, g2, b] = hex(c); return `rgba(${r},${g2},${b},${a})`; };

/** smooth closed blob through n points around (cx, cy) */
export const blob = (cx: number, cy: number, rx: number, ry: number, seed: number, n = 9, j = 0.18): P[] => {
  const raw: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + j * (rnd(seed, i) - 0.5) * 2;
    raw.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smoothClosed(raw);
};
export const smoothClosed = (pts: P[], steps = 6): P[] => {
  const out: P[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)) as P);
    }
  }
  return out;
};
export const smoothOpen = (pts: P[], steps = 8): P[] => {
  const out: P[] = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)) as P);
    }
  }
  out.push(pts[n - 1]);
  return out;
};

// ---------------- skies, clouds ----------------
export const sky = (g: Ctx, x0: number, y0: number, x1: number, y1: number, top: string, hor: string, mid?: string) => {
  g.fillStyle = lg(g, 0, y0, 0, y1, mid ? [[0, top], [0.55, mid], [1, hor]] : [[0, top], [1, hor]]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
};
export const cloud = (g: Ctx, x: number, y: number, s: number, col = "#ffffff", shadeC = "#c9d6f2", seed = 1) => {
  const parts: [number, number, number][] = [[-120, 10, 70], [-50, -30, 95], [50, -40, 85], [125, 5, 65], [0, 20, 90]];
  g.save();
  g.translate(x, y); g.scale(s, s);
  // shade underside then body
  for (const [px, py, r] of parts) ell(g, px + (rnd(seed, px) - 0.5) * 20, py + 14, r, r * 0.78, shadeC, 0);
  for (const [px, py, r] of parts) ell(g, px + (rnd(seed, px) - 0.5) * 20, py, r, r * 0.74, col, 0);
  g.restore();
};
export const stars = (g: Ctx, x0: number, y0: number, x1: number, y1: number, n: number, seed = 3) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd(seed, i) * (x1 - x0), y = y0 + rnd(seed, i + 500) * (y1 - y0), r = 1.5 + rnd(seed, i + 900) * 2.5;
    g.fillStyle = `rgba(255,250,230,${0.4 + 0.6 * rnd(seed, i + 77)})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
};

// ---------------- sea ----------------
/** open sea seen from above the surface, horizon at yH, painted down to y1 */
export const seaSurface = (g: Ctx, x0: number, x1: number, yH: number, y1: number, far: string, near: string, seed = 2, waveCol = "rgba(255,255,255,0.55)") => {
  g.fillStyle = lg(g, 0, yH, 0, y1, [[0, far], [1, near]]);
  g.fillRect(x0, yH, x1 - x0, y1 - yH);
  // wave dashes, denser and bigger toward the viewer
  for (let i = 0; i < 260; i++) {
    const t = rnd(seed, i) ** 1.6, y = yH + 6 + t * (y1 - yH), x = x0 + rnd(seed, i + 300) * (x1 - x0), w = 14 + t * 90, h = 2 + t * 7;
    g.strokeStyle = waveCol; g.lineWidth = h; g.lineCap = "round";
    g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - h * 1.4, x + w / 2, y); g.stroke();
  }
};
/** the band where the surface meets the sky: a thin bright line */
export const horizonGlow = (g: Ctx, x0: number, x1: number, yH: number, col = "rgba(255,255,255,0.7)") => {
  g.fillStyle = lg(g, 0, yH - 10, 0, yH + 14, [[0, "rgba(255,255,255,0)"], [0.45, col], [1, "rgba(255,255,255,0)"]]);
  g.fillRect(x0, yH - 10, x1 - x0, 24);
};
/** underwater backdrop: gradient water, god rays, haze */
export const underwater = (g: Ctx, x0: number, y0: number, x1: number, y1: number, top: string, bot: string, rays = 0.18, seed = 4) => {
  g.fillStyle = lg(g, 0, y0, 0, y1, [[0, top], [1, bot]]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (rays > 0) {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const x = x0 + (x1 - x0) * (0.05 + 0.9 * rnd(seed, i)), w = 50 + 140 * rnd(seed, i + 20), sk = -0.25 + 0.15 * rnd(seed, i + 40);
      const len = (y1 - y0) * (0.5 + 0.4 * rnd(seed, i + 60));
      g.fillStyle = lg(g, 0, y0, 0, y0 + len, [[0, `rgba(210,240,255,${rays})`], [1, "rgba(210,240,255,0)"]]);
      g.beginPath(); g.moveTo(x - w / 2, y0); g.lineTo(x + w / 2, y0); g.lineTo(x + w / 2 + sk * len + w * 0.6, y0 + len); g.lineTo(x - w / 2 + sk * len - w * 0.2, y0 + len); g.closePath(); g.fill();
    }
    g.restore();
  }
};
/** floating specks (marine snow) */
export const specks = (g: Ctx, x0: number, y0: number, x1: number, y1: number, n: number, f = 0, seed = 9, col = "255,255,255") => {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((rnd(seed, i) * (x1 - x0) + f * 0.4 * (rnd(seed, i + 5) - 0.3)) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
    const y = y0 + ((rnd(seed, i + 100) * (y1 - y0) - f * 0.6 * rnd(seed, i + 7)) % (y1 - y0) + (y1 - y0)) % (y1 - y0);
    const r = 1.5 + 3 * rnd(seed, i + 200);
    g.fillStyle = `rgba(${col},${0.25 + 0.35 * rnd(seed, i + 300)})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
};
export const bubble = (g: Ctx, x: number, y: number, r: number, a = 1, lw?: number) => {
  g.save(); g.globalAlpha *= a;
  ell(g, x, y, r, r, "rgba(220,245,255,0.28)", lw ?? Math.max(1.5, r * 0.16), 0, "rgba(240,252,255,0.95)");
  ell(g, x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.2, "rgba(255,255,255,0.95)", 0, -0.6);
  g.restore();
};
/** a rising stream of bubbles from (x, y), age-based so it is deterministic per frame */
export const bubbleStream = (g: Ctx, x: number, y: number, f: number, f0: number, opts: { rate?: number; rise?: number; size?: number; spread?: number; life?: number; seed?: number; dir?: number } = {}) => {
  const { rate = 1.5, rise = 7, size = 9, spread = 18, life = 50, seed = 1, dir = -Math.PI / 2 } = opts;
  if (f < f0) return;
  const n = Math.floor((f - f0) * rate);
  for (let i = Math.max(0, n - Math.ceil(life * rate)); i < n; i++) {
    const born = f0 + i / rate, age = f - born;
    if (age < 0 || age > life) continue;
    const r = size * (0.5 + rnd(seed, i) * 0.9) * (1 + age * 0.006);
    const wob = Math.sin(age * 0.25 + i) * spread * 0.4 * (age / life + 0.2);
    const d = rise * age * (0.8 + 0.4 * rnd(seed, i + 9));
    const bx = x + Math.cos(dir) * d + (rnd(seed, i + 3) - 0.5) * spread + wob * -Math.sin(dir);
    const by = y + Math.sin(dir) * d + wob * Math.cos(dir);
    bubble(g, bx, by, r, Math.min(1, (life - age) / 10));
  }
};

// ---------------- rocks, seabed, plants ----------------
export const rock = (g: Ctx, x: number, y: number, w: number, h: number, col: string, seed = 1, lightDir = -1) => {
  const pts = blob(x, y - h / 2, w / 2, h / 2, seed, 8, 0.22).map(([px, py]) => [px, Math.min(py, y)] as P);
  path(g, pts);
  g.fillStyle = lg(g, x + lightDir * w * 0.4, y - h, x - lightDir * w * 0.4, y, [[0, light(col, 0.18)], [0.5, col], [1, dark(col, 0.35)]]);
  g.fill();
  g.lineWidth = 4; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  // crack / crease
  line(g, [[x - w * 0.1, y - h * 0.75], [x + w * 0.05, y - h * 0.5], [x - w * 0.02, y - h * 0.3]], rgba(INKC, 0.6), 3);
};
export const seabed = (g: Ctx, x0: number, x1: number, y: number, y1: number, sand: string, seed = 5) => {
  const pts: P[] = [[x0, y1]];
  for (let i = 0; i <= 24; i++) pts.push([x0 + ((x1 - x0) * i) / 24, y + Math.sin(i * 1.3 + seed) * 18 + rnd(seed, i) * 14]);
  pts.push([x1, y1]);
  path(g, pts);
  g.fillStyle = lg(g, 0, y - 20, 0, y1, [[0, light(sand, 0.15)], [1, dark(sand, 0.45)]]);
  g.fill();
  g.lineWidth = 4; g.strokeStyle = INKC; g.stroke();
  for (let i = 0; i < 60; i++) {
    const px = x0 + rnd(seed, i + 40) * (x1 - x0), py = y + 30 + rnd(seed, i + 80) * (y1 - y - 40);
    ell(g, px, py, 6 + 10 * rnd(seed, i), 2 + 3 * rnd(seed, i + 1), rgba(dark(sand, 0.4), 0.5), 0);
  }
};
export const kelp = (g: Ctx, x: number, y: number, h: number, col: string, sway = 0, seed = 1, w = 26) => {
  const pts: P[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([x + Math.sin(t * 3 + seed + sway) * 18 * t + sway * 30 * t * t, y - h * t]); }
  const L: P[] = [], R: P[] = [];
  pts.forEach(([px, py], i) => { const ww = w * (1 - (i / 10) * 0.7) * (0.8 + 0.3 * Math.sin(i * 2 + seed)); L.push([px - ww / 2, py]); R.push([px + ww / 2, py]); });
  poly(g, [...L, ...R.reverse()], lg(g, x - w, y, x + w, y, [[0, light(col, 0.1)], [1, dark(col, 0.3)]]), 3.5);
  line(g, pts, rgba(dark(col, 0.5), 0.8), 2.5);
};

// ---------------- coast / land ----------------
export const pine = (g: Ctx, x: number, y: number, h: number, col = "#2f6b4a", seed = 1) => {
  rr(g, x - h * 0.03, y - h * 0.18, h * 0.06, h * 0.2, 2, "#5a3b2a", 3);
  for (let i = 0; i < 3; i++) {
    const yy = y - h * (0.15 + i * 0.27), w = h * (0.42 - i * 0.1) * (0.9 + 0.2 * rnd(seed, i));
    poly(g, [[x - w / 2, yy], [x + w / 2, yy], [x + w * 0.05, yy - h * 0.42]], lg(g, x - w / 2, 0, x + w / 2, 0, [[0, light(col, 0.12)], [1, dark(col, 0.3)]]), 3.5);
  }
};
/** Swedish-style red wooden house (falu red, white trim), front face + gable roof, feet at (x, y) */
export const redHouse = (g: Ctx, x: number, y: number, w: number, h: number, col = "#b8392e", roof = "#3a3542") => {
  rr(g, x - w / 2, y - h, w, h, 3, lg(g, x - w / 2, 0, x + w / 2, 0, [[0, light(col, 0.08)], [1, dark(col, 0.25)]]), 4);
  // planks
  for (let i = 1; i < 8; i++) line(g, [[x - w / 2 + (w * i) / 8, y - h + 4], [x - w / 2 + (w * i) / 8, y - 4]], rgba(dark(col, 0.5), 0.5), 2);
  poly(g, [[x - w / 2 - 14, y - h], [x + w / 2 + 14, y - h], [x, y - h - h * 0.6]], lg(g, x, y - h * 1.6, x, y - h, [[0, light(roof, 0.15)], [1, roof]]), 4);
  for (const k of [-0.25, 0.25]) {
    rr(g, x + k * w - w * 0.1, y - h * 0.72, w * 0.2, h * 0.28, 2, "#ffe7a8", 3);
    line(g, [[x + k * w, y - h * 0.72], [x + k * w, y - h * 0.44]], "#ffffff", 3);
    rr(g, x + k * w - w * 0.12, y - h * 0.75, w * 0.24, h * 0.34, 2, null, 3, "#f6f3ea");
  }
  rr(g, x - w * 0.08, y - h * 0.38, w * 0.16, h * 0.38, 2, "#f2efe6", 3);
};
/** Swedish flag on a pole (feet at x, y) */
export const swedishFlag = (g: Ctx, x: number, y: number, h: number, wave = 0) => {
  line(g, [[x, y], [x, y - h]], INKC, 7); line(g, [[x, y], [x, y - h]], "#f2f0ea", 4);
  const fw = h * 0.42, fh = h * 0.27, top = y - h + 6;
  const pts: P[] = [];
  for (let i = 0; i <= 12; i++) pts.push([x + (fw * i) / 12, top + Math.sin(i * 0.6 + wave) * 6 * (i / 12)]);
  const bot = pts.map(([px, py]) => [px, py + fh] as P).reverse();
  g.save(); path(g, [...pts, ...bot]); g.fillStyle = "#2a62b8"; g.fill(); g.clip();
  // yellow cross
  g.strokeStyle = "#f5cc2a"; g.lineWidth = fh * 0.22;
  line(g, pts.map(([px, py]) => [px, py + fh / 2] as P), "#f5cc2a", fh * 0.22);
  line(g, [[x + fw * 0.36, top - 10], [x + fw * 0.36, top + fh + 10]], "#f5cc2a", fh * 0.22);
  g.restore();
  path(g, [...pts, ...bot]); g.lineWidth = 3.5; g.strokeStyle = INKC; g.stroke();
};

// ---------------- vessels ----------------
/** grey warship, side view, waterline at (x, y), facing +x, length L */
export const warship = (g: Ctx, x: number, y: number, L: number, col = "#8f9aa8", flag = true, wave = 0) => {
  const h = L * 0.13;
  // hull
  poly(g, [[x - L / 2, y - h], [x + L / 2 + L * 0.06, y - h * 1.15], [x + L / 2 - L * 0.04, y + h * 0.35], [x - L / 2 + L * 0.03, y + h * 0.35]],
    lg(g, 0, y - h, 0, y + h * 0.4, [[0, light(col, 0.1)], [1, dark(col, 0.35)]]), 4.5);
  line(g, [[x - L / 2 + 6, y - h * 0.15], [x + L / 2 + L * 0.02, y - h * 0.3]], "#c9463d", 6);
  // superstructure
  rr(g, x - L * 0.18, y - h * 2.0, L * 0.3, h, 4, light(col, 0.12), 4);
  rr(g, x - L * 0.1, y - h * 2.8, L * 0.16, h * 0.85, 4, light(col, 0.18), 4);
  for (let i = 0; i < 4; i++) rr(g, x - L * 0.15 + i * L * 0.06, y - h * 1.75, L * 0.035, h * 0.3, 3, "#1f2a44", 2.5);
  // mast + radar
  line(g, [[x - L * 0.02, y - h * 2.8], [x - L * 0.02, y - h * 4.2]], INKC, 5);
  line(g, [[x - L * 0.07, y - h * 3.9], [x + L * 0.03, y - h * 3.9]], INKC, 4);
  // gun turret
  rr(g, x + L * 0.22, y - h * 1.6, L * 0.08, h * 0.5, 6, col, 4);
  line(g, [[x + L * 0.29, y - h * 1.4], [x + L * 0.38, y - h * 1.5]], INKC, 6);
  if (flag) {
    line(g, [[x - L * 0.45, y - h], [x - L * 0.45, y - h * 2.4]], INKC, 4);
    const fx = x - L * 0.45, fy = y - h * 2.4, fw = h * 0.9, fh = h * 0.55;
    g.save(); g.beginPath(); g.rect(fx - fw, fy, fw, fh); g.fillStyle = "#2a62b8"; g.fill(); g.clip();
    g.fillStyle = "#f5cc2a"; g.fillRect(fx - fw, fy + fh * 0.4, fw, fh * 0.2); g.fillRect(fx - fw * 0.62, fy, fw * 0.2, fh);
    g.restore(); g.strokeStyle = INKC; g.lineWidth = 3; g.strokeRect(fx - fw, fy, fw, fh);
  }
  // bow wave
  g.save(); g.globalAlpha = 0.9;
  for (let i = 0; i < 3; i++) ell(g, x + L / 2 - i * L * 0.02, y + h * 0.3, L * 0.05 + i * 10, h * 0.25, "#ffffff", 3, 0);
  g.restore();
  void wave;
};
/** submarine side view, facing +x, centre (x, y), length L; `star` paints a red star on the sail */
export const submarine = (g: Ctx, x: number, y: number, L: number, col = "#5d6672", star = false, light0 = true) => {
  const r = L * 0.11;
  // hull: capsule with pointed tail
  const pts: P[] = [];
  for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 20; pts.push([x + L * 0.38 + Math.cos(a) * r * 1.2, y + Math.sin(a) * r]); }
  pts.push([x - L * 0.3, y + r * 0.95], [x - L * 0.5, y + r * 0.15], [x - L * 0.5, y - r * 0.1], [x - L * 0.3, y - r]);
  poly(g, pts, lg(g, 0, y - r, 0, y + r, [[0, light(col, light0 ? 0.25 : 0.05)], [0.5, col], [1, dark(col, 0.45)]]), 5);
  // sail (conning tower)
  poly(g, [[x + L * 0.02, y - r * 0.9], [x + L * 0.08, y - r * 2.3], [x + L * 0.22, y - r * 2.3], [x + L * 0.26, y - r * 0.9]],
    lg(g, 0, y - r * 2.3, 0, y - r, [[0, light(col, 0.2)], [1, col]]), 5);
  line(g, [[x + L * 0.12, y - r * 2.3], [x + L * 0.12, y - r * 3.0]], INKC, 4);
  line(g, [[x + L * 0.17, y - r * 2.3], [x + L * 0.17, y - r * 2.7]], INKC, 4);
  if (star) {
    const sx = x + L * 0.15, sy = y - r * 1.6, R = r * 0.42, sp: P[] = [];
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr0 = k % 2 ? R * 0.42 : R; sp.push([sx + Math.cos(a) * rr0, sy + Math.sin(a) * rr0]); }
    poly(g, sp, "#d8332c", 3);
  }
  // fins + propeller
  poly(g, [[x - L * 0.42, y - r * 0.1], [x - L * 0.5, y - r * 0.9], [x - L * 0.46, y - r * 0.05]], dark(col, 0.2), 4);
  poly(g, [[x - L * 0.42, y + r * 0.1], [x - L * 0.5, y + r * 0.9], [x - L * 0.46, y + r * 0.05]], dark(col, 0.3), 4);
  // portholes
  for (let i = 0; i < 4; i++) ell(g, x - L * 0.18 + i * L * 0.12, y + r * 0.05, r * 0.16, r * 0.16, "#ffd36b", 3);
};
export const propeller = (g: Ctx, x: number, y: number, r: number, f: number) => {
  for (let k = 0; k < 3; k++) {
    const a = f * 0.9 + (k * Math.PI * 2) / 3;
    ell(g, x, y + Math.sin(a) * r * 0.5, r * 0.18, r * 0.5 * Math.abs(Math.cos(a)) + 2, "#c8a23a", 3);
  }
};

// ---------------- interiors ----------------
/** simple room: back wall, floor in perspective (vanishing at vx, vy), skirting line */
export const room = (g: Ctx, x0: number, x1: number, yFloor: number, y1: number, wall: string, floor: string, vx = 540, top = -600) => {
  g.fillStyle = lg(g, 0, top, 0, yFloor, [[0, dark(wall, 0.18)], [1, light(wall, 0.05)]]);
  g.fillRect(x0, top, x1 - x0, yFloor - top);
  g.fillStyle = lg(g, 0, yFloor, 0, y1, [[0, dark(floor, 0.15)], [1, light(floor, 0.06)]]);
  g.fillRect(x0, yFloor, x1 - x0, y1 - yFloor);
  // floor boards converging to vx
  g.save(); g.beginPath(); g.rect(x0, yFloor, x1 - x0, y1 - yFloor); g.clip();
  for (let i = -14; i <= 14; i++) line(g, [[vx + i * 60, yFloor], [vx + i * 260, y1]], rgba(dark(floor, 0.5), 0.45), 3);
  for (let k = 1; k < 6; k++) { const y = yFloor + (y1 - yFloor) * (k / 6) ** 1.7; line(g, [[x0, y], [x1, y]], rgba(dark(floor, 0.5), 0.25), 2); }
  g.restore();
  line(g, [[x0, yFloor], [x1, yFloor]], INKC, 5);
  rr(g, x0, yFloor - 26, x1 - x0, 26, 0, dark(wall, 0.25), 0);
  line(g, [[x0, yFloor - 26], [x1, yFloor - 26]], rgba(INKC, 0.7), 3);
};
export const windowFrame = (g: Ctx, x: number, y: number, w: number, h: number, inside: (g: Ctx) => void, frame = "#f1ece0") => {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); inside(g); g.restore();
  rr(g, x, y, w, h, 4, null, 14, frame);
  rr(g, x - 7, y - 7, w + 14, h + 14, 6, null, 4);
  line(g, [[x + w / 2, y], [x + w / 2, y + h]], frame, 10); line(g, [[x, y + h / 2], [x + w, y + h / 2]], frame, 10);
  rr(g, x - 20, y + h + 4, w + 40, 18, 4, frame, 4);
};

// ---------------- generic fx ----------------
/** cartoon speed lines from the edges toward the centre */
export const speedLines = (g: Ctx, cx: number, cy: number, f: number, n = 26, col = "rgba(255,255,255,0.75)", r0 = 520, r1 = 1300) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(i, Math.floor(f / 2)) * 0.2, ra = r0 + rnd(i, Math.floor(f / 2) + 3) * 160;
    g.strokeStyle = col; g.lineWidth = 4 + 6 * rnd(i, 7); g.lineCap = "round";
    g.beginPath(); g.moveTo(cx + Math.cos(a) * ra, cy + Math.sin(a) * ra); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
  }
};
/** squiggly sound lines (a few arcs) radiating from (x, y) toward angle a */
export const soundLines = (g: Ctx, x: number, y: number, a: number, f: number, col = "#ffffff", n = 3, s = 1) => {
  for (let i = 0; i < n; i++) {
    const r = (40 + i * 34 + (f * 2.2) % 34) * s, pts: P[] = [];
    for (let k = 0; k <= 12; k++) { const b = a - 0.5 + k / 12; const rr2 = r + Math.sin(k * 2.4 + f * 0.8) * 5 * s; pts.push([x + Math.cos(b) * rr2, y + Math.sin(b) * rr2]); }
    line(g, pts, INKC, 10 * s); line(g, pts, col, 5 * s);
  }
};
/** question mark drawn as shapes, centred at (x, y), height h */
export const questionMark = (g: Ctx, x: number, y: number, h: number, col = "#ffd84a", rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(h / 200, h / 200);
  g.lineCap = "round"; g.lineJoin = "round";
  const hook = () => { g.beginPath(); g.moveTo(-42, -52); g.bezierCurveTo(-42, -110, 48, -112, 48, -56); g.bezierCurveTo(48, -20, 4, -12, 2, 24); };
  hook(); g.strokeStyle = INKC; g.lineWidth = 44; g.stroke();
  hook(); g.strokeStyle = col; g.lineWidth = 28; g.stroke();
  ell(g, 2, 78, 20, 20, col, 8);
  g.restore();
};
export const exclaim = (g: Ctx, x: number, y: number, h: number, col = "#ff4d3d", rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(h / 200, h / 200);
  poly(g, [[-22, -100], [22, -100], [10, 40], [-10, 40]], col, 9);
  ell(g, 0, 78, 20, 20, col, 9);
  g.restore();
};
/** radial burst behind a subject (comic "pow" background) */
export const burstBg = (g: Ctx, cx: number, cy: number, r: number, a: string, b: string, rays = 18, rot = 0) => {
  for (let i = 0; i < rays; i++) {
    const a0 = rot + (i / rays) * Math.PI * 2, a1 = rot + ((i + 1) / rays) * Math.PI * 2;
    g.fillStyle = i % 2 ? a : b; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r); g.closePath(); g.fill();
  }
};
/** anger "vein" symbol */
export const angerMark = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const [a, b] of [[[-30, -8], [-8, -8]], [[8, -8], [30, -8]], [[-8, -30], [-8, -8]], [[8, -30], [8, -8]], [[-30, 8], [-8, 8]], [[8, 8], [30, 8]], [[-8, 8], [-8, 30]], [[8, 8], [8, 30]]] as P[][]) {
    line(g, [a, b], INKC, 13); line(g, [a, b], "#e8322e", 7);
  }
  g.restore();
};
/** confetti pieces falling, deterministic */
export const confetti = (g: Ctx, x0: number, x1: number, y0: number, f: number, f0: number, n = 70, seed = 12) => {
  const cols = ["#ff5a5a", "#ffd84a", "#4ad8ff", "#7cff4f", "#ff7ad9", "#ffffff"];
  for (let i = 0; i < n; i++) {
    const t = f - f0 - rnd(seed, i) * 20;
    if (t < 0) continue;
    const x = x0 + rnd(seed, i + 1) * (x1 - x0) + Math.sin(t * 0.15 + i) * 30, y = y0 + t * (6 + 5 * rnd(seed, i + 2));
    g.save(); g.translate(x, y); g.rotate(t * 0.2 * (rnd(seed, i + 3) - 0.5) * 2);
    g.fillStyle = cols[i % cols.length]; g.fillRect(-9, -5, 18, 10 * Math.abs(Math.cos(t * 0.3 + i)) + 2);
    g.restore();
  }
};
