// Flat drawings as camera-facing cards in the 3D world. One canvas per distinct drawing (LRU cache), so a character
// that holds a pose re-uses its texture every frame; walk cycles are quantised to 8 phases. Cards are unlit
// (MeshBasic, tinted per look) and live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen } from "./toon";
import { NOINK } from "./ink";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; used: number };
let clock = 0;
const cache = new Map<string, Entry>();
const MAX = 220;
/** texture for a drawing in a w x h design space, rasterised at k px per unit */
export const drawTex = (key: string, w: number, h: number, k: number, draw: (p: Pen) => void): THREE.CanvasTexture => {
  const id = `${w}x${h}@${k}|${key}`;
  let e = cache.get(id);
  if (!e) {
    if (cache.size >= MAX) { // evict the least recently used
      let old: string | null = null, t = Infinity;
      for (const [kk, v] of cache) if (v.used < t) { t = v.used; old = kk; }
      if (old) { cache.get(old)!.tex.dispose(); cache.delete(old); }
    }
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const g = cv.getContext("2d")!;
    g.setTransform(k, 0, 0, k, 0, 0);
    draw(new Pen(g));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 1;
    e = { cv, tex, used: 0 };
    cache.set(id, e);
  }
  e.used = ++clock;
  return e.tex;
};

export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m (a 3.5-head-tall adult ~1.75 m)
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const UNIT = new THREE.PlaneGeometry(1, 1);
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
const blobTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(0.6, "rgba(0,0,0,0.3)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/** a pool of reusable card meshes: call begin() each frame, take() per visible card, end() hides the rest */
export class CardPool {
  private cards: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.Mesh }[] = [];
  private n = 0;
  tint = new THREE.Color(1, 1, 1);
  constructor(private parent: THREE.Object3D) {}
  begin() { this.n = 0; }
  private grab() {
    let c = this.cards[this.n];
    if (!c) {
      const mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide, fog: true });
      const soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(BODY, mat);
      mesh.layers.set(NOINK); mesh.rotation.order = "YXZ"; mesh.renderOrder = 2; mesh.frustumCulled = false;
      const blob = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false }));
      blob.rotation.x = -Math.PI / 2; blob.layers.set(NOINK); blob.renderOrder = 1;
      this.parent.add(mesh, blob);
      c = { mesh, mat, soft, blob };
      this.cards.push(c);
    }
    this.n++;
    return c;
  }
  /** a standing character card: base point (x, y, z), height scale, yaw toward the camera, optional roll / alpha */
  body(tex: THREE.Texture, x: number, y: number, z: number, cam: THREE.Vector3, o: { s?: number; roll?: number; alpha?: number; mirror?: boolean; shadow?: boolean; tint?: THREE.Color; lean?: number } = {}) {
    const c = this.grab(), s = o.s ?? 1, a = o.alpha ?? 1;
    const m = a < 1 ? c.soft : c.mat;
    m.map = tex; m.opacity = a; m.color.copy(o.tint ?? this.tint);
    c.mesh.material = m; c.mesh.geometry = BODY; c.mesh.visible = true;
    c.mesh.position.set(x, y, z);
    c.mesh.rotation.set(o.lean ?? 0, Math.atan2(cam.x - x, cam.z - z), o.roll ?? 0, "YXZ");
    c.mesh.scale.set(o.mirror ? -s : s, s, s);
    c.blob.visible = o.shadow !== false && a > 0.5;
    c.blob.position.set(x, y + 0.02, z); c.blob.scale.set(1.1 * s, 0.55 * s, 1);
    c.blob.rotation.z = Math.atan2(cam.x - x, cam.z - z);
  }
  /** an effect card of w x h metres centred at (x, y, z); flat = lying on the ground, face = billboard toward cam */
  fx(tex: THREE.Texture, x: number, y: number, z: number, w: number, h: number, cam: THREE.Vector3, o: { flat?: boolean; rot?: number; alpha?: number; soft?: boolean; color?: THREE.Color; full?: boolean; yaw?: number; lean?: number } = {}) {
    const c = this.grab(), soft = o.soft || (o.alpha ?? 1) < 1;
    const m = soft ? c.soft : c.mat;
    m.map = tex; m.opacity = o.alpha ?? 1; m.color.copy(o.color ?? new THREE.Color(1, 1, 1));
    c.mesh.material = m; c.mesh.geometry = UNIT; c.mesh.visible = true; c.blob.visible = false;
    c.mesh.position.set(x, y, z); c.mesh.scale.set(w, h, 1);
    if (o.flat) c.mesh.rotation.set(-Math.PI / 2, 0, o.rot ?? 0, "XYZ");
    else if (o.full) { c.mesh.quaternion.copy(camQuat); c.mesh.rotateZ(o.rot ?? 0); }
    else c.mesh.rotation.set(o.lean ?? 0, o.yaw ?? Math.atan2(cam.x - x, cam.z - z), o.rot ?? 0, "YXZ");
  }
  end() { for (let i = this.n; i < this.cards.length; i++) { this.cards[i].mesh.visible = false; this.cards[i].blob.visible = false; } }
}
/** camera orientation for full billboards (set by the world each frame) */
export const camQuat = new THREE.Quaternion();
