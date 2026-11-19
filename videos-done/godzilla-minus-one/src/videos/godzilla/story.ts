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
import * as MV from "./moves";

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
  mirror?: boolean; alpha?: number; sweat?: number; regrow?: number; rim?: string; tint?: string; shadow?: boolean; roll?: number; yaw?: number };
export type Particle = [number, number, number, string];
export type SceneOut = { actors: ActorSpec[]; zillas?: ZSpec[]; fx?: FxSpec[]; particles?: Particle[]; particleSize?: number };
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type CamIn = { pos: V3; look: V3; fov?: number; roll?: number };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => CamIn };
export type Shot = { a: number; b: number; place: PlaceId; look: LookId; cam: Key[]; scene: (f: number, H: Handles) => SceneOut; ch: number; ramp?: (f: number) => number };

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
const D = (f0: number, pos: V3, look: V3, o: { fov?: number; roll?: number; rate?: number; punch?: number; n?: number; dur?: number; cut?: boolean; p0?: number; focus?: number } = {}): Key =>
  ({ f: f0, dur: o.dur, cut: o.cut, s: (f) => {
    const base = Math.exp(-(o.rate ?? 0.0025) * Math.max(0, f - f0));
    const pk = o.punch ? pushK(f, o.p0 ?? f0, 0, o.punch, o.n ?? 32) : 1;
    if (o.focus) { // push toward a subject `focus` metres away, not toward the (far) look point
      const d: V3 = [look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]], Ld = Math.hypot(...d), m = (1 - base * pk) * o.focus / Ld;
      return { pos: [pos[0] + d[0] * m, pos[1] + d[1] * m, pos[2] + d[2] * m], look, fov: o.fov ?? 40, roll: o.roll ?? 0 };
    }
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
  const c = (boardTex?.image as HTMLCanvasElement) ?? document.createElement("canvas"); c.width = 750; c.height = 1000;
  const g = c.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 750, 1000);
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
  { id: "fish1", x: 1.5, y: DECK, z: 0.6, expr: e, seed: 11, ...o },
  { id: "fish2", x: 0.35, y: DECK, z: -0.2, expr: e, seed: 12, mirror: true, ...o },
  { id: "fish3", x: 2.6, y: DECK, z: -0.4, expr: e, seed: 13, ...o },
];
// "west" = far along -x; the false sun and the cloud sit there
const WEST: V3 = [-1500, 0, -1100];

// ===== camera grammar v2 (skill: camera-moves) =====
// One motivated move per beat, never the same featured move twice in a row; loud moves budgeted: snap zoom x2,
// whip pan x2, dolly zoom x1, speed ramp x1, shakes only on impacts. Helpers from moves.ts (copied from the camera lab).
const K = (f0: number, fn: (f: number) => MV.Cam): Key => ({ f: f0, cut: true, s: fn });
const C = (pos: V3, look: V3, fov = 40): MV.Cam => MV.cam({ pos, look, fov });
/** creep for far look points: a slow lens creep instead of a dolly (a dolly toward the horizon travels metres) */
const lcreep = (c: MV.Cam, f: number, f0: number, r = 0.0025) => MV.zoomBy(c, 1 + r * Math.max(0, f - f0));
const WHIP = 9;
/** whip pan out of a shot ending at b (ease-in cubic, turning left by deg) / into a shot starting at a */
const whipOut = (c: MV.Cam, f: number, b: number, deg = 70) => (f < b - WHIP ? c : MV.swing(c, MV.pan(c, deg), MV.prog(f, b - WHIP, WHIP, MV.in3)));
const whipIn = (c: MV.Cam, f: number, a: number, deg = 70) => (f >= a + WHIP ? c : MV.swing(MV.pan(c, -deg), c, MV.prog(f, a, WHIP, MV.out3)));
/** snap zoom landing on frame w (+k size in 5 f, out5) */
const snap = (c: MV.Cam, f: number, w: number, k = 0.55, a = w - 5) => MV.zoomBy(c, 1 + k * MV.prog(f, a, w - a, MV.out5));
export const WHIPS: number[] = [];
export const SNAPS: number[] = [];

// ===== HOOK (ch 0) =====
const H1b = cue("H1", "bomb");
const H2 = cue("H2", "in"), H2t = cue("H2", "twenty"), H2s = cue("H2", "sun"), H2r = cue("H2", "rise"), H2i = cue("H2", "in", 1);
const H3 = cue("H3", "it"), H3i = cue("H3", "it", 1), H3b = cue("H3", "bomb");
const H4 = cue("H4", "before"), H4z = cue("H4", "godzilla"), H4e = cue("H4", "everything");
// 0 "Godzilla was born from a real BOMB." He is already roaring in frame 1: spring pull-out from his head, snap zoom on "bomb"
KICKS.push([H1b, 1.8]); SNAPS.push(H1b);
shot(0, 0, H2 - 2, "sea", "stormsea", [K(0, (f) => {
  const c = MV.mixCam(C([9, 38.5, 4], [6.5, 39, -30], 34), C([10, 3.6, 70], [0, 30, -26], 46), MV.prog(f, 6, 26, MV.out3));
  return lcreep(snap(c, f, H1b), f, H1b, 0.002);
})],
  (f) => ({ actors: [], zillas: [{ x: 0, y: -6, z: -30, h: 52, v: "m1", pose: "roar", jaw: 0.65 + 0.35 * sm(f, H1b - 6, H1b), glow: sm(f, H1b - 8, H1b), shadow: false }],
    particles: [...rise(f, 0, -2, -30, 200, 40, 26, 6, ["#e8f2fa", "#cfe0ec"]), ...rain(f, 0, 0, 40, 160, 60, 40)], particleSize: 0.5 }));
// "In 1954, twenty-three fishermen": crane down out of the night sky onto the deck (setting)
shot(0, H2 - 2, H2s - 1, "sea", "predawn", [K(H2 - 2, (f) => MV.creep(MV.mixCam(C([1.5, 13, -30], [1.5, 7, 0], 40), C([1.5, 3.9, -7.6], [1.5, 3.2, 0], 40), MV.prog(f, H2t - 40, 40)), f, H2t, 0.0025))],
  (f, H) => { boatAt(H, f); return { actors: FISH("neutral", { look: 0 }) }; });
// "saw the sun rise": the light hits their faces; fast push-in (reaction)
shot(0, H2s - 1, H2i - 1, "sea", "westface", [K(H2s - 1, (f) => MV.dolly(C([1.5, 3.8, -6.6], [1.5, 3.25, 0], 40), 0.32 * MV.prog(f, H2s - 1, 14, MV.out3)))],
  (f, H) => { boatAt(H, f); return { actors: FISH(ex(f, [[0, "neutral"], [H2r - 2, "shock"]]) as Expr) }; });
// "in the west": pan from the crew to the false sun rising on the horizon
shot(0, H2i - 1, H3 - 1, "sea", "westglow", [K(H2i - 1, (f) => lcreep(MV.swing(C([8.5, 3.9, 6.5], [3.0, 3.5, 1.4], 44), C([8.5, 3.9, 6.5], [-62, 12, -46], 44), MV.prog(f, H2i - 1, 22)), f, H2i + 22, 0.002))],
  (f, H) => { boatAt(H, f); const t = sm(f, H2i - 1, H3 + 10);
    return { actors: [{ id: "fish1", x: 3.0, y: DECK, z: 1.4, expr: "shock", facing: -1, look: -1, seed: 11 }, { id: "fish3", x: 4.2, y: DECK, z: 0.2, expr: "shock", facing: -1, look: -1, seed: 13 }],
      fx: [{ k: "fireball", x: WEST[0], y: 20 + 90 * t, z: WEST[2], w: 380 + 160 * t, soft: true, t: 0.6 + 0.4 * t }] }; });
// "It wasn't the sun.": a slow lens zoom out to the horizon (spotting it from afar); the fireball turns into a cloud
const MUSH = (f: number) => sm(f, H3 + 8, H4 + 6);
shot(0, H3 - 1, H3i - 1, "sea", "westglow", [K(H3 - 1, (f) => MV.zoom(C([8.5, 3.9, 6.5], [-62, 14, -46], 44), L(44, 24, MV.prog(f, H3 - 1, 28))))],
  (f, H) => { boatAt(H, f); const m = MUSH(f);
    return { actors: [], fx: [{ k: "fireball", x: WEST[0], y: 110, z: WEST[2], w: 540, soft: true, t: 1, alpha: 1 - m * 1.5 }, { k: "mushroom", x: WEST[0], y: 440 * m + 30, z: WEST[2], w: 720, h: 900, t: 0.25 + 0.75 * m, seed: 1, soft: true, alpha: Math.min(1, m * 3) }] }; });
// "It was a hydrogen bomb.": dolly zoom (pull back + lens in) so the cloud looms behind the fisherman
KICKS.push([H3b, 1.4]);
shot(0, H3i - 1, H4 - 1, "sea", "westglow", [K(H3i - 1, (f) => MV.dollyZoom(C([6.63, 3.75, 4.06], [3.0, 3.6, 1.4], 46), -0.95 * MV.prog(f, H3i - 1, 44)))],
  (f, H) => { boatAt(H, f); const m = MUSH(f);
    return { actors: [{ id: "fish1", x: 3.0, y: DECK, z: 1.4, expr: f > H3b ? "pained" : "shock", seed: 11 }, { id: "fish3", x: 4.0, y: DECK, z: 0.1, expr: "shock", facing: -1, look: -1, seed: 13 }],
      fx: [{ k: "glow", x: WEST[0], y: 60, z: WEST[2], w: 900, soft: true, col: "#ffb070", alpha: 0.6 }, { k: "mushroom", x: WEST[0], y: 440 * m + 30, z: WEST[2], w: 720, h: 900, t: 0.25 + 0.75 * m, seed: 1, soft: true }] }; });
// "Before you watch Godzilla Minus Zero, here's everything you need to know": pedestal down from him over the roof to the marquee
shot(0, H4 - 1, cue("O1", "white") - 1, "city", "cineNight", [K(H4 - 1, (f) => lcreep(MV.mixCam(C([-8, 36, 146], [44, 41, 236], 44), C([-10, 2.0, 148], [16, 9.5, 200], 48), MV.prog(f, H4 - 1, 56)), f, H4e - 6, 0.002))],
  (f) => ({ actors: (["aud1", "aud2", "aud3", "aud4"] as CastId[]).map((id, i) => ({ id, x: 11.6 + (i % 2) * 0.5, y: 0.18, z: 182 + i * 1.4 + ((f / FPS) * 0.6) % 1.2, legs: "walk" as const, phase: f / FPS + i * 0.3, mirror: true, seed: 30 + i, expr: (i % 2 ? "grin" : "smile") as Expr })),
    zillas: [{ x: 50, z: 238, h: 46, v: "m1", pose: f > H4z ? "roar" : "stand", jaw: sm(f, H4z, H4z + 10) * 0.8, mirror: true, shadow: false }] }));

// ===== GODZILLA 1954 (ch 1) =====
const O1 = cue("O1", "white"), O1b = cue("O1", "boat"), O1n = cue("O1", "five"), O1c = cue("O1", "the", 2), O1d = cue("O1", "death"); // "the" also prefixes "their"
const O2 = cue("O2", "eight"), O2m = cue("O2", "monster"), O2g = cue("O2", "gojira"), O2h = cue("O2", "gorilla"), O2w = cue("O2", "whale");
const O3 = cue("O3", "inside"), O3h = cue("O3", "hundred"), O3s = cue("O3", "stomping"), O3t = cue("O3", "tokyo");
// "White ash fell on their boat, the Lucky Dragon Number Five": tilt down through the falling ash, then truck to the hull name
shot(1, O1 - 1, O1c - 1, "sea", "ash", [K(O1 - 1, (f) => {
  const c = MV.swing(C([14, 3.0, 12], [6, 16, -2], 46), C([14, 3.0, 12], [6, 2.2, 1.5], 46), MV.prog(f, O1b - 26, 26));
  return MV.mixCam(c, C([7.6, 2.0, 11.2], [4.0, 1.3, 3.0], 46), MV.prog(f, O1n - 28, 28));
})],
  (f, H) => { boatAt(H, f); return { actors: FISH("nervous", { pose: "reach", look: 1 }), particles: ashFall(f, 6, 1.6, 4, 800, 26, 14, "#ebe7de"), particleSize: 0.32 }; });
// "The crew called it death ash.": growing dutch roll on his face (dread), whip pan out at the end
WHIPS.push(O2 - 1);
shot(1, O1c - 1, O2 - 1, "sea", "ash", [K(O1c - 1, (f) => whipOut(MV.roll(MV.creep(C([1.9, 3.75, 3.1], [1.6, 3.5, 0.9], 38), f, O1c, 0.003), 7 * MV.prog(f, O1c, 40)), f, O2 - 1))],
  (f, H) => { boatAt(H, f); return { actors: [{ id: "fish1", x: 1.6, y: DECK, z: 0.9, pose: "hold", expr: f >= O1d - 1 ? "shock" : "pained", seed: 11 }, { id: "fish2", x: -0.4, y: DECK, z: -1.2, expr: "nervous", seed: 12, mirror: true }],
    particles: ashFall(f, 1.6, 2.2, 1.5, 240, 5, 4), particleSize: 0.05 }; });
// "Eight months later, Japan got a monster made of that fear": whip in to Ginza 1954, low angle on him (power)
KICKS.push([O2m, 1.2]);
shot(1, O2 - 1, O2g - 1, "city", "night54", [K(O2 - 1, (f) => whipIn(lcreep(C([-4, 0.45, 62], [0, 26, -40], 52), f, O2 - 1, 0.0022), f, O2 - 1))],
  (f) => { const w = (f - O2) / FPS;
    return { actors: [{ id: "folkM", x: -2.5, y: 0, z: 52 - w * 1.2, legs: "run", phase: w * 1.6, expr: "shock", seed: 41 }, { id: "folkW", x: 2.2, y: 0, z: 49 - w * 1.0, legs: "run", phase: w * 1.6 + 0.3, expr: "shock", seed: 42 }],
      zillas: [{ x: 2, z: -70 + w * 3, h: 50, v: "m1", pose: f > O2m - 2 ? "roar" : "walk", phase: w * 0.45, jaw: sm(f, O2m - 2, O2m + 8), glow: 0.15 }],
      fx: [{ k: "glow", x: -22, y: 8, z: -30, w: 26, soft: true, col: "#ff8a3a", alpha: 0.75 }, { k: "glow", x: 24, y: 6, z: -10, w: 22, soft: true, col: "#ff8a3a", alpha: 0.65 }],
      particles: rise(f, 0, 0, -20, 260, 60, 30, 3, ["#ffb347", "#ff7a2a", "#ffd27a"]), particleSize: 0.22 }; });
// "Gojira: half gorilla, half whale.": overshoot-and-settle reframes (comedy): to the gorilla, to the whale, back to the merge
shot(1, O2g - 1, O3 - 1, "studio", "stage", [K(O2g - 1, (f) => {
  const sp = (a: number) => MV.prog(f, a, 14, MV.spring);
  const lx = -0.95 * sp(O2h - 6) + 1.9 * sp(O2w - 6) - 0.95 * sp(O2w + 14);
  return MV.dolly(C([lx * 0.4, 1.8, 10.5], [lx, 1.65, 0], 40), 0.25 * MV.prog(f, O2w + 14, 18, MV.spring));
})],
  (f) => { const g = sm(f, O2h - 3, O2h + 5), wh = sm(f, O2w - 3, O2w + 5), m = sm(f, O2w + 8, O2w + 20), z = sm(f, O2w + 18, O2w + 26);
    const fx: FxSpec[] = [];
    if (m < 1) fx.push({ k: "gorilla", x: L(-1.1, -0.2, m), y: 1.3 + 0.15 * (1 - g), z: 0, w: Math.max(0.01, 1.8 * g), h: Math.max(0.01, 1.8 * g), alpha: g > 0 ? 1 - m * 0.9 : 0 },
      { k: "whale", x: L(1.15, 0.2, m), y: 1.45, z: 0.1, w: Math.max(0.01, 2.0 * wh), h: Math.max(0.01, 1.25 * wh), alpha: wh > 0 ? 1 - m * 0.9 : 0 });
    if (m > 0.6 && z < 1) fx.push({ k: "puff", x: 0, y: 1.3, z: 0.3, w: 2.8 * m, h: 2.1 * m, col: "#f4f1e8", seed: 3 });
    return { actors: [], fx, zillas: z > 0 ? [{ x: 0, z: 0, h: 2.5 * (0.6 + 0.4 * z), v: "showa", pose: "hop", eye: "friendly", alpha: z }] : [] }; });
// "Inside, a stuntman sweated in a hundred-kilo rubber suit": a short orbit around the suit (study this)
KICKS.push([O3h, 0.7]);
shot(1, O3 - 1, O3s - 2, "studio", "stage", [K(O3 - 1, (f) => MV.arc(C([1.6, 1.9, 5.2], [0.2, 1.75, 0], 40), L(-28, 22, at(f, O3 - 1, O3s - 2))))],
  (f) => ({ actors: [{ id: "crew2", x: 2.4, z: 1.2, pose: "point", expr: "grin", mirror: true, seed: 51 }, { id: "crew1", x: -2.2, z: 1.8, pose: "hips", expr: "smile", seed: 52 }],
    zillas: [{ x: -0.1, z: 0, h: 2.35, v: "suitOpen", pose: "stand", sweat: ((f - O3) / 40) % 1 }] }));
// "stomping a tiny Tokyo": follow the suit down the toy street at miniature height, kicks on the stomps
KICKS.push([O3s + 6, 0.8], [O3t, 1.0]);
const SUITZ = (f: number) => -5.2 + ((f - O3s) / FPS) * 0.9;
shot(1, O3s - 2, cue("Y1", "then") - 1, "studio", "stage", [K(O3s - 2, (f) => MV.follow((g) => [0, 1.0, SUITZ(g)], f, [0.5, -0.55, 8.0], 4, [0, 0, -1], 48))],
  (f) => { const w = (f - O3s) / FPS, z = SUITZ(f);
    return { actors: [], zillas: [{ x: 0, z, h: 2.35, v: "suit", pose: "walk", phase: w * 0.9 }],
      particles: [...dust(3, 0.2, 0, z + 0.3, at(f, O3s + 6, O3s + 30), 30, "#d8c8b0", 0.8, 0.6), ...dust(9, -0.2, 0, z + 0.3, at(f, O3t, O3t + 24), 30, "#d8c8b0", 0.8, 0.6)], particleSize: 0.06 }; });

// ===== 70 YEARS (ch 2) =====
const Y1 = cue("Y1", "then"), Y1w = cue("Y1", "weirdly"), Y1s = cue("Y1", "saving"), Y1f = cue("Y1", "from");
const Y2 = cue("Y2", "nearly"), Y2f = cue("Y2", "film", 1), Y2r = cue("Y2", "record");
const BZ = 470; // beach: sand ring to r = 470, sea beyond (+z)
// "Then he got famous, and weirdly friendly": crane up from the kids to reveal him waving (joy)
shot(2, Y1 - 1, Y1s - 1, "island", "golden", [K(Y1 - 1, (f) => lcreep(MV.mixCam(C([1.5, 0.95, BZ - 25], [0, 1.25, BZ - 15], 50), C([3, 5.5, BZ - 36], [0, 15, BZ + 90], 50), MV.prog(f, Y1 - 1, 40)), f, Y1 + 40, 0.0015))],
  (f) => ({ actors: (["kid1", "kid2", "kid3"] as CastId[]).map((id, i) => ({ id, x: -1.8 + i * 1.6, z: BZ - 16 + (i % 2) * 0.8, pose: (i === 1 ? "wave" : "cheer") as Pose, wave: Math.sin(f * 0.3 + i), expr: "grin" as Expr, seed: 60 + i })),
    zillas: [{ x: 0, y: -2.5, z: BZ + 95, h: 40, v: "showa", pose: f > Y1w - 2 ? "hop" : "wave", phase: f / 20, eye: "friendly", shadow: false }] }));
// "saving Earth from other monsters": pan with the punch from him to the rival, kick on the hit
KICKS.push([Y1f, 1.0]);
shot(2, Y1s - 1, Y2 - 1, "island", "golden", [K(Y1s - 1, (f) => MV.swing(C([0, 5, BZ - 60], [-20, 18, BZ + 100], 50), C([0, 5, BZ - 60], [22, 18, BZ + 104], 50), MV.prog(f, Y1f - 16, 18)))],
  (f) => { const hit = sm(f, Y1f - 2, Y1f + 4);
    const fx: FxSpec[] = [{ k: "rival", x: 26 + 6 * hit, y: 16 + 2 * hit, z: BZ + 104, w: -36, h: 36, t: hit, rot: 0.25 * hit }];
    if (hit > 0.5 && f < Y1f + 14) fx.push({ k: "burst", x: 10, y: 22, z: BZ + 96, w: 18, t: at(f, Y1f, Y1f + 14), col: "#fff3b0" });
    return { actors: [], fx, zillas: [{ x: -22 + 6 * hit, y: -2.5, z: BZ + 100, h: 40, v: "showa", pose: hit > 0.3 ? "punch" : "stand", eye: "angry", shadow: false, mirror: true }] }; });
// "Nearly forty films later, ... on record": truck along the lineup of eras, then crane up and back to the WORLD RECORD board
const PARADE: ZVar[] = ["showa", "heisei", "mv", "shin", "m1"];
const PH: Record<string, number> = { showa: 28, heisei: 36, mv: 50, shin: 52, m1: 30 };
shot(2, Y2 - 1, cue("M1", "then") - 1, "island", "golden", [K(Y2 - 1, (f) => {
  const A = C([-34, 7, BZ - 14], [-30, 22, BZ + 150], 58), c = MV.mixCam(A, MV.truck(A, 30), MV.prog(f, Y2 - 1, 64));
  return MV.mixCam(c, C([4, 20, BZ - 50], [4, 36, BZ + 150], 58), MV.prog(f, Y2f - 12, 34));
})],
  (f) => { const w = (f - Y2) / FPS;
    const fx: FxSpec[] = f > Y2r - 4 ? [{ k: "sign", x: 0, y: 78, z: BZ + 150, w: 62, h: 17, text: ["WORLD RECORD"], col: "#e8b33c", col2: "#2a1f36", alpha: sm(f, Y2r - 4, Y2r + 4) }] : [];
    return { actors: [], fx, zillas: PARADE.map((v, i) => ({ x: -50 + i * 25 + w * 1.5, y: -2.5, z: BZ + 150 + (i % 2) * 6, h: PH[v], v, pose: "walk" as ZPose, phase: w * 0.5 + i * 0.2, shadow: false })) }; });

// ===== GODZILLA MINUS ONE (ch 3) =====
const M1 = cue("M1", "then"), M1m = cue("M1", "minus");
const M2 = cue("M2", "it's"), M2j = cue("M2", "japan"), M2z = cue("M2", "zero"), M2t = cue("M2", "then"), M2d = cue("M2", "drags"), M2m = cue("M2", "minus");
const M3 = cue("M3", "koichi"), M3f = cue("M3", "faked"), M3a = cue("M3", "alive");
const M4 = cue("M4", "when"), M4h = cue("M4", "hits"), M4f = cue("M4", "freezes"), M4a = cue("M4", "and");
const M5 = cue("M5", "in"), M5n = cue("M5", "noriko"), M5b = cue("M5", "baby"), M5a = cue("M5", "akiko");
const M6 = cue("M6", "then"), M6m = cue("M6", "mutated"), M6t = cue("M6", "tests"), M6c = cue("M6", "crushes"), M6g = cue("M6", "ginza"), M6n = cue("M6", "noriko"), M6i = cue("M6", "is"), M6s = cue("M6", "swept"), M6b = cue("M6", "blast");
const M7 = cue("M7", "with"), M7s = cue("M7", "sink"), M7t = cue("M7", "then"), M7u = cue("M7", "up"), M7k = cue("M7", "kills");
const M8 = cue("M8", "koichi"), M8s = cue("M8", "straight"), M8m = cue("M8", "mouth");
const M9 = cue("M9", "but"), M9e = cue("M9", "ejects"), M9c = cue("M9", "chooses");
const M10 = cue("M10", "and"), M10m = cue("M10", "strange");
const M11 = cue("M11", "while"), M11f = cue("M11", "flesh"), M11b = cue("M11", "back");
// "Then came Godzilla Minus One.": low angle, tilt up with him as he rises out of the storm
KICKS.push([M1m, 1.4]);
shot(3, M1 - 1, M2 - 1, "sea", "stormsea", [K(M1 - 1, (f) => lcreep(MV.swing(C([12, 1.2, 66], [0, 6, -40], 48), C([12, 1.2, 66], [0, 34, -40], 48), MV.prog(f, M1m - 24, 24)), f, M1m, 0.003))],
  (f) => { const r = sm(f, M1 - 1, M1m + 4);
    return { actors: [], zillas: [{ x: 0, y: -18 + 18 * r, z: -40, h: 52, v: "m1", pose: "roar", jaw: sm(f, M1m - 2, M1m + 6), glow: f > M1m ? 0.25 : 0, shadow: false }],
      particles: [...rain(f, 0, 0, 40, 220, 70, 40), ...rise(f, 0, -2, -40, 120, 40, 14 * r + 1, 5, ["#e8f2fa"])], particleSize: 0.45 }; });
// "It's 1945.": crane down into the burned city
shot(3, M2 - 1, M2j - 1, "ruins", "ruins", [M(M2 - 1, (f) => { const t = glide(at(f, M2 - 1, M2j + 6)); return { pos: [L(-30, -12, t), L(48, 14, t), L(90, 40, t)], look: [0, 2, -20], fov: 46 }; })],
  (f) => ({ actors: [{ id: "koichi", x: -2, z: 6, legs: "walk", phase: f / FPS, expr: "neutral", seed: 70 }, { id: "folkB", x: 3, z: 2, legs: "walk", phase: f / FPS + 0.4, expr: "neutral", seed: 71, mirror: true }],
    particles: rise(f, 0, 0, -10, 140, 120, 30, 1.2, ["#8a8070", "#a89a88"]), particleSize: 0.5 }));
// "Japan has lost the war, and is at zero.": push-in on the 0 (the rule)
shot(3, M2j - 1, M2t - 1, "ruins", "ruins", [D(M2j - 1, [3, 2.2, 10], [0, 3.2, -12], { fov: 42, rate: 0.002, punch: 0.008, p0: M2z - 4, n: 26, focus: 18 })],
  () => ({ actors: [{ id: "koichi", x: -0.9, z: 3.2, expr: "neutral", look: 1, seed: 70 }, { id: "folkW", x: 1.1, z: 1.5, expr: "pained", seed: 72, mirror: true }],
    fx: [{ k: "sign", x: 0, y: 3.6, z: -12, w: 5, h: 4, text: ["0"], col: "#d8c8a0", col2: "#2a1f36" }] }));
// "Then Godzilla drags it down to minus one.": tilt down from his roaring head to the board as it drops; push on "minus"
KICKS.push([M2d, 1.5], [M2m, 1.0]);
shot(3, M2t - 1, M3 - 1, "ruins", "ruins", [K(M2t - 1, (f) => MV.dolly(MV.swing(C([2.4, 1.6, 8], [-4, 40, -95], 48), C([2.4, 1.6, 8], [0, 3.2, -12], 48), MV.prog(f, M2d - 22, 22)), 0.3 * MV.prog(f, M2m - 4, 20)))],
  (f) => { const d = sm(f, M2d - 2, M2d + 8), neg = f >= M2m - 1;
    return { actors: [{ id: "koichi", x: -1.8, z: 2, expr: f > M2d ? "shock" : "neutral", look: 1, seed: 70 }],
      zillas: [{ x: 6, z: -95, h: 50, v: "m1", pose: f > M2d - 22 ? "roar" : "stand", jaw: Math.max(d, sm(f, M2t, M2t + 10) * 0.6), mirror: true }],
      fx: [{ k: "sign", x: 0, y: 3.6 - 1.4 * d, z: -12, w: 5, h: 4, text: [neg ? "−1" : "0"], col: neg ? "#e0303a" : "#d8c8a0", col2: neg ? "#ffffff" : "#2a1f36", rot: 0.12 * d }],
      particles: dust(5, 0, 0, -12, at(f, M2d, M2d + 30), 60, "#a89a88", 3, 3), particleSize: 0.3 }; });
// "Koichi Shikishima is a kamikaze pilot": pull-out from his goggles to the man and his Zero (character entrance)
shot(3, M3 - 1, M3f - 2, "island", "day", [K(M3 - 1, (f) => MV.mixCam(C([4.15, 1.62, 3.7], [3.6, 1.62, 2.6], 34), C([9, 1.5, 7], [3.4, 1.6, 1.8], 40), MV.prog(f, M3 - 1, 44)))],
  () => ({ actors: [{ id: "koichiP", x: 3.6, z: 2.6, expr: "neutral", seed: 80, flutter: 0.3 }] }));
// "who faked engine trouble to stay alive": pan from the smoking engine to the suspicious mechanic (cause -> effect)
shot(3, M3f - 2, M4 - 1, "island", "day", [K(M3f - 2, (f) => MV.swing(C([10.5, 1.8, 8.5], [5.3, 2.4, 0.2], 42), C([10.5, 1.8, 8.5], [6.0, 1.55, 3.3], 42), MV.prog(f, M3a - 20, 20)))],
  (f) => ({ actors: [{ id: "koichiP", x: 4.4, z: 2.6, pose: "shrug", expr: "nervous", seed: 80 }, { id: "tachibana", x: 6.6, z: 3.8, pose: "cross", expr: "stern", look: -1, mirror: true, seed: 81 }],
    fx: [{ k: "puff", x: 5.3, y: 2.6 + 0.9 * at(f, M3f, M3f + 40), z: 0.2, w: 2.8 * (0.6 + 0.4 * sm(f, M3f, M3f + 12)), h: 2.1, col: "#2e2e34", seed: 5, alpha: 1 - 0.6 * at(f, M3f + 20, M4) }] }));
// "When Godzilla hits his island base": low angle on the runway, shake on "hits"
KICKS.push([M4h, 1.6]);
shot(3, M4 - 1, M4f - 2, "island", "islandNight", [K(M4 - 1, (f) => lcreep(C([-7, 0.35, 16], [-11, 8.5, -40], 50), f, M4 - 1, 0.003))],
  (f) => ({ actors: [{ id: "tachibana", x: -5.5, z: 8, legs: "run", phase: f / 18, expr: "shock", seed: 81, mirror: true }, { id: "folkB", x: -9, z: 4, legs: "run", phase: f / 18 + 0.3, expr: "shock", seed: 82 }],
    zillas: [{ x: -12, z: -38, h: 16, v: "m1", pose: f > M4h - 2 ? "roar" : "walk", phase: f / 50, jaw: sm(f, M4h - 2, M4h + 8), mirror: true }],
    fx: [{ k: "glow", x: 10, y: 4, z: -52, w: 22, soft: true, col: "#ff8a3a", alpha: 0.8 }, { k: "glow", x: -40, y: 3, z: -58, w: 18, soft: true, col: "#ff8a3a", alpha: 0.7 }],
    particles: rise(f, -10, 0, -40, 200, 60, 20, 3, ["#ffb347", "#ff7a2a"]), particleSize: 0.2 }));
// "he freezes,": snap zoom on his face
SNAPS.push(M4f + 2);
shot(3, M4f - 2, M4a - 1, "island", "islandNight", [K(M4f - 2, (f) => MV.creep(snap(C([2.6, 1.5, 5.6], [2.2, 1.45, 2.8], 40), f, M4f + 2, 0.6, M4f - 2), f, M4f + 2, 0.0015))],
  (f) => ({ actors: [{ id: "koichiP", x: 2.2, z: 2.8, expr: "shock", blink: 0, seed: 80 }],
    fx: [{ k: "glow", x: -6, y: 6, z: -14, w: 14, soft: true, col: "#ff8a3a", alpha: 0.6 + 0.2 * Math.sin(f * 0.4) }] }));
// "and almost everyone dies.": crane up and away from the burning base (small, alone)
KICKS.push([M4a + 6, 1.2]);
shot(3, M4a - 1, M5 - 1, "island", "islandNight", [K(M4a - 1, (f) => MV.crane(C([22, 6, 30], [-6, 7, -40], 46), 34 * MV.prog(f, M4a - 1, 56), 20 * MV.prog(f, M4a - 1, 56), 40 * MV.prog(f, M4a - 1, 56)))],
  (f) => { const b = at(f, M4a + 6, M4a + 30);
    return { actors: [], zillas: [{ x: -10, z: -40, h: 16, v: "m1", pose: "roar", jaw: 0.6, mirror: true, glow: 0.2 }],
      fx: [{ k: "burst", x: 14, y: 6, z: -55, w: 16 * (0.4 + b), t: b, col: "#ffb347" }, { k: "glow", x: 14, y: 6, z: -55, w: 40, soft: true, col: "#ff7a2a", alpha: 0.9 * (1 - 0.5 * b) }, { k: "glow", x: -40, y: 5, z: -60, w: 30, soft: true, col: "#ff8a3a", alpha: 0.7 }],
      particles: rise(f, 0, 0, -50, 300, 90, 30, 4, ["#ffb347", "#ff7a2a", "#ffd27a"]), particleSize: 0.35 }; });
// "In burned-out Tokyo, he builds a family:": truck past the ruins to him by the shack (parallax)
shot(3, M5 - 1, M5n - 3, "ruins", "golden", [K(M5 - 1, (f) => MV.truck(C([-13.5, 2.0, 9], [-19.6, 1.3, -2.5], 40), L(-2.4, 0.6, MV.prog(f, M5 - 1, M5n - M5))))],
  () => ({ actors: [{ id: "koichi", x: -18.6, z: 0.4, legs: "sit", pose: "sit", expr: "pained", seed: 70 }] }));
// "Noriko, and an orphan baby, Akiko.": a short tender arc around them, push to the baby
shot(3, M5n - 3, M6 - 1, "ruins", "golden", [K(M5n - 3, (f) => MV.dolly(MV.arc(C([-19.6, 1.65, 6.4], [-20.2, 1.4, 0], 40), L(-10, 10, MV.prog(f, M5n - 3, M6 - M5n))), 0.3 * MV.prog(f, M5b - 8, 30)))],
  (f) => { const n = sm(f, M5n - 3, M5n + 14);
    return { actors: [{ id: "koichi", x: -19.55, z: 0.2, expr: f > M5n + 10 ? "smile_closed" : "neutral", look: -1, seed: 70 },
      { id: "norikoB", x: L(-23.6, -20.65, n), z: 0.4, legs: n < 1 ? "walk" : "stand", phase: f / 18, pose: "hold", expr: f > M5a ? "smile_closed" : "smile", seed: 73 }] }; });
// "Then Godzilla, mutated by the bomb tests,": tilt up from the fleeing crowd to his glowing plates
shot(3, M6 - 1, M6c - 2, "city", "ginza", [K(M6 - 1, (f) => lcreep(MV.swing(C([-3, 1.6, 46], [0, 1.8, 28], 48), C([-3, 1.6, 46], [4, 30, -60], 48), MV.prog(f, M6t - 30, 30)), f, M6t, 0.002))],
  (f, H) => { const g = sm(f, M6m - 2, M6c - 2); H.tram.visible = true; H.tram.position.set(0, 0, -12 + (f - M6) * 0.06);
    return { actors: (["folkM", "folkW", "folkB", "folkM"] as CastId[]).map((id, i) => ({ id, x: -6 + i * 3.6, z: 30 - (i % 2) * 2 + (f - M6) * 0.05, legs: "run" as const, phase: f / 16 + i * 0.25, expr: "shock" as Expr, seed: 90 + i, mirror: i % 2 === 1 })),
      zillas: [{ x: 2, z: -62, h: 50, v: "m1", pose: "stand", glow: g }] }; });
// "crushes Ginza.": the money frame. Story time ramps down through the heat ray while a slow orbit keeps moving
KICKS.push([M6g, 2.0]);
shot(3, M6c - 2, M6n - 2, "city", "ginza", [K(M6c - 2, (f) => MV.arc(C([-22, 30, 105], [16, 16, -30], 50), 14 * at(f, M6c - 2, M6n - 2), [2, 20, -62]))],
  (f) => { const b = sm(f, M6g - 2, M6n), beam = f >= M6c && f < M6g + 6;
    const fx: FxSpec[] = [];
    if (beam) fx.push({ k: "beam", x: 26.5, y: 18.6, z: -38.5, w: 40, h: 6, rot: -1.08, full: true, soft: true });
    if (f >= M6g - 2) fx.push({ k: "glow", x: 30, y: 4, z: -18, w: 60 * (0.5 + b), soft: true, col: "#e8fbff", alpha: 0.85 - 0.5 * b }, { k: "mushroom", x: 30, y: 40 * b + 4, z: -18, w: 70, h: 88, t: 0.2 + 0.8 * b, seed: 0, soft: true });
    return { actors: [], fx, zillas: [{ x: 2, z: -62, h: 50, v: "m1", pose: "breath", glow: 1, jaw: 0.9 }] }; });
S[S.length - 1].ramp = (f) => MV.ramp(f, M6c - 2, M6n - 2, 0.25, 0.42);
// "Noriko is swept away by the blast.": fast push on his reaction, the horizon rolls
shot(3, M6n - 2, M7 - 1, "city", "ginza", [K(M6n - 2, (f) => MV.roll(MV.dolly(MV.mixCam(C([0.15, 1.55, 5.2], [0.05, 1.45, 0], 40), C([0.7, 1.55, 5.2], [0.75, 1.5, 0], 40), MV.prog(f, M6i - 2, 24)), 0.35 * MV.prog(f, M6b - 6, 20)), 6 * MV.prog(f, M6b - 2, 22)))],
  (f) => { const gone = sm(f, M6b, M6b + 8), push = sm(f, M6i - 2, M6s);
    return { actors: [{ id: "koichi", x: 0.45 + 0.4 * push, z: 0, expr: f > M6b ? "shock" : "nervous", roll: -0.15 * push, seed: 70, mirror: true },
      { id: "noriko", x: -0.35 - 2.5 * gone, z: 0.2, pose: "reach", expr: "pained", alpha: 1 - gone, roll: 0.3 * gone, seed: 73 }],
      particles: dust(7, -0.5, 0, 0, at(f, M6b - 2, M6b + 30), 120, "#e8e2d4", 3.5, 1.5), particleSize: 0.08 }; });
// "With no help from the government, old navy men plan": truck along the seated veterans (the camera moves, they don't)
shot(3, M7 - 1, M7s - 2, "rooms", "hall", [K(M7 - 1, (f) => MV.truck(C([1.2, 2.1, -4.4], [0, 1.1, 3.6], 50), L(-0.9, 0.9, MV.prog(f, M7 - 1, M7s - M7))))],
  (f, H) => { setBoard(H, 0, 0);
    return { actors: [{ id: "noda", x: -1.25, z: -2.6, pose: "point", expr: "stern", seed: 100, mirror: true },
      ...(["navy1", "navy2", "navy3", "tachibana", "koichi", "navy2"] as CastId[]).map((id, i) => ({ id, x: (i % 2 ? 1 : -1) * (0.85 + (Math.floor(i / 2) % 2) * 0.75), z: 1.4 + Math.floor(i / 2) * 1.8, legs: "sit" as const, pose: "sit" as Pose, expr: "stern" as Expr, seed: 101 + i, mirror: i % 2 === 0 }))] }; });
// "to sink him in a ring of gas,": a high angle over the ring of ships, slowly spinning (a map)
shot(3, M7s - 2, M7t - 1, "sea", "sky", [K(M7s - 2, (f) => MV.arc(C([0, 150, 70], [0, 0, 0], 50), 18 * at(f, M7s - 2, M7t - 1)))],
  (f, H) => { const s = sm(f, M7s, M7t + 10);
    H.ships.forEach((m, i) => { const a = (i / 6) * Math.PI * 2 + 0.3; m.visible = true; m.position.set(Math.cos(a) * 55, 0.1 * Math.sin(f * 0.05 + i), Math.sin(a) * 55); m.rotation.y = -a; });
    H.tug.visible = true; H.tug.position.set(20, 0, 70); H.tug.rotation.y = 0.4;
    return { actors: [], zillas: [{ x: 0, y: -10 - 30 * s, z: 0, h: 50, v: "m1", pose: "roar", jaw: 0.5, shadow: false }],
      particles: rise(f, 0, -1, 0, 500, 80, 6, 4, ["#ffffff", "#d8eef8"]), particleSize: 1.0 }; });
// "then yank him up so fast the pressure kills him.": tilt up the board with the "up" arrow, push on "kills"
shot(3, M7t - 1, M8 - 1, "rooms", "hall", [K(M7t - 1, (f) => MV.dolly(MV.swing(C([-0.7, 2.0, 0.0], [-0.7, 1.9, -5.85], 44), C([-0.7, 2.0, 0.0], [-0.6, 3.7, -5.85], 44), MV.prog(f, M7u - 22, 22)), 0.18 * MV.prog(f, M7k - 8, 16)))],
  (f, H) => { setBoard(H, 1 + sm(f, M7t, M7u + 6), f >= M7k - 1 ? 1 : 0); return { actors: [] }; });
// "Koichi flies a plane full of explosives,": follow the Shinden over the bay
const PLANE = (f: number): V3 => [0, 28 + 0.4 * Math.sin(f * 0.1), 260 - (f - M8) * 1.6];
shot(3, M8 - 1, M8s - 1, "sea", "sky", [K(M8 - 1, (f) => MV.follow(PLANE, f, [12, 3, 24], 5, [0, -1, -34], 44))],
  (f, H) => { H.shinden.visible = true; H.shinden.position.set(...PLANE(f)); H.shinden.rotation.set(0.08 * Math.sin(f * 0.07), Math.PI / 2, 0);
    return { actors: [], zillas: [{ x: -10, y: -10, z: -60, h: 50, v: "m1", pose: "stand", shadow: false }] }; });
// "straight into Godzilla's mouth.": POV from the cockpit, flying into the glowing mouth
const MOUTHX = -18.2; // card centre so that the mouth sits on x = 0 (card yaw fixed to face +z)
shot(3, M8s - 1, M8m + 2, "sea", "sky", [K(M8s - 1, (f) => { const u = MV.prog(f, M8s - 1, M8m + 2 - M8s, MV.in2); return { pos: [0, L(30, 19.5, u), L(150, 13, u)], look: [0, 19, -5], fov: 58, roll: MV.prog(f, M8s, 30) * 0.08 }; })],
  (f) => ({ actors: [], zillas: [{ x: MOUTHX, y: -12, z: 0, h: 52, v: "m1", pose: "breath", jaw: 1, glow: 0.5 + 0.5 * at(f, M8s, M8m), shadow: false, yaw: 0 }] }));
// the blast: crane out of the explosion
KICKS.push([M8m + 2, 2.0]);
shot(3, M8m + 2, M9 - 1, "sea", "sky", [K(M8m + 2, (f) => MV.mixCam(C([30, 30, 40], [0, 34, 0], 46), C([70, 26, 70], [0, 32, 0], 46), MV.prog(f, M8m + 2, M9 - M8m, MV.out3)))],
  (f) => { const b = at(f, M8m + 2, M9 + 4);
    return { actors: [], fx: [{ k: "burst", x: 6, y: 42, z: 2, w: 30 * (0.5 + b), t: b, col: "#fff3b0" }, { k: "glow", x: 6, y: 42, z: 2, w: 40, soft: true, col: "#ffcf7a", alpha: 0.8 * (1 - b) }],
      zillas: [{ x: 0, y: -12, z: 0, h: 52, v: "m1", pose: "breath", jaw: 1, glow: 0.9 * (1 - b), mirror: true, shadow: false }] }; });
// "But this time, he ejects. He chooses to live.": ride down with him (pedestal) with a slow arc
shot(3, M9 - 1, M10 - 1, "sea", "sky", [K(M9 - 1, (f) => { const y = 36 - (f - M9) * 0.05; return MV.arc(C([3, y + 1.8, 10.5], [0, y + 2.3, 0], 42), L(-8, 14, at(f, M9 - 1, M10 - 1))); })],
  (f) => { const y = 36 - (f - M9) * 0.05, o = sm(f, M9e, M9e + 10);
    return { actors: [{ id: "koichiP", x: 0, y, z: 0, pose: "cheer", legs: "fly", expr: f > M9c ? "relief" : "shock", flutter: 0.6, seed: 80, shadow: false }],
      fx: [{ k: "chute", x: 0, y: y + 2.6 + 1.6 * o, z: -0.1, w: 1 + 3.4 * o, h: 0.7 + 2.3 * o }, { k: "puff", x: -40, y: 20, z: -80, w: 30, h: 22, col: "#8a8a92", seed: 2 }] }; });
// "And Noriko is alive, with a strange black mark on her neck.": a quiet push-in to the mark
shot(3, M10 - 1, M11 - 1, "rooms", "hospital", [D(M10 - 1, [101.6, 1.6, 0.6], [100.1, 1.3, -2.8], { fov: 40, rate: 0.002 }), D(M10m - 4, [99.6, 1.45, -1.2], [99.95, 1.3, -3.0], { fov: 38, dur: 32, rate: 0.003 })],
  () => ({ actors: [{ id: "norikoH", x: 100.0, y: 0.55, z: -3.0, legs: "sit", pose: "sit", expr: "smile_closed", seed: 73 }, { id: "koichi", x: 101.5, z: -1.6, expr: "relief", look: -1, seed: 70, mirror: true }] }));
// "While deep in the sea, Godzilla's flesh starts growing back.": tilt down into the deep, the horizon slowly rolls (dread)
shot(3, M11 - 1, cue("A1", "the") - 1, "sea", "underwater", [K(M11 - 1, (f) => MV.roll(MV.swing(C([14, -24, 40], [0, -18, -10], 46), C([14, -24, 40], [0, -42, -10], 46), MV.prog(f, M11 - 1, 40)), -5 * MV.prog(f, M11, 80)))],
  (f) => ({ actors: [], zillas: [{ x: 0, y: -66 - (f - M11) * 0.03, z: -10, h: 46, v: "sunk", pose: "sink", eye: f >= M11b ? "angry" : "x", regrow: sm(f, M11f - 4, M11f + 30) * (1 + 0.15 * Math.sin(f * 0.3)), shadow: false, roll: 0.15 }],
    particles: rise(f, 0, -70, -10, 260, 60, 60, 2, ["#bfe4ff", "#8ac4e0"]), particleSize: 0.35 }));

// ===== THE OSCAR (ch 4) =====
const A1 = cue("A1", "the"), A1d = cue("A1", "dollars"), A1b = cue("A1", "beat"), A1o = cue("A1", "oscar");
const A2 = cue("A2", "the"), A2t = cue("A2", "toys");
const TEAM: CastId[] = ["vfx1", "vfx2", "vfx3", "vfx4"];
const BAGS = (d: number): FxSpec[] => [{ k: "bag", x: 202.9, y: 1.2 + 1.7 * (1 - 0.7 * d), z: -3.5, w: 3.4 * (1 - 0.7 * d), text: ["$$$"], seed: 1, alpha: 1 - 0.8 * d }, { k: "bag", x: 204.6, y: 1.2 + 1.5 * (1 - 0.7 * d), z: -5.5, w: 3.0 * (1 - 0.7 * d), text: ["$$$"], seed: 1, alpha: 1 - 0.8 * d }];
const TEAMX = [198.0, 198.75, 199.5, 200.25];
// "The film cost under fifteen million dollars,": pull-out from the little bag to the giant Hollywood bags (scale reveal)
shot(4, A1 - 1, A1b - 2, "rooms", "oscar", [K(A1 - 1, (f) => MV.mixCam(C([201.3, 1.85, 2.9], [201.2, 1.72, 1.0], 38), C([200.5, 2.4, 11], [200.7, 2.7, -1.5], 46), MV.prog(f, A1d - 40, 40)))],
  () => ({ actors: TEAM.map((id, i) => ({ id, x: TEAMX[i], y: 1.2, z: 0.5, expr: (i % 2 ? "nervous" : "smile") as Expr, seed: 110 + i, pose: "idle" as Pose })),
    fx: [{ k: "bag", x: 201.2, y: 1.2 + 0.5, z: 1.0, w: 1.0, text: ["$15M"], seed: 0 }, ...BAGS(0)] }));
// "and beat Hollywood to the Oscar for visual effects.": low angle, tilt up with the statue as it rises (triumph)
KICKS.push([A1b, 1.0]);
shot(4, A1b - 2, A2 - 1, "rooms", "oscar", [K(A1b - 2, (f) => MV.swing(C([201.0, 0.75, 7.0], [201.4, 1.9, -1.2], 46), C([201.0, 0.75, 7.0], [201.8, 3.4, -1.2], 46), MV.prog(f, A1o - 16, 16)))],
  (f) => { const d = sm(f, A1b, A1b + 14), s = sm(f, A1o - 4, A1o + 4);
    const fx: FxSpec[] = BAGS(d);
    if (s > 0) fx.push({ k: "statue", x: 202.0, y: 1.2 + 2.0 * s, z: -1.2, w: 1.35 * s, h: 4.0 * s, t: s > 0.9 ? 1 : 0 }, { k: "glow", x: 202.0, y: 3.2, z: -1.5, w: 6 * s, soft: true, col: "#ffd27a", alpha: 0.55 * s });
    return { actors: TEAM.map((id, i) => ({ id, x: TEAMX[i], y: 1.2, z: 0.5, pose: "cheer" as Pose, expr: "laugh" as Expr, seed: 110 + i })), fx }; });
// "The team carried their Godzilla toys on stage.": spring push onto the toys, whip pan out at the end
WHIPS.push(cue("Z1", "now") - 1);
shot(4, A2 - 1, cue("Z1", "now") - 1, "rooms", "oscar", [K(A2 - 1, (f) => whipOut(MV.dolly(C([200.3, 2.35, 5.6], [200.3, 2.3, 0.5], 40), 0.38 * MV.prog(f, A2t - 14, 18, MV.spring)), f, cue("Z1", "now") - 1))],
  (f) => ({ actors: TEAM.map((id, i) => ({ id, x: 199.0 + i * 0.85, y: 1.2, z: 0.5, pose: "cheer" as Pose, expr: (i % 2 ? "laugh" : "grin") as Expr, seed: 110 + i })),
    particles: confetti(f, 200.3, 1.4, 0.8, 320, 6, 5), particleSize: 0.06 }));

// ===== GODZILLA MINUS ZERO (ch 5) =====
const Z1 = cue("Z1", "now"), Z1s = cue("Z1", "shikishimas"), Z1h = cue("Z1", "so"), Z1e = cue("Z1", "he");
const Z2 = cue("Z2", "the"), Z2g = cue("Z2", "golden"), Z2l = cue("Z2", "lightning"), Z2t = cue("Z2", "three"), Z2k = cue("Z2", "so"), Z2m = cue("Z2", "mark");
const Z3 = cue("Z3", "twenty"), Z3s = cue("Z3", "seventy"), Z3w = cue("Z3", "we're"), Z3k = cue("Z3", "walk");
// "Now, Minus Zero. It's 1949,": whip in, then crane down into the rebuilt street
shot(5, Z1 - 1, Z1s - 3, "ruins", "ruins", [K(Z1 - 1, (f) => { const t = glide(at(f, Z1 - 1, Z1s)); return whipIn(MV.cam({ pos: [L(-2, 1, t), L(26, 3, t), L(-120, -150, t)], look: [0, L(4, 3, t), -230], fov: 46 }), f, Z1 - 1); })],
  (f) => ({ actors: (["folkM", "folkW", "folkB", "folkW", "folkM"] as CastId[]).map((id, i) => ({ id, x: (i % 2 ? 1 : -1) * (1.5 + i * 0.4), z: -175 - i * 9 + ((f / FPS) * (i % 2 ? 1 : -1) * 1.2), legs: "walk" as const, phase: f / FPS + i * 0.3, mirror: i % 2 === 1, expr: "smile" as Expr, seed: 120 + i })) }));
// "the Shikishimas are back, and so is he.": creep on the family, then tilt up to him rising behind the roofs
KICKS.push([Z1h + 6, 1.0]);
shot(5, Z1s - 3, Z2 - 1, "ruins", "ruins", [K(Z1s - 3, (f) => MV.swing(MV.creep(C([0.8, 1.5, -167.5], [0, 2.4, -190], 42), f, Z1s - 3, 0.002), C([0.6, 1.4, -166], [2, 26, -330], 46), MV.prog(f, Z1e - 18, 18)))],
  (f) => { const r = sm(f, Z1h - 4, Z1h + 20), turn = f > Z1h + 4;
    return { actors: [{ id: "koichi", x: -0.7, z: -175, expr: turn ? "shock" : "smile", seed: 70 }, { id: "norikoM", x: 0.3, z: -175.4, expr: turn ? "shock" : "smile_closed", seed: 73 }, { id: "akiko", x: 1.05, z: -174.8, expr: turn ? "shock" : "grin", seed: 74 }],
      zillas: [{ x: 4, y: -48 + 48 * r, z: -330, h: 50, v: "m1", pose: f > Z1h + 6 ? "roar" : "stand", jaw: sm(f, Z1h + 6, Z1h + 14), mirror: true, shadow: false }] }; });
// "The trailers tease golden lightning, and a three-headed rival.": low angle under the storm, a growing dutch roll (tension)
shot(5, Z2 - 1, Z2k - 1, "sea", "stormGold", [K(Z2 - 1, (f) => MV.roll(lcreep(C([34, 4, 60], [-14, 96, -460], 50), f, Z2 - 1, 0.002), -9 * MV.prog(f, Z2 - 1, Z2k - Z2)))],
  (f) => { const fl = f >= Z2t - 2 ? Math.max(sm(f, Z2t - 2, Z2t + 4) * (1 - at(f, Z2t + 10, Z2k)), 0.25) : 0;
    const fx: FxSpec[] = [Z2g, Z2l, Z2l + 8, Z2t, Z2t + 6].filter((b) => f >= b && f < b + 5).map((b) => ({ k: "bolt" as const, x: -160 + (b % 7) * 50, y: 140, z: -600, w: 40, h: 140, seed: b, col: "#ffe27a" }));
    if (fl > 0) fx.push({ k: "three", x: -40, y: 170, z: -620, w: 320, h: 256, t: fl, soft: true, alpha: 0.92 });
    return { actors: [], fx, zillas: [{ x: 28, y: -6, z: -230, h: 50, v: "sil", glow: 0.35, rim: "#ffb050", mirror: true, shadow: false }],
      particles: rain(f, 20, 0, 30, 200, 60, 40), particleSize: 0.4 }; });
// "So keep an eye on that mark.": push-in to the mark
shot(5, Z2k - 1, Z3 - 1, "ruins", "golden", [D(Z2k - 1, [1.0, 1.55, 2.4], [0.05, 1.4, 0], { fov: 38, rate: 0.003, punch: 0.008, p0: Z2m - 4, n: 22 })],
  () => ({ actors: [{ id: "norikoM", x: 0, z: 0, expr: "neutral", look: -1, seed: 73 }] }));
// "Twenty-three fishermen saw a false sunrise.": back on the boat, a slow lens zoom to the horizon (callback)
shot(5, Z3 - 1, Z3s - 2, "sea", "dawn", [K(Z3 - 1, (f) => MV.zoom(C([8.5, 3.9, 6.5], [-62, 12, -46], 44), L(44, 30, MV.prog(f, Z3 - 1, Z3s - Z3))))],
  (f, H) => { boatAt(H, f);
    return { actors: [{ id: "fish1", x: 3.0, y: DECK, z: 1.4, expr: "neutral", facing: -1, look: -1, seed: 11 }, { id: "fish3", x: 4.2, y: DECK, z: 0.2, expr: "neutral", facing: -1, look: -1, seed: 13 }],
      fx: [{ k: "fireball", x: WEST[0], y: 90, z: WEST[2], w: 480, soft: true, t: 0.85 }] }; });
// "Seventy-two years later, we're still watching": pull out of the movie screen into the theatre
shot(5, Z3s - 2, Z3w - 2, "rooms", "cinema", [K(Z3s - 2, (f) => MV.mixCam(C([300, 6.5, -4.5], [300, 6.5, -11.9], 46), C([300, 5.2, 16], [300, 5.8, -11], 46), MV.prog(f, Z3s - 2, 36)))],
  (f, H) => { setScreen(H, f); return { actors: [] }; });
shot(5, Z3w - 2, Z3k - 4, "rooms", "cinema", [D(Z3w - 2, [300.35, 1.25, -4.2], [300.35, 1.0, 0.3], { fov: 44, rate: 0.003 })],
  (f, H) => { setScreen(H, f);
    return { actors: (["aud1", "aud2", "aud3"] as CastId[]).map((id, i) => ({ id, x: 299.6 + i * 0.75, y: 0, z: 0.35, legs: "sit" as const, pose: (i === 1 ? "sit" : "hold") as Pose, expr: (i === 1 ? "shock" : i === 2 ? "grin" : "smile") as Expr, seed: 130 + i })) }; });
// "it walk.": crane up and back at dawn while he walks across the sun; end title
shot(5, Z3k - 4, TOTAL, "sea", "dawn", [M(Z3k - 4, (f) => { const t = glide(at(f, Z3k - 4, TOTAL)); return { pos: [L(30, 10, t), L(3, 14, t), L(120, 170, t)], look: [0, L(30, 34, t), -200], fov: 46 }; })],
  (f) => { const w = (f - Z3k) / FPS;
    return { actors: [], zillas: [{ x: -16 + w * 4, y: -4, z: -300, h: 70, v: "sil", pose: "walk", phase: w * 0.35, glow: 0.7, rim: "#ffb070", shadow: false }],
      fx: [{ k: "fireball", x: 10, y: 34, z: -520, w: 160, soft: true, t: 0.7 }] }; });

KICKS = KICKS.sort((a, b) => a[0] - b[0]);
export const SHOTS = S;
export const shotAt = (f: number) => { for (let i = S.length - 1; i >= 0; i--) if (f >= S[i].a) return S[i]; return S[0]; };
/** white flashes [frame, length, colour] drawn over the picture */
export const FLASHES: [number, number, string][] = [[H1b, 4, "#ffffff"], [H2s - 1, 4, "#fff2d0"], [M1m, 4, "#ffffff"], [M6g + 3, 7, "#ffffff"], [M6b, 5, "#fff6dc"], [M8m + 2, 6, "#fff6dc"], [A1o, 4, "#fff2c0"], [Z1h + 6, 4, "#ffffff"]];
/** lightning strobes: frames where the picture flares */
export const LIGHTNING = [Z2g, Z2l, Z2l + 8, Z2t, Z2t + 6];
export const CUES = { H3: H4, O1, Y1, M1, A1, Z1, Z3k, END: Z3k + 12 };
/** picture timeline for the sound script (scripts/timeline.mjs writes it to audio/timeline.json) */
export const TIMELINE = { total: TOTAL, fps: FPS, shots: S.map((s) => ({ a: s.a, b: s.b, ch: s.ch, place: s.place, look: s.look })), kicks: KICKS, flashes: FLASHES, lightning: LIGHTNING, whips: WHIPS, snaps: SNAPS,
  cues: { ...CUES, H1b, H2s, H3b, H2b: H3b, H2z: H1b, H1s: H2s, O1, O2m, O3, O2h, O2w, O3h, O3s, O3t, Y1w, Y1f, Y2r, M1m, M2d, M2m, M3f, M4h, M4a, M5n, M6m, M6c, M6g, M6b, M7, M7s, M7t, M7k, M8, M8m, M9e, M9c, M10, M11, M11b,
    A1b, A1o, A2, A2t, Z1h, Z2g, Z2l, Z2t, Z3, Z3s, Z3w } };
