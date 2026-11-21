// Floor -1 ("Don't Step in the Water"): the same office, flooded ankle-deep. One planar reflector for the water (its
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

const drawSign = (g: CanvasRenderingContext2D) => {
  const w = 512, h = 680;
  g.fillStyle = "#f1eee4"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#1d1b22"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.fillStyle = "#b2322a"; g.fillRect(28, 28, w - 56, 190);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px Montserrat, sans-serif"; g.fillText("-1", w / 2, 128);
  g.fillStyle = "#1d1b22"; g.font = "900 62px Montserrat, sans-serif";
  g.fillText("DON'T STEP", w / 2, 300); g.fillText("IN THE", w / 2, 378); g.fillText("WATER.", w / 2, 456);
  g.font = "800 30px Montserrat, sans-serif"; g.fillStyle = "#6a6458"; g.fillText("NIGHT SHIFT · FLOOR RULE", w / 2, 590);
};

export type FloodHandles = { group: THREE.Group; water: Reflector; edge: THREE.Mesh };

export const buildFlood = (root: THREE.Object3D, exitMat: THREE.Material): FloodHandles => {
  const group = new THREE.Group(); group.visible = false; root.add(group);
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
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.61), new THREE.MeshBasicMaterial({ map: canvasTex(512, 680, drawSign), color: new THREE.Color(0.55, 0.62, 0.62) }));
  sign.position.set(...SIGN_AT); sign.rotation.y = Math.PI; group.add(sign);
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
  group.add(fd);
  // ---- hazard tape across the near stairwell door (that flight doesn't go on) ----
  const tape = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.5, 0.5), map: canvasTex(512, 32, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#141414" : "#f2c230"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 32); g.lineTo(i * 32 - 16, 32); g.fill(); } }), side: THREE.DoubleSide });
  const sx = (STAIR.x0 + STAIR.x1) / 2;
  for (const [a, y] of [[0.62, 1.2], [-0.62, 1.2], [0.0, 0.7]] as const) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.07), tape); t.position.set(sx, y, WALL_Z - 0.05); t.rotation.set(0, Math.PI, a); group.add(t);
  }
  return { group, water, edge };
};
