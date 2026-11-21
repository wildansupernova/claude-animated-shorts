// Timeline of "Floor Zero, Part 6: Only One Clocks Out" (the season finale). Every cut, camera key, story event and acting beat is looked up
// from the narration's word timings (words.json, Kokoro af_heart), so a re-voiced line moves its pictures with it.
// Voice line ids: 99 = the cold-open premise line (spoken first), 0-29 = SCRIPT.md lines.
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
export const LAST_LINE = 29;
export const PREMISE = 99;
export const TOTAL = cueEnd(LAST_LINE) + 36;

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
// ---- Part 5 / 6: -7 ----
/** the punch clock on the elevator wall; above it, the rules card (unscratched); the -7 sign moved to the side */
export const CLOCK7: V3 = [-1.75, 1.62, WALL_Z - 0.06];
export const CARD7: V3 = [-1.75, 2.28, WALL_Z - 0.03];
export const SIGN7: V3 = [-3.1, 2.1, WALL_Z - 0.03];
export const ME7: V3 = [-1.45, 0, 1.3];
/** the two of you, as Part 5 left you: ① you on the left of frame (+x), ② the copy on the right (-x) */
export const POS1: V3 = [-1.33, 0, 1.4], POS2: V3 = [-2.17, 0, 1.4];
/** ① wins: you back up to the clock without blinking */
export const AT_CLOCK: V3 = [-1.62, 0, 2.02];
export const KEPT: { x: number; z: number; o: number }[] = [];
for (let i = 0; i < 9; i++) for (const side of [-1, 1]) KEPT.push({ x: side * (6.05 - 0.25 * (i % 2)), z: 0.3 - i * 1.35, o: i * 2 + (side > 0 ? 1 : 0) });
for (let i = 0; i < 7; i++) for (const side of [-1, 1]) KEPT.push({ x: side * (3.72 + 0.1 * (i % 2)), z: -0.2 - i * 1.6, o: 5 + i * 3 + (side > 0 ? 2 : 0) });
[-5.2, -4.3, -0.15, 0.75, 3.3, 4.2, 5.1].forEach((x, i) => KEPT.push({ x, z: 2.02, o: 3 + i * 5 }));
// ---- the epilogue: next Friday, Part 1's office ----
export const NEXT_DESK: V3 = [-2.75, 0, -3.5];
export const NEXT_CAB: V3 = YOU_CAB;

// ---------------- shots ----------------
export type Light = "office" | "cab" | "zero" | "stair" | "flood" | "cctv";
export type ShotDef = { id: number; a: number; b: number; light: Light; hide?: ("front" | "back" | "left" | "right" | "ceil" | "cabCeil")[]; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B: [number, Light, ShotDef["hide"]?][] = [
  [0, "stair"], //                    1 recap: the two of you, ① ②
  [L(1), "stair"], //                 2 ② picked: you watch ① (② at the edge of frame, then gone)
  [L(3), "stair"], //                 3 05:59: it swipes its badge (2D slot)
  [L(4), "stair"], //                 4 G, morning: it walks out (2D gold)
  [L(5), "stair"], //                 5 it types: On my way (2D phone)
  [L(6), "stair"], //                 6 -7: one turns to face the wall
  [L(7), "stair"], //                 7 you were one; it goes grey
  [L(9), "stair"], //                 8 rewind (plays shots 2..7 backwards)
  [L(10), "stair"], //                9 ① picked: you watch ②
  [L(11), "stair"], //               10 its badge: UOY
  [L(12), "stair"], //               11 its hair (and a flash of yours)
  [L(13), "stair"], //               12 it learned you from reflections (2D flashbacks over its face)
  [L(14), "stair"], //               13 it got everything right: your smile
  [L(16), "stair"], //               14 you back up to the clock
  [L(17), "stair"], //               15 05:59:59: you swipe your badge (2D slot)
  [L(18), "stair"], //               16 06:00: it turns to face the wall, and goes grey
  [L(20), "stair"], //               17 above the clock, the card
  [L(21), "stair"], //               18 rules two and three (2D card)
  [L(23), "stair"], //               19 G, morning; your phone (2D)
  [L(24), "office"], //              20 next Friday: someone else leaves the office; the rows die
  [L(26), "cab"], //                 21 the display: 1, G, 0
  [L(27), "cab"], //                 22 the jolt
  [cue(28, "come") - LEAD, "cab"], // 23 the corner
];
export const SHOTS: ShotDef[] = B.map(([a, light, hide], i) => ({ id: i + 1, a, b: i + 1 < B.length ? B[i + 1][0] : TOTAL, light, hide }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const T0 = (id: number) => SH[id].a;

// ---------------- the rewind: shot 8 plays shots 2..7 backwards ----------------
export const REWIND: [number, number] = [T0(8), T0(9)];
export const rewindSrc = (f: number) => {
  const u = clamp01((f - REWIND[0]) / (REWIND[1] - REWIND[0])), a = T0(2), b = SH[7].b - 1;
  return Math.round(b - (b - a) * (u * u * (3 - 2 * u)));
};
export const srcFrame = (f: number) => (f >= REWIND[0] && f < REWIND[1] ? rewindSrc(f) : f);

// ---------------- story events (frames) ----------------
// ② picked (loses): you watch ①; nobody watches ②
export const GONE2 = cue(2, "watching") - 4;
export const SLOT_A: [number, number] = [T0(3), T0(4)];
export const GOLD_A: [number, number] = [T0(4), T0(5)];
export const PHONE_A: [number, number] = [T0(5), T0(6)];
export const TURN_A: [number, number] = [cue(6, "turns") - 2, cue(6, "wall") + 4];
export const GREY_A: [number, number] = [cue(7, "spent") - 4, cue(8) - 4];
export const BLACK_A: [number, number] = [cueEnd(8) + 4, REWIND[0]];
// ① picked (wins): you watch ②
export const SMILE = cue(14) - 4;
export const HAIR_FLASH: [number, number] = [cue(12, "hair") + 6, cue(12, "hair") + 22];
export const FLASHES: [number, number, string][] = [[cue(13, "steel") - 2, cue(13, "steel") + 14, "steel"], [cue(13, "water") - 2, cue(13, "water") + 12, "water"], [cue(13, "screens") - 2, cue(13, "screens") + 16, "screens"]];
export const BACKUP: [number, number] = [cue(16, "you") - 2, cue(16, "clock") + 10];
export const SLOT_B: [number, number] = [T0(15), T0(16)];
export const TURN_B: [number, number] = [cue(18, "turns") - 2, cue(18, "wall") + 4];
export const GREY_B: [number, number] = [cue(19, "slowly") - 2, cue(19, "grey") + 14];
export const CARD_2D: [number, number] = [T0(18), T0(19)];
export const RULE3_AT = cue(22) - 2;
export const GOLD_B: [number, number] = [T0(19), cue(23, "One") - 2];
export const PHONE_B: [number, number] = [cue(23, "One") - 2, T0(20)];
// the epilogue
export const NEXT_WALK: [number, number] = [T0(20) + 8, T0(21) - 2];
export const ROWS_DIE = [cue(25, "One") - 6, cue(25, "row") - 4, cue(25, "at") - 2, cue(25, "time"), cue(25, "time") + 8];
export const DISPLAY_G = cue(26, "ground") - 2, DISPLAY_0 = cue(26, "floor") + 6;
export const JOLT = cue(27, "jolt") - 2;
export const BLACK_E: [number, number] = [cue(27, "out") + 2, cue(28, "come") - 2];
export const STEEL_E: [number, number] = [cue(28, "Facing") - 2, cue(28, "Facing") + 32];
export const TITLE_AT = cue(29) + 4;
export const BLACKS: [number, number][] = [BLACK_A, BLACK_E];
export const TAG_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [];
export const RECAP_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "ONE", color: "#3b7cf0", at: [POS1[0], 1.5, POS1[2]], pill: [300, 560] },
  { n: 2, label: "TWO", color: "#e2453c", at: [POS2[0], 1.5, POS2[2]], pill: [780, 560] },
];
export const TAGS_AT = Number.MAX_SAFE_INTEGER;
export const TAG1_HOT: [number, number] = [-1, -1];
export const TAG2_HOT: [number, number] = [-1, -1];
export const CTA_AT = Number.MAX_SAFE_INTEGER;

// ---------------- the cold open ----------------
/** while the premise line plays: G, gold morning through the lobby glass, one of you walking out (2D, in the overlay) */
export const TEASER = cueEnd(PREMISE) + 6;
export const layersAt = (f: number): { id: number; alpha: number; f: number }[] => {
  if (f < TEASER) return [{ id: 1, alpha: 1, f: TEASER }];
  const g = srcFrame(f); return [{ id: shotAt(g).id, alpha: 1, f: g }];
};
export const VOTES: { a: number; b: number } | null = null;
/** which branch is playing (the badge): 2 = TWO (it loses), 1 = ONE */
export const branchAt = (f: number) => (f >= T0(2) && f < T0(8) ? 2 : f >= T0(9) && f < T0(20) ? 1 : 0);

// ---------------- state, as functions of the frame ----------------
/** 99 = the real office (Part 1's floor), 100 = in the car */
export const floorAt = (f: number): number => (f >= T0(21) ? 100 : f >= T0(20) ? 99 : -7);
export const doorAt = (_f: number) => 0;
export const displayInAt = (f: number): string => (f >= DISPLAY_0 ? "0" : f >= DISPLAY_G ? "G" : "1");
export const displayOutAt = (_f: number): string => "-7";
export const flickerAt = (_f: number) => 1;
export const cabLightAt = (f: number) => (f >= JOLT && f < JOLT + 10 ? (f % 3 ? 0.3 : 1) : 1);
export const screensOnAt = (_f: number) => 0;
export const screenDead = (_f: number, _k: number) => false;
/** the HUD clock (seconds to 06:00) */
export const hudLeftAt = (f: number) => {
  if (f >= T0(20)) return 0;
  if (f >= T0(9)) {
    if (f >= cue(18)) return 0;
    if (f >= cue(17)) return 1;
    return Math.max(2, 151 - Math.floor((f - T0(9)) / FPS));
  }
  if (f >= cue(3) && f < T0(8)) return f >= T0(4) ? 0 : 59 - Math.floor((f - cue(3)) / FPS);
  return 151 - Math.floor(f / FPS);
};
export const hudFloorAt = (f: number) => ((f >= T0(4) && f < T0(6)) || (f >= T0(19) && f < T0(20)) ? "G" : "-7");
export const messageAt = (f: number) => ({ lines: 4, left: hudLeftAt(f) });
export const stairOpenAt = (_f: number) => 0;
export const shadowAt = (_f: number) => 0;
/** the epilogue: the rows die behind the last one leaving (k = 0 nearest the elevators, so the far rows go first) */
export const rowOnAt = (f: number, k: number) => floorAt(f) === 99 ? f < ROWS_DIE[ROWS.length - 1 - k] : false;
export const lobbyOnAt = (f: number) => floorAt(f) === 99;
export const figureAt = (f: number): V3 | null => (floorAt(f) === 100 && f >= BLACK_E[1] ? FIGURE : null);
export const figStageAt = (_f: number) => ({ scale: 1.0, ears: true, lanyard: true });
/** grey: how far the blue has drained from ① (branch ②) and from ② (branch ①) */
export const grey1At = (f: number) => (f >= T0(2) && f < T0(8) ? span(f, GREY_A[0], GREY_A[1]) : 0);
export const grey2At = (f: number) => (f >= T0(9) ? span(f, GREY_B[0], GREY_B[1]) : 0);
export const youBackPos = (f: number): V3 => { const u = span(f, BACKUP[0], BACKUP[1]); return [POS1[0] + (AT_CLOCK[0] - POS1[0]) * u, 0, POS1[2] + (AT_CLOCK[2] - POS1[2]) * u]; };
export const nextWalkPos = (f: number): V3 => { const u = span(f, NEXT_WALK[0], NEXT_WALK[1]); return [NEXT_DESK[0] * (1 - u) + 0.3 * u, 0, (NEXT_DESK[2] + 0.9) * (1 - u) + 0.55 * u]; };
export const cctvAt = (f: number) => ({ t: f / FPS, raise: 0, fig: true, left: hudLeftAt(f), turned: false, walk: -1 });

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
const TW = lerp3(POS1, POS2, 0.5), YC = YOU_CAB, FG = FIGURE;

// 1 recap: Part 5's last frame
const S1 = (f: number) => dolly([TW[0] + 0.02, 1.48, TW[2] - 2.9], [TW[0], 1.3, TW[2]], pushK(f, 0, 0.0015), { fov: 52 });
// 2 you watch ①: close on its face; ② just at the edge of frame, out of focus
const S2 = (f: number) => dolly([POS1[0] - 0.08, 1.5, POS1[2] - 1.45], [POS1[0] - 0.04, 1.45, POS1[2]], pushK(f, T0(2), 0.002), { fov: 46 });
// 6 / 7 -7: ① alone turns to the wall; the grey (from a little further back)
const S6 = (f: number) => dolly([POS1[0] - 0.1, 1.45, POS1[2] - 2.0], [POS1[0], 1.25, POS1[2]], pushK(f, T0(6), 0.002), { fov: 46 });
// 9 you watch ②
const S9 = (f: number) => dolly([POS2[0] + 0.08, 1.5, POS2[2] - 1.45], [POS2[0] + 0.04, 1.45, POS2[2]], pushK(f, T0(9), 0.002), { fov: 46 });
// 10 its badge
const S10 = (f: number) => dolly([POS2[0] + 0.02, 1.02, POS2[2] - 0.52], [POS2[0], 0.98, POS2[2]], pushK(f, T0(10), 0.004), { fov: 38 });
// 11 its hair (the strand), close
const S11 = (f: number) => dolly([POS2[0] + 0.04, 1.72, POS2[2] - 0.72], [POS2[0], 1.6, POS2[2]], pushK(f, T0(11), 0.004), { fov: 40 });
// 12-13 its face (the flashbacks cut over it), then your smile on it; a slow tip
const S12 = (f: number): Shot => ({ ...dolly([POS2[0] + 0.05, 1.55, POS2[2] - 1.35], [POS2[0], 1.52, POS2[2]], pushK(f, T0(12), 0.0025), { fov: 42 }), roll: 0.05 * span(f, T0(13), SH[13].b) });
// 14 you back up to the clock, eyes on it: wide
const S14 = (f: number) => dolly([TW[0] + 0.1, 1.55, TW[2] - 3.2], [TW[0] + 0.05, 1.25, TW[2] + 0.3], pushK(f, T0(14), 0.0015), { fov: 54 });
// 16 06:00: it turns to face the wall, and goes grey
const S16 = (f: number) => dolly([POS2[0] + 0.15, 1.45, POS2[2] - 2.0], [POS2[0] + 0.05, 1.25, POS2[2]], pushK(f, T0(16), 0.002), { fov: 48 });
// 17 above the clock, the card
const S17 = (f: number) => dolly([CARD7[0] + 0.05, CARD7[1] - 0.2, CARD7[2] - 1.8], [CARD7[0], CARD7[1] - 0.15, CARD7[2]], pushK(f, T0(17), 0.005), { fov: 44 });
// 20 next Friday: the lens leads the last one leaving down the aisle; the rows die behind them
const S20 = (f: number): Shot => { const p = nextWalkPos(f), u = clamp01((f - T0(20)) / (SH[20].b - T0(20))); return { pos: [1.5 - 0.3 * u, 1.85, 2.2], look: [p[0] * 0.6 - 0.9, 1.05, p[2] * 0.5 - 4.5], fov: 50 }; };
// 21 the display: 1, G, 0
const S21 = (f: number) => dolly([0.08, 2.02, 3.35], DISPLAY_IN, pushK(f, T0(21), 0.003), { fov: 30 });
// 22 the jolt: a wide of the car from the right
const S22 = (f: number) => dolly([0.68, 1.78, 2.56], [-0.35, 1.05, 4.05], pushK(f, T0(22), 0.002), { fov: 56 });
// 23 the corner: low, close behind the one facing the wall
const S23 = (f: number): Shot => ({ ...dolly([FG[0] + 0.42, 0.42, 2.62], [FG[0] - 0.02, 1.75, FG[2] + 0.1], pushK(f, T0(23), 0.0009)), fov: 58, roll: -0.06 * span(f, T0(23), T0(23) + 90) });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: T0(2), s: S2 }], 3: [{ f: T0(3), s: S2 }], 4: [{ f: T0(4), s: S2 }], 5: [{ f: T0(5), s: S2 }],
  6: [{ f: T0(6), s: S6 }], 7: [{ f: T0(7), s: S6 }], 8: [{ f: T0(8), s: S1 }], 9: [{ f: T0(9), s: S9 }], 10: [{ f: T0(10), s: S10 }],
  11: [{ f: T0(11), s: S11 }], 12: [{ f: T0(12), s: S12 }], 13: [{ f: T0(13), s: S12 }], 14: [{ f: T0(14), s: S14 }], 15: [{ f: T0(15), s: S14 }],
  16: [{ f: T0(16), s: S16 }], 17: [{ f: T0(17), s: S17 }], 18: [{ f: T0(18), s: S17 }], 19: [{ f: T0(19), s: S17 }],
  20: [{ f: T0(20), s: S20 }], 21: [{ f: T0(21), s: S21 }], 22: [{ f: T0(22), s: S22 }], 23: [{ f: T0(23), s: S23 }],
};
export const KICKS: [number, number][] = [[JOLT, 0.6], [JOLT + 3, 0.4]];
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
  { f: 0, cInf: 8, focus: () => [TW[0], EYE, TW[2]] },
  { f: T0(2), cInf: 12, focus: () => [POS1[0], EYE, POS1[2]] },
  { f: T0(6), cInf: 9, focus: () => [POS1[0], EYE, POS1[2]] },
  { f: T0(8), cInf: 0 },
  { f: T0(9), cInf: 12, focus: () => [POS2[0], EYE, POS2[2]] },
  { f: T0(10), cInf: 13, focus: () => [POS2[0], 0.98, POS2[2]] },
  { f: T0(11), cInf: 13, focus: () => [POS2[0], 1.65, POS2[2]] },
  { f: T0(12), cInf: 12, focus: () => [POS2[0], 1.55, POS2[2]] },
  { f: T0(14), cInf: 6, focus: () => [POS2[0], EYE, POS2[2]] },
  { f: T0(16), cInf: 9, focus: () => [POS2[0], EYE, POS2[2]] },
  { f: T0(17), cInf: 12, focus: () => CARD7 },
  { f: T0(20), cInf: 5, focus: (ff) => { const p = nextWalkPos(ff); return [p[0], 1.3, p[2]]; } },
  { f: T0(21), cInf: 10, focus: () => DISPLAY_IN },
  { f: T0(22), cInf: 6, focus: () => [YC[0], 1.2, YC[2]] },
  { f: T0(23), cInf: 8, focus: () => [FG[0], 1.5, FG[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  const focus = k < 1 && p.focus && d.focus ? ((ff: number) => lerp3(p.focus!(ff), d.focus!(ff), glide(k))) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { lerp3, add };
// names the shared modules still import (inert in Part 6)
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
export const LIGHT_BACK = -100;
export const ME7_: V3 = ME7;
