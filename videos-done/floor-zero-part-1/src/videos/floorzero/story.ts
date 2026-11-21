// Timeline of "Floor Zero, Part 1": every cut, camera key, story event and acting beat is looked up from the narration's
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
export const LAST_LINE = 41;
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
export const CLOCK: V3 = [2.2, 2.12, WALL_Z - 0.03];
export const CALL_BTN: V3 = [-0.95, 1.12, WALL_Z - 0.02];
/** the car panel on the inner front wall, right of the doors (seen from inside) */
export const PANEL = { x: 0.7, z: CAB.z0 + 0.02, y0: 0.62, y1: 1.5, w: 0.2 };
export const DISPLAY_IN: V3 = [0, 2.2, CAB.z0 + 0.02];
export const DISPLAY_OUT: V3 = [0, 2.38, WALL_Z - 0.02];
export const CARD_AT: V3 = [0.32, 1.52, CAB.z1 - 0.02];
/** you stand here inside the car, facing the doors; the one facing the wall stands in the back-left corner */
export const YOU_CAB: V3 = [0.12, 0, 3.12];
export const FIGURE: V3 = [-0.58, 0, 4.07];
export const EYE = 1.44;

// ---------------- shots ----------------
export type Light = "office" | "cab" | "zero";
/** hide: wild walls for this shot (the camera stands where a wall would be) */
export type ShotDef = { id: number; a: number; b: number; light: Light; hide?: ("front" | "back" | "left" | "right" | "ceil" | "cabCeil")[]; sunAz?: number; sunEl?: number };
const L = (line: number, w?: string, n = 0) => cue(line, w, n) - LEAD;
const B: [number, Light, ShotDef["hide"]?][] = [
  [0, "office", ["ceil"]], //                 1 hook: crane down over the empty office to you at your desk
  [L(1), "office"], //                        2 the wall clock: 23:58
  [L(2) - 6, "office"], //                    3 you walk to the elevator, the lights die behind you row by row
  [L(4), "office"], //                        4 you call the elevator, the doors open
  [cue(4, "step") - 8, "cab", ["back"]], //   5 inside: you step in, turn, press G
  [L(5), "cab", ["back"]], //                 6 the doors close, tilt up to the numbers
  [L(6) - 4, "cab"], //                       7 3, 2, 1, G
  [L(10), "cab", ["front"]], //               8 "And it keeps going": pedestal down
  [L(11), "cab"], //                          9 G again: nothing
  [L(12), "cab"], //                         10 your phone (POV)
  [L(13), "cab"], //                         11 the emergency bell rings
  [L(14), "cab", ["front"]], //              12 nobody answers
  [L(15), "cab"], //                         13 the panel changes: 0 .. -7
  [L(18), "cab", ["right", "cabCeil"]], //   14 the jolt; snap zoom on the display: 0
  [L(20), "cab", ["front"]], //              15 you turn to the mirror: the card
  [L(22), "cab"], //                         16 the rules
  [L(25), "cab", ["front"]], //              17 you laugh
  [L(26), "cab", ["back"]], //               18 ding: the doors open on floor zero
  [L(27), "zero"], //                        19 your office. The exact same office.
  [L(28), "zero"], //                        20 every chair faces the elevator
  [L(30), "zero"], //                        21 your computer is on (lens zoom)
  [L(31), "zero"], //                        22 it types your name
  [L(32), "cab"], //                         23 breathing, right behind you (dolly zoom)
  [L(35), "cab"], //                         24 in the corner, facing the wall
  [L(37), "zero"], //                        25 the doors start to close
  [L(38), "zero"], //                        26 two choices
  [L(41), "cab"], //                         27 so, what would you do?
];
export const SHOTS: ShotDef[] = B.map(([a, light, hide], i) => ({ id: i + 1, a, b: i + 1 < B.length ? B[i + 1][0] : TOTAL, light, hide }));
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
export const XFADE: Record<number, number> = {};
export const FREEZE: [number, number] = [-10, -10];
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];
const T0 = (id: number) => SH[id].a;

// ---------------- story events (frames; world.ts / cast.ts / Overlay.tsx draw them, the sound mirrors them) ----------------
/** you stand up from your chair */
export const RISE = cue(0, "leaving") - 4;
/** the light rows switch off far -> near; index = row (0 = nearest the elevator) */
export const ROW_OFF = [cue(2, "lights"), cue(2, "off") + 2, cue(3, "One"), cue(3, "row"), cue(3, "time") + 2].reverse() as number[];
/** your walk down the aisle (shot 3 -> 4) */
export const WALK: [number, number] = [L(2) - 16, cue(4, "call") + 4];
export const WALK_Z: [number, number] = [-2.3, 1.55];
export const CALL_PRESS = cue(4, "elevator") - 6;
/** the doors: open amount 0..1 */
export const OPEN1 = CALL_PRESS + 12, CLOSE1 = cue(5, "doors") - 2;
export const OPEN2 = cue(26, "ding") + 3, CLOSE2 = cue(37, "start") - 2;
export const doorAt = (f: number) => {
  if (f < CLOSE1 + 40) return f < OPEN1 ? 0 : f < CLOSE1 ? smooth((f - OPEN1) / 30) : 1 - smooth((f - CLOSE1) / 28);
  if (f < OPEN2) return 0;
  if (f < CLOSE2) return smooth((f - OPEN2) / 40);
  return 1 - 0.55 * smooth((f - CLOSE2) / (TOTAL - CLOSE2 + 30)); // slow, never quite closes before the cut
};
/** walking into the car, turning, pressing G */
export const ENTER: [number, number] = [cue(4, "step") - 4, cue(4, "press") - 6];
export const TURN1 = ENTER[1] - 2;
export const PRESS_G = cue(4, "ground") - 2;
/** the floor display */
const COUNT0 = cue(5, "numbers") - 2;
export const displayAt = (f: number): string => {
  if (f < COUNT0) return "12";
  if (f < cue(6)) { const n = 12 - Math.floor(((f - COUNT0) / Math.max(1, cue(6) - COUNT0)) * 9); return String(Math.max(4, n)); }
  if (f < cue(7)) return "3";
  if (f < cue(8)) return "2";
  if (f < cue(9)) return "1";
  if (f < cue(10, "keeps")) return "G";
  if (f < cue(18, "stops")) return Math.floor((f - cue(10, "keeps")) / 9) % 2 ? "v" : " ";
  return "0";
};
/** G pressed again (three pumps) */
export const PUMPS = [cue(11, "press") - 1, cue(11, "button") + 1, cue(11, "again") + 2];
/** the emergency bell */
export const BELL = cue(13, "emergency") + 4;
export const RINGS = [cue(13, "rings"), cue(13, "rings", 1)];
/** the panel's new buttons: 0, -1 .. -7 */
export const NEW_BTN = [cue(17, "Zero"), cue(17, "Minus"), ...Array.from({ length: 6 }, (_, i) => Math.round(cue(17, "All") + ((i + 1) * (cue(17, "seven") - cue(17, "All"))) / 6))];
/** the jolt */
export const JOLT = cue(18, "stops") - 1;
export const ZERO_LIT = cue(19, "zero") - 2;
/** turning to the mirror, and back */
export const TURN2 = T0(15) + 6, TURN3 = T0(17) + 2;
/** floor zero: the chairs finish turning, the computer types */
export const CHAIR_TURN: [number, number] = [cue(29, "Every") - 6, cue(29, "elevator") + 4];
export const TYPE = [cue(31, "typing"), cue(31, "your"), cue(31, "name")];
/** the figure (only from shot 23: you never saw them get in) */
export const FIGURE_FROM = T0(23);
export const BREATH = [cue(33, "Breathing") - 6, cue(34, "Right") + 4];
/** the cab light flickers */
const FLICK: [number, number][] = [[cue(10, "keeps") - 2, 26], [JOLT, 18], [cue(32, "hear"), 10], [cue(36, "wall") - 4, 14]];
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
/** choice tags */
export const TAGS_AT = cue(38, "two") - 2, TAG1_HOT: [number, number] = [cue(39, "Step") - 2, cue(40, "Or") - 4], TAG2_HOT: [number, number] = [cue(40, "Or") - 2, cue(41) - 2];
export const TAG_ANCHORS: { n: number; label: string; color: string; at: V3; pill: [number, number] }[] = [
  { n: 1, label: "STEP OUT", color: "#3b7cf0", at: [0.35, 0.03, 2.15], pill: [250, 1590] },
  { n: 2, label: "STAY IN", color: "#e2453c", at: [-0.3, 0.02, 3.35], pill: [830, 1590] },
];

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
/** where you walk at frame f (shots 3-4): down the aisle toward the elevator */
export const walkZ = (f: number) => WALK_Z[0] + (WALK_Z[1] - WALK_Z[0]) * clamp01((f - WALK[0]) / (WALK[1] - WALK[0]));
/** your x on the walk: down the middle of the aisle, drifting left to the call button at the end */
export const walkX = (z: number) => 0.1 - 0.45 * smooth((z - 0.6) / 0.95);
const out5 = (u: number) => 1 - (1 - clamp01(u)) ** 5;

const YC = YOU_CAB, FG = FIGURE;
// 1 hook: crane down from under the ceiling over the empty rows to you at your desk (front 3/4, past the monitor)
const S1a = (f: number): Shot => ({ pos: [4.9, 2.72, -6.9], look: [2.6, 0.55, -2.6], fov: 44, roll: 0.02 * (1 - f / 80) });
const S1b = (f: number) => dolly([4.35, 1.52, -4.95], [2.72, 1.12, -2.72], pushK(f, 40, 0.002), { fov: 40 });
// 2 the wall clock: push-in, a slight roll
const S2a = (f: number) => dolly([CLOCK[0] - 0.25, CLOCK[1] - 0.12, CLOCK[2] - 1.15], CLOCK, pushK(f, T0(2), 0.0045), { fov: 34, roll: -0.035 });
// 3 follow: the lens leads you down the aisle; the rows behind you die one by one
const S3a = (f: number): Shot => { const z = walkZ(f), cz = Math.min(z + 2.5, 2.05), k = clamp01((cz - z) / 2.5), side = smooth((z + 0.4) / 1.6); return { pos: [0.4 + 1.2 * side, 1.56, cz], look: [walkX(z) + 0.02, 1.24, z - 0.5 * k], fov: 44 }; };
// 4 truck alongside: you reach the doors, press the call button, the doors open
const S4a = (f: number) => dolly([0.3, 1.55, -1.6], [-0.35, 1.25, 2.4], pushK(f, T0(4), 0.003), { fov: 44 });
// 5 from inside the car: you step in toward the lens, turn, reach for the panel
const S5a = (f: number) => dolly([0.42, 1.5, 5.45], [0.0, 1.2, 1.7], pushK(f, T0(5), 0.0025), { fov: 44 });
// 6 over your shoulder: the doors close, then tilt up to the numbers
const S6a = (f: number) => dolly([0.5, 1.66, 5.2], [0.02, 1.38, CAB.z0], pushK(f, T0(6), 0.002), { fov: 42 });
const S6b = (_f: number): Shot => ({ pos: [0.42, 1.7, 4.4], look: [DISPLAY_IN[0], DISPLAY_IN[1] - 0.04, DISPLAY_IN[2]], fov: 38 });
// 7 the display: 3, 2, 1, G (push on each number)
const S7a = (f: number) => dolly([0.08, 2.02, 3.35], DISPLAY_IN, pushK(f, T0(7), 0.003) * pushK(f, cue(9) - 2, 0, 0.007, 20), { fov: 30 });
// 8 "And it keeps going": pedestal down past your worried face (we are going down)
const S8a = (f: number): Shot => { const u = span(f, T0(8), SH[8].b + 6); return { pos: [0.05, 1.86 - 0.62 * u, 0.95], look: [YC[0], 1.42 - 0.22 * u, YC[2]], fov: 40 }; };
// 9 the panel: your finger stabs G again
const S9a = (f: number) => dolly([0.3, 1.2, 3.15], [PANEL.x, 1.12, PANEL.z], pushK(f, T0(9), 0.0025), { fov: 36, roll: 0.03 });
// 10 POV: the phone comes up into frame
const S10a = (f: number): Shot => ({ pos: [YC[0], 1.47, YC[2] + 0.05], look: [YC[0] + 0.02, 1.0, YC[2] - 0.55 - 0.03 * span(f, T0(10), SH[10].b)], fov: 44, roll: -0.03 });
// 11 the emergency bell: push in while it rings
const S11a = (f: number) => dolly([0.36, 0.86, 3.05], [PANEL.x - 0.02, 0.7, PANEL.z], pushK(f, T0(11), 0.004), { fov: 36 });
// 12 nobody answers: close on your face, the frame slowly tips (growing Dutch roll)
const S12a = (f: number): Shot => ({ ...dolly([0.04, 1.47, 2.25], [YC[0], 1.42, YC[2]], pushK(f, T0(12), 0.003), { fov: 38 }), roll: 0.085 * span(f, T0(12), SH[12].b) });
// 13 the panel changes: start on G, tilt down with the new buttons to -7
const panelY = (i: number) => PANEL.y1 - 0.06 - i * ((PANEL.y1 - PANEL.y0 - 0.1) / 11);
export const BTN_ROW = { G: 6, zero: 7, last: 10, bell: 11 };
const S13a = (f: number): Shot => {
  const u = span(f, cue(16, "Below") - 6, cue(17, "seven") + 4);
  const y = panelY(BTN_ROW.G) + (panelY(BTN_ROW.last) - panelY(BTN_ROW.G)) * u;
  return { pos: [0.33, y + 0.08, 3.12], look: [PANEL.x, y, PANEL.z], fov: 34 };
};
export const PANEL_ROW_Y = panelY;
// 14 the jolt: a wide of the car from the right, shake; then snap zoom on the display on "zero"
const S14a = (f: number) => dolly([2.75, 1.62, 3.3], [YC[0], 1.0, YC[2] + 0.05], pushK(f, T0(14), 0.002), { fov: 44 });
const S14b = (f: number): Shot => ({ pos: [0.12, 1.82, 3.7], look: DISPLAY_IN, fov: 48 - 26 * out5((f - (ZERO_LIT - 1)) / 5) });
// 15 you turn to the mirror: over your shoulder, rack focus to the card, then the card
const S15a = (f: number) => dolly([-0.62, 1.64, 2.1], [CARD_AT[0], CARD_AT[1] - 0.02, CARD_AT[2]], pushK(f, T0(15), 0.004), { fov: 40 });
const S15b = (f: number) => dolly([CARD_AT[0] + 0.02, CARD_AT[1] + 0.02, CARD_AT[2] - 0.62], [CARD_AT[0], CARD_AT[1] + 0.06, CARD_AT[2]], pushK(f, L(21), 0.0035), { fov: 34 });
// 16 the rules: tilt down the card (Rule 1, then the scratched-out rest)
const S16a = (f: number): Shot => {
  const u = span(f, cue(22, "If") - 4, cue(23, "out") + 4), v = span(f, cue(24, "rest") - 6, cue(24, "off") + 6);
  const y = CARD_AT[1] + 0.06 - 0.075 * u - 0.07 * v;
  return { ...dolly([CARD_AT[0] + 0.01, y + 0.01, CARD_AT[2] - 0.68], [CARD_AT[0], y, CARD_AT[2]], pushK(f, T0(16), 0.0015) * pushK(f, cue(23, "do") - 2, 0, 0.006, 22)), fov: 32 };
};
// 17 false relief: you laugh it off (slow pull back, level)
const S17a = (f: number) => dolly([0.06, 1.5, 1.85], [YC[0], 1.36, YC[2]], 1 / pushK(f, T0(17), 0.0028), { fov: 40 });
// 18 ding: over your shoulder from the back, the doors open on floor zero (push toward the doorway)
const S18a = (f: number) => dolly([0.98, 1.9, 5.35], [-0.18, 1.18, 0.2], pushK(f, T0(18), 0.003), { fov: 42 });
// 19 POV out of the doors: your office, the exact same office (slow push to the threshold)
const S19a = (f: number) => dolly([0.05, 1.47, 3.0], [0.05, 1.15, -6.0], pushK(f, T0(19), 0.0016), { fov: 46 });
// 20 low-angle truck along the first row of chairs: every one of them faces the elevator
const S20a = (f: number): Shot => { const u = (f - T0(20)) / (SH[20].b - T0(20)); return { pos: [5.15 - 2.6 * u, 0.62, 1.55], look: [4.5 - 2.6 * u, 0.58, -0.4], fov: 50, roll: 0.03 }; };
// 21 from the doors: the lens zooms across the office onto your monitor
const S21a = (f: number): Shot => ({ pos: [0.12, 1.5, 2.25], look: [MONITOR[0], MONITOR[1], MONITOR[2]], fov: 40 - 30 * span(f, T0(21) + 6, SH[21].b + 4) });
// 22 the monitor types your name
const S22a = (f: number) => dolly([MONITOR[0] + 0.16, MONITOR[1] + 0.06, MONITOR[2] + 1.15], [MONITOR[0], MONITOR[1] + 0.01, MONITOR[2]], pushK(f, T0(22), 0.003), { fov: 34 });
// 23 breathing, right behind you: your face, then a dolly zoom (back off + narrow the lens) on "Right behind you"
const S23a = (f: number): Shot => {
  const u = span(f, cue(34, "Right") - 6, cue(34, "you") + 10);
  const d0 = 0.78, d1 = 1.65, d = d0 + (d1 - d0) * u, fov = (2 * Math.atan((d0 / d) * Math.tan((38 * Math.PI) / 360)) * 180) / Math.PI;
  return { pos: [YC[0] - 0.04, 1.45, YC[2] - d], look: [YC[0], 1.43, YC[2]], fov };
};
// 24 rack focus from you to the corner; then close behind the one facing the wall, the frame tips
const S24a = (f: number): Shot => {
  const p: V3 = [YC[0], 1.47, YC[2] - 0.05], a1 = Math.atan2(FG[0] - p[0], -(FG[2] - p[2])), u = glide((f - (T0(24) + 2)) / 22), a = a1 * u;
  const back = 0.5 * u + 0.1 * clamp01((f - (T0(24) + 24)) / 60), d = 1.0;
  return { pos: [p[0] - 0.1 * u, p[1], p[2] - back], look: [p[0] + Math.sin(a) * d, 1.5 - 0.02 * u, p[2] - Math.cos(a) * d], fov: 50 + 12 * u, roll: 0.06 * Math.sin(Math.PI * u) };
};
const S24b = (f: number): Shot => ({ ...dolly([FG[0] + 0.42, 0.42, 2.62], [FG[0] - 0.02, 1.75, FG[2] + 0.1], pushK(f, L(36), 0.004)), fov: 58, roll: -0.075 * span(f, L(36), SH[24].b) });
// 25 from the aisle of floor zero: the doors start to close on both of you (slow pull-out)
const S25a = (f: number) => dolly([0.45, 1.36, -0.2], [0.0, 1.22, 3.3], 1 / pushK(f, T0(25), 0.0025), { fov: 40 });
// 26 two choices: higher and wider, a slow arc while the tags point
const S26a = (f: number): Shot => { const u = (f - T0(26)) / (SH[26].b - T0(26)); return { pos: [0.95 - 0.7 * u, 1.6, -0.95 + 0.2 * u], look: [-0.05, 0.98, 3.0], fov: 42 }; };
// 27 the question: on your face (slow push)
const S27a = (f: number) => dolly([0.06, 1.5, 1.95], [YC[0], 1.58, YC[2]], pushK(f, T0(27), 0.004), { fov: 36 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 3, dur: 52, s: S1b }],
  2: [{ f: T0(2), s: S2a }],
  3: [{ f: T0(3), s: S3a }],
  4: [{ f: T0(4), s: S4a }],
  5: [{ f: T0(5), s: S5a }],
  6: [{ f: T0(6), s: S6a }, { f: cue(5, "numbers") - 12, dur: 22, s: S6b }],
  7: [{ f: T0(7), s: S7a }],
  8: [{ f: T0(8), s: S8a }],
  9: [{ f: T0(9), s: S9a }],
  10: [{ f: T0(10), s: S10a }],
  11: [{ f: T0(11), s: S11a }],
  12: [{ f: T0(12), s: S12a }],
  13: [{ f: T0(13), s: S13a }],
  14: [{ f: T0(14), s: S14a }, { f: cue(19), cut: true, s: S14b }],
  15: [{ f: T0(15), s: S15a }, { f: L(21), cut: true, s: S15b }],
  16: [{ f: T0(16), s: S16a }],
  17: [{ f: T0(17), s: S17a }],
  18: [{ f: T0(18), s: S18a }],
  19: [{ f: T0(19), s: S19a }],
  20: [{ f: T0(20), s: S20a }],
  21: [{ f: T0(21), s: S21a }],
  22: [{ f: T0(22), s: S22a }],
  23: [{ f: T0(23), s: S23a }],
  24: [{ f: T0(24), s: S24a }, { f: L(36), cut: true, s: S24b }],
  25: [{ f: T0(25), s: S25a }],
  26: [{ f: T0(26), s: S26a }],
  27: [{ f: T0(27), s: S27a }],
};

// impact kicks: sign flips every frame, decays over 7 f (frame, gain)
export const KICKS: [number, number][] = [[JOLT, 1.2], [ZERO_LIT, 0.45], [cue(34, "Right"), 0.35]];
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
export { lerp3, add };

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const youEyes = (): V3 => [YC[0], EYE, YC[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 50, dur: 20, cInf: 9, focus: () => [MY_CHAIR[0], 1.2, MY_CHAIR[2] - 0.2] },
  { f: T0(2), cInf: 12, focus: () => CLOCK },
  { f: T0(3), cInf: 8, focus: (f) => [0.1, 1.4, walkZ(f)] },
  { f: T0(4), cInf: 6, focus: () => [-0.2, 1.3, 1.9] },
  { f: T0(5), cInf: 7, focus: () => [0.05, 1.3, 2.9] },
  { f: T0(6), cInf: 8, focus: () => [0.05, 1.6, CAB.z0] },
  { f: T0(7), cInf: 12, focus: () => DISPLAY_IN },
  { f: T0(8), cInf: 11, focus: youEyes },
  { f: T0(9), cInf: 13, focus: () => [PANEL.x, 1.12, PANEL.z] },
  { f: T0(10), cInf: 14, focus: (f) => { const c = camAt(10, f), d = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]); return c.pos.map((v, i) => v + ((c.look[i] - v) / d) * 0.3) as V3; } },
  { f: T0(11), cInf: 13, focus: () => [PANEL.x, 0.7, PANEL.z] },
  { f: T0(12), cInf: 13, focus: youEyes },
  { f: T0(13), cInf: 12, focus: (f) => [PANEL.x, S13a(f).look[1], PANEL.z] },
  { f: T0(14), cInf: 4, focus: () => [YC[0], 1.3, YC[2]] },
  { f: cue(19), cInf: 10, focus: () => DISPLAY_IN },
  { f: T0(15), cInf: 12, focus: () => [YC[0], 1.45, YC[2]] },
  { f: T0(15) + 22, dur: 18, cInf: 12, focus: () => CARD_AT },
  { f: T0(16), cInf: 12, focus: () => CARD_AT },
  { f: T0(17), cInf: 11, focus: youEyes },
  { f: T0(18), cInf: 5, focus: () => [0.0, 1.4, 1.5] },
  { f: T0(19), cInf: 4, focus: () => [0.0, 1.0, -3.0] },
  { f: T0(20), cInf: 8, focus: (f) => [S20a(f).look[0], 0.6, -0.15] },
  { f: T0(21), cInf: 6, focus: () => MONITOR },
  { f: T0(22), cInf: 12, focus: () => MONITOR },
  { f: T0(23), cInf: 14, focus: youEyes },
  { f: T0(24), cInf: 9, focus: () => [FG[0], 1.6, FG[2]] },
  { f: L(36), cInf: 12, focus: () => [FG[0], 1.7, FG[2]] },
  { f: T0(25), cInf: 0 },
  { f: T0(27), cInf: 13, focus: youEyes },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  const focus = k < 1 && p.focus && d.focus ? ((ff: number) => lerp3(p.focus!(ff), d.focus!(ff), glide(k))) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
