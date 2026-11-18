// "The Man with the Golden Arm": outfits, hospital bed, blood bags, donor chair, counter, golden arm, antibodies, red
// blood cells, baby, crib, syringe, shield, calendar, newspaper, balloons, Australia map, petri dish, thought bubble.
import type { Ctx } from "../../lib/engine";
import { rnd, clamp01 } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, smoothClosed, smoothOpen, blob } from "../../lib/paint";
import { Outfit, INK } from "../../lib/toon";

const BROWN = "#6a4a2a";
export const KID: Outfit = { jacket: "#a8d0ec", pants: "#a8d0ec", boots: "#f4f1ea", hat: "hair", hair: BROWN, build: "kid", skin: "#f5d2b0" };
export const jamesAt = (grey: number, glasses = false): Outfit => ({
  jacket: "#3f6fb0", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: mixHex(BROWN, "#dcdad6", grey), skin: "#f5d2b0", glasses, buttons: "#d9dde0",
});
export const NURSE: Outfit = { jacket: "#f4f4f0", pants: "#e8eef4", boots: "#f4f4f0", hat: "cap", cap: "#ffffff", skin: "#ecd0b6", buttons: "#c9ccd2" };
export const MOTHER: Outfit = { jacket: "#e86a9a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a", dress: "#e86a9a", skin: "#f5c9a0" };
export const DAUGHTER: Outfit = { jacket: "#5ab0c8", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#8a5a3a", dress: "#5ab0c8", skin: "#f5d2b0" };
export const SCI: Outfit = { jacket: "#f3f1ea", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#2a2020", glasses: true, buttons: "#c9ccd2", skin: "#c99067" };

export function mixHex(a: string, b: string, t: number) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
export const RED = "#d8323a";
export const GOLD = "#ffc83a";

/** tiny dot-eye face for cells, antibodies and babies; s ≈ half the face width */
export const miniFace = (g: Ctx, s: number, mood: "happy" | "scared" | "angry" | "calm" | "sleep" = "calm") => {
  for (const k of [-1, 1]) {
    if (mood === "sleep" || mood === "happy") { g.beginPath(); g.arc(k * s * 0.45, 0, s * 0.18, Math.PI * (mood === "sleep" ? 0.1 : 1.1), Math.PI * (mood === "sleep" ? 0.9 : 1.9), mood === "happy"); g.lineWidth = s * 0.12; g.strokeStyle = INKC; g.stroke(); continue; }
    ell(g, k * s * 0.45, 0, s * (mood === "scared" ? 0.2 : 0.14), s * (mood === "scared" ? 0.22 : 0.16), mood === "scared" ? "#fff8ee" : INKC, mood === "scared" ? s * 0.06 : 0);
    if (mood === "scared") ell(g, k * s * 0.45, s * 0.02, s * 0.07, s * 0.07, INKC, 0);
    if (mood === "angry") line(g, [[k * s * 0.7, -s * 0.32], [k * s * 0.22, -s * 0.18]], INKC, s * 0.1);
  }
  g.lineCap = "round";
  if (mood === "scared") ell(g, 0, s * 0.45, s * 0.12, s * 0.15, "#5a1e28", s * 0.05);
  else if (mood === "angry") line(g, [[-s * 0.2, s * 0.45], [s * 0.2, s * 0.4]], INKC, s * 0.1);
  else { g.beginPath(); g.moveTo(-s * 0.22, s * 0.35); g.quadraticCurveTo(0, s * 0.58, s * 0.22, s * 0.35); g.lineWidth = s * 0.1; g.strokeStyle = INKC; g.stroke(); }
};

// ---------------- hospital ----------------
/** bed seen from the front-side: headboard left; the patient is drawn by the caller between `back` and `front` */
export const bedBack = (g: Ctx, x: number, y: number, w = 620) => {
  rr(g, x - w / 2 - 20, y - 330, 40, 360, 10, "#c9ccd2", 5); // headboard post
  rr(g, x - w / 2, y - 250, 130, 200, 30, "#f4f4f0", 5); // pillow
};
export const bedFront = (g: Ctx, x: number, y: number, w = 620) => {
  // blanket over the legs, mattress and frame
  path(g, smoothClosed([[x - w / 2 + 120, y - 90], [x - 40, y - 140], [x + w / 2, y - 120], [x + w / 2 + 10, y + 10], [x - w / 2 + 100, y + 10]], 4));
  g.fillStyle = lg(g, 0, y - 140, 0, y + 10, [[0, "#9ac8f0"], [1, "#5a8ac8"]]); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  line(g, [[x - 20, y - 130], [x + 60, y - 10]], rgba(INKC, 0.25), 4);
  rr(g, x - w / 2 - 10, y + 10, w + 40, 46, 10, "#e8eef4", 5);
  for (const k of [-1, 1]) { rr(g, x + k * (w / 2 - 10) - 10, y + 56, 20, 120, 6, "#9aa4b0", 4); ell(g, x + k * (w / 2 - 10), y + 182, 22, 14, "#3a3d47", 3); }
};
export const ivStand = (g: Ctx, x: number, y: number, h = 820) => {
  line(g, [[x, y], [x, y - h]], INKC, 14); line(g, [[x, y], [x, y - h]], "#c9ccd2", 8);
  line(g, [[x - 70, y - h + 10], [x + 70, y - h + 10]], INKC, 12); line(g, [[x - 70, y - h + 10], [x + 70, y - h + 10]], "#c9ccd2", 6);
  for (const k of [-1, 0, 1]) line(g, [[x, y], [x + k * 80, y + 30]], "#9aa4b0", 8);
};
/** blood bag hanging from (x, y); fill 0..1 */
export const bloodBag = (g: Ctx, x: number, y: number, s = 1, fill = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  line(g, [[0, 0], [0, 26]], INKC, 4);
  rr(g, -46, 26, 92, 130, 18, "rgba(255,255,255,0.75)", 5);
  g.save(); g.beginPath(); g.rect(-46, 26 + 130 * (1 - fill), 92, 130 * fill); g.clip(); rr(g, -46, 26, 92, 130, 18, lg(g, 0, 26, 0, 156, [[0, "#ff5a5a"], [1, "#a8202a"]]), 0); g.restore();
  rr(g, -46, 26, 92, 130, 18, null, 5);
  rr(g, -28, 60, 56, 34, 6, "#ffffff", 3);
  poly(g, [[0, 66], [10, 80], [0, 88], [-10, 80]], RED, 0);
  g.restore();
};
export const drop = (g: Ctx, x: number, y: number, r: number, col = RED) => {
  path(g, smoothClosed([[0, -r * 1.5], [r * 0.7, -r * 0.3], [r, r * 0.3], [0, r], [-r, r * 0.3], [-r * 0.7, -r * 0.3]].map(([a, b]) => [x + a, y + b] as P), 4));
  g.fillStyle = lg(g, x, y - r * 1.5, x, y + r, [[0, light(col, 0.2)], [1, dark(col, 0.25)]]); g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke();
  ell(g, x - r * 0.35, y - r * 0.1, r * 0.18, r * 0.3, "rgba(255,255,255,0.6)", 0, 0.3);
};

// ---------------- donor chair, needle, plasma machine ----------------
export const donorChair = (g: Ctx, x: number, y: number, s = 1, col = "#3a8a9a") => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -150, -520, 300, 420, 60, lg(g, -150, 0, 150, 0, [[0, light(col, 0.15)], [1, dark(col, 0.2)]]), 6); // back
  rr(g, -190, -120, 380, 110, 30, col, 6); // seat
  rr(g, -40, -10, 80, 120, 8, "#9aa4b0", 5); rr(g, -160, 100, 320, 26, 10, "#7a8490", 5); // base
  g.restore();
};
/** armrest across the front of the chair, to the right; arm drawn on top by the caller */
export const armRest = (g: Ctx, x: number, y: number, s = 1) => { g.save(); g.translate(x, y); g.scale(s, s); rr(g, 0, -20, 280, 44, 20, "#2a6a7a", 5); g.restore(); };
/** forearm lying left→right from (x, y), length L; gold 0..1 makes it golden */
export const forearm = (g: Ctx, x: number, y: number, L: number, gold = 0, sleeve = "#3f6fb0", skin = "#f5d2b0") => {
  const col = mixHex(skin, GOLD, gold);
  rr(g, x - 40, y - 46, 90, 92, 30, sleeve, 6);
  rr(g, x + 30, y - 34, L, 68, 34, lg(g, 0, y - 34, 0, y + 34, [[0, light(col, 0.25)], [1, dark(col, 0.15)]]), 6);
  ell(g, x + 30 + L, y, 44, 40, col, 6); // fist
  line(g, [[x + 30 + L - 20, y - 20], [x + 30 + L - 10, y + 20]], rgba(INKC, 0.5), 4);
  if (gold > 0.3) for (let i = 0; i < 3; i++) line(g, [[x + 80 + i * (L / 3), y - 24], [x + 120 + i * (L / 3), y - 24]], "rgba(255,255,255,0.75)", 7);
};
/** flexed arm (💪) with the donation tape at the inner elbow; elbow at (x, y); gold 0..1 */
export const flexArm = (g: Ctx, x: number, y: number, s: number, gold = 0, sleeve = "#3f6fb0", skin = "#f5d2b0") => {
  const col = mixHex(skin, GOLD, gold);
  const fill = (x0: number, y0: number, x1: number, y1: number) => lg(g, x0, y0, x1, y1, [[0, light(col, 0.3)], [0.55, col], [1, dark(col, 0.2)]]);
  g.save(); g.translate(x, y); g.scale(s, s);
  // forearm (up), then upper arm with the biceps bulge, then the fist
  path(g, smoothClosed([[-70, 50], [-85, -120], [-60, -290], [70, -300], [95, -120], [80, 50]], 5)); g.fillStyle = fill(-90, 0, 90, 0); g.fill(); g.lineWidth = 7; g.strokeStyle = INKC; g.stroke();
  path(g, smoothClosed([[-400, -85], [-300, -120], [-200, -175], [-90, -150], [20, -70], [70, 40], [0, 95], [-400, 90]], 5)); g.fillStyle = fill(0, -170, 0, 95); g.fill(); g.lineWidth = 7; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.moveTo(-190, -120); g.quadraticCurveTo(-130, -150, -80, -110); g.lineWidth = 9; g.strokeStyle = "rgba(255,255,255,0.6)"; g.stroke();
  ell(g, 10, -360, 100, 88, col, 7);
  for (let i = 0; i < 3; i++) line(g, [[-50 + i * 45, -420], [-40 + i * 45, -380]], rgba(INKC, 0.55), 5);
  path(g, smoothClosed([[-85, -330], [-40, -300], [-60, -270], [-110, -300]], 3)); g.fillStyle = col; g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke(); // thumb
  rr(g, -560, -110, 190, 220, 40, sleeve, 7); line(g, [[-380, -100], [-380, 100]], rgba(INKC, 0.4), 5);
  // cotton ball + tape where the needle goes
  rr(g, -70, -40, 90, 44, 10, "#f4f4f0", 5); ell(g, -25, -18, 14, 12, "#ffffff", 3);
  g.restore();
};
/** needle + tube from the inner elbow (x, y) to (tx, ty); blood flowing (phase) */
export const needleTube = (g: Ctx, x: number, y: number, tx: number, ty: number, f: number) => {
  const pts = smoothOpen([[x, y], [x + 40, y + 120], [(x + tx) / 2, ty + 80], [tx, ty]], 8);
  line(g, pts, INKC, 14); line(g, pts, "#c8303a", 8);
  for (let i = 0; i < pts.length; i += 4) { const k = (i + Math.floor(f / 2)) % 8 === 0; if (k) ell(g, pts[i][0], pts[i][1], 5, 5, "#ff9a9a", 0); }
  rr(g, x - 30, y - 16, 60, 32, 6, "#f4f4f0", 4); // tape
};
export const plasmaMachine = (g: Ctx, x: number, y: number, s = 1, f = 0) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -110, -360, 220, 360, 18, "#e8eef4", 6);
  rr(g, -80, -330, 160, 90, 10, "#1d2a3a", 5);
  g.fillStyle = "#7cff9a"; g.font = "900 40px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ON", 0, -285);
  ell(g, 0, -170, 60, 60, "#c9ccd2", 5); g.save(); g.translate(0, -170); g.rotate(f * 0.3); line(g, [[-40, 0], [40, 0]], INKC, 8); g.restore();
  rr(g, -60, -90, 120, 70, 12, "#ffe08a", 5); // plasma bag (golden-yellow)
  g.restore();
};
export const sweat = (g: Ctx, x: number, y: number, s: number, f: number) => {
  for (let i = 0; i < 3; i++) { const t = ((f * 0.04 + i / 3) % 1); g.save(); g.globalAlpha = 1 - t; g.translate(x + (i - 1) * 30 * s, y + t * 60 * s); g.scale(s, s); path(g, smoothClosed([[0, -18], [10, 0], [0, 10], [-10, 0]], 3)); g.fillStyle = "#9fd4ff"; g.fill(); g.lineWidth = 3; g.strokeStyle = INKC; g.stroke(); g.restore(); }
};

// ---------------- counter, calendar, newspaper, balloons, stamp ----------------
export const counter = (g: Ctx, x: number, y: number, s: number, text: string, col = "#7cff9a") => {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.font = "900 120px CapFont"; const w = Math.max(360, g.measureText(text).width + 90);
  rr(g, -w / 2, -95, w, 190, 26, "#1d1b26", 8);
  rr(g, -w / 2 + 14, -80, w - 28, 160, 18, "#2a2836", 0);
  g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 8);
  g.restore();
};
export const calendar = (g: Ctx, x: number, y: number, s: number, text: string) => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -120, -110, 240, 220, 14, "#ffffff", 6); rr(g, -120, -110, 240, 60, 14, "#e8322e", 6);
  for (const k of [-1, 1]) { rr(g, k * 60 - 8, -128, 16, 40, 6, "#9aa4b0", 4); }
  g.font = "900 76px CapFont"; const tw = g.measureText(text).width; if (tw > 200) g.font = `900 ${Math.floor((76 * 200) / tw)}px CapFont`;
  g.fillStyle = INKC; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 30);
  g.restore();
};
export const newspaper = (g: Ctx, x: number, y: number, s: number, rot = -0.05) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rr(g, -360, -250, 720, 500, 10, "#f4f0e2", 7);
  g.fillStyle = INKC; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 34px CapFont"; g.fillText("THE DAILY DROP", 0, -205);
  line(g, [[-330, -180], [330, -180]], INKC, 4);
  g.font = "900 58px CapFont"; g.fillText("THE MAN WITH", 0, -125); g.fillStyle = "#c8902a"; g.fillText("THE GOLDEN ARM", 0, -60);
  for (let i = 0; i < 6; i++) line(g, [[-320, 10 + i * 34], [i % 3 === 2 ? 120 : 320, 10 + i * 34]], rgba(INKC, 0.35), 8);
  g.restore();
};
export const balloon = (g: Ctx, x: number, y: number, s: number, ch: string, col: string, f: number, seed = 1) => {
  const sway = Math.sin(f * 0.05 + seed) * 10;
  line(g, smoothOpen([[x + sway, y + 120 * s], [x + sway * 0.5 - 10, y + 260 * s], [x, y + 420 * s]], 6), "#5a5a6a", 3);
  g.save(); g.translate(x + sway, y); g.scale(s, s);
  ell(g, 0, 0, 100, 120, col, 6); ell(g, -34, -46, 18, 30, "rgba(255,255,255,0.5)", 0, -0.4);
  poly(g, [[-14, 124], [14, 124], [0, 106]], col, 4);
  g.fillStyle = "#ffffff"; g.font = "900 120px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 12; g.strokeStyle = INKC;
  g.strokeText(ch, 0, 8); g.fillText(ch, 0, 8);
  g.restore();
};
export const stamp = (g: Ctx, x: number, y: number, s: number, text: string, col = "#ff4d5a", rot = -0.12) => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.font = "900 100px CapFont"; g.textAlign = "center"; g.textBaseline = "middle";
  const w = g.measureText(text).width + 70;
  rr(g, -w / 2, -75, w, 150, 22, "rgba(255,255,255,0.92)", 12, col);
  g.lineWidth = 12; g.strokeStyle = INKC; g.strokeText(text, 0, 6); g.fillStyle = col; g.fillText(text, 0, 6);
  g.restore();
};
export const nameTag = (g: Ctx, x: number, y: number, s: number, text: string) => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.font = "900 64px CapFont"; const w = g.measureText(text).width + 80;
  rr(g, -w / 2, -60, w, 120, 22, "#f4ecd2", 7);
  g.fillStyle = INKC; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 4);
  g.restore();
};

// ---------------- biology ----------------
/** Y-shaped antibody centred at its fork; col gold (anti-D) or purple (mother's attackers) */
export const antibody = (g: Ctx, x: number, y: number, s: number, col: string, rot = 0, mood: "happy" | "angry" | "calm" = "happy") => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const a of [-0.65, 0.65]) { g.save(); g.rotate(a); rr(g, -16, -95, 32, 90, 16, col, 5); g.restore(); }
  rr(g, -16, -4, 32, 80, 16, col, 5);
  ell(g, 0, 0, 34, 30, light(col, 0.15), 5);
  g.save(); g.scale(1, 1); miniFace(g, 24, mood); g.restore();
  g.restore();
};
/** red blood cell (biconcave disc) with a face */
export const rbc = (g: Ctx, x: number, y: number, r: number, mood: "happy" | "scared" | "calm" | "sleep" = "calm", tag?: string) => {
  ell(g, x, y, r, r * 0.86, lg(g, x, y - r, x, y + r, [[0, "#ff6a6a"], [1, "#b8242c"]]), Math.max(3, r * 0.07));
  ell(g, x, y + r * 0.05, r * 0.55, r * 0.42, "rgba(150,20,30,0.35)", 0);
  g.save(); g.translate(x, y); miniFace(g, r * 0.5, mood); g.restore();
  if (tag) { g.fillStyle = "#ffffff"; g.font = `900 ${Math.round(r * 0.55)}px CapFont`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = r * 0.12; g.strokeStyle = INKC; g.strokeText(tag, x + r * 0.75, y - r * 0.75); g.fillText(tag, x + r * 0.75, y - r * 0.75); }
};
/** swaddled baby head + blanket; s = head radius */
export const baby = (g: Ctx, x: number, y: number, s: number, mood: "happy" | "sleep" | "calm" | "scared" = "happy", blanket = "#ffd0e0") => {
  path(g, smoothClosed([[x - s * 1.2, y + s * 0.3], [x - s * 1.1, y + s * 1.9], [x, y + s * 2.3], [x + s * 1.1, y + s * 1.9], [x + s * 1.2, y + s * 0.3], [x, y - s * 0.4]], 5));
  g.fillStyle = blanket; g.fill(); g.lineWidth = Math.max(3, s * 0.08); g.strokeStyle = INKC; g.stroke();
  ell(g, x, y, s, s * 0.95, "#f8dcc4", Math.max(3, s * 0.08));
  g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.95); g.quadraticCurveTo(x + s * 0.25, y - s * 1.25, x + s * 0.15, y - s * 0.8); g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = INKC; g.stroke();
  g.save(); g.translate(x, y + s * 0.1); miniFace(g, s * 0.62, mood === "scared" ? "scared" : mood); g.restore();
};
export const crib = (g: Ctx, x: number, y: number, s = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -260, -40, 520, 60, 10, "#c8a070", 5); rr(g, -260, -300, 520, 30, 10, "#c8a070", 5);
  for (let i = 0; i <= 10; i++) line(g, [[-240 + i * 48, -270], [-240 + i * 48, -40]], "#b08a5a", 12);
  for (const k of [-1, 1]) rr(g, k * 260 - 16, -340, 32, 460, 10, "#a87a4a", 5);
  // teddy
  ell(g, 120, -110, 50, 56, "#c8925a", 4); ell(g, 120, -180, 40, 38, "#c8925a", 4); ell(g, 92, -210, 14, 14, "#c8925a", 3); ell(g, 148, -210, 14, 14, "#c8925a", 3);
  ell(g, 108, -184, 4, 4, INKC, 0); ell(g, 132, -184, 4, 4, INKC, 0); ell(g, 120, -170, 8, 6, "#5a3a2a", 0);
  g.restore();
};
export const syringe = (g: Ctx, x: number, y: number, s: number, rot = 0, label = "ANTI-D", flip = false) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -s : s, s);
  rr(g, -220, -50, 330, 100, 16, "rgba(230,245,255,0.85)", 6);
  rr(g, -210, -38, 220, 76, 10, "#ffe08a", 0);
  rr(g, -320, -14, 110, 28, 8, "#c9ccd2", 5); rr(g, -350, -50, 30, 100, 8, "#c9ccd2", 5);
  rr(g, 110, -22, 40, 44, 8, "#c9ccd2", 5); line(g, [[150, 0], [300, 0]], INKC, 10); line(g, [[150, 0], [300, 0]], "#e8eef4", 5);
  for (let i = 0; i < 5; i++) line(g, [[-180 + i * 50, -50], [-180 + i * 50, -28]], INKC, 4);
  g.save(); g.translate(-60, 4); if (flip) g.scale(-1, 1); g.fillStyle = INKC; g.font = "900 46px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, 0, 0); g.restore();
  g.restore();
};
export const shield = (g: Ctx, x: number, y: number, r: number, k: number, f: number) => {
  if (k <= 0.01) return;
  g.save(); g.globalAlpha *= k;
  g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, x, y, r * 0.6, r * 1.15, [[0, "rgba(255,220,90,0)"], [0.8, "rgba(255,220,90,0.35)"], [1, "rgba(255,220,90,0)"]]); g.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4); g.restore();
  ell(g, x, y, r * k, r * k, "rgba(255,240,170,0.18)", 8, 0, "#ffd84a");
  for (let i = 0; i < 6; i++) { const a = f * 0.03 + i; line(g, [[x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7], [x + Math.cos(a + 0.3) * r * 0.85, y + Math.sin(a + 0.3) * r * 0.85]], "rgba(255,255,255,0.7)", 6); }
  g.restore();
};
/** thought bubble with content drawn by fn (centre cx, cy, radius r), tail toward (tx, ty) */
export const thought = (g: Ctx, cx: number, cy: number, r: number, tx: number, ty: number, k: number, fn: (g: Ctx) => void) => {
  if (k <= 0.01) return;
  g.save(); g.globalAlpha *= Math.min(1, k * 1.5);
  for (let i = 0; i < 3; i++) { const t = (i + 1) / 4; ell(g, tx + (cx - tx) * t * 0.7, ty + (cy - ty) * t * 0.7, 14 + i * 10, 12 + i * 9, "#ffffff", 4); }
  const pts: P[] = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * 0.8 * k]); }
  for (const [px, py] of pts) ell(g, px, py, r * 0.32 * k, r * 0.28 * k, "#ffffff", 5);
  ell(g, cx, cy, r * k, r * 0.8 * k, "#ffffff", 0);
  g.save(); g.beginPath(); g.ellipse(cx, cy, r * k * 1.05, r * 0.85 * k, 0, 0, Math.PI * 2); g.clip(); fn(g); g.restore();
  g.restore();
};
export const heart = (g: Ctx, x: number, y: number, s: number, col = "#ff4d6a") => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  path(g, smoothClosed([[0, 30], [-50, -10], [-50, -45], [-25, -60], [0, -40], [25, -60], [50, -45], [50, -10]], 5)); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  ell(g, -24, -36, 10, 7, "rgba(255,255,255,0.6)", 0, -0.5);
  g.restore();
};
export const petri = (g: Ctx, x: number, y: number, s: number, f: number, glow = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (glow > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, 0, 0, 10, 200, [[0, `rgba(255,210,90,${0.5 * glow})`], [1, "rgba(255,210,90,0)"]]); g.fillRect(-200, -200, 400, 400); g.restore(); }
  ell(g, 0, 0, 150, 60, "rgba(220,240,255,0.6)", 6); ell(g, 0, -6, 130, 48, "rgba(255,240,180,0.6)", 3);
  for (let i = 0; i < 6; i++) antibody(g, -90 + i * 36 + Math.sin(f * 0.1 + i) * 6, -10 + (i % 2) * 14, 0.28, GOLD, Math.sin(f * 0.05 + i) * 0.4, "happy");
  g.restore();
};
// Australia outline (lon, lat) and an equirectangular projection centred on it
const AUS: [number, number][] = [[114, -22], [114.5, -26], [115, -34], [118, -35], [123.5, -34], [126, -32], [131, -31.5], [135, -34.5], [138, -35.5], [140, -38], [144, -38.5], [146.5, -39], [150, -37.5], [153, -31], [153.5, -25], [150.5, -22], [146, -19], [145.5, -15], [142.5, -10.7], [141.5, -13], [141.5, -17], [139, -17], [136, -15], [136.5, -12], [132, -11.3], [129.5, -15], [127, -14], [125, -15], [122, -17.5], [121, -19.5], [117, -20.5]];
const TAS: [number, number][] = [[144.6, -40.7], [148.3, -40.9], [148, -43.2], [146.5, -43.6], [145.2, -42.2]];
export const ausXY = (lon: number, lat: number, cx: number, cy: number, k: number): P => [cx + (lon - 133.5) * k, cy - (lat + 26) * k * 1.12];
export const australia = (g: Ctx, cx: number, cy: number, k: number, col = "#f2b35a") => {
  for (const L of [AUS, TAS]) poly(g, L.map(([lo, la]) => ausXY(lo, la, cx, cy, k)), lg(g, 0, cy - 20 * k, 0, cy + 20 * k, [[0, light(col, 0.15)], [1, dark(col, 0.2)]]), 7);
};
export { INK, rnd, clamp01, blob };
