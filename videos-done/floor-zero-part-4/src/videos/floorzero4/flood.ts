// Floor -1 ("Don't Step in the Water"; Part 4 adds -2 and -3): the same office, flooded ankle-deep. One planar reflector for the water (its
// camera sees the room on layer 0 and the reflection-only cards on GHOST, never the real cast on NOINK, so the reflection
// can disagree with you), a wet edge in front of the elevators, the rule sign, the stairs door at the far end with its
// EXIT sign, and hazard tape across the near stairwell door. Everything here is shown only while the office is on -1.
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { OFFICE, WATER, WALL_Z, SIGN_AT, FAR_DOOR, STAIR } from "./story";

/** render layer of the cards that exist only in the water's reflection */
export const GHOST = 6;

const WaterShader = {
  name: "FloorZeroWater",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec4 base = texture2DProj(tDiffuse, vUv);
      // black water: a dimmed, slightly teal mirror
      gl_FragColor = vec4(base.rgb * color.r * vec3(0.86, 1.0, 1.02) + vec3(0.003, 0.010, 0.012), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};

/** a floor-rule sign: red header with the floor number, then the rule in black */
const drawSign = (num: string, lines: string[], size = 62) => (g: CanvasRenderingContext2D) => {
  const w = 512, h = 680;
  g.fillStyle = "#f1eee4"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#1d1b22"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.fillStyle = "#b2322a"; g.fillRect(28, 28, w - 56, 190);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px Montserrat, sans-serif"; g.fillText(num, w / 2, 128);
  g.fillStyle = "#1d1b22"; g.font = `900 ${size}px Montserrat, sans-serif`;
  const y0 = 378 - ((lines.length - 1) * size * 1.25) / 2;
  lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * size * 1.25, w - 60));
  g.font = "800 30px Montserrat, sans-serif"; g.fillStyle = "#6a6458"; g.fillText("NIGHT SHIFT · FLOOR RULE", w / 2, 610);
};
/** a doorway bricked up with grey breeze blocks, mortar lines, a frame */
const drawBricks = (g: CanvasRenderingContext2D) => {
  const w = 256, h = 512;
  g.fillStyle = "#6d6a66"; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = -1; c < 4; c++) {
    const x = c * 72 + (r % 2 ? 36 : 0), y = r * 32, k = Math.sin(r * 12.9 + c * 78.2) * 43758.5; const v = k - Math.floor(k);
    g.fillStyle = `rgb(${96 + 30 * v},${92 + 28 * v},${88 + 26 * v})`; g.fillRect(x + 3, y + 3, 66, 26);
  }
  g.strokeStyle = "#1d1b22"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
};
export const SIGNS = {
  m1: drawSign("-1", ["DON'T STEP", "IN THE", "WATER."]),
  m2: drawSign("-2", ["IF YOU HEAR", "TYPING,", "DON'T STOP", "WALKING."], 54),
  m3: drawSign("-3", ["NEVER", "TURN", "AROUND."]),
};

export type FloodHandles = {
  group: THREE.Group; water: Reflector; edge: THREE.Mesh;
  /** the rule sign beside the elevators (its picture switches per floor) and the far stairs door: on -1 and -3 */
  props: THREE.Group; sign: THREE.MeshBasicMaterial; signTex: Record<"m1" | "m3", THREE.CanvasTexture>;
  /** the security camera on the -3 ceiling */
  cctvCam: THREE.Group;
};

export const buildFlood = (root: THREE.Object3D, exitMat: THREE.Material): FloodHandles => {
  const group = new THREE.Group(); group.visible = false; root.add(group);
  const props = new THREE.Group(); props.visible = false; root.add(props);
  // ---- the water ----
  const wx = OFFICE.x1 - OFFICE.x0, wz = WATER.z1 - OFFICE.z0;
  const water = new Reflector(new THREE.PlaneGeometry(wx, wz), {
    textureWidth: 720, textureHeight: 1280, clipBias: 0.002, color: new THREE.Color(0.8, 0.8, 0.8),
    shader: WaterShader,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set((OFFICE.x0 + OFFICE.x1) / 2, WATER.y, (OFFICE.z0 + WATER.z1) / 2);
  water.camera.layers.enable(GHOST);
  group.add(water);
  // the wet edge where the dry strip ends
  const edge = new THREE.Mesh(new THREE.BoxGeometry(wx, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: "#0b1214" }));
  edge.position.set((OFFICE.x0 + OFFICE.x1) / 2, WATER.y - 0.005, WATER.z1 + 0.02);
  group.add(edge);
  // ---- the rule sign beside the elevators ----
  const signTex = { m1: canvasTex(512, 680, SIGNS.m1), m3: canvasTex(512, 680, SIGNS.m3) };
  const signMat = new THREE.MeshBasicMaterial({ map: signTex.m1, color: new THREE.Color(0.55, 0.62, 0.62) });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.61), signMat);
  sign.position.set(...SIGN_AT); sign.rotation.y = Math.PI; props.add(sign);
  // ---- the stairs down, at the far end of the aisle ----
  const fd = new THREE.Group();
  const frame = new THREE.MeshBasicMaterial({ color: "#1c2024" }), panel = new THREE.MeshBasicMaterial({ color: "#3a1312" });
  const box = (x0: number, y0: number, x1: number, y1: number, d: number, m: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, d), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, d / 2); fd.add(b);
  };
  box(-FAR_DOOR.hw - 0.07, 0, -FAR_DOOR.hw, FAR_DOOR.h + 0.07, 0.06, frame);
  box(FAR_DOOR.hw, 0, FAR_DOOR.hw + 0.07, FAR_DOOR.h + 0.07, 0.06, frame);
  box(-FAR_DOOR.hw - 0.07, FAR_DOOR.h, FAR_DOOR.hw + 0.07, FAR_DOOR.h + 0.07, 0.06, frame);
  box(-FAR_DOOR.hw, 0, FAR_DOOR.hw, FAR_DOOR.h, 0.03, panel);
  box(FAR_DOOR.hw - 0.16, 1.0, FAR_DOOR.hw - 0.08, 1.06, 0.06, frame); // push bar handle
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), exitMat); ex.position.set(0, FAR_DOOR.h + 0.28, 0.02); fd.add(ex);
  fd.position.set(FAR_DOOR.x, 0, FAR_DOOR.z);
  props.add(fd);
  // ---- hazard tape across the near stairwell door on -1 (that flight doesn't go on) ----
  const tape = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.5, 0.5), map: canvasTex(512, 32, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#141414" : "#f2c230"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 32); g.lineTo(i * 32 - 16, 32); g.fill(); } }), side: THREE.DoubleSide });
  const sx = (STAIR.x0 + STAIR.x1) / 2;
  for (const [a, y] of [[0.62, 1.2], [-0.62, 1.2], [0.0, 0.7]] as const) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.07), tape); t.position.set(sx, y, WALL_Z - 0.05); t.rotation.set(0, Math.PI, a); group.add(t);
  }
  // ---- the stairwell's bottom landing (-2): the doorway bricked up, the rule sign above it (always there; only the
  //      stairwell shots look at it) ----
  const bz = 5.68, bx = sx + 0.15;
  const bricks = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), new THREE.MeshBasicMaterial({ map: canvasTex(256, 512, drawBricks), color: new THREE.Color(0.62, 0.3, 0.27), fog: false }));
  bricks.position.set(bx, -1.53 + 1.025, bz); bricks.rotation.y = Math.PI; root.add(bricks);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshBasicMaterial({ map: canvasTex(512, 680, SIGNS.m2), color: new THREE.Color(0.95, 0.58, 0.52), fog: false }));
  s2.position.set(bx, 0.95, bz - 0.01); s2.rotation.y = Math.PI; root.add(s2);
  // ---- the security camera on the -3 ceiling, ahead of you, looking back at you ----
  const cctvCam = new THREE.Group(); cctvCam.visible = false;
  const dark = new THREE.MeshBasicMaterial({ color: "#20262a" }), lens = new THREE.MeshBasicMaterial({ color: "#05070a" });
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.25, 0.2), fog: false });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), dark); arm.position.set(0, -0.08, 0); cctvCam.add(arm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.3), dark); body.position.set(0, -0.2, 0.04); body.rotation.x = 0.45; cctvCam.add(body);
  const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), lens); ln.rotation.x = Math.PI / 2 + 0.45; ln.position.set(0, -0.268, 0.18); cctvCam.add(ln);
  const ld = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), led); ld.position.set(0.05, -0.235, 0.16); cctvCam.add(ld);
  cctvCam.position.set(0.55, 2.88, -1.75);
  root.add(cctvCam);
  return { group, water, edge, props, sign: signMat, signTex, cctvCam };
};
