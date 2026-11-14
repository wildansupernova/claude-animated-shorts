// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, townsfolk, KID, INK, SKINS, SKIN, fxBurst, fxStars, fxCreak, fxPuff, fxShadow, fxContact,
  Outfit, Expr, FrontOpts, SideOpts, Prop,
} from "./toon";
import { FPS, D0, SHOTS, V3, P, EV, T, smooth, clamp01, TRENCH, ALPS, FACTORY, SEA } from "./story";
import { fxN2, fxGas, fxRope, fxDrop, fxBird, fxPoop, fxSpark, fxConfetti, fxPoster, fxBug, fxSprout, fxBreath, fxWheat, fxHeat } from "./fx";
import { LIGHTS } from "./lights";
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
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
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
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1350, 2250, 2.25] : d < 6.5 ? [810, 1350, 1.35] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4]; // sized for the 1080 x 1920 render

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "night" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.3, 0.3, 0.42] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- our cast ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const HABER: Outfit = { jacket: "#30364a", pants: "#2a2d3a", boots: "#1e1a22", hat: "bald", hair: "#4a3a30", moustache: "#3d2c22", glasses: true, build: "stout", buttons: "#c9ccd2", skin: "#f8dcc0" };
export const HABER_WAR: Outfit = { ...HABER, jacket: "#717866", pants: "#5f6652", boots: INK, hat: "peaked", cap: "#6d725f", band: "#b8343a", buttons: "#e8c45a", belt: null };
export const HABER_BEARD: Outfit = { ...HABER, beard: "#5a463a" };
const CLARA: Outfit = { jacket: "#e9e4d8", dress: "#4a3f6e", pants: "#333344", boots: "#3a2a22", hat: "bun", hair: "#3e2a20", skin: "#ffe2c8" };
const FARMER: Outfit = { jacket: "#8a5a3a", pants: "#4a4f6a", boots: "#4a3426", hat: "flatcap", cap: "#6f5a42", moustache: "#5a3b2a", skin: SKINS[1] };
const GERMAN = (v: number): Outfit => ({ jacket: "#7a806a", pants: "#626954", boots: INK, hat: "pickel", cap: "#80836f", buttons: "#c9ccd2", skin: SKINS[v % 4], moustache: v % 3 === 1 ? "#4a3426" : undefined });
const FRENCH = (v: number): Outfit => ({ jacket: "#5a78b8", pants: "#c23a3a", boots: INK, hat: "kepi", cap: "#c23a3a", band: "#2f4f8f", buttons: "#e8c45a", skin: SKINS[(v + 1) % 4], moustache: v % 2 ? "#3a2a20" : undefined });
const SPAIN: Outfit = { jacket: "#c23a3a", pants: "#f1efe6", boots: INK, hat: "kepi", cap: "#2f3a5a", band: "#e8c45a", buttons: "#e8c45a", moustache: "#2a201a", skin: SKINS[2] };
const PERU: Outfit = { jacket: "#3a5a9a", pants: "#f1efe6", boots: INK, hat: "kepi", cap: "#c23a3a", band: "#f1efe6", buttons: "#e8c45a", skin: SKINS[3] };
const MERCHANT: Outfit = { jacket: "#5d3a5a", pants: "#3b3f52", boots: "#2a201a", hat: "tophat", moustache: "#5a3b2a", build: "stout", skin: SKIN };
const WORKER: Outfit = { jacket: "#3f6fb5", pants: "#2f4f8f", boots: "#3a2a22", hat: "flatcap", cap: "#4a4f5a", skin: SKINS[1] };
const CAPTAIN: Outfit = { jacket: "#2f3a5a", pants: "#2f3a5a", boots: INK, hat: "peaked", cap: "#2f3a5a", band: "#e8c45a", buttons: "#e8c45a", beard: "#d8d2c6", skin: SKINS[2], build: "stout" };
const POSTMAN: Outfit = { jacket: "#2f3a5a", pants: "#2f3a5a", boots: INK, hat: "kepi", cap: "#e8b830", band: "#2f3a5a", buttons: "#e8c45a", skin: SKINS[0], moustache: "#6a4a2a" };
const SCIENTIST: Outfit = { jacket: "#f0ede6", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#c8c2b4", skin: SKINS[3], buttons: "#c9ccd2", moustache: "#c8c2b4" };

/** expression timeline: the last entry whose time (s) the clock has reached, LEAD early */
const ex = (t: number, seq: [number, Expr][]): Expr => { let e = seq[0][1]; for (const [ts, x] of seq) if (t >= ts - LEAD) e = x; return e; };
type PutOpt = { blob?: boolean; scale?: number; side?: { mirror: boolean; so?: SideOpts }; mirror?: boolean; swaps?: number[] };
/** one character: front view (default) or side view, lit and blinking, with a contact blob */
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, pos: V3, fo: FrontOpts, opt: PutOpt = {}) => {
  const blink = fo.expr === "whistle" || fo.expr === "laugh" ? 0 : lidAt(t, i, opt.swaps);
  const view = opt.side ? { side: true, mirror: opt.side.mirror } : { side: false, mirror: false };
  const pl = person(cam, { i, o, okey }, pos[0], pos[1], pos[2], view, { blink, ...fo }, { blink, ...(opt.side?.so ?? {}) }, opt.scale ?? 1);
  if (opt.mirror) { pl.mirror = true; pl.key += "|m"; }
  out.places.push(pl);
  if (opt.blob !== false) blob(out, pos[0], pos[1], pos[2], opt.scale ?? 1);
};
const fx = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, pos: V3, w: number, h: number, more: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x: pos[0], y: pos[1], z: pos[2], w, h, ...more });
const add = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];
/** burst/sparkle/puff helpers: u runs 0..1 over `dur` seconds from t0 */
const burstAt = (out: Stage, t: number, t0: number, dur: number, pos: V3, size: number, col = "#fff3b0", key = "burst") => {
  const u = (t - t0) / dur; if (u < 0 || u >= 1) return;
  const uq = q(u, 30); fx(out, `${key}${col}${uq}`, 500, 500, (p) => fxBurst(p, uq, col), pos, size, size);
};
const puffAt = (out: Stage, t: number, t0: number, dur: number, pos: V3, size: number) => {
  const u = (t - t0) / dur; if (u < 0 || u >= 1) return;
  const uq = q(u, 30); fx(out, `puff${uq}`, 300, 300, (p) => fxPuff(p, uq), pos, size, size, { soft: true });
};
const sparkles = (out: Stage, t: number, centre: V3, r: number, n: number, size: number, cam: CamInfo, seed = 0) => {
  for (let k = 0; k < n; k++) {
    const u = ((t * 1.1 + hh(k, 4 + seed)) % 1), uq = q(u, 20), a = k * 2.4 + seed;
    const pos: V3 = [centre[0] + cam.right.x * r * Math.cos(a), centre[1] + r * 0.8 * Math.sin(a) + 0.1 * u, centre[2] + cam.right.z * r * Math.cos(a)];
    fx(out, `spark${uq}`, 300, 300, (p) => fxSpark(p, uq), pos, size, size);
  }
};
const n2 = (out: Stage, pos: V3, size: number, rot: number) => fx(out, "n2", 300, 150, fxN2, pos, size, size / 2, { rot });
const wheat = (out: Stage, pos: V3, h: number, seed: number) => fx(out, `wheat${seed}`, 300, 900, (p) => fxWheat(p, seed), add(pos, 0, h / 2, 0), h / 3, h);
/** burlap sack card */
const sackCard = (p: Pen) => {
  p.poly([[40, 60], [260, 50], [280, 230], [150, 260], [20, 235]], "#d9c08c", 7);
  p.stroke([[60, 70], [240, 62]], 6, "#8f7650");
  for (const x of [100, 150, 200]) p.stroke([[x, 110], [x + 6, 200]], 3, "#a98f62");
};
const gasCloud = (out: Stage, t: number, t0: number, x0: number, x1: number, zBase: number, speed: number, n: number, cam: CamInfo, y0 = 0.6) => {
  if (t < t0) return;
  for (let k = 0; k < n; k++) {
    const age = t - t0 - hh(k, 21) * 1.2;
    if (age <= 0) continue;
    const x = x0 + ((x1 - x0) * (k + 0.5)) / n + (hh(k, 22) - 0.5) * 2;
    const z = zBase + age * speed * (0.85 + 0.3 * hh(k, 23)) + (k % 3) * 1.2;
    const g = Math.min(1, age / 1.8), size = (3.2 + 2.4 * hh(k, 24)) * (0.4 + 0.6 * g);
    const y = y0 + size * 0.14 + (k % 2) * 0.35;
    const seed = k % 5;
    fx(out, `gas${seed}`, 800, 320, (p) => fxGas(p, seed), [x, y, z], size * 1.5, size * 0.6, { soft: true, rot: 0.04 * Math.sin(t * 0.7 + k) });
  }
};

/** everything with a face (and every flat effect) in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: case 22: {
      const ending = id === 22, H = P.haberFarm;
      put(out, cam, t, 1, HABER, "haber", H, ending ? { mode: "stand", expr: ex(t, [[0, "stern"], [T(2005), "neutral"]]), look: 0 } : { mode: "stand", expr: ex(t, [[0, "smile_closed"], [T(22), "grin"]]), prop: "bread" });
      if (!ending) {
        const spots: V3[] = [[-1.0, 0, -1.6], [0.95, 0, -2.3], [-0.2, 0, -3.3], [1.6, 0, -4.1], [-1.7, 0, -4.5]];
        spots.forEach((d, k) => put(out, cam, t, 10 + k, FOLK[k % 6], `folk${k}`, add(H, ...d), { mode: "stand", expr: (["grin", "laugh", "smile_closed", "grin", "laugh"] as Expr[])[k], prop: k % 2 ? "bread" : null, wave: k === 2 ? 0.6 + 0.4 * Math.sin(t * 9) : undefined, facing: k % 2 ? -1 : 1 }));
      }
      wheat(out, add(H, 1.25, 0, 3.9), 1.3, 1); wheat(out, add(H, -1.15, 0, 3.4), 1.2, 2);
      wheat(out, add(H, 1.9, 0, 1.0), 1.1, 3); wheat(out, add(H, -1.8, 0, 0.6), 1.15, 4);
      break;
    }
    case 2: case 13: {
      const TR = P.haberTrench, wide = t >= T(1111) - LEAD && t < T(1157);
      if (id === 2 || t < T(1229)) {
        put(out, cam, t, 1, HABER_WAR, "haberW", TR, { mode: "stand", expr: id === 2 ? "stern" : ex(t, [[0, "stern"], [T(1157), "smug"]]), prop: id === 13 && t < T(1157) ? "watch" : null });
        const gx = wide ? [-8, -5.2, -2.6, 2.6, 5.2, 8] : id === 13 && t >= T(1157) - LEAD ? [-12, 5, 9.5] : [-2.3, 2.4];
        gx.forEach((x, k) => put(out, cam, t, 20 + k, GERMAN(k), `ger${k % 4}`, add(TR, x, 0, 0.15 + 0.2 * hh(k)), { mode: "stand", expr: (["nervous", "stern", "neutral", "nervous", "stern", "neutral"] as Expr[])[k], facing: x < 0 ? 1 : -1 }));
      }
      if (id === 2) gasCloud(out, t, T(20), TR[0] - 10, TR[0] + 10, TR[2] + 4.5, 1.0, 10, cam, 1.6);
      else {
        gasCloud(out, t, EV.cloud0, TR[0] - 22, TR[0] + 22, TRENCH[2] + 2.6, 1.8, 24, cam, 0.9);
        if (t > EV.valves && t < T(1229)) for (let k = -16; k <= 16; k += 2) puffAt(out, t, EV.valves + ((k + 16) % 5) * 0.05, 0.7, [TR[0] + k * 0.6, 1.55, TRENCH[2] + 2.3], 0.9);
        if (t >= T(1229) - LEAD) {
          const F = P.french;
          [-1.6, -0.5, 0.7, 1.7, -2.6, 2.6].forEach((x, k) => {
            const run = Math.max(0, t - EV.french - 0.12 * k);
            const pos = add(F, x, 0, -0.3 * (k % 2) - (k > 3 ? 1.2 : 0) + run * 1.9);
            put(out, cam, t, 40 + k, FRENCH(k), `fr${k}`, pos, { mode: run > 0 ? "march" : "stand", phase: (t * 2.6 + k * 0.3) % 1, tilt: run > 0 ? (x < 0 ? 7 : -7) : 0, expr: t > EV.french - LEAD ? (k % 2 ? "shock" : "pained") : "neutral", facing: x < 0 ? 1 : -1, prop: k % 2 ? null : "hands" }, { swaps: [EV.french] });
          });
          gasCloud(out, t, T(1196), F[0] - 12, F[0] + 12, F[2] - 9, 1.5, 14, cam, 1.0);
        }
      }
      break;
    }
    case 3: case 7: case 8: {
      const L = P.haberLab;
      if (id === 3) { put(out, cam, t, 1, HABER, "haber", L, { mode: "stand", expr: "smug", prop: "flaskUp", facing: -1 }); sparkles(out, t, add(L, 0.38, 1.6, 0.05), 0.28, 5, 0.12, cam); }
      else if (id === 8) {
        put(out, cam, t, 1, HABER, "haber", L, { mode: "stand", expr: ex(t, [[0, "smug"], [EV.sparkle, "grin"]]), prop: "flaskUp", facing: -1 });
        burstAt(out, t, EV.sparkle, 0.5, add(L, 0.38, 1.62, 0.1), 0.7, "#fff3b0");
        sparkles(out, t, add(L, 0.38, 1.62, 0.05), 0.32, 7, 0.14, cam, 3);
      } else {
        const near = t >= T(629) - LEAD;
        put(out, cam, t, 1, HABER, "haber", !near ? L : t < T(704) - LEAD ? add(L, 2.15, 0, -2.3) : add(L, 0.6, 0, -1.0), {
          mode: "stand", prop: t < T(560) ? "cross" : null, facing: near ? 1 : 0,
          expr: ex(t, [[0, "smug"], [T(539), "stern"], [T(629), "nervous"], [T(684), "grin"]]),
        }, { swaps: [T(539), T(629)] });
        if (t >= T(629) && t < T(704)) for (let k = 0; k < 2; k++) { const u = q(((t * 0.8 + k * 0.5) % 1), 20); fx(out, `heat${u}`, 300, 300, (p) => fxHeat(p, u), add(P.furnace, 0.25 * k - 0.1, 0.65, 0.25), 0.6, 0.6, { soft: true }); }
        if (t >= T(560) && t < T(629)) { const u = q((t * 1.3) % 1, 30); fx(out, `creak${u}`, 300, 300, (p) => fxCreak(p, u), add(P.gauge, 0.02, 0.26, 0.05), 0.32, 0.32); }
        // drips: a drop forms at the spout, falls into the flask (0.48 m), every 0.65 s from EV.drip0
        for (let k = 0; k < 4; k++) {
          const t0 = EV.drip0 + k * 0.62, u = (t - t0) / 0.42;
          if (u < -0.6 || u >= 1) continue;
          const grow = u < 0 ? 0.4 + (u + 0.6) : 1, y = u < 0 ? 0 : -0.3 * u * u;
          fx(out, "drop", 120, 180, fxDrop, add(P.spout, 0, -0.05 + y, 0.02), 0.045 * grow, 0.068 * grow);
        }
      }
      break;
    }
    case 4: {
      put(out, cam, t, 2, FARMER, "farmer", P.farmer, { mode: "stand", prop: "emptySack", expr: ex(t, [[0, "neutral"], [EV.sackLook, "shock"]]), look: 0 }, { swaps: [EV.sackLook] });
      [[-4, 0, -3], [5, 0, -6], [-9, 0, 2]].forEach((d, k) => put(out, cam, t, 30 + k, FOLK[(k + 2) % 6], `folkf${k}`, add(P.farmer, d[0], d[1], d[2]), { mode: "stand", expr: "nervous" }));
      break;
    }
    case 5: case 11: {
      if (id === 5) {
        const I = P.island;
        for (let k = 0; k < 7; k++) {
          const a = t * (0.5 + 0.1 * k) + k * 0.9, r = 4.5 + (k % 3) * 2.2, flap = Math.sin(t * 9 + k * 1.3), fq = q(flap, 6);
          const pos = add(I, r * Math.cos(a), 7.5 + (k % 3) * 1.4 + 0.3 * Math.sin(t * 2 + k), r * Math.sin(a) * 0.6 + 2);
          fx(out, `bird${fq}`, 320, 200, (p) => fxBird(p, fq), pos, 1.0, 0.62, { rot: 0.15 * Math.sin(a) });
          const dt = (t + hh(k, 3) * 1.5) % 1.5;
          if (k % 2 === 0 && dt < 0.7) fx(out, "poop", 80, 110, fxPoop, add(pos, 0, -dt * dt * 9, 0), 0.22, 0.3);
        }
        const top = add(I, 0, 3.0, 5);
        if (t < T(309) - LEAD) put(out, cam, t, 3, MERCHANT, "merchant", add(top, 0.3, 0, 0.2), { mode: "stand", prop: "sack", expr: ex(t, [[0, "neutral"], [T(281), "grin"]]) });
        else {
          const pull = 0.12 * Math.sin(t * 7);
          put(out, cam, t, 4, SPAIN, "spain", add(top, -0.78 + pull, 0, 0), { mode: "stand", prop: "rope", tilt: -12, expr: t < EV.cannon ? "pained" : "shock" });
          put(out, cam, t, 5, PERU, "peru", add(top, 0.78 + pull, 0, 0.05), { mode: "stand", prop: "rope", tilt: -12, expr: t < EV.cannon ? "pained" : "shock" }, { mirror: true });
          fx(out, "rope", 900, 260, fxRope, add(top, pull, 0.66, 0.12), 1.3, 0.376);
          burstAt(out, t, EV.cannon, 0.45, add(top, 3.5, 2.2, -4), 2.6, "#ffb347", "bigburst");
          puffAt(out, t, EV.cannon + 0.1, 1.2, add(top, 3.5, 2.2, -3.8), 3.4);
        }
      } else {
        const M = P.merchant, deck = add(M, 0.6, 1.55, 0.1);
        put(out, cam, t, 6, CAPTAIN, "captain", deck, { mode: "stand", expr: ex(t, [[0, "smile"], [EV.warshipStop - 0.6, "shock"]]) }, { blob: false });
        put(out, cam, t, 7, WORKER, "sailor", add(deck, -2.4, 0, -0.3), { mode: "stand", prop: "sack", expr: ex(t, [[0, "neutral"], [EV.warshipStop - 0.4, "shock"]]) }, { blob: false });
      }
      break;
    }
    case 6: {
      const K = P.kid;
      if (t < T(453) - LEAD) {
        put(out, cam, t, 8, KID, "kid", K, { mode: "stand", expr: ex(t, [[0, "smile"], [EV.breath, "whistle"], [T(439), "shock"]]), prop: "hands" }, { scale: 0.85, swaps: [T(439)] });
        for (let k = 0; k < 9; k++) {
          const suck = clamp01((t - EV.breath) / 1.6) * (k % 3 === 0 ? 1 : 0.35);
          const a = k * 0.7 + t * 0.4, r = 0.9 + (k % 4) * 0.4;
          let pos: V3 = add(K, r * Math.cos(a), 0.6 + (k % 5) * 0.28 + 0.08 * Math.sin(t * 2 + k), 0.4 + r * 0.5 * Math.sin(a));
          const mouth = add(K, 0.05, 1.0, 0.2);
          pos = pos.map((v, i) => v + (mouth[i] - v) * suck * 0.9) as V3;
          n2(out, pos, 0.24 * (1 - 0.6 * suck), 0.4 * Math.sin(t + k));
        }
        if (t >= EV.breath) { const u = q((t * 1.4) % 1, 20); fx(out, `breath${u}`, 420, 200, (p) => fxBreath(p, u), add(K, 0.42, 1.0, 0.2), 0.5, 0.24, { rot: Math.PI, soft: true }); }
      } else {
        const S = P.sprout, dz = t >= EV.dazed - LEAD;
        const sw = dz ? 0.2 : q(0.5 - 0.5 * Math.cos((t - EV.hammer) * Math.PI * 4), 10);
        fx(out, `sprout${sw}${dz}`, 360, 460, (p) => fxSprout(p, sw, dz), add(S, 0, 0.2, 0), 0.3, 0.38);
        n2(out, add(S, 0.22, 0.07, 0.02), 0.2, 0);
        if (!dz && sw > 0.9) burstAt(out, t, t - 0.05, 0.3, add(S, 0.2, 0.09, 0.05), 0.2, "#ffffff", "hit");
        if (dz) { const u = q((t * 1.2) % 1, 30); fx(out, `stars${u}`, 420, 210, (p) => fxStars(p, u), add(S, 0, 0.42, 0), 0.24, 0.12); }
      }
      break;
    }
    case 9: {
      const C = P.crowd;
      for (let k = 0; k < 26; k++) {
        const row = Math.floor(k / 6), col = k % 6;
        const pos = add(C, -row * 1.3 + (hh(k, 1) - 0.5) * 0.5, 0, (col - 2.5) * 1.15 + (hh(k, 2) - 0.5) * 0.4 + row * 0.3);
        const kid = k % 5 === 3;
        put(out, cam, t, 50 + k, kid ? KID : FOLK[k % 6], kid ? "kidc" : `folk${k % 6}`, pos,
          { mode: "stand", expr: (["grin", "laugh", "smile_closed", "grin", "relief"] as Expr[])[k % 5], prop: k % 3 === 2 ? null : "bread", wave: k % 3 === 2 ? 0.5 + 0.5 * Math.sin(t * 8 + k) : undefined, facing: k % 2 ? 1 : -1 },
          { scale: kid ? 0.85 : 1 });
      }
      break;
    }
    case 10: {
      const W = P.worker;
      put(out, cam, t, 9, WORKER, "worker", W, { mode: "stand", prop: "hands", expr: ex(t, [[0, "smile"], [EV.shell, "shock"]]), facing: -1 }, { swaps: [EV.shell] });
      burstAt(out, t, EV.shell, 0.4, add(P.chute, 0, -0.4, 1.4), 0.9, "#fff3b0");
      break;
    }
    case 12: {
      const G = P.gun;
      put(out, cam, t, 11, GERMAN(1), "ger1", add(G, -0.9, 0, -1.4), { mode: "stand", expr: t > EV.gun1 - LEAD ? "pained" : "stern", facing: 1 });
      put(out, cam, t, 12, GERMAN(2), "ger2", add(G, 1.4, 0, -1.6), { mode: "stand", expr: t > EV.gun1 - LEAD ? "pained" : "nervous", facing: -1 });
      for (const tg of [EV.gun1, EV.gun2]) {
        burstAt(out, t, tg, 0.3, add(G, 0, 1.5, 2.4), 1.6, "#ffb347", "muzzle");
        puffAt(out, t, tg + 0.05, 1.0, add(G, 0, 1.6, 3.0), 2.4);
      }
      break;
    }
    case 14: {
      if (t < EV.claraGone - LEAD) put(out, cam, t, 13, CLARA, "clara", P.clara, { mode: "stand", prop: "flask", expr: ex(t, [[0, "neutral"], [T(1320), "smile_closed"]]), facing: -1 });
      break;
    }
    case 15: {
      const x = -0.9 + (t - T(1383)) * 0.9;
      const pos = add(P.walker, x, 0, 0), view = viewOf(cam, pos[0], pos[2], 1, 0);
      put(out, cam, t, 1, HABER, "haber", pos, { mode: "stand", expr: "sad" }, { side: { mirror: view.mirror, so: { mode: "march", phase: (t * 1.55) % 1, expr: "sad", stride: 0.8 * view.fs, prop: "suitcase" } } });
      break;
    }
    case 16: case 17: {
      const A = P.haberAlps;
      if (id === 16) {
        if (t >= T(1504) - LEAD && t < T(1533) - LEAD) {
          const beard = t >= EV.beard;
          put(out, cam, t, 1, beard ? HABER_BEARD : HABER, beard ? "haberB" : "haber", A, { mode: "stand", expr: beard ? "smug" : "nervous" }, { swaps: [EV.beard] });
          puffAt(out, t, EV.beard - 0.03, 0.6, add(A, 0, 1.25, 0.25), 1.1);
        } else if (t >= T(1533) - LEAD) {
          put(out, cam, t, 1, HABER_BEARD, "haberB", add(P.hideTree, 0.78, 0, -0.2), { mode: "stand", expr: "nervous", look: -1, facing: -1 });
        }
      } else {
        const walk = clamp01((t - T(1570)) / 0.45), arrived = walk >= 1;
        const pp = add(A, -3.6 + 2.3 * walk, 0, 0.35);
        if (!arrived) { const view = viewOf(cam, pp[0], pp[2], 1, 0); put(out, cam, t, 14, POSTMAN, "post", pp, { mode: "stand" }, { side: { mirror: view.mirror, so: { mode: "march", phase: (t * 2) % 1, expr: "smile", stride: 0.8 * view.fs } } }); }
        else put(out, cam, t, 14, POSTMAN, "post", pp, { mode: "stand", expr: t > EV.medal ? "grin" : "smile", prop: t < EV.medal - 0.1 ? "medal" : "hands", facing: 1 });
        put(out, cam, t, 1, HABER_BEARD, "haberB", A, { mode: "stand", expr: ex(t, [[0, "nervous"], [T(1586), "shock"], [EV.medal, "laugh"]]), prop: t >= EV.medal ? "medal" : null, facing: -1 });
        if (t >= EV.medal) { const u = (t - EV.medal) / 1.1; if (u < 1) { const uq = q(u, 30); fx(out, `conf${uq}`, 600, 600, (p) => fxConfetti(p, uq), add(A, 0, 2.15, -0.4), 1.5, 1.5); } }
        burstAt(out, t, EV.medal, 0.4, add(A, 0.4, 1.75, 0.2), 0.8, "#ffe27a");
      }
      break;
    }
    case 18: {
      const S = P.scientist;
      if (t < T(1703) - LEAD) {
        put(out, cam, t, 15, SCIENTIST, "sci", S, { mode: "stand", prop: "sprayer", expr: ex(t, [[0, "neutral"], [EV.bugs, "stern"]]), facing: 1 });
        for (let k = 0; k < 3; k++) { const u = ((t * 1.5 + k / 3) % 1); fx(out, `mist${q(u, 20)}`, 300, 300, (p) => fxPuff(p, q(u, 20)), add(S, 0.55 + 0.45 * u, 1.38 + 0.05 * k, -0.4 - 0.5 * u), 0.35 + 0.3 * u, 0.35 + 0.3 * u, { soft: true }); }
        for (let k = 0; k < 4; k++) {
          const fall = clamp01((t - EV.bugs - k * 0.12) / 0.4), dz = fall > 0;
          const pos = add(P.plant, -0.2 + k * 0.13, 0.42 - 0.36 * fall * fall + (dz ? 0 : 0.04 * Math.sin(t * 6 + k)), 0.18);
          fx(out, `bug${dz}`, 200, 140, (p) => fxBug(p, dz), pos, 0.15, 0.105, { rot: dz ? 0 : 0.3 * Math.sin(t * 3 + k) });
        }
      }
      break;
    }
    case 21: {
      const K = P.picnic;
      put(out, cam, t, 8, KID, "kid", add(K, 1.15, 0, 0.25), { mode: "stand", prop: "bread", expr: ex(t, [[0, "smile_closed"], [EV.halfBody, "shock"], [EV.pull + 0.4, "nervous"]]), look: 0 }, { scale: 0.85, swaps: [EV.halfBody] });
      for (let k = 0; k < 18; k++) {
        const u = ((t * 0.35 + hh(k, 30)) % 1), a = k * 2.1;
        const sky = add(K, 2.5 * Math.cos(a), 4.6 + 1.4 * hh(k, 31), 0.55 + 1.5 * Math.sin(a) - 0.5);
        const end = add(K, 1.4 + 0.1 * Math.cos(a), 0.9, 0.4);
        const pos = sky.map((v, i) => v + (end[i] - v) * u * u) as V3;
        n2(out, pos, 0.3 * (1 - 0.5 * u), 0.5 * Math.sin(t + k));
      }
      if (t >= EV.halfBody) sparkles(out, t, add(K, 1.15, 0.7, 0.3), 0.3, 6, 0.1, cam, 5);
      wheat(out, add(K, 2.9, 0, 2.4), 1.15, 6);
      break;
    }
  }
  return out;
};
export { FPS, LEAD };
