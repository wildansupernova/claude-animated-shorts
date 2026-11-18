// The whole place as one three.js scene: sky + clouds, the town square with the party lawn (table, cake, candles,
// gifts, balloons, bunting and string lights between the lamps, the birthday banner), the glowing web of birthday
// pairs, the gold coin, confetti, and the football stadium far out of town. update(id, f, camera) poses everything for
// shot `id` at frame f (a pure function of id + f), then places the cast from cast.ts.
import * as THREE from "three";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, Kit, Ray, buildSquare, buildPitch, LAMPS, LAMP_GLASS, STADIUM_GLOW } from "./build";
import { ctex, grassHD, cobbleHD, cloudHD } from "./paint";
import { Pen, coinFace, fxBanner } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, hh } from "./cast";
import {
  FPS, SHOTS, V3, camAt, ShotDef, G, N, R, GARY, NINE, SEVENTEEN, PITCH, SQUAD, CUP_PAIR, COINS,
  GARY_LINES, SAMPLE_PAIRS, WEB_BUILD, CONFETTI, CUP_LINK, SH, clamp01, smooth, easeOut,
} from "./story";

// ---------------- assets: fonts (canvas text + captions); no external models ----------------
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const faces = [
      new FontFace("Fredoka", `url(${staticFile("fonts/fredoka-latin-700-normal.woff2")})`, { weight: "700" }),
      new FontFace("Montserrat", `url(${staticFile("fonts/montserrat-latin-900-normal.woff2")})`, { weight: "900" }),
      new FontFace("Montserrat", `url(${staticFile("fonts/montserrat-latin-800-normal.woff2")})`, { weight: "800" }),
    ];
    kitP = Promise.all(faces.map((f) => f.load().then((ff) => { (document.fonts as unknown as { add(x: FontFace): void }).add(ff); }).catch(() => undefined))).then(() => ({} as Kit));
  }
  return kitP;
};

// ---------------- helpers ----------------
/** flat ring / disc on the ground (y), uv tiled every `tile` metres in world x/z */
const disc = (r0: number, r1: number, tile: number, y: number, seg = 96) => {
  const g = new THREE.RingGeometry(r0, r1, seg, 2);
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
  return g;
};
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.scene === "pitch") continue;
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = fw.length();
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const glowTex = () => ctex("glowDot", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** tablecloth: pink + cream stripes with a scalloped hem */
const clothTex = () => ctex("clothHD", 1024, 256, (g) => {
  for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? "#fbe7ef" : "#f28ab2"; g.fillRect(i * 32, 0, 32, 256); }
  g.fillStyle = "#fff6e0"; for (let i = 0; i < 32; i++) { g.beginPath(); g.arc(i * 32 + 16, 250, 16, 0, Math.PI, true); g.fill(); }
  g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 0, 1024, 18);
});
/** cake tier side: sponge colour with icing drips from the top */
const tierTex = (key: string, body: string, icing: string) => ctex(key, 1024, 256, (g, r) => {
  g.fillStyle = body; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = icing; g.fillRect(0, 0, 1024, 56);
  for (let x = 0; x < 1024; x += 40 + r() * 30) { const h = 50 + r() * 90, w = 22 + r() * 14; g.beginPath(); g.moveTo(x - w / 2, 40); g.lineTo(x - w / 2, h); g.arc(x, h, w / 2, Math.PI, 0, true); g.lineTo(x + w / 2, 40); g.fill(); }
  g.fillStyle = "rgba(255,255,255,0.75)"; for (let x = 10; x < 1024; x += 42) { g.beginPath(); g.arc(x, 226, 9, 0, 7); g.fill(); }
});
const ribbonTex = (key: string, box: string, rib: string) => ctex(key, 256, 256, (g) => {
  g.fillStyle = box; g.fillRect(0, 0, 256, 256); g.fillStyle = rib; g.fillRect(108, 0, 40, 256); g.fillRect(0, 108, 256, 40);
});

const BALLOON_COLS = ["#e2453c", "#3f6fb5", "#f2b53a", "#2f8a4f", "#d9577a", "#8c5ac9", "#2fa6a0", "#ffffff"];
const BALLOON_AT = [-14, 14, 74, 140, 223, 266, 305].map((d) => (d * Math.PI) / 180);
const MAXL = 320; // 253 pairs + Gary's 22 + the match
/** twist of the coin about its own axis so the face art stands upright on screen (found on test stills) */
const COIN_TWIST = 0;

type Mats = Record<string, THREE.Material>;
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private table = new THREE.Group();
  private flames: { m: THREE.Mesh; glow: THREE.Sprite; i: number }[] = [];
  private balloons: { m: THREE.Group; base: V3; i: number }[] = [];
  private bulbs: THREE.InstancedMesh; private bulbMat: THREE.MeshBasicMaterial;
  private lines: THREE.InstancedMesh; private lineMat: THREE.MeshBasicMaterial;
  private coin: THREE.Mesh;
  private confetti: THREE.InstancedMesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private q = new THREE.Quaternion(); private col = new THREE.Color();

  constructor(kit: Kit) {
    const Rt = this.root, M: Mats = {};
    // ---- sky + light (as the bridge short) ----
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
    Rt.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); Rt.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Rt.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); Rt.add(m);
    }

    // ---- ground: lawn disc, cobbled square, grass beyond ----
    const b = new Batch();
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    b.add(disc(0, 10.0, 4, 0.012), M.grass);
    b.add(disc(10.0, 26, 3.25, 0.008, 128), M.cobble);
    b.add(disc(26, 900, 8, 0.0, 64), M.grass);
    const curb = lam("curb", () => ({ color: "#e6dccd" }));
    b.add(new THREE.CylinderGeometry(10.12, 10.12, 0.1, 96, 1, true).translate(0, 0.05, 0), curb);
    b.build(Rt);
    buildSquare(Rt, kit, sightLines());
    buildPitch(Rt, PITCH);

    // ---- the party table + cake + gifts (hidden in the explanation shots) ----
    const T = this.table, add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; T.add(o); return o; };
    const cloth = lam("clothHD", () => ({ map: clothTex() }));
    add(new THREE.CylinderGeometry(1.18, 1.22, 0.74, 48, 1, true), cloth, 0, 0.37);
    add(new THREE.CylinderGeometry(1.18, 1.18, 0.04, 48), lam("clothTop", () => ({ color: "#fff6e0" })), 0, 0.76);
    const tiers: [number, number, string, string][] = [[0.52, 0.27, "#f7d9a8", "#f28ab2"], [0.39, 0.23, "#fbe7ef", "#7ec8f0"], [0.27, 0.2, "#f7d9a8", "#fff2c9"]];
    let y = 0.78;
    tiers.forEach(([r, h, body, ice], i) => {
      add(new THREE.CylinderGeometry(r, r, h, 40), lam(`tier${i}`, () => ({ map: tierTex(`tier${i}`, body, ice) })), 0, y + h / 2);
      add(new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.02, 40), lam(`ice${i}`, () => ({ color: ice })), 0, y + h + 0.01);
      y += h;
    });
    const candleM = lam("candle", () => ({ color: "#7ec8f0" })), candleM2 = lam("candle2", () => ({ color: "#ffd84a" }));
    const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.6), fog: false });
    const glowM = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.6, 1.0, 0.45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, r = i === 0 ? 0 : 0.15, x = r * Math.cos(a), z = r * Math.sin(a), yy = y + 0.01;
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), i % 2 ? candleM : candleM2, x, yy + 0.08, z);
      const fl = add(new THREE.SphereGeometry(0.028, 10, 8).scale(1, 1.7, 1), flameM, x, yy + 0.2, z); fl.castShadow = false; fl.layers.set(NOINK);
      const gl = new THREE.Sprite(glowM); gl.position.set(x, yy + 0.21, z); gl.scale.setScalar(0.22); gl.layers.set(NOINK); T.add(gl);
      this.flames.push({ m: fl, glow: gl, i });
    }
    const plate = lam("plate", () => ({ color: "#f8f6f0" }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 20), plate, 0.88 * Math.cos(a), 0.79, 0.88 * Math.sin(a)); }
    const cupCols = ["#e2453c", "#3f6fb5", "#2f8a4f", "#f2b53a"];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.4; add(new THREE.CylinderGeometry(0.045, 0.035, 0.11, 12), lam("cup" + i, () => ({ color: cupCols[i % 4] })), 0.66 * Math.cos(a), 0.84, 0.66 * Math.sin(a)); }
    const gifts: [number, number, number, string, string][] = [[1.55, 0.5, 0.42, "#3f6fb5", "#ffd84a"], [1.4, -0.35, 0.3, "#e2453c", "#ffffff"], [-1.5, 0.25, 0.48, "#2f8a4f", "#e2453c"], [-1.35, -0.62, 0.32, "#f2b53a", "#8c5ac9"], [0.3, -1.55, 0.38, "#8c5ac9", "#ffd84a"]];
    gifts.forEach(([x, z, s, c, r2], i) => { const o = add(new THREE.BoxGeometry(s, s * 0.85, s), lam(`gift${i}`, () => ({ map: ribbonTex(`gift${i}`, c, r2) })), x, s * 0.425, z); o.rotation.y = i * 0.7; });
    Rt.add(T);

    // ---- balloons: clusters of three tied to weights outside the ring ----
    const strM = lam("string", () => ({ color: "#f4f1ea" }));
    BALLOON_AT.forEach((a, ci) => {
      const bx = 5.35 * Math.sin(a), bz = -5.35 * Math.cos(a);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 12), lam("weight", () => ({ color: "#c9ccd2" }))); w.position.set(bx, 0.06, bz); w.castShadow = true; Rt.add(w);
      for (let j = 0; j < 3; j++) {
        const i = ci * 3 + j, col = BALLOON_COLS[(ci * 3 + j * 2) % BALLOON_COLS.length];
        const g = new THREE.Group();
        const mat = twoTone(new THREE.MeshPhongMaterial({ color: col, specular: "#ffffff", shininess: 70 }), 0.6);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18).scale(1, 1.2, 1), mat); ball.castShadow = true;
        const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 10).rotateX(Math.PI), mat); knot.position.y = -0.34;
        g.add(ball, knot);
        const h = 2.3 + 0.45 * j + 0.2 * hh(i), off: V3 = [bx + 0.32 * Math.cos(j * 2.1 + ci), h, bz + 0.32 * Math.sin(j * 2.1 + ci)];
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0), strM); str.name = "str"; str.castShadow = false;
        Rt.add(str);
        g.userData.str = str; g.userData.anchor = [bx, 0.12, bz];
        g.position.set(...off); Rt.add(g);
        this.balloons.push({ m: g, base: off, i });
      }
    });

    // ---- bunting + string lights between the lamps, birthday banner behind Dave ----
    const pennant = new THREE.BufferGeometry();
    pennant.setAttribute("position", new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.36, 0], 3)); pennant.computeVertexNormals();
    const span = (a: [number, number], c: [number, number], y0: number, sag: number, n: number) =>
      Array.from({ length: n }, (_, i) => { const u = (i + 0.5) / n; return [a[0] + (c[0] - a[0]) * u, y0 - sag * 4 * u * (1 - u), a[1] + (c[1] - a[1]) * u, Math.atan2(c[0] - a[0], c[1] - a[1])] as const; });
    const flags: (readonly [number, number, number, number])[] = [], bulbs: (readonly [number, number, number, number])[] = [];
    for (let k = 0; k < LAMPS.length; k++) {
      const a = LAMPS[k], c = LAMPS[(k + 1) % LAMPS.length];
      flags.push(...span(a, c, 3.25, 0.7, 22));
      bulbs.push(...span(a, c, 3.05, 0.95, 18));
    }
    const fl = new THREE.InstancedMesh(pennant, lam("pennant", () => ({ side: THREE.DoubleSide })), flags.length);
    const pc = ["#e2453c", "#ffd84a", "#3f6fb5", "#f7f1e1", "#2f8a4f", "#d9577a"].map((c) => new THREE.Color(c));
    flags.forEach(([x, yy, z, yaw], i) => { fl.setMatrixAt(i, this.m4.compose(V(x, yy, z), this.q.setFromAxisAngle(V(0, 1, 0), yaw + Math.PI / 2), V(1, 1, 1))); fl.setColorAt(i, pc[i % 6]); });
    fl.castShadow = true; fl.receiveShadow = true; Rt.add(fl);
    const cord = lam("cord", () => ({ color: "#3a3440" }));
    const cb = new Batch();
    for (let k = 0; k < LAMPS.length; k++) {
      const a = LAMPS[k], c = LAMPS[(k + 1) % LAMPS.length];
      for (const [y0, sag] of [[3.25, 0.7], [3.05, 0.95]]) {
        const pts = Array.from({ length: 13 }, (_, i) => { const u = i / 12; return V(a[0] + (c[0] - a[0]) * u, y0 - sag * 4 * u * (1 - u), a[1] + (c[1] - a[1]) * u); });
        for (let i = 0; i < 12; i++) {
          const p0 = pts[i], p1 = pts[i + 1], g = new THREE.CylinderGeometry(0.012, 0.012, p0.distanceTo(p1), 4);
          cb.add(g, cord, new THREE.Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize()), V(1, 1, 1)));
        }
      }
    }
    cb.build(Rt, false);
    this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), this.bulbMat, bulbs.length);
    const bc = ["#ffe6a8", "#ffb3a8", "#a8e6ff", "#c8ffa8"].map((c) => new THREE.Color(c));
    bulbs.forEach(([x, yy, z], i) => { this.bulbs.setMatrixAt(i, this.m4.compose(V(x, yy - 0.06, z), this.q.identity(), V(1, 1, 1))); this.bulbs.setColorAt(i, bc[i % 4]); });
    this.bulbs.layers.set(NOINK); Rt.add(this.bulbs);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.86), new THREE.MeshBasicMaterial({ map: ctex("banner", 1600, 300, (g) => fxBanner(new Pen(g))), color: 0xeeeeee, side: THREE.DoubleSide }));
    banner.position.set(0, 3.05, -6.7); banner.layers.set(NOINK); Rt.add(banner);
    const pole = lam("bannerPole", () => ({ color: "#8a5a3c" }));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.6, 8).translate(0, 1.8, 0), pole); p.position.set(s * 2.4, 0, -6.72); p.castShadow = true; Rt.add(p); }

    // ---- the web of pairs: thin glowing bars (additive, no ink, no fog) ----
    this.lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: true });
    this.lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5), this.lineMat, MAXL);
    this.lines.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXL * 3), 3);
    this.lines.frustumCulled = false; this.lines.layers.set(NOINK); this.lines.renderOrder = 3; this.lines.count = 0;
    Rt.add(this.lines);

    // ---- the coin ----
    const face = (t: boolean) => { const tx = ctex(t ? "coinT" : "coinH", 512, 512, (g) => coinFace(new Pen(g), t)); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#f2b53a", emissive: "#6a4300", specular: "#fff1b0", shininess: 60 }), 0.4);
    const mk = (map: THREE.Texture) => twoTone(new THREE.MeshPhongMaterial({ map, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0.35, specular: "#fff1b0", shininess: 45 }), 0.4);
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 64), [gold, mk(face(false)), mk(face(true))]);
    this.coin.castShadow = true; this.coin.visible = false; Rt.add(this.coin);

    // ---- confetti ----
    const cg = new THREE.PlaneGeometry(0.06, 0.1);
    this.confetti = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false }), 3 * 160);
    const cc = ["#e2453c", "#ffd84a", "#3f6fb5", "#2f8a4f", "#d9577a", "#ffffff", "#8c5ac9", "#2fa6a0"].map((c) => new THREE.Color(c));
    for (let i = 0; i < 480; i++) this.confetti.setColorAt(i, cc[i % 8]);
    this.confetti.layers.set(NOINK); this.confetti.frustumCulled = false; this.confetti.count = 0; Rt.add(this.confetti);
  }

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
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig: camera-relative sun frozen per shot ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 60);
    if (s.light === "golden") Rr = Math.max(Rr, 22);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- glows: lamps, string lights, candles, stadium ----
    const gold = s.light === "golden";
    LAMP_GLASS.color.setRGB(...(gold ? [3.0, 2.2, 1.1] as V3 : [1.0, 0.95, 0.8] as V3));
    this.bulbMat.color.setScalar(gold ? 2.6 : 1.05);
    STADIUM_GLOW.color.setRGB(2.2, 2.2, 2.0);
    // ---- the party set ----
    this.table.visible = s.scene === "party" && s.table;
    for (const fl of this.flames) {
      const k = 1 + 0.12 * Math.sin(t * 23 + fl.i * 2.1) + 0.08 * Math.sin(t * 37 + fl.i);
      fl.m.scale.set(1, k, 1); fl.glow.scale.setScalar((gold ? 0.32 : 0.2) * k);
    }
    for (const bl of this.balloons) {
      const bob = 0.05 * Math.sin(t * 1.4 + bl.i * 1.7), sway = 0.06 * Math.sin(t * 0.9 + bl.i);
      bl.m.position.set(bl.base[0] + sway, bl.base[1] + bob, bl.base[2] + 0.5 * sway);
      bl.m.rotation.z = sway * 0.6;
      const str = bl.m.userData.str as THREE.Mesh, an = bl.m.userData.anchor as V3;
      const top = V(bl.m.position.x, bl.m.position.y - 0.37, bl.m.position.z), a = V(...an), d = top.clone().sub(a);
      str.position.copy(a); str.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); str.scale.set(1, d.length(), 1);
    }
    // ---- web of pairs, coin, confetti ----
    this.poseLines(id, f, cam);
    this.poseCoin(id, f, cam);
    this.poseConfetti(f);

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1);
    const st = stage(id, f, { pos: cam.position, right, up });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 1.6 * sc2))) continue;
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
    return focus;
  }

  /** every glowing pair line on screen in this shot: [a, b, grow 0..1, colour, width k] */
  private poseLines(id: number, f: number, cam: THREE.PerspectiveCamera) {
    type Ln = [V3, V3, number, [number, number, number], number];
    const out: Ln[] = [], Y = 1.08;
    const P = (k: number): V3 => { const g = G(k); return [g[0], Y, g[2]]; };
    const GOLD: [number, number, number] = [1.6, 1.15, 0.35], RED: [number, number, number] = [1.9, 0.38, 0.22], WHITE: [number, number, number] = [1.5, 1.5, 1.5];
    const grow = (f0: number, n = 6) => clamp01((f - f0) / n);
    const pairs: [number, number][] = [];
    for (let i = 1; i <= N; i++) for (let j = i + 1; j <= N; j++) pairs.push([i, j]);
    // the match across the ring, lit as the wide opens
    if (id === 12) out.push([P(NINE), P(SEVENTEEN), grow(SH[12].a, 8), GOLD.map((v) => v * 1.3) as V3, 3]);
    // Gary's 22 lines: drawn one by one in shot 14, held in shot 15
    if (id === 14 || id === 15) {
      const others = Array.from({ length: N }, (_, i) => i + 1).filter((k) => k !== GARY).sort((a, b) => Math.abs(a - GARY - 0.1) - Math.abs(b - GARY - 0.1));
      others.forEach((k, i) => {
        const f0 = id === 15 ? -99 : GARY_LINES[0] + (i * (GARY_LINES[1] - GARY_LINES[0])) / 21;
        if (f >= f0) out.push([P(GARY), P(k), grow(f0, 5), RED, 1.4]);
      });
    }
    if (id === 15) {
      for (const [a, b, f0] of SAMPLE_PAIRS) if (f >= f0 && f < WEB_BUILD[0] + 4) out.push([P(a), P(b), grow(f0, 4), WHITE, 2]);
      const rest = pairs.filter(([a, b]) => a !== GARY && b !== GARY);
      rest.forEach(([a, b], i) => {
        const f0 = WEB_BUILD[0] + (i * (WEB_BUILD[1] - WEB_BUILD[0])) / rest.length;
        if (f >= f0) out.push([P(a), P(b), grow(f0, 6), GOLD, 1]);
      });
    }
    if (id === 16) {
      const pulse = (a: number, b: number) => 0.75 + 0.5 * Math.max(0, Math.sin((f - SH[16].a) * 0.16 - (a + b) * 0.28));
      for (const [a, b] of pairs) out.push([P(a), P(b), 1, GOLD.map((v) => v * pulse(a, b)) as V3, 1]);
    }
    if (id === 17 && f >= CUP_LINK[0]) { const a = SQUAD(CUP_PAIR[0]), b = SQUAD(CUP_PAIR[1]); out.push([[a[0], Y + 0.1, a[2]], [b[0], Y + 0.1, b[2]], clamp01((f - CUP_LINK[0]) / (CUP_LINK[1] - CUP_LINK[0])), GOLD.map((v) => v * 1.3) as V3, 3]); }

    const n = Math.min(MAXL, out.length), cp = cam.position, A = new THREE.Vector3(), Bv = new THREE.Vector3(), Mid = new THREE.Vector3();
    const pxm = (2 * Math.tan((cam.fov * Math.PI) / 360)) / 1920; // metres per output pixel at 1 m
    for (let i = 0; i < n; i++) {
      const [a, b, g, col, wk] = out[i];
      A.set(...a); Bv.set(...b).sub(A).multiplyScalar(Math.max(0.001, easeOut(g))).add(A);
      Mid.copy(A).add(Bv).multiplyScalar(0.5);
      const len = A.distanceTo(Bv), w = Math.max(0.006, Mid.distanceTo(cp) * pxm * 3.2 * wk);
      this.q.setFromUnitVectors(V(0, 0, 1), Bv.clone().sub(A).normalize());
      this.lines.setMatrixAt(i, this.m4.compose(A, this.q, V(w, w, len)));
      this.lines.setColorAt(i, this.col.setRGB(...col));
    }
    this.lines.count = n;
    this.lines.instanceMatrix.needsUpdate = true;
    if (this.lines.instanceColor) this.lines.instanceColor.needsUpdate = true;
  }

  private poseCoin(id: number, f: number, cam: THREE.PerspectiveCamera) {
    const c = COINS.find((x) => x.shot === id);
    this.coin.visible = false;
    if (!c || f < c.f0 - 1) return;
    const u = clamp01((f - c.f0) / (c.f1 - c.f0)), hover = Math.max(0, f - c.f1);
    const y0 = 1.2, y1 = 4.1;
    const y = y0 + (y1 - y0) * easeOut(u) + 0.9 * Math.sin(Math.PI * u) + 0.04 * Math.sin(hover * 0.2);
    this.coin.visible = true;
    this.coin.position.set(0, y, 0);
    // face the lens at rest (tails "50/50" toward the camera), flipping about the camera's horizontal axis on the way up
    const toCam = cam.position.clone().sub(this.coin.position).normalize(), right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    // explicit basis: local +y points away from the lens (bottom cap = tails toward it), local x = screen right
    // cylinder caps map texture-up to local +x (top cap) / -x (bottom cap), texture-right to local +z: so x = -screen up
    const up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1), yL = toCam.clone().negate();
    const xL = up.clone().sub(yL.clone().multiplyScalar(up.dot(yL))).normalize().negate(), zL = new THREE.Vector3().crossVectors(xL, yL);
    const base = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xL, yL, zL)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), COIN_TWIST));
    const spin = new THREE.Quaternion().setFromAxisAngle(right, -Math.PI * 2 * 3 * (1 - smooth(u)) - 0.12 * Math.sin(hover * 0.15));
    this.coin.quaternion.copy(spin.multiply(base));
    const s = Math.min(1, 0.3 + u * 3);
    this.coin.scale.setScalar(s);
  }

  private poseConfetti(f: number) {
    let n = 0;
    CONFETTI.forEach(([f0, at], bi) => {
      const tt = (f - f0) / FPS;
      if (tt < 0 || tt > 3) return;
      for (let i = 0; i < 160; i++) {
        const a = hh(i, bi) * Math.PI * 2, el = 0.5 + hh(i, bi + 7) * 1.0, sp = 3.2 + 3.5 * hh(i, bi + 3);
        const vx = Math.cos(a) * Math.cos(el) * sp, vy = Math.sin(el) * sp, vz = Math.sin(a) * Math.cos(el) * sp;
        const drag = (1 - Math.exp(-2.2 * tt)) / 2.2, fall = 0.9 * tt;
        const x = at[0] + vx * drag + 0.15 * Math.sin(tt * 6 + i), y = at[1] + vy * drag - fall * tt * 0.9 - 0.6 * tt, z = at[2] + vz * drag + 0.15 * Math.cos(tt * 5 + i);
        if (y < 0.02) continue;
        this.q.setFromEuler(new THREE.Euler(tt * (4 + 6 * hh(i, 1)), tt * (3 + 5 * hh(i, 2)), i));
        this.confetti.setMatrixAt(n++, this.m4.compose(V(x, y, z), this.q, V(1, 1, 1)));
        const ci = (i + bi) % 8; this.confetti.setColorAt(n - 1, this.col.set(["#e2453c", "#ffd84a", "#3f6fb5", "#2f8a4f", "#d9577a", "#ffffff", "#8c5ac9", "#2fa6a0"][ci]));
      }
    });
    this.confetti.count = n;
    this.confetti.instanceMatrix.needsUpdate = true;
    if (this.confetti.instanceColor) this.confetti.instanceColor.needsUpdate = true;
  }
}
