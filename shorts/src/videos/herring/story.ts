// "The Navy That Hunted Fish Farts": shot list timed to voice/words.json (frames at 30 fps).
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, smooth, easeOut, rnd, pw, shadow, sprite, blinkAt, glide, clamp01 } from "../../lib/engine";
import {
  INKC, P, sky, cloud, seaSurface, horizonGlow, underwater, specks, bubble, bubbleStream, rock, seabed, kelp, pine, redHouse, swedishFlag,
  warship, submarine, propeller, room, windowFrame, speedLines, soundLines, questionMark, exclaim, burstBg, angerMark, confetti,
  poly, line, ell, rr, lg, rg, light, dark, rgba, stars, blob, path,
} from "../../lib/paint";
import {
  herring, toot, subShapePoints, FishExpr, OPERATOR, ADMIRAL, SAILOR, BIO1, BIO2, CAPTAIN, person, sonarConsole, hydrophone, reel,
  tapeMachine, fryingPan, balloon, trophy, brickTower, redFlag, chalkboard, mug, seagull, calendarPage,
} from "./actors";
import { bodyFront, Outfit, Expr } from "../../lib/toon";

export const TOTAL = 2078;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];

// ---------------- shared sets ----------------
const uwStatic = (key: string, top: string, bot: string, rays: number, seed: number, bed?: { y: number; sand: string; rocks?: string; kelpC?: string }): Layer => ({
  key, d: 0.35, bounds: BIG, res: 0.8,
  paint: (g) => {
    underwater(g, BIG[0], BIG[1], BIG[2], BIG[3], top, bot, rays, seed);
    if (bed) {
      for (let i = 0; i < 7; i++) rock(g, -500 + i * 380 + rnd(seed, i) * 120, bed.y + 40, 260 + rnd(seed, i + 3) * 220, 160 + rnd(seed, i + 5) * 220, bed.rocks ?? "#4c5d78", seed + i);
      seabed(g, BIG[0], BIG[2], bed.y, BIG[3], bed.sand, seed);
    }
  },
});
const fishAt = (g: Ctx, x: number, y: number, s: number, o: Parameters<typeof herring>[1] = {}, flip = false, rot = 0) =>
  at(g, x, y, s, (gg) => herring(gg, o), rot, flip);

/** a loose school of herring around (cx, cy); `spread` px, swims +x (or -x when flip) */
const school = (g: Ctx, f: number, cx: number, cy: number, n: number, spread: number, s: number, seed: number, o: { flip?: boolean; toot0?: number; expr?: FishExpr; drift?: number; sil?: string } = {}) => {
  const items = Array.from({ length: n }, (_, i) => {
    const a = rnd(seed, i) * Math.PI * 2, r = Math.sqrt(rnd(seed, i + 50)) * spread;
    return { i, x: cx + Math.cos(a) * r * 1.4, y: cy + Math.sin(a) * r * 0.7, k: 0.75 + 0.5 * rnd(seed, i + 9) };
  }).sort((p, q) => p.k - q.k);
  for (const it of items) {
    const bob = Math.sin(f * 0.07 + it.i) * 8, dx = (o.drift ?? 0) * f * (o.flip ? -1 : 1);
    const sc = s * it.k;
    at(g, it.x + dx + Math.sin(f * 0.05 + it.i * 2) * 10, it.y + bob, sc, (gg) => {
      herring(gg, { f: f + it.i * 5, seed: it.i, expr: o.expr ?? "normal", silhouette: o.sil });
      if (o.toot0 !== undefined) toot(gg, f - o.toot0 - Math.floor(rnd(seed, it.i + 70) * 14), 0.8, it.i);
    }, 0, o.flip);
  }
};

// ---------------- the sonar room (used by several shots) ----------------
const nightK = (f: number) => {
  // window: day -> night during "listens day and night"; montage flips nights; stays night after
  if (f < 455) return 0;
  if (f < 470) return ramp(f, 455, 470);
  if (f >= 739 && f < 843) { // night / day flicker in the montage
    const ph = Math.floor((f - 739) / 9) % 2;
    return ph ? 0.15 : 1;
  }
  return 1;
};
const roomStatic: Layer = {
  key: "sonarRoom", d: 0.6, bounds: BIG, res: 0.9,
  paint: (g) => {
    room(g, BIG[0], BIG[2], 1360, BIG[3], "#5d7096", "#6b5a4e", 540, BIG[1]);
    // pipes + rivets on the wall
    line(g, [[BIG[0], 180], [BIG[2], 180]], "#46557a", 26); line(g, [[BIG[0], 180], [BIG[2], 180]], INKC, 3);
    for (let x = -600; x < 1700; x += 140) ell(g, x, 300, 7, 7, "#3c4a6a", 0);
    // map of the Baltic (abstract coast shapes) on the right wall
    rr(g, 720, 380, 380, 300, 8, "#e9e1c8", 5);
    poly(g, blob(860, 520, 90, 120, 4, 9, 0.4), "#a9c98a", 3);
    poly(g, blob(1010, 470, 60, 80, 7, 9, 0.4), "#a9c98a", 3);
    for (const [x, y] of [[930, 560], [960, 600], [900, 610]] as P[]) ell(g, x, y, 8, 8, "#e23a2e", 2.5);
  },
};
const roomWindow: Layer = {
  d: 0.6,
  draw: (g, f) => {
    const k = nightK(f);
    windowFrame(g, -40, 420, 420, 360, (gg) => {
      sky(gg, -40, 420, 380, 780, k > 0.5 ? "#0c1636" : "#5e93d9", k > 0.5 ? "#2a3a6e" : "#cfe3f2");
      if (k < 0.5) { gg.globalAlpha = 1 - k * 2; cloud(gg, 120, 520, 0.45); gg.globalAlpha = 1; }
      else { stars(gg, -40, 420, 380, 700, 30, 5); ell(gg, 270, 500, 34, 34, "#fff6d6", 0); ell(gg, 285, 490, 30, 30, "#0c1636", 0); }
      seaSurface(gg, -40, 380, 690, 780, k > 0.5 ? "#1a2c58" : "#3f78b8", k > 0.5 ? "#0e1a3a" : "#2a5a94", 8, k > 0.5 ? "rgba(200,220,255,0.25)" : "rgba(255,255,255,0.55)");
    });
  },
};
/** operator behind the console; beard 0..2 (none, short, long grey) */
const operatorAt = (g: Ctx, f: number, x: number, y: number, h: number, o: { expr?: Expr; beard?: number; look?: number; stand?: boolean; wave?: number; grey?: boolean }) => {
  const out: Outfit = { ...OPERATOR, ...(o.grey ? { hair: "#cfcfcf" } : {}) };
  sprite(g, x, y, h, (p) => {
    bodyFront(p, out, { expr: o.expr ?? "neutral", mode: "stand", blink: blinkAt(f, 3), seed: 3, look: o.look ?? 0, wave: o.wave });
    const b = o.beard ?? 0;
    if (b > 0) {
      // beard hangs from the jaw; length grows with b (wavy lower edge + strands)
      const gg = p.g, len = b < 1.5 ? 60 : 260 * (b - 1);
      const col = o.grey ? "#f2f2f2" : "#d9a54e", ink = "#241726";
      const pts: [number, number][] = [[196, 318], [214, 380]];
      const n = 9;
      for (let i = 0; i <= n; i++) { const t = i / n, x = 225 + 150 * t, y = 400 + len * Math.sin(Math.PI * (0.15 + 0.7 * t)) + (i % 2 ? 22 : 0); pts.push([x, y]); }
      pts.push([386, 380], [404, 318], [372, 372], [300, 392], [228, 372]);
      gg.beginPath(); pts.forEach(([x, y], i) => (i ? gg.lineTo(x, y) : gg.moveTo(x, y))); gg.closePath();
      gg.fillStyle = col; gg.fill(); gg.lineWidth = 9; gg.strokeStyle = ink; gg.lineJoin = "round"; gg.stroke();
      gg.strokeStyle = "rgba(36,23,38,0.45)"; gg.lineWidth = 5; gg.lineCap = "round";
      for (let i = 0; i < 5; i++) { const x = 250 + i * 25; gg.beginPath(); gg.moveTo(x, 410); gg.quadraticCurveTo(x + 12, 410 + len * 0.4, x - 4, 400 + len * 0.75); gg.stroke(); }
      gg.beginPath(); gg.ellipse(300, 372, 22, 9, 0, 0, Math.PI * 2); gg.fillStyle = "#5a1e28"; gg.fill();
    }
  });
};
const darkRoom = (a: number): Layer => ({ screen: true, op: "multiply", draw: (g) => { g.fillStyle = `rgba(70,80,150,${a})`; g.fillRect(0, 0, W, H); } });

// ---------------- shots ----------------
const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

// 1 HOOK A (0-112): night water, a warship's hull pinging above, a giant dark "submarine" glides in
const SUBPTS = subShapePoints(900, 120, 11);
add(0, 112, [
  uwStatic("uwNight", "#16365e", "#030914", 0.08, 4),
  { d: 0.55, draw: (g, f) => {
    // surface shimmer + a warship hull from below
    g.fillStyle = lg(g, 0, -300, 0, 420, [[0, "rgba(120,170,220,0.6)"], [1, "rgba(120,170,220,0)"]]); g.fillRect(-700, -300, W + 1400, 720);
    const hx = 380 + f * 0.6;
    poly(g, [[hx - 330, 160], [hx + 330, 150], [hx + 280, 260], [hx - 300, 260]], "#0a1426", 0);
    ell(g, hx + 250, 270, 30, 10, "#0a1426", 0);
    for (let k = 0; k < 4; k++) {
      const t = (f - 30 - k * 26);
      if (t < 0) continue;
      const r = t * 9, al = Math.max(0, 1 - t / 70);
      ell(g, hx, 260, r * 1.25, r * 0.8, null, 6 * al + 1, 0, `rgba(120,255,190,${0.7 * al})`);
    }
  } },
  { d: 1, draw: (g, f) => {
    const x = 360 + f * 1.6, y = 1030;
    // the menacing submarine, a dark shape with a red star and lit portholes
    at(g, x, y, 1.15, (gg) => {
      gg.fillStyle = rg(gg, 0, -40, 0, 560, [[0, "rgba(120,170,220,0.18)"], [1, "rgba(120,170,220,0)"]]); gg.fillRect(-600, -500, 1200, 900);
      submarine(gg, 0, 0, 900, "#13233c", true, false);
      ell(gg, 400, 12, 12, 12, f % 20 < 10 ? "#ff3b30" : "#8a1a14", 0);
      propeller(gg, -460, 0, 60, f);
    });
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 90, f, 3) },
], camKeys([{ f: 0, c: { z: 1.0, y: 980, r: -0.02 }, creep: 0.0018 }, { f: 72, c: { z: 1.12, x: 640, y: 1000, r: 0.02 }, dur: 26, creep: 0.002 }]), { bg: "#030914" });

// 2 HOOK B (112-172): reveal - a lit herring school, they toot on "fish farts"
add(112, 172, [
  uwStatic("uwDay", "#3fa6c9", "#0f4f79", 0.2, 6, { y: 1650, sand: "#d8c08c", rocks: "#5a6f8f" }),
  { d: 0.7, draw: (g, f) => school(g, f, 540, 640, 14, 300, 0.55, 21, { toot0: 136, drift: 0.4 }) },
  { d: 1, draw: (g, f) => {
    const s = 1.65;
    at(g, 520 + (f - 112) * 0.5, 980, s, (gg) => {
      herring(gg, { f, expr: f >= 146 ? "smug" : "normal", seed: 2 });
      toot(gg, f - 140, 1.6, 2);
    });
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 70, f, 5) },
], camKeys([{ f: 112, c: { z: 1.05, y: 1000, x: 560 }, creep: 0.002 }, { f: 140, c: { z: 1.22, x: 420, y: 1010, r: -0.03 }, dur: 14 }]), { kicks: [146], bg: "#0f4f79" });

// 3 COAST (172-270): 1981, a Soviet sub stuck on the rocks off a Swedish naval base
const coastFar: Layer = {
  key: "coastFar", d: 0.25, bounds: BIG, res: 0.8,
  paint: (g) => {
    sky(g, BIG[0], BIG[1], BIG[2], 820, "#3f7fd2", "#d7e7f5", "#8cb7e6");
    cloud(g, 120, 260, 1.1, "#ffffff", "#c9d6f2", 1); cloud(g, 820, 160, 0.8, "#ffffff", "#c9d6f2", 2); cloud(g, 1400, 330, 1.0, "#ffffff", "#c9d6f2", 3);
    // distant islands
    for (let i = 0; i < 6; i++) poly(g, blob(-500 + i * 420, 800, 230 + rnd(1, i) * 120, 60 + rnd(2, i) * 30, i + 3, 9, 0.25).map(([x, y]) => [x, Math.min(y, 810)] as P), "#7f9cbf", 0);
    seaSurface(g, BIG[0], BIG[2], 810, BIG[3], "#5b8fc8", "#1f5d96", 7);
    horizonGlow(g, BIG[0], BIG[2], 810);
  },
};
const coastMid: Layer = {
  key: "coastMid", d: 0.55, bounds: BIG, res: 0.9,
  paint: (g) => {
    // naval base island on the left: rocks, pines, red houses, grey sheds, flag
    poly(g, blob(60, 930, 520, 150, 9, 10, 0.25).map(([x, y]) => [x, Math.min(y, 960)] as P), lg(g, 0, 780, 0, 960, [[0, "#8a8f86"], [1, "#5d6458"]]), 5);
    for (let i = 0; i < 6; i++) pine(g, -340 + i * 95, 860 + (i % 2) * 14, 150 + (i % 3) * 30, "#2f6b4a", i);
    redHouse(g, 120, 900, 130, 90); redHouse(g, 300, 915, 110, 80, "#c2412f");
    rr(g, 390, 840, 190, 90, 4, lg(g, 390, 0, 580, 0, [[0, "#b9bfc6"], [1, "#8d949c"]]), 4);
    rr(g, 410, 860, 40, 70, 3, "#5d6672", 3);
    swedishFlag(g, 470, 845, 170, 1);
    // pier
    rr(g, 540, 935, 300, 18, 3, "#8a6a4a", 4);
    for (let i = 0; i < 5; i++) line(g, [[560 + i * 60, 950], [560 + i * 60, 990]], INKC, 6);
    // right islet
    poly(g, blob(1450, 900, 360, 110, 4, 10, 0.25).map(([x, y]) => [x, Math.min(y, 930)] as P), lg(g, 0, 800, 0, 930, [[0, "#8f948a"], [1, "#5d6458"]]), 5);
    for (let i = 0; i < 4; i++) pine(g, 1250 + i * 100, 860 + (i % 2) * 10, 140 + (i % 2) * 40, "#2a6244", i + 7);
  },
};
const strandedSub = (g: Ctx, f: number, x: number, y: number, s: number) => {
  // rocks behind, sub tilted, rocks in front, waves slapping
  rock(g, x - 140 * s, y + 40 * s, 340 * s, 160 * s, "#6d7280", 31);
  at(g, x, y - 40 * s + Math.sin(f * 0.12) * 2, s, (gg) => submarine(gg, 0, 0, 760, "#4f5966", true), -0.14);
  rock(g, x + 160 * s, y + 70 * s, 300 * s, 120 * s, "#7a7f8c", 33);
  rock(g, x - 300 * s, y + 80 * s, 220 * s, 90 * s, "#6a6f7c", 35);
  for (let i = 0; i < 5; i++) {
    const t = (f * 0.06 + i * 0.7) % 3, xx = x - 360 * s + i * 170 * s;
    ell(g, xx, y + 80 * s - t * 4, 60 * s + t * 10, 14 * s, `rgba(255,255,255,${0.85 - t * 0.25})`, 3, 0, rgba(INKC, 0.6));
  }
};
add(172, 270, [
  coastFar, coastMid,
  { d: 1, draw: (g, f) => strandedSub(g, f, 600, 1150, 0.9) },
  { d: 1.15, draw: (g, f) => { seagull(g, 250 + f * 0.8, 520 + Math.sin(f * 0.1) * 20, 0.8, f, true); seagull(g, 900 - f * 0.5, 430, 0.6, f + 9, true); } },
], camKeys([{ f: 172, c: { z: 1.0, y: 960, x: 560 }, creep: 0.0014 }]), { bg: "#3f7fd2" });

// 4 SAILORS (270-349): Swedish sailors on the shore rocks stare at it
add(270, 349, [
  coastFar,
  { d: 0.6, draw: (g, f) => strandedSub(g, f, 640, 1000, 1.25) },
  { d: 1, draw: (g, f) => {
    poly(g, blob(540, 1820, 900, 260, 12, 10, 0.15), lg(g, 0, 1560, 0, 2000, [[0, "#8f948a"], [1, "#4f5650"]]), 5);
    const hh = 760;
    person(g, SAILOR, 230, 1640, hh, f, { expr: "shock", seed: 11, facing: 1 });
    person(g, SAILOR, 840, 1650, hh, f, { expr: f > 300 ? "shock" : "nervous", seed: 12, facing: -1, wave: 0.6 + 0.4 * Math.sin(f * 0.3) });
    person(g, ADMIRAL, 540, 1700, hh * 1.04, f, { expr: f > 288 ? "stern" : "shock", seed: 13 });
  } },
], camKeys([{ f: 270, c: { z: 1.0, y: 1080 }, creep: 0.0018 }]), { kicks: [272], bg: "#3f7fd2" });

// 5 ADMIRAL CU (349-394): "Sweden is furious"
add(349, 394, [
  { key: "office", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
    room(g, BIG[0], BIG[2], 1500, BIG[3], "#6b7fa8", "#6b4a3a", 540, BIG[1]);
    windowFrame(g, 600, 260, 460, 420, (gg) => { sky(gg, 600, 260, 1060, 680, "#3f7fd2", "#d7e7f5"); seaSurface(gg, 600, 1060, 560, 680, "#5b8fc8", "#1f5d96", 3); cloud(gg, 780, 360, 0.5); });
    rr(g, -60, 330, 300, 230, 6, "#e9e1c8", 6); poly(g, blob(90, 445, 70, 80, 3, 9, 0.4), "#a9c98a", 3);
    swedishFlag(g, -120, 1500, 900, 0.5);
  } },
  { d: 1, draw: (g, f) => {
    sprite(g, 540, 1980, 2050, (p) => bodyFront(p, ADMIRAL, { expr: f >= 362 ? "stern" : "neutral", mode: "stand", blink: blinkAt(f, 21), seed: 21, tilt: f >= 362 ? Math.sin((f - 362) * 0.9) * 2 * Math.max(0, 1 - (f - 362) / 20) : 0 }));
    if (f >= 362) {
      const k = pop(f, 362, 7);
      angerMark(g, 770, 300, 1.6 * k); angerMark(g, 320, 230, 1.1 * pop(f, 366, 7));
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const t = (f - 364 - i * 6);
        if (t < 0 || t > 24) continue;
        ell(g, 540 + s * (290 + t * 6), 420 - t * 9, 26 + t * 1.8, 22 + t * 1.5, `rgba(255,255,255,${0.9 - t / 28})`, 3, 0, rgba(INKC, 0.5));
      }
    }
  } },
], camKeys([{ f: 349, c: { z: 1.05, y: 900 }, creep: 0.0015 }, { f: 364, c: { z: 1.18, y: 860, r: 0.03 }, dur: 10, creep: 0.001 }]), { kicks: [364], bg: "#6b7fa8" });

// 6 HYDROPHONES (394-447): the navy fills the sea with microphones
add(394, 447, [
  { key: "splitSea", d: 0.5, bounds: BIG, res: 0.8, paint: (g) => {
    sky(g, BIG[0], BIG[1], BIG[2], 560, "#3f7fd2", "#d7e7f5");
    cloud(g, 200, 200, 0.9); cloud(g, 950, 300, 0.7, "#ffffff", "#c9d6f2", 5);
    underwater(g, BIG[0], 560, BIG[2], BIG[3], "#3f9bc4", "#0d3a63", 0.16, 11);
    for (let i = 0; i < 6; i++) rock(g, -500 + i * 420, 2100, 300, 200, "#4c5d78", i + 40);
    seabed(g, BIG[0], BIG[2], 2050, BIG[3], "#c9b07c", 3);
  } },
  { d: 0.8, draw: (g, f) => {
    // two navy boats on the surface, cranes paying out cables
    for (const [bx, s] of [[250, 0.55], [820, 0.45]] as [number, number][]) {
      at(g, bx + Math.sin(f * 0.05 + bx) * 6, 560, s, (gg) => warship(gg, 0, 0, 700, "#8f9aa8", true));
    }
    // waterline band
    g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(-700, 552, W + 1400, 10);
  } },
  { d: 1, draw: (g, f) => {
    const drops: [number, number, number][] = [[140, 394, 1250], [330, 405, 1500], [560, 416, 1180], [760, 424, 1420], [960, 434, 1300]];
    for (const [x, f0, yEnd] of drops) {
      if (f < f0) continue;
      const y = 560 + (yEnd - 560) * easeOut((f - f0) / 26);
      hydrophone(g, x, 560, y, 1.6);
      if (f - f0 < 10) bubbleStream(g, x, y - 40, f, f0, { rate: 1, size: 8, life: 30, seed: x });
    }
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, 560, W + 400, H + 400, 50, f, 8) },
], camKeys([{ f: 394, c: { z: 1.0, y: 900 }, creep: 0.0016 }]), { bg: "#0d3a63" });

// 7-8 SONAR ROOM (447-546): listening day and night -> "hear it" -> crackling hiss
const roomLayers = (opts: (f: number) => { expr?: Expr; beard?: number; look?: number; grey?: boolean; mugs?: number; hiss?: boolean; cobweb?: boolean }): Layer[] => [
  roomStatic, roomWindow,
  { d: 1, draw: (g, f) => {
    const o = opts(f);
    operatorAt(g, f, 560, 1700, 1100, o);
    sonarConsole(g, 540, 1640, 1.2, f, f > 489 ? [[40, -50], [-30, 60]] : []);
    for (let i = 0; i < (o.mugs ?? 0); i++) mug(g, 800 + (i % 4) * 44 - Math.floor(i / 4) * 12, 1244 - Math.floor(i / 4) * 52, 1.0, ["#e8e2d4", "#d8433c", "#4a8ad8", "#f2c230"][i % 4]);
    if (o.hiss) {
      soundLines(g, 395, 975, Math.PI, f, "#fff3a0", 3, 1.2);
      soundLines(g, 725, 975, 0, f, "#fff3a0", 3, 1.2);
      // crackle
      for (let i = 0; i < 6; i++) {
        const a = rnd(i, Math.floor(f / 3)) * Math.PI * 2, r = 260 + rnd(i + 3, Math.floor(f / 3)) * 120, cx = 560 + Math.cos(a) * r, cy = 930 + Math.sin(a) * r * 0.7;
        const pts: P[] = [[cx, cy], [cx + 20, cy - 18], [cx + 6, cy - 30], [cx + 30, cy - 52]];
        line(g, pts, INKC, 10); line(g, pts, "#ffe14d", 5);
      }
    }
    if (o.cobweb) {
      line(g, [[420, 790], [500, 880]], "rgba(255,255,255,0.7)", 2); line(g, [[420, 840], [490, 790]], "rgba(255,255,255,0.7)", 2);
      for (let r = 20; r < 80; r += 20) { g.beginPath(); g.arc(420, 790, r, 0, Math.PI / 2); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.stroke(); }
    }
  } },
  darkRoom(0.45),
  { screen: false, d: 1, op: "lighter", draw: (g) => { g.fillStyle = rg(g, 540, 1440, 0, 700, [[0, "rgba(80,255,140,0.25)"], [1, "rgba(80,255,140,0)"]]); g.fillRect(-200, 400, 1500, 1600); } },
];
add(447, 481, roomLayers(() => ({ expr: "neutral" })), camKeys([{ f: 447, c: { z: 1.0, y: 1000 }, creep: 0.0015 }]), { bg: "#26304a" });
add(481, 546, roomLayers((f) => ({ expr: f >= 489 ? "shock" : "neutral", hiss: f >= 500, look: 0 })),
  camKeys([{ f: 481, c: { z: 1.5, y: 1060, x: 560 }, cut: true, creep: 0.0018 }, { f: 489, c: { z: 1.7, y: 1040, x: 560, r: -0.03 }, dur: 8, creep: 0.001 }]), { kicks: [489], bg: "#26304a" });

// 9 BACON GAG (546-605): "like bacon frying under the water"
add(546, 605, [
  uwStatic("uwGreen", "#4fb2b8", "#145a6a", 0.2, 9, { y: 1420, sand: "#d8c08c", rocks: "#5a7a7f" }),
  { d: 0.8, draw: (g, f) => { kelp(g, 80, 1480, 520, "#3e8a4f", Math.sin(f * 0.05), 1); kelp(g, 980, 1500, 600, "#357a46", Math.sin(f * 0.05 + 1), 2); } },
  { d: 1, draw: (g, f) => {
    fryingPan(g, 500, 1180, 2.3, f);
    for (const bx of [250, 500, 720]) bubbleStream(g, bx, 1120, f, 530, { rate: 0.8, size: 7, spread: 40, rise: 7, life: 60, seed: bx });
    fishAt(g, 230, 760, 0.95, { f, expr: "puzzled", seed: 4 });
    fishAt(g, 850, 700, 0.85, { f, expr: f > 575 ? "shock" : "puzzled", seed: 5 }, true);
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 60, f, 7) },
], camKeys([{ f: 546, c: { z: 1.05, y: 1050 }, creep: 0.002 }]), { bg: "#145a6a" });

// 10 ALARM (605-633): "Submarine!"
add(605, 633, [
  { d: 0.3, draw: (g, f) => burstBg(g, 540, 800, 2200, "#b8261e", "#e23a2e", 20, f * 0.01) },
  { d: 1, draw: (g, f) => {
    sprite(g, 540, 2050, 1500, (p) => bodyFront(p, OPERATOR, { expr: "shock", mode: "stand", seed: 3, wave: 1, tilt: Math.sin(f * 1.4) * 2 }));
    exclaim(g, 860, 420, 300 * pop(f, 606, 6), "#ffe14d", 0.15);
    exclaim(g, 230, 470, 220 * pop(f, 610, 6), "#ffe14d", -0.2);
  } },
  { screen: true, op: "lighter", draw: (g, f) => { const a = 0.18 + 0.18 * Math.sin(f * 0.9); g.fillStyle = `rgba(255,40,30,${a})`; g.fillRect(0, 0, W, H); } },
], camKeys([{ f: 605, c: { z: 1.0, y: 960 }, creep: 0.004 }]), { kicks: [606], kickAmp: 30, bg: "#b8261e" });

// 11 WARSHIPS (633-690): racing out to hunt
add(633, 690, [
  { key: "openSea", d: 0.2, bounds: BIG, res: 0.8, paint: (g) => {
    sky(g, BIG[0], BIG[1], BIG[2], 760, "#3f7fd2", "#d7e7f5", "#8cb7e6");
    cloud(g, 0, 300, 1.2); cloud(g, 900, 200, 0.9, "#ffffff", "#c9d6f2", 4);
    seaSurface(g, BIG[0], BIG[2], 760, BIG[3], "#5b8fc8", "#163f72", 12);
    horizonGlow(g, BIG[0], BIG[2], 760);
  } },
  { d: 1, draw: (g, f) => {
    const t = f - 633;
    for (const [x0, y, L, ph] of [[-200, 1000, 760, 0], [-700, 1260, 900, 2]] as [number, number, number, number][]) {
      const x = x0 + t * 22, bob = Math.sin(f * 0.2 + ph) * 6, pitch = Math.sin(f * 0.17 + ph) * 0.025;
      // wake
      for (let k = 0; k < 10; k++) ell(g, x - L * 0.5 - k * 70, y + 30 + Math.sin(k + f * 0.3) * 6, 80 + k * 10, 16, `rgba(255,255,255,${0.8 - k * 0.07})`, 0);
      at(g, x, y + bob, 1, (gg) => warship(gg, 0, 0, L), pitch);
      for (let k = 0; k < 6; k++) bubble(g, x + L * 0.55 + rnd(k, f) * 40, y - 30 - rnd(k + 5, f) * 60, 10 + rnd(k + 9, f) * 10);
    }
  } },
  { screen: true, draw: (g, f) => speedLines(g, 540, 960, f, 22, "rgba(255,255,255,0.55)", 620, 1500) },
], camKeys([{ f: 633, c: { z: 1.05, y: 1050, x: 560 }, creep: 0.001 }]), { bg: "#163f72" });

// 12 NOTHING (690-739): empty sea, a tumbleweed rolls across the water
add(690, 739, [
  { key: "openSea", d: 0.2, bounds: BIG, res: 0.8, paint: () => undefined },
  { d: 0.6, draw: (g, f) => at(g, 860, 820, 0.25, (gg) => warship(gg, 0, 0, 700)) },
  { d: 1, draw: (g, f) => {
    seagull(g, 380, 1180 + Math.sin(f * 0.1) * 6, 1.6, f);
    if (f > 712) {
      const t = f - 712, x = -150 + t * 26, y = 1000 + Math.abs(Math.sin(t * 0.35)) * -60;
      at(g, x, y, 1, (gg) => {
        gg.rotate(t * 0.3);
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; line(gg, [[Math.cos(a) * 20, Math.sin(a) * 20], [Math.cos(a + 1.6) * 70, Math.sin(a + 1.6) * 70]], "#9a7a4a", 6); }
        ell(gg, 0, 0, 72, 72, null, 4, 0, "#7a5a32");
      });
    }
  } },
], camKeys([{ f: 690, c: { z: 1.0, y: 1000 }, creep: 0.0012 }]), { bg: "#163f72" });
shots[shots.length - 1].layers[0] = shots[shots.length - 2].layers[0];

// 13 MONTAGE (739-843): night after night, year after year
add(739, 843, roomLayers((f) => ({
  expr: f > 808 ? "nervous" : "neutral", beard: f >= 825 ? 1.6 : f >= 808 ? 1 : 0, hiss: Math.floor(f / 12) % 2 === 0, mugs: Math.min(12, Math.floor((f - 739) / 8)),
}))
  .concat([{ d: 1.2, draw: (g, f) => { for (let i = 0; i < 6; i++) { const t = f - 805 - i * 5; if (t < 0 || t > 40) continue; calendarPage(g, 900 - t * 8, 300 + t * t * 0.5, 1.6, t * 0.12, i); } } }]),
  camKeys([{ f: 739, c: { z: 1.2, y: 900 }, cut: true, creep: 0.0012 }, { f: 808, c: { z: 1.32, y: 880, r: 0.02 }, dur: 8 }, { f: 825, c: { z: 1.45, y: 860, r: -0.02 }, dur: 8 }]), { bg: "#26304a" });

// 14 COLD WAR ENDS (843-918): a red flag comes down, then the whole pole topples
add(843, 918, [
  { key: "dusk", d: 0.3, bounds: BIG, res: 0.8, paint: (g) => {
    sky(g, BIG[0], BIG[1], BIG[2], 1400, "#2b2860", "#ffb36b", "#a85a8a");
    ell(g, 540, 1180, 150, 150, rg(g, 540, 1180, 0, 150, [[0, "#fff1c4"], [1, "#ffbd6b"]]), 0);
    for (let i = 0; i < 7; i++) brickTower(g, -400 + i * 300 + (i % 2) * 80, 1450, 520 + (i % 3) * 160, "#7a3a44");
    rr(g, BIG[0], 1380, BIG[2] - BIG[0], 900, 0, "#5a2a3a", 0);
    for (let i = 0; i < 30; i++) poly(g, [[BIG[0] + i * 110, 1380], [BIG[0] + i * 110 + 60, 1380], [BIG[0] + i * 110 + 30, 1340]], "#5a2a3a", 0);
  } },
  { d: 1, draw: (g, f) => {
    const down = smooth(ramp(f, 852, 892)), fall = f < 897 ? 0 : 1.45 * easeOut((f - 897) / 10) + (f > 907 ? Math.sin((f - 907) * 0.8) * 0.04 * Math.max(0, 1 - (f - 907) / 10) : 0);
    brickTower(g, 540, 1500, 900, "#a8443c");
    redFlag(g, 640, 980, 560, f, down, fall);
    if (f > 905) for (let i = 0; i < 6; i++) { const t = f - 905; ell(g, 1000 + (i - 3) * 50 + t * (i - 3) * 2, 1000 - t * 3, 40 + t * 2, 30 + t, `rgba(230,210,190,${Math.max(0, 0.9 - t / 18)})`, 0); }
  } },
], camKeys([{ f: 843, c: { z: 1.0, y: 1000 }, creep: 0.0014 }]), { kicks: [906], bg: "#2b2860" });

// 15 STILL HISSING (918-974): the operator, years older, still listening
add(918, 974, roomLayers(() => ({ expr: "neutral", beard: 2.4, grey: true, hiss: true, mugs: 12, cobweb: true })),
  camKeys([{ f: 918, c: { z: 1.4, y: 870 }, creep: 0.002 }]), { bg: "#26304a" });

// 16 WAIT (974-1040): admiral and operator, puzzled
add(974, 1040, [
  { d: 0.4, draw: (g, f) => burstBg(g, 540, 700, 2400, "#ffd84a", "#ffc93a", 22, f * 0.004) },
  { d: 1, draw: (g, f) => {
    sprite(g, 300, 1900, 1250, (p) => bodyFront(p, ADMIRAL, { expr: "nervous", mode: "stand", blink: blinkAt(f, 21), seed: 21, facing: 1, look: 0.6, headTilt: -4 }));
    sprite(g, 790, 1880, 1180, (p) => bodyFront(p, { ...OPERATOR, hair: "#cfcfcf" }, { expr: "nervous", mode: "stand", blink: blinkAt(f, 3), seed: 3, facing: -1, look: -0.6, headTilt: 5 }));
    questionMark(g, 300, 380, 230 * pop(f, 976, 7), "#ffffff", -0.15);
    questionMark(g, 800, 330, 260 * pop(f, 988, 7), "#ffffff", 0.18);
    questionMark(g, 550, 220, 180 * pop(f, 1043 - 30, 7), "#ffffff", 0.05);
  } },
], camKeys([{ f: 974, c: { z: 1.3, y: 900 }, cut: true, creep: 0.001 }, { f: 980, c: { z: 1.08, y: 950 }, dur: 8, creep: 0.0018 }]), { kicks: [975], bg: "#ffd84a" });

// 17 LONELY SUB (1040-1095): who is still driving these things?
add(1040, 1095, [
  { key: "openSea", d: 0.2, bounds: BIG, res: 0.8, paint: () => undefined },
  { d: 1, draw: (g, f) => {
    const y = 1220 + Math.sin(f * 0.1) * 8;
    // captain in the open hatch (drawn first, the sail covers his legs)
    sprite(g, 655, y + 10, 560, (p) => bodyFront(p, CAPTAIN, { expr: f > 1066 ? "nervous" : "neutral", mode: "stand", blink: blinkAt(f, 41), seed: 41, wave: f > 1066 ? 0.7 : undefined, look: Math.sin(f * 0.08) }));
    at(g, 540, y, 1.0, (gg) => submarine(gg, 0, 0, 800, "#4f5966", true));
    for (let i = 0; i < 6; i++) ell(g, 200 + i * 130, y + 40, 70, 14, "rgba(255,255,255,0.75)", 3, 0, rgba(INKC, 0.5));
    if (f > 1068) questionMark(g, 850, 760, 200 * pop(f, 1068, 7), "#ffe14d", 0.2);
  } },
], camKeys([{ f: 1040, c: { z: 1.15, y: 1000, x: 560 }, creep: 0.002 }]), { bg: "#163f72" });
shots[shots.length - 1].layers[0] = shots[10].layers[0];

// 18 TAPES (1095-1160): the admiral brings the tapes to the lab
const labStatic: Layer = {
  key: "lab", d: 0.55, bounds: BIG, res: 0.85,
  paint: (g) => {
    room(g, BIG[0], BIG[2], 1420, BIG[3], "#d9e4dc", "#8a7a6a", 540, BIG[1]);
    // fish tank + shelves + poster
    rr(g, 650, 760, 420, 300, 10, lg(g, 0, 760, 0, 1060, [[0, "#7fd0e8"], [1, "#2f87b0"]]), 6);
    for (let i = 0; i < 3; i++) at(g, 760 + i * 110, 880 + (i % 2) * 70, 0.28, (gg) => herring(gg, { seed: i }), 0, i === 1);
    rr(g, 620, 1060, 480, 36, 4, "#6b4a3a", 4);
    rr(g, -80, 520, 400, 24, 4, "#8a5a34", 4);
    for (let i = 0; i < 6; i++) rr(g, -60 + i * 60, 420, 40, 100, 4, ["#d8433c", "#4a8ad8", "#f2c230", "#5ab06a"][i % 4], 3);
    chalkboard(g, 220, 1000, 520, 360);
  },
};
add(1095, 1160, [
  labStatic,
  { d: 1, draw: (g, f) => {
    const t = f - 1095, x = -200 + Math.min(t, 50) * 13;
    sprite(g, x, 1760, 1050, (p) => {
      // stroll in, carrying the reel in front
      const ph = (t * 0.035) % 1;
      bodyFront(p, ADMIRAL, { expr: "stern", mode: t < 50 ? "stroll" : "stand", phase: ph, blink: blinkAt(f, 21), seed: 21, facing: 1 });
    });
    reel(g, x + 120, 1190 + Math.sin(t * 0.4) * 6, 110, 0);
    person(g, BIO1, 830, 1720, 950, f, { expr: t > 40 ? "smile" : "neutral", seed: 31, facing: -1 });
  } },
], camKeys([{ f: 1095, c: { z: 1.0, y: 1050 }, creep: 0.0015 }]), { bg: "#d9e4dc" });

// 19 BIOLOGISTS LISTEN (1160-1222)
add(1160, 1222, [
  labStatic,
  { d: 1, draw: (g, f) => {
    sprite(g, 235, 1780, 1050, (p) => bodyFront(p, { ...BIO1, headset: true }, { expr: "neutral", mode: "stand", blink: blinkAt(f, 31), seed: 31, facing: 1, look: f > 1190 ? 1 : 0 }));
    sprite(g, 850, 1790, 1080, (p) => bodyFront(p, { ...BIO2, headset: true }, { expr: f > 1196 ? "smile" : "neutral", mode: "stand", blink: blinkAt(f, 32), seed: 32, facing: -1, look: f > 1190 ? -1 : 0 }));
    rr(g, 20, 1420, 1040, 50, 6, "#8a5a34", 5);
    tapeMachine(g, 540, 1420, 0.85, f, 1);
    soundLines(g, 540, 1130, -Math.PI / 2, f, "#ffffff", 3, 1);
  } },
], camKeys([{ f: 1160, c: { z: 1.05, y: 1050 }, cut: true, creep: 0.0016 }, { f: 1190, c: { z: 1.15, y: 960 }, dur: 16 }]), { bg: "#d9e4dc" });

// 20 REVEAL (1222-1283): the "submarine" is a school of herring
const SUBPTS2 = subShapePoints(980, 150, 19);
add(1222, 1283, [
  uwStatic("uwDay", "#3fa6c9", "#0f4f79", 0.2, 6, { y: 1650, sand: "#d8c08c", rocks: "#5a6f8f" }),
  { d: 1, draw: (g, f) => {
    const burst = easeOut(ramp(f, 1256, 1283));
    at(g, 540, 1000, 1, (gg) => {
      SUBPTS2.forEach(([px, py], i) => {
        const a = Math.atan2(py, px) + rnd(i, 2) - 0.5, d = burst * (250 + 500 * rnd(i, 5));
        const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
        const dark0 = 1 - ramp(f, 1222, 1250);
        at(gg, x, y + Math.sin(f * 0.1 + i) * 3, 0.3 + 0.12 * burst, (g3) => herring(g3, { f: f + i * 3, seed: i, silhouette: dark0 > 0.5 ? "#0b1a30" : undefined, expr: burst > 0.3 ? "happy" : "normal" }), 0, burst > 0.2 && px < 0 && rnd(i, 9) > 0.5);
      });
    });
  } },
  { screen: true, op: "multiply", alpha: (f) => 1 - ramp(f, 1222, 1252), draw: (g) => { g.fillStyle = "rgba(30,40,90,0.85)"; g.fillRect(0, 0, W, H); } },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 70, f, 5) },
], camKeys([{ f: 1222, c: { z: 1.0, y: 1000 }, creep: 0.0012 }, { f: 1262, c: { z: 0.94, y: 990 }, dur: 14 }]), { kicks: [1263], bg: "#0f4f79" });

// 21 GULP (1283-1345): herring gulp air at the surface
add(1283, 1345, [
  { key: "splitSea", d: 0.5, bounds: BIG, res: 0.8, paint: () => undefined },
  { d: 1, draw: (g, f) => {
    const t = f - 1283;
    const y = pw([[0, 1150], [9, 640], [20, 610], [34, 760], [62, 1050]], t), rot = pw([[0, -0.9], [9, -1.2], [20, -1.3], [34, -0.4], [62, 0.2]], t);
    const mouth = t > 7 && t < 20 ? 1 : 0;
    at(g, 560, y, 1.6, (gg) => herring(gg, { f, expr: t > 22 && t < 50 ? "happy" : "normal", seed: 7, mouthOpen: mouth }), rot);
    if (t > 8 && t < 24) { const k = (t - 8) / 16; bubble(g, 560 + 150 - k * 120, 560 + k * 90, 40 * (1 - k) + 8); }
    if (t > 9 && t < 18) for (let i = 0; i < 5; i++) ell(g, 520 + i * 40, 552 - Math.sin((t - 9) * 0.4 + i) * 30, 12, 12, "rgba(255,255,255,0.9)", 3, 0, rgba(INKC, 0.6));
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, 560, W + 400, H + 400, 40, f, 8) },
], camKeys([{ f: 1283, c: { z: 1.05, y: 880 }, creep: 0.0015 }]), { bg: "#0d3a63" });
shots[shots.length - 1].layers[0] = shots[5].layers[0];

// 22-23 X-RAY: swim bladder balloon, duct to the gut, then it lets the air out the back
const bigFish = (g: Ctx, f: number) => {
  const xr = smooth(ramp(f, 1347, 1360)) * (1 - smooth(ramp(f, 1500, 1515)));
  const bl = f < 1444 ? 0.25 + 0.75 * easeOut(ramp(f, 1349, 1372)) + 0.05 * Math.sin(f * 0.5) * (f > 1376 && f < 1396 ? 1 : 0) : 1 - 0.8 * easeOut(ramp(f, 1444, 1470));
  const tube = f >= 1396 && f < 1440 ? 0.5 + 0.5 * Math.sin((f - 1396) * 0.35) : f >= 1455 && f < 1480 ? 1 : 0;
  const expr: FishExpr = f >= 1476 && f < 1530 ? "relief" : f >= 1530 ? "smug" : "normal";
  at(g, 560, 1000, 2.6, (gg) => {
    herring(gg, { f, expr, seed: 9, xray: xr, bladder: bl, tube, tail: 0.6 });
    toot(gg, f - 1478, 2.0, 9);
  });
};
add(1345, 1433, [
  uwStatic("uwDay", "#3fa6c9", "#0f4f79", 0.2, 6, { y: 1650, sand: "#d8c08c", rocks: "#5a6f8f" }),
  { d: 1, draw: (g, f) => bigFish(g, f) },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 50, f, 5) },
], camKeys([{ f: 1345, c: { z: 1.0, y: 1000 }, creep: 0.0012 }, { f: 1396, c: { z: 1.25, x: 380, y: 1010 }, dur: 20 }]), { bg: "#0f4f79" });
add(1433, 1547, [
  uwStatic("uwDay", "#3fa6c9", "#0f4f79", 0.2, 6, { y: 1650, sand: "#d8c08c", rocks: "#5a6f8f" }),
  { d: 1, draw: (g, f) => {
    bigFish(g, f);
    if (f > 1495) bubbleStream(g, 200, 1060, f, 1495, { rate: 3, size: 9, spread: 50, rise: 9, life: 60, seed: 5 });
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 50, f, 5) },
], camKeys([{ f: 1433, c: { z: 1.1, x: 560, y: 1000 }, creep: 0.001 }, { f: 1478, c: { z: 1.3, x: 330, y: 1020, r: 0.03 }, dur: 12 }, { f: 1505, c: { z: 1.2, x: 260, y: 760, r: 0 }, dur: 30 }]), { kicks: [1479], bg: "#0f4f79" });

// 24 BALLOON (1547-1603): ever let the air squeak out of a balloon?
add(1547, 1603, [
  labStatic,
  { d: 1, draw: (g, f) => {
    const t = f - 1547, size = 230 * (1 - 0.55 * ramp(f, 1562, 1600));
    sprite(g, 520, 1880, 1350, (p) => bodyFront(p, BIO1, { expr: f > 1568 ? "laugh" : "grin", mode: "stand", blink: blinkAt(f, 31), seed: 31, wave: 0.5 }));
    balloon(g, 790, 840 - size * 0.1, size, f, f > 1562 ? 1 : 0.2);
    if (f > 1562) for (let i = 0; i < 4; i++) { const k = ((t * 2 + i * 6) % 24) / 24; line(g, [[790 + k * 160, 860 + i * 18 - 20], [830 + k * 160, 852 + i * 18 - 20]], "#ffffff", 7); }
    if (f > 1564) soundLines(g, 820, 870, 0.3, f, "#ffe14d", 2, 0.9);
  } },
], camKeys([{ f: 1547, c: { z: 1.1, y: 960 }, creep: 0.002 }]), { bg: "#d9e4dc" });

// 25 THOUSANDS (1603-1673): a whole school doing it at once
add(1603, 1673, [
  { screen: true, draw: (g) => { underwater(g, 0, 0, W, H, "#2f8fbf", "#0b3a66", 0.2, 6); } },
  { d: 1, draw: (g, f) => {
    for (let row = 0; row < 7; row++) for (let i = 0; i < 9; i++) {
      const x = -260 + i * 200 + (row % 2) * 100 + Math.sin(f * 0.05 + row) * 20, y = 600 + row * 170, s = 0.32 + row * 0.03;
      at(g, x, y + Math.sin(f * 0.08 + i) * 6, s, (gg) => { herring(gg, { f: f + i * 4 + row * 7, seed: row * 9 + i, expr: "smug" }); toot(gg, (f - 1608 - ((i * 3 + row * 5) % 12)) % 34, 0.9, row * 9 + i); });
    }
  } },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 60, f, 9) },
], camKeys([{ f: 1603, c: { z: 1.35, y: 900 }, creep: 0.0005 }, { f: 1618, c: { z: 0.9, y: 1000 }, dur: 30, creep: -0.0006 }]), { bg: "#0b3a66" });

// 26 SOUNDS LIKE A TINY SUB (1673-1768)
add(1673, 1768, [
  uwStatic("uwDay", "#3fa6c9", "#0f4f79", 0.2, 6, { y: 1650, sand: "#d8c08c", rocks: "#5a6f8f" }),
  { d: 1, draw: (g, f) => {
    school(g, f, 230, 960, 8, 130, 0.62, 41, { toot0: 1676 });
    soundLines(g, 400, 960, 0, f, "#fff3a0", 3, 1.2);
    const k = pop(f, 1718, 9);
    if (k > 0) {
      at(g, 840, 960 + Math.sin(f * 0.1) * 6, 0.62 * k, (gg) => { submarine(gg, 0, 0, 620, "#e0b13a"); propeller(gg, -320, 0, 70, f); }, 0, true);
      soundLines(g, 680, 950, Math.PI, f, "#fff3a0", 3, 1.2);
    }
    // equals sign between
    if (f > 1726) { const e = pop(f, 1726, 7); rr(g, 540 - 60 * e, 1060, 120 * e, 30, 8, "#ffffff", 5); rr(g, 540 - 60 * e, 1115, 120 * e, 30, 8, "#ffffff", 5); }
  } },
], camKeys([{ f: 1673, c: { z: 1.05, y: 1000 }, creep: 0.0015 }]), { bg: "#0f4f79" });

// 27 F.R.T. (1768-1893): an official name
add(1768, 1893, [
  labStatic,
  { d: 1, draw: (g, f) => {
    const laugh = f >= 1860;
    sprite(g, 300, 1800, 1080, (p) => bodyFront(p, BIO1, { expr: laugh ? "laugh" : f > 1800 ? "smile" : "neutral", mode: "stand", blink: blinkAt(f, 31), seed: 31, facing: 1, wave: f > 1800 && f < 1860 ? 1 : undefined, tilt: laugh ? Math.sin(f * 0.8) * 3 : 0 }));
    sprite(g, 780, 1810, 1100, (p) => bodyFront(p, BIO2, { expr: laugh ? "laugh" : "neutral", mode: "stand", blink: blinkAt(f, 32), seed: 32, facing: -1, tilt: laugh ? Math.sin(f * 0.8 + 1) * 3 : 0 }));
    if (f > 1824) { const k = pop(f, 1824, 8); at(g, 540, 360, k, (gg) => { rr(gg, -330, -90, 660, 180, 30, "#ffffff", 6); at(gg, -130, 0, 0.55, (g3) => herring(g3, { f, expr: "smug" })); for (let i = 0; i < 5; i++) bubble(gg, 90 + i * 45, 10 - i * 18, 14 + i * 3); }); }
  } },
], camKeys([{ f: 1768, c: { z: 1.0, y: 1000 }, creep: 0.0012 }, { f: 1862, c: { z: 1.15, y: 940, r: 0.02 }, dur: 10 }]), { kicks: [1862], bg: "#d9e4dc" });

// 28 IG NOBEL (1893-1955)
add(1893, 1955, [
  { key: "stage", d: 0.4, bounds: BIG, res: 0.8, paint: (g) => {
    g.fillStyle = "#2a1630"; g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
    for (let i = 0; i < 16; i++) { const x = BIG[0] + i * 170; rr(g, x, BIG[1], 170, 1900, 0, lg(g, x, 0, x + 170, 0, [[0, "#8a1a2a"], [0.5, "#c8364a"], [1, "#8a1a2a"]]), 0); }
    rr(g, BIG[0], 1500, BIG[2] - BIG[0], 900, 0, lg(g, 0, 1500, 0, 2000, [[0, "#6a4a3a"], [1, "#3a2620"]]), 5);
  } },
  { d: 1, draw: (g, f) => {
    g.save(); g.globalCompositeOperation = "lighter";
    g.fillStyle = lg(g, 540, -200, 540, 1600, [[0, "rgba(255,240,200,0.45)"], [1, "rgba(255,240,200,0.05)"]]);
    g.beginPath(); g.moveTo(440, -300); g.lineTo(640, -300); g.lineTo(1000, 1600); g.lineTo(80, 1600); g.closePath(); g.fill();
    g.restore();
    ell(g, 540, 1600, 460, 70, "rgba(255,240,200,0.25)", 0);
    sprite(g, 330, 1640, 1000, (p) => bodyFront(p, BIO1, { expr: "grin", mode: "stand", blink: blinkAt(f, 31), seed: 31, facing: 1, wave: 1 }));
    trophy(g, 330 + 171 * 1.0 - 4, 1640 - (975 - 314) * 1.0 - 10, 1.15);
    sprite(g, 760, 1650, 1020, (p) => bodyFront(p, BIO2, { expr: "relief_open", mode: "stand", blink: blinkAt(f, 32), seed: 32, facing: -1 }));
    confetti(g, -100, 1180, -200, f, 1928, 90);
  } },
], camKeys([{ f: 1893, c: { z: 1.0, y: 1050 }, creep: 0.0018 }]), { bg: "#2a1630" });

// 29 NAVY AT WAR (1955-2030): from below, a whole fleet pinging the water
add(1955, 2030, [
  uwStatic("uwNight2", "#1d4f80", "#06152b", 0.14, 13),
  { d: 0.6, draw: (g, f) => {
    g.fillStyle = lg(g, 0, -400, 0, 300, [[0, "rgba(150,200,240,0.6)"], [1, "rgba(150,200,240,0)"]]); g.fillRect(-700, -400, W + 1400, 700);
    for (const [hx, w0, ph] of [[120, 260, 0], [560, 340, 1], [990, 240, 2]] as [number, number, number][]) {
      const x = hx + Math.sin(f * 0.02 + ph) * 10;
      // searchlight cone down into the water
      g.save(); g.globalCompositeOperation = "lighter";
      const sw = Math.sin(f * 0.04 + ph * 2) * 0.35;
      g.fillStyle = lg(g, 0, 200, 0, 1500, [[0, "rgba(255,250,200,0.35)"], [1, "rgba(255,250,200,0)"]]);
      g.beginPath(); g.moveTo(x - 20, 200); g.lineTo(x + 20, 200); g.lineTo(x + 260 + sw * 900, 1500); g.lineTo(x - 260 + sw * 900, 1500); g.closePath(); g.fill();
      g.restore();
      // hull from below: pointed bow, keel, propeller shaft
      poly(g, [[x - w0, 110], [x + w0 * 0.75, 100], [x + w0 * 1.1, 120], [x + w0 * 0.7, 200], [x - w0 * 0.9, 205]], "#08142a", 0);
      line(g, [[x - w0 * 0.9, 200], [x - w0 * 1.15, 215]], "#08142a", 10);
      for (let k = 0; k < 3; k++) { const t = (f - 1960 - k * 22 - hx * 0.02); if (t < 0) continue; const r = (t % 66) * 10, al = Math.max(0, 1 - (t % 66) / 66); ell(g, x, 205, r * 1.2, r * 0.8, null, 5 * al + 1, 0, `rgba(120,255,190,${0.6 * al})`); }
    }
  } },
  { d: 1, draw: (g, f) => school(g, f, 540, 1300, 18, 240, 0.5, 51, { drift: 0.2, expr: f > 2010 ? "smug" : "normal" }) },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 70, f, 13) },
], camKeys([{ f: 1955, c: { z: 1.0, y: 700 }, creep: 0.001 }, { f: 2000, c: { z: 1.15, y: 1150 }, dur: 30 }]), { bg: "#06152b" });

// 30 FINAL (2030-TOTAL): the culprit, smug, toots, winks
add(2030, TOTAL, [
  uwStatic("uwDay", "#3fa6c9", "#0f4f79", 0.2, 6, { y: 1650, sand: "#d8c08c", rocks: "#5a6f8f" }),
  { d: 1, draw: (g, f) => at(g, 600, 960, 2.4, (gg) => { herring(gg, { f, expr: f > 2058 ? "wink" : "smug", seed: 2, tail: 0.5 }); toot(gg, f - 2040, 2.2, 3); }) },
  { d: 1.3, draw: (g, f) => specks(g, -400, -400, W + 400, H + 400, 60, f, 5) },
], camKeys([{ f: 2030, c: { z: 1.0, y: 1000, x: 500 }, creep: 0.002 }, { f: 2042, c: { z: 1.18, y: 990, x: 520, r: -0.03 }, dur: 8, creep: 0.001 }]), { kicks: [2043], bg: "#0f4f79" });

export const story: Story = {
  total: TOTAL,
  shots,
  flashes: [168],
  xfade: { 2: 6, 4: 8, 5: 6, 8: 8, 10: 6, 13: 8, 16: 6, 17: 8, 19: 8, 20: 8, 21: 6, 23: 8, 24: 6, 25: 6, 26: 8, 27: 8, 28: 8, 29: 6 },
};
void [glide, clamp01, shadow, kelp, H, light, dark, line];
