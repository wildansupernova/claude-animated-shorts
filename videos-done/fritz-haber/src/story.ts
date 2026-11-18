// Timeline of the Haber short ("Bread and Bombs from Thin Air"): shots timed to the voice words
// (videos-done/fritz-haber/voice/words.json, Kokoro am_fenrir), story time per shot and the camera grammar of the bridge short:
// continuous slow push-ins; symmetric smootherstep glides 18-40 f; big reframes are cuts; impacts are 7-frame kicks.
// One world (world.ts) holds five sets far apart: FARM (origin), LAB (x 200), SEA (x -300), TRENCH (z 300, with the
// night CAMP at x 80) and ALPS (z -400). Each shot's cameras look at one set.
export const FPS = 30;
export const TOTAL = 2051;
export const D0 = 0; // ground height (build.ts houses stand on D0)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- sets ----------------
export const LAB: V3 = [200, 0, 0];
export const SEA: V3 = [-300, 0, 0];
export const TRENCH: V3 = [0, 0, 300];
export const CAMP: V3 = [80, 0, 300];
export const ALPS: V3 = [0, 0, -400];
export const FACTORY: V3 = [60, 0, -100];
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];

// key positions shared by world.ts (props) and cast.ts (characters)
export const P = {
  haberFarm: [0, 0, 2] as V3,          // hook + ending, on the farm path
  farmer: [11, 0, -22] as V3,          // empty sack, in front of the barn
  kid: [-10, 0, -17] as V3,            // the big breath, in the clearing by the farmhouse
  sprout: [-8.9, 0, -15.6] as V3,      // sprout vs. molecule (ground level)
  crowd: [-15, 0, 20] as V3,           // the fed crowd on the meadow
  picnic: [-12, 0, 15] as V3,          // the kid at the picnic table (ending)
  walker: [0, 0, -7.8] as V3,          // Haber leaves along the road (z of the road)
  haberLab: at(LAB, -1.15, 0, -2.6),
  machine: at(LAB, 0.2, 0, -4.4),
  gauge: at(LAB, 0.62, 2.05, -4.14),
  furnace: at(LAB, 0.2, 1.25, -4.0),
  spout: at(LAB, 1.2, 1.34, -4.0),
  flask: at(LAB, 1.2, 0.86, -4.0),
  compressor: at(LAB, -0.9, 0, -4.5),
  clara: at(LAB, -4.4, 0, -5.3),
  stool: at(LAB, -4.0, 0, -5.55),
  lamp: at(LAB, -5.2, 0.9, -6.45),
  claraFlask: at(LAB, -3.6, 0.9, -6.3),
  photo: at(LAB, -3.2, 0.9, -6.45),
  candle: at(LAB, -2.88, 0.9, -6.25),
  scientist: at(LAB, 3.3, 0, -5.0),
  plant: at(LAB, 4.3, 0.9, -6.35),
  can: at(LAB, 2.6, 0.9, -6.4),
  island: at(SEA, 0, 0, -25),
  merchant: at(SEA, -6, 0, -6),
  haberTrench: at(TRENCH, 0, 0, 298.6 - 300),
  gun: at(TRENCH, 14, 0, -8),
  french: at(TRENCH, 0, 0, 60.6),
  campCan: at(CAMP, -0.4, 0.62, 5.2),
  poster: at(ALPS, -1.7, 0, -4),
  haberAlps: at(ALPS, 1.2, 0, -6),
  hideTree: at(ALPS, 4.2, 0, -8.6),
  worker: at(FACTORY, 1.3, 0, 3.6),
  chute: at(FACTORY, 0, 2.9, -1.6),
};

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: "farm" | "lab" | "sea" | "trench" | "camp" | "alps" | "factory"; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 51, light: "day", set: "farm", sunAz: 60 },
  { id: 2, a: 51, b: 104, light: "golden", set: "trench", sunAz: 65, sunEl: 14 },
  { id: 3, a: 104, b: 146, light: "day", set: "lab", sunAz: 55 },
  { id: 4, a: 146, b: 233, light: "day", set: "farm", sunAz: 110 },
  { id: 5, a: 233, b: 361, light: "day", set: "sea" },
  { id: 6, a: 361, b: 497, light: "day", set: "farm" },
  { id: 7, a: 497, b: 740, light: "day", set: "lab", sunAz: 55 },
  { id: 8, a: 740, b: 777, light: "day", set: "lab", sunAz: 55 },
  { id: 9, a: 777, b: 842, light: "day", set: "farm", sunAz: 120 },
  { id: 10, a: 842, b: 943, light: "day", set: "factory" },
  { id: 11, a: 943, b: 1043, light: "day", set: "sea", sunAz: 100 },
  { id: 12, a: 1043, b: 1081, light: "golden", set: "trench", sunAz: 60, sunEl: 14 },
  { id: 13, a: 1081, b: 1275, light: "golden", set: "trench", sunAz: 65, sunEl: 14 },
  { id: 14, a: 1275, b: 1387, light: "night", set: "lab" },
  { id: 15, a: 1387, b: 1444, light: "golden", set: "farm", sunAz: 125, sunEl: 14 },
  { id: 16, a: 1444, b: 1570, light: "day", set: "alps" },
  { id: 17, a: 1570, b: 1632, light: "day", set: "alps" },
  { id: 18, a: 1632, b: 1743, light: "day", set: "lab", sunAz: 60 },
  { id: 19, a: 1743, b: 1822, light: "night", set: "camp" },
  { id: 20, a: 1822, b: 1881, light: "night", set: "lab" },
  { id: 21, a: 1881, b: 1987, light: "golden", set: "farm", sunAz: 30, sunEl: 9 },
  { id: 22, a: 1987, b: TOTAL, light: "golden", set: "farm", sunAz: 20, sunEl: 8 },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 9: 8, 14: 8, 15: 8, 16: 8, 18: 6, 19: 8, 21: 8 };
export const FLASH_AT = 144;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story events (seconds) ----------------
export const T = (f: number) => f / FPS;
export const EV = {
  sackLook: T(196), poopWar: T(309), cannon: T(342), breath: T(392), hammer: T(462), dazed: T(484),
  pump: T(560), heat: T(629), drip0: T(712), drip1: T(732), flaskUp: T(744), sparkle: T(762),
  shell: T(906), warship0: T(950), warshipStop: T(1012), gun1: T(1054), gun2: T(1065),
  valves: T(1160), cloud0: T(1162), french: T(1236), claraGone: T(1356), beard: T(1511), hide: T(1533),
  medal: T(1594), bugs: T(1676), halfBody: T(1916), pull: T(1958),
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixc = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixc(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const add = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];

const H1 = P.haberFarm, L = P.haberLab, TR = P.haberTrench;
const CAMS: Record<number, Key[]> = {
  // 1 hook, farm: Haber in the wheat, villagers with bread behind him ("saved billions of lives")
  1: [
    { f: 0, s: (f) => dolly(add(H1, 0.9, 1.7, 6.2), add(H1, 0, 1.45, -1.5), pushK(f, 0, 0.003, 0.006, 30), { fov: 40 }) },
    { f: 20, dur: 26, s: (f) => dolly(add(H1, 0.35, 1.45, 3.4), add(H1, 0, 1.38, 0), pushK(f, 20, 0.003), { fov: 38, roll: -0.04 }) },
  ],
  // 2 trench at golden hour, the cloud rising over the parapet behind him ("helped kill millions")
  2: [
    { f: 51, s: (f) => dolly(add(TR, 0.8, 1.45, -2.7), add(TR, 0, 1.6, 1.2), pushK(f, 51, 0.003, 0.007, 30), { fov: 42, roll: 0.03 }) },
    { f: 82, dur: 22, s: (f) => dolly(add(TR, 0.3, 1.45, -1.9), add(TR, 0, 1.45, 0.3), pushK(f, 82, 0.003), { fov: 38, roll: -0.04 }) },
  ],
  // 3 lab: the flask of "air" held up, close
  3: [{ f: 104, s: (f) => dolly(add(L, 0.4, 1.52, 2.35), add(L, 0.14, 1.5, 0), pushK(f, 104, 0.003, 0.007, 30), { fov: 38, roll: 0.04 }) }],
  // 4 farm establishing (1909) -> the farmer with the empty sack
  4: [
    { f: 146, s: (f) => dolly([16, 9.5, 14], [6, 1.5, -24], pushK(f, 146, 0.0025), { fov: 46 }) },
    { f: 196, cut: true, s: (f) => dolly(add(P.farmer, -1.2, 1.55, 4.0), add(P.farmer, 0, 1.3, 0), pushK(f, 196, 0.003, 0.007, 30), { fov: 40, roll: 0.035 }) },
  ],
  // 5 sea: the guano island and its birds -> the tug of war on top ("go to war over it")
  5: [
    { f: 233, s: (f) => dolly(add(P.island, 4, 6.0, 17), add(P.island, 0, 4.2, 2), pushK(f, 233, 0.0025), { fov: 44 }) },
    { f: 290, dur: 30, s: (f) => dolly(add(P.island, 4.5, 5.0, 13), add(P.island, 0, 3.6, 4), pushK(f, 290, 0.0025), { fov: 42 }) },
    { f: 309, cut: true, s: (f) => dolly(add(P.island, 0.5, 4.5, 11.8), add(P.island, 0, 4.0, 5), pushK(f, 309, 0.003, 0.007, 30), { fov: 40, roll: -0.04 }) },
    { f: 340, dur: 18, s: rolled((f) => dolly(add(P.island, 0.5, 4.5, 11.8), add(P.island, 0, 4.0, 5), pushK(f, 309, 0.003, 0.007, 30), { fov: 40 }), 0.04) },
  ],
  // 6 the big breath (nitrogen everywhere) -> the sprout that cannot crack the molecule
  6: [
    { f: 361, s: (f) => dolly(add(P.kid, 1.6, 1.25, 4.6), add(P.kid, 0, 1.15, 0), pushK(f, 361, 0.0025), { fov: 42 }) },
    { f: 392, dur: 24, s: (f) => dolly(add(P.kid, 0.4, 1.1, 2.5), add(P.kid, 0, 1.12, 0), pushK(f, 392, 0.003, 0.006, 30), { fov: 38, roll: 0.03 }) },
    { f: 453, cut: true, s: (f) => dolly(add(P.sprout, 0.35, 0.3, 1.45), add(P.sprout, 0, 0.26, 0), pushK(f, 453, 0.003, 0.006, 30), { fov: 36 }) },
  ],
  // 7 the lab: stubborn Haber -> gauge -> furnace -> the machine -> the drip
  7: [
    { f: 497, s: (f) => dolly(add(L, 1.6, 1.75, 3.2), add(L, -0.2, 1.45, -0.4), pushK(f, 497, 0.0025), { fov: 42 }) },
    { f: 530, dur: 24, s: (f) => dolly(add(L, 0.5, 1.45, 1.6), add(L, 0, 1.4, 0), pushK(f, 530, 0.003, 0.006, 30), { fov: 38, roll: -0.04 }) },
    { f: 560, cut: true, s: (f) => dolly(add(P.gauge, 0.25, 0.05, 1.05), P.gauge, pushK(f, 560, 0.003, 0.007, 30), { fov: 36, roll: 0.03 }) },
    { f: 629, cut: true, s: (f) => dolly(add(P.furnace, -0.9, 0.15, 2.1), add(P.furnace, 0, 0.1, 0), pushK(f, 629, 0.003), { fov: 40 }) },
    { f: 684, cut: true, s: (f) => dolly(add(P.machine, 2.8, 1.9, 4.6), add(P.machine, 0.2, 1.3, 0), pushK(f, 684, 0.0025), { fov: 42 }) },
    { f: 704, cut: true, s: (f) => dolly(add(P.spout, 0.35, -0.12, 0.95), add(P.spout, 0, -0.26, 0), pushK(f, 704, 0.003, 0.006, 30), { fov: 36 }) },
  ],
  // 8 "Fertilizer, out of thin air": the flask up, roll
  8: [
    { f: 740, s: (f) => dolly(add(L, 0.4, 1.5, 2.4), add(L, 0.15, 1.5, 0), pushK(f, 740, 0.003, 0.007, 30), { fov: 40, roll: -0.04 }) },
    { f: 752, dur: 20, s: rolled((f) => dolly(add(L, 0.4, 1.5, 2.4), add(L, 0.15, 1.5, 0), pushK(f, 740, 0.003, 0.007, 30), { fov: 40 }), 0.04) },
  ],
  // 9 the fed crowd: crane up and back
  9: [
    { f: 773, s: (f) => dolly(add(P.crowd, 7.5, 1.9, 4.5), add(P.crowd, 0, 1.5, -0.5), pushK(f, 773, 0.002), { fov: 42 }) },
    { f: 800, s: (f) => { const u = glide((f - 800) / 42); return { pos: add(P.crowd, 7.5 + 5 * u, 1.9 + 9 * u, 4.5 + 9 * u), look: add(P.crowd, -1 * u, 1.5 - 0.8 * u, -0.5 - 2 * u), fov: 42 + 4 * u, roll: 0 }; } },
  ],
  // 10 the factory chute: sacks... then a shell
  10: [
    { f: 842, s: (f) => dolly(add(P.worker, 4.6, 1.6, 5.2), add(P.worker, -0.9, 1.35, -1.8), pushK(f, 842, 0.0025), { fov: 42 }) },
    { f: 905, cut: true, s: (f) => dolly(add(P.worker, 1.0, 1.45, 3.1), add(P.worker, -0.75, 1.2, -0.7), pushK(f, 905, 0.003, 0.007, 30), { fov: 38, roll: 0.04 }) },
  ],
  // 11 blockade: the grey warship steams in front of the nitrate clipper
  11: [
    { f: 943, s: (f) => dolly(add(P.merchant, 7, 3.8, 34), add(P.merchant, 2, 3.2, 0), pushK(f, 943, 0.002), { fov: 40 }) },
    { f: 1012, cut: true, s: (f) => dolly(add(P.merchant, 0.15, 3.15, 7.6), add(P.merchant, -0.35, 2.75, 0.55), pushK(f, 1012, 0.003, 0.006, 30), { fov: 38, roll: -0.03 }) },
  ],
  // 12 the field gun fires twice (kicks)
  12: [{ f: 1043, s: (f) => dolly(add(P.gun, 6.5, 1.4, -2.2), add(P.gun, 0.4, 1.3, 1.0), pushK(f, 1043, 0.003), { fov: 42, roll: 0.03 }) }],
  // 13 Ypres: Haber with the watch -> wide over the trench -> the cylinders -> the cloud reaching the French line
  13: [
    { f: 1081, s: (f) => dolly(add(TR, 0.7, 1.55, -2.2), add(TR, 0.1, 1.55, 0.2), pushK(f, 1081, 0.003, 0.006, 30), { fov: 38, roll: 0.03 }) },
    { f: 1111, cut: true, s: (f) => dolly(add(TR, -4.2, 3.4, -5.6), add(TR, 0.6, 1.0, 2.6), pushK(f, 1111, 0.002), { fov: 46 }) },
    { f: 1157, cut: true, s: (f) => { const u = (f - 1157) / 72; return dolly([TR[0] - 5 + 3 * u, 2.7, TR[2] - 1.4], [TR[0] - 2 + 3 * u, 1.0, TR[2] + 3.2], pushK(f, 1157, 0.0015), { fov: 46, roll: -0.03 }); } },
    { f: 1229, cut: true, s: (f) => dolly(add(P.french, 0.8, 1.7, 6.0), add(P.french, 0, 1.45, -6), pushK(f, 1229, 0.003, 0.006, 30), { fov: 44, roll: 0.04 }) },
  ],
  // 14 night lab: Clara at her bench -> the empty bench
  14: [
    { f: 1271, s: (f) => dolly(add(P.clara, 1.1, 1.6, 3.0), add(P.clara, -0.2, 1.4, -0.4), pushK(f, 1271, 0.0025), { fov: 40 }) },
    { f: 1320, dur: 30, s: (f) => dolly(add(P.clara, 0.5, 1.5, 1.9), add(P.clara, 0, 1.4, 0), pushK(f, 1320, 0.002), { fov: 38, roll: 0.02 }) },
    { f: 1356, cut: true, s: (f) => dolly(add(P.clara, 0.9, 1.5, 3.4), add(P.clara, -0.2, 1.1, -0.6), pushK(f, 1356, 0.0018), { fov: 40 }) },
  ],
  // 15 golden morning: Haber walks off along the road with a suitcase
  15: [{ f: 1383, s: (f) => dolly(add(P.walker, 0.4, 1.35, 6.5), add(P.walker, 0.1, 1.2, 0), pushK(f, 1383, 0.002), { fov: 44 }) }],
  // 16 alps: the wanted poster -> Haber grows a beard -> pull back: hiding behind a pine
  16: [
    { f: 1440, s: (f) => dolly(add(P.poster, 0.2, 1.62, 1.6), add(P.poster, 0, 1.55, 0), pushK(f, 1440, 0.003, 0.006, 30), { fov: 38, roll: -0.03 }) },
    { f: 1504, cut: true, s: (f) => dolly(add(P.haberAlps, 0.3, 1.45, 2.5), add(P.haberAlps, 0, 1.38, 0), pushK(f, 1504, 0.003, 0.007, 30), { fov: 38 }) },
    { f: 1533, cut: true, s: (f) => dolly(add(P.hideTree, -1.1, 1.65, 5.2), add(P.hideTree, 0.35, 1.55, -1), pushK(f, 1533, 0.0025), { fov: 44, roll: 0.03 }) },
  ],
  // 17 the Nobel Prize arrives by post
  17: [
    { f: 1570, s: (f) => dolly(add(P.haberAlps, -0.55, 1.55, 4.8), add(P.haberAlps, -0.6, 1.3, 0), pushK(f, 1570, 0.0025), { fov: 42 }) },
    { f: 1594, cut: true, s: (f) => dolly(add(P.haberAlps, 0.2, 1.55, 2.3), add(P.haberAlps, 0, 1.5, 0), pushK(f, 1594, 0.003, 0.007, 30), { fov: 38, roll: 0.04 }) },
  ],
  // 18 pest research -> the can
  18: [
    { f: 1629, s: (f) => dolly(add(P.scientist, -0.6, 1.6, 3.1), add(P.scientist, 0.4, 1.25, -0.6), pushK(f, 1629, 0.0025), { fov: 42 }) },
    { f: 1703, cut: true, s: (f) => dolly(add(P.can, 0.2, 0.22, 1.0), add(P.can, 0, 0.17, 0), pushK(f, 1703, 0.003, 0.006, 30), { fov: 36 }) },
  ],
  // 19 night camp: the can in front of the fence and the tower
  19: [{ f: 1739, s: (f) => zoom(add(P.campCan, 0.08, 0.45, -1.7), add(P.campCan, 0.0, 0.62, 6), 44, pushK(f, 1739, 0.0022)) }],
  // 20 night lab: the family photo and the candle
  20: [{ f: 1822, s: (f) => dolly(add(P.photo, 0.35, 0.3, 1.25), add(P.photo, 0.15, 0.22, 0), pushK(f, 1822, 0.0022), { fov: 38 }) }],
  // 21 golden: the kid at the picnic table, nitrogen raining into the bread -> into him
  21: [
    { f: 1877, s: (f) => dolly(add(P.picnic, 3.0, 1.4, 3.6), add(P.picnic, 0.9, 1.0, 0.1), pushK(f, 1877, 0.0025), { fov: 42 }) },
    { f: 1916, dur: 24, s: (f) => dolly(add(P.picnic, 1.55, 1.15, 2.2), add(P.picnic, 1.15, 1.0, 0.25), pushK(f, 1916, 0.003, 0.006, 30), { fov: 38, roll: -0.04 }) },
    { f: 1958, dur: 30, s: (f) => dolly(add(P.picnic, 2.0, 0.85, 3.0), add(P.picnic, 1.1, 2.2, -0.3), pushK(f, 1958, 0.002), { fov: 44, roll: 0 }) },
  ],
  // 22 the father of chemical warfare, back in the golden wheat: slow push to a close-up, ends on the last word
  22: [
    { f: 1987, s: (f) => dolly(add(H1, 0.8, 1.55, 5.0), add(H1, 0, 1.35, 0), pushK(f, 1987, 0.003, 0.006, 30), { fov: 40 }) },
    { f: 2010, dur: 34, s: (f) => dolly(add(H1, 0.25, 1.45, 2.4), add(H1, 0, 1.4, 0), pushK(f, 2010, 0.0035), { fov: 36, roll: 0.035 }) },
  ],
};

// impact kicks: image offset flips sign every frame, decays to 0 in 7 f
const KICKS: [number, number][] = [[EV.cannon, 0.7], [EV.shell, 0.8], [EV.gun1, 1.5], [EV.gun2, 1.5], [EV.beard, 0.4], [EV.medal, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ld = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ld * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
/** cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = sharp. focus = world point (else look point) */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 13, focus: () => add(H1, 0, 1.42, 0) },
  { f: 51, cInf: 12, focus: () => add(TR, 0, 1.45, 0) },
  { f: 104, cInf: 14 },
  { f: 146, cInf: 0 },
  { f: 196, cInf: 11, focus: () => add(P.farmer, 0, 1.4, 0) },
  { f: 233, cInf: 0 },
  { f: 361, cInf: 9, focus: () => add(P.kid, 0, 1.2, 0) },
  { f: 453, cInf: 15 },
  { f: 497, cInf: 8, focus: () => add(L, 0, 1.42, 0) },
  { f: 530, dur: 24, cInf: 12, focus: () => add(L, 0, 1.42, 0) },
  { f: 560, cInf: 14 },
  { f: 629, cInf: 10 },
  { f: 684, cInf: 0 },
  { f: 704, cInf: 15 },
  { f: 740, cInf: 13, focus: () => add(L, 0, 1.5, 0) },
  { f: 777, cInf: 0 },
  { f: 842, cInf: 6, focus: () => add(P.worker, 0, 1.4, 0) },
  { f: 905, cInf: 11, focus: () => add(P.worker, 0, 1.4, 0) },
  { f: 943, cInf: 0 },
  { f: 1012, cInf: 10, focus: () => add(P.merchant, -0.35, 2.9, 0.55) },
  { f: 1043, cInf: 0 },
  { f: 1081, cInf: 12, focus: () => add(TR, 0, 1.45, 0) },
  { f: 1111, cInf: 0 },
  { f: 1157, cInf: 8 },
  { f: 1229, cInf: 8, focus: () => add(P.french, 0, 1.5, 0) },
  { f: 1275, cInf: 8, focus: () => add(P.clara, 0, 1.42, 0) },
  { f: 1356, cInf: 6 },
  { f: 1387, cInf: 0 },
  { f: 1444, cInf: 10 },
  { f: 1504, cInf: 12, focus: () => add(P.haberAlps, 0, 1.42, 0) },
  { f: 1533, cInf: 0 },
  { f: 1570, cInf: 6 },
  { f: 1594, cInf: 12, focus: () => add(P.haberAlps, 0, 1.42, 0) },
  { f: 1632, cInf: 8, focus: () => add(P.scientist, 0, 1.4, 0) },
  { f: 1703, cInf: 15 },
  { f: 1743, cInf: 10, focus: () => P.campCan },
  { f: 1822, cInf: 14 },
  { f: 1881, cInf: 8, focus: () => add(P.picnic, 1.15, 1.0, 0.25) },
  { f: 1916, dur: 24, cInf: 12, focus: () => add(P.picnic, 1.15, 1.0, 0.25) },
  { f: 1958, dur: 30, cInf: 5, focus: () => add(P.picnic, 1.15, 1.0, 0.25) },
  { f: 1987, cInf: 13, focus: () => add(H1, 0, 1.42, 0) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
