// Camera move library: pure functions that turn a framing into a moved framing. Each move takes a base camera
// {pos, look, fov, roll} and an amount, so moves stack (pan + push + roll ...). Drop this file next to any
// story.ts: nothing here knows about the scene. Units: metres, degrees for angles in the API, frames for time.
// Catalogue with when-to-use notes: references/CAMERA_MOVES.md.
import { V3, clamp01 } from "./timeline";

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = { pos: V3; look: V3; fov?: number; roll?: number };
export const cam = (s: Shot): Cam => ({ fov: 40, roll: 0, ...s });

// ---------------- vectors ----------------
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const off = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];
const rad = (d: number) => (d * Math.PI) / 180;
/** rotate v about a unit axis by ang radians (Rodrigues) */
export const rotAxis = (v: V3, k: V3, ang: number): V3 => {
  const c = Math.cos(ang), s = Math.sin(ang), kv = cross(k, v), kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
};
const UP: V3 = [0, 1, 0];
/** camera basis: forward, right, up (world) */
export const basis = (c: Cam) => {
  const fw = norm(sub(c.look, c.pos));
  let rt = cross(fw, UP); if (len(rt) < 1e-4) rt = [1, 0, 0];
  rt = norm(rt);
  return { fw, rt, up: cross(rt, fw) };
};

// ---------------- easing (u in 0..1) ----------------
/** symmetric smootherstep: the house glide (peak speed = 1.875 x distance / duration) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const inOut3 = (u: number) => { const x = clamp01(u); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const inOut5 = (u: number) => { const x = clamp01(u); return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2; };
export const out3 = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const out5 = (u: number) => 1 - (1 - clamp01(u)) ** 5;
export const in2 = (u: number) => clamp01(u) ** 2;
export const in3 = (u: number) => clamp01(u) ** 3;
/** ease-out with overshoot (easeOutBack): peaks ~ +10 % at s = 1.70 */
export const back = (u: number, s = 1.70158) => { const x = clamp01(u) - 1; return 1 + (s + 1) * x ** 3 + s * x ** 2; };
/** damped spring 0 -> 1: overshoot, one smaller rebound, settle (zeta ~0.35) */
export const spring = (u: number, freq = 1.25, damp = 5) => {
  const x = clamp01(u), s = (t: number) => 1 - Math.exp(-damp * t) * Math.cos(2 * Math.PI * freq * t);
  return s(x) + (1 - s(1)) * x * x * x; // ~ +13 % at 0.4, -2 % at 0.8, lands exactly on 1
};
/** progress of a move that starts at frame f0 and lasts dur frames, through an easing */
export const prog = (f: number, f0: number, dur: number, ease: (u: number) => number = glide) => ease(clamp01((f - f0) / Math.max(1, dur)));

// ---------------- the moves ----------------
/** DOLLY / PUSH-IN (k > 0) or PULL-OUT (k < 0): the body travels along the line of sight; k = share of the distance */
export const dolly = (c: Cam, k: number): Cam => ({ ...c, pos: lerp3(c.pos, c.look, k) });
/** a slow creep: distance shrinks by `rate` per frame since f0 (0.0015-0.0035 = the reference hold push) */
export const creep = (c: Cam, f: number, f0: number, rate = 0.0025): Cam => dolly(c, 1 - (1 - rate) ** Math.max(0, f - f0));
/** PAN: the camera turns left (+deg) / right (-deg) on the spot */
export const pan = (c: Cam, deg: number): Cam => ({ ...c, look: add(c.pos, rotAxis(sub(c.look, c.pos), UP, rad(deg))) });
/** TILT: the camera pivots up (+deg) / down (-deg) on the spot */
export const tilt = (c: Cam, deg: number): Cam => { const { rt } = basis(c); return { ...c, look: add(c.pos, rotAxis(sub(c.look, c.pos), rt, rad(deg))) }; };
/** TRUCK: the body slides sideways (+m = to the camera's right); the look slides with it (parallax) */
export const truck = (c: Cam, m: number): Cam => { const { rt } = basis(c); const d = mul(rt, m); return { ...c, pos: add(c.pos, d), look: add(c.look, d) }; };
/** PEDESTAL / BOOM: the body rises (+m) or sinks, the lens stays level */
export const pedestal = (c: Cam, m: number): Cam => ({ ...c, pos: off(c.pos, 0, m, 0), look: off(c.look, 0, m, 0) });
/** ARC / ORBIT: the body circles the look point (+deg = counter-clockwise seen from above) */
export const arc = (c: Cam, deg: number, center: V3 = c.look): Cam => ({ ...c, pos: add(center, rotAxis(sub(c.pos, center), UP, rad(deg))) });
/** CRANE / JIB: rise + swing + pull back at once while the lens keeps the subject (one arm, three axes) */
export const crane = (c: Cam, up: number, swingDeg: number, back = 0): Cam => {
  const swung = arc(c, swingDeg), d = norm(sub(swung.pos, c.look));
  return { ...swung, pos: add(off(swung.pos, 0, up, 0), mul(d, back)) };
};
/** LENS ZOOM: only the focal length changes (fov in degrees); nothing moves, perspective stays flat */
export const zoom = (c: Cam, fov: number): Cam => ({ ...c, fov });
/** zoom by an image-scale factor (1.5 = subject 50 % bigger) */
export const zoomBy = (c: Cam, k: number): Cam => ({ ...c, fov: (2 * Math.atan(Math.tan(rad(c.fov) / 2) / k) * 180) / Math.PI });
/** DOLLY ZOOM (vertigo): dolly by k while the lens widens/narrows so the look point keeps its size on screen */
export const dollyZoom = (c: Cam, k: number): Cam => {
  const d0 = len(sub(c.look, c.pos)), moved = dolly(c, k), d1 = len(sub(c.look, moved.pos));
  return { ...moved, fov: (2 * Math.atan((Math.tan(rad(c.fov) / 2) * d0) / Math.max(0.05, d1)) * 180) / Math.PI };
};
/** DUTCH / ROLL: tilt the horizon (degrees, + = clockwise) */
export const roll = (c: Cam, deg: number): Cam => ({ ...c, roll: c.roll + rad(deg) });
/** blend two cameras (glides, whips) */
export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t), fov: a.fov + (b.fov - a.fov) * t, roll: a.roll + (b.roll - a.roll) * t,
});
/** blend by turning, not by sliding the look point: keeps the view direction sweeping (whip pans, big reframes) */
export const swing = (a: Cam, b: Cam, t: number): Cam => {
  const da = sub(a.look, a.pos), db = sub(b.look, b.pos), la = len(da), lb = len(db);
  const ua = norm(da), ub = norm(db), ang = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub))));
  let dir = ua;
  if (ang > 1e-4) { const ax = norm(cross(ua, ub)); dir = rotAxis(ua, len(ax) > 1e-6 ? ax : UP, ang * t); }
  const pos = lerp3(a.pos, b.pos, t);
  return { pos, look: add(pos, mul(dir, la + (lb - la) * t)), fov: a.fov + (b.fov - a.fov) * t, roll: a.roll + (b.roll - a.roll) * t };
};
/** FLY-THROUGH: a smooth path through waypoints (centripetal Catmull-Rom); u 0..1 over the whole path */
export const spline = (pts: V3[], u: number): V3 => {
  const n = pts.length - 1, x = clamp01(u) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)) as V3;
};
/** FOLLOW / TRACKING: the camera keeps an offset from a moving target and trails it by `lag` frames (soft) */
export const follow = (target: (f: number) => V3, f: number, offset: V3, lag = 4, lookLead: V3 = [0, 0, 0], fov = 40): Cam => {
  let w = 0; const acc: V3 = [0, 0, 0];
  for (let i = 0; i <= Math.max(0, Math.round(lag * 2.5)); i++) { const k = lag > 0 ? Math.exp(-i / lag) : i ? 0 : 1; const p = target(f - i); acc[0] += p[0] * k; acc[1] += p[1] * k; acc[2] += p[2] * k; w += k; }
  const c = mul(acc, 1 / w), now = target(f);
  return { pos: add(c, offset), look: add(lerp3(c, now, 0.6), lookLead), fov, roll: 0 };
};

// ---------------- impacts ----------------
/** frame-alternating impact kicks (reference: offset flips sign every frame, ~3 px at 720p per unit, gone in 7 f) */
export const kickAt = (f: number, kicks: [number, number][]) => {
  let a = 0;
  for (const [f0, g] of kicks) { const n = Math.round(f - f0); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const applyKick = (c: Cam, a: number): Cam => {
  if (!a) return c;
  const { rt, up } = basis(c), L = len(sub(c.look, c.pos));
  const m = (3 / 640) * Math.tan(rad(c.fov) / 2) * L * a; // metres at the look distance for 3 px (720p) x a
  return { ...c, look: add(c.look, add(mul(rt, -m), mul(up, 0.6 * m))), roll: c.roll + a * 0.004 };
};

// ---------------- time ----------------
/** SPEED RAMP: story time for real frame f. Inside [a, b] the picture runs fast, then slow (min speed `slow`), then
 *  catches up so that story and real time meet again at b (narration and picture stay in sync outside the ramp). */
export const ramp = (f: number, a: number, b: number, slow = 0.3, at = 0.62) => {
  if (f <= a || f >= b) return f;
  const n = b - a, u = (f - a) / n;
  // speed profile v(u) = 1 + A*bump(u, early) - D*bump(u, at): integral of (v - 1) over 0..1 must be 0
  const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
  const w1 = 0.13, w2 = 0.16, c1 = Math.max(0.16, at - 0.36), D = 1 - slow;
  const I = (c: number, w: number, x: number) => { let s = 0; const N = 64; for (let i = 0; i < N; i++) { const t = ((i + 0.5) / N) * x; s += bump(t, c, w) * (x / N); } return s; };
  const A = (D * I(at, w2, 1)) / Math.max(1e-6, I(c1, w1, 1));
  return a + n * (u + A * I(c1, w1, u) - D * I(at, w2, u));
};
