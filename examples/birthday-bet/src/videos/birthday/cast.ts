// The cast of "The Birthday Bet" as lit flat cards in the 3D world (same machinery as the bridge short: one canvas per
// distinct drawing in a pool, yaw-only billboards shaded by cardShade(), soft multiply contact blobs, unlit effect
// cards on the NOINK layer). Who stands where, what face they pull and which effect cards float over them is a pure
// function of (shot, frame), timed to the voice through story.ts.
import * as THREE from "three";
import {
  Pen, bodyFront, INK, SKIN, Outfit, Expr, FrontOpts, Prop,
  fxBurst, fxPuff, fxShadow, fxContact, fxTag, fxBubble, fxCake, fxCalPage, fxQuestion, fxChirp, fxSparkle,
} from "./toon";
import {
  FPS, SHOTS, SH, V3, G, N, R, DAVE, GARY, NINE, SEVENTEEN, RING2, RING3, CROWD, SQUAD, CUP_PAIR, BUBBLES, TAG0, tagAt, cue,
  HOOK_LINK, SHAKE_A, SHAKE_B, SHAKE_END, GROW50, GROW70, FLARE, CUP_CAKE, clamp01, smooth,
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
  d < 3.2 ? [1350, 2250, 2.25] : d < 6.5 ? [810, 1350, 1.35] : d < 15 ? [396, 660, 0.66] : [198, 330, 0.33];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
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
const light2D = (cam: CamInfo) => {
  const sx = SUN.dot(cam.right), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- life: blinks ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 600; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- outfits ----------------
const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067", "#a8714d", "#7d4f35"];
const SHIRTS = ["#3f6fb5", "#e2453c", "#2f8a4f", "#f2b53a", "#8c5ac9", "#2fa6a0", "#d9577a", "#5a7ab8", "#e07b39", "#4a9a5a", "#c43c6a", "#3a8fd4"];
const PANTS = ["#3b3f52", "#2f3550", "#5a4a3a", "#3a4a5a"];
const HAIRS = ["#3a2a20", "#6b4a2a", "#1f1a1a", "#c98a3a", "#8a3a1f", "#4a3a30"];
const PARTY: [string, string][] = [["#e2453c", "#ffd84a"], ["#3f6fb5", "#ffffff"], ["#2f8a4f", "#ffd84a"], ["#8c5ac9", "#7ee0f0"], ["#f2b53a", "#e2453c"], ["#2fa6a0", "#ffffff"]];
const DRESSES = ["#d9577a", "#5a8fc2", "#f2b53a", "#8c5ac9"];
/** a party guest: v picks the look (deterministic) */
export const guest = (v: number): Outfit => {
  const o: Outfit = { jacket: SHIRTS[v % 12], pants: PANTS[v % 4], boots: ["#4a3426", "#2a2a30", "#f4f1ea"][v % 3], skin: SKINS[(v * 5 + 1) % 6],
    hair: HAIRS[(v * 7 + 2) % 6], buttons: v % 3 === 0 ? "none" : undefined };
  o.hat = v % 5 === 1 || v % 5 === 3 ? "hair" : "party";
  if (o.hat === "party") o.party = PARTY[v % 6];
  if (v % 4 === 2) o.dress = DRESSES[v % 4];
  if (v % 9 === 4) o.moustache = "#3a2a20";
  return o;
};
export const DAVE_O: Outfit = { jacket: "#7b5ac9", pants: "#2f3550", boots: "#2a2a30", skin: SKINS[1], hat: "party", party: ["#f2b53a", "#e2453c"], hair: "#5a3b2a", buttons: "none" };
export const GARY_O: Outfit = { jacket: "#8a5a3c", pants: "#4a4a50", boots: "#3a2a20", skin: SKINS[2], hat: "hair", hair: "#8a8478", glasses: true, buttons: "#e8d8b0", moustache: "#6a645a" };
const RING_O: Outfit[] = Array.from({ length: N + 1 }, (_, k) => (k === DAVE ? DAVE_O : k === GARY ? GARY_O : guest(k * 3 + 1)));
RING_O[NINE] = { ...guest(10), hat: "party", party: ["#e2453c", "#ffd84a"], dress: undefined, jacket: "#2fa6a0" };
RING_O[SEVENTEEN] = { ...guest(17), hat: "party", party: ["#3f6fb5", "#ffffff"], dress: "#f2b53a", jacket: "#e2453c" };
const player = (k: number): Outfit => {
  const keeper = k === 1 || k === 12 || k === 23;
  return { jacket: keeper ? "#e8c93a" : "#d6343a", pants: "#f4f1ea", boots: "#1f1a1a", skin: SKINS[(k * 5 + 2) % 6], hat: "hair", hair: HAIRS[(k * 3) % 6],
    num: k, collar: keeper ? "#2a2a30" : "#ffffff", buttons: "none", moustache: k % 7 === 3 ? HAIRS[(k * 3) % 6] : undefined };
};

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, scale = 1, blinkOK = true): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / Math.max(0.05, scale);
  const [w, h, k] = tier(d);
  const f2: FrontOpts = { ...fo, mode: "stand", light: light2D(cam), seed: who.i % 7 + 1, blink: blinkOK && d < 15 ? fo.blink : 0 };
  return { key: `F|${who.okey}|${fkey(f2)}`, x, y, z, scale, draw: (p) => bodyFront(p, who.o, f2), size: [w, h, k] };
};

// ---------------- ground shadows ----------------
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- pops ----------------
/** 0 -> overshoot 1.12 -> 1 over ~6 frames (easeOutBack) */
const popK = (f: number, f0: number, n = 6) => { if (f < f0) return 0; const u = clamp01((f - f0) / n), s = 1.9; return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2; };
/** an effect card that floats over a guest, toward screen-right of the head by `side` metres */
const overHead = (cam: CamInfo, x: number, z: number, y: number, side: number): V3 => [x + cam.right.x * side, y, z + cam.right.z * side];

// ---------------- who does what ----------------
type Act = { expr: Expr; look?: number; wave?: number; reach?: number; cheer?: boolean; prop?: Prop; dx?: number; dz?: number };
const BASE: Expr[] = ["smile", "grin", "smile_closed", "smile", "grin", "smile_closed", "smile"];
const L2 = 2; // reactions 2 f ahead of the word
const ringAct = (id: number, f: number, k: number): Act => {
  const base = BASE[(k * 3) % 7];
  const S = (n: number) => SH[n];
  switch (id) {
    case 1:
      if (k === NINE || k === SEVENTEEN) return { expr: f < HOOK_LINK[0] - L2 ? "smile" : f < cue(0, "birthday") + 4 ? "shock" : "grin", look: k === NINE ? -1 : 1 };
      return { expr: f >= tagAt(k) && f < tagAt(k) + 10 ? "grin" : base };
    case 2:
      if (k === DAVE) return f < cue(1, "and") - L2
        ? { expr: f < cue(1, "counts") - L2 ? "smile" : "grin", wave: f < cue(1, "counts") - L2 ? undefined : q(Math.sin((f - cue(1, "counts")) * 0.42), 6) }
        : { expr: "grin", prop: "cashUp" };
      return { expr: k === GARY ? "stern" : base };
    case 3: return { expr: k === DAVE ? "smile_closed" : "laugh" };
    case 4:
      if (k === GARY) return f < cue(4, "Anybody") - L2 ? { expr: "stern" } : f < cue(4, "third") + 10 ? { expr: "talk", wave: 1 } : { expr: "stern", wave: 1 };
      return { expr: "neutral", look: k % 2 ? 1 : -1 };
    case 5: return { expr: k === GARY ? "stern" : "neutral", look: Math.round(Math.sin(k * 2.1 + Math.floor(f / 9))) };
    case 6: return k === GARY ? { expr: "smile", prop: "palm" } : { expr: "neutral" };
    case 7: {
      const b = BUBBLES.find((x) => x.k === k && x.shot === 7);
      if (b && f >= b.a && f < b.a + 9) return { expr: "talk" };
      return { expr: k === DAVE ? "grin" : base, prop: k === DAVE ? "cash" : null };
    }
    case 8: case 9: {
      if (k === NINE) {
        const c = cue(8, "September") - L2;
        if (id === 8) return { expr: f < c ? "smile" : f < c + 16 ? "talk" : "grin" };
        return { expr: f < cue(9, "So") + 4 ? "grin" : "shock", look: -1 };
      }
      if (k === SEVENTEEN) return { expr: f < cue(9, "seventeen") - L2 ? "smile" : f < cue(9, "seventeen") + 12 ? "talk" : "grin" };
      return { expr: base };
    }
    case 10:
      if (k === NINE || k === SEVENTEEN) return { expr: "laugh", cheer: true };
      if (k === GARY) return { expr: "dazed" };
      if (k === DAVE) return { expr: "grin", prop: "cashUp" };
      return { expr: f < cue(10, "most") - L2 ? "shock" : k % 2 ? "laugh" : "grin" };
    case 11: return { expr: k === GARY ? "shock" : "neutral" };
    case 12: case 13: case 15: return { expr: k === GARY ? "nervous" : base };
    case 14: {
      if (f < SHAKE_A - 2 || f >= SHAKE_END) return { expr: base };
      const odd = f < SHAKE_B; // phase A: (1,2),(3,4)..(21,22); phase B: (2,3),(4,5)..(22,23)
      let partner = 0;
      if (odd) partner = k % 2 ? (k + 1 <= 22 ? k + 1 : 0) : k - 1;
      else partner = k % 2 ? (k - 1 >= 2 ? k - 1 : 0) : (k + 1 <= 23 ? k + 1 : 0);
      if (!partner) return { expr: base };
      // reach toward the partner in screen space is set in stage() (it knows the camera); here: which side on the ring
      return { expr: "grin", reach: partner > k ? 1 : -1 };
    }
    case 16: return { expr: base };
    case 19:
      if (k === DAVE) return f < cue(21, "make") - L2 ? { expr: "grin", prop: "cash" } : { expr: "wink", prop: "cashUp" };
      if (k === GARY) return { expr: "stern" };
      return { expr: f >= cue(21, "bet") - L2 && k % 3 === 0 ? "laugh" : base, cheer: f >= cue(21, "bet") - L2 && k % 3 === 0 };
    default: return { expr: base };
  }
};

/** reach sign in SCREEN space: the arm that points from guest k toward guest j as the camera sees them */
const screenSide = (cam: CamInfo, a: V3, b: V3) => Math.sign((b[0] - a[0]) * cam.right.x + (b[2] - a[2]) * cam.right.z) || 1;

const shakePartner = (f: number, k: number) => {
  if (f < SHAKE_A - 2 || f >= SHAKE_END) return 0;
  if (f < SHAKE_B) return k % 2 ? (k + 1 <= 22 ? k + 1 : 0) : k - 1;
  return k % 2 ? (k - 1 >= 2 ? k - 1 : 0) : (k + 1 <= 23 ? k + 1 : 0);
};

const ring = (id: number, f: number, cam: CamInfo, out: Stage) => {
  for (let k = 1; k <= N; k++) {
    const g = G(k);
    let [x, , z] = g;
    const act = ringAct(id, f, k);
    let reach = act.reach ?? 0;
    if (id === 14) {
      const j = shakePartner(f, k);
      if (j) {
        const pj = G(j);
        reach = screenSide(cam, g, pj);
        // step 15 cm toward the partner so the hands meet
        const dx = pj[0] - x, dz = pj[2] - z, l = Math.hypot(dx, dz);
        x += (dx / l) * 0.15; z += (dz / l) * 0.15;
      }
    }
    const fo: FrontOpts = { expr: act.expr, look: act.look ?? 0, wave: act.wave, reach, cheer: act.cheer, prop: act.prop ?? null, blink: act.expr === "talk" ? 0 : lidAt(f, k) };
    out.places.push(person(cam, { i: k, o: RING_O[k], okey: `r${k}` }, x, 0, z, fo));
    blob(out, x, 0, z);
  }
};

const outer = (f: number, cam: CamInfo, out: Stage) => {
  const groups = [{ ...RING2, t: GROW50, base: 100 }, { ...RING3, t: GROW70, base: 200 }];
  for (const gr of groups) for (let j = 1; j <= gr.n; j++) {
    const f0 = Math.round(gr.t[0] + ((j - 1) * (gr.t[1] - gr.t[0])) / gr.n);
    if (f < f0) continue;
    const [x, , z] = G(j, gr.r, gr.n, gr.a0), sc = popK(f, f0, 7);
    const v = gr.base + j, o = guest(v);
    out.places.push(person(cam, { i: v, o, okey: `g${v % 36}` }, x, 0, z, { expr: f < f0 + 12 ? "grin" : BASE[v % 7], blink: 0 }, Math.max(0.05, sc), false));
    if (sc > 0.6) blob(out, x, 0, z, sc);
    if (f < f0 + 12) { const u = q((f - f0) / 12, 30); out.fx.push({ key: `puff${u}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, u), x, y: 0.4, z, w: 1.4, h: 1.4, soft: true }); }
  }
};

const squad = (f: number, cam: CamInfo, out: Stage) => {
  for (let k = 1; k <= 23; k++) {
    const [x, , z] = SQUAD(k), hit = CUP_PAIR.includes(k) && f >= CUP_CAKE;
    const fo: FrontOpts = { expr: hit ? "laugh" : k % 4 === 1 ? "smile" : "stern", blink: lidAt(f, k + 50), cheer: hit && f >= CUP_CAKE + 6 };
    out.places.push(person(cam, { i: k + 50, o: player(k), okey: `p${k}` }, x, 0, z, fo));
    blob(out, x, 0, z);
    if (CUP_PAIR.includes(k) && f >= CUP_CAKE) {
      const s = popK(f, CUP_CAKE, 6), [px, py, pz] = overHead(cam, x, z, 2.3, 0);
      out.fx.push({ key: "cake", cw: 260, ch: 260, draw: fxCake, x: px, y: py, z: pz, w: 0.55 * s, h: 0.55 * s, top: true });
    }
  }
};

const crowd = (f: number, cam: CamInfo, out: Stage) => {
  out.places.push(person(cam, { i: GARY, o: GARY_O, okey: "gary" }, 0, 0, 0, { expr: f < cue(20, "need") ? "sad" : "nervous", look: Math.round(Math.sin(f / 14)), blink: lidAt(f, GARY) }));
  blob(out, 0, 0, 0);
  CROWD.forEach(([x, z], i) => {
    const v = 300 + i, o = guest(v), d = Math.hypot(x, z);
    const expr: Expr = d < 2.2 ? (["neutral", "smile", "smile_closed"] as Expr[])[i % 3] : BASE[i % 7];
    out.places.push(person(cam, { i: v, o, okey: `g${v % 36}` }, x, 0, z, { expr, look: d < 2.2 ? (x > 0 ? -1 : 1) : 0, blink: d < 3 ? lidAt(f, v) : 0 }, 1, d < 3));
    blob(out, x, 0, z);
  });
};

// ---------------- effects ----------------
const bubbles = (id: number, f: number, cam: CamInfo, out: Stage, pos: (k: number) => V3 | null) => {
  for (const b of BUBBLES) {
    if (f < b.a || f >= b.b || (b.shot && b.shot !== id)) continue;
    if (!b.shot && !(id >= 8 && id <= 10)) continue;
    const g = pos(b.k);
    if (!g) continue;
    const d = Math.hypot(cam.pos.x - g[0], cam.pos.z - g[2]), near = d < 4.6;
    const s = popK(f, b.a, 6) * (near ? 0.8 : id === 7 ? 1.45 : id === 10 ? 1.7 : 1.1), side = (near ? 0.08 : 0.5) * (b.k === SEVENTEEN && id === 10 ? -1 : 1);
    const [x, y, z] = overHead(cam, g[0], g[2], near ? 2.44 : 2.32 + 0.22 * (s - 1), side);
    out.fx.push({ key: `bub|${b.text}|${b.hot ? 1 : 0}`, cw: 560, ch: 340, draw: (p) => fxBubble(p, b.text, "#ffffff", INK, !!b.hot), x, y, z, w: s, h: 0.607 * s, top: true });
  }
};

/** everything with a face (and the effect cards over them) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.scene === "party") {
    ring(id, f, cam, out);
    if (id === 16) outer(f, cam, out);
    bubbles(id, f, cam, out, (k) => G(k));
  }
  if (s.scene === "pitch") squad(f, cam, out);
  if (s.scene === "crowd") { crowd(f, cam, out); bubbles(id, f, cam, out, (k) => (k === GARY ? [0, 0, 0] : null)); }

  // hook: number tags 1..23 pop round the ring
  if (id === 1) for (let k = 1; k <= N; k++) {
    const f0 = tagAt(k);
    if (f < f0) continue;
    const sc = popK(f, f0, 5), hot = (k === NINE || k === SEVENTEEN) && f >= HOOK_LINK[0] - L2, g = G(k);
    if (Math.hypot(cam.pos.x - g[0], cam.pos.y - 2.5, cam.pos.z - g[2]) < 5) continue; // a tag right at the lens is a giant cut-off disc
    out.fx.push({ key: `tag${k}${hot ? "h" : ""}`, cw: 220, ch: 220, draw: (p) => fxTag(p, k, "#ffd84a", hot), x: g[0], y: 2.5, z: g[2], w: (hot ? 0.85 : 0.62) * sc, h: (hot ? 0.85 : 0.62) * sc, top: true });
  }
  // the match: cake icons over 9 + 17
  if ((id === 1 && f >= cue(0, "birthday") - L2) || id === 10) for (const k of [NINE, SEVENTEEN]) {
    const g = G(k), s0 = id === 1 ? cue(0, "birthday") - L2 : SH[10].a, sc = popK(f, s0, 6);
    out.fx.push({ key: "cake", cw: 260, ch: 260, draw: fxCake, x: g[0], y: 3.3, z: g[2], w: 1.15 * sc, h: 1.15 * sc, top: true });
  }
  // "three hundred sixty-five days": a big 365 page, then a burst of calendar pages
  if (id === 3) {
    const f0 = cue(3, "three") - L2, f1 = cue(3, "sixty-five") - L2;
    if (f >= f0) { const sc = popK(f, f0, 7); out.fx.push({ key: "cal365", cw: 300, ch: 340, draw: (p) => fxCalPage(p, 365, "DAYS"), x: 0, y: 2.75, z: 0, w: 1.35 * sc, h: 1.53 * sc, top: true }); }
    if (f >= f1) for (let i = 0; i < 18; i++) {
      const u = (f - f1) / 34;
      if (u >= 1) continue;
      const a = (i / 18) * Math.PI * 2 + hh(i) * 0.3, sp = 2.4 + 2.2 * hh(i, 2), day = 1 + Math.floor(hh(i, 3) * 28);
      const dx = Math.cos(a) * sp * u * 1.15, dy = Math.sin(a) * sp * u * 0.85 - 0.9 * u * u;
      const px = cam.right.x * dx + cam.up.x * dy, py = 2.75 + cam.up.y * dy, pz = cam.right.z * dx + cam.up.z * dy;
      out.fx.push({ key: `calp${day}`, cw: 300, ch: 340, draw: (p) => fxCalPage(p, day), x: px, y: py, z: pz, w: 0.42, h: 0.48, rot: (hh(i, 4) - 0.5) * 6 * u, top: true });
    }
  }
  // silence: crickets
  if (id === 5) for (let i = 0; i < 3; i++) {
    const g = G([14, 16, 18][i]), t = f / FPS, u = ((f - SH[5].a) / 9 + i * 0.6) % 2;
    if (u > 1.4) continue;
    out.fx.push({ key: `chirp${q(t * 2 + i, 4)}`, cw: 300, ch: 150, draw: (p) => fxChirp(p, t * 2 + i), x: g[0], y: 2.35 + 0.06 * Math.sin(t * 8 + i), z: g[2], w: 1.0, h: 0.5, top: true });
  }
  // "Wait, how?": question marks
  if (id === 11) {
    const f0 = cue(11, "how") - L2;
    [[-0.27, 1.74, 0], [0.28, 1.8, 3], [0.0, 1.9, 6]].forEach(([side, y, d], i) => {
      if (f < f0 + d) return;
      const g = G(GARY), sc = popK(f, f0 + d, 5), [x, , z] = overHead(cam, g[0], g[2], 0, side);
      out.fx.push({ key: "q", cw: 200, ch: 280, draw: fxQuestion, x, y: y as number, z, w: 0.16 * sc, h: 0.22 * sc, rot: (i - 1) * 0.25, top: true });
    });
  }
  // handshakes: a sparkle where each pair's hands meet (on the shake, and twinkling on "tiny chance at a match")
  if (id === 14 && f >= SHAKE_A - 2) {
    const phaseStart = f < SHAKE_B ? SHAKE_A : SHAKE_B, tw0 = cue(16, "tiny") - L2;
    for (let k = 1; k <= N; k++) {
      const j = shakePartner(f, k);
      if (!j || j < k) continue;
      const a = G(k), b = G(j), m: V3 = [(a[0] + b[0]) / 2, 1.24, (a[2] + b[2]) / 2];
      const age = f - phaseStart - (k % 4), tw = f >= tw0 ? ((f - tw0 + k * 5) % 22) / 22 : 1;
      const u = age >= 0 && age < 14 ? age / 14 : tw < 1 ? tw : -1;
      if (u < 0) continue;
      const uq = q(u, 15);
      out.fx.push({ key: `spark${uq}`, cw: 300, ch: 300, draw: (p) => fxSparkle(p, uq), x: m[0], y: m[1], z: m[2], w: 0.42, h: 0.42, top: true });
    }
  }
  // "guaranteed": a burst over the centre
  if (id === 16 && f >= FLARE && f < FLARE + 12) { const u = q((f - FLARE) / 12, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: 0, y: 4, z: 0, w: 5, h: 5, top: true }); }
  // the snap of the match on "seventeen"
  if (id === 9) {
    const f0 = cue(9, "seventeen") - 1;
    if (f >= f0 && f < f0 + 10) { const u = q((f - f0) / 10, 30), g = G(SEVENTEEN), [x, , z] = overHead(cam, g[0], g[2], 0, 0.5); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x, y: 2.3, z, w: 1.7, h: 1.7, top: true }); }
  }
  return out;
};
export { FPS, R, TAG0 };
export const smoothK = smooth;
