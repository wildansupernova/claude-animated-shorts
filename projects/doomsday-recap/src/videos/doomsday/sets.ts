// The places of the recap, each a static group built once (merged geometry per material, two-tone shading, painted
// Canvas2D textures) and placed far apart; only the current shot's place is visible. Coordinates are place-local:
// y up, metres. Things that move per shot (planets, ships, branches, ice) are exported handles posed in world.ts.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { sign, FONT } from "./fx2d";
import { Pen } from "./toon";

export const PLACES = {
  city: [0, 0, 0], space: [8000, 0, 0], tva: [-8000, 0, 0], mansion: [0, 0, 8000], desert: [0, 0, -8000],
  retro: [8000, 0, 8000], ocean: [-8000, 0, 8000], castle: [8000, 0, -8000], cave: [-8000, 0, -8000], snow: [-8000, 0, -7000],
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
  planets: THREE.Mesh[]; ship: THREE.Group; ice: THREE.Mesh; saucers: THREE.Mesh[]; water: THREE.Mesh; screen: THREE.Mesh;
  bubbles: THREE.Mesh[]; platform: THREE.Mesh; branches: THREE.Group; galactusPlanet: THREE.Mesh; skyFx: THREE.Group;
};

export const buildPlaces = (root: THREE.Object3D) => {
  const groups = {} as Record<PlaceId, THREE.Group>;
  const H = {} as Handles;
  for (const id of Object.keys(PLACES) as PlaceId[]) { const g = new THREE.Group(); const P0 = PLACES[id]; g.position.set(P0[0], P0[1], P0[2]); g.visible = false; root.add(g); groups[id] = g; }
  const trunk = col("#7a4f33"), leaf = col("#5aa04a"), leaf2 = col("#4a8f3e");

  // ===== CITY (New York): avenue along z, cross street at z = 0, cinema, billboard, park with blossom trees =====
  {
    const b = new Batch(), G = groups.city;
    ground(b, 1400, texMat("asph", speckTex("#5c5d66", ["#6a6b74", "#4e4f58"], "asph", 120, [3, 10])), 0, 10);
    const walk = texMat("walk", tilesTex("#bdb6aa", "#b2ab9f", 4), "#ffffff");
    for (const s of [-1, 1]) {
      b.add(boxG(s > 0 ? 9 : -14, 0, -700, s > 0 ? 14 : -9, 0.18, 700, 2), walk);
      b.add(boxG(-700, 0, s > 0 ? 9 : -14, 700, 0.18, s > 0 ? 14 : -9, 2), walk);
    }
    const paint = col("#f2f0e6");
    for (let z = -690; z < 690; z += 9) if (Math.abs(z) > 16) b.add(boxG(-0.15, 0.01, z, 0.15, 0.03, z + 4.5), paint);
    const R = rng(7);
    const palettes: [string, string, string][] = [["#b8604a", "#3c5a7a", "#e8dcc8"], ["#d8c8a8", "#46607e", "#f2ece0"], ["#8a8f9a", "#2f4f6e", "#d0d4da"], ["#c9a46a", "#3a5470", "#efe2c4"],
      ["#a8524a", "#34506e", "#e6d6c0"], ["#9fb4c8", "#2a4a6a", "#e8eef4"], ["#e2d2b0", "#4a6480", "#fff6e6"]];
    const roofM = col("#6a6c74"), parapet = col("#8a8c94");
    const tower = (x0: number, z0: number, w: number, d: number, h: number, pi: number) => {
      const [wall, win, frame] = palettes[pi % palettes.length];
      b.add(boxG(x0, 0, z0, x0 + w, h, z0 + d, 4), texMat(`fac${pi % palettes.length}`, facadeTex(wall, win, frame, pi), "#ffffff"));
      b.add(boxG(x0 - 0.3, h, z0 - 0.3, x0 + w + 0.3, h + 0.9, z0 + d + 0.3), parapet);
      b.add(boxG(x0 + 0.6, h, z0 + 0.6, x0 + w - 0.6, h + 0.5, z0 + d - 0.6), roofM);
      if (R() < 0.35 && h < 70) { // water tower
        const cx = x0 + w * (0.3 + 0.4 * R()), cz = z0 + d * (0.3 + 0.4 * R());
        b.add(new THREE.CylinderGeometry(1.8, 1.8, 3.2, 10), col("#8a5a3c"), M4(cx, h + 3.4, cz));
        b.add(new THREE.ConeGeometry(2, 1.4, 10), col("#5a3a2a"), M4(cx, h + 5.7, cz));
        for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) b.add(boxG(cx + dx - 0.1, h, cz + dz - 0.1, cx + dx + 0.1, h + 1.8, cz + dz + 0.1), col("#3a3a40"));
      }
    };
    let pi = 0;
    for (const s of [-1, 1]) for (const row of [0, 1]) {
      let z = -680;
      while (z < 280) {
        const w = 14 + R() * 14, d = 16 + R() * 12, gap = 1.5 + R() * 3;
        if (z + w > -16 && z < 16) { z = 16 + gap; continue; }
        const h = row ? 50 + R() * 70 : 16 + R() * (Math.abs(z) < 80 ? 26 : 50);
        const xin = row ? 48 + R() * 10 : 14.5;
        if (!(s > 0 && row === 0 && z > 28 && z < 62)) tower(s > 0 ? xin : -xin - d, z, d, w, h, pi++);
        z += w + gap;
      }
    }
    // cinema (east side, z 30..60): low block, marquee over the sidewalk
    b.add(boxG(14.5, 0, 30, 34, 13, 60, 4), texMat("cinema", facadeTex("#7a2a3a", "#2a1a2a", "#e8c45a", 3)));
    b.add(boxG(10, 6.2, 34, 14.5, 6.6, 56), col("#2a2230"));
    const marquee = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), new THREE.MeshBasicMaterial({ map: canvasTex(1000, 500, (g) => sign(new Pen(g), 1000, 500, ["AVENGERS:", "DOOMSDAY", "DEC 18"], { bg: "#1f1b2e", lights: true, size: 118 })), fog: true }));
    marquee.position.set(10.12, 9.4, 45); marquee.rotation.y = -Math.PI / 2; marquee.layers.set(NOINK); G.add(marquee);
    b.add(boxG(10.2, 6.5, 39.3, 10.6, 12.3, 50.7), col("#2a2230"));
    // billboard on the west side (Thunderbolts*)
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ fog: true, map: canvasTex(1000, 500, (g) => sign(new Pen(g), 1000, 500, ["BIG APPLE", "PIZZA"], { bg: "#c8323a", fg: "#ffd84a", size: 150 })) }));
    bb.name = "billboard"; bb.position.set(-14.4, 26, -48); bb.rotation.y = Math.PI / 2; bb.layers.set(NOINK); G.add(bb);
    b.add(boxG(-14.9, 22.2, -55.4, -14.5, 29.8, -40.6), col("#2a2730"));
    // street lamps, trees, cars
    const lampM = col("#3a3d47"), carCols = ["#e0b030", "#c8323a", "#3f6fb5", "#f2f2f6", "#2f8a4a", "#e0b030"];
    for (let z = -400; z < 300; z += 24) for (const s of [-1, 1]) {
      if (Math.abs(z) < 18) continue;
      b.add(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampM, M4(s * 10, 3, z));
      b.add(boxG(s * 10 - (s > 0 ? 1.4 : -0.2), 5.8, z - 0.2, s * 10 + (s > 0 ? 0.2 : 1.4), 6.1, z + 0.2), lampM);
      if ((z / 24) % 2 === 0) tree(b, s * 12, z + 10, 6, leaf, trunk, 0.18);
    }
    for (let i = 0; i < 18; i++) {
      const lane = (i % 2 ? 1 : -1) * (3 + (i % 3)), z = -360 + i * 37 + R() * 8;
      if (Math.abs(z) < 14 || (z > 20 && z < 70)) continue;
      const c = col(carCols[i % carCols.length]);
      b.add(boxG(lane - 1, 0.3, z - 2.2, lane + 1, 1.2, z + 2.2), c);
      b.add(boxG(lane - 0.85, 1.2, z - 1.1, lane + 0.85, 1.9, z + 1.0), c);
      for (const dz of [-1.4, 1.4]) b.add(new THREE.CylinderGeometry(0.38, 0.38, 2.1, 10), col("#222228"), new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(lane, 0.38, z + dz));
    }
    // landmark tower at the end of the avenue
    b.add(boxG(-14, 0, -760, 14, 170, -732, 4), texMat("lmk", facadeTex("#9fb4c8", "#2a4a6a", "#e8eef4", 77)));
    b.add(new THREE.CylinderGeometry(9, 14, 22, 8), col("#d0d4da"), M4(0, 181, -746));
    // park with blossom trees (z 300..420) + grass
    b.add(boxG(-60, 0.05, 300, 60, 0.2, 440, 4), texMat("grassC", speckTex("#6aab4f", ["#5a9a42", "#7cbc5c"], "grassC")));
    const pink = col("#f2a0c0"), pink2 = col("#e888b0");
    for (let i = 0; i < 26; i++) tree(b, -50 + R() * 100, 310 + R() * 120, 6 + R() * 3, i % 2 ? pink : pink2, trunk, 0.2);
    b.build(G);
  }

  // ===== SPACE: rock (Thanos), citadel (end of time), planets, universe bubbles =====
  {
    const b = new Batch(), G = groups.space;
    const rock = texMat("rock", speckTex("#8a6a5a", ["#7a5a4a", "#9a7a66", "#6a4e40"], "rock", 80, [6, 22]));
    const rg = new THREE.IcosahedronGeometry(16, 2), pos = rg.getAttribute("position") as THREE.BufferAttribute, R = rng(11);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setXYZ(i, pos.getX(i) * (1 + 0.15 * Math.sin(i)), y > 0 ? 0 : y * 0.9, pos.getZ(i) * (1 + 0.12 * Math.cos(i * 1.7))); }
    rg.computeVertexNormals(); b.add(rg, rock);
    for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(1 + R() * 3.5, 0); b.add(g, rock, M4(-40 + R() * 80, -8 + R() * 30, -30 - R() * 60)); }
    // citadel platform at x = 300
    const plat = col("#c9b48a"), gold = col("#e8b33c"), dark = col("#3a2a4a");
    b.add(new THREE.CylinderGeometry(20, 16, 3, 32), plat, M4(300, -1.5, 0));
    b.add(new THREE.TorusGeometry(20, 0.35, 6, 48), gold, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(300, 0, 0));
    b.add(boxG(296, 0, -12, 304, 1.2, -9), dark); // dais
    b.add(boxG(298, 1.2, -11.8, 302, 4.6, -10.8), gold); // throne back
    b.add(boxG(298.2, 1.2, -11.2, 301.8, 2.2, -9.6), dark); // seat
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.add(new THREE.CylinderGeometry(0.6, 0.7, 9, 10), plat, M4(300 + Math.cos(a) * 17, 4.5, Math.sin(a) * 17)); }
    b.build(G);
    // planets (posed per shot)
    const planetTex = (a: string, c: string, k: string) => tex("pl" + k, () => canvasTex(256, 128, (g) => { g.fillStyle = a; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? c : a; g.globalAlpha = 0.6; g.fillRect(0, i * 14 + 6 * Math.sin(i), 256, 7 + 4 * Math.sin(i * 3)); } g.globalAlpha = 1; noise(g, 256, 128, [c, a], 20, [4, 12], k.length); }));
    H.planets = [["#3f7be0", "#5ac06a", "e"], ["#e07a3a", "#f2c06a", "o"], ["#8a5fd0", "#d07ad8", "p"], ["#3fbfa8", "#e8f0a0", "t"]].map(([a, c, k]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), lam("pm" + k, () => ({ map: planetTex(a, c, k) })));
      m.visible = false; G.add(m); return m;
    });
    H.galactusPlanet = H.planets[0];
    H.bubbles = [];
    const bc = ["#e04040", "#3f7be0", "#f2d23c", "#3fbf5a", "#f08a2c", "#7a4fd0", "#40c8d0", "#e060a0"];
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), lam("bub" + (i % 8), () => ({ color: bc[i % 8] }))); m.visible = false; G.add(m); H.bubbles.push(m); }
    H.branches = new THREE.Group(); G.add(H.branches);
    H.skyFx = new THREE.Group(); G.add(H.skyFx);
  }

  // ===== TVA office =====
  {
    const b = new Batch(), G = groups.tva;
    b.add(boxG(-30, -0.2, -40, 30, 0, 40, 4), texMat("tvaFloor", tilesTex("#a8743a", "#8a5a2c", 2)));
    const wall = texMat("tvaWall", stripeTex("#c08a4a", "#a8743a", "tva"));
    b.add(boxG(-30, 0, -41, 30, 12, -40, 6), wall); b.add(boxG(-31, 0, -40, -30, 12, 40, 6), wall); b.add(boxG(30, 0, -40, 31, 12, 40, 6), wall);
    b.add(boxG(-30, 12, -40, 30, 12.5, 40), col("#5a3a22"));
    for (let x = -24; x <= 24; x += 12) b.add(boxG(x - 0.8, 0, -40, x + 0.8, 12, -38.6), col("#7a4f2c"));
    const desk = col("#6a4428"), mon = col("#d8c8a0"), monFace = col("#3a6a5a");
    for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) {
      const x = c * 9, z = -14 + r * 9;
      b.add(boxG(x - 2.2, 0, z - 1, x + 2.2, 1.05, z + 1), desk);
      b.add(boxG(x - 0.7, 1.05, z - 0.6, x + 0.7, 2.1, z + 0.5), mon);
      b.add(boxG(x - 0.55, 1.2, z + 0.5, x + 0.55, 1.95, z + 0.52), monFace);
    }
    for (let x = -20; x <= 20; x += 10) for (let z = -30; z <= 30; z += 15) b.add(boxG(x - 2, 11.6, z - 0.3, x + 2, 12, z + 0.3), col("#ffe6b0"));
    b.build(G);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(36, 9), new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }));
    screen.position.set(0, 7, -39.8); screen.layers.set(NOINK); G.add(screen); H.screen = screen;
    // clock
    const clock = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: canvasTex(200, 200, (g) => { g.fillStyle = "#f2e6c8"; g.beginPath(); g.arc(100, 100, 92, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = "#2a1e16"; g.stroke(); g.lineWidth = 8; g.beginPath(); g.moveTo(100, 100); g.lineTo(100, 34); g.moveTo(100, 100); g.lineTo(150, 110); g.stroke(); }), transparent: true }));
    clock.position.set(-29.8, 8, -10); clock.rotation.y = Math.PI / 2; clock.layers.set(NOINK); G.add(clock);
  }

  // ===== MANSION (X-Mansion lawn, cottage, quantum platform, open field) =====
  {
    const b = new Batch(), G = groups.mansion;
    ground(b, 1400, texMat("lawn", speckTex("#6aab4f", ["#5a9a42", "#7cbc5c", "#64a64a"], "lawn", 160, [4, 12])), 0, 12);
    b.add(boxG(-3, 0.02, -48, 3, 0.08, 40, 3), texMat("gravel", speckTex("#d8c8a0", ["#c8b890", "#e6d8b4"], "grav", 90, [2, 6])));
    const brick = texMat("mbrick", facadeTex("#a8604a", "#2f4f6e", "#efe2c4", 21)), roof = col("#4a4f6a"), trim = col("#efe2c4");
    b.add(boxG(-28, 0, -78, 28, 16, -54, 4), brick);
    gable(b, -28, 28, -78, -54, 16, 9, roof, brick);
    for (const s of [-1, 1]) {
      b.add(boxG(s * 28 - 7, 0, -80, s * 28 + 7, 22, -52, 4), brick);
      const cone = new THREE.ConeGeometry(10.5, 10, 4); cone.rotateY(Math.PI / 4); b.add(cone, roof, M4(s * 28, 27, -66));
    }
    b.add(boxG(-8, 0, -54, 8, 1.2, -48), trim); // steps
    for (let x = -6; x <= 6; x += 4) b.add(new THREE.CylinderGeometry(0.45, 0.5, 8, 10), trim, M4(x, 5.2, -49.5));
    b.add(boxG(-8, 9.2, -55, 8, 10.2, -48.5), trim);
    const R = rng(5);
    for (let i = 0; i < 60; i++) { const a = R() * Math.PI * 2, r = 70 + R() * 160, tx = Math.cos(a) * r, tz = -40 + Math.sin(a) * r * 0.8 + 60;
      if ((Math.abs(tx) < 50 && tz < 15) || (tx > 60 && tx < 100 && tz > -5 && tz < 40) || (tx < -40 && tx > -125 && tz > -30 && tz < 40) || (Math.abs(tx) < 12 && tz > 110 && tz < 150)) continue;
      tree(b, tx, tz, 8 + R() * 6, i % 2 ? leaf : leaf2, trunk, 0, i % 3 ? "round" : "cone"); }
    for (let x = -40; x <= 40; x += 6) if (Math.abs(x) > 6) b.add(boxG(x - 2.6, 0, -46, x + 2.6, 1.4, -44.5), leaf2);
    // cottage (Steve & Peggy) at x = 80
    const cw = texMat("cott", facadeTex("#e8dcc0", "#3a5470", "#ffffff", 31));
    b.add(boxG(72, 0, 8, 90, 6, 20, 4), cw); gable(b, 72, 90, 8, 20, 6, 4, col("#8a3a2a"), cw);
    b.add(boxG(72, 0, 20, 90, 0.5, 26), col("#b08a5a")); for (const x of [73, 89]) b.add(new THREE.CylinderGeometry(0.2, 0.2, 3.5, 8), trim, M4(x, 2.2, 25.6));
    b.add(boxG(72, 3.9, 20, 90, 4.2, 26.2), col("#8a3a2a"));
    // quantum platform at x = -80
    b.add(new THREE.CylinderGeometry(7, 7.5, 0.6, 32), col("#c9ccd2"), M4(-80, 0.3, 20));
    b.add(new THREE.TorusGeometry(6.2, 0.25, 6, 40), col("#3fbfe8"), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(-80, 0.65, 20));
    // a clean modern block behind it (the compound)
    b.add(boxG(-110, 0, -20, -50, 9, -4, 4), texMat("cmp", facadeTex("#e8eef4", "#3a5a7a", "#ffffff", 41)));
    b.add(boxG(-110, 9, -20, -50, 9.6, -4), col("#9aa1aa"));
    b.build(G);
  }

  // ===== DESERT (New Mexico / battlefield / the Void) =====
  {
    const b = new Batch(), G = groups.desert;
    const sand = texMat("sand", speckTex("#e2c08a", ["#d8b47c", "#ecd09c", "#caa470"], "sand", 140, [4, 14]));
    const dg = new THREE.PlaneGeometry(1600, 1600, 80, 80); dg.rotateX(-Math.PI / 2);
    const dp = dg.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), z = dp.getZ(i), r = Math.hypot(x, z); dp.setY(i, r < 60 ? 0 : (Math.sin(x * 0.02) * 2.4 + Math.cos(z * 0.025 + x * 0.01) * 2.4) * Math.min(1, (r - 60) / 80)); }
    dg.computeVertexNormals();
    const duv = dg.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < duv.count; i++) duv.setXY(i, duv.getX(i) * 160, duv.getY(i) * 160);
    b.add(dg, sand);
    const mesa = col("#c8703a"), mesa2 = col("#b05a30"), rockM = col("#a8805a"), R = rng(3);
    for (let i = 0; i < 14; i++) { const a = R() * Math.PI * 2, r = 260 + R() * 260; b.add(new THREE.CylinderGeometry(20 + R() * 30, 30 + R() * 34, 26 + R() * 40, 7), i % 2 ? mesa : mesa2, M4(Math.cos(a) * r, 10, Math.sin(a) * r)); }
    for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, r = 22 + R() * 140; b.add(new THREE.DodecahedronGeometry(0.6 + R() * 2.2, 0), rockM, M4(Math.cos(a) * r, 0.3, Math.sin(a) * r, R() * 3, [1, 0.7, 1])); }
    // Magneto's rock tower at (-20, 0, -6): top at y = 4.4
    for (let i = 0; i < 7; i++) { const k = i / 6, r = L1(3.2, 1.3, k); b.add(new THREE.DodecahedronGeometry(r, 0), rockM, M4(-20 + Math.sin(i * 2.1) * 0.5 * (1 - k), 0.6 + k * 3.2, -6.4 + Math.cos(i * 1.7) * 0.4 * (1 - k), i, [1, 0.7, 1])); }
    // crater for Thor
    b.add(new THREE.TorusGeometry(5, 1.1, 6, 24), col("#b8905a"), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0.2, 0));
    // ruins (Void / battlefield) around x = -120
    const ruin = col("#b9ab96"), ruinD = col("#8a7e70");
    for (let i = 0; i < 12; i++) { const x = -150 + R() * 70, z = -40 + R() * 80, h = 2 + R() * 9; b.add(boxG(x, 0, z, x + 1.4 + R() * 5, h, z + 1.2), i % 2 ? ruin : ruinD); }
    for (let i = 0; i < 6; i++) { const x = -150 + R() * 70, z = -40 + R() * 80, h = 3 + R() * 6; b.add(new THREE.CylinderGeometry(0.9, 1, h, 10), ruin, M4(x, h / 2, z)); }
    // wrecked car + giant broken statue head (Void)
    b.add(boxG(-108, 0, 18, -103, 1.6, 21), col("#6a7a8a")); b.add(new THREE.IcosahedronGeometry(9, 1), col("#a89a86"), M4(-160, 4, 30, 0, [1, 0.8, 1]));
    b.build(G);
  }

  // ===== CAVE (workshop) =====
  {
    const b = new Batch(), G = groups.cave;
    const rockIn = texMat("cave", speckTex("#6a5a4e", ["#5a4a40", "#7a6a5c", "#4a3c34"], "cave", 120, [6, 18]));
    const cg = new THREE.SphereGeometry(16, 24, 16), cp = cg.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) { const k = 1 + 0.08 * Math.sin(i * 1.3) + 0.05 * Math.cos(i * 0.7); cp.setXYZ(i, cp.getX(i) * k * 1.2, Math.max(-0.2, cp.getY(i) * 0.6 * k), cp.getZ(i) * k); }
    cg.scale(-1, 1, 1); cg.computeVertexNormals(); b.add(cg, rockIn);
    b.add(boxG(-30, -0.4, -30, 30, 0, 30, 4), texMat("cavef", speckTex("#5a4a40", ["#4a3c34", "#6a5a4e"], "cavef")));
    b.add(boxG(-3, 0, -3, 3, 1.0, -1.6), col("#5c4a3a")); // bench
    b.add(boxG(-2.6, 1.0, -2.8, -1.4, 1.6, -2.0), col("#7a7f88")); b.add(boxG(1, 1.0, -2.9, 2.2, 1.3, -2.2), col("#9aa1aa"));
    for (const [x, z] of [[-6, -4], [5.5, -5], [6, 2]]) b.add(boxG(x - 0.8, 0, z - 0.8, x + 0.8, 1.4, z + 0.8), col("#6a5a3a"));
    b.add(new THREE.SphereGeometry(0.35, 10, 8), col("#fff0c0"), M4(0, 4.5, -2));
    b.build(G);
  }
  // ===== SNOW (ice block) =====
  {
    const b = new Batch(), G = groups.snow;
    ground(b, 1400, texMat("snow", speckTex("#eef4fa", ["#dfe8f4", "#ffffff", "#d6e2f0"], "snow", 120, [4, 14])), 0, 10);
    const ice = col("#bfe0f4"), R = rng(17);
    for (let i = 0; i < 18; i++) { const a = R() * Math.PI * 2, r = 50 + R() * 300; b.add(new THREE.ConeGeometry(8 + R() * 14, 14 + R() * 30, 5), ice, M4(Math.cos(a) * r, 6, Math.sin(a) * r, R() * 3)); }
    b.add(boxG(6, 0, -14, 22, 1.6, -9), col("#6a7470")); b.add(boxG(9, 0, -16, 13, 3.4, -13), col("#5a6460")); // plane wreck wing / tail
    b.build(G);
    const iceM = new THREE.MeshLambertMaterial({ color: "#a8dcff", transparent: true, opacity: 0.55, depthWrite: false });
    H.ice = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1.2), twoTone(iceM)); H.ice.position.set(0, 1.3, 0); G.add(H.ice);
  }

  // ===== RETRO (Earth-828 city) + nursery =====
  {
    const b = new Batch(), G = groups.retro;
    ground(b, 1400, texMat("rplaza", tilesTex("#f2e6c8", "#e6d6b0", 2, "r")), 0, 6);
    const cols = ["#3fb0a8", "#f2e6c8", "#f08a4a", "#9ad8c8", "#e8c060", "#5a9ad0"].map(col), R = rng(23);
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2, r = 45 + R() * 260; if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) > 0) continue;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 40, h = 20 + R() * 90, w = 5 + R() * 7, c = cols[i % cols.length];
      b.add(new THREE.CylinderGeometry(w * 0.8, w, h, 16), c, M4(x, h / 2, z));
      b.add(new THREE.SphereGeometry(w * 0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cols[(i + 2) % cols.length], M4(x, h, z));
      for (let k = 1; k < 3; k++) b.add(new THREE.TorusGeometry(w * 1.02, 0.5, 6, 20), cols[(i + 1) % cols.length], new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, (h * k) / 3, z));
    }
    // the Four's tower (x = 0, z = -120) with a sign
    b.add(new THREE.CylinderGeometry(11, 13, 140, 20), col("#e8eef4"), M4(0, 70, -120)); b.add(new THREE.SphereGeometry(11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), col("#3a6fbf"), M4(0, 140, -120));
    const s4 = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g) => { g.fillStyle = "#3a6fbf"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = "#f2f2f6"; g.stroke(); g.fillStyle = "#f2f2f6"; g.font = `200px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("4", 128, 138); }), transparent: true, alphaTest: 0.4 }));
    s4.position.set(0, 120, -106.8); s4.layers.set(NOINK); G.add(s4);
    // monorail
    for (let x = -300; x <= 300; x += 30) b.add(new THREE.CylinderGeometry(0.8, 0.8, 22, 8), col("#c9ccd2"), M4(x, 11, -60));
    b.add(boxG(-310, 22, -61.2, 310, 23.4, -58.8), col("#e8eef4"));
    // nursery at x = 400 (room 10 x 4 x 10)
    const wall = texMat("nurs", tex("nursT", () => canvasTex(128, 128, (g) => { g.fillStyle = "#3a4e8a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#f2e6a0"; for (const [x, y] of [[20, 30], [80, 20], [50, 80], [110, 90], [20, 110]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }, true)));
    b.add(boxG(395, 0, -5, 405, 4.2, -4.8, 2), wall); b.add(boxG(394.8, 0, -5, 395, 4.2, 5, 2), wall); b.add(boxG(405, 0, -5, 405.2, 4.2, 5, 2), wall);
    b.add(boxG(395, -0.1, -5, 405, 0, 5, 2), texMat("nflo", tilesTex("#8a6a4a", "#7a5a3c", 4, "n")));
    b.add(new THREE.CylinderGeometry(2, 2, 0.05, 24), col("#e86a6a"), M4(400, 0.03, -0.5));
    b.add(boxG(401.5, 0, -4.8, 404.5, 0.9, -2.8), col("#f2e6c8")); b.add(boxG(396, 0, -4.8, 396.6, 1.6, -4.2), col("#c9a46a"));
    b.add(new THREE.SphereGeometry(0.3, 10, 8), col("#ffe6a0"), M4(396.3, 1.9, -4.5));
    b.build(G);
    H.saucers = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8), col(i % 2 ? "#e8c060" : "#f08a4a")); m.scale.set(1, 0.35, 1); G.add(m); H.saucers.push(m); }
  }

  // ===== OCEAN (Wakanda coast) =====
  {
    const b = new Batch(), G = groups.ocean;
    const sandM = texMat("beach", speckTex("#e8d4a0", ["#dcc690", "#f2e0b0"], "beach"));
    b.add(boxG(-200, -0.6, 10, 200, 0.4, 80, 4), sandM);
    const cliff = col("#8a7a6a"), green = col("#3f8a4a"), R = rng(29);
    for (let i = 0; i < 16; i++) b.add(new THREE.DodecahedronGeometry(3 + R() * 6, 0), cliff, M4(-120 + R() * 240, 0.5, 16 + R() * 10, R() * 3, [1, 0.8, 1]));
    for (let i = 0; i < 50; i++) tree(b, -200 + R() * 400, 50 + R() * 140, 8 + R() * 6, i % 2 ? green : leaf2, trunk, 0.4, "round");
    // Wakandan towers on the far hill
    const tw = [col("#7a5aa8"), col("#3a3d47"), col("#c9a46a")];
    for (let i = 0; i < 12; i++) { const x = -160 + i * 28 + R() * 10, h = 40 + R() * 60; b.add(new THREE.CylinderGeometry(4, 7, h, 10), tw[i % 3], M4(x, h / 2, 220)); b.add(new THREE.SphereGeometry(5, 12, 8), tw[(i + 1) % 3], M4(x, h, 220, 0, [1, 0.6, 1])); }
    b.add(boxG(-400, -2, 180, 400, 10, 400), green);
    b.build(G);
    const wt = canvasTex(256, 256, (g) => { g.fillStyle = "#2a8ab0"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#7fd0e8"; g.lineWidth = 5; g.lineCap = "round"; const R2 = rng(4); for (let i = 0; i < 26; i++) { const x = R2() * 256, y = R2() * 256; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 8, x + 28, y); g.stroke(); } }, true);
    wt.repeat.set(60, 60);
    H.water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), lam("water", () => ({ map: wt })));
    H.water.rotation.x = -Math.PI / 2; H.water.position.set(0, -0.1, -600); G.add(H.water);
  }

  // ===== CASTLE (Doom) =====
  {
    const b = new Batch(), G = groups.castle;
    ground(b, 1400, texMat("court", stoneTex("#7a7e78", "court")), 0, 4);
    const st = texMat("cwall", stoneTex("#8a8e86", "cwall")), roofM = col("#2f4a3a"), R = rng(31);
    const wallRun = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      const g = boxG(0, 0, -1.5, len, 14, 1.5, 4); b.add(g, st, new THREE.Matrix4().makeRotationY(-ang).setPosition(x0, 0, z0));
      for (let d = 1; d < len; d += 3.2) b.add(boxG(d, 14, -1.5, d + 1.6, 15.8, 1.5), st, new THREE.Matrix4().makeRotationY(-ang).setPosition(x0, 0, z0));
    };
    wallRun(-50, -60, 50, -60); wallRun(-50, -60, -50, 50); wallRun(50, -60, 50, 50);
    for (const [x, z, h] of [[-50, -60, 30], [50, -60, 30], [-50, 50, 24], [50, 50, 24], [0, -95, 62]] as [number, number, number][]) {
      const r = h > 40 ? 14 : 7;
      b.add(new THREE.CylinderGeometry(r, r * 1.1, h, 14), st, M4(x, h / 2, z)); b.add(new THREE.ConeGeometry(r * 1.25, r * 1.8, 14), roofM, M4(x, h + r * 0.9, z));
    }
    b.add(boxG(-26, 0, -92, 26, 40, -62, 4), st); b.add(boxG(-6, 0, -62.5, 6, 12, -61.5), col("#2a2420")); // keep + gate
    for (let i = 0; i < 6; i++) { const x = -40 + i * 16; b.add(new THREE.CylinderGeometry(0.9, 1.1, 2.4, 10), col("#3a3d47"), M4(x, 1.2, -20 + (i % 2) * 30)); }
    b.build(G);
    const ban = canvasTex(128, 320, (g) => { g.fillStyle = "#2f6b3a"; g.fillRect(0, 0, 128, 320); g.fillStyle = "#e8b33c"; g.fillRect(0, 0, 128, 16); g.fillRect(0, 300, 128, 20); g.beginPath(); g.moveTo(64, 120); g.lineTo(104, 170); g.lineTo(64, 220); g.lineTo(24, 170); g.fill(); });
    for (const x of [-18, -6, 6, 18]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 15), lam("banner", () => ({ map: ban, side: THREE.DoubleSide }))); m.position.set(x, 26, -61.6); G.add(m); }
  }

  // ship of the Four (posed per shot; lives in the city group)
  {
    const s = new THREE.Group(), hull = col("#e8eef4"), blue = col("#3a6fbf");
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 22, 20), hull); s.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(3.2, 9, 20), blue); nose.position.y = 15.5; s.add(nose);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 5), blue); const a = (i / 4) * Math.PI * 2 + Math.PI / 4; f.position.set(Math.cos(a) * 4.6, -8, Math.sin(a) * 4.6); f.rotation.y = -a; s.add(f); }
    const four = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g) => { g.fillStyle = "#3a6fbf"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = "#f2f2f6"; g.stroke(); g.fillStyle = "#f2f2f6"; g.font = `200px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("4", 128, 140); }), transparent: true, alphaTest: 0.4 }));
    four.position.set(0, 2, 3.9); four.layers.set(NOINK); s.add(four);
    s.visible = false; groups.city.add(s); H.ship = s;
  }
  // the quantum / end-of-time platform handle (unused placeholder for posing)
  H.platform = new THREE.Mesh(); H.platform.visible = false; groups.space.add(H.platform);
  return { groups, H };
};
