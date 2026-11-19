// "Butter Side Down": the shared ~14 s story every camera-move variant is filmed on. Everything here is a pure
// function of STORY frame s (a float: the speed-ramp variant remaps time), timed to the narration's words.json.
import WORDS from "./words.json";

export const FPS = 30;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type W = { w: string; s: number; e: number; line: number };
const WS = WORDS as W[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, "");
/** first frame of word `w` in line `line` (n-th occurrence), or of the line itself */
export const cue = (line: number, w?: string, n = 0) => {
  const l = WS.filter((x) => x.line === line && (!w || norm(x.w) === norm(w)));
  const x = l[Math.min(n, l.length - 1)];
  if (!x) throw new Error(`cue: no "${w}" in line ${line}`);
  return Math.round(x.s * FPS);
};
export const cueEnd = (line: number, w?: string, n = 0) => {
  const l = WS.filter((x) => x.line === line && (!w || norm(x.w) === norm(w)));
  const x = w ? l[Math.min(n, l.length - 1)] : l[l.length - 1];
  return Math.round(x.e * FPS);
};
export const WORD_LIST = WS;

/** clip length: the last word plus a short tail for the landing + cheer */
export const CLIP = 420;

// ---------------- story beats (story frames) ----------------
export const B = {
  hook: 0,                       // S1 kid + toast on the plate (L0)
  table: cue(1),                 // S2 the table leg + ruler (L1)
  tip: cue(2),                   // S3 the toast slides, tips and falls (L2)
  splat: cue(3) - 2,             // S4 splat on the floor (L3)
  giant: cue(4),                 // S5 garden, the 3 m table (L4)
  end: CLIP,
};
export const EV = {
  down: cue(0, "down"),
  luck: cue(0, "luck"),
  ruler: cue(1, "table") - 2,
  mark: cue(1, "seventy-five"),
  nudge: cue(2, "The") - 4,
  slide1: cue(2, "tips"),
  fall0: cue(2, "spinning") - 2,
  splat: cue(3, "Splat") - 1,
  half: cue(2, "half"),
  gfall0: cue(4, "up"),
  gruler: cue(4, "three") - 2,
  gland: cueEnd(4, "tall") - 2,
};

// ---------------- places (metres; kitchen floor y = 0, the table at the room centre-back) ----------------
export const TABLE: V3 = [0, 0, -1.2];          // table centre on the floor
export const TABLE_H = 0.75, TABLE_W = 1.2, TABLE_D = 0.75;
export const EDGE_X = TABLE[0] + TABLE_W / 2;   // the edge the toast falls from (+x side)
export const PLATE: V3 = [0.36, TABLE_H + 0.012, -1.05];
export const KID: V3 = [-0.12, 0, -1.82];        // stands behind the table
export const KID_EYE = 1.02;                       // kid eye height (m) on the floor
export const FLOOR_HIT: V3 = [0.86, 0, -1.0];      // where the toast lands
export const RULER: V3 = [0.7, 0, -0.84];          // measuring stick by the front-right leg
export const WIN = { x0: -0.6, x1: 1.0, y0: 0.95, y1: 2.15, z: -3.0 }; // window hole in the back wall
export const ROOM = { x0: -3.0, x1: 3.0, z0: -3.0, z1: 3.0, h: 2.9 };
export const GIANT: V3 = [0.4, 0, -9.5];           // the 3 m table in the garden
export const GIANT_H = 3.0, GIANT_W = 1.4, GIANT_D = 0.9;
export const GKID: V3 = [0.12, GIANT_H, -9.62];    // kid standing on top of it
export const GEDGE_X = GIANT[0] + GIANT_W / 2;
export const GHIT: V3 = [1.42, 0, -9.35];
export const GRULER: V3 = [1.55, 0, -9.0];
export const TOAST = { w: 0.2, t: 0.026 };

// ---------------- toast motion ----------------
/** toast pose: centre position, rotation about z (radians, +ve turns the butter toward +x then down), visible */
export type ToastPose = { p: V3; rz: number; on: boolean };
const easeIn2 = (u: number) => u * u;
export const toastAt = (s: number): ToastPose => {
  const y0 = TABLE_H + 0.012 + TOAST.t / 2 + 0.012; // resting on the plate
  if (s < EV.nudge + 2) return { p: [PLATE[0], y0, PLATE[2]], rz: 0, on: true };
  if (s < EV.slide1) { // nudged off the plate to the edge
    const u = smooth((s - EV.nudge - 2) / (EV.slide1 - EV.nudge - 2));
    return { p: [lerp(PLATE[0], EDGE_X + 0.035, u), lerp(y0, TABLE_H + TOAST.t / 2, u), lerp(PLATE[2], -1.0, u)], rz: 0, on: true };
  }
  const tipMax = 0.42;
  if (s < EV.fall0) { // teeters on the edge, tipping slowly about it
    const u = smooth((s - EV.slide1) / (EV.fall0 - EV.slide1)), a = tipMax * u + 0.05 * Math.sin(s * 0.9) * (1 - u);
    const r = 0.035; // pivot at the table edge, toast centre r past it
    return { p: [EDGE_X + r * Math.cos(a), TABLE_H + TOAST.t / 2 - r * Math.sin(a), -1.0], rz: a, on: true };
  }
  if (s < EV.splat) { // falls and spins: only half a turn before the floor
    const u = (s - EV.fall0) / (EV.splat - EV.fall0), e = easeIn2(u);
    const yA = TABLE_H - 0.01, yB = TOAST.t / 2 + 0.004;
    return { p: [lerp(EDGE_X + 0.035, FLOOR_HIT[0], u), lerp(yA, yB, e), lerp(-1.0, FLOOR_HIT[2], u)], rz: lerp(tipMax, Math.PI, Math.min(1, 0.15 + 0.85 * u + 0.15 * u * (1 - u))), on: true };
  }
  return { p: [FLOOR_HIT[0], TOAST.t / 2 + 0.004, FLOOR_HIT[2]], rz: Math.PI, on: true };
};
/** the second toast, on the 3 m table: a full turn, lands butter side up */
export const gtoastAt = (s: number): ToastPose => {
  const y0 = GIANT_H + TOAST.t / 2, r = 0.035;
  if (s < EV.gfall0) {
    const u = smooth((s - B.giant) / (EV.gfall0 - B.giant)), a = 0.38 * u;
    return { p: [GEDGE_X + r * Math.cos(a), y0 - r * Math.sin(a), -9.38], rz: a, on: true };
  }
  if (s < EV.gland) {
    const u = (s - EV.gfall0) / (EV.gland - EV.gfall0);
    return { p: [lerp(GEDGE_X + r, GHIT[0], u), lerp(GIANT_H, TOAST.t / 2 + 0.004, easeIn2(u)), lerp(-9.38, GHIT[2], u)], rz: lerp(0.38, 2 * Math.PI, u), on: true };
  }
  return { p: [GHIT[0], TOAST.t / 2 + 0.004, GHIT[2]], rz: 2 * Math.PI, on: true };
};

/** ruler pop (0..1 with overshoot) and the red marker height (m) */
export const popK = (s: number, s0: number, n = 7) => { if (s < s0) return 0; const u = clamp01((s - s0) / n), k = 1.9; return 1 + (k + 1) * (u - 1) ** 3 + k * (u - 1) ** 2; };
export const markAt = (s: number) => 0.75 * smooth((s - EV.mark) / 14);

/** which set the shared story is in at story frame s (for the light + sun) */
export const setAt = (s: number): "kitchen" | "garden" => (s < B.giant ? "kitchen" : "garden");
