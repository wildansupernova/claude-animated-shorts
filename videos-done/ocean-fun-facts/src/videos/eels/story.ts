// "The Horses and the Electric Eels": shots cued from voice/words.json (frames at 30 fps).
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, easeOut, rnd, sprite, blinkAt, shadow, clamp01 } from "../../lib/engine";
import {
  INKC, P, sky, cloud, underwater, specks, bubble, room, windowFrame, speedLines, questionMark, exclaim, burstBg, confetti,
  poly, line, ell, rr, lg, rg, blob, soundLines,
} from "../../lib/paint";
import { cueSheet } from "../../lib/cues";
import type { Word } from "../../lib/captions";
import words from "../../../videos/eels/voice/words.json";
import { HUMBOLDT, LLANERO, SCHOLAR, CATANIA, FAN, eel, bolt, sparks, horse, journal, tank, netTool, fakeCroc, megaphone, palm, EelOpts } from "./actors";
import { bodyFront, Outfit, Expr } from "../../lib/toon";

const C = cueSheet(words as Word[]);
const { W: w, B } = C;
export const TOTAL = C.end + 24;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];

const who = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, seed: number, opt: { expr?: Expr; facing?: -1 | 0 | 1; wave?: number; look?: number; tilt?: number; headTilt?: number; flip?: boolean; noShadow?: boolean } = {}) => {
  if (!opt.noShadow) shadow(g, x, y, h * 0.2, 0.22);
  sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opt.expr ?? "neutral", mode: "stand", blink: blinkAt(f, seed), seed, facing: opt.facing ?? 0, wave: opt.wave, look: opt.look, tilt: opt.tilt, headTilt: opt.headTilt }), opt.flip);
};
const eelAt = (g: Ctx, x: number, y: number, s: number, o: EelOpts = {}, rot = 0, flip = false) => {
  let sp: P[] = [];
  at(g, x, y, s, (gg) => { sp = eel(gg, o); }, rot, flip);
  // head position in world coords
  const [hx, hy] = sp[sp.length - 1] ?? [0, 0];
  const c = Math.cos(rot), si = Math.sin(rot), fx = flip ? -1 : 1;
  return [x + (hx * fx * c - hy * si) * s, y + (hx * fx * si + hy * c) * s] as P;
};
const horseAt = (g: Ctx, x: number, y: number, s: number, o: Parameters<typeof horse>[1] = {}, flip = false) => at(g, x, y, s, (gg) => horse(gg, o), 0, flip);

// ---------------- sets ----------------
const llanos = (g: Ctx, x0: number, x1: number, pond = true) => {
  sky(g, x0, BIG[1], x1, 900, "#5aa0e0", "#fff0c8", "#a8cce8");
  for (let i = 0; i < 5; i++) cloud(g, x0 + 250 + i * 520, 230 + (i % 2) * 150, 0.9, "#ffffff", "#d8e2f0", i);
  // flat grassland to the horizon
  g.fillStyle = lg(g, 0, 900, 0, 1400, [[0, "#b8b65a"], [1, "#8a9a3e"]]); g.fillRect(x0, 900, x1 - x0, 520);
  for (let i = 0; i < 5; i++) palm(g, x0 + 200 + i * 470 + (i % 2) * 120, 960 + (i % 2) * 20, 260 + (i % 3) * 60);
  g.fillStyle = lg(g, 0, 1300, 0, BIG[3], [[0, "#9aa84a"], [1, "#6f8a2e"]]); g.fillRect(x0, 1300, x1 - x0, BIG[3] - 1300);
  for (let i = 0; i < 160; i++) { const x = x0 + rnd(i, 1) * (x1 - x0), y = 950 + rnd(i, 2) * 1700; line(g, [[x, y], [x - 6, y - 26], [x + 4, y - 40]], "rgba(70,90,30,0.6)", 3); }
  if (pond) {
    // muddy pond in the middle ground
    poly(g, blob(540, 1420, 760, 230, 4, 12, 0.08), lg(g, 0, 1200, 0, 1650, [[0, "#6a7a5a"], [1, "#4a5a42"]]), 6);
    for (let i = 0; i < 6; i++) ell(g, 140 + i * 160, 1380 + (i % 2) * 60, 60, 8, "rgba(255,255,255,0.25)", 0);
  }
};
const LLANOS: Layer = { key: "llanos", d: 0.6, bounds: BIG, res: 0.8, paint: (g) => llanos(g, BIG[0], BIG[2]) };
const LLANOS_DRY: Layer = { key: "llanosDry", d: 0.6, bounds: BIG, res: 0.8, paint: (g) => llanos(g, BIG[0], BIG[2], false) };
/** pond water overlay (covers horse legs / eel bodies), level y */
const waterFront = (g: Ctx, y: number, f: number, x0 = -400, x1 = 1480) => {
  g.save(); g.globalAlpha = 0.82;
  g.fillStyle = lg(g, 0, y, 0, y + 600, [[0, "#6a7a5a"], [1, "#3a4a32"]]);
  g.beginPath(); g.moveTo(x0, y);
  for (let x = x0; x <= x1; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + f * 0.15) * 8);
  g.lineTo(x1, y + 900); g.lineTo(x0, y + 900); g.closePath(); g.fill();
  g.restore();
  g.beginPath(); for (let x = x0; x <= x1; x += 40) (x === x0 ? g.moveTo(x, y + Math.sin(x * 0.02 + f * 0.15) * 8) : g.lineTo(x, y + Math.sin(x * 0.02 + f * 0.15) * 8));
  g.lineWidth = 5; g.strokeStyle = "rgba(255,255,255,0.6)"; g.stroke();
};
const HALL: Layer = { key: "hall", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  room(g, BIG[0], BIG[2], 1450, BIG[3], "#7a4a3a", "#5a3a2a", 540, BIG[1]);
  for (let i = 0; i < 5; i++) { rr(g, -300 + i * 380, 200, 200, 600, 100, "#d8c49a", 6); rr(g, -280 + i * 380, 220, 160, 560, 80, "#5a7aa8", 4); }
  for (let i = 0; i < 4; i++) rr(g, -100 + i * 380, 900, 220, 300, 6, "#c8a23a", 6);
} };
const LAB: Layer = { key: "lab2", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  room(g, BIG[0], BIG[2], 1460, BIG[3], "#d9e4dc", "#8a8a8a", 540, BIG[1]);
  for (let i = 0; i < 3; i++) rr(g, -200 + i * 520, 300, 300, 200, 8, "#bfe3f2", 5);
  rr(g, -500, 1160, 2100, 40, 6, "#9aa4b0", 5);
} };
const POOL: Layer = { key: "pool", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => underwater(g, BIG[0], BIG[1], BIG[2], BIG[3], "#3fa6c9", "#0f4f79", 0.2, 4) };

const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

// cue frames
const fFish = w("fish", 0), fHorses0 = w("horses...", 0), fNobody = w("nobody"), fHum = w("Humboldt,"), fVen = w("Venezuela."), fCatch = w("catch"), fHurts = w("hurts."), fLot = w("lot.");
const fIdea = w("idea."), fRound = w("round"), fDrive = w("drive"), fPond = w("pond."), fRise = w("rise"), fPress = w("press"), fZap = w("zap"), fAgain = w("again", 0), fAgain2 = w("again.");
const fDown = w("down"), fDrown = w("drown."), fWrites = w("writes"), fNon = w("nonsense."), fWait = w("wait..."), fLater = w("later,"), fCat = w("catania"), fNet = w("net."), fLeap = w("leap");
const fSpreads = w("spreads"), fRipples = w("ripples"), fChin = w("chin"), fOne = w("one", 0, 12), fStraight = w("straight", 0, 12), fStadium = w("stadium,"), fVersus = w("versus"), fEar = w("ear.");
const fHigher = w("higher"), fStronger = w("stronger"), fRight = w("right", 0, 15), fArm = w("arm"), fZapHim = w("zap", 1), fPurpose = w("purpose.");

// 1 HOOK A: fish attacking horses in a pond, Humboldt watching
add(0, fNobody - 4, [LLANOS, { d: 1, draw: (g, f) => {
  for (const [x, s, col, ph] of [[300, 0.72, "#9a6a3a", 0], [720, 0.8, "#e9e1c8", 2]] as [number, number, string, number][]) {
    horseAt(g, x, 1500, s, { f, col, expr: "shock", rear: f > fFish ? 0.3 + 0.15 * Math.sin(f * 0.4 + ph) : 0, seed: ph }, x > 500);
  }
  waterFront(g, 1390, f);
  if (f > fFish - 6) for (const [x, y, flip] of [[420, 1380, true], [640, 1400, false]] as [number, number, boolean][]) {
    const head = eelAt(g, x, y, 0.75, { f, expr: "angry", arch: 1.1, charge: 1, seed: x }, flip ? -0.5 : 0.5, flip);
    sparks(g, head[0], head[1], f, 130, 6, x);
  }
  who(g, HUMBOLDT, 920, 1800, 640, f, 7, { expr: f > fFish ? "shock" : "neutral", facing: -1 });
} }], camKeys([{ f: 0, c: { z: 1.0, y: 1370 }, creep: 0.0018 }, { f: fFish, c: { z: 1.12, y: 1420, r: -0.02 }, dur: 10 }]), { kicks: [fHorses0], bg: "#5aa0e0" });
// 1b HOOK B: scholars laugh at him for 200 years
const scholarsLaugh = (g: Ctx, f: number, x0: number, laugh: boolean) => {
  for (let i = 0; i < 4; i++) who(g, SCHOLAR(i), x0 + i * 260, 1720 + (i % 2) * 30, 900, f, 20 + i, { expr: laugh ? (i % 2 ? "laugh" : "grin") : "stern", facing: (i < 2 ? 1 : -1) as 1 | -1, tilt: laugh ? Math.sin(f * 0.8 + i) * 4 : 0 });
};
add(fNobody - 4, B(1), [HALL, { d: 1, draw: (g, f) => {
  scholarsLaugh(g, f, 150, f > fNobody + 6);
  who(g, HUMBOLDT, 540, 1300, 520, f, 7, { expr: "nervous", noShadow: true });
} }], camKeys([{ f: fNobody - 4, c: { z: 1.0, y: 1100 }, creep: 0.0015 }]), { bg: "#7a4a3a" });

// 2 HUMBOLDT IN VENEZUELA
add(B(1), B(2), [LLANOS_DRY, { d: 1, draw: (g, f) => {
  const x = -150 + Math.min(f - B(1), 90) * 8;
  who(g, HUMBOLDT, x, 1700, 960, f, 7, { expr: "smile", facing: 1, wave: f > fHum + 6 ? 0.8 : undefined });
  journal(g, x + 160, 1180, 0.6, f, false);
} }], camKeys([{ f: B(1), c: { z: 1.0, y: 1100 }, creep: 0.0012 }]), { bg: "#5aa0e0" });

// 3 TOUCHING ONE HURTS (skeleton zap gag)
add(B(2), B(3), [LLANOS, { d: 1, draw: (g, f) => {
  const zapped = f >= fHurts - 4;
  const head = eelAt(g, 640, 1450, 0.9, { f, expr: zapped ? "smug" : "calm", charge: zapped ? 1 : 0, seed: 3 }, -0.3);
  waterFront(g, 1440, f);
  if (zapped && Math.floor(f / 3) % 2 === 0 && f < fLot + 20) {
    // x-ray flash: dark silhouette with bones
    who(g, { ...HUMBOLDT, jacket: "#111111", pants: "#111111", skin: "#111111", hair: "#111111" }, 400, 1750, 980, f, 7, { expr: "shock", wave: 0.6 });
    line(g, [[400, 1190], [400, 1460]], "#f4f4f0", 10);
    for (let i = 0; i < 4; i++) line(g, [[350, 1250 + i * 45], [450, 1250 + i * 45]], "#f4f4f0", 8);
    ell(g, 400, 1097, 72, 66, null, 8, 0, "#f4f4f0"); ell(g, 375, 1090, 14, 16, "#f4f4f0", 0); ell(g, 425, 1090, 14, 16, "#f4f4f0", 0);
  } else who(g, HUMBOLDT, 400, 1750, 980, f, 7, { expr: f > fLot ? "dazed" : zapped ? "shock" : "smile", wave: 0.6 });
  if (zapped) sparks(g, head[0], head[1], f, 160, 7, 3);
  if (f > fLot) for (let i = 0; i < 3; i++) ell(g, 340 + i * 60, 720 - ((f * 3 + i * 25) % 90), 26, 22, "rgba(200,200,200,0.8)", 3, 0, "rgba(40,40,40,0.5)");
} }], camKeys([{ f: B(2), c: { z: 1.0, y: 1370 }, creep: 0.0015 }, { f: fHurts, c: { z: 1.15, y: 1340, r: 0.03 }, dur: 6 }]), { kicks: [fHurts - 3, fLot], bg: "#5aa0e0" });

// 4 FISHERMEN HAVE AN IDEA
add(B(3), B(4), [LLANOS_DRY, { d: 1, draw: (g, f) => {
  who(g, LLANERO(0), 330, 1700, 960, f, 31, { expr: f > fIdea ? "grin" : "neutral", facing: 1 });
  who(g, LLANERO(1), 760, 1720, 940, f, 32, { expr: "smile", facing: -1, wave: f > fIdea ? 1 : undefined });
  const k = pop(f, fIdea - 4, 8);
  if (k > 0) at(g, 330, 380, k, (gg) => { ell(gg, 0, 0, 70, 80, "#fff3a0", 6); rr(gg, -30, 70, 60, 40, 6, "#9aa4b0", 5); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(gg, [[Math.cos(a) * 100, Math.sin(a) * 100], [Math.cos(a) * 140, Math.sin(a) * 140]], "#ffd84a", 8); } });
} }], camKeys([{ f: B(3), c: { z: 1.0, y: 1100 }, creep: 0.0018 }]), { bg: "#5aa0e0" });

// 5 DRIVE THIRTY HORSES INTO THE POND
add(B(4), B(5), [LLANOS, { d: 1, draw: (g, f) => {
  const t = f - fDrive;
  for (let i = 0; i < 6; i++) {
    const x = -200 + i * 150 + Math.max(0, f - fRound) * 3 + Math.max(0, t) * 4, y = 1360 + (i % 2) * 70 + Math.max(0, t) * 0.8;
    horseAt(g, x, y, 0.5, { f: f + i * 7, col: ["#9a6a3a", "#e9e1c8", "#5a3a2a", "#b5803a"][i % 4], expr: "calm", seed: i });
  }
  waterFront(g, 1440, f, 300, 1480);
  for (let i = 0; i < 2; i++) who(g, LLANERO(i), 80 + i * 150 + Math.max(0, f - fRound) * 3, 1820, 760, f, 31 + i, { expr: "grin", facing: 1, wave: 0.9 });
  if (f > fPond) for (let i = 0; i < 5; i++) { const x = 560 + i * 150, k = pop(f, fPond + i * 3, 6); ell(g, x - 16, 1450, 12 * k, 12 * k, "#fff6c0", 3); ell(g, x + 16, 1450, 12 * k, 12 * k, "#fff6c0", 3); ell(g, x - 12, 1452, 4 * k, 4 * k, INKC, 0); ell(g, x + 20, 1452, 4 * k, 4 * k, INKC, 0); }
} }], camKeys([{ f: B(4), c: { z: 1.0, y: 1370 }, creep: 0.0012 }, { f: fPond, c: { z: 1.2, x: 720, y: 1520 }, dur: 14 }]), { bg: "#5aa0e0" });

// 6 THE EELS RISE UP AND ZAP
add(B(5), B(6), [LLANOS, { d: 1, draw: (g, f) => {
  const hits = [fZap, fAgain, fAgain2];
  const hit = hits.some((h) => f >= h && f < h + 6);
  horseAt(g, 560, 1520, 1.0, { f, col: "#9a6a3a", expr: f > fPress ? "shock" : "calm", rear: hit ? 0.5 : f > fPress ? 0.15 : 0, seed: 2 });
  waterFront(g, 1350, f);
  const rise = easeOut(ramp(f, fRise, fRise + 14));
  const head = eelAt(g, 420, 1500 - rise * 160, 1.1, { f, expr: "angry", arch: 1.4 * rise, charge: hit ? 1 : 0.3, seed: 5 }, -0.2);
  if (hit) { bolt(g, head, [560, 1280], f, 14, 3); bolt(g, head, [700, 1250], f, 12, 7); sparks(g, 600, 1260, f, 200, 8, 2); }
} }, { screen: true, op: "lighter", draw: (g, f) => { const hits = [fZap, fAgain, fAgain2]; if (hits.some((h) => f >= h && f < h + 3)) { g.fillStyle = "rgba(255,250,200,0.5)"; g.fillRect(0, 0, W, H); } } }],
  camKeys([{ f: B(5), c: { z: 1.05, y: 1470 }, creep: 0.0015 }]), { kicks: [fZap, fAgain, fAgain2], kickAmp: 28, bg: "#5aa0e0" });

// 7 TWO HORSES GO DOWN
add(B(6), B(7), [LLANOS, { d: 1, draw: (g, f) => {
  const sink = easeOut(ramp(f, fDown, fDrown + 20));
  for (const [x, s] of [[360, 0.85], [760, 0.8]] as [number, number][]) horseAt(g, x, 1500 + sink * 260, s, { f, col: x < 500 ? "#e9e1c8" : "#5a3a2a", expr: "dazed", seed: x }, x > 500);
  waterFront(g, 1380, f);
  if (f > fDown) for (let i = 0; i < 8; i++) bubble(g, 300 + i * 70, 1370 - ((f * 4 + i * 23) % 120), 10 + (i % 3) * 5);
} }], camKeys([{ f: B(6), c: { z: 1.0, y: 1370 }, creep: 0.0015 }]), { bg: "#5aa0e0" });

// 8 HUMBOLDT WRITES IT DOWN -> "NONSENSE"
add(B(7), fNon - 14, [LLANOS_DRY, { d: 1, draw: (g, f) => {
  who(g, HUMBOLDT, 360, 1800, 1100, f, 7, { expr: "smile", facing: 1 });
  journal(g, 680, 1150, 1.2, f, true);
} }], camKeys([{ f: B(7), c: { z: 1.0, y: 1050 }, creep: 0.0018 }]), { bg: "#5aa0e0" });
add(fNon - 14, B(8), [HALL, { d: 1, draw: (g, f) => {
  scholarsLaugh(g, f, 150, f > fNon - 4);
  if (f > fNon) for (let i = 0; i < 6; i++) { const t = f - fNon - i * 2; if (t < 0) continue; at(g, 540 + (i - 3) * 90 + t * (i - 3) * 3, 600 - t * 8 + t * t * 0.4, 0.5, (gg) => { rr(gg, -60, -80, 120, 160, 6, "#f4ecd2", 4); }, t * 0.2); }
} }], camKeys([{ f: fNon - 14, c: { z: 1.0, y: 1100 }, creep: 0.0018 }]), { kicks: [fNon], bg: "#7a4a3a" });

// 9 WAIT
add(B(8), B(9), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 800, 2400, "#ffd84a", "#ffc93a", 22, f * 0.004) }, { d: 1, draw: (g, f) => {
  eelAt(g, 540, 1000, 1.7, { f, expr: "puzzled", seed: 9, wig: 0.5 }, -0.2);
  questionMark(g, 830, 430, 240 * pop(f, fWait + 2, 7), "#ffffff", 0.2);
  questionMark(g, 250, 500, 190 * pop(f, fWait + 26, 7), "#ffffff", -0.2);
} }], camKeys([{ f: B(8), c: { z: 1.25, y: 950 }, creep: 0.001 }, { f: fWait + 4, c: { z: 1.05, y: 960 }, dur: 8 }]), { kicks: [fWait + 1], bg: "#ffd84a" });

// 10 TWO HUNDRED YEARS LATER: Catania moves eels with a metal net
add(B(9), fLeap - 4, [LAB, { d: 1, draw: (g, f) => {
  tank(g, 700, 1160, 640, 420);
  eelAt(g, 700, 1000, 0.75, { f, expr: "calm", seed: 11 }, 0.1);
  who(g, CATANIA, 280, 1780, 1050, f, 41, { expr: "smile", facing: 1, wave: 0.7 });
  netTool(g, 520, 760 + Math.sin(f * 0.1) * 20, 0.9, 0.5);
  if (f < fCat + 30) { const k = pop(f, B(9) + 4, 8); g.save(); g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 12; g.font = "900 120px CapFont"; g.textAlign = "center"; g.translate(540, 420); g.scale(k, k); g.strokeText("2016", 0, 0); g.fillText("2016", 0, 0); g.restore(); }
} }], camKeys([{ f: B(9), c: { z: 1.0, y: 1050 }, creep: 0.0015 }]), { bg: "#d9e4dc" });
// 11 AND THEY LEAP AT HIM
add(fLeap - 4, B(11), [LAB, { d: 1, draw: (g, f) => {
  tank(g, 700, 1160, 640, 420);
  const up = easeOut(ramp(f, fLeap - 2, fLeap + 6));
  const head = eelAt(g, 720, 1000 - up * 120, 0.85, { f, expr: "angry", arch: 1.6 * up, charge: up, seed: 11 }, -0.4 * up, true);
  who(g, CATANIA, 280, 1780, 1050, f, 41, { expr: up > 0.3 ? "shock" : "smile", facing: 1, wave: 0.9, tilt: up * -6 });
  netTool(g, 540, 700, 0.9, 0.3 + up * 0.4);
  if (up > 0.5) { bolt(g, head, [520, 640], f, 12, 2); sparks(g, 520, 640, f, 150, 6, 4); }
} }], camKeys([{ f: fLeap - 4, c: { z: 1.15, y: 1000 }, creep: 0.003 }]), { kicks: [fLeap + 2], kickAmp: 26, bg: "#d9e4dc" });

// 12 UNDERWATER THE SHOCK SPREADS LIKE RIPPLES
add(B(11), B(12), [POOL, { d: 1, draw: (g, f) => {
  const t = f - fSpreads;
  if (t > 0) for (let k = 0; k < 5; k++) { const r = ((t * 8 + k * 90) % 450); ell(g, 540, 1000, r * 1.2 + 40, r + 40, null, 10 * (1 - r / 450) + 2, 0, `rgba(255,236,120,${0.9 * (1 - r / 450)})`); }
  eelAt(g, 540, 1000, 1.2, { f, expr: "calm", charge: t > 0 ? 0.7 : 0, seed: 12 });
  if (f > fRipples) for (let i = 0; i < 3; i++) ell(g, 300 + i * 220, 1500, 70, 22, null, 5, 0, "rgba(255,255,255,0.7)");
} }, { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 50, f, 4) }],
  camKeys([{ f: B(11), c: { z: 1.0, y: 980 }, creep: 0.0015 }]), { bg: "#0f4f79" });

// 13 OUT OF WATER: ONE WAY BACK, STRAIGHT THROUGH YOU
add(B(12), B(13), [{ key: "split2", d: 0.4, bounds: BIG, res: 0.6, paint: (g) => { sky(g, BIG[0], BIG[1], BIG[2], 1250, "#d9e4dc", "#eef2ee"); underwater(g, BIG[0], 1250, BIG[2], BIG[3], "#3fa6c9", "#0f4f79", 0.15, 7); line(g, [[BIG[0], 1250], [BIG[2], 1250]], "#ffffff", 8); } },
  { d: 1, draw: (g, f) => {
    const up = easeOut(ramp(f, B(12), B(12) + 20));
    const through = f >= fStraight - 4;
    if (!through) fakeCroc(g, 760, 1180, 1.0, f > fOne ? clamp01((f - fOne) / 20) : 0);
    else who(g, { ...CATANIA, jacket: "#7a8a9a" }, 780, 1640, 820, f, 41, { expr: "pained", noShadow: true });
    const head = eelAt(g, 330, 1400 - up * 150, 0.85, { f, expr: "angry", arch: 1.2 * up, charge: 1, seed: 13 }, -0.5 * up);
    const tgt: P = through ? [740, 1060] : [640, 1080];
    if (f > fChin) bolt(g, head, tgt, f, 12, 3);
    if (f > fOne) {
      // current path: through the target and back down into the water
      const pts: P[] = through ? [[740, 1060], [780, 1250], [790, 1450], [700, 1600], [500, 1600], [330, 1450]] : [[640, 1080], [760, 1120], [800, 1300], [650, 1500], [400, 1500]];
      for (let i = 0; i < pts.length - 1; i++) { const k = (f * 0.08 + i * 0.3) % 1, a = pts[i], b = pts[i + 1]; ell(g, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 14, 14, "#ffe14d", 4); }
    }
    if (through) sparks(g, 780, 1080, f, 200, 8, 6);
  } }], camKeys([{ f: B(12), c: { z: 1.0, y: 1100 }, creep: 0.0015 }, { f: fStraight, c: { z: 1.12, y: 1050, r: 0.02 }, dur: 8 }]), { kicks: [fStraight + 2], bg: "#d9e4dc" });

// 14 STADIUM VS EAR
const STADIUM: Layer = { key: "stadium", d: 0.4, bounds: BIG, res: 0.6, paint: (g) => {
  sky(g, BIG[0], BIG[1], BIG[2], 600, "#2a3a6a", "#4a5a8a");
  for (let row = 0; row < 14; row++) for (let i = 0; i < 40; i++) ell(g, BIG[0] + i * 70 + (row % 2) * 35, 500 + row * 70, 22, 26, ["#e8322e", "#ffd84a", "#4a8ad8", "#f4f4f0", "#5ab06a"][(i + row) % 5], 2);
  rr(g, BIG[0], 1480, BIG[2] - BIG[0], 1200, 0, "#4f9f3e", 0);
} };
add(B(13), fVersus - 2, [STADIUM, { d: 1, draw: (g, f) => {
  who(g, FAN(0), 540, 1800, 1100, f, 51, { expr: "laugh", wave: 0.8 });
  megaphone(g, 700, 1000, 1.0, -0.2);
  for (let i = 0; i < 4; i++) soundLines(g, 860, 960, -0.2 + (i - 1.5) * 0.6, f, "#ffffff", 2, 1.0 + i * 0.3);
} }], camKeys([{ f: B(13), c: { z: 0.95, y: 1000 }, creep: 0.0012 }]), { bg: "#2a3a6a" });
add(fVersus - 2, B(14), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#ff7a5a", "#ff9a6a", 22, f * 0.006) }, { d: 1, draw: (g, f) => {
  who(g, FAN(0), 300, 1850, 1150, f, 51, { expr: "laugh", facing: 1 });
  who(g, FAN(2), 820, 1850, 1150, f, 53, { expr: f > fEar ? "shock" : "neutral", facing: -1, tilt: f > fEar ? -6 : 0, headTilt: f > fEar ? -8 : 0 });
  if (f > fEar - 6) for (let i = 0; i < 3; i++) soundLines(g, 480, 1030, 0, f, "#ffe14d", 3, 1.2);
} }], camKeys([{ f: fVersus - 2, c: { z: 1.0, y: 1100 }, creep: 0.002 }, { f: fEar, c: { z: 1.15, y: 1080, r: -0.03 }, dur: 6 }]), { kicks: [fEar + 2], bg: "#ff7a5a" });

// 15 THE HIGHER THE LEAP, THE STRONGER THE SHOCK
add(B(14), B(15), [{ key: "split3", d: 0.4, bounds: BIG, res: 0.6, paint: (g) => { sky(g, BIG[0], BIG[1], BIG[2], 1300, "#3a2a6a", "#6a5aa8"); underwater(g, BIG[0], 1300, BIG[2], BIG[3], "#3fa6c9", "#0f4f79", 0.15, 9); line(g, [[BIG[0], 1300], [BIG[2], 1300]], "#ffffff", 8); } },
  { d: 1, draw: (g, f) => {
    const steps = [fHigher - 4, fHigher + 14, fStronger - 2];
    steps.forEach((s0, i) => {
      if (f < s0) return;
      const x = 220 + i * 320, up = easeOut(ramp(f, s0, s0 + 8)) * (0.6 + i * 0.5);
      const head = eelAt(g, x, 1460 - up * 160, 0.55, { f, expr: "angry", arch: 1.2 * up, charge: 1, seed: 20 + i }, -0.8 * Math.min(1, up));
      bolt(g, head, [head[0] + 60, head[1] - 100 - i * 120], f, 6 + i * 6, i);
      sparks(g, head[0] + 60, head[1] - 100 - i * 120, f, 60 + i * 60, 5 + i * 2, i + 3);
    });
  } }], camKeys([{ f: B(14), c: { z: 1.0, y: 1100 }, creep: 0.0015 }]), { kicks: [fStronger], bg: "#3a2a6a" });

// 16 HUMBOLDT WAS RIGHT
add(B(15), B(16), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#ffd84a", "#ffe98a", 24, f * 0.005) }, { d: 1, draw: (g, f) => {
  rr(g, 190, 360, 700, 860, 20, "#c8952c", 12); rr(g, 230, 400, 620, 780, 10, "#5aa0e0", 6);
  who(g, HUMBOLDT, 540, 1600, 1250, f, 7, { expr: "grin", noShadow: true, wave: f > fRight ? 0.8 : undefined });
  confetti(g, 0, 1080, -100, f, fRight, 60);
} }], camKeys([{ f: B(15), c: { z: 1.0, y: 960 }, creep: 0.002 }]), { bg: "#ffd84a" });

// 17 CATANIA'S OWN ARM
add(B(16), B(17), [LAB, { d: 1, draw: (g, f) => {
  tank(g, 720, 1240, 620, 420);
  const zap = f >= fZapHim - 2;
  who(g, CATANIA, 300, 1760, 1050, f, 41, { expr: zap ? "pained" : f > fArm ? "nervous" : "smile", facing: 1, wave: 0.15, tilt: zap ? Math.sin(f * 2) * 3 : 0 });
  // the arm reaching into the tank
  line(g, [[440, 1130], [560, 1120], [660, 1150]], INKC, 34); line(g, [[440, 1130], [560, 1120], [660, 1150]], "#4a7ab8", 24);
  ell(g, 672, 1152, 18, 18, "#ffe2c2", 5);
  const head = eelAt(g, 860, 1180, 0.65, { f, expr: zap ? "smug" : "calm", arch: zap ? 0.8 : 0.2, charge: zap ? 1 : 0, seed: 17 }, -0.3, true);
  if (zap) { bolt(g, head, [672, 1152], f, 10, 5); sparks(g, 600, 1120, f, 120, 6, 9); for (let i = 0; i < 6; i++) line(g, [[250 + i * 22, 640], [240 + i * 22 + Math.sin(f + i) * 10, 560]], INKC, 8); }
} }, { screen: true, op: "lighter", draw: (g, f) => { if (f >= fZapHim - 2 && f < fZapHim + 2) { g.fillStyle = "rgba(255,250,200,0.45)"; g.fillRect(0, 0, W, H); } } }],
  camKeys([{ f: B(16), c: { z: 1.0, y: 1050 }, creep: 0.0015 }, { f: fZapHim, c: { z: 1.12, y: 1020, r: 0.03 }, dur: 6 }]), { kicks: [fZapHim], kickAmp: 26, bg: "#d9e4dc" });

// 18 ON PURPOSE
add(B(17), TOTAL, [LAB, { d: 1, draw: (g, f) => {
  who(g, CATANIA, 540, 1800, 1250, f, 41, { expr: "grin", wave: 1 });
  for (let i = 0; i < 7; i++) line(g, [[440 + i * 30, 640], [430 + i * 30 + Math.sin(f * 0.6 + i) * 8, 530]], INKC, 9);
  for (let i = 0; i < 3; i++) ell(g, 480 + i * 50, 480 - ((f * 3 + i * 25) % 90), 24, 20, "rgba(200,200,200,0.85)", 3, 0, "rgba(40,40,40,0.5)");
  const k = pop(f, fPurpose + 4, 7);
  if (k > 0) at(g, 860, 520, k, (gg) => { ell(gg, 0, 0, 60, 60, "#ffd84a", 6); line(gg, [[-20, 0], [-6, 16], [22, -16]], INKC, 8); });
} }], camKeys([{ f: B(17), c: { z: 1.05, y: 1000 }, creep: 0.002 }]), { kicks: [fPurpose + 4], bg: "#d9e4dc" });

export const story: Story = { total: TOTAL, shots, flashes: [B(1) - 4], xfade: { 1: 6, 2: 8, 3: 6, 4: 6, 7: 6, 8: 6, 10: 8, 12: 8, 14: 8, 16: 6, 17: 8 } };
void [windowFrame, speedLines, exclaim, rg, lg, poly, blob, rnd, H, fVen, fCatch, fNet, fLater, fRipples];
