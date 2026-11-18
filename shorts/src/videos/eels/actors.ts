// Electric eel short: electric eel, horse, bolts, cast outfits, props (journal, net, tank, fake croc head, megaphone).
import type { Ctx } from "../../lib/engine";
import { rnd, clamp01 } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, smoothClosed, smoothOpen } from "../../lib/paint";
import { Outfit, INK } from "../../lib/toon";

export const HUMBOLDT: Outfit = { jacket: "#2f5f4a", pants: "#e9e1c8", boots: "#3a2a22", hat: "tophat", buttons: "#e8c45a", hair: "#7a4a2a", skin: "#ffe2c2" };
export const LLANERO = (i: number): Outfit => ({ jacket: ["#f2efe6", "#c9a03a", "#b5653f"][i % 3], pants: ["#5a4a3a", "#3b3f52", "#6b4a3a"][i % 3], boots: "#3a2a22", hat: "straw", cap: ["#e2c27a", "#d9b46a", "#c9a45a"][i % 3], skin: ["#c99067", "#b57a52", "#d9a578"][i % 3], moustache: i % 2 ? "#2a201a" : undefined });
export const SCHOLAR = (i: number): Outfit => ({ jacket: ["#3a2a4a", "#4a2a2a", "#2a3a4a"][i % 3], pants: "#2b2d34", boots: INK, hat: "wig", skin: ["#ffe2c2", "#f5c9a0", "#ecd0b6"][i % 3], buttons: "#e8c45a", build: i % 2 ? "stout" : "adult" });
export const CATANIA: Outfit = { jacket: "#4a7ab8", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a", glasses: true };
export const FAN = (i: number): Outfit => ({ jacket: ["#e8322e", "#ffd84a", "#4a8ad8", "#5ab06a"][i % 4], pants: "#3b3f52", boots: INK, hat: i % 3 ? "hair" : "cap", hair: ["#3a2a22", "#d9a54e", "#1d1b22"][i % 3], cap: "#4a8ad8", skin: ["#ffe2c2", "#f5c9a0", "#c99067"][i % 3] });

// ---------------- electric eel ----------------
export type EelOpts = { f?: number; len?: number; expr?: "angry" | "smug" | "calm" | "puzzled"; seed?: number; wig?: number; charge?: number; arch?: number };
/** electric eel along a spine, head at +x, centred on (0, 0); arch lifts the front half (leap) */
export const eel = (g: Ctx, o: EelOpts = {}) => {
  const { f = 0, len = 520, expr = "calm", seed = 1, wig = 1, charge = 0, arch = 0 } = o;
  const n = 18, spine: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = len * (t - 0.5), y = Math.sin(t * 6 - f * 0.25 * wig + seed) * 22 * wig * (1 - t * 0.7) - arch * len * 0.5 * Math.max(0, t - 0.45) ** 1.6;
    spine.push([x, y]);
  }
  const s = len / 520;
  const wid = (t: number) => (t > 0.9 ? 34 - 160 * (t - 0.9) : 10 + 30 * Math.min(1, t * 2.2)) * s;
  const Lp: P[] = [], Rp: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = wid(i / n);
    Lp.push([spine[i][0] - (dy / l) * w, spine[i][1] + (dx / l) * w]); Rp.push([spine[i][0] + (dy / l) * w, spine[i][1] - (dx / l) * w]);
  }
  // ribbon fin along the belly
  const fin: P[] = Lp.slice(2, n - 2).map(([x, y], i) => [x, y + (10 + 6 * Math.sin(i * 1.5 + f * 0.6)) * s] as P);
  poly(g, [...Lp.slice(2, n - 2), ...fin.reverse()], "#d98a3a", 3);
  const outline = smoothClosed([...Lp, ...Rp.slice().reverse()], 3);
  path(g, outline);
  g.fillStyle = lg(g, 0, -40 * s, 0, 40 * s, [[0, "#3e4a2e"], [0.55, "#5d6b3e"], [1, "#e8a24a"]]);
  g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  // head details
  const [hx, hy] = spine[n];
  const dir = Math.atan2(spine[n][1] - spine[n - 2][1], spine[n][0] - spine[n - 2][0]);
  g.save(); g.translate(hx, hy); g.rotate(dir); g.scale(s, s);
  const ex = -26, ey = -14;
  if (expr === "angry") { ell(g, ex, ey, 11, 11, "#fff6c0", 3); ell(g, ex + 3, ey + 2, 4.5, 4.5, INKC, 0); line(g, [[ex - 14, ey - 18], [ex + 12, ey - 8]], INKC, 5); line(g, [[-6, 16], [10, 12]], INKC, 4); }
  else if (expr === "smug") { ell(g, ex, ey, 10, 10, "#fff6c0", 3); g.save(); g.beginPath(); g.arc(ex, ey, 10, 0, Math.PI * 2); g.clip(); g.fillStyle = "#3e4a2e"; g.fillRect(ex - 10, ey - 10, 20, 10); g.restore(); ell(g, ex, ey, 10, 10, null, 3); ell(g, ex + 2, ey + 4, 3.5, 3.5, INKC, 0); g.beginPath(); g.moveTo(-14, 14); g.quadraticCurveTo(0, 22, 12, 10); g.lineWidth = 4; g.strokeStyle = INKC; g.stroke(); }
  else if (expr === "puzzled") { ell(g, ex, ey, 11, 11, "#fff6c0", 3); ell(g, ex, ey, 4, 4, INKC, 0); line(g, [[ex - 12, ey - 20], [ex + 10, ey - 24]], INKC, 4); line(g, [[-6, 16], [10, 16]], INKC, 4); }
  else { ell(g, ex, ey, 9, 9, "#fff6c0", 3); ell(g, ex + 2, ey, 4, 4, INKC, 0); line(g, [[-8, 16], [10, 14]], INKC, 4); }
  g.restore();
  if (charge > 0) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 2; i < n; i += 3) { const [x, y] = spine[i]; g.fillStyle = rg(g, x, y, 0, 70 * s, [[0, `rgba(255,240,120,${0.45 * charge})`], [1, "rgba(255,240,120,0)"]]); g.fillRect(x - 70 * s, y - 70 * s, 140 * s, 140 * s); } g.restore(); }
  return spine;
};

/** jagged lightning bolt from a to b, re-jittered every 2 frames */
export const bolt = (g: Ctx, a: P, b: P, f: number, w = 10, seed = 1, col = "#ffe14d") => {
  const n = 7, pts: P[] = [a];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  for (let i = 1; i < n; i++) { const t = i / n, j = (rnd(seed + i, Math.floor(f / 2)) - 0.5) * l * 0.28; pts.push([a[0] + dx * t + nx * j, a[1] + dy * t + ny * j]); }
  pts.push(b);
  line(g, pts, INKC, w + 8); line(g, pts, col, w); line(g, pts, "#ffffff", w * 0.35);
};
export const sparks = (g: Ctx, x: number, y: number, f: number, r = 120, n = 6, seed = 1) => {
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd(seed, Math.floor(f / 2) + i) * 0.6; bolt(g, [x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3], [x + Math.cos(a) * r, y + Math.sin(a) * r], f, 6, seed + i); }
};

// ---------------- horse ----------------
/** cartoon horse, side view facing +x, hooves at y = 0, body ~ 520 units long. expr: calm | shock | dazed */
export const horse = (g: Ctx, o: { f?: number; col?: string; mane?: string; expr?: "calm" | "shock" | "dazed"; rear?: number; seed?: number } = {}) => {
  const { f = 0, col = "#9a6a3a", mane = "#3a2a22", expr = "calm", rear = 0, seed = 1 } = o;
  g.save(); g.rotate(-rear * 0.35);
  const legs: [number, number][] = [[-150, 0], [-110, 0.5], [110, 0.25], [150, 0.75]];
  for (const [lx, ph] of legs) {
    const k = Math.sin(f * 0.3 + ph * 6 + seed) * 10;
    line(g, [[lx, -220], [lx + k, -110], [lx + k * 0.5, -14]], INKC, 26); line(g, [[lx, -220], [lx + k, -110], [lx + k * 0.5, -14]], dark(col, 0.15), 17);
    rr(g, lx + k * 0.5 - 16, -18, 32, 20, 5, "#2a201a", 3);
  }
  // tail
  const tw = Math.sin(f * 0.2 + seed) * 18;
  poly(g, smoothClosed([[-200, -300], [-270, -230 + tw], [-290, -120 + tw], [-250, -140 + tw], [-215, -250]], 3), mane, 4);
  // body
  path(g, smoothClosed([[-210, -290], [-120, -330], [100, -330], [200, -300], [215, -230], [160, -190], [-150, -190], [-215, -230]], 4));
  g.fillStyle = lg(g, 0, -330, 0, -190, [[0, light(col, 0.15)], [1, dark(col, 0.2)]]); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  // neck + head
  poly(g, smoothClosed([[150, -320], [200, -440], [250, -490], [300, -470], [260, -380], [215, -260]], 3), col, 6);
  poly(g, smoothClosed([[240, -500], [290, -520], [380, -440], [390, -405], [350, -395], [270, -440]], 3), col, 6);
  poly(g, [[262, -505], [270, -560], [290, -505]], col, 5);
  // mane
  for (let i = 0; i < 6; i++) poly(g, [[180 + i * 14, -460 + i * 30], [150 + i * 14 + Math.sin(f * 0.2 + i) * 6, -430 + i * 30], [200 + i * 14, -440 + i * 30]], mane, 3);
  ell(g, 375, -415, 7, 5, INKC, 0);
  if (expr === "shock") { ell(g, 300, -470, 16, 16, "#ffffff", 4); ell(g, 304, -468, 5, 5, INKC, 0); line(g, [[286, -496], [314, -500]], INKC, 4); ell(g, 368, -398, 12, 8, "#5a1e28", 3); }
  else if (expr === "dazed") { const sp: P[] = []; for (let t = 1; t < 14; t++) sp.push([300 + Math.cos(t * 0.9 + f * 0.3) * t, -470 + Math.sin(t * 0.9 + f * 0.3) * t]); line(g, sp, INKC, 3.5); }
  else { ell(g, 300, -470, 8, 9, INKC, 0); }
  g.restore();
};

// ---------------- props ----------------
export const journal = (g: Ctx, x: number, y: number, s: number, f: number, writing = true) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -160, -110, 320, 220, 10, "#7a4a2a", 6);
  rr(g, -150, -100, 145, 200, 6, "#f4ecd2", 4); rr(g, 5, -100, 145, 200, 6, "#f4ecd2", 4);
  for (let i = 0; i < 6; i++) line(g, [[-135, -70 + i * 28], [-25, -70 + i * 28]], "rgba(60,40,30,0.5)", 3);
  const lines = writing ? Math.min(6, Math.floor(f / 6) % 7) : 6;
  for (let i = 0; i < lines; i++) line(g, [[20, -70 + i * 28], [130 - (i % 2) * 30, -70 + i * 28]], "rgba(60,40,30,0.8)", 3);
  // sketch of an eel
  line(g, smoothOpen([[-130, 80], [-100, 60], [-70, 80], [-40, 60]], 4), "#3e4a2e", 5);
  if (writing) { const qx = 20 + ((f * 4) % 110), qy = -70 + lines * 28; line(g, [[qx, qy], [qx + 60, qy - 120]], INKC, 6); poly(g, [[qx + 50, qy - 110], [qx + 110, qy - 210], [qx + 70, qy - 100]], "#f4f4f0", 3); }
  g.restore();
};
export const tank = (g: Ctx, x: number, y: number, w: number, h: number, water = 0.8) => {
  rr(g, x - w / 2, y - h, w, h, 10, "rgba(200,235,250,0.25)", 7);
  const wy = y - h * water;
  rr(g, x - w / 2 + 6, wy, w - 12, h * water - 6, 6, lg(g, 0, wy, 0, y, [[0, "rgba(90,180,220,0.75)"], [1, "rgba(30,100,160,0.85)"]]), 0);
  line(g, [[x - w / 2 + 6, wy], [x + w / 2 - 6, wy]], "rgba(255,255,255,0.8)", 5);
  rr(g, x - w / 2, y - h, w, h, 10, null, 7);
  rr(g, x - w / 2 - 20, y, w + 40, 40, 6, "#6b4a3a", 6);
};
export const netTool = (g: Ctx, x: number, y: number, s: number, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  line(g, [[0, 0], [0, 380]], INKC, 16); line(g, [[0, 0], [0, 380]], "#c9ccd2", 9);
  ell(g, 0, -90, 110, 90, "rgba(255,255,255,0.15)", 10, 0, "#c9ccd2"); ell(g, 0, -90, 110, 90, null, 4);
  for (let i = -3; i <= 3; i++) line(g, [[i * 30, -175 + Math.abs(i) * 8], [i * 30, -5 - Math.abs(i) * 8]], "rgba(255,255,255,0.7)", 2);
  g.restore();
};
export const fakeCroc = (g: Ctx, x: number, y: number, s: number, lit = 0) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, smoothClosed([[-200, -40], [-150, -110], [-40, -120], [200, -70], [260, -40], [200, -10], [-200, 0]], 3), "#5a8a4a", 6);
  for (let i = 0; i < 6; i++) poly(g, [[-60 + i * 45, -12], [-48 + i * 45, 14], [-36 + i * 45, -12]], "#f4f4f0", 3);
  ell(g, -60, -95, 22, 18, "#fff6c0", 4); ell(g, -55, -95, 7, 9, INKC, 0);
  for (let i = 0; i < 4; i++) { const c = lit > 0 && (i < lit * 4) ? "#ffe14d" : "#7a6a3a"; ell(g, 20 + i * 40, -70, 12, 12, c, 3); }
  g.restore();
};
export const megaphone = (g: Ctx, x: number, y: number, s: number, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  poly(g, [[0, -24], [140, -70], [140, 70], [0, 24]], "#e8322e", 5);
  ell(g, 140, 0, 18, 70, "#f4f4f0", 5); rr(g, -30, -20, 34, 40, 6, "#3a3d47", 4);
  g.restore();
};
export const palm = (g: Ctx, x: number, y: number, h: number, f = 0) => {
  line(g, smoothOpen([[x, y], [x + 20, y - h * 0.5], [x + 10, y - h]], 4), INKC, 26); line(g, smoothOpen([[x, y], [x + 20, y - h * 0.5], [x + 10, y - h]], 4), "#8a6a4a", 17);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.45 + Math.sin(f * 0.04 + i) * 0.04, L = h * 0.42;
    const tip: P = [x + 10 + Math.cos(a) * L, y - h + Math.sin(a) * L * 0.6 + L * 0.25];
    poly(g, [[x + 10, y - h], [x + 10 + Math.cos(a - 0.12) * L * 0.6, y - h + Math.sin(a - 0.12) * L * 0.4], tip, [x + 10 + Math.cos(a + 0.12) * L * 0.6, y - h + Math.sin(a + 0.12) * L * 0.4]], i % 2 ? "#3f7a3a" : "#4f8f3e", 4);
  }
};
export { rg, clamp01 };
