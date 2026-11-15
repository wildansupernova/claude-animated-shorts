// The Henrietta Lacks short's whole world (built from the Haber world) as one three.js scene: five sets far apart, each its own static batch (so a set out
// of view is frustum-culled), plus the moving parts (gauge needle, compressor piston, furnace glow, sacks and the
// shell on the factory chute, the blockading warship, the field gun's recoil, the searchlight, lamp + candle glow).
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f), like the bridge world.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, tri, house, prop, Kit } from "./build";
import { rep, ctex, rng, planksHD, beamHD, stoneHD, grassHD, waterNear, waterFar, cloudHD, brick, cobbleHD, facadeHD } from "./paint";
import { Pen, bodyFront, townsfolk, KID, INK } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, HENRIETTA } from "./cast";
import { skull } from "./fx";
import { FPS, SHOTS, P, EV, T, LAB, CELLS, SPACE, LAUNCH, HOSPITAL, camAt, V3, ShotDef, clamp01, easeOut, smooth } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
const dirtTex = () => ctex("dirtH", 512, 512, (g, r) => {
  g.fillStyle = "#b08a5c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,86,52,0.25)" : "rgba(214,184,140,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 26, 4 + r() * 12, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(80,60,40,0.5)"; g.beginPath(); g.arc(r() * 512, r() * 512, 1.5 + r() * 3, 0, 7); g.fill(); }
});
const mudTex = () => ctex("mudH", 1024, 1024, (g, r) => {
  g.fillStyle = "#7d6248"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? "rgba(70,52,38,0.28)" : "rgba(150,120,88,0.22)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * 1024, y = r() * 1024, rr = 20 + r() * 50; g.strokeStyle = "rgba(55,40,30,0.55)"; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, 0, 0, 7); g.stroke(); g.fillStyle = "rgba(60,46,36,0.35)"; g.fill(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(120,140,170,0.35)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 12 + r() * 30, 5 + r() * 10, 0, 0, 7); g.fill(); }
});
const sandbagTex = () => ctex("sandbagH", 512, 512, (g, r) => {
  g.fillStyle = "#8f7a5a"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) for (let k = -1; k < 4; k++) {
    const x = k * 140 + (row % 2) * 70 + 8, y = row * 128 + 6, c = ["#cdb68a", "#c4ab7c", "#d6c094", "#bba275"][Math.floor(r() * 4)];
    g.fillStyle = c; g.strokeStyle = "rgba(60,45,35,0.9)"; g.lineWidth = 5;
    g.beginPath(); g.ellipse(x + 62, y + 58, 66, 56, 0, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = "rgba(110,90,60,0.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 20, y + 40); g.lineTo(x + 104, y + 36); g.stroke();
  }
});
const wheatTex = () => ctex("wheatH2", 512, 512, (g, r) => {
  g.fillStyle = "#d8a646"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(150,96,30,0.35)"; g.fillRect(0, y + 50, 512, 14); g.fillStyle = "rgba(255,226,140,0.3)"; g.fillRect(0, y + 6, 512, 18); }
  for (let i = 0; i < 1100; i++) {
    const x = r() * 512, y = r() * 512, lean = (r() - 0.5) * 8, light = r() < 0.5;
    g.strokeStyle = light ? "rgba(255,228,140,0.6)" : "rgba(140,92,28,0.45)"; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y + 12); g.lineTo(x + lean, y - 12); g.stroke();
    if (r() < 0.45) { g.fillStyle = r() < 0.5 ? "rgba(250,214,120,0.95)" : "rgba(196,140,52,0.9)"; g.beginPath(); g.ellipse(x + lean, y - 14, 4, 8, lean * 0.05, 0, 7); g.fill(); }
  }
});
const tileTex = () => ctex("labTile", 512, 512, (g) => {
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#e8dcc2" : "#b9654a"; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = "rgba(70,50,40,0.45)"; g.lineWidth = 3;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
});
const labWallTex = () => ctex("labWall", 512, 1024, (g, r) => {
  // 4.6 m tall wall per texture height: plaster above, wood wainscot below (0..1.1 m), dado rail
  const H = 1024, wy = H - (1.1 / 4.6) * H;
  g.fillStyle = "#cfd8b8"; g.fillRect(0, 0, 512, wy);
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,240,0.12)" : "rgba(120,140,100,0.1)"; g.beginPath(); g.ellipse(r() * 512, r() * wy, 20 + r() * 60, 10 + r() * 30, 0, 0, 7); g.fill(); }
  g.fillStyle = "#7a5236"; g.fillRect(0, wy, 512, H - wy);
  for (let x = 0; x < 512; x += 128) { g.strokeStyle = "rgba(40,25,20,0.7)"; g.lineWidth = 6; g.strokeRect(x + 14, wy + 30, 100, H - wy - 60); }
  g.fillStyle = "#5e3c26"; g.fillRect(0, wy - 12, 512, 18);
});
const windowTex = () => ctex("labWindow", 256, 384, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 384);
  g.fillStyle = "#e9e1d0"; g.fillRect(0, 0, 256, 384);
  g.fillStyle = "#ffffff"; g.fillRect(18, 18, 220, 348);
  g.fillStyle = "#e9e1d0"; g.fillRect(122, 18, 12, 348); g.fillRect(18, 126, 220, 12); g.fillRect(18, 246, 220, 12);
  g.strokeStyle = "rgba(40,30,40,0.9)"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 376);
});
const dialTex = () => ctex("dial", 256, 256, (g) => {
  g.fillStyle = "#f7f1e1"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.strokeStyle = "#221f2e"; g.lineWidth = 14; g.stroke();
  g.lineCap = "round";
  for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 1.5 * (i / 10)); g.lineWidth = i % 5 ? 5 : 9; g.strokeStyle = i > 7 ? "#c8323a" : "#221f2e"; g.beginPath(); g.moveTo(128 + 78 * Math.cos(a), 128 + 78 * Math.sin(a)); g.lineTo(128 + 100 * Math.cos(a), 128 + 100 * Math.sin(a)); g.stroke(); }
  g.strokeStyle = "#c8323a"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 90, Math.PI * (0.75 + 1.5 * 0.75), Math.PI * 2.25); g.stroke();
});
const canTex = () => ctex("canLabel", 512, 256, (g) => {
  g.fillStyle = "#c9a43a"; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#2a2a30"; g.fillRect(0, 0, 512, 34); g.fillRect(0, 222, 512, 34);
  g.fillStyle = "#e0c45a"; g.fillRect(150, 40, 212, 176);
  g.strokeStyle = "rgba(40,30,40,0.9)"; g.lineWidth = 6; g.strokeRect(150, 40, 212, 176);
  skull(new Pen(g), 256, 120, 0.85);
});
const photoTex = () => ctex("photo", 320, 400, (g) => {
  g.fillStyle = "#6a4428"; g.fillRect(0, 0, 320, 400);
  g.fillStyle = "#e9dcc0"; g.fillRect(26, 26, 268, 348);
  g.fillStyle = "#d2bf98"; g.fillRect(36, 36, 248, 328);
  const fam = [townsfolk(1), townsfolk(0), KID, townsfolk(3)];
  [[60, 0.36], [150, 0.36], [118, 0.26], [228, 0.33]].forEach(([x, s], k) => {
    g.save(); g.translate(x - 300 * s + 20, 360 - 975 * s); g.scale(s, s);
    bodyFront(new Pen(g), fam[k], { mode: "stand", expr: k === 2 ? "grin" : "smile_closed", seed: k + 2 }); g.restore();
  });
  g.fillStyle = "rgba(150,110,60,0.22)"; g.fillRect(36, 36, 248, 328);
  g.strokeStyle = "rgba(30,20,20,0.9)"; g.lineWidth = 8; g.strokeRect(4, 4, 312, 392);
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});
const glowTex = () => ctex("glow", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------------- geometry helpers ----------------
/** horizontal quad facing up at height y covering x0..x1, z0..z1, one texture tile per `tile` metres */
const ground = (x0: number, x1: number, z0: number, z1: number, tile: number, y = 0) => {
  const g = new THREE.BufferGeometry(), u = (x1 - x0) / tile, v = (z1 - z0) / tile;
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([0, 1, 0]).flat(), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};
const cyl = (r0: number, r1: number, h: number, n = 16) => new THREE.CylinderGeometry(r1, r0, h, n).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: number | V3 = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), typeof s === "number" ? V(s, s, s) : V(...s));
/** cylinder from a to b (radius r) */
const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, n = 8) => {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), n);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
};
/** wheat patch: a slab with a wavy top, painted stalks; top subdivided so the silhouette ripples */
const wheatPatch = (b: Batch, mat: THREE.Material, x0: number, x1: number, z0: number, z1: number, h: number, seed: number) => {
  const r = rng(seed), nx = Math.max(2, Math.round((x1 - x0) / 0.8)), nz = Math.max(2, Math.round((z1 - z0) / 0.8));
  const top = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, h, (z0 + z1) / 2);
  const p = top.attributes.position as THREE.BufferAttribute, uv = top.attributes.uv as THREE.BufferAttribute;
  const ph = [r() * 6, r() * 6];
  const hy = (x: number, z: number) => h + 0.07 * Math.sin(x * 2.3 + ph[0]) * Math.cos(z * 1.9 + ph[1]) + 0.05 * Math.sin(x * 5.1 + z * 4.3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hy(x, z)); uv.setXY(i, x / 2, z / 2); }
  top.computeVertexNormals();
  b.add(top, mat);
  const side = (ax: number, az: number, bx: number, bz: number) => {
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 0.5)), pos: number[] = [], uvs: number[] = [], nor: number[] = [];
    const nx2 = bz - az, nz2 = -(bx - ax), nl = Math.hypot(nx2, nz2);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, xa = ax + (bx - ax) * t0, za = az + (bz - az) * t0, xb = ax + (bx - ax) * t1, zb = az + (bz - az) * t1;
      const ya = hy(xa, za), yb = hy(xb, zb), L = Math.hypot(bx - ax, bz - az);
      pos.push(xa, 0, za, xb, 0, zb, xb, yb, zb, xa, 0, za, xb, yb, zb, xa, ya, za);
      uvs.push((t0 * L) / 2, 0, (t1 * L) / 2, 0, (t1 * L) / 2, yb / 2, (t0 * L) / 2, 0, (t1 * L) / 2, yb / 2, (t0 * L) / 2, ya / 2);
      for (let k = 0; k < 6; k++) nor.push(nx2 / nl, 0, nz2 / nl);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    b.add(g, mat);
  };
  side(x0, z1, x1, z1); side(x1, z0, x0, z0); side(x0, z0, x0, z1); side(x1, z1, x1, z0);
};
/** a flask (Erlenmeyer) as a lathe, base at y = 0, height h */
const flaskGeo = (h: number) => new THREE.LatheGeometry([[0.001, 0], [0.42, 0], [0.45, 0.04], [0.4, 0.3], [0.14, 0.72], [0.12, 0.74], [0.12, 0.98], [0.14, 1.0]].map(([x, y]) => new THREE.Vector2(x * h * 0.5, y * h)), 20);

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.15 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

type Smoke = { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; top: () => V3; k: number; set: string; drift: V3 };

const tobaccoTex = () => ctex("tobaccoH", 512, 512, (g, r) => {
  g.fillStyle = "#4b8536"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(30,70,25,0.35)"; g.fillRect(0, y + 52, 512, 12); }
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, a = (r() - 0.5) * 1.2, light = r() < 0.5;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = light ? "rgba(140,200,90,0.75)" : "rgba(52,110,40,0.75)"; g.beginPath(); g.ellipse(0, 0, 9, 22, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(190,230,140,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 18); g.stroke();
    g.restore();
  }
});
const mediumTex = () => ctex("medium", 512, 512, (g, r) => {
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 300);
  gr.addColorStop(0, "#fbd6e2"); gr.addColorStop(1, "#f0a9c2");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.25)" : "rgba(200,110,160,0.18)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 30, 6 + r() * 30, 0, 0, 7); g.fill(); }
});
const earthTex = () => ctex("earth", 1024, 512, (g, r) => {
  g.fillStyle = "#2f6fb5"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 26; i++) { const x = r() * 1024, y = 90 + r() * 330; g.fillStyle = r() < 0.6 ? "#5aa83c" : "#c9a15a"; g.beginPath(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = 40 + r() * 70; g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 8 + r() * 10; g.lineCap = "round"; g.beginPath(); const x = r() * 1024, y = r() * 512; g.moveTo(x, y); g.quadraticCurveTo(x + 60, y - 30 * r(), x + 120 + r() * 80, y + 10); g.stroke(); }
  g.fillStyle = "#f4f6fa"; g.fillRect(0, 0, 1024, 40); g.fillRect(0, 472, 1024, 40);
});

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: { m: THREE.Mesh; a: number; d: number; y: number }[] = [];
  private smoke: Smoke[] = [];
  private windowMat!: THREE.MeshBasicMaterial;
  private drum!: THREE.Group; private sat!: THREE.Group; private rocket!: THREE.Group; private exhaust!: THREE.Sprite; private stars!: THREE.Points;
  private frustum = new THREE.Frustum();
  private sets = new Map<string, THREE.Group>();
  private group(name: string) { let g = this.sets.get(name); if (!g) { g = new THREE.Group(); this.sets.set(name, g); this.root.add(g); } return g; }
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky + light (as the bridge world) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.scale.set(w, w / 2, 1); m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push({ m, a: (i / 9) * Math.PI * 2 + 0.3, d: 620 + (i % 3) * 60, y: 120 + (i % 4) * 38 }); R.add(m);
    }
    const smokeT = smokeTex();
    const addSmoke = (top: () => V3, n: number, set: string, drift: V3 = [-18, 13, 3]) => {
      for (let k = 0; k < n; k++) {
        const mat = new THREE.MeshLambertMaterial({ map: smokeT, transparent: true, depthWrite: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK); m.frustumCulled = false;
        this.smoke.push({ m, mat, top, k: k / n, set, drift }); R.add(m);
      }
    };

    // ======================= LAND: tobacco farm (origin), town (z 60), Johns Hopkins (60, -100) =======================
    {
      const R = this.group("land");
      const b = new Batch();
      const grassM = lam("grassHD", () => ({ map: grassHD() })), dirtM = lam("dirtH", () => ({ map: dirtTex() })), tobM = lam("tobaccoH", () => ({ map: tobaccoTex() }));
      const cobM = lam("cobbleHD", () => ({ map: cobbleHD() })), wood = lam("woodBeam", () => ({ map: beamHD() })), white = lam("trimWhite", () => ({ color: "#efe8da" }));
      b.add(ground(-150, 150, -250, 250, 4), grassM);
      b.add(ground(-1.2, 1.2, -60, 50, 2.4, 0.01), dirtM);
      b.add(ground(-2.6, -0.2, -9.6, -1.0, 2.4, 0.011), dirtM); // yard path to the porch
      for (const [x0, x1, z0, z1, s] of [[1.4, 2.7, -32, 6, 1], [3.7, 26, -32, 6, 2], [-34, -12.5, -32, -17, 3], [-34, -12.5, -4, 14, 4], [3.7, 26, 10, 30, 5], [-60, -36, -40, 20, 6], [30, 60, -60, 20, 7]] as const)
        wheatPatch(b, tobM, x0, x1, z0, z1, 1.25, s);
      house(b, -7, -13, 0, 8, 7, 4.2, 4);
      b.add(boxGeo(V(-11, 0, -9.5), V(-3, 0.35, -7.0), 1.2), wood);                    // porch deck
      for (const x of [-10.8, -3.2]) b.add(boxGeo(V(x - 0.08, 0.35, -7.25), V(x + 0.08, 2.9, -7.09)), white);
      b.add(boxGeo(V(-11.2, 2.9, -9.5), V(-2.8, 3.05, -6.9)), lam("porchRoof", () => ({ color: "#8f97a8" })));
      for (const x of [-10.0, -9.0, -5.2, -4.2]) b.add(boxGeo(V(x - 0.03, 0.35, -7.2), V(x + 0.03, 1.15, -7.14)), white);
      b.add(boxGeo(V(-10.8, 1.1, -7.22), V(-3.2, 1.18, -7.12)), white);
      const Ch = P.chair, chairM = lam("chairWood", () => ({ color: "#8a5634" }));        // rocking chair
      b.add(boxGeo(V(Ch[0] - 0.28, 0.42 + Ch[1], Ch[2] - 0.25), V(Ch[0] + 0.28, 0.48 + Ch[1], Ch[2] + 0.25)), chairM);
      b.add(boxGeo(V(Ch[0] - 0.28, 0.48 + Ch[1], Ch[2] - 0.27), V(Ch[0] + 0.28, 1.15 + Ch[1], Ch[2] - 0.21)), chairM);
      for (const sx of [-0.25, 0.25]) {
        b.add(new THREE.TorusGeometry(0.9, 0.03, 6, 24, 0.9).rotateY(Math.PI / 2).rotateX(0), chairM, M4(Ch[0] + sx, Ch[1] + 0.9 + 0.0, Ch[2] - 0.0, -Math.PI / 2 - 0.45, 0, 0));
        for (const sz of [-0.2, 0.2]) b.add(boxGeo(V(Ch[0] + sx - 0.03, Ch[1] + 0.04, Ch[2] + sz - 0.03), V(Ch[0] + sx + 0.03, Ch[1] + 0.45, Ch[2] + sz + 0.03)), chairM);
      }
      house(b, 13, -27, -0.1, 10, 8, 4.8, 2);
      for (const [x0, z0, x1, z1] of [[-12, -1, -2.2, -1], [2.2, 7, 26, 7]] as const) {
        const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4);
        for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n; b.add(boxGeo(V(x - 0.06, 0, z - 0.06), V(x + 0.06, 1.0, z + 0.06)), wood); }
        for (const y of [0.45, 0.85]) b.add(rod(V(x0, y, z0), V(x1, y, z1), 0.04, 6), wood);
      }
      const tr = rng(19);
      for (let i = 0; i < 30; i++) { const a = tr() * Math.PI * 2, d = 50 + tr() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d - 30; if (Math.abs(x) < 6 || (z > 30 && z < 100)) continue; prop(b, {}, ["tree_oak", "tree_default", "tree_fat", "tree-high-round"][i % 4], x, 0, z, 8 + tr() * 5, tr() * 6); }
      for (const [x, z, h] of [[-15, -20, 8], [-1.5, -16, 7], [8, -14, 6.5], [-14, 2, 7]] as const) prop(b, {}, "tree_oak", x, 0, z, h);
      // ---- town (Turner Station / Baltimore): a row of houses facing the street, the courthouse, the clinic table ----
      b.add(ground(-60, 60, 56.6, 64, 2.4, 0.012), cobM);
      b.add(ground(-26, -2, 64, 82, 2.4, 0.012), cobM); // town square
      for (const [x, si, w, h] of [[-46, 1, 9, 5.6], [-14, 0, 8, 5.2], [-4, 5, 8, 6.0], [6, 3, 8, 5.4], [16, 6, 8, 5.0], [24, 2, 7, 4.8], [33, 7, 8, 5.6], [43, 1, 9, 5.2]] as const)
        house(b, x, 52, 0, w, 8, h, si);
      const Hm = P.home;                                                                // the family's porch
      b.add(boxGeo(V(Hm[0] - 2.6, 0, 56), V(Hm[0] + 2.6, 0.32, 58.0), 1.2), wood);
      for (const x of [Hm[0] - 2.4, Hm[0] + 2.4]) b.add(boxGeo(V(x - 0.07, 0.32, 57.8), V(x + 0.07, 2.7, 57.95)), white);
      b.add(boxGeo(V(Hm[0] - 2.8, 2.7, 56), V(Hm[0] + 2.8, 2.84, 58.2)), lam("porchRoof", () => ({ color: "#8f97a8" })));
      const stone = lam("courtStone", () => ({ map: stoneHD("courtHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
      const Cx = P.court[0];
      b.add(boxGeo(V(Cx - 9, 0, 44), V(Cx + 9, 9, 54.6), 2), stone);
      b.add(boxGeo(V(Cx - 9.4, 9, 43.6), V(Cx + 9.4, 9.6, 55.2)), white);
      b.add(tri(V(Cx - 8, 9.6, 55.25), V(Cx + 8, 9.6, 55.25), V(Cx, 12.4, 55.25)), white);
      b.add(tri(V(Cx + 8, 9.6, 55.15), V(Cx - 8, 9.6, 55.15), V(Cx, 12.4, 55.15)), white);
      b.add(quad(V(Cx - 8, 9.6, 55.2), V(Cx, 12.4, 55.2), V(Cx, 12.4, 43.8), V(Cx - 8, 9.6, 43.8)), lam("roofCourt", () => ({ color: "#9aa0ab" })));
      b.add(quad(V(Cx, 12.4, 55.2), V(Cx + 8, 9.6, 55.2), V(Cx + 8, 9.6, 43.8), V(Cx, 12.4, 43.8)), lam("roofCourt", () => ({ color: "#9aa0ab" })));
      for (let k = 0; k < 6; k++) b.add(cyl(0.42, 0.36, 9, 16), white, M4(Cx - 6.25 + k * 2.5, 0.9, 55.3));
      for (let k = 0; k < 3; k++) b.add(boxGeo(V(Cx - 8.6, 0, 55.0 + k * 0.6), V(Cx + 8.6, 0.9 - k * 0.3, 55.6 + k * 0.6)), stone);
      b.add(boxGeo(V(Cx - 1.4, 0.9, 54.55), V(Cx + 1.4, 4.2, 54.62)), lam("courtDoor", () => ({ color: "#5a3c2a" })));
      const Cl = P.clinic;                                                              // clinic table + bottles
      b.add(boxGeo(V(Cl[0] - 1.25, 0.72, Cl[2] - 0.75), V(Cl[0] - 0.25, 0.78, Cl[2] - 0.15)), white);
      for (const [dx, dz] of [[-1.15, -0.7], [-0.35, -0.7], [-1.15, -0.2], [-0.35, -0.2]]) b.add(boxGeo(V(Cl[0] + dx - 0.03, 0, Cl[2] + dz - 0.03), V(Cl[0] + dx + 0.03, 0.72, Cl[2] + dz + 0.03)), wood);
      for (let k = 0; k < 5; k++) b.add(cyl(0.035, 0.035, 0.12, 10), lam("vial", () => ({ color: "#f2c14e" })), M4(Cl[0] - 1.1 + k * 0.17, 0.78, Cl[2] - 0.45));
      // ---- Johns Hopkins: brick hall, white dome on a drum, lower wings ----
      const Hx = HOSPITAL[0], Hz = HOSPITAL[2];
      const brickM = lam("hopBrick", () => ({ map: rep(brick(), 4, 4), color: "#d08a6a" }));
      const front = lam("hopFront", () => ({ map: facadeHD("hopFront", 16, 12, { wall: "#c47a5c", shutter: "#2f5f6a", door: true, brick: true }) }));
      b.add(boxGeo(V(Hx - 8, 0, Hz - 6), V(Hx + 8, 12, Hz + 6), 4), brickM);
      b.add(quad(V(Hx - 8, 0, Hz + 6.01), V(Hx + 8, 0, Hz + 6.01), V(Hx + 8, 12, Hz + 6.01), V(Hx - 8, 12, Hz + 6.01)), front);
      b.add(boxGeo(V(Hx - 8.3, 12, Hz - 6.3), V(Hx + 8.3, 12.6, Hz + 6.3)), white);
      b.add(cyl(4.2, 4.2, 3.2, 28), white, M4(Hx, 12.6, Hz));
      b.add(new THREE.SphereGeometry(4.4, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), lam("domeM", () => ({ color: "#e8e4dc" })), M4(Hx, 15.8, Hz));
      b.add(cyl(0.7, 0.6, 2.2, 12), white, M4(Hx, 19.9, Hz));
      b.add(new THREE.ConeGeometry(0.75, 1.2, 12), white, M4(Hx, 22.6, Hz));
      for (const sx of [-1, 1]) {
        b.add(boxGeo(V(Hx + sx * 8 - (sx < 0 ? 12 : 0), 0, Hz - 4.5), V(Hx + sx * 8 + (sx > 0 ? 12 : 0), 8, Hz + 4.5), 4), brickM);
        b.add(quad(V(Hx + (sx < 0 ? -20 : 8), 0, Hz + 4.51), V(Hx + (sx < 0 ? -8 : 20), 0, Hz + 4.51), V(Hx + (sx < 0 ? -8 : 20), 8, Hz + 4.51), V(Hx + (sx < 0 ? -20 : 8), 8, Hz + 4.51)),
          lam("hopWing", () => ({ map: facadeHD("hopWing", 12, 8, { wall: "#c47a5c", shutter: "#2f5f6a", brick: true }) })));
      }
      b.add(ground(Hx - 2, Hx + 2, Hz + 6, Hz + 30, 2.4, 0.012), cobM);
      for (const [x, z] of [[-13, 15], [13, 15], [-15, 24], [15, 24]] as const) prop(b, {}, "tree_default", Hx + x, 0, Hz + z, 6.5);
      b.build(R);
    }

    // ======================= LAB (x 200): Gey's lab, the exam corner, the modern microscope =======================
    {
      const R = this.group("lab");
      const b = new Batch(), L = LAB;
      const tileM = lam("labTile", () => ({ map: tileTex() })), wallM = lam("labWall", () => ({ map: labWallTex() }));
      const wood = lam("benchWood", () => ({ map: beamHD() })), top = lam("benchTop", () => ({ color: "#5a3c2a" })), white = lam("labWhite", () => ({ color: "#efe8da" }));
      b.add(ground(L[0] - 7, L[0] + 7, L[2] - 7, L[2] + 6, 1.6, 0), tileM);
      const wq = (ax: number, az: number, bx: number, bz: number, u: number) => quad(V(ax, 0, az), V(bx, 0, bz), V(bx, 4.6, bz), V(ax, 4.6, az), u, 1);
      b.add(wq(L[0] - 7, L[2] - 7, L[0] + 7, L[2] - 7, 7), wallM);
      b.add(wq(L[0] - 7, L[2] + 6, L[0] - 7, L[2] - 7, 6.5), wallM);
      b.add(wq(L[0] + 7, L[2] - 7, L[0] + 7, L[2] + 6, 6.5), wallM);
      b.add(boxGeo(V(L[0] - 7.2, 4.6, L[2] - 7.2), V(L[0] + 7.2, 4.85, L[2] + 6)), lam("cornice", () => ({ color: "#e9e0cc" })));
      b.add(boxGeo(V(L[0] - 6, 0, L[2] - 6.95), V(L[0] + 6, 0.84, L[2] - 6.1)), wood);
      b.add(boxGeo(V(L[0] - 6.05, 0.84, L[2] - 6.98), V(L[0] + 6.05, 0.9, L[2] - 6.05)), top);
      const glass = ["#6fae7a", "#c98a3a", "#5a7ec0", "#b8d8e0", "#a65a5a"], br = rng(5);
      for (const [x0, x1] of [[-6, -1.8], [2.4, 6]] as const) for (const y of [1.9, 2.6]) {
        b.add(boxGeo(V(L[0] + x0, y - 0.04, L[2] - 7), V(L[0] + x1, y, L[2] - 6.7)), top);
        for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.22 + br() * 0.18) {
          const h = 0.16 + br() * 0.18, rr = 0.045 + br() * 0.03;
          b.add(cyl(rr, rr * (br() < 0.5 ? 0.5 : 1), h, 10), lam("glass" + Math.floor(br() * 5), () => ({ color: glass[Math.floor(br() * 5)] })), M4(L[0] + x, y, L[2] - 6.85));
        }
      }
      // tube racks with pink culture medium along the bench
      const rackM = lam("rackM", () => ({ color: "#d9cdb4" })), pinkM = lam("medium", () => ({ color: "#f08aa8" })), tubeG = lam("tubeGlass", () => ({ color: "#dff1fa" }));
      for (const rx of [-0.2, 0.5, 3.3]) {
        b.add(boxGeo(V(L[0] + rx, 0.9, L[2] - 6.6), V(L[0] + rx + 0.5, 0.98, L[2] - 6.4)), rackM);
        for (let k = 0; k < 5; k++) { const x = L[0] + rx + 0.06 + k * 0.095; b.add(cyl(0.022, 0.022, 0.2, 8), tubeG, M4(x, 0.94, L[2] - 6.5)); b.add(cyl(0.02, 0.02, 0.09, 8), pinkM, M4(x, 0.95, L[2] - 6.5)); }
      }
      // microscope on the bench
      const Mi = P.microscope, scopeM = twoTone(new THREE.MeshPhongMaterial({ color: "#2f3542", specular: "#9a9a9a", shininess: 50 }), 0.15), brass = lam("brassM", () => ({ color: "#c9a24e" }));
      b.add(boxGeo(V(Mi[0] - 0.14, Mi[1], Mi[2] - 0.1), V(Mi[0] + 0.14, Mi[1] + 0.04, Mi[2] + 0.14)), scopeM);
      b.add(rod(V(Mi[0], Mi[1] + 0.04, Mi[2] - 0.06), V(Mi[0], Mi[1] + 0.32, Mi[2] - 0.02), 0.035), scopeM);
      b.add(boxGeo(V(Mi[0] - 0.09, Mi[1] + 0.14, Mi[2] - 0.02), V(Mi[0] + 0.09, Mi[1] + 0.16, Mi[2] + 0.12)), scopeM);
      b.add(rod(V(Mi[0], Mi[1] + 0.3, Mi[2] - 0.02), V(Mi[0], Mi[1] + 0.48, Mi[2] + 0.06), 0.03), brass);
      b.add(rod(V(Mi[0], Mi[1] + 0.3, Mi[2] + 0.04), V(Mi[0], Mi[1] + 0.2, Mi[2] + 0.06), 0.025), brass);
      // exam corner: table with a sheet, a curtain on a rail
      const E = P.exam;
      b.add(boxGeo(V(E[0] - 0.5, 0.62, E[2] - 1.0), V(E[0] + 0.5, 0.75, E[2] + 1.0)), white);
      for (const [dx, dz] of [[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]]) b.add(boxGeo(V(E[0] + dx - 0.03, 0, E[2] + dz - 0.03), V(E[0] + dx + 0.03, 0.62, E[2] + dz + 0.03)), scopeM);
      b.add(rod(V(E[0] - 1.6, 2.4, E[2] - 1.6), V(E[0] - 1.6, 2.4, E[2] + 1.4), 0.02), scopeM);
      const curtain = new THREE.PlaneGeometry(2.8, 2.2, 14, 1); const cp = curtain.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < cp.count; i++) cp.setZ(i, 0.08 * Math.sin(cp.getX(i) * 6));
      curtain.computeVertexNormals();
      b.add(curtain, lam("curtainM", () => ({ color: "#9ec2b5", side: THREE.DoubleSide })), M4(E[0] - 1.62, 1.28, E[2] - 0.1, 0, Math.PI / 2, 0));
      // the paper tower: a hundred thousand studies
      const Pp = P.papers, paperM = lam("paperM", () => ({ color: "#f6f0de" })), paperB = lam("paperB", () => ({ color: "#d8cdb2" })), pr = rng(23);
      for (let k = 0; k < 26; k++) { const y = k * 0.17, j = (pr() - 0.5) * 0.12, w = 0.62 + pr() * 0.12; b.add(boxGeo(V(Pp[0] - w / 2 + j, y, Pp[2] - 0.4), V(Pp[0] + w / 2 + j, y + 0.16, Pp[2] + 0.4)), k % 3 ? paperM : paperB, M4(0, 0, 0)); }
      // DNA model on the bench
      const D = P.dna, red = lam("dnaRed", () => ({ color: "#d9534f" })), blue = lam("dnaBlue", () => ({ color: "#3f6fb5" })), stick = lam("dnaStick", () => ({ color: "#efe8da" }));
      for (let k = 0; k < 14; k++) {
        const y = 0.06 + k * 0.045, a = k * 0.55;
        const pa = V(D[0] + 0.1 * Math.cos(a), D[1] + y, D[2] + 0.1 * Math.sin(a)), pb = V(D[0] - 0.1 * Math.cos(a), D[1] + y, D[2] - 0.1 * Math.sin(a));
        b.add(new THREE.SphereGeometry(0.024, 10, 8), k % 2 ? red : blue, M4(pa.x, pa.y, pa.z)); b.add(new THREE.SphereGeometry(0.024, 10, 8), k % 2 ? blue : red, M4(pb.x, pb.y, pb.z));
        b.add(rod(pa, pb, 0.008, 6), stick);
      }
      b.add(cyl(0.12, 0.12, 0.03, 16), lam("dnaBase", () => ({ color: "#4a3a30" })), M4(D[0], D[1], D[2]));
      b.add(rod(V(D[0], D[1], D[2]), V(D[0], D[1] + 0.7, D[2]), 0.006), stick);
      b.build(R);
      // the roller drum (spins): a wheel of test tubes on a stand
      const Dm = P.drum, steel = twoTone(new THREE.MeshPhongMaterial({ color: "#7d838e", specular: "#c8c8c8", shininess: 60 }), 0.15);
      const sb = new Batch();
      for (const sx of [-0.55, 0.55]) { sb.add(boxGeo(V(Dm[0] + sx - 0.04, 0, Dm[2] - 0.35), V(Dm[0] + sx + 0.04, 1.1, Dm[2] + 0.35)), scopeM); }
      sb.add(boxGeo(V(Dm[0] - 0.62, 0, Dm[2] - 0.4), V(Dm[0] + 0.62, 0.06, Dm[2] + 0.4)), scopeM);
      sb.build(R);
      this.drum = new THREE.Group(); this.drum.position.set(Dm[0], 1.1, Dm[2]);
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 32, 1, true).rotateZ(Math.PI / 2), steel); disk.castShadow = true; this.drum.add(disk);
      for (const sx of [-0.45, 0.45]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32).rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2), steel); cap.position.x = sx; this.drum.add(cap); }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.86, 8).rotateZ(Math.PI / 2), tubeG); tube.position.set(0, 0.47 * Math.cos(a), 0.47 * Math.sin(a));
        const med = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 8).rotateZ(Math.PI / 2), pinkM); med.position.copy(tube.position); med.position.x = -0.2;
        this.drum.add(tube, med);
      }
      R.add(this.drum);
      const win = new THREE.MeshBasicMaterial({ map: windowTex(), color: 0xdfeeff, fog: false });
      this.windowMat = win;
      for (const dx of [-2.6, 2.6]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), win); w.position.set(L[0] + dx, 2.75, L[2] - 6.98); w.layers.set(NOINK); R.add(w); }
    }

    // ======================= CELLS (z 800): the microscope world, a dish of pink medium =======================
    {
      const R = this.group("cells");
      const dish = new THREE.Mesh(new THREE.CircleGeometry(9, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: mediumTex(), color: 0xffffff }));
      dish.position.set(CELLS[0], 0, CELLS[2]); R.add(dish);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.12, 8, 64).rotateX(Math.PI / 2), lam("dishRim", () => ({ color: "#dff1fa" }))); rim.position.set(CELLS[0], 0.1, CELLS[2]); R.add(rim);
      const bgM = new THREE.MeshBasicMaterial({ map: mediumTex(), color: new THREE.Color(0.75, 0.6, 0.7), fog: false });
      for (let k = 0; k < 9; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), bgM); s.position.set(CELLS[0] + (k - 4) * 2.2, -1.5 - (k % 3), CELLS[2] - 6 - (k % 2) * 3); s.layers.set(NOINK); R.add(s); }
    }

    // ======================= SPACE (z -1500): Earth below, a small satellite with a pink-glowing window =======================
    {
      const R = this.group("space");
      const earth = new THREE.Mesh(new THREE.SphereGeometry(150, 64, 32), new THREE.MeshLambertMaterial({ map: earthTex() }));
      twoTone(earth.material as THREE.MeshLambertMaterial, 0.6);
      earth.position.set(SPACE[0] + 30, -160, SPACE[2] - 140); earth.rotation.set(0.3, 1.2, 0.1); R.add(earth);
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(154, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.0), transparent: true, opacity: 0.18, side: THREE.BackSide, fog: false }));
      atmo.position.copy(earth.position); atmo.layers.set(NOINK); R.add(atmo);
      const sp: number[] = [], sr = rng(77);
      for (let i = 0; i < 900; i++) { const u = sr() * 2 - 1, a = sr() * Math.PI * 2, rr = Math.sqrt(1 - u * u); sp.push(800 * rr * Math.cos(a), 800 * Math.abs(u) + 20, 800 * rr * Math.sin(a)); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
      this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false }));
      this.stars.layers.set(NOINK); this.stars.frustumCulled = false; R.add(this.stars);
      const S = P.satellite, body = twoTone(new THREE.MeshPhongMaterial({ color: "#c9ccd2", specular: "#ffffff", shininess: 80 }), 0.15);
      this.sat = new THREE.Group(); this.sat.position.set(...S);
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.6, 24), body); hull.rotation.z = Math.PI / 2; this.sat.add(hull);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), body); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.8; this.sat.add(nose);
      for (const s2 of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.6), lam("solar", () => ({ color: "#2f4f8f" }))); panel.position.set(-0.3, 0, s2 * 1.5); this.sat.add(panel);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6).rotateX(Math.PI / 2), body); arm.position.set(-0.3, 0, s2 * 0.85); this.sat.add(arm);
      }
      for (let k = 0; k < 3; k++) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 5), body); ant.position.set(-0.9, 0.3, -0.3 + k * 0.3); ant.rotation.z = 0.9 + k * 0.15; this.sat.add(ant); }
      const port = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 1.5) }));
      port.position.set(0.2, 0.0, 0.62); port.layers.set(NOINK); this.sat.add(port);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.035, 8, 24), body); ring.position.copy(port.position); this.sat.add(ring);
      this.sat.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(this.sat);
    }

    // ======================= LAUNCH (z 300): steppe, pad, gantry, rocket =======================
    {
      const R = this.group("launch");
      const b = new Batch(), Lp = LAUNCH;
      b.add(ground(Lp[0] - 300, Lp[0] + 300, Lp[2] - 300, Lp[2] + 300, 6), lam("steppe", () => ({ map: grassHD(), color: "#e8d6a0" })));
      const conc = lam("concrete", () => ({ map: stoneHD("padHD", ["#c9c4bb", "#bfbab1", "#d1ccc3", "#b8b3aa"], "#9a958c") }));
      b.add(boxGeo(V(Lp[0] - 9, 0, Lp[2] - 9), V(Lp[0] + 9, 1.2, Lp[2] + 9), 3), conc);
      const red = lam("gantryRed", () => ({ color: "#c8553d" }));
      for (const [dx, dz] of [[-4.6, -1.2], [-4.6, 1.2], [-2.4, -1.2], [-2.4, 1.2]]) b.add(boxGeo(V(Lp[0] + dx - 0.15, 1.2, Lp[2] + dz - 0.15), V(Lp[0] + dx + 0.15, 30, Lp[2] + dz + 0.15)), red);
      for (let y = 4; y < 30; y += 3.2) for (const dz of [-1.2, 1.2]) b.add(rod(V(Lp[0] - 4.6, y, Lp[2] + dz), V(Lp[0] - 2.4, y + 3.2, Lp[2] + dz), 0.06, 5), red);
      for (let k = 0; k < 5; k++) b.add(boxGeo(V(Lp[0] - 2.4, 8 + k * 5, Lp[2] - 0.3), V(Lp[0] - 1.2, 8.2 + k * 5, Lp[2] + 0.3)), red);
      for (let k = 0; k < 12; k++) { const a = k * 0.52, d = 60 + (k % 3) * 25; b.add(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam("hillDry", () => ({ color: "#c9b27a" })), M4(Lp[0] + Math.cos(a) * d * 2.5, -2, Lp[2] - 80 - Math.abs(Math.sin(a)) * d, 0, 0, 0, [40, 10 + (k % 3) * 4, 25])); }
      b.build(R);
      const white = twoTone(new THREE.MeshPhongMaterial({ color: "#eeeae2", specular: "#ffffff", shininess: 40 }), 0.15), redR = lam("rocketRed", () => ({ color: "#c8323a" }));
      this.rocket = new THREE.Group(); this.rocket.position.set(Lp[0], 1.2, Lp[2]);
      const stage1 = new THREE.Mesh(cyl(1.3, 1.2, 14, 24), white); this.rocket.add(stage1);
      const band = new THREE.Mesh(cyl(1.22, 1.22, 1.0, 24), redR); band.position.y = 10; this.rocket.add(band);
      const stage2 = new THREE.Mesh(cyl(1.1, 0.95, 6, 24), white); stage2.position.y = 14; this.rocket.add(stage2);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.2, 24), redR); cone.position.y = 21.6; this.rocket.add(cone);
      for (let k = 0; k < 4; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 1.6), redR); const a = (k * Math.PI) / 2; fin.position.set(1.5 * Math.cos(a), 1.6, 1.5 * Math.sin(a)); fin.rotation.y = -a; this.rocket.add(fin); }
      this.rocket.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(this.rocket);
      this.exhaust = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(3.0, 1.6, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.exhaust.scale.set(4, 9, 1); this.exhaust.layers.set(NOINK); R.add(this.exhaust);
    }
  }


  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 60);
    if (s.light === "golden") Rr = Math.max(Rr, 24);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    if (s.set === "lab") { this.fog.near = 40; this.fog.far = 400; }
    scene.fog = this.fog; scene.background = null;
    for (let i = 0; i < this.clouds.length; i++) {
      const cl = this.clouds[i], mat = cl.m.material as THREE.MeshBasicMaterial;
      cl.m.position.set(cam.position.x + Math.cos(cl.a) * cl.d, cl.y, cam.position.z + Math.sin(cl.a) * cl.d);
      cl.m.lookAt(cam.position.x, cl.m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4]; cl.m.visible = s.set !== "lab";
    }
    const want = s.set === "farm" || s.set === "town" || s.set === "hospital" ? "land" : s.set;
    for (const [name, g] of this.sets) g.visible = name === want;
    if (s.set === "cells" || s.set === "space") {
      const dark = s.set === "space" ? ["#04050b", "#05060d", "#05060d", "#04050b", "#030409"] : s.light === "night" ? ["#16204a", "#121a3e", "#0e1534", "#0b102a", "#080b20"] : ["#3a1a30", "#30152a", "#281224", "#200e1e", "#180a18"];
      dark.forEach((h, i) => untone(h, su["c" + i].value));
      this.fog.near = 1e4; this.fog.far = 2e4;
    }
    for (const cl of this.clouds) cl.m.visible = want === "land" || want === "launch";
    this.windowMat.color.set(s.light === "night" ? "#2a3a6a" : "#e6f2ff");
    this.drum.rotation.x = t * 0.9;
    this.sat.rotation.set(0.1 * Math.sin(t * 0.5), 0.25 * Math.sin(t * 0.3), 0);
    const lift = Math.max(0, t - EV.liftoff);
    this.rocket.position.y = 1.2 + 1.5 * lift * lift;
    this.exhaust.visible = id === 19 && t > EV.ignite;
    if (this.exhaust.visible) { const fl = 1 + 0.15 * Math.sin(t * 40); this.exhaust.position.set(P.rocket[0], this.rocket.position.y - 3.5, P.rocket[2]); this.exhaust.scale.set(4.2 * fl, 9 * fl * (t > EV.liftoff ? 1.3 : 0.7), 1); }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
