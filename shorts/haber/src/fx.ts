// Flat 2D effect drawings for the Haber short (unlit cards in the 3D world, on the NOINK layer like the bridge fx):
// nitrogen molecules, chlorine cloud puffs, ammonia drops, sea birds, guano drops, sparkles, confetti, the wanted
// poster, pests, the stubborn sprout with its hammer, breath swirls, wheat stalks, heat shimmer. Plum ink, flat fills.
import { Pen, INK, bodyFront, Outfit } from "./toon";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const star = (cx: number, cy: number, r0: number, r1: number, n: number, rot = -90): P2[] => {
  const pts: P2[] = [];
  for (let k = 0; k < n * 2; k++) { const r = k % 2 ? r0 : r1, a = rad(rot + (k * 180) / n); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
};

/** N2: two blue atoms joined by a triple bond, 300 x 150 */
export const fxN2 = (p: Pen) => {
  for (const dy of [-16, 0, 16]) p.stroke([[100, 75 + dy], [200, 75 + dy]], 7, INK);
  for (const x of [88, 212]) { p.ell(x, 75, 52, 52, "#6fa0ea", 8); p.ell(x - 16, 58, 14, 10, "#b9d4fa", 0); }
};

/** chlorine fog bank, 800 x 320: soft, see-through, sickly yellow-green, no outline (a gas, not a bush) */
export const fxGas = (p: Pen, seed: number) => {
  const g = p.g, r = (k: number) => { const x = Math.sin(seed * 91.3 + k * 37.7) * 43758.5; return x - Math.floor(x); };
  for (let i = 0; i < 14; i++) {
    const x = 90 + i * 48 + (r(i) - 0.5) * 50, y = 205 - Math.sin((i / 13) * Math.PI) * 60 + (r(i + 9) - 0.5) * 40, rr = 70 + r(i + 20) * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, "rgba(206,214,104,0.62)"); gr.addColorStop(0.55, "rgba(180,196,84,0.4)"); gr.addColorStop(1, "rgba(160,180,70,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr * 1.3, rr, 0, 0, Math.PI * 2); g.fill();
  }
  const base = g.createLinearGradient(0, 200, 0, 320);
  base.addColorStop(0, "rgba(170,186,74,0)"); base.addColorStop(0.5, "rgba(170,186,74,0.55)"); base.addColorStop(1, "rgba(150,168,64,0)");
  g.fillStyle = base; g.fillRect(40, 200, 720, 120);
};

/** a taut rope with a sack tied in the middle, 900 x 260 */
export const fxRope = (p: Pen) => {
  p.band([[0, 70], [900, 70]], "#c9a46a", 14, 4);
  p.poly([[340, 60], [560, 52], [590, 230], [450, 255], [310, 232]], "#d9c08c", 8);
  p.stroke([[350, 72], [550, 66]], 7, "#8f7650");
  for (const x of [400, 450, 500]) p.stroke([[x, 110], [x + 6, 210]], 3, "#a98f62");
};

/** ammonia drop, 120 x 180 */
export const fxDrop = (p: Pen) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t); pts.push([60 + 42 * s * (0.5 - 0.5 * c) ** 0.8 * 1.6, 100 - 75 * c]); }
  p.poly(pts, "#9fdcf2", 7);
  p.ell(48, 120, 9, 14, "#e6f8ff", 0);
};

/** sea bird (white gull, yellow beak), 320 x 200; flap -1..1 */
export const fxBird = (p: Pen, flap: number) => {
  const wy = 100 - 70 * flap;
  p.poly([[160, 105], [60, wy], [30, wy + 18], [150, 125]], "#f4f2ec", 7);
  p.poly([[160, 105], [260, wy], [290, wy + 18], [170, 125]], "#f4f2ec", 7);
  p.ell(160, 115, 40, 24, "#ffffff", 7);
  p.ell(196, 104, 20, 18, "#ffffff", 7);
  p.poly([[212, 104], [240, 110], [212, 114]], "#f2b33c", 4);
  p.dot(200, 100, 4);
};

/** falling guano drop, 80 x 110 */
export const fxPoop = (p: Pen) => { p.ell(40, 62, 24, 30, "#f6f3e6", 6); p.ell(34, 52, 8, 10, "#ffffff", 0); };

/** twinkle sparkle, 300 x 300; t 0..1 */
export const fxSpark = (p: Pen, t: number, col = "#ffe27a") => {
  const s = Math.sin(Math.PI * Math.min(1, t)) * 0.8 + 0.2;
  p.poly(star(150, 150, 22 * s, 120 * s, 4, -90), col, 7);
  p.ell(150, 150, 16 * s, 16 * s, "#ffffff", 0);
};

/** confetti burst, 600 x 600; t 0..1 */
export const fxConfetti = (p: Pen, t: number) => {
  const cols = ["#e2453c", "#f2c14e", "#3f6fb5", "#5aa83c", "#c25a7a", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const a = rad(i * 137.5), d = (60 + (i % 7) * 30) * (0.3 + t), x = 300 + d * Math.cos(a), y = 300 + d * Math.sin(a) * 0.8 + 180 * t * t;
    const w = 12, h = 22, r = a + t * 6 + i;
    const c = Math.cos(r), s = Math.sin(r);
    p.poly([[x - w * c + h * s, y - w * s - h * c], [x + w * c + h * s, y + w * s - h * c], [x + w * c - h * s, y + w * s + h * c], [x - w * c - h * s, y - w * s + h * c]], cols[i % 6], 3);
  }
};

/** wanted poster without words: aged paper, a portrait of our Haber, a red stripe and a row of reward coins, 420 x 560 */
export const fxPoster = (p: Pen, haber: Outfit) => {
  const g = p.g;
  p.poly([[14, 18], [406, 10], [410, 546], [10, 552]], "#efe2c0", 10);
  g.fillStyle = "rgba(150,110,60,0.18)"; g.fillRect(24, 26, 372, 18); g.fillRect(28, 500, 362, 14);
  p.poly([[60, 70], [360, 70], [360, 400], [60, 400]], "#d9c9a4", 6);
  g.save();
  g.beginPath(); g.rect(60, 70, 300, 330); g.clip();
  g.translate(210 - 300 * 0.95, 70 - 150 * 0.95); g.scale(0.95, 0.95);
  bodyFront(new Pen(g), haber, { mode: "stand", expr: "stern", seed: 3 });
  g.restore();
  p.poly([[60, 70], [360, 70], [360, 400], [60, 400]], null, 6);
  p.poly([[40, 420], [380, 420], [380, 452], [40, 452]], "#c23a3a", 5);
  for (const x of [130, 180, 230, 280]) { p.ell(x, 482, 18, 18, "#e8c45a", 4); p.ell(x, 482, 9, 9, "#f6dc8a", 0); }
  for (const [x, y] of [[30, 30], [390, 26], [392, 532], [28, 536]] as P2[]) p.dot(x, y, 8, "#8a8f98");
};

/** a pest beetle, 200 x 140; dazed = on its back, legs up */
export const fxBug = (p: Pen, dazed: boolean) => {
  if (!dazed) {
    for (const k of [-1, 0, 1]) { p.stroke([[100 + k * 22, 80], [100 + k * 30, 122]], 6, INK); p.stroke([[100 + k * 22, 80], [100 + k * 30 + 6, 38]], 6, INK); }
    p.ell(100, 80, 52, 34, "#7a4a2a", 7); p.stroke([[100, 48], [100, 112]], 4, INK);
    p.ell(150, 80, 18, 16, "#3a2a22", 6); p.dot(156, 74, 4, "#ffffff"); p.dot(157, 74, 2);
  } else {
    for (const k of [-1, 0, 1]) p.stroke([[100 + k * 20, 70], [92 + k * 30, 22 + Math.abs(k) * 6], [100 + k * 34, 14]], 6, INK);
    p.ell(100, 86, 52, 30, "#c99a6a", 7);
    p.ell(150, 92, 16, 14, "#3a2a22", 6);
    for (const s of [-1, 1]) p.stroke([[146 + s * 4, 86], [154 - s * 4, 94]], 3, "#ffffff");
  }
};

/** the stubborn sprout with a tiny hammer, 360 x 460; swing 0 raised .. 1 struck, dazed = spiral eyes */
export const fxSprout = (p: Pen, swing: number, dazed: boolean) => {
  p.stroke([[180, 450], [182, 300], [178, 220]], 14, "#4f8f3a");
  p.stroke([[180, 450], [182, 300], [178, 220]], 6, "#7cc35a");
  p.ell(124, 300, 52, 22, "#6cb84a", 7, 0, 360, -25);
  p.ell(236, 300, 52, 22, "#6cb84a", 7, 0, 360, 25);
  p.ell(178, 175, 62, 58, "#8fd06a", 8);
  if (dazed) for (const s of [-1, 1]) { const x = 178 + s * 20; const sp: P2[] = []; for (let k = 1; k < 13; k++) sp.push([x + Math.cos(k) * k * 0.9, 168 + Math.sin(k) * k * 0.9]); p.stroke(sp, 4); }
  else for (const s of [-1, 1]) { p.ell(178 + s * 20, 166, 6, 9, INK, 0); p.stroke([[178 + s * 30, 146 + (s > 0 ? 6 : 0)], [178 + s * 10, 150 + (s > 0 ? 0 : 6)]], 6); }
  if (dazed) p.stroke([[160, 200], [170, 196], [180, 202], [190, 196], [198, 200]], 5);
  else p.arc(178, 196, 14, 6, 200, 340, 5);
  const a = rad(-80 + 115 * swing), hx = 250, hy = 300;
  const R = (x: number, y: number): P2 => [hx + (x - hx) * Math.cos(a) - (y - hy) * Math.sin(a), hy + (x - hx) * Math.sin(a) + (y - hy) * Math.cos(a)];
  p.band([R(hx, hy + 10), R(hx, hy - 90)], "#9a6a3a", 10, 4, "round");
  p.poly([R(hx - 30, hy - 120), R(hx + 30, hy - 120), R(hx + 30, hy - 88), R(hx - 30, hy - 88)], "#8a929a", 6);
  p.dot(hx, hy, 10);
};

/** breath swirl lines flowing to the right, 420 x 200; t 0..1 */
export const fxBreath = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const pts: P2[] = [], y0 = 60 + k * 40, ph = t * 6 + k;
    for (let i = 0; i <= 20; i++) { const x = 20 + i * 19; pts.push([x, y0 + 14 * Math.sin(ph + i * 0.5)]); }
    p.stroke(pts, 9, "rgba(190,225,255,0.85)");
  }
};

/** a bunch of wheat stalks (foreground framing card), 300 x 900 */
export const fxWheat = (p: Pen, seed: number) => {
  const r = (k: number) => { const x = Math.sin(seed * 51.7 + k * 13.1) * 43758.5; return x - Math.floor(x); };
  for (let i = 0; i < 7; i++) {
    const x0 = 40 + i * 36 + (r(i) - 0.5) * 20, top = 120 + r(i + 7) * 160, lean = (r(i + 3) - 0.5) * 60;
    p.stroke([[x0, 900], [x0 + lean * 0.5, (900 + top) / 2], [x0 + lean, top + 90]], 9, "#7a5a26");
    p.stroke([[x0, 900], [x0 + lean * 0.5, (900 + top) / 2], [x0 + lean, top + 90]], 5, "#d6a84a");
    for (let k = 0; k < 6; k++) {
      const y = top + 90 - k * 18, x = x0 + lean + (k % 2 ? 9 : -9);
      p.ell(x, y, 10, 16, "#e8bf5c", 5, 0, 360, k % 2 ? 25 : -25);
    }
    p.stroke([[x0 + lean, top - 10], [x0 + lean + 4, top - 60]], 3, "#b48a3a");
  }
};

/** heat shimmer: wavy orange lines rising, 300 x 300; t 0..1 */
export const fxHeat = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const pts: P2[] = [], x0 = 80 + k * 70;
    for (let i = 0; i <= 14; i++) { const y = 280 - i * 18; pts.push([x0 + 14 * Math.sin(t * 9 + i * 0.7 + k), y]); }
    p.stroke(pts, 9, "rgba(255,170,80,0.8)");
  }
};

/** a skull and crossbones (the poison can's label motif), centred in a 200 x 200 area at (cx, cy) */
export const skull = (p: Pen, cx: number, cy: number, s = 1) => {
  for (const sg of [-1, 1]) { p.band([[cx - 70 * s, cy + (40 + sg * 40) * s], [cx + 70 * s, cy + (40 - sg * 40) * s]], "#f6f2e6", 16 * s, 5 * s, "round"); }
  p.ell(cx, cy - 10 * s, 56 * s, 52 * s, "#f6f2e6", 7 * s);
  p.poly([[cx - 30 * s, cy + 25 * s], [cx + 30 * s, cy + 25 * s], [cx + 26 * s, cy + 52 * s], [cx - 26 * s, cy + 52 * s]], "#f6f2e6", 7 * s);
  for (const sg of [-1, 1]) p.ell(cx + sg * 22 * s, cy - 8 * s, 15 * s, 17 * s, INK, 0);
  p.poly([[cx, cy + 8 * s], [cx - 8 * s, cy + 22 * s], [cx + 8 * s, cy + 22 * s]], INK, 0);
};
