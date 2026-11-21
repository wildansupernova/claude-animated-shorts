// The cast of "Floor Zero, Part 4" as lit flat cards in the 3D world (the bridge/birthday machinery: one canvas per
// distinct drawing in a pool, yaw-only billboards shaded by cardShade(), soft multiply contact blobs, unlit effect cards
// on the NOINK layer). Two people: YOU (blue sweater, red lanyard) and the one facing the wall (tall, grey suit, only ever
// seen from behind). Who stands where, which way they face (front / side / back drawing), how they walk, reach, turn
// and react is a pure function of (shot, frame), timed to the narration through story.ts.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, Prop, fxShadow, fxContact, fxBreath } from "./toon";
import {
  FPS, SHOTS, SH, V3, cue, clamp01, smooth, span, YOU_OUT, FIGURE, TAG1_HOT, TAG2_HOT, YOU_M1, HALE_AT, floorAt, STAIR, WATER,
  wadePos, climbPos, STEP1, STEP2, PULL, HOPS, HOPS2, BADGE_DROP, BADGE_AT, KNEEL, REACH, GRAB, TEAR, DESKS, DX, YOU_M3, RAISE,
  WADE1, WADE2, YOURS, T0, stairWalk, STAIR_WALK,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    while (this.free.length > 24) { const e = this.free.shift()!; e.tex.dispose(); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  userTop = false;
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide, fog: false });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 2; }
  }
}

// ---------------- placements ----------------
/** light: multiplier on the pool light at the card (the figure stands in the dim corner) */
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number]; light?: number; who: "you" | "fig" };
/** two dusty shoe prints (where it used to stand), lighter than the steel floor */
const fxDustPrints = (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 256, 256);
  const sole = (cx: number, cy: number) => {
    for (let i = 0; i < 90; i++) {
      const a = Math.sin(i * 12.9898 + cx) * 43758.5453, r = a - Math.floor(a), b = Math.sin(i * 78.233 + cy) * 12345.678, q = b - Math.floor(b);
      const x = cx + (r - 0.5) * 46, y = cy + (q - 0.5) * 120;
      if (((x - cx) / 23) ** 2 + ((y - cy) / 60) ** 2 > 1) continue;
      g.fillStyle = `rgba(214,214,206,${(0.18 + 0.22 * r).toFixed(3)})`; g.beginPath(); g.arc(x, y, 3 + 5 * q, 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(225,225,218,0.55)"; g.lineWidth = 5; g.beginPath(); g.ellipse(cx, cy, 24, 62, 0, 0, 7); g.stroke();
  };
  sole(92, 128); sole(164, 120);
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; top?: boolean; tint?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; fwd: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; ghosts: Place[] };

export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 1.6 ? [1500, 2500, 2.5] : d < 3.2 ? [1200, 2000, 2.0] : d < 6.5 ? [810, 1350, 1.35] : d < 15 ? [396, 660, 0.66] : [198, 330, 0.33];
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- life: blinks ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 600; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(30 + 60 * hh(i * 31 + n, 13));
  }
  return 0;
};

// ---------------- outfits ----------------
export const YOU_O: Outfit = { jacket: "#4f7cc4", pants: "#2f3550", boots: "#2a2a30", skin: "#f5c9a0", hat: "hair", hair: "#3b2a22", buttons: "none", lanyard: "#d23a2e", badge: "YOU" };
export const FIG_O: Outfit = { jacket: "#727986", pants: "#3a3d45", boots: "#141518", skin: "#d9d2ca", hat: "hair", hair: "#121216", buttons: "none", build: "tall", collar: "#ece9e2" };

// ---------------- light direction on the cards (canvas angle the light comes FROM) ----------------
const LIGHT_DIR = -Math.PI / 2 - 0.35; // from above, a little camera-left: the ceiling panels

/** a camera-facing card for one drawing; `view` picks the drawing (front / side-right / side-left / back) */
type View = "front" | "back" | "sideR" | "sideL";
const person = (cam: CamInfo, who: "you" | "fig", x: number, y: number, z: number, view: View, fo: FrontOpts & { stride?: number; push?: number }, scale = 1, light = 1): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 1.1 * scale, z)) / Math.max(0.05, scale);
  const [w, h, k] = tier(d);
  const o = who === "you" ? YOU_O : FIG_O, seed = who === "you" ? 3 : 6;
  if (view === "sideR" || view === "sideL") {
    const so = { expr: fo.expr, mode: (fo.push !== undefined ? "push" : fo.phase !== undefined ? "march" : "stand") as "push" | "march" | "stand", phase: fo.phase, pose: fo.push ?? 0,
      stride: fo.stride ?? 0.7, stomp: 0.45, blink: fo.blink, light: view === "sideL" ? Math.PI - LIGHT_DIR : LIGHT_DIR, seed };
    return { key: `S|${who}|${fkey(so)}`, x, y, z, scale, mirror: view === "sideL", draw: (p) => bodySide(p, o, so), size: [w, h, k], light, who };
  }
  const f2: FrontOpts = { ...fo, light: LIGHT_DIR, seed, back: view === "back", blink: view === "back" ? 0 : fo.blink };
  return { key: `F|${who}|${fkey(f2)}`, x, y, z, scale, draw: (p) => bodyFront(p, o, f2), size: [w, h, k], light, who };
};

/** a front/back card with an explicit outfit (the one facing the wall changes as it learns you) */
const personO = (cam: CamInfo, who: "you" | "fig", o: Outfit, x: number, y: number, z: number, fo: FrontOpts, scale = 1, light = 1): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 1.1 * scale, z)) / Math.max(0.05, scale);
  const [w, h, k] = tier(d);
  const f2: FrontOpts = { ...fo, light: LIGHT_DIR, seed: who === "you" ? 3 : 6, blink: fo.back ? 0 : fo.blink };
  return { key: `F|${who}|${o.lanyard ?? ""}|${o.build ?? ""}|${fkey(f2)}`, x, y, z, scale, draw: (p) => bodyFront(p, o, f2), size: [w, h, k], light, who };
};

// ---------------- ground shadows ----------------
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 0.75) => {
  const c = "#" + [0.32, 0.33, 0.4].map((v) => Math.round(255 * (1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
  out.fx.push({ key: `blob|contact|${c}`, cw: 128, ch: 128, draw: (p) => fxContact(p, c), x, y: y + 0.012, z, w: 0.62 * sc, h: 0.46 * sc, flat: true, rot: 0 });
};

// ---------------- effect drawings (Part 4) ----------------
/** an ID badge face-up on the water */
const badgeFx = (name: string, line: string) => (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 320, 220);
  g.fillStyle = "#e9e5da"; g.strokeStyle = "#1d1b22"; g.lineWidth = 8; g.beginPath(); g.roundRect(14, 14, 292, 192, 18); g.fill(); g.stroke();
  g.fillStyle = "#8d9db8"; g.fillRect(36, 40, 92, 118);
  g.fillStyle = "#3a3d45"; g.beginPath(); g.arc(82, 82, 26, 0, 7); g.fill(); g.fillRect(52, 112, 60, 46);
  g.fillStyle = "#1d1b22"; g.font = "900 44px Montserrat, sans-serif"; g.textBaseline = "middle"; g.fillText(name, 140, 78, 152);
  g.font = "800 22px Montserrat, sans-serif"; g.fillStyle = "#6a6458"; g.fillText(line, 142, 124, 150);
  g.fillStyle = "#c8362c"; g.fillRect(14, 180, 292, 14);
};
const fxHaleBadge = badgeFx("D. HALE", "NIGHT SHIFT");
const fxMyBadge = badgeFx("YOU", "NIGHT SHIFT");
/** a pale, wet hand and forearm reaching straight up out of the water (fingers open, or closed in a grip) */
const fxRisingHand = (grip: boolean) => (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 200, 420);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = "#141518"; g.fillStyle = "#aeb8bd"; g.lineWidth = 9;
  g.beginPath(); g.roundRect(70, 170, 60, 260, 24); g.fill(); g.stroke(); // forearm
  g.beginPath(); g.ellipse(100, 150, 46, 52, 0, 0, 7); g.fill(); g.stroke(); // palm
  if (grip) { g.beginPath(); g.ellipse(100, 108, 44, 26, 0, 0, 7); g.fill(); g.stroke(); }
  else for (let i = 0; i < 4; i++) { const x = 66 + i * 23; g.beginPath(); g.roundRect(x - 10, 34 + (i === 1 || i === 2 ? 0 : 14), 20, 92, 10); g.fill(); g.stroke(); }
  g.beginPath(); g.roundRect(18, 120, 22, 70, 11); g.fill(); g.stroke(); // thumb
  g.strokeStyle = "rgba(220,240,245,0.55)"; g.lineWidth = 5; g.beginPath(); g.moveTo(84, 260); g.lineTo(84, 400); g.stroke(); // wet sheen
};
/** seen from above: your arm (blue sleeve, skin hand) reaching from the desk towards the water; `grab` adds the pale
 *  hand closing on the wrist from below */
const fxReach = (grab: boolean) => (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 600, 260);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = "#141518"; g.lineWidth = 10;
  g.fillStyle = "#4f7cc4"; g.beginPath(); g.roundRect(300, 92, 300, 76, 30); g.fill(); g.stroke(); // sleeve from the right edge
  g.fillStyle = "#f5c9a0"; g.beginPath(); g.roundRect(196, 104, 130, 52, 24); g.fill(); g.stroke(); // wrist + forearm
  g.beginPath(); g.ellipse(160, 130, 52, 44, 0, 0, 7); g.fill(); g.stroke(); // hand
  for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(70, 94 + i * 20, 70, 17, 8); g.fill(); g.stroke(); } // fingers
  if (grab) {
    g.fillStyle = "#aeb8bd";
    g.beginPath(); g.roundRect(222, 150, 66, 110, 26); g.fill(); g.stroke(); // its forearm, up out of the water
    for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(222 + i * 17, 74, 16, 92, 8); g.fill(); g.stroke(); } // its fingers around your wrist
    g.beginPath(); g.ellipse(255, 170, 40, 26, 0, 0, 7); g.fill(); g.stroke();
  }
};
/** your reflection, still where you first stepped, looking up at you out of the black water and smiling (seen from
 *  straight above): head and shoulders, tinted by the water, edges dissolving */
const fxReflFace = (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 512, 512);
  g.save(); g.translate(256, 300); g.scale(1.25, 1.25); g.translate(-300, -330);
  bodyFront(new Pen(g), YOU_O, { mode: "stand", expr: "smile", headTilt: -6, blink: 0, seed: 3, light: LIGHT_DIR });
  g.restore();
  g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(8,48,58,0.42)"; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = "destination-in";
  const m = g.createRadialGradient(256, 250, 120, 256, 250, 250);
  m.addColorStop(0, "rgba(0,0,0,0.92)"); m.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = m; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = "source-over";
};
/** rings on the water where something broke the surface */
const fxRipple = (k: number) => (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 3; i++) {
    const r = 30 + 90 * ((k + i * 0.33) % 1), a = 0.22 * (1 - ((k + i * 0.33) % 1));
    g.strokeStyle = `rgba(200,235,240,${a.toFixed(3)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(128, 128, r, r, 0, 0, 7); g.stroke();
  }
};
/** a burst of spray */
const fxSplash = (p: Pen) => {
  const g = p.g; g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * (0.1 + 0.8 * hh(i, 4)), r = 40 + 80 * hh(i, 5);
    g.fillStyle = `rgba(215,240,245,${(0.3 + 0.3 * hh(i, 6)).toFixed(3)})`; g.beginPath(); g.arc(128 + Math.cos(a) * r, 200 + Math.sin(a) * r, 2 + 4 * hh(i, 7), 0, 7); g.fill();
  }
};

// ---------------- YOU: where, which way, what pose ----------------
type YouState = { x: number; y: number; z: number; view: View; fo: FrontOpts & { stride?: number; push?: number }; hide?: boolean; scale?: number };
const STEP = 1.1; // metres per walk cycle (two steps)
const inHop = (f: number, hops: [number, number][]) => hops.some(([a, b]) => f >= a && f < b);
const youAt = (id: number, f: number): YouState => {
  const [mx, , mz] = YOU_M1, [tx, , tz] = YOU_M3, blink = lidAt(f, 3);
  const cp = climbPos(f);
  switch (id) {
    case 1: return { x: mx, y: 0, z: mz, view: "back", fo: { mode: "stand" } };
    case 2: {
      const p = wadePos(f), moving = (f >= STEP1[0] && f < STEP1[1]) || (f >= STEP2[0] && f < STEP2[1]);
      return { x: p[0], y: 0, z: p[2], view: "sideR", fo: { expr: f >= STEP2[1] ? "fear" : "nervous", phase: moving ? -(p[2] - mz) / STEP : undefined, stride: 0.6, blink } };
    }
    case 3: { const [x, , z] = WADE2; return { x, y: 0, z, view: "back", fo: { mode: "stand" }, hide: true }; }
    case 4: {
      const [x, , z] = WADE2, d = f >= PULL ? smooth((f - PULL) / 7) : 0;
      return { x, y: -2.3 * d, z, view: "front", fo: { mode: f >= PULL ? "fall" : "stand", expr: f >= PULL - 8 ? "shock" : "fear", blink: 0 } };
    }
    case 6:
      if (f < HOPS[0][1]) return { x: cp[0], y: cp[1], z: cp[2], view: "back", fo: { mode: f >= HOPS[0][0] ? "stroll" : "stand", phase: (cp[0] - mx) / STEP } };
      return { x: cp[0], y: cp[1], z: cp[2], view: "sideL", fo: { expr: "nervous", phase: inHop(f, HOPS) ? -(cp[2] - mz) / STEP : undefined, stride: 0.9, blink } };
    case 7: { const [x, y, z] = DESKS[1]; return { x, y, z, view: "back", fo: { mode: "stand" } }; }
    case 8: { const [x, y, z] = DESKS[1]; return { x: x - 0.15, y, z, view: "front", fo: { mode: f >= KNEEL ? "sit" : "stand", expr: "nervous", look: -1, blink } }; }
    case 10: {
      const [x, y, z] = DESKS[1], k = f >= TEAR ? smooth((f - TEAR) / 6) : 0;
      return { x: x + 0.12 * k, y, z, view: "front", fo: { mode: f < TEAR ? "sit" : "stand", expr: f < TEAR + 10 ? "shock" : "fear", blink: 0, tilt: f >= TEAR && f < TEAR + 8 ? 8 : 0 } };
    }
    case 11: return { x: cp[0], y: cp[1], z: cp[2], view: "front", fo: { mode: inHop(f, HOPS2) ? "march" : "stand", phase: -(cp[2] - mz) / STEP, expr: "fear", blink } };
    case 12: { const p = stairWalk(f), moving = f < STAIR_WALK[1]; return { x: p[0], y: p[1], z: p[2], view: "back", fo: { mode: moving ? "stroll" : "stand", phase: p[2] / STEP } }; }
    case 13: return { x: tx, y: 0, z: tz, view: "back", fo: { mode: "stand" } };
    case 16: {
      const r = f >= RAISE[0] ? Math.min(1, (f - RAISE[0]) / 8) : 0;
      return { x: tx, y: 0, z: tz, view: "back", fo: { mode: "stand", raise: r > 0 ? r : undefined } };
    }
    case 18: return f >= YOURS ? { x: tx, y: 0, z: tz, view: "front", fo: { mode: "stand", expr: "fear", blink: 0, breathe: 3 + 3 * Math.sin((f / FPS) * 5) } } : { x: tx, y: 0, z: tz, view: "front", fo: { mode: "stand" }, hide: true };
    case 19: return { x: tx, y: 0, z: tz, view: "back", fo: { mode: "stand", breathe: 2 + 2 * Math.sin((f / FPS) * Math.PI * 2 / 2.2) } };
    case 20: {
      const lk = f >= TAG1_HOT[0] && f < TAG1_HOT[1] ? -1 : f >= TAG2_HOT[0] && f < TAG2_HOT[1] ? 1 : 0;
      return { x: tx, y: 0, z: tz, view: "front", fo: { mode: "stand", expr: "fear", look: lk, blink } };
    }
    default: return { x: YOU_OUT[0], y: 0, z: YOU_OUT[2], view: "front", fo: { mode: "stand" }, hide: true };
  }
};

/** everything with a face (and the effect cards) in shot `id` at frame f; `ghosts` exist only in the water */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], ghosts: [] };
  const y = youAt(id, f);
  if (!y.hide) {
    out.places.push(person(cam, "you", y.x, y.y, y.z, y.view, y.fo, y.scale ?? 1));
    if (y.y > -0.05 && y.y < 0.05) blob(out, y.x, 0, y.z);
  }
  if (floorAt(f) !== -1) return out;
  // ---- -1: D. Hale's badge still floating; your reflection ----
  out.fx.push({ key: "hale", cw: 320, ch: 220, draw: fxHaleBadge, x: HALE_AT[0], y: HALE_AT[1], z: HALE_AT[2], w: 0.24, h: 0.165, flat: true, rot: 0.5, tint: 1 });
  const wade = id >= 2 && id <= 4;
  if (wade) {
    // it took the first step with you, then stopped: from the second step on it stays at the first, looking up at you
    const stay = f >= STEP2[0];
    const p = stay ? WADE1 : wadePos(f);
    if (id === 3) {
      // straight down at the water where it stayed: its face, looking up at you
      out.fx.push({ key: "reflface", cw: 512, ch: 512, draw: fxReflFace, x: WADE1[0], y: WATER.y + 0.004, z: WADE1[2] - 0.27, w: 0.52, h: 0.52, flat: true, rot: 0, soft: true });
      const k = ((f - T0(3)) / 50) % 1;
      out.fx.push({ key: `rip|${Math.round(k * 12)}`, cw: 256, ch: 256, draw: fxRipple(k), x: WADE1[0], y: WATER.y + 0.008, z: WADE1[2] - 0.27, w: 0.9, h: 0.9, flat: true, soft: true });
      return out;
    }
    const fo = id === 3 ? { mode: "stand" as const, expr: "smile" as Expr, headTilt: -8, blink: 0 } : stay ? { mode: "stand" as const, expr: "neutral" as Expr, blink: 0 } : y.fo;
    const view: View = id === 3 || stay ? "front" : y.view;
    out.ghosts.push(person(cam, "you", p[0], 0, p[2], view, fo));
    if (id === 2 && f >= STEP1[0]) out.fx.push({ key: `rip|${Math.round(((f - STEP1[0]) / 40) % 1 * 12)}`, cw: 256, ch: 256, draw: fxRipple(((f - STEP1[0]) / 40) % 1), x: wadePos(f)[0], y: WATER.y + 0.006, z: wadePos(f)[2], w: 0.9, h: 0.9, flat: true, soft: true });
    if (id === 4) {
      // a pale hand comes up out of the water at your ankle, and pulls
      const [x, , z] = WADE2, a = PULL - 16;
      if (f >= a && f < PULL + 6) {
        const u = smooth((f - a) / 14);
        out.fx.push({ key: f >= PULL - 3 ? "rise|grip" : "rise|open", cw: 200, ch: 420, draw: fxRisingHand(f >= PULL - 3), x: x - 0.12, y: WATER.y - 0.2 + 0.42 * u - (f >= PULL ? 0.5 * smooth((f - PULL) / 5) : 0), z: z + 0.05, w: 0.16, h: 0.34, tint: 1 });
      }
      if (f >= PULL) {
        out.fx.push({ key: "splash", cw: 256, ch: 256, draw: fxSplash, x, y: WATER.y + 0.25, z: z + 0.05, w: 0.9 * (1 + 0.4 * smooth((f - PULL) / 10)), h: 0.9, soft: true });
        const k = ((f - PULL) / 36) % 1;
        out.fx.push({ key: `rip|${Math.round(k * 12)}`, cw: 256, ch: 256, draw: fxRipple(k), x, y: WATER.y + 0.006, z, w: 1.4, h: 1.4, flat: true, soft: true });
      }
    }
    return out;
  }
  // climbing: your reflection is just your reflection (until it isn't)
  if (!y.hide && id !== 9) out.ghosts.push(person(cam, "you", y.x, y.y, y.z, y.view, y.fo, y.scale ?? 1));
  // your badge: it slips off the desk edge into the water, and floats face-up
  if (id >= 6 && id <= 10 && f >= BADGE_DROP && f < TEAR) {
    const u = clamp01((f - BADGE_DROP) / 12), [bx, by, bz] = BADGE_AT;
    const x0 = DX - 0.18, y0 = 1.02, z0 = DESKS[1][2] + 0.18;
    const fall = u < 1;
    out.fx.push({ key: "mybadge", cw: 320, ch: 220, draw: fxMyBadge, x: x0 + (bx - x0) * u, y: fall ? y0 + (by - y0) * u * u : by + 0.004 * Math.sin(f * 0.2), z: z0 + (bz - z0) * u, w: 0.2, h: 0.14, flat: true, rot: fall ? 0.5 + 3 * u : 0.42, tint: 1 });
    if (!fall) {
      const k = ((f - BADGE_DROP - 12) / 40) % 1;
      out.fx.push({ key: `rip|${Math.round(k * 12)}`, cw: 256, ch: 256, draw: fxRipple(k), x: bx, y: WATER.y + 0.006, z: bz, w: 0.8, h: 0.8, flat: true, soft: true });
    }
  }
  // the reach, from above: your arm to the badge; at the grab, the pale hand closes on your wrist
  if (id === 9 && f >= REACH) {
    const u = smooth((f - REACH) / 10), [bx, by, bz] = BADGE_AT;
    out.fx.push({ key: f >= GRAB ? "reach|grab" : "reach", cw: 600, ch: 260, draw: fxReach(f >= GRAB), x: bx + 0.18 + 0.2 * (1 - u), y: by + 0.05, z: bz + 0.01, w: 0.5, h: 0.217, flat: true, rot: 0, tint: 1 });
  }
  if (id === 10 && f >= TEAR && f < TEAR + 14) out.fx.push({ key: "splash", cw: 256, ch: 256, draw: fxSplash, x: BADGE_AT[0], y: WATER.y + 0.25, z: BADGE_AT[2], w: 0.8, h: 0.8, soft: true });
  return out;
};
export { span, FPS };
export const _unused = { fxDustPrints, fxShadow, fxBreath, fxContact, Expr: null as unknown as Expr, SH, smooth, clamp01, cue, FIGURE, SHOTS, Prop: null as unknown as Prop, T0, KNEEL, STAIR };
