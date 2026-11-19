// The camera lab's one three.js world: a cartoon kitchen (checker floor, wainscot walls, window with curtains, table
// with the toast, chair, counter, fridge, pendant lamp, measuring stick) inside a little house, and the garden behind
// the window (grass, fence, trees, the 3 m table with a ladder, a 3 m measuring pole, sky + clouds). update() poses
// the toasts, sticks and cast for a story frame and puts the camera where the variant says. Pure function of input.
import * as THREE from "three";
import { staticFile } from "remotion";
import { Batch, boxGeo, quad, V, lam, Kit } from "./build";
import { ctex, grassHD, roofHD, cloudHD } from "./paint";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  V3, TABLE, TABLE_H, TABLE_W, TABLE_D, PLATE, RULER, WIN, ROOM, GIANT, GIANT_H, GIANT_W, GIANT_D, GRULER, TOAST, FLOOR_HIT,
  EV, B, toastAt, gtoastAt, popK, markAt, clamp01,
} from "./timeline";
import { Cam } from "./moves";

// ---------------- assets: fonts only ----------------
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const faces = [new FontFace("Fredoka", `url(${staticFile("fonts/fredoka-latin-700-normal.woff2")})`, { weight: "700" })];
    kitP = Promise.all(faces.map((f) => f.load().then((ff) => { (document.fonts as unknown as { add(x: FontFace): void }).add(ff); }).catch(() => undefined))).then(() => ({} as Kit));
  }
  return kitP;
};

// ---------------- painted textures ----------------
const floorTiles = () => ctex("kFloor", 512, 512, (g, r) => {
  const cols = ["#f1e4c6", "#cf7d57"];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = cols[(i + j) % 2]; g.fillRect(i * 256, j * 256, 256, 256);
    g.fillStyle = (i + j) % 2 ? "rgba(255,255,255,0.08)" : "rgba(120,80,40,0.06)";
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(i * 256 + 40 + r() * 176, j * 256 + 40 + r() * 176, 30 + r() * 40, 18 + r() * 20, r() * 3, 0, 7); g.fill(); }
  }
  g.strokeStyle = "rgba(90,60,50,0.55)"; g.lineWidth = 6;
  for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, 512); g.stroke(); g.beginPath(); g.moveTo(0, k * 256); g.lineTo(512, k * 256); g.stroke(); }
});
/** wall: mint plank wainscot to 0.9 m, white rail, buttery striped paper above; 1 texture = 2.9 x 2.9 m */
const wallTex = () => ctex("kWall", 1024, 1024, (g, r) => {
  const H = 1024, m = H / 2.9, wy = H - 0.9 * m;
  g.fillStyle = "#f6dea0"; g.fillRect(0, 0, 1024, wy);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = "#f0d38c"; g.fillRect(x, 0, 22, wy); }
  for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.arc(r() * 1024, r() * wy, 3 + r() * 4, 0, 7); g.fill(); }
  g.fillStyle = "#9fd2b4"; g.fillRect(0, wy, 1024, H - wy);
  g.strokeStyle = "rgba(40,90,70,0.45)"; g.lineWidth = 4;
  for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, wy); g.lineTo(x, H); g.stroke(); }
  g.fillStyle = "#fbf6ea"; g.fillRect(0, wy - 14, 1024, 22);
  g.fillStyle = "rgba(60,40,40,0.35)"; g.fillRect(0, wy + 8, 1024, 4);
  g.fillStyle = "#7fb79a"; g.fillRect(0, H - 26, 1024, 26);
});
const woodTex = (key: string, base: string, dark: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = dark; g.globalAlpha = 0.35;
  for (let y = 6; y < 512; y += 10 + r() * 14) { g.lineWidth = 1.5 + r() * 2.5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 3); g.stroke(); }
  g.globalAlpha = 0.6; g.lineWidth = 4; for (let y = 0; y < 512; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.globalAlpha = 1;
});
const toastTex = (key: string, top: boolean) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#9b5a26"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = top ? "#e7b25e" : "#efc77d"; g.beginPath(); g.roundRect(18, 18, 220, 220, 34); g.fill();
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(170,100,40,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(30 + r() * 196, 30 + r() * 196, 2 + r() * 5, 0, 7); g.fill(); }
});
const gingham = () => ctex("gingham", 256, 256, (g) => {
  g.fillStyle = "#fbf3ea"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(214,64,58,0.55)"; for (let x = 0; x < 256; x += 64) { g.fillRect(x, 0, 32, 256); g.fillRect(0, x, 256, 32); }
});
/** measuring stick: yellow, a tick every 5 cm, long ticks every 10 cm, black every 50; `m` metres tall */
const stickTex = (key: string, m: number, major: number) => ctex(key, 64, 1024, (g) => {
  g.fillStyle = "#ffd447"; g.fillRect(0, 0, 64, 1024);
  const px = 1024 / m;
  for (let c = 0; c <= Math.round(m / 0.05); c++) {
    const y = 1024 - c * 0.05 * px, big = c % Math.round(major / 0.05) === 0;
    g.fillStyle = "#2a2230"; g.fillRect(0, y - 3, big ? 40 : 22, big ? 7 : 4);
  }
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(58, 0, 6, 1024);
});
const cabinetTex = () => ctex("cabinet", 512, 512, (g) => {
  g.fillStyle = "#86c3a8"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#4f8a73"; g.lineWidth = 8;
  for (const x of [16, 272]) { g.strokeRect(x, 24, 224, 464); g.strokeRect(x + 28, 54, 168, 404); }
  g.fillStyle = "#f2d16b"; for (const x of [222, 290]) { g.beginPath(); g.arc(x, 240, 12, 0, 7); g.fill(); }
});
const clockTex = () => ctex("clock", 256, 256, (g) => {
  g.fillStyle = "#fbf6ea"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.fillStyle = "#2a2230"; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.arc(128 + 100 * Math.cos(a), 128 + 100 * Math.sin(a), i % 3 ? 5 : 9, 0, 7); g.fill(); }
  g.strokeStyle = "#2a2230"; g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(186, 150); g.stroke();
});
const exteriorTex = () => ctex("houseExt", 512, 512, (g, r) => {
  g.fillStyle = "#f2e2c4"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(150,120,90,0.25)"; g.lineWidth = 3;
  for (let y = 16; y < 512; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let k = 0; k < 30; k++) { g.fillStyle = "rgba(200,170,130,0.12)"; g.beginPath(); g.arc(r() * 512, r() * 512, 10 + r() * 30, 0, 7); g.fill(); }
});
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

const M4 = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
/** box from a centre + size */
const cbox = (cx: number, cy: number, cz: number, w: number, h: number, d: number, tile = 0) => boxGeo(V(cx - w / 2, cy - h / 2, cz - d / 2), V(cx + w / 2, cy + h / 2, cz + d / 2), tile, true);
/** wall quad facing +n with world-anchored uvs (tile metres per texture) */
const wallQ = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, uOf: (p: THREE.Vector3) => number, T: number) =>
  quad(a, b, c, d, uOf(c) / T, c.y / T, uOf(a) / T, a.y / T);

const LAMP: V3 = [-0.3, 0, -1.25];
export const SUN_DIR = new THREE.Vector3(0.62, 0.68, 0.39).normalize(); // world-fixed sun: front-right, high

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 300);
  private clouds: THREE.Mesh[] = [];
  private toast: THREE.Group; private gtoast: THREE.Group; private smear: THREE.Mesh;
  private ruler: THREE.Group; private rulerMark: THREE.Mesh; private gruler: THREE.Group; private gMark: THREE.Mesh;
  private bulb: THREE.MeshBasicMaterial;
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const Rt = this.root;
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); Rt.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Rt.add(this.hemi, this.sun, this.sun.target);
    const cm = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud));
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.15 + (0.7 * i) / 8), d = 420 + (i % 3) * 50, w = 110 + (i % 4) * 26;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cm[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 70 + (i % 4) * 30, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); Rt.add(m);
    }
    this.buildHouse(Rt);
    this.buildGarden(Rt);

    // ---- toasts (group: crust slab + painted top / bottom + butter pat) ----
    const mkToast = () => {
      const g = new THREE.Group(), w = TOAST.w, t = TOAST.t;
      const crust = lam("crust", () => ({ color: "#a8652c" })), top = lam("toastTop", () => ({ map: toastTex("toastTop", true) })), bot = lam("toastBot", () => ({ map: toastTex("toastBot", false) }));
      const add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
      add(cbox(0, 0, 0, w, t * 0.96, w), crust);
      add(new THREE.PlaneGeometry(w * 0.999, w * 0.999).rotateX(-Math.PI / 2).translate(0, t / 2, 0), top);
      add(new THREE.PlaneGeometry(w * 0.999, w * 0.999).rotateX(Math.PI / 2).translate(0, -t / 2, 0), bot);
      const butter = add(cbox(0.005, t / 2 + 0.008, -0.004, 0.08, 0.016, 0.065), lam("butter", () => ({ color: "#ffd84a" })));
      butter.rotation.y = 0.25;
      Rt.add(g);
      return g;
    };
    this.toast = mkToast(); this.gtoast = mkToast();
    this.smear = new THREE.Mesh(new THREE.CircleGeometry(0.16, 28).rotateX(-Math.PI / 2), lam("butterSmear", () => ({ color: "#ffd84a" })));
    this.smear.receiveShadow = true; this.smear.position.set(FLOOR_HIT[0], 0.003, FLOOR_HIT[2]); Rt.add(this.smear);

    // ---- measuring sticks ----
    const stick = (tex: THREE.Texture, w: number, h: number, key: string) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(cbox(0, h / 2, 0, w, h, w * 0.25), lam(key, () => ({ map: tex })));
      body.castShadow = true; g.add(body);
      const mark = new THREE.Mesh(cbox(0, 0, 0, w * 2.1, w * 0.55, w * 0.7), lam("markRed", () => ({ color: "#e2453c" })));
      mark.castShadow = true; g.add(mark);
      Rt.add(g);
      return { g, mark };
    };
    const r1 = stick(stickTex("stick85", 0.85, 0.1), 0.05, 0.85, "stickA"); this.ruler = r1.g; this.rulerMark = r1.mark;
    this.ruler.position.set(...RULER);
    const r2 = stick(stickTex("stick300", 3.0, 0.5), 0.12, 3.0, "stickB"); this.gruler = r2.g; this.gMark = r2.mark;
    this.gruler.position.set(...GRULER);

    // ---- pendant lamp bulb (blooms) ----
    this.bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.5), fog: false });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), this.bulb);
    bulb.position.set(LAMP[0], 1.98, LAMP[2]); Rt.add(bulb);
  }

  private buildHouse(Rt: THREE.Object3D) {
    const b = new Batch(), shell = new Batch();
    const { x0, x1, z0, z1, h } = ROOM, T = 2.9, th = 0.15;
    const wall = lam("kWall", () => ({ map: wallTex() })), ext = lam("houseExt", () => ({ map: exteriorTex() }));
    const trim = lam("trimWhite", () => ({ color: "#fbf6ea" }));
    // floor + ceiling
    const fl = floorTiles(); b.add(boxGeo(V(x0 - th, -0.1, z0 - th), V(x1 + th, 0, z1 + th), 0.8), lam("kFloor", () => ({ map: fl })));
    shell.add(quad(V(x0, h, z0), V(x1, h, z0), V(x1, h, z1), V(x0, h, z1)), lam("ceiling", () => ({ color: "#f7efdf", side: THREE.DoubleSide })));
    // interior wall faces (world-anchored uvs) + exterior faces
    const back = (xa: number, xb: number, ya: number, yb: number) => {
      shell.add(wallQ(V(xa, ya, z0), V(xb, ya, z0), V(xb, yb, z0), V(xa, yb, z0), (p) => p.x, T), wall);
      shell.add(wallQ(V(xb, ya, z0 - th), V(xa, ya, z0 - th), V(xa, yb, z0 - th), V(xb, yb, z0 - th), (p) => -p.x, T), ext);
    };
    back(x0, WIN.x0, 0, h); back(WIN.x1, x1, 0, h); back(WIN.x0, WIN.x1, 0, WIN.y0); back(WIN.x0, WIN.x1, WIN.y1, h);
    // window reveal (the hole's sides)
    const rev = lam("reveal", () => ({ color: "#f3ead8", side: THREE.DoubleSide }));
    shell.add(quad(V(WIN.x0, WIN.y0, z0 - th), V(WIN.x0, WIN.y0, z0), V(WIN.x0, WIN.y1, z0), V(WIN.x0, WIN.y1, z0 - th)), rev);
    shell.add(quad(V(WIN.x1, WIN.y0, z0), V(WIN.x1, WIN.y0, z0 - th), V(WIN.x1, WIN.y1, z0 - th), V(WIN.x1, WIN.y1, z0)), rev);
    shell.add(quad(V(WIN.x0, WIN.y1, z0), V(WIN.x1, WIN.y1, z0), V(WIN.x1, WIN.y1, z0 - th), V(WIN.x0, WIN.y1, z0 - th)), rev);
    shell.add(quad(V(WIN.x0, WIN.y0, z0 - th), V(WIN.x1, WIN.y0, z0 - th), V(WIN.x1, WIN.y0, z0), V(WIN.x0, WIN.y0, z0)), rev);
    // side + front walls
    shell.add(wallQ(V(x0, 0, z1), V(x0, 0, z0), V(x0, h, z0), V(x0, h, z1), (p) => -p.z, T), wall);
    shell.add(wallQ(V(x0 - th, 0, z0 - th), V(x0 - th, 0, z1 + th), V(x0 - th, h, z1 + th), V(x0 - th, h, z0 - th), (p) => p.z, T), ext);
    shell.add(wallQ(V(x1, 0, z0), V(x1, 0, z1), V(x1, h, z1), V(x1, h, z0), (p) => p.z, T), wall);
    shell.add(wallQ(V(x1 + th, 0, z1 + th), V(x1 + th, 0, z0 - th), V(x1 + th, h, z0 - th), V(x1 + th, h, z1 + th), (p) => -p.z, T), ext);
    shell.add(wallQ(V(x1, 0, z1), V(x0, 0, z1), V(x0, h, z1), V(x1, h, z1), (p) => -p.x, T), wall);
    shell.add(wallQ(V(x0 - th, 0, z1 + th), V(x1 + th, 0, z1 + th), V(x1 + th, h, z1 + th), V(x0 - th, h, z1 + th), (p) => p.x, T), ext);
    // roof: gable along x, eaves overhang
    const rf = lam("roof", () => ({ map: roofHD("#c0563a") })), ey = h + 0.05, ry = h + 1.5, ov = 0.45;
    shell.add(quad(V(x0 - ov, ey, z1 + ov), V(x1 + ov, ey, z1 + ov), V(x1 + ov, ry, 0), V(x0 - ov, ry, 0), 3, 2), rf);
    shell.add(quad(V(x1 + ov, ey, z0 - ov), V(x0 - ov, ey, z0 - ov), V(x0 - ov, ry, 0), V(x1 + ov, ry, 0), 3, 2), rf);
    shell.add(boxGeo(V(x0 - th, h, z0 - th), V(x1 + th, h + 0.06, z1 + th)), trim);
    for (const x of [x0 - th, x1 + th]) {
      const s = x < 0 ? -1 : 1, tg = new THREE.BufferGeometry();
      const P = [V(x, ey, z0 - th), V(x, ey, z1 + th), V(x, ry - 0.05, 0)];
      if (s > 0) P.reverse();
      tg.setFromPoints(P); tg.computeVertexNormals(); tg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.5], 2));
      shell.add(tg, ext);
    }
    // window frame + sill + curtains + plant
    b.add(cbox((WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.03, z0 + 0.07, WIN.x1 - WIN.x0 + 0.24, 0.06, 0.2), trim);
    for (const x of [WIN.x0 - 0.05, WIN.x1 + 0.05]) b.add(cbox(x, (WIN.y0 + WIN.y1) / 2, z0 + 0.02, 0.1, WIN.y1 - WIN.y0 + 0.1, 0.06), trim);
    b.add(cbox((WIN.x0 + WIN.x1) / 2, WIN.y1 + 0.05, z0 + 0.02, WIN.x1 - WIN.x0 + 0.2, 0.1, 0.06), trim);
    b.add(cbox((WIN.x0 + WIN.x1) / 2, WIN.y1 + 0.16, z0 + 0.06, WIN.x1 - WIN.x0 + 1.0, 0.04, 0.04), lam("rod", () => ({ color: "#8a5a3c" })));
    const cur = lam("gingham", () => ({ map: gingham(), side: THREE.DoubleSide }));
    for (const [xa, xb] of [[WIN.x0 - 0.42, WIN.x0 + 0.06], [WIN.x1 - 0.06, WIN.x1 + 0.42]]) {
      const n = 8, pts: number[] = [], uvs: number[] = [], zc = z0 + 0.1;
      for (let i = 0; i < n; i++) {
        const xa_ = xa + ((xb - xa) * i) / n, xb_ = xa + ((xb - xa) * (i + 1)) / n, za = zc + (i % 2 ? 0.04 : 0), zb = zc + ((i + 1) % 2 ? 0.04 : 0);
        const q4 = quad(V(xa_, 0.8, za), V(xb_, 0.8, zb), V(xb_, WIN.y1 + 0.16, zb), V(xa_, WIN.y1 + 0.16, za), (i + 1) / n * 2, 3, (i / n) * 2, 0);
        b.add(q4, cur); void pts; void uvs;
      }
    }
    const pot = lam("pot", () => ({ color: "#c96a3c" })), leaf = lam("leaf", () => ({ color: "#5aa84a" }));
    b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 16).translate(WIN.x0 + 0.12, WIN.y0 + 0.08, z0 + 0.08), pot);
    b.add(new THREE.SphereGeometry(0.14, 14, 10).translate(WIN.x0 + 0.12, WIN.y0 + 0.26, z0 + 0.08), leaf);
    // table
    const [tx, , tz] = TABLE, wood = lam("tableWood", () => ({ map: woodTex("tableWood", "#d39b5c", "#8a5a30") }));
    b.add(cbox(tx, TABLE_H - 0.025, tz, TABLE_W, 0.05, TABLE_D, 0.6), wood);
    b.add(cbox(tx, TABLE_H - 0.09, tz, TABLE_W - 0.12, 0.08, TABLE_D - 0.12), wood);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(cbox(tx + sx * (TABLE_W / 2 - 0.06), (TABLE_H - 0.05) / 2, tz + sz * (TABLE_D / 2 - 0.06), 0.06, TABLE_H - 0.05, 0.06), wood);
    // plate, mug, butter dish
    const china = lam("china", () => ({ color: "#fbf8f2" })), blue = lam("chinaBlue", () => ({ color: "#4f7fc9" }));
    b.add(new THREE.CylinderGeometry(0.15, 0.12, 0.014, 28).translate(PLATE[0], TABLE_H + 0.007, PLATE[2]), china);
    b.add(new THREE.TorusGeometry(0.135, 0.008, 6, 28).rotateX(Math.PI / 2).translate(PLATE[0], TABLE_H + 0.014, PLATE[2]), blue);
    b.add(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 18).translate(-0.32, TABLE_H + 0.055, -1.0), lam("mug", () => ({ color: "#e2453c" })));
    b.add(new THREE.TorusGeometry(0.03, 0.01, 6, 12).translate(-0.27, TABLE_H + 0.06, -1.0), lam("mug", () => ({ color: "#e2453c" })));
    b.add(cbox(-0.05, TABLE_H + 0.01, -1.38, 0.16, 0.02, 0.11), china);
    b.add(cbox(-0.05, TABLE_H + 0.035, -1.38, 0.1, 0.035, 0.06), lam("butter", () => ({ color: "#ffd84a" })));
    // chair in front (back to the camera)
    const red = lam("chairRed", () => ({ color: "#d2473b" })), cx = -0.32, cz = -0.5;
    b.add(cbox(cx, 0.45, cz, 0.42, 0.04, 0.42), red);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(cbox(cx + sx * 0.18, 0.225, cz + sz * 0.18, 0.04, 0.45, 0.04), red);
    for (const sx of [-1, 1]) b.add(cbox(cx + sx * 0.18, 0.72, cz + 0.19, 0.045, 0.54, 0.045), red);
    b.add(cbox(cx, 0.95, cz + 0.19, 0.42, 0.1, 0.045), red); b.add(cbox(cx, 0.72, cz + 0.19, 0.36, 0.05, 0.03), red);
    // counter + upper cabinets + fridge (left wall), shelf + door (right wall), clock (back wall)
    const cab = lam("cabinet", () => ({ map: cabinetTex() })), top = lam("counterTop", () => ({ color: "#f3efe6" }));
    b.add(boxGeo(V(x0, 0, z0), V(x0 + 0.6, 0.88, 0.5), 1.2), cab);
    b.add(boxGeo(V(x0, 0.88, z0), V(x0 + 0.65, 0.93, 0.55)), top);
    b.add(boxGeo(V(x0, 1.55, z0), V(x0 + 0.36, 2.3, 0.2), 1.2), cab);
    const jar = ["#e9a84a", "#7fb6d8", "#d96c6c", "#a8c76a"];
    jar.forEach((c, i) => b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.2 + 0.04 * (i % 2), 14).translate(x0 + 0.3, 1.03 + 0.02 * (i % 2), -2.5 + i * 0.32), lam("jar" + i, () => ({ color: c }))));
    b.add(new THREE.SphereGeometry(0.12, 16, 12).scale(1, 0.85, 1).translate(x0 + 0.32, 1.03, 0.05), lam("kettle", () => ({ color: "#4f7fc9" })));
    b.add(boxGeo(V(x0, 0, 0.75), V(x0 + 0.7, 1.85, 1.45)), lam("fridge", () => ({ color: "#f1ebdc" })));
    b.add(cbox(x0 + 0.72, 1.2, 1.35, 0.04, 0.4, 0.04), lam("chrome", () => ({ color: "#b8bcc6" })));
    b.add(boxGeo(V(x1 - 0.06, 0, 0.4), V(x1, 2.05, 1.3)), lam("door", () => ({ map: woodTex("doorWood", "#9a6a46", "#5a3a26") })));
    b.add(boxGeo(V(x1 - 0.3, 1.55, -2.4), V(x1, 1.59, -0.6)), wood);
    ["#e9a84a", "#7fb6d8", "#d96c6c"].forEach((c, i) => b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12).translate(x1 - 0.15, 1.68, -2.1 + i * 0.5), lam("jar" + (i + 1), () => ({ color: c }))));
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32).rotateX(Math.PI / 2).translate(1.9, 2.05, z0 + 0.02), lam("clock", () => ({ map: clockTex() })));
    // pendant lamp: cord + shade
    shell.add(new THREE.CylinderGeometry(0.008, 0.008, h - 2.15, 6).translate(LAMP[0], (h + 2.15) / 2, LAMP[2]), lam("cord", () => ({ color: "#2a2230" })));
    b.add(new THREE.CylinderGeometry(0.08, 0.26, 0.2, 24, 1, true).translate(LAMP[0], 2.06, LAMP[2]), lam("shade", () => ({ color: "#2f8a6f", side: THREE.DoubleSide })));
    b.build(Rt, true);
    shell.build(Rt, false); // walls / ceiling / roof never block the sun: the room stays sunlit (cartoon licence)
  }

  private buildGarden(Rt: THREE.Object3D) {
    const b = new Batch(), far = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() }));
    const gp = new THREE.PlaneGeometry(400, 400, 1, 1).rotateX(-Math.PI / 2).translate(0, -0.012, -150);
    const uv = gp.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 100, uv.getY(i) * 100);
    far.add(gp, grass);
    // stepping-stone path from the house
    const stone = lam("pathStone", () => ({ color: "#d9cdb8" }));
    for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 14).translate(-1.8 + 0.12 * (i % 2), 0.0, -3.9 - i * 0.75), stone);
    // fence
    const white = lam("fence", () => ({ color: "#fbf6ea" }));
    for (let x = -12; x <= 12; x += 0.32) b.add(cbox(x, 0.5, -17, 0.12, 1.0, 0.04), white);
    for (const y of [0.3, 0.75]) b.add(cbox(0, y, -17.04, 24.2, 0.08, 0.03), white);
    for (const sx of [-12, 12]) { for (let z = -3.6; z >= -17; z -= 0.32) b.add(cbox(sx, 0.5, z, 0.04, 1.0, 0.12), white); for (const y of [0.3, 0.75]) b.add(cbox(sx + (sx < 0 ? -0.04 : 0.04), y, -10.3, 0.03, 0.08, 13.4), white); }
    // trees + bushes (rounded storybook canopies)
    const bark = lam("bark", () => ({ color: "#8a5a3c" })), leafs = ["#5fae4c", "#4f9e44", "#6cba52"].map((c, i) => lam("canopy" + i, () => ({ color: c })));
    const tree = (x: number, z: number, s: number, i: number) => {
      b.add(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.2 * s, 10).translate(x, 1.1 * s, z), bark);
      b.add(new THREE.SphereGeometry(1.2 * s, 18, 14).translate(x, 2.8 * s, z), leafs[i % 3]);
      b.add(new THREE.SphereGeometry(0.85 * s, 16, 12).translate(x + 0.8 * s, 2.4 * s, z + 0.3 * s), leafs[(i + 1) % 3]);
      b.add(new THREE.SphereGeometry(0.8 * s, 16, 12).translate(x - 0.75 * s, 2.5 * s, z - 0.2 * s), leafs[(i + 2) % 3]);
    };
    tree(-4.8, -8.5, 1.2, 0); tree(5.6, -12.5, 1.35, 1); tree(-8.5, -14, 1.1, 2); tree(8.8, -6.2, 1.0, 0); tree(-3, -21, 1.5, 1); tree(4, -24, 1.6, 2);
    for (let i = 0; i < 14; i++) { const x = -11 + i * 1.7, r = 0.45 + 0.2 * ((i * 7) % 3) / 2; b.add(new THREE.SphereGeometry(r, 14, 10).scale(1, 0.8, 1).translate(x, r * 0.6, -16.4), leafs[i % 3]); }
    // sunflowers between the house and the 3 m table (foreground for trucks and focus pulls); heads turn to the sun
    const stem = lam("stem", () => ({ color: "#4f9e44" })), petal = lam("petal", () => ({ color: "#f7c531" })), seed = lam("seed", () => ({ color: "#6b3f22" }));
    const flowers: [number, number, number][] = [[-1.05, -6.55, 1.62], [-1.45, -6.85, 1.85], [-0.75, -6.95, 1.45], [-1.85, -6.5, 1.55], [-2.25, -6.95, 1.78], [-1.3, -6.25, 1.32]];
    for (const [x, z, h] of flowers) {
      b.add(new THREE.CylinderGeometry(0.022, 0.03, h, 8).translate(x, h / 2, z), stem);
      for (const [dy, s] of [[0.45, 1], [0.8, -1]]) b.add(new THREE.SphereGeometry(0.11, 10, 6).scale(1.6, 0.25, 0.7).rotateY(s * 0.6).translate(x + s * 0.13, h * dy, z), stem);
      const head = new THREE.Group();
      head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20).rotateX(Math.PI / 2), petal));
      head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.045, 16).rotateX(Math.PI / 2).translate(0, 0, 0.012), seed));
      head.position.set(x, h + 0.05, z); head.lookAt(x + 0.62, h + 0.05 + 0.3, z + 0.39); head.updateMatrixWorld(true);
      head.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) b.add(m.geometry, m.material as THREE.Material, m.matrixWorld); });
    }
    // the 3 m table + ladder
    const [gx, , gz] = GIANT, wood = lam("giantWood", () => ({ map: woodTex("giantWood", "#c98a4e", "#7a4a26") }));
    b.add(cbox(gx, GIANT_H - 0.04, gz, GIANT_W, 0.08, GIANT_D, 0.6), wood);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(cbox(gx + sx * (GIANT_W / 2 - 0.07), (GIANT_H - 0.08) / 2, gz + sz * (GIANT_D / 2 - 0.07), 0.09, GIANT_H - 0.08, 0.09), wood);
    for (const y of [0.9, 2.0]) { b.add(cbox(gx, y, gz + GIANT_D / 2 - 0.07, GIANT_W - 0.1, 0.06, 0.05), wood); b.add(cbox(gx, y, gz - GIANT_D / 2 + 0.07, GIANT_W - 0.1, 0.06, 0.05), wood); }
    const lad = lam("ladder", () => ({ color: "#e6c27a" })), lx = gx - GIANT_W / 2 - 0.25, lz = gz + 0.1;
    const ladder = new THREE.Group();
    for (const s of [-0.22, 0.22]) ladder.add(new THREE.Mesh(cbox(0, 1.6, s, 0.06, 3.3, 0.06), lad));
    for (let k = 0; k < 10; k++) ladder.add(new THREE.Mesh(cbox(0, 0.3 + k * 0.3, 0, 0.04, 0.04, 0.44), lad));
    ladder.position.set(lx - 0.35, 0, lz); ladder.rotation.z = -0.2; ladder.updateMatrixWorld(true);
    ladder.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) b.add(m.geometry, m.material as THREE.Material, m.matrixWorld); });
    // a picnic blanket where the toast lands
    b.add(cbox(1.6, 0.004, -9.2, 1.4, 0.008, 1.1), lam("gingham", () => ({ map: gingham(), side: THREE.DoubleSide })));
    // far hills + neighbour houses
    const hill = lam("hill", () => ({ color: "#7cb456" }));
    [[-60, -110, 40], [10, -140, 55], [70, -120, 45], [-120, -60, 50], [120, -70, 50]].forEach(([x, z, r]) => far.add(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.35, 1).translate(x, -1, z), hill));
    const hx = lam("houseFar", () => ({ color: "#efd9b8" })), rf = lam("roofFar", () => ({ color: "#b85a40" }));
    [[-16, -30], [14, -34], [-28, -22], [26, -26]].forEach(([x, z], i) => { far.add(cbox(x, 2.2, z, 6, 4.4, 5), hx); far.add(new THREE.ConeGeometry(4.6, 2.4, 4).rotateY(Math.PI / 4).translate(x, 5.6, z), i % 2 ? rf : lam("roofFar2", () => ({ color: "#5a7fb8" }))); });
    b.build(Rt, true); far.build(Rt, false);
    void M4;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** pose everything for story frame s and put the camera at c; returns the default focus point */
  update(s: number, c: Cam, cam: THREE.PerspectiveCamera, scene: THREE.Scene, opts: { hideKid1?: boolean; hideKid2?: boolean; near?: number } = {}) {
    const L = LIGHTS.day, K = LOOK.day;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = opts.near ?? 0.05; cam.far = 1200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig: world-fixed sun, shadow box fitted around the look point ----
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 0.9 + 2.5, 3.5, 22);
    this.sun.position.copy(focus).addScaledVector(SUN_DIR, 60); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
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
    untone(L.fog, this.fog.color); this.fog.near = 30; this.fog.far = 320;
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);
    void discTex;

    // ---- toasts ----
    const t1 = toastAt(s), t2 = gtoastAt(s);
    this.toast.position.set(...t1.p); this.toast.rotation.set(0, 0, -t1.rz);
    this.gtoast.position.set(...t2.p); this.gtoast.rotation.set(0, 0, -t2.rz);
    const sm = clamp01((s - EV.splat) / 8);
    this.smear.visible = sm > 0; this.smear.scale.setScalar(0.4 + 0.8 * sm);
    // ---- measuring sticks: pop up, red marker climbs ----
    const k1 = s < EV.ruler ? 0 : popK(s, EV.ruler, 8);
    this.ruler.visible = k1 > 0.01 && s < B.tip; // gone after its beat: it would hide the falling toast this.ruler.scale.set(1, Math.max(0.01, k1), 1);
    this.rulerMark.position.set(0, Math.max(0.02, markAt(s)) / Math.max(0.01, k1) * Math.min(1, k1), 0.012);
    const k2 = s < EV.gruler ? 0 : popK(s, EV.gruler, 9);
    this.gruler.visible = k2 > 0.01; this.gruler.scale.set(1, Math.max(0.01, k2), 1);
    this.gMark.position.set(0, 3.0, 0.03);

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1);
    const st = stage(s, { pos: cam.position, right, up, sun: SUN_DIR });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      if ((opts.hideKid1 && p.key.includes("kid1|")) || (opts.hideKid2 && p.key.includes("kid2|"))) continue;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 0.8, p.z), 1.4))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      // yaw to the lens; lean back toward a high camera so a top-down view still reads (feet stay planted)
      const dx = cam.position.x - p.x, dz = cam.position.z - p.z, el = Math.atan2(cam.position.y - (p.y + 0.6), Math.hypot(dx, dz));
      a.mesh.rotation.set(-THREE.MathUtils.clamp((el - 0.45) * 1.1, 0, 1.2), Math.atan2(dx, dz), 0);
      a.mesh.scale.set(1, 1, 1);
      a.mesh.castShadow = true;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      e2.mat.depthTest = !p.top;
      e2.userTop = !!p.top;
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) { e2.bind(); if (e2.userTop) e2.mesh.renderOrder = 4; }
    void TABLE_H;
    return focus;
  }
}
