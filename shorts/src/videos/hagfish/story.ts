// "The Snot Highway": shots cued from voice/words.json (frames at 30 fps).
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, smooth, easeOut, rnd, sprite, blinkAt, shadow, clamp01 } from "../../lib/engine";
import {
  INKC, P, sky, cloud, seaSurface, horizonGlow, underwater, specks, bubble, rock, seabed, kelp, pine, speedLines, questionMark, exclaim,
  burstBg, poly, line, ell, rr, lg, rg, light, dark, rgba, blob, path, smoothClosed, soundLines,
} from "../../lib/paint";
import { cueSheet } from "../../lib/cues";
import type { Word } from "../../lib/captions";
import words from "../../../videos/hagfish/voice/words.json";
import { seagull } from "../herring/actors";
import { stink } from "../whale/actors";
import {
  DRIVER, FLAGGER, FIREFIGHTER, DINER, MOTORIST, hagfish, slimeCoat, slimeSheet, skein, flatbed, tote, hatch, bulldozer, shark, airbag,
  workSign, stopPaddle, trex, hoseSpray, HagOpts,
} from "./actors";
import { bodyFront, Outfit, Expr } from "../../lib/toon";

const C = cueSheet(words as Word[]);
const { W: w, L, B } = C;
export const TOTAL = C.end + 24;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];
const WIDE: [number, number, number, number] = [-1400, -700, W + 2600, H + 700];

const who = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, seed: number, opt: { expr?: Expr; facing?: -1 | 0 | 1; wave?: number; look?: number; tilt?: number; headTilt?: number; flip?: boolean } = {}) => {
  shadow(g, x, y, h * 0.2, 0.22);
  sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opt.expr ?? "neutral", mode: "stand", blink: blinkAt(f, seed), seed, facing: opt.facing ?? 0, wave: opt.wave, look: opt.look, tilt: opt.tilt, headTilt: opt.headTilt }), opt.flip);
};
const hag = (g: Ctx, x: number, y: number, s: number, o: HagOpts = {}, rot = 0, flip = false) => at(g, x, y, s, (gg) => hagfish(gg, o), rot, flip);

// ---------------- the coast road (side view, road along y = 1450) ----------------
const coastPaint = (g: Ctx, x0: number, x1: number) => {
  sky(g, x0, BIG[1], x1, 820, "#4f8fdc", "#e6f0f6", "#9cc4ea");
  for (let i = 0; i < 6; i++) cloud(g, x0 + 300 + i * 650, 200 + (i % 2) * 170, 0.9 + (i % 3) * 0.25, "#ffffff", "#cbd8ec", i);
  // distant headland + sea
  poly(g, [[x0, 820], [x0 + 400, 700], [x0 + 900, 760], [x0 + 1500, 690], [x0 + 2200, 780], [x1, 740], [x1, 830], [x0, 830]], "#6f8fa8", 0);
  seaSurface(g, x0, x1, 820, 1180, "#4f8fc8", "#2f6fb0", 4);
  horizonGlow(g, x0, x1, 820);
  // grass verge, guard rail posts far side
  rr(g, x0, 1180, x1 - x0, 120, 0, lg(g, 0, 1180, 0, 1300, [[0, "#7fae5a"], [1, "#5f8f3e"]]), 0);
  for (let x = x0; x < x1; x += 260) pine(g, x + 80, 1240, 220 + (x % 3) * 30, "#2f6b4a", x);
  // asphalt
  rr(g, x0, 1300, x1 - x0, 300, 0, lg(g, 0, 1300, 0, 1600, [[0, "#5a5e6a"], [1, "#46495a"]]), 0);
  line(g, [[x0, 1300], [x1, 1300]], INKC, 5); line(g, [[x0, 1600], [x1, 1600]], INKC, 5);
  for (let x = x0; x < x1; x += 200) rr(g, x, 1442, 110, 14, 4, "#ffd84a", 0);
  rr(g, x0, 1600, x1 - x0, BIG[3] - 1600, 0, lg(g, 0, 1600, 0, 2400, [[0, "#7fae5a"], [1, "#4f7f30"]]), 0);
};
const COAST: Layer = { key: "coast", d: 0.7, bounds: BIG, res: 0.8, paint: (g) => coastPaint(g, BIG[0], BIG[2]) };
const COASTW: Layer = { key: "coastWide", d: 0.7, bounds: WIDE, res: 0.7, paint: (g) => coastPaint(g, WIDE[0], WIDE[2]) };
const SKYPAN: Layer = { key: "skyPan", d: 0.15, bounds: WIDE, res: 0.6, paint: (g) => { sky(g, WIDE[0], WIDE[1], WIDE[2], 830, "#4f8fdc", "#e6f0f6", "#9cc4ea"); for (let i = 0; i < 8; i++) cloud(g, WIDE[0] + 200 + i * 600, 220 + (i % 2) * 160, 1, "#fff", "#cbd8ec", i); } };

const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

// cue frames
const fInto = w("into"), fSlime0 = w("slime.", 0), fCont = w("containers"), fHag1 = w("hagfish.", 0), fKorea = w("Korea,"), fEat = w("eat");
const fRoad = w("roadworks..."), fSlams = w("slams"), fFlies = w("flies"), fSmash = w("smashes"), fRest = w("rest"), fPour = w("pour");
const fPanic = w("panic,"), fMake = w("make"), fExt = w("extremely"), fCoat = w("coated"), fSneeze = w("sneezed"), fWait = w("wait...");
const fGlands = w("glands"), fBalls = w("balls"), fYarn = w("yarn."), fUnravel = w("unravel,"), fExp = w("expands"), fHalf = w("half", 0, 12);
const fSnot = w("snot"), fGills = w("gills"), fSharks = w("sharks"), fSpit = w("spit"), fGag = w("gagging,"), fSwim = w("swim");
const fFire = w("firefighters"), fBull = w("bulldozer"), fHoses = w("hoses"), f300 = w("three", 0, 16), fDino = w("dinosaurs."), fPlan = w("plan?"), fDisg = w("disgusting."), fWork = w("working.");

// 1 HOOK: a normal coastal highway...
add(0, fInto - 2, [COAST, { d: 1, draw: (g, f) => { flatbed(g, -300 + f * 9, 1450, 0.8, 13); hatch(g, 1100 - f * 7, 1560, 0.6, "#c9443c", true); } }],
  camKeys([{ f: 0, c: { z: 1.05, y: 1410 }, creep: 0.0015 }]), { bg: "#4f8fdc" });
// ... becomes a river of slime
add(fInto - 2, B(1), [COAST, { d: 1, draw: (g, f) => {
  const t = f - fInto;
  hatch(g, 300, 1560, 0.6, "#c9443c"); hatch(g, 820, 1470, 0.5, "#4a8ad8", true);
  slimeSheet(g, 540, 1560, 1700, 260, easeOut(clamp01(t / 18)), 3, f);
  slimeSheet(g, 300, 1440, 560, 300, easeOut(clamp01((t - 6) / 14)), 4, f);
  slimeSheet(g, 820, 1360, 480, 260, easeOut(clamp01((t - 10) / 14)), 5, f);
  for (let i = 0; i < 9; i++) hag(g, 80 + i * 120, 1500 + (i % 3) * 40 - Math.max(0, 20 - t) * 6, 0.45, { f: f + i * 4, seed: i, expr: "panic", slime: 0.6 }, (i % 2 ? 0.2 : -0.2), i % 2 === 1);
} }], camKeys([{ f: fInto - 2, c: { z: 1.15, y: 1610, r: 0.02 }, creep: 0.0025 }]), { kicks: [fSlime0], bg: "#4f8fdc" });

// 2 THE TRUCK (line 1): cruising down Highway 101, thirteen containers of hagfish
add(B(1), fHag1 - 6, [SKYPAN, COASTW, { d: 1, draw: (g, f) => flatbed(g, -200 + (f - B(1)) * 12, 1450, 0.95, 13) }],
  camKeys([{ f: B(1), c: { z: 1.0, x: 300, y: 1410 }, creep: 0.0008 }, { f: fCont, c: { z: 1.15, x: 260 + (fCont - B(1)) * 12, y: 1510 }, dur: 20 }]), { bg: "#4f8fdc" });
// 2b inside a tote
const toteCU = (g: Ctx, f: number, n: number) => {
  rr(g, 120, 900, 840, 520, 20, lg(g, 120, 0, 960, 0, [[0, "#4a8ad8"], [1, "#2f5f9e"]]), 8);
  for (let i = 0; i < n; i++) hag(g, 250 + (i % 4) * 190, 960 - Math.floor(i / 4) * 30 + Math.sin(f * 0.2 + i) * 14, 0.55, { f: f + i * 5, seed: i, expr: i % 3 ? "calm" : "panic", wig: 1.4 }, -0.6 + (i % 4) * 0.4);
  rr(g, 100, 1000, 880, 460, 20, lg(g, 100, 0, 980, 0, [[0, "#4a8ad8"], [1, "#2f5f9e"]]), 8);
  line(g, [[130, 1080], [950, 1080]], rgba(INKC, 0.5), 5);
};
add(fHag1 - 6, B(2) + 40, [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#8cc4f0", "#a9d4f4", 20, f * 0.004) }, { d: 1, draw: (g, f) => toteCU(g, f, 8) }],
  camKeys([{ f: fHag1 - 6, c: { z: 1.0, y: 1000 }, creep: 0.002 }]), { kicks: [fHag1], bg: "#8cc4f0" });

// 3 7,500 LB -> KOREA -> they eat them (line 2)
add(B(2) + 40, fKorea - 4, [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#ffd84a", "#ffc93a", 20, f * 0.004) }, { d: 1, draw: (g, f) => {
  // a mountain of hagfish on a giant scale
  rr(g, 190, 1340, 700, 60, 10, "#9aa4b0", 6); rr(g, 500, 1400, 80, 200, 6, "#9aa4b0", 6); rr(g, 340, 1600, 400, 50, 10, "#9aa4b0", 6);
  for (let i = 0; i < 22; i++) hag(g, 260 + (i % 6) * 110, 1300 - Math.floor(i / 6) * 70 + Math.sin(f * 0.2 + i) * 6, 0.42, { f: f + i * 3, seed: i, expr: "panic", wig: 1.2 }, (i % 3 - 1) * 0.4, i % 2 === 0);
  g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 12; g.font = "900 120px CapFont"; g.textAlign = "center";
  const k = pop(f, B(2) + 44, 8); g.save(); g.translate(540, 520); g.scale(k, k); g.strokeText("7,500 LB", 0, 0); g.fillText("7,500 LB", 0, 0); g.restore();
} }], camKeys([{ f: B(2) + 40, c: { z: 1.0, y: 1050 }, creep: 0.0018 }]), { bg: "#ffd84a" });
add(fKorea - 4, B(3), [{ key: "diner", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  g.fillStyle = lg(g, 0, -700, 0, 2600, [[0, "#f2c8a0"], [1, "#d89a6a"]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
  for (let i = 0; i < 6; i++) { ell(g, -200 + i * 300, 260, 60, 80, "#e8322e", 5); line(g, [[-200 + i * 300, 180], [-200 + i * 300, 100]], INKC, 4); }
  rr(g, BIG[0], 1350, BIG[2] - BIG[0], 900, 0, "#8a5a34", 6);
} }, { d: 1, draw: (g, f) => {
  who(g, DINER, 540, 1640, 1050, f, 101, { expr: f > fEat ? "grin" : "smile", wave: 0.35 });
  rr(g, 0, 1300, 1080, 90, 10, "#a86a3a", 6);
  ell(g, 540, 1300, 300, 60, "#f4f4f0", 6);
  for (let i = 0; i < 3; i++) hag(g, 430 + i * 110, 1285, 0.25, { f: 0, seed: i, expr: "calm", wig: 0, pores: false }, 0.1);
  line(g, [[700, 980], [620, 1260]], "#c98a5a", 9); line(g, [[740, 990], [650, 1262]], "#c98a5a", 9);
  if (f > fEat) for (let i = 0; i < 3; i++) { const k = pop(f, fEat + i * 4, 6); ell(g, 300 + i * 240, 520, 26 * k, 26 * k, "#ff7ad9", 4); }
} }], camKeys([{ f: fKorea - 4, c: { z: 1.0, y: 1000 }, creep: 0.0018 }]), { bg: "#f2c8a0" });

// 4 ROADWORKS -> SLAMS ON THE BRAKES (line 3)
add(B(3), fSlams - 3, [COAST, { d: 1, draw: (g, f) => {
  workSign(g, 860, 1300, 0.9);
  who(g, FLAGGER, 640, 1580, 760, f, 111, { expr: "neutral", facing: -1, wave: 0.5 });
  stopPaddle(g, 640 + 171 * 0.76 * -1 + 600 * 0.76 - 300 * 0.76, 1580 - 661 * 0.76 - 60, 0.7);
  flatbed(g, -500 + (f - B(3)) * 10, 1450, 0.8, 13);
} }], camKeys([{ f: B(3), c: { z: 1.0, y: 1360 }, creep: 0.0018 }]), { bg: "#4f8fdc" });
add(fSlams - 3, B(4), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 800, 2400, "#ff7a5a", "#ff9a6a", 22, f * 0.01) }, { d: 1, draw: (g, f) => {
  who(g, DRIVER, 540, 1750, 1300, f, 121, { expr: "shock", tilt: Math.sin(f * 1.2) * 3 });
  rr(g, 60, 1200, 960, 90, 30, "#3a3d47", 8);
  ell(g, 540, 1250, 300, 70, null, 26, 0, INKC); ell(g, 540, 1250, 300, 70, null, 16, 0, "#5d6170");
  for (let i = 0; i < 5; i++) line(g, [[100 + i * 30, 500 + i * 60], [20 + i * 30, 520 + i * 60]], "#ffffff", 10);
} }, { screen: true, draw: (g, f) => speedLines(g, 540, 900, f, 26, "rgba(255,255,255,0.7)", 560, 1500) }],
  camKeys([{ f: fSlams - 3, c: { z: 1.1, y: 960 }, creep: 0.004 }]), { kicks: [fSlams], kickAmp: 30, bg: "#ff7a5a" });

// 5 A CONTAINER FLIES (line 4) + the rest tip over
add(B(4), B(5), [COAST, { d: 1, draw: (g, f) => {
  const tFly = f - fFlies, crashK = f >= fSmash;
  flatbed(g, 120, 1450, 0.8, f >= fRest ? 0 : 12);
  // flying tote: arc from the bed to the oncoming car
  const u = clamp01(tFly / Math.max(6, fSmash - fFlies));
  const tx = 0 + 120 + (760 - 120) * u, ty = 1260 - Math.sin(u * Math.PI) * 420 + u * 120;
  hatch(g, 860, 1560, 0.6, "#c9443c", true);
  if (!crashK) tote(g, tx, ty, 1.0, u * 6);
  else {
    tote(g, 720, 1420, 1.0, 0.5);
    for (let i = 0; i < 5; i++) hag(g, 760 + (i - 2) * 60, 1380 - (f - fSmash) * 4 + i * 10, 0.3, { f, seed: i, expr: "panic" }, i);
    exclaim(g, 860, 1100, 160 * pop(f, fSmash, 6), "#ffe14d", 0.2);
  }
  // the stack tumbling off the bed on "the rest tip over"
  if (f >= fRest) for (let i = 0; i < 10; i++) {
    const t = f - fRest - i, k = easeOut(clamp01(t / 10));
    if (t < 0) { tote(g, -270 + (i % 5) * 94, 1362 - Math.floor(i / 5) * 66, 0.8); continue; }
    tote(g, -270 + (i % 5) * 94 + k * (40 + i * 18), 1362 - Math.floor(i / 5) * 66 + k * (180 + (i % 3) * 30), 0.8, k * (0.8 + (i % 3) * 0.6));
  }
} }], camKeys([{ f: B(4), c: { z: 1.0, x: 500, y: 1460 }, creep: 0.0015 }, { f: fSmash, c: { z: 1.12, x: 640, y: 1510, r: 0.03 }, dur: 6 }]), { kicks: [fSmash, fRest + 6], bg: "#4f8fdc" });

// 6 THOUSANDS POUR ONTO THE HIGHWAY (line 5)
add(B(5), B(6), [COAST, { d: 1, draw: (g, f) => {
  for (let i = 0; i < 6; i++) tote(g, 60 + i * 170, 1520 - (i % 2) * 40, 0.85, 1.2 + (i % 3) * 0.3);
  const t = f - fPour;
  for (let i = 0; i < 26; i++) {
    const sx = 100 + (i % 6) * 170, k = easeOut(clamp01((t - (i % 7) * 2) / 20));
    hag(g, sx + k * (rnd(i, 1) - 0.5) * 500, 1500 + k * (rnd(i, 2) * 300 - 120), 0.42, { f: f + i * 5, seed: i, expr: "panic", wig: 1.5 }, rnd(i, 3) * 6, i % 2 === 0);
  }
} }], camKeys([{ f: B(5), c: { z: 1.0, y: 1560 }, creep: 0.002 }]), { bg: "#4f8fdc" });

// 7 WHEN THEY PANIC, THEY MAKE SLIME (line 6)
const ASPHALT: Layer = { key: "asphalt", d: 0.5, bounds: BIG, res: 0.7, paint: (g) => {
  g.fillStyle = lg(g, 0, BIG[1], 0, BIG[3], [[0, "#5a5e6a"], [1, "#43465a"]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
  for (let i = 0; i < 300; i++) ell(g, BIG[0] + rnd(i, 1) * (BIG[2] - BIG[0]), BIG[1] + rnd(i, 2) * (BIG[3] - BIG[1]), 3 + rnd(i, 3) * 4, 3, "rgba(255,255,255,0.12)", 0);
  for (let y = -600; y < 2600; y += 520) rr(g, 470, y, 140, 300, 8, "#ffd84a", 0);
} };
add(B(6), B(7), [ASPHALT, { d: 1, draw: (g, f) => {
  const sl = easeOut(ramp(f, fMake, fMake + 30));
  if (sl > 0) slimeSheet(g, 540, 1180, 900, 380, sl, 9, f);
  hag(g, 540, 960, 2.0, { f, seed: 3, expr: f > fPanic ? "panic" : "calm", slime: sl, wig: 1.2 });
  if (f > fPanic) for (let i = 0; i < 4; i++) ell(g, 300 + i * 160, 700 - ((f * 3 + i * 20) % 60), 10, 16, "#9fd4ff", 3);
} }], camKeys([{ f: B(6), c: { z: 1.0, y: 960 }, creep: 0.0015 }, { f: fMake, c: { z: 1.15, y: 1000 }, dur: 20 }]), { bg: "#5a5e6a" });

// 8 EXTREMELY PANICKED (line 7)
add(B(7), B(8), [ASPHALT, { d: 1, draw: (g, f) => {
  for (let i = 0; i < 12; i++) {
    const x = 120 + (i % 4) * 280, y = 520 + Math.floor(i / 4) * 360, sh = f >= fExt ? Math.sin(f * 2.1 + i) * 8 : 0;
    hag(g, x + sh, y, 0.7, { f: f + i * 7, seed: i, expr: "panic", wig: 1.8, slime: 0.4 + 0.6 * ramp(f, B(7), B(8)) }, (i % 3 - 1) * 0.5, i % 2 === 0);
  }
} }], camKeys([{ f: B(7), c: { z: 1.0, y: 960 }, creep: 0.001 }, { f: fExt, c: { z: 1.2, y: 960, r: 0.03 }, dur: 8 }]), { kicks: [fExt], bg: "#5a5e6a" });

// 9 CARS COATED, SNEEZED ON BY A GIANT (line 8)
add(B(8), B(9), [COAST, { d: 1, draw: (g, f) => {
  hatch(g, 540, 1560, 1.15, "#c9443c");
  const k = easeOut(ramp(f, fCoat, fCoat + 25));
  slimeSheet(g, 540, 1420, 1000, 360 * k + 40, Math.max(0.15, k), 21, f);
  slimeSheet(g, 540, 1300, 640, 200, k, 22, f);
  // wipers flailing
  const wa = Math.sin(f * 0.6) * 0.6;
  line(g, [[480, 1390], [480 + Math.cos(-1.2 + wa) * 160, 1390 + Math.sin(-1.2 + wa) * 160]], INKC, 8);
  // the giant's sneeze
  if (f > fSneeze - 10) {
    const t = f - fSneeze;
    at(g, 540, -60 + Math.max(0, -t) * 20, 1, (gg) => {
      path(gg, smoothClosed([[-220, -300], [-160, 150], [-240, 260], [-120, 300], [0, 250], [120, 300], [240, 260], [160, 150], [220, -300]], 4));
      gg.fillStyle = lg(gg, -240, 0, 240, 0, [[0, "#f5c9a0"], [1, "#d89a6a"]]); gg.fill(); gg.lineWidth = 8; gg.strokeStyle = INKC; gg.stroke();
      ell(gg, -70, 250, 34, 20, "#5a2a1e", 0); ell(gg, 70, 250, 34, 20, "#5a2a1e", 0);
    });
    if (t > 0) for (let i = 0; i < 30; i++) { const u = clamp01((t - i * 0.3) / 10), a = Math.PI / 2 + (rnd(i, 1) - 0.5) * 1.2; ell(g, 540 + Math.cos(a) * u * 900, 200 + Math.sin(a) * u * 1100, 14 + rnd(i, 2) * 20, 12 + rnd(i, 3) * 14, "rgba(236,246,226,0.9)", 3, 0, "rgba(120,150,110,0.95)"); }
  }
} }], camKeys([{ f: B(8), c: { z: 1.0, y: 1410 }, creep: 0.0015 }, { f: fSneeze, c: { z: 0.95, y: 1260, r: -0.03 }, dur: 10 }]), { kicks: [fSneeze + 2], bg: "#4f8fdc" });

// 10 WAIT (line 9)
add(B(9), B(10), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 800, 2400, "#ffd84a", "#ffc93a", 22, f * 0.004) }, { d: 1, draw: (g, f) => {
  who(g, MOTORIST, 540, 2000, 1400, f, 131, { expr: "nervous" });
  slimeSheet(g, 540, 700, 420, 220, 1, 31, f);
  questionMark(g, 820, 360, 240 * pop(f, fWait + 2, 7), "#ffffff", 0.2);
  questionMark(g, 240, 440, 190 * pop(f, fWait + 30, 7), "#ffffff", -0.2);
} }], camKeys([{ f: B(9), c: { z: 1.25, y: 900 }, creep: 0.001 }, { f: fWait + 4, c: { z: 1.05, y: 960 }, dur: 8 }]), { kicks: [fWait + 1], bg: "#ffd84a" });

// 11-13 SCIENCE: glands -> yarn skeins -> unravel, 10,000x in half a second
const LAB: Layer = { key: "aqua", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => { underwater(g, BIG[0], BIG[1], BIG[2], BIG[3], "#3fa6c9", "#0f4f79", 0.18, 3); } };
add(B(10), B(11), [LAB, { d: 1, draw: (g, f) => {
  hag(g, 540, 960, 2.3, { f, seed: 5, expr: "calm", wig: 0.4, pores: false });
  // pores light up in a wave along the body
  for (let i = 2; i < 15; i++) {
    const t = i / 16, x = 540 + 2.3 * 420 * (t - 0.5), y = 960 + 2.3 * (Math.sin(t * 7 - f * 0.14 + 5) * 26 * 0.4 * (1 - t * 0.6)) + 22;
    const on = clamp01((f - fGlands + 12 - i * 2) / 6);
    ell(g, x, y, 9 + 5 * on, 9 + 5 * on, on > 0 ? "#fff3a0" : "#fff6f0", 3);
    if (on > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, x, y, 0, 50, [[0, "rgba(255,240,150,0.5)"], [1, "rgba(255,240,150,0)"]]); g.fillRect(x - 50, y - 50, 100, 100); g.restore(); }
  }
} }, { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 50, f, 3) }],
  camKeys([{ f: B(10), c: { z: 1.0, y: 960 }, creep: 0.0012 }]), { bg: "#0f4f79" });
add(B(11), B(12), [LAB, { d: 1, draw: (g, f) => {
  // magnified gland: a circle "lens" full of wound skeins
  ell(g, 540, 900, 380, 380, "#f2c6c4", 10);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, r = i ? 200 : 0; skein(g, 540 + Math.cos(a) * r, 900 + Math.sin(a) * r, 70 * pop(f, fBalls + i * 2, 6), 0, f, i); }
  if (f > fYarn) { const k = pop(f, fYarn, 8); at(g, 860, 1330, k, (gg) => { skein(gg, 0, 0, 80, 0, f, 9); line(gg, [[60, 40], [180, 120], [140, 200]], "#f4f0e2", 5); }); }
} }], camKeys([{ f: B(11), c: { z: 1.0, y: 960 }, creep: 0.0018 }]), { bg: "#0f4f79" });
add(B(12), B(13), [LAB, { d: 1, draw: (g, f) => {
  const u = easeOut(ramp(f, fUnravel, fUnravel + 20)), ex = easeOut(ramp(f, fExp, fExp + 14));
  for (let i = 0; i < 5; i++) skein(g, 340 + (i % 3) * 200, 800 + Math.floor(i / 3) * 220, 60, u, f, i);
  if (ex > 0) {
    g.save(); g.globalAlpha = 0.8;
    poly(g, blob(540, 900, 120 + 900 * ex, 100 + 1000 * ex, 7, 12, 0.18), "rgba(236,246,226,0.9)", 6, "rgba(120,150,110,0.95)");
    g.restore();
    for (let i = 0; i < 8; i++) line(g, smoothClosed([[540 + Math.cos(i) * 300 * ex, 900 + Math.sin(i) * 300 * ex], [540 + Math.cos(i + 1) * 500 * ex, 900 + Math.sin(i + 1.3) * 600 * ex], [540 + Math.cos(i + 2) * 700 * ex, 900 + Math.sin(i + 2) * 700 * ex]], 3), "rgba(255,255,255,0.7)", 4);
  }
  if (f > fHalf - 6) {
    const k = pop(f, fHalf - 6, 7);
    at(g, 540, 520, k, (gg) => { ell(gg, 0, 0, 120, 120, "#ffffff", 8); ell(gg, 0, -135, 20, 14, "#ffffff", 6); line(gg, [[0, 0], [0, -90]], INKC, 8); line(gg, [[0, 0], [Math.cos(-Math.PI / 2 + Math.PI * 0.2) * 70, Math.sin(-Math.PI / 2 + Math.PI * 0.2) * 70]], "#e8322e", 8);
      gg.fillStyle = INKC; gg.font = "900 44px CapFont"; gg.textAlign = "center"; gg.fillText("0.4s", 0, 70); });
  }
} }], camKeys([{ f: B(12), c: { z: 1.0, y: 960 }, creep: 0.0015 }, { f: fExp, c: { z: 0.9, y: 960 }, dur: 14 }]), { kicks: [fExp + 2], bg: "#0f4f79" });

// 14 SNOT AIRBAG (line 13)
add(B(13), B(14), [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 900, 2400, "#9ad94a", "#b8e86a", 22, f * 0.006) }, { d: 1, draw: (g, f) => {
  airbag(g, 540, 1050, 1.6, ramp(f, fSnot - 4, fSnot + 6), true);
} }], camKeys([{ f: B(13), c: { z: 1.0, y: 960 }, creep: 0.002 }]), { kicks: [fSnot], kickAmp: 30, bg: "#9ad94a" });

// 15 SHARKS GAG (line 14)
const SEA: Layer = { key: "sea2", d: 0.35, bounds: BIG, res: 0.6, paint: (g) => {
  underwater(g, BIG[0], BIG[1], BIG[2], BIG[3], "#2f8fbf", "#0b3a66", 0.2, 8);
  for (let i = 0; i < 6; i++) rock(g, -500 + i * 420, 1900, 300, 220, "#4c5d78", i + 9);
  seabed(g, BIG[0], BIG[2], 1850, BIG[3], "#c9b07c", 7);
} };
add(B(14), B(15), [SEA, { d: 1, draw: (g, f) => {
  const bite = f >= fGills - 6, gag = easeOut(ramp(f, fSpit, fSpit + 10)), away = Math.max(0, f - fSwim);
  const hx = 380, hy = 1100;
  if (!bite) { shark(g, 1100 - (f - B(14)) * 6, 820, 0.9, f, { mouth: ramp(f, B(14) + 10, fGills - 6), flip: true }); hag(g, hx, hy, 0.9, { f, seed: 2, expr: "panic" }); }
  else if (gag <= 0) {
    shark(g, 640, 900, 0.9, f, { mouth: 1, flip: true });
    poly(g, blob(500, 1000, 260 + (f - fGills) * 8, 200 + (f - fGills) * 6, 3, 10, 0.2), "rgba(236,246,226,0.85)", 5, "rgba(120,150,110,0.95)");
    hag(g, hx, hy, 0.9, { f, seed: 2, expr: "panic", slime: 1 });
  } else {
    shark(g, 700 + away * 22, 820 - away * 6, 0.9, f, { gag, mouth: 0.4 });
    hag(g, hx, hy, 0.9, { f, seed: 2, expr: "smug", slime: 0.8 });
    if (away < 30) for (let i = 0; i < 3; i++) soundLines(g, 640 + away * 22, 820, Math.PI, f, "#ffffff", 2, 0.7);
  }
} }, { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 60, f, 8) }],
  camKeys([{ f: B(14), c: { z: 1.0, y: 980 }, creep: 0.0012 }, { f: fGills, c: { z: 1.15, x: 500, y: 1000, r: 0.02 }, dur: 8 }, { f: fSwim, c: { z: 1.0, x: 620, y: 960, r: 0 }, dur: 30 }]), { kicks: [fGills - 4], bg: "#0b3a66" });

// 16 FIREFIGHTERS + BULLDOZER (line 15)
add(B(15), B(16), [COAST, { d: 1, draw: (g, f) => {
  slimeSheet(g, 540, 1560, 1600, 220, 1, 41, f);
  const bx = 1400 - easeOut(ramp(f, fBull - 10, fBull + 40)) * 700;
  for (let i = 0; i < 10; i++) hag(g, bx - 330 - (i % 5) * 40, 1480 - Math.floor(i / 5) * 40, 0.35, { f: f + i * 3, seed: i, expr: "panic", slime: 0.5 }, i);
  bulldozer(g, bx, 1560, 0.9, f, true);
  who(g, FIREFIGHTER, 230, 1500, 780, f, 141, { expr: "stern", facing: 1, wave: 0.3 });
  if (f > fHoses - 6) hoseSpray(g, 380, 1050, 0.45, 520, f);
  line(g, [[230, 1100], [380, 1050]], INKC, 14); line(g, [[230, 1100], [380, 1050]], "#d8332c", 8);
} }], camKeys([{ f: B(15), c: { z: 1.0, y: 1410 }, creep: 0.0015 }]), { bg: "#4f8fdc" });

// 17 300 MILLION YEARS, LONGER THAN THE DINOSAURS (line 16)
add(B(16), B(17), [{ key: "prehistoric", d: 0.4, bounds: BIG, res: 0.6, paint: (g) => {
  sky(g, BIG[0], BIG[1], BIG[2], 1100, "#f2a24a", "#ffe0a0", "#f8c070");
  for (let i = 0; i < 4; i++) poly(g, [[-700 + i * 700, 1100], [-400 + i * 700, 650 + (i % 2) * 120], [-100 + i * 700, 1100]], "#8a5a4a", 5);
  ell(g, 880, 520, 90, 90, "#fff1c4", 0);
  seaSurface(g, BIG[0], BIG[2], 1100, BIG[3], "#3f8fb0", "#1f5f86", 6, "rgba(255,255,255,0.4)");
} }, { d: 1, draw: (g, f) => {
  const k = pop(f, fDino - 6, 9);
  if (k > 0) at(g, 760, 1180, 1.25 * k, (gg) => trex(gg, 0, 0, 1));
  hag(g, 330, 1300 + Math.sin(f * 0.1) * 10, 1.1, { f, seed: 4, expr: f > fDino ? "smug" : "calm" }, -0.15);
  g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 12; g.font = "900 110px CapFont"; g.textAlign = "center";
  const t = pop(f, f300, 8); g.save(); g.translate(540, 360); g.scale(t, t); g.strokeText("300,000,000", 0, 0); g.fillText("300,000,000", 0, 0); g.font = "900 64px CapFont"; g.strokeText("YEARS", 0, 80); g.fillText("YEARS", 0, 80); g.restore();
} }], camKeys([{ f: B(16), c: { z: 1.0, y: 1000 }, creep: 0.0015 }]), { bg: "#f2a24a" });

// 18 THE PLAN: BE DISGUSTING (line 17)
add(B(17), B(18), [LAB, { d: 1, draw: (g, f) => {
  hag(g, 400, 980, 1.7, { f, seed: 6, expr: "smug", slime: f > fDisg ? 1 : 0.3, wig: 0.6 }, -0.12);
  if (f > fDisg - 4) stink(g, 420, 760, f, 5, 1.3);
} }], camKeys([{ f: B(17), c: { z: 1.0, y: 980 }, creep: 0.0015 }, { f: fDisg, c: { z: 1.12, x: 600, y: 960, r: 0.02 }, dur: 8 }]), { bg: "#0f4f79" });

// 19 IT'S WORKING (line 18 to the end)
add(B(18), TOTAL, [COAST, { d: 1, draw: (g, f) => {
  slimeSheet(g, 540, 1560, 1700, 260, 1, 51, f);
  hatch(g, 280, 1560, 0.55, "#4a8ad8"); slimeSheet(g, 280, 1450, 360, 180, 1, 52, f);
  who(g, FIREFIGHTER, 800, 1520, 760, f, 141, { expr: "dazed", facing: -1 });
  slimeSheet(g, 800, 1100, 260, 200, 1, 53, f);
  hag(g, 480, 1300, 1.0, { f, seed: 7, expr: "smug", slime: 0.6 }, -0.2);
  if (f > fWork + 4) { const k = pop(f, fWork + 4, 7); at(g, 520, 1100, k, (gg) => { ell(gg, 0, 0, 40, 40, "#ffd84a", 5); line(gg, [[-14, 0], [-4, 12], [16, -12]], INKC, 6); }); }
} }], camKeys([{ f: B(18), c: { z: 1.05, y: 1510 }, creep: 0.0018 }, { f: fWork, c: { z: 1.2, x: 520, y: 1510 }, dur: 12 }]), { kicks: [fWork + 4], bg: "#4f8fdc" });

export const story: Story = { total: TOTAL, shots, flashes: [B(1) - 4], xfade: { 2: 6, 4: 8, 6: 6, 8: 8, 9: 6, 13: 8, 16: 8, 17: 8, 19: 8, 20: 8 } };
void [smooth, light, dark, horizonGlow, bubble, kelp, seagull, exclaim, H, rr, path, DINER];
