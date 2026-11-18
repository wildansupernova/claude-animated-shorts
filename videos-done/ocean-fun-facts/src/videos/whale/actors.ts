// Exploding whale short: the whale, dynamite, detonator, crowd outfits, 1970 car, blubber, explosion, signs.
import type { Ctx } from "../../lib/engine";
import { rnd, clamp01, easeOut } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, smoothClosed, blob } from "../../lib/paint";
import { Outfit, INK } from "../../lib/toon";

// ---------------- cast ----------------
export const ENGINEER: Outfit = { jacket: "#f08a2c", pants: "#3b4a6a", boots: "#4a3426", hat: "hardhat", cap: "#f2f2ea", buttons: "#f2f2ea", glasses: true };
export const WORKER: Outfit = { jacket: "#f08a2c", pants: "#3b4a6a", boots: "#4a3426", hat: "hardhat", buttons: "#ffe14d" };
export const WALTER: Outfit = { jacket: "#6b5a3a", pants: "#4a4458", boots: "#3a2a22", hat: "cap", cap: "#5d6b3a", moustache: "#bdb6a6", skin: "#f5c9a0", buttons: "#d9c9a0", build: "stout" };
export const REPORTER: Outfit = { jacket: "#8c3b4a", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#3a2a22", tie: "#e8c45a" };
export const CAMERAMAN: Outfit = { jacket: "#3f6fb5", pants: "#3b3f52", boots: INK, hat: "beanie", cap: "#c9443c" };
export const SALESMAN: Outfit = { jacket: "#c8a23a", pants: "#6b4a3a", boots: INK, hat: "hair", hair: "#2a201a", moustache: "#2a201a", buttons: "#ffffff" };
export const COOK: Outfit = { jacket: "#5a8fc2", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#d9a54e" };
const COATS = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#c9a03a", "#a84a6a"];
const HAIRS = ["#3a2a22", "#8a4f2a", "#d9a54e", "#1d1b22", "#b8b2a4"];
export const crowdOutfit = (i: number): Outfit => ({
  jacket: COATS[i % COATS.length], pants: ["#3b3f52", "#4a4458", "#5a4a3a"][i % 3], boots: INK,
  hat: i % 5 === 3 ? "beanie" : "hair", hair: HAIRS[i % HAIRS.length], cap: COATS[(i + 3) % COATS.length], skin: ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"][i % 4],
  glasses: i % 7 === 2,
});

// ---------------- the whale ----------------
/** sperm whale lying on its side, facing +x, centre-bottom at (0, 0), length ~1000 units; dead = x eyes */
export const spermWhale = (g: Ctx, o: { dead?: boolean; crater?: number; chunks?: number; f?: number } = {}) => {
  const { dead = true, crater = 0 } = o;
  const body: P[] = smoothClosed([
    [520, -40], [520, -300], [470, -380], [300, -400], [80, -360], [-150, -300], [-330, -210], [-440, -130], [-500, -70],
    [-440, -30], [-200, 0], [100, 4], [380, 0], [500, -10],
  ], 6);
  // flukes
  poly(g, [[-460, -90], [-640, -220], [-600, -110], [-680, -10], [-480, -50]], lg(g, -680, 0, -460, 0, [[0, "#4b5668"], [1, "#647086"]]), 6);
  path(g, body);
  g.fillStyle = lg(g, 0, -400, 0, 10, [[0, "#7d8aa0"], [0.45, "#5f6b82"], [1, "#3d475a"]]);
  g.fill();
  g.save(); path(g, body); g.clip();
  // wrinkles (sperm whales are wrinkly)
  for (let i = 0; i < 26; i++) {
    const x = -420 + i * 36, y0 = -300 + Math.abs(x) * 0.12;
    line(g, [[x, y0], [x + 10, y0 + 40], [x - 4, y0 + 80]], "rgba(30,35,50,0.25)", 4);
  }
  // pale belly/jaw band
  g.fillStyle = "rgba(220,225,232,0.55)";
  g.beginPath(); g.moveTo(520, -40); g.quadraticCurveTo(250, 10, -200, -10); g.lineTo(-200, 30); g.lineTo(540, 30); g.closePath(); g.fill();
  if (crater > 0) {
    // blasted-open side: raw blubber
    ell(g, 40, -120, 210 * crater, 130 * crater, "#e9b28a", 0);
    ell(g, 40, -110, 150 * crater, 90 * crater, "#c8574a", 0);
  }
  g.restore();
  path(g, body); g.lineWidth = 6; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  // jaw line + mouth
  line(g, [[520, -60], [300, -50], [160, -40]], INKC, 5);
  for (let i = 0; i < 6; i++) poly(g, [[480 - i * 50, -58], [470 - i * 50, -40], [460 - i * 50, -58]], "#f4f0e2", 2.5);
  // eye
  if (dead) {
    line(g, [[230, -170], [262, -140]], INKC, 7); line(g, [[262, -170], [230, -140]], INKC, 7);
  } else ell(g, 246, -155, 14, 14, INKC, 0);
  // pectoral fin
  poly(g, [[150, -60], [60, 30], [190, -10]], "#4b5668", 5);
  if (crater > 0) ell(g, 40, -120, 210 * crater, 130 * crater, null, 5);
};
/** wavy green stink lines rising from (x, y) */
export const stink = (g: Ctx, x: number, y: number, f: number, n = 4, s = 1) => {
  for (let i = 0; i < n; i++) {
    const t = ((f * 0.8 + i * 18) % 60) / 60, xx = x + (i - n / 2) * 60 * s, pts: P[] = [];
    for (let k = 0; k < 8; k++) pts.push([xx + Math.sin(k * 1.2 + f * 0.15 + i) * 14 * s, y - t * 160 * s - k * 22 * s]);
    g.save(); g.globalAlpha = Math.sin(t * Math.PI);
    line(g, pts, INKC, 13 * s); line(g, pts, "#9ad94a", 7 * s);
    g.restore();
  }
};
export const fly = (g: Ctx, x: number, y: number, f: number, seed: number) => {
  const a = f * 0.3 + seed, px = x + Math.cos(a) * 60 + Math.sin(a * 2.3) * 20, py = y + Math.sin(a * 1.3) * 40;
  ell(g, px, py, 6, 5, INKC, 0);
  ell(g, px - 4, py - 6, 5, 3, "rgba(255,255,255,0.8)", 1.5, -0.5); ell(g, px + 4, py - 6, 5, 3, "rgba(255,255,255,0.8)", 1.5, 0.5);
};

// ---------------- dynamite ----------------
export const crate = (g: Ctx, x: number, y: number, s: number, text = true) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -80, -110, 160, 110, 6, lg(g, -80, 0, 80, 0, [[0, "#c9955a"], [1, "#9a6a3a"]]), 5);
  line(g, [[-80, -55], [80, -55]], rgba(INKC, 0.5), 3);
  rr(g, -80, -110, 18, 110, 3, "#8a5a34", 3); rr(g, 62, -110, 18, 110, 3, "#8a5a34", 3);
  if (text) {
    g.fillStyle = "#c8261e"; g.font = "900 46px CapFont"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("TNT", 0, -52);
  }
  g.restore();
};
export const stickDyn = (g: Ctx, x: number, y: number, s: number, rot = 0, lit = 0, f = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rr(g, -16, -80, 32, 120, 8, lg(g, -16, 0, 16, 0, [[0, "#ff5a4a"], [1, "#b8261e"]]), 4);
  line(g, [[0, -80], [8, -105], [0, -125]], INKC, 4);
  if (lit) {
    for (let i = 0; i < 6; i++) { const a = rnd(i, f) * Math.PI * 2, r = 10 + rnd(i + 3, f) * 22; line(g, [[0, -125], [Math.cos(a) * r, -125 + Math.sin(a) * r]], "#ffe14d", 4); }
    ell(g, 0, -125, 8, 8, "#fff6c0", 0);
  }
  g.restore();
};
/** T-handle plunger detonator box; push 0..1 */
export const plunger = (g: Ctx, x: number, y: number, s: number, push: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  const up = (1 - clamp01(push)) * 110;
  line(g, [[0, -150 - up], [0, -150]], INKC, 18); line(g, [[0, -150 - up], [0, -150]], "#c9ccd2", 10);
  rr(g, -90, -175 - up, 180, 28, 12, "#3a3d47", 5);
  rr(g, -120, -150, 240, 150, 10, lg(g, 0, -150, 0, 0, [[0, "#c8261e"], [1, "#8a1a14"]]), 6);
  g.fillStyle = "#fff4d0"; g.font = "900 34px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TNT", 0, -75);
  line(g, [[120, -40], [220, -20], [300, 10]], INKC, 6);
  g.restore();
};

// ---------------- explosion / blubber ----------------
export const fireball = (g: Ctx, x: number, y: number, t: number, s = 1) => {
  // t: frames since detonation
  const k = easeOut(t / 10), fade = clamp01(1 - (t - 14) / 30);
  if (fade <= 0) return;
  g.save(); g.globalAlpha = fade;
  for (let i = 0; i < 14; i++) {
    const a = rnd(i, 1) * Math.PI - Math.PI, r = (140 + rnd(i, 2) * 260) * k * s, rad = (90 + rnd(i, 3) * 110) * (0.6 + 0.4 * k) * s;
    ell(g, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 0.9 - 120 * k * s, rad, rad * 0.9, t < 8 ? "#fff3b0" : i % 2 ? "#ff9a2e" : "#ffcf4a", 5);
  }
  ell(g, x, y - 140 * k * s, 230 * k * s, 200 * k * s, t < 6 ? "#ffffff" : "#ffe27a", 0);
  g.restore();
};
export const smoke = (g: Ctx, x: number, y: number, t: number, s = 1, seed = 1) => {
  if (t < 0) return;
  const k = easeOut(t / 40), fade = clamp01(1 - (t - 30) / 60);
  g.save(); g.globalAlpha = fade * 0.95;
  for (let i = 0; i < 12; i++) {
    const a = rnd(seed, i) * Math.PI - Math.PI, r = (200 + rnd(seed, i + 5) * 300) * k * s, rad = (120 + rnd(seed, i + 9) * 100) * (0.5 + 0.5 * k) * s;
    ell(g, x + Math.cos(a) * r, y - 300 * k * s + Math.sin(a) * r * 0.6 - t * 1.5, rad, rad * 0.85, i % 2 ? "#d8cfc4" : "#bdb2a6", 4, 0, rgba(INKC, 0.6));
  }
  g.restore();
};
/** a slab of blubber: grey skin on one side, cream/pink fat */
export const blubber = (g: Ctx, x: number, y: number, s: number, rot: number, seed: number) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const pts = blob(0, 0, 60, 38, seed, 7, 0.35);
  poly(g, pts, lg(g, 0, -40, 0, 40, [[0, "#f4d2b0"], [0.6, "#e9a98a"], [1, "#c8574a"]]), 5);
  g.save(); path(g, pts); g.clip(); g.fillStyle = "#5f6b82"; g.fillRect(-80, -50, 160, 20); g.restore();
  path(g, pts); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke();
  g.restore();
};
/** flying chunk on a ballistic arc: launched at frame f0 from (x0, y0) with velocity (vx, vy) px/frame, gravity gr */
export const arcPos = (f: number, f0: number, x0: number, y0: number, vx: number, vy: number, gr = 1.1, ground = 1e9): [number, number, boolean] => {
  const t = Math.max(0, f - f0);
  let x = x0 + vx * t, y = y0 + vy * t + 0.5 * gr * t * t;
  let landed = false;
  if (y > ground) {
    // solve the landing time and stop there
    const a = 0.5 * gr, b = vy, c = y0 - ground, tl = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
    x = x0 + vx * tl; y = ground; landed = true;
  }
  return [x, y, landed];
};
export const splat = (g: Ctx, x: number, y: number, s: number, seed: number, col = "#e9b28a") => {
  const pts: P[] = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = (i % 2 ? 52 : 66) * (0.8 + 0.4 * rnd(seed, i)); pts.push([x + Math.cos(a) * r * s, y + Math.sin(a) * r * s * 0.55]); }
  poly(g, smoothClosed(pts, 3), col, 4);
  for (let i = 0; i < 5; i++) { const a = rnd(seed, i + 30) * Math.PI * 2, r = 100 + rnd(seed, i + 40) * 40; ell(g, x + Math.cos(a) * r * s, y + Math.sin(a) * r * s * 0.5, 10 * s, 7 * s, col, 3); }
};

// ---------------- vehicles / props ----------------
/** 1970 sedan side view facing +x, wheels on y = 0, length ~ 620 units; crush 0..1 flattens the roof */
export const car70 = (g: Ctx, x: number, y: number, s: number, col = "#2f8a8a", crush = 0, bow = false, flip = false) => {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const c = clamp01(crush);
  // body
  poly(g, [[-310, -60], [-300, -135], [310, -140], [325, -70], [320, -40], [-315, -40]], lg(g, 0, -140, 0, -40, [[0, light(col, 0.15)], [1, dark(col, 0.25)]]), 6);
  line(g, [[-300, -100], [315, -104]], "#e9eef2", 6);
  // cabin (roof squashes)
  const rt = -230 + 100 * c, lean = 20 * c;
  poly(g, [[-170, -135], [-110 + lean, rt], [140 - lean, rt], [200, -138]], lg(g, 0, rt, 0, -135, [[0, light(col, 0.25)], [1, col]]), 6);
  // windows
  if (c < 0.6) {
    poly(g, [[-150, -140], [-100 + lean, rt + 16], [10, rt + 16], [10, -140]], "#bfe3f2", 4);
    poly(g, [[30, -140], [30, rt + 16], [130 - lean, rt + 16], [180, -140]], "#bfe3f2", 4);
    line(g, [[-110, -150], [-80, rt + 30]], "rgba(255,255,255,0.8)", 6);
  } else {
    poly(g, [[-150, -140], [-100, rt + 8], [170, rt + 8], [180, -140]], "#3a3f4c", 4);
    for (let i = 0; i < 6; i++) line(g, [[-120 + i * 50, -140], [-100 + i * 50 + 20, rt + 10]], "#bfe3f2", 3);
  }
  // bumpers, lights
  rr(g, 300, -80, 34, 30, 6, "#d9dde0", 4); rr(g, -334, -80, 34, 30, 6, "#d9dde0", 4);
  ell(g, 318, -112, 12, 12, "#fff3b0", 3);
  // wheels
  for (const wx of [-200, 200]) { ell(g, wx, -30, 58, 58, "#1d1b22", 5); ell(g, wx, -30, 30, 30, "#c9ccd2", 4); }
  if (bow) {
    // a big gift bow on the roof: brand new
    const by = rt - 10;
    poly(g, [[0, by], [-70, by - 50], [-60, by + 20]], "#e8322e", 4); poly(g, [[0, by], [70, by - 50], [60, by + 20]], "#e8322e", 4);
    ell(g, 0, by, 20, 18, "#ff5a4a", 4);
  }
  g.restore();
};
export const trafficCone = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -50, -12, 100, 14, 4, "#f08a2c", 4);
  poly(g, [[-34, -12], [-10, -120], [10, -120], [34, -12]], "#f08a2c", 4);
  poly(g, [[-26, -45], [-17, -80], [17, -80], [26, -45]], "#f4f4f0", 0);
  g.restore();
};
/** green highway sign on two posts with text */
export const roadSign = (g: Ctx, x: number, y: number, s: number, lines: string[], col = "#1f7a4a") => {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const px of [-120, 120]) { line(g, [[px, 0], [px, -330]], INKC, 16); line(g, [[px, 0], [px, -330]], "#9aa4b0", 9); }
  rr(g, -230, -560, 460, 260, 18, col, 7);
  rr(g, -214, -544, 428, 228, 12, null, 5, "#f4f4f0");
  g.fillStyle = "#f4f4f0"; g.font = "900 64px CapFont"; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((t, i) => g.fillText(t, 0, -430 - ((lines.length - 1) / 2) * 75 + i * 75));
  g.restore();
};
export const thoughtBubble = (g: Ctx, x: number, y: number, w: number, h: number, fromX: number, fromY: number, inner: (g: Ctx) => void, k = 1) => {
  if (k <= 0) return;
  g.save(); g.translate(fromX + (x - fromX) * k, fromY + (y - fromY) * k); g.scale(k, k);
  const cx = 0, cy = 0, pts: P[] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 1 + (i % 2 ? 0.08 : 0); pts.push([cx + Math.cos(a) * w / 2 * r, cy + Math.sin(a) * h / 2 * r]); }
  poly(g, smoothClosed(pts, 4), "#ffffff", 6);
  g.save(); g.beginPath(); g.ellipse(0, 0, w / 2 - 10, h / 2 - 10, 0, 0, Math.PI * 2); g.clip(); inner(g); g.restore();
  g.restore();
  const dx = (x - fromX) * k, dy = (y - fromY) * k;
  for (let i = 1; i <= 3; i++) ell(g, fromX + dx * (i * 0.12), fromY + dy * (i * 0.12), 8 + i * 6, 8 + i * 6, "#ffffff", 5);
};
export const tvCamera = (g: Ctx, x: number, y: number, s: number, f: number, rec = true) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const a of [-0.35, 0, 0.35]) line(g, [[0, -200], [Math.sin(a) * 200, 0]], INKC, 8);
  rr(g, -110, -320, 220, 130, 14, "#3a3d47", 6);
  ell(g, -50, -340, 50, 50, "#2a2d36", 5); ell(g, 60, -340, 50, 50, "#2a2d36", 5);
  rr(g, 110, -290, 80, 70, 8, "#2a2d36", 5); ell(g, 190, -255, 30, 34, "#9fd4ff", 5);
  if (rec && f % 30 < 18) ell(g, -80, -295, 11, 11, "#ff3b30", 3);
  g.restore();
};
export const banner = (g: Ctx, x: number, y: number, w: number, h: number, text: string, f: number) => {
  // bunting
  for (let i = 0; i < 10; i++) {
    const bx = x - w / 2 + (w * i) / 9;
    poly(g, [[bx - 22, y - h / 2 - 60], [bx + 22, y - h / 2 - 60], [bx, y - h / 2 - 10 + Math.sin(f * 0.2 + i) * 4]], ["#e8322e", "#ffd84a", "#4a8ad8"][i % 3], 3);
  }
  line(g, [[x - w / 2 - 40, y - h / 2 - 60], [x + w / 2 + 40, y - h / 2 - 60]], INKC, 4);
  rr(g, x - w / 2, y - h / 2, w, h, 16, lg(g, 0, y - h / 2, 0, y + h / 2, [[0, "#ffe14d"], [1, "#f2b23a"]]), 7);
  g.fillStyle = "#c8261e"; g.font = `900 ${Math.round(h * 0.42)}px CapFont`; g.textAlign = "center"; g.textBaseline = "middle";
  g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.lineJoin = "round"; g.strokeText(text, x, y + 4); g.fillText(text, x, y + 4);
};
export const pudding = (g: Ctx, x: number, y: number, s: number, wob = 0) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, [[-130, -60], [130, -60], [100, 30], [-100, 30]], lg(g, -130, 0, 130, 0, [[0, "#e9eef2"], [1, "#b9c6d0"]]), 5);
  const w = Math.sin(wob) * 8;
  path(g, smoothClosed([[-120, -60], [-100, -150 + w], [-30, -200], [40, -195 - w], [105, -150 + w], [120, -60]], 5));
  g.fillStyle = lg(g, 0, -200, 0, -60, [[0, "#a8673a"], [1, "#6b3a1e"]]); g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke();
  ell(g, -40, -160, 30, 14, "rgba(255,255,255,0.4)", 0, -0.3);
  g.restore();
};
export { rg };
