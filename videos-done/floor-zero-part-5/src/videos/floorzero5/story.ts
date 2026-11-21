// Timeline of "Floor Zero, Part 5: There Are Two of You". Every cut, camera key, story event and acting beat is looked up
// from the narration's word timings (words.json, Kokoro af_heart), so a re-voiced line moves its pictures with it.
// Voice line ids: 99 = the cold-open premise line (spoken first), 0-27 = SCRIPT.md lines.
import WORDS from "./words.json";

export const FPS = 30;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;
export const span = (f: number, a: number, b: number) => smooth((f - a) / Math.max(1, b - a));

// ---------------- the voice ----------------
type Word = { w: string; s: number; e: number; line: number };
const WS = WORDS as Word[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
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
const LEAD = 2;
export const LAST_LINE = 27;
export const PREMISE = 99;
export const TOTAL = cueEnd(LAST_LINE) + 40;

// ---------------- the place (same building as Parts 1-2; metres, y up, the elevator wall at +z) ----------------
export const CEIL = 2.9;
export const ROWS = [-0.9, -3.5, -6.1, -8.7, -11.3];
export const COLS = [-4.7, -2.75, 2.75, 4.7];
export const OFFICE = { x0: -7, x1: 7, z0: -12.6, z1: 2.4 };
export const WALL_Z = 2.4;
export const DOOR = { hw: 0.55, h: 2.15 };
export const CAB = { x0: -0.85, x1: 0.85, z0: 2.45, z1: 4.3, h: 2.35 };
export const LOBBY_Z = 1.45;
export const MY_DESK: V3 = [COLS[2], 0, ROWS[1]];
export const MY_CHAIR: V3 = [COLS[2], 0, ROWS[1] + 0.82];
export const MONITOR: V3 = [COLS[2], 1.04, ROWS[1] - 0.27];
export const CLOCK: V3 = [3.7, 2.12, WALL_Z - 0.03];
export const CALL_BTN: V3 = [-0.95, 1.12, WALL_Z - 0.02];
export const PANEL = { x: 0.7, z: CAB.z0 + 0.02, y0: 0.62, y1: 1.5, w: 0.2 };
export const PANEL_ROW_Y = (i: number) => PANEL.y1 - 0.06 - i * ((PANEL.y1 - PANEL.y0 - 0.1) / 11);
export const BTN_ROW = { G: 6, zero: 7, last: 10, bell: 11 };
export const DISPLAY_IN: V3 = [0, 2.2, CAB.z0 + 0.02];
export const DISPLAY_OUT: V3 = [0, 2.38, WALL_Z - 0.02];
export const CARD_AT: V3 = [0.32, 1.52, CAB.z1 - 0.02];
export const YOU_CAB: V3 = [0.12, 0, 3.12];
export const FIGURE: V3 = [-0.58, 0, 4.07];
export const FIGURE2: V3 = [-0.3, 0, 3.42];
export const YOU_OUT: V3 = [1.0, 0, 1.2];
export const STAIR = { x0: 1.6, x1: 2.5, h: 2.1 };
export const EYE = 1.44;
const SX = (STAIR.x0 + STAIR.x1) / 2;
// ---- Part 3 ----
/** -1 is flooded ankle-deep everywhere except a dry strip in front of the elevators */
export const WATER = { y: 0.085, z1: WALL_Z - 1.25 };
/** the stairs down on -1: a fire door in the far wall at the end of the aisle */
export const FAR_DOOR = { x: 0, z: OFFICE.z0 + 0.02, hw: 0.48, h: 2.1 };
export const SIGN_AT: V3 = [-1.75, 1.5, WALL_Z - 0.02];
export const HALE_AT: V3 = [0.3, WATER.y + 0.004, -4.0];
/** the extra person who is only in the reflection, standing between the desks */
export const GHOST_AT: V3 = [-0.95, 0, -4.4];
export const YOU_LAND: V3 = [SX - 0.05, 0, 2.95];          // the stairwell landing, just inside the door
export const YOU_IN: V3 = [0.08, 0, 2.74];                 // in the car, at the doors, facing its back
export const YOU_M1: V3 = [0.32, 0, 1.38];                 // -1: on the dry strip, at the water's edge
/** the one facing the wall, one step closer after each flicker (it ends right in front of you) */
export const FSTEPS: V3[] = [FIGURE2, [-0.17, 0, 3.3], [-0.05, 0, 3.17], [0.05, 0, 3.04]];

// ---- Part 4 (kept for the shared modules) ----
export const DX = 2.05;
export const YOU_M3: V3 = [1.25, 0, 1.25];
// ---- Part 5 ----
const M3 = YOU_M3;
/** -3, keep walking: down the aisle with it one step behind (on the screens), then run for the far door */
export const WALK_END: V3 = [0.85, 0, -6.2];
export const RUN_END: V3 = [0.3, 0, -11.9];
/** -7: the punch clock on the elevator wall, its sign above; you stand in front of it */
export const CLOCK7: V3 = [-1.75, 1.62, WALL_Z - 0.06];
export const SIGN7: V3 = [-1.75, 2.3, WALL_Z - 0.03];
export const ME7: V3 = [-1.45, 0, 1.3];
/** the two of you, side by side in front of the clock: ① on the left of frame (+x), ② on the right (-x) */
export const POS1: V3 = [-1.33, 0, 1.4], POS2: V3 = [-2.17, 0, 1.4];
/** the kept ones on -7: rows of people facing the side walls, fading into the dark */
export const KEPT: { x: number; z: number; o: number }[] = [];
for (let i = 0; i < 9; i++) for (const side of [-1, 1]) KEPT.push({ x: side * (6.05 - 0.25 * (i % 2)), z: 0.3 - i * 1.35, o: i * 2 + (side > 0 ? 1 : 0) });
// and down the gaps between the desk columns, nearer the aisle, so the wide shot sees them
for (let i = 0; i < 7; i++) for (const side of [-1, 1]) KEPT.push({ x: side * (3.72 + 0.1 * (i % 2)), z: -0.2 - i * 1.6, o: 5 + i * 3 + (side > 0 ? 2 : 0) });
// and a row along the elevator wall, either side of the clock
[-5.2, -4.3, -3.4, -0.15, 0.75, 3.3, 4.2, 5.1].forEach((x, i) => KEPT.push({ x, z: 2.02, o: 3 + i * 5 }));

// ---------------- shots ----------------
export type Light = "office" | "cab" | "zero" | "stair" | "flood" | "cctv";
export type ShotDef = { id: number; a: number; b: number; light: Light; hide?: ("front" | "back" | "left" | "right" | "ceil" | "cabCeil")[]; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B: [number, Light, ShotDef["hide"]?][] = [
  [0, "cctv"], //                     1 recap: Part 4's choice frame, from behind you
  [L(1), "cctv"], //                  2 you turn around: nothing there
  [L(2), "cctv"], //                  3 every screen: it's still behind you (the wall)
  [L(3), "cctv"], //                  4 you turn again; it breathes on your neck
  [L(4), "cctv"], //                  5 one by one the monitors go dark (the wall)
  [L(6), "cctv"], //                  6 rewind (plays shots 2..5 backwards)
  [L(7), "cctv"], //                  7 keep walking, watching the screens
  [L(8), "cctv"], //                  8 one step behind you (one monitor)
  [L(9), "cctv"], //                  9 the screens die ahead of you
  [L(10), "cctv"], //                10 you run
  [L(11), "stair"], //               11 down the stairs
  [L(12), "stair"], //               12 minus five (the door; then the photo wall, 2D)
  [L(14), "stair"], //               13 minus seven: the clock, the kept ones
  [L(15), "stair"], //               14 the sign
  [L(16), "stair"], //               15 the phone (2D)
  [L(19), "stair"], //               16 you never sent that: your face in the phone light
  [L(20), "stair"], //               17 the clock: 05:57, the light dies
  [L(22), "stair"], //               18 two of you; the shell game
  [L(24), "stair"], //               19 look closely
  [L(25), "stair"], //               20 one, or two: the tags
  [L(27), "stair"], //               21 the question
];
export const SHOTS: ShotDef[] = B.map(([a, light, hide], i) => ({ id: i + 1, a, b: i + 1 < B.length ? B[i + 1][0] : TOTAL, light, hide }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const T0 = (id: number) => SH[id].a;

// ---------------- the rewind: shot 6 plays shots 2..5 backwards ----------------
export const REWIND: [number, number] = [T0(6), T0(7)];
export const rewindSrc = (f: number) => {
  const u = clamp01((f - REWIND[0]) / (REWIND[1] - REWIND[0])), a = T0(2), b = SH[5].b - 1;
  return Math.round(b - (b - a) * (u * u * (3 - 2 * u)));
};
export const srcFrame = (f: number) => (f >= REWIND[0] && f < REWIND[1] ? rewindSrc(f) : f);

// ---------------- story events (frames) ----------------
// branch 1: turn around
export const TURN1: [number, number] = [cue(1, "turned") - 2, cue(1, "turned") + 8];
export const TURN2: [number, number] = [cue(3, "turn") - 2, cue(3, "turn") + 8];
export const BREATH = cue(3, "breathe") - 4;
/** the monitors die one by one (the wall), the last on "This": then black */
export const DIE0 = cue(4, "One"), DIE1 = cue(5) - 2;
export const BLACK_W: [number, number] = [cue(5) - 2, REWIND[0]];
// branch 2: keep walking
export const WALK: [number, number] = [T0(7) + 6, T0(9) + 30];
export const RUN: [number, number] = [cue(10, "run") - 4, T0(11) - 2];
/** the desk monitors die one by one ahead of you (k = 0 nearest the elevators) */
export const SCREENS_DIE = cue(9, "die") - 10;
/** one dead screen shows your reflection for half a second */
export const DEAD_REFL: [number, number] = [cue(9, "One") - 2, cue(9, "One") + 14];
export const JUMP = cue(9) - 2;
// the stairs, -5, -7
export const STAIR_RUN: [number, number] = [T0(11), T0(12)];
export const DOOR5: [number, number] = [T0(12), cue(13) - 2];
export const PHOTOS: [number, number] = [cue(13) - 2, T0(13)];
export const PHONE: [number, number] = [T0(15), T0(16)];
export const MSG_AT = cue(16, "message") - 2, THREAD_AT = cue(17) - 4, SENT_AT = cue(18, "reply") - 2;
export const LIGHT_DIES = cue(20, "dies") + 2;
export const LIGHT_BACK = cue(22, "comes") + 2;
/** the shell game: flickers (dark frames) with a swap in the first two; the last one spins ②'s badge (UOY) */
export const FLICKS: [number, number][] = [[cue(23, "remember") - 1, cue(23, "remember") + 4], [cue(23, "you", 1) + 4, cue(23, "you", 1) + 9], [cue(24) - 22, cue(24) - 17]];
export const SPIN: [number, number] = [FLICKS[2][1], FLICKS[2][1] + 8];
export const BLACKS: [number, number][] = [BLACK_W, [LIGHT_DIES, LIGHT_BACK], ...FLICKS];
/** after an even number of swaps, you are ① again (on the left) */
export const swapsAt = (f: number) => FLICKS.slice(0, 2).filter(([a, b]) => f >= (a + b) / 2).length;
export const TAGS_AT = cue(25) - 2;
export const TAG1_HOT: [number, number] = [cue(25) - 2, cue(26) - 2];
export const TAG2_HOT: [number, number] = [cue(26) - 2, cue(27) - 2];
export const CTA_AT = cue(27) - 2;
export const TAG_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "ONE", color: "#3b7cf0", at: [POS1[0], 1.5, POS1[2]], pill: [300, 560] },
  { n: 2, label: "TWO", color: "#e2453c", at: [POS2[0], 1.5, POS2[2]], pill: [780, 560] },
];
export const RECAP_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "TURN AROUND", color: "#3b7cf0", at: [M3[0], 1.45, M3[2]], pill: [540, 520] },
  { n: 2, label: "KEEP WALKING", color: "#e2453c", at: [FAR_DOOR.x, 1.0, FAR_DOOR.z], pill: [540, 640] },
];

// ---------------- the cold open ----------------
/** while the premise line plays: -7, red dark, the clock at 05:57, the two of you, badges turned */
export const TEASER = cueEnd(PREMISE) + 8;
export const TEASER_SRC = cue(24, "Look") + 6;
export const layersAt = (f: number): { id: number; alpha: number; f: number }[] => {
  if (f < TEASER) return [{ id: 19, alpha: 1, f: TEASER_SRC + Math.round(f * 0.4) }];
  const g = srcFrame(f); return [{ id: shotAt(g).id, alpha: 1, f: g }];
};
export const VOTES: { a: number; b: number } | null = null;
/** which branch is playing (the badge): 1 = TURN AROUND, 2 = KEEP WALKING */
export const branchAt = (f: number) => (f >= T0(2) && f < T0(6) ? 1 : f >= T0(7) && f < T0(11) ? 2 : 0);

// ---------------- state, as functions of the frame ----------------
export const floorAt = (f: number): number => (f >= T0(13) ? -7 : f >= T0(12) ? -5 : f >= T0(11) ? -4 : -3);
export const doorAt = (_f: number) => 0;
export const displayOutAt = (f: number): string => String(floorAt(f));
export const displayInAt = (f: number): string => String(floorAt(f));
export const flickerAt = (_f: number) => 1;
export const cabLightAt = (_f: number) => 1;
export const screensOnAt = (f: number) => (floorAt(f) === -3 ? 1 : 0);
/** which desk monitors are dead (k counts from the elevators, row-major), as the screens die ahead of you */
export const screenDead = (f: number, k: number) => f >= T0(9) && f >= SCREENS_DIE + k * 3;
/** the HUD clock (seconds to 06:00): Part 4's 03:12, then the dark eats time: 00:03:30 when the screens die */
export const hudLeftAt = (f: number) => {
  if (f >= JUMP && f >= T0(7)) return 210 - Math.floor((f - JUMP) / FPS);
  return 3 * 3600 + 12 * 60 + 2 - Math.floor(f / FPS);
};
export const hudFloorAt = (f: number) => String(floorAt(f));
export const messageAt = (f: number) => ({ lines: 4, left: hudLeftAt(f) });
export const stairOpenAt = (f: number) => (floorAt(f) === -3 ? 0.82 : 0);
export const shadowAt = (_f: number) => 0;
export const rowOnAt = (f: number, _k: number) => floorAt(f) === -3;
export const lobbyOnAt = (f: number) => floorAt(f) === -3;
export const figureAt = (_f: number): V3 | null => null;
export const figStageAt = (_f: number) => ({ scale: 1.0, ears: true, lanyard: true });
export const walkPos = (f: number): V3 => {
  const a = span(f, WALK[0], WALK[1]), b = clamp01((f - RUN[0]) / (RUN[1] - RUN[0]));
  return [M3[0] + (WALK_END[0] - M3[0]) * a + (RUN_END[0] - WALK_END[0]) * b, 0, M3[2] + (WALK_END[2] - M3[2]) * a + (RUN_END[2] - WALK_END[2]) * b];
};
/** running down the stairwell, fast */
export const stairRun = (f: number): V3 => {
  const u = clamp01((f - STAIR_RUN[0]) / (STAIR_RUN[1] - STAIR_RUN[0])), z = 2.75 + (5.4 - 2.75) * u;
  return [SX + 0.45, -Math.min(1.53, Math.max(0, 0.17 * Math.ceil((z - 3.3) / 0.27))), z];
};
/** the security feed: who is where, and what it does */
export const cctvAt = (f: number) => ({
  t: f / FPS, raise: 0, fig: true, left: hudLeftAt(f),
  turned: f >= T0(2) && f < T0(4) ? true : false,
  walk: f >= T0(7) && f < T0(9) ? clamp01((f - WALK[0]) / (WALK[1] - WALK[0])) : -1,
});

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
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const drift = (f: number, id: number) => clamp01((f - T0(id)) / Math.max(1, SH[id].b - T0(id)));
const SXs = (STAIR.x0 + STAIR.x1) / 2;
const mid = (a: V3, b: V3): V3 => lerp3(a, b, 0.5);

// 1 recap: Part 4's choice, from where it would stand
const S1 = (f: number): Shot => { const u = drift(f, 1); return { pos: [M3[0] + 0.28, 1.8, M3[2] + 1.0 - 0.1 * u], look: [FAR_DOOR.x + 0.3, 0.9, FAR_DOOR.z], fov: 54 }; };
// 2 you turn around: from ahead of you, so we see what's behind you (nothing)
const S2 = (f: number) => dolly([M3[0] - 0.55, 1.6, M3[2] - 2.5], [M3[0] + 0.1, 1.3, M3[2] + 0.6], pushK(f, T0(2), 0.002), { fov: 50 });
// 4 you turn back: close on your face and neck
const S4 = (f: number) => dolly([M3[0] - 0.15, 1.58, M3[2] - 1.05], [M3[0], 1.5, M3[2]], pushK(f, T0(4), 0.004), { fov: 40 });
// 7 keep walking: from behind you, high (where it would be), the monitors facing us as you pass them
const S7 = (f: number): Shot => { const p = walkPos(f); return { pos: [p[0] + 0.45, 1.95, p[2] + 1.5], look: [p[0] - 0.6, 1.05, p[2] - 3.0], fov: 54 }; };
// 9 the screens die: in front of you, backing up the aisle
const S9 = (f: number): Shot => { const p = walkPos(f); return { pos: [p[0] + 0.7, 1.5, p[2] + 1.9], look: [p[0] - 0.9, 1.05, p[2] - 4.0], fov: 56 }; };
// 10 you run: from the far door
const S10 = (f: number): Shot => { const p = walkPos(f); return { pos: [-0.8, 1.6, -12.15], look: [p[0], 1.1, p[2]], fov: 46 }; };
// 11 down the stairs: from the top, handheld
const S11 = (f: number): Shot => { const p = stairRun(f), j = Math.sin(f * 1.7) * 0.02; return { pos: [STAIR.x0 - 0.02, 1.75 + j, 2.6], look: [p[0] - 0.1, p[1] + 0.9, p[2] + 0.6], fov: 54, roll: Math.sin(f * 0.9) * 0.02 }; };
// 13 minus seven: from the middle of the room, back toward the clock on the elevator wall; the kept ones down both sides
const S13 = (f: number): Shot => { const u = drift(f, 13); return { pos: [-0.3 + 0.2 * u, 1.8, -6.6 + 0.9 * u], look: [CLOCK7[0] + 0.6, 1.3, WALL_Z], fov: 58 }; };
// 14 the sign above the clock
const S14 = (f: number) => dolly([SIGN7[0] + 0.05, SIGN7[1] - 0.15, SIGN7[2] - 1.7], [SIGN7[0], SIGN7[1] - 0.2, SIGN7[2]], pushK(f, T0(14), 0.004), { fov: 44 });
// 16 you never sent that: your face in the phone's light
const S16 = (f: number) => dolly([ME7[0] + 0.12, 1.38, ME7[2] - 1.35], [ME7[0] + 0.05, 1.22, ME7[2]], pushK(f, T0(16), 0.004), { fov: 44 });
// 17 the clock face: 05:57
const S17 = (f: number) => dolly([CLOCK7[0] + 0.02, CLOCK7[1], CLOCK7[2] - 0.75], CLOCK7, pushK(f, T0(17), 0.005), { fov: 36 });
// 18-21 the two of you
const TW = mid(POS1, POS2);
const S18 = (f: number) => dolly([TW[0] + 0.05, 1.45, TW[2] - 3.5], [TW[0], 1.3, TW[2]], pushK(f, T0(18), 0.0015), { fov: 48 });
const S19 = (f: number) => dolly([TW[0] + 0.03, 1.4, TW[2] - 3.2], [TW[0], 1.22, TW[2]], pushK(f, T0(19), 0.002), { fov: 54 });
const S21 = (f: number) => dolly([TW[0] + 0.02, 1.48, TW[2] - 2.9], [TW[0], 1.3, TW[2]], pushK(f, T0(21), 0.0025), { fov: 52 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: T0(2), s: S2 }], 3: [{ f: T0(3), s: S2 }], 4: [{ f: T0(4), s: S4 }], 5: [{ f: T0(5), s: S4 }], 6: [{ f: T0(6), s: S1 }],
  7: [{ f: T0(7), s: S7 }], 8: [{ f: T0(8), s: S7 }], 9: [{ f: T0(9), s: S9 }], 10: [{ f: T0(10), s: S10 }], 11: [{ f: T0(11), s: S11 }],
  12: [{ f: T0(12), s: S11 }], 13: [{ f: T0(13), s: S13 }], 14: [{ f: T0(14), s: S14 }], 15: [{ f: T0(15), s: S16 }], 16: [{ f: T0(16), s: S16 }],
  17: [{ f: T0(17), s: S17 }], 18: [{ f: T0(18), s: S18 }], 19: [{ f: T0(19), s: S19 }], 20: [{ f: T0(20), s: S19 }], 21: [{ f: T0(21), s: S21 }],
};
export const KICKS: [number, number][] = [[BREATH, 0.3], [JUMP, 0.25], [LIGHT_BACK, 0.3]];
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
export const DOF: Dof[] = [
  { f: 0, cInf: 4, focus: () => [M3[0], EYE, M3[2]] },
  { f: T0(2), cInf: 6, focus: () => [M3[0], EYE, M3[2]] },
  { f: T0(4), cInf: 12, focus: () => [M3[0], EYE, M3[2]] },
  { f: T0(6), cInf: 0 },
  { f: T0(7), cInf: 5, focus: (ff) => { const p = walkPos(ff); return [p[0], 1.3, p[2]]; } },
  { f: T0(9), cInf: 6, focus: (ff) => { const p = walkPos(ff); return [p[0], EYE, p[2]]; } },
  { f: T0(10), cInf: 3, focus: (ff) => { const p = walkPos(ff); return [p[0], 1.2, p[2]]; } },
  { f: T0(11), cInf: 4, focus: (ff) => { const p = stairRun(ff); return [p[0], p[1] + 1.0, p[2]]; } },
  { f: T0(13), cInf: 4, focus: () => [CLOCK7[0], 1.2, WALL_Z - 0.5] },
  { f: T0(14), cInf: 12, focus: () => SIGN7 },
  { f: T0(16), cInf: 12, focus: () => [ME7[0], EYE, ME7[2]] },
  { f: T0(17), cInf: 12, focus: () => CLOCK7 },
  { f: T0(18), cInf: 8, focus: () => [TW[0], EYE, TW[2]] },
  { f: T0(19), cInf: 9, focus: () => [TW[0], EYE, TW[2]] },
  { f: T0(21), cInf: 10, focus: () => [TW[0], EYE, TW[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  const focus = k < 1 && p.focus && d.focus ? ((ff: number) => lerp3(p.focus!(ff), d.focus!(ff), glide(k))) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { lerp3, add };
// names the shared modules still import (inert in Part 5)
export const PANEL_DARK = Number.MAX_SAFE_INTEGER;
export const LIGHTS_OUT = BLACKS[0][0], LIGHTS_ON = BLACKS[0][1];
export const MSG = [0, 0, 0, 0];
export const RULE2: [number, number] = [-1, -1];
export const STEEL: [number, number] = [-1, -1];
export const TORCH: [number, number] = [-1, -1];
export const LAMP_FLICK = -100, LAMP_DIE = Number.MAX_SAFE_INTEGER;
export const ARRIVE = 0;
export const torchOn = (_f: number) => false;
export const climbPos = (_f: number): V3 => [0, 0, 0];
