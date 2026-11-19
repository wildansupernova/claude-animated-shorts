// The cast of the camera-lab short as lit flat cards in the 3D world (same machinery as the bridge and birthday shorts:
// one canvas per distinct drawing in a pool, yaw-only billboards shaded by cardShade(), soft multiply contact blobs,
// unlit effect cards on the NOINK layer). What the kid does is a pure function of the STORY frame.
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, KID as KID_OUTFIT, fxBurst, fxContact, fxSparkle, fxStars } from "./toon";
import { V3, clamp01, EV, B, KID, GKID, FLOOR_HIT, GHIT, toastAt } from "./timeline";
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
    // cap the spare canvases so a crowd shot does not keep hundreds of big canvases alive
    while (this.free.length > 64) { const e = this.free.shift()!; e.tex.dispose(); }
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
const ROOTS = new Set<THREE.Object3D>();

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
    ROOTS.add(parent);
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
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; top?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** drawing resolution by distance (sized for a 1080 x 1920 final): [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 2.2 ? [1350, 2250, 2.25] : d < 5 ? [810, 1350, 1.35] : d < 12 ? [396, 660, 0.66] : [198, 330, 0.33];

/** key-light angle on the card canvas from the world sun and the camera's right axis (eighth-turn steps) */
const light2D = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.6, 0.7, 0.4).normalize();
  const sx = sun.dot(cam.right), sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => {
  const fr = Math.round(f);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= fr && n < 600; n++) {
    const k = fr - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

const KID_O: Outfit = { ...KID_OUTFIT, jacket: "#3f8fd4", cap: "#e2453c", pants: "#2f3550", boots: "#f4f1ea" };
const person = (cam: CamInfo, i: number, x: number, y: number, z: number, fo: FrontOpts): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 0.9, z));
  const [w, h, k] = tier(d);
  const f2: FrontOpts = { ...fo, mode: "stand", light: light2D(cam), seed: 3, blink: d < 12 ? fo.blink : 0 };
  return { key: `F|kid${i}|${fkey(f2)}`, x, y, z, draw: (p) => bodyFront(p, KID_O, f2), size: [w, h, k] };
};
const contact = (out: Stage, x: number, y: number, z: number, sc = 1) =>
  out.fx.push({ key: "blob|contact|#5b5a7a", cw: 128, ch: 128, draw: (p) => fxContact(p, "#8c8bb0"), x, y: y + 0.006, z, w: 0.5 * sc, h: 0.36 * sc, flat: true });

/** screen side (-1 left, +1 right) of a world point relative to another, for eye direction */
const sideOf = (cam: CamInfo, from: V3, to: V3) => {
  const dx = (to[0] - from[0]) * cam.right.x + (to[2] - from[2]) * cam.right.z;
  return Math.abs(dx) < 0.05 ? 0 : dx > 0 ? 1 : -1;
};
/** butter splat on an 800 x 400 canvas, t 0..1 */
const fxButter = (p: Pen, t: number) => {
  const e = 1 - (1 - clamp01(t)) ** 3;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3, d = 90 + 250 * e * (0.7 + 0.3 * hh(i, 4)), r = (34 - 18 * e) * (0.7 + 0.5 * hh(i, 5));
    p.ell(400 + d * Math.cos(a), 220 + 0.45 * d * Math.sin(a), r, r * 0.7, "#ffd84a", 6);
  }
};

/** the kid(s) and the effect cards at story frame s */
export const stage = (s: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const toast = toastAt(s).p;
  if (s < B.giant + 2) {
    // ---- kitchen: behind the table ----
    let expr: Expr = "grin", look = 0, reach = 0;
    if (s >= EV.down - 2 && s < EV.luck - 4) expr = "nervous";
    else if (s >= EV.luck - 4 && s < B.table) expr = "smile_closed";
    else if (s >= B.table && s < EV.nudge) { expr = "neutral"; look = sideOf(cam, KID, toast); }
    else if (s >= EV.nudge && s < EV.fall0) { expr = s < EV.slide1 ? "smile" : "nervous"; look = sideOf(cam, KID, toast); reach = s < EV.slide1 + 4 ? sideOf(cam, KID, toast) || 1 : 0; }
    else if (s >= EV.fall0 && s < EV.splat - 1) { expr = "shock"; look = sideOf(cam, KID, toast); }
    else if (s >= EV.splat - 1) { expr = s < EV.splat + 10 ? "shock" : "sad"; look = sideOf(cam, KID, FLOOR_HIT); }
    out.places.push(person(cam, 1, KID[0], KID[1], KID[2], { expr, look, reach, blink: expr === "shock" ? 0 : lidAt(s, 1) }));
    contact(out, KID[0], 0, KID[2]);
    // splat: butter burst + stars on the floor
    if (s >= EV.splat && s < EV.splat + 16) {
      const t = (s - EV.splat) / 16;
      out.fx.push({ key: `butter|${q(t, 30)}`, cw: 800, ch: 400, draw: (p) => fxButter(p, t), x: FLOOR_HIT[0], y: 0.07, z: FLOOR_HIT[2] + 0.06, w: 0.62, h: 0.31 });
      out.fx.push({ key: `burst|${q(t, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, t, "#fff3b0", 10, 40, 230), x: FLOOR_HIT[0], y: 0.12, z: FLOOR_HIT[2] + 0.04, w: 0.5, h: 0.5 });
    }
  }
  if (s >= B.giant - 40) {
    // ---- garden: the kid on top of the 3 m table ----
    const landed = s >= EV.gland;
    const expr: Expr = landed ? "laugh" : s >= EV.gfall0 ? "nervous" : "grin";
    out.places.push(person(cam, 2, GKID[0], GKID[1], GKID[2], { expr, cheer: landed && s >= EV.gland + 2, look: s >= EV.gfall0 && !landed ? 1 : 0, blink: landed ? 0 : lidAt(s, 2) }));
    contact(out, GKID[0], GKID[1], GKID[2]);
    if (landed && s < EV.gland + 26) {
      const t = (s - EV.gland) / 26;
      out.fx.push({ key: `spark|${q(t, 30)}`, cw: 300, ch: 300, draw: (p) => fxSparkle(p, t), x: GHIT[0], y: 0.35, z: GHIT[2] + 0.05, w: 0.7, h: 0.7 });
    }
    if (landed && s < EV.gland + 30) {
      const t = ((s - EV.gland) / 30) % 1;
      out.fx.push({ key: `stars|${q(t, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, t), x: GKID[0], y: GKID[1] + 1.55, z: GKID[2], w: 0.8, h: 0.4 });
    }
  }
  return out;
};
