// The whole place as one three.js scene: sky, a forest clearing with Gary's patch (hole, mound, rug, brown / lush
// grass, tufts, mushrooms, sinking), a suburban lawn far away for the dog analogy, the drone, the fertilizer sack, the
// picnic blanket and the cast. update(id, f, camera) poses everything for shot `id` at frame f (pure function).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Ray, setSight, veg, blocked, house } from "./build";
import { rep, ctex, grassHD, stoneHD, cloudHD, rng } from "./paint";
import { Pen, INK } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, PW, PL, MOUND, G2, LAWN, SPOT, SACK, MUSH_N, MUSH0, CF, HIDE, PEEK, patchAt, Patch, droneAt, pop, clamp01, smooth,
} from "./story";

// ---------------- painted textures ----------------
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
/** rolled rug: deep red with cream and navy stripes and a fringe band at both ends (u around, v along) */
const rugTex = () => ctex("rug", 512, 512, (g, r) => {
  g.fillStyle = "#a8332f"; g.fillRect(0, 0, 512, 512);
  // stripes run along the roll's axis (u = around), so the roll reads when it turns
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#2f3f6e" : "#efe0bf"; g.fillRect(20 + i * 64, 0, i % 2 ? 10 : 16, 512); g.fillStyle = "#d79b3a"; g.fillRect(44 + i * 64, 0, 6, 512); }
  for (let k = 0; k < 900; k++) { g.fillStyle = r() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,240,220,0.05)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
  g.fillStyle = "#efe0bf"; g.fillRect(0, 0, 512, 14); g.fillRect(0, 498, 512, 14);
});
const rugEnd = () => ctex("rugEnd", 256, 256, (g) => {
  g.fillStyle = "#a8332f"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#7a2421"; g.lineWidth = 5;
  for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(128, 128, 16 + k * 17, 0, Math.PI * 2); g.stroke(); }
  g.strokeStyle = "#efe0bf"; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(128, 128, 30 + k * 34, 0, Math.PI * 2); g.stroke(); }
});
const soilTex = () => ctex("soilHD", 512, 512, (g, r) => {
  g.fillStyle = "#6e4a2e"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 340; k++) {
    const x = r() * 512, y = r() * 512, s = 4 + r() * 14;
    g.fillStyle = r() > 0.5 ? "rgba(140,98,62,0.55)" : "rgba(60,38,22,0.5)";
    g.beginPath(); g.ellipse(x, y, s, s * 0.7, r() * 3, 0, Math.PI * 2); g.fill();
  }
});
const checkerTex = () => ctex("blanket", 512, 512, (g) => {
  g.fillStyle = "#f6efe0"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(208,52,48,0.55)";
  for (let i = 0; i < 8; i++) { g.fillRect(i * 64, 0, 32, 512); g.fillRect(0, i * 64, 512, 32); }
  g.fillStyle = "rgba(160,30,30,0.35)";
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) g.fillRect(i * 64, j * 64, 32, 32);
});
const sackTex = () => ctex("sack", 512, 512, (g, r) => {
  g.fillStyle = "#dcc08e"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 500; k++) { g.fillStyle = r() > 0.5 ? "rgba(120,90,50,0.08)" : "rgba(255,250,235,0.1)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 1 + r() * 2); }
  g.fillStyle = "#3e8f3a"; g.fillRect(0, 380, 512, 70);
  // sprout pictogram (no text): a stem and two leaves inside a light disc
  g.fillStyle = "#f4ead2"; g.beginPath(); g.arc(256, 210, 120, 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  const p = new Pen(g);
  p.stroke([[256, 300], [256, 190]], 14, "#2f7a2e");
  p.poly([[256, 205], [190, 150], [160, 175], [200, 215]], "#4caf3e", 7);
  p.poly([[256, 185], [320, 120], [352, 150], [306, 195]], "#4caf3e", 7);
  p.poly([[206, 300], [306, 300], [290, 330], [222, 330]], "#8a5a34", 7);
});

// ---------------- geometry helpers ----------------
/** ground quad with world-aligned uv (4 m tiles), facing up */
const groundQuad = (x0: number, x1: number, z0: number, z1: number, y = 0, tile = 4) => {
  const g = new THREE.BufferGeometry();
  const P = [[x0, z1], [x1, z1], [x1, z0], [x0, z1], [x1, z0], [x0, z0]];
  g.setAttribute("position", new THREE.Float32BufferAttribute(P.flatMap(([x, z]) => [x, y, z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(P.flatMap(() => [0, 1, 0]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(P.flatMap(([x, z]) => [x / tile, -z / tile]), 2));
  return g;
};
/** grass tuft: five thin tapered blades, unit height, normals straight up (they shade like the lawn they stand in) */
const tuftGeo = () => {
  const pos: number[] = [], nor: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4, lean = 0.25 + 0.15 * (i % 2), w = 0.022;
    const bx = Math.cos(a) * 0.02, bz = Math.sin(a) * 0.02, tx = Math.cos(a) * lean * 0.35, tz = Math.sin(a) * lean * 0.35;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, 1, tz);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  return g;
};

// ---------------- the patch material: grass texture mixed toward dead / lush / soil by uniforms ----------------
const PATCH_DECL = `#include <common>
varying vec3 vWP; varying vec2 vPU;
uniform float uDead, uLush, uSoil, uSeam, uShape, uR0, uR1, uW, uL;
uniform vec3 uDeadCol, uLushCol, uLush2Col, uSoilCol, uSeamCol;
uniform sampler2D uSoilTex;`;
const PATCH_COL = `
  vec4 gt = texture2D( map, vec2( vWP.x, -vWP.z ) / 4.0 );
  vec3 c = gt.rgb;
  float lum = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  float dead = uDead, lush = uLush, ringK = 1.0;
  if ( uShape > 0.5 ) {
    float r = length( vPU - 0.5 ) * 2.0;
    if ( r > 1.0 ) discard;
    dead *= 1.0 - smoothstep( uR0 - 0.12, uR0, r );
    lush *= 1.0 - smoothstep( uR1 - 0.18, uR1, r );
    ringK = 1.0 - smoothstep( 0.8, 1.0, r );
  }
  vec3 dc = uDeadCol * ( 0.6 + 1.0 * lum );
  c = mix( c, dc, clamp( dead, 0.0, 1.0 ) );
  vec3 lc = mix( uLushCol, uLush2Col, clamp( lush - 1.0, 0.0, 1.0 ) ) * ( 0.7 + 1.1 * lum );
  c = mix( c, lc, clamp( lush, 0.0, 1.0 ) );
  vec3 st = texture2D( uSoilTex, vec2( vWP.x, -vWP.z ) / 1.2 ).rgb;
  c = mix( c, st, uSoil );
  if ( uShape < 0.5 ) {
    float e = min( 0.5 * uW - abs( vWP.x ), 0.5 * uL - abs( vWP.z ) );
    c = mix( c, uSeamCol, uSeam * ( 1.0 - smoothstep( 0.012, 0.03, e ) ) );
  }
  diffuseColor.rgb *= c;`;
type PatchU = Record<string, THREE.IUniform>;
const patchMaterial = (key: string, shape: number, w: number, l: number): { m: THREE.MeshLambertMaterial; u: PatchU } => {
  const u: PatchU = {
    uDead: { value: 0 }, uLush: { value: 0 }, uSoil: { value: 0 }, uSeam: { value: 0 }, uShape: { value: shape }, uR0: { value: 0.5 }, uR1: { value: 0.8 },
    uW: { value: w }, uL: { value: l }, uDeadCol: { value: new THREE.Color("#7a5530") }, uLushCol: { value: new THREE.Color("#3fae2c") },
    uLush2Col: { value: new THREE.Color("#33c63c") }, uSoilCol: { value: new THREE.Color("#6e4a2e") }, uSeamCol: { value: new THREE.Color("#4a3a22") },
    uSoilTex: { value: soilTex() },
  };
  const m = twoTone(new THREE.MeshLambertMaterial({ map: grassHD(), side: THREE.DoubleSide }));
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec2 vPU;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vPU = uv;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", PATCH_DECL).replace("#include <map_fragment>", PATCH_COL);
  };
  m.customProgramCacheKey = () => "patch3_" + key;
  return { m, u };
};

// ---------------- the mushrooms ----------------
type Shroom = { g: THREE.Group; x: number; z: number; s: number; i: number; inner: boolean };
const SHROOM_POS: [number, number, number][] = (() => {
  const r = rng(77), out: [number, number, number][] = [];
  const edge: [number, number][] = [[-0.66, -1.0], [-0.7, -0.35], [-0.64, 0.3], [-0.72, 0.95], [-0.3, 1.3], [0.25, 1.28], [0.68, 0.9], [0.7, -0.3],
    [0.66, -0.95], [0.2, -1.3], [-0.35, -1.26], [-0.2, 0.0], [0.15, 0.55], [0.1, -0.6], [-0.25, 0.75], [0.3, -0.05], [-0.62, -0.68]];
  edge.forEach(([x, z]) => out.push([x + (r() - 0.5) * 0.06, z + (r() - 0.5) * 0.06, 1.25 + r() * 0.6]));
  // pop order: nearest to the mushroom shot's lens first (so the first pops are on screen)
  return out.sort((a, b) => Math.hypot(a[0] - 1.0, a[1] + 1.5) - Math.hypot(b[0] - 1.0, b[1] + 1.5));
})();

/** every lens position of the film looking at its subject (centre, sides and top of frame) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 5: { az: 60, el: 52 }, 7: { az: 100, el: 52 }, 8: { az: 70 } };

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
  private patchGeo: THREE.PlaneGeometry; private patchU: PatchU; private patchKey = "";
  private spotU: PatchU;
  private mound: THREE.Mesh; private rug: THREE.Group;
  private shrooms: Shroom[] = [];
  private lushTufts: THREE.InstancedMesh; private lushMat: THREE.MeshLambertMaterial; private tuftXZ: [number, number, number][] = [];
  private spotTufts: THREE.InstancedMesh;
  private drone: THREE.Group; private rotors: THREE.Mesh[] = [];
  private sack: THREE.Group; private blanket: THREE.Group;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    setSight(sightLines());
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
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- ground with a rectangular opening for the patch ----
    const b = new Batch();
    const grassM = lam("grassHD", () => ({ map: grassHD() }));
    const hx = PW / 2, hz = PL / 2, BIG = 1200;
    // one full grid of cells (every cell shares whole edges with its neighbours: no T-junction cracks for the ink pass
    // to draw as dotted lines), the patch cell left open; finer near the clearing and around the lawn
    const xs = [-BIG, -300, -100, -40, -15, -5, -2, -hx, hx, 2, 5, 15, 40, 100, 300, BIG];
    const zs = [-BIG, -460, -430, -410, -380, -300, -100, -40, -15, -5, -2, -hz, hz, 2, 5, 15, 40, 100, 300, BIG];
    for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
      if (xs[i] === -hx && zs[j] === -hz) continue; // the patch opening
      b.add(groundQuad(xs[i], xs[i + 1], zs[j], zs[j + 1]), grassM);
    }

    // ---- the forest around the clearing ----
    const r = rng(4242), U = (a: number, c: number) => a + (c - a) * r();
    const kinds = ["round", "round", "fat", "tall", "cone", "round", "tall"] as const;
    // trees go into 16 sector batches (angle x near/far ring) so frustum culling skips the ones behind the lens
    const sectors = Array.from({ length: 16 }, () => new Batch());
    const sectorOf = (x: number, z: number) => (Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 8) % 8) + (Math.hypot(x, z) > 30 ? 8 : 0);
    const tree = (x: number, z: number, h: number, q: number, k: (typeof kinds)[number]) => {
      const rad = k === "tall" ? 0.2 * h : k === "cone" ? 0.27 * h : k === "fat" ? 0.44 * h : 0.39 * h;
      if (blocked(x - rad, x + rad, 0, h, z - rad, z + rad, true)) return;
      veg(sectors[sectorOf(x, z)], k, x, 0, z, h, x * 92.7 + z * 31.3, q);
    };
    for (let i = 0; i < 330; i++) {
      const ring = i < 90 ? 0 : i < 210 ? 1 : 2;
      const rr = ring === 0 ? U(11, 24) : ring === 1 ? U(24, 55) : U(55, 120), a = U(0, Math.PI * 2);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (Math.abs(z - LAWN[2]) < 200) { /* forest only near the clearing */ }
      tree(x, z, U(6.5, 11.5), ring, kinds[i % kinds.length]);
    }
    for (let i = 0; i < 46; i++) { // bushes at the clearing edge
      const rr = U(8.5, 12), a = U(0, Math.PI * 2), x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = U(0.9, 1.6);
      if (!blocked(x - h, x + h, 0, h, z - h, z + h, true)) veg(sectors[sectorOf(x, z)], "bush", x, 0, z, h, i * 13.1 + 7, 1);
    }
    for (const sb of sectors) sb.build(R);
    // story bushes (in front of the lens on purpose: no sight-line test)
    veg(b, "bush", HIDE[0] + 0.35, 0, HIDE[2] + 0.95, 1.05, 31, 0);
    veg(b, "bush", PEEK[0] + 0.4, 0, PEEK[2] - 0.55, 1.0, 37, 0);
    veg(b, "bush", G2[0] - 1.6, 0, G2[2] + 1.2, 1.2, 41, 0);

    // ---- the lawn (dog analogy), 420 m away ----
    const L = LAWN, lb = new Batch();
    const lawnM = lam("lawnHD", () => ({ map: rep(grassHD(), 1, 1), color: "#d8f0c0" }));
    lb.add(groundQuad(L[0] - 11, L[0] + 11, L[2] - 5, L[2] + 9, 0.004), lawnM);
    house(lb, L[0] - 0.5, L[2] - 9.0, 0, 10, 8, 6.2, 0);
    house(lb, L[0] - 15, L[2] - 10.5, 0.15, 9, 8, 7.0, 1);
    house(lb, L[0] + 14, L[2] - 10.0, -0.12, 9, 8, 5.8, 3);
    house(lb, L[0] - 30, L[2] - 14.0, 0.2, 9, 8, 8.4, 6);
    house(lb, L[0] + 29, L[2] - 13.0, -0.2, 9, 8, 6.6, 4);
    const pathM = lam("pathStone", () => ({ map: stoneHD("pathHD", ["#d8cdbb", "#cfc3b0", "#e2d8c8", "#c6b9a5"], "#9d907e") }));
    lb.add(groundQuad(L[0] - 1.4, L[0] - 0.3, L[2] - 5, L[2] + 9, 0.008, 1.1), pathM);
    const fenceM = lam("fenceWhite", () => ({ color: "#f3efe6" }));
    for (const side of [-1, 1]) {
      const fx = L[0] + side * 10.5;
      for (let z = L[2] - 4.5; z < L[2] + 8.6; z += 0.32) lb.add(boxGeo(V(fx - 0.04, 0, z - 0.04), V(fx + 0.04, 0.95, z + 0.04)), fenceM);
      for (const y of [0.35, 0.75]) lb.add(boxGeo(V(fx - 0.03, y, L[2] - 4.6), V(fx + 0.03, y + 0.07, L[2] + 8.7)), fenceM);
    }
    for (const [x, z, h, k] of [[-8.5, -2.5, 7.5, "round"], [8.2, -1.5, 6.5, "fat"], [-7.5, 6.5, 1.3, "bush"], [7.8, 5.2, 1.2, "bush"], [-20, -3, 8, "round"],
      [21, -4, 7, "tall"], [-4.8, -4.2, 1.0, "bush"], [3.8, -4.4, 1.1, "bush"]] as const) {
      const rad = k === "bush" ? 0.85 * h : 0.4 * h;
      if (!blocked(L[0] + x - rad, L[0] + x + rad, 0, h, L[2] + z - rad, L[2] + z + rad, true)) veg(lb, k, L[0] + x, 0, L[2] + z, h, x * 17 + z, 0);
    }
    b.build(R);
    // the lawn's houses / trees in their own batch (far from the forest: culled in every forest shot)
    lb.build(R);

    // ---- the patch (dynamic) ----
    this.patchGeo = new THREE.PlaneGeometry(PW + 0.1, PL + 0.1, 26, 50);
    this.patchGeo.rotateX(-Math.PI / 2);
    const pm = patchMaterial("rect", 0, PW, PL);
    this.patchU = pm.u;
    const patch = new THREE.Mesh(this.patchGeo, pm.m);
    patch.receiveShadow = true; patch.castShadow = false; patch.frustumCulled = false;
    R.add(patch);
    // the lawn spot (circle) for the dog analogy
    const sm = patchMaterial("ring", 1, 1.6, 1.6);
    sm.m.color.set("#d8f0c0");
    this.spotU = sm.u;
    const spotG = new THREE.PlaneGeometry(1.6, 1.6, 1, 1); spotG.rotateX(-Math.PI / 2);
    const spot = new THREE.Mesh(spotG, sm.m); spot.position.set(SPOT[0], 0.009, SPOT[2]); spot.receiveShadow = true;
    spot.layers.set(NOINK);
    R.add(spot);
    // mound of dug soil
    const soilM = lam("soilM", () => ({ map: rep(soilTex(), 2, 2) }));
    this.mound = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), soilM);
    this.mound.position.set(...MOUND); this.mound.castShadow = true; this.mound.receiveShadow = true;
    R.add(this.mound);
    // rug: cylinder along local z with a spiral end cap
    this.rug = new THREE.Group();
    const rugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.9, 24, 1, true).rotateX(Math.PI / 2), lam("rugM", () => ({ map: rugTex() })));
    const capM = lam("rugEndM", () => ({ map: rugEnd() }));
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), capM); c.position.z = s * 0.95; c.rotation.y = s > 0 ? 0 : Math.PI; this.rug.add(c); }
    this.rug.add(rugBody);
    // a pair of shoes poking out of the -z end: the cartoon way to say what is rolled up in there
    const shoeM = lam("shoe", () => ({ color: "#3a2a20" })), sockM = lam("sock", () => ({ color: "#e9e1d2" }));
    for (const sx of [-0.075, 0.075]) {
      const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.1, 12).rotateX(Math.PI / 2), sockM);
      ankle.position.set(sx, 0.0, -0.99);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shoeM);
      shoe.scale.set(0.05, 0.1, 0.055); shoe.position.set(sx, 0.05, -1.07); shoe.rotation.x = -0.25;
      this.rug.add(ankle, shoe);
    }
    this.rug.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    R.add(this.rug);
    // mushrooms
    const stemM = lam("stem", () => ({ color: "#f1e6cf" })), capMat = lam("cap", () => ({ color: "#c98f4e" })), gillM = lam("gill", () => ({ color: "#e6d2ad" }));
    const capG = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), gillG = new THREE.CircleGeometry(1, 22).rotateX(Math.PI / 2);
    const make = (x: number, z: number, s: number, i: number, inner: boolean) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.09, 12).translate(0, 0.045, 0), stemM);
      const cap = new THREE.Mesh(capG, capMat); cap.scale.set(0.055, 0.04, 0.055); cap.position.y = 0.085;
      const gill = new THREE.Mesh(gillG, gillM); gill.scale.setScalar(0.054); gill.position.y = 0.086;
      g.add(stem, cap, gill);
      g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      g.position.set(x, 0, z); g.rotation.set((i % 3 - 1) * 0.08, i * 1.7, (i % 2 ? 1 : -1) * 0.07);
      this.shrooms.push({ g, x, z, s, i, inner }); R.add(g);
    };
    SHROOM_POS.forEach(([x, z, s], i) => make(x, z, s, i, Math.abs(x) < 0.55 && Math.abs(z) < 1.15));
    make(CF[0], CF[2], 2.2, 100, false); // the corpse finder (big, eyes in cast.ts)
    make(0.08, -0.45, 2.6, 200, true);   // the picnic pop (big, in the gap between Mom and Dad)
    // grass tufts: a static field across the clearing + the lush tufts in the patch (instanced, no ink)
    const tg = tuftGeo();
    const fieldM = lam("tuftField", () => ({ color: "#6fb043" }));
    const N = 2600, field = new THREE.InstancedMesh(tg, fieldM, N);
    const q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < N * 3 && n < N; i++) {
      const a = U(0, Math.PI * 2), rr = Math.sqrt(r()) * 12.5, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (Math.abs(x) < hx + 0.12 && Math.abs(z) < hz + 0.12) continue;
      if (Math.hypot(x - MOUND[0], z - MOUND[2]) < 1.2) continue;
      const h = U(0.07, 0.16);
      field.setMatrixAt(n++, this.m4.compose(pos.set(x, 0, z), q.setFromAxisAngle(V(0, 1, 0), U(0, 6.28)), sc.set(h * 1.4, h, h * 1.4)));
    }
    field.count = n; field.layers.set(NOINK); field.receiveShadow = true;
    R.add(field);
    this.lushMat = lam("tuftLush", () => ({ color: "#46b934" })) as THREE.MeshLambertMaterial;
    this.lushTufts = new THREE.InstancedMesh(tg, this.lushMat, 520);
    for (let i = 0; i < 520; i++) this.tuftXZ.push([U(-hx + 0.04, hx - 0.04), U(-hz + 0.04, hz - 0.04), U(0.55, 1.0)]);
    this.lushTufts.layers.set(NOINK); this.lushTufts.receiveShadow = true; this.lushTufts.frustumCulled = false;
    R.add(this.lushTufts);
    this.spotTufts = new THREE.InstancedMesh(tg, lam("tuftSpot", () => ({ color: "#2fae2a" })), 160);
    for (let i = 0; i < 160; i++) {
      const a = U(0, Math.PI * 2), rr = U(0.25, 0.72);
      this.spotTufts.setMatrixAt(i, this.m4.compose(pos.set(SPOT[0] + Math.cos(a) * rr, 0, SPOT[2] + Math.sin(a) * rr), q.setFromAxisAngle(V(0, 1, 0), U(0, 6.28)), sc.set(0.2, 0.14, 0.2)));
    }
    this.spotTufts.layers.set(NOINK);
    R.add(this.spotTufts);
    // drone
    this.drone = new THREE.Group();
    const dBody = lam("droneBody", () => ({ color: "#3a3f4a" })), dArm = lam("droneArm", () => ({ color: "#2a2e36" }));
    this.drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.34), dBody));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam("droneTop", () => ({ color: "#e8eaee" }))); dome.position.y = 0.055; this.drone.add(dome);
    const camBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), lam("droneCam", () => ({ color: "#15171c" }))); camBall.position.set(0, -0.08, 0.12); this.drone.add(camBall);
    const rotorM = new THREE.MeshBasicMaterial({ color: "#cfd6e0", transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.42), dArm);
      arm.position.set(sx * 0.17, 0.02, sz * 0.17); arm.rotation.y = Math.atan2(sx, sz); this.drone.add(arm);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 10), dArm); hub.position.set(sx * 0.3, 0.05, sz * 0.3); this.drone.add(hub);
      const rot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24).rotateX(-Math.PI / 2), rotorM); rot.position.set(sx * 0.3, 0.09, sz * 0.3);
      rot.layers.set(NOINK); this.rotors.push(rot); this.drone.add(rot);
    }
    const led = (c: THREE.Color, x: number, z: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, 0.0, z); m.layers.set(NOINK); this.drone.add(m); };
    led(new THREE.Color(4, 0.4, 0.3), -0.17, 0.17); led(new THREE.Color(0.4, 4, 0.6), 0.17, 0.17);
    this.drone.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    this.drone.visible = false;
    R.add(this.drone);
    // fertilizer sack (pops in on "fertilizer")
    this.sack = new THREE.Group();
    const sackM = lam("sackM", () => ({ map: sackTex() })), sackPlain = lam("sackPlain", () => ({ color: "#d4b684" }));
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.66, 0.26), [sackPlain, sackPlain, sackPlain, sackPlain, sackM, sackPlain]);
    body.position.y = 0.33; this.sack.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.1), sackPlain); top.position.y = 0.69; this.sack.add(top);
    this.sack.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.sack.position.set(...SACK); this.sack.rotation.y = Math.atan2(2.35 - SACK[0], -3.75 - SACK[2]) - 0.25; this.sack.visible = false; // label to the lens
    R.add(this.sack);
    // picnic blanket + basket
    this.blanket = new THREE.Group();
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5).rotateX(-Math.PI / 2), lam("blanketM", () => ({ map: checkerTex(), side: THREE.DoubleSide })));
    bl.position.y = 0.025; bl.receiveShadow = true; this.blanket.add(bl);
    const wick = lam("wicker", () => ({ color: "#b98544" }));
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.3), wick); basket.position.set(0.5, 0.15, 0.55); this.blanket.add(basket);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.32), lam("wickerLid", () => ({ color: "#a5743a" }))); lid.position.set(0.5, 0.29, 0.55); this.blanket.add(lid);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 20, Math.PI), wick); handle.position.set(0.5, 0.31, 0.55); this.blanket.add(handle);
    for (const [x, z, c] of [[-0.1, -0.15, "#f5e6b8"], [0.12, 0.25, "#f5e6b8"]] as const) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 20), lam("plate", () => ({ color: "#f8f8f4" }))); plate.position.set(x, 0.035, z); this.blanket.add(plate);
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.13), lam("sandwich" + c, () => ({ color: c }))); sw.position.set(x, 0.07, z); sw.rotation.y = 0.6; this.blanket.add(sw);
    }
    this.blanket.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.blanket.visible = false;
    R.add(this.blanket);
  }

  /** camera-relative sun, frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** displacement of the patch surface at (x, z): the open hole and the slow grave-shaped sink */
  private patchY(P: Patch, x: number, z: number) {
    const ex = PW / 2 - Math.abs(x), ez = PL / 2 - Math.abs(z);
    if (ex < -0.001 || ez < -0.001) return -0.004;
    const box = clamp01(Math.min(ex, ez) / 0.05);
    const dip = smooth(ex / 0.16) * smooth(ez / 0.26);
    return -P.hole * 0.8 * box - P.sink * 0.28 * dip; // edges at 0 = flush with the ground opening (no ink step)
  }

  private posePatch(P: Patch, id: number, f: number) {
    const key = `${P.hole.toFixed(3)}|${P.sink.toFixed(3)}`;
    if (key !== this.patchKey) {
      const p = this.patchGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setY(i, this.patchY(P, p.getX(i), p.getZ(i)));
      p.needsUpdate = true; this.patchGeo.computeVertexNormals(); this.patchKey = key;
    }
    const U = this.patchU;
    U.uDead.value = P.dead; U.uLush.value = P.lush; U.uSoil.value = P.soil; U.uSeam.value = P.seam;
    this.mound.visible = P.mound > 0.01;
    this.mound.scale.set(0.95 * P.mound + 0.01, 0.42 * P.mound + 0.01, 1.35 * P.mound + 0.01);
    // rug
    const rg = P.rug;
    this.rug.visible = rg.vis;
    if (rg.vis) {
      if (rg.up) { this.rug.position.set(rg.x, 0.2, G2[2] - 0.25); this.rug.rotation.set(0, 0.12, 0); } // lying beside Gary, spiral end to the lens
      else if (rg.drag) { this.rug.position.set(...rg.drag); this.rug.rotation.set(0, Math.atan2(7.1, -5.2), 0); }
      else { this.rug.position.set(rg.x, rg.y, 0); this.rug.rotation.set(0, 0, rg.rot); }
    }
    // lush tufts: grow with P.tufts, follow the sink
    const n = this.tuftXZ.length, grow = P.tufts, q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    this.lushTufts.visible = grow > 0.01 && !P.blanket;
    if (this.lushTufts.visible) {
      for (let i = 0; i < n; i++) {
        const [x, z, k] = this.tuftXZ[i], h = (0.05 + 0.15 * k) * grow;
        this.lushTufts.setMatrixAt(i, this.m4.compose(pos.set(x, this.patchY(P, x, z) - 0.004, z), q.setFromAxisAngle(V(0, 1, 0), i * 2.39), sc.set(h * 0.9 + 0.02, h, h * 0.9 + 0.02)));
      }
      this.lushTufts.instanceMatrix.needsUpdate = true;
      this.lushMat.color.set("#4cb336").lerp(new THREE.Color("#2fd23a"), clamp01(P.lush - 1));
    }
    // mushrooms: pop in story order; the big one with the eyes pops last; inner ones hidden under the blanket
    for (const m of this.shrooms) {
      let k: number;
      if (m.i === 200) k = id === 13 ? pop((f - 2036) / 6) : 0;
      else if (m.i === 100) k = pop((P.mush - (MUSH0 + 26)) / 5);
      else k = pop((P.mush - (MUSH0 + 2.6 * m.i)) / 5);
      if (P.blanket && m.inner && m.i !== 200) k = 0;
      m.g.visible = k > 0.01;
      if (m.g.visible) { m.g.scale.setScalar(m.s * k); m.g.position.y = m.inner || m.i === 200 ? (m.i === 200 ? 0.03 : this.patchY(P, m.x, m.z)) : 0; }
    }
    this.sack.visible = P.sack > 0.01; this.sack.scale.setScalar(Math.max(0.01, P.sack));
    this.blanket.visible = P.blanket;
  }

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
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 5, 7, 70);
    if (s.light === "golden") Rr = Math.max(Rr, 14);
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
    untone(L.fog, this.fog.color); this.fog.near = s.place === "forest" ? Math.max(L.fogNear, 30) : L.fogNear; this.fog.far = s.place === "forest" ? 190 : L.fogFar;
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
      m.position.x = Math.cos((i / 9) * Math.PI * 2 + 0.3) * (620 + (i % 3) * 60) + cam.position.x;
      m.position.z = Math.sin((i / 9) * Math.PI * 2 + 0.3) * (620 + (i % 3) * 60) + cam.position.z;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- story props ----
    const P = patchAt(id, f);
    this.posePatch(P, id, f);
    // lawn spot: burns brown on "burns the grass brown", greener ring on "grows back greener"
    const SU = this.spotU;
    SU.uDead.value = id === 10 ? smooth((f - 1366) / 30) * (1 - smooth((f - 1430) / 20)) : 0;
    SU.uLush.value = id === 10 ? smooth((f - 1430) / 22) * 1.6 : 0;
    SU.uR0.value = 0.55 + 0.25 * smooth((f - 1366) / 30); SU.uR1.value = 0.95;
    this.spotTufts.visible = id === 10 && f >= 1436;
    if (this.spotTufts.visible) this.spotTufts.scale.set(1, smooth((f - 1436) / 18) + 0.01, 1);
    this.drone.visible = id === 12 && f >= 1790;
    if (this.drone.visible) {
      const d = droneAt(f);
      this.drone.position.set(...d); this.drone.rotation.set(0.12, Math.atan2(-(d[0] - 1.5), -(d[2] + 3.2)) + Math.PI, 0.04 * Math.sin(f * 0.13));
      this.rotors.forEach((r, i) => { r.rotation.y = f * 1.7 + i; });
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
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
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
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
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    void t;
    return focus;
  }
}
