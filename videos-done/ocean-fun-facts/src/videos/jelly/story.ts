// "The Jellyfish That Starts Over": shots cued from voice/words.json (frames at 30 fps).
// Captions sit at ~65 % height (y 1150-1370): subjects stay above them, ground / props below.
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, easeOut, easeIn, rnd, sprite, blinkAt, shadow, clamp01, lerp, smooth } from "../../lib/engine";
import {
  INKC, P, sky, cloud, underwater, specks, bubble, bubbleStream, room, questionMark, exclaim, burstBg, confetti,
  poly, line, ell, rr, lg, rg, seabed, rock, kelp, light, dark, rgba as rgbaC,
} from "../../lib/paint";
import { cueSheet } from "../../lib/cues";
import type { Word } from "../../lib/captions";
import words from "../../../videos/jelly/voice/words.json";
import {
  SCIENTIST, jelly, JellyOpts, polyp, PolypOpts, stolon, cyst, butterfly, cocoon, caterpillar, cell, badge, fish, worldMap, mapXY, pin,
  ship, dna, wrench, pinky, nameCard, stamp, cycleArrow, oneWaySign, plate, bandage, hourglass, cake, flag, tally,
} from "./actors";
import { bodyFront, Outfit, Expr } from "../../lib/toon";

const C = cueSheet(words as Word[]);
const { W: w, B } = C;
export const TOTAL = C.end + 30;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];
const WIDE: [number, number, number, number] = [-700, -700, 2900, H + 700];

const who = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, seed: number, opt: { expr?: Expr; facing?: -1 | 0 | 1; wave?: number; look?: number; tilt?: number } = {}) => {
  shadow(g, x, y, h * 0.2, 0.22);
  sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opt.expr ?? "neutral", mode: "stand", blink: blinkAt(f, seed), seed, facing: opt.facing ?? 0, wave: opt.wave, look: opt.look, tilt: opt.tilt }));
};
const J = (g: Ctx, x: number, y: number, o: JellyOpts, rot = 0) => at(g, x, y, 1, (gg) => jelly(gg, o), rot);
const PO = (g: Ctx, x: number, y: number, o: PolypOpts) => at(g, x, y, 1, (gg) => polyp(gg, o));
const MORTAL = { tint: "#c4d8ff", gut: "#5a78d8" };
const sparkle = (g: Ctx, x: number, y: number, r: number, col = "#fff6c0") => {
  poly(g, [[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]], col, 3);
};
const sparkles = (g: Ctx, cx: number, cy: number, rad: number, f: number, n = 8, seed = 5) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + f * 0.03, k = 0.5 + 0.5 * Math.sin(f * 0.25 + i * 1.7);
    sparkle(g, cx + Math.cos(a) * rad * (0.8 + 0.3 * rnd(seed, i)), cy + Math.sin(a) * rad * (0.8 + 0.3 * rnd(seed, i)), 14 + 16 * k);
  }
};
const lemniscate = (g: Ctx, x: number, y: number, s: number, prog = 1) => {
  const pts: P[] = [];
  for (let i = 0; i <= 80 * prog; i++) { const t = (i / 80) * Math.PI * 2, d = 1 + Math.sin(t) ** 2; pts.push([x + (s * Math.cos(t)) / d, y + (s * Math.sin(t) * Math.cos(t)) / d]); }
  if (pts.length > 1) { line(g, pts, INKC, 34); line(g, pts, "#ffd84a", 20); }
};
const poof = (g: Ctx, x: number, y: number, f: number, f0: number, r = 160) => {
  const t = f - f0;
  if (t < 0 || t > 16) return;
  const k = easeOut(t / 16);
  g.save(); g.globalAlpha = 1 - t / 16;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ell(g, x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.8 * k, 50 * (1 - k * 0.5), 44 * (1 - k * 0.5), "#ffffff", 4); }
  g.restore();
};

// ---------------- sets ----------------
const seaPaint = (top: string, bot: string, rays: number, seed: number) => (g: Ctx) => {
  underwater(g, BIG[0], BIG[1], BIG[2], BIG[3], top, bot, rays, seed);
  // soft distant reef: no ink, low contrast
  g.fillStyle = rgbaC(dark(bot, 0.25), 0.55);
  for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(-600 + i * 330, 2000 + rnd(seed, i) * 80, 260 + rnd(seed, i + 3) * 160, 180 + rnd(seed, i + 6) * 120, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = lg(g, 0, 1500, 0, BIG[3], [[0, rgbaC(bot, 0)], [1, rgbaC(dark(bot, 0.3), 0.7)]]); g.fillRect(BIG[0], 1500, BIG[2] - BIG[0], BIG[3] - 1500);
};
const SEA: Layer = { key: "sea", d: 0.35, bounds: BIG, res: 0.6, paint: seaPaint("#62c4ea", "#0f4478", 0.16, 4) };
const SEA_WARM: Layer = { key: "seaWarm", d: 0.35, bounds: BIG, res: 0.6, paint: seaPaint("#ffc27a", "#3a3f86", 0.2, 6) };
const DEEP: Layer = { key: "deep", d: 0.35, bounds: BIG, res: 0.6, paint: seaPaint("#2f78ae", "#071a36", 0.08, 8) };
const SNOW: Layer = { d: 0.7, draw: (g, f) => specks(g, BIG[0], BIG[1], BIG[2], BIG[3], 70, f, 9) };
const bedLayer = (key: string, y: number, sand = "#e2c896", seed = 5, bounds = BIG): Layer => ({ key, d: 1, bounds, res: 0.8, paint: (g) => {
  for (let i = 0; i < 9; i++) kelp(g, bounds[0] + 160 + i * ((bounds[2] - bounds[0] - 300) / 8) + rnd(seed, i) * 60, y + 30, 260 + rnd(seed, i + 2) * 260, i % 2 ? "#3f9a5a" : "#2f8a6a", 0, seed + i);
  seabed(g, bounds[0], bounds[2], y, bounds[3], sand, seed);
  for (let i = 0; i < 6; i++) rock(g, bounds[0] + 250 + i * ((bounds[2] - bounds[0] - 400) / 5) + rnd(seed, i + 9) * 80, y + 60 + rnd(seed, i) * 40, 110 + rnd(seed, i + 1) * 80, 70 + rnd(seed, i + 2) * 40, "#8a8a9a", seed + i * 3);
} });

const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

// ---------------- cues ----------------
const fOld0 = w("old", 0, 0), fStarts = w("starts"), fOver = w("over."), fImmortal = w("immortal", 0, 1), fSmaller = w("smaller"), fPinky = w("pinky"), fNail = w("nail.");
const fNormally = w("normally,"), fOneWay = w("one", 0, 2), fPolyp1 = w("polyp,"), fBuds1 = w("buds", 0, 3), fBaby1 = w("baby", 0, 3), fGrows = w("grows", 0, 3), fItEnd = w("it", 1, 3);
const fStarve = w("starve"), fHurt = w("hurt"), fOld1 = w("old", 0, 4);
const fShrinks = w("shrinks."), fTentacles = w("tentacles"), fIn = w("in", 0, 5), fSinks = w("sinks"), fBottom = w("bottom..."), fBlob = w("blob", 0, 5);
const fCouple = w("couple"), fRoots = w("roots..."), fBecomes = w("becomes"), fBaby2 = w("baby", 0, 6), fAgain = w("again.");
const fBuds2 = w("buds", 0, 7), fBrand = w("brand"), fLife = w("life", 0, 7), fReset = w("reset.");
const fButterfly = w("butterfly"), fCrawling = w("crawling"), fCocoon = w("chrysalis..."), fComing = w("coming"), fCaterpillar = w("caterpillar.");
const fTrick = w("trick?"), fSwitch = w("switch"), fJobs = w("jobs."), fSkin = w("skin"), fDifferent = w("different"), fCell2 = w("cell.");
const fJapan = w("japan,"), fKubota = w("kubota"), fWatched = w("watched"), fTen = w("ten"), fTimes = w("times..."), fTwo = w("two", 0, 10), fYears = w("years.");
const fLuckily = w("luckily,"), fNever = w("never", 0, 11);
const fUnluckily = w("unluckily..."), fSnack = w("snack.");
const fSpreading = w("spreading."), fScientists = w("scientists"), fThink = w("think"), fHitched = w("hitched"), fRides = w("rides"), fWorld = w("world"), fShips = w("ships'"), fBallast = w("ballast");
const f2022 = w("2022,"), fSpain = w("spain"), fRead = w("read"), fDNA = w("dna,"), fExtra = w("extra"), fCopies = w("copies"), fRepair = w("repair");
const fSomewhere = w("somewhere"), fNow = w("now..."), fJelly16 = w("jellyfish", 0, 15), fEleventh = w("eleventh"), fChildhood = w("childhood.");

// 1 HOOK: an old jellyfish with a cane... rewinds into a baby polyp
add(0, B(1), [SEA, SNOW, { d: 1, draw: (g, f) => {
  rock(g, 540, 1190, 380, 150, "#8a8a9a", 3);
  const spin = smooth(ramp(f, fStarts - 4, fOver + 2));
  if (f < fOver + 2) {
    const s = 1 - 0.85 * spin, bob = Math.sin(f * 0.08) * 14;
    if (spin > 0) cycleArrow(g, 540, 720, 300, -f * 0.35, "#7cff4f");
    J(g, 540, 760 + bob + spin * 300, { f, R: 175 * s, age: 1 - spin * 0.5, expr: spin > 0 ? "dizzy" : "old", cane: 1 - spin * 3, droop: 1, pulse: 0.5, seed: 2 }, spin * Math.PI * 4);
  }
  poof(g, 540, 1000, f, fOver - 2, 200);
  if (f >= fOver - 2) {
    const k = pop(f, fOver - 2, 10);
    PO(g, 540, 1130, { f, grow: k, expr: "baby", pacifier: pop(f, fOver + 6, 8), s: 1.15, seed: 4 });
    sparkles(g, 540, 860, 330, f, 8);
  }
} }], camKeys([{ f: 0, c: { z: 1.0, y: 960 }, creep: 0.0018 }, { f: fStarts, c: { z: 1.12, y: 900, r: 0.02 }, dur: 14 }]), { kicks: [fOver], bg: "#0f4478" });

// 2 MEET: the immortal jellyfish (name card)
add(B(1), fSmaller - 3, [SEA, SNOW, { d: 1, draw: (g, f) => {
  J(g, 540, 780 + Math.sin(f * 0.07) * 16, { f, R: 200, expr: f > fImmortal + 6 ? "proud" : "smile", seed: 3, blink: blinkAt(f, 3) });
  nameCard(g, 540, 1560, pop(f, fImmortal - 2, 9), "Turritopsis dohrnii", "THE IMMORTAL JELLYFISH");
} }], camKeys([{ f: B(1), c: { z: 1.05, y: 940 }, creep: 0.0018 }]), { bg: "#0f4478" });
// 2b smaller than your pinky nail
add(fSmaller - 3, B(2), [SEA, SNOW, { d: 1, draw: (g, f) => {
  const slide = easeOut(ramp(f, fSmaller - 3, fPinky + 4));
  at(g, 140 + (1 - slide) * 900, 860, 1, (gg) => pinky(gg, 1));
  J(g, 340, 610 + Math.sin(f * 0.1) * 6, { f, R: 40, expr: "happy", seed: 3, tent: 0.9 });
  if (f > fNail - 4) {
    const k = pop(f, fNail - 4, 8);
    g.save(); g.translate(340, 520); g.scale(k, k);
    line(g, [[-40, 0], [40, 0]], "#ffffff", 6); line(g, [[-40, -14], [-40, 14]], "#ffffff", 6); line(g, [[40, -14], [40, 14]], "#ffffff", 6);
    g.fillStyle = "#ffffff"; g.font = "900 54px CapFont"; g.textAlign = "center"; g.lineWidth = 10; g.strokeStyle = INKC; g.strokeText("4.5 mm", 0, -34); g.fillText("4.5 mm", 0, -34);
    g.restore();
  }
} }], camKeys([{ f: fSmaller - 3, c: { z: 1.0, x: 540, y: 960 }, creep: 0.001 }, { f: fNail - 2, c: { z: 1.45, x: 420, y: 760 }, dur: 18 }]), { bg: "#0f4478" });

// 3 NORMALLY: a regular jellyfish's life goes ONE WAY
add(B(2), B(3), [SEA, SNOW, { d: 1, draw: (g, f) => {
  const t = f - B(2);
  if (f > fOneWay - 6) at(g, 640, 330, pop(f, fOneWay - 6, 9), (gg) => oneWaySign(gg, 0, 0, 1));
  J(g, 260 + t * 3.2, 820 + Math.sin(f * 0.1) * 14, { f, R: 150, expr: "smile", seed: 5, ...MORTAL }, 0.12);
} }], camKeys([{ f: B(2), c: { z: 1.0, y: 900 }, creep: 0.0015 }]), { bg: "#0f4478" });

// 4 THE NORMAL LIFE: polyp on a rock buds a baby jelly -> it grows up -> THE END (one panning shot)
const babyPath = (f: number): [number, number, number] => {
  const u = clamp01((f - fBuds1 - 10) / Math.max(10, fItEnd - fBuds1 - 10));
  return [lerp(450, 1560, smooth(u)), lerp(780, 640, smooth(u)) + Math.sin(f * 0.1) * 12, lerp(56, 160, easeOut(ramp(f, fGrows - 4, fGrows + 30)))];
};
add(B(3), B(4), [{ key: "sea4", d: 0.35, bounds: WIDE, res: 0.5, paint: (g) => { underwater(g, WIDE[0], WIDE[1], WIDE[2], WIDE[3], "#62c4ea", "#0f4478", 0.16, 7); } }, SNOW,
  bedLayer("bed4", 1190, "#e2c896", 6, WIDE), { d: 1, draw: (g, f) => {
    rock(g, 330, 1200, 300, 140, "#8a8a9a", 2);
    const bud = f < fBuds1 - 4 ? 0 : f < fBuds1 + 10 ? easeOut(ramp(f, fBuds1 - 4, fBuds1 + 8)) : 0;
    PO(g, 330, 1080, { f, grow: 1, expr: f > fBuds1 + 10 ? "happy" : "smile", s: 1.0, buds: [bud], seed: 2, col: "#c8d8ff" });
    if (f >= fBuds1 + 10) {
      const [x, y, R] = babyPath(f), dead = easeIn(ramp(f, fItEnd - 2, fItEnd + 26));
      J(g, x, y + dead * 260, { f, R, expr: dead > 0.05 ? "sleepy" : R > 100 ? "proud" : "baby", seed: 6, ...MORTAL, alpha: 1 - dead * 0.85, age: dead, pulse: 1 - dead }, dead * 0.6);
    }
    if (f > fItEnd + 4) stamp(g, 1560, 470, pop(f, fItEnd + 4, 9), "THE END", "#2a2d36", -0.08);
  } }], camKeys([{ f: B(3), c: { z: 1.0, x: 540, y: 900 }, creep: 0.0006 }, { f: fGrows, c: { z: 1.0, x: 1460, y: 860 }, dur: 46 }]), { bg: "#0f4478" });

// 5 BUT: starve it, hurt it, or let it get old
add(B(4), B(5), [SEA, SNOW, { d: 1, draw: (g, f) => {
  const old = easeOut(ramp(f, fOld1 - 4, fOld1 + 10));
  const ex = f > fOld1 - 2 ? "old" : f > fHurt - 2 && f < fHurt + 14 ? "shock" : f > fStarve - 2 ? "sad" : "neutral";
  J(g, 540, 800 + Math.sin(f * 0.07) * 10, { f, R: 190, expr: ex, age: old, cane: old, droop: old, seed: 3 });
  if (f > fStarve - 4) plate(g, 230, 380, pop(f, fStarve - 4, 8) * 0.9);
  if (f > fHurt - 4) bandage(g, 610, 650, pop(f, fHurt - 4, 7) * 0.8, 0.5);
  if (f > fOld1 - 6) hourglass(g, 860, 380, pop(f, fOld1 - 6, 8) * 0.95, f);
} }], camKeys([{ f: B(4), c: { z: 1.0, y: 940 }, creep: 0.0015 }, { f: fHurt, c: { z: 1.06, y: 920 }, dur: 6 }, { f: fOld1, c: { z: 1.12, y: 900 }, dur: 8 }]), { kicks: [fHurt], bg: "#0f4478" });

// 6 IT SHRINKS, PULLS IN ITS TENTACLES, SINKS... AND TURNS INTO A BLOB
const BED6 = 1560;
const sinkY = (f: number) => lerp(760, BED6 - 40, easeIn(ramp(f, fSinks - 2, fBottom + 12)));
add(B(5), B(6), [DEEP, SNOW, bedLayer("bed6", BED6, "#c8b080", 8), { d: 1, draw: (g, f) => {
  const shrink = easeOut(ramp(f, fShrinks - 2, fShrinks + 14)), tent = 1 - 0.92 * smooth(ramp(f, fTentacles, fIn + 6));
  const toBlob = smooth(ramp(f, fBlob - 6, fBlob + 4));
  const y = sinkY(f);
  if (toBlob < 1) J(g, 540, y, { f, R: 190 * (1 - 0.4 * shrink), expr: f > fSinks ? "sleepy" : "sad", age: 1, tent, pulse: 0.4 * (1 - shrink), alpha: 1 - toBlob, sy: 1 - 0.4 * toBlob, seed: 3 });
  if (f > fSinks && f < fBottom + 14) bubbleStream(g, 540, y - 120, f, fSinks, { rate: 0.8, rise: 6, size: 8, seed: 3 });
  if (toBlob > 0) at(g, 540, BED6 + 10, 1, (gg) => cyst(gg, f, 1.2 * pop(f, fBlob - 6, 10), { expr: "sleepy" }));
} }], camKeys([{ f: B(5), c: { z: 1.0, y: 960 }, creep: 0.0012 }, { f: (fSinks + fBottom) / 2 + 6, c: { z: 1.05, y: 1420 }, dur: fBottom - fSinks + 20 }]), { kicks: [fBlob], bg: "#071a36" });

// 7 ROOTS... AND IT BECOMES A BABY POLYP AGAIN
add(B(6), B(7), [DEEP, SNOW, bedLayer("bed6", BED6, "#c8b080", 8), { d: 1, draw: (g, f) => {
  const glow = smooth(ramp(f, fBecomes - 6, fBaby2 + 10));
  stolon(g, 540, BED6 + 14, 460, easeOut(ramp(f, fRoots - 6, fRoots + 24)), 3);
  const grow = easeOut(ramp(f, fBecomes - 2, fBaby2 + 6));
  if (grow < 1) at(g, 540, BED6 + 10, 1, (gg) => cyst(gg, f, 1.2 * (1 - 0.7 * grow), { expr: f > fRoots ? "smile" : "sleepy" }));
  if (grow > 0) PO(g, 540, BED6 + 4, { f, grow, expr: "baby", pacifier: pop(f, fBaby2, 8), s: 1.25, seed: 5 });
  if (glow > 0) { g.save(); g.globalAlpha = glow * (0.6 + 0.4 * Math.sin(f * 0.2)); sparkles(g, 540, 1180, 300, f, 7); g.restore(); }
} }], camKeys([{ f: B(6), c: { z: 1.05, y: 1420 }, creep: 0.0012 }, { f: fBecomes, c: { z: 1.0, y: 1380 }, dur: 20 }]), { bg: "#071a36" });

// 8 IT BUDS BRAND NEW JELLYFISH. LIFE CYCLE: RESET
add(B(7), B(8), [SEA, SNOW, bedLayer("bed8", BED6, "#e2c896", 9), { d: 1, draw: (g, f) => {
  stolon(g, 540, BED6 + 14, 520, 1, 3);
  const xs = [260, 540, 820];
  xs.forEach((x, i) => {
    const b = easeOut(ramp(f, fBuds2 - 4 + i * 4, fBuds2 + 10 + i * 4));
    const released = f > fBrand + 2 + i * 4;
    PO(g, x, BED6 + 4, { f: f + i * 13, grow: i === 1 ? 1 : 0.85, expr: "happy", s: i === 1 ? 1.2 : 1.0, seed: 5 + i, buds: released ? [] : [b] });
    if (released) {
      const t = f - (fBrand + 2 + i * 4);
      J(g, x + (i - 1) * t * 1.6 + 30, BED6 - 300 - t * 7.5 - i * 20, { f: f + i * 7, R: Math.min(70, 34 + t * 1.2), expr: "happy", seed: 8 + i, tent: 0.8 });
    }
  });
  if (f > fReset - 4) { const k = pop(f, fReset - 4, 9); cycleArrow(g, 540, 880, 230 * k, -f * 0.12, "#7cff4f"); stamp(g, 540, 880, k, "RESET", "#ff4d5a", -0.12); }
} }], camKeys([{ f: B(7), c: { z: 1.0, y: 1380 }, creep: 0.0012 }, { f: fBrand + 10, c: { z: 1.0, y: 1180 }, dur: 30 }]), { kicks: [fReset], bg: "#0f4478" });

// 9 LIKE A BUTTERFLY CRAWLING BACK INTO ITS COCOON... AND COMING OUT A CATERPILLAR
const MEADOW: Layer = { key: "meadow", d: 0.4, bounds: BIG, res: 0.6, paint: (g) => {
  sky(g, BIG[0], BIG[1], BIG[2], 1500, "#5fa8e8", "#d8ecf8"); cloud(g, 200, 260, 1.1); cloud(g, 880, 160, 0.8, "#fff", "#cbd8ec", 3);
  ell(g, 920, 360, 90, 90, "#fff2b0", 0);
  for (let i = 0; i < 3; i++) { g.fillStyle = ["#9ad86a", "#7ac85a", "#5ab04a"][i]; g.beginPath(); g.ellipse(-200 + i * 700, 1520 + i * 60, 900, 260, 0, Math.PI, 0); g.fill(); }
  g.fillStyle = "#5ab04a"; g.fillRect(BIG[0], 1520, BIG[2] - BIG[0], BIG[3] - 1520);
} };
add(B(8), B(9), [MEADOW, { d: 1, draw: (g, f) => {
  // branch from the left with a leaf; cocoon hangs from it
  line(g, [[-200, 300], [420, 360], [760, 340]], INKC, 40); line(g, [[-200, 300], [420, 360], [760, 340]], "#8a5a3a", 30);
  poly(g, [[700, 340], [820, 290], [900, 330], [820, 380]], "#5ab04a", 5);
  const into = easeIn(ramp(f, fCrawling, fCocoon + 4));
  const wig = f > fCocoon && f < fCaterpillar ? 1 : 0;
  at(g, 560, 400, 1, (gg) => cocoon(gg, f, 1, wig));
  if (f > fCocoon - 8 && f < fCaterpillar) {
    // rewind badge
    g.save(); g.globalAlpha = 0.9; rr(g, 660, 560, 170, 90, 18, "rgba(255,255,255,0.85)", 5);
    poly(g, [[700, 605], [740, 575], [740, 635]], INKC, 0); poly(g, [[745, 605], [785, 575], [785, 635]], INKC, 0); g.restore();
  }
  if (into < 1) {
    const bx = lerp(-150, 560, smooth(ramp(f, fButterfly - 10, fCrawling + 6))) , by = lerp(820, 520, smooth(ramp(f, fButterfly - 10, fCrawling + 6))) + Math.sin(f * 0.3) * 20;
    at(g, lerp(bx, 560, into), lerp(by, 520, into), 1.0 * (1 - into * 0.9), (gg) => butterfly(gg, f, 1));
  }
  if (f >= fCaterpillar - 2) {
    const k = pop(f, fCaterpillar - 2, 9);
    at(g, 640, 960 - (1 - k) * 200, k, (gg) => caterpillar(gg, f, 1.2, "confused"));
    if (f > fCaterpillar + 8) questionMark(g, 780, 700, 160 * pop(f, fCaterpillar + 8, 7), "#ffd84a", 0.15);
  }
} }], camKeys([{ f: B(8), c: { z: 1.0, y: 900 }, creep: 0.0015 }, { f: fCaterpillar, c: { z: 1.1, x: 600, y: 860 }, dur: 10 }]), { kicks: [fCaterpillar], bg: "#5fa8e8" });

// 10 ITS CELLS CAN SWITCH JOBS: a skin cell turns into a nerve cell
const SCOPE: Layer = { key: "scope", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => {
  g.fillStyle = "#14101e"; g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
  g.fillStyle = rg(g, 540, 760, 100, 760, [[0, "#e6f6ea"], [0.85, "#bfe2cc"], [1, "#2a3a34"]]);
  g.beginPath(); g.arc(540, 760, 740, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 40; i++) ell(g, 540 + (rnd(3, i) - 0.5) * 1200, 760 + (rnd(4, i) - 0.5) * 1200, 10 + rnd(5, i) * 24, 6 + rnd(6, i) * 12, "rgba(120,180,150,0.18)", 0);
} };
add(B(9), B(10), [SCOPE, { d: 1, draw: (g, f) => {
  const sw = ramp(f, fSwitch - 2, fJobs + 8);
  const neu = smooth(ramp(f, fDifferent - 4, fCell2 + 4));
  const side = (x: number, y: number, k: number, a: string, b: string, ca: string, cb: string, seed: number) => {
    cell(g, f + seed * 7, 120, sw < 0.5 ? ca : cb, sw > 0 && sw < 1 ? "dizzy" : "smile", 0, seed);
    badge(g, x, y + 190, sw < 0.5 ? a : b, sw < 0.5 ? ca : cb, sw);
  };
  g.save(); g.translate(255, 640); side(0, 0, 0, "MUSCLE", "GUT", "#e86a5a", "#f2a23a", 2); g.restore();
  g.save(); g.translate(825, 640); side(0, 0, 0, "GUT", "MUSCLE", "#f2a23a", "#e86a5a", 4); g.restore();
  g.save(); g.translate(540, 820);
  cell(g, f, 150, neu > 0.5 ? "#a98ae8" : "#f4b88a", f > fDifferent - 4 && neu < 1 ? "shock" : neu >= 1 ? "proud" : "smile", neu, 6);
  badge(g, 0, 260, neu < 0.5 ? "SKIN" : "NEW JOB", neu < 0.5 ? "#e8905a" : "#7a5ac9", neu);
  g.restore();
} }], camKeys([{ f: B(9), c: { z: 1.0, y: 900 }, creep: 0.0012 }, { f: fSkin, c: { z: 1.2, x: 540, y: 950 }, dur: 16 }]), { bg: "#14101e" });

// 11 IN JAPAN, SHIN KUBOTA WATCHED ONE DO THIS TEN TIMES IN UNDER TWO YEARS
const LAB: Layer = { key: "lab", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  room(g, BIG[0], BIG[2], 1500, BIG[3], "#cfe2dc", "#9aa8b0", 540, BIG[1]);
  rr(g, 40, 180, 560, 420, 14, "#fbfbf6", 8, "#8a8f98"); // whiteboard
  rr(g, 520, 760, 520, 26, 6, "#8a6a4a", 5); // shelf
} };
const kubotaCount = (f: number) => Math.max(0, Math.min(10, Math.floor((f - fWatched) / Math.max(1, (fTimes + 4 - fWatched) / 10)) + 1));
add(B(10), B(11), [LAB, { d: 1, draw: (g, f) => {
  if (f > fJapan - 4) flag(g, 700, 250, pop(f, fJapan - 4, 8) * 0.65, "japan");
  const n = f < fWatched ? 0 : kubotaCount(f);
  tally(g, 110, 390, n, 0.95);
  // dish on the shelf with the tiny jellyfish cycling: jelly <-> polyp on every count
  rr(g, 600, 640, 360, 120, 20, "rgba(170,225,245,0.55)", 6);
  const phase = n % 2;
  if (phase === 0) J(g, 780, 690, { f, R: 42, expr: "happy", seed: 4, tent: 0.7 });
  else PO(g, 780, 752, { f, grow: 0.5, expr: "baby", s: 0.75, seed: 4 });
  if (n > 0) { const t0 = Math.round(fWatched + (n - 1) * ((fTimes + 4 - fWatched) / 10)); if (f - t0 < 5) sparkle(g, 860, 650, 26 * (1 - (f - t0) / 5) + 8); }
  // calendar 2009 -> 2011
  const yr = f < fTwo - 2 ? "2009" : "2011";
  rr(g, 790, 190, 200, 190, 12, "#ffffff", 6); rr(g, 790, 190, 200, 50, 12, "#e8322e", 6);
  g.fillStyle = INKC; g.font = "900 64px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(yr, 890, 312);
  who(g, SCIENTIST, 300, 2180, 1000, f, 21, { expr: n >= 10 ? "grin" : n > 4 ? "smile" : "neutral", facing: 1, look: 0.6 });
} }], camKeys([{ f: B(10), c: { z: 1.0, y: 960 }, creep: 0.0012 }, { f: fTen, c: { z: 1.1, x: 560, y: 930 }, dur: 14 }]), { bg: "#cfe2dc" });

// 12 LUCKILY, IT NEVER DIES OF OLD AGE
add(B(11), B(12), [SEA, SNOW, { d: 1, draw: (g, f) => {
  lemniscate(g, 540, 330, 230, easeOut(ramp(f, fNever - 6, fNever + 16)));
  J(g, 540, 860 + Math.sin(f * 0.08) * 12, { f, R: 190, expr: "proud", halo: pop(f, fLuckily, 8), seed: 3 });
  sparkles(g, 540, 760, 320, f, 9);
} }], camKeys([{ f: B(11), c: { z: 1.0, y: 940 }, creep: 0.002 }]), { bg: "#0f4478" });

// 13 UNLUCKILY... IT'S STILL A SNACK
add(B(12), B(13), [SEA, SNOW, { d: 1, draw: (g, f) => {
  const fx = lerp(1700, 700, easeIn(ramp(f, fUnluckily + 4, fSnack)));
  const open = f < fSnack - 2 ? clamp01((f - fUnluckily - 8) / 10) : f < fSnack + 3 ? 1 - (f - fSnack + 2) / 5 : 0;
  if (f < fSnack + 1) J(g, 460, 820 + Math.sin(f * 0.1) * 8, { f, R: 150, expr: f > fUnluckily + 6 ? "shock" : "proud", look: 1, halo: 1 - ramp(f, fUnluckily, fUnluckily + 10), seed: 3 });
  at(g, fx + (f > fSnack ? 0 : 0), 820, 1.15, (gg) => fish(gg, f, 1, open, f > fSnack + 2 ? "happy" : "determined"));
  if (f > fSnack + 6) { bubble(g, 330, 650 - (f - fSnack) * 3, 30); bubble(g, 290, 600 - (f - fSnack) * 4, 18); }
} }], camKeys([{ f: B(12), c: { z: 1.0, y: 940 }, creep: 0.0015 }]), { kicks: [fSnack], kickAmp: 30, bg: "#0f4478" });

// 14 IT'S SPREADING: hitched rides around the world in ships' ballast water
const PINS: { ll: [number, number]; f: number }[] = [
  { ll: [12.5, 42], f: fSpreading }, { ll: [-3.7, 40.4], f: fScientists }, { ll: [-81, 27.5], f: fThink }, { ll: [-80, 9], f: fHitched }, { ll: [138, 36], f: fRides },
];
const MAPBG: Layer = { key: "mapbg", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => {
  g.fillStyle = lg(g, 0, BIG[1], 0, BIG[3], [[0, "#10264a"], [0.62, "#173a6a"], [0.63, "#9fd0f0"], [1, "#2a7ab8"]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
} };
add(B(13), B(14), [MAPBG, { d: 1, draw: (g, f) => {
  worldMap(g, 40, 300, 1000);
  // routes between the pins, drawn as they appear
  for (let i = 1; i < PINS.length; i++) {
    const k = ramp(f, PINS[i].f - 4, PINS[i].f + 6);
    if (k <= 0) continue;
    const [ax, ay] = mapXY(PINS[i - 1].ll[0], PINS[i - 1].ll[1], 40, 300, 1000), [bx, by] = mapXY(PINS[i].ll[0], PINS[i].ll[1], 40, 300, 1000);
    g.save(); g.setLineDash([14, 12]);
    if (PINS[i].ll[0] - PINS[i - 1].ll[0] > 180) {
      // the long way round is over land: go west across the Pacific instead (leave the map's left edge, re-enter on the right)
      const [ex, ey] = mapXY(-180, 18, 40, 300, 1000), [rx, ry] = mapXY(180, 22, 40, 300, 1000);
      const k1 = clamp01(k * 2), k2 = clamp01(k * 2 - 1);
      line(g, [[ax, ay], [lerp(ax, ex, k1), lerp(ay, ey, k1)]], "#ffffff", 5);
      if (k2 > 0) line(g, [[rx, ry], [lerp(rx, bx, k2), lerp(ry, by, k2)]], "#ffffff", 5);
    } else line(g, [[ax, ay], [lerp(ax, bx, k), lerp(ay, by, k)]], "#ffffff", 5);
    g.restore();
  }
  PINS.forEach((p) => { const [x, y] = mapXY(p.ll[0], p.ll[1], 40, 300, 1000); pin(g, x, y, pop(f, p.f - 2, 8) * 0.8); });
  // the ship under the captions
  const sx = lerp(330, 760, ramp(f, B(13), B(14)));
  at(g, sx, 1650, 0.85, (gg) => ship(gg, f, 1, easeOut(ramp(f, fShips - 4, fShips + 8)), ramp(f, fBallast - 2, fBallast + 14)));
  for (let i = 0; i < 16; i++) { const x = -100 + i * 90 + (f * 1.5) % 90; g.beginPath(); g.moveTo(x, 1712); g.quadraticCurveTo(x + 45, 1696, x + 90, 1712); g.lineWidth = 5; g.strokeStyle = "rgba(255,255,255,0.7)"; g.stroke(); }
} }], camKeys([{ f: B(13), c: { z: 1.0, y: 960 }, creep: 0.0009 }]), { bg: "#10264a" });

// 15 IN 2022, RESEARCHERS IN SPAIN READ ITS DNA: EXTRA COPIES OF GENES THAT REPAIR IT
const DNABG: Layer = { key: "dnabg", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => {
  g.fillStyle = lg(g, 0, BIG[1], 0, BIG[3], [[0, "#2a1a5a"], [1, "#0e0a24"]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
  for (let i = 0; i < 70; i++) ell(g, BIG[0] + rnd(7, i) * (BIG[2] - BIG[0]), BIG[1] + rnd(8, i) * (BIG[3] - BIG[1]), 3 + rnd(9, i) * 5, 3 + rnd(9, i) * 5, "rgba(180,160,255,0.25)", 0);
} };
add(B(14), B(15), [DNABG, { d: 1, draw: (g, f) => {
  const show = pop(f, B(14) + 2, 12);
  const hot = f > fExtra - 2 ? [3, 7, 14] : [];
  if (show > 0) at(g, 540, 640, show * (1 + 0.06 * Math.max(0, 1 - Math.abs(f - fDNA) / 6)), (gg) => dna(gg, 0, -430, 430, f, 150, hot, easeOut(ramp(f, fRepair, fRepair + 12))));
  if (f > fDNA - 2 && f < fDNA + 14) { g.save(); g.globalAlpha = 1 - (f - fDNA + 2) / 16; sparkles(g, 540, 640, 300, f, 8); g.restore(); }
  // duplicated gene blocks pop out next to the helix
  if (f > fCopies - 4) [[-330, 330], [330, 520], [-330, 840]].forEach(([dx, y], i) => {
    const k = pop(f, fCopies - 4 + i * 3, 8);
    g.save(); g.translate(540 + dx, y); g.scale(k, k);
    rr(g, -70, -26, 140, 52, 14, "#ffd84a", 5); g.fillStyle = INKC; g.font = "900 40px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("x2", 0, 3);
    g.restore();
  });
  if (f > fRepair - 8) { const k = pop(f, fRepair - 8, 7); wrench(g, 760, 640 + 430 * (11 / 17 - 0.5) * 2 - 30, k * 0.9, -0.9 + Math.sin(Math.max(0, f - fRepair) * 0.8) * 0.25); }
  // 2022 + Spain tag under the captions
  if (f > f2022 - 4) {
    const k = pop(f, f2022 - 4, 9);
    g.save(); g.translate(470, 1580); g.scale(k, k);
    rr(g, -260, -80, 520, 160, 26, "#f4ecd2", 7);
    g.fillStyle = INKC; g.font = "900 96px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("2022", 0, 6);
    g.restore();
    if (f > fSpain - 4) flag(g, 870, 1560, pop(f, fSpain - 4, 8) * 0.6, "spain");
  }
  J(g, 150, 990, { f, R: 60, expr: f > fRepair ? "proud" : "smile", seed: 3, tent: 0.8 });
} }], camKeys([{ f: B(14), c: { z: 1.0, y: 960 }, creep: 0.0012 }, { f: fExtra, c: { z: 1.08, y: 900 }, dur: 12 }]), { bg: "#2a1a5a" });

// 16 SOMEWHERE OUT THERE... A JELLYFISH IS STARTING ITS ELEVENTH CHILDHOOD
add(B(15), TOTAL, [SEA_WARM, SNOW, bedLayer("bedEnd", 1120, "#f0c890", 11), { d: 1, draw: (g, f) => {
  rock(g, 420, 1140, 260, 110, "#9a8a9a", 5);
  PO(g, 420, 1060, { f, grow: 1, expr: f > fChildhood - 4 ? "happy" : "baby", s: 1.1, party: pop(f, fChildhood - 6, 9), pacifier: f < fChildhood - 6 ? 1 : 0, seed: 6 });
  rock(g, 790, 1080, 300, 100, "#9a8a9a", 7);
  if (f > fEleventh - 6) cake(g, 790, 1010, pop(f, fEleventh - 6, 9) * 0.8, f);
  if (f > fChildhood - 4) confetti(g, -40, 1120, -60, f, fChildhood - 4, 90);
  // a few grown jellies drifting far behind
  for (let i = 0; i < 3; i++) J(g, 160 + i * 380 + Math.sin(f * 0.02 + i) * 30, 330 + i * 70 - (f - B(15)) * 0.6, { f: f + i * 11, R: 46, expr: "happy", seed: 12 + i, alpha: 0.75, tent: 0.8 });
} }], camKeys([{ f: B(15), c: { z: 1.0, y: 960 }, creep: 0.0015 }, { f: fEleventh, c: { z: 1.1, x: 600, y: 900 }, dur: 20 }]), { kicks: [fChildhood], kickAmp: 14, bg: "#ffc27a" });

export const story: Story = { total: TOTAL, shots, flashes: [B(1) - 4], vignette: 0.3, xfade: { 2: 0, 3: 8, 4: 8, 5: 8, 6: 8, 8: 6, 9: 8, 10: 8, 11: 8, 12: 8, 13: 6, 14: 8, 15: 8, 16: 10 } };
void [fNormally, fPolyp1, fBaby1, fBottom, fCouple, fAgain, fLife, fComing, fTrick, fKubota, fYears, fRead, fSomewhere, fNow, fJelly16, H, exclaim, burstBg, light, sky];
