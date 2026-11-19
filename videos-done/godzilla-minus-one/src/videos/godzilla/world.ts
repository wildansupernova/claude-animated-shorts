// One three.js world for the whole recap: the places (sets.ts), a camera-centred sky dome, fog, a single sun for
// the two-tone shading, character + effect cards (cards.ts) and particles. update() poses everything for frame f
// from the shot table in story.ts.
import * as THREE from "three";
import { buildPlaces, PLACES, PlaceId, Handles } from "./sets";
import { LOOKS, Look, LookId } from "./looks";
import { TONE, untone } from "./shade";
import { NOINK } from "./ink";
import { CardPool, drawTex, camQuat, SU } from "./cards";
import { CAST, drawHero, HeroOpts } from "./heroes";
import { Pen } from "./toon";
import * as F2 from "./fx2d";
import * as K from "./kaiju";
import { shotAt, camAt, ActorSpec, FxSpec, ZSpec, Shot, FPS } from "./story";

const C = (h: string) => new THREE.Color(h);
const lin = (h: string) => untone(h);
const q = (v: number | undefined, n = 20) => (v === undefined ? 0 : Math.round(v * n) / n);

export class World {
  root = new THREE.Group();
  private groups: Record<PlaceId, THREE.Group>;
  H: Handles;
  private sky: THREE.Mesh; private skyU: Record<string, THREE.IUniform>;
  private sun = new THREE.DirectionalLight("#ffffff", 2.5);
  private fog = new THREE.Fog("#ffffff", 50, 500);
  private cards: CardPool;
  private pts: THREE.Points; private ptsPos: Float32Array; private ptsCol: Float32Array;
  private lastLook = "";
  private v = new THREE.Vector3(); private w = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.fog = this.fog;
    const { groups, H } = buildPlaces(this.root);
    this.groups = groups; this.H = H;
    this.skyU = { c0: { value: C("#fff") }, c1: { value: C("#fff") }, c2: { value: C("#fff") }, cg: { value: C("#fff") }, stars: { value: 0 }, neb: { value: C("#000") }, nebK: { value: 0 },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C("#000") }, t: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, cg, neb, sunDir, sunCol; uniform float stars, nebK, t; varying vec3 vP;
        float h(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){ vec3 d = normalize(vP); float e = d.y;
          vec3 c = e < 0.0 ? mix(c0, cg, smoothstep(0.0, -0.25, e)) : mix(mix(c0, c1, smoothstep(0.0, 0.26, e)), c2, smoothstep(0.26, 0.95, e));
          if (nebK > 0.0) { float n = n3(d * 3.0) * 0.6 + n3(d * 7.0) * 0.4; float band = exp(-pow((d.y - 0.15 + 0.3 * d.x) * 2.2, 2.0)); c = mix(c, neb, nebK * band * smoothstep(0.35, 0.8, n)); }
          if (stars > 0.0) { vec3 g = floor(d * 260.0); float s = h(g); float tw = step(1.0 - 0.012 * stars, s); c += vec3(tw) * (0.6 + 0.6 * h(g + 3.0)) * smoothstep(-0.1, 0.2, e + 0.3); }
          float sd = max(dot(d, sunDir), 0.0); c += sunCol * (smoothstep(0.9993, 0.9996, sd) * 3.0 + pow(sd, 60.0) * 0.5);
          gl_FragColor = vec4(c, 1.0); }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), mat);
    this.sky.layers.set(NOINK); this.sky.renderOrder = 1000; this.sky.frustumCulled = false; // drawn after the opaque world: shades only the visible sky
    this.root.add(this.sky, this.sun, this.sun.target);
    this.cards = new CardPool(this.root);
    // particles (dust, snow, sparks, debris): up to 1500 points, positions written per frame
    const N = 1500;
    this.ptsPos = new Float32Array(N * 3); this.ptsCol = new Float32Array(N * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.ptsPos, 3)); pg.setAttribute("color", new THREE.BufferAttribute(this.ptsCol, 3));
    const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = "#222"; g.stroke(); return new THREE.CanvasTexture(c); })();
    this.pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.25, map: dot, alphaTest: 0.5, vertexColors: true, sizeAttenuation: true, fog: false }));
    this.pts.layers.set(NOINK); this.pts.frustumCulled = false; this.root.add(this.pts);
  }

  private applyLook(L: Look, cam: THREE.PerspectiveCamera, key: string) {
    const u = this.skyU;
    u.c0.value.copy(lin(L.sky[0])); u.c1.value.copy(lin(L.sky[1])); u.c2.value.copy(lin(L.sky[2])); u.cg.value.copy(lin(L.ground ?? L.sky[0]).multiplyScalar(L.ground ? 1 : 0.8));
    u.stars.value = L.stars ?? 0; u.nebK.value = L.nebula ? 0.75 : 0; if (L.nebula) u.neb.value.copy(lin(L.nebula));
    this.fog.color.copy(lin(L.fog)); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift); TONE.uSat.value = L.sat ?? 1.05;
    this.cards.tint.set(L.tint);
    // sun: camera-relative azimuth / elevation, frozen per shot (computed from the shot's first camera)
    const fwd = cam.getWorldDirection(this.v); fwd.y = 0; fwd.normalize();
    const right = this.w.set(-fwd.z, 0, fwd.x);
    const az = (L.az * Math.PI) / 180, el = (L.el * Math.PI) / 180;
    const dir = new THREE.Vector3().addScaledVector(fwd, Math.cos(az) * Math.cos(el)).addScaledVector(right, Math.sin(az) * Math.cos(el)).add(new THREE.Vector3(0, Math.sin(el), 0)).normalize();
    this.sun.position.copy(dir).multiplyScalar(100); this.sun.target.position.set(0, 0, 0);
    u.sunDir.value.copy(dir); u.sunCol.value.copy(L.sun ? lin(L.sun) : C("#000000"));
    this.lastLook = key;
  }

  /** pose the world for frame f; returns the shot (for post settings) */
  update(f: number, cam: THREE.PerspectiveCamera): Shot {
    const s = shotAt(f), o = PLACES[s.place];
    for (const id of Object.keys(this.groups) as PlaceId[]) this.groups[id].visible = id === s.place;
    // camera
    const c = camAt(s, f);
    cam.position.set(c.pos[0] + o[0], c.pos[1] + o[1], c.pos[2] + o[2]);
    cam.up.set(0, 1, 0); cam.lookAt(c.look[0] + o[0], c.look[1] + o[1], c.look[2] + o[2]); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    camQuat.copy(cam.quaternion);
    this.sky.position.copy(cam.position);
    // look (sun frozen per shot: evaluate at the shot's first frame camera)
    const lkey = `${s.a}`;
    if (this.lastLook !== lkey) {
      const c0 = camAt(s, s.a), tmp = new THREE.PerspectiveCamera();
      tmp.position.set(...c0.pos); tmp.lookAt(...c0.look); tmp.updateMatrixWorld();
      this.applyLook(LOOKS[s.look as LookId] as Look, tmp, lkey);
    }
    this.skyU.t.value = f / FPS;
    if ((globalThis as unknown as { __nosky?: boolean }).__nosky) this.sky.visible = false;
    // shot content
    const H = this.H;
    H.boat.visible = false; H.ships.forEach((m) => (m.visible = false)); H.tug.visible = false; H.shinden.visible = false; H.tram.visible = false;
    H.zero.visible = true; H.zero.position.set(0, 0, 0); H.zero.rotation.set(0, 0, 0);
    const sc = s.scene(f, this.H);
    const camLocal = new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]);
    const G = this.groups[s.place];
    // cards are children of the root: convert local -> world
    this.cards.begin();
    const camW = cam.position;
    const tanH = Math.tan((c.fov * Math.PI) / 360);
    for (const a of sc.actors) this.actor(a, f, o, camW, camLocal, tanH);
    for (const z of sc.zillas ?? []) this.zilla(z, o, camW, camLocal, tanH);
    for (const x of sc.fx ?? []) this.effect(x, o, camW);
    this.cards.end();
    // particles
    const P = sc.particles ?? [];
    const n = Math.min(P.length, 1500);
    for (let i = 0; i < 1500; i++) {
      if (i < n) { const p = P[i]; this.ptsPos.set([p[0] + o[0], p[1] + o[1], p[2] + o[2]], i * 3); const cc = C(p[3]); this.ptsCol.set([cc.r, cc.g, cc.b], i * 3); }
      else this.ptsPos.set([0, -9999, 0], i * 3);
    }
    (this.pts.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.pts.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    (this.pts.material as THREE.PointsMaterial).size = sc.particleSize ?? 0.25;
    void G;
    return s;
  }

  /** a kaiju card: h = standing height in metres, base at (x, y, z); drawn facing screen-right, mirror flips it */
  private zilla(z: ZSpec, o: readonly number[], camW: THREE.Vector3, camL: THREE.Vector3, tanH: number) {
    if ((z.alpha ?? 1) <= 0.01) return;
    const S = z.h * 1.08, y = z.y ?? 0;
    const dist = Math.max(1, Math.hypot(camL.x - z.x, camL.y - (y + S * 0.5), camL.z - z.z));
    const px = (S / (2 * dist * tanH)) * 1280;
    const k = px > 900 ? 1.15 : px > 500 ? 0.8 : px > 250 ? 0.5 : 0.3;
    const opts: K.ZOpts = { v: z.v, pose: z.pose, phase: z.pose === "walk" ? Math.round((z.phase ?? 0) * 8) / 8 % 1 : z.phase, glow: q(z.glow, 10), jaw: q(z.jaw, 10),
      eye: z.eye, sweat: q(z.sweat, 8), regrow: q(z.regrow, 8), rim: z.rim };
    const tex = drawTex(`z|${JSON.stringify(opts)}`, 1000, 1000, k, (p: Pen) => K.drawKaiju(p, opts));
    if (z.shadow !== false && y < 1) {
      const sh = drawTex("zshadow", 200, 100, 1, (p: Pen) => { const g = p.g, gr = g.createRadialGradient(100, 50, 5, 100, 50, 98); gr.addColorStop(0, "rgba(0,0,0,0.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.setTransform(1, 0, 0, 0.5, 0, 25); g.fillStyle = gr; g.fillRect(0, 0, 200, 200); });
      this.cards.fx(sh, z.x + o[0], y + 0.05 + o[1], z.z + o[2], S * 0.75, S * 0.32, camW, { flat: true, soft: true, alpha: (z.alpha ?? 1) * 0.9 });
    }
    const col = z.tint ? new THREE.Color(z.tint) : this.cards.tint.clone();
    this.cards.fx(tex, z.x + o[0], y + S * 0.475 + o[1], z.z + o[2], z.mirror ? -S : S, S, camW, { alpha: z.alpha, color: col, rot: z.roll });
  }

  private actor(a: ActorSpec, f: number, o: readonly number[], camW: THREE.Vector3, camL: THREE.Vector3, tanH: number) {
    if ((a.alpha ?? 1) <= 0.01) return;
    const hero = CAST[a.id];
    const s = a.s ?? 1, y = a.y ?? 0;
    const dist = Math.max(0.5, Math.hypot(camL.x - a.x, camL.y - (y + 1.0 * s), camL.z - a.z));
    const px = (2.16 * s) / (2 * dist * tanH) * 1280; // on-screen card height in render px
    const k = px > 700 ? 1.0 : px > 380 ? 0.7 : px > 160 ? 0.45 : 0.28;
    // blinks: every 1.3-2.6 s for 4 frames, per actor seed
    const seed = a.seed ?? (a.id.length * 7 + Math.round(a.x * 3));
    const per = Math.round(FPS * (1.3 + (seed % 7) * 0.2)), ph = (f + seed * 13) % per;
    const blink = a.blink ?? (ph < 4 ? (ph === 0 || ph === 3 ? 0.5 : 1) : 0);
    const walk = a.legs === "walk" || a.legs === "run";
    const opts: HeroOpts = { pose: a.pose, expr: a.expr, legs: a.legs, phase: walk ? Math.round((a.phase ?? 0) * 8) / 8 : 0, facing: a.facing ?? 0, seed,
      blink, look: a.look, glow: q(a.glow, 4), flutter: q(a.flutter, 4), wave: q(a.wave, 4), tilt: q(a.tilt, 1), headTilt: q(a.headTilt, 1), chair: a.chair };
    const key = `${a.id}|${JSON.stringify(opts)}`;
    const tex = drawTex(key, 600, 1000, k, (p: Pen) => drawHero(p, hero, opts));
    this.cards.body(tex, a.x + o[0], y + o[1], a.z + o[2], camW, { s, roll: a.roll, alpha: a.alpha, mirror: a.mirror, shadow: a.shadow ?? y < 0.5 });
  }

  private effect(x: FxSpec, o: readonly number[], camW: THREE.Vector3) {
    const h = x.h ?? x.w, t = q(x.t, 12), k = 0.55;
    let tex: THREE.Texture;
    switch (x.k) {
      case "burst": tex = drawTex(`burst${t}${x.col}`, 500, 500, k, (p) => F2.burst(p, t, x.col)); break;
      case "ring": tex = drawTex(`ring${x.col}${x.col2}${t}`, 500, 500, k, (p) => F2.ring(p, x.col ?? "#ffb347", x.col2 ?? "#ffd27a", t)); break;
      case "portal": tex = drawTex(`portal${x.col}${x.col2}${t}`, 500, 500, k, (p) => F2.portal(p, x.col ?? "#2a5ac0", x.col2 ?? "#7fd6ff", t)); break;
      case "crack": tex = drawTex(`crack${x.col}${x.seed}`, 600, 200, k, (p) => F2.crack(p, x.col ?? "#7fd6ff", x.seed ?? 1)); break;
      case "bolt": tex = drawTex(`bolt${x.seed}${x.col}`, 200, 600, k, (p) => F2.bolt(p, x.seed ?? 1, x.col)); break;
      case "puff": tex = drawTex(`puff${x.col}${x.seed}`, 400, 300, k, (p) => F2.puff(p, x.col, x.seed ?? 1)); break;
      case "note": tex = drawTex(`note${x.col}`, 200, 260, k, (p) => F2.note(p, x.col)); break;
      case "sign": tex = drawTex(`sign${x.text?.join("/")}${x.col}${x.col2}`, 1000, Math.round((1000 * h) / x.w), 0.6, (p) => F2.sign(p, 1000, Math.round((1000 * h) / x.w), x.text ?? [], { bg: x.col, fg: x.col2 })); break;
      case "grave": tex = drawTex(`grave${x.text?.[0]}`, 300, 360, k, (p) => F2.grave(p, x.text?.[0] ?? "")); break;
      case "sparkle": tex = drawTex(`spk${x.col}`, 200, 200, k, (p) => F2.sparkle(p, x.col)); break;
      case "chess": tex = drawTex(`chess`, 400, 300, 0.8, (p) => F2.chess(p)); break;
      case "podium": tex = drawTex(`podium`, 300, 400, 0.8, (p) => F2.podium(p)); break;
      case "blocks": tex = drawTex(`blocks`, 300, 200, 0.8, (p) => F2.blocks(p)); break;
      case "gem": tex = drawTex(`gem${x.col}`, 100, 140, 0.8, (p) => F2.gem(p, x.col ?? "#7a4fd0")); break;
      case "hero": { // a giant character drawn as an effect card (Galactus, ghosts)
        const id = x.text![0] as keyof typeof CAST, opts: HeroOpts = { expr: (x.text![1] as HeroOpts["expr"]) ?? "stern", pose: (x.text![2] as HeroOpts["pose"]) ?? "idle", seed: 3 };
        tex = drawTex(`hfx${x.text!.join("/")}`, 600, 1000, 0.8, (p) => drawHero(p, CAST[id], opts)); break;
      }
      case "gorilla": tex = drawTex("gorilla", 600, 600, 0.7, (p) => K.gorilla(p)); break;
      case "whale": tex = drawTex("whale", 800, 500, 0.7, (p) => K.whale(p)); break;
      case "rival": tex = drawTex(`rival${t}`, 1000, 1000, 0.6, (p) => K.rival(p, t)); break;
      case "three": tex = drawTex(`three${t}`, 1000, 800, 0.7, (p) => K.threeHead(p, t)); break;
      case "mushroom": tex = drawTex(`mush${t}`, 800, 1000, 0.5, (p) => K.mushroom(p, t, x.seed ?? 1)); break;
      case "fireball": tex = drawTex(`fireb${t}`, 600, 600, 0.5, (p) => K.fireball(p, t)); break;
      case "chute": tex = drawTex("chute", 600, 400, 0.7, (p) => K.chute(p)); break;
      case "bag": tex = drawTex(`bag${x.text?.[0]}${x.seed}`, 400, 400, 0.7, (p) => K.moneyBag(p, x.text?.[0] ?? "$", !!x.seed)); break;
      case "statue": tex = drawTex(`statue${t}`, 200, 600, 1, (p) => K.statue(p, t)); break;
      case "beam": tex = drawTex(`beam${x.col}`, 1000, 160, 0.6, (p) => { const g = p.g, gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, "rgba(120,220,255,0)"); gr.addColorStop(0.25, "#7fdcff"); gr.addColorStop(0.45, "#f4fdff"); gr.addColorStop(0.55, "#f4fdff"); gr.addColorStop(0.75, "#7fdcff"); gr.addColorStop(1, "rgba(120,220,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1000, 160); }); break;
      case "glow": tex = drawTex(`glow${x.col}`, 256, 256, 1, (p) => { const g = p.g, gr = g.createRadialGradient(128, 128, 4, 128, 128, 126); const c = new THREE.Color(x.col ?? "#ffffff"); const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; gr.addColorStop(0, `rgba(255,255,255,1)`); gr.addColorStop(0.3, `rgba(${rgb},0.85)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }); break;
      case "toy": tex = drawTex(`toy${x.text?.[0]}`, 1000, 1000, 0.4, (p) => K.drawKaiju(p, { v: (x.text?.[0] as K.ZVar) ?? "showa", eye: "friendly" })); break;
      default: return;
    }
    this.cards.fx(tex, x.x + o[0], x.y + o[1], x.z + o[2], x.w, h, camW, { flat: x.flat, rot: x.rot, alpha: x.alpha, soft: x.soft, full: x.full, yaw: x.yaw,
      color: x.tint ? new THREE.Color(x.tint) : undefined });
  }
}
export { SU };
void F2.burst;
