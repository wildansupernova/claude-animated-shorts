// Timeline of "Floor Zero, Part 4: Never Turn Around". Every cut, camera key, story event and acting beat is looked up
// from the narration's word timings (words.json, Kokoro af_heart), so a re-voiced line moves its pictures with it.
// Voice line ids: 99 = the cold-open premise line (spoken first), 0-28 = SCRIPT.md lines.
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
export const LAST_LINE = 28;
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

// ---- Part 4 ----
const YM = YOU_M1;
/** wading: your two steps into the water (your reflection stays at the first one) */
export const WADE1: V3 = [YM[0], 0, 0.95], WADE2: V3 = [YM[0] - 0.04, 0, 0.1];
/** climbing: desk tops along the right-hand desk column, then the platform at the far door */
export const DX = 2.05;
const DY = 0.76;
export const DESKS: V3[] = [[DX, DY, -0.6], [DX, DY, -3.35], [DX, DY, -5.95], [DX, DY, -8.55], [DX, DY, -11.15]];
export const DOOR_PAD: V3 = [0.35, 0.1, -12.2];
export const BADGE_AT: V3 = [DX - 0.32, WATER.y + 0.004, -3.1];
/** -3: you come in by the near stairwell door and stand at the head of the aisle */
export const YOU_M3: V3 = [1.25, 0, 1.25];

// ---------------- shots ----------------
export type Light = "office" | "cab" | "zero" | "stair" | "flood" | "cctv";
export type ShotDef = { id: number; a: number; b: number; light: Light; hide?: ("front" | "back" | "left" | "right" | "ceil" | "cabCeil")[]; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B: [number, Light, ShotDef["hide"]?][] = [
  [0, "flood"], //                    1 recap: at the water's edge, both tags
  [L(1), "flood"], //                 2 wading: two steps, and your reflection stays behind
  [L(3), "flood"], //                 3 it stays where it is, looking up at you
  [L(4), "flood"], //                 4 it reaches up, and pulls
  [L(6), "flood"], //                 5 rewind (plays shots 2..4 backwards)
  [L(7), "flood"], //                 6 desk to desk
  [L(8), "flood"], //                 7 the badge slips into the water
  [L(10), "flood"], //                8 the rule says step, not reach
  [L(11), "flood"], //                9 you reach in; your reflection grabs your wrist
  [L(13), "flood"], //               10 you tear free (the wrist insert)
  [L(15), "flood"], //               11 the far door; the last light dies
  [L(16), "stair"], //               12 minus two is bricked up
  [L(17), "cctv"], //                13 minus three: your office again
  [L(18), "cctv"], //                14 every monitor
  [L(19), "cctv"], //                15 a security camera (insert)
  [L(20), "cctv"], //                16 live: you lift a hand
  [L(21), "cctv"], //                17 the sign
  [L(22), "cctv"], //                18 on every screen, it's right behind you
  [L(25), "cctv"], //                19 two choices: the tags
  [L(28), "cctv"], //                20 the question
];
export const SHOTS: ShotDef[] = B.map(([a, light, hide], i) => ({ id: i + 1, a, b: i + 1 < B.length ? B[i + 1][0] : TOTAL, light, hide }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const T0 = (id: number) => SH[id].a;

// ---------------- the rewind: shot 5 plays shots 2..4 backwards ----------------
export const REWIND: [number, number] = [T0(5), T0(6)];
export const rewindSrc = (f: number) => {
  const u = clamp01((f - REWIND[0]) / (REWIND[1] - REWIND[0])), a = T0(2), b = SH[4].b - 1;
  return Math.round(b - (b - a) * (u * u * (3 - 2 * u)));
};
export const srcFrame = (f: number) => (f >= REWIND[0] && f < REWIND[1] ? rewindSrc(f) : f);

// ---------------- cold open ----------------
/** while the premise line plays: a wall of monitors, every one showing you, and it right behind you */
export const TEASER = cueEnd(PREMISE) + 8;
export const TEASER_SRC = cue(22, "behind") + 4;
export const layersAt = (f: number): { id: number; alpha: number; f: number }[] => {
  if (f < TEASER) return [{ id: 18, alpha: 1, f: TEASER_SRC + Math.round(f * 0.5) }];
  const g = srcFrame(f); return [{ id: shotAt(g).id, alpha: 1, f: g }];
};
export const VOTES: { a: number; b: number } | null = null;
/** which branch is playing (the badge): 1 = WADE, 2 = CLIMB */
export const branchAt = (f: number) => (f >= T0(2) && f < T0(5) ? 1 : f >= T0(6) && f < T0(19) ? 2 : 0);

// ---------------- story events (frames) ----------------
// branch 1: wade
export const STEP1: [number, number] = [cue(1, "waded") - 4, cue(1, "waded") + 10];
export const STEP2: [number, number] = [cue(2, "another") - 2, cue(2, "step") + 10];
export const PULL = cue(4, "pulls") - 3;
export const END_W = cueEnd(5) + 6;
// branch 2: climb
/** you walk along the dry strip to the desks, then hop: onto the first desk, then the next */
export const CLIMB_START: V3 = [DX - 0.05, 0, 1.3];
export const HOPS: [number, number][] = [[T0(6) + 2, T0(6) + 24], [T0(6) + 26, T0(6) + 40], [cue(7, "desk", 1) - 2, cue(7, "desk", 1) + 14]];
export const BADGE_DROP = cue(8, "slips") - 2;
export const KNEEL = cue(10, "step") - 6;
export const REACH = cue(11, "reach") - 2;
export const GRAB = cue(12, "grabs") - 3;
export const TEAR = cue(13, "tear") - 2;
export const WRIST: [number, number] = [cue(14, "grey") - 6, cueEnd(14) + 4];
/** your phone light while you climb (the rows are all dark; only the lobby row behind you is lit) */
export const torchOn = (f: number) => f >= T0(6) && f < T0(12);
const H15 = [cue(15, "row") - 6, cue(15, "goes") - 4, cue(15, "just") - 6, cue(15, "reach") - 4];
export const HOPS2: [number, number][] = H15.map((a) => [a, a + 12]);
export const LOBBY_OFF = cue(15, "stairs") - 2;
export const BLACKS: [number, number][] = [[END_W, REWIND[0]], [LOBBY_OFF + 4, LOBBY_OFF + 14]];
// the stairwell: you go down past the bricked-up -2 landing
export const STAIR_WALK: [number, number] = [T0(12) + 2, T0(13) - 2];
export const stairWalk = (f: number): V3 => {
  const u = clamp01((f - STAIR_WALK[0]) / (STAIR_WALK[1] - STAIR_WALK[0])), z = 2.75 + (5.3 - 2.75) * u;
  return [SX + 0.45 - 0.05 * u, -Math.min(1.53, Math.max(0, 0.17 * Math.ceil((z - 3.3) / 0.27))), z];
};
// -3
export const FLOOR3_FROM = T0(13);
export const RAISE: [number, number] = [cue(20) - 4, cue(21) + 4];
export const FIG_ON = cue(22, "every") - 2;
/** the wall of monitors (2D): "and every one shows the same thing", "live", and "on every screen" (plus the cold open) */
export const WALLS: [number, number][] = [[cue(18, "And") - 2, T0(15)], [T0(16), T0(17)], [T0(18), cue(23) - 2]];
/** the push-in on one screen (lines 23-24), then a cut to your own sweater and badge on "Like yours" */
export const YOURS = cue(24, "Like") - 2;
export const CCTV_PUSH: [number, number] = [cue(23) - 2, YOURS];
export const TAGS_AT = cue(25, "two") - 2;
export const TAG1_HOT: [number, number] = [cue(26) - 2, cue(27) - 4];
export const TAG2_HOT: [number, number] = [cue(27) - 2, cue(28) - 2];
export const CTA_AT = cue(28) - 2;
export const TAG_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "TURN AROUND", color: "#3b7cf0", at: [YOU_M3[0], 1.45, YOU_M3[2]], pill: [540, 520] },
  { n: 2, label: "KEEP WALKING", color: "#e2453c", at: [FAR_DOOR.x, 1.0, FAR_DOOR.z], pill: [540, 640] },
];
export const RECAP_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "WADE", color: "#3b7cf0", at: [0.5, WATER.y, -2.0], pill: [270, 560] },
  { n: 2, label: "CLIMB", color: "#e2453c", at: [COLS[2] - 0.7, 0.76, ROWS[0] - 0.15], pill: [810, 560] },
];

// ---------------- state, as functions of the frame ----------------
export const floorAt = (f: number) => (f >= FLOOR3_FROM ? -3 : f >= T0(12) ? -2 : -1);
export const doorAt = (_f: number) => 0;
export const displayOutAt = (f: number): string => String(floorAt(f));
export const displayInAt = (f: number): string => String(floorAt(f));
export const flickerAt = (_f: number) => 1;
export const cabLightAt = (_f: number) => 1;
export const screensOnAt = (f: number) => (floorAt(f) === -3 ? 1 : 0);
/** the HUD clock (seconds to 06:00): real time, plus a jump when the last light on -1 dies */
const T_START = 4 * 3600 + 46 * 60 + 41;
export const hudLeftAt = (f: number) => {
  if (f >= T0(6) && f >= LOBBY_OFF + 4) return 3 * 3600 + 12 * 60 + 30 - Math.floor((f - LOBBY_OFF - 4) / FPS);
  return T_START - Math.floor(f / FPS);
};
export const hudFloorAt = (f: number) => (floorAt(f) === -3 ? "-3" : floorAt(f) === -2 ? "-2" : "-1");
export const messageAt = (f: number) => ({ lines: 4, left: hudLeftAt(f) });
export const stairOpenAt = (f: number) => (floorAt(f) === -3 ? 0.82 : 0);
export const shadowAt = (_f: number) => 0;
/** on -1 every ceiling row is already dark (Part 3); on -3 they're all on */
export const rowOnAt = (f: number, _k: number) => floorAt(f) === -3;
/** "while the dark comes closer": the lobby row behind you stutters and comes back weaker */
export const lobbyKAt = (f: number) => {
  const d = cue(7, "dark") - 3;
  if (f < d || f >= T0(2) && f < T0(6)) return 1;
  const n = f - d; if (n < 12) return [0.2, 0.9, 0.1, 0.05, 0.7, 0.15, 0.6, 0.3, 0.55, 0.5, 0.5, 0.5][n];
  return 0.5;
};
export const lobbyOnAt = (f: number) => floorAt(f) === -3 || f < LOBBY_OFF || (f >= T0(2) && f < T0(6));
export const figureAt = (_f: number): V3 | null => null;
export const figStageAt = (_f: number) => ({ scale: 1.0, ears: true, lanyard: true });
/** your position while wading */
export const wadePos = (f: number): V3 => {
  const a = span(f, STEP1[0], STEP1[1]), b = span(f, STEP2[0], STEP2[1]);
  return [YM[0] + (WADE1[0] - YM[0]) * a + (WADE2[0] - WADE1[0]) * b, 0, YM[2] + (WADE1[2] - YM[2]) * a + (WADE2[2] - WADE1[2]) * b];
};
/** your position while climbing (hops are arcs) */
const hopPath = (f: number, pts: V3[], hops: [number, number][]): V3 => {
  let p = pts[0];
  for (let i = 0; i < hops.length && i + 1 < pts.length; i++) {
    const [a, b] = hops[i];
    if (f < a) break;
    const u = clamp01((f - a) / (b - a)), q = pts[i + 1];
    const arc = p[1] > 0.3 || q[1] > 0.3 ? Math.sin(Math.PI * u) * 0.35 : 0;
    p = [p[0] + (q[0] - p[0]) * smooth(u), p[1] + (q[1] - p[1]) * u + arc * (u < 1 ? 1 : 0), p[2] + (q[2] - p[2]) * smooth(u)];
    if (u < 1) return p;
    p = q;
  }
  return p;
};
export const climbPos = (f: number): V3 => {
  if (f < HOPS2[0][0]) return hopPath(f, [YM, CLIMB_START, DESKS[0], DESKS[1]], HOPS);
  return hopPath(f, [DESKS[1], DESKS[2], DESKS[3], DESKS[4], DOOR_PAD], HOPS2);
};
/** the CCTV picture on every monitor (and in the inserts) */
export const cctvAt = (f: number) => ({ t: f / FPS, raise: f >= RAISE[0] && f < RAISE[1] ? Math.min(1, (f - RAISE[0]) / 6, (RAISE[1] - f) / 8) : 0, fig: f >= FIG_ON, left: hudLeftAt(f) });

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
const SXs = (STAIR.x0 + STAIR.x1) / 2, M3 = YOU_M3;

// 1 recap: Part 3's choice frame, over your shoulder at the water's edge
const S1 = (f: number): Shot => { const u = drift(f, 1); return { pos: [YM[0] + 0.65 - 0.1 * u, 2.15, YM[2] + 0.98], look: [1.1, -0.6, -3.2], fov: 56 }; };
// 2 wading: low beside you, the water between us
const S2a = (f: number): Shot => { const p = wadePos(f); return { pos: [p[0] + 2.7, 1.0, p[2] - 0.2], look: [p[0] - 0.1, 1.15, p[2] + 0.1], fov: 56 }; };
// 2b "and your reflection doesn't": high and to the side, down at the water between where you are and where it stayed
const S2b = (f: number): Shot => { const u = clamp01((f - STEP2[0]) / 40); return { pos: [WADE1[0] + 1.9, 2.35 - 0.1 * u, (WADE1[2] + WADE2[2]) / 2 - 0.25], look: [WADE1[0] - 0.1, -0.55, (WADE1[2] + WADE2[2]) / 2 + 0.05], fov: 54 }; };
// 3 it stays where it is, looking up at you: down into the water at the first step
const S3 = (f: number) => dolly([WADE1[0], 1.25, WADE1[2] - 0.0], [WADE1[0], WATER.y, WADE1[2] - 0.13], pushK(f, T0(3), 0.004), { fov: 40 });
// 4 the pull: wide and low; you drop out of frame
const S4 = (f: number) => dolly([WADE2[0] + 1.0, 1.3, WADE2[2] - 2.8], [WADE2[0], 0.95, WADE2[2]], pushK(f, T0(4), 0.003), { fov: 50 });
// 6 desk to desk: tracking from the aisle as you hop
const S6 = (f: number): Shot => { const p = climbPos(f), k = 1 - 0.22 * drift(f, 6); return { pos: [p[0] - 2.9 * k, 2.05 - 0.2 * (1 - k), p[2] + 1.3 * k], look: [p[0] - 0.2, p[1] + 0.9, p[2] - 0.6], fov: 52 }; };
// 7 the badge drops: close at the desk edge, down to the water
const S7 = (f: number) => dolly([DX - 0.85, 1.25, -2.45], [BADGE_AT[0], 0.2, BADGE_AT[2]], pushK(f, T0(7), 0.004), { fov: 44 });
// 8 the rule says step: low from the water, up at you on the desk edge
const S8 = (f: number) => dolly([DX - 1.25, 0.32, -2.35], [DX, 1.35, DESKS[1][2]], pushK(f, T0(8), 0.003), { fov: 46 });
// 9 you reach in: straight down onto the water at the badge
const S9 = (f: number) => dolly([BADGE_AT[0] + 0.04, 1.35, BADGE_AT[2] + 0.12], [BADGE_AT[0], WATER.y, BADGE_AT[2]], pushK(f, T0(9), 0.004), { fov: 40 });
// 10 you tear free: back on the desk (the wrist insert plays over it)
const S10 = (f: number) => dolly([DX - 2.3, 1.75, -1.6], [DX, 1.55, DESKS[1][2]], pushK(f, T0(10), 0.003), { fov: 48 });
// 11 the far door: from beside the door, back up the room as you hop the last desks
const S11 = (f: number): Shot => { const p = climbPos(f); return { pos: [p[0] - 1.6, 1.85, Math.max(-12.25, p[2] - 3.0)], look: [p[0] - 0.1, p[1] + 1.0, p[2]], fov: 50 }; };
// 12 minus two: the red stairwell, the bricked door, you going down past it
const S12 = (f: number) => dolly([STAIR.x0 - 0.02, 1.7, 2.6], [SXs + 0.15, 0.62, 5.68], pushK(f, T0(12), 0.004), { fov: 50 });
// 13 minus three: your office again (green, every screen on), from your shoulder
const S13 = (f: number): Shot => { const u = drift(f, 13); return { pos: [M3[0] + 0.55, 1.9, M3[2] + 0.95 - 0.2 * u], look: [0.0, 0.8, -8.5], fov: 54 }; };
// 14 every monitor: a slow truck along a row of screens
const S14 = (f: number): Shot => { const u = drift(f, 14); return { pos: [-1.35 - 0.25 * u, 1.2, 0.35 - 0.5 * u], look: [-3.3, 1.0, -7.5], fov: 44 }; };
// 16 live: you, front, the screens behind you
const S16 = (f: number) => dolly([M3[0] - 0.35, 1.72, M3[2] + 0.7], [COLS[2], 1.04, ROWS[0] - 0.28], pushK(f, T0(16), 0.002), { fov: 32 });
// 17 the sign
const S17 = (f: number) => dolly([SIGN_AT[0] + 0.1, SIGN_AT[1] - 0.1, SIGN_AT[2] - 1.9], [SIGN_AT[0], SIGN_AT[1] - 0.24, SIGN_AT[2]], pushK(f, T0(17), 0.004), { fov: 44 });
// 18 on every screen: a wall of monitors (the cold open), then the CCTV push-in insert
const S18 = (f: number): Shot => { const u = drift(f, 18); return { pos: [-2.2 + 0.4 * u, 1.3, ROWS[1] + 1.6], look: [-3.4, 1.0, ROWS[1] - 0.5], fov: 46 - 6 * u }; };
// 18c "like yours": your own sweater, red lanyard and badge, in colour
const S18c = (f: number) => dolly([M3[0] + 0.05, 1.0, M3[2] - 0.66], [M3[0], 0.9, M3[2]], pushK(f, YOURS, 0.004), { fov: 40 });
// 19 the choice: in front of you (the empty office behind you), tags
const S19 = (f: number): Shot => { const u = drift(f, 19); return { pos: [M3[0] + 0.28, 1.8, M3[2] + 1.05 - 0.12 * u], look: [FAR_DOOR.x + 0.3, 0.9, FAR_DOOR.z], fov: 54 }; };
// 20 the question: your face
const S20 = (f: number) => dolly([M3[0] + 0.06, 1.5, M3[2] - 1.15], [M3[0], 1.58, M3[2]], pushK(f, T0(20), 0.004), { fov: 36 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: T0(2), s: S2a }, { f: STEP2[0] - 4, cut: true, s: S2b }], 3: [{ f: T0(3), s: S3 }], 4: [{ f: T0(4), s: S4 }], 5: [{ f: T0(5), s: S1 }],
  6: [{ f: T0(6), s: S6 }], 7: [{ f: T0(7), s: S7 }], 8: [{ f: T0(8), s: S8 }], 9: [{ f: T0(9), s: S9 }], 10: [{ f: T0(10), s: S10 }],
  11: [{ f: T0(11), s: S11 }], 12: [{ f: T0(12), s: S12 }], 13: [{ f: T0(13), s: S13 }], 14: [{ f: T0(14), s: S14 }], 15: [{ f: T0(15), s: S14 }],
  16: [{ f: T0(16), s: S16 }], 17: [{ f: T0(17), s: S17 }], 18: [{ f: T0(18), s: S18 }, { f: YOURS, cut: true, s: S18c }], 19: [{ f: T0(19), s: S19 }], 20: [{ f: T0(20), s: S20 }],
};
export const KICKS: [number, number][] = [[PULL, 0.4], [GRAB, 0.35], [LOBBY_OFF, 0.25], [FIG_ON, 0.3]];
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
  { f: 0, cInf: 5, focus: () => [0, 0.5, -2.5] },
  { f: T0(2), cInf: 6, focus: (ff) => { const p = wadePos(ff); return [p[0], 0.5, p[2]]; } },
  { f: T0(3), cInf: 3, focus: () => [WADE1[0], WATER.y, WADE1[2] - 0.12] },
  { f: T0(4), cInf: 6, focus: () => [WADE2[0], 0.6, WADE2[2]] },
  { f: T0(5), cInf: 0 },
  { f: T0(6), cInf: 5, focus: (ff) => { const p = climbPos(ff); return [p[0], p[1] + 0.9, p[2]]; } },
  { f: T0(7), cInf: 8, focus: () => BADGE_AT },
  { f: T0(8), cInf: 9, focus: () => [DX, 1.3, DESKS[1][2]] },
  { f: T0(9), cInf: 3, focus: () => BADGE_AT },
  { f: T0(10), cInf: 8, focus: () => [DX, 1.2, DESKS[1][2]] },
  { f: T0(11), cInf: 4, focus: (ff) => { const p = climbPos(ff); return [p[0], p[1] + 0.9, p[2]]; } },
  { f: T0(12), cInf: 6, focus: () => [SXs, -1.0, 5.6] },
  { f: T0(13), cInf: 4, focus: () => [0, 1.0, -4] },
  { f: T0(14), cInf: 8, focus: () => [-2.5, 1.0, ROWS[0] - 0.4] },
  { f: T0(16), cInf: 11, focus: () => [M3[0], EYE, M3[2]] },
  { f: T0(17), cInf: 12, focus: () => SIGN_AT },
  { f: T0(18), cInf: 6, focus: () => [-3.4, 1.0, ROWS[1] - 0.4] },
  { f: YOURS, cInf: 10, focus: () => [M3[0], 1.1, M3[2]] },
  { f: T0(19), cInf: 4, focus: () => [M3[0], EYE, M3[2]] },
  { f: T0(20), cInf: 13, focus: () => [M3[0], EYE, M3[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  const focus = k < 1 && p.focus && d.focus ? ((ff: number) => lerp3(p.focus!(ff), d.focus!(ff), glide(k))) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { lerp3, add };
// names the shared modules still import (inert in Part 4)
export const PANEL_DARK = Number.MAX_SAFE_INTEGER;
export const LIGHTS_OUT = BLACKS[0][0], LIGHTS_ON = BLACKS[0][1];
export const MSG = [0, 0, 0, 0];
export const RULE2: [number, number] = [-1, -1];
export const STEEL: [number, number] = [-1, -1];
export const TORCH: [number, number] = [-1, -1];
export const LAMP_FLICK = -100, LAMP_DIE = Number.MAX_SAFE_INTEGER;
export const ARRIVE = 0;
