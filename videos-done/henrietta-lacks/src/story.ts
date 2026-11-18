// Timeline of the Henrietta Lacks short ("The Woman Who Never Stopped"): shots timed to the voice words
// (videos-done/henrietta-lacks/voice/words.json, Kokoro am_fenrir), the camera grammar of the bridge/Haber shorts (continuous
// slow push-ins, smootherstep glides, cuts on big reframes, 7-frame kicks). One world (world.ts) holds the sets far
// apart: FARM + TOWN (origin, z 60), HOSPITAL (60, -100), LAB (x 200), CELLS (z 800, the microscope world),
// SPACE (z -1500) and LAUNCH (z 300).
export const FPS = 30;
export const TOTAL = 1806;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

export const LAB: V3 = [200, 0, 0];
export const CELLS: V3 = [0, 0, 800];
export const SPACE: V3 = [0, 0, -1500];
export const LAUNCH: V3 = [0, 0, 300];
export const HOSPITAL: V3 = [60, 0, -100];
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];

export const P = {
  portrait: [-4.6, 0, -4.8] as V3,      // Henrietta, hands on hips, in front of the farmhouse
  family: [-5.2, 0, -5.4] as V3,        // with her five children
  field: [3.2, 0, -3.0] as V3,          // in the tobacco aisle
  chair: [-7.6, 0.35, -8.25] as V3,     // the porch rocking chair (October)
  post: [0, 0, 60.5] as V3,             // postman on the town street
  clinic: [12, 0, 59.2] as V3,          // polio vaccine clinic table
  home: [24, 0, 58.6] as V3,            // the family's porch (1973)
  court: [-30, 0, 59.0] as V3,          // courthouse steps (2023)
  crowd: [-14, 0, 70] as V3,            // the protected millions (town square)
  walk: at(HOSPITAL, -1.0, 0, 11.0),    // Henrietta walking up to the hospital
  drum: at(LAB, 1.0, 0, -4.4),          // the roller drum
  gey: at(LAB, -0.3, 0, -3.1),
  kubicek: at(LAB, -1.5, 0, -3.5),
  microscope: at(LAB, -1.2, 0.9, -6.35),
  exam: at(LAB, -4.3, 0, -4.2),
  papers: at(LAB, 3.6, 0, -4.4),
  dna: at(LAB, 2.4, 0.9, -6.35),
  sci: at(LAB, -1.15, 0, -5.45),
  satellite: at(SPACE, 0, 0, 0),
  rocket: at(LAUNCH, 0, 0, 0),
};

export type Light = "day" | "golden" | "night";
export type SetName = "farm" | "town" | "hospital" | "lab" | "cells" | "space" | "launch";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: SetName; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 56, light: "day", set: "farm", sunAz: 70 },
  { id: 2, a: 56, b: 107, light: "day", set: "cells" },
  { id: 3, a: 107, b: 151, light: "day", set: "space", sunAz: 100, sunEl: 20 },
  { id: 4, a: 151, b: 328, light: "day", set: "farm", sunAz: 100 },
  { id: 5, a: 328, b: 441, light: "day", set: "hospital", sunAz: 120 },
  { id: 6, a: 441, b: 583, light: "day", set: "lab", sunAz: 55 },
  { id: 7, a: 583, b: 625, light: "day", set: "lab", sunAz: 55 },
  { id: 8, a: 625, b: 685, light: "day", set: "cells" },
  { id: 9, a: 685, b: 733, light: "day", set: "cells" },
  { id: 10, a: 733, b: 754, light: "day", set: "lab", sunAz: 55 },
  { id: 11, a: 754, b: 882, light: "night", set: "cells" },
  { id: 12, a: 882, b: 941, light: "golden", set: "farm", sunAz: 30, sunEl: 8 },
  { id: 13, a: 941, b: 976, light: "day", set: "lab", sunAz: 55 },
  { id: 14, a: 976, b: 1012, light: "day", set: "lab", sunAz: 55 },
  { id: 15, a: 1012, b: 1058, light: "day", set: "town", sunAz: 110 },
  { id: 16, a: 1058, b: 1104, light: "day", set: "town", sunAz: 70 },
  { id: 17, a: 1104, b: 1127, light: "day", set: "lab", sunAz: 55 },
  { id: 18, a: 1127, b: 1149, light: "day", set: "lab", sunAz: 55 },
  { id: 19, a: 1149, b: 1205, light: "day", set: "launch", sunAz: 110, sunEl: 30 },
  { id: 20, a: 1205, b: 1269, light: "day", set: "lab", sunAz: 55 },
  { id: 21, a: 1269, b: 1328, light: "golden", set: "town", sunAz: 120, sunEl: 12 },
  { id: 22, a: 1328, b: 1380, light: "night", set: "farm" },
  { id: 23, a: 1380, b: 1536, light: "day", set: "town", sunAz: 70 },
  { id: 24, a: 1536, b: 1641, light: "golden", set: "town", sunAz: 110, sunEl: 12 },
  { id: 25, a: 1641, b: 1685, light: "day", set: "lab", sunAz: 55 },
  { id: 26, a: 1685, b: 1736, light: "day", set: "cells" },
  { id: 27, a: 1736, b: TOTAL, light: "golden", set: "farm", sunAz: 120, sunEl: 12 },
];
export const XFADE: Record<number, number> = { 12: 8, 13: 6, 22: 8, 24: 8, 27: 8 };
export const FLASH_AT = 147;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const T = (f: number) => f / FPS;
export const EV = {
  takeSample: T(522), dying: T(640), divide0: T(686), shock: T(735), virus: T(823), hourglassBreak: T(860),
  mail: T(1018), shot: T(1080), ignite: T(1158), liftoff: T(1170), papersFall: T(1236), letter: T(1404),
  settle: T(1585), worldKnows: T(1757),
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
export const add = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];
const C = CELLS;

const CAMS: Record<number, Key[]> = {
  // 1 hook: Henrietta, hands on hips, in front of her farmhouse
  1: [
    { f: 0, s: (f) => dolly(add(P.portrait, 0.7, 1.5, 5.2), add(P.portrait, 0, 1.25, 0), pushK(f, 0, 0.003, 0.007, 30), { fov: 42 }) },
    { f: 22, dur: 28, s: (f) => dolly(add(P.portrait, 0.25, 1.45, 2.7), add(P.portrait, 0, 1.38, 0), pushK(f, 22, 0.003), { fov: 38, roll: -0.04 }) },
  ],
  // 2 the microscope world: her cells, alive and dividing
  2: [{ f: 56, s: (f) => dolly(add(C, 0.4, 3.8, 4.0), add(C, 0, 0.5, 0), pushK(f, 56, 0.004, 0.008, 30), { fov: 44, roll: 0.03 }) }],
  // 3 orbit: the satellite with the glowing tube, Earth below
  3: [{ f: 107, s: (f) => dolly(add(P.satellite, 3.6, 1.4, 6.6), add(P.satellite, -0.2, 0.0, 0), pushK(f, 107, 0.003, 0.007, 30), { fov: 42, roll: -0.05 }) }],
  // 4 1951: the farm wide -> Henrietta and her five children -> in the tobacco
  4: [
    { f: 151, s: (f) => dolly([10, 7.5, 12], [-3, 1.6, -9], pushK(f, 151, 0.0025), { fov: 46 }) },
    { f: 191, cut: true, s: (f) => dolly(add(P.family, 0.6, 1.4, 5.6), add(P.family, 0.1, 1.05, 0), pushK(f, 191, 0.0025), { fov: 42 }) },
    { f: 280, cut: true, s: (f) => dolly(add(P.field, 0.5, 1.55, 3.6), add(P.field, 0, 1.25, 0), pushK(f, 280, 0.003, 0.006, 30), { fov: 40, roll: 0.03 }) },
  ],
  // 5 Johns Hopkins: walking up to the domed hospital -> low wide of the building
  5: [
    { f: 328, s: (f) => dolly(add(P.walk, 1.6, 1.5, 4.2), add(P.walk, -0.2, 1.7, -4), pushK(f, 328, 0.0025), { fov: 44 }) },
    { f: 370, cut: true, s: (f) => zoom(add(HOSPITAL, 5, 1.4, 30), add(HOSPITAL, 0, 9.5, 0), 50, pushK(f, 370, 0.0025, 0.005, 30), { roll: -0.03 }) },
  ],
  // 6 the exam room: doctor and Henrietta -> the sample into a tube -> Henrietta, unaware
  6: [
    { f: 441, s: (f) => dolly(add(P.exam, 1.6, 1.5, 3.6), add(P.exam, 0.4, 1.15, 0), pushK(f, 441, 0.0025), { fov: 42 }) },
    { f: 520, cut: true, s: (f) => dolly(add(P.exam, 1.35, 1.3, 1.9), add(P.exam, 1.0, 1.2, 0.6), pushK(f, 520, 0.003, 0.007, 30), { fov: 36, roll: 0.03 }) },
    { f: 555, cut: true, s: (f) => dolly(add(P.exam, 0.25, 1.32, 2.0), add(P.exam, 0, 1.2, 0.1), pushK(f, 555, 0.0035), { fov: 36 }) },
  ],
  // 7 Gey's lab: the roller drum, Gey with the tube
  7: [{ f: 583, s: (f) => dolly(add(P.gey, 0.55, 1.5, 3.2), add(P.gey, 0.35, 1.2, -0.6), pushK(f, 583, 0.003), { fov: 42 }) }],
  // 8 cells dying (grey), 9 hers dividing (pink)
  8: [{ f: 625, s: (f) => dolly(add(C, -0.4, 3.6, 4.0), add(C, 0, 0.45, 0), pushK(f, 625, 0.003), { fov: 42 }) }],
  9: [{ f: 685, s: (f) => dolly(add(C, 0.3, 3.4, 3.8), add(C, 0, 0.5, 0), pushK(f, 685, 0.003, 0.008, 30), { fov: 42, roll: 0.04 }) }],
  // 10 Gey and Kubicek at the microscope, astonished
  10: [{ f: 733, s: (f) => dolly(add(P.gey, -0.6, 1.5, 3.0), add(P.gey, -0.6, 1.38, -0.2), pushK(f, 733, 0.004, 0.008, 20), { fov: 40, roll: -0.04 }) }],
  // 11 explanation (blue): the countdown hourglass, the virus breaks it
  11: [
    { f: 754, s: (f) => dolly(add(C, 0.3, 1.7, 6.4), add(C, 0, 0.95, 0), pushK(f, 754, 0.0025), { fov: 40 }) },
    { f: 821, dur: 24, s: (f) => dolly(add(C, 0.15, 1.6, 5.0), add(C, 0.2, 0.95, 0), pushK(f, 821, 0.003), { fov: 38, roll: 0.04 }) },
  ],
  // 12 October dusk: the porch, an empty rocking chair, falling leaves
  12: [{ f: 878, s: (f) => dolly(add(P.chair, 2.4, 1.0, 5.4), add(P.chair, 0, 0.55, 0), pushK(f, 878, 0.0018), { fov: 40 }) }],
  // 13 the drum spins on: rows of tubes
  13: [{ f: 938, s: (f) => dolly(add(P.drum, 1.6, 1.45, 2.4), add(P.drum, 0, 1.1, 0), pushK(f, 938, 0.003), { fov: 40, roll: -0.03 }) }],
  // 14 Kubicek holds up a tube: HeLa
  14: [{ f: 976, s: (f) => dolly(add(P.kubicek, 0.4, 1.5, 2.4), add(P.kubicek, 0.15, 1.45, 0), pushK(f, 976, 0.003, 0.007, 30), { fov: 38, roll: 0.04 }) }],
  // 15 mailed around the world: the postman with a crate of tubes
  15: [{ f: 1012, s: (f) => dolly(add(P.post, 0.3, 1.5, 6.5), add(P.post, 0.3, 1.2, 0), pushK(f, 1012, 0.0025), { fov: 44 }) }],
  // 16 polio vaccine clinic: the nurse and the line of kids
  16: [{ f: 1058, s: (f) => dolly(add(P.clinic, 1.2, 1.35, 4.2), add(P.clinic, 0.65, 1.0, 0.2), pushK(f, 1058, 0.003, 0.006, 30), { fov: 42 }) }],
  // 17 cancer research at the microscope, 18 the DNA model
  17: [{ f: 1104, s: (f) => dolly(add(P.sci, 1.3, 1.5, 2.6), add(P.sci, 0.2, 1.25, -0.4), pushK(f, 1104, 0.004), { fov: 40, roll: -0.03 }) }],
  18: [{ f: 1127, s: (f) => dolly(add(P.dna, 0.3, 0.45, 1.6), add(P.dna, 0, 0.42, 0), pushK(f, 1127, 0.004, 0.008, 20), { fov: 38, roll: 0.04 }) }],
  // 19 the launch: rocket lifts off; the camera tilts up after it
  19: [{ f: 1149, s: (f) => { const u = glide((f - 1166) / 36); return { pos: add(P.rocket, 26, 5.5, 34), look: add(P.rocket, 0, 10 + 22 * u, 0), fov: 46, roll: 0 }; } }],
  // 20 a hundred thousand studies: the paper tower
  20: [{ f: 1205, s: (f) => { const u = glide((f - 1209) / 40); return dolly(add(P.papers, 1.4, 1.4 + 2.2 * u, 3.6 + 1.0 * u), add(P.papers, 0, 1.3 + 2.4 * u, 0), 1, { fov: 44 }); } }],
  // 21 golden: the protected millions (town square crowd), crane up
  21: [
    { f: 1269, s: (f) => dolly(add(P.crowd, 6.5, 1.8, 6.0), add(P.crowd, 0, 1.4, 0), pushK(f, 1269, 0.002), { fov: 42 }) },
    { f: 1285, s: (f) => { const u = glide((f - 1285) / 40); return { pos: add(P.crowd, 6.5 + 3 * u, 1.8 + 6 * u, 6.0 + 6 * u), look: add(P.crowd, 0, 1.4 - 0.6 * u, -1 * u), fov: 42 + 4 * u, roll: 0 }; } },
  ],
  // 22 night: Henrietta alone in front of the farmhouse, slow push ("nobody ever asked her")
  22: [{ f: 1324, s: (f) => dolly(add(P.portrait, 0.3, 1.45, 3.4), add(P.portrait, 0, 1.38, 0), pushK(f, 1324, 0.003), { fov: 38 }) }],
  // 23 1973: the family on their porch with a letter -> wider ("for decades")
  23: [
    { f: 1380, s: (f) => dolly(add(P.home, 0.4, 1.5, 4.8), add(P.home, 0, 1.2, -0.4), pushK(f, 1380, 0.0025, 0.006, 30), { fov: 42 }) },
    { f: 1483, cut: true, s: (f) => dolly(add(P.home, 5.0, 2.6, 10), add(P.home, 0, 2.2, -2), pushK(f, 1483, 0.0018), { fov: 44 }) },
  ],
  // 24 2023: the family on the courthouse steps
  24: [
    { f: 1532, s: (f) => dolly(add(P.court, 1.5, 2.2, 9.5), add(P.court, 0, 3.0, -2), pushK(f, 1532, 0.002), { fov: 46 }) },
    { f: 1585, cut: true, s: (f) => dolly(add(P.court, 0.5, 1.5, 4.5), add(P.court, 0, 1.3, 0), pushK(f, 1585, 0.003, 0.006, 30), { fov: 42, roll: -0.03 }) },
  ],
  // 25 right now: a scientist at a modern microscope
  25: [{ f: 1641, s: (f) => dolly(add(P.sci, -1.0, 1.45, 2.6), add(P.sci, 0.1, 1.3, -0.4), pushK(f, 1641, 0.003), { fov: 40 }) }],
  // 26 still dividing
  26: [{ f: 1685, s: (f) => dolly(add(C, 0.2, 3.2, 3.6), add(C, 0, 0.5, 0), pushK(f, 1685, 0.004), { fov: 42, roll: -0.03 }) }],
  // 27 golden: Henrietta, smiling, hands on hips; slow push to a close-up, ends on "name"
  27: [
    { f: 1732, s: (f) => dolly(add(P.portrait, 0.8, 1.55, 5.4), add(P.portrait, 0, 1.3, 0), pushK(f, 1732, 0.003, 0.006, 30), { fov: 42 }) },
    { f: 1755, dur: 34, s: (f) => dolly(add(P.portrait, 0.25, 1.45, 2.5), add(P.portrait, 0, 1.4, 0), pushK(f, 1755, 0.0035), { fov: 36, roll: 0.035 }) },
  ],
};

const KICKS: [number, number][] = [[EV.liftoff, 0.9], [EV.liftoff + 0.25, 0.7], [EV.papersFall, 0.5], [EV.hourglassBreak, 0.4]];
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
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: () => add(P.portrait, 0, 1.4, 0) },
  { f: 56, cInf: 0 },
  { f: 107, cInf: 6 },
  { f: 151, cInf: 0 },
  { f: 191, cInf: 8, focus: () => add(P.family, 0, 1.4, 0) },
  { f: 280, cInf: 11, focus: () => add(P.field, 0, 1.4, 0) },
  { f: 328, cInf: 6, focus: () => add(P.walk, 0, 1.4, 0) },
  { f: 370, cInf: 0 },
  { f: 441, cInf: 8, focus: () => add(P.exam, 0.5, 1.3, 0.3) },
  { f: 520, cInf: 14 },
  { f: 555, cInf: 12, focus: () => add(P.exam, 0, 1.25, 0.1) },
  { f: 583, cInf: 9, focus: () => add(P.gey, 0, 1.4, 0) },
  { f: 625, cInf: 0 },
  { f: 733, cInf: 12, focus: () => add(P.gey, -0.3, 1.4, 0) },
  { f: 754, cInf: 0 },
  { f: 882, cInf: 6 },
  { f: 941, cInf: 10 },
  { f: 976, cInf: 13, focus: () => add(P.kubicek, 0, 1.45, 0) },
  { f: 1012, cInf: 6, focus: () => add(P.post, 0.3, 1.3, 0) },
  { f: 1058, cInf: 8, focus: () => add(P.clinic, 0.8, 1.2, 0.3) },
  { f: 1104, cInf: 10, focus: () => add(P.sci, 0, 1.4, 0) },
  { f: 1127, cInf: 14 },
  { f: 1149, cInf: 0 },
  { f: 1205, cInf: 6 },
  { f: 1269, cInf: 0 },
  { f: 1328, cInf: 12, focus: () => add(P.portrait, 0, 1.4, 0) },
  { f: 1380, cInf: 8, focus: () => add(P.home, 0, 1.3, 0) },
  { f: 1483, cInf: 0 },
  { f: 1536, cInf: 0 },
  { f: 1585, cInf: 9, focus: () => add(P.court, 0, 1.4, 0) },
  { f: 1641, cInf: 10, focus: () => add(P.sci, 0, 1.4, 0) },
  { f: 1685, cInf: 0 },
  { f: 1736, cInf: 13, focus: () => add(P.portrait, 0, 1.4, 0) },
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
