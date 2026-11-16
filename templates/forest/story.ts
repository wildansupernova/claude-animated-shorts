// "The Forest Snitch": our original ~70 s short about how nature gives away a hidden grave. Shots are timed to the
// narration word onsets (~/forest-short/voice/words.json, frames at 30 fps). The world state (hole, rug, brown grass,
// lush regrowth, mushrooms, sinking) is a pure function of the shot and frame, so any shot can show any moment.
// Camera grammar from the reference study (motion.md): cuts on big jumps, smootherstep glides 18-40 f, every hold
// creeps in, 7-frame flip kicks on impacts, 4-5 deg rolls on emphasis.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0; // ground height (build.ts houses sit on it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
/** overshoot pop 0 -> 1.12 -> 1 */
export const pop = (u: number) => { const x = clamp01(u); return x <= 0 ? 0 : 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2; };
const ramp = (f: number, a: number, b: number) => smooth((f - a) / (b - a));

// ---------------- places ----------------
export const PW = 1.2, PL = 2.4; // the grave patch: x in [-0.6, 0.6], z in [-1.2, 1.2]
export const MOUND: V3 = [-1.45, 0, 0.1];
export const G2: V3 = [-5.8, 0, 6.4]; // "Meet Gary" spot at the tree line
export const DIGAT: V3 = [0.62, 0, -1.72]; // Gary while digging (south end of the hole)
export const LAWN: V3 = [0, 0, -420]; // the suburban lawn of the dog analogy (far from the forest)
export const SPOT: V3 = [LAWN[0] + 0.3, 0, LAWN[2] + 1.0];
export const SACK: V3 = [1.05, 0, -1.75];
export const MUSH_N = 18;
/** corpse-finder mushroom (the one with eyes), on the east edge of the patch */
export const CF: V3 = [0.78, 0, 0.25];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: "forest" | "lawn" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 122, light: "day", place: "forest" },      // hook: the snitching forest (flash-forward)
  { id: 2, a: 122, b: 246, light: "day", place: "forest" },    // meet Gary
  { id: 3, a: 246, b: 440, light: "day", place: "forest" },    // clearing, dig, rug, grass back, perfect
  { id: 4, a: 440, b: 562, light: "day", place: "forest" },    // weeks later: brown rectangle
  { id: 5, a: 562, b: 719, light: "day", place: "forest" },    // greener, way greener, aerial
  { id: 6, a: 719, b: 788, light: "day", place: "forest" },    // mushrooms
  { id: 7, a: 788, b: 908, light: "day", place: "forest" },    // the ground sinks (raking sun)
  { id: 8, a: 908, b: 1086, light: "day", place: "forest" },   // luckily / unluckily
  { id: 9, a: 1086, b: 1270, light: "day", place: "forest" },  // why: soil, nitrogen, fertilizer
  { id: 10, a: 1270, b: 1505, light: "day", place: "lawn" },   // the dog analogy
  { id: 11, a: 1505, b: 1703, light: "day", place: "forest" }, // ammonia fungi, the corpse finder
  { id: 12, a: 1703, b: 1914, light: "day", place: "forest" }, // search teams, drones
  { id: 13, a: 1914, b: TOTAL, light: "day", place: "forest" },// picnic callback
];
/** crossfades (frames) at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 10, 7: 8, 8: 8, 10: 8, 11: 8, 13: 8 };
export const FLASH_AT = 122;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state of the patch ----------------
export type Patch = {
  hole: number; soil: number; mound: number; seam: number; dead: number; lush: number; tufts: number; sink: number;
  mush: number; // story frame for the mushroom pops (each mushroom i pops at MUSH0 + 2.6 i)
  rug: { x: number; y: number; rot: number; up: boolean; vis: boolean; drag?: [number, number, number] };
  sack: number; blanket: boolean;
};
export const MUSH0 = 744;
/** dig cycle 0..1 (shovel down at 1) and the clods' launch frames during the dig beat */
export const DIG_A = 293, DIG_B = 320;
export const digK = (f: number) => 0.5 - 0.5 * Math.cos(((f - DIG_A) / 9) * Math.PI * 2);
const FINAL = { hole: 0, soil: 0, mound: 0, seam: 0.25, dead: 0, lush: 2, tufts: 1, sink: 1, mush: 9999, sack: 0, blanket: false };
const RUG_GONE = { x: 0, y: -0.6, rot: 0, up: false, vis: false };

/** the patch at story frame g (the main timeline of the dig and the months after it) */
export const patchStory = (g: number): Patch => {
  const hole = g < DIG_A ? 0 : g < 356 ? ramp(g, DIG_A, DIG_B + 4) : 1 - ramp(g, 358, 398);
  const filled = g >= 398;
  // rug: lies beside the hole from the dig on, rolls in on "rolls the rug in" (320-344), drops (344-352)
  let rug: Patch["rug"] = { x: 1.15, y: 0.2, rot: 0, up: false, vis: true };
  if (g >= 320) {
    const u = ramp(g, 320, 344), x = 1.15 * (1 - u), drop = ramp(g, 342, 352);
    rug = { x, y: 0.2 - 0.82 * drop * drop, rot: (1.15 - x) / 0.2, up: false, vis: g < 400 };
  }
  return {
    hole, soil: g >= DIG_A && g < 392 ? 1 : 0, mound: g < DIG_A ? 0 : g < 356 ? ramp(g, DIG_A, DIG_B + 6) : 1 - ramp(g, 360, 396),
    seam: filled ? 1 - 0.75 * ramp(g, 560, 700) : 0,
    dead: ramp(g, 486, 512) * (1 - ramp(g, 571, 592)),
    lush: g < 571 ? 0 : ramp(g, 571, 598) + 0.5 * ramp(g, 600, 608) + 0.5 * ramp(g, 618, 626),
    tufts: ramp(g, 571, 600) * 0.6 + 0.2 * ramp(g, 600, 608) + 0.2 * ramp(g, 618, 626),
    sink: ramp(g, 812, 852),
    mush: g, rug, sack: 0, blanket: false,
  };
};
/** what a shot shows at frame f */
export const patchAt = (id: number, f: number): Patch => {
  switch (id) {
    case 1: return { ...FINAL, rug: RUG_GONE };
    case 2: return { ...patchStory(0), rug: { x: G2[0] + 0.95, y: 0, rot: 0, up: true, vis: true } };
    case 3: {
      if (f < DIG_A) { // dragged behind Gary across the clearing
        const k = garyWalk(f);
        return { ...patchStory(0), rug: { x: 0, y: 0, rot: 0, up: false, vis: true, drag: [k.x - 1.15 * k.dx, 0.2, k.z - 1.15 * k.dz] } };
      }
      return patchStory(f);
    }
    case 9: {
      if (f < 1153) return patchStory(300 + ((f - 1086) % 27)); // dig flashback, looping strokes
      if (f < 1220) return { ...patchStory(353), rug: { x: 0, y: -0.62, rot: 5.75, up: false, vis: true } }; // the rug down in the hole
      return { ...FINAL, sink: 0.55, rug: RUG_GONE, sack: pop((f - 1222) / 9) };
    }
    case 11: case 12: return { ...FINAL, rug: RUG_GONE };
    case 13: return { ...FINAL, sink: 0, rug: RUG_GONE, blanket: true, mush: 9999 };
    default: return patchStory(f);
  }
};
/** Gary's walk into the clearing (shot 3a): position + unit direction */
export const garyWalk = (f: number) => {
  const u = smooth((f - 240) / 56), x0 = -8.6, z0 = 6.4, x1 = -1.5, z1 = 1.2;
  const L = Math.hypot(x1 - x0, z1 - z0);
  return { x: x0 + (x1 - x0) * u, z: z0 + (z1 - z0) * u, dx: (x1 - x0) / L, dz: (z1 - z0) / L, moving: u > 0 && u < 1 };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (subject grows ~rate per frame); punch raises it for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const L_: V3 = LAWN;

// ---- framings ----
// 1: hook (flash-forward to the final state): low wide on the lush rectangle -> push -> the corpse finder's eyes -> Gary
const S1a = (f: number) => dolly([2.6, 1.15, -4.6], [0, 0.15, 0.2], pushK(f, 0, 0.003), { fov: 44 });
const S1b = (f: number) => dolly([1.9, 0.62, -3.0], [0.15, 0.12, 0.3], pushK(f, 64, 0.003, 0.006, 20), { fov: 40, roll: 0.035 });
const S1c = (f: number) => dolly([CF[0] + 0.28, 0.24, CF[2] - 0.86], [CF[0], 0.15, CF[2]], pushK(f, 85, 0.004), { fov: 36 });
export const GHOOK: V3 = [-1.35, 0, 1.3];
const S1d = (f: number) => dolly([GHOOK[0] + 0.5, 1.62, GHOOK[2] - 2.3], [GHOOK[0], 1.42, GHOOK[2]], pushK(f, 100, 0.004), { fov: 36, roll: -0.04 });
// 2: meet Gary at the tree line (looking out of the clearing at the trees behind him)
const S2a = (f: number) => dolly([G2[0] + 1.2, 1.55, G2[2] - 4.6], [G2[0] + 0.25, 1.15, G2[2]], pushK(f, 122, 0.0022), { fov: 40 });
const S2b = (f: number) => dolly([G2[0] + 1.85, 1.15, G2[2] - 3.1], [G2[0] + 0.85, 0.3, G2[2] - 0.75], pushK(f, 183, 0.0025, 0.006, 24), { fov: 40, roll: 0.03 });
const S2c = (f: number) => dolly([G2[0] + 0.55, 1.6, G2[2] - 2.25], [G2[0] + 0.05, 1.5, G2[2]], pushK(f, 214, 0.003), { fov: 38, roll: -0.04 });
// 3: the deed
const S3a = (f: number) => dolly([1.2, 4.6, -4.4], [-4.4, 0.3, 3.0], pushK(f, 246, 0.0016), { fov: 46 });
const S3b = (f: number) => dolly([2.9, 1.5, -4.0], [0.2, 0.75, -0.8], pushK(f, 293, 0.0025), { fov: 42, roll: 0.03 });
const S3c = (f: number) => dolly([0.95, 1.25, 3.7], [0.45, -0.15, 0.2], pushK(f, 318, 0.0025), { fov: 42, roll: -0.03 });
const S3d = (f: number) => dolly([1.6, 4.6, -3.3], [0, 0, -0.1], pushK(f, 354, 0.0018), { fov: 42 });
const S3e = (f: number) => dolly([2.1, 1.55, -3.3], [1.15, 1.35, -1.4], pushK(f, 413, 0.0025, 0.006, 20), { fov: 38, roll: 0.04 });
// 4: weeks later (high 3/4, then straight down on "in a rectangle")
const S4a = (f: number) => dolly([2.4, 3.0, -3.9], [0, 0, 0], pushK(f, 436, 0.0018), { fov: 42 });
const S4b = (f: number) => dolly([0.02, 5.2, -0.6], [0, 0, 0], pushK(f, 525, 0.002, 0.005, 25), { fov: 42 });
// 5: greener (low 3/4, kicks on each "greener"), crane up for "the greenest rectangle in the whole forest"
const S5a = (f: number) => dolly([1.7, 0.75, -2.9], [0, 0.12, 0], pushK(f, 562, 0.0025), { fov: 42 });
const S5b = (f: number) => {
  const u = glide((f - 642) / 75);
  return { pos: [1.5 + 3 * u, 3 + 15 * u, -5 - 8 * u] as V3, look: [0, 0, 0] as V3, fov: 42 + 2 * u, roll: 0 };
};
// 6: mushrooms (ground level), then high on "only there"
const S6a = (f: number) => dolly([1.35, 0.62, -2.1], [0.2, 0.04, 0.1], pushK(f, 719, 0.003), { fov: 42, roll: 0.03 });
const S6b = (f: number) => dolly([2.2, 3.4, -2.8], [0, 0, 0], pushK(f, 770, 0.003), { fov: 42 });
// 7: golden, the ground sinks (raking light from the side shows the dip)
const S7a = (f: number) => dolly([2.5, 1.35, -2.4], [0, -0.12, 0.1], pushK(f, 788, 0.002), { fov: 40 });
const S7b = (f: number) => dolly([1.3, 3.0, -2.5], [0, -0.15, 0], pushK(f, 854, 0.0028, 0.005, 25), { fov: 40, roll: -0.03 });
// 8: Gary behind a bush (relieved), then the aerial: the forest pointing right at it
export const HIDE: V3 = [-6.3, 0, -7.4];
const S8a = (f: number) => dolly([HIDE[0] + 1.6, 1.5, HIDE[2] + 3.2], [HIDE[0] + 0.1, 1.3, HIDE[2]], pushK(f, 908, 0.0022), { fov: 40 });
const S8b = (f: number) => dolly([6, 24, -12], [0, 0, 0], pushK(f, 988, 0.0025, 0.012, 50), { fov: 44, roll: 0.03 });
// 9: why: the loosened soil (flashback dig), down into the hole at the rug, the fertilizer sack
const S9a = (f: number) => dolly([3.0, 1.35, -4.7], [0.2, 0.72, -0.95], pushK(f, 1086, 0.0025), { fov: 42, roll: -0.03 });
const S9b = (f: number) => dolly([0.5, 2.6, -1.5], [0, -0.6, 0], pushK(f, 1153, 0.003), { fov: 40, roll: 0.03 });
const S9c = (f: number) => dolly([2.35, 1.15, -3.75], [0.45, 0.3, -0.7], pushK(f, 1220, 0.0025, 0.006, 20), { fov: 42 });
// 10: the lawn
const S10a = (f: number) => dolly([L_[0] + 2.2, 1.55, L_[2] + 6.8], [L_[0] - 0.3, 0.9, L_[2] - 0.8], pushK(f, 1270, 0.0018), { fov: 42 });
const S10b = (f: number) => dolly([SPOT[0] + 0.7, 1.2, SPOT[2] + 2.0], [SPOT[0], 0, SPOT[2]], pushK(f, 1341, 0.0025), { fov: 40 });
const S10c = (f: number) => dolly([SPOT[0] + 1.3, 1.25, SPOT[2] + 3.4], [SPOT[0] - 0.9, 0.45, SPOT[2] - 1.2], pushK(f, 1422, 0.0022, 0.005, 25), { fov: 42, roll: -0.03 });
// 11: mushroom macro, then the corpse finder
const S11a = (f: number) => {
  const u = (f - 1505) / 104;
  return dolly([0.25 + 0.8 * u, 0.42, -1.75 + 0.2 * u], [0.5, 0.08, -0.1], pushK(f, 1505, 0.0015), { fov: 40 });
};
const S11b = (f: number) => dolly([CF[0] + 0.2, 0.2, CF[2] - 0.78], [CF[0], 0.15, CF[2]], pushK(f, 1609, 0.0025, 0.007, 22), { fov: 38 });
const S11c = (f: number) => rolled(S11b, 0.04)(f);
// 12: search team in a line, then the drone
export const DRONE0: V3 = [9, 8.5, -12], DRONE1: V3 = [1.5, 6.2, -3.2];
export const droneAt = (f: number): V3 => {
  const u = smooth((f - 1790) / 100);
  return [DRONE0[0] + (DRONE1[0] - DRONE0[0]) * u, DRONE0[1] + (DRONE1[1] - DRONE0[1]) * u + 0.08 * Math.sin(f * 0.2), DRONE0[2] + (DRONE1[2] - DRONE0[2]) * u];
};
const S12a = (f: number) => dolly([-0.4, 1.5, 0.3], [-5.6, 1.0, 0.0], pushK(f, 1703, 0.002), { fov: 42 });
const S12b = (f: number) => { const d = droneAt(f); return { pos: [d[0] + 2.4, d[1] + 0.9, d[2] - 3.4] as V3, look: [d[0] * 0.55, d[1] - 1.6, d[2] * 0.55 + 0.8] as V3, fov: 42, roll: 0.03 }; };
const S12c = (f: number) => dolly([0.6, 6.6, -1.6], [0, 0, 0], pushK(f, 1878, 0.003, 0.007, 22), { fov: 40 });
// 13: picnic on the perfect green rectangle, a mushroom pops between them, crane out (Gary peeks from a bush)
export const PEEK: V3 = [-4.6, 0, 3.1];
const S13a = (f: number) => dolly([2.5, 2.05, -4.7], [0, 0.4, 0.1], pushK(f, 1914, 0.002), { fov: 42 });
const S13b = (f: number) => dolly([1.45, 1.35, -3.0], [-0.1, 0.3, 0.2], pushK(f, 2025, 0.003, 0.007, 20), { fov: 40, roll: 0.035 });
const S13c = (f: number) => {
  const u = glide((f - 2062) / 53);
  return { pos: [1.45 + 3.2 * u, 1.35 + 6.2 * u, -3.0 - 5.8 * u] as V3, look: [0.05 - 1.6 * u, 0.3 + 0.2 * u, 0.05 + 1.0 * u] as V3, fov: 40 + 6 * u, roll: 0.035 * (1 - u) };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 64, cut: true, s: S1b }, { f: 85, cut: true, s: S1c }, { f: 100, cut: true, s: S1d }],
  2: [{ f: 122, s: S2a }, { f: 183, dur: 24, s: S2b }, { f: 214, cut: true, s: S2c }],
  3: [{ f: 246, s: S3a }, { f: 293, cut: true, s: S3b }, { f: 318, cut: true, s: S3c }, { f: 354, cut: true, s: S3d }, { f: 413, cut: true, s: S3e }],
  4: [{ f: 436, s: S4a }, { f: 525, cut: true, s: S4b }],
  5: [{ f: 562, s: S5a }, { f: 642, cut: true, s: S5b }],
  6: [{ f: 719, s: S6a }, { f: 770, cut: true, s: S6b }],
  7: [{ f: 784, s: S7a }, { f: 854, cut: true, s: S7b }],
  8: [{ f: 904, s: S8a }, { f: 988, cut: true, s: S8b }],
  9: [{ f: 1086, s: S9a }, { f: 1153, cut: true, s: S9b }, { f: 1220, cut: true, s: S9c }],
  10: [{ f: 1266, s: S10a }, { f: 1341, cut: true, s: S10b }, { f: 1422, cut: true, s: S10c }],
  11: [{ f: 1501, s: S11a }, { f: 1609, cut: true, s: S11b }, { f: 1668, dur: 18, s: S11c }],
  12: [{ f: 1703, s: S12a }, { f: 1797, cut: true, s: S12b }, { f: 1878, cut: true, s: S12c }],
  13: [{ f: 1910, s: S13a }, { f: 2025, cut: true, s: S13b }, { f: 2062, cut: true, s: S13c }],
};

// impact kicks: image offset flips sign every frame, decays over 7 f
const KICKS: [number, number][] = [[87 / 30, 0.6], [389 / 30, 0.5], [416 / 30, 0.6], [602 / 30, 0.8], [620 / 30, 1.0], [746 / 30, 0.4], [755 / 30, 0.4],
  [883 / 30, 0.8], [1070 / 30, 0.8], [1225 / 30, 0.7], [1678 / 30, 0.8], [1889 / 30, 0.6], [2040 / 30, 0.7]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 12 }, { f: 64, cInf: 13 }, { f: 85, cInf: 16 }, { f: 100, cInf: 13 },
  { f: 122, cInf: 10 }, { f: 214, cInf: 13 },
  { f: 246, cInf: 0 }, { f: 293, cInf: 10 }, { f: 318, cInf: 12 }, { f: 354, cInf: 6 }, { f: 413, cInf: 13 },
  { f: 440, cInf: 6 }, { f: 525, cInf: 0 },
  { f: 562, cInf: 11 }, { f: 642, dur: 40, cInf: 0 },
  { f: 719, cInf: 14 }, { f: 770, cInf: 5 },
  { f: 788, cInf: 9 }, { f: 854, cInf: 6 },
  { f: 908, cInf: 11 }, { f: 988, cInf: 0 },
  { f: 1086, cInf: 11 }, { f: 1153, cInf: 6 }, { f: 1220, cInf: 11 },
  { f: 1270, cInf: 6 }, { f: 1341, cInf: 10 }, { f: 1422, cInf: 8 },
  { f: 1505, cInf: 15 }, { f: 1609, cInf: 16 },
  { f: 1703, cInf: 9 }, { f: 1797, cInf: 6 }, { f: 1878, cInf: 4 },
  { f: 1914, cInf: 10 }, { f: 2025, cInf: 12 }, { f: 2062, dur: 40, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
