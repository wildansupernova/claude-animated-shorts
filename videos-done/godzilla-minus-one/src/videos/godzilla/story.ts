// Shot table of "Before You Watch Godzilla Minus Zero", timed to the narration (words.json, frames at 30 fps): every
// cut and reaction is cued by word with cue(line, word). Camera grammar from the skill: hard cuts on big reframes,
// smootherstep glides of 18-40 f, every hold creeps in (0.15-0.35 %/f, ~0.6 %/f on punch words), flip-sign impact kicks.
import type { PlaceId, Handles } from "./sets";
import type { LookId } from "./looks";
import type { CastId, Pose, HeroOpts } from "./heroes";
import type { Expr } from "./toon";
import type { ZVar, ZPose } from "./kaiju";
import * as THREE from "three";
import WORDS from "./words.json";
import { board as drawBoard, drawKaiju } from "./kaiju";
import { Pen } from "./toon";

export const FPS = 30;
export const TOTAL = 3300;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const at = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const sm = (f: number, a: number, b: number) => smooth(at(f, a, b));
const L = (a: number, b: number, t: number) => a + (b - a) * t;
const L3 = (a: V3, b: V3, t: number): V3 => [L(a[0], b[0], t), L(a[1], b[1], t), L(a[2], b[2], t)];
const hsh = (i: number, k = 0) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const ex = <T,>(f: number, steps: [number, T][]) => { let v = steps[0][1]; for (const [g, w] of steps) if (f >= g) v = w; return v; };

// ---------------- word cues ----------------
type Wd = { w: string; s: number; e: number; line: string; ch: number };
const WD = WORDS as Wd[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-']/g, "");
/** frame where `word` (prefix match) starts in narration line `line` (k-th match) */
export const cue = (line: string, word: string, k = 0) => {
  const hits = WD.filter((w) => w.line === line && norm(w.w).startsWith(norm(word)));
  if (!hits.length) throw new Error(`cue ${line}/${word}`);
  return Math.round(hits[Math.min(k, hits.length - 1)].s * FPS);
};

// ---------------- types ----------------
export type ActorSpec = {
  id: CastId; x: number; y?: number; z: number; s?: number; pose?: Pose; expr?: Expr; legs?: HeroOpts["legs"]; phase?: number; facing?: -1 | 0 | 1;
  alpha?: number; roll?: number; mirror?: boolean; glow?: number; flutter?: number; tilt?: number; headTilt?: number; seed?: number; shadow?: boolean;
  wave?: number; look?: number; blink?: number; chair?: boolean;
};
export type FxK = "burst" | "ring" | "portal" | "crack" | "bolt" | "puff" | "note" | "sign" | "grave" | "sparkle" | "chess" | "podium" | "blocks" | "gem" | "hero"
  | "gorilla" | "whale" | "rival" | "three" | "mushroom" | "fireball" | "chute" | "bag" | "statue" | "beam" | "glow" | "toy";
export type FxSpec = { k: FxK; x: number; y: number; z: number; w: number; h?: number; t?: number; alpha?: number; flat?: boolean; rot?: number; col?: string; col2?: string;
  seed?: number; full?: boolean; text?: string[]; soft?: boolean; yaw?: number; tint?: string };
export type ZSpec = { x: number; y?: number; z: number; h: number; v?: ZVar; pose?: ZPose; phase?: number; glow?: number; jaw?: number; eye?: "angry" | "friendly" | "x" | "shut";
  mirror?: boolean; alpha?: number; sweat?: number; regrow?: number; rim?: string; tint?: string; shadow?: boolean; roll?: number };
export type Particle = [number, number, number, string];
export type SceneOut = { actors: ActorSpec[]; zillas?: ZSpec[]; fx?: FxSpec[]; particles?: Particle[]; particleSize?: number };
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
const pushK = (f: number, f0: number, rate = 0.0025, punch = 0, n = 32) => {
  const x = Math.max(0, f - f0); let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): CamIn => ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** a dolly key that creeps in from its start frame (p0: where a punch-in starts) */
const D = (f0: number, pos: V3, look: V3, o: { fov?: number; roll?: number; rate?: number; punch?: number; n?: number; dur?: number; cut?: boolean; p0?: number } = {}): Key =>
  ({ f: f0, dur: o.dur, cut: o.cut, s: (f) => {
    const base = Math.exp(-(o.rate ?? 0.0025) * Math.max(0, f - f0));
    const pk = o.punch ? pushK(f, o.p0 ?? f0, 0, o.punch, o.n ?? 32) : 1;
    return dolly(pos, look, base * pk, { fov: o.fov ?? 40, roll: o.roll ?? 0 });
  } });
/** a moving camera given as a function, cut in at f0 */
const M = (f0: number, s: (f: number) => CamIn, cut = true, dur?: number): Key => ({ f: f0, cut, dur, s });

let KICKS: [number, number][] = [];
export const kickAt = (f: number) => { let a = 0; for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; } return a; };
export const camAt = (s: Shot, f: number): Cam => {
  const c = run(s.cam, f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ln = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ln * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- particles ----------------
const ashFall = (f: number, cx: number, cy: number, cz: number, n: number, area = 14, h = 10, col = "#f4f2ec"): Particle[] => {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) { const y = (((hsh(i, 5) * h - (f / FPS) * (0.6 + 0.5 * hsh(i, 6))) % h) + h) % h; out.push([cx + (hsh(i, 7) - 0.5) * area + 0.3 * Math.sin(f * 0.04 + i), cy + y, cz + (hsh(i, 8) - 0.5) * area, col]); }
  return out;
};
const rise = (f: number, cx: number, cy: number, cz: number, n: number, area: number, h: number, speed: number, cols: string[]): Particle[] => {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) { const y = (((hsh(i, 15) * h + (f / FPS) * speed * (0.6 + 0.8 * hsh(i, 16))) % h) + h) % h; out.push([cx + (hsh(i, 17) - 0.5) * area + 0.4 * Math.sin(f * 0.05 + i), cy + y, cz + (hsh(i, 18) - 0.5) * area, cols[i % cols.length]]); }
  return out;
};
const rain = (f: number, cx: number, cy: number, cz: number, n: number, area: number, h: number): Particle[] => {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) { const y = (((hsh(i, 25) * h - (f / FPS) * 18) % h) + h) % h; for (let k = 0; k < 2; k++) out.push([cx + (hsh(i, 27) - 0.5) * area, cy + y + k * 0.35, cz + (hsh(i, 28) - 0.5) * area, "#c8d6e6"]); }
  return out;
};
const dust = (seed: number, cx: number, cy: number, cz: number, t: number, n: number, col: string, spread = 1.2, up = 1.6): Particle[] => {
  const out: Particle[] = [];
  if (t <= 0) return out;
  for (let i = 0; i < n; i++) {
    const r0 = hsh(seed + i, 1), r1 = hsh(seed + i, 2), r2 = hsh(seed + i, 3), k = clamp01(t * (0.6 + 0.8 * r2));
    if (k >= 1) continue;
    out.push([cx + (r0 - 0.5) * 0.7 + (r1 - 0.3) * spread * 2.5 * k, cy + r1 * 1.8 * spread * 0.5 + up * k, cz + (r2 - 0.5) * 0.6 + spread * k * (r0 - 0.5), col]);
  }
  return out;
};
const confetti = (f: number, cx: number, cy: number, cz: number, n: number, area: number, h: number): Particle[] => ashFall(f, cx, cy, cz, n, area, h).map((p, i) => [p[0], p[1], p[2], ["#ffd84a", "#e0303a", "#ffffff", "#3fae5a", "#6fb6ff"][i % 5]] as Particle);

// ---------------- dynamic screen textures (blackboard, cinema screen) ----------------
let boardTex: THREE.CanvasTexture | null = null; let boardKey = "";
const setBoard = (H: Handles, step: number, dead: number) => {
  const key = `${Math.round(step * 20)}|${dead > 0 ? 1 : 0}`;
  if (key === boardKey && boardTex) return;
  boardKey = key;
  const c = (boardTex?.image as HTMLCanvasElement) ?? document.createElement("canvas"); c.width = 1200; c.height = 750;
  const g = c.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1200, 750);
  drawBoard(new Pen(g), step, dead);
  if (!boardTex) { boardTex = new THREE.CanvasTexture(c); boardTex.colorSpace = THREE.SRGBColorSpace; }
  boardTex.needsUpdate = true;
  const m = H.board.material as THREE.MeshBasicMaterial; if (m.map !== boardTex) { m.map = boardTex; m.needsUpdate = true; }
};
let scrTex: THREE.CanvasTexture | null = null; let scrKey = -1;
const setScreen = (H: Handles, f: number) => {
  const k = Math.floor(f / 4) % 32;
  if (k === scrKey && scrTex) return;
  scrKey = k;
  const c = (scrTex?.image as HTMLCanvasElement) ?? document.createElement("canvas"); c.width = 1100; c.height = 475;
  const g = c.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, 475); gr.addColorStop(0, "#3a3a7a"); gr.addColorStop(0.55, "#cc6e7c"); gr.addColorStop(0.8, "#ffb878"); gr.addColorStop(1, "#2a4a6a");
  g.fillStyle = gr; g.fillRect(0, 0, 1100, 475);
  g.fillStyle = "#fff0c8"; g.beginPath(); g.arc(560, 372, 70, 0, 7); g.fill();
  g.fillStyle = "#1e3a58"; g.fillRect(0, 380, 1100, 95);
  g.save(); g.translate(330 + k * 6, 40); g.scale(0.36, 0.36); drawKaiju(new Pen(g), { v: "sil", pose: "walk", phase: (k % 8) / 8, glow: 0.6, rim: "#ffb070" }); g.restore();
  if (!scrTex) { scrTex = new THREE.CanvasTexture(c); scrTex.colorSpace = THREE.SRGBColorSpace; }
  scrTex.needsUpdate = true;
  const m = H.screen.material as THREE.MeshBasicMaterial; if (m.map !== scrTex) { m.map = scrTex; m.needsUpdate = true; }
};

// ---------------- the shots ----------------
const S: Shot[] = [];
const shot = (ch: number, a: number, b: number, place: PlaceId, look: LookId, cam: Key[], scene: Shot["scene"]) => S.push({ ch, a, b, place, look, cam, scene });
const boatAt = (H: Handles, f: number, x = 0, z = 0, ry = 0) => { H.boat.visible = true; H.boat.position.set(x, 0.15 * Math.sin(f * 0.06), z); H.boat.rotation.set(0.012 * Math.sin(f * 0.05), ry, 0.02 * Math.sin(f * 0.043)); };
const DECK = 2.1;
const FISH = (e: Expr, o: Partial<ActorSpec> = {}): ActorSpec[] => [
  { id: "fish1", x: 1.6, y: DECK, z: 0.9, expr: e, seed: 11, ...o },
  { id: "fish2", x: -0.6, y: DECK, z: -0.4, expr: e, seed: 12, mirror: true, ...o },
  { id: "fish3", x: 3.6, y: DECK, z: -0.2, expr: e, seed: 13, ...o },
];
// "west" = far along -x; the false sun and the cloud sit there
const WEST: V3 = [-1500, 0, -350];

// ===== HOOK (ch 0) =====
const H1t = cue("H1", "twenty"), H1s = cue("H1", "sun"), H1r = cue("H1", "rise"), H1w = cue("H1", "in");
const H2 = cue("H2", "it"), H2b = cue("H2", "bomb"), H2z = cue("H2", "godzilla");
const H3 = cue("H3", "before"), H3z = cue("H3", "godzilla"), H3e = cue("H3", "everything");
// 0 - "March first, 1954": the tuna boat alone on the night sea
shot(0, 0, H1t - 2, "sea", "predawn", [D(0, [-26, 7, 30], [2, 3, 0], { fov: 40, rate: 0.0022 })],
  (f, H) => { boatAt(H, f); return { actors: FISH("neutral", { look: -1 }), fx: [{ k: "glow", x: -8, y: 4.3, z: 1.9, w: 2.4, soft: true, col: "#ffcf7a" }] }; });
// "Twenty-three fishermen watched": on deck, faces to the west
shot(0, H1t - 2, H1s - 1, "sea", "predawn", [D(H1t - 2, [1.4, 3.6, -7.2], [1.4, 3.2, 0], { fov: 40, rate: 0.003 })],
  (f, H) => { boatAt(H, f); return { actors: FISH("neutral", { look: 0 }) }; });
// "the sun rise" - the light hits their faces
shot(0, H1s - 1, H1w - 1, "sea", "westface", [D(H1s - 1, [1.4, 3.6, -6.4], [1.4, 3.25, 0], { fov: 40, rate: 0.004, punch: 0.008, n: 20 })],
  (f, H) => { boatAt(H, f); return { actors: FISH(ex(f, [[0, "neutral"], [H1r, "shock"]]) as Expr) }; });
// "in the west": a second sun on the horizon, the boat's mast against it
shot(0, H1w - 1, H2 - 1, "sea", "westglow", [D(H1w - 1, [14, 3.2, 10], [-60, 9, -14], { fov: 44, rate: 0.0025 })],
  (f, H) => { boatAt(H, f); const t = sm(f, H1w - 1, H2 + 10);
    return { actors: [{ id: "fish1", x: 3.2, y: DECK, z: 1.5, expr: "shock", facing: -1, look: -1, seed: 11 }, { id: "fish3", x: 5.2, y: DECK, z: 0.6, expr: "shock", facing: -1, look: -1, seed: 13 }],
      fx: [{ k: "fireball", x: WEST[0], y: 20 + 70 * t, z: WEST[2], w: 260 + 120 * t, soft: true, t: 0.6 + 0.4 * t }] }; });
// "It wasn't the sun. It was a hydrogen bomb": the mushroom cloud climbs over the horizon
KICKS.push([H2b, 1.4]);
shot(0, H2 - 1, H2z - 3, "sea", "westglow", [D(H2 - 1, [18, 4.5, 14], [-80, 40, -30], { fov: 48, rate: 0.002 }), D(H2b - 2, [12, 4, 10], [-80, 44, -30], { fov: 46, dur: 30, rate: 0.003, punch: 0.006 })],
  (f, H) => { boatAt(H, f); const t = sm(f, H2 - 20, H2z + 20);
    return { actors: [{ id: "fish1", x: 3.2, y: DECK, z: 1.5, expr: "shock", facing: -1, look: -1, seed: 11 }, { id: "fish2", x: 1.0, y: DECK, z: 0.6, expr: f > H2b ? "pained" : "shock", facing: -1, look: -1, seed: 12 }, { id: "fish3", x: 5.2, y: DECK, z: 0.6, expr: "shock", facing: -1, look: -1, seed: 13 }],
      fx: [{ k: "glow", x: WEST[0], y: 60, z: WEST[2], w: 900, soft: true, col: "#ffb070", alpha: 0.6 }, { k: "mushroom", x: WEST[0], y: 420 * t + 40, z: WEST[2], w: 700, h: 875, t: 0.25 + 0.75 * t, seed: 1, soft: true }] }; });
// "and it gave birth to Godzilla": he rises out of the sea, roaring
KICKS.push([H2z, 1.6]);
shot(0, H2z - 3, H3 - 1, "sea", "stormsea", [D(H2z - 3, [10, 2.4, 70], [0, 34, -20], { fov: 46, rate: 0.003, punch: 0.008, n: 24 })],
  (f) => { const r = sm(f, H2z - 3, H2z + 22);
    return { actors: [], zillas: [{ x: 0, y: -26 + 26 * r, z: -30, h: 52, v: "m1", pose: "roar", jaw: sm(f, H2z, H2z + 8), shadow: false }],
      particles: [...rise(f, 0, -2, -30, 220, 40, 30 * r + 2, 6, ["#e8f2fa", "#cfe0ec"]), ...rain(f, 0, 0, 40, 160, 60, 40)], particleSize: 0.5 }; });
// "Before you watch Godzilla Minus Zero, here's everything you need to know": the cinema tonight, he peeks over the roof
shot(0, H3 - 1, cue("O1", "white") - 1, "city", "cineNight", [D(H3 - 1, [-6, 1.6, 150], [14, 9, 196], { fov: 46, rate: 0.0018 }), D(H3e - 4, [-3, 1.5, 165], [14, 10, 198], { fov: 44, dur: 30, rate: 0.002 })],
  (f) => ({ actors: (["aud1", "aud2", "aud3", "aud4"] as CastId[]).map((id, i) => ({ id, x: 11.6 + (i % 2) * 0.5, y: 0.18, z: 182 + i * 1.4 + ((f / FPS) * 0.6) % 1.2, legs: "walk" as const, phase: f / FPS + i * 0.3, mirror: true, seed: 30 + i, expr: (i % 2 ? "grin" : "smile") as Expr })),
    zillas: [{ x: 62, z: 236, h: 46, v: "m1", pose: f > H3z ? "roar" : "stand", jaw: sm(f, H3z, H3z + 10) * 0.8, mirror: true, shadow: false }] }));

// ===== GODZILLA 1954 (ch 1) =====
const O1 = cue("O1", "white"), O1l = cue("O1", "lucky"), O1c = cue("O1", "the", 1), O1d = cue("O1", "death");
const O2 = cue("O2", "eight"), O2m = cue("O2", "monster"), O2g = cue("O2", "gojira"), O2h = cue("O2", "gorilla"), O2w = cue("O2", "whale");
const O3 = cue("O3", "inside"), O3h = cue("O3", "hundred"), O3s = cue("O3", "stomping"), O3t = cue("O3", "tokyo");
// "White ash fell on their boat, the Lucky Dragon Number Five"
shot(1, O1 - 1, O1c - 1, "sea", "ash", [D(O1 - 1, [16, 5.5, 18], [4, 3, 0], { fov: 42, rate: 0.002 }), D(O1l - 4, [14, 2.6, 10.5], [9, 1.6, 2.7], { fov: 40, dur: 30, rate: 0.0025 })],
  (f, H) => { boatAt(H, f); return { actors: FISH("nervous", { pose: "reach", look: 1 }), particles: ashFall(f, 4, 1.6, 2, 520, 26, 12), particleSize: 0.12 }; });
// "The crew called it death ash."
shot(1, O1c - 1, O2 - 1, "sea", "ash", [D(O1c - 1, [1.9, 3.75, 3.1], [1.6, 3.5, 0.9], { fov: 38, rate: 0.003, punch: 0.008, p0: O1d - 4, n: 24 })],
  (f, H) => { boatAt(H, f); return { actors: [{ id: "fish1", x: 1.6, y: DECK, z: 0.9, pose: "hold", expr: f >= O1d - 1 ? "shock" : "pained", seed: 11 }, { id: "fish2", x: -0.4, y: DECK, z: -1.2, expr: "nervous", seed: 12, mirror: true }],
    particles: ashFall(f, 1.6, 2.2, 1.5, 240, 5, 4), particleSize: 0.05 }; });
// "Eight months later, Japan got a monster made of that fear": Ginza at night, 1954
KICKS.push([O2m, 1.2]);
shot(1, O2 - 1, O2g - 1, "city", "night54", [D(O2 - 1, [-5, 1.5, 70], [0, 24, -40], { fov: 50, rate: 0.0022, punch: 0.006, p0: O2m - 4, n: 26 })],
  (f) => { const w = (f - O2) / FPS;
    return { actors: [{ id: "folkM", x: -2.5, y: 0, z: 52 - w * 1.2, legs: "run", phase: w * 1.6, expr: "shock", seed: 41 }, { id: "folkW", x: 2.2, y: 0, z: 49 - w * 1.0, legs: "run", phase: w * 1.6 + 0.3, expr: "shock", seed: 42 }],
      zillas: [{ x: 2, z: -70 + w * 3, h: 50, v: "m1", pose: f > O2m - 2 ? "roar" : "walk", phase: w * 0.45, jaw: sm(f, O2m - 2, O2m + 8), glow: 0.15 }],
      fx: [{ k: "glow", x: -22, y: 8, z: -30, w: 26, soft: true, col: "#ff8a3a", alpha: 0.75 }, { k: "glow", x: 24, y: 6, z: -10, w: 22, soft: true, col: "#ff8a3a", alpha: 0.65 }],
      particles: rise(f, 0, 0, -20, 260, 60, 30, 3, ["#ffb347", "#ff7a2a", "#ffd27a"]), particleSize: 0.22 }; });
// "Gojira: half gorilla, half whale." On the studio's painted sky: gorilla + whale = him
shot(1, O2g - 1, O3 - 1, "studio", "stage", [D(O2g - 1, [0, 1.7, 8.6], [0, 1.55, 0], { fov: 40, rate: 0.0015 })],
  (f) => { const g = sm(f, O2h - 3, O2h + 5), wh = sm(f, O2w - 3, O2w + 5), m = sm(f, O2w + 8, O2w + 20), z = sm(f, O2w + 18, O2w + 26);
    const fx: FxSpec[] = [];
    if (m < 1) fx.push({ k: "gorilla", x: L(-1.25, -0.2, m), y: 1.25 + 0.15 * (1 - g), z: 0, w: Math.max(0.01, 1.7 * g), h: Math.max(0.01, 1.7 * g), alpha: g > 0 ? 1 - m * 0.9 : 0 },
      { k: "whale", x: L(1.3, 0.2, m), y: 1.35, z: 0.1, w: Math.max(0.01, 2.2 * wh), h: Math.max(0.01, 1.4 * wh), alpha: wh > 0 ? 1 - m * 0.9 : 0 });
    if (m > 0.6 && z < 1) fx.push({ k: "puff", x: 0, y: 1.3, z: 0.3, w: 2.8 * m, h: 2.1 * m, col: "#f4f1e8", seed: 3 });
    return { actors: [], fx, zillas: z > 0 ? [{ x: 0, z: 0, h: 2.5 * (0.6 + 0.4 * z), v: "showa", pose: "hop", eye: "friendly", alpha: z }] : [] }; });
// "Inside, a stuntman sweated in a hundred-kilo rubber suit"
KICKS.push([O3h, 0.7]);
shot(1, O3 - 1, O3s - 2, "studio", "stage", [D(O3 - 1, [1.6, 1.9, 5.2], [0.2, 1.75, 0], { fov: 40, rate: 0.0025, punch: 0.005, p0: O3h - 3, n: 24 })],
  (f) => ({ actors: [{ id: "crew2", x: 2.4, z: 1.2, pose: "point", expr: "grin", mirror: true, seed: 51 }, { id: "crew1", x: -2.2, z: 1.8, pose: "hips", expr: "smile", seed: 52 }],
    zillas: [{ x: -0.1, z: 0, h: 2.35, v: "suitOpen", pose: "stand", sweat: ((f - O3) / 40) % 1 }] }));
// "stomping a tiny Tokyo": lens at miniature height, the suit walks down the toy street
KICKS.push([O3s + 6, 0.8], [O3t, 1.0]);
shot(1, O3s - 2, cue("Y1", "then") - 1, "studio", "stage", [D(O3s - 2, [0.5, 0.42, 3.0], [0, 1.0, -4], { fov: 48, rate: 0.002, punch: 0.006, p0: O3t - 3, n: 24 })],
  (f) => { const w = (f - O3s) / FPS, z = -5.2 + w * 0.9;
    return { actors: [], zillas: [{ x: 0, z, h: 2.35, v: "suit", pose: "walk", phase: w * 0.9 }],
      particles: [...dust(3, 0.2, 0, z + 0.3, at(f, O3s + 6, O3s + 30), 30, "#d8c8b0", 0.8, 0.6), ...dust(9, -0.2, 0, z + 0.3, at(f, O3t, O3t + 24), 30, "#d8c8b0", 0.8, 0.6)], particleSize: 0.06 }; });

// ===== 70 YEARS (ch 2) =====
const Y1 = cue("Y1", "then"), Y1w = cue("Y1", "weirdly"), Y1s = cue("Y1", "saving"), Y1f = cue("Y1", "from");
const Y2 = cue("Y2", "nearly"), Y2f = cue("Y2", "film", 1), Y2r = cue("Y2", "record");
const BZ = 470; // beach: sand ring to r = 470, sea beyond (+z)
// "Then he got famous, and weirdly friendly": he waves at kids on the beach
shot(2, Y1 - 1, Y1s - 1, "island", "golden", [D(Y1 - 1, [3, 1.3, BZ - 22], [0, 15, BZ + 90], { fov: 46, rate: 0.002 }), D(Y1w - 3, [2, 1.2, BZ - 18], [0, 17, BZ + 90], { fov: 44, dur: 28, rate: 0.0025 })],
  (f) => ({ actors: (["kid1", "kid2", "kid3"] as CastId[]).map((id, i) => ({ id, x: -1.6 + i * 1.5, z: BZ - 12 + (i % 2) * 0.8, pose: (i === 1 ? "wave" : "cheer") as Pose, wave: Math.sin(f * 0.3 + i), expr: "grin" as Expr, seed: 60 + i })),
    zillas: [{ x: 0, y: -2.5, z: BZ + 95, h: 40, v: "showa", pose: f > Y1w - 2 ? "hop" : "wave", phase: f / 20, eye: "friendly", shadow: false }] }));
// "saving Earth from other monsters": a 60s rival gets a punch
KICKS.push([Y1f, 1.0]);
shot(2, Y1s - 1, Y2 - 1, "island", "golden", [D(Y1s - 1, [-12, 4, BZ - 30], [0, 16, BZ + 100], { fov: 50, rate: 0.0025 })],
  (f) => { const hit = sm(f, Y1f - 2, Y1f + 4);
    const fx: FxSpec[] = [{ k: "rival", x: 26 + 6 * hit, y: 16 + 2 * hit, z: BZ + 104, w: 36, h: 36, t: hit, rot: -0.25 * hit }];
    if (hit > 0.5 && f < Y1f + 14) fx.push({ k: "burst", x: 10, y: 22, z: BZ + 96, w: 18, t: at(f, Y1f, Y1f + 14), col: "#fff3b0" });
    return { actors: [], fx, zillas: [{ x: -22 + 6 * hit, y: -2.5, z: BZ + 100, h: 40, v: "showa", pose: hit > 0.3 ? "punch" : "stand", eye: "angry", shadow: false }] }; });
// "Nearly forty films later, it's the longest-running film series on record": the parade of eras along the shore
const PARADE: ZVar[] = ["showa", "heisei", "mv", "shin", "m1"];
shot(2, Y2 - 1, cue("M1", "then") - 1, "island", "golden", [M(Y2 - 1, (f) => { const t = glide(at(f, Y2 - 1, Y2f)); return { pos: [L(-150, -20, t), 6, BZ - 70], look: [L(-120, 10, t), 20, BZ + 110], fov: 46 }; }),
  M(Y2f - 2, (f) => { const t = glide(at(f, Y2f - 2, Y2r + 10)); return { pos: [L(-20, 0, t), L(6, 30, t), L(BZ - 70, BZ - 150, t)], look: [0, 22, BZ + 110], fov: L(46, 52, t) }; }, false, 34)],
  (f) => { const w = (f - Y2) / FPS;
    return { actors: [], zillas: PARADE.map((v, i) => ({ x: -170 + i * 62 + w * 6, y: -2.5, z: BZ + 110 + (i % 2) * 14, h: v === "mv" ? 46 : 38 + i * 2, v, pose: "walk" as ZPose, phase: w * 0.5 + i * 0.2, shadow: false })),
      fx: f > Y2r - 4 ? [{ k: "sign", x: 0, y: 62, z: BZ + 60, w: 70, h: 24, text: ["WORLD RECORD"], col: "#e8b33c", col2: "#2a1f36", alpha: sm(f, Y2r - 4, Y2r + 4) }] : [] }; });

// ===== GODZILLA MINUS ONE (ch 3) =====
const M1 = cue("M1", "then"), M1m = cue("M1", "minus");
const M2 = cue("M2", "it's"), M2j = cue("M2", "japan"), M2z = cue("M2", "zero"), M2t = cue("M2", "then"), M2d = cue("M2", "drags"), M2m = cue("M2", "minus");
const M3 = cue("M3", "koichi"), M3f = cue("M3", "faked");
const M4 = cue("M4", "when"), M4h = cue("M4", "hits"), M4f = cue("M4", "freezes"), M4a = cue("M4", "and");
const M5 = cue("M5", "in"), M5n = cue("M5", "noriko"), M5b = cue("M5", "baby"), M5a = cue("M5", "akiko");
const M6 = cue("M6", "then"), M6m = cue("M6", "mutated"), M6c = cue("M6", "crushes"), M6g = cue("M6", "ginza"), M6n = cue("M6", "noriko"), M6i = cue("M6", "is"), M6s = cue("M6", "swept"), M6b = cue("M6", "blast");
const M7 = cue("M7", "with"), M7s = cue("M7", "sink"), M7t = cue("M7", "then"), M7u = cue("M7", "up"), M7k = cue("M7", "kills");
const M8 = cue("M8", "koichi"), M8s = cue("M8", "straight"), M8m = cue("M8", "mouth");
const M9 = cue("M9", "but"), M9e = cue("M9", "ejects"), M9c = cue("M9", "chooses");
const M10 = cue("M10", "and"), M10m = cue("M10", "strange");
const M11 = cue("M11", "while"), M11f = cue("M11", "flesh"), M11b = cue("M11", "back");
// "Then came Godzilla Minus One."
KICKS.push([M1m, 1.4]);
shot(3, M1 - 1, M2 - 1, "sea", "stormsea", [D(M1 - 1, [12, 2.2, 66], [0, 36, -40], { fov: 46, rate: 0.003, punch: 0.008, p0: M1m - 3, n: 24 })],
  (f) => { const r = sm(f, M1 - 1, M1m + 4);
    return { actors: [], zillas: [{ x: 0, y: -18 + 18 * r, z: -40, h: 52, v: "m1", pose: "roar", jaw: sm(f, M1m - 2, M1m + 6), glow: f > M1m ? 0.25 : 0, shadow: false }],
      particles: [...rain(f, 0, 0, 40, 220, 70, 40), ...rise(f, 0, -2, -40, 120, 40, 14 * r + 1, 5, ["#e8f2fa"])], particleSize: 0.45 }; });
// "It's 1945." over the burned city
shot(3, M2 - 1, M2j - 1, "ruins", "ruins", [M(M2 - 1, (f) => { const t = glide(at(f, M2 - 1, M2j + 6)); return { pos: [L(-30, -12, t), L(48, 14, t), L(90, 40, t)], look: [0, 2, -20], fov: 46 }; })],
  (f) => ({ actors: [{ id: "koichi", x: -2, z: 6, legs: "walk", phase: f / FPS, expr: "neutral", seed: 70 }, { id: "folkB", x: 3, z: 2, legs: "walk", phase: f / FPS + 0.4, expr: "neutral", seed: 71, mirror: true }],
    particles: rise(f, 0, 0, -10, 140, 120, 30, 1.2, ["#8a8070", "#a89a88"]), particleSize: 0.5 }));
// "Japan has lost the war, and is at zero." A signboard reads 0
shot(3, M2j - 1, M2t - 1, "ruins", "ruins", [D(M2j - 1, [3, 2.2, 10], [0, 3.2, -12], { fov: 42, rate: 0.002, punch: 0.008, p0: M2z - 4, n: 26 })],
  () => ({ actors: [{ id: "koichi", x: -1.6, z: 2, expr: "neutral", look: 1, seed: 70 }, { id: "folkW", x: 1.8, z: 0.5, expr: "pained", seed: 72, mirror: true }],
    fx: [{ k: "sign", x: 0, y: 3.6, z: -12, w: 5, h: 4, text: ["0"], col: "#d8c8a0", col2: "#2a1f36" }] }));
// "Then Godzilla drags it down to minus one." He looms; the 0 drops to −1
KICKS.push([M2d, 1.5], [M2m, 1.0]);
shot(3, M2t - 1, M3 - 1, "ruins", "ruins", [D(M2t - 1, [2.4, 1.6, 8], [0, 9, -40], { fov: 48, rate: 0.0025, punch: 0.007, p0: M2m - 3, n: 26 })],
  (f) => { const d = sm(f, M2d - 2, M2d + 8), neg = f >= M2m - 1;
    return { actors: [{ id: "koichi", x: -1.8, z: 2, expr: f > M2d ? "shock" : "neutral", look: 1, seed: 70 }],
      zillas: [{ x: 6, z: -95, h: 50, v: "m1", pose: f > M2d - 2 ? "roar" : "stand", jaw: d, mirror: true }],
      fx: [{ k: "sign", x: 0, y: 3.6 - 1.4 * d, z: -12, w: 5, h: 4, text: [neg ? "−1" : "0"], col: neg ? "#e0303a" : "#d8c8a0", col2: neg ? "#ffffff" : "#2a1f36", rot: 0.12 * d }],
      particles: dust(5, 0, 0, -12, at(f, M2d, M2d + 30), 60, "#a89a88", 3, 3), particleSize: 0.3 }; });
// "Koichi Shikishima is a kamikaze pilot" by his Zero
shot(3, M3 - 1, M3f - 2, "island", "day", [D(M3 - 1, [6.5, 1.7, 9.5], [2, 1.7, 2.5], { fov: 40, rate: 0.0025 })],
  () => ({ actors: [{ id: "koichiP", x: 2.2, z: 4.2, expr: "neutral", seed: 80, flutter: 0.3 }] }));
// "who faked engine trouble to stay alive": a puff of smoke, a nervous grin, a suspicious mechanic
shot(3, M3f - 2, M4 - 1, "island", "day", [D(M3f - 2, [9, 2.2, 7.5], [4.4, 1.9, 1.6], { fov: 40, rate: 0.003 })],
  (f) => ({ actors: [{ id: "koichiP", x: 3.6, z: 3.4, pose: "shrug", expr: "nervous", seed: 80 }, { id: "tachibana", x: 6.6, z: 2.6, pose: "cross", expr: "stern", look: -1, mirror: true, seed: 81 }],
    fx: [{ k: "puff", x: 5.6, y: 2.4 + 0.8 * at(f, M3f, M3f + 40), z: 0.4, w: 2.4 * (0.6 + 0.4 * sm(f, M3f, M3f + 12)), h: 1.8, col: "#3a3a40", seed: 5, alpha: 1 - 0.6 * at(f, M3f + 20, M4) }] }));
// "When Godzilla hits his island base": night, fires, a smaller Godzilla among the hangars
KICKS.push([M4h, 1.4]);
shot(3, M4 - 1, M4f - 2, "island", "islandNight", [D(M4 - 1, [-6, 1.4, 34], [-8, 8, -40], { fov: 48, rate: 0.003, punch: 0.006, p0: M4h - 3, n: 24 })],
  (f) => ({ actors: [{ id: "tachibana", x: -3.5, z: 22, legs: "run", phase: f / 18, expr: "shock", seed: 81, mirror: true }, { id: "folkB", x: -9, z: 18, legs: "run", phase: f / 18 + 0.3, expr: "shock", seed: 82 }],
    zillas: [{ x: -14, z: -38, h: 16, v: "m1", pose: f > M4h - 2 ? "roar" : "walk", phase: f / 50, jaw: sm(f, M4h - 2, M4h + 8), mirror: true }],
    fx: [{ k: "glow", x: 10, y: 4, z: -52, w: 22, soft: true, col: "#ff8a3a", alpha: 0.8 }, { k: "glow", x: -40, y: 3, z: -58, w: 18, soft: true, col: "#ff8a3a", alpha: 0.7 }],
    particles: rise(f, -10, 0, -40, 200, 60, 20, 3, ["#ffb347", "#ff7a2a"]), particleSize: 0.2 }));
// "he freezes," by the cockpit, the fire light on him
shot(3, M4f - 2, M4a - 1, "island", "islandNight", [D(M4f - 2, [1.3, 2.75, 3.6], [0.7, 2.6, 0], { fov: 36, rate: 0.0035 })],
  (f, H) => { H.zero.position.set(-1, 0, -0.2); return { actors: [{ id: "koichiP", x: 0.7, y: 0.55, z: 0.2, expr: "shock", blink: 0, seed: 80 }],
    fx: [{ k: "glow", x: -6, y: 6, z: -14, w: 14, soft: true, col: "#ff8a3a", alpha: 0.6 + 0.2 * Math.sin(f * 0.4) }] }; });
// "and almost everyone dies." The tail sweeps the base
KICKS.push([M4a + 6, 1.2]);
shot(3, M4a - 1, M5 - 1, "island", "islandNight", [D(M4a - 1, [44, 14, 70], [-6, 8, -40], { fov: 46, rate: 0.002 })],
  (f) => { const b = at(f, M4a + 6, M4a + 30);
    return { actors: [], zillas: [{ x: -10, z: -40, h: 16, v: "m1", pose: "roar", jaw: 0.6, mirror: true, glow: 0.2 }],
      fx: [{ k: "burst", x: 14, y: 6, z: -55, w: 16 * (0.4 + b), t: b, col: "#ffb347" }, { k: "glow", x: 14, y: 6, z: -55, w: 40, soft: true, col: "#ff7a2a", alpha: 0.9 * (1 - 0.5 * b) }, { k: "glow", x: -40, y: 5, z: -60, w: 30, soft: true, col: "#ff8a3a", alpha: 0.7 }],
      particles: rise(f, 0, 0, -50, 300, 90, 30, 4, ["#ffb347", "#ff7a2a", "#ffd27a"]), particleSize: 0.35 }; });
// "In burned-out Tokyo, he builds a family: Noriko, and an orphan baby, Akiko."
shot(3, M5 - 1, M5n - 3, "ruins", "golden", [D(M5 - 1, [9, 3.4, 13], [0.5, 1.4, -3], { fov: 40, rate: 0.0022 })],
  () => ({ actors: [{ id: "koichi", x: 1.6, z: 0.4, legs: "sit", pose: "sit", expr: "pained", seed: 70 }] }));
shot(3, M5n - 3, M6 - 1, "ruins", "golden", [D(M5n - 3, [1.0, 1.65, 6.0], [0.2, 1.45, 0], { fov: 40, rate: 0.0025 }), D(M5b - 3, [0.0, 1.55, 3.6], [-0.4, 1.4, 0], { fov: 38, dur: 30, rate: 0.003 })],
  (f) => { const n = sm(f, M5n - 3, M5n + 14);
    return { actors: [{ id: "koichi", x: 1.0, z: 0.2, expr: f > M5n + 10 ? "smile_closed" : "neutral", look: -1, seed: 70 },
      { id: "norikoB", x: L(-3.6, -0.7, n), z: 0.4, legs: n < 1 ? "walk" : "stand", phase: f / 18, pose: "hold", expr: f > M5a ? "smile_closed" : "smile", seed: 73 }] }; });
// "Then Godzilla, mutated by the bomb tests," : Ginza, 1947; his plates light up
shot(3, M6 - 1, M6c - 2, "city", "ginza", [D(M6 - 1, [-3, 1.6, 46], [4, 24, -40], { fov: 48, rate: 0.0022 })],
  (f, H) => { const g = sm(f, M6m - 2, M6c - 2); H.tram.visible = true; H.tram.position.set(0, 0, 18 + (f - M6) * 0.08);
    return { actors: (["folkM", "folkW", "folkB", "folkM"] as CastId[]).map((id, i) => ({ id, x: -6 + i * 3.6, z: 30 - (i % 2) * 2 + (f - M6) * 0.05, legs: "run" as const, phase: f / 16 + i * 0.25, expr: "shock" as Expr, seed: 90 + i, mirror: i % 2 === 1 })),
      zillas: [{ x: 2, z: -62, h: 50, v: "m1", pose: "stand", glow: g }] }; });
// "crushes Ginza." The heat ray, the blast
KICKS.push([M6g, 2.0]);
shot(3, M6c - 2, M6n - 2, "city", "ginza", [D(M6c - 2, [-46, 30, 90], [0, 18, -40], { fov: 48, rate: 0.002 })],
  (f) => { const b = sm(f, M6g - 2, M6n), beam = f >= M6c && f < M6g + 6;
    const fx: FxSpec[] = [];
    if (beam) fx.push({ k: "beam", x: 30, y: 26, z: -20, w: 70, h: 6, rot: -0.38, full: true, soft: true });
    if (f >= M6g - 2) fx.push({ k: "glow", x: 50, y: 10, z: 10, w: 120 * (0.5 + b), soft: true, col: "#e8fbff", alpha: 1 - 0.4 * b }, { k: "mushroom", x: 50, y: 50 * b + 5, z: 10, w: 90, h: 112, t: 0.2 + 0.8 * b, seed: 0, soft: true });
    return { actors: [], fx, zillas: [{ x: 2, z: -62, h: 50, v: "m1", pose: "breath", glow: 1, jaw: 0.9 }] }; });
// "Noriko is swept away by the blast."
shot(3, M6n - 2, M7 - 1, "city", "ginza", [D(M6n - 2, [0.5, 1.6, 4.4], [0.1, 1.5, 0], { fov: 40, rate: 0.003, punch: 0.008, p0: M6b - 3, n: 20 })],
  (f) => { const gone = sm(f, M6b, M6b + 8), push = sm(f, M6i - 2, M6s);
    return { actors: [{ id: "koichi", x: 0.6 + 0.4 * push, z: 0, expr: f > M6b ? "shock" : "nervous", roll: -0.15 * push, seed: 70, mirror: true },
      { id: "noriko", x: -0.6 - 2.5 * gone, z: 0.2, pose: "reach", expr: "stern", alpha: 1 - gone, roll: 0.3 * gone, seed: 73 }],
      particles: dust(7, -0.5, 0, 0, at(f, M6b - 2, M6b + 30), 120, "#e8e2d4", 3.5, 1.5), particleSize: 0.08 }; });
// "With no help from the government, old navy men plan": the planning hall
shot(3, M7 - 1, M7s - 2, "rooms", "hall", [D(M7 - 1, [0, 2.4, 8.5], [0, 2.1, -5], { fov: 44, rate: 0.002 })],
  (f, H) => { setBoard(H, 0, 0);
    return { actors: [{ id: "noda", x: -3.6, z: -4.4, pose: "point", expr: "stern", seed: 100 },
      ...(["navy1", "navy2", "navy3", "tachibana", "koichi", "navy2"] as CastId[]).map((id, i) => ({ id, x: (i % 2 ? 1 : -1) * (1.8 + Math.floor(i / 2) * 0.9), z: 1.3 + Math.floor(i / 2) * 1.8, legs: "sit" as const, pose: "sit" as Pose, expr: "stern" as Expr, seed: 101 + i, mirror: i % 2 === 0 }))] }; });
// "to sink him in a ring of gas,": Sagami Bay, a ring of ships, bubbles, he drops
shot(3, M7s - 2, M7t - 1, "sea", "sky", [D(M7s - 2, [70, 30, 110], [0, 0, 0], { fov: 46, rate: 0.002 })],
  (f, H) => { const s = sm(f, M7s, M7t + 10);
    H.ships.forEach((m, i) => { const a = (i / 6) * Math.PI * 2 + 0.3; m.visible = true; m.position.set(Math.cos(a) * 55, 0.1 * Math.sin(f * 0.05 + i), Math.sin(a) * 55); m.rotation.y = -a; });
    H.tug.visible = true; H.tug.position.set(20, 0, 70); H.tug.rotation.y = 0.4;
    return { actors: [], zillas: [{ x: 0, y: -10 - 40 * s, z: 0, h: 50, v: "m1", pose: "roar", jaw: 0.5, shadow: false }],
      particles: rise(f, 0, -1, 0, 500, 80, 6, 4, ["#ffffff", "#d8eef8"]), particleSize: 0.7 }; });
// "then yank him up so fast the pressure kills him." The chalk plan
shot(3, M7t - 1, M8 - 1, "rooms", "hall", [D(M7t - 1, [0, 2.6, 1.2], [0, 2.6, -5.85], { fov: 46, rate: 0.0025, punch: 0.006, p0: M7k - 3, n: 22 })],
  (f, H) => { setBoard(H, 1 + sm(f, M7t, M7u + 6), f >= M7k - 1 ? 1 : 0);
    return { actors: [{ id: "noda", x: -4.2, z: -4.0, pose: "point", expr: f > M7k ? "grin" : "stern", seed: 100 }] }; });
// "Koichi flies a plane full of explosives,": the Shinden over the bay
shot(3, M8 - 1, M8s - 1, "sea", "sky", [M(M8 - 1, (f) => { const z = 260 - (f - M8) * 1.6; return { pos: [14, 30, z + 26], look: [0, 27, z - 10], fov: 44 }; })],
  (f, H) => { const z = 260 - (f - M8) * 1.6; H.shinden.visible = true; H.shinden.position.set(0, 28 + 0.4 * Math.sin(f * 0.1), z); H.shinden.rotation.set(0.08 * Math.sin(f * 0.07), Math.PI / 2, 0);
    return { actors: [], zillas: [{ x: -10, y: -10, z: -60, h: 50, v: "m1", pose: "stand", shadow: false }] }; });
// "straight into Godzilla's mouth." Boom.
KICKS.push([M8m + 2, 2.0]);
shot(3, M8s - 1, M9 - 1, "sea", "sky", [D(M8s - 1, [70, 26, 70], [0, 32, 0], { fov: 46, rate: 0.002, punch: 0.006, p0: M8m - 3, n: 22 })],
  (f, H) => { const t = at(f, M8s - 1, M8m + 2); H.shinden.visible = t < 1; H.shinden.position.set(L(80, 10, t), L(30, 40, t), L(40, 0, t)); H.shinden.rotation.set(0, Math.atan2(40, 70) + Math.PI, 0.1);
    const b = at(f, M8m + 2, M9 + 4);
    const fx: FxSpec[] = f > M8m + 1 ? [{ k: "burst", x: 6, y: 42, z: 2, w: 30 * (0.5 + b), t: b, col: "#fff3b0" }, { k: "glow", x: 6, y: 42, z: 2, w: 70, soft: true, col: "#ffcf7a", alpha: 1 - b }] : [];
    return { actors: [], fx, zillas: [{ x: 0, y: -12, z: 0, h: 52, v: "m1", pose: "breath", jaw: 1, glow: 0.4 + 0.5 * t, mirror: true, shadow: false }] }; });
// "But this time, he ejects. He chooses to live." Under a parachute
shot(3, M9 - 1, M10 - 1, "sea", "sky", [M(M9 - 1, (f) => { const y = 36 - (f - M9) * 0.05; return { pos: [2.4, y + 0.9, 7.5], look: [0, y + 1.6, 0], fov: 42 }; })],
  (f) => { const y = 36 - (f - M9) * 0.05, o = sm(f, M9e, M9e + 10);
    return { actors: [{ id: "koichiP", x: 0, y, z: 0, pose: "cheer", legs: "fly", expr: f > M9c ? "relief" : "shock", flutter: 0.6, seed: 80, shadow: false }],
      fx: [{ k: "chute", x: 0, y: y + 2.6 + 1.6 * o, z: -0.1, w: 1 + 3.4 * o, h: 0.7 + 2.3 * o }, { k: "puff", x: -40, y: 20, z: -80, w: 30, h: 22, col: "#8a8a92", seed: 2 }] }; });
// "And Noriko is alive, with a strange black mark on her neck."
shot(3, M10 - 1, M11 - 1, "rooms", "hospital", [D(M10 - 1, [101.6, 1.6, 0.6], [100.1, 1.3, -2.8], { fov: 40, rate: 0.002 }), D(M10m - 4, [99.75, 1.32, -1.9], [99.95, 1.22, -2.95], { fov: 36, dur: 32, rate: 0.003 })],
  () => ({ actors: [{ id: "norikoH", x: 100.0, y: 0.55, z: -3.0, legs: "sit", pose: "sit", expr: "smile_closed", seed: 73 }, { id: "koichi", x: 101.5, z: -1.6, expr: "relief", look: -1, seed: 70, mirror: true }] }));
// "While deep in the sea, Godzilla's flesh starts growing back."
shot(3, M11 - 1, cue("A1", "the") - 1, "sea", "underwater", [D(M11 - 1, [14, -24, 40], [0, -40, -10], { fov: 46, rate: 0.0025, punch: 0.006, p0: M11b - 3, n: 24 })],
  (f) => ({ actors: [], zillas: [{ x: 0, y: -66 - (f - M11) * 0.03, z: -10, h: 46, v: "sunk", pose: "sink", eye: f >= M11b ? "angry" : "x", regrow: sm(f, M11f - 4, M11f + 30) * (1 + 0.15 * Math.sin(f * 0.3)), shadow: false, roll: 0.15 }],
    particles: rise(f, 0, -70, -10, 260, 60, 60, 2, ["#bfe4ff", "#8ac4e0"]), particleSize: 0.35 }));

// ===== THE OSCAR (ch 4) =====
const A1 = cue("A1", "the"), A1b = cue("A1", "beat"), A1o = cue("A1", "oscar");
const A2 = cue("A2", "the"), A2t = cue("A2", "toys");
const TEAM: CastId[] = ["vfx1", "vfx2", "vfx3", "vfx4"];
shot(4, A1 - 1, A1b - 2, "rooms", "oscar", [D(A1 - 1, [200, 2.6, 13], [200.5, 3.4, -2], { fov: 46, rate: 0.002 })],
  () => ({ actors: TEAM.map((id, i) => ({ id, x: 195.6 + i * 0.85, y: 1.2, z: 0.5, expr: (i % 2 ? "nervous" : "smile") as Expr, seed: 110 + i, pose: "idle" as Pose })),
    fx: [{ k: "bag", x: 199.4, y: 1.2 + 0.55, z: 1.4, w: 1.1, text: ["$15M"], seed: 0 }, { k: "bag", x: 204, y: 1.2 + 2.6, z: -3.5, w: 5.2, text: ["$$$"], seed: 1 }, { k: "bag", x: 208.5, y: 1.2 + 2.3, z: -5, w: 4.6, text: ["$$$"], seed: 1 }] }));
KICKS.push([A1b, 1.0]);
shot(4, A1b - 2, A2 - 1, "rooms", "oscar", [D(A1b - 2, [200, 2.6, 13], [200, 3.6, -2], { fov: 46, rate: 0.0025, punch: 0.006, p0: A1o - 3, n: 24 })],
  (f) => { const d = sm(f, A1b, A1b + 14), s = sm(f, A1o - 4, A1o + 4);
    const fx: FxSpec[] = [{ k: "bag", x: 204, y: 1.2 + 2.6 * (1 - 0.7 * d), z: -3.5, w: 5.2 * (1 - 0.7 * d), text: ["$$$"], seed: 1, alpha: 1 - 0.8 * d }, { k: "bag", x: 208.5, y: 1.2 + 2.3 * (1 - 0.7 * d), z: -5, w: 4.6 * (1 - 0.7 * d), text: ["$$$"], seed: 1, alpha: 1 - 0.8 * d }];
    if (s > 0) fx.push({ k: "statue", x: 201.6, y: 1.2 + 2.4 * s, z: -1.5, w: 1.6 * s, h: 4.8 * s, t: s > 0.9 ? 1 : 0 }, { k: "glow", x: 201.6, y: 3.6, z: -1.8, w: 7 * s, soft: true, col: "#ffd27a", alpha: 0.6 * s });
    return { actors: TEAM.map((id, i) => ({ id, x: 195.6 + i * 0.85, y: 1.2, z: 0.5, pose: "cheer" as Pose, expr: "laugh" as Expr, seed: 110 + i })), fx }; });
shot(4, A2 - 1, cue("Z1", "now") - 1, "rooms", "oscar", [D(A2 - 1, [200.3, 2.35, 5.6], [200.3, 2.3, 0.5], { fov: 40, rate: 0.0025, punch: 0.006, p0: A2t - 3, n: 22 })],
  (f) => ({ actors: TEAM.map((id, i) => ({ id, x: 199.0 + i * 0.85, y: 1.2, z: 0.5, pose: "cheer" as Pose, expr: (i % 2 ? "laugh" : "grin") as Expr, seed: 110 + i })),
    particles: confetti(f, 200.3, 1.4, 0.8, 320, 6, 5), particleSize: 0.06 }));

// ===== GODZILLA MINUS ZERO (ch 5) =====
const Z1 = cue("Z1", "now"), Z1s = cue("Z1", "shikishimas"), Z1h = cue("Z1", "so");
const Z2 = cue("Z2", "the"), Z2g = cue("Z2", "golden"), Z2l = cue("Z2", "lightning"), Z2t = cue("Z2", "three"), Z2k = cue("Z2", "so"), Z2m = cue("Z2", "mark");
const Z3 = cue("Z3", "twenty"), Z3s = cue("Z3", "seventy"), Z3w = cue("Z3", "we're"), Z3k = cue("Z3", "walk");
// "Now, Minus Zero. It's 1949," : the rebuilt street
shot(5, Z1 - 1, Z1s - 3, "ruins", "ruins", [M(Z1 - 1, (f) => { const t = glide(at(f, Z1 - 1, Z1s)); return { pos: [L(-2, 1, t), L(26, 3, t), L(-120, -150, t)], look: [0, L(4, 3, t), -230], fov: 46 }; })],
  (f) => ({ actors: (["folkM", "folkW", "folkB", "folkW", "folkM"] as CastId[]).map((id, i) => ({ id, x: (i % 2 ? 1 : -1) * (1.5 + i * 0.4), z: -175 - i * 9 + ((f / FPS) * (i % 2 ? 1 : -1) * 1.2), legs: "walk" as const, phase: f / FPS + i * 0.3, mirror: i % 2 === 1, expr: "smile" as Expr, seed: 120 + i })) }));
// "the Shikishimas are back, and so is he."
KICKS.push([Z1h + 6, 1.0]);
shot(5, Z1s - 3, Z2 - 1, "ruins", "ruins", [D(Z1s - 3, [0.8, 1.5, -167.5], [0, 2.4, -190], { fov: 42, rate: 0.002 }), D(Z1h - 2, [0.6, 1.4, -166], [0, 8, -260], { fov: 46, dur: 30, rate: 0.0025 })],
  (f) => { const r = sm(f, Z1h - 4, Z1h + 20), turn = f > Z1h + 4;
    return { actors: [{ id: "koichi", x: -0.7, z: -175, expr: turn ? "shock" : "smile", seed: 70 }, { id: "norikoM", x: 0.3, z: -175.4, expr: turn ? "shock" : "smile_closed", seed: 73 }, { id: "akiko", x: 1.05, z: -174.8, expr: turn ? "shock" : "grin", seed: 74 }],
      zillas: [{ x: 4, y: -48 + 48 * r, z: -330, h: 50, v: "m1", pose: f > Z1h + 6 ? "roar" : "stand", jaw: sm(f, Z1h + 6, Z1h + 14), mirror: true, shadow: false }] }; });
// "The trailers tease golden lightning, and a three-headed rival."
shot(5, Z2 - 1, Z2k - 1, "sea", "stormGold", [D(Z2 - 1, [40, 6, 70], [0, 70, -400], { fov: 50, rate: 0.002 }), D(Z2t - 4, [30, 5, 50], [-20, 110, -500], { fov: 46, dur: 30, rate: 0.003, punch: 0.006, p0: Z2t - 2, n: 24 })],
  (f) => { const fl = f >= Z2t - 2 ? Math.max(sm(f, Z2t - 2, Z2t + 4) * (1 - at(f, Z2t + 10, Z2k)), 0.25) : 0;
    const fx: FxSpec[] = [Z2g, Z2l, Z2l + 8, Z2t, Z2t + 6].filter((b) => f >= b && f < b + 5).map((b) => ({ k: "bolt" as const, x: -160 + (b % 7) * 50, y: 140, z: -600, w: 40, h: 140, seed: b, col: "#ffe27a" }));
    if (fl > 0) fx.push({ k: "three", x: -40, y: 170, z: -620, w: 320, h: 256, t: fl });
    return { actors: [], fx, zillas: [{ x: 60, y: -6, z: -230, h: 50, v: "sil", glow: 0.35, rim: "#ffb050", mirror: true, shadow: false }],
      particles: rain(f, 20, 0, 30, 200, 60, 40), particleSize: 0.4 }; });
// "So keep an eye on that mark."
shot(5, Z2k - 1, Z3 - 1, "ruins", "golden", [D(Z2k - 1, [0.95, 1.5, 1.7], [0.05, 1.42, 0], { fov: 36, rate: 0.003, punch: 0.008, p0: Z2m - 4, n: 22 })],
  () => ({ actors: [{ id: "norikoM", x: 0, z: 0, expr: "neutral", look: -1, seed: 73 }] }));
// "Twenty-three fishermen saw a false sunrise." Back on the boat
shot(5, Z3 - 1, Z3s - 2, "sea", "dawn", [D(Z3 - 1, [16, 3.4, 12], [-60, 8, -14], { fov: 44, rate: 0.002 })],
  (f, H) => { boatAt(H, f);
    return { actors: [{ id: "fish1", x: 3.2, y: DECK, z: 1.5, expr: "neutral", facing: -1, look: -1, seed: 11 }, { id: "fish3", x: 5.2, y: DECK, z: 0.6, expr: "neutral", facing: -1, look: -1, seed: 13 }],
      fx: [{ k: "fireball", x: WEST[0], y: 60, z: WEST[2], w: 300, soft: true, t: 0.8 }] }; });
// "Seventy-two years later, we're still watching" : the cinema, the screen shows him walking at sunrise
shot(5, Z3s - 2, Z3w - 2, "rooms", "cinema", [D(Z3s - 2, [300, 3.2, 14], [300, 5, -11], { fov: 46, rate: 0.002 })],
  (f, H) => { setScreen(H, f);
    return { actors: (["aud1", "aud2", "aud3", "aud4"] as CastId[]).map((id, i) => ({ id, x: 297.2 + i * 1.6, y: 0.9, z: 4.8, legs: "sit" as const, pose: "sit" as Pose, expr: "neutral" as Expr, seed: 130 + i })) }; });
shot(5, Z3w - 2, Z3k - 4, "rooms", "cinema", [D(Z3w - 2, [300.4, 2.3, -1.5], [300.4, 1.85, 4.8], { fov: 40, rate: 0.003 })],
  (f, H) => { setScreen(H, f);
    return { actors: (["aud1", "aud2", "aud3", "aud4"] as CastId[]).map((id, i) => ({ id, x: 298.0 + i * 0.95, y: 0.9, z: 4.8, legs: "sit" as const, pose: (i % 2 ? "sit" : "hold") as Pose, expr: (i === 1 ? "shock" : i === 2 ? "grin" : "smile") as Expr, seed: 130 + i })) }; });
// "it walk." : on the horizon at dawn; end title
shot(5, Z3k - 4, TOTAL, "sea", "dawn", [M(Z3k - 4, (f) => { const t = glide(at(f, Z3k - 4, TOTAL)); return { pos: [L(30, 10, t), L(3, 6, t), L(120, 160, t)], look: [0, 30, -200], fov: 46 }; })],
  (f) => { const w = (f - Z3k) / FPS;
    return { actors: [], zillas: [{ x: -60 + w * 6, y: -4, z: -260, h: 54, v: "sil", pose: "walk", phase: w * 0.35, glow: 0.7, rim: "#ffb070", shadow: false }],
      fx: [{ k: "fireball", x: 10, y: 34, z: -520, w: 160, soft: true, t: 0.7 }] }; });

KICKS = KICKS.sort((a, b) => a[0] - b[0]);
export const SHOTS = S;
export const shotAt = (f: number) => { for (let i = S.length - 1; i >= 0; i--) if (f >= S[i].a) return S[i]; return S[0]; };
/** white flashes [frame, length, colour] drawn over the picture */
export const FLASHES: [number, number, string][] = [[H1s - 1, 4, "#fff2d0"], [H2z - 3, 6, "#ffffff"], [M1m, 4, "#ffffff"], [M6g, 7, "#ffffff"], [M6b, 5, "#fff6dc"], [M8m + 2, 6, "#fff6dc"], [A1o, 4, "#fff2c0"], [Z1h + 6, 4, "#ffffff"]];
/** lightning strobes: frames where the picture flares */
export const LIGHTNING = [Z2g, Z2l, Z2l + 8, Z2t, Z2t + 6];
export const CUES = { H3, O1, Y1, M1, A1, Z1, Z3k, END: Z3k + 12 };
