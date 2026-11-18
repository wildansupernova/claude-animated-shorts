// Shot table of the recap, timed to the narration (voice/words.json, frames at 30 fps). Camera grammar from the
// skill: hard cuts on big reframes, smootherstep glides of 18-40 f, every hold creeps in (0.15-0.35 %/f, ~0.6 %/f on
// punch words), 4-5 deg rolls on emphasis, flip-sign impact kicks over 7 f. Every reaction lands 0-3 f before its word.
import type { PlaceId, Handles } from "./sets";
import type { LookId } from "./looks";
import type { CastId, Pose, HeroOpts } from "./heroes";
import type { Expr } from "./toon";
import * as THREE from "three";

export const FPS = 30;
export const TOTAL = 5840;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const at = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const sm = (f: number, a: number, b: number) => smooth(at(f, a, b));
const L = (a: number, b: number, t: number) => a + (b - a) * t;
const L3 = (a: V3, b: V3, t: number): V3 => [L(a[0], b[0], t), L(a[1], b[1], t), L(a[2], b[2], t)];
const hsh = (i: number, k = 0) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
/** step function over frames: [[f0, v0], [f1, v1], ...] */
const ex = <T,>(f: number, steps: [number, T][]) => { let v = steps[0][1]; for (const [g, w] of steps) if (f >= g) v = w; return v; };

// ---------------- types ----------------
export type ActorSpec = {
  id: CastId; x: number; y?: number; z: number; s?: number; pose?: Pose; expr?: Expr; legs?: HeroOpts["legs"]; phase?: number; facing?: -1 | 0 | 1;
  alpha?: number; roll?: number; mirror?: boolean; glow?: number; flutter?: number; tilt?: number; headTilt?: number; seed?: number; shadow?: boolean;
  wave?: number; look?: number; blink?: number; chair?: boolean;
};
export type FxK = "burst" | "ring" | "portal" | "crack" | "bolt" | "puff" | "note" | "sign" | "grave" | "sparkle" | "chess" | "podium" | "blocks" | "gem" | "hero";
export type FxSpec = { k: FxK; x: number; y: number; z: number; w: number; h?: number; t?: number; alpha?: number; flat?: boolean; rot?: number; col?: string; col2?: string;
  seed?: number; full?: boolean; text?: string[]; soft?: boolean; yaw?: number; tint?: string };
export type Particle = [number, number, number, string];
export type SceneOut = { actors: ActorSpec[]; fx?: FxSpec[]; particles?: Particle[]; particleSize?: number };
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type CamIn = { pos: V3; look: V3; fov?: number; roll?: number };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => CamIn };
export type Shot = { a: number; b: number; place: PlaceId; look: LookId; cam: Key[]; scene: (f: number, H: Handles) => SceneOut; ch: number };

// ---------------- camera helpers ----------------
const full = (c: CamIn): Cam => ({ fov: 40, roll: 0, ...c });
const mixC = (a: Cam, b: Cam, k: number): Cam => ({ pos: L3(a.pos, b.pos, k), look: L3(a.look, b.look, k), fov: L(a.fov, b.fov, k), roll: L(a.roll, b.roll, k) });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (subject grows ~rate per frame); punch raises it for n frames with soft edges */
const pushK = (f: number, f0: number, rate = 0.0025, punch = 0, n = 32) => {
  const x = Math.max(0, f - f0); let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): CamIn => ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** a dolly key that creeps in from its start frame */
const D = (f0: number, pos: V3, look: V3, o: { fov?: number; roll?: number; rate?: number; punch?: number; n?: number; dur?: number; cut?: boolean } = {}): Key =>
  ({ f: f0, dur: o.dur, cut: o.cut, s: (f) => dolly(pos, look, pushK(f, f0, o.rate ?? 0.0025, o.punch ?? 0, o.n ?? 32), { fov: o.fov ?? 40, roll: o.roll ?? 0 }) });
/** orbit around a point */
const O = (f0: number, c: V3, r: number, h: number, a0: number, a1: number, f1: number, o: { fov?: number; lookY?: number } = {}): Key =>
  ({ f: f0, cut: true, s: (f) => { const a = L(a0, a1, smooth(at(f, f0, f1))); return { pos: [c[0] + Math.sin(a) * r, c[1] + h, c[2] + Math.cos(a) * r], look: [c[0], c[1] + (o.lookY ?? 1.4), c[2]], fov: o.fov ?? 40 }; } });
/** a moving camera given as a function, cut in at f0 */
const M = (f0: number, s: (f: number) => CamIn, cut = true, dur?: number): Key => ({ f: f0, cut, dur, s });

const KICKS: [number, number][] = [[76, 1], [912, 1.6], [1203, 1.2], [1469, 1.2], [2009, 0.8], [2343, 0.8], [2734, 1.6], [2760, 1], [2856, 0.8], [3149, 0.6], [3778, 1.2],
  [4398, 0.8], [4833, 0.9], [5043, 1.2], [5200, 1], [5392, 0.8], [5583, 0.8], [5726, 0.7]];
export const kickAt = (f: number) => { let a = 0; for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; } return a; };
export const camAt = (s: Shot, f: number): Cam => {
  const c = run(s.cam, f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ln = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ln * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** white flashes [frame, length, colour] drawn over the picture */
export const FLASHES: [number, number, string][] = [[104, 5, "#ffffff"], [1203, 6, "#fff6dc"], [1360, 5, "#dff6ff"], [1469, 6, "#fff6dc"], [1766, 4, "#bfefff"], [2009, 4, "#ffffff"],
  [2343, 4, "#ffd27a"], [2734, 7, "#ffffff"], [3149, 4, "#ffffff"], [4810, 4, "#c8ffd0"], [5093, 5, "#ffffff"]];
/** lightning strobes (storm shots): frames where the sky flares */
export const LIGHTNING = [70, 76, 5190, 5200, 5583, 5590, 5726];

// ---------------- reusable crowds / bits ----------------
const QUEUE: CastId[] = ["profx", "ironman", "cap", "thor", "thanos", "loki", "spidey", "strange", "shuri", "antman", "deadpool", "wolverine", "samcap", "yelena", "reed", "thing", "doom"];
const walkers = (f: number, n: number, z0: number, z1: number, xs: number[], speed: number, ids: CastId[]): ActorSpec[] => {
  const out: ActorSpec[] = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, span = z1 - z0, z = z0 + ((((hsh(i, 1) * span + dir * speed * f / FPS) % span) + span) % span);
    out.push({ id: ids[i % ids.length], x: xs[i % xs.length], z, legs: "walk", phase: (f / FPS) * 1.0 + hsh(i, 2), facing: 0, mirror: dir < 0, seed: 20 + i });
  }
  return out;
};
const dust = (seed: number, cx: number, cy: number, cz: number, t: number, n: number, col: string, spread = 1.2, rise = 1.6): Particle[] => {
  const out: Particle[] = [];
  if (t <= 0) return out;
  for (let i = 0; i < n; i++) {
    const r0 = hsh(seed + i, 1), r1 = hsh(seed + i, 2), r2 = hsh(seed + i, 3), k = clamp01(t * (0.6 + 0.8 * r2));
    if (k >= 1) continue;
    out.push([cx + (r0 - 0.5) * 0.7 + (r1 - 0.3) * spread * 2.5 * k, cy + r1 * 1.8 + rise * k, cz + (r2 - 0.5) * 0.6 + spread * k * (r0 - 0.5), col]);
  }
  return out;
};
const snowfall = (f: number, cx: number, cz: number, n: number, area = 30, h = 14): Particle[] => {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) { const y = (((hsh(i, 5) * h - (f / FPS) * (0.8 + 0.4 * hsh(i, 6))) % h) + h) % h; out.push([cx + (hsh(i, 7) - 0.5) * area + 0.4 * Math.sin(f * 0.03 + i), y, cz + (hsh(i, 8) - 0.5) * area, "#ffffff"]); }
  return out;
};
const ring = (n: number, c: V3, r: number, col: string, t: number, wob = 0.3): Particle[] => {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + t; out.push([c[0] + Math.cos(a) * r * (1 + wob * hsh(i, 9)), c[1] + Math.sin(a * 3 + t) * 0.6 + hsh(i, 4) * 2, c[2] + Math.sin(a) * r * (1 + wob * hsh(i, 9)), col]); }
  return out;
};
// branching timelines (Loki): built once, revealed by draw range
const BR: { root?: THREE.Group; tubes: THREE.Mesh[]; tree: THREE.Mesh[] } = { tubes: [] , tree: [] };
const branchMat = (c: string) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.2), fog: false });
const buildBranches = (G: THREE.Group) => {
  if (BR.root) return;
  BR.root = G;
  const cols = ["#ffb347", "#ffd27a", "#7fd6ff", "#f08a2c", "#b6ff9a"];
  // explosion: one trunk from the citadel up, then many branches fanning out (local to space group, citadel at x = 300)
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + hsh(i, 1), el = 0.2 + 0.9 * hsh(i, 2), R = 120 + 220 * hsh(i, 3);
    const p0 = new THREE.Vector3(300, 10, -10), p1 = new THREE.Vector3(300 + Math.cos(a) * 20, 30 + 10 * hsh(i, 4), -10 + Math.sin(a) * 20);
    const p2 = new THREE.Vector3(300 + Math.cos(a) * R * Math.cos(el), 30 + R * Math.sin(el), -10 + Math.sin(a) * R * Math.cos(el));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 40, 0.5 + 0.6 * hsh(i, 5), 5, false);
    const m = new THREE.Mesh(g, branchMat(cols[i % cols.length])); m.visible = false; m.layers.set(3); G.add(m); BR.tubes.push(m);
  }
  // tree: branches converging into Loki on the throne (300, 3, -10.5), growing up and out like a world tree
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.3 * hsh(i, 6), R = 40 + 90 * hsh(i, 7);
    const p0 = new THREE.Vector3(300, 3.2, -10.6), p1 = new THREE.Vector3(300 + Math.cos(a) * 6, 14 + 6 * hsh(i, 8), -10.6 + Math.sin(a) * 6 - 4);
    const p2 = new THREE.Vector3(300 + Math.cos(a) * R * 0.5, 40 + 30 * hsh(i, 9), -10.6 + Math.sin(a) * R * 0.5 - 20), p3 = new THREE.Vector3(300 + Math.cos(a) * R, 70 + 50 * hsh(i, 10), -10.6 + Math.sin(a) * R - 30);
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2, p3]), 48, 0.12 + 0.2 * hsh(i, 11), 5, false);
    const m = new THREE.Mesh(g, branchMat(i % 3 ? "#7dff9a" : "#c8ffb0")); m.visible = false; m.layers.set(3); G.add(m); BR.tree.push(m);
  }
};
const showBranches = (H: Handles, kind: "tubes" | "tree" | null, t: number) => {
  buildBranches(H.branches);
  for (const m of BR.tubes) m.visible = false;
  for (const m of BR.tree) m.visible = false;
  if (!kind) return;
  BR[kind].forEach((m, i) => {
    const g = m.geometry as THREE.BufferGeometry, n = g.index ? g.index.count : g.getAttribute("position").count;
    const k = clamp01(t * 1.3 - (i % 7) * 0.04);
    if (k <= 0) return;
    m.visible = true; g.setDrawRange(0, Math.floor((n * k) / 30) * 30);
  });
};
const planet = (H: Handles, i: number, p: V3, r: number, spin = 0) => { const m = H.planets[i]; m.visible = true; m.position.set(...p); m.scale.setScalar(r); m.rotation.set(0.3, spin, 0.1); };
const bubbles = (H: Handles, f: number, c: V3, R: number, collapse = 0) => {
  H.bubbles.forEach((m, i) => {
    const a = i * 2.4 + f * 0.002 * (1 + (i % 3)), e = (hsh(i, 2) - 0.5) * 1.6, r = R * (0.5 + 0.6 * hsh(i, 3)) * (1 - 0.85 * collapse * (0.5 + hsh(i, 4) * 0.5));
    m.visible = true; m.position.set(c[0] + Math.cos(a) * r * Math.cos(e), c[1] + r * Math.sin(e) * 0.6, c[2] + Math.sin(a) * r * Math.cos(e));
    m.scale.setScalar((4 + 9 * hsh(i, 5)) * (1 - 0.4 * collapse));
  });
};

// ---------------- the shots ----------------
const S: Shot[] = [];
const shot = (ch: number, a: number, b: number, place: PlaceId, look: LookId, cam: Key[], scene: Shot["scene"]) => S.push({ ch, a, b, place, look, cam, scene });

// ===== HOOK =====
// 0-66 Doom's courtyard in a storm: Iron Man hovers in ("Iron Man is coming back to Marvel")
shot(0, 0, 66, "castle", "storm", [D(0, [1.6, 2.2, 6.2], [0, 3.6, 0], { fov: 42, rate: 0.003 }), D(34, [0.8, 3.0, 4.2], [0, 3.8, 0], { fov: 38, dur: 26, rate: 0.003 })],
  (f) => ({ actors: [{ id: "ironman", x: 0, y: 2.6 + 0.25 * Math.sin(f * 0.12), z: 0, s: 1.15, pose: "fly", legs: "fly", expr: "neutral", glow: 0.6 + 0.3 * Math.sin(f * 0.5), shadow: false }],
    particles: ring(60, [0, 0.2, 0], 1.6, "#dff6ff", f * 0.2, 0.6), particleSize: 0.12 }));
// 66-104 "As the villain": Doom, lightning, punch on "villain"
shot(0, 66, 104, "castle", "storm", [D(66, [0.4, 1.45, 4.4], [0, 1.3, 0], { fov: 38, rate: 0.002, punch: 0.007, n: 30, roll: 0.03 }), { f: 74, dur: 20, s: (f) => ({ ...dolly([0.4, 1.45, 4.4], [0, 1.3, 0], pushK(f, 66, 0.002, 0.007, 30)), fov: 38, roll: -0.04 }) }],
  (f) => ({ actors: [{ id: "doom", x: 0, z: 0, s: 1.1, pose: ex(f, [[66, "idle"], [75, "hold"]]) as Pose, expr: "stern", flutter: 0.5 + 0.3 * Math.sin(f * 0.3) }],
    fx: f >= 75 && f < 82 ? [{ k: "bolt", x: -4, y: 9, z: -6, w: 2.2, h: 9, seed: 3 }] : [] }));

// 104-200 "Before Avengers: Doomsday hits theaters on December 18th": the cinema marquee, a queue outside
shot(0, 104, 200, "city", "dusk", [D(104, [-4, 1.4, 36], [10.2, 6.2, 44], { fov: 46, rate: 0.0022 }), D(160, [-1.5, 1.4, 38.5], [10.2, 6.4, 44.5], { fov: 44, dur: 30, rate: 0.002 })],
  (f) => ({ actors: ["folk1", "spidey", "folk2", "folk4", "folk3", "deadpool"].map((id, i) => ({ id: id as CastId, x: 11.6 + (i % 2) * 0.3, z: 41 + i * 1.0, y: 0.18, pose: (i === 1 ? "wave" : "idle") as Pose, wave: Math.sin(f * 0.25),
    expr: (i === 5 ? "grin" : i === 1 ? "smile_closed" : "smile") as Expr, mirror: i % 2 === 0, seed: 40 + i })) }));
// 200-277 "here's every movie you need, in order": tracking along a queue of heroes in release order
shot(0, 200, 277, "city", "dusk", [M(200, (f) => { const t = at(f, 200, 277), z = L(-30, 0, glide(t)); return { pos: [-3.2, 1.6, z - 6], look: [-6.2, 1.25, z + 2], fov: 42, roll: 0.02 }; })],
  (f) => ({ actors: QUEUE.map((id, i) => ({ id, x: -6.6 + 0.25 * Math.sin(i), z: -32 + i * 2.1, y: 0, s: id === "thanos" || id === "thing" ? 1.25 : 1, pose: (i % 4 === 1 ? "wave" : i % 4 === 3 ? "hips" : "idle") as Pose, wave: Math.sin(f * 0.25 + i),
    expr: (i % 3 ? "smile" : "grin") as Expr, chair: id === "profx", seed: 60 + i })) }));

// ===== X-MEN (2000) =====
// 277-320 establishing: the mansion, crane down
shot(1, 277, 320, "mansion", "day", [M(277, (f) => { const t = glide(at(f, 277, 320)); return { pos: [8, L(26, 8, t), L(70, 40, t)], look: [0, L(10, 6, t), -60], fov: 44 }; })],
  () => ({ actors: [] }));
// 320-352 "with the X-Men": the team on the lawn
shot(1, 320, 352, "mansion", "day", [D(320, [0.6, 1.4, -1], [0, 1.1, -8.4], { fov: 42, rate: 0.003, punch: 0.006, n: 26 })],
  () => ({ actors: [{ id: "cyclops", x: -1.35, z: -8.5, pose: "hips", expr: "stern" }, { id: "profx", x: -0.4, z: -8, pose: "sit", legs: "sit", chair: true, expr: "smile", seed: 3 },
    { id: "wolverine", x: 0.55, z: -8.2, pose: "fight", expr: "stern" }, { id: "nightcrawler", x: 1.5, z: -8.8, pose: "wave", wave: 0.5, expr: "grin" }] }));
// 352-444 "Professor X wants mutants and humans to live in peace"
shot(1, 352, 444, "mansion", "day", [D(352, [0.4, 1.5, 6.5], [0, 1.0, -2], { fov: 42, rate: 0.0022 }), D(410, [0.3, 1.3, 4.4], [0, 1.0, -1], { fov: 38, dur: 26, rate: 0.002, roll: 0.03 })],
  (f) => ({ actors: [{ id: "profx", x: 0, z: -1, pose: f > 396 ? "reach" : "sit", legs: "sit", chair: true, expr: f > 420 ? "smile_closed" : "smile" },
    { id: "folk1", x: -1.1, z: -2.6, pose: "wave", wave: Math.sin(f * 0.2), expr: "smile", seed: 4 }, { id: "cyclops", x: 1.1, z: -2.8, pose: "wave", wave: Math.sin(f * 0.2 + 1), expr: "smile", seed: 6 },
    { id: "folk4", x: -1.7, z: -4.6, pose: "idle", expr: "smile_closed", seed: 8 }, { id: "nightcrawler", x: 1.8, z: -4.8, pose: "idle", expr: "grin", seed: 9 }],
    fx: f > 420 ? [{ k: "sparkle", x: 0, y: 2.6, z: -1, w: 0.5, col: "#ffd84a" }] : [] }));
// 444-524 "His old friend Magneto wants mutants on top": Magneto on a rock tower, metal swirling (desert, golden)
shot(1, 444, 524, "desert", "battle", [D(444, [-17.4, 2.6, 0.2], [-20, 5.4, -6], { fov: 42, rate: 0.0022, roll: -0.03 }), { f: 490, dur: 22, s: (f) => dolly([-18.2, 4.4, -1.6], [-20, 5.8, -6], pushK(f, 490, 0.003), { fov: 38, roll: 0.04 }) }],
  (f) => ({ actors: [{ id: "magneto", x: -20, y: 4.4, z: -6, s: 1.1, pose: f > 488 ? "lift" : "hips", expr: f > 488 ? "grin" : "smile", flutter: 0.6, shadow: false },
    { id: "mystique", x: -19.0, y: 0, z: -3.6, pose: "hips", expr: "smile", seed: 5 }],
    particles: ring(90, [-20, 4.6, -6], 3.2 + 0.4 * Math.sin(f * 0.1), "#a9adb4", f * 0.06, 0.4), particleSize: 0.35 }));
// 524-633 "Remember these faces. Twenty-six years later, they're coming back.": the chess game
shot(1, 524, 633, "mansion", "golden", [D(524, [0, 1.3, 5.2], [0, 0.95, 0], { fov: 40, rate: 0.0025 }), D(586, [0, 1.2, 4.0], [0, 1.0, 0], { fov: 38, dur: 28, rate: 0.002, punch: 0.005, n: 30 })],
  (f) => ({ actors: [{ id: "profx", x: -0.72, z: 0, pose: "sit", legs: "sit", chair: true, expr: f > 590 ? "smile_closed" : "smile", facing: 1 },
    { id: "magneto", x: 0.72, z: 0, pose: "sit", legs: "sit", expr: f > 590 ? "grin" : "smile", facing: -1, mirror: true }],
    fx: [{ k: "chess", x: 0, y: 0.45, z: 0.3, w: 0.9, h: 0.68 }, ...(f > 556 ? [{ k: "sign" as FxK, x: 0, y: 2.25, z: -1.2, w: 1.5, h: 0.55, text: [f > 572 ? "2026" : "2000"], col: "#2a2240", col2: "#ffd84a", alpha: sm(f, 556, 562) }] : [])] }));

// ===== IRON MAN (2008) -> THE AVENGERS (2012) =====
// 633-737 Tony welds in the cave
shot(2, 633, 737, "cave", "cave", [D(633, [1.4, 1.7, 3.6], [0, 1.25, -1.6], { fov: 40, rate: 0.0025 }), D(684, [0.6, 1.4, 2.3], [0, 1.3, -1.6], { fov: 36, dur: 24, rate: 0.002, roll: 0.03 })],
  (f) => ({ actors: [{ id: "tony", x: 0, z: -0.8, pose: f > 684 && f < 716 ? "hold" : "point", expr: f > 712 ? "grin" : "stern", look: 0.4 }],
    particles: (f > 684 ? Array.from({ length: 40 }, (_, i) => { const k = ((f * 0.07 + hsh(i, 1)) % 1); return [0.3 + (hsh(i, 2) - 0.5) * 1.5 * k, 1.1 + 0.8 * k - 1.6 * k * k, -1.3 + (hsh(i, 3) - 0.5) * k, i % 2 ? "#ffd27a" : "#fff4c0"] as Particle; }) : []), particleSize: 0.05,
    fx: f > 712 ? [{ k: "hero", x: -2.6, y: 1.35, z: -3.4, w: 1.6, h: 2.7, text: ["ironman", "neutral", "idle"] }] : [] }));
// 737-814 "and Marvel builds a whole universe around him": Iron Man rockets up over the city, camera cranes up
const imY = (f: number) => L(2, 64, sm(f, 740, 812)), imZ = (f: number) => L(-60, -40, sm(f, 740, 812));
shot(2, 737, 814, "city", "day", [M(737, (f) => { const t = glide(at(f, 737, 814)); return { pos: [L(3, 6, t), imY(f) + L(0.5, -5, t), imZ(f) + L(6, 9, t)], look: [0, imY(f) + 1.2, imZ(f)], fov: L(40, 48, t) }; })],
  (f) => ({ actors: [{ id: "ironman", x: 0, y: imY(f), z: imZ(f), s: 1.1, pose: "fly", legs: "fly", glow: 1, shadow: false }],
    particles: Array.from({ length: 50 }, (_, i) => [(hsh(i) - 0.5) * 0.4, imY(f) - 0.2 - i * 0.18, imZ(f) - 0.1, i % 2 ? "#fff4c0" : "#ffd27a"] as Particle), particleSize: 0.12 }));
// 814-875 "A super soldier wakes up from the ice"
shot(2, 814, 875, "snow", "snow", [D(814, [0.5, 1.6, 4.6], [0, 1.4, 0], { fov: 40, rate: 0.003, punch: 0.006, n: 28 })],
  (f, H) => { H.ice.visible = f < 846; H.ice.scale.setScalar(f < 840 ? 1 : 1 + 0.05 * (f - 840)); return { actors: [{ id: "cap", x: 0, z: 0, pose: f > 846 ? "fist" : "idle", expr: f < 838 ? "neutral" : f < 846 ? "shock" : "grin", blink: f < 838 ? 1 : undefined, glow: 0 }],
    fx: f >= 840 && f < 852 ? [{ k: "crack", x: 0, y: 0.75, z: 0.65, w: 1.3, h: 0.45, col: "#dff6ff", seed: 5 }, { k: "burst", x: 0.9, y: 1.9, z: 0.5, w: 1.0, t: at(f, 840, 852), col: "#e6f7ff" }] : [],
    particles: f >= 846 ? dust(70, 0, 0.6, 0, at(f, 846, 870), 60, "#dff6ff", 2, 1) : [], particleSize: 0.1 }; });
// 875-942 "A god of thunder falls from the sky": Thor drops into the desert, crater + dust
shot(2, 875, 942, "desert", "desert", [D(875, [2, 2.2, 13], [0, 6, 0], { fov: 46, rate: 0.002 }), { f: 908, cut: true, s: (f) => dolly([1.2, 1.4, 6.5], [0, 1.2, 0], pushK(f, 908, 0.003), { fov: 40, roll: 0.04 }) }],
  (f) => { const t = clamp01((f - 878) / 34), y = L(30, 0, t * t); return { actors: [{ id: "thor", x: 0, y, z: 0, pose: f < 912 ? "fly" : "fist", legs: f < 912 ? "fly" : "kneel", expr: f < 912 ? "shock" : "grin", flutter: 1, shadow: f >= 912 }],
    fx: f >= 912 && f < 930 ? [{ k: "puff", x: 0, y: 0.6, z: -1.2, w: L(2, 4.5, at(f, 912, 930)), h: L(1.2, 2.4, at(f, 912, 930)), col: "#e2c99a", seed: 2, alpha: 1 - at(f, 920, 930) }] : [],
    particles: f >= 912 ? dust(90, 0, 0, 0, at(f, 912, 940), 80, "#d8b47c", 3, 2) : [], particleSize: 0.18 }; });
// 942-1018 "And in 2012, they team up as the Avengers": the six in a circle, camera orbits
shot(2, 942, 1018, "city", "day", [O(942, [0, 0, -30], 6.2, 1.6, -0.6, 1.4, 1018, { fov: 44, lookY: 1.3 })],
  (f) => ({ actors: (["ironman", "cap", "thor", "hulk", "widow", "hawkeye"] as CastId[]).map((id, i) => { const a = (i / 6) * Math.PI * 2; return { id, x: Math.sin(a) * 1.4, z: -30 + Math.cos(a) * 1.4, s: id === "hulk" ? 1.45 : 1, pose: (["blast", "shield", "hammer" === "hammer" ? "fist" : "idle", "fight", "fight", "point"] as Pose[])[i], expr: (i === 3 ? "stern" : "stern") as Expr, flutter: 0.4, seed: 80 + i }; }) }));
// 1018-1058 "to stop Thor's brother Loki": Loki on the cinema roof, laughing
shot(2, 1018, 1058, "city", "day", [D(1018, [19, 14.2, 51], [24, 14.2, 45], { fov: 40, rate: 0.0025, roll: -0.04 })],
  (f) => ({ actors: [{ id: "loki", x: 24, y: 13, z: 45, pose: f > 1040 ? "cheer" : "hips", expr: f > 1036 ? "laugh" : "grin", flutter: 0.4 }] }));
// 1058-1130 "and an alien army over New York": the portal, aliens pour out; tilt up
shot(2, 1058, 1130, "city", "day", [M(1058, (f) => { const t = glide(at(f, 1058, 1110)); return { pos: [2, 1.7, 40], look: [0, L(6, 46, t), L(10, -60, t)], fov: 48 }; })],
  (f) => ({ actors: [{ id: "cap", x: -1.2, z: 30, pose: "shield", expr: "shock" }, { id: "widow", x: 1.4, z: 30.5, pose: "fight", expr: "shock" },
    ...Array.from({ length: 12 }, (_, i): ActorSpec => { const k = ((f - 1058) / 70 + hsh(i, 1)) % 1; return { id: "alien", x: (hsh(i, 2) - 0.5) * 50, y: L(78, 30, k), z: -80 + k * 60, s: 1.1, pose: "fight", legs: "fly", expr: "stern", shadow: false, seed: 100 + i }; })],
    fx: [{ k: "portal", x: 0, y: 80, z: -90, w: 46, t: f * 0.004, col: "#1f3a8a", col2: "#7fd6ff", full: true }] }));

// ===== AVENGERS: INFINITY WAR (2018) =====
// 1130-1236 Thanos on a rock in space, the six stones fly into the gauntlet, the snap
shot(3, 1130, 1236, "space", "space", [D(1130, [3, 3.2, 12], [0, 3, 0], { fov: 42, rate: 0.0025 }), { f: 1196, cut: true, s: (f) => dolly([0.8, 3.6, 4.2], [0.6, 3.6, 0], pushK(f, 1196, 0.002, 0.006, 26), { fov: 36, roll: -0.04 }) }],
  (f, H) => { planet(H, 2, [-120, 30, -300], 60, f * 0.001); const st = (i: number) => at(f, 1150 + i * 7, 1170 + i * 7);
    return { actors: [{ id: "thanos", x: 0, z: 0, s: 1.6, pose: f > 1196 ? "snap" : "fist", expr: f > 1203 ? "smile" : "stern", glow: f > 1180 ? 1 : 0 }],
      fx: [...["#7a4fd0", "#3f7be0", "#e04040", "#f08a2c", "#3fbf5a", "#f2d23c"].map((c, i): FxSpec => { const k = st(i), a = i * 1.05; return { k: "gem", x: L(Math.cos(a) * 9, 1.0, glide(k)), y: L(8 + Math.sin(a) * 4, 4.4, glide(k)), z: L(-6, 0.4, glide(k)), w: L(1.0, 0.25, k), h: L(1.4, 0.35, k), col: c, alpha: k >= 1 ? 0 : 1 }; }),
        ...(f >= 1203 && f < 1216 ? [{ k: "burst" as FxK, x: 0.9, y: 4.4, z: 0.6, w: 4.5, t: at(f, 1203, 1216), col: "#fff3b0" }] : [])] }; });
// 1236-1310 "and half of all life turns to dust": a row of heroes, every other one blows away
shot(3, 1236, 1310, "mansion", "golden", [D(1236, [0, 1.5, 138.5], [0, 1.0, 128], { fov: 42, rate: 0.0022 })],
  (f) => { const ids: CastId[] = ["spidey", "strange", "bucky", "folk2", "samcap", "shuri"];
    return { actors: ids.map((id, i) => { const d = i % 2 === 0 ? at(f, 1250 + i * 4, 1280 + i * 4) : 0; return { id, x: -2.5 + i * 1.0, z: 128 - (i % 2) * 0.4, pose: "idle" as Pose, expr: (i % 2 === 0 ? (f > 1246 ? "nervous" : "neutral") : f > 1260 ? "shock" : "neutral") as Expr, alpha: 1 - d, seed: 120 + i }; }),
      particles: ids.flatMap((_, i) => (i % 2 === 0 ? dust(300 + i * 50, -2.5 + i * 1.0, 0.2, 128, at(f, 1250 + i * 4, 1300 + i * 4), 40, "#8a6a5a", 1.6, 1.2) : [])), particleSize: 0.08 }; });

// ===== AVENGERS: ENDGAME (2019) =====
// 1310-1381 "the survivors travel back in time": on the quantum platform at the compound, a flash and they are gone
shot(4, 1310, 1381, "mansion", "day", [D(1310, [-74, 2.2, 32], [-80, 1.3, 20], { fov: 42, rate: 0.0022 }), D(1344, [-77.5, 1.7, 26.5], [-80, 1.4, 20], { fov: 38, dur: 18, rate: 0.002, punch: 0.006 })],
  (f) => ({ actors: f >= 1362 ? [] : (["ironman", "cap", "widow", "antman", "thor"] as CastId[]).map((id, i) => ({ id, x: -81.8 + i * 0.9, z: 20 + (i % 2) * 0.4, y: 0.6, pose: (i === 1 ? "shield" : "idle") as Pose, expr: (f > 1346 ? "grin" : "stern") as Expr, seed: 140 + i })),
    particles: f > 1346 && f < 1366 ? ring(80, [-80, 0.7, 20], 6.2, "#7fe6ff", f * 0.3, 0.1) : [], particleSize: 0.2 }));
// 1381-1410 "steal the stones": the stones in a glowing gauntlet
shot(4, 1381, 1410, "desert", "battle", [D(1381, [0.1, 1.3, 2.8], [0.15, 1.35, 0], { fov: 36, rate: 0.004, roll: 0.04 })],
  (f) => ({ actors: [{ id: "ironman", x: 0, z: 0, pose: "fist", expr: "stern", glow: 0.6 + 0.4 * Math.sin(f * 0.4) }],
    fx: ["#7a4fd0", "#3f7be0", "#e04040", "#f08a2c", "#3fbf5a", "#f2d23c"].map((c, i): FxSpec => ({ k: "gem", x: 0.27 + (i - 2.5) * 0.045, y: 1.66 + Math.sin(f * 0.2 + i) * 0.01 + (i % 2) * 0.03, z: 0.08, w: 0.05, h: 0.07, col: c })) }));
// 1410-1459 "and bring everyone home": portals open on the battlefield and the heroes step out
shot(4, 1410, 1459, "desert", "battle", [D(1410, [0, 1.8, 9], [0, 1.6, -4], { fov: 46, rate: 0.002 })],
  (f) => { const P: [number, number, CastId][] = [[-2.2, -2, "spidey"], [-0.9, -5, "strange"], [1.1, -4.5, "shuri"], [2.4, -2.4, "samcap"], [0.1, -8, "bucky"]];
    return { actors: P.map(([x, z, id], i) => ({ id, x, z: z + 1.2 * sm(f, 1420 + i * 5, 1440 + i * 5), pose: (i % 2 ? "fist" : "fight") as Pose, expr: "grin" as Expr, alpha: sm(f, 1416 + i * 5, 1424 + i * 5), seed: 160 + i })),
      fx: P.map(([x, z], i): FxSpec => ({ k: "ring", x, y: 1.4, z: z - 0.2, w: 3.4 * sm(f, 1412 + i * 5, 1420 + i * 5), t: f * 0.01, col: "#ffb347", col2: "#ffe0a0" })) }; });
// 1459-1535 "Tony snaps Thanos away, and dies a hero"
shot(4, 1459, 1535, "desert", "battle", [D(1459, [1.4, 2.0, 6.8], [-0.4, 1.9, 0], { fov: 40, rate: 0.0025 }), { f: 1496, cut: true, s: (f) => dolly([0.6, 1.0, 3.4], [0, 1.0, 0], pushK(f, 1496, 0.0016), { fov: 36 }) }],
  (f) => f < 1496 ? { actors: [{ id: "ironman", x: 0.6, z: 0, pose: f > 1466 ? "snap" : "fist", expr: f > 1470 ? "smile_closed" : "stern", glow: f > 1466 ? 1 : 0.4 },
      { id: "thanos", x: -3.2, z: -3, s: 1.6, pose: "idle", expr: f > 1476 ? "shock" : "stern", alpha: 1 - at(f, 1480, 1494) }],
    particles: dust(500, -3.2, 0.4, -3, at(f, 1480, 1496), 160, "#6a4a7a", 2.2, 2.2), particleSize: 0.14,
    fx: f >= 1469 && f < 1480 ? [{ k: "burst", x: 0.9, y: 2.6, z: 0.2, w: 3.5, t: at(f, 1469, 1480), col: "#fff3b0" }] : [] }
    : { actors: [{ id: "ironman", x: 0, z: 0, pose: "sit", legs: "sit", expr: "relief", blink: f > 1520 ? 1 : undefined, glow: 0.3 * (1 - at(f, 1496, 1530)) }] });
// 1535-1661 "Steve Rogers stays in the past, to finally have that dance with Peggy Carter."
shot(4, 1535, 1661, "mansion", "golden", [D(1535, [81, 1.6, 33], [81, 1.3, 23.4], { fov: 40, rate: 0.0018 }), D(1600, [81.2, 1.5, 29], [81, 1.35, 23.4], { fov: 38, dur: 32, rate: 0.0016 })],
  (f) => { const a = (f - 1535) * 0.035; return { actors: [{ id: "oldsteve", x: 81 + Math.sin(a) * 0.45, z: 23.4 + Math.cos(a) * 0.25, y: 0.5, pose: "dance", expr: "smile_closed", facing: 1, seed: 7 },
    { id: "peggy", x: 81 - Math.sin(a) * 0.45, z: 23.4 - Math.cos(a) * 0.25, y: 0.5, pose: "dance", expr: "smile_closed", facing: -1, mirror: true, seed: 8 }],
    fx: [0, 1, 2].map((i): FxSpec => { const k = ((f - 1535) / 60 + i / 3) % 1; return { k: "note", x: 80 + i * 0.8, y: 2.2 + k * 1.4, z: 23, w: 0.3, h: 0.39, alpha: 1 - k, col: "#5a2e1e" }; }) }; });
// 1661-1806 "the 2012 Loki grabs the Tesseract, and vanishes"
shot(4, 1661, 1806, "city", "day", [D(1661, [3, 1.5, -18], [0, 1.1, -26], { fov: 40, rate: 0.0022 }), D(1726, [1.2, 1.4, -21.5], [0, 1.3, -26], { fov: 36, dur: 20, rate: 0.002, punch: 0.006, roll: 0.04 })],
  (f) => ({ actors: f >= 1766 ? [] : [{ id: f > 1730 ? "lokiT" : "loki", x: 0, z: -26, pose: f > 1730 ? "hold" : "reach", expr: f > 1734 ? "grin" : "smile", flutter: 0.3 },
    { id: "ironman", x: -3.4, z: -27, pose: "reach", expr: "shock", seed: 5 }, { id: "cap", x: 3.6, z: -27.4, pose: "reach", expr: "shock", seed: 6 }],
    fx: [...(f < 1730 ? [{ k: "gem" as FxK, x: L(-1.4, 0.38, sm(f, 1716, 1730)), y: L(0.15, 1.15, sm(f, 1716, 1730)), z: -25.8, w: 0.3, h: 0.3, col: "#6fd6ff" }] : []),
      ...(f >= 1762 && f < 1780 ? [{ k: "burst" as FxK, x: 0, y: 1.2, z: -25.6, w: 3.5, t: at(f, 1762, 1780), col: "#9fe6ff" }] : [])] }));

// ===== LOKI (2021-2023) =====
// 1806-1860 "He gets arrested by the TVA"
shot(5, 1806, 1860, "tva", "tva", [D(1806, [1, 1.6, 26], [0, 1.3, 18], { fov: 40, rate: 0.0028, punch: 0.006, n: 24 })],
  (f, H) => { screenDraw(H, f); return { actors: [{ id: "lokiT", x: 0, z: 18, pose: "cheer", expr: f > 1814 ? "shock" : "smile", seed: 3 }, { id: "tva", x: -1.6, z: 17.4, pose: "point", expr: "stern", seed: 11 }, { id: "tva", x: 1.7, z: 17.2, pose: "point", expr: "stern", mirror: true, seed: 12 }] }; });
// 1860-1950 "an office that deletes any timeline that goes off script": desks, the big screen, a branch pruned
shot(5, 1860, 1950, "tva", "tva", [M(1860, (f) => { const t = glide(at(f, 1860, 1950)); return { pos: [L(-10, 4, t), L(6, 4.5, t), L(28, 18, t)], look: [0, 6, -40], fov: 46 }; })],
  (f, H) => { screenDraw(H, f); return { actors: walkers(f, 6, -14, 20, [-4.5, 4.5, -13.5, 13.5], 1.0, ["tva", "tva", "lokiTVA", "tva"]) }; });
// 1950-2054 "At the end of time, his variant Sylvie kills the man in charge"
shot(5, 1950, 2054, "space", "endtime", [D(1950, [304, 4, 10], [300, 2.2, -8], { fov: 44, rate: 0.002 }), { f: 2004, cut: true, s: (f) => dolly([303.6, 1.8, -1.2], [300, 1.6, -8.4], pushK(f, 2004, 0.003), { fov: 40, roll: -0.04 }) }],
  (f, H) => { showBranches(H, null, 0); return { actors: [{ id: "hwr", x: 300, z: -9.5, y: 1.2, pose: f > 2008 ? "shrug" : "hips", expr: f > 2008 ? "shock" : "smile", alpha: 1 - at(f, 2030, 2050), seed: 4 },
    { id: "sylvie", x: 301.1, z: -5.6 - 1.6 * sm(f, 1990, 2006), pose: f > 2004 ? "throw" : "idle", expr: "stern", mirror: true, seed: 5, flutter: 0.4 }, { id: "lokiTVA", x: 298.7, z: -6.0, pose: "reach", expr: f > 2010 ? "shock" : "nervous", seed: 6 }],
    fx: f >= 2009 && f < 2016 ? [{ k: "burst", x: 300.8, y: 2.4, z: -8.2, w: 1.4, t: at(f, 2009, 2016), col: "#ffe0a0" }] : [] }; });
// 2054-2144 "and one timeline explodes into infinite universes"
shot(5, 2054, 2144, "space", "endtime", [M(2054, (f) => { const t = glide(at(f, 2054, 2144)); return { pos: [300 + L(30, 90, t), L(20, 70, t), L(120, 260, t)], look: [300, L(40, 80, t), -10], fov: 50 }; })],
  (f, H) => { showBranches(H, "tubes", at(f, 2056, 2120)); bubbles(H, f, [300, 120, -10], 200 * sm(f, 2090, 2140) + 1, 0); return { actors: [] }; });
// 2144-2300 "To save them all, Loki takes a throne at the end of time, and holds the multiverse together."
shot(5, 2144, 2300, "space", "endtime", [D(2144, [300.5, 2.6, 2], [300, 2.4, -9.5], { fov: 40, rate: 0.002 }), M(2228, (f) => { const t = glide(at(f, 2228, 2300)); return { pos: [300 + L(2, 30, t), L(3, 40, t), L(8, 140, t)], look: [300, L(2.6, 40, t), -12], fov: L(40, 52, t) }; }, true)],
  (f, H) => { showBranches(H, "tree", at(f, 2232, 2296)); const walk = f < 2186; return { actors: [{ id: "lokiKing", x: 300, z: walk ? L(-4, -9.6, at(f, 2144, 2186)) : -10.3, y: walk ? 0 : 1.25, pose: walk ? "idle" : f > 2232 ? "lift" : "sit", legs: walk ? "walk" : "sit", phase: f / FPS, expr: f > 2232 ? "pained" : "stern", flutter: 0.4, shadow: walk }] }; });

// ===== SPIDER-MAN: NO WAY HOME (2021) =====
// 2300-2365 "a spell goes wrong"
shot(6, 2300, 2365, "city", "snowNight", [D(2300, [1.2, 1.7, 28], [0, 1.7, 21], { fov: 40, rate: 0.0025 }), { f: 2340, dur: 18, s: (f) => dolly([0.8, 1.6, 26.2], [0, 1.8, 21], pushK(f, 2340, 0.003), { fov: 38, roll: 0.05 }) }],
  (f) => ({ actors: [{ id: "strange", x: -0.6, z: 21, pose: "blast", expr: f > 2340 ? "shock" : "stern", flutter: 0.4 }, { id: "spidey", x: 0.9, z: 21.3, pose: f > 2338 ? "reach" : "idle", expr: f > 2338 ? "shock" : "nervous", seed: 4 }],
    fx: [{ k: "ring", x: -0.6, y: 2.0, z: 20.4, w: 1.8 + 0.12 * Math.sin(f * 0.5), t: f * 0.02, col: f > 2343 ? "#ff6a3a" : "#ffb347", col2: "#ffd27a" }, ...(f >= 2343 ? [{ k: "crack" as FxK, x: -0.6, y: 2.0, z: 20.3, w: 2.0, h: 0.65, col: "#ffd27a", seed: 3 }] : [])],
    particles: snowfall(f, 0, 22, 120, 16, 8), particleSize: 0.06 }));
// 2365-2414 "Villains from other universes pour in"
shot(6, 2365, 2414, "city", "snowNight", [M(2365, (f) => ({ pos: [1.5, 1.6, 22], look: [0, L(6, 8, at(f, 2365, 2414)), 4], fov: 48 }))],
  (f) => ({ actors: [{ id: "goblin", x: -1.2, y: L(14, 3.4, sm(f, 2368, 2392)), z: 13, s: 1.2, pose: "cheer", legs: "fly", expr: "laugh", shadow: false, seed: 4 }, { id: "ock", x: 1.1, y: L(16, 0, sm(f, 2376, 2398)), z: 14, s: 1.2, pose: "fight", expr: "grin", seed: 5 }],
    fx: [{ k: "crack", x: 0, y: 16, z: 0, w: 14, h: 4.5, col: "#ffb347", seed: 9 }], particles: snowfall(f, 0, 20, 140, 30, 18), particleSize: 0.1 }));
// 2414-2471 "along with two more Spider-Men" — they point at each other
shot(6, 2414, 2471, "city", "snowNight", [D(2414, [0, 1.4, 30.5], [0, 1.0, 23.8], { fov: 42, rate: 0.0028, punch: 0.006, n: 26 })],
  (f) => ({ actors: [{ id: "spidey", x: -0.95, z: 24, pose: "point", expr: "shock", seed: 1 }, { id: "spidey2", x: 0, z: 23.6, pose: "point", expr: "shock", mirror: true, seed: 2 }, { id: "spidey3", x: 0.95, z: 24, pose: "point", expr: "shock", mirror: true, seed: 3 }],
    particles: snowfall(f, 0, 24, 120, 14, 8), particleSize: 0.06 }));
// 2471-2596 "To close the door, the whole world forgets Peter Parker ever existed."
shot(6, 2471, 2596, "city", "snowNight", [D(2471, [0, 2.4, 40], [0, 6, 18], { fov: 46, rate: 0.002 }), { f: 2516, cut: true, s: (f) => dolly([1.2, 1.6, -4], [0, 1.4, -12], pushK(f, 2516, 0.0022), { fov: 40 }) }],
  (f) => f < 2516 ? { actors: [{ id: "strange", x: 0, z: 18, pose: "lift", expr: "stern", flutter: 0.6 }], fx: [{ k: "ring", x: 0, y: 8, z: 14, w: 26 * sm(f, 2476, 2510), t: f * 0.01, col: "#ffb347", col2: "#ffe0a0" }], particles: snowfall(f, 0, 20, 140, 30, 16), particleSize: 0.1 }
    : { actors: [{ id: "peter", x: 0, z: -12, pose: "idle", expr: "nervous", seed: 9 }, ...walkers(f, 8, -30, 10, [-1.6, 1.8, -2.6, 2.4], 1.3, ["folk1", "folk2", "folk3", "folk4"])], particles: snowfall(f, 0, -10, 120, 18, 9), particleSize: 0.06 });

// ===== DOCTOR STRANGE IN THE MULTIVERSE OF MADNESS (2022) =====
// 2596-2710 "Doctor Strange learns the scariest word in the multiverse: incursion."
shot(7, 2596, 2710, "space", "space", [D(2596, [0.8, 3.3, 7], [0, 2.4, 0], { fov: 42, rate: 0.002 }), { f: 2678, dur: 20, s: (f) => dolly([0.3, 2.6, 4.2], [0, 2.5, 0], pushK(f, 2678, 0.002, 0.007, 30), { fov: 36, roll: -0.04 }) }],
  (f, H) => { bubbles(H, f, [0, 20, -60], 50); return { actors: [{ id: "strange", x: 0, z: 0, pose: f > 2680 ? "blast" : "hips", expr: f > 2680 ? "shock" : "stern", flutter: 0.5 }],
    fx: f > 2680 ? [{ k: "ring", x: -0.9, y: 2.2, z: 0.3, w: 0.8, t: f * 0.03 }, { k: "ring", x: 0.9, y: 2.2, z: 0.3, w: 0.8, t: f * 0.03 }] : [] }; });
// 2710-2800 "When two universes collide, both are destroyed."
shot(7, 2710, 2800, "space", "incursion", [D(2710, [0, 10, 220], [0, 0, 0], { fov: 46, rate: 0.0015 })],
  (f, H) => { const t = sm(f, 2710, 2736); if (f < 2760) { planet(H, 0, [L(-150, -32, t), 0, 0], 40, f * 0.003); planet(H, 1, [L(150, 32, t), 0, 0], 40, -f * 0.003); }
    return { actors: [], fx: f >= 2734 ? [{ k: "burst", x: 0, y: 0, z: 30, w: L(60, 220, at(f, 2734, 2770)), t: at(f, 2734, 2770), col: f > 2758 ? "#ffd27a" : "#ffffff", full: true, alpha: 1 - at(f, 2780, 2800) }] : [],
      particles: f >= 2756 ? Array.from({ length: 300 }, (_, i): Particle => { const k = at(f, 2756, 2800), a = hsh(i, 1) * 6.28, e = (hsh(i, 2) - 0.5) * 3; return [Math.cos(a) * Math.cos(e) * 160 * k, Math.sin(e) * 100 * k, Math.sin(a) * Math.cos(e) * 160 * k, i % 3 ? "#e07a3a" : "#3f7be0"]; }) : [], particleSize: 3 }; });

// ===== BLACK PANTHER: WAKANDA FOREVER (2022) =====
// 2800-2945 Shuri on the shore; Namor rises from the sea
shot(8, 2800, 2945, "ocean", "ocean", [D(2800, [3, 1.6, 22], [0, 1.4, 12], { fov: 42, rate: 0.002 }), { f: 2850, cut: true, s: (f) => dolly([2.4, 1.6, 15], [-0.6, 1.9, 3], pushK(f, 2850, 0.0022), { fov: 42, roll: 0.03 }) }],
  (f) => ({ actors: [{ id: "shuri", x: f < 2850 ? 0 : 1.15, z: f < 2850 ? 12 : 11.8, y: 0.4, pose: f < 2850 ? "hips" : "fight", expr: "stern", seed: 3 },
    ...(f >= 2850 ? [{ id: "namor" as CastId, x: -0.8, y: L(-2.6, 0.9, sm(f, 2852, 2876)), z: 3, s: 1.2, pose: "cross" as Pose, expr: "stern" as Expr, shadow: false, seed: 4 }] : [])],
    fx: f >= 2852 && f < 2880 ? [{ k: "puff", x: -0.8, y: 0.3, z: 3.4, w: 3, h: 1.8, col: "#dff6ff", seed: 6, alpha: 1 - at(f, 2868, 2880) }] : [],
    particles: f >= 2852 ? dust(600, -0.8, -0.2, 3, at(f, 2852, 2890), 80, "#bfefff", 2.4, 2) : [], particleSize: 0.1 }));

// ===== ANT-MAN AND THE WASP: QUANTUMANIA (2023) =====
// 2945-3034 pulled into the Quantum Realm
shot(9, 2945, 3034, "space", "quantum", [D(2945, [0.4, 1.8, 7], [0, 1.6, 0], { fov: 42, rate: 0.003 }), { f: 2990, dur: 24, s: (f) => dolly([0, 2, 5], [0, 2, -20], pushK(f, 2990, 0.006), { fov: 50, roll: 0.06 }) }],
  (f, H) => { bubbles(H, f, [0, 20, -140], 60); const k = sm(f, 2992, 3026); return { actors: [{ id: "antman", x: -0.8, y: L(0, 3, k), z: L(0, -18, k), s: L(1, 0.4, k), pose: "reach", legs: k > 0 ? "fly" : "stand", expr: k > 0 ? "shock" : "smile", shadow: false, seed: 3 },
    { id: "cassie", x: 0.8, y: L(0, 3, k), z: L(0, -18, k), s: L(1, 0.4, k), pose: "reach", legs: k > 0 ? "fly" : "stand", expr: k > 0 ? "shock" : "smile", shadow: false, seed: 4 }],
    fx: [{ k: "portal", x: 0, y: 4, z: -24, w: 18 * sm(f, 2960, 2995), t: f * 0.01, col: "#3a8f6a", col2: "#f0a050", full: true }] }; });
// 3034-3102 "and fight an exiled conqueror"
shot(9, 3034, 3102, "space", "quantum", [D(3034, [0, 2, 9], [0, 1.6, 0], { fov: 44, rate: 0.0025, roll: -0.03 })],
  (f, H) => { bubbles(H, f, [0, 20, -140], 60); return { actors: [{ id: "antman", x: -1.25, z: 0.5, pose: "fight", expr: "stern", seed: 3 }, { id: "cassie", x: -0.3, z: 1, pose: "fight", expr: "stern", seed: 4 },
    { id: "kang", x: 1.2, z: -0.6, s: 1.1, pose: "blast", expr: "stern", glow: 0.6 + 0.4 * Math.sin(f * 0.3), seed: 5 }],
    fx: [{ k: "burst", x: 0.45, y: 1.3, z: 0, w: 0.8, t: (f % 10) / 10, col: "#9fe6ff" }] }; });

// ===== THE MARVELS (2023) =====
// 3102-3199 the jump point; Monica is stranded on the other side
shot(10, 3102, 3199, "space", "space", [D(3102, [1, 3, 14], [0, 3, -4], { fov: 44, rate: 0.002 })],
  (f, H) => { planet(H, 3, [80, -20, -220], 70, f * 0.001); const close = sm(f, 3150, 3180); return { actors: [{ id: "captmarvel", x: -2, z: 1, pose: "blast", legs: "fly", y: 1.4, expr: f > 3150 ? "shock" : "stern", shadow: false, glow: 1, seed: 3 },
    { id: "monica", x: 1.6, y: 2.4 + close * 1.2, z: -6 - close * 4, s: 1 - close * 0.4, pose: "reach", legs: "fly", expr: "shock", shadow: false, glow: 0.6, alpha: 1 - at(f, 3178, 3190), seed: 4 }],
    fx: [{ k: "ring", x: 1, y: 3, z: -8, w: L(9, 0.2, close), t: f * 0.01, col: "#7fd6ff", col2: "#ffffff" }] }; });
// 3199-3287 "wakes up next to Beast, from the X-Men"
shot(10, 3199, 3287, "mansion", "golden", [D(3199, [0.3, 1.5, -38.5], [0, 1.0, -45], { fov: 40, rate: 0.0025 }), { f: 3222, dur: 18, s: (f) => dolly([0.6, 1.4, -40.5], [0.1, 1.1, -45], pushK(f, 3222, 0.0025, 0.006), { fov: 40, roll: 0.04 }) }],
  (f) => ({ actors: [{ id: "monica", x: -0.45, z: -45, pose: f > 3206 ? "shrug" : "sit", legs: f > 3206 ? "stand" : "sit", expr: f > 3224 ? "shock" : "dazed", seed: 4 }, { id: "beast", x: 0.55, z: -45.3, pose: "wave", wave: Math.sin(f * 0.25), expr: "grin", alpha: sm(f, 3216, 3222), seed: 6 }] }));

// ===== DEADPOOL & WOLVERINE (2024) =====
// 3287-3395 "Over in the old X-Men universe, Deadpool learns his world is dying"
shot(11, 3287, 3395, "mansion", "dusk", [D(3287, [1.2, 1.6, -36], [0, 3.2, -54], { fov: 46, rate: 0.002 }), { f: 3372, cut: true, s: (f) => dolly([0.4, 1.6, -38.5], [0, 1.4, -44], pushK(f, 3372, 0.003), { fov: 38, roll: -0.04 }) }],
  (f) => ({ actors: [{ id: "deadpool", x: 0, z: -44, pose: f > 3372 ? "shrug" : "hips", expr: f > 3372 ? "shock" : "grin", seed: 3 }],
    fx: f > 3374 ? [0, 1, 2].map((i): FxSpec => ({ k: "crack", x: -6 + i * 6, y: 8 + i * 3, z: -52, w: 9, h: 3, col: "#ffb347", seed: 20 + i, alpha: sm(f, 3376 + i * 4, 3382 + i * 4) })) : [],
    particles: f > 3378 ? dust(800, 0, 6, -52, at(f, 3378, 3395), 120, "#c9b48a", 10, 4) : [], particleSize: 0.3 }));
// 3395-3454 "because its Wolverine is dead"
shot(11, 3395, 3454, "mansion", "dusk", [D(3395, [1.2, 1.4, -37], [0, 1.0, -42], { fov: 40, rate: 0.002 })],
  () => ({ actors: [{ id: "deadpool", x: 0.75, z: -41.4, pose: "idle", expr: "nervous", mirror: true, seed: 3 }], fx: [{ k: "grave", x: -0.45, y: 0.6, z: -42, w: 1.0, h: 1.2, text: ["LOGAN"] }] }));
// 3454-3530 "So he drags in the worst Wolverine in the multiverse"
shot(11, 3454, 3530, "desert", "void", [D(3454, [-103.0, 1.6, 12.5], [-104.0, 1.1, 6], { fov: 42, rate: 0.0022 }), { f: 3484, dur: 20, s: (f) => dolly([-102.8, 1.5, 10.8], [-103.7, 1.1, 6], pushK(f, 3484, 0.0025), { fov: 40, roll: 0.04 }) }],
  (f) => ({ actors: [{ id: "deadpool", x: -103.5 + 0.5 * sm(f, 3460, 3500), z: 6, pose: "point", legs: "walk", phase: f / FPS, expr: "grin", seed: 3 }, { id: "wolverine", x: -104.5 + 0.5 * sm(f, 3460, 3500), z: 5.8, pose: "cross", expr: "stern", seed: 4 }],
    fx: [{ k: "portal", x: -105.6, y: 1.3, z: 5, w: 2.4 * sm(f, 3456, 3470) * (1 - at(f, 3500, 3510)), t: f * 0.02, col: "#f08a2c", col2: "#ffe0a0" }] }));
// 3530-3623 "survives the Void, where forgotten heroes like Gambit end up"
shot(11, 3530, 3623, "desert", "void", [M(3530, (f) => { const x = L(-114, -126, at(f, 3530, 3620)); return { pos: [x + 2.5, 1.8, 14], look: [x - 1.2, 1.3, 5.6], fov: 44 }; }), { f: 3592, cut: true, s: (f) => dolly([-125.4, 1.5, 10.5], [-127.2, 1.1, 4.4], pushK(f, 3592, 0.0025, 0.006), { fov: 40, roll: -0.04 }) }],
  (f) => ({ actors: [{ id: "deadpool", x: L(-114, -126, at(f, 3530, 3620)), z: 6, pose: "idle", legs: "walk", phase: f / FPS, expr: "grin", seed: 3 }, { id: "wolverine", x: L(-115, -127, at(f, 3530, 3620)), z: 5.4, pose: "idle", legs: "walk", phase: f / FPS + 0.3, expr: "stern", seed: 4 },
    ...(f > 3594 ? [{ id: "gambit" as CastId, x: -127.9, z: 3.6, pose: "throw" as Pose, expr: "grin" as Expr, flutter: 0.5, seed: 5 }] : [])],
    fx: f > 3594 ? [{ k: "sparkle", x: -127.6, y: 1.75, z: 3.8, w: 0.35, col: "#ff6fd8" }] : [] }));
// 3623-3676 "and saves his world"
shot(11, 3623, 3676, "desert", "golden", [D(3623, [-118, 1.0, 9], [-120, 1.5, 3], { fov: 40, rate: 0.003, roll: 0.03 })],
  () => ({ actors: [{ id: "deadpool", x: -120.6, z: 3, pose: "fight", expr: "grin", seed: 3 }, { id: "wolverine", x: -119.3, z: 3.1, pose: "fight", expr: "stern", mirror: true, seed: 4 }] }));

// ===== CAPTAIN AMERICA: BRAVE NEW WORLD (2025) =====
// 3676-3744 "Sam Wilson is Captain America now."
shot(12, 3676, 3744, "city", "golden", [D(3676, [1.4, 0.9, 346.5], [0, 2.0, 340], { fov: 44, rate: 0.003, roll: -0.03 })],
  (f) => ({ actors: [{ id: "samcap", x: 0, y: L(9, 0.2, sm(f, 3676, 3702)), z: 340, pose: f < 3702 ? "fly" : "shield", legs: f < 3702 ? "fly" : "stand", expr: "grin", shadow: f > 3700, glow: 1 }] }));
// 3744-3837 "He stops a giant Red Hulk, who happens to be the President"
shot(12, 3744, 3837, "city", "golden", [D(3744, [1.6, 1.4, 369], [0, 3.0, 356], { fov: 48, rate: 0.002 }), { f: 3806, cut: true, s: (f) => dolly([-1.4, 1.5, 366], [-1.9, 1.6, 358], pushK(f, 3806, 0.0025), { fov: 42, roll: 0.04 }) }],
  (f) => ({ actors: [{ id: "redhulk", x: f > 3806 ? -1.2 : 0, z: 356, s: 2.6, pose: f > 3776 ? "lift" : "fight", expr: f > 3790 ? "nervous" : "stern", seed: 4 }, { id: "samcap", x: 1.6, y: 2.2 + 0.3 * Math.sin(f * 0.1), z: 363, pose: "shield", legs: "fly", expr: "stern", shadow: false, seed: 5 }],
    fx: f > 3806 ? [{ k: "podium", x: -3.0, y: 0.6, z: 359.5, w: 0.8, h: 1.07 }] : [] }));
// 3837-3910 "and decides to rebuild the Avengers"
shot(12, 3837, 3910, "city", "golden", [D(3837, [0.6, 1.5, 345], [0, 1.4, 340], { fov: 38, rate: 0.0025, punch: 0.005, n: 30 })],
  (f) => ({ actors: [{ id: "samcap", x: 0, z: 340, pose: f > 3858 ? "fist" : "shield", expr: f > 3858 ? "grin" : "smile", seed: 5 }] }));

// ===== THUNDERBOLTS* (2025) =====
// 3910-4006 "Yelena, Bucky and a team of misfits"
shot(13, 3910, 4006, "city", "dusk", [M(3910, (f) => { const z = L(-60, -66, at(f, 3910, 4006)); return { pos: [0.4, 1.3, z - 7], look: [0, 1.0, z + 4], fov: 44 }; })],
  (f) => { const z = L(-56, -62, at(f, 3910, 4006)); return { actors: (["yelena", "bucky", "redguardian", "ghost", "usagent"] as CastId[]).map((id, i) => ({ id, x: -1.8 + i * 0.9, z: z - Math.abs(i - 2) * 0.7, legs: "walk", phase: f / FPS + i * 0.21, pose: "idle", expr: (i === 0 ? "stern" : i === 2 ? "grin" : "neutral") as Expr, mirror: true, seed: 200 + i })) }; });
// 4006-4108 "save New York from Bob, a hero with the power of a million exploding suns"
shot(13, 4006, 4108, "city", "dusk", [D(4006, [2, 1.6, 12], [0, 6, 0], { fov: 46, rate: 0.0025 }), { f: 4062, dur: 22, s: (f) => dolly([0.6, 6.4, 6], [0, 6.6, 0], pushK(f, 4062, 0.002, 0.006), { fov: 40, roll: 0.04 }) }],
  (f) => ({ actors: [{ id: "bob", x: 0, y: 5, z: 0, s: 1.1, pose: f > 4062 ? "lift" : "idle", legs: "fly", expr: f > 4062 ? "grin" : "nervous", glow: 1, flutter: 0.6, shadow: false }],
    fx: f > 4064 ? [{ k: "burst", x: 0, y: 6.7, z: -0.5, w: L(2, 9, at(f, 4064, 4100)), t: (f % 18) / 18, col: "#ffe680", alpha: 0.85 }] : [] }));
// 4108-4187 "and a darkness that turns people into shadows"
shot(13, 4108, 4187, "city", "night", [D(4108, [0.8, 1.5, 11], [0, 1.2, 2], { fov: 44, rate: 0.002 })],
  (f) => ({ actors: [{ id: "void", x: 0, z: 0, s: 1.2, pose: "reach", expr: "stern", flutter: 0.8 }, ...(["folk1", "folk2", "folk3"] as CastId[]).map((id, i): ActorSpec => ({ id, x: [-1.5, 1.4, 0.3][i], z: [3, 3.4, 5][i], pose: "reach", expr: "shock", alpha: 1 - sm(f, 4130 + i * 9, 4138 + i * 9), seed: 300 + i, blink: 0 })),
    ...(["folk1", "folk2", "folk3"] as CastId[]).map((_, i): ActorSpec => ({ id: "void", x: [-1.5, 1.4, 0.3][i], z: [3, 3.4, 5][i] + 0.02, s: 0.95, pose: "reach", expr: "neutral", alpha: sm(f, 4126 + i * 9, 4140 + i * 9), seed: 310 + i }))] }));
// 4187-4326 "the asterisk in Thunderbolts* is real. It stands for, The New Avengers."
shot(13, 4187, 4326, "city", "day", [D(4187, [8, 2.2, -30], [-12, 17, -46], { fov: 52, rate: 0.0018 }), { f: 4282, dur: 26, s: (f) => dolly([7, 2, -32], [-12.5, 18, -47], pushK(f, 4282, 0.002), { fov: 50, roll: 0.03 }) }],
  (f) => ({ actors: (["yelena", "bucky", "redguardian", "ghost", "usagent", "bob"] as CastId[]).map((id, i) => ({ id, x: -9.4 - (i % 2) * 0.6, z: -42.5 - i * 0.8, y: 0.18, pose: (f > 4286 ? "cheer" : i === 2 ? "hips" : "idle") as Pose, expr: (f > 4286 ? "laugh" : "smile") as Expr, seed: 400 + i })),
    fx: [{ k: "sign", x: -14.3, y: 26, z: -48, w: 14, h: 7, yaw: Math.PI / 2, text: f < 4284 ? ["THUNDERBOLTS*"] : ["*THE NEW", "AVENGERS"], col: "#1f1b2e", col2: f < 4284 ? "#ffd84a" : "#7fd6ff" }] }));
// 4326-4475 "Fourteen months later, a ship from another universe arrives, with a big four on the side."
const shipP = (f: number): V3 => { const t = sm(f, 4350, 4440); return [L(-30, 0, t), L(160, 24, t), L(-120, -14, t)]; };
shot(13, 4326, 4475, "city", "day", [M(4326, (f) => { const t = glide(at(f, 4326, 4400)), sp = shipP(f); return { pos: [3, 1.5, 30], look: [L(0, sp[0], t), L(4, sp[1], t), L(10, sp[2], t)], fov: 46 }; }), { f: 4412, cut: true, s: (f) => { const sp = shipP(f); return dolly([sp[0] + 16, sp[1] - 4, sp[2] + 30], sp, pushK(f, 4412, 0.0025), { fov: 40 }); } }],
  (f, H) => { const t = sm(f, 4350, 4440), sp = shipP(f); H.ship.visible = true; H.ship.position.set(...sp); H.ship.rotation.set(L(-0.9, -0.2, t), 0.6, L(0.6, 0.15, t));
    return { actors: [{ id: "yelena", x: -0.5, z: 22, pose: "point", expr: f > 4398 ? "shock" : "neutral", seed: 4 }, { id: "bucky", x: 0.5, z: 22.4, pose: "idle", expr: f > 4400 ? "shock" : "neutral", seed: 5 }],
      fx: [{ k: "portal", x: -30, y: 170, z: -130, w: 40 * (1 - at(f, 4420, 4450)), t: f * 0.01, col: "#3a6fbf", col2: "#dff6ff", full: true }] }; });

// ===== THE FANTASTIC FOUR: FIRST STEPS (2025) =====
// 4475-4601 "That's the Fantastic Four, from Earth 828, a retro-future world."
shot(14, 4475, 4601, "retro", "retro", [D(4475, [0.3, 1.4, 10.5], [0, 1.1, 0], { fov: 42, rate: 0.0025 }), M(4546, (f) => { const t = glide(at(f, 4546, 4601)); return { pos: [L(1, 30, t), L(1.5, 30, t), L(9, 70, t)], look: [0, L(1.4, 40, t), L(0, -100, t)], fov: L(42, 50, t) }; }, false, 30)],
  (f, H) => { H.saucers.forEach((m, i) => { m.visible = true; const a = f * 0.004 + i; m.position.set(Math.cos(a) * (60 + i * 15), 30 + i * 8, -60 + Math.sin(a) * 50); });
    return { actors: (["reed", "sue", "torch", "thing"] as CastId[]).map((id, i) => ({ id, x: -1.5 + i * 0.95 + (i === 3 ? 0.2 : 0), z: i % 2 ? -0.4 : 0, s: id === "thing" ? 1.35 : 1, pose: (["hips", "wave", "cheer", "cross"] as Pose[])[i], wave: Math.sin(f * 0.2), expr: (i === 3 ? "stern" : "grin") as Expr, seed: 500 + i, glow: 1 })) }; });
// 4601-4673 "They beat Galactus, a planet eater"
shot(14, 4601, 4673, "space", "space", [D(4601, [0, 0, 160], [0, 40, -200], { fov: 52, rate: 0.0015 })],
  (f, H) => { planet(H, 0, [0, -10, -220], 70, f * 0.002); return { actors: [], fx: [{ k: "hero", x: 0, y: 110, z: -330, w: 150, h: 250, text: ["galactus", f > 4640 ? "grin" : "stern", "reach"] }] }; });
// 4673-4721 "who wanted their baby son, Franklin"
shot(14, 4673, 4721, "retro", "retro", [D(4673, [0.3, 1.3, 4.0], [0.2, 1.1, 0], { fov: 40, rate: 0.003, punch: 0.006, n: 26 })],
  (f) => ({ actors: [{ id: "sue", x: 0, z: 0, pose: "hold", expr: "smile_closed", seed: 3 }, { id: "reed", x: 0.95, z: -0.6, pose: "idle", expr: "smile", seed: 4 }],
    fx: [{ k: "hero", x: 0.02, y: 0.86, z: 0.12, w: 0.33, h: 0.55, text: ["franklin", "smile", "idle"] }, { k: "sparkle", x: 0.32, y: 1.18, z: 0.15, w: 0.18 + 0.03 * Math.sin(f * 0.3), col: "#9fe6ff" }] }));
// 4721-4810 "But four years later, someone comes to visit little Franklin."
shot(14, 4721, 4810, "retro", "retroNight", [D(4721, [400.9, 1.35, 4.4], [400.6, 0.85, -1.2], { fov: 44, rate: 0.002 })],
  (f) => ({ actors: [{ id: "franklin", x: 399.9, z: -0.6, pose: "sit", legs: "sit", expr: f > 4770 ? "smile" : "smile_closed", seed: 4 },
    { id: "doom", x: L(402.2, 401.0, sm(f, 4750, 4800)), z: -2.2, legs: f < 4800 ? "walk" : "stand", phase: f / FPS * 0.7, pose: "idle", expr: "stern", alpha: sm(f, 4748, 4760), seed: 5, mirror: true }],
    fx: [{ k: "blocks", x: 399.3, y: 0.2, z: -0.1, w: 0.5, h: 0.33 }] }));
// 4810-4870 "Someone in a metal mask."
shot(14, 4810, 4870, "retro", "retroNight", [D(4810, [400.9, 1.95, 1.0], [401.2, 1.92, -2.2], { fov: 34, rate: 0.002, punch: 0.006, n: 30, roll: -0.04 })],
  (f) => ({ actors: [{ id: "doom", x: 401.2, z: -2.2, pose: "reach", expr: "stern", flutter: 0.3, seed: 5, mirror: true }] }));

// ===== SPIDER-MAN: BRAND NEW DAY (2026) =====
// 4870-4940 Spider-Man swings down the avenue
shot(15, 4870, 4940, "city", "day", [M(4870, (f) => { const t = at(f, 4870, 4940), z = L(60, -20, t); return { pos: [3.5, 9.5, z + 7], look: [2 * Math.sin(t * Math.PI * 3) * 0.6, 9.4, z], fov: 46 }; })],
  (f) => { const t = at(f, 4870, 4940), z = L(60, -20, t), sw = Math.sin(t * Math.PI * 3); return { actors: [{ id: "spidey3", x: 2 * sw, y: 8 + 3 * Math.abs(Math.cos(t * Math.PI * 3)), z, pose: "fly", legs: "fly", expr: "grin", roll: -0.4 * sw, shadow: false, seed: 3 }] }; });
// 4940-5020 "faces a grieving young telepath named Jean Grey"
shot(15, 4940, 5020, "city", "day", [D(4940, [1.5, 1.8, -36], [0, 2.4, -46], { fov: 44, rate: 0.0022 }), { f: 4990, dur: 22, s: (f) => dolly([-0.4, 2.2, -41], [-0.2, 2.6, -46], pushK(f, 4990, 0.0025), { fov: 38, roll: 0.03 }) }],
  (f) => ({ actors: [{ id: "jean", x: 0, y: 1.2 + 0.1 * Math.sin(f * 0.1), z: -46, pose: "lift", legs: "fly", expr: "pained", shadow: false, seed: 3 }, { id: "spidey3", x: 2.4, z: -42, pose: "reach", expr: "nervous", mirror: true, seed: 4 },
    { id: "folk2", x: -3, y: 0.8, z: -44, pose: "reach", legs: "fly", expr: "shock", shadow: false, seed: 5 }, { id: "folk3", x: 3.5, y: 1.1, z: -47, pose: "cheer", legs: "fly", expr: "shock", shadow: false, seed: 6 }],
    fx: [{ k: "ring", x: 0, y: 2.6, z: -46.4, w: 4 + 0.4 * Math.sin(f * 0.2), t: f * 0.02, col: "#ff6fb0", col2: "#ffd1f2" }] }));
// 5020-5093 "and talks a raging Hulk back down"
shot(15, 5020, 5093, "city", "day", [D(5020, [1.2, 1.5, -19.5], [0, 2.4, -30], { fov: 46, rate: 0.0022 }), { f: 5058, dur: 20, s: (f) => dolly([0.6, 1.5, -22.5], [0, 2.0, -30], pushK(f, 5058, 0.002), { fov: 42 }) }],
  (f) => ({ actors: [{ id: "hulk", x: -0.7, z: -30, s: 2.1, pose: f < 5054 ? "lift" : "idle", expr: f < 5054 ? "stern" : "relief", seed: 3 }, { id: "spidey3", x: 0.9, z: -27, pose: "wave", wave: 0.2 * Math.sin(f * 0.1), expr: "smile", mirror: true, seed: 4 }] }));

// ===== AVENGERS: DOOMSDAY (December 18, 2026) =====
// 5093-5186 "Which brings us to Doomsday. The multiverse is collapsing,"
shot(16, 5093, 5186, "space", "incursion", [D(5093, [0, 30, 260], [0, 0, 0], { fov: 50, rate: 0.0012 })],
  (f, H) => { bubbles(H, f, [0, 0, 0], 160, sm(f, 5140, 5186)); planet(H, 2, [L(-200, -60, sm(f, 5100, 5186)), 20, -40], 30); planet(H, 3, [L(200, 60, sm(f, 5100, 5186)), -20, -40], 30);
    return { actors: [], fx: f > 5160 ? [{ k: "crack", x: 0, y: 0, z: 40, w: 200, h: 60, col: "#ff6a3a", seed: 33, full: true, alpha: sm(f, 5160, 5170) }] : [] }; });
// 5186-5265 "and Doctor Doom is standing right in the middle of it."
shot(16, 5186, 5265, "castle", "storm", [D(5186, [0.9, 1.4, 6.2], [0, 1.5, 0], { fov: 44, rate: 0.003 }), { f: 5226, dur: 26, s: (f) => dolly([0.5, 1.9, 6], [0, 2.1, 0], pushK(f, 5226, 0.002, 0.006), { fov: 38, roll: -0.04 }) }],
  (f) => ({ actors: [{ id: "doom", x: 0, z: 0, s: 1.1, pose: "lift", expr: "stern", flutter: 0.7 + 0.3 * Math.sin(f * 0.2) }],
    particles: ring(120, [0, 0.4, 0], 5 + 0.5 * Math.sin(f * 0.05), "#8aff9a", f * 0.04, 0.5), particleSize: 0.18,
    fx: f >= 5190 && f < 5206 ? [{ k: "bolt", x: -6, y: 10, z: -10, w: 2.4, h: 10, seed: 8 }, { k: "bolt", x: 7, y: 11, z: -14, w: 2.4, h: 10, seed: 9 }] : [] }));
// 5265-5392 "Heroes from three universes, the Avengers, the Fantastic Four, and the X-Men,"
const TEAM_A: CastId[] = ["samcap", "thor", "yelena", "shuri", "bucky", "antman"], TEAM_F: CastId[] = ["reed", "sue", "torch", "thing"], TEAM_X: CastId[] = ["cyclops", "magneto", "beast", "nightcrawler", "mystique", "gambit"];
const teamAt = (f: number, run0 = 99999): ActorSpec[] => {
  const out: ActorSpec[] = [], runK = sm(f, run0, run0 + 40);
  const put = (ids: CastId[], x0: number, f0: number) => ids.forEach((id, i) => out.push({ id, x: x0 + i * 0.85, z: 30 - (i % 2) * 0.7 + runK * 6, s: id === "thing" ? 1.35 : 1, pose: (runK > 0 ? "fight" : i % 2 ? "fist" : "hips") as Pose, legs: runK > 0 ? "run" : "stand",
    phase: f / FPS * 1.6 + i * 0.3, expr: "grin", flutter: 0.6, glow: 1, seed: 600 + out.length + f0 * 0 }));
  put(TEAM_A, -9.2, 5311); put(TEAM_F, -1.6, 5330); put(TEAM_X, 4.6, 5359);
  return out;
};
const TEAMCAM = (x: number) => (f: number): CamIn => ({ pos: [x + 0.4, 1.6, 39.5 - 0.004 * (f - 5265)], look: [x, 1.0, 30], fov: 46 });
shot(16, 5265, 5392, "desert", "battle", [M(5265, () => ({ pos: [0, 6, 52], look: [0, 1.5, 30], fov: 52 })), M(5306, TEAMCAM(-7.1)), M(5326, TEAMCAM(-0.3), false, 20), M(5355, TEAMCAM(6.7), false, 22)],
  (f) => ({ actors: teamAt(f), fx: [5311, 5330, 5359].map((f0, i): FxSpec => ({ k: "burst", x: [-7.1, -0.3, 6.7][i], y: 1.2, z: 29.4, w: 5, t: at(f, f0, f0 + 10), col: ["#ffd84a", "#7fd6ff", "#ff9a9a"][i], alpha: f >= f0 && f < f0 + 10 ? 1 : 0 })) }));
// 5392-5441 "have to fight side by side."
shot(16, 5392, 5441, "desert", "battle", [M(5392, (f) => { const t = at(f, 5392, 5441); return { pos: [0, 2.2, 46 + 6 * t], look: [0, 1.2, 30 + 6 * t], fov: 54 }; })],
  (f) => ({ actors: teamAt(f, 5392), particles: dust(900, 0, 0, 34, at(f, 5400, 5441), 160, "#d8b47c", 14, 1.5), particleSize: 0.25 }));
// 5441-5473 "Steve Rogers is back."
shot(16, 5441, 5473, "mansion", "golden", [D(5441, [0.3, 1.0, 4], [0, 1.6, 0], { fov: 38, rate: 0.004, roll: 0.04 })],
  () => ({ actors: [{ id: "cap", x: 0, z: 0, pose: "shield", expr: "grin", seed: 3 }] }));
// 5473-5499 "Thor is back."
shot(16, 5473, 5499, "castle", "storm", [D(5473, [-0.3, 1.0, 4.2], [0, 1.7, 0], { fov: 38, rate: 0.004, roll: -0.04 })],
  (f) => ({ actors: [{ id: "thor", x: 0, z: 0, pose: "fist", expr: "grin", flutter: 0.8, seed: 3 }], fx: [{ k: "bolt", x: 0.5, y: 4.6, z: -0.2, w: 0.7, h: 2.6, seed: (f >> 2) % 5 }] }));
// 5499-5563 "Professor X and Magneto are back."
shot(16, 5499, 5563, "mansion", "golden", [D(5499, [0, 1.3, 6.0], [0, 1.0, 0], { fov: 40, rate: 0.0025, punch: 0.005, n: 30 })],
  () => ({ actors: [{ id: "profx", x: -0.48, z: 0, pose: "sit", legs: "sit", chair: true, expr: "smile_closed", facing: 1 }, { id: "magneto", x: 0.42, z: -0.3, pose: "hips", expr: "grin", facing: -1, flutter: 0.4 }] }));
// 5563-5636 "And under Doom's mask? Robert Downey Junior."
shot(16, 5563, 5636, "castle", "storm", [D(5563, [0.3, 2.0, 3.6], [0, 1.95, 0], { fov: 36, rate: 0.002, punch: 0.006, n: 30 })],
  (f) => ({ actors: [{ id: "doom", x: 0, z: 0, pose: "hold", expr: "stern", flutter: 0.4 }],
    fx: f > 5596 ? [{ k: "sparkle", x: 0.55, y: 2.45, z: 0.2, w: 0.3 * sm(f, 5596, 5604), col: "#ffffff" }] : [] }));
// 5636-5710 "The man who started it all, as Iron Man."
shot(16, 5636, 5710, "castle", "storm", [D(5636, [0, 1.5, 6.6], [0, 1.1, 0], { fov: 42, rate: 0.0022 }), { f: 5668, dur: 24, s: (f) => dolly([0, 1.45, 5.4], [0, 1.15, 0], pushK(f, 5668, 0.0025), { fov: 40 }) }],
  (f) => ({ actors: [{ id: "doom", x: -0.62, z: 0, pose: "idle", expr: "stern", facing: 1, seed: 5 }, { id: "ironman", x: 0.62, z: 0, pose: "fight", expr: "stern", facing: -1, mirror: true, alpha: sm(f, 5668, 5680), glow: 0.6, seed: 6 }] }));
// 5710-end "Avengers: Doomsday. December eighteenth."
shot(16, 5710, TOTAL, "castle", "storm", [M(5710, (f) => { const t = glide(at(f, 5710, 5800)); return { pos: [0, L(2, 18, t), L(10, 60, t)], look: [0, L(3, 14, t), -40], fov: 46 }; })],
  (f) => ({ actors: [{ id: "doom", x: 0, z: 0, s: 1.2, pose: "lift", expr: "stern", flutter: 0.8 }, ...(["samcap", "thor", "reed", "sue", "cyclops", "magneto"] as CastId[]).map((id, i): ActorSpec => ({ id, x: -2.6 + i * 1.05, z: 9, pose: "fight", expr: "stern", mirror: true, seed: 700 + i }))],
    fx: f >= 5726 && f < 5740 ? [{ k: "bolt", x: -8, y: 14, z: -20, w: 3, h: 14, seed: 4 }] : [] }));

export const SHOTS = S;
export const shotAt = (f: number) => { for (let i = S.length - 1; i >= 0; i--) if (f >= S[i].a) return S[i]; return S[0]; };

// ---------------- TVA screen: a timeline with a branch that gets pruned ----------------
let screenTex: THREE.CanvasTexture | null = null; let screenKey = -1;
const screenDraw = (H: Handles, f: number) => {
  const k = Math.min(10, Math.floor(Math.max(0, f - 1866) / 4));
  if (k === screenKey && screenTex) return;
  screenKey = k;
  const c = (screenTex?.image as HTMLCanvasElement) ?? document.createElement("canvas"); c.width = 720; c.height = 180;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2a3a2a"; g.fillRect(0, 0, 720, 180); g.strokeStyle = "#5a7a4a"; g.lineWidth = 2;
  for (let x = 0; x < 720; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 180); g.stroke(); }
  g.lineCap = "round"; g.strokeStyle = "#ffb347"; g.lineWidth = 10; g.beginPath(); g.moveTo(10, 100); g.lineTo(710, 100); g.stroke();
  const pruned = k >= 6;
  if (!pruned) { g.strokeStyle = "#ffd27a"; g.lineWidth = 7; g.beginPath(); g.moveTo(330, 100); g.quadraticCurveTo(420, 100, 470 + k * 12, 40); g.stroke(); }
  else { g.fillStyle = "#ff5a3a"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.fillText("✕", 480, 70); }
  g.fillStyle = "#ffe6b0"; g.font = "bold 22px sans-serif"; g.textAlign = "left"; g.fillText("SACRED TIMELINE", 16, 30);
  if (!screenTex) { screenTex = new THREE.CanvasTexture(c); screenTex.colorSpace = THREE.SRGBColorSpace; }
  screenTex.needsUpdate = true;
  (H.screen.material as THREE.MeshBasicMaterial).map = screenTex; (H.screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
};
