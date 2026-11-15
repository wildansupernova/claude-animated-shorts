// Timeline of "The Birthday Bet": every cut, camera key and acting beat is looked up from the voice's word timings
// (words.json, Kokoro duration-predictor times, checked against Whisper: median offset 0.01 s), so a re-voiced line
// moves its pictures with it. Camera grammar from references/reports/motion.md: symmetric smootherstep glides of
// 18-40 f, hard cuts on big reframes, every hold creeps in (0.15-0.35 %/f, ~0.6 %/f on punch words), 7-frame
// flip-kicks on impacts, no hand-held float.
import WORDS from "./words.json";

export const FPS = 30;
export const D0 = 0; // ground height (m): build.ts places houses on it
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- the voice ----------------
type Word = { w: string; s: number; e: number; line: number };
const WS = WORDS as Word[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** frame where the n-th `w` of voice line `line` starts (first word of the line when w is omitted) */
export const cue = (line: number, w?: string, n = 0) => {
  const l = WS.filter((x) => x.line === line && (!w || norm(x.w) === norm(w)));
  if (!l[n]) throw new Error(`cue: no "${w}" #${n} in line ${line}`);
  return Math.round(l[n].s * FPS);
};
export const cueEnd = (line: number, w?: string, n = 0) => {
  const l = WS.filter((x) => x.line === line && (!w || norm(x.w) === norm(w)));
  return Math.round((w ? l[n] : l[l.length - 1]).e * FPS);
};
export const WORD_LIST = WS;
const LEAD = 2; // reactions land 0-3 f before their word
export const TOTAL = cueEnd(21) + 14; // the last word plus a short tail for the confetti and the music's button

// ---------------- the party: 23 guests in a ring around the cake ----------------
export const R = 3.6;
export const N = 23;
/** guest k (1..23) on the ring, k = 1 (Dave) at the back, counting clockwise seen from above */
export const ringAng = (k: number, n = N) => (2 * Math.PI * (k - 1)) / n;
export const G = (k: number, r = R, n = N, a0 = 0): V3 => { const t = ringAng(k, n) + a0; return [r * Math.sin(t), 0, -r * Math.cos(t)]; };
export const DAVE = 1, GARY = 4, NINE = 9, SEVENTEEN = 17;
/** extra guests for "fifty" and "seventy": two outer rings */
export const RING2 = { n: 27, r: 6.3, a0: 0.07 }, RING3 = { n: 20, r: 8.5, a0: 0.13 };
/** the 253 others around Gary (sunflower spiral, Gary alone at the centre) */
export const CROWD: [number, number][] = Array.from({ length: 253 }, (_, i) => {
  const n = i + 4, r = 0.56 * Math.sqrt(n), a = n * 2.39996323;
  const j = Math.sin(n * 91.7) * 0.12;
  return [(r + j) * Math.sin(a), -(r + j) * Math.cos(a)];
});
/** the football pitch, far from town (fog hides each place from the other) */
export const PITCH: V3 = [0, 0, -700];
export const SQUAD = (k: number): V3 => [PITCH[0] + (k - 12) * 0.95, 0, PITCH[2]];
export const CUP_PAIR: [number, number] = [7, 16];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Scene = "party" | "pitch" | "crowd";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene; table: boolean; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B = [0, L(1), L(2), L(4), L(5), L(6), L(7), L(8), L(9), L(10), L(11), L(12), L(14), L(15), L(16, "and"), L(17), L(19), L(20), L(21), TOTAL];
const LIGHT: Light[] = ["day", "day", "day", "day", "day", "day", "day", "day", "day", "day", "day", "golden", "golden", "golden", "golden", "golden", "day", "golden", "golden"];
const SCENE: Scene[] = ["party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "party", "pitch", "crowd", "party"];
// golden hour with the sun at 24 deg (not the low backlight preset): the lawn stays lit, the shadows stay violet
export const SHOTS: ShotDef[] = LIGHT.map((light, i) => ({ id: i + 1, a: B[i], b: B[i + 1], light, scene: SCENE[i], table: i < 11 || i === 18, ...(light === "golden" ? { sunAz: 55, sunEl: 24 } : {}) }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
/** crossfades at place / time changes (frames); a white flash ends the hook */
export const XFADE: Record<number, number> = { 12: 8, 17: 8, 18: 8, 19: 8 };
export const FLASH_AT = SH[2].a;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story events (frames; cast.ts / world.ts draw them, the sound mirrors them) ----------------
/** hook: number tags count 1..23 around the ring while "twenty-three people" is said */
export const TAG0 = cue(0, "twenty-three") - 1, TAG1 = cue(0, "room") + 4;
export const tagAt = (k: number) => Math.round(TAG0 + ((k - 1) * (TAG1 - TAG0)) / (N - 1));
/** the coin: launch / land per shot */
export const COINS = [
  { shot: 1, f0: cue(0, "coin") - 8, f1: cue(0, "two") + 2 },
  { shot: 15, f0: cue(16, "coin") - 10, f1: cue(16, "flip") + 14 },
];
/** speech bubbles: guest, text, frames (a..b), hot = the match */
export type Bubble = { k: number; text: string; a: number; b: number; hot?: boolean; shot?: number };
const ROLL = ["JAN 4", "JUL 22", "NOV 30", "MAR 3", "MAY 17", "OCT 8", "FEB 11", "DEC 2"];
const RC0 = cue(7, "everyone"), RC1 = cue(7, "one", 1) + 6;
export const BUBBLES: Bubble[] = [
  { k: GARY, text: "MARCH 3?", a: cue(4, "March") - LEAD, b: SH[4].b, shot: 4 },
  ...ROLL.map((text, i) => ({ k: i + 1, text, a: Math.round(RC0 + (i * (RC1 - RC0)) / 7), b: SH[7].b, shot: 7 })),
  { k: NINE, text: "SEP 9", a: cue(8, "September") - LEAD, b: SH[10].b, hot: true },
  { k: SEVENTEEN, text: "SEP 9", a: cue(9, "seventeen") - LEAD, b: SH[10].b, hot: true },
  { k: GARY, text: "MARCH 3?", a: cue(20, "finding") - LEAD, b: SH[18].b, shot: 18 },
];
/** the match link (9-17) grows over these frames in the hook and stays lit through shot 10 */
export const HOOK_LINK = [cue(0, "share") - 4, cue(0, "birthday") + 2];
export const MATCH_LINK = [cue(9, "seventeen") + 4, cue(9, "seventeen") + 12];
/** Gary's 22 lines, one per other guest */
export const GARY_LINES = [cue(12, "checked") - 4, cue(13, "chances") + 2];
/** "any two people": a few sample pairs blink, then all 253 pairs draw in order */
export const SAMPLE_PAIRS: [number, number, number][] = [[6, 15, cue(14, "any")], [3, 20, cue(14, "two") + 2], [11, 21, cue(14, "people") + 3]];
export const WEB_BUILD = [cue(14, "twenty-three") - 2, cue(14, "pairs") + 4];
/** handshakes: odd pairs first, then even pairs */
export const SHAKE_A = cue(15, "shaking") - 6, SHAKE_B = cue(15, "every", 1) + 2, SHAKE_END = SH[14].b;
/** "fifty" / "seventy": new guests pop in and their lines draw */
export const GROW50 = [cue(17, "fifty") - 2, cue(17, "people") + 10], GROW70 = [cue(18, "seventy") - 2, cue(18, "seventy") + 14];
export const FLARE = cue(18, "guaranteed");
/** confetti bursts: frame, centre */
export const CONFETTI: [number, V3][] = [[cue(10, "Turns") - 2, [-0.3, 2.2, 1.8]], [FLARE, [0, 3, 0]], [cue(21, "bet") - 1, [0, 2.6, -3.2]]];
/** the World Cup pair */
export const CUP_LINK = [cue(19, "exactly"), cue(19, "half") + 6];
export const CUP_CAKE = cue(19, "shared") - LEAD;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
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
/** orbit the camera around the vertical axis through its look point by `a` radians */
const orbit = (s: Shot, a: number): Shot => {
  const dx = s.pos[0] - s.look[0], dz = s.pos[2] - s.look[2], c = Math.cos(a), sn = Math.sin(a);
  return { ...s, pos: [s.look[0] + dx * c - dz * sn, s.pos[1], s.look[2] + dx * sn + dz * c] };
};
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const at = (p: V3, y: number): V3 => [p[0], y, p[2]];
/** unit vector from guest k toward the ring centre */
const inward = (k: number): V3 => { const g = G(k), l = Math.hypot(g[0], g[2]); return [-g[0] / l, 0, -g[2] / l]; };
export const EYE = 1.46;
/** medium shot of guest k from inside the ring at distance d (lens height h) */
const msIn = (k: number, d: number, h = 1.5, side = 0): { pos: V3; look: V3 } => {
  const g = G(k), c = inward(k), sd: V3 = [-c[2], 0, c[0]];
  return { pos: add(add(at(g, h), c, d), sd, side), look: at(g, EYE - 0.08) };
};
/** lens near guest a looking across the ring toward guest b */
const across = (a: number, b: number, back: number, side: number, h: number, lookK = 0.55, lookH = 1.25): { pos: V3; look: V3 } => {
  const A = G(a), Bv = G(b), d: V3 = [Bv[0] - A[0], 0, Bv[2] - A[2]], l = Math.hypot(d[0], d[2]), u: V3 = [d[0] / l, 0, d[2] / l], s: V3 = [-u[2], 0, u[0]];
  return { pos: add(add(at(A, h), u, -back), s, side), look: [A[0] + d[0] * lookK, lookH, A[2] + d[2] * lookK] };
};
const T0 = (id: number) => SH[id].a;

// --- 1 hook: through the gap between the two front guests -> crane up over the ring (tags 1..23) -> the coin -> 9 + 17
const S1a = (f: number) => dolly([0.1, 1.5, 3.05], [0, 1.25, -2.0], pushK(f, 0, 0.003), { fov: 46 });
const S1b = (f: number) => orbit(dolly([0, 9.6, 12.6], [0, 0.6, -0.1], pushK(f, 16, 0.0022), { fov: 46 }), -0.0012 * (f - 16));
const S1c = (f: number) => dolly([0.3, 3.4, 7.2], [0, 2.9, 0], pushK(f, 58, 0.003, 0.006, 30), { fov: 42 });
/** the whole ring in a vertical frame: ~9 m across needs ~19 m of distance at fov 46 */
const WIDE = (f: number, f0: number, rate = 0.0018): Shot => dolly([0, 12.6, 16.2], [0, 0.8, 0.6], pushK(f, f0, rate), { fov: 46 });
const S1d = (f: number) => ({ ...WIDE(f, 92, 0.0025), roll: -0.025 });
// --- 2 Dave: MS from inside the ring (counting), then low behind the candles on "bets"
const S2a = (f: number) => { const c = msIn(DAVE, 2.5, 1.5, 0.35); return dolly(c.pos, c.look, pushK(f, T0(2), 0.0022), { fov: 40 }); };
const S2b = (f: number) => dolly([-0.85, 1.12, -1.35], [0, 1.62, -3.6], pushK(f, L(1, "bets"), 0.0018, 0.006, 30), { fov: 42, roll: 0.04 });
// --- 3 laugh: wide front, then up to the calendar burst
const S3a = (f: number) => dolly([0.7, 3.0, 9.6], [0, 1.25, 0], pushK(f, T0(3), 0.0025), { fov: 42 });
const S3b = (f: number) => dolly([0, 4.4, 8.6], [0, 2.7, 0], pushK(f, L(3, "three"), 0.002, 0.005, 30), { fov: 44, roll: -0.03 });
// --- 4 Gary: "Anybody born on March third?"
const S4a = (f: number) => { const c = msIn(GARY, 2.5, 1.48, -0.3); return dolly(c.pos, c.look, pushK(f, T0(4), 0.0025), { fov: 40 }); };
const S4b = (f: number) => { const c = msIn(GARY, 1.75, 1.55, -0.25); return dolly(c.pos, c.look, pushK(f, L(4, "Anybody"), 0.002), { fov: 40, roll: 0.035 }); };
// --- 5 silence: Gary's view of the front guests
const S5a = (f: number) => dolly([2.7, 2.15, -1.3], [-2.4, 1.15, 2.6], pushK(f, T0(5), 0.0028), { fov: 48 });
// --- 6 "See? Pay up, Dave."
const S6a = (f: number) => { const c = msIn(GARY, 1.3, 1.5, -0.2); return dolly(c.pos, c.look, pushK(f, T0(6), 0.003, 0.006, 20), { fov: 38, roll: -0.035 }); };
// --- 7 roll call: high wide, a slow orbit while the bubbles pop round the ring
const S7a = (f: number) => orbit(dolly([0, 6.6, 10.6], [0, 0.9, 0], pushK(f, T0(7), 0.0018), { fov: 44 }), -0.25 + 0.0016 * (f - T0(7)));
// --- 8 guest nine MS, 9 seventeen MS (cut on "seventeen")
const S8a = (f: number) => { const c = msIn(NINE, 3.8, 1.66, 0.25); return dolly(c.pos, c.look, pushK(f, T0(8), 0.0025, 0.006, 25), { fov: 40 }); };
const S9b = (f: number) => { const c = msIn(SEVENTEEN, 3.7, 1.66, -0.25); return dolly(c.pos, c.look, pushK(f, cue(9, "seventeen") - 1, 0.003), { fov: 40, roll: 0.04 }); };
// --- 10 America: high wide, the lit match across the ring
const S10a = (f: number) => orbit(WIDE(f, T0(10), 0.0022), 0.0012 * (f - T0(10)));
// --- 11 "Wait, how?"
const S11a = (f: number) => { const c = msIn(GARY, 1.6, 1.5, 0.12); return dolly(c.pos, c.look, pushK(f, T0(11), 0.004), { fov: 38, roll: 0.07 }); };
// --- 12 golden: behind Gary, his 22 lines fan out
const S12a = (f: number) => { const g = G(GARY), o = inward(GARY); return dolly([g[0] - o[0] * 4.4, 4.4, g[2] - o[2] * 4.4], [g[0] + o[0] * 3.2, 0.55, g[2] + o[2] * 3.2], pushK(f, T0(12), 0.0022), { fov: 46 }); };
// --- 13 crane up to the web
const S13a = S12a;
// the crane keeps Gary's side of the ring nearest the lens (Gary sits at 47 deg: orbit -2.32 rad from the front)
const S13b = (f: number) => orbit(dolly([0, 13.2, 11.6], [0, 0.6, 0.0], pushK(f, T0(13), 0.0015), { fov: 44 }), -2.32 + 0.0014 * (f - T0(13)));
// --- 14 handshakes: MS on a pair at the back, glide to the next pair, pull back on "each handshake"
const pairShot = (a: number, b: number, d: number, h = 1.42) => {
  const A = G(a), Bv = G(b), m: V3 = [(A[0] + Bv[0]) / 2, 0, (A[2] + Bv[2]) / 2], l = Math.hypot(m[0], m[2]);
  return { pos: [m[0] - (m[0] / l) * d, h, m[2] - (m[2] / l) * d] as V3, look: [m[0], 1.18, m[2]] as V3 };
};
const S14a = (f: number) => { const c = pairShot(1, 2, 3.1); return dolly(c.pos, c.look, pushK(f, T0(14), 0.0022), { fov: 44 }); };
const S14b = (f: number) => { const c = pairShot(2, 3, 3.0); return dolly(c.pos, c.look, pushK(f, SHAKE_B, 0.0022), { fov: 44 }); };
const S14c = (f: number) => orbit(dolly([0, 4.6, 7.4], [0, 1.0, -0.6], pushK(f, cue(16, "Each"), 0.002), { fov: 46 }), 0.001 * (f - cue(16, "Each")));
// --- 15 the web + the coin
const S15a = (f: number) => dolly([0, 12.4, 10.6], [0, 1.2, 0.2], pushK(f, T0(15), 0.0018), { fov: 44 });
const S15b = (f: number) => dolly([0, 6.4, 6.6], [0, 4.1, 0], pushK(f, cue(16, "coin") - 12, 0.003, 0.006, 25), { fov: 42 });
// --- 16 pull way back: 50, then 70 people
const S16a = (f: number) => orbit(dolly([0, 15.5, 14.8], [0, 0.4, 0], pushK(f, T0(16), 0.0012), { fov: 46 }), 0.0018 * (f - T0(16)));
const S16b = (f: number) => orbit(dolly([0, 23.5, 21.5], [0, 0.0, 0], pushK(f, L(18, "seventy"), 0.0012, 0.004, 25), { fov: 46 }), 0.0018 * (f - T0(16)));
// --- 17 the World Cup: stadium wide, dolly along the line-up, the matched pair
const P = PITCH;
const S17a = (f: number) => dolly([P[0] + 0.5, 9.5, P[2] + 26], [P[0], 1.6, P[2]], pushK(f, T0(17), 0.002), { fov: 44 });
const S17b = (f: number) => { const x = P[0] - 7.5 + 0.035 * (f - L(19, "every")); return { pos: [x, 1.5, P[2] + 4.3] as V3, look: [x + 0.4, 1.32, P[2]] as V3, fov: 42 }; };
const S17c = (f: number) => { const a = SQUAD(CUP_PAIR[0]), b = SQUAD(CUP_PAIR[1]); return dolly([a[0] - 2.5, 1.62, a[2] + 2.4], [(a[0] + b[0]) / 2 - 1.2, 1.3, a[2]], pushK(f, L(19, "and"), 0.0025), { fov: 40, roll: -0.03 }); };
// --- 18 Gary alone in a crowd of 253: CU, then the crane reveal on "two hundred fifty-three other guests"
const S18a = (f: number) => dolly([0.2, 1.52, 1.75], [0, 1.4, 0], pushK(f, T0(18), 0.0022), { fov: 40 });
const S18b = (f: number) => dolly([0.5, 17, 16.5], [0, 0.6, -0.5], pushK(f, L(20, "need") + 50, 0.0012), { fov: 46 });
// --- 19 the party again at sunset: descend toward Dave, CU on "make the bet"
const S19a = (f: number) => dolly([0.4, 3.9, 8.4], [0, 1.4, -1.6], pushK(f, T0(19), 0.0025), { fov: 44 });
const S19b = (f: number) => { const c = msIn(DAVE, 2.0, 1.5, 0.2); return dolly(c.pos, c.look, pushK(f, L(21, "make"), 0.003, 0.006, 20), { fov: 38, roll: 0.03 }); };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: TAG0 - 4, dur: 36, s: S1b }, { f: COINS[0].f0 - 6, dur: 26, s: S1c }, { f: cue(0, "two") - 6, dur: 24, s: S1d }],
  2: [{ f: T0(2), s: S2a }, { f: L(1, "and"), cut: true, s: S2b }],
  3: [{ f: T0(3), s: S3a }, { f: L(3, "three") - 6, dur: 28, s: S3b }],
  4: [{ f: T0(4), s: S4a }, { f: L(4, "Anybody") - 8, dur: 22, s: S4b }],
  5: [{ f: T0(5), s: S5a }],
  6: [{ f: T0(6), s: S6a }],
  7: [{ f: T0(7), s: S7a }],
  8: [{ f: T0(8), s: S8a }],
  9: [{ f: T0(9), s: S8a }, { f: cue(9, "seventeen") - 1, cut: true, s: S9b }],
  10: [{ f: T0(10), s: S10a }],
  11: [{ f: T0(11), s: S11a }],
  12: [{ f: T0(12) - 6, s: S12a }],
  13: [{ f: T0(13), s: S13a }, { f: T0(13), dur: 40, s: S13b }],
  14: [{ f: T0(14), s: S14a }, { f: SHAKE_B - 12, dur: 26, s: S14b }, { f: cue(16, "Each") - 10, dur: 30, s: S14c }],
  15: [{ f: T0(15), s: S15a }, { f: cue(16, "coin") - 24, dur: 28, s: S15b }],
  16: [{ f: T0(16), s: S16a }, { f: L(18, "seventy") - 14, dur: 36, s: S16b }],
  17: [{ f: T0(17) - 6, s: S17a }, { f: L(19, "every"), cut: true, s: S17b }, { f: L(19, "and"), cut: true, s: S17c }],
  18: [{ f: T0(18) - 6, s: S18a }, { f: L(20, "need") - 6, dur: 56, s: S18b }],
  19: [{ f: T0(19) - 6, s: S19a }, { f: L(21, "make") - 22, dur: 24, s: S19b }],
};

// impact kicks: sign flips every frame, decays over 7 f (frame, gain)
export const KICKS: [number, number][] = [[cue(0, "birthday"), 0.4], [cue(9, "seventeen"), 1.0], [cue(11, "Wait"), 0.8], [FLARE, 0.5], [cue(21, "bet"), 0.6]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ld = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ld * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyes = (k: number): (() => V3) => () => at(G(k), EYE);
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: () => [0, 1.3, -1.2] },
  { f: TAG0 - 4, dur: 36, cInf: 0 },
  { f: COINS[0].f0 - 6, dur: 26, cInf: 6 },
  { f: cue(0, "two") - 6, dur: 24, cInf: 0 },
  { f: T0(2), cInf: 12, focus: eyes(DAVE) },
  { f: T0(3), cInf: 0 },
  { f: T0(4), cInf: 12, focus: eyes(GARY) },
  { f: T0(5), cInf: 6 },
  { f: T0(6), cInf: 14, focus: eyes(GARY) },
  { f: T0(7), cInf: 0 },
  { f: T0(8), cInf: 12, focus: eyes(NINE) },
  { f: cue(9, "seventeen") - 1, cInf: 12, focus: eyes(SEVENTEEN) },
  { f: T0(10), cInf: 0 },
  { f: T0(11), cInf: 14, focus: eyes(GARY) },
  { f: T0(12), cInf: 5, focus: () => [-0.7, 0.9, 1.0] },
  { f: T0(13), cInf: 0 },
  { f: T0(14), cInf: 10 },
  { f: cue(16, "Each") - 10, dur: 30, cInf: 4 },
  { f: T0(15), cInf: 0 },
  { f: cue(16, "coin") - 24, dur: 28, cInf: 6 },
  { f: T0(16), cInf: 0 },
  { f: T0(17), cInf: 0 },
  { f: L(19, "every"), cInf: 10 },
  { f: L(19, "and"), cInf: 7 },
  { f: T0(18), cInf: 13, focus: () => [0, EYE, 0] },
  { f: L(20, "need") - 6, dur: 40, cInf: 0 },
  { f: T0(19), cInf: 0 },
  { f: L(21, "make") - 22, dur: 24, cInf: 12, focus: eyes(DAVE) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const FOREGROUND: { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number }[] = [];
