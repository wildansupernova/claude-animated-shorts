// The forest short's cast as lit flat cards in the 3D world (pool / Actor / Fx machinery from the bridge short):
// Gary, the search team, the picnic family, the homeowner and the dog, plus unlit effect cards (dirt, sparkles,
// sweat, the corpse finder's eyes). stage(id, f) says who stands where in shot id at frame f.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxStars, fxShadow, fxContact, fxDog, fxShroomFace, fxDirt, fxSparkle, fxSweat,
  Outfit, Expr, FrontOpts, SideOpts, GARY, SEARCHER, PICNIC, HOMEOWNER,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, G2, GHOOK, DIGAT, DIG_A, DIG_B, digK, garyWalk, garyAway, burialG, SPOT, LAWN, CF, HIDE, PEEK, patchAt,
} from "./story";
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
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
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
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
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


// ---------------- who is where, per shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const GW: Who = { i: 7, o: GARY, okey: "gary" };
const STILL = { side: false, mirror: false };
/** expression at frame f from a [frame, expr] list (changes land LEAD frames before the word) */
const exprAt = (f: number, list: [number, Expr][]): Expr => { let e = list[0][1]; for (const [g, x] of list) if (f >= g - 2) e = x; return e; };
const swapsOf = (list: [number, Expr][]) => list.slice(1).map(([g]) => g / FPS);

const gary = (cam: CamInfo, f: number, out: Stage, x: number, z: number, fo: FrontOpts, sweat = false, list?: [number, Expr][]) => {
  const t = f / FPS, blink = fo.expr === "whistle" ? 0 : lidAt(t, 7, list ? swapsOf(list) : []);
  out.places.push(person(cam, GW, x, 0, z, STILL, { mode: "stand", facing: 0, ...fo, blink }, {}));
  blob(out, x, 0, z, 1.1);
  if (sweat) {
    const u = (f % 24) / 24;
    out.fx.push({ key: "sweat", cw: 120, ch: 160, draw: fxSweat, x: x + cam.right.x * 0.3, y: 1.6 - 0.12 * u, z: z + cam.right.z * 0.3, w: 0.075, h: 0.1 });
  }
};
const sparkles = (out: Stage, f: number, f0: number, pts: V3[], size = 0.35) =>
  pts.forEach(([x, y, z], i) => {
    const u = (f - f0 - i * 3) / 12;
    if (u > 0 && u < 1) out.fx.push({ key: `spk${q(u, 24)}`, cw: 300, ch: 300, draw: (p) => fxSparkle(p, q(u, 24)), x, y, z, w: size, h: size });
  });
const dirt = (out: Stage, f: number) => {
  const u = ((f - DIG_A) % 9) / 9;
  out.fx.push({ key: `dirt${q(u, 18)}`, cw: 400, ch: 300, draw: (p) => fxDirt(p, q(u, 18)), x: 0.05, y: 0.42, z: -0.85, w: 1.0, h: 0.75 });
};
/** the corpse finder's eyes: a little card just under its cap, facing the lens */
const shroomEyes = (cam: CamInfo, out: Stage, squint: number, look: number) => {
  const d = new THREE.Vector3(cam.pos.x - CF[0], 0, cam.pos.z - CF[2]).normalize();
  out.fx.push({ key: `eyes${q(squint, 20)}|${q(look, 10)}`, cw: 300, ch: 160, draw: (p) => fxShroomFace(p, q(squint, 20), q(look, 10)),
    x: CF[0] + d.x * 0.07, y: 0.15, z: CF[2] + d.z * 0.07, w: 0.1, h: 0.053 });
};

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: gary(cam, f, out, GHOOK[0], GHOOK[2], { expr: "nervous", look: f >= 37 && f < 60 ? 1 : -1 }, f >= 37); break;
    case 2: {
      const list: [number, Expr][] = [[120, "smile"], [176, "neutral"], [211, "smile"]];
      gary(cam, f, out, G2[0], G2[2], { expr: exprAt(f, list), prop: ["shovel", 0.12], look: f >= 176 && f < 211 ? 1 : 0 }, false, list);
      break;
    }
    case 3: {
      const g = burialG(f);
      if (f < 282) {
        gary(cam, f, out, DIGAT[0], DIGAT[2], { expr: "stern", prop: ["shovel", q(digK(g), 12)] });
        dirt(out, g);
      } else if (f < 298) gary(cam, f, out, DIGAT[0] + 0.5, DIGAT[2] + 0.2, { expr: "grin", prop: ["shovel", 0.1], look: -1 });
      else if (f < 328) gary(cam, f, out, DIGAT[0] + 0.25, DIGAT[2], { expr: "smile", prop: ["shovel", q(0.35 + 0.35 * Math.max(0, Math.sin((f - 298) * 0.45)), 12)] });
      else {
        const w = garyAway(f), view = viewOf(cam, w.x, w.z, w.dx, w.dz), ph = ((f / FPS) * 1.6) % 1;
        const so: SideOpts = { phase: w.moving ? ph : 0, expr: "whistle", mode: w.moving ? "march" : "stand", stomp: 0.55, stride: view.fs * 0.8 };
        out.places.push(person(cam, GW, w.x, 0, w.z, view, { mode: w.moving ? "stroll" : "stand", phase: ph, expr: "whistle", prop: ["shovel", 0.1] }, so));
        blob(out, w.x, 0, w.z, 1.1);
      }
      break;
    }
    case 4: {
      if (f < 403) {
        const list: [number, Expr][] = [[356, "nervous"], [377, "relief"]];
        gary(cam, f, out, HIDE[0], HIDE[2], { expr: exprAt(f, list), look: f < 377 ? (Math.floor((f - 356) / 10) % 2 ? 1 : -1) : 0 }, f < 377, list);
      }
      break;
    }
    case 6: {
      if (f < 803) {
        const P: V3[] = [[0.3, 0.3, -0.6], [-0.25, 0.4, 0.3], [0.1, 0.35, 0.9], [-0.35, 0.3, -0.9]];
        sparkles(out, f, 754, P, 0.28); sparkles(out, f, 771, P.map(([x, y, z]) => [-x, y + 0.05, -z * 0.8] as V3), 0.34);
      } else if (f < 859) {
        const g = 300 + ((f - 803) % 27);
        gary(cam, f, out, DIGAT[0], DIGAT[2], { expr: "stern", prop: ["shovel", q(digK(g), 12)] });
        dirt(out, g);
      } else if (f >= 898) sparkles(out, f, 912, [[1.45, 0.85, -1.75], [0.7, 0.95, -1.6]], 0.3);
      break;
    }
    case 7: {
      // the dog lifts its leg on "pee" (986), done by "spot"; trots to the side for the close-ups
      const lift = smooth((f - 978) / 6) * (1 - smooth((f - 1010) / 6)), pee = clamp01((f - 986) / 8) * (1 - smooth((f - 1006) / 5));
      const away = f >= 996;
      const dx = away ? -2.2 : 0, dz = away ? -0.6 : 0;
      const r = cam.right, ox = 0.32;
      const dogX = SPOT[0] + dx + r.x * ox, dogZ = SPOT[2] + dz + r.z * ox;
      const wag = q(Math.sin(f * 0.9) * 3, 2), bl = lidAt(t, 33) > 0.5 ? 1 : 0;
      out.places.push({ key: `dog|${q(lift, 12)}|${q(pee, 12)}|${wag}|${bl}`, x: dogX, y: 0, z: dogZ, size: [900, 1500, 1.5],
        draw: (p) => { p.g.save(); p.g.translate(40, 975 - 470 * 0.74); p.g.scale(0.74, 0.74); fxDog(p, q(lift, 12), q(pee, 12), wag, bl); p.g.restore(); } });
      blob(out, dogX, 0, dogZ, 1.0, 0.7);
      const hx = LAWN[0] - 2.0, hz = LAWN[2] - 2.6;
      const list: [number, Expr][] = [[946, "smile"], [978, "stern"], [1000, "pained"], [1069, "shock"]];
      out.places.push(person(cam, { i: 21, o: HOMEOWNER, okey: "home" }, hx, 0, hz, STILL, { mode: "stand", expr: exprAt(f, list), blink: lidAt(t, 21, swapsOf(list)), look: 1 }, {}));
      blob(out, hx, 0, hz);
      if (f >= 1069) sparkles(out, f, 1072, [[SPOT[0] + 0.3, 0.3, SPOT[2]], [SPOT[0] - 0.3, 0.35, SPOT[2] + 0.2]], 0.3);
      break;
    }
    case 8: {
      if (f >= 1251) shroomEyes(cam, out, f < 1290 ? 0.15 : smooth((f - 1290) / 6), f < 1272 ? -0.8 : 0);
      break;
    }
    case 10: {
      // the search team walks in a line toward the patch; the lead stops and points on "match"
      for (let i = 0; i < 3; i++) {
        const stop = i === 0 ? 1572 : 1576 + i * 3;
        const u = Math.min(f, stop) - 1516, x = -7.6 + 0.028 * u - (i === 0 ? 0 : 0.35), z = (i - 1) * 0.78;
        const moving = f < stop;
        const view = viewOf(cam, x, z, 1, 0), ph = ((f / FPS) * 1.4 + i * 0.33) % 1;
        const o = SEARCHER(i), who: Who = { i: 40 + i, o, okey: `srch${i}` };
        const expr: Expr = i === 0 && f >= 1572 ? "stern" : "neutral";
        if (moving) out.places.push(person(cam, who, x, 0, z, view, { mode: "stroll", phase: ph, expr, blink: lidAt(t, 40 + i) }, { phase: ph, expr, mode: "march", stomp: 0.5, stride: view.fs * 0.65, blink: lidAt(t, 40 + i) }));
        else out.places.push(person(cam, who, x, 0, z, STILL, { mode: "stand", expr, wave: i === 0 ? 0.6 : undefined, facing: 1, blink: lidAt(t, 40 + i) }, {}));
        blob(out, x, 0, z);
      }
      break;
    }
    case 11: {
      const shock = f >= 1818;
      const seats: [number, number, number, Expr][] = [[-0.38, -0.6, 0, "smile_closed"], [0.42, -0.25, 1, "grin"], [-0.05, 0.62, 2, "laugh"]];
      for (const [x, z, k, e] of seats) {
        const expr: Expr = shock ? "shock" : e;
        out.places.push(person(cam, { i: 60 + k, o: PICNIC[k], okey: `pic${k}` }, x, 0.03, z, STILL,
          { mode: "sit", expr, blink: lidAt(t, 60 + k, [1818 / FPS]), look: shock ? (x > 0 ? -1 : 1) : 0 }, {}, k === 2 ? 0.95 : 1));
        blob(out, x, 0.03, z, 1.2);
      }
      if (f >= 1818) out.fx.push({ key: `burst${q(clamp01((f - 1818) / 8), 16)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(clamp01((f - 1818) / 8), 16)),
        x: 0.08, y: 0.25, z: -0.45, w: 0.55, h: 0.55 });
      gary(cam, f, out, PEEK[0], PEEK[2], { expr: "nervous", look: 1 }, true);
      break;
    }
  }
  return out;
};
export { FPS, fxStars, patchAt };
