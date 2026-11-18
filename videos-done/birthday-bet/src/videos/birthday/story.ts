// Timeline of "The Birthday Bet" (v3, "Would you take this bet?"): every cut, camera key and acting beat is looked up from the voice's word timings
// (words.json: four Kokoro voices, duration-predictor times, checked against Whisper: median offset 0.004 s), so a re-voiced line
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
type Word = { w: string; s: number; e: number; line: number; who?: string };
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
export const TOTAL = cueEnd(16) + 26; // the last word plus a tail for the confetti, the call to action and the music's button
/** frames where voice line `line` is mid-word: the speaker's mouth flaps (talk / closed every 3 f) */
export const speaking = (line: number, f: number) => WS.some((w) => w.line === line && f >= Math.round(w.s * FPS) - 1 && f < Math.round(w.e * FPS));
export const flap = (line: number, f: number) => speaking(line, f) && Math.floor(f / 3) % 2 === 0;

// ---------------- the party: 23 guests in a ring around the cake ----------------
export const R = 3.6;
export const N = 23;
/** guest k (1..23) on the ring, k = 1 (Dave) at the back, counting clockwise seen from above */
export const ringAng = (k: number, n = N) => (2 * Math.PI * (k - 1)) / n;
export const G = (k: number, r = R, n = N, a0 = 0): V3 => { const t = ringAng(k, n) + a0; return [r * Math.sin(t), 0, -r * Math.cos(t)]; };
export const DAVE = 1, GARY = 4, NINE = 9, SEVENTEEN = 17;
/** the twist: 253 people around Gary (sunflower spiral, Gary alone at the centre) */
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
/** the record-scratch freeze after "September ninth!": the 3D holds frame FREEZE[0] until shot 11 starts */
const FZ0 = cueEnd(7) + 2;
const B = [
  0, //                1 hook: crane up over the party, number tags count 1..23
  L(0, "I"), //        2 Dave to the lens: "I bet two of them share a birthday." ($100 bill slaps the lens)
  L(1), //             3 "You'd take that bet, right?" laughs, the 365 calendar
  L(2), //             4 "Gary did. So did the whole party." cash goes up round the ring
  L(3), //             5 Dave: "$2,200 at risk"
  L(4), //             6 Gary: "Anyone born on March third?"
  cueEnd(4) + 5, //    7 crickets
  cue(5) - 18, //      8 the roll call: bubbles + counter (1..9 count in before "Ten")
  L(6), //             9 Gary counting his money
  L(7), //            10 guest 17: "September ninth!" -> freeze
  L(8), //            11 guest 9 slowly raises a hand
  L(9), //            12 the match lights up, Dave wins
  L(10), //           13 "Here's what Gary missed. Your brain probably did too."
  L(11), //           14 golden: Gary's 22 lines
  L(12), //           15 the web of 253 pairs
  L(13), //           16 the coin flip
  L(14), //           17 the 2014 World Cup
  L(15), //           18 the twist: Gary in a crowd of 253, the crane pulls back
  L(16, "Comment"), // 19 sunset party: "Comment your birthday. Find your twin."
  TOTAL,
];
const GOLD_IDS = [14, 15, 16, 18, 19];
const SCENE_OF = (id: number): Scene => (id === 17 ? "pitch" : id === 18 ? "crowd" : "party");
// golden hour with the sun at 24 deg (not the low backlight preset): the lawn stays lit, the shadows stay violet
export const SHOTS: ShotDef[] = B.slice(0, -1).map((a, i) => {
  const id = i + 1, light: Light = GOLD_IDS.includes(id) ? "golden" : "day";
  return { id, a, b: B[i + 1], light, scene: SCENE_OF(id), table: id <= 13 || id === 19, ...(light === "golden" ? { sunAz: 55, sunEl: 24 } : {}) };
});
export const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<number, ShotDef>;
/** crossfades at place / time changes (frames); a white flash marks the record scratch */
export const XFADE: Record<number, number> = { 14: 8, 17: 8, 18: 8, 19: 8 };
export const FREEZE: [number, number] = [FZ0, SH[11].a];
export const FLASH_AT = FZ0;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story events (frames; cast.ts / world.ts / Overlay.tsx draw them, the sound mirrors them) ----------------
/** hook: number tags count 1..23 round the ring while Dave says "Twenty-three people" */
export const TAG0 = cue(0, "twenty-three"), TAG1 = cueEnd(0, "people") + 1;
export const tagAt = (k: number) => Math.round(TAG0 + ((k - 1) * (TAG1 - TAG0)) / (N - 1));
/** Dave's $100 bill slaps onto the lens on "bet" */
export const SLAP = cue(0, "bet") - 1;
/** the top title "WOULD YOU TAKE THIS BET?" over the hook */
export const TITLE: [number, number] = [0, SH[3].b];
/** "So did the whole party": guests raise their cash one after another round the ring, outward from Gary */
export const CASH_WAVE: [number, number] = [cue(2, "So") - 2, cue(2, "party") + 4];
export const cashAt = (k: number) => {
  const d = Math.min(Math.abs(k - GARY), N - Math.abs(k - GARY));
  return k === GARY ? cue(2, "did") - LEAD : Math.round(CASH_WAVE[0] + ((d - 1) * (CASH_WAVE[1] - CASH_WAVE[0])) / 10);
};
/** the stakes pill ("$2,200 AT RISK" -> "DAVE WINS $2,200") and the roll-call counter */
export const STAKES: [number, number] = [cue(3, "twenty-two") - 1, SH[12].b];
export const COUNTER: [number, number] = [SH[8].a, SH[12].b];
/** the roll call: 16 guests call out their birthday (1..10 fast, landing on "Ten", then 11..15 to "Fifteen", 16 on "Nothing") */
const RC_TEXT = ["JUN 4", "OCT 30", "JAN 12", "MAR 3", "JUN 5", "DEC 25", "AUG 1", "APR 19", "SEP 9", "NOV 2", "FEB 14", "JUL 7", "MAY 22", "OCT 8", "JAN 30", "MAR 15"];
const R0 = SH[8].a + 1, R10 = cue(5, "Ten") + 2, R15 = cue(5, "Fifteen") - 1, R16 = cue(5, "Nothing") - 1;
export const rollAt = (k: number) => (k <= 10 ? Math.round(R0 + ((k - 1) * (R10 - R0)) / 9) : k <= 15 ? Math.round(R10 + ((k - 10) * (R15 - R10)) / 5) : R16);
/** guest 17 says it, the scratch freezes the frame, guest 9 slowly raises a hand: the match */
export const SEP17 = cue(7, "September") - LEAD;
export const RAISE: [number, number] = [cue(8, "slowly") - 4, cue(8, "hand") + 6];
export const MATCH_AT = cue(8, "hand") - 1;
/** checked count for the counter at frame f */
export const checkedAt = (f: number) => (f < SH[9].a ? Array.from({ length: 16 }, (_, i) => rollAt(i + 1)).filter((x) => x <= f).length : f < SEP17 ? 16 : 17);
export const WIN_AT = cue(9, "won") - 1;
/** speech bubbles: guest, text, frames (a..b), hot = the match, life = pops away after n frames */
export type Bubble = { k: number; text: string; a: number; b: number; hot?: boolean; shot: number };
export const BUBBLES: Bubble[] = [
  { k: GARY, text: "MARCH 3?", a: cue(4, "March") - LEAD, b: SH[6].b, shot: 6 },
  ...RC_TEXT.map((text, i) => ({ k: i + 1, text, a: rollAt(i + 1), b: i === 15 ? SH[8].b : rollAt(i + 1) + 24, shot: 8 })),
  { k: SEVENTEEN, text: "SEP 9!", a: SEP17, b: SH[10].b, shot: 10 },
  { k: NINE, text: "SEP 9", a: MATCH_AT, b: SH[11].b, hot: true, shot: 11 },
  { k: NINE, text: "SEP 9", a: SH[12].a, b: SH[12].b, hot: true, shot: 12 },
  { k: SEVENTEEN, text: "SEP 9", a: SH[12].a, b: SH[12].b, hot: true, shot: 12 },
  { k: GARY, text: "MARCH 3?", a: cue(15, "match") - LEAD, b: SH[18].b, shot: 18 },
];
/** Gary's 22 lines, one per other guest */
export const GARY_LINES = [cue(11, "checked") - 4, cue(11, "chances") + 2];
/** "any two people": a few sample pairs blink, then all 253 pairs draw in order */
export const SAMPLE_PAIRS: [number, number, number][] = [[6, 15, cue(12, "any")], [3, 20, cue(12, "two") + 2], [11, 21, cue(12, "people") + 3]];
export const WEB_BUILD = [cue(12, "Everyone") - 2, cue(12, "pairs") + 4];
/** the coin: launch / land */
export const COINS = [{ shot: 16, f0: cue(13, "coin") - 10, f1: cue(13, "flip") + 14 }];
/** confetti bursts: frame, centre */
/** (in 3D for the wide on "won"; Dave's close-ups get screen-space confetti cannons, Overlay.tsx: 3D confetti leaves a tight frame in a few frames) */
export const CONFETTI: [number, V3][] = [[cue(9, "won") - 1, [-0.3, 2.2, 1.8]]];
export const CONFETTI_2D = [cue(9, "twenty-two") - 1, cue(16, "twin") - 1];
/** the World Cup pair */
export const CUP_LINK = [cue(14, "Half"), cue(14, "Half") + 8];
export const CUP_CAKE = cue(14, "match") - LEAD;
/** the twist card: "253 PEOPLE" on the number, "253 PAIRS =" joins it on "Same number" */
export const CARD253: [number, number, number] = [cue(15, "two") - 1, cue(15, "Same") - 1, SH[18].b];
/** the call to action */
export const CTA = cue(16, "Comment") - 1;

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
const T0 = (id: number) => SH[id].a;
/** slide a framing sideways (lens and look point together) by s metres along the lens's right: the subject moves the other way in frame */
const slide = (c: { pos: V3; look: V3 }, s: number) => {
  const dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], l = Math.hypot(dx, dz) || 1, r: V3 = [-dz / l, 0, dx / l];
  return { pos: add(c.pos, r, s), look: add(c.look, r, s) };
};
/** close-ups with a speech bubble: the speaker sits 0.26 m off centre, the bubble beside the head (cast.ts NEAR_SIDE) */
export const BUBBLE_SLIDE = 0.26;

// --- 1 hook: low over the front guests -> crane up over the ring while the tags count 1..23
const S1a = (f: number) => dolly([0.1, 2.3, 6.4], [0, 1.35, -1.4], pushK(f, 0, 0.003), { fov: 46 });
const S1b = (f: number) => orbit(dolly([0, 9.6, 12.6], [0, 0.6, -0.1], pushK(f, 0, 0.0022), { fov: 46 }), -0.0014 * f);
// --- 2 Dave to the lens, a punch on "birthday"
const S2a = (f: number) => { const c = msIn(DAVE, 1.95, 1.5, 0.1); return dolly(c.pos, c.look, pushK(f, T0(2), 0.0025) * pushK(f, cue(0, "birthday") - 2, 0, 0.008, 18), { fov: 40 }); };
// --- 3 laugh: wide front, then up to the calendar burst
const S3a = (f: number) => dolly([0.7, 3.0, 9.6], [0, 1.25, 0], pushK(f, T0(3), 0.0025), { fov: 42 });
const S3b = (f: number) => dolly([0, 4.4, 8.6], [0, 2.7, 0], pushK(f, L(1, "Three"), 0.002, 0.005, 30), { fov: 44, roll: -0.03 });
// --- 4 Gary takes the bet (MS), then the whole ring raises cash (high wide)
const S4a = (f: number) => { const c = msIn(GARY, 2.3, 1.5, -0.3); return dolly(c.pos, c.look, pushK(f, T0(4), 0.003, 0.006, 16), { fov: 40, roll: 0.03 }); };
const S4b = (f: number) => orbit(dolly([0, 6.6, 10.6], [0, 0.9, 0], pushK(f, L(2, "So"), 0.0022) * pushK(f, L(2, "hundred"), 0, 0.006, 20), { fov: 44 }), -0.25 + 0.0014 * (f - L(2, "So")));
// --- 5 Dave, sweating it: punch on the sum
const S5a = (f: number) => { const c = msIn(DAVE, 2.3, 1.5, -0.2); return dolly(c.pos, c.look, pushK(f, T0(5), 0.0025) * pushK(f, cue(3, "twenty-two") - 2, 0, 0.008, 20), { fov: 40, roll: -0.03 }); };
// --- 6 Gary: "Anyone born on March third?"
const S6a = (f: number) => { const c = slide(msIn(GARY, 3.6, 1.55, -0.3), -BUBBLE_SLIDE); return dolly(c.pos, c.look, pushK(f, T0(6), 0.0025), { fov: 40 }); };
const S6b = (f: number) => { const c = slide(msIn(GARY, 3.1, 1.58, -0.25), -BUBBLE_SLIDE); return dolly(c.pos, c.look, pushK(f, L(4, "March"), 0.002), { fov: 40, roll: 0.035 }); };
// --- 7 crickets: Gary's view of the front guests
const S7a = (f: number) => dolly([2.7, 2.15, -1.3], [-2.4, 1.15, 2.6], pushK(f, T0(7), 0.0028), { fov: 48 });
// --- 8 roll call: high wide, a slow orbit while the bubbles pop round the ring
const S8a = (f: number) => orbit(dolly([0, 6.6, 10.6], [0, 0.9, 0], pushK(f, T0(8), 0.002), { fov: 44 }), -0.25 + 0.0016 * (f - T0(8)));
// --- 9 Gary fans his winnings
const S9a = (f: number) => { const c = msIn(GARY, 1.95, 1.5, 0.22); return dolly(c.pos, c.look, pushK(f, T0(9), 0.003), { fov: 40, roll: 0.03 }); };
// --- 10 guest 17 MS, punch on "September" (the freeze holds this frame)
const S10a = (f: number) => { const c = slide(msIn(SEVENTEEN, 3.3, 1.62, -0.2), BUBBLE_SLIDE); return dolly(c.pos, c.look, pushK(f, T0(10), 0.0025) * pushK(f, SEP17, 0, 0.008, 16), { fov: 40, roll: 0.03 }); };
// --- 11 guest 9: one slow push-in while the hand goes up
const S11a = (f: number) => { const c = slide(msIn(NINE, 3.5, 1.62, 0), -BUBBLE_SLIDE); return dolly(c.pos, c.look, pushK(f, T0(11), 0.0025), { fov: 40 }); };
// --- 12 the match across the ring (high wide), then Dave CU on the sum
/** the whole ring in a vertical frame: ~9 m across needs ~19 m of distance at fov 46 */
const WIDE = (f: number, f0: number, rate = 0.0018): Shot => dolly([0, 12.6, 16.2], [0, 0.8, 0.6], pushK(f, f0, rate), { fov: 46 });
const S12a = (f: number) => orbit(WIDE(f, T0(12), 0.0024), 0.0012 * (f - T0(12)));
const S12b = (f: number) => { const c = msIn(DAVE, 1.9, 1.5, 0.2); return dolly(c.pos, c.look, pushK(f, L(9, "twenty-two"), 0.003, 0.006, 16), { fov: 38, roll: 0.03 }); };
// --- 13 Gary: "Here's what Gary missed" -> punch on "Your brain"
const S13a = (f: number) => { const c = msIn(GARY, 1.65, 1.5, 0.12); return dolly(c.pos, c.look, pushK(f, T0(13), 0.0035) * pushK(f, cue(10, "Your") - 2, 0, 0.009, 20), { fov: 38, roll: 0.06 }); };
// --- 14 golden: behind Gary, his 22 lines fan out
const S14a = (f: number) => { const g = G(GARY), o = inward(GARY); return dolly([g[0] - o[0] * 4.4, 4.4, g[2] - o[2] * 4.4], [g[0] + o[0] * 3.2, 0.55, g[2] + o[2] * 3.2], pushK(f, T0(14), 0.0022), { fov: 46 }); };
// --- 15 crane up to the web (keeps Gary's side of the ring nearest the lens: orbit -2.32 rad from the front)
const S15b = (f: number) => orbit(dolly([0, 13.2, 11.6], [0, 0.6, 0.0], pushK(f, T0(15), 0.0015), { fov: 44 }), -2.32 + 0.0014 * (f - T0(15)));
// --- 16 the web pulses, the coin
const S16a = (f: number) => dolly([0, 12.4, 10.6], [0, 1.2, 0.2], pushK(f, T0(16), 0.0018), { fov: 44 });
const S16b = (f: number) => dolly([0, 6.4, 6.6], [0, 4.1, 0], pushK(f, cue(13, "coin") - 12, 0.003, 0.006, 25), { fov: 42 });
// --- 17 the World Cup: stadium wide, dolly along the line-up, the matched pair
const P = PITCH;
const S17a = (f: number) => dolly([P[0] + 0.5, 9.5, P[2] + 26], [P[0], 1.6, P[2]], pushK(f, T0(17), 0.002), { fov: 44 });
const S17b = (f: number) => { const x = P[0] - 7.5 + 0.04 * (f - L(14, "squads")); return { pos: [x, 1.5, P[2] + 4.3] as V3, look: [x + 0.4, 1.32, P[2]] as V3, fov: 42 }; };
const S17c = (f: number) => { const a = SQUAD(CUP_PAIR[0]), b = SQUAD(CUP_PAIR[1]); return dolly([a[0] - 2.5, 1.62, a[2] + 2.4], [(a[0] + b[0]) / 2 - 1.2, 1.3, a[2]], pushK(f, L(14, "Half"), 0.0025), { fov: 40, roll: -0.03 }); };
// --- 18 the twist: Gary CU in the crowd, crane reveal on "two hundred fifty-three people", keeps rising on "way more"
const S18a = (f: number) => dolly([0.2, 1.52, 1.75], [0, 1.4, 0], pushK(f, T0(18), 0.0022), { fov: 40 });
const S18b = (f: number) => dolly([0.5, 17, 16.5], [0, 0.6, -0.5], pushK(f, L(15, "two") + 50, 0.0012), { fov: 46 });
const S18c = (f: number) => dolly([0.8, 31, 27], [0, 0.0, -0.5], pushK(f, L(16) + 40, 0.001), { fov: 46 });
// --- 19 the party at sunset: descend toward the ring, Dave CU winks on "Find your twin"
const S19a = (f: number) => dolly([0.4, 3.9, 8.4], [0, 1.4, -1.6], pushK(f, T0(19), 0.003), { fov: 44 });
const S19b = (f: number) => { const c = msIn(DAVE, 2.0, 1.5, 0.2); return dolly(c.pos, c.look, pushK(f, L(16, "Find"), 0.003, 0.006, 20), { fov: 38, roll: 0.03 }); };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 2, dur: 30, s: S1b }],
  2: [{ f: T0(2), s: S2a }],
  3: [{ f: T0(3), s: S3a }, { f: L(1, "Three") - 6, dur: 28, s: S3b }],
  4: [{ f: T0(4), s: S4a }, { f: L(2, "So"), cut: true, s: S4b }],
  5: [{ f: T0(5), s: S5a }],
  6: [{ f: T0(6), s: S6a }, { f: L(4, "March") - 10, dur: 22, s: S6b }],
  7: [{ f: T0(7), s: S7a }],
  8: [{ f: T0(8), s: S8a }],
  9: [{ f: T0(9), s: S9a }],
  10: [{ f: T0(10), s: S10a }],
  11: [{ f: T0(11), s: S11a }],
  12: [{ f: T0(12), s: S12a }, { f: L(9, "twenty-two"), cut: true, s: S12b }],
  13: [{ f: T0(13), s: S13a }],
  14: [{ f: T0(14) - 6, s: S14a }],
  15: [{ f: T0(15), s: S14a }, { f: T0(15), dur: 40, s: S15b }],
  16: [{ f: T0(16), s: S16a }, { f: cue(13, "coin") - 24, dur: 28, s: S16b }],
  17: [{ f: T0(17) - 6, s: S17a }, { f: L(14, "squads"), cut: true, s: S17b }, { f: L(14, "Half"), cut: true, s: S17c }],
  18: [{ f: T0(18) - 6, s: S18a }, { f: L(15, "two") - 6, dur: 56, s: S18b }, { f: L(16) - 4, dur: 60, s: S18c }],
  19: [{ f: T0(19) - 6, s: S19a }, { f: L(16, "Find"), cut: true, s: S19b }],
};

// impact kicks: sign flips every frame, decays over 7 f (frame, gain)
export const KICKS: [number, number][] = [[SLAP + 1, 0.8], [cue(3, "twenty-two"), 0.45], [MATCH_AT, 0.7], [cue(9, "twenty-two"), 0.6], [cue(10, "Your"), 0.45], [cue(15, "Same"), 0.5], [cue(16, "twin"), 0.6]];
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
  { f: 0, cInf: 8, focus: () => [0, 1.3, -2.0] },
  { f: 4, dur: 26, cInf: 0 },
  { f: T0(2), cInf: 12, focus: eyes(DAVE) },
  { f: T0(3), cInf: 0 },
  { f: T0(4), cInf: 12, focus: eyes(GARY) },
  { f: L(2, "So"), cInf: 0 },
  { f: T0(5), cInf: 12, focus: eyes(DAVE) },
  { f: T0(6), cInf: 12, focus: eyes(GARY) },
  { f: T0(7), cInf: 6 },
  { f: T0(8), cInf: 0 },
  { f: T0(9), cInf: 12, focus: eyes(GARY) },
  { f: T0(10), cInf: 12, focus: eyes(SEVENTEEN) },
  { f: T0(11), cInf: 12, focus: eyes(NINE) },
  { f: T0(12), cInf: 0 },
  { f: L(9, "twenty-two"), cInf: 12, focus: eyes(DAVE) },
  { f: T0(13), cInf: 14, focus: eyes(GARY) },
  { f: T0(14), cInf: 5, focus: () => [-0.7, 0.9, 1.0] },
  { f: T0(15), cInf: 0 },
  { f: cue(13, "coin") - 24, dur: 28, cInf: 6 },
  { f: T0(17), cInf: 0 },
  { f: L(14, "squads"), cInf: 10 },
  { f: L(14, "Half"), cInf: 7 },
  { f: T0(18), cInf: 13, focus: () => [0, EYE, 0] },
  { f: L(15, "two") - 6, dur: 40, cInf: 0 },
  { f: T0(19), cInf: 0 },
  { f: L(16, "Find"), cInf: 12, focus: eyes(DAVE) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
