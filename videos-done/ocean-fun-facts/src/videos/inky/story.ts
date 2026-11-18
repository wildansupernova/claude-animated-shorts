// "Inky's Great Escape": shots cued from voice/words.json (frames at 30 fps).
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, easeOut, rnd, sprite, blinkAt, shadow, clamp01, pw } from "../../lib/engine";
import {
  INKC, P, sky, cloud, seaSurface, horizonGlow, underwater, specks, bubble, room, questionMark, burstBg, stars, confetti,
  poly, line, ell, rr, lg, rg, blob, smoothOpen, seabed, rock, kelp,
} from "../../lib/paint";
import { cueSheet } from "../../lib/cues";
import type { Word } from "../../lib/captions";
import words from "../../../videos/inky/voice/words.json";
import { KEEPER, KEEPER2, FISHER, octopus, OctoOpts, tankBox, drain, rugbyBall, jar, puzzleCube, jellyBag } from "./actors";
import { bodyFront, Outfit, Expr } from "../../lib/toon";

const C = cueSheet(words as Word[]);
const { W: w, B } = C;
export const TOTAL = C.end + 24;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];

const who = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, seed: number, opt: { expr?: Expr; facing?: -1 | 0 | 1; wave?: number; look?: number; tilt?: number } = {}) => {
  shadow(g, x, y, h * 0.2, 0.22);
  sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opt.expr ?? "neutral", mode: "stand", blink: blinkAt(f, seed), seed, facing: opt.facing ?? 0, wave: opt.wave, look: opt.look, tilt: opt.tilt }));
};
const octo = (g: Ctx, x: number, y: number, s: number, o: OctoOpts = {}, rot = 0) => at(g, x, y, s, (gg) => octopus(gg, o), rot);
const BLOTCHY = "#9a6a4a";

// ---------------- sets ----------------
const hallPaint = (g: Ctx, night: boolean) => {
  room(g, BIG[0], BIG[2], 1480, BIG[3], night ? "#1f2a4a" : "#3f5a8a", night ? "#2a3040" : "#5a6a7a", 540, BIG[1]);
  for (let i = 0; i < 4; i++) { const x = -500 + i * 560; rr(g, x, 300, 420, 520, 10, lg(g, 0, 300, 0, 820, [[0, night ? "#1f5a8a" : "#4fb2d8"], [1, night ? "#0f2a4a" : "#1f6a9a"]]), 6); }
  for (let i = 0; i < 12; i++) ell(g, -400 + i * 190, 1560 + (i % 3) * 120, 60, 12, night ? "rgba(120,160,220,0.12)" : "rgba(255,255,255,0.15)", 0);
};
const HALL_N: Layer = { key: "hallN", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => hallPaint(g, true) };
const HALL_D: Layer = { key: "hallD", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => hallPaint(g, false) };
const NIGHT_TINT: Layer = { screen: true, op: "multiply", draw: (g) => { g.fillStyle = "rgba(70,90,170,0.55)"; g.fillRect(0, 0, W, H); } };
const tankGlow = (g: Ctx, x: number, y: number, r: number) => { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, x, y, 0, r, [[0, "rgba(90,200,255,0.35)"], [1, "rgba(90,200,255,0)"]]); g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); };
const SEA_N: Layer = { key: "seaN", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => {
  sky(g, BIG[0], BIG[1], BIG[2], 900, "#0c1636", "#2a3a6e"); stars(g, BIG[0], BIG[1], BIG[2], 820, 120, 4);
  ell(g, 820, 360, 80, 80, "#fff6d6", 0);
  seaSurface(g, BIG[0], BIG[2], 900, 1200, "#1a2c58", "#0e1a3a", 6, "rgba(200,220,255,0.3)");
  underwater(g, BIG[0], 1200, BIG[2], BIG[3], "#1d4f80", "#06152b", 0.1, 5);
} };

const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

const fPrison = w("prison"), fNobody = w("nobody"), fInky = w("Inky,"), fFisher = w("Fishermen"), fHome = w("home."), fToo = w("too");
const fCrack = w("crack."), fNeeds = w("needs."), fSqueeze = w("squeezes"), fSlides = w("slides"), fCross = w("crosses"), fDrain = w("drain"), fPours = w("pours");
const fPipe = w("pipe", 0), fOcean = w("ocean."), fMorning = w("morning,"), fEmpty = w("empty"), fWet = w("wet"), fWait = w("wait..."), fRugby = w("rugby"), fSix = w("six-inch");
const fNo = w("no", 0, 11), fAll = w("at", 0, 11), fBeak = w("beak."), fFits = w("fits"), fFollow = w("follow."), fJelly = w("jelly..."), fBrain = w("brain.");
const fJars = w("jars,"), fPuzzles = w("puzzles,"), fFaces = w("faces."), fNever = w("never"), fBlotchy = w("blotchy?"), fStayed = w("stayed"), fArtists = w("artists.");

// 1 HOOK: prison break in the dark aquarium
add(0, fNobody - 2, [HALL_N, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1300, 640, 460, 0.6);
  tankGlow(g, 540, 1080, 520);
  const out = easeOut(ramp(f, fPrison - 10, fPrison + 30));
  octo(g, 300 + out * 80, 820 + out * 40, 0.75, { f, expr: "sly", look: -0.6, sy: 1 - 0.15 * Math.sin(f * 0.2) }, -0.2);
  // prison searchlight sweeping the hall
  g.save(); g.globalCompositeOperation = "lighter";
  const a = Math.sin(f * 0.05) * 0.6;
  g.fillStyle = lg(g, 540, -300, 540, 1800, [[0, "rgba(255,250,210,0.4)"], [1, "rgba(255,250,210,0.02)"]]);
  g.beginPath(); g.moveTo(520, -300); g.lineTo(560, -300); g.lineTo(560 + Math.sin(a) * 1600 + 260, 1800); g.lineTo(560 + Math.sin(a) * 1600 - 260, 1800); g.closePath(); g.fill();
  g.restore();
} }, NIGHT_TINT], camKeys([{ f: 0, c: { z: 1.0, y: 1000 }, creep: 0.002 }, { f: fPrison, c: { z: 1.2, x: 420, y: 900, r: -0.02 }, dur: 12 }]), { bg: "#1f2a4a" });
add(fNobody - 2, B(1), [HALL_N, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1300, 640, 460, 0.6); tankGlow(g, 540, 1080, 520);
  for (let i = 0; i < 8; i++) ell(g, 700 + i * 60, 1560 + Math.sin(i) * 20, 22, 9, "rgba(140,200,255,0.55)", 0);
} }, NIGHT_TINT], camKeys([{ f: fNobody - 2, c: { z: 1.0, y: 1050 }, creep: 0.0012 }]), { bg: "#1f2a4a" });

// 2 MEET INKY
add(B(1), B(2), [HALL_D, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1450, 820, 680, 0);
  octo(g, 540, 1180, 1.2, { f, expr: f > fInky + 10 ? "happy" : "curious", look: Math.sin(f * 0.05) });
  rr(g, 400, 1530, 280, 70, 8, "#f4ecd2", 5); g.fillStyle = INKC; g.font = "900 52px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("INKY", 540, 1568);
} }], camKeys([{ f: B(1), c: { z: 1.0, y: 1150 }, creep: 0.0015 }]), { bg: "#3f5a8a" });

// 3 FISHERMEN FOUND HIM ON A REEF
add(B(2), fHome - 4, [{ key: "boatSea", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => { sky(g, BIG[0], BIG[1], BIG[2], 900, "#4f8fdc", "#e6f0f6"); cloud(g, 200, 300, 1); cloud(g, 900, 220, 0.8, "#fff", "#cbd8ec", 3); seaSurface(g, BIG[0], BIG[2], 900, BIG[3], "#4f8fc8", "#1f5f96", 3); horizonGlow(g, BIG[0], BIG[2], 900); } },
  { d: 1, draw: (g, f) => {
    // boat
    const bob = Math.sin(f * 0.1) * 8;
    who(g, FISHER, 420, 1500 + bob, 950, f, 61, { expr: "smile", facing: 1, wave: 0.6 });
    octo(g, 640, 860 + bob, 0.55, { f, expr: "shock", scars: true, arms: 0.8 });
    poly(g, [[-100, 1400 + bob], [1180, 1400 + bob], [1050, 1650 + bob], [0, 1650 + bob]], lg(g, 0, 1400, 0, 1650, [[0, "#c8573a"], [1, "#8a3a2a"]]), 7);
    line(g, [[-100, 1440 + bob], [1180, 1440 + bob]], "#f4f4f0", 8);
  } }], camKeys([{ f: B(2), c: { z: 1.0, y: 1150 }, creep: 0.0015 }]), { bg: "#4f8fdc" });
add(fHome - 4, B(3), [HALL_D, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1450, 820, 680, 0);
  octo(g, 540, 1180, 1.2, { f, expr: "happy", scars: true });
  for (let i = 0; i < 5; i++) { const k = pop(f, fHome + i * 3, 6); ell(g, 300 + i * 120, 600 - (i % 2) * 60, 26 * k, 26 * k, "#ff7ad9", 4); }
} }], camKeys([{ f: fHome - 4, c: { z: 1.05, y: 1150 }, creep: 0.0015 }]), { bg: "#3f5a8a" });

// 4 CURIOUS, A LITTLE TOO CURIOUS (face squished on the glass)
add(B(3), B(4), [HALL_D, { d: 1, draw: (g, f) => {
  const squish = f >= fToo - 4;
  tankBox(g, 540, 1700, 1000, 1100, 0);
  octo(g, 540, 1200, squish ? 1.9 : 1.4, { f, expr: squish ? "happy" : "curious", sx: squish ? 1.25 : 1, sy: squish ? 0.86 : 1, look: Math.sin(f * 0.08) });
  if (squish) { g.save(); g.globalAlpha = 0.5; for (let i = 0; i < 8; i++) ell(g, 380 + (i % 4) * 110, 1300 + Math.floor(i / 4) * 80, 22, 22, "#f7c8a8", 3); g.restore(); line(g, [[100, 600], [140, 1600]], "rgba(255,255,255,0.4)", 14); }
} }], camKeys([{ f: B(3), c: { z: 1.0, y: 1100 }, creep: 0.0015 }, { f: fToo, c: { z: 1.15, y: 1080, r: 0.03 }, dur: 6 }]), { kicks: [fToo], bg: "#3f5a8a" });

// 5 ONE NIGHT: the lid left open just a crack
add(B(4), B(5), [HALL_N, { d: 1, draw: (g, f) => {
  const t = f - B(4);
  tankBox(g, 540, 1500, 900, 800, f > fCrack - 10 ? 0.25 : 0); tankGlow(g, 540, 1100, 700);
  if (t < 50) who(g, KEEPER, 300 - t * 9, 1780, 1000, f, 71, { expr: "smile", facing: -1 });
  octo(g, 640, 1250, 0.9, { f, expr: f > fCrack ? "sly" : "sleepy", look: -0.5 });
  if (f > fCrack - 4) { const k = pop(f, fCrack - 4, 8); g.save(); g.translate(1030, 690); g.scale(k, k); poly(g, [[-60, -60], [60, 0], [-60, 60]], "#ffe14d", 6); g.restore(); }
} }, NIGHT_TINT], camKeys([{ f: B(4), c: { z: 1.0, y: 1100 }, creep: 0.0012 }, { f: fCrack - 6, c: { z: 1.4, x: 900, y: 760 }, dur: 14 }]), { bg: "#1f2a4a" });

// 6 THAT'S ALL HE NEEDS
add(B(5), B(6), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#2a3a7a", "#1f2a5a", 20, f * 0.004) }, { d: 1, draw: (g, f) => {
  octo(g, 540, 1150, 2.0, { f, expr: "determined", reach: easeOut(ramp(f, fNeeds - 10, fNeeds + 6)) });
} }], camKeys([{ f: B(5), c: { z: 1.0, y: 1000 }, creep: 0.004 }]), { kicks: [fNeeds], bg: "#1f2a5a" });

// 7 SQUEEZE, SLIDE, CROSS THE FLOOR (one travelling shot)
const escapePos = (f: number): [number, number, number, number] => {
  // x, y, sx, sy along the route: over the tank rim -> down the glass -> across the floor to the drain
  const x = pw([[B(6), 520], [fSlides, 700], [fCross, 860], [B(7) + 10, 1500], [fPours, 2050]], f);
  const y = pw([[B(6), 760], [fSqueeze + 8, 700], [fSlides, 760], [fCross, 1500], [B(7) + 10, 1560], [fPours, 1560]], f);
  const sq = f >= fSqueeze && f < fSqueeze + 16 ? 0.45 : 1;
  return [x, y, 1 / Math.sqrt(sq), sq];
};
add(B(6), B(8), [{ key: "hallWide", d: 0.5, bounds: [-700, -700, 3000, H + 700], res: 0.7, paint: (g) => {
  room(g, -700, 3000, 1480, H + 700, "#1f2a4a", "#2a3040", 1200, -700);
  for (let i = 0; i < 6; i++) { const x = -400 + i * 600; rr(g, x, 300, 420, 520, 10, lg(g, 0, 300, 0, 820, [[0, "#1f5a8a"], [1, "#0f2a4a"]]), 6); }
} }, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1460, 700, 700, 0.25); tankGlow(g, 540, 1100, 600);
  drain(g, 2050, 1600, 70);
  const [x, y, sx, sy] = escapePos(f);
  // wet trail behind him
  for (let t = B(6) + 20; t < f; t += 3) { const [tx, ty] = escapePos(t); if (ty > 1400) ell(g, tx, ty + 40, 26, 8, "rgba(140,200,255,0.5)", 0); }
  if (f < fPours) octo(g, x, y, 0.8, { f, expr: f > fDrain ? "happy" : "determined", sx, sy, arms: 0.9 });
  else { const k = clamp01((f - fPours) / 20); octo(g, 2050, 1560 + k * 40, 0.8, { f, expr: "happy", sx: 1 - 0.75 * k, sy: 1 + 0.5 * k, arms: 1 - 0.6 * k }); }
} }, NIGHT_TINT], camKeys([{ f: B(6), c: { z: 1.0, x: 620, y: 1000 }, creep: 0.0008 },
  { f: fCross, c: { z: 1.0, x: 900, y: 1200 }, dur: 30 }, { f: fDrain, c: { z: 1.0, x: 1700, y: 1250 }, dur: 40 }, { f: fPours, c: { z: 1.25, x: 2000, y: 1300 }, dur: 20 }]), { bg: "#1f2a4a" });

// 8 FIFTY METERS OF PIPE INTO THE OCEAN
add(B(8), B(9), [SEA_N, { d: 1, draw: (g, f) => {
  // diagonal pipe from top-left down to the sea
  const u = clamp01((f - B(8)) / Math.max(10, fOcean - B(8)));
  line(g, [[-300, 300], [700, 1300]], INKC, 120); line(g, [[-300, 300], [700, 1300]], "#7a8a9a", 104); line(g, [[-300, 300], [700, 1300]], "#5d6a7a", 40);
  if (u < 1) octo(g, -300 + u * 1000, 300 + u * 1000, 0.32, { f, expr: "happy", sx: 0.6, sy: 1.4, arms: 0.6 }, -0.8);
  else {
    const t = f - fOcean;
    octo(g, 760 + t * 4, 1400 + t * 2, 0.5, { f, expr: "happy" });
    for (let i = 0; i < 10; i++) bubble(g, 720 + rnd(i, 1) * 120, 1350 - ((t * 4 + i * 20) % 200), 8 + rnd(i, 2) * 10);
  }
} }], camKeys([{ f: B(8), c: { z: 1.0, x: 300, y: 800 }, creep: 0.0008 }, { f: fOcean - 10, c: { z: 1.0, x: 760, y: 1250 }, dur: 30 }]), { kicks: [fOcean], bg: "#0c1636" });

// 9 MORNING: an empty tank and a wet trail
add(B(9), B(10), [HALL_D, { d: 1, draw: (g, f) => {
  tankBox(g, 380, 1400, 560, 560, 0.25);
  for (let i = 0; i < 9; i++) ell(g, 560 + i * 70, 1560 + Math.sin(i) * 20, 26, 9, "rgba(120,180,240,0.55)", 0);
  drain(g, 1000, 1620, 50);
  who(g, KEEPER2, 820, 1700, 1000, f, 72, { expr: f > fEmpty ? "shock" : "neutral", facing: -1, wave: f > fWet ? 0.4 : undefined });
  if (f > fEmpty) questionMark(g, 380, 700, 200 * pop(f, fEmpty, 7), "#ffffff", -0.1);
} }], camKeys([{ f: B(9), c: { z: 1.0, y: 1100 }, creep: 0.0015 }, { f: fWet, c: { z: 1.1, x: 700, y: 1250 }, dur: 20 }]), { bg: "#3f5a8a" });

// 10 WAIT: a rugby ball through a six-inch pipe?
add(B(10), B(11), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 800, 2400, "#ffd84a", "#ffc93a", 22, f * 0.004) }, { d: 1, draw: (g, f) => {
  const kr = pop(f, fRugby - 4, 8), kp = pop(f, fSix - 4, 8);
  if (kr > 0) rugbyBall(g, 340, 1000, 1.3 * kr);
  if (kp > 0) at(g, 820, 1000, kp, (gg) => { ell(gg, 0, 0, 90, 90, "#2a2d36", 10); ell(gg, 0, 0, 70, 70, "#0e1018", 0); line(gg, [[-90, 140], [90, 140]], INKC, 6); line(gg, [[-90, 125], [-90, 155]], INKC, 6); line(gg, [[90, 125], [90, 155]], INKC, 6); gg.fillStyle = INKC; gg.font = "900 50px CapFont"; gg.textAlign = "center"; gg.fillText("6 IN", 0, 210); });
  questionMark(g, 560, 560, 220 * pop(f, fWait + 2, 7), "#ffffff", 0.1);
} }], camKeys([{ f: B(10), c: { z: 1.2, y: 950 }, creep: 0.001 }, { f: fWait + 4, c: { z: 1.0, y: 960 }, dur: 8 }]), { kicks: [fWait + 1], bg: "#ffd84a" });

// 11-12 NO BONES (x-ray), ONLY THE BEAK, THEN THE REST FOLLOWS THROUGH A RING
const XRAY: Layer = { key: "xray", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => { g.fillStyle = "#0f1f2a"; g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]); for (let x = BIG[0]; x < BIG[2]; x += 80) line(g, [[x, BIG[1]], [x, BIG[3]]], "rgba(120,220,255,0.08)", 2); } };
const beak = (g: Ctx, x: number, y: number, s: number) => { g.save(); g.translate(x, y); g.scale(s, s); poly(g, [[-30, -20], [30, -20], [10, 30], [0, 44], [-10, 30]], "#1d1b22", 5); poly(g, [[-30, -20], [0, -40], [30, -20]], "#3a3a44", 4); g.restore(); };
add(B(11), B(12), [XRAY, { d: 1, draw: (g, f) => {
  // a hand x-ray (bones) vs the octopus x-ray (nothing)
  g.save(); g.globalAlpha = 0.9;
  at(g, 300, 1000, 1, (gg) => { rr(gg, -120, -220, 240, 440, 60, "rgba(160,220,255,0.18)", 4, "rgba(160,220,255,0.6)"); for (let i = 0; i < 4; i++) { line(gg, [[-60 + i * 40, -40], [-70 + i * 44, -190]], "#e8f4ff", 14); } line(gg, [[0, -30], [0, 200]], "#e8f4ff", 18); line(gg, [[-30, -30], [-30, 200]], "#e8f4ff", 14); });
  g.restore();
  g.save(); g.globalAlpha = 0.55; octo(g, 760, 1080, 0.85, { f, col: "#7ac8e8", expr: "curious" }); g.restore();
  if (f > fNo) { const k = pop(f, fNo, 7); g.save(); g.translate(760, 900); g.scale(k, k); line(g, [[-120, -120], [120, 120]], "#e8322e", 22); line(g, [[120, -120], [-120, 120]], "#e8322e", 22); g.restore(); }
} }], camKeys([{ f: B(11), c: { z: 1.0, y: 960 }, creep: 0.0015 }, { f: fAll, c: { z: 1.1, x: 700, y: 980 }, dur: 8 }]), { bg: "#0f1f2a" });
add(B(12), B(13), [XRAY, { d: 1, draw: (g, f) => {
  const through = easeOut(ramp(f, fFits, fFollow + 10));
  // ring (the hole)
  ell(g, 540, 1000, 60, 60, null, 14, 0, "#ffd84a");
  const ox = 260 + through * 600;
  const sq = Math.abs(ox - 540) < 160 ? 0.35 : 1;
  g.save(); g.globalAlpha = 0.6; octo(g, ox, 1060, 0.7, { f, col: "#7ac8e8", expr: through > 0.5 ? "happy" : "curious", sx: sq, sy: 1 / Math.sqrt(sq), arms: sq < 1 ? 0.7 : 1 }, Math.PI / 2 * 0); g.restore();
  beak(g, ox, 1060, 1.3 + (f > fBeak - 6 && f < fBeak + 20 ? 0.6 * Math.sin((f - fBeak + 6) * 0.3) : 0));
  if (f > fBeak - 4 && f < fFits) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, ox, 1060, 0, 120, [[0, "rgba(255,240,120,0.6)"], [1, "rgba(255,240,120,0)"]]); g.fillRect(ox - 120, 940, 240, 240); g.restore(); }
} }], camKeys([{ f: B(12), c: { z: 1.0, y: 1000 }, creep: 0.0012 }]), { bg: "#0f1f2a" });

// 13 A BAG OF JELLY WITH A BRAIN
add(B(13), B(14), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#ff9ac0", "#ffb8d4", 22, f * 0.005) }, { d: 1, draw: (g, f) => {
  jellyBag(g, 540, 1200, 2.0, f);
  if (f > fBrain) for (let i = 0; i < 6; i++) { const k = pop(f, fBrain + i * 2, 6); ell(g, 200 + i * 140, 560 + (i % 2) * 70, 22 * k, 22 * k, "#ffffff", 4); }
} }], camKeys([{ f: B(13), c: { z: 1.0, y: 1000 }, creep: 0.002 }, { f: fBrain, c: { z: 1.15, y: 960 }, dur: 8 }]), { kicks: [fBrain], bg: "#ff9ac0" });

// 14 JARS, PUZZLES, FACES
add(B(14), B(15), [HALL_D, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1600, 1000, 1000, 0);
  if (f < fPuzzles - 4) { octo(g, 400, 1250, 1.0, { f, expr: "determined", reach: 0.6 }); jar(g, 760, 1500, 1.2, f > fJars ? easeOut(ramp(f, fJars, fJars + 10)) : 0); }
  else if (f < fFaces - 6) { octo(g, 400, 1250, 1.0, { f, expr: "curious", reach: 0.5 }); puzzleCube(g, 760, 1300, 1.1, f); }
  else {
    octo(g, 400, 1250, 1.0, { f, expr: "happy", reach: 0.8, look: 1 });
    who(g, KEEPER, 880, 1960, 1200, f, 71, { expr: "grin", facing: -1, wave: 0.7 });
  }
} }], camKeys([{ f: B(14), c: { z: 1.0, y: 1150 }, creep: 0.0015 }, { f: fPuzzles, c: { z: 1.08, y: 1150 }, dur: 6 }, { f: fFaces, c: { z: 1.0, x: 600, y: 1150 }, dur: 6 }]), { bg: "#3f5a8a" });

// 15 NEVER SEEN AGAIN: out into the moonlit sea
add(B(15), B(16), [SEA_N, { d: 1, draw: (g, f) => {
  const t = f - B(15);
  octo(g, 540 + t * 3, 1500 - t * 2, Math.max(0.15, 0.6 - t * 0.008), { f, expr: "happy" });
  for (let i = 0; i < 6; i++) bubble(g, 520 + t * 3 + rnd(i, 1) * 60, 1450 - t * 2 - ((t * 3 + i * 15) % 120), 6 + rnd(i, 2) * 6);
} }], camKeys([{ f: B(15), c: { z: 1.0, y: 1150 }, creep: -0.001 }]), { bg: "#0c1636" });

// 16-17 BLOTCHY STAYED RIGHT WHERE HE WAS
add(B(16), TOTAL, [HALL_D, { d: 1, draw: (g, f) => {
  tankBox(g, 540, 1500, 900, 820, 0.25);
  octo(g, 540, 1260, 1.0, { f, col: BLOTCHY, expr: f > fStayed ? "sleepy" : "curious", arms: 0.9, sy: f > fArtists ? 0.92 : 1, look: -0.3 });
  if (f > fBlotchy) { const k = pop(f, fBlotchy, 7); g.save(); g.translate(540, 620); g.scale(k, k); rr(g, -190, -60, 380, 110, 20, "#f4ecd2", 5); g.fillStyle = INKC; g.font = "900 56px CapFont"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BLOTCHY", 0, 0); g.restore(); }
  if (f > fArtists) for (let i = 0; i < 3; i++) { const z = (f - fArtists) * 2 + i * 20; g.save(); g.globalAlpha = Math.max(0, 1 - (z % 60) / 60); g.fillStyle = "#ffffff"; g.font = "900 60px CapFont"; g.fillText("z", 700 + (z % 60) * 1.5, 1000 - (z % 60) * 3); g.restore(); }
} }], camKeys([{ f: B(16), c: { z: 1.0, y: 1100 }, creep: 0.0015 }, { f: fArtists, c: { z: 1.15, y: 1080 }, dur: 20 }]), { bg: "#3f5a8a" });

export const story: Story = { total: TOTAL, shots, flashes: [B(1) - 4], xfade: { 2: 8, 3: 8, 5: 8, 8: 8, 9: 8, 10: 6, 11: 6, 13: 6, 15: 8, 16: 8, 17: 8 } };
void [confetti, seabed, rock, kelp, specks, smoothOpen, blob, H, shadow, fFisher, fSqueeze, fPipe, fMorning, fNever, fJelly, fCross, fSlides];
