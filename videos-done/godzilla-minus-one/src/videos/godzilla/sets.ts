// The places of the explainer, each a static group built once (merged geometry per material, two-tone shading, painted
// Canvas2D textures) and placed far apart; only the current shot's place is visible. Coordinates are place-local:
// y up, metres. Things that move per shot (planets, ships, branches, ice) are exported handles posed in world.ts.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { sign, FONT } from "./fx2d";
import { Pen } from "./toon";

export const PLACES = {
  sea: [0, 0, 0], studio: [8000, 0, 0], island: [-8000, 0, 0], ruins: [0, 0, 8000], city: [0, 0, -8000], rooms: [8000, 0, 8000],
} as const;
export type PlaceId = keyof typeof PLACES;

// ---------------- helpers ----------------
const L1 = (a: number, b: number, t: number) => a + (b - a) * t;
const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const mats = new Map<string, THREE.Material>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};
const col = (c: string) => lam("c" + c, () => ({ color: c }));
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep = false) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 1;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
/** collects geometry per material and merges it into one mesh each */
class Batch {
  private m = new Map<string, { mat: THREE.Material; gs: THREE.BufferGeometry[] }>();
  private ids = new Map<THREE.Material, number>();
  /** merged per material AND per 40 m cell, so three can sort the chunks front to back (early-z on the CPU rasteriser) */
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4) {
    let gg = g.index ? g.toNonIndexed() : g;
    if (mx) gg = gg.applyMatrix4(mx);
    if (!gg.getAttribute("uv")) gg.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(gg.getAttribute("position").count * 2), 2));
    for (const k of Object.keys(gg.attributes)) if (!["position", "normal", "uv"].includes(k)) gg.deleteAttribute(k);
    gg.computeBoundingBox();
    const bb = gg.boundingBox!, big = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) > 120;
    const cx = big ? "B" : Math.floor((bb.min.x + bb.max.x) / 80), cz = big ? "B" : Math.floor((bb.min.z + bb.max.z) / 80);
    let id = this.ids.get(mat); if (id === undefined) { id = this.ids.size; this.ids.set(mat, id); }
    const key = `${id}|${cx}|${cz}`, l = this.m.get(key);
    if (l) l.gs.push(gg); else this.m.set(key, { mat, gs: [gg] });
  }
  build(parent: THREE.Object3D) {
    for (const { mat, gs } of this.m.values()) { const g = mergeGeometries(gs, false); if (g) { g.computeBoundingSphere(); parent.add(new THREE.Mesh(g, mat)); } }
    this.m.clear();
  }
}
const M4 = (x: number, y: number, z: number, ry = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(...s));
/** box from min corner to max corner with uvs in metres / tile */
const boxG = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  if (tile) { // world-scaled uvs per face
    const uv = g.getAttribute("uv") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
      const [su, sv] = ax > 0.5 ? [d, h] : ay > 0.5 ? [w, d] : [w, h];
      uv.setXY(i, (uv.getX(i) * su) / tile, (uv.getY(i) * sv) / tile);
    }
  }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
};
const ground = (b: Batch, size: number, mat: THREE.Material, y = 0, tile = 8, cx = 0, cz = 0) => {
  const g = new THREE.PlaneGeometry(size, size); g.rotateX(-Math.PI / 2);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * size) / tile, (uv.getY(i) * size) / tile);
  g.translate(cx, y, cz); b.add(g, mat);
};
const noise = (g: CanvasRenderingContext2D, w: number, h: number, cols: string[], n: number, r: [number, number], seed = 1) => {
  const R = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = 0.35 + 0.4 * R(); g.beginPath(); g.ellipse(R() * w, R() * h, r[0] + R() * (r[1] - r[0]), (r[0] + R() * (r[1] - r[0])) * 0.6, R() * 3, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
};
// ---------------- painted textures ----------------
const TEX = new Map<string, THREE.Texture>();
const tex = (key: string, make: () => THREE.Texture) => { let t = TEX.get(key); if (!t) { t = make(); TEX.set(key, t); } return t; };
/** facade with a window grid: one tile = one floor x one bay (4 m x 4 m) */
const facadeTex = (wall: string, win: string, frame: string, seed: number, lit = 0) => tex(`fac${wall}${win}${lit}`, () => canvasTex(128, 128, (g) => {
  g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
  noise(g, 128, 128, [wall, "#00000022"], 10, [6, 18], seed);
  g.fillStyle = frame; g.fillRect(26, 22, 76, 78);
  g.fillStyle = win; g.fillRect(32, 28, 64, 66);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(36, 32, 18, 58);
  if (lit) { g.fillStyle = `rgba(255,220,140,${lit})`; g.fillRect(32, 28, 64, 66); }
  g.fillStyle = "#00000030"; g.fillRect(0, 118, 128, 10);
}, true));
const tilesTex = (a: string, b: string, n = 2, key = "") => tex(`tile${a}${b}${n}${key}`, () => canvasTex(128, 128, (g) => {
  const s = 128 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s); }
  g.strokeStyle = "#00000040"; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 128); g.moveTo(0, i * s); g.lineTo(128, i * s); g.stroke(); }
}, true));
const speckTex = (base: string, cols: string[], key: string, n = 60, r: [number, number] = [4, 14]) => tex("sp" + key, () => canvasTex(256, 256, (g) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, cols, n, r, key.length * 7); }, true));
const stoneTex = (base: string, key: string) => tex("st" + key, () => canvasTex(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, [base, "#00000018", "#ffffff18"], 40, [6, 20], 3);
  g.strokeStyle = "#00000055"; g.lineWidth = 4;
  for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(0, r * 64); g.lineTo(256, r * 64); g.stroke(); for (let c = 0; c < 3; c++) { const x = (c * 96 + (r % 2) * 48) % 256; g.beginPath(); g.moveTo(x, r * 64); g.lineTo(x, r * 64 + 64); g.stroke(); } }
}, true));
const stripeTex = (a: string, b: string, key: string) => tex("str" + key, () => canvasTex(256, 256, (g) => { g.fillStyle = a; g.fillRect(0, 0, 256, 256); g.fillStyle = b; g.fillRect(0, 0, 256, 128); noise(g, 256, 256, [a, b], 30, [4, 10], 9); }, true));
const texMat = (key: string, t: THREE.Texture, color = "#ffffff") => lam("t" + key, () => ({ map: t, color }));

// ---------------- reusable pieces ----------------
const tree = (b: Batch, x: number, z: number, h: number, leaf: THREE.Material, trunk: THREE.Material, y = 0, kind: "round" | "cone" = "round") => {
  b.add(new THREE.CylinderGeometry(0.18 * h / 4, 0.25 * h / 4, h * 0.45, 6), trunk, M4(x, y + h * 0.22, z));
  if (kind === "cone") b.add(new THREE.ConeGeometry(h * 0.3, h * 0.8, 7), leaf, M4(x, y + h * 0.6, z));
  else b.add(new THREE.IcosahedronGeometry(h * 0.32, 1), leaf, M4(x, y + h * 0.65, z, 0, [1, 0.85, 1]));
};
const gable = (b: Batch, x0: number, x1: number, z0: number, z1: number, y: number, h: number, roof: THREE.Material, wall: THREE.Material) => {
  // roof along x: triangle prism with 0.5 m overhang
  const o = 0.5, zc = (z0 + z1) / 2, sh = new THREE.Shape([new THREE.Vector2(z0 - o, 0), new THREE.Vector2(zc, h), new THREE.Vector2(z1 + o, 0)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0 + 2 * o, bevelEnabled: false });
  g.rotateY(Math.PI / 2); g.translate(x0 - o, y, 0);
  b.add(g, roof);
  const tri = new THREE.Shape([new THREE.Vector2(z0, 0), new THREE.Vector2(zc, h * 0.92), new THREE.Vector2(z1, 0)]);
  for (const x of [x0, x1]) { const t = new THREE.ShapeGeometry(tri); t.rotateY(x === x0 ? -Math.PI / 2 : Math.PI / 2); t.translate(x, y, 0); b.add(t, wall); }
};

// ---------------- places ----------------
export type Handles = {
  water: THREE.Mesh; boat: THREE.Group; ships: THREE.Group[]; tug: THREE.Group; shinden: THREE.Group; zero: THREE.Group;
  board: THREE.Mesh; screen: THREE.Mesh; tram: THREE.Group; marquee: THREE.Mesh;
};
const basic = (key: string, make: () => THREE.MeshBasicMaterialParameters) => {
  let m = mats.get("b" + key);
  if (!m) { m = new THREE.MeshBasicMaterial(make()); mats.set("b" + key, m); }
  return m;
};
/** text label as an unlit plane (hull names, shop signs, marquee) */
const label = (w: number, h: number, lines: string[], bg: string, fg: string, px = 120) => {
  const t = canvasTex(Math.round(w * 64), Math.round(h * 64), (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${px}px ${FONT}`;
    lines.forEach((l, i) => g.fillText(l, g.canvas.width / 2, ((i + 0.5) * g.canvas.height) / lines.length + 4));
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  m.layers.set(NOINK);
  return m;
};
const woodTex = (base: string, key: string) => tex("wd" + key, () => canvasTex(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, [base, "#00000014", "#ffffff12"], 30, [4, 12], 5);
  g.strokeStyle = "#00000050"; g.lineWidth = 3; for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
}, true));
const brickTex = (base: string, key: string) => tex("br" + key, () => canvasTex(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, [base, "#00000018"], 30, [4, 10], 6);
  g.strokeStyle = "#00000045"; g.lineWidth = 3;
  for (let r = 0; r < 8; r++) { g.beginPath(); g.moveTo(0, r * 32); g.lineTo(256, r * 32); g.stroke(); for (let c = 0; c < 4; c++) { const x = (c * 64 + (r % 2) * 32) % 256; g.beginPath(); g.moveTo(x, r * 32); g.lineTo(x, r * 32 + 32); g.stroke(); } }
}, true));
const tinTex = (base: string, key: string) => tex("tn" + key, () => canvasTex(128, 128, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, ["#7a4a2a40", "#00000020"], 16, [6, 18], 8);
  g.strokeStyle = "#00000040"; g.lineWidth = 3; for (let x = 0; x <= 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
}, true));
/** shop-house / western block facade with a window grid */
const winTex = (wall: string, win: string, key: string, arch = false, lit = 0) => tex("wn" + key, () => canvasTex(128, 128, (g) => {
  g.fillStyle = wall; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, [wall, "#00000016"], 10, [6, 16], key.length);
  g.fillStyle = "#00000030"; g.fillRect(0, 0, 128, 8);
  g.fillStyle = mixHex(win, "#000000", 0.2); if (arch) { g.beginPath(); g.moveTo(36, 100); g.lineTo(36, 46); g.arc(64, 46, 28, Math.PI, 0); g.lineTo(92, 100); g.fill(); } else g.fillRect(34, 30, 60, 70);
  g.fillStyle = win; if (arch) { g.beginPath(); g.moveTo(42, 96); g.lineTo(42, 48); g.arc(64, 48, 22, Math.PI, 0); g.lineTo(86, 96); g.fill(); } else g.fillRect(40, 36, 48, 58);
  if (lit) { g.fillStyle = `rgba(255,214,140,${lit})`; g.fillRect(40, 36, 48, 58); }
  g.fillStyle = "#ffffff30"; g.fillRect(44, 40, 10, 50);
  g.fillStyle = "#00000028"; g.fillRect(28, 100, 72, 8);
}, true));
const mixHex = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

// ---- vehicles ----
const makeBoat = () => { // Lucky Dragon No. 5: a wooden tuna boat, bow toward +x, waterline at y = 0
  const g = new THREE.Group(), b = new Batch();
  const hullShape = new THREE.Shape([new THREE.Vector2(-13, -2.6), new THREE.Vector2(8, -3), new THREE.Vector2(12, -1.8), new THREE.Vector2(14.5, 0), new THREE.Vector2(12, 1.8), new THREE.Vector2(8, 3), new THREE.Vector2(-13, 2.6), new THREE.Vector2(-13.6, 0)]);
  const hull = new THREE.ExtrudeGeometry(hullShape, { depth: 3.2, bevelEnabled: false }); hull.rotateX(-Math.PI / 2); hull.translate(0, -1.2, 0);
  b.add(hull, col("#efe9dc"));
  const strip = new THREE.ExtrudeGeometry(hullShape, { depth: 0.9, bevelEnabled: false }); strip.rotateX(-Math.PI / 2); strip.scale(1.01, 1, 1.03); strip.translate(0, -1.3, 0);
  b.add(strip, col("#7a3a32"));
  const deckS = new THREE.Shape([new THREE.Vector2(-12.6, -2.3), new THREE.Vector2(8, -2.7), new THREE.Vector2(13.5, 0), new THREE.Vector2(8, 2.7), new THREE.Vector2(-12.6, 2.3)]);
  const deck = new THREE.ExtrudeGeometry(deckS, { depth: 0.2, bevelEnabled: false }); deck.rotateX(-Math.PI / 2); deck.translate(0, 1.9, 0);
  b.add(deck, texMat("deck", woodTex("#b08a5a", "deck")));
  // bulwark rails
  for (const s of [-1, 1]) b.add(boxG(-12.5, 2.0, s * 2.5 - 0.08, 9, 2.7, s * 2.5 + 0.08), col("#efe9dc"));
  // wheelhouse + cabin
  b.add(boxG(-10.5, 2.0, -1.8, -5.5, 4.6, 1.8, 2), texMat("whouse", winTex("#efe9dc", "#3a4a5a", "whouse")));
  b.add(boxG(-10.8, 4.6, -2.0, -5.2, 4.85, 2.0), col("#3a3d47"));
  b.add(boxG(-12.4, 2.0, -1.4, -10.5, 3.6, 1.4), col("#d8d0c0"));
  // masts, booms, funnel
  b.add(new THREE.CylinderGeometry(0.14, 0.18, 9, 8), col("#7a5a3a"), M4(5, 6.4, 0));
  b.add(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), col("#7a5a3a"), M4(-8, 8, 0));
  const boom = new THREE.CylinderGeometry(0.08, 0.08, 6, 6); boom.rotateZ(Math.PI / 2 - 0.35); b.add(boom, col("#7a5a3a"), M4(7.5, 5, 0));
  b.add(new THREE.CylinderGeometry(0.45, 0.5, 1.6, 10), col("#3a3d47"), M4(-6.5, 5.6, 0));
  // line reels, buoys, crates on deck
  for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12), col("#8a6a4a"), M4(-3 + i * 2.2, 2.4, (i % 2 ? -1 : 1) * 1.2, 0));
  for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.32, 10, 8), col(i % 2 ? "#e8b33c" : "#d8584a"), M4(1 + (i % 3) * 0.9, 2.45, -1.6 + Math.floor(i / 3) * 0.8));
  b.build(g);
  for (const s of [-1, 1]) { const n = label(6.5, 0.9, ["LUCKY DRAGON No.5"], "#efe9dc", "#2a2a36", 44); n.position.set(9, 1.1, s * 2.72); n.rotation.y = s > 0 ? 0 : Math.PI; n.rotation.y += s * -0.12; g.add(n); }
  const flag = label(1.2, 0.8, [""], "#d8584a", "#d8584a"); flag.position.set(5.6, 10.4, 0); g.add(flag);
  return g;
};
const makeShip = (kind: "destroyer" | "tug") => {
  const g = new THREE.Group(), b = new Batch(), grey = col(kind === "tug" ? "#6a4a3a" : "#8a9098"), dark = col("#3a3d47");
  const L = kind === "tug" ? 16 : 44, W = kind === "tug" ? 4.5 : 7;
  const sh = new THREE.Shape([new THREE.Vector2(-L / 2, -W / 2), new THREE.Vector2(L / 4, -W / 2), new THREE.Vector2(L / 2, 0), new THREE.Vector2(L / 4, W / 2), new THREE.Vector2(-L / 2, W / 2)]);
  const hull = new THREE.ExtrudeGeometry(sh, { depth: kind === "tug" ? 2.6 : 4, bevelEnabled: false }); hull.rotateX(-Math.PI / 2); hull.translate(0, -1.2, 0);
  b.add(hull, grey);
  if (kind === "tug") {
    b.add(boxG(-5, 1.4, -1.6, 1, 4, 1.6, 2), texMat("tugh", winTex("#e8e2d0", "#3a4a5a", "tugh")));
    b.add(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 10), col("#d8584a"), M4(-1, 5, 0));
  } else {
    b.add(boxG(-6, 2.8, -2.4, 6, 6, 2.4), grey); b.add(boxG(2, 6, -1.6, 6, 8.5, 1.6), grey);
    b.add(new THREE.CylinderGeometry(1, 1.1, 4, 10), dark, M4(-2, 8, 0));
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 9, 6), dark, M4(4, 12, 0));
    for (const x of [14, -14]) { b.add(new THREE.CylinderGeometry(1.4, 1.6, 1.2, 10), grey, M4(x, 3.4, 0)); const gun = new THREE.CylinderGeometry(0.18, 0.18, 5, 6); gun.rotateZ(Math.PI / 2); b.add(gun, dark, M4(x + Math.sign(x) * 2.5, 3.7, 0)); }
  }
  b.build(g);
  return g;
};
const makeZero = () => { // a Zero fighter: nose toward +x, wheels on the ground at y = 0
  const g = new THREE.Group(), b = new Batch(), top = col("#7d8a6e"), belly = col("#b8b8ae"), dark = col("#2a2a30");
  const fus = new THREE.CylinderGeometry(0.62, 0.3, 8.5, 12); fus.rotateZ(Math.PI / 2); b.add(fus, top, M4(0, 2.0, 0));
  const cowl = new THREE.CylinderGeometry(0.7, 0.66, 1.2, 14); cowl.rotateZ(Math.PI / 2); b.add(cowl, dark, M4(4.6, 2.0, 0));
  b.add(new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), basic("canopy", () => ({ color: "#a8c4d0" })), M4(0.6, 2.4, 0, 0, [1.8, 0.9, 0.8]));
  const wing = new THREE.Shape([new THREE.Vector2(-1.4, -6), new THREE.Vector2(0.8, -6), new THREE.Vector2(1.6, 0), new THREE.Vector2(0.8, 6), new THREE.Vector2(-1.4, 6), new THREE.Vector2(-1.8, 0)]);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.18, bevelEnabled: false }); wg.rotateX(-Math.PI / 2); wg.translate(1, 1.55, 0); b.add(wg, top);
  const tail = new THREE.Shape([new THREE.Vector2(-0.8, -2.2), new THREE.Vector2(0.4, -2.2), new THREE.Vector2(0.6, 0), new THREE.Vector2(0.4, 2.2), new THREE.Vector2(-0.8, 2.2)]);
  const tg = new THREE.ExtrudeGeometry(tail, { depth: 0.12, bevelEnabled: false }); tg.rotateX(-Math.PI / 2); tg.translate(-3.6, 2.05, 0); b.add(tg, top);
  const fin = new THREE.Shape([new THREE.Vector2(-1.2, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(-0.6, 1.7), new THREE.Vector2(-1.2, 1.6)]);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.1, bevelEnabled: false }); fg.translate(-3.2, 2.1, -0.05); b.add(fg, top);
  for (const s of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), dark, M4(1.4, 0.95, s * 1.8)); b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 12).rotateX(Math.PI / 2), dark, M4(1.4, 0.35, s * 1.8)); }
  const prop = new THREE.CylinderGeometry(1.6, 1.6, 0.04, 20); prop.rotateZ(Math.PI / 2); b.add(prop, basic("propdisc", () => ({ color: "#3a3a40", transparent: true, opacity: 0.35 })), M4(5.25, 2.0, 0));
  b.build(g);
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), basic("hino", () => ({ color: "#c8323a" }))); d.rotation.x = -Math.PI / 2; d.position.set(1.0, 1.75, s * 4.2); d.layers.set(NOINK); g.add(d); }
  return g;
};
const makeShinden = () => { // canard pusher fighter: small canards at the nose (+x), swept wings + twin fins and the prop at the back
  const g = new THREE.Group(), b = new Batch(), top = col("#4f5e46"), dark = col("#2a2a30");
  const fus = new THREE.CylinderGeometry(0.5, 0.7, 9, 12); fus.rotateZ(Math.PI / 2); b.add(fus, top, M4(0, 0, 0));
  const nose = new THREE.ConeGeometry(0.5, 1.6, 12); nose.rotateZ(-Math.PI / 2); b.add(nose, top, M4(5.3, 0, 0));
  b.add(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), basic("canopy", () => ({ color: "#a8c4d0" })), M4(0.8, 0.45, 0, 0, [1.8, 0.9, 0.8]));
  const wing = new THREE.Shape([new THREE.Vector2(-2.8, -5.6), new THREE.Vector2(-1.6, -5.6), new THREE.Vector2(0.6, 0), new THREE.Vector2(-1.6, 5.6), new THREE.Vector2(-2.8, 5.6), new THREE.Vector2(-2.2, 0)]);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.16, bevelEnabled: false }); wg.rotateX(-Math.PI / 2); wg.translate(-1.5, -0.1, 0); b.add(wg, top);
  const can = new THREE.Shape([new THREE.Vector2(-0.4, -1.8), new THREE.Vector2(0.4, -1.6), new THREE.Vector2(0.6, 0), new THREE.Vector2(0.4, 1.6), new THREE.Vector2(-0.4, 1.8)]);
  const cg = new THREE.ExtrudeGeometry(can, { depth: 0.1, bevelEnabled: false }); cg.rotateX(-Math.PI / 2); cg.translate(3.8, 0.1, 0); b.add(cg, top);
  for (const s of [-1, 1]) { const fin = new THREE.Shape([new THREE.Vector2(-0.9, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(-0.5, 1.3), new THREE.Vector2(-0.9, 1.3)]); const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false }); fg.translate(-3.1, -0.05, s * 2.4); b.add(fg, top); }
  const prop = new THREE.CylinderGeometry(1.5, 1.5, 0.04, 20); prop.rotateZ(Math.PI / 2); b.add(prop, basic("propdisc", () => ({ color: "#3a3a40", transparent: true, opacity: 0.35 })), M4(-4.7, 0, 0));
  b.add(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8).rotateZ(Math.PI / 2), dark, M4(-4.4, 0, 0));
  b.build(g);
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), basic("hino", () => ({ color: "#c8323a" }))); d.rotation.x = -Math.PI / 2; d.position.set(-2.3, 0.08, s * 3.6); d.layers.set(NOINK); g.add(d); }
  return g;
};
const makeTram = () => {
  const g = new THREE.Group(), b = new Batch();
  b.add(boxG(-6, 0.4, -1.3, 6, 3.3, 1.3, 1.5), texMat("tram", winTex("#d8b04a", "#3a4a5a", "tram")));
  b.add(boxG(-6.1, 3.3, -1.4, 6.1, 3.6, 1.4), col("#5a4a3a"));
  b.add(boxG(-6, 0.0, -1.2, 6, 0.4, 1.2), col("#3a3d47"));
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 3, 4).rotateZ(0.5), col("#2a2a30"), M4(0, 4.8, 0));
  b.build(g);
  return g;
};

export const buildPlaces = (root: THREE.Object3D) => {
  const groups = {} as Record<PlaceId, THREE.Group>;
  const H = {} as Handles;
  for (const id of Object.keys(PLACES) as PlaceId[]) { const g = new THREE.Group(); const P0 = PLACES[id]; g.position.set(P0[0], P0[1], P0[2]); g.visible = false; root.add(g); groups[id] = g; }
  const trunk = col("#7a4f33"), leaf = col("#5aa04a"), leaf2 = col("#4a8f3e");
  const waterTex = (deep: string, line: string, key: string) => tex("wt" + key, () => { const t = canvasTex(256, 256, (g) => { g.fillStyle = deep; g.fillRect(0, 0, 256, 256); g.strokeStyle = line; g.lineWidth = 5; g.lineCap = "round"; const R2 = rng(4); for (let i = 0; i < 26; i++) { const x = R2() * 256, y = R2() * 256; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 8, x + 28, y); g.stroke(); } }, true); t.repeat.set(120, 120); return t; });

  // ===== SEA: open Pacific / Sagami Bay. The boat, ships and plane are handles posed per shot. =====
  {
    const G = groups.sea;
    H.water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), lam("water", () => ({ map: waterTex("#2a6f98", "#6fb6d8", "sea") })));
    H.water.rotation.x = -Math.PI / 2; H.water.position.set(0, 0, 0); G.add(H.water);
    H.boat = makeBoat(); G.add(H.boat);
    H.ships = []; for (let i = 0; i < 6; i++) { const s = makeShip("destroyer"); s.visible = false; G.add(s); H.ships.push(s); }
    H.tug = makeShip("tug"); H.tug.visible = false; G.add(H.tug);
    H.shinden = makeShinden(); H.shinden.visible = false; G.add(H.shinden);
  }

  // ===== STUDIO: the 1954 effects stage: plank floor, painted-sky cyclorama, a miniature Tokyo, lights + camera =====
  {
    const b = new Batch(), G = groups.studio;
    ground(b, 400, texMat("stfloor", woodTex("#6a5644", "stfloor")), 0, 3);
    const sky = canvasTex(512, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#3e72b8"); gr.addColorStop(0.7, "#a8c8e4"); gr.addColorStop(1, "#e8e0cc"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
      g.fillStyle = "#ffffffcc"; const R2 = rng(9); for (let i = 0; i < 9; i++) { const x = R2() * 512, y = 40 + R2() * 110; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * 18, y + (k % 2) * 6, 26, 14, 0, 0, 7); g.fill(); } }
      g.fillStyle = "#6a7a8a"; for (let x = 0; x < 512; x += 22) { const h = 10 + 30 * R2(); g.fillRect(x, 230 - h, 18, h + 30); }
    });
    const cyc = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 16, 32, 1, true, -Math.PI / 2 - 1.2, 2.4), basic("cyc", () => ({ map: sky, side: THREE.DoubleSide })));
    cyc.position.set(0, 8, 6); cyc.layers.set(NOINK); G.add(cyc);
    b.add(boxG(-60, 0, -40, 60, 30, -21), col("#26262c")); // black stage walls behind the cyclorama
    // the miniature city: 40-140 cm buildings, little roofs, tiny poles
    const R = rng(13), mini = [winTex("#c8c0b0", "#4a5a6a", "m1"), winTex("#a8aab0", "#3a4a5a", "m2"), winTex("#d8c8a0", "#4a5a6a", "m3"), winTex("#b8907a", "#3a4a5a", "m4")];
    for (let i = -7; i <= 7; i++) for (let j = -9; j <= 1; j++) {
      if (Math.abs(i) <= 1 && j > -6) continue; // a street for the monster
      if (R() < 0.15) continue;
      const x = i * 1.1 + (R() - 0.5) * 0.2, z = j * 1.1 + (R() - 0.5) * 0.2, h = 0.3 + R() * (R() < 0.2 ? 1.3 : 0.6), w = 0.7 + R() * 0.25;
      b.add(boxG(x - w / 2, 0, z - w / 2, x + w / 2, h, z + w / 2, 0.3), texMat("mini" + (Math.abs(i + j) % 4), mini[Math.abs(i + j) % 4]));
      if (h < 0.55 && R() < 0.6) gable(b, x - w / 2, x + w / 2, z - w / 2, z + w / 2, h, 0.25, col("#5a4a4a"), col("#c8c0b0"));
    }
    for (let k = -8; k <= 2; k++) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), col("#3a3030"), M4(s * 1.6, 0.35, k * 1.1 + 0.5));
    // lights on stands + the camera
    for (const [x, z] of [[-7, 5], [7, 5], [-9, -3], [9, -3]] as [number, number][]) {
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), col("#2a2a30"), M4(x, 2, z));
      b.add(new THREE.CylinderGeometry(0.45, 0.6, 0.8, 12).rotateX(Math.PI / 2 - 0.5), col("#3a3a42"), M4(x, 4.1, z));
    }
    b.add(boxG(2.6, 1.2, 5.6, 3.6, 1.9, 6.4), col("#2a2a30")); b.add(new THREE.CylinderGeometry(0.22, 0.25, 0.6, 12).rotateX(Math.PI / 2), col("#141016"), M4(3.1, 1.55, 5.3));
    for (const s of [-1, 1, 0]) { const l = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4); l.rotateZ(s * 0.3); l.rotateX(s === 0 ? 0.3 : 0); b.add(l, col("#3a3a42"), M4(3.1 + s * 0.2, 0.6, 6 + (s === 0 ? 0.2 : 0))); }
    b.build(G);
  }

  // ===== ISLAND: Odo Island airbase (1945) + a beach on its far side (60s monster fights, the parade) =====
  {
    const b = new Batch(), G = groups.island;
    const grass = texMat("isgrass", speckTex("#8a9a5a", ["#7a8a4a", "#9aaa6a", "#a89a6a"], "isgrass", 90, [4, 14]));
    const sand = texMat("issand", speckTex("#e2cf9c", ["#d6c28c", "#eedcaa"], "issand"));
    b.add(new THREE.CircleGeometry(420, 48).rotateX(-Math.PI / 2), grass, M4(0, 0.02, 0));
    b.add(new THREE.CircleGeometry(470, 48).rotateX(-Math.PI / 2), sand, M4(0, 0.0, 0));
    b.add(boxG(-160, 0.03, -14, 160, 0.06, 14, 4), texMat("runway", speckTex("#b8a888", ["#a89878", "#c8b898"], "runway", 60, [3, 10])));
    for (let x = -150; x <= 150; x += 12) b.add(boxG(x, 0.06, -0.3, x + 6, 0.08, 0.3), col("#e8e2d0"));
    const hangar = (x: number, z: number) => {
      const g = new THREE.CylinderGeometry(11, 11, 30, 20, 1, false, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2);
      b.add(g, texMat("hang", tinTex("#8a8a7a", "hang")), M4(x, 0, z));
      b.add(boxG(x - 9, 0, z - 15.2, x + 9, 8, z - 15), col("#3a3a32"));
    };
    hangar(-40, -60); hangar(10, -60);
    b.add(boxG(50, 0, -50, 62, 4, -42, 2), texMat("hut", winTex("#a89a7a", "#3a4a5a", "hut")));
    for (let i = 0; i < 14; i++) b.add(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 10), col(i % 3 ? "#5a5a4a" : "#8a3a2a"), M4(70 + (i % 5) * 1.0, 0.55, -40 + Math.floor(i / 5) * 1.0));
    const R = rng(21);
    const palm = (x: number, z: number, h: number) => {
      const t = new THREE.CylinderGeometry(0.2, 0.35, h, 6); t.rotateZ(0.12); b.add(t, trunk, M4(x, h / 2, z));
      for (let k = 0; k < 6; k++) { const l = new THREE.ConeGeometry(0.6, 4.2, 4); l.rotateZ(Math.PI / 2 + 0.5); l.rotateY((k / 6) * Math.PI * 2); b.add(l, k % 2 ? leaf : leaf2, M4(x + 0.6, h, z)); }
    };
    for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = 120 + R() * 280; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(z) < 30 && Math.abs(x) < 170) continue; palm(x, z, 6 + R() * 5); }
    for (let i = 0; i < 9; i++) b.add(new THREE.IcosahedronGeometry(40 + R() * 40, 1), col("#5a7a42"), M4(-300 + i * 75, -18, -330 - R() * 60, 0, [1.6, 0.8, 1]));
    for (let i = 0; i < 30; i++) b.add(new THREE.DodecahedronGeometry(0.5 + R() * 1.2, 0), col("#8a8272"), M4(-60 + R() * 140, 0.2, 18 + R() * 6, R() * 3));
    b.build(G);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), lam("water", () => ({ map: waterTex("#2a6f98", "#6fb6d8", "sea") }))); w.rotation.x = -Math.PI / 2; w.position.y = -0.25; G.add(w);
    H.zero = makeZero(); G.add(H.zero);
  }

  // ===== RUINS: burned-out Tokyo (1945-47) with the family shack; a rebuilt 1949 street at z < -100 =====
  {
    const b = new Batch(), G = groups.ruins;
    ground(b, 1600, texMat("rubble", speckTex("#8a8070", ["#7a7060", "#9a9080", "#5a5048"], "rubble", 140, [3, 12])), 0, 8);
    const R = rng(33), char = col("#2e2826"), brick = texMat("brick", brickTex("#9a5a42", "brick")), conc = texMat("conc", winTex("#9a968c", "#2a2624", "conc"));
    for (let i = 0; i < 160; i++) {
      const x = -260 + R() * 520, z = -90 + R() * 260; if (Math.hypot(x, z) < 14 || (Math.abs(x) < 6 && z > -90)) continue;
      const k = R();
      if (k < 0.35) { const h = 1 + R() * 3; for (let j = 0; j < 3; j++) b.add(boxG(x + j * 1.2, 0, z, x + j * 1.2 + 0.18, h * (0.5 + 0.5 * R()), z + 0.18), char); b.add(boxG(x, h * 0.8, z, x + 2.6, h * 0.8 + 0.18, z + 0.18), char); }
      else if (k < 0.5) { const h = 5 + R() * 9; b.add(boxG(x, 0, z, x + 0.9, h, z + 0.9, 1), brick); }
      else if (k < 0.62) { const w = 8 + R() * 10, h = 6 + R() * 10; b.add(boxG(x, 0, z, x + w, h, z + 0.6, 4), conc); b.add(boxG(x, 0, z, x + 0.6, h * 0.7, z + w * 0.6, 4), conc); }
      else b.add(new THREE.DodecahedronGeometry(0.5 + R() * 1.6, 0), col(R() < 0.5 ? "#6a6058" : "#7a5a48"), M4(x, 0.1, z, R() * 3, [1.4, 0.6, 1.2]));
    }
    // shacks: tin + scrap wood
    const shack = (x: number, z: number, ry: number, w = 4, d = 3) => {
      const m = M4(x, 0, z, ry);
      b.add(boxG(-w / 2, 0, -d / 2, w / 2, 2.4, d / 2, 1).applyMatrix4(m), texMat("shackw", woodTex("#7a6048", "shackw")));
      const roof = new THREE.BoxGeometry(w + 0.6, 0.12, d + 0.8); roof.rotateX(0.18); roof.translate(0, 2.65, 0); b.add(roof.applyMatrix4(m), texMat("tin", tinTex("#7a6a5a", "tin")));
      b.add(boxG(-0.5, 0, d / 2, 0.5, 1.9, d / 2 + 0.05).applyMatrix4(m), col("#4a3a2a"));
    };
    shack(0, -4, 0, 4.6, 3.4);
    for (let i = 0; i < 18; i++) shack(-80 + R() * 160, -60 + R() * 140, R() * 0.6 - 0.3, 3 + R() * 2, 2.5 + R());
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4).rotateZ(Math.PI / 2), col("#3a3030"), M4(3.6, 1.8, -1.5)); // laundry line
    // rebuilt 1949 street (z -140 .. -260): two-storey wooden shop-houses with tile roofs, poles and banners
    ground(b, 1, col("#8a8070"), 0.01);
    const ww = texMat("machiya", winTex("#8a6a4a", "#e8dcc0", "machiya")), tile = col("#3a3d47");
    for (const s of [-1, 1]) for (let z = -140; z > -270; z -= 9) {
      const x0 = s > 0 ? 6 : -14, h = 6 + R() * 1.5;
      b.add(boxG(x0, 0, z - 8, x0 + 8, h, z, 3), ww);
      const r = new THREE.BoxGeometry(9.6, 0.4, 9.2); r.rotateZ(s * 0.25); r.translate(x0 + 4, h + 0.9, z - 4); b.add(r, tile);
      b.add(boxG(x0 + (s > 0 ? -0.6 : 8), 2.6, z - 8, x0 + (s > 0 ? 0 : 8.6), 2.8, z), tile);
    }
    for (let z = -140; z > -270; z -= 18) for (const s of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.12, 0.14, 9, 6), col("#5a4a3a"), M4(s * 5.4, 4.5, z)); b.add(boxG(s * 5.4 - 0.8, 8.4, z - 0.06, s * 5.4 + 0.8, 8.5, z + 0.06), col("#5a4a3a")); }
    b.build(G);
    for (let z = -150, i = 0; z > -260; z -= 18, i++) { const ban = label(0.9, 2.6, [""], ["#c8323a", "#2f5fb3", "#e8b33c"][i % 3], "#fff"); ban.position.set(i % 2 ? 5.95 : -5.95, 3.4, z); ban.rotation.y = Math.PI / 2; G.add(ban); }
  }

  // ===== CITY: Ginza (1947 / 1954): stone blocks along z, tram tracks, a corner clock tower; a modern cinema at z > 160 =====
  {
    const b = new Batch(), G = groups.city;
    ground(b, 1600, texMat("asph", speckTex("#6a665e", ["#5a5650", "#7a766e"], "asph", 120, [3, 10])), 0, 10);
    const walk = texMat("walk", tilesTex("#b8b0a2", "#aca496", 4), "#ffffff");
    for (const s of [-1, 1]) b.add(boxG(s > 0 ? 9 : -15, 0, -700, s > 0 ? 15 : -9, 0.18, 400, 2), walk);
    for (const x of [-2.2, -0.8, 0.8, 2.2]) b.add(boxG(x - 0.06, 0.01, -700, x + 0.06, 0.06, 400), col("#9a9aa2"));
    const R = rng(41);
    const facades = [winTex("#d8ccb0", "#3a4a5a", "g1", true), winTex("#b8b4aa", "#2f4058", "g2"), winTex("#c8a888", "#3a4a5a", "g3", true), winTex("#e2dccb", "#46607e", "g4"), winTex("#a89a8a", "#2f4058", "g5", true)];
    for (const s of [-1, 1]) {
      let z = -420;
      while (z < 150) {
        const w = 14 + R() * 12, d = 16 + R() * 8, h = 14 + R() * 16, k = Math.floor(R() * 5), x0 = s > 0 ? 15 : -15 - d;
        if (!(s > 0 && z > -40 && z < -8)) {
          b.add(boxG(x0, 0, z, x0 + d, h, z + w, 4), texMat("gf" + k, facades[k]));
          b.add(boxG(x0 - 0.4, h, z - 0.4, x0 + d + 0.4, h + 0.8, z + w + 0.4), col("#8a8478"));
          b.add(boxG(s > 0 ? x0 - 0.3 : x0 + d, 0, z, s > 0 ? x0 : x0 + d + 0.3, 4, z + w), col("#5a5048"));
        }
        z += w + 1 + R() * 2;
      }
    }
    // corner clock tower building (our own design)
    const st = texMat("ctow", winTex("#d8ccb0", "#3a4a5a", "ctow", true));
    b.add(new THREE.CylinderGeometry(12, 12, 22, 24, 1, false, Math.PI, Math.PI / 2), st, M4(27, 11, -10));
    b.add(boxG(15, 0, -40, 40, 22, -22, 4), st);
    b.add(new THREE.CylinderGeometry(5, 5.4, 9, 20), col("#d8ccb0"), M4(20, 26.5, -15));
    b.add(new THREE.CylinderGeometry(5.6, 5.6, 1, 20), col("#8a8478"), M4(20, 31.5, -15));
    b.add(new THREE.ConeGeometry(3, 4, 20), col("#4a5a5a"), M4(20, 34, -15));
    // street lamps + poles
    for (let z = -400; z < 150; z += 24) for (const s of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), col("#2a2a30"), M4(s * 9.6, 3, z)); b.add(new THREE.SphereGeometry(0.4, 8, 6), col("#f2ecd8"), M4(s * 9.6, 6.2, z)); }
    // the modern cinema (2026) further down the street
    b.add(boxG(15, 0, 170, 40, 20, 220, 4), texMat("cine", winTex("#3a3448", "#7a5a9a", "cine", false, 0.6)));
    b.add(boxG(10, 6.5, 172, 15, 7.2, 218), col("#2a2430"));
    for (let z = 160; z < 300; z += 30) for (const s of [-1]) b.add(boxG(-40, 0, z, -15, 24, z + 26, 4), texMat("gf4", facades[3]));
    b.build(G);
    const face = canvasTex(128, 128, (g) => { g.fillStyle = "#f4f0e2"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = "#2a2a30"; g.lineWidth = 6; g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); for (let i = 0; i < 12; i++) { const a = (i / 12) * 7; g.fillStyle = "#2a2a30"; g.fillRect(64 + Math.cos(a) * 50 - 3, 64 + Math.sin(a) * 50 - 3, 6, 6); } });
    for (const [x, z, ry] of [[15.1, -15, -Math.PI / 2], [20, -9.95, 0]] as [number, number, number][]) { const c = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshBasicMaterial({ map: face })); c.position.set(x, 27, z); c.rotation.y = ry; c.layers.set(NOINK); G.add(c); }
    H.marquee = label(5, 18, ["G", "O", "D", "Z", "I", "L", "L", "A"], "#2a1f36", "#ffd84a", 120); H.marquee.position.set(14.9, 13, 195); H.marquee.rotation.y = -Math.PI / 2; G.add(H.marquee);
    const mq = label(44, 4.2, ["GODZILLA MINUS ZERO  ·  NOW SHOWING"], "#f4ead0", "#c8323a", 150); mq.position.set(9.95, 8.6, 195); mq.rotation.y = -Math.PI / 2; G.add(mq);
    H.tram = makeTram(); H.tram.visible = false; G.add(H.tram);
  }

  // ===== ROOMS: planning hall (0), hospital room (100), Oscar stage (200), cinema auditorium (300) =====
  {
    const b = new Batch(), G = groups.rooms;
    const room = (cx: number, w: number, d: number, h: number, wall: THREE.Material, floor: THREE.Material) => {
      b.add(boxG(cx - w / 2, -0.2, -d / 2, cx + w / 2, 0, d / 2, 2), floor);
      b.add(boxG(cx - w / 2, 0, -d / 2 - 0.3, cx + w / 2, h, -d / 2, 3), wall);
      for (const s of [-1, 1]) b.add(boxG(s > 0 ? cx + w / 2 : cx - w / 2 - 0.3, 0, -d / 2, s > 0 ? cx + w / 2 + 0.3 : cx - w / 2, h, d / 2 + 8, 3), wall);
      b.add(boxG(cx - w / 2, h, -d / 2, cx + w / 2, h + 0.3, d / 2 + 8), wall);
    };
    // planning hall: wood panels, blackboard, benches
    room(0, 18, 12, 6, texMat("panel", woodTex("#8a6a48", "panel")), texMat("hfloor", woodTex("#6a5040", "hfloor")));
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) { b.add(boxG(s * 1.2 + (s > 0 ? 0 : -4), 0.45, 1 + r * 1.8, s * 1.2 + (s > 0 ? 4 : 0), 0.6, 1.5 + r * 1.8), col("#7a5a3a")); for (const x of [0.3, 3.7]) b.add(boxG(s * 1.2 + (s > 0 ? x : -x) - 0.06, 0, 1.1 + r * 1.8, s * 1.2 + (s > 0 ? x : -x) + 0.06, 0.45, 1.4 + r * 1.8), col("#5a4030")); }
    b.add(boxG(-5.2, 0.9, -5.98, 5.2, 4.3, -5.9), col("#4a3420"));
    H.board = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.2), new THREE.MeshBasicMaterial({ color: "#ffffff" })); H.board.position.set(0, 2.6, -5.85); H.board.layers.set(NOINK); G.add(H.board);
    // hospital room
    room(100, 12, 10, 4.5, texMat("hwall", speckTex("#d8e2dc", ["#ccd8d2", "#e2eae4"], "hwall", 40, [6, 16])), texMat("hfl", tilesTex("#c8ccc4", "#bcc0b8", 4, "h")));
    b.add(boxG(97, 0, -4.8, 103, 0.55, -1.2), col("#c9ccd2")); b.add(boxG(97.1, 0.55, -4.7, 102.9, 0.85, -1.3), col("#f4f4f0")); b.add(boxG(97.4, 0.85, -4.6, 98.6, 1.1, -1.4), col("#ffffff"));
    b.add(boxG(97, 0, -5, 97.2, 1.6, -1), col("#a8acb4")); b.add(boxG(103.4, 0, -4, 104.4, 0.8, -3), col("#8a6a4a"));
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), basic("hwin", () => ({ color: "#fff4dc" }))); win.position.set(104, 2.6, -4.95); win.layers.set(NOINK); G.add(win);
    // Oscar stage: dark wood stage with gold edge, red curtains, steps, seats in front
    const curt = canvasTex(256, 128, (g) => { for (let x = 0; x < 256; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, "#5a0e1a"); gr.addColorStop(0.5, "#b8283a"); gr.addColorStop(1, "#5a0e1a"); g.fillStyle = gr; g.fillRect(x, 0, 16, 128); } }, true);
    curt.repeat.set(6, 1);
    b.add(boxG(186, 0, -8, 214, 1.2, 4), texMat("stage", woodTex("#4a3428", "stage"))); b.add(boxG(186, 1.2, 3.8, 214, 1.32, 4.1), col("#e8b33c"));
    for (let i = 0; i < 3; i++) b.add(boxG(196, 0, 4 + i * 0.6, 204, 1.2 - i * 0.4, 4.6 + i * 0.6), col("#3a2a24"));
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), basic("curt", () => ({ map: curt }))); cm.position.set(200, 8, -8); cm.layers.set(NOINK); G.add(cm);
    for (let r = 0; r < 6; r++) for (let i = 0; i < 18; i++) b.add(boxG(184 + i * 1.8, 0, 10 + r * 1.6, 185.4 + i * 1.8, 0.9 + r * 0.25, 11 + r * 1.6), col("#5a1e28"));
    b.add(boxG(180, -0.2, -10, 220, 0, 25), col("#2a2024"));
    // cinema auditorium: seat rows facing the screen at z = -10
    b.add(boxG(280, -0.2, -12, 320, 0, 20), col("#2a2430"));
    for (let r = 0; r < 8; r++) for (let i = 0; i < 16; i++) { const z = 0 + r * 1.5, y = r * 0.3; b.add(boxG(286 + i * 1.6, y, z, 287.3 + i * 1.6, y + 0.5, z + 0.7), col("#8a2a34")); b.add(boxG(286 + i * 1.6, y + 0.5, z + 0.6, 287.3 + i * 1.6, y + 1.3, z + 0.8), col("#8a2a34")); b.add(boxG(285, y - 0.3, z - 0.2, 312, y, z + 1.3), col("#3a3040")); }
    b.add(boxG(278, 0, -12.5, 322, 14, -12), col("#1e1a26"));
    H.screen = new THREE.Mesh(new THREE.PlaneGeometry(22, 9.5), new THREE.MeshBasicMaterial({ color: "#ffffff" })); H.screen.position.set(300, 6.5, -11.9); H.screen.layers.set(NOINK); G.add(H.screen);
    b.build(G);
  }
  return { groups, H };
};
