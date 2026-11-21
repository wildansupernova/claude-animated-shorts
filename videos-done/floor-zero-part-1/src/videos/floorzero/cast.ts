// The cast of "Floor Zero, Part 1" as lit flat cards in the 3D world (the bridge/birthday machinery: one canvas per
// distinct drawing in a pool, yaw-only billboards shaded by cardShade(), soft multiply contact blobs, unlit effect cards
// on the NOINK layer). Two people: YOU (blue sweater, red lanyard) and the one facing the wall (tall, grey suit, only ever
// seen from behind). Who stands where, which way they face (front / side / back drawing), how they walk, reach, turn
// and react is a pure function of (shot, frame), timed to the narration through story.ts.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, Prop, fxShadow, fxContact, fxHand, fxRinging, fxBreath } from "./toon";
import {
  FPS, SHOTS, SH, V3, cue, clamp01, smooth, span, walkX, MY_CHAIR, YOU_CAB, FIGURE, FIGURE_FROM, RISE, WALK, walkZ, CALL_PRESS,
  ENTER, TURN1, PRESS_G, PUMPS, BELL, RINGS, JOLT, TURN2, TURN3, BREATH, PANEL, PANEL_ROW_Y, BTN_ROW,
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
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; top?: boolean; tint?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; fwd: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

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
export const YOU_O: Outfit = { jacket: "#4f7cc4", pants: "#2f3550", boots: "#2a2a30", skin: "#f5c9a0", hat: "hair", hair: "#3b2a22", buttons: "none", lanyard: "#d23a2e" };
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

// ---------------- ground shadows ----------------
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 0.75) => {
  const c = "#" + [0.32, 0.33, 0.4].map((v) => Math.round(255 * (1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
  out.fx.push({ key: `blob|contact|${c}`, cw: 128, ch: 128, draw: (p) => fxContact(p, c), x, y: y + 0.012, z, w: 0.62 * sc, h: 0.46 * sc, flat: true, rot: 0 });
};

// ---------------- YOU: where, which way, what pose ----------------
type YouState = { x: number; y: number; z: number; view: View; fo: FrontOpts & { stride?: number; push?: number }; hide?: boolean };
const STEP = 1.1; // metres per walk cycle (two steps)
const say = (f: number, a: number, b: number) => f >= a && f < b;
/** the turn from facing the doors (front, toward the lens in front) to facing the mirror (back) passes through a profile */
const turn = (f: number, f0: number, from: View, to: View, mid: View): View => (f < f0 ? from : f < f0 + 3 ? mid : to);
const youAt = (id: number, f: number): YouState => {
  const [cx, , cz] = YOU_CAB, blink = lidAt(f, 3);
  switch (id) {
    case 1: {
      // seated at your desk, then you stand up (the chair rolls back in world.ts)
      const up = smooth((f - RISE) / 8);
      if (f < RISE) return { x: MY_CHAIR[0], y: 0.36, z: MY_CHAIR[2] - 0.08, view: "front", fo: { mode: "sit", expr: "tired", blink, look: 0.4 } };
      return { x: MY_CHAIR[0], y: -0.06 * (1 - up), z: MY_CHAIR[2] + 0.05 * up, view: "front", fo: { mode: "stand", expr: "tired", blink, look: -0.6 } };
    }
    case 3: case 4: {
      const z = walkZ(f), walking = f < WALK[1];
      const x = walkX(z);
      if (id === 3) {
        const glance = say(f, cue(3, "One") - 4, cue(3, "time") + 6);
        return { x, y: 0, z, view: "front", fo: { mode: "stroll", phase: (z - -2.3) / STEP, expr: glance ? "nervous" : "tired", look: glance ? -1 : 0, blink } };
      }
      // from behind: you walk up to the doors and reach for the call button (screen right)
      const reach = f >= CALL_PRESS - 5 && f < CALL_PRESS + 12;
      if (walking) return { x, y: 0, z, view: "back", fo: { mode: "stroll", phase: (z - -2.3) / STEP } };
      return { x, y: 0, z, view: "back", fo: { mode: "stand", reach: reach ? 1 : 0 } };
    }
    case 5: {
      // step into the car toward the lens, turn to face the doors (back to the lens), press G (reach screen right)
      const u = clamp01((f - ENTER[0]) / (ENTER[1] - ENTER[0])), x = -0.35 + (cx + 0.35) * u, z = 1.72 + (cz - 1.72) * smooth(u);
      if (f < TURN1) return { x, y: 0, z, view: "front", fo: { mode: f < ENTER[1] ? "stroll" : "stand", phase: (z - 1.72) / STEP, expr: "tired", blink } };
      const reach = smooth((f - (PRESS_G - 7)) / 7) * (1 - smooth((f - (PRESS_G + 9)) / 8));
      return { x: cx, y: 0, z: cz, view: turn(f, TURN1, "front", "back", "sideR"), fo: { mode: "stand", reach: reach > 0.5 ? 1 : 0, expr: "tired", blink } };
    }
    case 6: return { x: cx, y: 0, z: cz, view: "back", fo: { mode: "stand", expr: "neutral" } };
    case 7: return { x: cx, y: 0, z: cz, view: "back", fo: { mode: "stand", expr: "neutral" } };
    case 8: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: f < cue(10, "going") - 2 ? "nervous" : "fear", look: 0, blink } };
    case 12: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: "sad", prop: "phone" as Prop, look: 0.6, blink } };
    case 14: {
      // the jolt: you stagger (a dip and a lean), then freeze
      const dip = f >= JOLT ? Math.exp(-(f - JOLT) / 5) * Math.sin(((f - JOLT) / 5) * Math.PI) : 0;
      return { x: cx, y: -0.07 * dip, z: cz, view: "sideR", fo: { expr: f < JOLT ? "nervous" : "fear", blink } };
    }
    case 15: return { x: cx, y: 0, z: cz, view: turn(f, TURN2, "front", "back", "sideL"), fo: { mode: "stand", expr: "nervous", blink } };
    case 17: {
      const laugh = say(f, cue(25, "laugh") - 4, cue(25, "probably") + 4);
      return { x: cx, y: 0, z: cz, view: turn(f, TURN3, "back", "front", "sideR"), fo: { mode: "stand", expr: laugh ? "laugh" : "smile", blink, headTilt: laugh ? 6 * Math.sin(f * 0.9) : 0 } };
    }
    case 18: return { x: cx, y: 0, z: cz, view: "back", fo: { mode: "stand" } };
    case 23: {
      const s = say(f, cue(34, "Right") - 3, 99999);
      return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: f < cue(33, "Breathing") ? "nervous" : s ? "fear" : "shock", look: f < cue(33, "Breathing") ? 0 : 0.9, blink: s ? 0 : blink } };
    }
    case 24: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand" }, hide: true };
    case 25: case 26: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: "fear", look: id === 26 && f >= cue(40, "Or") ? 1 : 0, blink } };
    case 27: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: "fear", look: 0, blink: 0 } };
    default: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand" }, hide: true };
  }
};

/** where the press lands: a panel button in world space */
const panelBtn = (row: number, k: number, n: number): V3 => [PANEL.x + (n === 1 ? 0 : k === 0 ? -0.2 : 0.2) * PANEL.w, PANEL_ROW_Y(row), PANEL.z];
/** a pointing hand card whose fingertip lands on `tip` (pressed = 1 touches it) */
const hand = (out: Stage, cam: CamInfo, tip: V3, pressed: number, w = 0.2) => {
  const h = w * (360 / 640), back = 0.04 * (1 - pressed), side = 0.025 * (1 - pressed);
  const t = new THREE.Vector3(...tip).addScaledVector(cam.fwd, -back).addScaledVector(cam.right, -side).addScaledVector(cam.up, -0.01 * (1 - pressed));
  const rot = -0.32; // the hand comes up from lower-left
  const ox = -(280 / 640) * w, oy = (12 / 360) * h, c = Math.cos(rot), s = Math.sin(rot);
  const dx = ox * c - oy * s, dy = ox * s + oy * c;
  const p = t.clone().addScaledVector(cam.right, dx).addScaledVector(cam.up, dy);
  out.fx.push({ key: "hand", cw: 640, ch: 360, draw: (pp) => fxHand(pp, YOU_O.jacket), x: p.x, y: p.y, z: p.z, w, h, rot, tint: 1, top: true });
};
const pulse = (f: number, at: number[], n = 7) => { let k = 0; for (const a of at) k = Math.max(k, f >= a - n / 2 && f < a + n ? Math.sin(clamp01((f - (a - n / 2)) / (1.5 * n)) * Math.PI) : 0); return k; };

/** everything with a face (and the effect cards) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const y = youAt(id, f);
  if (!y.hide && SHOTS[id - 1]) {
    out.places.push(person(cam, "you", y.x, y.y, y.z, y.view, y.fo));
    if (y.y > -0.01 || id === 14) blob(out, y.x, 0, y.z);
  }
  // the one facing the wall: from shot 23 on, always back to us, breathing slowly; the head twitches once on "wall"
  if (f >= FIGURE_FROM && id >= 23 && id !== 27) {
    const br = 4 + 4 * Math.sin((f / FPS) * Math.PI * 2 / 3.4);
    const tw = f >= cue(36, "wall") - 2 ? 4 * smooth((f - (cue(36, "wall") - 2)) / 5) : 0;
    out.places.push(person(cam, "fig", FIGURE[0], 0, FIGURE[2], "back", { mode: "stand", breathe: br, headTilt: -tw, ears: false }, 1.3, 0.9));
    blob(out, FIGURE[0], 0, FIGURE[2], 1.2, 0.9);
    // cold breath at the figure's head in the dim corner
    if (id === 24 || id === 23) {
      const ph = ((f - BREATH[0]) / 40) % 1;
      if (f >= BREATH[0] && ph < 0.9) out.fx.push({ key: `breath${q(ph, 30)}`, cw: 300, ch: 300, draw: (p) => fxBreath(p, ph), x: FIGURE[0] + 0.12, y: 2.05, z: FIGURE[2] + 0.15, w: 0.36, h: 0.36, soft: true });
    }
  }
  // close-ups on the panel: a hand presses G (three stabs), then the bell
  if (id === 9) hand(out, cam, panelBtn(BTN_ROW.G, 0, 1), pulse(f, PUMPS, 7), 0.3);
  if (id === 11) {
    hand(out, cam, panelBtn(BTN_ROW.bell, 1, 2), f < BELL ? smooth((f - (SH[11].a + 4)) / 8) * 0.6 : 1, 0.3);
    for (const r of [BELL, ...RINGS]) {
      const t = (f - r) / FPS;
      if (t < 0 || t > 1.4) continue;
      const b = panelBtn(BTN_ROW.bell, 1, 2);
      out.fx.push({ key: `ring${q(t, 30)}`, cw: 600, ch: 300, draw: (p) => fxRinging(p, t), x: b[0], y: b[1], z: b[2] + 0.01, w: 0.24, h: 0.12, soft: true, top: true });
    }
  }
  return out;
};
export { span, FPS };
export const _unused = { fxShadow, Expr: null as unknown as Expr, SH };
