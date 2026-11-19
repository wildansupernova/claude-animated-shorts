// Our own cartoon kaiju, drawn in the cast's language (flat fills, painted crescent, thick-thin plum ink): a big
// lizard with bone-white maple-leaf back plates, drawn in 3/4 view facing screen-right in a 1000 x 1000 design box,
// soles at y = 975. Variants are colour/proportion sets for the different eras; poses are parametric. Also the other
// creature cards of the explainer (gorilla, whale, the 60s rival, the three-headed silhouette, mushroom cloud, ...).
import { Pen, P2, lerp2 as lerp, INK, SKIN, WHITE, mul, mix, rad, rnd, curve, ellPts, blobPts, thickAngle, DEF_LIGHT, SH_CLOTH, SH_FELT, Blob, faceFront, rotPts } from "./toon";

export type ZVar = "m1" | "showa" | "heisei" | "shin" | "mv" | "suit" | "suitOpen" | "sil" | "sunk";
export type ZPose = "stand" | "walk" | "roar" | "breath" | "wave" | "hop" | "punch" | "sink";
export type ZOpts = { v?: ZVar; pose?: ZPose; phase?: number; glow?: number; jaw?: number; eye?: "angry" | "friendly" | "x" | "shut"; sweat?: number; regrow?: number; rim?: string };

type Pal = { skin: string; belly: string; plate: string; plateEdge?: string; crack?: string; bulk: number; eyeBig: boolean };
const PAL: Record<ZVar, Pal> = {
  m1: { skin: "#45474f", belly: "#5d6068", plate: "#e2ddd0", bulk: 1, eyeBig: false },
  showa: { skin: "#5f6b78", belly: "#808c98", plate: "#ebe6da", bulk: 1, eyeBig: true },
  heisei: { skin: "#3b3742", belly: "#55505c", plate: "#ddd5d2", bulk: 1.05, eyeBig: false },
  shin: { skin: "#4c3230", belly: "#5e3d39", plate: "#6e4038", crack: "#ff6a3a", bulk: 0.95, eyeBig: false },
  mv: { skin: "#3c4542", belly: "#566260", plate: "#bfcac6", bulk: 1.18, eyeBig: false },
  suit: { skin: "#4a4d55", belly: "#62656d", plate: "#e2ddd0", bulk: 1, eyeBig: false },
  suitOpen: { skin: "#4a4d55", belly: "#62656d", plate: "#e2ddd0", bulk: 1, eyeBig: false },
  sil: { skin: "#1c1622", belly: "#1c1622", plate: "#1c1622", bulk: 1, eyeBig: false },
  sunk: { skin: "#3a3f4a", belly: "#4a5060", plate: "#c8ccd0", bulk: 1, eyeBig: false },
};
const GLOW = "#8fe4ff", GLOW2 = "#e8fbff";

/** maple-leaf back plate at base b, pointing along direction a (radians), size s */
const plate = (b: P2, a: number, s: number, seed: number): P2[] => {
  const lobes = [[-0.55, 0.35], [-0.42, 0.62], [-0.18, 0.78], [0, 1], [0.2, 0.74], [0.45, 0.6], [0.58, 0.3]];
  const pts: P2[] = [[-0.42, 0], ...lobes.flatMap(([x, y], i) => [[x * (1 + 0.1 * rnd(seed, i)), y] as P2, [x * 0.7 + (lobes[i + 1]?.[0] ?? 0.42) * 0.3, y * 0.72] as P2]).slice(0, -1), [0.42, 0]];
  const c = Math.cos(a), sn = Math.sin(a);
  return pts.map(([x, y]) => [b[0] + (x * -sn + y * c) * s, b[1] + (x * c + y * sn) * s] as P2);
};

/** a tapered tube polygon along a centreline with widths w0 -> w1 */
const tube = (cl: P2[], w0: number, w1: number): P2[] => {
  const L: P2[] = [], R: P2[] = [], n = cl.length;
  cl.forEach((q, i) => {
    const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)];
    let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    L.push([q[0] + nx * w, q[1] + ny * w]); R.push([q[0] - nx * w, q[1] - ny * w]);
  });
  return [...L, ...R.reverse()];
};

export const drawKaiju = (p: Pen, o: ZOpts = {}) => {
  const v = o.v ?? "m1", P = PAL[v], pose = o.pose ?? "stand", ph = o.phase ?? 0, glow = o.glow ?? 0, two = Math.PI * 2;
  const sil = v === "sil", light = DEF_LIGHT, thick = thickAngle(light), ow = 9, B = P.bulk;
  const skinSh = mul(P.skin, SH_CLOTH), bellySh = mul(P.belly, SH_CLOTH);
  const walk = pose === "walk", hop = pose === "hop";
  const bob = walk ? 10 * Math.cos(2 * two * ph) : hop ? -60 : 0;
  const lean = pose === "roar" ? -6 : pose === "breath" ? 8 : walk ? 3 : pose === "punch" ? 6 : 0;
  // body frame: hips + chest
  const hip: P2 = [440, 640 + bob], chest: P2 = [500 + lean * 4, 430 + bob];
  p.rot = lean ? [rad(lean), hip[0], hip[1]] : null;
  const ink = (pts: P2[], w = ow) => p.inkRing(pts, w, thick, 0.45, sil ? (o.rim ?? INK) : INK);
  const fill = (pts: P2[], base: string, sh: string, flat = 0.3) => { if (sil) p.poly(pts, base, 0); else p.gradFill(pts, base, sh, light, flat); };
  // ---------- tail (behind) ----------
  const sw = walk ? 22 * Math.sin(two * ph) : 0;
  const tailCl = curve([hip[0] - 70, hip[1] - 20], [150 + sw, 640 + bob * 0.5], [25 + sw * 1.5, 935], 22);
  const tail = tube(tailCl, 150 * B, 10);
  // ---------- legs ----------
  const step = walk ? Math.sin(two * ph) : 0, lift = (s: number) => (walk ? Math.max(0, Math.sin(two * ph + (s > 0 ? 0 : Math.PI))) * 28 : hop ? 40 : 0);
  const leg = (x: number, s: number, dark: boolean) => {
    const fx = x + s * step * 45, fy = 968 - lift(s);
    const kneeX = (x + fx) / 2 + 35, thighC: P2 = [x, hip[1] + 90];
    const shin = tube([[kneeX, hip[1] + 170], [fx + 8, fy - 30]], 105 * B, 92 * B);
    const thigh = blobPts(thighC[0], thighC[1], { a: 92 * B, b: 128, nTop: 2.2, nBot: 2.2, egg: 0.1, asym: 0.05, rot: rad(-12), noise: 0.01, seed: 3 + s } as Blob, 40);
    const foot: P2[] = ellPts(fx + 30, fy, 82 * B, 26, 180, 360).concat([[fx + 112 * B, fy + 6], [fx - 52 * B, fy + 6]]);
    const col = dark ? mul(P.skin, [0.78, 0.78, 0.84]) : P.skin, csh = dark ? mul(skinSh, [0.8, 0.8, 0.86]) : skinSh;
    for (const part of [shin, foot, thigh]) { fill(part, col, csh, 0.25); ink(part); }
    if (!sil) for (let i = 0; i < 3; i++) p.poly([[fx + 40 + i * 26, fy + 4], [fx + 54 + i * 26, fy + 4], [fx + 64 + i * 26, fy + 16], [fx + 38 + i * 26, fy + 16]], "#e8e2d4", 4);
  };
  // ---------- back plates along a spine curve: neck -> shoulders -> back -> tail top ----------
  const roar = pose === "roar", breath = pose === "breath";
  const hd: P2 = roar ? [chest[0] + 175, chest[1] - 245] : breath ? [chest[0] + 225, chest[1] - 150] : pose === "sink" ? [chest[0] + 170, chest[1] - 120] : [chest[0] + 195, chest[1] - 200 + (walk ? 6 * Math.sin(two * ph * 2) : 0)];
  const tailTop = tailCl.slice(2, 19).map((q, i, arr) => { const a = arr[Math.max(0, i - 1)], b = arr[Math.min(arr.length - 1, i + 1)]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny) || 1; const w = (150 * B + (10 - 150 * B) * ((i + 2) / 21)) / 2; return [q[0] + (nx / l) * w * 0.8, q[1] + (ny / l) * w * 0.8] as P2; });
  const spineK: P2[] = [[hd[0] - 85, hd[1] + 5], [chest[0] - 30, chest[1] - 150], [hip[0] - 95, hip[1] - 300], [hip[0] - 150, hip[1] - 170], [hip[0] - 165, hip[1] - 40], ...tailTop.filter((_, i) => i % 3 === 0)];
  const spine: P2[] = [];
  for (let i = 0; i < spineK.length - 1; i++) for (let k = 0; k < 4; k++) spine.push(lerp(spineK[i], spineK[i + 1], k / 4));
  spine.push(spineK[spineK.length - 1]);
  const N = 15;
  const plates = (layer: number) => { for (let j = 0; j < N; j++) {
    const t = j / (N - 1), i = Math.min(spine.length - 2, Math.round(t * (spine.length - 1)));
    const b = spine[i], nb = spine[i + 1];
    const prof = t < 0.12 ? 0.55 + 3 * t : t < 0.35 ? 1 : 1 - (t - 0.35) * 1.25;
    const s = 150 * prof * (layer ? 0.8 : 1) * (v === "mv" ? 0.85 : 1);
    const a = Math.atan2(nb[1] - b[1], nb[0] - b[0]) + Math.PI / 2 + (layer ? -0.28 : 0.05);
    const bb: P2 = [b[0] + (layer ? 22 : 0), b[1] + (layer ? -10 : 0)];
    const pts = plate(bb, a, s, j + layer * 7);
    const base = glow > 0 ? mix(P.plate, GLOW, glow) : layer ? mul(P.plate, [0.8, 0.8, 0.85]) : P.plate;
    if (glow > 0.05) p.stroke(pts.concat([pts[0]]), 22 * glow + 6, mix(GLOW, WHITE, 0.25));
    if (sil && glow <= 0.05) p.poly(pts, P.plate, 0); else { p.gradFill(pts, base, glow > 0 ? mix(base, WHITE, 0.6 * glow) : mul(base, SH_FELT), light + Math.PI, 0.4); ink(pts, ow * 0.8); }
  } };
  plates(1); plates(0);
  fill(tail, P.skin, skinSh, 0.35); ink(tail);
  leg(hip[0] - 55, -1, true);
  // ---------- torso ----------
  const T: Blob = { a: 165 * B, b: 245, nTop: 2.1, nBot: 2.4, egg: 0.26, asym: 0.06, rot: rad(-14), noise: 0.012, seed: 11 };
  const tp = blobPts((hip[0] + chest[0]) / 2 + 10, (hip[1] + chest[1]) / 2 - 20, T, 64);
  // back arm
  const armPose = (s: number): P2[] => {
    const sh: P2 = [chest[0] + 50 + s * 18, chest[1] + 10];
    if (pose === "wave" && s > 0) return [sh, [sh[0] + 70, sh[1] - 70], [sh[0] + 60, sh[1] - 170 + 20 * Math.sin(ph * two)]];
    if (hop || pose === "roar") return [sh, [sh[0] + 80, sh[1] - 20], [sh[0] + 130, sh[1] - 90 - (hop ? 40 : 0)]];
    if (pose === "punch" && s > 0) return [sh, [sh[0] + 110, sh[1] + 10], [sh[0] + 230, sh[1] - 10]];
    if (pose === "sink") return [sh, [sh[0] + 60, sh[1] + 90], [sh[0] + 70, sh[1] + 170]];
    return [sh, [sh[0] + 80, sh[1] + 50], [sh[0] + 140, sh[1] + 40 + (walk ? 15 * Math.sin(two * ph + s) : 0)]];
  };
  const arm = (s: number) => {
    const [a, b, c] = armPose(s), cl = curve(a, b, c, 10), pts = tube(cl, 62 * B, 44 * B), dark = s < 0;
    fill(pts, dark ? mul(P.skin, [0.8, 0.8, 0.86]) : P.skin, skinSh); ink(pts, ow * 0.85);
    if (!sil) for (let i = -1; i <= 1; i++) { const d = Math.atan2(c[1] - b[1], c[0] - b[0]) + i * 0.45; p.poly([[c[0] + Math.cos(d) * 14, c[1] + Math.sin(d) * 14 - 6], [c[0] + Math.cos(d) * 44, c[1] + Math.sin(d) * 44], [c[0] + Math.cos(d) * 14, c[1] + Math.sin(d) * 14 + 6]], "#e8e2d4", 3); }
  };
  arm(-1);
  // neck first, so the torso hides its base
  const neck = tube(curve([chest[0] - 30, chest[1] - 20], [chest[0] + 70, chest[1] - 110], [hd[0] - 50, hd[1] + 15], 10), 230 * B, 115);
  fill(neck, P.skin, skinSh, 0.3); ink(neck);
  fill(tp, P.skin, skinSh, 0.28);
  if (!sil) p.clip(tp, () => {
    // belly plates
    const bp = blobPts(tp.reduce((s, q) => s + q[0], 0) / tp.length + 95 * B, (hip[1] + chest[1]) / 2 + 10, { ...T, a: 95 * B, b: 215, seed: 12 }, 48);
    p.gradFill(bp, P.belly, bellySh, light, 0.35);
    for (let i = 0; i < 9; i++) { const y = chest[1] - 40 + i * 42; p.stroke([[hip[0] + 40, y + 8], [hip[0] + 260, y - 12]], 4, mix(P.belly, INK, 0.45)); }
    // bumpy hide
    for (let i = 0; i < 46; i++) { const x = hip[0] - 170 + rnd(i, 1) * 300, y = chest[1] - 160 + rnd(i, 2) * 440; p.ell(x, y, 8 + 10 * rnd(i, 3), 6 + 6 * rnd(i, 4), mix(P.skin, INK, 0.28), 0); }
    if (P.crack) for (let i = 0; i < 7; i++) { const x = hip[0] - 120 + rnd(i, 5) * 220, y = chest[1] - 60 + rnd(i, 6) * 300; p.stroke([[x, y], [x + 20, y + 30], [x + 5, y + 60], [x + 25, y + 95]], 7, P.crack); }
    if (glow > 0.3) for (let i = 0; i < 5; i++) p.stroke([[hip[0] - 60 + i * 20, chest[1] - 80 + i * 40], [hip[0] - 40 + i * 20, chest[1] - 40 + i * 40]], 6 * glow, mix(P.skin, GLOW, 0.6));
  });
  ink(tp);
  // neck front (throat) over the torso top so the join reads as one body
  const throat = tube(curve([chest[0] + 40, chest[1] + 30], [chest[0] + 100, chest[1] - 80], [hd[0] - 30, hd[1] + 35], 8), 120 * B, 80);
  fill(throat, P.skin, skinSh, 0.35);
  if (!sil) p.clip(throat, () => { for (let i = 0; i < 5; i++) p.stroke([[chest[0] + 50 + i * 22, chest[1] - 10 - i * 38], [chest[0] + 130 + i * 22, chest[1] + 10 - i * 38]], 4, mix(P.belly, INK, 0.4)); });
  leg(hip[0] + 85, 1, false);
  // ---------- head ----------
  const hRot = roar ? -28 : breath ? 4 : hop ? -10 : pose === "sink" ? 40 : 0;
  if (v === "suitOpen") {
    // the rubber head flopped back over the shoulders, a sweaty stuntman's face in the neck hole
    drawHead(p, [hd[0] - 120, hd[1] + 120], 150, P, 115, "shut", sil, glow, ow, thick, light);
    const W = 215, cx = hd[0] - 50, cy = hd[1] + 30;
    const hb = blobPts(cx, cy, { a: W / 2, b: W * 0.47, nTop: 1.75, nBot: 2.3, egg: -0.12, asym: 0.06, rot: 0, noise: 0.008, seed: 4 } as Blob, 48);
    p.shadedFill(hb, SKIN, mul(SKIN, [0.96, 0.86, 0.84]), light, W / 2); p.inkRing(hb, ow * 0.8, thick);
    p.clip(hb, () => p.poly([[cx - W, cy - W], [cx + W, cy - W], [cx + W, cy - 0.32 * W], [cx - W, cy - 0.32 * W]], "#2a1e1a", 0));
    p.inkRing(hb, ow * 0.8, thick);
    faceFront(p, cx + 6, cy + 4, W, "pained", 1, 0, 0, false, SKIN);
    const sw2 = o.sweat ?? 1;
    for (let i = 0; i < 4; i++) { const t = (sw2 + i * 0.27) % 1, x = cx - 70 + i * 48, y = cy - 60 + t * 90; p.poly([[x, y - 16], [x + 9, y + 2], [x, y + 9], [x - 9, y + 2]], "#9fd4ff", 3); }
    // zip down the front of the suit
    p.stroke([[chest[0] + 60, chest[1] - 20], [hip[0] + 90, hip[1] - 60]], 5, "#c9ccd2");
  } else drawHead(p, hd, v === "mv" ? 175 : 160, P, hRot, o.eye ?? (P.eyeBig ? "friendly" : "angry"), sil, glow, ow, thick, light, o.jaw ?? (roar ? 1 : breath ? 0.8 : pose === "sink" ? 0.3 : 0), v);
  arm(1);
  // regrowing flesh (the ending of Minus One): pulsing raw blobs on the torn body
  if (o.regrow) for (let i = 0; i < 6; i++) {
    const k = o.regrow, x = hd[0] - 60 + rnd(i, 7) * 120, y = hd[1] + 10 + rnd(i, 8) * 160, r = (26 + 22 * rnd(i, 9)) * (0.6 + 0.4 * Math.sin(k * 6 + i));
    p.ell(x, y, r, r * 0.8, i % 2 ? "#d0505a" : "#e8707a", 5);
  }
  p.rot = null;
};

const drawHead = (p: Pen, hd: P2, S: number, P: Pal, rotDeg: number, eye: string, sil: boolean, glow: number, ow: number, thick: number, light: number, jaw = 0, v: ZVar = "m1") => {
  const [hx, hy] = hd, k = S / 160;
  const R = (pts: P2[]) => rotPts(pts.map(([x, y]) => [hx + x * k, hy + y * k] as P2), rad(rotDeg), hx - 60 * k, hy + 20 * k);
  const ja = rad(30 * jaw);
  const lower = R(rotPts([[-70, 18], [10, 26], [75, 30], [92, 42], [60, 62], [-10, 66], [-80, 50]], ja, -70, 18));
  const upper = R([[-95, 10], [-80, -40], [-30, -62], [30, -60], [70, -38], [100, -10], [104, 20], [70, 30], [10, 26], [-70, 20], [-95, 40]]);
  const fillC = (pts: P2[], c: string) => { if (sil) p.poly(pts, c, 0); else p.gradFill(pts, c, mul(c, SH_CLOTH), light, 0.3); };
  if (jaw > 0.05) { // mouth inside
    const m = R(rotPts([[-60, 22], [85, 26], [80, 48], [-40, 46]], ja * 0.5, -70, 18));
    p.poly(m, glow > 0.3 ? mix("#5a1e28", GLOW, glow) : "#5a1e28", 0);
    if (!sil) for (let i = 0; i < 7; i++) { const a = R([[-20 + i * 15, 26]])[0]; p.poly([[a[0] - 6, a[1]], [a[0] + 6, a[1]], [a[0], a[1] + 14]], WHITE, 2); }
  }
  fillC(lower, P.skin); p.inkRing(lower, ow * 0.9, thick);
  fillC(upper, P.skin); p.inkRing(upper, ow, thick);
  if (sil) { if (glow > 0.3) p.poly(R([[40, -14], [58, -18], [58, -8], [42, -6]]), GLOW2, 0); return; }
  // brow ridge, nostril, eye
  p.stroke(R([[0, -36], [40, -42], [70, -28]]), 7, mix(P.skin, INK, 0.5));
  p.dot(R([[92, 2]])[0][0], R([[92, 2]])[0][1], 4.5);
  const [ex, ey] = R([[42, -14]])[0];
  if (eye === "friendly") { p.ell(ex, ey, 17 * k, 19 * k, WHITE, 4); p.dot(ex + 4 * k, ey + 2 * k, 8 * k); }
  else if (eye === "x") { for (const s of [-1, 1]) p.stroke([[ex - 12 * k, ey - 12 * k * s], [ex + 12 * k, ey + 12 * k * s]], 6); }
  else if (eye === "shut") p.arc(ex, ey, 12 * k, 6 * k, 20, 160, 5);
  else { p.ell(ex, ey, 12 * k, 8 * k, v === "heisei" ? "#f2d27a" : v === "shin" ? "#fff2c0" : "#f4efe2", 3); p.dot(ex + 3 * k, ey, 4.5 * k); p.stroke(R([[18, -30], [60, -20]]), 9, INK); }
  if (glow > 0.6) p.ell(ex, ey, 10 * k, 7 * k, GLOW2, 0);
};

// ---------------- other creatures and big effect drawings ----------------
/** cartoon gorilla, sitting-ish front view, box 600 x 600 */
export const gorilla = (p: Pen) => {
  const fur = "#4a3b38", face = "#a8877a";
  for (const s of [-1, 1]) { const a = tube(curve([300 + s * 120, 260], [300 + s * 230, 380], [300 + s * 200, 560], 8), 90, 70); p.gradFill(a, fur, mul(fur, SH_FELT), DEF_LIGHT); p.inkRing(a, 9, 1); p.ell(300 + s * 200, 560, 48, 30, face, 8); }
  const body = blobPts(300, 400, { a: 170, b: 180, nTop: 2.2, nBot: 2.4, egg: 0.15, asym: 0, rot: 0, noise: 0.01, seed: 2 } as Blob, 48);
  p.gradFill(body, fur, mul(fur, SH_FELT), DEF_LIGHT); p.inkRing(body, 10, 1);
  p.ell(300, 430, 100, 110, mix(fur, face, 0.4), 6);
  const head = blobPts(300, 190, { a: 110, b: 105, nTop: 1.6, nBot: 2.4, egg: -0.05, asym: 0, rot: 0, noise: 0.01, seed: 3 } as Blob, 48);
  p.gradFill(head, fur, mul(fur, SH_FELT), DEF_LIGHT); p.inkRing(head, 10, 1);
  p.ell(300, 215, 78, 62, face, 6);
  for (const s of [-1, 1]) { p.ell(300 + s * 30, 180, 11, 12, WHITE, 4); p.dot(300 + s * 30, 182, 6); }
  p.stroke([[262, 160], [338, 160]], 12, INK);
  p.dot(290, 222, 5); p.dot(310, 222, 5); p.arc(300, 238, 26, 12, 20, 160, 6);
};
/** cartoon whale with a spout, box 800 x 500 */
export const whale = (p: Pen) => {
  const blue = "#3f78b8", belly = "#cfe2f2";
  const body: P2[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = Math.PI * t; body.push([120 + 520 * t, 300 - Math.sin(a) * 170 * (1 - 0.35 * t)]); }
  body.push([660, 320], [740, 250], [770, 330], [700, 360], [640, 370]);
  for (let i = 40; i >= 0; i--) { const t = i / 40; body.push([120 + 520 * t, 330 + Math.sin(Math.PI * t) * 60]); }
  p.gradFill(body, blue, mul(blue, SH_FELT), DEF_LIGHT); p.inkRing(body, 10, 1);
  p.clip(body, () => { p.ell(330, 400, 230, 70, belly, 0); for (let i = 0; i < 6; i++) p.stroke([[200 + i * 45, 345], [200 + i * 45, 400]], 4, mix(belly, INK, 0.3)); });
  p.inkRing(body, 10, 1);
  p.ell(220, 270, 13, 14, WHITE, 4); p.dot(224, 272, 7); p.arc(185, 315, 40, 14, 20, 150, 6);
  for (let i = 0; i < 3; i++) p.line([[290, 135], [260 + i * 30, 60 - (i % 2) * 20]], "#bfe4ff", 14);
};
/** a 60s-style rival monster (our own): a spiky orange crab-beetle, box 1000 x 1000 facing screen-left */
export const rival = (p: Pen, t = 0) => {
  const sh = "#d0602e", sh2 = mul(sh, SH_CLOTH);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = 420 + i * 120 + s * 20, a = tube([[x, 700], [x - 40, 820], [x - 10, 970]], 34, 18); p.poly(a, "#8a3a22", 8); }
  const shell = blobPts(560, 600, { a: 300, b: 200, nTop: 1.8, nBot: 3, egg: 0, asym: -0.08, rot: rad(-6), noise: 0.02, seed: 5 } as Blob, 60);
  p.gradFill(shell, sh, sh2, DEF_LIGHT); p.inkRing(shell, 10, 1);
  for (let i = 0; i < 6; i++) p.poly([[340 + i * 80, 450 - Math.sin(i) * 20], [370 + i * 80, 350 - 20 * (i % 2)], [400 + i * 80, 455]], "#f2c14e", 7);
  for (const s of [0, 1]) {
    const cx = 240 - s * 30, cy = 520 + s * 140 - t * 60;
    p.poly(tube([[400, 620 + s * 60], [300, 600 + s * 60], [cx, cy]], 50, 40), sh, 8);
    p.poly([[cx, cy], [cx - 130, cy - 70], [cx - 60, cy + 10], [cx - 140, cy + 60]], "#f08a4c", 9);
  }
  for (const s of [-1, 1]) { p.line([[300, 520], [250 + s * 30, 380]], "#8a3a22", 10); p.ell(250 + s * 30, 372, 22, 22, WHITE, 6); p.dot(244 + s * 30, 374, 9); }
};
/** three-headed winged silhouette in storm clouds (the Minus Zero trailer tease), box 1000 x 800 */
export const threeHead = (p: Pen, flash = 0) => {
  const d = "#1d1626", edge = mix("#ffcf4a", d, 1 - flash);
  for (const s of [-1, 1]) {
    const w: P2[] = [[500 + s * 80, 470], [500 + s * 260, 250], [500 + s * 470, 200], [500 + s * 420, 330], [500 + s * 470, 400], [500 + s * 380, 460], [500 + s * 420, 560], [500 + s * 140, 560]];
    p.poly(s > 0 ? w : w.slice().reverse(), d, 10);
  }
  p.ell(500, 560, 150, 170, d, 10);
  [[-1, 0.9], [0, 1.15], [1, 0.9]].forEach(([s, h]) => {
    const tip: P2 = [500 + s * 190, 370 - 270 * h], cl = curve([500 + s * 50, 470], [500 + s * 200, 360], tip, 12);
    p.poly(tube(cl, 70, 40), d, 9);
    p.poly([[tip[0] - 40, tip[1] + 10], [tip[0] + 10 * s - 5, tip[1] - 40], [tip[0] + 55 * (s || 1), tip[1] - 5], [tip[0] + 20, tip[1] + 25]], d, 9);
    for (const c of [-1, 1]) p.poly([[tip[0] + c * 12, tip[1] - 25], [tip[0] + c * 30, tip[1] - 75], [tip[0] + c * 4, tip[1] - 30]], d, 6);
    if (flash > 0.2) p.ell(tip[0] + 18 * (s || 1), tip[1] - 8, 7, 5, "#ffe27a", 0);
  });
  if (flash > 0) for (let i = 0; i < 8; i++) p.stroke([[300 + i * 55, 560 - (i % 3) * 30], [320 + i * 55, 600]], 5, edge);
};
/** mushroom cloud, box 800 x 1000, t = growth 0..1 */
export const mushroom = (p: Pen, t: number, hot = 1) => {
  const top = 980 - 820 * t, cap = 120 + 230 * t;
  const col = mix("#f6d6b8", "#ffb070", hot * 0.5), dark = mix("#c8a090", "#e0704a", hot * 0.4);
  p.poly([[400 - 50 * t, 980], [400 - 70 * t, top + 140 * t], [400 + 70 * t, top + 140 * t], [400 + 50 * t, 980]], dark, 10);
  p.ell(400, 980, 220 * t + 40, 50 * t + 10, dark, 10);
  for (let i = 0; i < 9; i++) { const a = rad(180 + i * 22.5), r = cap * (0.75 + 0.2 * rnd(i, 1)); p.ell(400 + Math.cos(a) * cap * 0.8, top + 120 * t + Math.sin(a) * cap * 0.45, r * 0.42, r * 0.36, i % 2 ? col : mix(col, WHITE, 0.25), 9); }
  p.ell(400, top + 120 * t, cap * 0.9, cap * 0.52, mix(col, WHITE, 0.3), 10);
  p.ell(400, top + 140 * t, cap * 0.55, cap * 0.18, dark, 0);
};
/** a white-hot fireball rising on the horizon ("the sun rose in the west"), box 600 x 600 */
export const fireball = (p: Pen, t: number) => {
  const g = p.g, gr = g.createRadialGradient(300, 300, 10, 300, 300, 290);
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.35, "#fff2c8"); gr.addColorStop(0.7, "#ffb35a"); gr.addColorStop(1, "rgba(255,120,60,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(300, 300, 290 * (0.5 + 0.5 * t), 0, Math.PI * 2); g.fill();
};
/** parachute canopy, box 600 x 400 */
export const chute = (p: Pen) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 30; i++) { const a = Math.PI + (Math.PI * i) / 30; pts.push([300 + Math.cos(a) * 280, 250 + Math.sin(a) * 200]); }
  for (let i = 6; i >= 0; i--) pts.push([20 + (560 * i) / 6, 250 + (i % 2 ? 22 : 0)]);
  p.gradFill(pts, "#f4f1e8", mul("#f4f1e8", SH_FELT), DEF_LIGHT); p.inkRing(pts, 9, 1);
  for (let i = 1; i < 6; i++) p.stroke([[300, 55], [20 + (560 * i) / 6, 250]], 3, mix("#f4f1e8", INK, 0.35));
  for (let i = 0; i <= 6; i++) p.stroke([[20 + (560 * i) / 6, 252], [300, 400]], 2.5, INK);
};
/** Godzilla toy / small icon (held props, diagrams): draws a tiny kaiju into a box at (x, y) of size s */
export const toyZilla = (p: Pen, x: number, y: number, s: number, v: ZVar = "showa") => {
  const g = p.g; g.save(); g.translate(x, y); g.scale(s / 1000, s / 1000);
  drawKaiju(new Pen(g), { v, pose: "stand", eye: v === "showa" ? "friendly" : "angry" });
  g.restore();
};
/** money bag with a label, box 400 x 400 */
export const moneyBag = (p: Pen, label: string, big = false) => {
  const c = big ? "#c9a86a" : "#d8c08a";
  const b = blobPts(200, 260, { a: 150, b: 130, nTop: 2.4, nBot: 2.6, egg: 0.2, asym: 0, rot: 0, noise: 0.02, seed: big ? 3 : 4 } as Blob, 48);
  p.gradFill(b, c, mul(c, SH_FELT), DEF_LIGHT); p.inkRing(b, 9, 1);
  p.poly([[150, 140], [250, 140], [280, 80], [120, 80]], c, 9); p.band([[140, 140], [260, 140]], "#8a5a34", 14, 4);
  p.g.font = `${big ? 120 : 96}px Bangers, 'Luckiest Guy', Impact, sans-serif`; p.g.textAlign = "center"; p.g.textBaseline = "middle";
  p.g.lineWidth = 10; p.g.strokeStyle = INK; p.g.strokeText(label, 200, 280); p.g.fillStyle = "#3f8a4a"; p.g.fillText(label, 200, 280);
};
/** gold statuette on a black base, box 200 x 600 */
export const statue = (p: Pen, shine = 0) => {
  const gold = "#e8b33c";
  p.poly([[40, 520], [160, 520], [150, 590], [50, 590]], "#2a2420", 6);
  const body: P2[] = [[100, 40], [130, 70], [125, 120], [150, 170], [140, 300], [128, 420], [140, 520], [60, 520], [72, 420], [60, 300], [50, 170], [75, 120], [70, 70]];
  p.gradFill(body, gold, mul(gold, SH_FELT), DEF_LIGHT, 0.4); p.inkRing(body, 6, 1);
  p.stroke([[80, 170], [120, 175], [110, 300]], 4, mix(gold, INK, 0.4));
  if (shine) p.poly([[110, 80], [118, 110], [148, 118], [118, 126], [110, 156], [102, 126], [72, 118], [102, 110]], WHITE, 0);
};
/** the planning blackboard: sink in a ring of gas, then haul up fast. step 0..2 reveals the parts; box 1200 x 750 */
export const board = (p: Pen, step: number, dead = 0) => {
  const g = p.g;
  p.poly([[0, 0], [1200, 0], [1200, 750], [0, 750]], "#6a4a30", 0);
  p.poly([[30, 30], [1170, 30], [1170, 720], [30, 720]], "#2f4a3c", 6);
  const chalk = "#eef2e6", ch = (pts: P2[], w = 7) => p.stroke(pts, w, chalk);
  // sea line + depth
  const wave: P2[] = []; for (let i = 0; i <= 40; i++) wave.push([60 + i * 27, 150 + 8 * Math.sin(i * 1.2)]);
  ch(wave, 6);
  g.font = "56px Bangers, 'Luckiest Guy', Impact, sans-serif"; g.fillStyle = chalk; g.textAlign = "center";
  // the monster icon (chalk outline): sinks in step 1, rises in step 2
  const s1 = Math.min(1, Math.max(0, step)), s2 = Math.min(1, Math.max(0, step - 1));
  const my = 250 + 300 * s1 - 300 * s2;
  const icon = (x: number, y: number) => {
    ch([[x - 70, y + 60], [x - 50, y - 10], [x - 20, y - 60], [x + 10, y - 90], [x + 50, y - 95], [x + 70, y - 70], [x + 40, y - 50], [x + 30, y + 10], [x + 40, y + 60]], 7);
    for (let i = 0; i < 4; i++) ch([[x - 40 + i * 10, y - 20 - i * 20], [x - 70 + i * 12, y - 30 - i * 22], [x - 50 + i * 10, y - 5 - i * 20]], 5);
    if (dead > 0) { for (const s of [-1, 1]) ch([[x + 35 - 10, y - 82 - 10 * s], [x + 35 + 10, y - 82 + 10 * s]], 6); }
    else p.dot(x + 38, y - 78, 6, chalk);
  };
  icon(330, my);
  if (step > 0.2) { // ring of gas bubbles around him + arrow down
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 150; p.ell(330 + Math.cos(a) * r, my + Math.sin(a) * r * 0.5, 14 + 6 * rnd(i, 1), 14 + 6 * rnd(i, 1), null, 0); p.arc(330 + Math.cos(a) * r, my + Math.sin(a) * r * 0.5, 14 + 6 * rnd(i, 1), 14 + 6 * rnd(i, 1), 0, 360, 5, chalk); }
    ch([[560, 260], [560, 560]], 9); ch([[530, 520], [560, 565], [590, 520]], 9);
    g.fillText("1. SINK", 690, 420);
  }
  if (step > 1.2) { // balloons + arrow up + pressure
    for (let i = 0; i < 4; i++) { const bx = 250 + i * 55, by = my - 190 - (i % 2) * 30; p.arc(bx, by, 26, 32, 0, 360, 5, chalk); ch([[bx, by + 32], [330, my - 80]], 3); }
    ch([[880, 600], [880, 250]], 9); ch([[850, 290], [880, 245], [910, 290]], 9);
    g.fillText("2. YANK UP", 1010, 420);
  }
};
