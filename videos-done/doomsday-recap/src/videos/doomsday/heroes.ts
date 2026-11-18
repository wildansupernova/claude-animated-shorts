// Our own cartoon versions of the cast, drawn in the skill's style: bean heads, stick limbs with ink-dot hands, a
// thick-thin plum outline weighted away from the light, flat costume colours with a soft painted crescent. Costumes
// are parametric (suit colours + a pattern + an emblem + a head kind), so ~40 characters share one drawing routine.
// Design space 600 x 1000 units, soles at y = 975 (same as toon.ts); cast.ts turns a drawing into a lit card.
import {
  Pen, P2, INK, SKIN, WHITE, mul, shade, mix, rad, clamp, rnd, rotPts, lerp2, curve, ellPts, rrect, taper, blobPts, headBlob,
  thickAngle, DEF_LIGHT, faceFront, SH_SKIN, SH_CLOTH, SH_FELT, Blob, Expr, lidOf, mouth, FACE,
} from "./toon";

export type BuildK = "adult" | "slim" | "big" | "stout" | "kid";
export type Pattern = "plain" | "spider" | "cap" | "iron" | "deadpool" | "wolverine" | "ff" | "thing" | "flame" | "armor" | "robe"
  | "vest" | "suit" | "panther" | "thor" | "sam" | "tva" | "doom" | "abs" | "jacket" | "marvel" | "antman";
export type Emblem = null | "star" | "arc" | "spider" | "four" | "x" | "sun" | "tri" | "redstar" | "hourglass" | "bolt" | "sam";
export type HeadK = "face" | "mask" | "cowl";
export type EyesK = "face" | "lens" | "slit" | "doom" | "visor" | "goggle";
export type HairK = null | "short" | "slick" | "long" | "curly" | "bun" | "spiky" | "bald" | "bob" | "wild";
export type HelmK = null | "cap" | "antman" | "wolverine" | "magneto" | "loki" | "sylvie" | "panther" | "iron" | "doom" | "deadpool"
  | "spider" | "galactus" | "kang" | "beast" | "nightcrawler" | "namor" | "thing" | "hulk" | "sentry" | "alien" | "ghost";
export type PropK = null | "shield" | "hammer" | "gauntlet" | "claws" | "cards" | "tesseract" | "katanas" | "scepter" | "spell"
  | "repulsor" | "glow" | "baby" | "flame" | "wrench" | "web" | "axe" | "stones" | "star" | "wheelchair" | "sword";

export type Hero = {
  build?: BuildK; skin?: string;
  suit: string; suit2?: string; suit3?: string; pattern?: Pattern; emblem?: Emblem;
  arms?: string; legs?: string; boots?: string; gloves?: string; belt?: string | null;
  cape?: string | null; capeIn?: string;
  head?: HeadK; mask?: string; eyes?: EyesK; helm?: HelmK; helmCol?: string;
  hair?: string; hairK?: HairK; beard?: string; beardK?: null | "goatee" | "full" | "stubble" | "moustache" | "chin";
  prop?: PropK; wings?: string; tail?: string; glowCol?: string;
};

export type Pose = "idle" | "wave" | "point" | "fist" | "blast" | "cheer" | "cross" | "hips" | "reach" | "snap" | "hold" | "fight"
  | "shield" | "throw" | "sit" | "fly" | "shrug" | "lift" | "dance";
export type HeroOpts = {
  pose?: Pose; expr?: Expr; phase?: number; walk?: number; blink?: boolean | number; look?: number; facing?: -1 | 0 | 1; seed?: number;
  light?: number; tilt?: number; headTilt?: number; wave?: number; flutter?: number; legs?: "stand" | "walk" | "sit" | "fly" | "run" | "kneel";
  glow?: number; chair?: boolean;
};

const BUILDS: Record<BuildK, { a: number; torso: number; legs: number; tw: number; limb: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.84, limb: 6.2 },
  slim: { a: 114, torso: 1.05, legs: 1.45, tw: 0.74, limb: 5.6 },
  stout: { a: 116, torso: 1.2, legs: 1.25, tw: 1.0, limb: 7 },
  big: { a: 102, torso: 1.5, legs: 1.3, tw: 1.4, limb: 11 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72, limb: 5.4 },
};

const STAR = (cx: number, cy: number, r: number, rot = 0): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < 10; i++) { const a = rad(-90 + rot + i * 36), rr = i % 2 ? r * 0.42 : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return pts;
};
export const starPts = STAR;

/** hair cap over the head contour: keeps the head points above `cut` (+ optional sides), scaled out a little */
const hairCap = (p: Pen, hp: P2[], cx: number, hc: number, cut: number, col: string, light: number, a: number, ow: number, edge: "scallop" | "smooth" | "curly" | "spiky", sides = 0) => {
  const keep = (x: number, y: number) => y < cut || (sides > 0 && Math.abs(x - cx) > a * 0.72 && y < cut + sides);
  const n = hp.length, i0 = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
  const arc = [...hp.slice(i0), ...hp.slice(0, i0)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.05, hc + (y - hc) * 1.05] as P2);
  if (arc.length < 3) return;
  const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
  for (let i = 1; i < 8; i++) {
    const t = i / 8, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const bump = edge === "scallop" ? (i % 2 ? 0.04 * a : 0) : edge === "curly" ? 0.06 * a * Math.abs(Math.sin(i * 1.7)) : edge === "spiky" ? (i % 2 ? 0.07 * a : -0.02 * a) : 0;
    arc.push([x, y + bump]);
  }
  if (edge === "spiky" || edge === "curly") { // bumps along the crown
    const top = arc.map(([x, y], i) => {
      const k = edge === "spiky" ? (i % 4 < 2 ? 0.06 : -0.01) : 0.03 * Math.sin(i * 1.3);
      return y < hc - a * 0.5 ? [cx + (x - cx) * (1 + k * 0.5), hc + (y - hc) * (1 + k)] as P2 : [x, y] as P2;
    });
    arc.splice(0, arc.length, ...top);
  }
  p.shadedFill(arc, col, mul(col, SH_FELT), light, a, 0.35);
  p.poly(arc, null, ow);
};

/** everything drawn for one character card (front / 3-4 view). Returns nothing; draws into the pen. */
export const drawHero = (p: Pen, c: Hero, o: HeroOpts = {}) => {
  const { pose = "idle", expr = "neutral", phase = 0, blink = false, look = 0, facing = 0, seed = 1, light = DEF_LIGHT, tilt = 0,
    headTilt = 0, wave = 0, flutter = 0, glow = 0 } = o;
  const legsMode = o.legs ?? (pose === "sit" ? "sit" : pose === "fly" ? "fly" : "stand");
  const Bd = BUILDS[c.build ?? "adult"], skin = c.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const sole = 975, thick = thickAngle(light), ow = 5 * u;
  const walking = legsMode === "walk" || legsMode === "run";
  const bob = walking ? (legsMode === "run" ? 0.03 : 0.018) * (1 + Bd.torso + Bd.legs) * HH * Math.cos(2 * two * phase) : legsMode === "fly" ? 0 : 0;
  const torsoBot = legsMode === "sit" ? sole - 0.55 * HH : legsMode === "kneel" ? sole - 0.75 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const armCol = c.arms ?? c.suit, legCol = c.legs ?? c.suit2 ?? c.suit, bootCol = c.boots ?? mix(legCol, INK, 0.35), handCol = c.gloves ?? null;
  const limbW = Bd.limb * u, footW = (Bd.limb + 2) * u;
  // ---------- torso blob (needed for cape/arms geometry) ----------
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: c.build === "big" ? -0.08 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const sway = walking ? 1.4 * Math.sin(two * phase) : 0, A = tilt + sway;

  // ---------- behind everything: cape, wings, tail, long hair ----------
  p.rot = A ? [rad(A), 300, hipY] : null;
  if (c.cape) {
    const fl = flutter, top = chin + 0.02 * HH, bot = legsMode === "sit" ? sole - 0.1 * HH : sole - 0.12 * HH;
    const wTop = 0.95 * T.a, wBot = 1.55 * T.a + 0.4 * HH * fl;
    const pts: P2[] = [[tcx - wTop, top]];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([tcx - wBot + 2 * wBot * t + fl * 12 * u * Math.sin(t * 9 + phase * 6), bot + 10 * u * Math.sin(t * 7 + 1) * (0.4 + fl)]); }
    pts.push([tcx + wTop, top]);
    const back = pts.slice().reverse();
    p.gradFill(back, c.cape, mul(c.cape, SH_CLOTH), light, 0.3);
    p.inkRing(back, ow, thick);
  }
  if (c.wings) {
    for (const s of [-1, 1]) {
      const base: P2 = [tcx + s * 0.4 * T.a, chin + 0.3 * HH];
      const feathers: P2[] = [base];
      for (let i = 0; i <= 6; i++) { const ang = rad(-150 + i * 22) , r = (1.25 + 0.15 * Math.sin(i * 2.1)) * HH * (0.9 + 0.1 * glow);
        feathers.push([base[0] + s * Math.cos(ang + Math.PI / 2) * r * 0.9 + s * 0.4 * HH, base[1] + Math.sin(ang + Math.PI / 2) * r * 0.55 - 0.15 * HH]); }
      const fp = s > 0 ? feathers : feathers.slice().reverse();
      p.gradFill(fp, c.wings, mul(c.wings, SH_CLOTH), light, 0.3);
      p.inkRing(fp, ow * 0.8, thick);
      for (let i = 1; i < 6; i++) p.stroke([base, lerp2(base, feathers[i + 1], 0.85)], 1.6 * u, mix(c.wings, INK, 0.5));
    }
  }
  if (c.tail) {
    const t0: P2 = [tcx + 0.5 * T.a, torsoBot - 0.05 * HH];
    const pts = curve(t0, [tcx + 1.6 * T.a, torsoBot + 0.5 * HH], [tcx + 1.2 * T.a, sole - 0.3 * HH], 14);
    p.stroke(pts, 4 * u + 6, INK); p.stroke(pts, 4 * u, c.tail);
    const e = pts[pts.length - 1];
    p.poly([[e[0] - 7 * u, e[1]], [e[0] + 7 * u, e[1] - 6 * u], [e[0] + 2 * u, e[1] + 12 * u]], c.tail, 2 * u);
  }
  p.rot = null;
  if (c.prop === "wheelchair" || o.chair) {
    const seatY = sole - 0.55 * HH, wc = "#3a3d47";
    p.ell(300 - 40 * u, sole - 0.32 * HH, 0.32 * HH, 0.32 * HH, "#4a4d58", 3 * u); p.ell(300 - 40 * u, sole - 0.32 * HH, 0.06 * HH, 0.06 * HH, "#c9ccd2", 1.5 * u);
    p.band([[300 - 0.55 * T.a, seatY - 0.9 * HH], [300 - 0.55 * T.a, seatY]], wc, 4 * u, 1.4 * u);
    p.poly([[300 - 0.6 * T.a, seatY - 0.05 * HH], [300 + 0.8 * T.a, seatY - 0.05 * HH], [300 + 0.8 * T.a, seatY + 0.05 * HH], [300 - 0.6 * T.a, seatY + 0.05 * HH]], wc, 2 * u);
    p.ell(300 + 40 * u, sole - 0.12 * HH, 0.12 * HH, 0.12 * HH, "#4a4d58", 2.4 * u);
  }
  // ---------- legs ----------
  if (legsMode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 30 * u, hipY + 0.05 * HH], f: P2 = [300 + side * 34 * u, sole - 6 * u];
      p.stroke([h, [k[0], k[1]], f], limbW, legCol);
      p.stroke([[f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 3 * u]], footW + 3, INK);
      p.stroke([[f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 3 * u]], footW, bootCol);
    }
  } else if (legsMode === "kneel") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 24 * u, sole - 6 * u], f: P2 = [300 + side * 34 * u, sole - 4 * u];
      p.stroke([h, k, f], limbW, legCol);
    }
  } else if (legsMode === "fly") {
    for (const side of [-1, 1]) {
      const hx = 300 + side * 12 * u, fx = 300 + side * 8 * u + 18 * u, fy = sole - 30 * u + side * 8 * u;
      p.stroke(curve([hx, hipY], [(hx + fx) / 2 + 8 * u, (hipY + fy) / 2], [fx, fy]), limbW, legCol);
      p.stroke([[fx, fy], [fx + 4 * u, fy + 12 * u]], footW + 3, INK); p.stroke([[fx, fy], [fx + 4 * u, fy + 12 * u]], footW, bootCol);
    }
  } else {
    const L = legsMode === "run" ? 95 : legsMode === "walk" ? 42 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L, fwd = legsMode === "run" ? Math.sin(two * (phase + ph)) * 20 * u : 0;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u + fwd, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), limbW, legCol);
      p.stroke([[fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u]], footW + 3, INK);
      p.stroke([[fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u]], footW, bootCol);
    }
  }
  // ---------- arms ----------
  p.rot = A ? [rad(A), 300, hipY] : null;
  type Arm = { pts: [P2, P2, P2]; front: boolean; side: number };
  const sw = walking ? Math.sin(two * phase) * (legsMode === "run" ? 1.6 : 1) : 0;
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const up = (side: number, k = 1, spread = 1): [P2, P2, P2] => {
    const S = sh(side);
    return [S, [tcx + side * (1.1 * T.a + 12 * u * spread), S[1] - 0.25 * HH * k], [tcx + side * (1.15 * T.a + 18 * u * spread), S[1] - 0.72 * HH * k]];
  };
  const out = (side: number, lift = 0): [P2, P2, P2] => {
    const S = sh(side);
    return [S, [tcx + side * (1.25 * T.a + 18 * u), S[1] + 0.05 * HH - lift * 0.2 * HH], [tcx + side * (1.4 * T.a + 40 * u), S[1] - lift * 0.45 * HH]];
  };
  const front = (side: number, y = 0.45): [P2, P2, P2] => {
    const S = sh(side);
    return [S, [tcx + side * (1.05 * T.a + 4 * u), S[1] + 0.42 * HH], [tcx + side * 0.25 * T.a, S[1] + y * HH]];
  };
  const arms: Arm[] = [];
  const add = (side: number, pts: [P2, P2, P2], fr = false) => arms.push({ pts, front: fr, side });
  switch (pose) {
    case "wave": add(-1, hang(-1, 0)); { const S = sh(1); add(1, [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]]); } break;
    case "point": add(-1, hang(-1, 0)); add(1, out(1, 0.25)); break;
    case "fist": add(-1, hang(-1, 0)); add(1, up(1, 1.15, 0.4)); break;
    case "blast": add(-1, out(-1, 0.3)); add(1, out(1, 0.3)); break;
    case "cheer": add(-1, up(-1)); add(1, up(1)); break;
    case "reach": add(-1, out(-1, 0.05)); add(1, out(1, 0.05)); break;
    case "shrug": { for (const s of [-1, 1]) { const S = sh(s); add(s, [S, [tcx + s * (1.2 * T.a + 6 * u), S[1] + 0.3 * HH], [tcx + s * (1.45 * T.a + 22 * u), S[1] + 0.05 * HH]]); } break; }
    case "cross": case "dance": add(-1, front(-1, 0.42), true); add(1, front(1, 0.36), true); break;
    case "hips": for (const s of [-1, 1]) { const S = sh(s); add(s, [S, [tcx + s * (1.35 * T.a + 14 * u), S[1] + 0.35 * HH], [tcx + s * 0.95 * T.a, torsoBot - 0.2 * HH]]); } break;
    case "snap": add(-1, hang(-1, 0)); { const S = sh(1); add(1, [S, [tcx + 1.3 * T.a + 14 * u, S[1] + 0.05 * HH], [tcx + 1.15 * T.a + 6 * u, S[1] - 0.62 * HH]]); } break;
    case "hold": add(-1, front(-1, 0.5), true); add(1, front(1, 0.5), true); break;
    case "fight": for (const s of [-1, 1]) { const S = sh(s); add(s, [S, [tcx + s * (1.2 * T.a + 10 * u), S[1] + 0.32 * HH], [tcx + s * 0.55 * T.a, S[1] - 0.05 * HH]], true); } break;
    case "shield": add(-1, front(-1, 0.4), true); add(1, hang(1, 0)); break;
    case "throw": add(-1, out(-1, 0.1)); add(1, up(1, 0.9, 1.4)); break;
    case "lift": add(-1, up(-1, 1.1, 0.5)); add(1, up(1, 1.1, 0.5)); break;
    case "sit": for (const s of [-1, 1]) { const S = sh(s); add(s, [S, [tcx + s * (1.1 * T.a + 6 * u), S[1] + 0.4 * HH], [tcx + s * (0.8 * T.a), torsoBot - 0.05 * HH]], true); } break;
    case "fly": add(-1, hang(-1, -0.3)); add(1, up(1, 1.15, 0.3)); break;
    default: add(-1, hang(-1, -sw)); add(1, hang(1, sw));
  }
  const drawArm = (a: Arm) => {
    const pts = curve(a.pts[0], a.pts[1], a.pts[2]);
    p.stroke(pts, limbW + 2.4 * u, INK); p.stroke(pts, limbW, armCol);
    const [hx, hy] = a.pts[2];
    if (handCol) { p.dot(hx, hy, 6.5 * u + 2.2 * u * (c.build === "big" ? 1.6 : 1)); p.dot(hx, hy, 6.5 * u * (c.build === "big" ? 1.6 : 1), handCol); }
    else p.dot(hx, hy, 6 * u * (c.build === "big" ? 1.5 : 1));
  };
  // props behind the body
  if (c.prop === "katanas") for (const s of [-1, 1]) {
    const b0: P2 = [tcx + s * 0.35 * T.a, torsoBot - 0.1 * HH], b1: P2 = [tcx - s * 0.75 * T.a, chin - 0.55 * HH];
    p.band([b0, b1], "#c9ccd2", 3.4 * u, 1.3 * u, "round"); p.band([lerp2(b0, b1, 0.78), b1], "#2b2b33", 4 * u, 1.3 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // ---------- torso ----------
  p.gradFill(tp, c.suit, mul(c.suit, SH_CLOTH), light);
  p.clip(tp, () => torsoPattern(p, c, tcx, tcy, T, chin, torsoBot, HH, u, facing));
  if (c.belt) p.clip(tp, () => p.band([[tcx - 1.3 * T.a, torsoBot - 0.18 * HH], [tcx + 1.3 * T.a, torsoBot - 0.18 * HH]], c.belt!, 0.1 * HH, 1.4 * u));
  emblem(p, c, tcx + 2 * u * facing, chin + 0.42 * HH * (Bd.torso / 1.1), u, glow);
  p.inkRing(tp, ow, thick);
  // ---------- arms in front + props ----------
  for (const a of arms) if (a.front) drawArm(a);
  const R = arms.find((a) => a.side === 1)?.pts[2], Lh = arms.find((a) => a.side === -1)?.pts[2];
  if (R && Lh) heldProps(p, c, pose, R, Lh, u, HH, glow, tcx, chin);
  // ---------- head ----------
  const Ah = A + headTilt;
  p.rot = Ah ? [rad(Ah), 300, chin] : null;
  drawHead(p, c, H, 300, hc, W, HH, u, ow, thick, light, expr, facing, look, lid, seed, glow);
  p.rot = null;
};

const torsoPattern = (p: Pen, c: Hero, tcx: number, tcy: number, T: Blob, chin: number, bot: number, HH: number, u: number, facing: number) => {
  const s2 = c.suit2 ?? shade(c.suit, 0.7), s3 = c.suit3 ?? WHITE, x0 = tcx - 1.3 * T.a, x1 = tcx + 1.3 * T.a;
  const box = (ya: number, yb: number, col: string, xa = x0, xb = x1) => p.poly([[xa, ya], [xb, ya], [xb, yb], [xa, yb]], col, 0);
  switch (c.pattern) {
    case "spider": { // red centre, blue sides, web lines
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.55 * T.a, chin - 10 * u], [tcx + s * 1.4 * T.a, chin], [tcx + s * 1.4 * T.a, bot + 10], [tcx + s * 0.35 * T.a, bot + 10]], s2, 0);
      for (let i = 1; i < 5; i++) p.stroke([[tcx - 0.6 * T.a, chin + i * 0.22 * HH], [tcx + 0.6 * T.a, chin + i * 0.22 * HH + 3 * u]], 1.2 * u, mix(c.suit, INK, 0.6));
      p.stroke([[tcx, chin], [tcx, bot]], 1.2 * u, mix(c.suit, INK, 0.6));
      break;
    }
    case "cap": { // star chest, red-white stripes below
      for (let i = 0; i < 4; i++) box(bot - 0.42 * HH + i * 0.11 * HH, bot - 0.42 * HH + (i + 0.5) * 0.11 * HH, i % 2 ? s3 : s2, tcx - 0.55 * T.a, tcx + 0.55 * T.a);
      break;
    }
    case "iron": { // gold abdomen plates
      p.poly([[tcx - 0.45 * T.a, chin + 0.55 * HH], [tcx + 0.45 * T.a, chin + 0.55 * HH], [tcx + 0.3 * T.a, bot], [tcx - 0.3 * T.a, bot]], s2, 0);
      for (let i = 0; i < 3; i++) p.stroke([[tcx - 0.4 * T.a, chin + (0.7 + i * 0.13) * HH], [tcx + 0.4 * T.a, chin + (0.7 + i * 0.13) * HH]], 1.2 * u, mix(s2, INK, 0.5));
      break;
    }
    case "deadpool": for (const s of [-1, 1]) p.poly([[tcx + s * 0.75 * T.a, chin - 10 * u], [tcx + s * 1.4 * T.a, chin], [tcx + s * 1.4 * T.a, bot + 10], [tcx + s * 0.6 * T.a, bot + 10]], s2, 0); break;
    case "wolverine": { // yellow with blue sides, black stripes
      for (const s of [-1, 1]) {
        p.poly([[tcx + s * 0.6 * T.a, chin - 10 * u], [tcx + s * 1.4 * T.a, chin], [tcx + s * 1.4 * T.a, bot + 10], [tcx + s * 0.75 * T.a, bot + 10]], s2, 0);
        for (let i = 0; i < 3; i++) p.poly([[tcx + s * 0.62 * T.a, chin + (0.3 + i * 0.22) * HH], [tcx + s * 0.25 * T.a, chin + (0.36 + i * 0.22) * HH], [tcx + s * 0.62 * T.a, chin + (0.42 + i * 0.22) * HH]], INK, 0);
      }
      break;
    }
    case "ff": p.stroke([[tcx - 1.2 * T.a, chin + 0.05 * HH], [tcx + 1.2 * T.a, chin + 0.05 * HH]], 6 * u, s3); box(bot - 0.2 * HH, bot + 10, s2); break;
    case "thing": { // rock plates
      for (let i = 0; i < 14; i++) {
        const x = tcx + (rnd(i, 1) - 0.5) * 2.2 * T.a, y = chin + rnd(i, 2) * (bot - chin);
        p.poly(ellPts(x, y, 14 * u + 6 * u * rnd(i, 3), 10 * u + 5 * u * rnd(i, 4), 0, 360, rnd(i, 5) * 60, 6), null, 1.6 * u);
      }
      box(bot - 0.22 * HH, bot + 10, s2);
      break;
    }
    case "flame": for (let i = 0; i < 9; i++) { const x = tcx + (i - 4) * 0.28 * T.a; p.poly([[x - 8 * u, bot], [x, chin + (0.2 + 0.3 * rnd(i, 7)) * HH], [x + 8 * u, bot]], i % 2 ? "#ffd84a" : "#ff8a2a", 0); } break;
    case "armor": { // chest plate + discs (Thor) / generic armour
      p.poly([[tcx - 0.8 * T.a, chin], [tcx + 0.8 * T.a, chin], [tcx + 0.6 * T.a, chin + 0.62 * HH], [tcx - 0.6 * T.a, chin + 0.62 * HH]], s2, 1.4 * u);
      break;
    }
    case "thor": {
      for (const [dx, dy] of [[-0.42, 0.18], [0.42, 0.18], [-0.42, 0.45], [0.42, 0.45]]) p.ell(tcx + dx * T.a, chin + dy * HH, 9 * u, 9 * u, "#c9ccd2", 1.6 * u);
      box(bot - 0.25 * HH, bot + 10, s2);
      break;
    }
    case "robe": p.poly([[tcx - 0.18 * T.a, chin - 10 * u], [tcx + 0.18 * T.a, chin - 10 * u], [tcx + 0.25 * T.a, bot + 10], [tcx - 0.25 * T.a, bot + 10]], s2, 1.2 * u); break;
    case "vest": for (const s of [-1, 1]) p.poly([[tcx + s * 0.25 * T.a, chin - 10 * u], [tcx + s * 1.4 * T.a, chin], [tcx + s * 1.4 * T.a, bot + 10], [tcx + s * 0.35 * T.a, bot + 10]], s2, 1.2 * u); break;
    case "jacket": for (const s of [-1, 1]) p.poly([[tcx + s * 0.12 * T.a, chin - 10 * u], [tcx + s * 1.4 * T.a, chin], [tcx + s * 1.4 * T.a, bot + 10], [tcx + s * 0.18 * T.a, bot + 10]], s2, 1.2 * u); break;
    case "suit": { // shirt + tie
      p.poly([[tcx - 0.3 * T.a, chin - 10 * u], [tcx + 0.3 * T.a, chin - 10 * u], [tcx, chin + 0.45 * HH]], s3, 1.2 * u);
      p.poly([[tcx - 5 * u, chin + 0.02 * HH], [tcx + 5 * u, chin + 0.02 * HH], [tcx + 6 * u, chin + 0.38 * HH], [tcx, chin + 0.46 * HH], [tcx - 6 * u, chin + 0.38 * HH]], s2, 1.2 * u);
      break;
    }
    case "panther": for (let i = 0; i < 5; i++) p.stroke([[tcx - 0.7 * T.a + i * 0.35 * T.a, chin], [tcx - 0.5 * T.a + i * 0.25 * T.a, chin + 0.5 * HH]], 1.6 * u, s2); break;
    case "sam": p.poly([[tcx - 1.4 * T.a, chin + 0.2 * HH], [tcx + 1.4 * T.a, chin + 0.2 * HH], [tcx + 1.4 * T.a, bot + 10], [tcx - 1.4 * T.a, bot + 10]], s2, 0); box(bot - 0.28 * HH, bot - 0.18 * HH, "#c8323a"); break;
    case "tva": p.stroke([[tcx - 1.3 * T.a, chin + 0.3 * HH], [tcx + 1.3 * T.a, chin + 0.3 * HH]], 4 * u, s2); break;
    case "doom": p.poly([[tcx - 0.55 * T.a, chin], [tcx + 0.55 * T.a, chin], [tcx + 0.45 * T.a, bot + 10], [tcx - 0.45 * T.a, bot + 10]], s2, 1.4 * u); break;
    case "abs": for (let i = 0; i < 3; i++) for (const s of [-1, 1]) p.arc(tcx + s * 0.22 * T.a, chin + (0.6 + i * 0.17) * HH, 0.16 * T.a, 0.06 * HH, 20, 160, 1.6 * u, mix(c.suit, INK, 0.5)); break;
    case "marvel": { // red top, blue lower with gold sash
      box(chin + 0.45 * HH, bot + 10, s2);
      p.band([[tcx - 1.3 * T.a, chin + 0.45 * HH], [tcx + 1.3 * T.a, chin + 0.45 * HH]], "#f2c14e", 0.05 * HH, 1 * u);
      break;
    }
    case "antman": { box(chin + 0.5 * HH, bot + 10, s2); p.stroke([[tcx - 0.9 * T.a, chin + 0.15 * HH], [tcx + 0.9 * T.a, chin + 0.15 * HH]], 3 * u, s2); break; }
    default: break;
  }
};

const emblem = (p: Pen, c: Hero, x: number, y: number, u: number, glow: number) => {
  switch (c.emblem) {
    case "star": p.poly(STAR(x, y, 15 * u), WHITE, 1.8 * u); break;
    case "redstar": p.poly(STAR(x, y, 15 * u), "#c8323a", 1.8 * u); break;
    case "arc": p.ell(x, y, 9 * u, 9 * u, "#d8f4ff", 2 * u); p.ell(x, y, 5 * u, 5 * u, "#7fd6ff", 0); break;
    case "tri": p.poly([[x - 10 * u, y - 6 * u], [x + 10 * u, y - 6 * u], [x, y + 9 * u]], "#d8f4ff", 2 * u); break;
    case "spider": {
      p.ell(x, y, 4 * u, 7 * u, INK, 0); p.ell(x, y - 7 * u, 3 * u, 3 * u, INK, 0);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) p.stroke([[x, y - 2 * u + i * 2 * u], [x + s * 9 * u, y - 8 * u + i * 5 * u], [x + s * 12 * u, y - 2 * u + i * 6 * u]], 1.4 * u);
      break;
    }
    case "four": p.ell(x, y, 13 * u, 13 * u, WHITE, 2 * u); p.poly([[x + 3 * u, y - 9 * u], [x + 3 * u, y + 9 * u], [x + 6 * u, y + 9 * u], [x + 6 * u, y - 9 * u]], c.suit, 0);
      p.poly([[x + 4 * u, y - 9 * u], [x - 7 * u, y + 3 * u], [x + 8 * u, y + 3 * u], [x + 8 * u, y + 0.5 * u], [x - 2 * u, y + 0.5 * u], [x + 5 * u, y - 6 * u]], c.suit, 0); break;
    case "x": p.ell(x, y + 30 * u, 8 * u, 8 * u, "#c8323a", 1.6 * u); p.stroke([[x - 4 * u, y + 26 * u], [x + 4 * u, y + 34 * u]], 1.6 * u); p.stroke([[x + 4 * u, y + 26 * u], [x - 4 * u, y + 34 * u]], 1.6 * u); break;
    case "sun": p.ell(x, y, 10 * u, 10 * u, "#ffd84a", 1.8 * u); for (let i = 0; i < 8; i++) { const a = rad(i * 45); p.stroke([[x + Math.cos(a) * 13 * u, y + Math.sin(a) * 13 * u], [x + Math.cos(a) * 18 * u, y + Math.sin(a) * 18 * u]], 2.2 * u, "#ffd84a"); } break;
    case "hourglass": p.poly([[x - 7 * u, y - 9 * u], [x + 7 * u, y - 9 * u], [x - 7 * u, y + 9 * u], [x + 7 * u, y + 9 * u]], "#e8c45a", 1.4 * u); break;
    case "bolt": p.poly([[x - 2 * u, y - 12 * u], [x + 7 * u, y - 12 * u], [x + 1 * u, y - 1 * u], [x + 7 * u, y - 1 * u], [x - 6 * u, y + 13 * u], [x - 1 * u, y + 2 * u], [x - 7 * u, y + 2 * u]], "#ffd84a", 1.4 * u); break;
    case "sam": p.poly(STAR(x, y + 2 * u, 12 * u), WHITE, 1.6 * u); break;
    default: break;
  }
  if (glow > 0 && (c.emblem === "arc" || c.emblem === "sun")) p.ell(x, y, 22 * u * glow, 22 * u * glow, "rgba(220,245,255,0.35)", 0);
};

const heldProps = (p: Pen, c: Hero, pose: Pose, R: P2, L: P2, u: number, HH: number, glow: number, tcx: number, chin: number) => {
  const [rx, ry] = R, [lx, ly] = L;
  switch (c.prop) {
    case "shield": {
      const sx = pose === "shield" ? tcx - 20 * u : lx - 10 * u, sy = pose === "shield" ? chin + 0.5 * HH : ly + 5 * u, r = 34 * u;
      p.ell(sx, sy, r, r, "#c8323a", 2.4 * u); p.ell(sx, sy, r * 0.76, r * 0.76, WHITE, 0); p.ell(sx, sy, r * 0.54, r * 0.54, "#c8323a", 0);
      p.ell(sx, sy, r * 0.34, r * 0.34, "#2f5fb3", 0); p.poly(STAR(sx, sy, r * 0.3), WHITE, 0);
      break;
    }
    case "hammer": {
      p.band([[rx, ry + 10 * u], [rx, ry - 36 * u]], "#8a5a34", 4.5 * u, 1.4 * u, "round");
      p.poly([[rx - 22 * u, ry - 58 * u], [rx + 22 * u, ry - 58 * u], [rx + 22 * u, ry - 34 * u], [rx - 22 * u, ry - 34 * u]], "#9aa1aa", 2.2 * u);
      p.dot(rx, ry, 6.5 * u);
      break;
    }
    case "axe": {
      p.band([[rx, ry + 30 * u], [rx, ry - 50 * u]], "#8a5a34", 4.5 * u, 1.4 * u, "round");
      p.poly([[rx, ry - 50 * u], [rx + 30 * u, ry - 62 * u], [rx + 34 * u, ry - 30 * u], [rx, ry - 34 * u]], "#9aa1aa", 2.2 * u);
      p.dot(rx, ry, 6.5 * u);
      break;
    }
    case "gauntlet": {
      p.ell(rx, ry, 13 * u, 13 * u, "#e8b33c", 2.4 * u);
      ["#7a4fd0", "#3f7be0", "#e04040", "#f08a2c", "#3fbf5a", "#f2d23c"].forEach((col, i) => p.ell(rx - 9 * u + (i % 3) * 9 * u, ry - 5 * u + Math.floor(i / 3) * 9 * u, 3.4 * u, 3.4 * u, col, 1 * u));
      if (glow > 0) p.ell(rx, ry, 30 * u * glow, 30 * u * glow, "rgba(255,240,200,0.4)", 0);
      break;
    }
    case "stones": ["#7a4fd0", "#3f7be0", "#e04040", "#f08a2c", "#3fbf5a", "#f2d23c"].forEach((col, i) => p.ell(rx - 20 * u + i * 8 * u, ry - 18 * u - Math.sin(i) * 4 * u, 4.5 * u, 5.5 * u, col, 1.2 * u)); break;
    case "claws": for (const [hx, hy] of [R, L]) for (let i = -1; i <= 1; i++) p.band([[hx + i * 4 * u, hy - 4 * u], [hx + i * 5 * u, hy - 34 * u]], "#d9dde0", 2 * u, 1.1 * u, "round"); break;
    case "cards": { for (let i = 0; i < 3; i++) p.poly(rotPts([[rx - 6 * u, ry - 30 * u], [rx + 6 * u, ry - 30 * u], [rx + 6 * u, ry - 12 * u], [rx - 6 * u, ry - 12 * u]], rad(-20 + i * 20), rx, ry), i === 1 ? "#ff6fd8" : "#ffd1f2", 1.6 * u); break; }
    case "tesseract": p.poly([[rx - 12 * u, ry - 26 * u], [rx + 12 * u, ry - 26 * u], [rx + 12 * u, ry - 2 * u], [rx - 12 * u, ry - 2 * u]], "#6fd6ff", 2 * u); p.poly([[rx - 6 * u, ry - 20 * u], [rx + 6 * u, ry - 20 * u], [rx + 6 * u, ry - 8 * u], [rx - 6 * u, ry - 8 * u]], "#e6fbff", 0); break;
    case "scepter": p.band([[rx, ry + 40 * u], [rx + 6 * u, ry - 50 * u]], "#e8c45a", 3.5 * u, 1.3 * u, "round"); p.ell(rx + 7 * u, ry - 56 * u, 7 * u, 9 * u, "#6fd6ff", 1.6 * u); break;
    case "spell": for (const [hx, hy] of [R, L]) { p.ell(hx, hy, 22 * u, 22 * u, null, 2.4 * u); p.arc(hx, hy, 22 * u, 22 * u, 0, 360, 3.5 * u, "#ffb347"); p.arc(hx, hy, 14 * u, 14 * u, 0, 360, 2 * u, "#ffd27a"); } break;
    case "repulsor": case "glow": for (const [hx, hy] of [R, L]) { p.ell(hx, hy, 12 * u * (1 + glow), 12 * u * (1 + glow), c.glowCol ?? "#dff6ff", 0); p.ell(hx, hy, 6 * u, 6 * u, WHITE, 0); } break;
    case "flame": for (const [hx, hy] of [R, L]) p.poly([[hx - 9 * u, hy], [hx - 4 * u, hy - 26 * u], [hx, hy - 12 * u], [hx + 5 * u, hy - 30 * u], [hx + 9 * u, hy]], "#ffb02e", 1.6 * u); break;
    case "baby": { const bx = (rx + lx) / 2, by = (ry + ly) / 2 - 10 * u; p.ell(bx, by + 10 * u, 22 * u, 14 * u, "#9fd0ff", 2 * u); p.ell(bx - 6 * u, by - 8 * u, 15 * u, 14 * u, SKIN, 2 * u); p.dot(bx - 10 * u, by - 9 * u, 1.8 * u); p.dot(bx - 1 * u, by - 9 * u, 1.8 * u); break; }
    case "web": p.stroke([[rx, ry], [rx + 120 * u, ry - 240 * u]], 1.6 * u, "#eef2f6"); break;
    case "star": p.poly(STAR(rx, ry - 20 * u, 14 * u), "#ffd84a", 1.6 * u); break;
    case "sword": p.band([[rx, ry + 6 * u], [rx + 14 * u, ry - 60 * u]], "#d9dde0", 3.4 * u, 1.3 * u, "round"); p.band([[rx - 8 * u, ry - 2 * u], [rx + 8 * u, ry + 2 * u]], "#e8c45a", 3 * u, 1.2 * u, "round"); p.dot(rx, ry, 6.5 * u); break;
    case "wrench": p.band([[rx, ry + 8 * u], [rx + 6 * u, ry - 30 * u]], "#9aa1aa", 4 * u, 1.3 * u, "round"); p.arc(rx + 7 * u, ry - 34 * u, 7 * u, 7 * u, 200, 520, 3.5 * u, "#9aa1aa"); break;
    default: break;
  }
};

const drawHead = (p: Pen, c: Hero, H: Blob, cx: number, hc: number, W: number, HH: number, u: number, ow: number, thick: number, light: number,
  expr: Expr, facing: number, look: number, lid: number, seed: number, glow: number) => {
  const skin = c.skin ?? SKIN, kind = c.head ?? "face", maskCol = c.mask ?? c.suit;
  const hp = blobPts(cx, hc, H), crown = hc - H.b;
  // behind the head: long hair, hood, Magneto/Galactus helmet fins
  if (c.hairK === "long" || c.hairK === "wild" || c.hairK === "bob") {
    const L: Blob = { ...H, a: H.a * (c.hairK === "bob" ? 1.12 : 1.18), b: H.b * (c.hairK === "wild" ? 1.25 : c.hairK === "bob" ? 1.08 : 1.32), egg: 0.3, asym: 0, seed: seed + 5 };
    const lp = blobPts(cx, hc + H.b * (c.hairK === "bob" ? 0.12 : 0.32), L);
    p.shadedFill(lp, c.hair!, mul(c.hair!, SH_FELT), light, L.a); p.inkRing(lp, ow * 0.85, thick);
  }
  if (c.helm === "doom" || c.helm === "galactus") { // hood / crown behind
    const D: Blob = { ...H, a: H.a * 1.28, b: H.b * 1.25, egg: 0.25, asym: 0, nTop: 1.6, seed: seed + 6 };
    const dp = blobPts(cx, hc + H.b * 0.12, D), col = c.helmCol ?? "#2f6b3a";
    p.shadedFill(dp, col, mul(col, SH_FELT), light, D.a); p.inkRing(dp, ow, thick);
  }
  if (c.helm === "galactus") for (const s of [-1, 1]) {
    const pts: P2[] = [[cx + s * 0.7 * H.a, hc - 0.5 * H.b], [cx + s * 1.9 * H.a, hc - 1.9 * H.b], [cx + s * 1.5 * H.a, hc - 0.2 * H.b]];
    p.poly(s > 0 ? pts : pts.slice().reverse(), c.helmCol ?? "#6b3fa0", ow * 0.8);
  }
  // head base
  const base = kind === "mask" ? maskCol : skin;
  p.shadedFill(hp, base, mul(base, kind === "mask" ? SH_FELT : SH_SKIN), light, H.a);
  // cowl: upper head in the mask colour (face shows below)
  if (kind === "cowl") p.clip(hp, () => {
    const cut = c.helm === "magneto" ? hc - 0.32 * H.b : c.helm === "wolverine" ? hc + 0.18 * H.b : c.helm === "cap" ? hc + 0.12 * H.b : hc + 0.05 * H.b;
    const pts: P2[] = [[cx - 2 * H.a, crown - 50], [cx + 2 * H.a, crown - 50], [cx + 2 * H.a, cut], [cx + 0.62 * H.a, cut], [cx + 0.4 * H.a, cut + 0.22 * H.b],
      [cx - 0.4 * H.a, cut + 0.22 * H.b], [cx - 0.62 * H.a, cut], [cx - 2 * H.a, cut]];
    if (c.helm === "magneto") { // face opening: helmet frames the face, cheek guards
      p.poly([[cx - 2 * H.a, crown - 50], [cx + 2 * H.a, crown - 50], [cx + 2 * H.a, hc + 2 * H.b], [cx + 0.8 * H.a, hc + 2 * H.b], [cx + 0.72 * H.a, cut], [cx - 0.72 * H.a, cut], [cx - 0.8 * H.a, hc + 2 * H.b], [cx - 2 * H.a, hc + 2 * H.b]], maskCol, 0);
      for (const s of [-1, 1]) p.poly([[cx + s * 0.62 * H.a, hc - 0.4 * H.b], [cx + s * 1.1 * H.a, hc - 0.4 * H.b], [cx + s * 1.1 * H.a, hc + 0.5 * H.b], [cx + s * 0.75 * H.a, hc + 0.3 * H.b]], c.helmCol ?? "#6b3a8c", 1.4 * u);
    } else p.poly(pts, maskCol, 0);
  });
  if (c.pattern === "thing" || c.helm === "thing") p.clip(hp, () => {
    for (let i = 0; i < 7; i++) p.poly(ellPts(cx + (rnd(seed + i, 1) - 0.5) * 1.6 * H.a, hc + (rnd(seed + i, 2) - 0.6) * 1.4 * H.b, 16 * u, 11 * u, 0, 360, rnd(i, 3) * 70, 6), null, 1.5 * u);
  });
  if (c.helm === "hulk") p.clip(hp, () => p.poly([[cx - 2 * H.a, crown - 50], [cx + 2 * H.a, crown - 50], [cx + 2 * H.a, hc - 0.35 * H.b], [cx - 2 * H.a, hc - 0.35 * H.b]], c.hair ?? "#2a2a2a", 0));
  p.inkRing(hp, ow, thick);
  // hair on top (short styles)
  if (c.hairK && c.hairK !== "bald" && c.hairK !== "wild" && kind === "face") {
    const cut = crown + (c.hairK === "bob" || c.hairK === "long" ? 0.3 : c.hairK === "slick" ? 0.36 : 0.32) * HH;
    hairCap(p, hp, cx, hc, cut, c.hair!, light, H.a, ow, c.hairK === "curly" ? "curly" : c.hairK === "spiky" ? "spiky" : c.hairK === "slick" || c.hairK === "long" || c.hairK === "bob" ? "smooth" : "scallop");
    if (c.hairK === "bun") p.ell(cx, crown - 6 * u, 18 * u, 15 * u, c.hair!, ow * 0.8);
  }
  if (c.hairK === "wild" && kind === "face") hairCap(p, hp, cx, hc, crown + 0.3 * HH, c.hair!, light, H.a, ow, "spiky");
  if (c.helm === "spider") p.clip(hp, () => {
    const wc = mix(maskCol, INK, 0.55);
    for (let i = 1; i < 5; i++) p.arc(cx, hc + 10 * u, i * 0.28 * H.a, i * 0.3 * H.b, 0, 360, 1.1 * u, wc);
    for (let k = 0; k < 8; k++) { const a = rad(k * 45 + 22); p.stroke([[cx, hc + 10 * u], [cx + Math.cos(a) * 2 * H.a, hc + 10 * u + Math.sin(a) * 2 * H.b]], 1.1 * u, wc); }
  });
  if (c.helm === "deadpool") for (const s of [-1, 1]) p.ell(cx + s * 17 * u, hc - 4 * u, 22 * u, 20 * u, INK, 0, 0, 360, s * 25);
  if (c.helm === "panther") p.clip(hp, () => { for (const s of [-1, 1]) p.stroke([[cx + s * 0.15 * H.a, hc + 0.35 * H.b], [cx + s * 0.55 * H.a, hc + 0.85 * H.b]], 1.6 * u, "#8a7adf"); });
  // ---- face features ----
  const eyes = c.eyes ?? (kind === "mask" ? "lens" : "face");
  const F = FACE[expr];
  if (eyes === "face") {
    faceFront(p, cx, hc + (kind === "cowl" && c.helm !== "magneto" ? 0.12 * H.b : 0), W, expr, facing, look, lid, kind === "cowl", skin);
  } else {
    const ex = 15 * u, ey = hc - 4 * u, fx = cx + 6 * u * facing;
    const narrow = expr === "stern" || expr === "pained" || F.eye[0] === "squeeze" ? 0.6 : expr === "shock" ? 1.25 : expr === "grin" || expr === "laugh" ? 0.75 : 1;
    for (const side of [-1, 1]) {
      const x = fx + side * ex;
      if (eyes === "lens") { // big white lenses with a black rim (spider / deadpool / antman / panther)
        const pts = rotPts(ellPts(x, ey, 12 * u, 15 * u * narrow, 0, 360, 0, 24).map(([px, py]) => [px, py - (py < ey ? 0 : 0)] as P2), rad(side * 28), x, ey);
        p.poly(pts, WHITE, 3.4 * u);
      } else if (eyes === "slit") { p.poly([[x - 10 * u, ey - 3 * u * narrow], [x + 10 * u, ey - 1 * u], [x + 9 * u, ey + 3 * u * narrow], [x - 9 * u, ey + 2 * u]], glow > 0 ? "#f4fdff" : "#dff6ff", 2 * u); }
      else if (eyes === "doom") p.poly([[x - 11 * u, ey - 2 * u], [x + 11 * u, ey - 4 * u], [x + 10 * u, ey + 3 * u], [x - 10 * u, ey + 4 * u]], "#141016", 1 * u);
      else if (eyes === "goggle") p.ell(x, ey, 11 * u, 10 * u, "#ffd84a", 2.6 * u);
    }
    if (eyes === "visor") { p.poly([[cx - 36 * u, hc - 10 * u], [cx + 36 * u, hc - 10 * u], [cx + 34 * u, hc + 4 * u], [cx - 34 * u, hc + 4 * u]], "#e0303a", 2.4 * u); p.stroke([[cx - 30 * u, hc - 6 * u], [cx + 20 * u, hc - 6 * u]], 1.6 * u, "#ff9aa0"); }
    // lower face mouths for visor / cowl-like masks that leave the mouth
    if (eyes === "visor" || (kind === "cowl")) mouth(p, F.mouth, cx + 8 * u * facing, hc + 22 * u, u);
  }
  // ---- helmets & details on top ----
  const hcol = c.helmCol ?? "#e8c45a";
  switch (c.helm) {
    case "cap": { // white A + wings
      p.poly([[cx - 6 * u, hc - 30 * u], [cx + 6 * u, hc - 30 * u], [cx + 14 * u, hc - 6 * u], [cx + 7 * u, hc - 6 * u], [cx + 4 * u, hc - 14 * u], [cx - 4 * u, hc - 14 * u], [cx - 7 * u, hc - 6 * u], [cx - 14 * u, hc - 6 * u]], WHITE, 1.4 * u);
      for (const s of [-1, 1]) p.poly([[cx + s * 0.78 * H.a, hc - 0.25 * H.b], [cx + s * 1.0 * H.a, hc - 0.55 * H.b], [cx + s * 0.95 * H.a, hc - 0.1 * H.b]], WHITE, 1.4 * u);
      break;
    }
    case "wolverine": for (const s of [-1, 1]) p.poly([[cx + s * 0.4 * H.a, hc - 0.7 * H.b], [cx + s * 1.05 * H.a, crown - 0.45 * H.b], [cx + s * 0.85 * H.a, hc - 0.2 * H.b]], INK, 0); break;
    case "antman": { p.clip(hp, () => { p.poly([[cx - 2 * H.a, hc + 0.35 * H.b], [cx + 2 * H.a, hc + 0.35 * H.b], [cx + 2 * H.a, hc + 2 * H.b], [cx - 2 * H.a, hc + 2 * H.b]], "#9aa1aa", 0); }); p.stroke([[cx - 0.35 * H.a, hc - 0.95 * H.b], [cx + 0.35 * H.a, hc - 0.95 * H.b]], 4 * u, c.suit2 ?? INK); for (const s of [-1, 1]) p.ell(cx + s * 1.0 * H.a, hc + 0.05 * H.b, 7 * u, 14 * u, "#9aa1aa", 1.6 * u); p.inkRing(hp, ow, thick); break; }
    case "loki": case "sylvie": {
      p.band([[cx - 0.85 * H.a, hc - 0.55 * H.b], [cx + 0.85 * H.a, hc - 0.55 * H.b]], hcol, 6 * u, 1.4 * u);
      for (const s of [-1, 1]) {
        const big = c.helm === "loki" ? 1 : 0.55, broken = c.helm === "sylvie" && s > 0 ? 0.55 : 1;
        const h0: P2 = [cx + s * 0.3 * H.a, hc - 0.65 * H.b], tip: P2 = [cx + s * (0.95 + 0.25 * big) * H.a, crown - (0.9 * big) * H.b * broken];
        p.poly([h0, [cx + s * 0.55 * H.a, crown - 0.15 * H.b], tip, [cx + s * 0.62 * H.a, hc - 0.5 * H.b]].map(([x, y]) => [x, y] as P2), hcol, 1.8 * u);
      }
      break;
    }
    case "panther": for (const s of [-1, 1]) p.poly([[cx + s * 0.45 * H.a, crown + 0.12 * H.b], [cx + s * 0.62 * H.a, crown - 0.2 * H.b], [cx + s * 0.78 * H.a, crown + 0.2 * H.b]], maskCol, 1.6 * u); break;
    case "iron": { // gold faceplate on a red helmet
      p.clip(hp, () => p.poly([[cx - 0.62 * H.a, hc - 0.55 * H.b], [cx + 0.62 * H.a, hc - 0.55 * H.b], [cx + 0.58 * H.a, hc + 0.45 * H.b], [cx + 0.3 * H.a, hc + 1.05 * H.b], [cx - 0.3 * H.a, hc + 1.05 * H.b], [cx - 0.58 * H.a, hc + 0.45 * H.b]], hcol, 1.6 * u));
      for (const side of [-1, 1]) { const x = cx + side * 15 * u, ey = hc - 4 * u; p.poly([[x - 10 * u, ey - 3 * u], [x + 10 * u, ey - 1 * u], [x + 9 * u, ey + 3 * u], [x - 9 * u, ey + 2 * u]], "#e8fbff", 1.6 * u); }
      p.stroke([[cx - 9 * u, hc + 30 * u], [cx + 9 * u, hc + 30 * u]], 2 * u);
      p.inkRing(hp, ow, thick);
      break;
    }
    case "doom": { // metal mask + hood edge
      p.clip(hp, () => p.poly([[cx - 0.7 * H.a, hc - 0.7 * H.b], [cx + 0.7 * H.a, hc - 0.7 * H.b], [cx + 0.66 * H.a, hc + 0.6 * H.b], [cx + 0.25 * H.a, hc + 1.1 * H.b], [cx - 0.25 * H.a, hc + 1.1 * H.b], [cx - 0.66 * H.a, hc + 0.6 * H.b]], "#a9adb4", 1.6 * u));
      for (const side of [-1, 1]) { const x = cx + side * 15 * u, ey = hc - 4 * u; p.poly([[x - 11 * u, ey - 2 * u], [x + 11 * u, ey - 4 * u], [x + 10 * u, ey + 3 * u], [x - 10 * u, ey + 4 * u]], "#141016", 0); }
      p.poly([[cx - 10 * u, hc + 20 * u], [cx + 10 * u, hc + 20 * u], [cx + 9 * u, hc + 32 * u], [cx - 9 * u, hc + 32 * u]], "#141016", 0);
      for (let i = -1; i <= 1; i++) p.stroke([[cx + i * 4 * u, hc + 20 * u], [cx + i * 4 * u, hc + 32 * u]], 1.4 * u, "#a9adb4");
      p.stroke([[cx, hc - 0.65 * H.b], [cx, hc + 2 * u]], 1.4 * u, "#6d7178");
      const hood: P2[] = [];
      for (let i = 0; i <= 16; i++) { const a = rad(200 + i * 8.75); hood.push([cx + Math.cos(a) * H.a * 1.02, hc + 0.05 * H.b + Math.sin(a) * H.b * 1.02]); }
      p.stroke(hood, 9 * u, c.helmCol ?? "#2f6b3a");
      break;
    }
    case "deadpool": break;
    case "galactus": { p.clip(hp, () => p.poly([[cx - 2 * H.a, crown - 50], [cx + 2 * H.a, crown - 50], [cx + 2 * H.a, hc - 0.4 * H.b], [cx + 0.3 * H.a, hc - 0.4 * H.b], [cx, hc - 0.1 * H.b], [cx - 0.3 * H.a, hc - 0.4 * H.b], [cx - 2 * H.a, hc - 0.4 * H.b]], c.helmCol ?? "#6b3fa0", 1.6 * u)); p.inkRing(hp, ow, thick); break; }
    case "kang": p.clip(hp, () => p.poly([[cx - 2 * H.a, crown - 50], [cx + 2 * H.a, crown - 50], [cx + 2 * H.a, hc - 0.45 * H.b], [cx - 2 * H.a, hc - 0.45 * H.b]], "#3b2a6b", 0)); p.inkRing(hp, ow, thick); break;
    case "beast": case "nightcrawler": { for (const s of [-1, 1]) p.poly([[cx + s * 0.82 * H.a, hc - 0.2 * H.b], [cx + s * 1.18 * H.a, hc - 0.55 * H.b], [cx + s * 0.95 * H.a, hc + 0.1 * H.b]], skin, 1.4 * u); break; }
    case "namor": for (const s of [-1, 1]) p.poly([[cx + s * 0.85 * H.a, hc - 0.05 * H.b], [cx + s * 1.25 * H.a, hc - 0.6 * H.b], [cx + s * 1.0 * H.a, hc + 0.2 * H.b]], skin, 1.4 * u); break;
    case "sentry": break;
    case "alien": for (let i = -2; i <= 2; i++) p.poly([[cx + i * 0.3 * H.a - 8 * u, crown + 0.15 * H.b], [cx + i * 0.3 * H.a, crown - 0.3 * H.b - Math.abs(i) * -4 * u], [cx + i * 0.3 * H.a + 8 * u, crown + 0.15 * H.b]], "#5d6b5a", 1.4 * u); break;
    default: break;
  }
  // beards
  if (c.beard && c.beardK) {
    const by = hc + 0.55 * H.b, bc = c.beard;
    if (c.beardK === "goatee") { p.poly([[cx - 12 * u, by + 6 * u], [cx + 12 * u, by + 6 * u], [cx + 7 * u, by + 26 * u], [cx - 7 * u, by + 26 * u]], bc, 1.6 * u); taper(p, [cx - 2 * u, hc + 13 * u], [cx - 20 * u, hc + 20 * u], 4 * u, 1.6 * u, bc); taper(p, [cx + 2 * u, hc + 13 * u], [cx + 20 * u, hc + 20 * u], 4 * u, 1.6 * u, bc); }
    else if (c.beardK === "full") { p.clip(hp, () => p.poly([[cx - 2 * H.a, hc + 0.3 * H.b], [cx - 0.5 * H.a, hc + 0.3 * H.b], [cx - 0.35 * H.a, hc + 0.55 * H.b], [cx + 0.35 * H.a, hc + 0.55 * H.b], [cx + 0.5 * H.a, hc + 0.3 * H.b], [cx + 2 * H.a, hc + 0.3 * H.b], [cx + 2 * H.a, hc + 2 * H.b], [cx - 2 * H.a, hc + 2 * H.b]], bc, 0)); p.inkRing(hp, ow, thick); mouth(p, F.mouth, cx + 8 * u * facing, hc + 20 * u, u); }
    else if (c.beardK === "moustache") { taper(p, [cx - 1.5 * u, hc + 12.5 * u], [cx - 18 * u, hc + 15 * u], 5 * u, 1.6 * u, bc); taper(p, [cx + 1.5 * u, hc + 12.5 * u], [cx + 18 * u, hc + 15 * u], 5 * u, 1.6 * u, bc); }
    else if (c.beardK === "chin") for (let i = 0; i < 4; i++) p.stroke([[cx - 9 * u + i * 6 * u, hc + 0.6 * H.b], [cx - 9 * u + i * 6 * u, hc + 0.85 * H.b]], 2 * u, mix(skin, INK, 0.45));
    else for (let i = 0; i < 14; i++) p.dot(cx + (rnd(seed, 40 + i) - 0.5) * 1.1 * H.a, hc + (0.45 + 0.4 * rnd(seed, 60 + i)) * H.b, 1.4 * u, mix(skin, INK, 0.4));
  }
};

// ---------------- the cast ----------------
const RED = "#c8323a", BLUE = "#2f5fb3", NAVY = "#24335e", GOLD = "#e8b33c", GREEN = "#2f8a4a", PURPLE = "#6b3fa0", BLACK = "#2a2730";
export const CAST: Record<string, Hero> = {
  // X-Men (Earth-10005)
  profx: { suit: "#3a3f52", suit2: "#5a6078", suit3: "#ffffff", pattern: "suit", skin: "#f5c9a0", hairK: "bald", legs: "#2e3242", boots: "#1e1e24", build: "adult", prop: "wheelchair" },
  magneto: { suit: "#7a2a4a", suit2: "#5c1f38", pattern: "plain", cape: "#8c2a3a", head: "cowl", mask: "#b02f3c", helm: "magneto", helmCol: "#6b3a8c", skin: "#f1d2b6", legs: "#4a1a2e", gloves: "#6b3a8c" },
  cyclops: { suit: "#1f3a7a", suit2: "#f2c14e", pattern: "vest", eyes: "visor", hairK: "short", hair: "#5a3b2a", emblem: "x", gloves: "#f2c14e", boots: "#f2c14e" },
  mystique: { suit: "#3d6fd6", skin: "#3d6fd6", hairK: "slick", hair: "#d8452e", build: "slim", eyes: "face" },
  nightcrawler: { suit: "#2a2f5c", suit2: "#c8323a", pattern: "vest", skin: "#3f4fa0", hairK: "short", hair: "#1c1f3a", helm: "nightcrawler", tail: "#2a2f5c", build: "slim" },
  beast: { suit: "#3f56b8", skin: "#4a62c8", hairK: "wild", hair: "#33479e", helm: "beast", pattern: "suit", suit2: "#c8323a", suit3: "#e8eef6", build: "stout", gloves: "#4a62c8" },
  // Infinity saga
  tony: { suit: "#3a3f52", suit2: "#2b2b36", pattern: "jacket", skin: "#f1c9a0", hairK: "slick", hair: "#2a1e1a", beard: "#2a1e1a", beardK: "goatee", emblem: "arc", prop: "wrench" },
  ironman: { suit: RED, suit2: GOLD, pattern: "iron", emblem: "arc", head: "mask", mask: RED, eyes: "slit", helm: "iron", helmCol: GOLD, arms: RED, legs: RED, gloves: GOLD, boots: GOLD },
  cap: { suit: BLUE, suit2: RED, suit3: "#ffffff", pattern: "cap", emblem: "star", head: "cowl", mask: BLUE, helm: "cap", arms: BLUE, legs: NAVY, gloves: "#8a4a2c", boots: "#8a4a2c", prop: "shield", skin: "#f5d2b0" },
  steve: { suit: "#6b8cc2", suit2: "#2c3b5a", pattern: "jacket", skin: "#f5d2b0", hairK: "slick", hair: "#d9b25a" },
  oldsteve: { suit: "#6a6a78", suit2: "#3a3a46", pattern: "jacket", skin: "#f0d0b8", hairK: "slick", hair: "#e8e8ee" },
  peggy: { suit: "#2f4f9a", suit2: "#c8323a", pattern: "jacket", skin: "#f8d8c0", hairK: "bob", hair: "#5a2e1e", build: "slim", legs: "#2f4f9a" },
  thor: { suit: "#3a3d4a", suit2: "#2a2c36", pattern: "thor", cape: RED, hairK: "long", hair: "#e3c26a", beard: "#d4b05a", beardK: "full", prop: "hammer", arms: "#f1c9a0", gloves: "#3a3d4a", skin: "#f1c9a0" },
  hulk: { build: "big", suit: "#5aa648", skin: "#5aa648", pattern: "abs", legs: "#5a3f8c", arms: "#5aa648", boots: "#4a8f3a", helm: "hulk", hair: "#20231f" },
  widow: { build: "slim", suit: BLACK, suit2: "#3a3740", pattern: "plain", skin: "#f8d8c0", hairK: "long", hair: "#b8402a", belt: "#c9a14a" },
  hawkeye: { suit: "#3d3a4f", suit2: "#5c3a7a", pattern: "vest", skin: "#f1c9a0", hairK: "short", hair: "#8a6a4a" },
  loki: { suit: "#2f6b3a", suit2: "#1f2a22", pattern: "robe", cape: "#2f6b3a", head: "face", hairK: "long", hair: "#1c1a1f", helm: "loki", helmCol: GOLD, skin: "#f8e2d0", prop: "scepter" },
  lokiT: { suit: "#2f6b3a", suit2: "#1f2a22", pattern: "robe", head: "face", hairK: "long", hair: "#1c1a1f", helm: "loki", helmCol: GOLD, skin: "#f8e2d0", prop: "tesseract" },
  lokiTVA: { suit: "#8a6a48", suit2: "#5c4630", pattern: "tva", head: "face", hairK: "long", hair: "#1c1a1f", skin: "#f8e2d0", emblem: "hourglass" },
  alien: { suit: "#5d6b5a", suit2: "#3a4238", pattern: "armor", skin: "#9aa38f", helm: "alien", eyes: "face" },
  thanos: { build: "big", suit: "#3f4a8c", suit2: GOLD, pattern: "armor", skin: "#8a5fa8", arms: "#8a5fa8", legs: "#3f4a8c", boots: GOLD, prop: "gauntlet", beard: "#6a457f", beardK: "chin" },
  // Loki / TVA
  sylvie: { build: "slim", suit: "#2f5a3a", suit2: "#1f2a22", pattern: "jacket", cape: "#2f5a3a", hairK: "long", hair: "#e8cf7a", helm: "sylvie", helmCol: GOLD, skin: "#f8e2d0", prop: "sword" },
  hwr: { suit: "#5a3f8c", suit2: "#e8b33c", pattern: "robe", cape: "#3b2a6b", hairK: "curly", hair: "#1c1a1f", skin: "#8a5a3c" },
  tva: { suit: "#8a6a48", suit2: "#5c4630", pattern: "tva", hairK: "short", hair: "#2a1e1a", emblem: "hourglass", skin: "#e8c4a0" },
  lokiKing: { suit: "#2f6b3a", suit2: GOLD, pattern: "robe", cape: "#2f6b3a", hairK: "long", hair: "#1c1a1f", helm: "loki", helmCol: GOLD, skin: "#f8e2d0" },
  // multiverse
  spidey: { suit: RED, suit2: BLUE, pattern: "spider", emblem: "spider", head: "mask", mask: RED, eyes: "lens", helm: "spider", arms: RED, legs: BLUE, boots: RED, gloves: RED },
  spidey2: { suit: "#b02a33", suit2: "#1f2a5c", pattern: "spider", emblem: "spider", head: "mask", mask: "#b02a33", eyes: "lens", helm: "spider", arms: "#b02a33", legs: "#1f2a5c", boots: "#b02a33", gloves: "#b02a33" },
  spidey3: { suit: "#d8343c", suit2: "#2a5ac0", pattern: "spider", emblem: "spider", head: "mask", mask: "#d8343c", eyes: "lens", helm: "spider", arms: "#2a5ac0", legs: "#2a5ac0", boots: "#d8343c", gloves: "#d8343c" },
  peter: { suit: "#c8a46a", suit2: "#3a5a8a", pattern: "jacket", hairK: "short", hair: "#5a3b2a", skin: "#f5d2b0" },
  strange: { suit: "#2a4f8a", suit2: "#1c2b4a", pattern: "robe", cape: "#c8323a", hairK: "slick", hair: "#2a1e1a", beard: "#2a1e1a", beardK: "goatee", skin: "#f1c9a0", prop: "spell", belt: "#8a5a34" },
  goblin: { suit: "#4f8a3a", suit2: "#5a3f8c", pattern: "armor", skin: "#5f9a48", eyes: "goggle", head: "mask", mask: "#5f9a48", helm: "alien" },
  ock: { suit: "#5a4a3a", suit2: "#3a3029", pattern: "jacket", hairK: "slick", hair: "#2a1e1a", skin: "#f1c9a0", build: "stout" },
  shuri: { build: "slim", suit: "#1e1b26", suit2: "#8a7adf", pattern: "panther", head: "mask", mask: "#1e1b26", eyes: "lens", helm: "panther", arms: "#1e1b26", legs: "#1e1b26" },
  namor: { suit: "#3a8f6a", skin: "#b07a52", pattern: "abs", hairK: "slick", hair: "#1c1a1f", helm: "namor", arms: "#b07a52", legs: "#2f6b8a", boots: "#e8c45a" },
  antman: { suit: RED, suit2: "#2a2730", pattern: "antman", head: "mask", mask: RED, eyes: "lens", helm: "antman", arms: "#2a2730", legs: "#2a2730", gloves: RED, boots: RED },
  cassie: { build: "slim", suit: "#7a3fb0", suit2: "#2a2730", pattern: "antman", head: "face", hairK: "long", hair: "#c89a5a", skin: "#f5d2b0", gloves: "#7a3fb0" },
  kang: { suit: "#2a3b6b", suit2: "#6fd6ff", pattern: "robe", helm: "kang", skin: "#8a5a3c", cape: "#1c2442", glowCol: "#9fe6ff" },
  monica: { build: "slim", suit: "#f2f2f6", suit2: "#2f5fb3", pattern: "vest", skin: "#9a6a4a", hairK: "curly", hair: "#2a1e1a", prop: "glow", glowCol: "#cfefff", emblem: "redstar" },
  captmarvel: { build: "slim", suit: RED, suit2: BLUE, pattern: "marvel", emblem: "star", skin: "#f5d2b0", hairK: "bob", hair: "#e3c26a", prop: "glow", glowCol: "#ffe7a8" },
  // Deadpool & Wolverine
  deadpool: { suit: RED, suit2: "#7a1f26", pattern: "deadpool", head: "mask", mask: RED, eyes: "lens", helm: "deadpool", arms: RED, legs: RED, gloves: "#2a2730", boots: "#2a2730", belt: "#2a2730", prop: "katanas" },
  wolverine: { build: "stout", suit: "#f2c42c", suit2: "#2f5fb3", pattern: "wolverine", head: "cowl", mask: "#f2c42c", helm: "wolverine", skin: "#f1c9a0", arms: "#f2c42c", legs: "#2f5fb3", gloves: "#2f5fb3", boots: "#2f5fb3", prop: "claws", beard: "#2a1e1a", beardK: "stubble", belt: "#c8323a" },
  gambit: { suit: "#8a5a3c", suit2: "#c86aa8", pattern: "jacket", hairK: "long", hair: "#7a4a2a", skin: "#f1c9a0", prop: "cards", cape: "#7a5232" },
  // Phase 5-6
  samcap: { suit: "#f2f2f6", suit2: BLUE, pattern: "sam", emblem: "sam", head: "cowl", mask: BLUE, helm: "cap", skin: "#7a4a2e", arms: BLUE, legs: NAVY, wings: "#c9ccd2", gloves: "#f2f2f6", boots: NAVY, prop: "shield" },
  redhulk: { build: "big", suit: "#c8323a", skin: "#c8323a", pattern: "abs", legs: "#2a2a36", arms: "#c8323a", boots: "#8a2a30", helm: "hulk", hair: "#f2f2f6", beard: "#f2f2f6", beardK: "moustache" },
  yelena: { build: "slim", suit: "#4a5a3a", suit2: "#2a2730", pattern: "vest", skin: "#f8e2d0", hairK: "long", hair: "#e8cf7a", belt: "#2a2730" },
  bucky: { suit: "#2a2730", suit2: "#3a3740", pattern: "jacket", skin: "#f1c9a0", hairK: "short", hair: "#2a1e1a", arms: "#2a2730", gloves: "#c9ccd2" },
  redguardian: { build: "stout", suit: RED, suit2: "#8a2a30", pattern: "plain", emblem: "redstar", head: "face", hairK: "short", hair: "#5a3b2a", beard: "#5a3b2a", beardK: "full", skin: "#f1c9a0", gloves: "#e8c45a" },
  ghost: { build: "slim", suit: "#8a9098", suit2: "#5c6168", pattern: "plain", head: "mask", mask: "#8a9098", eyes: "lens", arms: "#8a9098", legs: "#8a9098" },
  usagent: { suit: NAVY, suit2: "#f2f2f6", pattern: "sam", emblem: "star", head: "face", hairK: "short", hair: "#8a6a3a", skin: "#f1c9a0", prop: "shield" },
  bob: { suit: "#f2f2f6", suit2: "#2f5fb3", pattern: "vest", emblem: "sun", hairK: "short", hair: "#e3c26a", skin: "#f8e2d0", cape: "#2f5fb3" },
  void: { suit: "#141016", suit2: "#2a2240", pattern: "plain", head: "mask", mask: "#141016", eyes: "lens", arms: "#141016", legs: "#141016", cape: "#1c1726" },
  // Fantastic Four (Earth-828)
  reed: { suit: "#3a6fbf", suit2: "#1f2a44", suit3: "#f2f2f6", pattern: "ff", emblem: "four", hairK: "slick", hair: "#3a2a1e", skin: "#f1c9a0", beard: "#3a2a1e", beardK: "stubble", gloves: "#1f2a44", boots: "#1f2a44" },
  sue: { build: "slim", suit: "#3a6fbf", suit2: "#1f2a44", suit3: "#f2f2f6", pattern: "ff", emblem: "four", hairK: "long", hair: "#e3c26a", skin: "#f8e2d0", gloves: "#1f2a44", boots: "#1f2a44" },
  torch: { suit: "#ff8a2a", suit2: "#ffd84a", pattern: "flame", skin: "#ffcf8a", hairK: "spiky", hair: "#ff6a1a", arms: "#ff8a2a", legs: "#ff8a2a", prop: "flame", emblem: "four" },
  thing: { build: "big", suit: "#e0823a", skin: "#e0823a", suit2: "#3a6fbf", pattern: "thing", arms: "#e0823a", legs: "#3a6fbf", boots: "#e0823a", helm: "thing", emblem: "four" },
  galactus: { suit: PURPLE, suit2: "#3b8fbf", pattern: "armor", helm: "galactus", helmCol: PURPLE, skin: "#e8c4a0", build: "stout" },
  doom: { suit: "#5c6168", suit2: "#2f6b3a", pattern: "doom", cape: "#2f6b3a", capeIn: "#1f4a28", head: "face", helm: "doom", helmCol: "#2f6b3a", skin: "#a9adb4", eyes: "doom", arms: "#5c6168", legs: "#3a3d44", gloves: "#5c6168", boots: "#3a3d44", belt: "#c9a14a" },
  // Brand New Day
  jean: { build: "slim", suit: "#2f6b8a", suit2: "#c8a46a", pattern: "jacket", hairK: "long", hair: "#d8452e", skin: "#f8e2d0" },
  bruce: { suit: "#8a6a9a", suit2: "#4a3a5a", pattern: "jacket", hairK: "curly", hair: "#4a4a4a", skin: "#f1c9a0" },
  shield: { suit: "#3a3f52", suit2: "#2b2b36", pattern: "suit", skin: "#f1c9a0", hairK: "short", hair: "#2a1e1a" },
  franklin: { build: "kid", suit: "#3a6fbf", suit2: "#1f2a44", suit3: "#f2f2f6", pattern: "ff", emblem: "four", hairK: "short", hair: "#3a2a1e", skin: "#f5d2b0" },
  president: { suit: "#2a2f45", suit2: "#c8323a", pattern: "suit", skin: "#f1c9a0", hairK: "slick", hair: "#e8e8ee", beard: "#e8e8ee", beardK: "moustache" },
  folk1: { suit: "#3f6fb5", suit2: "#2c3b5a", pattern: "jacket", hairK: "short", hair: "#5a3b2a", skin: "#f5c9a0" },
  folk2: { build: "slim", suit: "#c25a7a", suit2: "#7a2a4a", pattern: "jacket", hairK: "bob", hair: "#2a1e1a", skin: "#c99067" },
  folk3: { suit: "#5d7a3a", suit2: "#3a4a28", pattern: "jacket", hairK: "curly", hair: "#2a1e1a", skin: "#8a5a3c" },
  folk4: { build: "slim", suit: "#d9a441", suit2: "#8a6a2a", pattern: "jacket", hairK: "long", hair: "#c89a5a", skin: "#ffe2c2" },
};
export type CastId = keyof typeof CAST;
