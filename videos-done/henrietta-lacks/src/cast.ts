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
import { FPS, D0, SHOTS, V3, P, EV, T, smooth, clamp01, CELLS, add } from "./story";
import { fxSpark, fxCell, fxHourglass, fxVirus, fxLeaf, fxTobacco, fxLetter, fxCrate } from "./fx";
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
const BROWN = ["#8d5b3e", "#7a4e34", "#9c6a48", "#6e4630"];
export const HENRIETTA: Outfit = { jacket: "#3f5a8a", dress: "#3f5a8a", pants: "#2a2228", boots: "#2a2228", hat: "curls", hair: "#24181a", skin: "#8d5b3e" };
const KIDS: Outfit[] = [
  { jacket: "#e2a83c", pants: "#3b5b9a", boots: "#4a3426", hat: "hair", hair: "#24181a", skin: BROWN[0], build: "kid" },
  { jacket: "#c25a7a", dress: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "curls", hair: "#24181a", skin: BROWN[1], build: "kid" },
  { jacket: "#5d7a3a", pants: "#4a4f6a", boots: "#4a3426", hat: "cap", cap: "#3f6fb5", skin: BROWN[2], build: "kid" },
  { jacket: "#7b5ac9", dress: "#e6d27a", pants: "#3b3f52", boots: "#4a3426", hat: "curls", hair: "#24181a", skin: BROWN[0], build: "kid" },
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#24181a", skin: BROWN[3], build: "kid" },
];
const DOCTOR: Outfit = { jacket: "#f0ede6", pants: "#3b3f52", boots: "#2a201a", hat: "hair", hair: "#a29d94", glasses: true, skin: SKIN, moustache: "#a29d94", buttons: "#c9ccd2" };
const GEY: Outfit = { jacket: "#f0ede6", pants: "#4a4f6a", boots: "#2a201a", hat: "hair", hair: "#5a3b2a", skin: SKINS[0], buttons: "#c9ccd2", build: "adult" };
const KUBICEK: Outfit = { jacket: "#f0ede6", dress: "#7b8fb5", pants: "#3b3f52", boots: "#2a201a", hat: "bun", hair: "#c9a36a", skin: SKINS[0], glasses: true };
const NURSE: Outfit = { jacket: "#f4f2ec", dress: "#f4f2ec", pants: "#3b3f52", boots: "#e9e4d8", hat: "bun", hair: "#5a3b2a", skin: SKINS[1] };
const POSTMAN: Outfit = { jacket: "#5d6f8f", pants: "#4a5670", boots: INK, hat: "kepi", cap: "#4a5670", band: "#2f3a5a", buttons: "#e8c45a", skin: SKINS[2], moustache: "#6a4a2a" };
const SCI: Outfit = { jacket: "#f0ede6", pants: "#2f3a5a", boots: "#2a201a", hat: "bun", hair: "#24181a", skin: BROWN[1], glasses: true, buttons: "#c9ccd2" };
const DAY: Outfit = { jacket: "#6a5a4a", pants: "#3b3f52", boots: "#2a201a", hat: "fedora", cap: "#4a3f36", skin: BROWN[3], moustache: "#d8d2c6", build: "stout" };
const FAM73: Outfit[] = [
  { jacket: "#c25a7a", dress: "#c25a7a", pants: "#3b3f52", boots: "#3a2a22", hat: "curls", hair: "#24181a", skin: BROWN[0] },
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#24181a", skin: BROWN[2], moustache: "#24181a" },
  { jacket: "#d98a3a", pants: "#4a4f6a", boots: "#3a2a22", hat: "hair", hair: "#24181a", skin: BROWN[1] },
];
const FAM23: Outfit[] = [
  { jacket: "#2f2f3a", pants: "#2f2f3a", boots: INK, hat: "hair", hair: "#d8d2c6", skin: BROWN[3], moustache: "#d8d2c6", build: "stout" },
  { jacket: "#8c3b4a", dress: "#8c3b4a", pants: "#3b3f52", boots: INK, hat: "curls", hair: "#24181a", skin: BROWN[0] },
  { jacket: "#3a5a9a", pants: "#2f2f3a", boots: INK, hat: "hair", hair: "#24181a", skin: BROWN[2] },
  { jacket: "#e8c45a", dress: "#5d7a3a", pants: "#3b3f52", boots: INK, hat: "bun", hair: "#24181a", skin: BROWN[1] },
  { jacket: "#2f2f3a", pants: "#2f2f3a", boots: INK, hat: "hair", hair: "#7a7a7a", skin: SKINS[1], glasses: true },
];
const CROWD = (k: number): Outfit => {
  const o = townsfolk(k);
  const skins = [BROWN[0], SKINS[0], BROWN[2], SKINS[2], BROWN[3], SKINS[3], SKINS[1], BROWN[1]];
  return { ...o, skin: skins[k % skins.length], hat: o.hat === "tophat" ? (k % 3 ? "fedora" : "hair") : o.hat, hair: "#24181a", cap: "#4a3f36" };
};

const ex = (t: number, seq: [number, Expr][]): Expr => { let e = seq[0][1]; for (const [ts, x] of seq) if (t >= ts - LEAD) e = x; return e; };
type PutOpt = { blob?: boolean; scale?: number; side?: { mirror: boolean; so?: SideOpts }; mirror?: boolean; swaps?: number[] };
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
const tobacco = (out: Stage, pos: V3, h: number, seed: number) => fx(out, `tob${seed % 3}`, 300, 600, (p) => fxTobacco(p, seed), add(pos, 0, h / 2, 0), h / 2, h);
/** a cell card on the dish (y = its centre). Uniform 800 x 800 card (see fxCell), so a split = 1 card's lobes are two
 *  0.75-size cells offset 0.19 size along the card's x (or y when vert). */
const cell = (out: Stage, pos: V3, size: number, split: number, mood: "happy" | "dead" | "plain", hue: number, vert = false) => {
  const sq = q(split, 12);
  fx(out, `cell${mood}${hue % 3}${sq}${vert ? "v" : ""}`, 800, 800, (p) => fxCell(p, sq, mood, hue, vert), pos, size * 1.6, size * 1.6);
};
const along = (p: V3, v: THREE.Vector3, d: number): V3 => add(p, v.x * d, v.y * d, v.z * d);
/** a field of cells on the dish, each dividing on its own clock (period ~1.6 s). A cell that finishes its split during
 *  the shot (t0 = shot start) stays two: its daughters are born exactly where the card's lobes were and ease apart
 *  along the screen, so nothing ever snaps back to one cell. */
const cellField = (out: Stage, t: number, t0: number, n: number, mood: "happy" | "plain", cam: CamInfo, seed = 0) => {
  for (let k = 0; k < n; k++) {
    const a = k * 2.399 + seed, r = 0.68 * Math.sqrt(k + 0.5), size = 0.8;
    const p = add(CELLS, r * Math.cos(a) * 1.15, 0.45 + 0.05 * Math.sin(t * 2 + k), r * Math.sin(a));
    const off = hh(k, 40 + seed) * 1.6, ph = ((t + off) / 1.6) % 1, ph0 = ((t0 + off) / 1.6) % 1;
    const done = t0 + (1 - ph0) * 1.6; // this cell's first split completes here
    if (t < done) { cell(out, p, size, ph > 0.7 ? (ph - 0.7) / 0.3 : 0, mood, k); continue; }
    const e = smooth((t - done) / 0.45), d = size * (0.19 + 0.13 * e), sc = size * (0.75 + 0.1 * e);
    for (const sx of [-1, 1]) cell(out, along(p, cam.right, sx * d), sc, 0, mood, k);
  }
};
/** the doubling colony (shot 9): generation g lasts DIV_P. Daughters are born where the parent's lobes were (0.75 size)
 *  and glide out to their H-tree spot while growing; then every cell pinches in two. Splits alternate across the screen
 *  (world x) and up the screen (world z); spacing is just wider than a cell (0.48 across, 0.6 deep), so the colony fills
 *  the microscope circle rather than spreading past it. */
const DIV_P = 0.32;
const treeSpot = (k: number, G: number): V3 => {
  let x = 0, z = 0;
  for (let j = 0; j < G; j++) {
    const sgn = (k >> j) & 1 ? 1 : -1, d = (j % 2 === 0 ? 0.24 : 0.3) * 2 ** Math.floor((G - 1 - j) / 2);
    if (j % 2 === 0) x += sgn * d; else z += sgn * d;
  }
  return add(CELLS, x, 0.45, z);
};
const colony = (out: Stage, t: number, cam: CamInfo) => {
  const raw = (t - EV.divide0) / DIV_P, g = Math.max(-1, Math.min(5, Math.floor(raw))), size = 0.78;
  if (g < 0) { cell(out, treeSpot(0, 0), size, 0, "happy", 0); return; }
  const u = Math.min(1, raw - g), G = g;
  const fwd = new THREE.Vector3(CELLS[0] - cam.pos.x, CELLS[1] + 0.45 - cam.pos.y, CELLS[2] - cam.pos.z).normalize();
  const up = cam.right.clone().cross(fwd).normalize(), down = up.clone().multiplyScalar(-1);
  const e = smooth(u / 0.45), split = G < 5 && u > 0.45 ? (u - 0.45) / 0.55 : 0;
  for (let k = 0; k < 2 ** G; k++) {
    const target = treeSpot(k, G);
    let pos = target, sc = size;
    if (G > 0 && e < 1) {
      // born on the lobe of the split that made it: split j = G - 1 ran across (j even: + child on the right) or up
      // the screen (j odd: + child is nearer the camera = lower on screen)
      const j = G - 1, parent = k & ((1 << j) - 1), sgn = (k >> j) & 1 ? 1 : -1;
      const birth = along(treeSpot(parent, j), j % 2 === 0 ? cam.right : down, sgn * 0.19 * size);
      pos = [birth[0] + (target[0] - birth[0]) * e, birth[1] + (target[1] - birth[1]) * e, birth[2] + (target[2] - birth[2]) * e];
      sc = size * (0.75 + 0.25 * e);
    }
    cell(out, pos, sc, split, "happy", k, G % 2 === 1);
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: case 22: case 27: {
      const expr: Expr = id === 1 ? "smile" : id === 22 ? "neutral" : ex(t, [[0, "smile_closed"], [EV.worldKnows, "smile"]]);
      put(out, cam, t, 1, HENRIETTA, "hen", P.portrait, { mode: "stand", prop: "hips", expr });
      if (id !== 22) { tobacco(out, add(P.portrait, 1.3, 0, 3.6), 1.25, 1); tobacco(out, add(P.portrait, -1.2, 0, 3.2), 1.15, 2); }
      if (id === 27 && t > EV.worldKnows - 0.2) sparkles(out, t, add(P.portrait, 0, 1.3, 0.2), 0.75, 7, 0.14, cam, 2);
      break;
    }
    case 2: case 26: cellField(out, t, T(s.a), 26, "happy", cam, id); break;
    case 3: sparkles(out, t, add(P.satellite, 0.35, 0.15, 0.6), 0.25, 4, 0.12, cam, 1); break;
    case 4: {
      if (t < T(280)) {
        put(out, cam, t, 1, HENRIETTA, "hen", P.family, { mode: "stand", expr: "smile", prop: "hands" });
        const kd: [number, number][] = [[-1.0, 0.3], [0.95, 0.25], [-1.7, -0.5], [1.65, -0.45], [0.2, 0.9]];
        kd.forEach(([dx, dz], k) => put(out, cam, t, 20 + k, KIDS[k], `kid${k}`, add(P.family, dx, 0, dz), {
          mode: "stand", expr: (["grin", "laugh", "smile_closed", "grin", "smile"] as Expr[])[k], wave: k === 2 ? 0.5 + 0.5 * Math.sin(t * 9) : undefined, facing: dx < 0 ? 1 : -1 }, { scale: 0.62 + 0.06 * (k % 3) }));
      } else {
        put(out, cam, t, 1, HENRIETTA, "hen", P.field, { mode: "stand", expr: "smile_closed", prop: "hands", facing: -1 });
        tobacco(out, add(P.field, 1.0, 0, 2.2), 1.3, 3); tobacco(out, add(P.field, -0.9, 0, 2.0), 1.2, 4);
      }
      break;
    }
    case 5: {
      const w = clamp01((t - T(328)) / 3.6), pos = add(P.walk, 0, 0, -3.2 * w), view = viewOf(cam, pos[0], pos[2], 0, -1);
      put(out, cam, t, 1, HENRIETTA, "hen", pos, { mode: "stand", expr: "neutral" }, { side: { mirror: view.mirror, so: { mode: "march", phase: (t * 1.6) % 1, expr: "neutral", stride: 0.7 * view.fs } } });
      break;
    }
    case 6: {
      const E = P.exam, took = t >= EV.takeSample;
      put(out, cam, t, 1, HENRIETTA, "hen", add(E, 0, 0.62, 0.1), { mode: "sit", expr: ex(t, [[0, "nervous"], [T(555), "smile_closed"]]) }, { blob: false });
      put(out, cam, t, 2, DOCTOR, "doc", add(E, 1.0, 0, 0.6), { mode: "stand", prop: took ? "tube" : "hands", expr: "neutral", facing: -1 });
      break;
    }
    case 7: case 10: case 13: case 14: {
      const shocked = id === 10;
      if (id !== 13) {
        put(out, cam, t, 3, GEY, "gey", P.gey, { mode: "stand", prop: id === 7 ? "tube" : null, expr: id === 7 ? "smile" : shocked ? "shock" : "neutral", facing: -1 }, { swaps: [EV.shock] });
        put(out, cam, t, 4, KUBICEK, "kub", shocked ? add(P.gey, -0.8, 0, -0.15) : P.kubicek, { mode: "stand", prop: id === 14 ? "tubeUp" : null, expr: shocked ? "shock" : id === 14 ? "grin" : "neutral", facing: 1 }, { swaps: [EV.shock] });
      }
      if (id === 14) sparkles(out, t, add(P.kubicek, 0.4, 1.7, 0.1), 0.25, 5, 0.1, cam, 3);
      break;
    }
    case 8: {
      for (let k = 0; k < 14; k++) {
        const a = k * 2.399, r = 0.7 * Math.sqrt(k + 0.5), td = EV.dying + hh(k, 7) * 1.4, dead = t > td;
        const sc = dead ? Math.max(0.3, 1 - (t - td) * 0.35) : 1;
        cell(out, add(CELLS, r * Math.cos(a) * 1.15, 0.45, r * Math.sin(a)), 0.8 * sc, 0, dead ? "dead" : "plain", k);
      }
      break;
    }
    case 9: colony(out, t, cam); break;
    case 11: {
      const lvl = clamp01(1 - (t - T(754)) / 2.1);
      cell(out, add(CELLS, -0.55, 0.55, 0), 0.8, 0, "plain", 0);
      fx(out, `hg${q(lvl, 20)}`, 300, 460, (p) => fxHourglass(p, q(lvl, 20), false), add(CELLS, -0.55, 1.25, 0), 0.42, 0.64);
      const broken = t >= EV.hourglassBreak, sp = t > EV.hourglassBreak + 0.3 ? ((t * 0.8) % 1) : 0;
      cell(out, add(CELLS, 0.6, 0.55, 0), 0.8, sp > 0.6 ? (sp - 0.6) / 0.4 : 0, t > EV.hourglassBreak ? "happy" : "plain", 1);
      fx(out, `hgR${broken}${q(lvl, 20)}`, 300, 460, (p) => fxHourglass(p, broken ? 0.5 : q(lvl, 20), broken), add(CELLS, 0.6, 1.25, 0), 0.42, 0.64);
      if (t > EV.virus - 0.6 && t < EV.hourglassBreak + 0.4) {
        const u = clamp01((t - (EV.virus - 0.6)) / 1.4);
        fx(out, "virus", 300, 300, fxVirus, add(CELLS, 1.9 - 1.25 * u, 1.32 + 0.22 * Math.sin(u * 6), 0.05), 0.3, 0.3, { rot: t * 2 });
      }
      burstAt(out, t, EV.hourglassBreak, 0.4, add(CELLS, 0.6, 1.32, 0.05), 0.7, "#fff3b0");
      break;
    }
    case 12: {
      for (let k = 0; k < 10; k++) {
        const u = ((t * 0.18 + hh(k, 50)) % 1), sd = k % 4;
        fx(out, `leaf${sd}`, 120, 120, (p) => fxLeaf(p, sd), add(P.chair, -2.5 + 5 * hh(k, 51) + 0.5 * Math.sin(t + k), 3.2 - 3.4 * u, 1.0 + 1.6 * hh(k, 52)), 0.16, 0.16, { rot: t * 1.5 + k });
      }
      break;
    }
    case 15: {
      const pos = add(P.post, 0.3, 0, 0.6 * (t - T(1012)));
      put(out, cam, t, 5, POSTMAN, "post", pos, { mode: "march", phase: (t * 1.8) % 1, prop: "hands", expr: "smile" });
      fx(out, "crate", 360, 280, fxCrate, add(pos, 0, 0.9, 0.12), 0.5, 0.39);
      break;
    }
    case 16: {
      const Cn = P.clinic;
      put(out, cam, t, 6, NURSE, "nurse", Cn, { mode: "stand", prop: "syringe", expr: "smile", facing: 1 });
      [[0.85, 0.35], [1.55, 0.3], [2.25, 0.35], [2.95, 0.3]].forEach(([dx, dz], k) =>
        put(out, cam, t, 30 + k, KIDS[(k + 1) % 5], `kidq${k}`, add(Cn, dx, 0, dz), { mode: "stand", expr: k === 0 ? ex(t, [[0, "nervous"], [EV.shot, "pained"], [EV.shot + 0.5, "grin"]]) : (["nervous", "smile", "grin"] as Expr[])[k % 3], facing: -1 }, { scale: 0.66 }));
      burstAt(out, t, EV.shot, 0.3, add(Cn, 0.55, 0.95, 0.45), 0.35, "#ffffff", "pin");
      break;
    }
    case 17: case 25: {
      put(out, cam, t, 7, SCI, "sci", P.sci, { mode: "stand", expr: id === 17 ? "smug" : "smile", prop: "hands", facing: -1 });
      if (id === 17) sparkles(out, t, add(P.microscope, 0, 0.35, 0.1), 0.2, 3, 0.08, cam, 4);
      break;
    }
    case 18: sparkles(out, t, add(P.dna, 0, 0.45, 0.1), 0.25, 5, 0.08, cam, 6); break;
    case 19: {
      const R = P.rocket, lift = Math.max(0, t - EV.liftoff), y = 1.5 * lift * lift;
      if (t > EV.ignite) {
        for (let k = 0; k < 7; k++) puffAt(out, t, EV.ignite + k * 0.12, 1.6, add(R, (k - 3) * 2.2, 1.5 + 0.3 * k, 2.5 + (k % 2)), 4.5);
        burstAt(out, t, t - ((t * 8) % 1) / 8, 0.125, add(R, 0, y - 0.5, 0.8), 2.4, "#ffb347", "flame");
      }
      break;
    }
    case 20: {
      put(out, cam, t, 7, SCI, "sci", add(P.papers, -1.0, 0, 0.6), { mode: "stand", expr: ex(t, [[0, "neutral"], [EV.papersFall, "shock"]]), facing: 1 }, { swaps: [EV.papersFall] });
      if (t > EV.papersFall) for (let k = 0; k < 8; k++) { const u = clamp01((t - EV.papersFall - k * 0.05) / 1.2); fx(out, "letter", 300, 220, fxLetter, add(P.papers, -0.5 + k * 0.15, 3.8 - 3.2 * u, 0.4 + 0.1 * k), 0.32, 0.23, { rot: u * 4 + k }); }
      break;
    }
    case 21: {
      const Cw = P.crowd;
      for (let k = 0; k < 28; k++) {
        const row = Math.floor(k / 7), col = k % 7, kid = k % 5 === 2;
        const pos = add(Cw, (col - 3) * 1.1 + (hh(k, 1) - 0.5) * 0.4, 0, -row * 1.3 + (hh(k, 2) - 0.5) * 0.4);
        put(out, cam, t, 60 + k, kid ? KIDS[k % 5] : CROWD(k), kid ? `kidc${k % 5}` : `crowd${k % 8}`, pos,
          { mode: "stand", expr: (["grin", "laugh", "smile_closed", "relief", "smile"] as Expr[])[k % 5], wave: k % 4 === 1 ? 0.5 + 0.5 * Math.sin(t * 8 + k) : undefined, facing: k % 2 ? 1 : -1 }, { scale: kid ? 0.66 : 1 });
      }
      break;
    }
    case 23: {
      const H = P.home, wide = t >= T(1483);
      put(out, cam, t, 8, DAY, "day", add(H, -0.75, 0.32, -0.6), { mode: "stand", expr: ex(t, [[0, "neutral"], [EV.letter, "shock"], [T(1483), "sad"]]) }, { swaps: [EV.letter] });
      put(out, cam, t, 9, FAM73[0], "deb", add(H, 0.05, 0.16, -0.1), { mode: "stand", prop: "hands", expr: ex(t, [[0, "neutral"], [EV.letter, "shock"], [T(1483), "sad"]]), facing: -1 }, { swaps: [EV.letter] });
      put(out, cam, t, 10, FAM73[1], "son1", add(H, 0.85, 0.32, -0.6), { mode: "stand", expr: ex(t, [[0, "neutral"], [EV.letter + 0.2, "shock"], [T(1483), "stern"]]), facing: -1 });
      put(out, cam, t, 11, FAM73[2], "son2", add(H, 1.55, 0.32, -0.75), { mode: "stand", expr: ex(t, [[0, "neutral"], [EV.letter + 0.3, "nervous"], [T(1483), "sad"]]), facing: -1 });
      if (!wide) fx(out, "letterH", 300, 220, fxLetter, add(H, 0.05, 1.12, 0.05), 0.3, 0.22);
      break;
    }
    case 24: {
      const Cr = P.court;
      FAM23.forEach((o, k) => put(out, cam, t, 12 + k, o, `f23_${k}`, add(Cr, (k - 2) * 0.85, 0, (k % 2) * -0.3), {
        mode: "stand", expr: k === 4 ? "smile" : ex(t, [[0, "neutral"], [EV.settle, k % 2 ? "relief" : "smile_closed"]]), facing: k < 2 ? 1 : -1 }));
      if (t > EV.settle) sparkles(out, t, add(Cr, 0, 2.0, 0.2), 1.0, 6, 0.12, cam, 7);
      break;
    }
  }
  return out;
};
export { FPS, LEAD };
