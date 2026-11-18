// "It Rained Whale": shot list timed to voice/words.json (frames at 30 fps).
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, smooth, easeOut, rnd, sprite, blinkAt, shadow, clamp01, pw } from "../../lib/engine";
import {
  INKC, P, sky, cloud, seaSurface, horizonGlow, rock, room, windowFrame, speedLines, questionMark, exclaim, burstBg, confetti,
  poly, line, ell, rr, lg, rg, light, dark, rgba, blob, path, smoothClosed, soundLines, pine,
} from "../../lib/paint";
import { seagull } from "../herring/actors";
import {
  ENGINEER, WORKER, WALTER, REPORTER, CAMERAMAN, SALESMAN, COOK, crowdOutfit, spermWhale, stink, fly, crate, stickDyn, plunger,
  fireball, smoke, blubber, arcPos, splat, car70, trafficCone, roadSign, thoughtBubble, tvCamera, banner, pudding,
} from "./actors";
import { bodyFront, bodySide, Outfit, Expr } from "../../lib/toon";

export const TOTAL = 2130;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];
const WIDE: [number, number, number, number] = [-700, -700, 3200, H + 700];

const who = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, seed: number, opt: { expr?: Expr; facing?: -1 | 0 | 1; wave?: number; look?: number; tilt?: number; headTilt?: number; mode?: "stand" | "stroll" | "fall"; phase?: number; flip?: boolean } = {}) => {
  shadow(g, x, y, h * 0.2, 0.22);
  sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opt.expr ?? "neutral", mode: opt.mode ?? "stand", phase: opt.phase, blink: blinkAt(f, seed), seed, facing: opt.facing ?? 0, wave: opt.wave, look: opt.look, tilt: opt.tilt, headTilt: opt.headTilt }), opt.flip);
};

// ---------------- the beach ----------------
const beachPaint = (g: Ctx, x0: number, x1: number, yH = 760) => {
  sky(g, x0, BIG[1], x1, yH, "#5e93d9", "#e3edf5", "#a9c8ea");
  for (let i = 0; i < 5; i++) cloud(g, x0 + 200 + i * 600, 220 + (i % 2) * 160, 0.9 + (i % 3) * 0.2, "#ffffff", "#cbd8ec", i);
  seaSurface(g, x0, x1, yH, 960, "#5b8fc8", "#3f7fb0", 5);
  horizonGlow(g, x0, x1, yH);
  // Oregon sea stacks
  for (const [sx, sw, sh] of [[x0 + 260, 160, 260], [x0 + 520, 90, 150], [x1 - 380, 200, 330], [x1 - 140, 110, 180]] as [number, number, number][])
    poly(g, blob(sx, yH + 120 - sh / 2, sw / 2, sh / 2, sx, 8, 0.2).map(([x, y]) => [x, Math.min(y, yH + 150)] as P), lg(g, sx - sw, 0, sx + sw, 0, [[0, "#6d6a72"], [1, "#3e3a46"]]), 5);
  // surf + wet sand + dry sand
  g.fillStyle = "#cfe8f2"; g.beginPath(); g.moveTo(x0, 950);
  for (let x = x0; x <= x1; x += 40) g.lineTo(x, 950 + Math.sin(x * 0.02) * 10);
  g.lineTo(x1, 990); g.lineTo(x0, 990); g.closePath(); g.fill();
  g.fillStyle = lg(g, 0, 980, 0, 1100, [[0, "#b9a27a"], [1, "#d9c08f"]]); g.fillRect(x0, 980, x1 - x0, 140);
  g.fillStyle = lg(g, 0, 1100, 0, BIG[3], [[0, "#e6cf9c"], [1, "#d2b47e"]]); g.fillRect(x0, 1100, x1 - x0, BIG[3] - 1100);
  for (let i = 0; i < 120; i++) ell(g, x0 + rnd(i, 1) * (x1 - x0), 1120 + rnd(i, 2) * 1400, 8 + rnd(i, 3) * 10, 3, "rgba(150,120,80,0.35)", 0);
};
const beachLayer = (key: string, bounds = BIG): Layer => ({ key, d: 0.6, bounds, res: 0.8, paint: (g) => beachPaint(g, bounds[0], bounds[2]) });
const BEACH = beachLayer("beach");
const BEACHW = beachLayer("beachWide", WIDE);
const whaleAt = (g: Ctx, f: number, x: number, y: number, s: number, o: { crater?: number; stinkOn?: boolean } = {}) => {
  shadow(g, x - 60 * s, y + 4, 620 * s, 0.3);
  at(g, x, y, s, (gg) => spermWhale(gg, { crater: o.crater, f }));
  if (o.stinkOn !== false) stink(g, x - 60 * s, y - 380 * s, f, 4, s * 1.4);
  for (let i = 0; i < 3; i++) fly(g, x + 150 * s, y - 350 * s, f, i * 2);
};

const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

// 1 HOOK (0-80): a dead whale on the beach
add(0, 80, [BEACH, { d: 1, draw: (g, f) => whaleAt(g, f, 520, 1230, 1.05) }],
  camKeys([{ f: 0, c: { z: 1.35, x: 760, y: 1000, r: 0.02 }, creep: 0.002 }, { f: 66, c: { z: 1.0, x: 560, y: 1010, r: 0 }, dur: 24 }]), { bg: "#e6cf9c" });

// 2 HOOK (80-152): half a ton of dynamite stacks up next to it
const CRATES: [number, number][] = [];
for (let row = 0; row < 5; row++) for (let i = 0; i < 5 - row; i++) CRATES.push([700 + i * 118 + row * 59, 1500 - row * 100]);
const crateStack = (g: Ctx, f: number, f0: number, f1: number, s = 0.75) => {
  CRATES.forEach(([x, y], i) => {
    const k = pop(f, f0 + (i * (f1 - f0)) / CRATES.length, 6);
    if (k > 0) crate(g, x, y, s * k);
  });
};
add(80, 152, [BEACH, { d: 1, draw: (g, f) => { whaleAt(g, f, 330, 1240, 0.8); crateStack(g, f, 100, 124); stickDyn(g, 860, 1060, 1.3 * pop(f, 122, 6), 0.2, 1, f); } }],
  camKeys([{ f: 80, c: { z: 1.0, x: 560, y: 1050 }, creep: 0.0018 }, { f: 120, c: { z: 1.12, x: 640, y: 1100, r: -0.02 }, dur: 10 }]), { kicks: [122], bg: "#e6cf9c" });

// 3 ESTABLISHING (152-268): a 45-foot sperm whale on the beach in Florence, Oregon
add(152, 268, [BEACHW, { d: 1, draw: (g, f) => {
  whaleAt(g, f, 1250, 1300, 1.25);
  seagull(g, 400 + f * 1.2, 500 + Math.sin(f * 0.1) * 30, 0.9, f, true);
  for (let i = 0; i < 3; i++) who(g, crowdOutfit(i + 2), 300 + i * 120, 1500 + (i % 2) * 30, 520, f, 40 + i, { expr: "pained", facing: 1 });
} }],
  camKeys([{ f: 152, c: { z: 0.95, x: 1700, y: 1050 }, creep: 0.0006 }, { f: 220, c: { z: 0.95, x: 900, y: 1050 }, dur: 70 }]), { bg: "#e6cf9c" });

// 4 STINK (268-318): eight tons and it stinks
add(268, 318, [BEACH, { d: 1, draw: (g, f) => {
  at(g, 360, 1250, 1.6, (gg) => spermWhale(gg, { f }));
  const big = f >= 294 ? 1.6 : 1.0;
  stink(g, 600, 760, f, 5, big);
  for (let i = 0; i < 4; i++) fly(g, 700, 700, f, i * 3);
  // a seagull holding its nose with a wing + a local holding hers
  seagull(g, 880, 1010, 1.3, f);
  line(g, [[880 + 30, 980], [880 + 95, 975]], INKC, 12); line(g, [[880 + 30, 980], [880 + 95, 975]], "#9aa4b0", 7);
  who(g, crowdOutfit(1), 820, 1900, 1050, f, 41, { expr: f >= 294 ? "pained" : "nervous", facing: -1, wave: 0.15 });
} }], camKeys([{ f: 268, c: { z: 1.0, y: 960 }, creep: 0.002 }, { f: 296, c: { z: 1.12, y: 940, r: 0.03 }, dur: 8 }]), { kicks: [296], bg: "#e6cf9c" });

// 5 HIGHWAY DIVISION (318-472): the beach legally is a highway
add(318, 472, [BEACH, { d: 1, draw: (g, f) => {
  // painted centre line on the sand (pops on "highways")
  const k = ramp(f, 440, 470);
  for (let i = 0; i < 8; i++) { const x = -200 + i * 190; if (x > -200 + 1500 * k) break; rr(g, x, 1590, 110, 22, 6, "#ffd84a", 3); }
  whaleAt(g, f, 330, 1300, 0.75);
  // highway truck
  const tx = pw([[318, 1500], [345, 820], [360, 800]], f);
  at(g, tx, 1460, 0.7, (gg) => { rr(gg, -260, -300, 330, 230, 14, "#f08a2c", 6); rr(gg, 70, -220, 170, 150, 14, "#f08a2c", 6); rr(gg, 100, -200, 110, 70, 8, "#bfe3f2", 4);
    for (const wx of [-170, 140]) { ell(gg, wx, -50, 55, 55, "#1d1b22", 5); ell(gg, wx, -50, 25, 25, "#c9ccd2", 4); }
    gg.fillStyle = "#1d1b22"; gg.font = "900 46px CapFont"; gg.textAlign = "center"; gg.fillText("HIGHWAY", -95, -170); gg.fillText("DIV.", -95, -115); });
  who(g, ENGINEER, 650, 1600, 820, f, 51, { expr: f > 345 ? "smile" : "neutral", facing: 1 });
  who(g, WORKER, 450, 1620, 760, f, 52, { expr: "neutral", facing: 1 });
  const sk = pop(f, 447, 8);
  if (sk > 0) at(g, 930, 1700, sk, (gg) => roadSign(gg, 0, 0, 0.62, ["STATE", "HIGHWAY"]));
} }], camKeys([{ f: 318, c: { z: 1.0, y: 1080 }, creep: 0.0014 }, { f: 440, c: { z: 1.08, x: 640, y: 1150 }, dur: 20 }]), { bg: "#e6cf9c" });

// 6 ROCK IN THE ROAD (472-536)
add(472, 536, [BEACH, { d: 1, draw: (g, f) => {
  whaleAt(g, f, 450, 1350, 0.85);
  for (let i = 0; i < 5; i++) trafficCone(g, 80 + i * 220, 1520 + (i % 2) * 30, 0.9);
  rr(g, 640, 1380, 360, 60, 8, "#f4f4f0", 5);
  for (let i = 0; i < 4; i++) poly(g, [[650 + i * 90, 1380], [690 + i * 90, 1380], [650 + i * 90 + 40, 1440], [610 + i * 90 + 40, 1440]], "#e8322e", 0);
  rr(g, 640, 1380, 360, 60, 8, null, 5);
  who(g, ENGINEER, 840, 1650, 900, f, 51, { expr: "nervous", facing: -1, wave: 0.9 });
  thoughtBubble(g, 600, 520, 520, 380, 800, 860, (gg) => {
    gg.fillStyle = "#cfe3f2"; gg.fillRect(-300, -200, 600, 400);
    rr(gg, -300, 60, 600, 140, 0, "#5d6458", 0); for (let i = 0; i < 4; i++) rr(gg, -260 + i * 150, 120, 80, 14, 4, "#ffd84a", 0);
    rock(gg, 0, 90, 300, 200, "#7a7f8c", 5);
  }, easeOut(ramp(f, 496, 510)));
} }], camKeys([{ f: 472, c: { z: 1.0, y: 1060 }, creep: 0.0018 }]), { bg: "#e6cf9c" });

// 7 THE PLAN (536-641): tiny pieces, seagulls eat the rest
add(536, 641, [BEACH, { d: 1, draw: (g, f) => {
  who(g, ENGINEER, 560, 1860, 1350, f, 51, { expr: f > 590 ? "grin" : "smile", facing: 0, wave: 1 });
  thoughtBubble(g, 540, 440, 900, 560, 660, 760, (gg) => {
    gg.fillStyle = "#d9c08f"; gg.fillRect(-460, -330, 920, 660);
    gg.fillStyle = "#8cb7e6"; gg.fillRect(-460, -330, 920, 260);
    const burst = easeOut(ramp(f, 552, 575));
    if (burst < 0.5) at(gg, 0, 120, 0.42, (g3) => spermWhale(g3, { f }));
    else for (let i = 0; i < 18; i++) { const a = rnd(i, 4) * Math.PI * 2, r = 60 + rnd(i, 5) * 300; at(gg, Math.cos(a) * r, 120 + Math.sin(a) * r * 0.25, 1, (g3) => ell(g3, 0, 0, 16, 11, "#e9a98a", 3)); }
    if (burst > 0.1 && burst < 0.9) ell(gg, 0, 60, 260 * burst, 160 * burst, "#fff3b0", 5);
    if (f > 596) for (let i = 0; i < 4; i++) {
      const k = pop(f, 598 + i * 6, 7);
      if (k > 0) at(gg, -300 + i * 200, 100 + (i % 2) * 40, 0.9 * k, (g3) => { seagull(g3, 0, 0, 1, f + i * 7); rr(g3, 20, -10, 40, 30, 6, "#ffffff", 3); });
    }
  }, easeOut(ramp(f, 540, 556)));
} }], camKeys([{ f: 536, c: { z: 1.0, y: 980 }, creep: 0.0012 }]), { bg: "#e6cf9c" });

// 8 WALTER WARNS (641-785)
add(641, 785, [BEACH, { d: 1, draw: (g, f) => {
  whaleAt(g, f, 300, 1150, 0.55, { stinkOn: false });
  who(g, ENGINEER, 820, 1690, 980, f, 51, { expr: f > 760 ? "smile" : "neutral", facing: -1 });
  who(g, WALTER, 300, 1700, 1020, f, 61, { expr: f > 719 ? "stern" : "smile", facing: 1, wave: f > 700 ? 1 : undefined });
  if (f > 700) stickDyn(g, 300 + 171 * 1.02 - 2, 1700 - 661 * 1.02 - 20, 0.9, 0.15);
  if (f > 738) {
    const k = pop(f, 740, 8);
    at(g, 330, 380, k, (gg) => { rr(gg, -160, -110, 320, 200, 26, "#ffffff", 6); for (let i = 0; i < 6; i++) stickDyn(gg, -100 + i * 40, 60, 0.75, -0.2 + i * 0.08); });
  }
} }], camKeys([{ f: 641, c: { z: 1.0, y: 1050 }, creep: 0.0012 }, { f: 700, c: { z: 1.15, x: 430, y: 990 }, dur: 24 }]), { bg: "#e6cf9c" });

// 9 TWENTY CASES (785-834)
add(785, 834, [BEACH, { d: 1, draw: (g, f) => {
  whaleAt(g, f, 260, 1250, 0.65, { stinkOn: false });
  CRATES.forEach(([x, y], i) => crate(g, x - 160, y - 120, 0.95));
  for (let i = 0; i < 5; i++) crate(g, 980 + (i % 2) * 40, 1440 - i * 104, 0.95);
  who(g, WALTER, 300, 1950, 1350, f, 61, { expr: f > 800 ? "shock" : "neutral", facing: 1 });
} }], camKeys([{ f: 785, c: { z: 1.0, x: 600, y: 1080 }, creep: 0.0014 }, { f: 804, c: { z: 0.88, x: 620, y: 1060 }, dur: 8 }]), { kicks: [804], bg: "#e6cf9c" });

// 10 CROWD + TV CREW (834-938)
const crowdOn = (g: Ctx, f: number, x0: number, y0: number, n: number, h: number, seed: number, expr: Expr | ((i: number) => Expr), look = 0) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * h * 0.36 + (rnd(seed, i) - 0.5) * 30, y = y0 + (rnd(seed, i + 9) - 0.5) * 30;
    who(g, crowdOutfit(i + seed), x, y, h * (0.95 + 0.1 * rnd(seed, i + 3)), f, seed * 10 + i, { expr: typeof expr === "function" ? expr(i) : expr, facing: (i % 3 - 1) as -1 | 0 | 1, look });
  }
};
const DUNE: Layer = { key: "dune", d: 0.6, bounds: BIG, res: 0.8, paint: (g) => {
  beachPaint(g, BIG[0], BIG[2]);
  poly(g, [[BIG[0], 1250], [-100, 1100], [400, 1050], [900, 1120], [1400, 1060], [BIG[2], 1150], [BIG[2], BIG[3]], [BIG[0], BIG[3]]], lg(g, 0, 1050, 0, 1600, [[0, "#e9d5a6"], [1, "#cfb07a"]]), 6);
  for (let i = 0; i < 40; i++) { const x = -500 + i * 60, y = 1100 + Math.sin(i) * 30; line(g, [[x, y + 40], [x - 12, y - 30]], "#6b8a3a", 5); line(g, [[x + 8, y + 40], [x + 20, y - 20]], "#7fa04a", 5); }
} };
add(834, 938, [DUNE, { d: 0.8, draw: (g, f) => { crowdOn(g, f, -60, 1200, 13, 380, 3, "neutral"); crowdOn(g, f, -20, 1300, 12, 440, 5, "smile"); } },
  { d: 1, draw: (g, f) => { who(g, REPORTER, 300, 1760, 900, f, 71, { expr: "grin", facing: 1, wave: 0.35 }); line(g, [[480, 1060], [500, 1130]], INKC, 12); ell(g, 478, 1050, 22, 26, "#3a3d47", 4);
    who(g, CAMERAMAN, 840, 1780, 880, f, 72, { expr: "neutral", facing: -1 }); tvCamera(g, 700, 1640, 0.95, f, f > 905); } }],
  camKeys([{ f: 834, c: { z: 1.0, y: 1100 }, creep: 0.0012 }, { f: 885, c: { z: 1.12, x: 620, y: 1250 }, dur: 20 }]), { bg: "#e6cf9c" });

// 11 COUNTDOWN (938-980)
add(938, 980, [BEACH, { d: 1, draw: (g, f) => {
  who(g, ENGINEER, 560, 1700, 1000, f, 51, { expr: f > 957 ? "grin" : "nervous" });
  plunger(g, 560, 1640, 1.25, easeOut(ramp(f, 966, 975)));
} }], camKeys([{ f: 938, c: { z: 1.0, y: 1100 }, cut: true, creep: 0.002 }, { f: 947, c: { z: 1.15, y: 1080 }, cut: true, creep: 0.002 }, { f: 957, c: { z: 1.3, y: 1060, r: 0.03 }, cut: true, creep: 0.003 }]), { kicks: [975], bg: "#e6cf9c" });

// 12 BOOM (980-1010)
const CHUNKS = Array.from({ length: 26 }, (_, i) => ({ vx: (rnd(i, 1) - 0.35) * 34, vy: -45 - rnd(i, 2) * 30, s: 0.6 + rnd(i, 3) * 1.1, rot: rnd(i, 4) * 6, seed: i }));
add(980, 1010, [BEACH, { d: 1, draw: (g, f) => {
  const t = f - 980;
  whaleAt(g, f, 520, 1350, 0.9, { crater: easeOut(t / 6), stinkOn: false });
  smoke(g, 540, 1350, t - 4, 1.2, 3);
  fireball(g, 540, 1330, t, 1.3);
  for (const c of CHUNKS) { const [x, y] = arcPos(f, 981, 540, 1200, c.vx, c.vy, 1.4); blubber(g, x, y, c.s, c.rot + t * 0.2, c.seed); }
} }, { screen: true, draw: (g, f) => speedLines(g, 540, 1100, f, 30, "rgba(255,255,255,0.7)", 500, 1500) }],
  camKeys([{ f: 980, c: { z: 1.0, y: 1100 }, creep: -0.002 }]), { kicks: [981, 986], kickAmp: 40, bg: "#e6cf9c" });

// 13 RAINING WHALE (1010-1058)
add(1010, 1058, [DUNE, { d: 0.8, draw: (g, f) => crowdOn(g, f, -20, 1300, 12, 440, 5, (i) => (i % 3 ? "shock" : "nervous"), 0) },
  { d: 1.1, draw: (g, f) => {
    for (let i = 0; i < 22; i++) {
      const x = -100 + rnd(i, 7) * 1300, y0 = -400 - rnd(i, 8) * 900, y = y0 + (f - 1010) * (28 + rnd(i, 9) * 10);
      if (y < 1700) blubber(g, x, y, 0.7 + rnd(i, 10) * 0.9, i + f * 0.15, i);
      else splat(g, x, 1700 + rnd(i, 11) * 100, 0.8, i);
    }
  } }], camKeys([{ f: 1010, c: { z: 1.1, y: 1150 }, creep: 0.0015 }]), { bg: "#e6cf9c" });

// 14 SPLATTER PAN (1058-1191): crowd, cars, dunes
const LOT = (g: Ctx, f: number) => {
  // parking lot on the right part of the wide world
  rr(g, 1900, 1380, 1300, 700, 0, "#5d6170", 0);
  for (let i = 0; i < 6; i++) rr(g, 1950 + i * 200, 1420, 12, 120, 3, "#f4f4f0", 0);
  car70(g, 2150, 1700, 0.75, "#2f8a8a"); car70(g, 2700, 1720, 0.75, "#b8392e", 0, false, true);
};
add(1058, 1191, [BEACHW, { d: 1, draw: (g, f) => {
  whaleAt(g, f, 300, 1350, 0.75, { crater: 1, stinkOn: false });
  smoke(g, 320, 1350, f - 990, 1.1, 5);
  crowdOn(g, f, 1050, 1380, 6, 420, 7, (i) => (f > 1136 ? "shock" : "nervous"));
  LOT(g, f);
  for (let i = 0; i < 16; i++) {
    const tx = 900 + (i / 16) * 2000, f0 = 1050 + i * 6, dur = 40;
    const u = clamp01((f - f0) / dur), x = 320 + (tx - 320) * u, y = 1200 - Math.sin(u * Math.PI) * 900 + u * 300;
    if (u <= 0) continue;
    if (u < 1) blubber(g, x, y, 0.8 + rnd(i, 3) * 0.6, i + f * 0.2, i);
    else splat(g, tx, 1500 + rnd(i, 4) * 200, 0.9, i);
  }
} }], camKeys([{ f: 1058, c: { z: 1.0, x: 540, y: 1050 }, creep: 0.0004 }, { f: 1136, c: { z: 1.0, x: 1300, y: 1100 }, dur: 30 }, { f: 1162, c: { z: 1.0, x: 2300, y: 1150 }, dur: 30 }]), { bg: "#e6cf9c" });

// 15 WAIT (1191-1262)
add(1191, 1262, [{ d: 0.3, draw: (g, f) => burstBg(g, 540, 800, 2400, "#ffd84a", "#ffc93a", 22, f * 0.004) },
  { d: 1, draw: (g, f) => {
    who(g, ENGINEER, 540, 2000, 1400, f, 51, { expr: "dazed", facing: 0 });
    for (let i = 0; i < 5; i++) splat(g, 380 + rnd(i, 2) * 320, 640 + rnd(i, 3) * 700, 0.5, i + 3);
    questionMark(g, 820, 380, 240 * pop(f, 1193, 7), "#ffffff", 0.2);
    questionMark(g, 260, 460, 190 * pop(f, 1225, 7), "#ffffff", -0.2);
  } }], camKeys([{ f: 1191, c: { z: 1.25, y: 900 }, creep: 0.001 }, { f: 1196, c: { z: 1.05, y: 960 }, dur: 8 }]), { kicks: [1192], bg: "#ffd84a" });

// 16 DYNAMITE THROWS THINGS (1262-1365): blueprint diagram
const PAPER: Layer = { key: "paper", d: 0.3, bounds: BIG, res: 0.7, paint: (g) => {
  g.fillStyle = "#2c5f9e"; g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
  for (let x = BIG[0]; x < BIG[2]; x += 60) line(g, [[x, BIG[1]], [x, BIG[3]]], "rgba(255,255,255,0.12)", 2);
  for (let y = BIG[1]; y < BIG[3]; y += 60) line(g, [[BIG[0], y], [BIG[2], y]], "rgba(255,255,255,0.12)", 2);
} };
add(1262, 1365, [PAPER, { d: 1, draw: (g, f) => {
  const t = f - 1330;
  const blocks = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2, c: ["#e9a98a", "#f4d2b0", "#c8574a"][i % 3] }));
  if (t < 0) {
    blocks.forEach((b, i) => rr(g, 540 + Math.cos(b.a) * 120 - 40, 960 + Math.sin(b.a) * 120 - 40, 80, 80, 10, b.c, 5));
    stickDyn(g, 540, 1000, 1.3, 0, f > 1300 ? 1 : 0, f);
    if (f > 1308 && f < 1328) { at(g, 540, 600, pop(f, 1308, 6), (gg) => { ell(gg, 0, 0, 120, 70, "rgba(255,255,255,0.9)", 5); line(gg, [[-90, -50], [90, 50]], "#e8322e", 14); line(gg, [[90, -50], [-90, 50]], "#e8322e", 14); }); }
  } else {
    const k = easeOut(t / 14);
    if (t < 10) ell(g, 540, 960, 200 * k, 200 * k, "#fff3b0", 6);
    blocks.forEach((b, i) => {
      const r = 120 + 520 * k, x = 540 + Math.cos(b.a) * r, y = 960 + Math.sin(b.a) * r;
      rr(g, x - 40, y - 40, 80, 80, 10, b.c, 5);
      if (t > 4) { const ax = 540 + Math.cos(b.a) * (r - 120), ay = 960 + Math.sin(b.a) * (r - 120); line(g, [[540 + Math.cos(b.a) * 180, 960 + Math.sin(b.a) * 180], [ax, ay]], "#ffffff", 8); }
    });
  }
} }], camKeys([{ f: 1262, c: { z: 1.0, y: 960 }, creep: 0.0015 }]), { kicks: [1331], bg: "#2c5f9e" });

// 17 RUBBERY BLUBBER RIPS INTO SLABS (1365-1477)
add(1365, 1477, [PAPER, { d: 1, draw: (g, f) => {
  const stretch = f < 1437 ? 1 + 0.25 * Math.sin((f - 1375) * 0.5) * Math.exp(-Math.max(0, f - 1385) / 25) * (f > 1375 ? 1 : 0) : 1;
  if (f < 1441) {
    at(g, 540, 960, 1, (gg) => { gg.scale(stretch, 1 / stretch); blubber(gg, 0, 0, 4.2, 0, 3); });
    if (f > 1420 && f < 1441) {
      // crumbs, crossed out
      for (let i = 0; i < 14; i++) ell(g, 380 + rnd(i, 1) * 320, 1350 + rnd(i, 2) * 80, 10, 8, "#e9a98a", 3);
      line(g, [[340, 1300], [740, 1470]], "#e8322e", 16); line(g, [[740, 1300], [340, 1470]], "#e8322e", 16);
    }
  } else {
    const k = easeOut((f - 1441) / 10);
    for (let i = 0; i < 3; i++) blubber(g, 540 + (i - 1) * 330 * k, 960 + (i % 2) * 60 * k, 2.2, (i - 1) * 0.4 * k, 10 + i);
  }
} }], camKeys([{ f: 1365, c: { z: 1.0, y: 960 }, creep: 0.0015 }]), { kicks: [1441], bg: "#2c5f9e" });

// 18 PUDDING (1477-1632)
const KITCHEN: Layer = { key: "kitchen", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  room(g, BIG[0], BIG[2], 1300, BIG[3], "#e9d8a6", "#a86a4a", 540, BIG[1]);
  for (let x = BIG[0]; x < BIG[2]; x += 80) for (let y = 700; y < 1270; y += 80) rr(g, x + 4, y + 4, 72, 72, 4, (x / 80 + y / 80) % 2 ? "#f4f0e2" : "#dfe9ee", 0);
  windowFrame(g, 600, 260, 380, 330, (gg) => { sky(gg, 600, 260, 980, 590, "#5e93d9", "#e3edf5"); cloud(gg, 760, 380, 0.5); });
  rr(g, -100, 300, 420, 260, 8, "#c98a5a", 6);
} };
add(1477, 1632, [KITCHEN, { d: 1, draw: (g, f) => {
  const boom = f >= 1551, t = f - 1551;
  rr(g, -200, 1330, 1480, 70, 8, "#8a5a34", 6);
  who(g, COOK, 330, 1800, 1050, f, 81, { expr: boom ? (f > 1590 ? "dazed" : "shock") : "grin", facing: 1, wave: boom ? 0.8 : 0.3 });
  if (!boom) { pudding(g, 760, 1330, 1.3, f * 0.3); stickDyn(g, 760, 1120, 0.9, 0.1, 1, f); }
  else {
    fireball(g, 760, 1300, t, 0.6);
    pudding(g, 760, 1330, 1.3 * Math.max(0.15, 1 - t / 6), 0);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const tx = -100 + rnd(i, 1) * 1300, ty = 300 + rnd(i, 2) * 1300, u = easeOut(clamp01(t / 8));
      const x = 760 + (tx - 760) * u, y = 1200 + (ty - 1200) * u;
      if (u < 1) ell(g, x, y, 22, 22, "#7a4422", 4);
      else splat(g, tx, ty, 0.6 + rnd(i, 3) * 0.6, i, "#7a4422");
    }
    if (t > 8) { splat(g, 330, 800, 0.9, 99, "#7a4422"); for (let i = 0; i < 3; i++) rr(g, 300 + i * 30, 820, 14, 40 + ((f * 2 + i * 13) % 50), 7, "#7a4422", 3); }
  }
} }], camKeys([{ f: 1477, c: { z: 1.0, y: 1050 }, creep: 0.0012 }, { f: 1551, c: { z: 1.1, y: 1020, r: 0.03 }, dur: 6 }, { f: 1590, c: { z: 0.95, y: 1050, r: 0 }, dur: 20 }]), { kicks: [1552], kickAmp: 34, bg: "#e9d8a6" });

// 19 SEAGULLS FLEE + WHALE STILL THERE (1632-1762)
add(1632, 1762, [BEACH, { d: 1, draw: (g, f) => {
  whaleAt(g, f, 540, 1400, 0.85, { crater: 1 });
  if (f > 1700) { who(g, WORKER, 920, 1800, 760, f, 52, { expr: "pained", facing: -1 }); who(g, ENGINEER, 160, 1820, 800, f, 51, { expr: "nervous", facing: 1 }); }
  for (let i = 0; i < 9; i++) {
    const t = f - 1660 - i * 3, x = 300 + rnd(i, 1) * 500 + Math.max(0, t) * (14 + rnd(i, 2) * 8) * (i % 2 ? 1 : -1), y = 1100 - Math.max(0, t) * (12 + rnd(i, 3) * 6);
    seagull(g, x, y, 0.9, f + i * 5, t > 0);
    if (t > 0 && t < 20) for (let k = 0; k < 3; k++) ell(g, x + (k - 1) * 30, y + 40 + t * 2, 10, 5, "#ffffff", 2, k);
  }
} }], camKeys([{ f: 1632, c: { z: 1.0, y: 1000 }, creep: 0.0008 }, { f: 1706, c: { z: 1.15, y: 1250 }, dur: 30 }]), { bg: "#e6cf9c" });

// 20 CAR FLATTENED (1762-1854)
const LOTSET: Layer = { key: "lot", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  sky(g, BIG[0], BIG[1], BIG[2], 1000, "#5e93d9", "#e3edf5"); cloud(g, 200, 300, 1); cloud(g, 900, 200, 0.8, "#fff", "#cbd8ec", 4);
  for (let i = 0; i < 6; i++) pine(g, -400 + i * 380, 1020, 300 + (i % 2) * 80);
  rr(g, BIG[0], 1000, BIG[2] - BIG[0], BIG[3] - 1000, 0, lg(g, 0, 1000, 0, 2000, [[0, "#6a6e7c"], [1, "#4a4e5a"]]), 0);
  for (let i = 0; i < 8; i++) rr(g, -500 + i * 330, 1250, 14, 300, 3, "#f4f4f0", 0);
} };
add(1762, 1854, [LOTSET, { d: 1, draw: (g, f) => {
  const fall = clamp01((f - 1780) / 12), crush = easeOut(clamp01((f - 1792) / 5));
  shadow(g, 540, 1560, 360, 0.3);
  car70(g, 540, 1560, 1.25, "#2f8a8a", crush, crush < 0.3);
  if (f < 1792) blubber(g, 520, -300 + fall * 1100, 3.0, 0.3 + fall, 5);
  else { blubber(g, 520, 1240 + crush * 60, 3.0, 1.3, 5); for (let i = 0; i < 8; i++) { const t = f - 1792; ell(g, 540 + (i - 4) * 70 + (i - 4) * t * 4, 1500 - t * 6 + t * t * 0.4, 10, 8, "#bfe3f2", 3); } }
} }], camKeys([{ f: 1762, c: { z: 1.0, y: 1330 }, creep: 0.0014 }, { f: 1792, c: { z: 1.1, y: 1380, r: -0.03 }, dur: 6 }]), { kicks: [1793], kickAmp: 36, bg: "#6a6e7c" });

// 21 WALTER'S CAR (1854-1920)
add(1854, 1920, [LOTSET, { d: 1, draw: (g, f) => {
  car70(g, 700, 1640, 1.0, "#2f8a8a", 1, false);
  blubber(g, 700, 1350, 2.4, 1.3, 5);
  who(g, WALTER, 270, 1820, 1000, f, 61, { expr: f > 1883 ? "pained" : "neutral", facing: 1 });
  // tiny raincloud over his head
  const k = pop(f, 1870, 8);
  if (k > 0) at(g, 270, 380, k, (gg) => { cloud(gg, 0, 0, 0.5, "#8a93a6", "#6a7386"); for (let i = 0; i < 6; i++) line(gg, [[-60 + i * 25, 50 + ((f * 6 + i * 17) % 60)], [-66 + i * 25, 70 + ((f * 6 + i * 17) % 60)]], "#6cc0f0", 5); });
} }], camKeys([{ f: 1854, c: { z: 1.05, y: 1100 }, creep: 0.0018 }]), { bg: "#6a6e7c" });

// 22 WHALE OF A DEAL (1920-1984): flashback to the dealership
add(1920, 1984, [{ key: "dealer", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  sky(g, BIG[0], BIG[1], BIG[2], 1100, "#5e93d9", "#e3edf5");
  rr(g, -300, 500, 1700, 600, 6, "#e9e1c8", 6);
  for (let i = 0; i < 6; i++) rr(g, -240 + i * 270, 640, 200, 380, 6, "#bfe3f2", 5);
  rr(g, BIG[0], 1100, BIG[2] - BIG[0], BIG[3] - 1100, 0, "#8a8e9c", 0);
} }, { d: 1, draw: (g, f) => {
  banner(g, 540, 420, 900, 170, "WHALE OF A DEAL!", f);
  car70(g, 560, 1480, 1.1, "#2f8a8a", 0, true);
  who(g, WALTER, 250, 1700, 900, f, 61, { expr: "relief_open", facing: 1, wave: 0.5 });
  who(g, SALESMAN, 860, 1700, 920, f, 91, { expr: "grin", facing: -1, wave: 0.5 });
  confetti(g, -100, 1180, -100, f, 1922, 40);
} }, { screen: true, op: "multiply", draw: (g) => { g.fillStyle = "rgba(255,226,170,0.55)"; g.fillRect(0, 0, W, H); } }],
  camKeys([{ f: 1920, c: { z: 1.0, y: 1050 }, creep: 0.0015 }]), { bg: "#e9e1c8" });

// 23 THE PARK (1984-TOTAL)
add(1984, TOTAL, [{ key: "park", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
  beachPaint(g, BIG[0], BIG[2], 820);
  poly(g, [[BIG[0], 1250], [300, 1180], [900, 1220], [BIG[2], 1160], [BIG[2], BIG[3]], [BIG[0], BIG[3]]], lg(g, 0, 1150, 0, 2000, [[0, "#7fbf5a"], [1, "#4f8f3a"]]), 6);
  for (let i = 0; i < 5; i++) pine(g, -300 + i * 420, 1230, 340 + (i % 2) * 100, "#2f6b4a", i);
} }, { d: 1, draw: (g, f) => {
  const k = pop(f, 2049, 9);
  if (k > 0) at(g, 540, 1500, k, (gg) => {
    for (const px of [-300, 300]) { rr(gg, px - 22, -380, 44, 380, 6, "#8a5a34", 5); }
    rr(gg, -440, -720, 880, 400, 22, "#6b4a2a", 7); rr(gg, -415, -695, 830, 350, 16, "#8a6a3a", 5);
    gg.fillStyle = "#fff4d0"; gg.font = "900 74px CapFont"; gg.textAlign = "center"; gg.textBaseline = "middle";
    gg.fillText("EXPLODING WHALE", 0, -615); gg.fillText("MEMORIAL PARK", 0, -530);
    at(gg, 0, -400, 0.13, (g3) => spermWhale(g3, { dead: false }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(gg, [[Math.cos(a) * 70 + 0, -440 + Math.sin(a) * 40], [Math.cos(a) * 110, -440 + Math.sin(a) * 60]], "#ffd84a", 8); }
  });
  if (f > 2093) seagull(g, 900 - Math.max(0, 2110 - f) * 20, 780 - Math.max(0, 2110 - f) * 10, 1.0, f, f < 2110);
  confetti(g, -100, 1180, -150, f, 2092, 70);
} }], camKeys([{ f: 1984, c: { z: 1.0, y: 1050 }, creep: 0.0012 }, { f: 2049, c: { z: 1.08, y: 1100 }, dur: 12 }]), { kicks: [2093], bg: "#7fbf5a" });

export const story: Story = {
  total: TOTAL,
  shots,
  flashes: [148, 980],
  xfade: { 2: 8, 4: 6, 9: 8, 14: 6, 15: 8, 17: 8, 18: 8, 19: 8, 21: 8, 22: 8 },
};
void [rg, light, dark, path, smoothClosed, exclaim, room, rock, soundLines, bodySide, H];
