// "The Man with the Golden Arm": shots cued from voice/words.json (frames at 30 fps).
// Captions sit at ~65 % height (y 1150-1370): faces stay above them or well below.
import type { Ctx, Layer, Shot, Story } from "../../lib/engine";
import { W, H, camKeys, at, ramp, pop, easeOut, easeIn, rnd, sprite, blinkAt, shadow, clamp01, lerp, smooth } from "../../lib/engine";
import { INKC, P, poly, line, ell, rr, lg, rg, room, questionMark, exclaim, burstBg, confetti, light, dark, rgba } from "../../lib/paint";
import { cueSheet } from "../../lib/cues";
import type { Word } from "../../lib/captions";
import words from "../../../videos/goldenarm/voice/words.json";
import {
  KID, jamesAt, NURSE, MOTHER, DAUGHTER, SCI, RED, GOLD, miniFace, bedBack, bedFront, ivStand, bloodBag, drop, donorChair, armRest, forearm,
  needleTube, plasmaMachine, sweat, counter, calendar, newspaper, balloon, stamp, nameTag, antibody, rbc, baby, crib, syringe, shield,
  thought, heart, petri, australia, ausXY, flexArm,
} from "./actors";
import { bodyFront, Outfit, Expr } from "../../lib/toon";

const C = cueSheet(words as Word[]);
const { W: w, B } = C;
export const TOTAL = C.end + 30;
const BIG: [number, number, number, number] = [-700, -700, W + 700, H + 700];

type WhoOpt = { expr?: Expr; facing?: -1 | 0 | 1; wave?: number; look?: number; tilt?: number; headTilt?: number; mode?: "stand" | "sit"; noShadow?: boolean };
const who = (g: Ctx, o: Outfit, x: number, y: number, h: number, f: number, seed: number, opt: WhoOpt = {}) => {
  if (!opt.noShadow && opt.mode !== "sit") shadow(g, x, y, h * 0.2, 0.22);
  sprite(g, x, y, h, (p) => bodyFront(p, o, { expr: opt.expr ?? "neutral", mode: opt.mode ?? "stand", blink: blinkAt(f, seed), seed, facing: opt.facing ?? 0, wave: opt.wave, look: opt.look, tilt: opt.tilt, headTilt: opt.headTilt }));
};
const sparkle = (g: Ctx, x: number, y: number, r: number, col = "#fff6c0") => {
  poly(g, [[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]], col, 3);
};
const sparkles = (g: Ctx, cx: number, cy: number, rad: number, f: number, n = 8, seed = 5) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + f * 0.03, k = 0.5 + 0.5 * Math.sin(f * 0.25 + i * 1.7);
    sparkle(g, cx + Math.cos(a) * rad * (0.8 + 0.3 * rnd(seed, i)), cy + Math.sin(a) * rad * (0.8 + 0.3 * rnd(seed, i)), 14 + 16 * k);
  }
};
const glowAt = (g: Ctx, x: number, y: number, r: number, a: number, col = "255,210,90") => {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rg(g, x, y, 0, r, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]); g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
};
const fmt = (n: number) => n.toLocaleString("en-US");

// ---------------- sets ----------------
const WARD: Layer = { key: "ward", d: 0.5, bounds: BIG, res: 0.7, paint: (g) => {
  room(g, BIG[0], BIG[2], 1240, BIG[3], "#d8e8e4", "#b8c4cc", 540, BIG[1]);
  rr(g, 640, 180, 360, 420, 12, lg(g, 0, 180, 0, 600, [[0, "#9ad0f0"], [1, "#d8f0ff"]]), 10, "#f4f4f0"); // window
  line(g, [[820, 180], [820, 600]], "#f4f4f0", 10); line(g, [[640, 390], [1000, 390]], "#f4f4f0", 10);
  rr(g, 60, 260, 200, 140, 8, "#f4f4f0", 5); line(g, [[90, 330], [230, 330]], "#e8322e", 10); line(g, [[160, 290], [160, 370]], "#e8322e", 10); // red cross sign
} };
const CLINIC: Layer = { key: "clinic", d: 0.5, bounds: BIG, res: 0.7, paint: (g) => {
  room(g, BIG[0], BIG[2], 1300, BIG[3], "#f0e4d4", "#c4b4a4", 540, BIG[1]);
  rr(g, 90, 200, 300, 220, 10, "#ffffff", 6); drop(g, 240, 320, 50); // "give blood" poster
  rr(g, 700, 220, 260, 160, 10, "#e8f4ff", 6); for (let i = 0; i < 3; i++) line(g, [[730, 260 + i * 40], [930, 260 + i * 40]], rgba(INKC, 0.3), 8);
} };
const LAB: Layer = { key: "lab", d: 0.5, bounds: BIG, res: 0.7, paint: (g) => {
  room(g, BIG[0], BIG[2], 1280, BIG[3], "#d4e2ec", "#9aa8b4", 540, BIG[1]);
  for (let i = 0; i < 3; i++) { rr(g, 80 + i * 330, 180, 260, 300, 8, "#eef4f8", 6); for (let j = 0; j < 4; j++) rr(g, 100 + i * 330, 210 + j * 66, 220, 40, 6, j % 2 ? "#c8e0f0" : "#e0ecf4", 3); }
} };
const SCOPE = (key: string, field: string, edge: string): Layer => ({ key, d: 0.3, bounds: BIG, res: 0.6, paint: (g) => {
  g.fillStyle = "#14101e"; g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]);
  g.fillStyle = rg(g, 540, 700, 100, 720, [[0, field], [0.85, edge], [1, "#2a2420"]]); g.beginPath(); g.arc(540, 700, 700, 0, Math.PI * 2); g.fill();
} });
const PLASMA = SCOPE("plasma", "#fff4c8", "#f0d890");
const WARM: Layer = { key: "warm", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => { g.fillStyle = lg(g, 0, BIG[1], 0, BIG[3], [[0, "#ffd88a"], [1, "#ff9a6a"]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]); burstBg(g, 540, 700, 2200, "rgba(255,255,255,0.12)", "rgba(255,255,255,0)", 24, 0); } };
const SKYMAP: Layer = { key: "skymap", d: 0.3, bounds: BIG, res: 0.6, paint: (g) => { g.fillStyle = lg(g, 0, BIG[1], 0, BIG[3], [[0, "#2a6fae"], [1, "#123a6a"]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]); for (let i = 0; i < 40; i++) { const x = BIG[0] + rnd(3, i) * (BIG[2] - BIG[0]), y = BIG[1] + rnd(4, i) * (BIG[3] - BIG[1]); line(g, [[x, y], [x + 50, y]], "rgba(255,255,255,0.15)", 4); } } };
const BLOODBG = (key: string, a: string, b: string): Layer => ({ key, d: 0.3, bounds: BIG, res: 0.6, paint: (g) => { g.fillStyle = lg(g, 0, BIG[1], 0, BIG[3], [[0, a], [1, b]]); g.fillRect(BIG[0], BIG[1], BIG[2] - BIG[0], BIG[3] - BIG[1]); } });
const VEIN = BLOODBG("vein", "#ffd8d8", "#f4a8b0");
const VEIN_DIM = BLOODBG("veinDim", "#b8a8c8", "#7a6a98");

const shots: Shot[] = [];
const add = (a: number, b: number, layers: Layer[], cam: Shot["cam"], extra: Partial<Shot> = {}) => shots.push({ a, b, layers, cam, ...extra });

// ---------------- cues ----------------
const fStrangers = w("strangers'"), fSaved = w("saved"), fPaid = w("paid"), f1173 = w("1,173"), fTimes = w("times.");
const fJames = w("james"), fAustralia = w("australia,"), fHad = w("had"), f1951 = w("1951..."), fNeeded = w("needed"), fThirteen = w("thirteen"), fBlood1 = w("blood.", 0, 1);
const fPromise = w("promise:"), fGive = w("give"), fEighteen = w("eighteen,"), fKept = w("kept", 0, 3), fHated = w("hated");
const fDoctors = w("doctors"), fPacked = w("packed"), fAntiD = w("anti-d.");
const fMothers = w("mother's", 0, 5), fNeg = w("rh-negative,"), fBabys = w("baby's", 0, 5), fPos = w("rh-positive,"), fLearn = w("learn"), fInvader = w("invader..."), fAttack = w("attack", 0, 6);
const fBabies = w("babies", 0, 7), fNotAll = w("not", 0, 7);
const fMedicine = w("medicine:"), fShot = w("shot", 0, 8), fLearning = w("learning"), fAttack2 = w("attack.", 0, 8);
const f1967 = w("1967,"), fGot = w("got");
const fKept2 = w("kept", 0, 10), fSixty = w("sixty"), fYears = w("years.", 0, 10);
const fOne = w("one", 0, 11), fDaughter = w("daughter.");
const fAustralians = w("australians"), fGolden = w("golden");
const fLuckily = w("luckily,"), fEightyOne = w("eighty-one."), fUnluckily = w("unluckily..."), fNever = w("never", 0, 14), fNeedle = w("needle.");
const fDonations = w("donations"), f24 = w("2.4"), fMillion = w("million"), fBabies2 = w("babies.", 0, 15);
const fDied = w("died"), f2025 = w("2025,");
const fScientists = w("scientists"), fLab = w("lab..."), fPromise2 = w("promise", 0, 17), fEnd = w("end.");

// 1a HOOK: at fourteen, strangers' blood saved his life
const BED_X = 560, BED_Y = 1100;
const kidInBed = (g: Ctx, f: number, expr: Expr, wave?: number) => {
  bedBack(g, BED_X, BED_Y);
  who(g, KID, BED_X - 150, BED_Y + 40, 760, f, 11, { expr, mode: "sit", facing: 1, wave, noShadow: true });
  bedFront(g, BED_X, BED_Y);
};
add(0, fPaid - 2, [WARD, { d: 1, draw: (g, f) => {
  ivStand(g, 200, 1150, 860); bloodBag(g, 200, 300, 1.1, 1 - 0.3 * ramp(f, 0, fPaid));
  line(g, [[200, 470], [260, 760], [380, 820]], INKC, 8); line(g, [[200, 470], [260, 760], [380, 820]], "#c8303a", 4);
  kidInBed(g, f, f > fSaved + 4 ? "smile" : "pained");
  // three strangers' drops fly into the bag
  for (let i = 0; i < 3; i++) {
    const t = ramp(f, fStrangers - 8 + i * 5, fStrangers + 14 + i * 5);
    if (t <= 0 || t >= 1) continue;
    const x = lerp(1180, 200, easeIn(t)), y = lerp(500 - i * 120, 380, easeIn(t));
    drop(g, x, y, 40); g.save(); g.translate(x, y + 6); miniFace(g, 22, "happy"); g.restore();
  }
  if (f > fSaved) heart(g, 700, 560, pop(f, fSaved, 8) * 1.2);
} }], camKeys([{ f: 0, c: { z: 1.05, y: 900 }, creep: 0.0018 }]), { bg: "#d8e8e4" });
// 1b SO HE PAID IT BACK... 1,173 TIMES (golden arm + counter)
add(fPaid - 2, B(1), [WARM, { d: 1, draw: (g, f) => {
  const gold = smooth(ramp(f, f1173 - 6, fTimes));
  glowAt(g, 520, 560, 600, 0.5 * gold);
  flexArm(g, 620, 820, 1.1, gold);
  sparkles(g, 470, 560, 420, f, 7);
  const n = Math.round(1173 * easeOut(ramp(f, f1173 - 4, fTimes - 2)));
  counter(g, 540, 1600, pop(f, fPaid, 8) * 1.1, fmt(Math.max(1, n)), n >= 1173 ? GOLD : "#7cff9a");
} }], camKeys([{ f: fPaid - 2, c: { z: 1.0, y: 960 }, creep: 0.002 }, { f: fTimes, c: { z: 1.08, y: 940 }, dur: 8 }]), { kicks: [fTimes], bg: "#ffd88a" });

// 2a JAMES HARRISON, FROM AUSTRALIA
add(B(1), fHad - 3, [SKYMAP, { d: 1, draw: (g, f) => {
  australia(g, 540, 640, 18 * pop(f, B(1), 10));
  const [px, py] = ausXY(151.2, -33.9, 540, 640, 18);
  if (f > fAustralia - 4) { const k = pop(f, fAustralia - 4, 8); g.save(); g.translate(px, py); g.scale(k, k); poly(g, [[0, 0], [-22, -42], [-25, -62], [-14, -78], [0, -84], [14, -78], [25, -62], [22, -42]], "#ff4d5a", 5); ell(g, 0, -60, 12, 12, "#fff", 0); g.restore(); }
  nameTag(g, 540, 1580, pop(f, fJames - 2, 9), "JAMES HARRISON");
} }], camKeys([{ f: B(1), c: { z: 1.0, y: 960 }, creep: 0.0018 }]), { bg: "#2a6fae" });
// 2b CHEST SURGERY IN 1951... THIRTEEN UNITS OF BLOOD
add(fHad - 3, B(2), [WARD, { d: 1, draw: (g, f) => {
  calendar(g, 900, 760, pop(f, f1951 - 3, 8) * 0.8, "1951");
  const n = Math.min(13, Math.max(0, Math.floor(((f - fNeeded) / Math.max(1, fBlood1 - fNeeded)) * 13) + 1));
  for (let i = 0; i < n; i++) { const r = Math.floor(i / 7), c = i % 7; bloodBag(g, 110 + c * 140 + r * 70, 160 + r * 220, 0.62 * pop(f, fNeeded + i * ((fBlood1 - fNeeded) / 13), 5)); }
  kidInBed(g, f, "pained");
  if (f > fThirteen - 2) counter(g, 190, 700, pop(f, fThirteen - 2, 8) * 0.55, "13", "#ff6a6a");
} }], camKeys([{ f: fHad - 3, c: { z: 1.0, y: 900 }, creep: 0.0015 }]), { bg: "#d8e8e4" });

// 3 THE PROMISE
add(B(2), B(3), [WARD, { d: 1, draw: (g, f) => {
  kidInBed(g, f, f > fPromise ? "smile" : "neutral", f > fPromise - 2 ? 0.9 : undefined);
  thought(g, 760, 430, 190, 560, 650, easeOut(ramp(f, fPromise, fPromise + 10)), (gg) => {
    drop(gg, 700, 430, 60); heart(gg, 820, 440, 0.8 * pop(f, fGive, 8));
    if (f > fGive) { gg.save(); gg.translate(700, 436); miniFace(gg, 32, "happy"); gg.restore(); }
  });
} }], camKeys([{ f: B(2), c: { z: 1.0, y: 880 }, creep: 0.0018 }]), { bg: "#d8e8e4" });

// 4 AT EIGHTEEN, HE KEPT IT. EVEN THOUGH HE HATED NEEDLES.
const donorScene = (g: Ctx, f: number, grey: number, expr: Expr, facing: -1 | 0 | 1, gold = 0, glasses = false, nurse = true) => {
  plasmaMachine(g, 920, 1180, 1.0, f);
  donorChair(g, 400, 1180, 1.0);
  who(g, jamesAt(grey, glasses), 400, 1150, 820, f, 21, { expr, mode: "sit", facing, noShadow: true });
  armRest(g, 430, 1070, 1.0);
  forearm(g, 440, 1045, 230, gold, "#3f6fb0");
  needleTube(g, 560, 1040, 860, 1150, f);
  if (nurse) who(g, NURSE, 760, 1900, 900, f, 31, { expr: "smile", facing: -1 });
};
add(B(3), B(4), [CLINIC, { d: 1, draw: (g, f) => {
  const away = f > fHated - 4;
  donorScene(g, f, 0, away ? "nervous" : f > fKept ? "smile" : "neutral", away ? -1 : 0);
  if (away) sweat(g, 300, 470, 1, f);
  if (f > fEighteen - 4) calendar(g, 160, 260, pop(f, fEighteen - 4, 8) * 0.7, "AGE 18");
} }], camKeys([{ f: B(3), c: { z: 1.0, y: 960 }, creep: 0.0015 }, { f: fHated, c: { z: 1.15, x: 470, y: 880 }, dur: 10 }]), { bg: "#f0e4d4" });

// 5 HIS PLASMA WAS PACKED WITH A POWERFUL ANTIBODY CALLED ANTI-D
add(B(4), B(5), [PLASMA, { d: 1, draw: (g, f) => {
  const n = 6 + Math.floor(14 * easeOut(ramp(f, fPacked - 4, fPacked + 16)));
  for (let i = 0; i < n; i++) {
    const x = 540 + (rnd(7, i) - 0.5) * 900 + Math.sin(f * 0.03 + i) * 20, y = 700 + (rnd(8, i) - 0.5) * 900 + Math.cos(f * 0.025 + i) * 20;
    antibody(g, x, y, 0.75 * pop(f, i < 6 ? B(4) : fPacked - 4 + (i - 6) * 1.2, 7), GOLD, Math.sin(f * 0.02 + i * 2) * 0.8, "happy");
  }
  if (f > fAntiD - 4) nameTag(g, 540, 700, pop(f, fAntiD - 4, 8) * 1.3, "ANTI-D");
} }], camKeys([{ f: B(4), c: { z: 1.0, y: 760 }, creep: 0.0025 }]), { bg: "#fff4c8" });

// 6-7 Rh-NEGATIVE MOTHER, Rh-POSITIVE BABY: HER BODY LEARNS TO ATTACK
const momWithBelly = (g: Ctx, o: Outfit, x: number, f: number, seed: number, expr: Expr) => {
  who(g, o, x, 1130, 860, f, seed, { expr, facing: 1 });
  ell(g, x + 40, 840, 110, 120, o.dress ?? "#e86a9a", 6); ell(g, x + 10, 800, 30, 20, "rgba(255,255,255,0.35)", 0, -0.5);
};
const BUB_X = 760, BUB_Y = 560, BUB_R = 270;
const bubble = (g: Ctx, f: number, inner: (g: Ctx) => void) => {
  for (let i = 0; i < 3; i++) ell(g, 420 + i * 70, 840 - i * 70, 14 + i * 8, 14 + i * 8, "#ffffff", 4);
  ell(g, BUB_X, BUB_Y, BUB_R + 12, BUB_R + 12, "#ffffff", 8);
  g.save(); g.beginPath(); g.arc(BUB_X, BUB_Y, BUB_R, 0, Math.PI * 2); g.clip();
  g.fillStyle = lg(g, 0, BUB_Y - BUB_R, 0, BUB_Y + BUB_R, [[0, "#ffd8e0"], [1, "#f4a0b0"]]); g.fillRect(BUB_X - BUB_R, BUB_Y - BUB_R, 2 * BUB_R, 2 * BUB_R);
  inner(g); g.restore();
  ell(g, BUB_X, BUB_Y, BUB_R, BUB_R, null, 8);
};
const babyCells = (g: Ctx, f: number, mood: "calm" | "scared" | "happy", grab = 0) => {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + f * 0.01, x = BUB_X + Math.cos(a) * 170, y = BUB_Y + 60 + Math.sin(a) * 120;
    rbc(g, x, y, 46, mood, f > fPos ? "+" : undefined);
    if (grab > 0) antibody(g, x - 50 + 20 * (1 - grab), y - 50, 0.42 * grab, "#8a5ac8", 0.6, "angry");
  }
};
add(B(5), B(7), [VEIN, { d: 1, draw: (g, f) => {
  momWithBelly(g, MOTHER, 250, f, 41, f > fAttack ? "shock" : f > fInvader ? "nervous" : "smile");
  if (f > fNeg - 4) nameTag(g, 290, 1560, pop(f, fNeg - 4, 8) * 0.75, "Rh NEGATIVE");
  if (f > fPos - 4) nameTag(g, 780, 1560, pop(f, fPos - 4, 8) * 0.75, "Rh POSITIVE");
  bubble(g, f, (gg) => {
    const attack = easeOut(ramp(f, fAttack - 4, fAttack + 10));
    babyCells(gg, f, attack > 0.2 ? "scared" : "calm", attack);
    baby(gg, BUB_X, BUB_Y - 70, 70, attack > 0.2 ? "scared" : f > fBabys ? "happy" : "sleep");
    if (f > fLearn - 2 && attack < 1) for (let i = 0; i < 4; i++) {
      const t = clamp01((f - fLearn - i * 4) / 30);
      antibody(gg, lerp(BUB_X - BUB_R - 40, BUB_X - 160 + i * 60, easeOut(t)), BUB_Y - 160 + i * 90, 0.5 * pop(f, fLearn - 2 + i * 4, 7), "#8a5ac8", 0.5, "angry");
    }
    if (f > fInvader - 2 && f < fAttack + 4) exclaim(gg, BUB_X + 150, BUB_Y - 170, 120 * pop(f, fInvader - 2, 6));
  });
} }], camKeys([{ f: B(5), c: { z: 1.0, y: 960 }, creep: 0.0012 }, { f: fLearn, c: { z: 1.06, x: 560, y: 860 }, dur: 20 }]), { kicks: [fAttack], bg: "#ffd8d8" });

// 8 BABIES WERE BORN SICK... OR NOT AT ALL (quiet, empty crib)
add(B(7), B(8), [{ key: "nursery", d: 0.5, bounds: BIG, res: 0.7, paint: (g) => { room(g, BIG[0], BIG[2], 1260, BIG[3], "#8a90a8", "#6a6a80", 540, BIG[1]); rr(g, 680, 220, 300, 360, 12, "#4a5a80", 8, "#a8acc0"); } },
  { d: 1, draw: (g, f) => { crib(g, 470, 1180, 1.1); } },
  { screen: true, op: "multiply", draw: (g) => { g.fillStyle = "rgba(120,130,170,0.55)"; g.fillRect(0, 0, W, H); } }],
  camKeys([{ f: B(7), c: { z: 1.0, y: 900 }, creep: 0.0012 }]), { bg: "#6a6a80" });

// 9 THE MEDICINE: A SHOT THAT STOPS THE MOTHER'S BODY FROM LEARNING TO ATTACK
add(B(8), B(9), [VEIN, { d: 1, draw: (g, f) => {
  momWithBelly(g, MOTHER, 250, f, 41, f > fShot ? "smile" : "neutral");
  const sx = lerp(-300, 330, easeOut(ramp(f, fMedicine - 6, fMedicine + 8))), sy = 300;
  if (f > fMedicine - 6) syringe(g, sx + (f > fShot ? 20 * Math.sin((f - fShot) * 0.6) * Math.max(0, 1 - (f - fShot) / 12) : 0), sy, 0.7, 0.3);
  bubble(g, f, (gg) => {
    babyCells(gg, f, "happy");
    baby(gg, BUB_X, BUB_Y - 70, 70, "happy");
    shield(gg, BUB_X, BUB_Y, 230, easeOut(ramp(f, fShot, fShot + 12)), f);
    // the would-be attacker, "learning", gets crossed out
    if (f > fLearning - 8 && f < fAttack2 + 20) {
      const a = 1 - ramp(f, fAttack2 + 4, fAttack2 + 20);
      gg.save(); gg.globalAlpha = a; antibody(gg, BUB_X - 170, BUB_Y - 150, 0.55, "#8a5ac8", 0.4, "calm"); questionMark(gg, BUB_X - 110, BUB_Y - 240, 80, "#ffd84a", 0.1);
      if (f > fLearning) { const k = pop(f, fLearning, 6); line(gg, [[BUB_X - 230, BUB_Y - 210], [BUB_X - 230 + 120 * k, BUB_Y - 210 + 120 * k]], "#e8322e", 18); line(gg, [[BUB_X - 110, BUB_Y - 210], [BUB_X - 110 - 120 * k, BUB_Y - 210 + 120 * k]], "#e8322e", 18); }
      gg.restore();
    }
  });
} }], camKeys([{ f: B(8), c: { z: 1.0, y: 960 }, creep: 0.0012 }]), { bg: "#ffd8d8" });

// 10 IN 1967, THE FIRST MOTHER GOT IT
add(B(9), B(10), [WARD, { d: 1, draw: (g, f) => {
  calendar(g, 860, 300, pop(f, f1967 - 3, 8) * 0.85, "1967");
  who(g, MOTHER, 360, 1150, 860, f, 41, { expr: "smile", facing: 1 });
  baby(g, 380, 760, 62, "happy");
  who(g, NURSE, 800, 1150, 860, f, 31, { expr: "smile", facing: -1 });
  syringe(g, 640, 700, 0.42, 0, "ANTI-D", true);
  if (f > fGot) heart(g, 520, 470, pop(f, fGot, 8) * 1.1);
} }], camKeys([{ f: B(9), c: { z: 1.0, y: 900 }, creep: 0.0015 }]), { bg: "#d8e8e4" });

// 11 HE KEPT COMING BACK EVERY FEW WEEKS... FOR OVER SIXTY YEARS (montage)
add(B(10), B(11), [CLINIC, { d: 1, draw: (g, f) => {
  const u = clamp01((f - fKept2 + 4) / Math.max(1, fYears + 8 - fKept2));
  const year = Math.round(lerp(1967, 2018, u));
  donorScene(g, f, u * 0.9, "smile", 0, 0, u > 0.6, false);
  calendar(g, 840, 300, 0.85, String(year));
  if (f > fSixty - 4) stamp(g, 540, 1580, pop(f, fSixty - 4, 9), "60+ YEARS", "#ff4d5a");
} }], camKeys([{ f: B(10), c: { z: 1.0, y: 960 }, creep: 0.0012 }]), { bg: "#f0e4d4" });

// 12 ONE OF THE MOTHERS WHO NEEDED THAT SHOT... WAS HIS OWN DAUGHTER
add(B(11), B(12), [{ key: "home", d: 0.5, bounds: BIG, res: 0.7, paint: (g) => { room(g, BIG[0], BIG[2], 1240, BIG[3], "#f4dcc4", "#b89070", 540, BIG[1]); rr(g, 620, 220, 320, 300, 10, "#9ad0f0", 10, "#f4f4f0"); rr(g, 120, 260, 220, 160, 8, "#e8c890", 8, "#8a5a3a"); } },
  { d: 1, draw: (g, f) => {
    who(g, jamesAt(0.6), 330, 1150, 880, f, 21, { expr: f > fDaughter ? "grin" : "smile", facing: 1 });
    momWithBelly(g, DAUGHTER, 700, f, 51, "smile");
    if (f > fDaughter - 2) { heart(g, 520, 430, pop(f, fDaughter - 2, 8) * 1.3); syringe(g, 540, 1600, pop(f, fDaughter + 2, 8) * 0.55, 0); }
  } }], camKeys([{ f: B(11), c: { z: 1.0, y: 900 }, creep: 0.0015 }]), { bg: "#f4dcc4" });

// 13 AUSTRALIANS CALLED HIM THE MAN WITH THE GOLDEN ARM
add(B(12), B(13), [WARM, { d: 1, draw: (g, f) => {
  const gold = smooth(ramp(f, fGolden - 4, fGolden + 10));
  glowAt(g, 520, 600, 620, 0.55 * gold);
  flexArm(g, 620, 860, 1.1, gold);
  if (gold > 0.5) sparkles(g, 470, 600, 420, f, 9);
  newspaper(g, 540, 1640, pop(f, fAustralians - 2, 9) * 0.95);
} }], camKeys([{ f: B(12), c: { z: 1.0, y: 960 }, creep: 0.002 }]), { kicks: [fGolden], kickAmp: 12, bg: "#ffd88a" });

// 14-15 LUCKILY UNTIL 81 / UNLUCKILY... HE NEVER ONCE WATCHED THE NEEDLE
add(B(13), B(15), [CLINIC, { d: 1, draw: (g, f) => {
  const cols = ["#ff5a7a", "#4ad8ff", "#ffd84a", "#7cff4f"];
  "1173".split("").forEach((ch, i) => balloon(g, 640 + i * 110, 260 + (i % 2) * 50, 0.62, ch, cols[i], f, i));
  const away = f > fNever - 4;
  donorScene(g, f, 1, away ? "nervous" : "grin", away ? -1 : 0, 0.6, true, f > fUnluckily - 10);
  if (away) sweat(g, 300, 470, 1, f);
  if (f > fEightyOne - 4) calendar(g, 160, 260, pop(f, fEightyOne - 4, 8) * 0.7, "AGE 81");
} }], camKeys([{ f: B(13), c: { z: 1.0, y: 960 }, creep: 0.0012 }, { f: fNever, c: { z: 1.3, x: 440, y: 800 }, dur: 14 }]), { kicks: [fNeedle + 2], kickAmp: 10, bg: "#f0e4d4" });

// 16 AN ESTIMATED 2.4 MILLION BABIES
add(B(15), B(16), [WARM, { d: 1, draw: (g, f) => {
  const rows = 9, cols = 6;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, t0 = fDonations + i * ((fBabies2 - fDonations) / (rows * cols));
    if (f < t0) continue;
    baby(g, 110 + c * 172 + (r % 2) * 40, 520 + r * 160, 40 * pop(f, t0, 6), "happy", ["#ffd0e0", "#d0e8ff", "#fff0b0", "#d8f8d0"][i % 4]);
  }
  if (f > f24 - 4) { counter(g, 540, 260, pop(f, f24 - 4, 9) * 1.05, "2,400,000", GOLD); g.fillStyle = "#ffffff"; g.font = "900 44px CapFont"; g.textAlign = "center"; g.lineWidth = 9; g.strokeStyle = INKC; g.strokeText("ESTIMATED", 540, 400); g.fillText("ESTIMATED", 540, 400); }
} }], camKeys([{ f: B(15), c: { z: 1.0, y: 960 }, creep: 0.0015 }]), { bg: "#ffd88a" });

// 17 HE DIED IN 2025, AT EIGHTY-EIGHT (quiet empty chair, golden light)
add(B(16), B(17), [CLINIC, { d: 1, draw: (g, f) => {
  glowAt(g, 400, 760, 520, 0.45 + 0.05 * Math.sin(f * 0.08));
  donorChair(g, 400, 1180, 1.0);
  poly(g, [[380, 1065], [470, 1030], [480, 1045], [390, 1080]], "#5ab04a", 3); ell(g, 480, 1032, 24, 24, "#ff7a9a", 4); ell(g, 480, 1032, 9, 9, "#ffd84a", 0);
} }, { screen: true, op: "multiply", draw: (g) => { g.fillStyle = "rgba(200,190,220,0.35)"; g.fillRect(0, 0, W, H); } }],
  camKeys([{ f: B(16), c: { z: 1.0, y: 940 }, creep: 0.0012 }]), { bg: "#f0e4d4" });

// 18 SCIENTISTS ARE TRYING TO MAKE ANTI-D IN A LAB... SO HIS PROMISE NEVER HAS TO END
add(B(17), TOTAL, [LAB, { d: 1, draw: (g, f) => {
  rr(g, 120, 1000, 840, 40, 8, "#8a9aa8", 5); rr(g, 160, 1040, 30, 200, 6, "#7a8a98", 4); rr(g, 890, 1040, 30, 200, 6, "#7a8a98", 4);
  const glow = smooth(ramp(f, fLab - 8, fLab + 10));
  petri(g, 330, 960, 0.9, f, glow); petri(g, 690, 960, 0.9, f + 20, glow);
  who(g, SCI, 160, 2020, 900, f, 61, { expr: "smile", facing: 1 });
  who(g, { ...SCI, hair: "#c8763a", skin: "#f5d2b0", glasses: false }, 900, 2020, 900, f, 62, { expr: f > fLab ? "grin" : "smile", facing: -1 });
  if (f > fPromise2 - 6) {
    const k = easeOut(ramp(f, fPromise2 - 6, fPromise2 + 20));
    glowAt(g, 510, 600 - 120 * k, 360, 0.5 * k);
    heart(g, 510, 640 - 180 * k, 1.8 * k, "#ffc83a");
    if (f > fEnd - 4) sparkles(g, 510, 460, 260, f, 8);
  }
} }], camKeys([{ f: B(17), c: { z: 1.0, y: 960 }, creep: 0.0015 }, { f: fPromise2, c: { z: 1.08, y: 860 }, dur: 20 }]), { bg: "#d4e2ec" });

export const story: Story = { total: TOTAL, shots, flashes: [B(1) - 4], vignette: 0.28, xfade: { 2: 8, 3: 8, 4: 6, 5: 8, 6: 8, 7: 8, 8: 10, 9: 8, 10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 16: 10, 17: 12 } };
void [confetti, light, at, fDoctors, fMothers, fBabies, fNotAll, fJames, fOne, fLuckily, fMillion, fDied, f2025, fScientists, fEighteen, fNeedle];
