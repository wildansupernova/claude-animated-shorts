// The Haber short's whole world as one three.js scene: five sets far apart, each its own static batch (so a set out
// of view is frustum-culled), plus the moving parts (gauge needle, compressor piston, furnace glow, sacks and the
// shell on the factory chute, the blockading warship, the field gun's recoil, the searchlight, lamp + candle glow).
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f), like the bridge world.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, house, prop, Kit } from "./build";
import { rep, ctex, rng, planksHD, beamHD, stoneHD, grassHD, waterNear, waterFar, cloudHD, brick } from "./paint";
import { Pen, bodyFront, townsfolk, KID, INK } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, HABER } from "./cast";
import { fxPoster, skull } from "./fx";
import { FPS, SHOTS, P, EV, T, LAB, SEA, TRENCH, CAMP, ALPS, FACTORY, camAt, V3, ShotDef, clamp01, easeOut, smooth } from "./story";

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
const posterTex = () => ctex("poster", 420, 560, (g) => fxPoster(new Pen(g), HABER));
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

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: { m: THREE.Mesh; a: number; d: number; y: number }[] = [];
  private smoke: Smoke[] = [];
  private needle: THREE.Mesh; private piston: THREE.Mesh; private wheel: THREE.Mesh;
  private furnaceMat: THREE.MeshBasicMaterial; private furnaceGlow!: THREE.Sprite; private campLamps: THREE.Sprite[] = []; private windowMat: THREE.MeshBasicMaterial;
  private sacks: THREE.Mesh[] = []; private shell: THREE.Group;
  private warship = new THREE.Group(); private merchant = new THREE.Group();
  private barrel = new THREE.Group();
  private beam: THREE.Mesh; private bulb: THREE.Mesh; private lampGlow: THREE.Sprite; private flame: THREE.Sprite; private candleGlow: THREE.Sprite;
  private liquid: THREE.Mesh;
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

    // ======================= FARM (origin) + factory =======================
    {
      const R = this.group("farm");
      const b = new Batch();
      const grassM = lam("grassHD", () => ({ map: grassHD() })), dirtM = lam("dirtH", () => ({ map: dirtTex() })), wheatM = lam("wheatH", () => ({ map: wheatTex() }));
      b.add(ground(-150, 150, -250, 250, 4), grassM);
      b.add(ground(-1.4, 1.4, -70, 40, 2.8, 0.01), dirtM);         // path N-S
      b.add(ground(-60, 60, -9, -6.6, 2.4, 0.012), dirtM);          // road E-W
      wheatPatch(b, wheatM, 2.0, 24, -6.0, 9, 1.05, 1);
      wheatPatch(b, wheatM, -24, -2.0, -6.0, 8.5, 1.05, 2);
      wheatPatch(b, wheatM, 2.0, 7.0, -40, -10, 1.05, 3);
      wheatPatch(b, wheatM, 23, 40, -50, -10, 1.05, 4);
      wheatPatch(b, wheatM, -34, -23, -50, -10, 1.05, 5);
      wheatPatch(b, wheatM, -7.5, -2.0, -50, -21, 1.05, 6);
      wheatPatch(b, wheatM, 2.0, 30, 12, 34, 1.05, 7);
      wheatPatch(b, wheatM, -60, -28, 10, 40, 1.05, 8);
      wheatPatch(b, wheatM, -12, 60, -110, -60, 1.0, 9);
      house(b, -15, -28, 0.15, 9, 7, 5.6, 0);       // farmhouse
      house(b, 15, -31, -0.1, 11, 8, 4.6, 2);       // barn
      house(b, -40, -40, 0.4, 8, 7, 5.0, 5);
      house(b, 32, -70, -0.3, 9, 7, 5.4, 4);
      // fences
      const wood = lam("woodBeam", () => ({ map: beamHD() }));
      for (const [x0, z0, x1, z1] of [[-24, -10, -8, -10], [8, -10, 22, -10], [-24, 9.4, -2.2, 9.4]] as const) {
        const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4);
        for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n; b.add(boxGeo(V(x - 0.06, 0, z - 0.06), V(x + 0.06, 1.0, z + 0.06)), wood); }
        for (const y of [0.45, 0.85]) b.add(rod(V(x0, y, z0), V(x1, y, z1), 0.04, 6), wood);
      }
      // picnic table + benches (the ending)
      const K = P.picnic;
      b.add(boxGeo(V(K[0] - 0.9, 0.72, K[2] - 0.4), V(K[0] + 0.9, 0.78, K[2] + 0.4)), wood);
      for (const sx of [-0.75, 0.75]) b.add(boxGeo(V(K[0] + sx - 0.05, 0, K[2] - 0.35), V(K[0] + sx + 0.05, 0.72, K[2] + 0.35)), wood);
      for (const sz of [-0.75, 0.75]) b.add(boxGeo(V(K[0] - 0.9, 0.42, K[2] + sz - 0.14), V(K[0] + 0.9, 0.47, K[2] + sz + 0.14)), wood);
      b.add(new THREE.SphereGeometry(0.18, 14, 10).scale(1.4, 0.8, 1), lam("breadM", () => ({ color: "#d9934a" })), M4(K[0] - 0.3, 0.86, K[2] + 0.05));
      // trees, bushes, distant hills
      const tr = rng(17);
      for (let i = 0; i < 34; i++) {
        const a = tr() * Math.PI * 2, d = 45 + tr() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
        if (Math.abs(x) < 4 || (x > 40 && z < -80)) continue;
        prop(b, {}, ["tree_oak", "tree_default", "tree_fat", "tree-high-round", "tree_cone"][i % 5], x, 0, z, 7 + tr() * 5, tr() * 6);
      }
      for (const [x, z, h] of [[-19, -20, 6.5], [-8, -33, 7.5], [20, -22, 6], [-26, 4, 7], [-5, 30, 8], [8.5, -48, 6.5]] as const) prop(b, {}, "tree_oak", x, 0, z, h);
      for (const [x, z] of [[-6.5, -13], [-12.5, -12], [5, -18], [-17.5, 13]] as const) prop(b, {}, "plant_bushLarge", x, 0, z, 1.2);
      const hillM = lam("hillM", () => ({ map: rep(grassHD(), 30, 30), color: "#a9c99a" }));
      for (const [x, z, rx, ry] of [[-120, -230, 90, 30], [40, -250, 120, 40], [150, -200, 80, 26], [-200, -120, 70, 22], [200, 60, 90, 28]] as const)
        b.add(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillM, M4(x, -2, z, 0, 0, 0, [rx, ry, rx * 0.6]));
      // the factory (BASF-like): brick hall facing the farm, two tall chimneys, the chute
      const F = FACTORY;
      house(b, F[0], F[2] - 7, 0, 22, 10, 9, 7);
      const brickM = lam("brickChim", () => ({ map: rep(brick(), 2, 8) }));
      for (const dx of [-7, 6]) {
        b.add(cyl(1.3, 1.0, 26, 18), brickM, M4(F[0] + dx, 0, F[2] - 9));
        b.add(cyl(1.15, 1.15, 0.8, 18), lam("chimTop", () => ({ color: "#4a3a34" })), M4(F[0] + dx, 26, F[2] - 9));
        addSmoke(() => [F[0] + dx, 27.5, F[2] - 9], 6, "factory");
      }
      const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#6d737e", specular: "#9a9a9a", shininess: 50 }), 0.15);
      const C = P.chute, bottom = V(C[0], 0.95, C[2] + 4.2), topP = V(C[0], C[1], C[2]);
      b.add(rod(topP, bottom, 0.02, 4), steel);
      const len = topP.distanceTo(bottom), slope = Math.atan2(C[1] - 0.95, 4.2);
      b.add(new THREE.BoxGeometry(1.0, 0.08, len), steel, M4(C[0], (C[1] + 0.95) / 2 - 0.05, C[2] + 2.1, slope, 0, 0));
      for (const sx of [-0.52, 0.52]) b.add(new THREE.BoxGeometry(0.05, 0.22, len), steel, M4(C[0] + sx, (C[1] + 0.95) / 2 + 0.05, C[2] + 2.1, slope, 0, 0));
      for (const sx of [-0.45, 0.45]) b.add(boxGeo(V(C[0] + sx - 0.04, 0, C[2] + 4.1), V(C[0] + sx + 0.04, 0.95, C[2] + 4.2)), steel);
      b.add(boxGeo(V(C[0] - 0.7, C[1] - 0.35, F[2] - 2.02), V(C[0] + 0.7, C[1] + 0.9, F[2] - 1.98)), lam("hole", () => ({ color: "#1d1820" })));
      // a pile of sacks by the worker
      const sackM = lam("sackM", () => ({ color: "#d9c08c" }));
      const sackG = (() => { const g = new THREE.SphereGeometry(0.3, 16, 12); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setY(i, y * 0.55 + 0.06 * Math.abs(x) / 0.3); p.setX(i, x * 1.25 * (1 + 0.25 * (Math.abs(x) / 0.3) ** 3)); p.setZ(i, p.getZ(i) * 0.85 * (1 - 0.3 * (Math.abs(x) / 0.3) ** 2)); } g.computeVertexNormals(); return g; })();
      for (const [dx, dy, dz, ry] of [[-1.6, 0.16, 4.4, 0.2], [-1.0, 0.16, 4.9, -0.3], [-1.35, 0.42, 4.6, 0.5], [-2.2, 0.16, 4.0, 1.2]] as const)
        b.add(sackG, sackM, M4(F[0] + dx, dy, F[2] + dz, 0, ry, 0));
      b.build(R);
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(sackG, sackM); m.castShadow = true; m.visible = false; this.sacks.push(m); R.add(m); }
      this.shell = new THREE.Group();
      const brass = twoTone(new THREE.MeshPhongMaterial({ color: "#c9a24e", specular: "#ffe8a8", shininess: 60 }), 0.15);
      const sh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.62, 18), brass);
      const sh2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 18), lam("shellNose", () => ({ color: "#5d6650" })));
      sh2.position.y = 0.48; this.shell.add(sh1, sh2); this.shell.visible = false;
      this.shell.traverse((o) => { o.castShadow = true; });
      R.add(this.shell);
    }

    // ======================= LAB (x 200) =======================
    {
      const R = this.group("lab");
      const b = new Batch(), L = LAB;
      const tileM = lam("labTile", () => ({ map: tileTex() })), wallM = lam("labWall", () => ({ map: labWallTex() }));
      const wood = lam("benchWood", () => ({ map: beamHD() })), top = lam("benchTop", () => ({ color: "#5a3c2a" }));
      b.add(ground(L[0] - 7, L[0] + 7, L[2] - 7, L[2] + 6, 1.6, 0), tileM);
      const wq = (ax: number, az: number, bx: number, bz: number, u: number) => quad(V(ax, 0, az), V(bx, 0, bz), V(bx, 4.6, bz), V(ax, 4.6, az), u, 1);
      b.add(wq(L[0] - 7, L[2] - 7, L[0] + 7, L[2] - 7, 7), wallM);
      b.add(wq(L[0] - 7, L[2] + 6, L[0] - 7, L[2] - 7, 6.5), wallM);
      b.add(wq(L[0] + 7, L[2] - 7, L[0] + 7, L[2] + 6, 6.5), wallM);
      b.add(boxGeo(V(L[0] - 7.2, 4.6, L[2] - 7.2), V(L[0] + 7.2, 4.85, L[2] + 6)), lam("cornice", () => ({ color: "#e9e0cc" })));
      // bench along the back wall + shelves with bottles
      b.add(boxGeo(V(L[0] - 6, 0, L[2] - 6.95), V(L[0] + 6, 0.84, L[2] - 6.1)), wood);
      b.add(boxGeo(V(L[0] - 6.05, 0.84, L[2] - 6.98), V(L[0] + 6.05, 0.9, L[2] - 6.05)), top);
      const glass = ["#6fae7a", "#c98a3a", "#5a7ec0", "#b8d8e0", "#a65a5a"];
      const br = rng(5);
      for (const [x0, x1] of [[-6, -1.8], [2.4, 6]] as const) for (const y of [1.9, 2.6]) {
        b.add(boxGeo(V(L[0] + x0, y - 0.04, L[2] - 7), V(L[0] + x1, y, L[2] - 6.7)), top);
        for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.22 + br() * 0.18) {
          const h = 0.16 + br() * 0.18, rr = 0.045 + br() * 0.03;
          b.add(cyl(rr, rr * (br() < 0.5 ? 0.5 : 1), h, 10), lam("glass" + Math.floor(br() * 5), () => ({ color: glass[Math.floor(br() * 5)] })), M4(L[0] + x, y, L[2] - 6.85));
        }
      }
      // the Haber machine: stand, furnace jacket (glow window), steel reactor column, gauge, pipes, spout, flask table
      const Mc = P.machine, steel = twoTone(new THREE.MeshPhongMaterial({ color: "#7d838e", specular: "#c8c8c8", shininess: 60 }), 0.15);
      const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 40 }), 0.15);
      for (const [dx, dz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) b.add(boxGeo(V(Mc[0] + dx - 0.03, 0, Mc[2] + dz - 0.03), V(Mc[0] + dx + 0.03, 0.82, Mc[2] + dz + 0.03)), iron);
      b.add(boxGeo(V(Mc[0] - 0.38, 0.8, Mc[2] - 0.38), V(Mc[0] + 0.38, 0.86, Mc[2] + 0.38)), iron);
      b.add(boxGeo(V(Mc[0] - 0.31, 0.86, Mc[2] - 0.31), V(Mc[0] + 0.31, 1.62, Mc[2] + 0.31), 0.5), lam("furnaceBrick", () => ({ map: rep(brick(), 1, 1), color: "#d8a080" })));
      b.add(cyl(0.17, 0.17, 0.95, 20), steel, M4(Mc[0], 1.6, Mc[2]));
      b.add(cyl(0.25, 0.25, 0.07, 20), steel, M4(Mc[0], 2.52, Mc[2]));
      for (let k = 0; k < 6; k++) b.add(new THREE.SphereGeometry(0.025, 8, 6), iron, M4(Mc[0] + 0.21 * Math.cos(k), 2.6, Mc[2] + 0.21 * Math.sin(k)));
      const G = P.gauge, S = P.spout;
      b.add(rod(V(Mc[0], 2.48, Mc[2]), V(G[0], 2.48, Mc[2]), 0.03), steel);
      b.add(rod(V(G[0], 2.48, Mc[2]), V(G[0], G[1] - 0.2, Mc[2]), 0.03), steel);
      b.add(rod(V(G[0], G[1] - 0.2, Mc[2]), V(G[0], 1.45, Mc[2]), 0.03), steel);
      b.add(rod(V(G[0], 1.45, Mc[2]), V(S[0], 1.45, Mc[2]), 0.03), steel);
      b.add(rod(V(S[0], 1.45, Mc[2]), V(S[0], 1.45, S[2]), 0.03), steel);
      b.add(rod(V(S[0], 1.45, S[2]), V(S[0], S[1] + 0.03, S[2]), 0.03), steel);
      b.add(new THREE.ConeGeometry(0.035, 0.07, 10).rotateX(Math.PI), steel, M4(S[0], S[1], S[2]));
      b.add(cyl(0.17, 0.17, 0.06, 24).rotateX(Math.PI / 2), iron, M4(G[0], G[1], G[2] - 0.05));
      b.add(rod(V(G[0], G[1] - 0.16, G[2] - 0.08), V(G[0], G[1] - 0.2, Mc[2]), 0.025), steel);
      const fl = P.flask;
      b.add(boxGeo(V(fl[0] - 0.22, 0, fl[2] - 0.22), V(fl[0] + 0.22, 0.86, fl[2] + 0.22)), wood);
      // compressor: iron cylinder + flywheel; piston rod and wheel animate
      const Cp = P.compressor;
      b.add(cyl(0.2, 0.2, 1.2, 18), lam("compGreen", () => ({ color: "#3f6a52" })), M4(Cp[0], 0, Cp[2]));
      b.add(rod(V(Cp[0], 1.05, Cp[2]), V(Mc[0] - 0.17, 1.05, Mc[2]), 0.03), steel);
      // Clara's corner: lamp, stool; the photo + candle; the pest bench: plant pot
      const lp = P.lamp;
      b.add(cyl(0.12, 0.1, 0.04, 16), iron, M4(lp[0], lp[1], lp[2]));
      b.add(rod(V(lp[0], lp[1], lp[2]), V(lp[0] + 0.05, lp[1] + 0.45, lp[2]), 0.015), iron);
      b.add(new THREE.ConeGeometry(0.16, 0.18, 18, 1, true), lam("lampShade", () => ({ color: "#2f6a43", side: THREE.DoubleSide })), M4(lp[0] + 0.05, lp[1] + 0.5, lp[2]));
      const st = P.stool;
      b.add(cyl(0.2, 0.2, 0.05, 16), wood, M4(st[0], 0.62, st[2]));
      for (let k = 0; k < 3; k++) b.add(rod(V(st[0] + 0.15 * Math.cos(k * 2.1), 0, st[2] + 0.15 * Math.sin(k * 2.1)), V(st[0] + 0.08 * Math.cos(k * 2.1), 0.62, st[2] + 0.08 * Math.sin(k * 2.1)), 0.02), wood);
      const glassM = lam("flaskGlass", () => ({ color: "#cfeefa" }));
      b.add(flaskGeo(0.26), glassM, M4(P.claraFlask[0], P.claraFlask[1], P.claraFlask[2]));
      const cd = P.candle;
      b.add(cyl(0.06, 0.06, 0.02, 14), lam("brass2", () => ({ color: "#c9a24e" })), M4(cd[0], cd[1], cd[2]));
      b.add(cyl(0.025, 0.025, 0.16, 12), lam("wax", () => ({ color: "#f3ead6" })), M4(cd[0], cd[1] + 0.02, cd[2]));
      const pl = P.plant;
      b.add(cyl(0.11, 0.15, 0.2, 16), lam("terracotta", () => ({ color: "#b9654a" })), M4(pl[0], pl[1], pl[2]));
      for (let k = 0; k < 7; k++) b.add(new THREE.SphereGeometry(0.09, 12, 8).scale(1.2, 0.6, 0.8), lam("leafLab", () => ({ color: "#5aa83c" })), M4(pl[0] + 0.14 * Math.cos(k * 0.9), pl[1] + 0.3 + 0.12 * (k % 3), pl[2] + 0.1 * Math.sin(k * 0.9), 0, k, 0.3));
      b.build(R);
      // dynamic / special lab pieces
      const win = new THREE.MeshBasicMaterial({ map: windowTex(), color: 0xdfeeff, fog: false });
      this.windowMat = win;
      for (const dx of [-2.6, 2.6]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), win); w.position.set(L[0] + dx, 2.75, L[2] - 6.98); w.layers.set(NOINK); R.add(w); }
      this.furnaceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.4, 0.1), toneMapped: true });
      const fw = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.18), this.furnaceMat); fw.position.set(Mc[0], 1.24, Mc[2] + 0.315); R.add(fw);
      this.furnaceGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.0, 0.45, 0.1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.furnaceGlow.position.set(Mc[0], 1.24, Mc[2] + 0.4); this.furnaceGlow.scale.setScalar(0.9); this.furnaceGlow.layers.set(NOINK); R.add(this.furnaceGlow);
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), new THREE.MeshBasicMaterial({ map: dialTex(), color: 0xe6e6e6 }));
      dial.position.set(G[0], G[1], G[2] + 0.014); R.add(dial);
      this.needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.006).translate(0, 0.05, 0), new THREE.MeshBasicMaterial({ color: 0x1f1a22 }));
      this.needle.position.set(G[0], G[1], G[2] + 0.022); R.add(this.needle);
      this.piston = new THREE.Mesh(cyl(0.035, 0.035, 0.5, 10), steel); this.piston.position.set(Cp[0], 1.0, Cp[2]); this.piston.castShadow = true; R.add(this.piston);
      this.wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 24), iron); this.wheel.position.set(Cp[0] + 0.26, 0.7, Cp[2]); this.wheel.rotation.y = Math.PI / 2; this.wheel.castShadow = true; R.add(this.wheel);
      for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.52, 0.02), iron); sp.rotation.z = (k * Math.PI) / 3; this.wheel.add(sp); }
      const flaskM = new THREE.Mesh(flaskGeo(0.36), new THREE.MeshLambertMaterial({ color: "#d8f2fb", transparent: true, opacity: 0.55, depthWrite: false }));
      flaskM.position.set(fl[0], 0.86, fl[2]); R.add(flaskM);
      this.liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.074, 0.1, 20).translate(0, 0.05, 0), new THREE.MeshBasicMaterial({ color: "#8fd0e8" }));
      this.liquid.position.set(fl[0], 0.875, fl[2]); R.add(this.liquid);
      // photo frame (painted, unlit so it reads), the poison can, lamp bulb + glow, candle flame + glow
      const ph = P.photo;
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.325), new THREE.MeshBasicMaterial({ map: photoTex(), color: 0xd8d0c8 }));
      photo.position.set(ph[0], ph[1] + 0.17, ph[2]); photo.rotation.x = -0.12; R.add(photo);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.335, 0.02), lam("frameBack", () => ({ color: "#4a3020" }))); back.position.set(ph[0], ph[1] + 0.17, ph[2] - 0.015); back.rotation.x = -0.12; R.add(back);
      this.addCan(R, P.can);
      this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 1.8) }));
      this.bulb.position.set(lp[0] + 0.05, lp[1] + 0.44, lp[2]); this.bulb.layers.set(NOINK); R.add(this.bulb);
      const gt = glowTex();
      this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: new THREE.Color(1.0, 0.7, 0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.lampGlow.position.copy(this.bulb.position); this.lampGlow.scale.setScalar(1.6); this.lampGlow.layers.set(NOINK); R.add(this.lampGlow);
      this.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex("flame", 64, 128, (g) => { const p = new Pen(g); p.ell(32, 80, 18, 40, "#ffd27a", 0); p.ell(32, 92, 9, 22, "#fff6d8", 0); }), color: new THREE.Color(3, 2.2, 1.2), transparent: true, depthWrite: false }));
      this.flame.position.set(cd[0], cd[1] + 0.22, cd[2]); this.flame.scale.set(0.035, 0.07, 1); this.flame.layers.set(NOINK); R.add(this.flame);
      this.candleGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: new THREE.Color(1.0, 0.62, 0.28), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.candleGlow.position.copy(this.flame.position); this.candleGlow.scale.setScalar(0.7); this.candleGlow.layers.set(NOINK); R.add(this.candleGlow);
    }

    // ======================= SEA (x -300): guano island, the clipper, the warship =======================
    {
      const R = this.group("sea");
      const wNear = waterNear(), wFar = waterFar();
      for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
      this.WU = {
        wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
        wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
        wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
      };
      const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
      waterM.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, this.WU);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
          .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
          .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
      };
      waterM.customProgramCacheKey = () => "sea1";
      const wm = new THREE.Mesh(ground(-1000, -150, -600, 600, 1, 0.0), waterM); wm.receiveShadow = true; R.add(wm);
      const b = new Batch(), I = P.island;
      const rock = lam("rockP", () => ({ map: ctex("rockP", 512, 512, (g, r) => {
        g.fillStyle = "#9a8f84"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? "rgba(70,62,58,0.22)" : "rgba(200,190,175,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(50,42,40,0.35)"; g.lineWidth = 3; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + r() * 50); g.stroke(); }
        for (let i = 0; i < 70; i++) { g.fillStyle = "rgba(250,248,235,0.75)"; g.beginPath(); g.ellipse(r() * 512, r() * 200, 4 + r() * 10, 6 + r() * 22, 0, 0, 7); g.fill(); }
      }) }));
      const guano = lam("guanoTex", () => ({ map: ctex("guanoT", 512, 512, (g, r) => {
        g.fillStyle = "#e9e2cc"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,250,0.7)" : "rgba(190,175,140,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 24, 5 + r() * 16, r() * 3, 0, 7); g.fill(); }
      }) }));
      const side = new THREE.CylinderGeometry(6.6, 10.5, 3.7, 28, 3, true);
      const sp = side.attributes.position as THREE.BufferAttribute, sr = rng(9);
      for (let i = 0; i < sp.count; i++) { const k = 1 + 0.08 * Math.sin(Math.atan2(sp.getZ(i), sp.getX(i)) * 5 + sr()) + 0.03 * sr(); sp.setX(i, sp.getX(i) * k); sp.setZ(i, sp.getZ(i) * k); }
      side.computeVertexNormals();
      b.add(side, rock, M4(I[0], 1.15, I[2]));
      const topG = new THREE.CircleGeometry(6.75, 28).rotateX(-Math.PI / 2);
      b.add(topG, guano, M4(I[0], 3.0, I[2]));
      for (let k = 0; k < 9; k++) b.add(new THREE.SphereGeometry(1, 16, 10), guano, M4(I[0] - 3 + (k % 3) * 1.5 + sr(), 3.0, I[2] - 2.5 + Math.floor(k / 3) * 1.2, 0, sr() * 3, 0, [1.1 + sr() * 0.6, 0.5 + sr() * 0.5, 0.9 + sr() * 0.4]));
      for (let k = 0; k < 10; k++) { const a = k * 0.63 + sr(), d = 10 + sr() * 3; b.add(new THREE.DodecahedronGeometry(1.2 + sr() * 1.2, 1), rock, M4(I[0] + d * Math.cos(a), 0.2, I[2] + d * Math.sin(a), sr(), sr(), 0, [1, 0.6, 1])); }
      for (let k = 0; k < 3; k++) b.add(new THREE.DodecahedronGeometry(14 + k * 6, 1), rock, M4(SEA[0] - 120 + k * 110, -6, SEA[2] - 240 - k * 30, 0, k, 0, [1.4, 0.7, 1]));
      b.build(R);
      // the nitrate clipper (static, anchored) and the grey warship (moves in shot 11)
      const hullM = lam("hullWood", () => ({ map: rep(beamHD(), 3, 1), color: "#a0704a" })), stripe = lam("hullStripe", () => ({ color: "#f1ead6" }));
      const sailM = lam("sail", () => ({ color: "#f3ecd9", side: THREE.DoubleSide })), mastM = lam("mast", () => ({ color: "#6e4b33" }));
      const hullShape = (len: number, h: number) => { const s = new THREE.Shape(); s.moveTo(-len / 2, h); s.lineTo(len / 2 + 0.8, h); s.quadraticCurveTo(len / 2, -0.2, len / 2 - 1.6, -0.5); s.lineTo(-len / 2 + 0.6, -0.5); s.quadraticCurveTo(-len / 2, 0, -len / 2, h); return s; };
      const hullG = (len: number, h: number, w: number) => new THREE.ExtrudeGeometry(hullShape(len, h), { depth: w, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2, curveSegments: 10 }).translate(0, 0, -w / 2);
      const mg = this.merchant, Mp = P.merchant;
      mg.add(new THREE.Mesh(hullG(10, 1.4, 2.6), hullM), new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.14, 3.0), stripe));
      (mg.children[1] as THREE.Mesh).position.set(0.2, 1.1, 0);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 2.6), lam("deckM", () => ({ map: rep(planksHD(), 2, 1) }))); deck.position.set(0.2, 1.45, 0); mg.add(deck);
      for (const mx of [-2.4, 1.8]) {
        const mast = new THREE.Mesh(cyl(0.12, 0.08, 8.5, 10), mastM); mast.position.set(mx, 1.4, -0.2); mg.add(mast);
        for (const [y, w] of [[3.3, 3.2], [5.6, 2.6], [7.5, 2.0]] as const) {
          const sg = new THREE.PlaneGeometry(w, 1.9, 6, 4); const spp = sg.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < spp.count; i++) spp.setZ(i, 0.35 * (1 - (spp.getX(i) / (w / 2)) ** 2) * (1 - (spp.getY(i) / 0.95) ** 2 * 0.5));
          sg.computeVertexNormals();
          const s = new THREE.Mesh(sg, sailM); s.position.set(mx, 1.4 + y - 0.9, -0.2); s.rotation.y = Math.PI / 2 - 0.95; mg.add(s);
        }
      }
      for (const [x, y, z] of [[-0.4, 1.7, 0.6], [0.3, 1.7, 0.5], [-0.05, 1.98, 0.55], [3.2, 1.7, 0.4]] as const) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8).scale(1.3, 0.55, 0.85), lam("sackM", () => ({ color: "#d9c08c" }))); s.position.set(x, y, z); mg.add(s); }
      mg.position.set(Mp[0], -0.1, Mp[2]); mg.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(mg);
      const grey = lam("warGrey", () => ({ color: "#6f7884" })), dark = lam("warDark", () => ({ color: "#3d434c" }));
      const wg = this.warship;
      const wh = new THREE.Mesh(hullG(18, 1.6, 3.2), grey); wh.rotation.y = Math.PI; wg.add(wh);
      const wd = new THREE.Mesh(new THREE.BoxGeometry(17, 0.12, 3.0), dark); wd.position.y = 1.62; wg.add(wd);
      const sup = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 2.2), grey); sup.position.set(0.5, 2.7, 0); wg.add(sup);
      const bridgeB = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 2.6), grey); bridgeB.position.set(-1.2, 4.2, 0); wg.add(bridgeB);
      for (const fx2 of [1.6, 3.4]) { const fn = new THREE.Mesh(cyl(0.55, 0.55, 3.4, 16), dark); fn.position.set(fx2, 3.6, 0); wg.add(fn); }
      const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.8, 16), grey); tur.position.set(-5.2, 2.1, 0); wg.add(tur);
      for (const dz of [-0.3, 0.3]) { const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 10).rotateZ(Math.PI / 2), dark); gb.position.set(-7.0, 2.25, dz); gb.rotation.z = 0.05; wg.add(gb); }
      wg.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      wg.visible = false; R.add(wg);
      for (const fx2 of [1.6, 3.4]) addSmoke(() => { const p2 = this.warship.position; return [p2.x + fx2, 7.6, p2.z]; }, 5, "warship", [10, 9, 0]);
    }

    // ======================= TRENCH (z 300) + night CAMP (x 80) =======================
    {
      const R = this.group("trench");
      const b = new Batch(), Tz = TRENCH[2];
      const mudM = lam("mudH", () => ({ map: mudTex() })), bagM = lam("sandbagH", () => ({ map: sandbagTex() }));
      b.add(ground(-150, 150, 250, 520, 6), mudM);
      // German trench: parapet (front, toward +z), parados (back), duckboards
      b.add(boxGeo(V(-34, 0, Tz + 0.4), V(34, 1.5, Tz + 1.6), 1.2), bagM);
      b.add(boxGeo(V(-34, 0, Tz - 3.6), V(34, 1.0, Tz - 2.8), 1.2), bagM);
      b.add(ground(-34, 34, Tz - 2.8, Tz + 0.4, 2.0, 0.02), lam("duck", () => ({ map: planksHD() })));
      // French trench (z 358.4 .. 359.6), parados behind it
      b.add(boxGeo(V(-34, 0, Tz + 58.4), V(34, 1.4, Tz + 59.6), 1.2), bagM);
      b.add(boxGeo(V(-34, 0, Tz + 62.4), V(34, 0.9, Tz + 63.0), 1.2), bagM);
      // gas cylinders leaning on the parapet, a pipe over the top of each
      const cylM = twoTone(new THREE.MeshPhongMaterial({ color: "#8d9a78", specular: "#c0c0b0", shininess: 40 }), 0.15);
      const valve = lam("valveBrass", () => ({ color: "#b8913e" })), pipeM = lam("pipeLead", () => ({ color: "#4a4e56" }));
      for (let x = -21; x <= 21.01; x += 1.2) {
        b.add(cyl(0.13, 0.13, 1.35, 12), cylM, M4(x, 0.02, Tz - 0.15, 0.32, 0, 0));
        const topP = V(x, 1.3, Tz + 0.27);
        b.add(new THREE.SphereGeometry(0.1, 10, 8), valve, M4(topP.x, topP.y, topP.z));
        b.add(rod(topP, V(x, 1.62, Tz + 1.0), 0.045, 6), pipeM);
        b.add(rod(V(x, 1.62, Tz + 1.0), V(x, 1.45, Tz + 2.1), 0.045, 6), pipeM);
      }
      // wire, craters, dead trees
      const wire = lam("wireM", () => ({ color: "#3a3330" })), dead = lam("deadWood", () => ({ color: "#5a4636" }));
      for (const zw of [Tz + 12, Tz + 50]) for (let x = -30; x <= 30; x += 2.5) {
        b.add(rod(V(x, 0, zw), V(x + 0.05, 1.2, zw), 0.04, 6), dead);
        if (x < 30) for (const [y0, y1] of [[0.4, 1.0], [1.0, 0.4], [0.75, 0.75]]) b.add(rod(V(x, y0, zw), V(x + 2.5, y1, zw), 0.012, 4), wire);
      }
      const cr = rng(33);
      for (let k = 0; k < 14; k++) {
        const x = -30 + cr() * 60, z = Tz + 5 + cr() * 50, r = 1.2 + cr() * 2;
        b.add(new THREE.TorusGeometry(r, 0.35, 6, 20).rotateX(Math.PI / 2).scale(1, 0.5, 1), mudM, M4(x, 0, z));
        b.add(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), lam("craterDark", () => ({ color: "#5a4636" })), M4(x, 0.015, z));
      }
      for (let k = 0; k < 7; k++) {
        const x = -40 + k * 13 + cr() * 4, z = Tz + 20 + cr() * 60, h = 4 + cr() * 3;
        b.add(rod(V(x, 0, z), V(x + 0.3, h, z), 0.18, 7), dead);
        b.add(rod(V(x + 0.2, h * 0.6, z), V(x + 1.6, h * 0.85, z + 0.3), 0.07, 5), dead);
        b.add(rod(V(x + 0.25, h * 0.75, z), V(x - 1.1, h * 1.0, z - 0.2), 0.06, 5), dead);
      }
      // field gun: wheels, carriage, shield (barrel is its own group: recoil)
      const G = P.gun, gunM = lam("gunGrey", () => ({ color: "#6a705e" })), gunDark = lam("gunDark", () => ({ color: "#3d4238" }));
      for (const sx of [-0.75, 0.75]) {
        b.add(new THREE.TorusGeometry(0.6, 0.06, 8, 24).rotateY(Math.PI / 2), gunDark, M4(G[0] + sx, 0.62, G[2]));
        for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(0.04, 1.15, 0.05), gunDark, M4(G[0] + sx, 0.62, G[2], (k * Math.PI) / 6, 0, 0));
      }
      b.add(rod(V(G[0] - 0.8, 0.62, G[2]), V(G[0] + 0.8, 0.62, G[2]), 0.05), gunDark);
      b.add(boxGeo(V(G[0] - 0.12, 0.05, G[2] - 2.6), V(G[0] + 0.12, 0.25, G[2])), gunM, M4(0, 0, 0));
      b.add(boxGeo(V(G[0] - 0.7, 0.5, G[2] + 0.2), V(G[0] + 0.7, 1.45, G[2] + 0.26)), gunM);
      // ---- night camp: double fence with barbed wire, a watchtower, the crate ----
      const Cz = CAMP[2], Cx = CAMP[0];
      for (const zf of [Cz + 12, Cz + 15]) for (let x = Cx - 26; x <= Cx + 26; x += 2.6) {
        b.add(boxGeo(V(x - 0.07, 0, zf - 0.07), V(x + 0.07, 3.0, zf + 0.07)), dead);
        b.add(rod(V(x, 3.0, zf), V(x, 3.35, zf - 0.35), 0.035, 5), dead);
        if (x < Cx + 26) for (let k = 0; k < 6; k++) b.add(rod(V(x, 0.4 + k * 0.5, zf), V(x + 2.6, 0.4 + k * 0.5, zf), 0.01, 4), wire);
      }
      const tw = V(Cx + 1.2, 0, Cz + 19);
      for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) b.add(rod(V(tw.x + dx, 0, tw.z + dz), V(tw.x + dx * 0.7, 6.5, tw.z + dz * 0.7), 0.1, 6), dead);
      b.add(boxGeo(V(tw.x - 1.3, 6.5, tw.z - 1.3), V(tw.x + 1.3, 6.65, tw.z + 1.3)), dead);
      b.add(boxGeo(V(tw.x - 1.3, 6.65, tw.z - 1.3), V(tw.x + 1.3, 7.6, tw.z - 1.2)), dead);
      b.add(new THREE.ConeGeometry(2.1, 1.3, 4).rotateY(Math.PI / 4), lam("towerRoof", () => ({ color: "#3a3540" })), M4(tw.x, 9.0, tw.z));
      for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) b.add(rod(V(tw.x + dx, 6.6, tw.z + dz), V(tw.x + dx, 8.4, tw.z + dz), 0.05, 5), dead);
      const cc = P.campCan;
      b.add(boxGeo(V(cc[0] - 0.42, 0, cc[2] - 0.32), V(cc[0] + 0.42, 0.62, cc[2] + 0.32)), lam("crateWood", () => ({ map: beamHD(), color: "#b08a5a" })));
      b.build(R);
      this.addCan(R, cc);
      const gb = this.barrel, steelD = lam("gunBarrel", () => ({ color: "#4a5048" }));
      const br2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 2.3, 12).rotateX(Math.PI / 2).translate(0, 0, 1.0), steelD);
      const breech = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.6), gunM); breech.position.z = -0.2;
      gb.add(br2, breech); gb.position.set(G[0], 0.95, G[2]); gb.rotation.x = -0.26; gb.traverse((o) => { o.castShadow = true; }); R.add(gb);
      this.beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 26, 24, 1, true).translate(0, -13, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.65, 0.9), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.beam.position.set(tw.x, 7.0, tw.z); this.beam.layers.set(NOINK); R.add(this.beam);
      const lampH = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.2, 3.6) }));
      lampH.position.set(tw.x, 7.0, tw.z); lampH.layers.set(NOINK); R.add(lampH);
      for (const lx of [-2.6, 2.6, -7.8, 7.8]) { const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.0, 0.82, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); lg.position.set(Cx + lx, 3.1, Cz + 12); lg.scale.setScalar(1.6); lg.layers.set(NOINK); this.campLamps.push(lg); R.add(lg);
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.4, 2.2) })); bl.position.set(Cx + lx, 3.1, Cz + 11.9); bl.layers.set(NOINK); R.add(bl); }
    }

    // ======================= ALPS (z -400) =======================
    {
      const R = this.group("alps");
      const b = new Batch(), A = ALPS;
      const meadow = lam("alpGrass", () => ({ map: grassHD(), color: "#e6ffe0" }));
      b.add(ground(-300, 300, -900, -250, 4), meadow);
      const rockM = lam("mtnRock", () => ({ map: stoneHD("mtnHD", ["#8b93a8", "#9aa1b4", "#7f879c", "#a3aabb"], "#6a7286"), color: "#d8dcf0" }));
      const snowM = lam("snow", () => ({ color: "#f8f9ff" }));
      for (const [x, z, r, h] of [[-160, -620, 110, 190], [-30, -660, 140, 240], [120, -610, 100, 170], [230, -680, 130, 210], [-280, -700, 120, 200], [40, -560, 70, 110]] as const) {
        const cone = new THREE.ConeGeometry(r, h, 10, 4); const cp = cone.attributes.position as THREE.BufferAttribute; const mr = rng(Math.abs(x) + 3);
        for (let i = 0; i < cp.count; i++) if (cp.getY(i) < h / 2 - 1) { cp.setX(i, cp.getX(i) * (0.9 + 0.2 * mr())); cp.setZ(i, cp.getZ(i) * (0.9 + 0.2 * mr())); }
        cone.computeVertexNormals();
        b.add(cone, rockM, M4(A[0] + x, h / 2 - 4, z));
        b.add(new THREE.ConeGeometry(r * 0.36, h * 0.36, 7, 1), snowM, M4(A[0] + x, h - h * 0.18 - 4 + 0.5, z));
      }
      house(b, A[0] + 10, A[2] - 15, -0.35, 8, 7, 4.2, 6);
      house(b, A[0] - 16, A[2] - 26, 0.3, 7, 6, 4.0, 1);
      const pr = rng(41);
      for (let k = 0; k < 40; k++) { const x = -60 + pr() * 120, z = A[2] - 14 - pr() * 70; if (Math.abs(x) < 6 && z > A[2] - 20) continue; prop(b, {}, "tree_cone", x, 0, z, 6 + pr() * 5, pr() * 6); }
      prop(b, {}, "tree_cone", P.hideTree[0], 0, P.hideTree[2], 3.6, 0.5);
      for (const [x, z, h] of [[-6, -14, 7], [7, -22, 8], [-12, -9, 6]] as const) prop(b, {}, "tree_cone", A[0] + x, 0, A[2] + z, h);
      const po = P.poster, wood = lam("woodBeam", () => ({ map: beamHD() }));
      b.add(boxGeo(V(po[0] - 0.07, 0, po[2] - 0.12), V(po[0] + 0.07, 2.1, po[2] - 0.02)), wood);
      b.build(R);
      const poster = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.012), lam("posterM", () => ({ map: posterTex(), color: "#ffffff" })));
      poster.position.set(po[0], 1.55, po[2]); poster.rotation.z = 0.04; poster.castShadow = true; poster.receiveShadow = true; R.add(poster);
    }
  }

  private addCan(R: THREE.Object3D, at: V3) {
    const label = new THREE.MeshBasicMaterial({ map: canTex(), color: 0xd8d8d8 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 28, 1, true).translate(0, 0.085, 0), label);
    can.rotation.y = Math.PI; can.position.set(...at); can.castShadow = true; R.add(can);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.02, 28), lam("canLid", () => ({ color: "#8d949c" })));
    lid.position.set(at[0], at[1] + 0.175, at[2]); lid.castShadow = true; R.add(lid);
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
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    const want = s.set === "factory" ? "farm" : s.set === "camp" ? "trench" : s.set;
    for (const [name, g] of this.sets) g.visible = name === want;
    // ---- moving parts ----
    const night = s.light === "night";
    this.windowMat.color.set(night ? "#2a3a6a" : "#e6f2ff");
    const pump = clamp01((t - EV.pump) / 2.3);
    this.needle.rotation.z = -(-2.36 + 4.0 * easeOut(pump) * (t >= EV.pump ? 1 : 0)) + 0.04 * Math.sin(t * 40) * (t > EV.pump && t < EV.heat + 2 ? 1 : 0);
    const pumping = t > EV.pump - 0.2 && t < EV.drip0;
    this.piston.position.y = 1.0 + (pumping ? 0.18 * Math.sin(t * 2 * Math.PI * 2.5) : 0);
    this.wheel.rotation.x = pumping ? t * 15 : 0;
    const heat = t < EV.heat ? 0.35 : t < EV.heat + 1.2 ? 0.35 + 0.65 * smooth((t - EV.heat) / 1.2) : 1;
    this.furnaceMat.color.setRGB(0.55 + 1.15 * heat, 0.12 + 0.3 * heat, 0.02 + 0.03 * heat);
    (this.furnaceGlow.material as THREE.SpriteMaterial).opacity = 0.25 + 0.75 * heat;
    const drips = clamp01((t - EV.drip0) / 2.6);
    this.liquid.scale.y = 0.4 + 1.2 * (s.id >= 7 ? drips : 0) + (s.id >= 8 ? 0 : 0);
    const lampOn = night && (id === 14 || id === 20);
    this.bulb.visible = this.lampGlow.visible = lampOn && id === 14;
    if (id === 14) { const dim = t > EV.claraGone ? 0.55 : 1; (this.lampGlow.material as THREE.SpriteMaterial).opacity = 0.75 * dim; }
    this.flame.visible = this.candleGlow.visible = id === 20;
    if (id === 20) { const fl = 1 + 0.12 * Math.sin(t * 23) + 0.08 * Math.sin(t * 37); this.flame.scale.set(0.035 * fl, 0.07 * fl, 1); this.candleGlow.scale.setScalar(0.75 * fl); }
    // factory chute: sacks every 0.85 s, then the shell
    const C = P.chute, slide = (u: number) => [C[0], C[1] + 0.25 - (C[1] - 0.95) * u, C[2] + 0.3 + 3.9 * u] as V3;
    this.sacks.forEach((m) => { m.visible = false; });
    if (id === 10) for (let n = 0; n < 12; n++) {
      const t0 = T(842) - 0.5 + n * 0.55, u = (t - t0) / 0.8;
      if (u <= 0 || u >= 1 || t0 + 0.8 > EV.shell - 0.5) continue;
      const m = this.sacks[n % 3]; m.visible = true;
      const p = slide(u * u); m.position.set(...p); m.rotation.set(0.45, 0, 0);
    }
    const su2 = (t - (EV.shell - 0.75)) / 0.75;
    this.shell.visible = id === 10 && su2 > 0;
    if (this.shell.visible) { const p = slide(Math.min(1, su2 * su2)); this.shell.position.set(p[0], p[1] + 0.18, p[2]); this.shell.rotation.set(Math.PI / 2 - 0.45 + (su2 > 1 ? 0.45 : 0), 0, 0); }
    // warship (shot 11)
    this.warship.visible = id === 11;
    this.merchant.visible = id === 11;
    if (id === 11) { const u = easeOut(clamp01((t - EV.warship0) / (EV.warshipStop - EV.warship0))); this.warship.position.set(P.merchant[0] + 26 - 19 * u, -0.1, P.merchant[2] + 10); this.warship.rotation.z = 0.01 * Math.sin(t * 1.3); }
    // field gun recoil
    let rec = 0; for (const tg of [EV.gun1, EV.gun2]) { const d = t - tg; if (d >= 0 && d < 0.6) rec = Math.max(rec, d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.54); }
    this.barrel.position.z = P.gun[2] - 0.45 * rec;
    this.beam.rotation.set(0.95, 0.45 * Math.sin(t * 0.7), 0, "YXZ");
    this.beam.visible = id === 19;
    for (const sm of this.smoke) {
      const show = (sm.set === "factory" && (s.set === "farm" || s.set === "factory")) || (sm.set === "warship" && id === 11);
      sm.m.visible = show;
      if (!show) continue;
      const u = (t * 0.11 + sm.k) % 1, sz = 3 + u * 9, top = sm.top();
      sm.m.position.set(top[0] + u * sm.drift[0], top[1] + u * sm.drift[1] + u * u * 4, top[2] + u * sm.drift[2]);
      sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.85 * (1 - u) ** 1.2;
    }
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
