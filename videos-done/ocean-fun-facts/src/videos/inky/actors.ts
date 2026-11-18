// Inky short: the octopus (squishable), aquarium props, keeper outfits, rugby ball, jar, puzzle, brain-in-a-bag.
import type { Ctx } from "../../lib/engine";
import { rnd, clamp01 } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, smoothClosed, smoothOpen } from "../../lib/paint";
import { Outfit, INK } from "../../lib/toon";

export const KEEPER: Outfit = { jacket: "#2f8a8a", pants: "#3b3f52", boots: INK, hat: "cap", cap: "#1f5a8a", skin: "#f5c9a0" };
export const KEEPER2: Outfit = { jacket: "#2f8a8a", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#d9a54e" };
export const FISHER: Outfit = { jacket: "#f2c230", pants: "#3b4a6a", boots: "#1d1b22", hat: "beanie", cap: "#2a3a6a", beard: "#6b4a3a", skin: "#f5c9a0" };

export type OctoOpts = { f?: number; col?: string; expr?: "curious" | "sly" | "happy" | "sleepy" | "shock" | "determined"; sx?: number; sy?: number; seed?: number; arms?: number; scars?: boolean; reach?: number; look?: number };
/** octopus: mantle up, arms below; centred on the mantle base (0, 0); ~260 units wide. sx/sy squash for squeezing */
export const octopus = (g: Ctx, o: OctoOpts = {}) => {
  const { f = 0, col = "#e0643c", expr = "curious", sx = 1, sy = 1, seed = 1, arms = 1, scars = false, reach = 0, look = 0 } = o;
  g.save(); g.scale(sx, sy);
  // arms (behind + front), curling tips with suckers
  for (let k = 0; k < 8; k++) {
    const side = k < 4 ? -1 : 1, i = k % 4, base: P = [side * (20 + i * 22), 10];
    const L = (290 + 40 * (i % 2)) * arms, pts: P[] = [base];
    for (let j = 1; j <= 8; j++) {
      const t = j / 8, sw = Math.sin(f * 0.12 + k * 1.3 + t * 3) * 30 * t;
      const ang = Math.PI / 2 + side * (0.25 + i * 0.36) - side * reach * (k === 7 ? 1.3 : 0);
      pts.push([base[0] + Math.cos(ang) * L * t + sw + side * Math.pow(t, 3) * 60, base[1] + Math.sin(ang) * L * t - Math.pow(t, 4) * 40 * (1 + (k % 2))]);
    }
    const sm = smoothOpen(pts, 4), wd = 36;
    const Lp: P[] = [], Rp: P[] = [];
    sm.forEach((p, idx) => { const a = sm[Math.max(0, idx - 1)], b = sm[Math.min(sm.length - 1, idx + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ww = wd * (1 - idx / sm.length) + 3; Lp.push([p[0] - (dy / l) * ww / 2, p[1] + (dx / l) * ww / 2]); Rp.push([p[0] + (dy / l) * ww / 2, p[1] - (dx / l) * ww / 2]); });
    poly(g, [...Lp, ...Rp.reverse()], k % 2 ? dark(col, 0.12) : col, 4);
    for (let j = 2; j < sm.length - 3; j += 4) ell(g, sm[j][0], sm[j][1], 4.5, 4.5, "#f7c8a8", 1.5);
  }
  // mantle (head)
  path(g, smoothClosed([[-95, 20], [-120, -80], [-90, -190], [0, -235], [90, -190], [120, -80], [95, 20]], 5));
  g.fillStyle = lg(g, -120, -230, 120, 30, [[0, light(col, 0.25)], [0.6, col], [1, dark(col, 0.25)]]); g.fill();
  g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  for (let i = 0; i < 6; i++) ell(g, -60 + rnd(seed, i) * 120, -170 + rnd(seed, i + 9) * 100, 6 + rnd(seed, i + 3) * 8, 5 + rnd(seed, i + 4) * 6, rgba(dark(col, 0.3), 0.5), 0);
  if (scars) { line(g, [[-70, -150], [-40, -120]], "#f7d0b0", 5); line(g, [[50, -170], [80, -140], [70, -120]], "#f7d0b0", 5); }
  // eyes
  for (const s of [-1, 1]) {
    const ex = s * 46, ey = -40;
    ell(g, ex, ey, 26, 28, "#fff8e8", 5);
    const lx = look * 8;
    if (expr === "sleepy") { line(g, [[ex - 20, ey], [ex + 20, ey]], INKC, 6); continue; }
    if (expr === "shock") { ell(g, ex + lx, ey, 7, 7, INKC, 0); continue; }
    rr(g, ex - 6 + lx, ey - 12, 12, 26, 6, INKC, 0); // octopus slit pupil (vertical for cartoon read)
    if (expr === "sly" || expr === "determined") { g.save(); g.beginPath(); g.ellipse(ex, ey, 26, 28, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = col; g.fillRect(ex - 30, ey - 34, 60, expr === "sly" ? 28 : 20); g.restore(); line(g, [[ex - 24, ey - 8 + (expr === "determined" ? -6 : 0) + s * (expr === "determined" ? 6 : 0)], [ex + 24, ey - 8 + (expr === "determined" ? 6 : 0) - s * (expr === "determined" ? 6 : 0)]], INKC, 5); ell(g, ex, ey, 26, 28, null, 5); }
    if (expr === "happy") { g.save(); g.beginPath(); g.ellipse(ex, ey, 26, 28, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = col; g.fillRect(ex - 30, ey + 6, 60, 30); g.restore(); ell(g, ex, ey, 26, 28, null, 5); }
  }
  // mouth/siphon
  if (expr === "happy" || expr === "sly") { g.beginPath(); g.moveTo(-18, 2); g.quadraticCurveTo(0, 14, 18, 2); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke(); }
  else if (expr === "shock") ell(g, 0, 6, 10, 12, "#5a1e28", 4);
  else line(g, [[-12, 4], [12, 4]], INKC, 5);
  g.restore();
};

/** glass tank with water and gravel, lid offset `gap` (0 closed .. 1 wide) */
export const tankBox = (g: Ctx, x: number, y: number, w: number, h: number, gap = 0, glow = 1) => {
  rr(g, x - w / 2 - 20, y, w + 40, 60, 6, "#4a3a3a", 6);
  rr(g, x - w / 2, y - h, w, h, 8, lg(g, 0, y - h, 0, y, [[0, `rgba(80,190,230,${0.75 * glow + 0.15})`], [1, `rgba(20,90,150,${0.85})`]]), 0);
  for (let i = 0; i < 20; i++) ell(g, x - w / 2 + 20 + rnd(i, 1) * (w - 40), y - 20 - rnd(i, 2) * 30, 14, 9, ["#d9c08f", "#bfa070", "#8a7a6a"][i % 3], 2);
  for (let i = 0; i < 3; i++) line(g, smoothOpen([[x - w * 0.3 + i * w * 0.3, y - 30], [x - w * 0.32 + i * w * 0.3, y - h * 0.4], [x - w * 0.28 + i * w * 0.3, y - h * 0.6]], 4), "#3f8a4a", 10);
  line(g, [[x - w / 2 + 10, y - h + 30], [x + w / 2 - 10, y - h + 30]], "rgba(255,255,255,0.6)", 4);
  rr(g, x - w / 2, y - h, w, h, 8, null, 7);
  line(g, [[x - w / 2 + 30, y - h + 60], [x - w / 2 + 70, y - h + 160]], "rgba(255,255,255,0.5)", 8);
  // lid
  const off = gap * w * 0.18;
  rr(g, x - w / 2 - 10 + off, y - h - 26, w + 20, 26, 6, "#5d6170", 6);
};
export const drain = (g: Ctx, x: number, y: number, r: number) => {
  ell(g, x, y, r * 1.4, r * 0.5, "#2a2d36", 5);
  for (let i = -3; i <= 3; i++) line(g, [[x + i * r * 0.3, y - r * 0.4 * Math.sqrt(Math.max(0, 1 - (i / 3.6) ** 2))], [x + i * r * 0.3, y + r * 0.4 * Math.sqrt(Math.max(0, 1 - (i / 3.6) ** 2))]], "#9aa4b0", 6);
};
export const rugbyBall = (g: Ctx, x: number, y: number, s: number, rot = -0.3) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  path(g, smoothClosed([[-170, 0], [-110, -100], [0, -118], [110, -100], [170, 0], [110, 100], [0, 118], [-110, 100]], 5));
  g.fillStyle = lg(g, 0, -118, 0, 118, [[0, "#f4f4f0"], [1, "#c9ccd2"]]); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  g.save(); path(g, smoothClosed([[-170, 0], [-110, -100], [0, -118], [110, -100], [170, 0], [110, 100], [0, 118], [-110, 100]], 5)); g.clip();
  rr(g, -40, -130, 80, 260, 0, "#e8322e", 0); rr(g, 50, -130, 22, 260, 0, "#2a62b8", 0); rr(g, -72, -130, 22, 260, 0, "#2a62b8", 0); g.restore();
  path(g, smoothClosed([[-170, 0], [-110, -100], [0, -118], [110, -100], [170, 0], [110, 100], [0, 118], [-110, 100]], 5)); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  g.restore();
};
export const jar = (g: Ctx, x: number, y: number, s: number, lidOff = 0) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -90, -220, 180, 220, 30, "rgba(200,235,250,0.4)", 6);
  rr(g, -80 + lidOff * 60, -250 - lidOff * 80, 160, 40, 10, "#e8322e", 6);
  ell(g, 0, -90, 40, 30, "#f2c230", 4);
  g.restore();
};
export const puzzleCube = (g: Ctx, x: number, y: number, s: number, f: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(f * 0.1) * 0.2);
  const cols = ["#e8322e", "#ffd84a", "#4a8ad8", "#5ab06a", "#f08a2c", "#f4f4f0"];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rr(g, -90 + i * 60, -90 + j * 60, 56, 56, 8, cols[(i + j * 2 + Math.floor(f / 10)) % 6], 4);
  g.restore();
};
export const jellyBag = (g: Ctx, x: number, y: number, s: number, f: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  const w = Math.sin(f * 0.25) * 10;
  path(g, smoothClosed([[-160, 40], [-150 - w, -120], [-60, -200], [60, -200], [150 + w, -120], [160, 40], [0, 70]], 5));
  g.fillStyle = "rgba(255,120,150,0.55)"; g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  // brain inside
  path(g, smoothClosed([[-70, -60], [-60, -130], [0, -150], [60, -130], [70, -60], [0, -40]], 4)); g.fillStyle = "#f7a8c0"; g.fill(); g.lineWidth = 5; g.stroke();
  for (let i = 0; i < 4; i++) line(g, smoothOpen([[-50 + i * 30, -130], [-40 + i * 30, -100], [-55 + i * 30, -70]], 3), "#c8607a", 4);
  ell(g, -90, -150, 20, 12, "rgba(255,255,255,0.7)", 0, -0.5);
  g.restore();
};
export { rg, clamp01, INK };
