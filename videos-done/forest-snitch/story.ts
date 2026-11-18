// "The Forest Snitch" v2: our original ~63 s short about how nature gives away a hidden grave (hook -> Gary and the rug
// wearing shoes -> the burial -> luckily / unluckily + "three ways" open loop -> snitch 1 the grass, the why, the dog
// analogy -> snitch 2 mushrooms -> snitch 3 the ground sinks -> search teams + drones -> picnic). Shots are timed to the
// narration word onsets (~/forest-short/voice/words.json, frames at 30 fps). The world state (hole, rug, brown grass,
// lush regrowth, mushrooms, sinking) is a pure function of the shot and frame, so any shot can show any moment.
// Camera grammar from the reference study (motion.md): cuts on big jumps, smootherstep glides 18-40 f, every hold
// creeps in, 7-frame flip kicks on impacts, 4-5 deg rolls on emphasis.
export const FPS = 30;
export const TOTAL = 1890;
export const D0 = 0; // ground height (build.ts houses sit on it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
/** overshoot pop 0 -> 1.12 -> 1 */
export const pop = (u: number) => { const x = clamp01(u); return x <= 0 ? 0 : 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2; };
const ramp = (f: number, a: number, b: number) => smooth((f - a) / (b - a));
/** piecewise-linear map (frame -> story frame) */
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

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
export const GHOOK: V3 = [-1.35, 0, 1.3];
export const HIDE: V3 = [-6.3, 0, -7.4];
export const PEEK: V3 = [-4.6, 0, 3.1];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: "forest" | "lawn" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 120, light: "day", place: "forest" },       // hook: you can't hide it from the grass
  { id: 2, a: 120, b: 259, light: "day", place: "forest" },     // meet Gary, the rug is wearing shoes
  { id: 3, a: 259, b: 356, light: "day", place: "forest" },     // buries it, grass back, walks away
  { id: 4, a: 356, b: 560, light: "day", place: "forest" },     // luckily / unluckily, three ways, the creepiest
  { id: 5, a: 560, b: 729, light: "day", place: "forest" },     // snitch 1: brown rectangle
  { id: 6, a: 729, b: 950, light: "day", place: "forest" },     // greener, why: soil, body, fertilizer
  { id: 7, a: 950, b: 1105, light: "day", place: "lawn" },      // the dog analogy
  { id: 8, a: 1105, b: 1323, light: "day", place: "forest" },   // snitch 2: mushrooms, the corpse finder
  { id: 9, a: 1323, b: 1516, light: "day", place: "forest" },   // snitch 3: the ground sinks
  { id: 10, a: 1516, b: 1712, light: "day", place: "forest" },  // search teams, drones
  { id: 11, a: 1712, b: TOTAL, light: "day", place: "forest" }, // picnic callback
];
/** crossfades (frames) at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 5: 10, 7: 8, 8: 8, 11: 8 };
export const FLASH_AT = 120;

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
  sack: number; blanket: boolean; pop: number; // pop = the mushroom that pushes up through the picnic blanket
};
export const MUSH0 = 744;
/** dig cycle 0..1 (shovel down at 1) on the story-frame timeline */
export const DIG_A = 293, DIG_B = 320;
export const digK = (g: number) => 0.5 - 0.5 * Math.cos(((g - DIG_A) / 9) * Math.PI * 2);
const FINAL = { hole: 0, soil: 0, mound: 0, seam: 0.25, dead: 0, lush: 2, tufts: 1, sink: 1, mush: 9999, sack: 0, blanket: false, pop: 0 };
const RUG_GONE = { x: 0, y: -0.6, rot: 0, up: false, vis: false };

/** the patch at story frame g (the dig and the months after it; v1 timeline, remapped per shot below) */
export const patchStory = (g: number): Patch => {
  const hole = g < DIG_A ? 0 : g < 356 ? ramp(g, DIG_A, DIG_B + 4) : 1 - ramp(g, 358, 398);
  const filled = g >= 398;
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
    mush: g, rug, sack: 0, blanket: false, pop: 0,
  };
};
/** shot 3: the burial compressed into four beats (dig, rug rolls in, grass back, walk away) */
export const burialG = (f: number) => lin([[259, 293], [282, 320], [298, 354], [328, 398], [356, 426]], f);
/** what a shot shows at frame f */
export const patchAt = (id: number, f: number): Patch => {
  switch (id) {
    case 1: case 10: return { ...FINAL, rug: RUG_GONE };
    case 2: return { ...patchStory(0), rug: { x: G2[0] + 0.95, y: 0, rot: 0, up: true, vis: true } };
    case 3: return patchStory(burialG(f));
    case 4: return f < 403 ? patchStory(420) : { ...FINAL, rug: RUG_GONE }; // the aerial and the creepy tease are flash-forwards
    case 5: return patchStory(lin([[560, 440], [636, 486], [652, 512], [729, 530]], f));
    case 6: {
      if (f < 803) return patchStory(lin([[729, 566], [738, 571], [752, 599], [760, 608], [768, 618], [776, 626], [803, 640]], f));
      if (f < 859) return patchStory(300 + ((f - 803) % 27)); // dig flashback, looping strokes
      if (f < 898) return { ...patchStory(353), rug: { x: 0, y: -0.62, rot: 5.75, up: false, vis: true } }; // the rug (and shoes) down in the hole
      return { ...patchStory(640), sack: pop((f - 908) / 9) };
    }
    case 7: return patchStory(640);
    case 8: return { ...FINAL, sink: 0, rug: RUG_GONE, mush: f < 1161 ? MUSH0 + (f - 1126) : 9999 };
    case 9: return { ...FINAL, rug: RUG_GONE, sink: smooth((f - 1446) / 34) };
    case 11: return { ...FINAL, sink: 0, rug: RUG_GONE, blanket: true, pop: pop((f - 1816) / 6) };
    default: return patchStory(f);
  }
};
/** Gary walking away after the burial (shot 3, "and walks away") */
export const garyAway = (f: number) => {
  const u = smooth((f - 326) / 36), x0 = 1.0, z0 = -1.3, x1 = -0.7, z1 = -2.4;
  const L = Math.hypot(x1 - x0, z1 - z0);
  return { x: x0 + (x1 - x0) * u, z: z0 + (z1 - z0) * u, dx: (x1 - x0) / L, dz: (z1 - z0) / L, moving: u > 0 && u < 1 };
};
/** kept for the walk-in variant (rug dragged behind Gary) */
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
// 1: hook (flash-forward to the final state): wide on the rectangle -> Gary sweating ("police") -> low push, punch on "grass"
const S1a = (f: number) => dolly([2.6, 1.15, -4.6], [0, 0.15, 0.2], pushK(f, 0, 0.003), { fov: 44 });
const S1d = (f: number) => dolly([GHOOK[0] + 0.5, 1.62, GHOOK[2] - 2.3], [GHOOK[0], 1.42, GHOOK[2]], pushK(f, 37, 0.004), { fov: 36, roll: -0.04 });
const S1b = (f: number) => dolly([1.9, 0.62, -3.0], [0.15, 0.12, 0.3], pushK(f, 60, 0.003, 0.008, 40), { fov: 40, roll: 0.035 });
// 2: meet Gary at the tree line, glide down to the rug, cut to the shoes
const S2a = (f: number) => dolly([G2[0] + 1.2, 1.55, G2[2] - 4.6], [G2[0] + 0.25, 1.15, G2[2]], pushK(f, 120, 0.0022), { fov: 40 });
const S2b = (f: number) => dolly([G2[0] + 1.85, 1.15, G2[2] - 3.1], [G2[0] + 0.85, 0.3, G2[2] - 0.75], pushK(f, 176, 0.0025, 0.006, 24), { fov: 40, roll: 0.03 });
const SHOES: V3 = [G2[0] + 0.82, 0.24, G2[2] - 1.31];
const S2s = (f: number) => dolly([SHOES[0] + 1.2, 0.58, SHOES[2] - 0.85], [SHOES[0] + 0.12, 0.2, SHOES[2] - 0.02], pushK(f, 211, 0.003, 0.009, 30), { fov: 36, roll: -0.035 });
// 3: the burial in four beats
const S3b = (f: number) => dolly([2.9, 1.5, -4.0], [0.2, 0.75, -0.8], pushK(f, 259, 0.0025), { fov: 42, roll: 0.03 });
const S3c = (f: number) => dolly([0.95, 1.25, 3.7], [0.45, -0.15, 0.2], pushK(f, 282, 0.003), { fov: 42, roll: -0.03 });
const S3d = (f: number) => dolly([1.6, 4.6, -3.3], [0, 0, -0.1], pushK(f, 298, 0.0025), { fov: 42 });
const S3w = (f: number) => dolly([2.3, 1.75, 2.9], [-0.4, 0.75, -1.9], pushK(f, 328, 0.002), { fov: 44 });
// 4: Gary behind a bush (relieved) -> aerial, the forest knows -> the creepiest one (a low look at the sunk grave)
const S4a = (f: number) => dolly([HIDE[0] + 1.6, 1.5, HIDE[2] + 3.2], [HIDE[0] + 0.1, 1.3, HIDE[2]], pushK(f, 356, 0.0022), { fov: 40 });
const S4b = (f: number) => dolly([6, 24, -12], [0, 0, 0], pushK(f, 403, 0.0025, 0.009, 60), { fov: 44, roll: 0.03 });
const S4t = (f: number) => dolly([2.2, 0.62, -1.9], [0, -0.12, 0.2], pushK(f, 500, 0.004), { fov: 40, roll: -0.04 });
// 5: snitch 1, weeks later: high 3/4, then straight down on "in a perfect, body-sized rectangle"
const S5a = (f: number) => dolly([2.4, 3.0, -3.9], [0, 0, 0], pushK(f, 556, 0.0018), { fov: 42 });
const S5b = (f: number) => dolly([0.02, 5.2, -0.6], [0, 0, 0], pushK(f, 665, 0.002, 0.005, 25), { fov: 42 });
// 6: greener (low 3/4, kicks), the loosened soil (dig flashback), the rug in the hole, the fertilizer sack
const S6a = (f: number) => dolly([1.7, 0.75, -2.9], [0, 0.12, 0], pushK(f, 729, 0.0025), { fov: 42 });
const S6b = (f: number) => dolly([3.0, 1.35, -4.7], [0.2, 0.72, -0.95], pushK(f, 803, 0.0025), { fov: 42, roll: -0.03 });
const S6c = (f: number) => dolly([0.5, 2.6, -1.5], [0, -0.6, 0], pushK(f, 859, 0.003), { fov: 40, roll: 0.03 });
const S6d = (f: number) => dolly([2.35, 1.15, -3.75], [0.45, 0.3, -0.7], pushK(f, 898, 0.0025, 0.006, 20), { fov: 42 });
// 7: the lawn
const S7a = (f: number) => dolly([L_[0] + 2.2, 1.55, L_[2] + 6.8], [L_[0] - 0.3, 0.9, L_[2] - 0.8], pushK(f, 946, 0.0018), { fov: 42 });
const S7b = (f: number) => dolly([SPOT[0] + 0.7, 1.2, SPOT[2] + 2.0], [SPOT[0], 0, SPOT[2]], pushK(f, 996, 0.0025), { fov: 40 });
const S7c = (f: number) => dolly([SPOT[0] + 1.3, 1.25, SPOT[2] + 3.4], [SPOT[0] - 0.9, 0.45, SPOT[2] - 1.2], pushK(f, 1044, 0.0022, 0.005, 25), { fov: 42, roll: -0.03 });
// 8: snitch 2: mushrooms pop (ground level), macro pan, the corpse finder
const S8a = (f: number) => dolly([1.35, 0.62, -2.1], [0.2, 0.04, 0.1], pushK(f, 1101, 0.003), { fov: 42, roll: 0.03 });
const S8b = (f: number) => {
  const u = (f - 1161) / 90;
  return dolly([0.25 + 0.8 * u, 0.42, -1.75 + 0.2 * u], [0.5, 0.08, -0.1], pushK(f, 1161, 0.0015), { fov: 40 });
};
const S8c = (f: number) => dolly([CF[0] + 0.2, 0.2, CF[2] - 0.78], [CF[0], 0.15, CF[2]], pushK(f, 1251, 0.0025, 0.007, 22), { fov: 38 });
const S8d = (f: number) => rolled(S8c, 0.04)(f);
// 9: snitch 3: the ground sinks (raking sun), then higher on "into the shape of a grave"
const S9a = (f: number) => dolly([2.5, 1.35, -2.4], [0, -0.12, 0.1], pushK(f, 1319, 0.002), { fov: 40 });
const S9b = (f: number) => dolly([1.3, 3.0, -2.5], [0, -0.15, 0], pushK(f, 1469, 0.0028, 0.006, 25), { fov: 40, roll: -0.03 });
// 10: search team in a line, then the drone, then straight down
export const DRONE0: V3 = [9, 8.5, -12], DRONE1: V3 = [1.5, 6.2, -3.2];
export const droneAt = (f: number): V3 => {
  const u = smooth((f - 1586) / 100);
  return [DRONE0[0] + (DRONE1[0] - DRONE0[0]) * u, DRONE0[1] + (DRONE1[1] - DRONE0[1]) * u + 0.08 * Math.sin(f * 0.2), DRONE0[2] + (DRONE1[2] - DRONE0[2]) * u];
};
const S10a = (f: number) => dolly([-0.4, 1.5, 0.3], [-5.6, 1.0, 0.0], pushK(f, 1516, 0.002), { fov: 42 });
const S10b = (f: number) => { const d = droneAt(f); return { pos: [d[0] + 2.4, d[1] + 0.9, d[2] - 3.4] as V3, look: [d[0] * 0.55, d[1] - 1.6, d[2] * 0.55 + 0.8] as V3, fov: 42, roll: 0.03 }; };
const S10c = (f: number) => dolly([0.6, 6.6, -1.6], [0, 0, 0], pushK(f, 1674, 0.003, 0.007, 22), { fov: 40 });
// 11: picnic on the perfect green rectangle, a mushroom pops between them, crane out (Gary peeks from a bush)
const S11a = (f: number) => dolly([2.5, 2.05, -4.7], [0, 0.4, 0.1], pushK(f, 1708, 0.002), { fov: 42 });
const S11b = (f: number) => dolly([1.45, 1.35, -3.0], [-0.1, 0.3, 0.2], pushK(f, 1808, 0.003, 0.007, 20), { fov: 40, roll: 0.035 });
const S11c = (f: number) => {
  const u = glide((f - 1840) / 50);
  return { pos: [1.45 + 3.2 * u, 1.35 + 6.2 * u, -3.0 - 5.8 * u] as V3, look: [-0.1 - 1.5 * u, 0.3 + 0.2 * u, 0.2 + 0.85 * u] as V3, fov: 40 + 6 * u, roll: 0.035 * (1 - u) };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 37, cut: true, s: S1d }, { f: 60, cut: true, s: S1b }],
  2: [{ f: 120, s: S2a }, { f: 176, dur: 22, s: S2b }, { f: 211, cut: true, s: S2s }],
  3: [{ f: 259, s: S3b }, { f: 282, cut: true, s: S3c }, { f: 298, cut: true, s: S3d }, { f: 328, cut: true, s: S3w }],
  4: [{ f: 356, s: S4a }, { f: 403, cut: true, s: S4b }, { f: 500, cut: true, s: S4t }],
  5: [{ f: 556, s: S5a }, { f: 665, cut: true, s: S5b }],
  6: [{ f: 729, s: S6a }, { f: 803, cut: true, s: S6b }, { f: 859, cut: true, s: S6c }, { f: 898, cut: true, s: S6d }],
  7: [{ f: 946, s: S7a }, { f: 996, cut: true, s: S7b }, { f: 1044, cut: true, s: S7c }],
  8: [{ f: 1101, s: S8a }, { f: 1161, cut: true, s: S8b }, { f: 1251, cut: true, s: S8c }, { f: 1290, dur: 18, s: S8d }],
  9: [{ f: 1319, s: S9a }, { f: 1469, cut: true, s: S9b }],
  10: [{ f: 1516, s: S10a }, { f: 1590, cut: true, s: S10b }, { f: 1674, cut: true, s: S10c }],
  11: [{ f: 1708, s: S11a }, { f: 1808, cut: true, s: S11b }, { f: 1840, cut: true, s: S11c }],
};
/** camera cuts / glides (frames) for the sound mix */
export const CUT_FRAMES = [37, 60, 211, 282, 298, 328, 403, 500, 665, 803, 859, 898, 996, 1044, 1161, 1251, 1469, 1590, 1674, 1808, 1840];

// impact kicks: image offset flips sign every frame, decays over 7 f
export const KICK_FRAMES: [number, number][] = [[95, 0.9], [235, 0.6], [318, 0.4], [469, 0.5], [527, 0.7], [650, 0.4], [754, 0.8], [771, 0.9],
  [910, 0.7], [1140, 0.5], [1301, 0.8], [1500, 0.8], [1688, 0.6], [1818, 0.7]];
const KICKS: [number, number][] = KICK_FRAMES.map(([f, g]) => [f / 30, g]);
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
  { f: 0, cInf: 12 }, { f: 37, cInf: 13 }, { f: 60, cInf: 13 },
  { f: 120, cInf: 10 }, { f: 211, cInf: 14 },
  { f: 259, cInf: 10 }, { f: 282, cInf: 12 }, { f: 298, cInf: 6 }, { f: 328, cInf: 8 },
  { f: 356, cInf: 11 }, { f: 403, cInf: 0 }, { f: 500, cInf: 12 },
  { f: 560, cInf: 6 }, { f: 665, cInf: 0 },
  { f: 729, cInf: 11 }, { f: 803, cInf: 11 }, { f: 859, cInf: 6 }, { f: 898, cInf: 11 },
  { f: 950, cInf: 6 }, { f: 996, cInf: 10 }, { f: 1044, cInf: 8 },
  { f: 1105, cInf: 14 }, { f: 1161, cInf: 15 }, { f: 1251, cInf: 16 },
  { f: 1323, cInf: 9 }, { f: 1469, cInf: 6 },
  { f: 1516, cInf: 9 }, { f: 1590, cInf: 6 }, { f: 1674, cInf: 4 },
  { f: 1712, cInf: 10 }, { f: 1808, cInf: 12 }, { f: 1840, dur: 40, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
