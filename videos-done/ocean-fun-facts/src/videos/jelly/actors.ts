// Immortal jellyfish short: the jellyfish (see-through bell, red stomach, white tentacles), the polyp and its colony,
// the cyst "blob", a mortal jellyfish, butterfly / cocoon / caterpillar, cell characters, a hungry fish, a world map,
// a cargo ship with a ballast tank, a DNA helix, a lab scientist, the pinky finger and a few stamps / props.
import type { Ctx } from "../../lib/engine";
import { rnd, clamp01 } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, path, light, dark, rgba, smoothClosed, smoothOpen, blob, mixc } from "../../lib/paint";
import { Outfit, INK } from "../../lib/toon";

export const SCIENTIST: Outfit = { jacket: "#f3f1ea", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#c9c6c0", glasses: true, buttons: "#c9ccd2", skin: "#f5c9a0" };

export const GUT = "#e8402e";
export const BELL = "#ffd9e4";

// ---------------- faces (shared by jelly, polyp, blob, cells) ----------------
export type Face = "neutral" | "smile" | "happy" | "shock" | "sleepy" | "sad" | "old" | "determined" | "proud" | "dizzy" | "baby" | "confused";
/** a small cartoon face centred at (0, 0); s = eye spacing unit (~half the face width) */
export const face = (g: Ctx, s: number, expr: Face, f = 0, blink = 0, look = 0, base = "#ffd9e4") => {
  const ex = s * 0.62, ey = 0, erx = s * 0.27, ery = s * 0.31, lx = look * erx * 0.35;
  const mouthY = s * 0.62;
  for (const k of [-1, 1]) {
    const x = k * ex;
    if (expr === "happy" || expr === "proud") {
      g.beginPath(); g.moveTo(x - erx, ey + ery * 0.2); g.quadraticCurveTo(x, ey - ery * 1.2, x + erx, ey + ery * 0.2);
      g.lineWidth = s * 0.11; g.strokeStyle = INKC; g.lineCap = "round"; g.stroke();
      continue;
    }
    if (expr === "sleepy" || blink > 0.6) { line(g, [[x - erx, ey + ery * 0.15], [x + erx, ey + ery * 0.15]], INKC, s * 0.1); continue; }
    if (expr === "dizzy") {
      const pts: P[] = [];
      for (let i = 0; i < 26; i++) { const a = i * 0.55 + f * 0.3, r = (i / 26) * erx * 1.1; pts.push([x + Math.cos(a) * r, ey + Math.sin(a) * r]); }
      ell(g, x, ey, erx * 1.15, ery * 1.15, "#fff8ee", s * 0.08); line(g, pts, INKC, s * 0.07);
      continue;
    }
    const big = expr === "shock" ? 1.25 : expr === "baby" ? 1.15 : 1;
    ell(g, x, ey, erx * big, ery * big, "#fff8ee", s * 0.08);
    const pr = expr === "shock" ? erx * 0.28 : expr === "baby" ? erx * 0.62 : erx * 0.5;
    ell(g, x + lx, ey + ery * 0.12, pr, pr * 1.1, INKC, 0);
    if (expr === "baby") ell(g, x + lx - pr * 0.35, ey - pr * 0.25, pr * 0.3, pr * 0.3, "#ffffff", 0);
    // lids: old (heavy, half closed), determined (angled), blink half
    const lid = expr === "old" ? 0.5 : blink > 0.2 ? 0.55 : 0;
    if (lid > 0) {
      g.save(); g.beginPath(); g.ellipse(x, ey, erx * big, ery * big, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = base; g.fillRect(x - erx * 1.4, ey - ery * 1.4, erx * 2.8, ery * 2.8 * lid);
      g.restore(); ell(g, x, ey, erx * big, ery * big, null, s * 0.08);
      line(g, [[x - erx, ey - ery * 1.4 + ery * 2.8 * lid], [x + erx, ey - ery * 1.4 + ery * 2.8 * lid]], INKC, s * 0.07);
    }
    if (expr === "determined" || expr === "sad" || expr === "confused") {
      const inner = expr === "determined" ? 1 : -1, by = ey - ery * 1.35;
      const tilt = expr === "confused" ? (k > 0 ? -0.5 : 0.3) : inner * 0.4;
      line(g, [[x - k * erx, by + tilt * ery * k * -1], [x + k * erx * 0.2, by - tilt * ery * k * -1]].map(([a, b]) => [a, b]) as P[], INKC, s * 0.09);
    }
    if (expr === "old") {
      // bushy grey brows
      for (let i = 0; i < 4; i++) ell(g, x - erx * 0.8 + i * erx * 0.55, ey - ery * 1.45 - (i % 2) * ery * 0.15, erx * 0.38, ery * 0.3, "#e8e6e2", s * 0.04);
    }
  }
  // mouth
  g.lineCap = "round"; g.lineJoin = "round";
  if (expr === "shock") ell(g, 0, mouthY, s * 0.16, s * 0.22, "#5a1e28", s * 0.07);
  else if (expr === "happy" || expr === "proud") { g.beginPath(); g.moveTo(-s * 0.3, mouthY - s * 0.08); g.quadraticCurveTo(0, mouthY + s * 0.32, s * 0.3, mouthY - s * 0.08); g.closePath(); g.fillStyle = "#5a1e28"; g.fill(); g.lineWidth = s * 0.07; g.strokeStyle = INKC; g.stroke(); }
  else if (expr === "smile" || expr === "baby") { g.beginPath(); g.moveTo(-s * 0.22, mouthY - s * 0.04); g.quadraticCurveTo(0, mouthY + s * 0.18, s * 0.22, mouthY - s * 0.04); g.lineWidth = s * 0.08; g.strokeStyle = INKC; g.stroke(); }
  else if (expr === "sad") { g.beginPath(); g.moveTo(-s * 0.2, mouthY + s * 0.08); g.quadraticCurveTo(0, mouthY - s * 0.1, s * 0.2, mouthY + s * 0.08); g.lineWidth = s * 0.08; g.strokeStyle = INKC; g.stroke(); }
  else if (expr === "old") { const pts: P[] = []; for (let i = 0; i <= 8; i++) pts.push([-s * 0.24 + i * s * 0.06, mouthY + Math.sin(i * 1.6) * s * 0.03]); line(g, pts, INKC, s * 0.07); }
  else if (expr === "dizzy" || expr === "confused") { const pts: P[] = []; for (let i = 0; i <= 8; i++) pts.push([-s * 0.22 + i * s * 0.055, mouthY + Math.sin(i * 1.4 + f * 0.2) * s * 0.06]); line(g, pts, INKC, s * 0.07); }
  else if (expr === "sleepy") ell(g, 0, mouthY, s * 0.08, s * 0.06, "#5a1e28", s * 0.05);
  else line(g, [[-s * 0.14, mouthY], [s * 0.14, mouthY]], INKC, s * 0.08);
};

// ---------------- the immortal jellyfish ----------------
export type JellyOpts = {
  f?: number; R?: number; age?: number; expr?: Face; tent?: number; pulse?: number; sx?: number; sy?: number; tint?: string; gut?: string;
  seed?: number; look?: number; halo?: number; party?: number; cane?: number; blink?: number; alpha?: number; droop?: number;
};
/** jellyfish centred on its bell rim (0, 0): bell above, tentacles below. R = bell radius (default 150) */
export const jelly = (g: Ctx, o: JellyOpts = {}) => {
  const { f = 0, R = 150, age = 0, expr = "smile", tent = 1, pulse = 1, sx = 1, sy = 1, tint = BELL, gut = GUT, seed = 1, look = 0,
    halo = 0, party = 0, cane = 0, blink = 0, alpha = 1, droop = 0 } = o;
  g.save(); g.globalAlpha *= alpha; g.scale(sx, sy);
  const ph = Math.sin(f * 0.16 + seed) * pulse;
  const bx = 1 + 0.06 * ph, by = 1 - 0.07 * ph;
  const col = mixc(tint, "#c9c4cc", age * 0.55);
  // tentacles (behind the bell)
  if (tent > 0.02) {
    const n = 20;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), x0 = (-0.92 + 1.84 * u) * R * bx, L = R * (1.15 + 0.5 * rnd(seed, i)) * tent * (1 + droop * 0.4);
      const pts: P[] = [];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10, sway = Math.sin(f * 0.11 + i * 0.8 + t * 4.2) * R * 0.14 * t * (1 - age * 0.6);
        pts.push([x0 * (1 + 0.15 * t * (1 - droop)) + sway, R * 0.02 + L * t]);
      }
      const sm = smoothOpen(pts, 3);
      line(g, sm, INKC, R * 0.045);
      line(g, sm, rgba(light(col, 0.5), 0.95), R * 0.022);
    }
  }
  // bell
  g.save(); g.scale(bx, by);
  const bell = () => {
    g.beginPath(); g.moveTo(-R, 0);
    g.bezierCurveTo(-R * 1.02, -R * 1.25, R * 1.02, -R * 1.25, R, 0);
    const sc = 8;
    for (let i = 0; i < sc; i++) { const xa = R - (2 * R * i) / sc, xb = R - (2 * R * (i + 1)) / sc; g.quadraticCurveTo((xa + xb) / 2, R * 0.12, xb, 0); }
    g.closePath();
  };
  bell();
  g.fillStyle = rg(g, -R * 0.3, -R * 0.65, R * 0.05, R * 1.25, [[0, "rgba(255,255,255,0.92)"], [0.45, rgba(col, 0.72)], [1, rgba(dark(col, 0.35), 0.8)]]);
  g.fill();
  // red stomach (manubrium) seen through the bell: a four-lobed cross up in the dome, canals to the rim
  for (const k of [-0.9, -0.45, 0.45, 0.9]) line(g, [[k * R * 0.12, -R * 0.66], [k * R, -R * 0.03]], rgba(dark(gut, 0.1), 0.35), R * 0.022);
  g.save(); g.globalAlpha *= 0.92;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ell(g, dx * R * 0.1, -R * 0.7 + dy * R * 0.08, R * 0.1, R * 0.08, light(gut, 0.05), R * 0.02);
  ell(g, 0, -R * 0.7, R * 0.07, R * 0.07, dark(gut, 0.1), 0);
  g.restore();
  bell(); g.lineWidth = R * 0.045; g.strokeStyle = INKC; g.lineJoin = "round"; g.stroke();
  // gloss
  g.beginPath(); g.ellipse(-R * 0.42, -R * 0.62, R * 0.2, R * 0.09, -0.7, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill();
  // face
  g.save(); g.translate(0, -R * 0.4);
  face(g, R * 0.4, age > 0.5 && expr === "smile" ? "old" : expr, f, blink, look, mixc(col, "#ffffff", 0.35));
  g.restore();
  g.restore();
  // halo
  if (halo > 0) {
    g.save(); g.globalAlpha *= halo;
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, 0, -R * 1.3, 0, R * 0.8, [[0, "rgba(255,230,120,0.5)"], [1, "rgba(255,230,120,0)"]]); g.fillRect(-R, -R * 2.1, 2 * R, 1.6 * R); g.restore();
    ell(g, 0, -R * 1.22, R * 0.55, R * 0.15, null, R * 0.11, 0, INKC); ell(g, 0, -R * 1.22, R * 0.55, R * 0.15, null, R * 0.07, 0, "#ffd84a");
    g.restore();
  }
  // party hat
  if (party > 0) {
    g.save(); g.translate(R * 0.15, -R * 0.98); g.rotate(0.25); g.scale(party, party);
    poly(g, [[-R * 0.28, 0], [0, -R * 0.7], [R * 0.28, 0]], "#4ad8ff", R * 0.035);
    for (let i = 1; i < 4; i++) line(g, [[-R * 0.28 * (1 - i / 4), -R * 0.7 * (i / 4)], [R * 0.28 * (1 - i / 4), -R * 0.7 * (i / 4)]], "#ff5a9a", R * 0.05);
    ell(g, 0, -R * 0.72, R * 0.1, R * 0.1, "#ffd84a", R * 0.03);
    g.restore();
  }
  // cane (held out to the right)
  if (cane > 0) {
    g.save(); g.globalAlpha *= cane;
    const cx = R * 1.18;
    line(g, [[cx, R * 0.1], [cx + R * 0.05, R * 1.7]], INKC, R * 0.12); line(g, [[cx, R * 0.1], [cx + R * 0.05, R * 1.7]], "#8a5a3a", R * 0.07);
    g.beginPath(); g.arc(cx - R * 0.16, R * 0.1, R * 0.16, Math.PI * 2, Math.PI, true); g.lineWidth = R * 0.12; g.strokeStyle = INKC; g.stroke(); g.lineWidth = R * 0.07; g.strokeStyle = "#8a5a3a"; g.stroke();
    g.restore();
  }
  g.restore();
};

// ---------------- polyp (baby stage) ----------------
export type PolypOpts = { f?: number; grow?: number; expr?: Face; pacifier?: number; party?: number; seed?: number; s?: number; buds?: number[]; col?: string; blink?: number; look?: number };
/** polyp standing on the ground at (0, 0); about 300 units tall when grown */
export const polyp = (g: Ctx, o: PolypOpts = {}) => {
  const { f = 0, grow = 1, expr = "baby", pacifier = 0, party = 0, seed = 1, s = 1, buds = [], col = "#f4b6c4", blink = 0, look = 0 } = o;
  if (grow <= 0.01) return;
  g.save(); g.scale(s, s);
  const h = 300 * grow, sway = Math.sin(f * 0.07 + seed) * 14 * grow;
  const top: P = [sway, -h * 0.7];
  // stalk (perisarc: tan tube)
  const stalk = smoothOpen([[0, 0], [sway * 0.3, -h * 0.25], [sway * 0.7, -h * 0.5], top], 6);
  line(g, stalk, INKC, 30 * Math.max(0.5, grow)); line(g, stalk, "#d9b98a", 20 * Math.max(0.5, grow));
  for (let i = 1; i < 5; i++) { const p = stalk[Math.floor((stalk.length - 1) * (i / 5))]; line(g, [[p[0] - 10, p[1]], [p[0] + 10, p[1] - 3]], rgba(INKC, 0.5), 3); }
  // buds on the stalk: tiny medusae growing (0..1 each)
  buds.forEach((b, i) => {
    if (b <= 0.02) return;
    const p = stalk[Math.floor((stalk.length - 1) * (0.35 + 0.18 * i))], side = i % 2 ? 1 : -1;
    g.save(); g.translate(p[0] + side * (26 + 52 * b), p[1] - 20 * b); g.rotate(side * 0.4);
    jelly(g, { f, R: 56 * b, tent: 0.55, pulse: 0.3, expr: "baby", seed: seed + i * 7 });
    g.restore();
  });
  // hydranth (head): a cup with a tentacle crown
  g.save(); g.translate(top[0], top[1]);
  const k = Math.min(1, grow * 1.2);
  g.scale(k, k);
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (i - 5) * 0.3, L = 92 + 10 * Math.sin(i * 1.7), pts: P[] = [];
    for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push([Math.cos(a) * (58 + L * t) + Math.sin(f * 0.12 + i + t * 3) * 10 * t, -70 + Math.sin(a) * (40 + L * t) * 0.9]); }
    line(g, smoothOpen(pts, 3), INKC, 14); line(g, smoothOpen(pts, 3), light(col, 0.35), 7);
  }
  const cup = smoothClosed([[-30, 0], [-62, -40], [-74, -92], [-40, -118], [0, -124], [40, -118], [74, -92], [62, -40], [30, 0]], 5);
  path(g, cup); g.fillStyle = lg(g, -70, -120, 70, 0, [[0, light(col, 0.3)], [0.6, col], [1, dark(col, 0.25)]]); g.fill();
  g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  ell(g, 0, -118, 26, 12, GUT, 4); // the hypostome (mouth cone), red like the medusa's stomach
  g.save(); g.translate(0, -66); face(g, 34, expr, f, blink, look, col); g.restore();
  if (pacifier > 0) { g.save(); g.translate(0, -40); g.scale(pacifier, pacifier); ell(g, 0, 0, 26, 16, "#7cc8ff", 5); ell(g, 0, 8, 12, 12, null, 6, 0, "#ff7ad9"); g.restore(); }
  if (party > 0) {
    g.save(); g.translate(14, -150); g.rotate(0.2); g.scale(party, party);
    poly(g, [[-38, 0], [0, -110], [38, 0]], "#ffd84a", 5);
    for (let i = 1; i < 4; i++) line(g, [[-38 * (1 - i / 4), -110 * (i / 4)], [38 * (1 - i / 4), -110 * (i / 4)]], "#ff5a9a", 8);
    ell(g, 0, -112, 15, 15, "#4ad8ff", 4);
    g.restore();
  }
  g.restore();
  g.restore();
};
/** the root-like stolon running along the ground from x0 to x1 at y (0..1 grown from the middle) */
export const stolon = (g: Ctx, xc: number, y: number, half: number, grow: number, seed = 1) => {
  if (grow <= 0.01) return;
  for (const side of [-1, 1]) {
    const pts: P[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([xc + side * half * grow * t, y + Math.sin(t * 9 + seed + side) * 8 * t]); }
    line(g, pts, INKC, 22); line(g, pts, "#d9b98a", 13);
    for (let i = 3; i <= 12; i += 3) { const p = pts[i]; ell(g, p[0], p[1] + 2, 9, 6, "#c9a070", 3); }
  }
};

// ---------------- cyst ("blob") ----------------
export const cyst = (g: Ctx, f: number, s = 1, opts: { expr?: Face; wob?: number; seed?: number } = {}) => {
  const { expr = "sleepy", wob = 1, seed = 3 } = opts;
  g.save(); g.scale(s, s);
  const w = 1 + 0.04 * Math.sin(f * 0.2) * wob;
  const pts = smoothClosed(blob(0, -62, 105 * w, 64 / w, seed, 9, 0.16).map(([x, y]) => [x, Math.min(y, 0)] as P), 5);
  path(g, pts);
  g.fillStyle = rg(g, -30, -90, 10, 130, [[0, "#ffe0d0"], [0.5, "#f4a88a"], [1, "#c8644a"]]); g.fill();
  g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  ell(g, 40, -26, 24, 14, rgba(GUT, 0.45), 0);
  ell(g, -46, -86, 22, 10, "rgba(255,255,255,0.65)", 0, -0.4);
  g.save(); g.translate(-8, -94); face(g, 32, expr, f, 0, 0, "#f4a88a"); g.restore();
  g.restore();
};

// ---------------- butterfly, cocoon, caterpillar ----------------
export const butterfly = (g: Ctx, f: number, s = 1) => {
  g.save(); g.scale(s, s);
  const flap = 0.25 + 0.75 * Math.abs(Math.cos(f * 0.35));
  for (const k of [-1, 1]) {
    g.save(); g.scale(k * flap, 1);
    poly(g, smoothClosed([[0, -10], [60, -110], [150, -120], [170, -50], [90, 0]], 5), "#ff9a2a", 5);
    poly(g, smoothClosed([[0, 0], [90, 10], [120, 80], [60, 110], [10, 40]], 5), "#ffb84a", 5);
    ell(g, 120, -70, 18, 18, INKC, 0); ell(g, 75, 60, 14, 14, INKC, 0); ell(g, 140, -40, 9, 9, "#fff6e6", 0);
    g.restore();
  }
  rr(g, -12, -70, 24, 150, 12, "#2a2030", 4);
  ell(g, 0, -82, 20, 20, "#2a2030", 4);
  line(g, [[-6, -98], [-30, -150]], INKC, 4); line(g, [[6, -98], [30, -150]], INKC, 4);
  g.save(); g.translate(0, -84); face(g, 16, "happy", f); g.restore();
  g.restore();
};
export const cocoon = (g: Ctx, f: number, s = 1, wiggle = 0) => {
  g.save(); g.scale(s, s); g.rotate(Math.sin(f * 0.5) * 0.12 * wiggle);
  line(g, [[0, -40], [0, -170]], "#d8d0c0", 5);
  const pts = smoothClosed([[0, -40], [55, 20], [62, 120], [30, 220], [0, 250], [-30, 220], [-62, 120], [-55, 20]], 5);
  path(g, pts); g.fillStyle = lg(g, -60, 0, 60, 0, [[0, "#9ee0a8"], [0.6, "#5ab87a"], [1, "#3a8a5a"]]); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  // gold band and dots of a butterfly chrysalis
  g.beginPath(); g.moveTo(-58, 70); g.quadraticCurveTo(0, 90, 58, 70); g.lineWidth = 7; g.strokeStyle = "#e8b830"; g.stroke();
  for (const [dx, dy] of [[-30, 20], [30, 22], [-18, 150], [18, 152], [0, 200]]) ell(g, dx, dy, 7, 7, "#f2c840", 2);
  ell(g, -24, 60, 12, 40, "rgba(255,255,255,0.35)", 0, 0.2);
  g.restore();
};
export const caterpillar = (g: Ctx, f: number, s = 1, expr: Face = "confused") => {
  g.save(); g.scale(s, s);
  for (let i = 5; i >= 0; i--) {
    const x = -i * 52, y = -Math.abs(Math.sin(f * 0.2 + i * 0.7)) * 14;
    ell(g, x, y, i === 0 ? 50 : 40, i === 0 ? 50 : 40, i === 0 ? "#8ad84a" : i % 2 ? "#6ac03a" : "#7cd04a", 5);
    if (i > 0) { line(g, [[x - 10, y + 38], [x - 14, y + 56]], INKC, 6); line(g, [[x + 10, y + 38], [x + 14, y + 56]], INKC, 6); }
  }
  line(g, [[-14, -44], [-30, -100]], INKC, 5); line(g, [[14, -44], [30, -100]], INKC, 5);
  ell(g, -30, -100, 9, 9, "#ff5a5a", 4); ell(g, 30, -100, 9, 9, "#ff5a5a", 4);
  g.save(); g.translate(0, -6); face(g, 28, expr, f, 0, 0, "#8ad84a"); g.restore();
  g.restore();
};

// ---------------- cells ----------------
/** a round cell with a nucleus and a face; `neuron` 0..1 morphs it into a star-shaped nerve cell with branches */
export const cell = (g: Ctx, f: number, r: number, col: string, expr: Face, neuron = 0, seed = 1) => {
  if (neuron > 0.02) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, L = r * (0.6 + 1.5 * neuron) * (i === 2 ? 1.8 : 1);
      const pts: P[] = [];
      for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push([Math.cos(a) * (r * 0.8 + L * t) + Math.sin(t * 5 + i + f * 0.08) * 8 * t, Math.sin(a) * (r * 0.8 + L * t) + Math.cos(t * 4 + i) * 8 * t]); }
      line(g, smoothOpen(pts, 3), INKC, r * 0.22 * (1 - 0.3 * neuron) + 4); line(g, smoothOpen(pts, 3), col, r * 0.22 * (1 - 0.3 * neuron));
      // twig ends
      const e = pts[5];
      for (const d of [-0.5, 0.5]) { const b: P = [e[0] + Math.cos(a + d) * r * 0.35 * neuron, e[1] + Math.sin(a + d) * r * 0.35 * neuron]; line(g, [e, b], INKC, 8); line(g, [e, b], col, 4); }
    }
  }
  const pts = smoothClosed(blob(0, 0, r, r * (0.95 - 0.1 * neuron), seed, 9, 0.08 + 0.12 * neuron), 5);
  path(g, pts); g.fillStyle = rg(g, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [[0, light(col, 0.45)], [1, dark(col, 0.2)]]); g.fill();
  g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  ell(g, r * 0.5, -r * 0.55, r * 0.16, r * 0.13, rgba(dark(col, 0.4), 0.5), 3); // nucleus
  g.save(); g.translate(0, -r * 0.12); face(g, r * 0.42, expr, f, 0, 0, col); g.restore();
};
/** job badge: a name tag on a string, flipping (0..1 rotates it edge-on at 0.5) */
export const badge = (g: Ctx, x: number, y: number, text: string, col: string, flip = 0) => {
  g.save(); g.translate(x, y);
  const sx = Math.abs(Math.cos(flip * Math.PI)) || 0.02;
  g.scale(sx, 1);
  rr(g, -110, -40, 220, 80, 16, col, 6);
  g.font = "900 46px CapFont";
  const tw = g.measureText(text).width;
  if (tw > 186) g.font = `900 ${Math.floor((46 * 186) / tw)}px CapFont`;
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 8; g.strokeStyle = INKC; g.strokeText(text, 0, 3); g.fillText(text, 0, 3);
  g.restore();
};

// ---------------- the hungry fish ----------------
export const fish = (g: Ctx, f: number, s = 1, open = 0, expr: Face = "happy") => {
  g.save(); g.scale(s, s);
  const tail = Math.sin(f * 0.4) * 0.25;
  g.save(); g.translate(230, 0); g.rotate(tail); poly(g, [[0, 0], [140, -110], [110, 0], [140, 110]], "#3a7ac8", 6); g.restore();
  const m = open * 0.55;
  // body with a mouth wedge cut out at the front (left)
  g.beginPath();
  g.ellipse(0, 0, 250, 165, 0, Math.PI + m, Math.PI - m + Math.PI * 2, false);
  g.lineTo(-120, 0); g.closePath();
  g.fillStyle = lg(g, 0, -165, 0, 165, [[0, "#6ab0f0"], [0.55, "#4a90d8"], [1, "#f4f0e0"]]); g.fill();
  g.lineWidth = 7; g.strokeStyle = INKC; g.stroke();
  poly(g, [[-20, -150], [60, -240], [120, -150]], "#3a7ac8", 6);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(30 + i * 45, 10, 60, -0.6, 0.6); g.lineWidth = 4; g.strokeStyle = rgba(INKC, 0.35); g.stroke(); }
  g.save(); g.translate(-110, -70); face(g, 52, expr, f, 0, -0.6, "#4a90d8"); g.restore();
  g.restore();
};

// ---------------- world map ----------------
type LL = [number, number];
const NAM: LL[] = [[-166, 68], [-156, 71], [-140, 70], [-128, 70], [-110, 73], [-95, 72], [-82, 73], [-70, 67], [-62, 58], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-74, 40], [-76, 36], [-80, 32], [-80, 27], [-80.5, 25.2], [-82, 27], [-83, 29.5], [-86, 30.3], [-89, 30], [-94, 29.5], [-97, 27], [-97.5, 22], [-96, 19], [-91, 18.5], [-88, 21], [-87, 16], [-84, 15], [-83.5, 11], [-81.5, 9], [-79, 9.3], [-77.5, 8], [-79.5, 7.3], [-82, 8], [-85, 10], [-86.5, 13], [-91, 14], [-95, 16], [-100, 17], [-105, 20], [-106, 23], [-110, 24], [-112, 29], [-114.5, 30.5], [-117, 32.5], [-120, 34.5], [-122.5, 37.5], [-124, 41], [-124, 46], [-124.5, 48.5], [-128, 51], [-133, 55], [-138, 59], [-145, 60], [-152, 59], [-158, 57], [-163, 55], [-158, 58.5], [-162, 60], [-165, 62.5], [-164, 65]];
const GRL: LL[] = [[-73, 78], [-60, 82], [-30, 83], [-20, 80], [-20, 72], [-30, 68], [-42, 60], [-50, 64], [-55, 70], [-62, 76]];
const SAM: LL[] = [[-77.5, 8], [-72, 12], [-63, 10.5], [-60, 8], [-52, 5], [-50, 1], [-44, -2.5], [-35, -5.5], [-35, -9], [-39, -14], [-40, -21], [-44, -23], [-48, -26], [-53, -34], [-58, -36], [-57, -39], [-62, -41], [-65, -45], [-67, -49], [-69, -52], [-70, -55], [-74, -52], [-75, -46], [-73.5, -40], [-72, -33], [-71, -26], [-70, -18], [-76, -14], [-80, -7], [-81, -3], [-80, 1], [-78, 4]];
const EUA: LL[] = [[-9, 37], [-9, 43], [-2, 43.5], [-1.5, 46], [-4.5, 48.5], [2, 51], [5, 53], [8, 54], [9, 57], [11, 58], [12, 56], [14, 55], [19, 54.5], [21, 57], [24, 59.5], [28, 60], [22, 60.5], [21, 62.5], [25, 65], [22, 65.8], [18, 62.5], [17, 61], [18.5, 60], [16, 56.5], [13, 55.5], [12.5, 56.5], [11, 59], [6, 58], [5, 61], [10, 64], [14, 67.5], [19, 70], [25, 71], [31, 70], [40, 67.5], [45, 68.5], [54, 68.5], [60, 69.5], [68, 73], [80, 73], [90, 75.5], [100, 78], [113, 74], [130, 71], [140, 72], [150, 71], [160, 70], [170, 70], [180, 68], [180, 65], [177, 62], [170, 60], [163, 58], [160, 54], [156, 51], [156, 57], [163, 62], [160, 62], [152, 59], [143, 59], [137, 54], [141, 52], [140, 48], [135, 43], [130, 42.5], [129, 35], [126.5, 34.5], [126, 37], [124.5, 39.5], [121, 40.5], [122, 37.5], [119, 35], [121, 32], [122, 30], [120, 27], [117, 23.5], [113, 22], [110, 20], [108, 21.5], [106.5, 20], [106, 18], [109, 13], [109, 11.5], [105, 8.5], [103, 10.5], [100.5, 13.5], [99.5, 10], [101, 6.5], [103.5, 1.5], [101, 2.5], [98.5, 8], [98, 16], [94.5, 16], [94, 19], [92, 21.5], [90, 22], [87, 21.5], [86.5, 20], [82, 16], [80, 15], [80, 10], [77.5, 8], [76, 10], [74.5, 14], [73, 18], [72.5, 21], [70, 22], [67, 24.5], [62, 25], [57, 25.5], [56.5, 27], [54, 26.5], [51, 24.5], [50, 26], [48.5, 28.5], [48, 30], [50, 30.5], [56, 26.5], [59, 22.5], [55, 17], [52, 16], [48, 14], [43.5, 12.7], [42.5, 15], [39, 21.5], [35, 28], [33, 31], [35, 33.5], [36, 36], [32, 36.5], [28, 36.7], [26.5, 39], [29, 41], [26, 40.5], [23.5, 40], [24, 38], [22, 36.5], [21, 38.5], [19.5, 41.5], [18.5, 42.5], [16, 43.5], [13.5, 45.5], [12.3, 45], [14, 42], [16, 41.5], [18.5, 40.2], [16.5, 38.9], [15.7, 38], [16, 39.5], [15.5, 40.2], [12, 41.8], [10.5, 43], [8.5, 44.3], [6.5, 43.1], [3.2, 43.2], [3.2, 41.9], [0.8, 41], [-0.3, 39.5], [0.2, 38.8], [-0.7, 37.6], [-2, 36.7], [-5.6, 36], [-6.5, 37]];
const AFR: LL[] = [[-5.9, 35.8], [-1, 35.3], [3, 36.8], [10, 37.3], [11, 35], [10, 33.8], [12, 33], [15, 32.2], [20, 30.5], [20, 32.2], [25, 31.8], [29, 30.8], [32.5, 31.3], [34.5, 28], [36, 22], [38, 18], [41, 15], [43.3, 12.5], [51, 12], [51, 10], [48, 4], [42, -1], [40, -4], [39.5, -8], [40.5, -11], [40.5, -15], [35, -20], [35.5, -24], [33, -26], [32.5, -28.5], [30, -31.5], [26, -34], [20, -34.8], [18.5, -34], [18, -31], [15.5, -27], [14.5, -22.5], [11.8, -17], [12.5, -13], [13.5, -11], [12, -6], [11, -3], [9.5, 1], [9.5, 4], [6, 4.3], [2, 6.3], [-2, 4.8], [-7.5, 4.4], [-11.5, 7], [-13.5, 9.5], [-16.7, 12.5], [-17.2, 14.7], [-16.5, 19.5], [-17, 21], [-14.5, 26], [-13, 27.7], [-10, 29], [-9.5, 30.5], [-9.8, 32], [-6.5, 34]];
const AUS: LL[] = [[114, -22], [114.5, -26], [115, -34], [118, -35], [123.5, -34], [126, -32], [131, -31.5], [135, -34.5], [138, -35.5], [140, -38], [144, -38.5], [146.5, -39], [150, -37.5], [153, -31], [153.5, -25], [150.5, -22], [146, -19], [145.5, -15], [142.5, -10.7], [141.5, -13], [141.5, -17], [139, -17], [136, -15], [136.5, -12], [132, -11.3], [129.5, -15], [127, -14], [125, -15], [122, -17.5], [121, -19.5], [117, -20.5]];
const JPN: LL[] = [[130, 31], [131, 33.5], [133, 34.5], [135, 33.5], [137, 34.6], [139.5, 35], [140.8, 36], [141, 38.5], [142, 40], [141.5, 41.5], [140, 40.5], [139.8, 38.5], [138.5, 37.5], [136.5, 37], [135.5, 35.6], [133, 35.5], [131, 34.5], [129.5, 33.2]];
const HOK: LL[] = [[140, 41.6], [141.5, 42.5], [143.5, 42], [145.5, 43.3], [142, 45.5], [141, 43.5]];
const UK: LL[] = [[-5.7, 50], [1.4, 51.2], [1.7, 52.7], [0, 53.5], [-1.6, 55.5], [-3, 58.6], [-5, 58.5], [-6.2, 56.8], [-5, 55], [-3, 54.3], [-4.7, 53.3], [-4.3, 51.6]];
const BOR: LL[] = [[109, 1.5], [111, 3], [115, 5], [117.5, 6.5], [119, 5], [118, 1], [116, -3.5], [111, -3], [110, -1]];
const SUM: LL[] = [[95.5, 5.5], [98, 4], [104, -1.5], [106, -5.8], [102, -4], [99, 0], [96, 3]];
const NZ: LL[] = [[172.7, -34.5], [175.5, -37], [178, -38], [176, -41.5], [172, -43], [170, -46], [167, -46], [170.5, -42], [174, -40]];
const MAD: LL[] = [[49.3, -12], [50.5, -15.5], [49.5, -18], [47.5, -25], [45, -25.5], [43.5, -22], [44.5, -16.5], [47, -15]];
export const LANDS = [NAM, GRL, SAM, EUA, AFR, AUS, JPN, HOK, UK, BOR, SUM, NZ, MAD];
/** equirectangular map: lon -180..180 -> x0..x0+w, lat 84..-58 -> y0..y0+h */
export const mapXY = (lon: number, lat: number, x0: number, y0: number, w: number): P => {
  const h = w * (142 / 360);
  return [x0 + ((lon + 180) / 360) * w, y0 + ((84 - lat) / 142) * h];
};
export const worldMap = (g: Ctx, x0: number, y0: number, w: number, sea = "#2a6fae", land = "#8ccf6e") => {
  const h = w * (142 / 360);
  rr(g, x0 - 20, y0 - 20, w + 40, h + 40, 26, lg(g, 0, y0, 0, y0 + h, [[0, light(sea, 0.1)], [1, dark(sea, 0.15)]]), 7);
  g.save(); g.beginPath(); g.rect(x0 - 16, y0 - 16, w + 32, h + 32); g.clip();
  for (let lon = -150; lon <= 150; lon += 30) { const [x] = mapXY(lon, 0, x0, y0, w); line(g, [[x, y0 - 20], [x, y0 + h + 20]], "rgba(255,255,255,0.12)", 2); }
  for (let lat = -30; lat <= 60; lat += 30) { const [, y] = mapXY(0, lat, x0, y0, w); line(g, [[x0 - 20, y], [x0 + w + 20, y]], "rgba(255,255,255,0.12)", 2); }
  for (const L of LANDS) {
    const pts = L.map(([lo, la]) => mapXY(lo, la, x0, y0, w));
    poly(g, pts, lg(g, 0, y0, 0, y0 + h, [[0, light(land, 0.12)], [1, dark(land, 0.18)]]), 3.5);
  }
  g.restore();
};
export const pin = (g: Ctx, x: number, y: number, s: number, col = "#ff4d5a") => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, [[0, 0], [-16, -30], [-18, -44], [-10, -56], [0, -60], [10, -56], [18, -44], [16, -30]].map(([a, b]) => [a * 1.4, b * 1.4] as P), col, 5);
  ell(g, 0, -64, 11, 11, "#ffffff", 0);
  g.restore();
};

// ---------------- cargo ship with a ballast-tank cutaway ----------------
export const ship = (g: Ctx, f: number, s = 1, cut = 0, jellies = 0) => {
  g.save(); g.scale(s, s);
  const bob = Math.sin(f * 0.1) * 6;
  g.translate(0, bob);
  // containers
  const cc = ["#e8322e", "#2a62b8", "#f2c230", "#3aa86a", "#f08a2c", "#7a5ac9"];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) rr(g, -360 + i * 70, -130 - j * 52, 66, 50, 4, cc[(i * 2 + j * 5) % 6], 4);
  // bridge (stern, right)
  rr(g, 290, -230, 110, 150, 6, "#f4f4f0", 5);
  for (let i = 0; i < 3; i++) rr(g, 302 + i * 34, -212, 24, 22, 3, "#8ac8f0", 3);
  rr(g, 330, -280, 26, 54, 4, "#3a3d47", 4);
  // hull
  const hull: P[] = [[-470, -80], [450, -80], [420, 70], [-400, 70]];
  poly(g, hull, lg(g, 0, -80, 0, 70, [[0, "#2e3440"], [0.55, "#2e3440"], [0.56, "#b83a2e"], [1, "#8a2a22"]]), 7);
  line(g, [[-470, -64], [450, -64]], "#f4f4f0", 6);
  // cutaway: ballast tank in the bottom of the hull
  if (cut > 0) {
    g.save(); g.globalAlpha *= cut;
    rr(g, -300, -50, 560, 108, 10, lg(g, 0, -50, 0, 58, [[0, "#5ab8e8"], [1, "#1f6a9a"]]), 6, "#f4f4f0");
    for (let i = 0; i < 10; i++) { const wx = -280 + i * 56; line(g, [[wx, -40 + Math.sin(f * 0.2 + i) * 3], [wx + 30, -40 + Math.sin(f * 0.2 + i + 1) * 3]], "rgba(255,255,255,0.6)", 4); }
    for (let i = 0; i < 5; i++) {
      const k = clamp01(jellies * 5 - i);
      if (k <= 0) continue;
      g.save(); g.translate(-230 + i * 110, 10 + Math.sin(f * 0.15 + i) * 8); g.scale(k, k);
      jelly(g, { f: f + i * 9, R: 26, tent: 0.6, expr: "happy", seed: i + 3 });
      g.restore();
    }
    g.restore();
  }
  g.restore();
};

// ---------------- DNA helix ----------------
/** vertical double helix centred on x, from y0 to y1; hot = indices of rungs drawn as gold "repair genes" */
export const dna = (g: Ctx, x: number, y0: number, y1: number, f: number, amp = 150, hot: number[] = [], heal = 1) => {
  const n = 18, ph = f * 0.05;
  const pt = (i: number, side: number): [number, number, number] => {
    const t = i / (n - 1), a = t * Math.PI * 3 + ph + (side > 0 ? Math.PI : 0);
    return [x + Math.sin(a) * amp, y0 + t * (y1 - y0), Math.cos(a)];
  };
  // rungs first (behind), strands on top
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pt(i, -1), [bx, by] = pt(i, 1);
    const isHot = hot.includes(i), broken = i === 11 && heal < 1;
    const col = isHot ? "#ffd84a" : i % 2 ? "#ff7a9a" : "#7ad0ff";
    if (broken) {
      const mx = (ax + bx) / 2, gap = 18 * (1 - heal);
      line(g, [[ax, ay], [mx - gap, ay]], INKC, 16); line(g, [[ax, ay], [mx - gap, ay]], col, 9);
      line(g, [[mx + gap, by], [bx, by]], INKC, 16); line(g, [[mx + gap, by], [bx, by]], col, 9);
    } else { line(g, [[ax, ay], [bx, by]], INKC, 16); line(g, [[ax, ay], [bx, by]], col, 9); }
    if (isHot) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, (ax + bx) / 2, ay, 0, 90, [[0, "rgba(255,220,90,0.45)"], [1, "rgba(255,220,90,0)"]]); g.fillRect((ax + bx) / 2 - 90, ay - 90, 180, 180); g.restore(); }
  }
  for (const side of [-1, 1]) {
    const pts: P[] = [];
    for (let i = 0; i <= (n - 1) * 4; i++) { const [px, py] = pt(i / 4, side); pts.push([px, py]); }
    line(g, pts, INKC, 26); line(g, pts, side < 0 ? "#4a7ae8" : "#e85a8a", 17);
  }
};
export const wrench = (g: Ctx, x: number, y: number, s: number, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rr(g, -14, 0, 28, 160, 12, "#c9ccd2", 5);
  path(g, smoothClosed([[-46, -10], [-40, -60], [-14, -70], [-14, -34], [14, -34], [14, -70], [40, -60], [46, -10], [20, 20], [-20, 20]], 3));
  g.fillStyle = "#c9ccd2"; g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke();
  g.restore();
};

// ---------------- props ----------------
/** a giant cartoon pinky finger seen from the side, nail up, pointing left; tip at (0, 0) */
export const pinky = (g: Ctx, s = 1) => {
  g.save(); g.scale(s, s);
  const sk = "#f5c9a0";
  path(g, smoothClosed([[0, -60], [40, -120], [700, -150], [1300, -150], [1300, 150], [700, 150], [40, 110], [-10, 40]], 5));
  g.fillStyle = lg(g, 0, -150, 0, 150, [[0, light(sk, 0.2)], [0.6, sk], [1, dark(sk, 0.2)]]); g.fill(); g.lineWidth = 7; g.strokeStyle = INKC; g.stroke();
  // nail
  path(g, smoothClosed([[60, -118], [260, -138], [270, -60], [80, -50]], 4)); g.fillStyle = lg(g, 60, -140, 270, -50, [[0, "#ffe8e8"], [1, "#f4c0c0"]]); g.fill(); g.lineWidth = 5; g.stroke();
  line(g, [[90, -110], [240, -124]], "rgba(255,255,255,0.8)", 6);
  // knuckle creases
  for (const x of [560, 600]) { g.beginPath(); g.moveTo(x, -140); g.quadraticCurveTo(x - 30, 0, x, 140); g.lineWidth = 4; g.strokeStyle = rgba(dark(sk, 0.5), 0.6); g.stroke(); }
  g.restore();
};
export const nameCard = (g: Ctx, x: number, y: number, s: number, l1: string, l2: string) => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -330, -90, 660, 180, 24, "#f4ecd2", 7);
  g.fillStyle = INKC; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "italic 900 60px CapFont"; g.fillText(l1, 0, -22);
  g.font = "900 40px CapFont"; g.fillStyle = "#c8573a"; g.fillText(l2, 0, 44);
  g.restore();
};
export const stamp = (g: Ctx, x: number, y: number, s: number, text: string, col = "#ff4d5a", rot = -0.15) => {
  if (s <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.font = "900 120px CapFont"; g.textAlign = "center"; g.textBaseline = "middle";
  const w = g.measureText(text).width + 80;
  rr(g, -w / 2, -85, w, 170, 22, "rgba(255,255,255,0.92)", 12, col);
  g.lineWidth = 14; g.strokeStyle = INKC; g.strokeText(text, 0, 6); g.fillStyle = col; g.fillText(text, 0, 6);
  g.restore();
};
/** circular "restart" arrow, rotating */
export const cycleArrow = (g: Ctx, x: number, y: number, r: number, rot: number, col = "#7cff4f") => {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.arc(0, 0, r, 0.3, Math.PI * 1.75); g.lineWidth = r * 0.26; g.strokeStyle = INKC; g.lineCap = "round"; g.stroke();
  g.lineWidth = r * 0.16; g.strokeStyle = col; g.stroke();
  const a = Math.PI * 1.75, hx = Math.cos(a) * r, hy = Math.sin(a) * r;
  g.save(); g.translate(hx, hy); g.rotate(a + Math.PI / 2);
  poly(g, [[-r * 0.32, -r * 0.05], [r * 0.32, -r * 0.05], [0, r * 0.38]].map(([u, v]) => [u, -v] as P), col, 6);
  g.restore();
  g.restore();
};
export const oneWaySign = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -12, 0, 24, 520, 6, "#9aa4b0", 5);
  rr(g, -250, -110, 500, 140, 14, "#1d1b22", 7);
  rr(g, -232, -94, 464, 108, 10, "#ffffff", 0);
  poly(g, [[-200, -55], [110, -55], [110, -85], [205, -40], [110, 5], [110, -25], [-200, -25]], "#1d1b22", 0);
  g.fillStyle = "#ffffff"; g.font = "900 34px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ONE WAY", -40, -40);
  g.restore();
};
export const plate = (g: Ctx, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  ell(g, 0, 0, 120, 44, "#f4f4f0", 6); ell(g, 0, -4, 76, 26, "#e4e4de", 3);
  line(g, [[-160, -40], [-160, 50]], INKC, 12); line(g, [[-160, -40], [-160, 50]], "#c9ccd2", 6);
  line(g, [[160, -40], [160, 50]], INKC, 12); line(g, [[160, -40], [160, 50]], "#c9ccd2", 6);
  g.restore();
};
export const bandage = (g: Ctx, x: number, y: number, s: number, rot = 0.6) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rr(g, -110, -34, 220, 68, 30, "#f2c79a", 6); rr(g, -40, -30, 80, 60, 8, "#e8b080", 3);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ell(g, -24 + i * 24, -12 + j * 24, 4, 4, "#c8906a", 0);
  g.restore();
};
export const hourglass = (g: Ctx, x: number, y: number, s: number, f: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(f * 0.1) * 0.08);
  rr(g, -80, -130, 160, 24, 8, "#8a5a3a", 5); rr(g, -80, 106, 160, 24, 8, "#8a5a3a", 5);
  poly(g, [[-62, -106], [62, -106], [8, 0], [62, 106], [-62, 106], [-8, 0]], "rgba(220,240,255,0.6)", 5);
  poly(g, [[-30, -46], [30, -46], [4, -4], [-4, -4]], "#f2c230", 0);
  poly(g, [[-50, 104], [50, 104], [0, 50]], "#f2c230", 0);
  line(g, [[0, -4], [0, 100]], "#f2c230", 4);
  g.restore();
};
/** a cake with one "11" candle pair */
export const cake = (g: Ctx, x: number, y: number, s: number, f: number, lit = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  ell(g, 0, 0, 200, 40, "#f4f4f0", 6);
  rr(g, -160, -150, 320, 150, 20, lg(g, 0, -150, 0, 0, [[0, "#ff9ac0"], [1, "#e86a9a"]]), 6);
  for (let i = 0; i < 7; i++) ell(g, -138 + i * 46, -146, 26, 18, "#fff6f0", 4);
  for (const k of [-1, 1]) {
    rr(g, k * 34 - 12, -270, 24, 120, 6, k < 0 ? "#4ad8ff" : "#ffd84a", 4);
    if (lit > 0) { const fl = 1 + 0.15 * Math.sin(f * 0.6 + k); poly(g, [[k * 34, -330 * fl + 30 * (fl - 1)], [k * 34 + 16, -290], [k * 34, -272], [k * 34 - 16, -290]], "#ffb84a", 4); }
  }
  g.fillStyle = "#ffffff"; g.font = "900 70px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 10; g.strokeStyle = INKC;
  g.strokeText("11", 0, -72); g.fillText("11", 0, -72);
  g.restore();
};
/** a simple wall flag: Japan (white, red disc) or Spain (red / yellow / red) */
export const flag = (g: Ctx, x: number, y: number, s: number, kind: "japan" | "spain") => {
  g.save(); g.translate(x, y); g.scale(s, s);
  line(g, [[-90, -60], [-90, 200]], INKC, 12); line(g, [[-90, -60], [-90, 200]], "#9aa4b0", 6);
  if (kind === "japan") { rr(g, -90, -60, 180, 120, 4, "#ffffff", 5); ell(g, 0, 0, 34, 34, "#d8263a", 0); }
  else { rr(g, -90, -60, 180, 120, 4, "#c8202e", 5); rr(g, -90, -30, 180, 60, 0, "#f6c200", 0); rr(g, -90, -60, 180, 120, 4, null, 5); }
  g.restore();
};
export const tally = (g: Ctx, x: number, y: number, n: number, s = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i < n; i++) {
    const grp = Math.floor(i / 5), k = i % 5;
    const gx = grp * 170;
    if (k < 4) line(g, [[gx + k * 30, -60], [gx + k * 30 + 6, 60]], "#1d3a8a", 12);
    else line(g, [[gx - 20, 40], [gx + 120, -40]], "#d8263a", 12);
  }
  g.restore();
};
export { INK, rg, rgba };
