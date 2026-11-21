// Timeline of "Floor Zero, Part 3: Don't Step in the Water". Every cut, camera key, story event and acting beat is looked
// up from the narration's word timings (words.json, Kokoro af_heart), so a re-voiced line moves its pictures with it.
// Voice line ids: 99 = the cold-open premise line (spoken first), 0-30 = SCRIPT.md lines.
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
export const LAST_LINE = 30;
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
export const GHOST_AT: V3 = [1.4, 0, -4.6];
export const YOU_LAND: V3 = [SX - 0.05, 0, 2.95];          // the stairwell landing, just inside the door
export const YOU_IN: V3 = [0.08, 0, 2.74];                 // in the car, at the doors, facing its back
export const YOU_M1: V3 = [0.32, 0, 1.38];                 // -1: on the dry strip, at the water's edge
/** the one facing the wall, one step closer after each flicker (it ends right in front of you) */
export const FSTEPS: V3[] = [FIGURE2, [-0.17, 0, 3.3], [-0.05, 0, 3.17], [0.05, 0, 3.04]];

// ---------------- shots ----------------
export type Light = "office" | "cab" | "zero" | "stair" | "flood";
export type ShotDef = { id: number; a: number; b: number; light: Light; hide?: ("front" | "back" | "left" | "right" | "ceil" | "cabCeil")[]; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B: [number, Light, ShotDef["hide"]?][] = [
  [0, "zero"], //                     1 recap: you between the stairwell and the car, both tags
  [L(1), "stair"], //                 2 the stairs: high angle down; the footsteps keep coming up
  [L(2), "stair"], //                 3 they stop: low on the steps, looking up at you
  [L(3), "stair"], //                 4 your phone light: over the shoulder, down to an empty landing
  [L(5), "stair"], //                 5 the red lamp flickers
  [L(6), "stair"], //                 6 a hand on your shoulder; this is the end
  [L(8), "zero"], //                  7 rewind (plays shots 2..6 backwards)
  [L(9), "zero"], //                  8 you step into the car with it
  [L(10), "cab", ["front"]], //       9 the doors close
  [L(11), "cab", ["front"]], //      10 three flickers, a step closer each time
  [L(17), "cab", ["front"]], //      11 your height, ears, a red lanyard
  [L(18), "cab"], //                 12 ding: minus one
  [cue(18, "doors") - LEAD, "flood"], // 13 the doors open on -1; you back out; they close on it
  [L(19), "flood"], //               14 your office again, flooded
  [L(21), "flood"], //               15 the sign
  [L(22), "flood"], //               16 the stairs down are on the far side
  [L(23), "flood"], //               17 the lights die, one row at a time, toward you
  [L(26), "flood"], //               18 the only one standing in the light (the cold open)
  [L(27), "flood"], //               19 two choices: the tags
  [L(30), "flood"], //               20 the question
];
export const SHOTS: ShotDef[] = B.map(([a, light, hide], i) => ({ id: i + 1, a, b: i + 1 < B.length ? B[i + 1][0] : TOTAL, light, hide }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
const T0 = (id: number) => SH[id].a;

// ---------------- the rewind: shot 7 plays shots 2..6 backwards, accelerating ----------------
export const REWIND: [number, number] = [T0(7), T0(8)];
export const rewindSrc = (f: number) => {
  const u = clamp01((f - REWIND[0]) / (REWIND[1] - REWIND[0])), a = T0(2), b = SH[6].b - 1;
  return Math.round(b - (b - a) * (u * u * (3 - 2 * u)));
};
export const srcFrame = (f: number) => (f >= REWIND[0] && f < REWIND[1] ? rewindSrc(f) : f);

// ---------------- cold open ----------------
/** while the premise line plays: you look down at the water, scared; your reflection looks back up, smiling */
export const TEASER = cueEnd(PREMISE) + 8;
export const TEASER_SRC = cue(26, "standing") - 2;
export const layersAt = (f: number): { id: number; alpha: number; f: number }[] => {
  if (f < TEASER) return [{ id: 18, alpha: 1, f: TEASER_SRC + Math.round(f * 0.6) }];
  const g = srcFrame(f); return [{ id: shotAt(g).id, alpha: 1, f: g }];
};
export const VOTES: { a: number; b: number } | null = null;
/** which branch is playing (the badge): 1 = STAIRS, 2 = ELEVATOR */
export const branchAt = (f: number) => (f >= T0(2) && f < T0(7) ? 1 : f >= T0(8) && f < T0(19) ? 2 : 0);

// ---------------- story events (frames) ----------------
// branch 1: the stairs
export const FOOT_STOP = cue(2, "stop") - 1;
export const TORCH: [number, number] = [cue(3, "point") - 2, SH[4].b + 6];
export const LAMP_FLICK = cue(5, "flickers") - 2;
export const HAND = cue(6, "hand") - 4;
export const LAMP_DIE = cueEnd(7) + 6;
/** full-black frames (the overlay in FloorZero3): the lamp's first gasp, and after the end */
export const BLACKS: [number, number][] = [[LAMP_FLICK + 7, LAMP_FLICK + 13], [LAMP_DIE, REWIND[0]]];
// branch 2: the elevator
export const WALK_IN: [number, number] = [T0(8) + 4, cue(9, "inside") + 12];
export const CLOSE_C = cue(10, "close") - 3;
export const FLICKS = [cue(11, "flickers") - 3, cue(13) - 3, cue(15) - 3];
const FDARK = 6;
export const ARRIVE = cue(18, "Ding") - 3;
export const OPEN_M1 = cue(18, "open") - 4;
export const BACK_OUT: [number, number] = [cue(18, "back") - 8, cue(18, "out") + 22];
export const CLOSE_M1 = cue(18, "out") + 18;
export const FLOOD_FROM = CLOSE_C + 34;
export const STEEL: [number, number] = [cueEnd(16) + 2, cueEnd(16) + 30];
/** the far rows die first, one row at a time, toward you */
export const ROW_OFF = [cue(25, "toward") + 6, cue(25, "Coming") + 2, cue(24, "time"), cue(24, "One"), cue(23, "switching")];
export const TAGS_AT = cue(27, "two") - 2;
export const TAG1_HOT: [number, number] = [cue(28) - 2, cue(29) - 4];
export const TAG2_HOT: [number, number] = [cue(29) - 2, cue(30) - 2];
export const CTA_AT = cue(30) - 2;
export const TAG_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "WADE", color: "#3b7cf0", at: [0.5, WATER.y, -2.0], pill: [270, 560] },
  { n: 2, label: "CLIMB", color: "#e2453c", at: [COLS[2] - 0.7, 0.76, ROWS[0] - 0.15], pill: [810, 560] },
];
export const RECAP_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "STAIRS", color: "#3b7cf0", at: [SX, 1.75, WALL_Z], pill: [270, 560] },
  { n: 2, label: "ELEVATOR", color: "#e2453c", at: [0, 1.75, WALL_Z], pill: [810, 560] },
];

// ---------------- state, as functions of the frame ----------------
/** which floor the office is on (the car rides down while its doors are shut) */
export const floorAt = (f: number) => (f >= FLOOD_FROM && f >= T0(8) ? -1 : 0);
export const doorAt = (f: number) => {
  if (f < CLOSE_C) return 1;
  if (f < OPEN_M1) return 1 - smooth((f - CLOSE_C) / 30);
  if (f < CLOSE_M1) return smooth((f - OPEN_M1) / 30);
  return 1 - smooth((f - CLOSE_M1) / 36);
};
export const displayOutAt = (f: number): string => (floorAt(f) === -1 ? "-1" : "0");
export const displayInAt = (f: number): string => (f >= ARRIVE && f >= T0(8) ? "-1" : "0");
export const flickerAt = (f: number) => {
  for (const f0 of FLICKS) if (f >= f0 && f < f0 + FDARK) return 0.03;
  for (const f0 of FLICKS) if (f >= f0 - 5 && f < f0) return ((f * 7) % 3) === 0 ? 0.35 : 0.9;
  return 1;
};
export const cabLightAt = (f: number) => (f >= T0(8) ? flickerAt(f) : 1);
export const screensOnAt = (f: number) => (floorAt(f) === 0 ? 1 : 0);
/** the HUD clock (seconds to 06:00): it runs in real time, and jumps forward after every blackout (the dark eats time) */
const T_START = 5 * 3600 + 59 * 60 + 41;
const JUMPS: [number, number][] = [[FLICKS[0] + FDARK, 5 * 3600 + 20 * 60 + 12], [FLICKS[1] + FDARK, 5 * 3600 + 2 * 60 + 40], [FLICKS[2] + FDARK, 4 * 3600 + 47 * 60 + 31]];
export const hudLeftAt = (f: number) => {
  let base = T_START, f0 = 0;
  if (f >= T0(8)) for (const [jf, v] of JUMPS) if (f >= jf) { base = v; f0 = jf; }
  return base - Math.floor((f - f0) / FPS);
};
export const hudFloorAt = (f: number) => (f >= ARRIVE && f >= T0(8) ? "-1" : "0");
export const messageAt = (f: number) => ({ lines: 4, left: hudLeftAt(f) });
export const stairOpenAt = (f: number) => {
  if (floorAt(f) === -1) return 0;
  if (f >= T0(2) && f < T0(7)) return 0.82 * (1 - smooth((f - T0(2) - 4) / 26));
  return 0.82;
};
export const shadowAt = (_f: number) => 0;
/** ceiling row k (0 = nearest the elevators): on? */
export const rowOnAt = (f: number, k: number) => (floorAt(f) === -1 ? f < ROW_OFF[k] : true);
/** the one facing the wall: where, and how much like you it has become */
export const figureAt = (f: number): V3 | null => {
  if (f < T0(8)) return FIGURE2;
  let i = 0; for (const f0 of FLICKS) if (f >= f0 + 2) i++;
  return FSTEPS[i];
};
export const figStageAt = (f: number) => {
  let i = 0; if (f >= T0(8)) for (const f0 of FLICKS) if (f >= f0 + 2) i++;
  return { scale: [1.3, 1.2, 1.1, 1.0][i], ears: i >= 3, lanyard: i >= 3 };
};
/** your walk into the car (branch 2) */
export const walkInPos = (f: number): V3 => {
  const u = smooth((f - WALK_IN[0]) / (WALK_IN[1] - WALK_IN[0]));
  return [YOU_OUT[0] + (YOU_IN[0] - YOU_OUT[0]) * u, 0, YOU_OUT[2] + (YOU_IN[2] - YOU_OUT[2]) * u];
};
/** backing out of the car on -1, never taking your eyes off it */
export const backOutPos = (f: number): V3 => {
  const u = smooth((f - BACK_OUT[0]) / (BACK_OUT[1] - BACK_OUT[0]));
  return [YOU_IN[0] + (YOU_M1[0] - YOU_IN[0]) * u, 0, YOU_IN[2] + (YOU_M1[2] - YOU_IN[2]) * u];
};

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
const YL = YOU_LAND, YM = YOU_M1, F5 = FSTEPS[3];

// 1 recap: Part 2's last wide (you between the stairwell and the car), a slow drift in
const S1 = (f: number): Shot => { const u = clamp01(f / Math.max(1, SH[1].b)); return { pos: [1.3 - 0.35 * u, 1.66, -3.3 + 0.35 * u], look: [1.0, 1.2, 2.4], fov: 44 }; };
// 2 the stairs: high above the landing, down the flight (the footsteps keep coming up)
const S2 = (f: number) => dolly([SX + 0.12, 2.55, 2.44], [SX - 0.08, -0.7, 4.7], pushK(f, T0(2), 0.0025), { fov: 60, roll: -0.03 });
// 3 they stop: low on the steps, up at your face
const S3 = (f: number) => dolly([SX + 0.12, -0.25, 3.95], [YL[0], 1.32, YL[2]], pushK(f, T0(3), 0.004), { fov: 44 });
// 4 the phone light: over your shoulder, down to the empty landing
const S4 = (f: number) => dolly([SX + 0.3, 1.62, 2.62], [SX - 0.05, -1.3, 5.25], pushK(f, T0(4), 0.003), { fov: 46 });
// 5 the red lamp
const S5 = (f: number) => dolly([SX - 0.1, 1.55, 4.3], [SX + 0.2, 2.1, 5.68], pushK(f, T0(5), 0.006), { fov: 44 });
// 6 your face; a grey hand settles on your shoulder from behind
const S6 = (f: number) => dolly([YL[0] - 0.1, 1.36, YL[2] + 1.6], [YL[0], 1.2, YL[2]], pushK(f, T0(6), 0.0035), { fov: 40 });
// 8 you step into the car: follow from behind (office side)
const S8 = (f: number): Shot => { const p = walkInPos(f); return { pos: [p[0] + 0.5, 1.78, p[2] - 2.7], look: [p[0] - 0.05, 1.2, p[2] + 1.0], fov: 46 }; };
// 9 inside: the doors close behind you; you, and its back beyond
const S9 = (f: number) => dolly([-0.58, 1.72, 1.85], [0.1, 1.35, 3.5], pushK(f, T0(9), 0.0015), { fov: 58 });
// 10 the flickers: locked off behind your shoulder so every step reads; it ends right in front of you
const S10 = (f: number) => dolly([-0.55, 1.72, 1.9], [0.08, 1.35, 3.45], pushK(f, T0(10), 0.0012) * pushK(f, cue(16) - 4, 0, 0.01, 30), { fov: 58 });
// 11 your height, ears, a red lanyard: close behind its head, tilt down to the strap
const S11 = (f: number): Shot => { const u = span(f, cue(17, "ears") - 6, cue(17, "lanyard") + 4); return { pos: [F5[0] + 0.1, 1.58 - 0.18 * u, F5[2] - 1.65], look: [F5[0], 1.42 - 0.25 * u, F5[2]], fov: 44 }; };
// 12 ding: up at the car display reading -1
const S12 = (f: number) => dolly([0.6, 1.2, 2.95], [DISPLAY_IN[0], DISPLAY_IN[1], DISPLAY_IN[2]], pushK(f, T0(12), 0.004), { fov: 40 });
// 13 -1, outside: low across the water as the doors open; you back out toward us; they close on it
const S13 = (f: number) => dolly([0.95, 0.55, -0.55], [0.15, 1.2, 2.4], pushK(f, T0(13), 0.002), { fov: 46 });
// 14 your office again, flooded: low across the mirror surface
const S14 = (f: number) => dolly([-0.6, 0.32, 0.95], [0.6, 0.55, -9.5], pushK(f, T0(14), 0.0015), { fov: 54 });
// 15 the sign
const S15 = (f: number) => dolly([SIGN_AT[0] + 0.1, SIGN_AT[1] - 0.02, SIGN_AT[2] - 1.9], [SIGN_AT[0], SIGN_AT[1] - 0.05, SIGN_AT[2]], pushK(f, T0(15), 0.004), { fov: 38 });
// 16 the stairs down are on the far side: a long lens push down the aisle to the far door
/** a 1 s top-down insert on the floating badge (D. HALE) before the push */
export const HALE_INS: [number, number] = [T0(16), cue(22, "are") - 2];
const S16b = (f: number) => dolly([HALE_AT[0] + 0.02, HALE_AT[1] + 0.95, HALE_AT[2] + 0.1], HALE_AT, pushK(f, HALE_INS[0], 0.004), { fov: 40 });
const S16 = (f: number): Shot => { const u = span(f, HALE_INS[1], SH[16].b); return { pos: [0.55, 1.55, 0.95], look: [0, 1.05, FAR_DOOR.z], fov: 40 - 18 * u }; };
// 17 the rows die toward you: behind you, wide down the office
const S17 = (f: number): Shot => { const u = clamp01((f - T0(17)) / (SH[17].b - T0(17))); return { pos: [YM[0] + 0.18 - 0.05 * u, 2.15, YM[2] + 0.98 - 0.12 * u], look: [YM[0] - 0.15, -0.9, -7.0], fov: 56 }; };
// 18 the only one standing in the light: low over the water, you look down; your reflection looks back up
const S18 = (f: number) => dolly([YM[0] + 0.12, 1.05, YM[2] - 1.45], [YM[0], 1.42, YM[2]], pushK(f, T0(18), 0.003), { fov: 42 });
// 18b the water: looking down past your feet into the black water, where your reflection looks back up, smiling
const R18 = cue(26, "standing") - 4;
const S18b = (f: number) => dolly([YM[0] + 0.06, 1.0, YM[2] - 1.15], [YM[0], -1.45, YM[2] + 0.05], pushK(f, R18, 0.0035), { fov: 46 });
// 19 the choice: over your shoulder, the water and the desks
const S19 = (f: number): Shot => { const u = clamp01((f - T0(19)) / (SH[19].b - T0(19))); return { pos: [YM[0] + 0.65 - 0.1 * u, 2.15, YM[2] + 0.98], look: [1.1, -0.6, -3.2], fov: 56 }; };
// 20 the question: your face, low in frame under the tags
const S20 = (f: number) => dolly([YM[0] + 0.06, 1.5, YM[2] - 1.15], [YM[0], 1.58, YM[2]], pushK(f, T0(20), 0.004), { fov: 36 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: T0(2), s: S2 }], 3: [{ f: T0(3), s: S3 }], 4: [{ f: T0(4), s: S4 }], 5: [{ f: T0(5), s: S5 }], 6: [{ f: T0(6), s: S6 }],
  7: [{ f: T0(7), s: S1 }],
  8: [{ f: T0(8), s: S8 }], 9: [{ f: T0(9), s: S9 }], 10: [{ f: T0(10), s: S10 }], 11: [{ f: T0(11), s: S11 }], 12: [{ f: T0(12), s: S12 }],
  13: [{ f: T0(13), s: S13 }], 14: [{ f: T0(14), s: S14 }], 15: [{ f: T0(15), s: S15 }], 16: [{ f: T0(16), s: S16b }, { f: HALE_INS[1], cut: true, s: S16 }], 17: [{ f: T0(17), s: S17 }],
  18: [{ f: T0(18), s: S18 }, { f: R18, cut: true, s: S18b }], 19: [{ f: T0(19), s: S19 }], 20: [{ f: T0(20), s: S20 }],
};
export const KICKS: [number, number][] = [[FLICKS[0], 0.2], [FLICKS[1], 0.2], [FLICKS[2], 0.28], [HAND, 0.35]];
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
  { f: 0, cInf: 0 },
  { f: T0(2), cInf: 6, focus: () => [SX, -0.6, 4.4] },
  { f: T0(3), cInf: 12, focus: () => [YL[0], EYE, YL[2]] },
  { f: T0(4), cInf: 8, focus: () => [SX, -1.4, 5.3] },
  { f: T0(5), cInf: 12, focus: () => [SX + 0.2, 2.25, 5.68] },
  { f: T0(6), cInf: 13, focus: () => [YL[0], EYE, YL[2]] },
  { f: T0(7), cInf: 0 },
  { f: T0(8), cInf: 5, focus: (ff) => { const p = walkInPos(ff); return [p[0], 1.4, p[2]]; } },
  { f: T0(9), cInf: 8, focus: () => [FIGURE2[0], 1.5, FIGURE2[2]] },
  { f: T0(10), cInf: 9, focus: (ff) => { const p = figureAt(ff) ?? F5; return [p[0], 1.4, p[2]]; } },
  { f: T0(11), cInf: 13, focus: () => [F5[0], 1.45, F5[2]] },
  { f: T0(12), cInf: 10, focus: () => DISPLAY_IN },
  { f: T0(13), cInf: 6, focus: () => [0.15, 1.2, 2.2] },
  { f: T0(14), cInf: 3, focus: () => [0, 0.6, -4] },
  { f: T0(15), cInf: 12, focus: () => SIGN_AT },
  { f: T0(16), cInf: 3, focus: () => HALE_AT },
  { f: HALE_INS[1], cInf: 4, focus: () => [0, 1.0, FAR_DOOR.z] },
  { f: T0(17), cInf: 4, focus: () => [0, 1.0, -5] },
  { f: T0(18), cInf: 12, focus: () => [YM[0], EYE, YM[2]] },
  { f: cue(26, "standing") - 4, cInf: 2, focus: () => [YM[0], -1.4, YM[2]] },
  { f: T0(19), cInf: 5, focus: () => [0, 0.5, -2.5] },
  { f: T0(20), cInf: 13, focus: () => [YM[0], EYE, YM[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  const focus = k < 1 && p.focus && d.focus ? ((ff: number) => lerp3(p.focus!(ff), d.focus!(ff), glide(k))) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { lerp3, add };
// Part 2 names the shared modules still import (inert in Part 3)
export const PANEL_DARK = Number.MAX_SAFE_INTEGER;
export const LIGHTS_OUT = BLACKS[0][0], LIGHTS_ON = BLACKS[0][1];
export const MSG = [0, 0, 0, 0];
export const RULE2: [number, number] = [-1, -1];
