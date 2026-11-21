// The cast of "Floor Zero, Part 1" as lit flat cards in the 3D world (the bridge/birthday machinery: one canvas per
// distinct drawing in a pool, yaw-only billboards shaded by cardShade(), soft multiply contact blobs, unlit effect cards
// on the NOINK layer). Two people: YOU (blue sweater, red lanyard) and the one facing the wall (tall, grey suit, only ever
// seen from behind). Who stands where, which way they face (front / side / back drawing), how they walk, reach, turn
// and react is a pure function of (shot, frame), timed to the narration through story.ts.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, Prop, fxShadow, fxContact, fxBreath } from "./toon";
import {
  FPS, SHOTS, SH, V3, cue, clamp01, smooth, span, YOU_CAB, YOU_OUT, FIGURE, LIGHTS_ON, EXIT, exitPos, figureAt, SPEAK, BREATH_OUT, CRASH,
  DING_B, TAG1_HOT, TAG2_HOT,
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
type YouState = { x: number; y: number; z: number; view: View; fo: FrontOpts & { stride?: number; push?: number }; hide?: boolean; scale?: number };
const STEP = 1.1; // metres per walk cycle (two steps)
const youAt = (id: number, f: number): YouState => {
  const [cx, , cz] = YOU_CAB, [ox, , oz] = YOU_OUT, blink = lidAt(f, 3);
  switch (id) {
    case 1: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: "fear", blink: 0 } };
    case 2: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: "fear", look: 0.6, blink } };
    case 3: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand", expr: f < cue(2, "listened") - 2 ? "nervous" : "sad", blink } };
    case 7: case 8:
      // the lights come back: the corner is yours now (back to us, facing the wall, very still)
      return { x: FIGURE[0] + 0.02, y: 0, z: FIGURE[2] - 0.02, view: "back", fo: { mode: "stand", breathe: 2 + 2 * Math.sin((f / FPS) * Math.PI * 2 / 3.4) } };
    case 11: {
      // you walk out toward the lens; the doors close behind you
      const p = exitPos(f), walking = f < EXIT[1];
      return { x: p[0], y: 0, z: p[2], view: "front", fo: { mode: walking ? "stroll" : "stand", phase: (3.12 - p[2]) / STEP, expr: walking ? "nervous" : "neutral", blink } };
    }
    case 12: return { x: ox, y: 0, z: oz, view: "back", fo: { mode: "stand" } };
    case 13: return { x: ox, y: 0, z: oz, view: "front", fo: { mode: "stand", expr: f < cue(15, "breath") - 6 ? "relief_open" : "relief", blink } };
    case 14: return { x: ox, y: 0, z: oz, view: "back", fo: { mode: "stand" }, hide: true };
    case 16: return { x: ox, y: 0, z: oz, view: "front", fo: { mode: "stand", expr: f < DING_B - 2 ? "nervous" : "shock", look: f < DING_B ? 0 : 0.9, blink: f < DING_B ? blink : 0 } };
    case 17: return { x: ox, y: 0, z: oz, view: "back", fo: { mode: "stand" }, hide: true };
    case 19: {
      const lk = f >= TAG1_HOT[0] && f < TAG1_HOT[1] ? -1 : f >= TAG2_HOT[0] && f < TAG2_HOT[1] ? 1 : 0;
      return { x: ox, y: 0, z: oz, view: "front", fo: { mode: "stand", expr: "fear", look: lk, blink } };
    }
    case 20: return { x: ox, y: 0, z: oz, view: "front", fo: { mode: "stand", expr: "fear", blink: 0 } };
    default: return { x: cx, y: 0, z: cz, view: "front", fo: { mode: "stand" }, hide: true };
  }
};

/** everything with a face (and the effect cards) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const y = youAt(id, f);
  if (!y.hide && SHOTS[id - 1]) {
    out.places.push(person(cam, "you", y.x, y.y, y.z, y.view, y.fo, y.scale ?? 1));
    blob(out, y.x, 0, y.z);
  }
  // the one facing the wall: always back to us, breathing; it barely moves its head while it speaks
  const fp = figureAt(f);
  if (fp && fp !== FIGURE && (id === 17 || id === 19 || id === 20))
    out.fx.push({ key: "dustprints", cw: 256, ch: 256, draw: (p) => fxDustPrints(p), x: FIGURE[0], y: 0.006, z: FIGURE[2], w: 0.46, h: 0.46, flat: true, rot: 0.35 });
  if (fp && id !== 20) {
    const br = 4 + 4 * Math.sin((f / FPS) * Math.PI * 2 / 3.4);
    let tilt = 0;
    for (const [a, b] of SPEAK) if (f >= a - 3 && f < b + 6) tilt = 2.5 * Math.sin(((f - a) / (b - a + 6)) * Math.PI);
    out.places.push(person(cam, "fig", fp[0], 0, fp[2], "back", { mode: "stand", breathe: br, headTilt: -tilt, ears: false }, 1.3, 0.9));
    blob(out, fp[0], 0, fp[2], 1.2, 0.9);
  }
  // you let out a breath (relief)
  if (id === 13 && f >= BREATH_OUT && f < BREATH_OUT + 36) {
    const ph = (f - BREATH_OUT) / 36;
    out.fx.push({ key: `breath${q(ph, 30)}`, cw: 300, ch: 300, draw: (p) => fxBreath(p, ph), x: YOU_OUT[0] - 0.05, y: 1.3, z: YOU_OUT[2] - 0.25, w: 0.4, h: 0.4, soft: true });
  }
  return out;
};
export { span, FPS };
export const _unused = { fxShadow, Expr: null as unknown as Expr, SH, smooth, clamp01, LIGHTS_ON, CRASH, Prop: null as unknown as Prop };
