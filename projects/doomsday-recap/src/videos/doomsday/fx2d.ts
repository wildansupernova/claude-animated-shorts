// 2D effect drawings (unlit cards): bursts, rings, portals, cracks, lightning, dust, notes, signs. Same Pen + ink
// language as the characters. Each takes the pen and draws in its own design box (given per call in world.ts).
import { Pen, P2, INK, WHITE, rad, rnd, ellPts, mix } from "./toon";
import { starPts } from "./heroes";

export const FONT = "Bangers, 'Luckiest Guy', Impact, sans-serif";

/** radial burst (impacts, snaps, flashes): box 500 x 500 */
export const burst = (p: Pen, t: number, col = "#fff3b0", rays = 12) => {
  const cx = 250, cy = 250, r0 = 30 + 40 * t, r1 = 120 + 120 * t;
  for (let i = 0; i < rays; i++) {
    const a = rad((360 / rays) * i + 7 * rnd(i, 1)), w = rad(7 + 5 * rnd(i, 2)), rr = r1 * (0.75 + 0.35 * rnd(i, 3));
    p.poly([[cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0], [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr], [cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0]], col, 5);
  }
  p.ell(cx, cy, r0 * 1.1, r0 * 1.1, col, 5);
};
/** glowing ring (spells, portals, jump points): box 500 x 500 */
export const ring = (p: Pen, col: string, inner: string, spin = 0, sparks = true) => {
  const cx = 250, cy = 250;
  p.ell(cx, cy, 225, 225, null, 10);
  p.arc(cx, cy, 225, 225, 0, 360, 26, col);
  p.arc(cx, cy, 200, 200, 0, 360, 8, inner);
  if (sparks) for (let i = 0; i < 26; i++) {
    const a = rad(i * 13.8 + spin * 360), r = 228 + 18 * rnd(i, 4);
    p.stroke([[cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a + 0.12) * (r + 20), cy + Math.sin(a + 0.12) * (r + 20)]], 6, i % 2 ? inner : WHITE);
  }
};
/** swirling portal disc (Chitauri portal / quantum vortex / rifts): box 500 x 500 */
export const portal = (p: Pen, a: string, b: string, spin = 0) => {
  const cx = 250, cy = 250, g = p.g;
  const gr = g.createRadialGradient(cx, cy, 10, cx, cy, 235);
  gr.addColorStop(0, WHITE); gr.addColorStop(0.25, b); gr.addColorStop(0.8, a); gr.addColorStop(1, mix(a, INK, 0.4));
  p.path(ellPts(cx, cy, 235, 235), true); g.fillStyle = gr; g.fill();
  for (let k = 0; k < 5; k++) {
    const pts: P2[] = [];
    for (let i = 0; i < 40; i++) { const t = i / 39, ang = rad(k * 72 + spin * 360) + t * 4.2, r = 30 + 200 * t; pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]); }
    p.stroke(pts, 7, mix(b, WHITE, 0.4));
  }
  p.ell(cx, cy, 235, 235, null, 9);
};
/** jagged glowing crack (space rifts, breaking worlds): box 600 x 200 */
export const crack = (p: Pen, col: string, seed = 1) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 12; i++) pts.push([20 + i * 47, 100 + (rnd(seed, i) - 0.5) * 120]);
  p.stroke(pts, 34, INK); p.stroke(pts, 22, col); p.stroke(pts, 8, WHITE);
  for (let i = 2; i < 11; i += 3) { const [x, y] = pts[i]; p.stroke([[x, y], [x + 30, y + (rnd(seed, i + 20) - 0.5) * 140]], 10, col); }
};
/** lightning bolt: box 200 x 600 */
export const bolt = (p: Pen, seed = 1, col = "#eaf6ff") => {
  const pts: P2[] = [];
  for (let i = 0; i <= 10; i++) pts.push([100 + (rnd(seed, i) - 0.5) * 120, 10 + i * 58]);
  p.stroke(pts, 30, "#7fb8ff"); p.stroke(pts, 14, col);
};
/** dust puff / smoke cloud: box 400 x 300 */
export const puff = (p: Pen, col = "#d8c8b0", seed = 1) => {
  for (let i = 0; i < 7; i++) p.ell(80 + rnd(seed, i) * 240, 110 + rnd(seed, i + 9) * 90, 60 + 30 * rnd(seed, i + 3), 50 + 25 * rnd(seed, i + 5), col, 6);
};
/** music note: box 200 x 260 */
export const note = (p: Pen, col = "#1f2a44") => { p.ell(70, 210, 42, 32, col, 0, 0, 360, -20); p.stroke([[108, 200], [108, 30], [170, 60]], 12, col); };
/** comic text burst (signs / onomatopoeia): box w x h with a coloured board */
export const sign = (p: Pen, w: number, h: number, lines: string[], o: { bg?: string; fg?: string; edge?: string; size?: number; lights?: boolean } = {}) => {
  const g = p.g, bg = o.bg ?? "#1f1b2e", fg = o.fg ?? "#ffd84a";
  p.poly([[8, 8], [w - 8, 8], [w - 8, h - 8], [8, h - 8]], bg, 12);
  if (o.edge) p.poly([[26, 26], [w - 26, 26], [w - 26, h - 26], [26, h - 26]], null, 6);
  if (o.lights) for (let x = 40; x < w - 30; x += 46) for (const y of [26, h - 26]) p.ell(x, y, 9, 9, "#fff2b8", 3);
  const size = o.size ?? Math.min(h / (lines.length + 0.6), 160);
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${size}px ${FONT}`; g.lineJoin = "round";
  lines.forEach((s, i) => {
    const y = h / 2 + (i - (lines.length - 1) / 2) * size * 1.05;
    g.font = `${size}px ${FONT}`;
    const fit = Math.min(size, (size * (w - 90)) / Math.max(1, g.measureText(s).width)); // shrink long lines to fit the board
    g.font = `${fit}px ${FONT}`;
    g.lineWidth = fit * 0.16; g.strokeStyle = INK; g.strokeText(s, w / 2, y);
    g.fillStyle = i === 0 ? fg : (o.fg ? fg : WHITE); g.fillText(s, w / 2, y);
  });
};
/** gravestone: box 300 x 360 */
export const grave = (p: Pen, name: string) => {
  const g = p.g;
  p.poly([[40, 350], [40, 120], [70, 50], [150, 20], [230, 50], [260, 120], [260, 350]], "#9aa1aa", 10);
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `64px ${FONT}`; g.fillStyle = "#4a4f58"; g.fillText(name, 150, 170);
  p.stroke([[100, 240], [200, 240]], 6, "#4a4f58"); p.stroke([[110, 280], [190, 280]], 6, "#4a4f58");
};
/** a golden star sparkle: box 200 x 200 */
export const sparkle = (p: Pen, col = "#fff3b0") => p.poly(starPts(100, 100, 90, 0), col, 6);
/** a chess board on a little table seen from the front: box 400 x 300 */
export const chess = (p: Pen) => {
  p.poly([[40, 120], [360, 120], [330, 160], [70, 160]], "#7a4f33", 6);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) p.poly([[60 + i * 35, 122 + j * 18], [95 + i * 35, 122 + j * 18], [95 + i * 35 - 2, 140 + j * 18], [60 + i * 35 - 2, 140 + j * 18]], "#2a2730", 0);
  p.poly([[150, 160], [250, 160], [230, 290], [170, 290]], "#5c3a26", 6);
  for (const [x, c] of [[110, WHITE], [140, "#2a2730"], [260, WHITE], [290, "#2a2730"]] as [number, string][]) { p.ell(x, 100, 10, 14, c, 4); p.ell(x, 80, 7, 7, c, 4); }
};
/** podium with a seal: box 300 x 400 */
export const podium = (p: Pen) => {
  p.poly([[40, 120], [260, 120], [240, 390], [60, 390]], "#5c3a26", 10);
  p.ell(150, 220, 60, 60, "#2f4f9a", 6); p.poly(starPts(150, 220, 40), "#e8c45a", 3);
  p.stroke([[150, 120], [150, 60]], 6, INK); p.ell(150, 55, 12, 10, INK, 0);
};
/** toy blocks: box 300 x 200 */
export const blocks = (p: Pen) => {
  const cols = ["#e04040", "#3f7be0", "#f2d23c"];
  [[30, 110], [120, 110], [75, 30]].forEach(([x, y], i) => { p.poly([[x, y], [x + 80, y], [x + 80, y + 80], [x, y + 80]], cols[i], 6); });
};
/** infinity stone gem: box 100 x 140 */
export const gem = (p: Pen, col: string) => { p.poly([[50, 6], [92, 50], [70, 134], [30, 134], [8, 50]], col, 6); p.poly([[50, 20], [70, 50], [50, 70], [32, 50]], mix(col, WHITE, 0.55), 0); };
