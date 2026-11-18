// Hagfish short: the hagfish, slime, truck, totes, coastal highway props, firefighters, bulldozer, shark, airbag.
import type { Ctx } from "../../lib/engine";
import { rnd, clamp01, easeOut } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, smoothClosed, smoothOpen, blob } from "../../lib/paint";
import { Outfit, INK } from "../../lib/toon";

export const DRIVER: Outfit = { jacket: "#3f6fb5", pants: "#3b4a6a", boots: "#4a3426", hat: "cap", cap: "#e8322e", moustache: "#5a3b2a" };
export const FLAGGER: Outfit = { jacket: "#f2c230", pants: "#3b4a6a", boots: INK, hat: "hardhat", cap: "#f08a2c" };
export const FIREFIGHTER: Outfit = { jacket: "#c9a03a", pants: "#3a3d47", boots: INK, hat: "hardhat", cap: "#d8332c", buttons: "#f4f4f0" };
export const DINER: Outfit = { jacket: "#5a8fc2", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#1d1b22", glasses: true };
export const MOTORIST: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#8a4f2a", skin: "#f5c9a0" };

// ---------------- the hagfish ----------------
export type HagOpts = { f?: number; len?: number; expr?: "panic" | "calm" | "smug" | "sad"; seed?: number; wig?: number; slime?: number; pores?: boolean; knot?: number };
/** a hagfish along a wiggling spine, head at +x; drawn around (0, 0), length `len` px */
export const hagfish = (g: Ctx, o: HagOpts = {}) => {
  const { f = 0, len = 420, expr = "panic", seed = 1, wig = 1, slime = 0, pores = true } = o;
  const n = 16, spine: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = len * (t - 0.5), y = Math.sin(t * 7 - f * 0.35 * wig + seed) * 26 * wig * (1 - t * 0.6);
    spine.push([x, y]);
  }
  const wid = (t: number) => (t > 0.92 ? 30 * Math.sqrt(Math.max(0, 1 - (t - 0.92) / 0.09)) + 6 : 16 + 16 * Math.min(1, t * 3));
  const L: P[] = [], R: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const w = wid(i / n) * (len / 420);
    L.push([spine[i][0] - (dy / l) * w, spine[i][1] + (dx / l) * w]); R.push([spine[i][0] + (dy / l) * w, spine[i][1] - (dx / l) * w]);
  }
  const outline = smoothClosed([...L, ...R.reverse()], 3);
  // tail fin fringe
  poly(g, [[spine[0][0] - 10, spine[0][1] - 26], [spine[2][0], spine[2][1] - 20], [spine[2][0], spine[2][1] + 20], [spine[0][0] - 10, spine[0][1] + 26]], "#d9a0a8", 4);
  path(g, outline);
  g.fillStyle = lg(g, 0, -40, 0, 40, [[0, "#b46a7a"], [0.5, "#e2a0a6"], [1, "#f2c6c4"]]);
  g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  if (pores) for (let i = 2; i < n - 1; i++) { const [x, y] = spine[i]; ell(g, x, y + 10 * (len / 420), 4, 4, "#fff6f0", 1.5); }
  // head: barbels + mouth
  const [hx, hy] = spine[n], s = len / 420;
  for (const k of [-1, 0, 1]) line(g, [[hx + 18 * s, hy + k * 10 * s], [hx + 40 * s, hy + k * 22 * s + Math.sin(f * 0.4 + k) * 4]], INKC, 4);
  ell(g, hx + 14 * s, hy + 6 * s, 8 * s, 6 * s, "#5a1e28", 3);
  // cartoon eyes
  const ex = hx - 14 * s, ey = hy - 12 * s;
  if (expr === "panic") { ell(g, ex, ey, 15 * s, 15 * s, "#ffffff", 3.5); ell(g, ex + 3 * s, ey + 2 * s, 4 * s, 4 * s, INKC, 0); line(g, [[ex - 14 * s, ey - 24 * s], [ex + 10 * s, ey - 30 * s]], INKC, 4); }
  else if (expr === "smug") { ell(g, ex, ey, 12 * s, 12 * s, "#ffffff", 3.5); g.save(); g.beginPath(); g.arc(ex, ey, 12 * s, 0, Math.PI * 2); g.clip(); g.fillStyle = "#c48090"; g.fillRect(ex - 12 * s, ey - 12 * s, 24 * s, 12 * s); g.restore(); ell(g, ex, ey, 12 * s, 12 * s, null, 3.5); ell(g, ex + 2 * s, ey + 4 * s, 4 * s, 4 * s, INKC, 0); }
  else if (expr === "sad") { ell(g, ex, ey, 11 * s, 11 * s, "#ffffff", 3.5); ell(g, ex, ey + 3 * s, 4 * s, 4 * s, INKC, 0); line(g, [[ex - 12 * s, ey - 16 * s], [ex + 10 * s, ey - 22 * s]], INKC, 4); }
  else { ell(g, ex, ey, 10 * s, 10 * s, "#ffffff", 3.5); ell(g, ex + 2 * s, ey, 4 * s, 4 * s, INKC, 0); }
  if (slime > 0) slimeCoat(g, spine.slice(0, n - 1), slime, f, seed, s);
};
/** translucent goo hanging off a set of points */
export const slimeCoat = (g: Ctx, pts: P[], k: number, f: number, seed: number, s = 1) => {
  g.save(); g.globalAlpha = 0.75 * clamp01(k);
  pts.forEach(([x, y], i) => {
    const r = (18 + 22 * rnd(seed, i)) * s * k;
    ell(g, x, y, r * 1.4, r, "rgba(236,246,226,0.75)", 2.5, 0, "rgba(160,190,150,0.9)");
    if (i % 3 === 0) { const d = (20 + 50 * rnd(seed, i + 9)) * s * k * (0.8 + 0.2 * Math.sin(f * 0.1 + i)); rr(g, x - 5 * s, y, 10 * s, d, 5 * s, "rgba(236,246,226,0.85)", 2, "rgba(160,190,150,0.9)"); }
  });
  g.restore();
};
/** a gloopy slime puddle / sheet (screen-ish rectangle region), with drips; amount 0..1 */
export const slimeSheet = (g: Ctx, x: number, y: number, w: number, h: number, amt: number, seed: number, f = 0) => {
  if (amt <= 0) return;
  const pts: P[] = [];
  const m = 14;
  for (let i = 0; i <= m; i++) pts.push([x - w / 2 + (w * i) / m, y - h * amt * (0.6 + 0.4 * rnd(seed, i))]);
  for (let i = m; i >= 0; i--) pts.push([x - w / 2 + (w * i) / m, y + 12 + 18 * rnd(seed, i + 30) * amt]);
  g.save(); g.globalAlpha = 0.85;
  poly(g, smoothClosed(pts, 3), lg(g, 0, y - h, 0, y + 20, [[0, "rgba(240,250,232,0.85)"], [1, "rgba(205,226,196,0.9)"]]), 4, "rgba(120,150,110,0.95)");
  for (let i = 0; i < 6; i++) { const dx = x - w / 2 + rnd(seed, i + 60) * w, d = (30 + 60 * rnd(seed, i + 61)) * amt * (0.9 + 0.1 * Math.sin(f * 0.15 + i)); rr(g, dx - 7, y, 14, d, 7, "rgba(236,246,226,0.9)", 2.5, "rgba(120,150,110,0.95)"); }
  for (let i = 0; i < 5; i++) ell(g, x - w / 2 + rnd(seed, i + 80) * w, y - h * amt * 0.5, 12, 6, "rgba(255,255,255,0.8)", 0, -0.3);
  g.restore();
};
/** a ball of tightly wound thread (skein) unravelling: u 0 = wound, 1 = fully loose */
export const skein = (g: Ctx, x: number, y: number, r: number, u: number, f: number, seed = 1) => {
  const k = clamp01(u);
  if (k < 1) {
    ell(g, x, y, r * (1 - 0.5 * k), r * (1 - 0.5 * k), "#f4f0e2", 4);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI; g.beginPath(); g.ellipse(x, y, r * (1 - 0.5 * k) * 0.92, r * 0.3 * (1 - 0.5 * k), a, 0, Math.PI * 2); g.strokeStyle = "rgba(160,150,130,0.8)"; g.lineWidth = 2.5; g.stroke(); }
  }
  if (k > 0) for (let j = 0; j < 5; j++) {
    const pts: P[] = [];
    for (let i = 0; i < 12; i++) { const t = i / 11, a = j * 1.3 + seed + t * 5 * k; pts.push([x + Math.cos(a) * r * (0.3 + 3.5 * t * k) + Math.sin(f * 0.1 + i + j) * 8 * k, y + Math.sin(a) * r * (0.3 + 2.2 * t * k)]); }
    line(g, smoothOpen(pts, 4), "rgba(250,248,236,0.95)", 3);
  }
};

// ---------------- vehicles ----------------
/** flatbed truck facing +x, wheels on y = 0; totes = number of blue containers on the bed (0..13) */
export const flatbed = (g: Ctx, x: number, y: number, s: number, totes = 13, col = "#e8e2d4", flip = false) => {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  rr(g, -420, -110, 620, 40, 6, "#5d6170", 5);
  for (let i = 0; i < Math.min(totes, 13); i++) {
    const row = Math.floor(i / 5), col2 = i % 5;
    if (row > 2) break;
    tote(g, -390 + col2 * 118 + row * 30, -110 - row * 82, 1);
  }
  // cab
  poly(g, [[200, -70], [200, -300], [330, -300], [400, -190], [410, -70]], lg(g, 200, 0, 410, 0, [[0, light(col, 0.1)], [1, dark(col, 0.2)]]), 6);
  poly(g, [[225, -280], [320, -280], [375, -190], [225, -190]], "#bfe3f2", 4);
  rr(g, 395, -110, 40, 30, 6, "#d9dde0", 4);
  for (const wx of [-300, -170, 300]) { ell(g, wx, -30, 50, 50, "#1d1b22", 5); ell(g, wx, -30, 22, 22, "#c9ccd2", 4); }
  g.restore();
};
export const tote = (g: Ctx, x: number, y: number, s: number, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  poly(g, [[0, 0], [108, 0], [104, -78], [4, -78]], lg(g, 0, -78, 108, 0, [[0, "#4a8ad8"], [1, "#2f5f9e"]]), 4);
  line(g, [[6, -60], [102, -60]], rgba(INKC, 0.5), 3);
  g.restore();
};
/** a modern hatchback, side view facing +x, wheels on y=0, length ~520 */
export const hatch = (g: Ctx, x: number, y: number, s: number, col = "#c9443c", flip = false) => {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  path(g, smoothClosed([[-260, -40], [-255, -140], [-160, -235], [90, -235], [190, -150], [265, -125], [265, -40]], 3));
  g.fillStyle = lg(g, 0, -235, 0, -40, [[0, light(col, 0.2)], [1, dark(col, 0.2)]]); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  poly(g, [[-220, -145], [-150, -215], [-40, -215], [-40, -145]], "#bfe3f2", 4);
  poly(g, [[-20, -145], [-20, -215], [80, -215], [160, -145]], "#bfe3f2", 4);
  for (const wx of [-160, 160]) { ell(g, wx, -30, 50, 50, "#1d1b22", 5); ell(g, wx, -30, 22, 22, "#c9ccd2", 4); }
  ell(g, 250, -110, 12, 10, "#fff3b0", 3);
  g.restore();
};
export const bulldozer = (g: Ctx, x: number, y: number, s: number, f: number, flip = false) => {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  rr(g, -220, -70, 360, 70, 30, "#3a3d47", 5);
  for (let i = 0; i < 8; i++) ell(g, -190 + i * 44, -35, 14, 14, "#5d6170", 3);
  rr(g, -180, -200, 260, 130, 10, "#f2c230", 6);
  rr(g, -150, -320, 150, 130, 8, "#f2c230", 6); rr(g, -130, -300, 110, 80, 6, "#bfe3f2", 4);
  line(g, [[60, -150], [190, -80]], INKC, 12);
  poly(g, [[180, -170], [250, -150], [250, 0], [170, 0]], lg(g, 170, 0, 250, 0, [[0, "#d9a52a"], [1, "#a8781a"]]), 6);
  line(g, [[-40, -320], [-40, -360]], INKC, 8); if (f % 20 < 10) ell(g, -40, -370, 12, 12, "#ff9a2e", 3);
  g.restore();
};
export const shark = (g: Ctx, x: number, y: number, s: number, f: number, o: { gag?: number; mouth?: number; flip?: boolean } = {}) => {
  const { gag = 0, mouth = 0, flip = false } = o;
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const sw = Math.sin(f * 0.2) * 10;
  poly(g, [[-300, -10 + sw], [-420, -110 + sw], [-390, 0 + sw], [-430, 90 + sw], [-300, 20 + sw]], "#6a7f9a", 5);
  path(g, smoothClosed([[300, 10], [250, -60], [100, -95], [-150, -70], [-310, -10], [-150, 60], [100, 80], [250, 50]], 5));
  g.fillStyle = lg(g, 0, -95, 0, 80, [[0, "#7d92ad"], [0.55, "#9fb2c8"], [1, "#eef2f6"]]); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  poly(g, [[0, -88], [60, -220], [110, -85]], "#6a7f9a", 5);
  poly(g, [[40, 60], [-20, 160], [100, 70]], "#6a7f9a", 5);
  for (let i = 0; i < 4; i++) line(g, [[120 - i * 22, -30], [110 - i * 22, 30]], INKC, 4);
  // eye
  if (gag > 0.5) { line(g, [[200, -35], [222, -15]], INKC, 6); line(g, [[222, -35], [200, -15]], INKC, 6); }
  else ell(g, 210, -25, 10, 10, INKC, 0);
  // mouth
  const m = clamp01(mouth);
  poly(g, [[300, 10], [180, 30 + 50 * m], [240, 10]], m > 0.2 ? "#5a1e28" : null, 5);
  if (m > 0.2) for (let i = 0; i < 4; i++) poly(g, [[200 + i * 22, 28 + 30 * m], [210 + i * 22, 14 + 30 * m], [220 + i * 22, 30 + 30 * m]], "#ffffff", 2);
  if (gag > 0) {
    // slime hanging from the gills and mouth
    for (let i = 0; i < 4; i++) { const d = (60 + 80 * rnd(i, 3)) * gag * (0.9 + 0.1 * Math.sin(f * 0.2 + i)); rr(g, 100 - i * 22 - 8, 30, 16, d, 8, "rgba(236,246,226,0.9)", 3, "rgba(120,150,110,0.95)"); }
    ell(g, 290, 40, 40 * gag, 30 * gag, "rgba(236,246,226,0.9)", 3, 0, "rgba(120,150,110,0.95)");
  }
  g.restore();
};
/** a steering wheel with an airbag bursting out (u 0..1), snot coloured when snot */
export const airbag = (g: Ctx, x: number, y: number, s: number, u: number, snot = false) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  ell(g, 0, 0, 160, 160, null, 26, 0, INKC); ell(g, 0, 0, 160, 160, null, 16, 0, "#3a3d47");
  ell(g, 0, 0, 60, 60, "#3a3d47", 5);
  const k = easeOut(u);
  if (k > 0) {
    const col = snot ? "#d9f0c4" : "#f4f4f0";
    poly(g, blob(0, -20, 60 + 260 * k, 50 + 220 * k, 5, 10, 0.12), lg(g, 0, -300, 0, 200, [[0, light(col, 0.3)], [1, dark(col, 0.12)]]), 6);
    if (snot) for (let i = 0; i < 5; i++) rr(g, -180 + i * 90, 120 * k + 20, 22, 60 + 50 * rnd(i, 2), 11, col, 4);
    ell(g, -80 * k, -120 * k, 50 * k, 30 * k, "rgba(255,255,255,0.7)", 0, -0.4);
  }
  g.restore();
};
/** orange diamond road-work sign on a post */
export const workSign = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  line(g, [[0, 0], [0, -300]], INKC, 14); line(g, [[0, 0], [0, -300]], "#9aa4b0", 8);
  poly(g, [[0, -520], [140, -380], [0, -240], [-140, -380]], "#f08a2c", 7);
  g.fillStyle = INKC; g.font = "900 40px CapFont"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("ROAD", 0, -405); g.fillText("WORK", 0, -360);
  g.restore();
};
export const stopPaddle = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  line(g, [[0, 0], [0, 160]], INKC, 12);
  const pts: P[] = [];
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; pts.push([Math.cos(a) * 90, Math.sin(a) * 90]); }
  poly(g, pts, "#d8332c", 6);
  g.fillStyle = "#ffffff"; g.font = "900 46px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("STOP", 0, 2);
  g.restore();
};
export const trex = (g: Ctx, x: number, y: number, s: number, col = "#5a8a4a") => {
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, smoothClosed([[200, -400], [120, -330], [60, -250], [-60, -230], [-300, -160], [-420, -150], [-250, -110], [-60, -110], [0, 0], [40, 0], [40, -120], [90, -160], [120, -200], [210, -300], [260, -330], [300, -380]], 3), col, 6);
  ell(g, 230, -370, 10, 10, INKC, 0);
  line(g, [[120, -200], [160, -170]], INKC, 8);
  g.restore();
};
/** a hose spraying water from (x, y) toward angle a, length L */
export const hoseSpray = (g: Ctx, x: number, y: number, a: number, L: number, f: number) => {
  for (let i = 0; i < 26; i++) {
    const t = ((i * 0.04 + f * 0.05) % 1), d = t * L, sp = (rnd(i, 3) - 0.5) * 60 * t;
    const px = x + Math.cos(a) * d - Math.sin(a) * sp, py = y + Math.sin(a) * d + Math.cos(a) * sp + t * t * 120;
    ell(g, px, py, 10 + 14 * t, 8 + 10 * t, `rgba(190,232,255,${0.9 - 0.5 * t})`, 2.5, 0, "rgba(80,140,200,0.8)");
  }
};
export { rg };
