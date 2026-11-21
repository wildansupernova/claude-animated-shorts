// Timeline of "Floor Zero, Part 2": every cut, camera key, story event and acting beat is looked up from the narration's
// word timings (words.json: Kokoro af_heart, duration-predictor times, checked against Whisper: median offset -0.006 s),
// so a re-voiced line moves its pictures with it. Camera grammar from the camera-moves skill: a different motivated move
// per beat (crane, push, follow, truck, tilt, pedestal, POV, snap zoom, shake, rack focus, low-angle truck, lens zoom,
// dolly zoom, pull-out), smootherstep glides of 18-40 f, every hold creeps, 7-frame flip kicks on impacts.
import WORDS from "./words.json";

export const FPS = 30;
export const D0 = 0; // floor height (build.ts helpers read it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;
/** 0..1 between frames a and b (smoothstep) */
export const span = (f: number, a: number, b: number) => smooth((f - a) / Math.max(1, b - a));

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
export const LAST_LINE = 31;
export const TOTAL = cueEnd(LAST_LINE) + 40; // the question, then ~1.3 s of picture (no outro)

// ---------------- the place (metres; y up, the elevator wall at +z) ----------------
export const CEIL = 2.9;                       // office ceiling
export const ROWS = [-0.9, -3.5, -6.1, -8.7, -11.3]; // desk rows (z); light rows above them
export const COLS = [-4.7, -2.75, 2.75, 4.7];  // desk columns (x); the aisle runs down x = 0
export const OFFICE = { x0: -7, x1: 7, z0: -12.6, z1: 2.4 };
export const WALL_Z = 2.4;                     // elevator wall (office side)
export const DOOR = { hw: 0.55, h: 2.15 };     // our elevator's opening, centred on x = 0
export const CAB = { x0: -0.85, x1: 0.85, z0: 2.45, z1: 4.3, h: 2.35 };
export const LOBBY_Z = 1.45;                   // the lobby light row
/** your desk: column 2, row 1; the monitor faces the elevator (+z), the chair sits on the +z side */
export const MY_DESK: V3 = [COLS[2], 0, ROWS[1]];
export const MY_CHAIR: V3 = [COLS[2], 0, ROWS[1] + 0.82];
export const MONITOR: V3 = [COLS[2], 1.04, ROWS[1] - 0.27];
export const CLOCK: V3 = [3.7, 2.12, WALL_Z - 0.03];
export const CALL_BTN: V3 = [-0.95, 1.12, WALL_Z - 0.02];
/** the car panel on the inner front wall, right of the doors (seen from inside) */
export const PANEL = { x: 0.7, z: CAB.z0 + 0.02, y0: 0.62, y1: 1.5, w: 0.2 };
/** button rows on the car panel (row 0 at the top) */
export const PANEL_ROW_Y = (i: number) => PANEL.y1 - 0.06 - i * ((PANEL.y1 - PANEL.y0 - 0.1) / 11);
export const BTN_ROW = { G: 6, zero: 7, last: 10, bell: 11 };
export const DISPLAY_IN: V3 = [0, 2.2, CAB.z0 + 0.02];
export const DISPLAY_OUT: V3 = [0, 2.38, WALL_Z - 0.02];
export const CARD_AT: V3 = [0.32, 1.52, CAB.z1 - 0.02];
/** you stand here inside the car, facing the doors; the one facing the wall stands in the back-left corner */
export const YOU_CAB: V3 = [0.12, 0, 3.12];
export const FIGURE: V3 = [-0.58, 0, 4.07];
/** Part 2: when the car comes back the one facing the wall is a step closer to the doors */
export const FIGURE2: V3 = [-0.3, 0, 3.42];
/** Part 2: where you stand after stepping out (between the elevator and the stairwell door) */
export const YOU_OUT: V3 = [1.0, 0, 1.2];
/** the stairwell door on the elevator wall (hinge on its +x edge), opening into the office */
export const STAIR = { x0: 1.6, x1: 2.5, h: 2.1 };
export const EYE = 1.44;

// ---------------- shots ----------------
export type Light = "office" | "cab" | "zero";
/** hide: wild walls for this shot (the camera stands where a wall would be) */
export type ShotDef = { id: number; a: number; b: number; light: Light; hide?: ("front" | "back" | "left" | "right" | "ceil" | "cabCeil")[]; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B: [number, Light, ShotDef["hide"]?][] = [
  [0, "zero"], //                      1 recap: Part 1's last frame, both tags
  [L(1), "zero"], //                   2 STAY IN: the doors shut on the two of you
  [L(2), "cab", ["front"]], //         3 "The card said, don't step out": your face
  [L(3), "cab"], //                    4 the panel goes dark, tilt up to the humming light
  [L(4), "cab"], //                    5 the one facing the wall speaks (low angle)
  [L(7), "cab"], //                    6 the lights go out
  [L(8), "cab"], //                    7 lights on: they're gone
  [L(9), "cab", ["front"]], //         8 you're the one facing the wall
  [L(10), "zero"], //                  9 this is the end: the closed doors
  [L(11), "zero"], //                 10 rewind (frames mapped back through shots 2..9)
  [L(12), "zero"], //                 11 STEP OUT: you walk out, the doors close behind you
  [L(13), "zero"], //                 12 the elevator drops: the display races down
  [L(15), "zero"], //                 13 relief
  [L(16), "zero"], //                 14 every computer turns on
  [L(18), "zero"], //                 15 the message on the screens
  [L(22), "zero"], //                 16 behind you, a soft ding (rack focus)
  [L(24), "zero"], //                 17 the doors open: one step closer
  [L(26), "zero"], //                 18 the stairwell door creaks open
  [L(28), "zero"], //                 19 two ways: the tags
  [L(31), "zero"], //                 20 so, which way down do you go?
];
export const SHOTS: ShotDef[] = B.map(([a, light, hide], i) => ({ id: i + 1, a, b: i + 1 < B.length ? B[i + 1][0] : TOTAL, light, hide }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
export const XFADE: Record<number, number> = {};
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
const T0 = (id: number) => SH[id].a;

// ---------------- the rewind: shot 10 plays shots 2..9 backwards, accelerating ----------------
export const REWIND: [number, number] = [T0(10), T0(11)];
export const rewindSrc = (f: number) => {
  const u = clamp01((f - REWIND[0]) / (REWIND[1] - REWIND[0])), a = T0(2), b = SH[9].b - 1;
  return Math.round(b - (b - a) * (u * u * (3 - 2 * u)));
};
/** the frame whose picture is shown at output frame f (only the rewind differs) */
export const srcFrame = (f: number) => (f >= REWIND[0] && f < REWIND[1] ? rewindSrc(f) : f);
// ---------------- engagement pass ----------------
/** cold open: while the premise line plays ("Seven floors under your office, and it just moved."), the car doors open
 * on it, one step past its dusty footprints (shot 17's push-in), under the hook text IT TOOK A STEP. NOBODY SAW. */
export const TEASER = cueEnd(32) + 8;
export const TEASER_SRC = cue(25, "nobody") - 2;
export const layersAt = (f: number): { id: number; alpha: number; f: number }[] => {
  if (f < TEASER) return [{ id: 17, alpha: 1, f: TEASER_SRC + f }];
  const g = srcFrame(f); return [{ id: shotAt(g).id, alpha: 1, f: g }];
};
/** Part 1's real vote split (percent of numeric answers) for the recap banner; null = banner off. Only ever real numbers. */
export const VOTES: { out: number; stay: number } | null = null;
/** the Rule 2 payoff: a flash of the card (Rule 2 circled in red) while "the one facing the wall" is named */
export const RULE2: [number, number] = [cue(4, "facing") - 6, cue(4, "speaks") - 1];
/** which branch is playing (the badge): 2 = STAY IN, 1 = STEP OUT */
export const branchAt = (f: number) => (f >= T0(2) && f < T0(10) ? 2 : f >= T0(11) && f < T0(19) ? 1 : 0);

// ---------------- story events (frames) ----------------
// branch 2 (stay in)
export const CLOSE_A = cue(1, "doors") - 2;
export const PANEL_DARK = cue(3, "dies") - 2;
export const LIGHTS_OUT = cue(7, "out") - 1, LIGHTS_ON = cue(8, "on") - 1;
export const END_DARK = cue(10, "end") + 2;
export const SPEAK: [number, number][] = [[cue(5), cueEnd(5)], [cue(6), cueEnd(6)]];
// branch 1 (step out)
export const EXIT: [number, number] = [T0(11) + 2, cue(12, "close") + 8];
export const CLOSE_B = cue(12, "close") - 1;
/** as you step out: a 1 s insert of the car panel with "0" lit (the silent payoff: zero WAS on the panel) */
export const ZERO_INSERT: [number, number] = [cue(12, "stepped") - 3, cue(12, "stepped") + 27];
export const DROP: [number, number] = [cue(13, "drops") - 2, cue(14, "bottom")];
export const CRASH = cue(14, "bottom");
export const BREATH_OUT = cue(15, "breath") - 4;
export const SCREENS_ON = cue(16, "on") - 2;
export const MSG = [cue(18), cue(19), cue(20), cue(21)];
export const DING_B = cue(22, "ding") - 2;
export const OPEN_B = cue(24, "open") - 3;
export const STAIR_OPEN = cue(26, "creaks") - 4;
export const SHADOW: [number, number] = [cue(27, "footsteps") - 4, cue(27, "up") + 24];
export const TAGS_AT = cue(28, "Two") - 2, TAG1_HOT: [number, number] = [cue(29) - 2, cue(30) - 4], TAG2_HOT: [number, number] = [cue(30) - 2, cue(31) - 2];
export const TAG_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "STAIRS", color: "#3b7cf0", at: [(STAIR.x0 + STAIR.x1) / 2, 1.75, WALL_Z], pill: [270, 560] },
  { n: 2, label: "ELEVATOR", color: "#e2453c", at: [0, 1.75, WALL_Z], pill: [810, 560] },
];
export const RECAP_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "STEP OUT", color: "#3b7cf0", at: [0.35, 0.03, 2.15], pill: [250, 1420] },
  { n: 2, label: "STAY IN", color: "#e2453c", at: [-0.3, 0.02, 3.35], pill: [760, 1420] },
];
// Part 1 left the doors 45 % open
export const doorAt = (f: number) => {
  if (f < T0(2)) return 0.45;
  if (f < T0(11)) return 0.45 * (1 - smooth((f - CLOSE_A) / 30));
  if (f < OPEN_B) return 0.45 * (1 - smooth((f - CLOSE_B) / 30));
  return smooth((f - OPEN_B) / 36);
};
/** the floor display over the doors (office side) and in the car */
export const displayOutAt = (f: number): string => {
  if (f >= T0(2) && f < T0(11)) return f >= END_DARK ? " " : "0";
  if (f >= DROP[0] && f < CRASH) return "-" + Math.min(7, 1 + Math.floor(((f - DROP[0]) / (CRASH - DROP[0])) * 7));
  if (f >= CRASH && f < DING_B) return "--";
  return "0";
};
export const displayInAt = (f: number): string => (f >= PANEL_DARK && f < T0(11) ? " " : "0");
/** the car light: dark between LIGHTS_OUT and LIGHTS_ON (with a stutter back on), flickers around the speech */
const FLICK: [number, number][] = [[PANEL_DARK + 6, 14], [cue(5) - 4, 8], [LIGHTS_ON, 10], [CRASH, 20], [DING_B + 4, 8]];
export const flickerAt = (f: number) => {
  let k = 1;
  for (const [f0, n] of FLICK) {
    const u = f - f0;
    if (u < 0 || u >= n) continue;
    const h = Math.sin(u * 12.9898 + f0 * 78.233) * 43758.5453;
    k = Math.min(k, (h - Math.floor(h)) < 0.45 ? 0.18 : 0.85);
  }
  return k;
};
export const cabLightAt = (f: number) => (f >= LIGHTS_OUT && f < LIGHTS_ON ? 0 : flickerAt(f));
export const screensOnAt = (f: number) => (f >= SCREENS_ON && f >= T0(11) ? 1 : 0);
/** the message on every screen: lines shown and the countdown (s) */
export const messageAt = (f: number) => ({ lines: MSG.filter((a) => f >= a).length, left: f >= MSG[3] ? 5 * 3600 + 59 * 60 + 59 - Math.floor((f - MSG[3]) / FPS) : -1 });
export const stairOpenAt = (f: number) => (f < T0(11) ? 0 : 0.82 * smooth((f - STAIR_OPEN) / 55));
export const shadowAt = (f: number) => span(f, SHADOW[0], SHADOW[1]);
/** where the one facing the wall is (null = not there) */
export const figureAt = (f: number): V3 | null => {
  if (f < T0(11)) return f < LIGHTS_OUT ? FIGURE : null;
  return f < OPEN_B ? FIGURE : FIGURE2;
};
/** your walk out of the car: straight out of the doors, then across to YOU_OUT */
export const exitPos = (f: number): V3 => {
  const u = clamp01((f - EXIT[0]) / (EXIT[1] - EXIT[0]));
  if (u < 0.55) { const v = u / 0.55; return [YOU_CAB[0], 0, YOU_CAB[2] + (1.95 - YOU_CAB[2]) * v]; }
  const v = smooth((u - 0.55) / 0.45);
  return [YOU_CAB[0] + (YOU_OUT[0] - YOU_CAB[0]) * v, 0, 1.95 + (YOU_OUT[2] - 1.95) * v];
};
export const FLICKER_ROWS = flickerAt;
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

const YC = YOU_CAB, FG = FIGURE, YO = YOU_OUT, SX = (STAIR.x0 + STAIR.x1) / 2;
const out5 = (u: number) => 1 - (1 - clamp01(u)) ** 5;
// 1 recap: Part 1's choice frame, a slow push
const S1 = (f: number) => dolly([0.25, 1.6, -0.75], [-0.05, 0.98, 3.0], pushK(f, 0, 0.0015), { fov: 42 });
// 2 the doors shut on the two of you (from the lobby, low)
const S2 = (f: number) => dolly([0.12, 1.36, 0.85], [0.0, 1.32, 3.5], pushK(f, T0(2), 0.003), { fov: 44 });
// 3 your face (from the door plane)
const S3 = (f: number) => dolly([0.05, 1.5, 1.68], [YC[0], 1.4, YC[2]], pushK(f, T0(3), 0.0035), { fov: 40 });
// 4 the panel goes dark, tilt up to the humming light
const S4a = (f: number) => dolly([0.3, 1.25, 3.25], [PANEL.x, 1.02, PANEL.z], pushK(f, T0(4), 0.002), { fov: 38 });
// 5-7 low angle on the corner (5: the one facing the wall speaks; 6: dark; 7: lights back, it's you)
const LOW = (f: number, f0: number, rate = 0.0035) => ({ ...dolly([FG[0] + 0.42, 0.42, 2.62], [FG[0] - 0.02, 1.62, FG[2] + 0.1], pushK(f, f0, rate)), fov: 58 });
const S5 = (f: number): Shot => ({ ...LOW(f, T0(5)), roll: -0.05 * span(f, T0(5), SH[6].b) });
// the Rule 2 insert: the card on the mirror, Rule 2 circled (a fast push)
const SCARD = (f: number) => dolly([CARD_AT[0] + 0.02, CARD_AT[1] - 0.04, CARD_AT[2] - 0.58], [CARD_AT[0], CARD_AT[1] - 0.05, CARD_AT[2]], pushK(f, RULE2[0], 0.012), { fov: 34, roll: 0.03 });
const S7 = (f: number): Shot => ({ ...LOW(f, T0(7), 0.002), roll: -0.05 });
// 8 front wide of the car: alone in the corner (slow push)
const S8 = (f: number) => dolly([0.18, 1.5, 1.15], [-0.35, 1.2, 3.95], pushK(f, T0(8), 0.003), { fov: 42 });
// 9 this is the end: the closed doors from the lobby, slow pull-out
const S9 = (f: number) => dolly([0.35, 1.45, 0.35], [0.0, 1.7, 2.4], 1 / pushK(f, T0(9), 0.004), { fov: 42 });
// 11 you walk out toward the lens, the doors close behind you
const SZERO = (f: number) => { const y = PANEL_ROW_Y(BTN_ROW.zero); return dolly([PANEL.x - 0.06, y + 0.05, PANEL.z + 0.42], [PANEL.x - 0.035, y, PANEL.z], pushK(f, ZERO_INSERT[0], 0.004), { fov: 30 }); };
const S11 = (f: number): Shot => { const p = exitPos(f); return { pos: [0.75, 1.5, -0.85], look: [p[0] - 0.05, 1.3, p[2] + 0.9], fov: 44 }; };
// 12 behind you, up at the display racing down (shake on the crash)
const S12 = (f: number) => dolly([1.45, 1.66, 0.35], [DISPLAY_OUT[0] + 0.05, DISPLAY_OUT[1] - 0.18, DISPLAY_OUT[2]], pushK(f, T0(12), 0.003) * pushK(f, CRASH - 3, 0, 0.007, 16), { fov: 40 });
// 13 relief: your face, the doors behind you
const S13 = (f: number) => dolly([YO[0] + 0.15, 1.5, YO[2] - 1.4], [YO[0], 1.4, YO[2]], pushK(f, T0(13), 0.003), { fov: 40 });
// 14 over your shoulder: every screen in the office turns on at once (slow push down the aisle)
const S14 = (f: number) => dolly([0.3, 1.75, 2.05], [3.6, 0.9, -5.5], pushK(f, T0(14), 0.0016), { fov: 46 });
// 15 the nearest screen, then pull back to the rows of screens on the countdown
const MON0: V3 = [COLS[2], 1.04, ROWS[0] - 0.282];
const S15a = (f: number) => dolly([MON0[0] + 0.1, MON0[1] + 0.05, MON0[2] + 1.42], [MON0[0], MON0[1] - 0.02, MON0[2]], pushK(f, T0(15), 0.002), { fov: 38 });
const S15b = (f: number) => dolly([1.6, 1.55, 1.3], [2.6, 0.95, -3.2], 1 / pushK(f, L(21), 0.002), { fov: 44 });
// 16 behind you, a soft ding: your face, rack focus to the doors behind
const S16 = (f: number) => dolly([YO[0] + 0.78, 1.55, YO[2] - 1.9], [YO[0] - 0.48, 1.48, YO[2] + 0.95], pushK(f, T0(16), 0.0025), { fov: 40 });
// 17 over your shoulder: the doors open, the one facing the wall one step closer
// (POV: your eyes; you are hidden in this shot)
/** "And nobody saw it move": low in the car doorway, its shoes one step past its own dusty prints (also the cold open) */
const SPRINTS = (f: number) => dolly([0.5, 1.62, CAB.z0 - 0.12], [FIGURE2[0] + 0.02, 0.06, (FIGURE[2] + FIGURE2[2]) / 2 + 0.05], pushK(f, cue(25, "nobody") - 2, 0.0025), { fov: 50 });
const S17 = (f: number) => dolly([YO[0], 1.47, YO[2] - 0.05], [-0.15, 1.32, 3.3], pushK(f, T0(17), 0.002) * pushK(f, cue(25, "closer") - 6, 0, 0.007, 24), { fov: 54 });
// 18 pan from the car to the stairwell door beside it, then push toward the red dark
const S18a = (_f: number): Shot => ({ pos: [YO[0] - 0.1, 1.55, YO[2] - 1.5], look: [-0.1, 1.3, 2.6], fov: 42 });
const S18b = (f: number) => dolly([SX - 0.05, 1.58, 0.1], [SX + 0.05, 0.55, 4.6], pushK(f, cue(26, "creaks"), 0.004), { fov: 44 });
// 19 two ways: wide from the office, both doors and you between them (slow arc)
const S19 = (f: number): Shot => { const u = (f - T0(19)) / (SH[19].b - T0(19)); return { pos: [1.35 - 0.6 * u, 1.68, -3.5 + 0.2 * u], look: [1.0, 1.18, 2.4], fov: 44 }; };
// 20 the question: your face, low in frame under the tags
const S20 = (f: number) => dolly([YO[0] + 0.06, 1.5, YO[2] - 1.15], [YO[0], 1.6, YO[2]], pushK(f, T0(20), 0.004), { fov: 36 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: T0(2), s: S2 }],
  3: [{ f: T0(3), s: S3 }],
  4: [{ f: T0(4), s: S4a }],
  5: [{ f: T0(5), s: S5 }, { f: RULE2[0], cut: true, s: SCARD }, { f: RULE2[1], cut: true, s: S5 }],
  6: [{ f: T0(6), s: S5 }],
  7: [{ f: T0(7), s: S7 }],
  8: [{ f: T0(8), s: S8 }],
  9: [{ f: T0(9), s: S9 }],
  10: [{ f: T0(10), s: S9 }],
  11: [{ f: T0(11), s: S11 }, { f: ZERO_INSERT[0], cut: true, s: SZERO }, { f: ZERO_INSERT[1], cut: true, s: S11 }],
  12: [{ f: T0(12), s: S12 }],
  13: [{ f: T0(13), s: S13 }],
  14: [{ f: T0(14), s: S14 }],
  15: [{ f: T0(15), s: S15a }, { f: L(21), cut: true, s: S15b }],
  16: [{ f: T0(16), s: S16 }],
  17: [{ f: T0(17), s: S17 }, { f: cue(25, "nobody") - 2, cut: true, s: SPRINTS }],
  18: [{ f: T0(18), s: S18a }, { f: cue(26, "stairwell") - 14, dur: 30, s: S18b }],
  19: [{ f: T0(19), s: S19 }],
  20: [{ f: T0(20), s: S20 }],
};
// impact kicks: sign flips every frame, decays over 7 f (frame, gain)
export const KICKS: [number, number][] = [[CRASH, 1.3], [LIGHTS_OUT, 0.3], [DING_B, 0.25]];
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
const youEyes = (): V3 => [YC[0], EYE, YC[2]];
const outEyes = (): V3 => [YO[0], EYE, YO[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: T0(2), cInf: 6, focus: () => [0.0, 1.4, 3.2] },
  { f: T0(3), cInf: 13, focus: youEyes },
  { f: T0(4), cInf: 12, focus: () => [PANEL.x, 1.0, PANEL.z] },
  { f: T0(5), cInf: 9, focus: () => [FG[0], 1.7, FG[2]] },
  { f: RULE2[0], cInf: 11, focus: () => [CARD_AT[0], CARD_AT[1] - 0.05, CARD_AT[2]] },
  { f: RULE2[1], cInf: 9, focus: () => [FG[0], 1.7, FG[2]] },
  { f: T0(8), cInf: 7, focus: () => [FG[0], 1.4, FG[2]] },
  { f: T0(9), cInf: 0 },
  { f: T0(11), cInf: 6, focus: (f) => { const p = exitPos(f); return [p[0], 1.4, p[2]]; } },
  { f: T0(12), cInf: 9, focus: () => DISPLAY_OUT },
  { f: T0(13), cInf: 12, focus: outEyes },
  { f: T0(14), cInf: 5, focus: () => [0.5, 1.0, -3.0] },
  { f: T0(15), cInf: 12, focus: () => MON0 },
  { f: L(21), cInf: 6, focus: () => [2.6, 1.0, -2.0] },
  { f: T0(16), cInf: 13, focus: outEyes },
  { f: cue(22, "ding") - 6, dur: 18, cInf: 13, focus: () => [0.0, 1.5, WALL_Z] },
  { f: T0(17), cInf: 7, focus: () => [FIGURE2[0], 1.5, FIGURE2[2]] },
  { f: T0(18), cInf: 6, focus: () => [SX, 1.2, WALL_Z] },
  { f: T0(19), cInf: 0 },
  { f: T0(20), cInf: 13, focus: outEyes },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  const focus = k < 1 && p.focus && d.focus ? ((ff: number) => lerp3(p.focus!(ff), d.focus!(ff), glide(k))) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { lerp3, add };
