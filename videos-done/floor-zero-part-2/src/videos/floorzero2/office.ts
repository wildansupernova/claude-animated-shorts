// The set of "Floor Zero": a 12th-floor open-plan office at night (carpet, ceiling tiles with fluorescent panel rows,
// 20 desks with privacy screens and monitors, swivel chairs, windows onto a night city, whiteboard, EXIT sign, plants),
// the elevator wall (two elevators, sliding doors, call button, floor displays, wall clock) and the elevator car
// (brushed steel, smoked mirror, handrails, button panel, display, the rules card). Static parts are merged per
// material (Batch); everything that moves or changes is returned as a handle for world.ts to pose per frame.
import * as THREE from "three";
import { Batch, boxGeo, quad, V, lam } from "./build";
import { ctex } from "./paint";
import { NOINK } from "./ink";
import {
  CEIL, ROWS, COLS, OFFICE, WALL_Z, DOOR, CAB, LOBBY_Z, MY_DESK, CLOCK, CALL_BTN, PANEL, DISPLAY_IN, DISPLAY_OUT, CARD_AT, PANEL_ROW_Y, BTN_ROW, STAIR,
} from "./story";

// ---------------- painted textures ----------------
const carpetTex = () => ctex("carpetHD", 1024, 1024, (g, r) => {
  // 50 cm carpet tiles, alternating pile direction, fine speckle, darker seams
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const v = (i + j) % 2;
    g.fillStyle = v ? "#353c4b" : "#313846"; g.fillRect(i * 256, j * 256, 256, 256);
    g.strokeStyle = v ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)"; g.lineWidth = 3;
    for (let k = 0; k < 256; k += 9) { g.beginPath(); if (v) { g.moveTo(i * 256 + k, j * 256); g.lineTo(i * 256 + k, j * 256 + 256); } else { g.moveTo(i * 256, j * 256 + k); g.lineTo(i * 256 + 256, j * 256 + k); } g.stroke(); }
  }
  for (let k = 0; k < 9000; k++) { g.fillStyle = r() < 0.5 ? "rgba(20,24,34,0.35)" : "rgba(140,150,170,0.18)"; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
  g.fillStyle = "rgba(15,18,26,0.55)"; for (let i = 0; i <= 4; i++) { g.fillRect(i * 256 - 2, 0, 4, 1024); g.fillRect(0, i * 256 - 2, 1024, 4); }
});
const ceilTex = () => ctex("ceilHD", 512, 512, (g, r) => {
  g.fillStyle = "#b9b8b1"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(120,118,110,${0.12 + 0.2 * r()})`; g.fillRect(r() * 512, r() * 512, 2 + 2 * r(), 2); }
  g.fillStyle = "#8f8f8a"; for (const p of [0, 256]) { g.fillRect(p, 0, 7, 512); g.fillRect(0, p, 512, 7); }
});
const wallTex = () => ctex("wallHD", 512, 512, (g, r) => {
  g.fillStyle = "#a9a69c"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "120,115,105"},0.05)`; g.beginPath(); g.arc(r() * 512, r() * 512, 30 + 60 * r(), 0, 7); g.fill(); }
  g.fillStyle = "#6f6d68"; g.fillRect(0, 488, 512, 24); // skirting
});
const steelTex = (key: string, base = "#9aa1a8") => ctex(key, 512, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 1024);
  for (let k = 0; k < 700; k++) { const y = r() * 1024; g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "30,35,40"},${0.03 + 0.05 * r()})`; g.fillRect(0, y, 512, 1 + 2 * r()); }
  const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "rgba(255,255,255,0.0)"); gr.addColorStop(0.45, "rgba(255,255,255,0.10)"); gr.addColorStop(0.6, "rgba(255,255,255,0.0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "rgba(25,28,34,0.55)"; g.fillRect(0, 0, 6, 1024); g.fillRect(506, 0, 6, 1024);
});
const mirrorTex = () => ctex("mirrorHD", 512, 768, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 768); gr.addColorStop(0, "#5f6f74"); gr.addColorStop(1, "#3c474c");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 768);
  g.fillStyle = "rgba(255,255,255,0.13)";
  for (const [x, w] of [[90, 70], [190, 22], [330, 46]] as const) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w - 260, 768); g.lineTo(x - 260, 768); g.fill(); }
  g.strokeStyle = "#2a3034"; g.lineWidth = 16; g.strokeRect(0, 0, 512, 768);
});
const woodTex = () => ctex("deskWood", 512, 256, (g, r) => {
  g.fillStyle = "#c4a77e"; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(120,85,50,${0.08 + 0.1 * r()})`; g.lineWidth = 1 + 2 * r(); const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 8 * r(), 340, y - 8 * r(), 512, y + 4 * r()); g.stroke(); }
});
const fabricTex = () => ctex("fabric", 256, 256, (g, r) => {
  g.fillStyle = "#46536a"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 4000; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.fillStyle = "#3b4558"; g.fillRect(0, 0, 256, 10);
});
const cabFloorTex = () => ctex("cabFloor", 512, 512, (g, r) => {
  g.fillStyle = "#3a3d40"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 5000; k++) { g.fillStyle = r() < 0.6 ? "rgba(200,205,210,0.18)" : "rgba(0,0,0,0.3)"; g.fillRect(r() * 512, r() * 512, 2 + 2 * r(), 2 + 2 * r()); }
});
const cityTex = () => ctex("cityNight", 2048, 640, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, "#070b1d"); gr.addColorStop(0.55, "#16193a"); gr.addColorStop(1, "#2b2346");
  g.fillStyle = gr; g.fillRect(0, 0, 2048, 640);
  for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * r()})`; g.fillRect(r() * 2048, r() * 200, 2, 2); }
  for (let pass = 0; pass < 2; pass++) {
    let x = -40;
    while (x < 2048) {
      const w = 80 + 160 * r(), h = (pass ? 220 : 120) + (pass ? 330 : 260) * r(), top = 640 - h;
      g.fillStyle = pass ? "#0d1022" : "#171b33"; g.fillRect(x, top, w, h);
      for (let wy = top + 14; wy < 640; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14)
        if (r() < (pass ? 0.13 : 0.08)) { g.fillStyle = r() < 0.7 ? "#ffd99a" : "#bfe2ff"; g.globalAlpha = pass ? 0.9 : 0.5; g.fillRect(wx, wy, 7, 9); g.globalAlpha = 1; }
      if (pass && r() < 0.3) { g.fillStyle = "#ff4a3a"; g.beginPath(); g.arc(x + w / 2, top - 6, 4, 0, 7); g.fill(); }
      x += w + 6 + 30 * r();
    }
  }
});
const whiteboardTex = () => ctex("whiteboard", 768, 384, (g) => {
  g.fillStyle = "#eef0ee"; g.fillRect(0, 0, 768, 384);
  g.strokeStyle = "#2f62b8"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(60, 300); g.lineTo(180, 210); g.lineTo(300, 240); g.lineTo(440, 120); g.lineTo(560, 150); g.stroke();
  g.strokeStyle = "#c0392b"; g.beginPath(); g.moveTo(520, 70); g.lineTo(700, 70); g.moveTo(520, 110); g.lineTo(660, 110); g.stroke();
  g.font = "700 46px Fredoka, sans-serif"; g.fillStyle = "#2f62b8"; g.fillText("Q4 GOALS", 60, 80);
  g.strokeStyle = "#8a8f94"; g.lineWidth = 14; g.strokeRect(0, 0, 768, 384);
});
const posterTex = (key: string, bg: string, fg: string, word: string) => ctex(key, 384, 512, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 384, 512);
  g.fillStyle = fg; g.beginPath(); g.arc(192, 210, 110, 0, 7); g.fill();
  g.font = "700 58px Fredoka, sans-serif"; g.textAlign = "center"; g.fillText(word, 192, 430);
  g.strokeStyle = "#1d1d22"; g.lineWidth = 18; g.strokeRect(0, 0, 384, 512);
});
const exitTex = () => ctex("exitSign", 256, 128, (g) => {
  g.fillStyle = "#0f8a4a"; g.fillRect(0, 0, 256, 128);
  g.font = "700 72px Montserrat, sans-serif"; g.fillStyle = "#e9fff1"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXIT", 128, 68);
});
const plaqueTex = () => ctex("floorPlaque", 256, 128, (g) => {
  g.fillStyle = "#2b2f36"; g.fillRect(0, 0, 256, 128);
  g.font = "800 70px Montserrat, sans-serif"; g.fillStyle = "#d9dde2"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("12", 128, 66);
});

// ---------------- dynamic canvases ----------------
export class Dyn {
  cv: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; key = "";
  constructor(public w: number, public h: number) {
    this.cv = document.createElement("canvas"); this.cv.width = w; this.cv.height = h;
    this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
  draw(key: string, fn: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
    if (key === this.key) return;
    this.key = key; this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.clearRect(0, 0, this.w, this.h); fn(this.g, this.w, this.h); this.tex.needsUpdate = true;
  }
}

// ---------------- handles ----------------
export type Chair = { g: THREE.Group; desk: [number, number]; mine: boolean; i: number };
export type SetHandles = {
  rows: THREE.MeshBasicMaterial[];        // ceiling panel diffusers per light row (0 nearest)
  lobby: THREE.MeshBasicMaterial;
  cabLight: THREE.MeshBasicMaterial;
  chairs: Chair[];
  doorL: THREE.Mesh; doorR: THREE.Mesh;
  display: Dyn; displayMat: THREE.MeshBasicMaterial; displayOut: Dyn; displayOutMat: THREE.MeshBasicMaterial;
  panel: Dyn; panelGlow: Dyn; panelMat: THREE.MeshBasicMaterial; panelGlowMat: THREE.MeshBasicMaterial;
  callBtn: Dyn; callMat: THREE.MeshBasicMaterial;
  monitor: Dyn; monitorMat: THREE.MeshBasicMaterial;
  clock: Dyn;
  card: Dyn;
  phone: THREE.Group; phoneScreen: Dyn;
  walls: Record<"front" | "back" | "left" | "right" | "ceil" | "cabCeil", THREE.Object3D[]>;
  exit: THREE.MeshBasicMaterial;
  screens: THREE.MeshBasicMaterial; // every other monitor (off, or the Night Shift message)
  msg: Dyn;
  stairDoor: THREE.Group; stairShadow: THREE.Mesh; stairLamp: THREE.MeshBasicMaterial;
};

const glowMat = (map: THREE.Texture | null, c: [number, number, number]) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(...c), fog: false });

/** add a quad facing +z (local) of size w x h at a matrix */
const plane = (w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); return g; };
const place = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

export const buildSet = (root: THREE.Object3D): SetHandles => {
  const walls: SetHandles["walls"] = { front: [], back: [], left: [], right: [], ceil: [], cabCeil: [] };
  const { x0, x1, z0, z1 } = OFFICE;
  // ---------- static office: floor, ceiling, walls (no shadow casting: the key comes from above the ceiling) ----------
  const flat = new Batch(), furn = new Batch();
  const M = {
    carpet: lam("carpet", () => ({ map: (() => { const t = carpetTex(); t.repeat.set(1, 1); return t; })() })),
    wall: lam("wall", () => ({ map: wallTex() })),
    trim: lam("trim", () => ({ color: "#55595f" })),
    wood: lam("wood", () => ({ map: woodTex() })),
    metal: lam("metal", () => ({ color: "#5c626b" })),
    dark: lam("darkBody", () => ({ color: "#1d2027" })),
    fabric: lam("fabric", () => ({ map: fabricTex() })),
    seat: lam("seat", () => ({ color: "#5d6f96" })),
    keys: lam("keys", () => ({ color: "#c9ccd1" })),
    steel: lam("steel", () => ({ map: steelTex("steelHD", "#7d848a") })),
    steelDoor: lam("steelDoor", () => ({ map: steelTex("steelDoorHD", "#858c92") })),
    cabWall: lam("cabWall", () => ({ map: steelTex("cabWallHD", "#8d968f") })),
    cabFloor: lam("cabFloor", () => ({ map: cabFloorTex() })),
    rail: lam("rail", () => ({ color: "#c3c9cc" })),
    pot: lam("pot", () => ({ color: "#d8d2c4" })),
    leaf: lam("leaf", () => ({ color: "#3f7d4c" })),
    leaf2: lam("leaf2", () => ({ color: "#2f6a3f" })),
    paper: lam("paper", () => ({ color: "#efece4" })),
    mug: lam("mug", () => ({ color: "#c9473c" })),
    cooler: lam("cooler", () => ({ color: "#e6e8ea" })),
    bottle: lam("bottle", () => ({ color: "#7fb4d8" })),
    mullion: lam("mullion", () => ({ color: "#3a3e45" })),
  };
  const carpet = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  { const uv = carpet.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 2, uv.getY(i) * (z1 - z0) / 2); }
  flat.add(carpet.translate((x0 + x1) / 2, 0, (z0 + z1) / 2), M.carpet);
  const wallQ = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, w: number, h: number) => quad(a, b, c, d, w / 2.4, h / 2.9);
  // left wall (faces +x), back wall (faces +z)
  flat.add(wallQ(V(x0, 0, z1), V(x0, 0, z0), V(x0, CEIL, z0), V(x0, CEIL, z1), z1 - z0, CEIL), M.wall);
  flat.add(wallQ(V(x0, 0, z0), V(x1, 0, z0), V(x1, CEIL, z0), V(x0, CEIL, z0), x1 - x0, CEIL), M.wall);
  // right wall: windows between y 0.85 and 2.6, mullions every 1.5 m
  flat.add(wallQ(V(x1, 0, z0), V(x1, 0, z1), V(x1, 0.85, z1), V(x1, 0.85, z0), z1 - z0, 0.85), M.wall);
  flat.add(wallQ(V(x1, 2.6, z0), V(x1, 2.6, z1), V(x1, CEIL, z1), V(x1, CEIL, z0), z1 - z0, 0.3), M.wall);
  for (let z = z0; z <= z1 + 0.01; z += 1.5) furn.add(boxGeo(V(x1 - 0.08, 0.85, z - 0.05), V(x1, 2.6, z + 0.05)), M.mullion);
  furn.add(boxGeo(V(x1 - 0.22, 0.8, z0), V(x1, 0.86, z1)), M.trim); // sill
  // front wall (elevator wall, faces -z) with two openings
  const fw = (xa: number, xb: number, ya: number, yb: number) => flat.add(wallQ(V(xb, ya, WALL_Z), V(xa, ya, WALL_Z), V(xa, yb, WALL_Z), V(xb, yb, WALL_Z), xb - xa, yb - ya), M.wall);
  const E2 = -2.6;
  fw(x0, E2 - DOOR.hw, 0, CEIL); fw(E2 + DOOR.hw, -DOOR.hw, 0, CEIL); fw(DOOR.hw, STAIR.x0, 0, CEIL); fw(STAIR.x0, STAIR.x1, STAIR.h, CEIL); fw(STAIR.x1, x1, 0, CEIL);
  fw(E2 - DOOR.hw, E2 + DOOR.hw, DOOR.h, CEIL); fw(-DOOR.hw, DOOR.hw, DOOR.h, CEIL);
  // steel door frames
  for (const cx of [E2, 0]) {
    furn.add(boxGeo(V(cx - DOOR.hw - 0.08, 0, WALL_Z - 0.03), V(cx - DOOR.hw, DOOR.h + 0.08, WALL_Z + 0.04)), M.steel);
    furn.add(boxGeo(V(cx + DOOR.hw, 0, WALL_Z - 0.03), V(cx + DOOR.hw + 0.08, DOOR.h + 0.08, WALL_Z + 0.04)), M.steel);
    furn.add(boxGeo(V(cx - DOOR.hw - 0.08, DOOR.h, WALL_Z - 0.03), V(cx + DOOR.hw + 0.08, DOOR.h + 0.08, WALL_Z + 0.04)), M.steel);
  }
  // the other elevator: closed for good
  furn.add(boxGeo(V(E2 - DOOR.hw, 0, WALL_Z + 0.005), V(E2 - 0.004, DOOR.h, WALL_Z + 0.035)), M.steelDoor);
  furn.add(boxGeo(V(E2 + 0.004, 0, WALL_Z + 0.005), V(E2 + DOOR.hw, DOOR.h, WALL_Z + 0.035)), M.steelDoor);
  // ceiling (faces down): tiles; hidden for shots that look down from above it
  const ceilG = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2);
  { const uv = ceilG.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 1.2, uv.getY(i) * (z1 - z0) / 1.2); }
  const ceil = new THREE.Mesh(ceilG.translate((x0 + x1) / 2, CEIL, (z0 + z1) / 2), lam("ceil", () => ({ map: ceilTex() })));
  ceil.receiveShadow = true; root.add(ceil); walls.ceil.push(ceil);
  // ---------- light panels: 4 per row over the desks + 2 over the aisle ----------
  const rows: THREE.MeshBasicMaterial[] = [];
  ROWS.forEach((rz) => {
    const m = glowMat(null, [2.4, 2.5, 2.7]); rows.push(m);
    const b = new Batch();
    for (const cx of [...COLS, -0.0]) b.add(new THREE.PlaneGeometry(cx === 0 ? 0.6 : 1.2, 0.6).rotateX(Math.PI / 2).translate(cx, CEIL - 0.012, rz), m);
    b.build(root, false);
  });
  const lobby = glowMat(null, [2.4, 2.5, 2.7]);
  { const b = new Batch(); for (const cx of [-3.6, 0, 3.6]) b.add(new THREE.PlaneGeometry(1.2, 0.6).rotateX(Math.PI / 2).translate(cx, CEIL - 0.012, LOBBY_Z), lobby); b.build(root, false); }
  // ---------- desks ----------
  const chairs: Chair[] = [];
  let ci = 0;
  ROWS.forEach((rz, ri) => COLS.forEach((cx) => {
    furn.add(boxGeo(V(cx - 0.8, 0.72, rz - 0.4), V(cx + 0.8, 0.75, rz + 0.4), 0, true), M.wood);
    for (const s of [-1, 1]) furn.add(boxGeo(V(cx + s * 0.77 - 0.015, 0, rz - 0.36), V(cx + s * 0.77 + 0.015, 0.72, rz + 0.36)), M.metal);
    furn.add(boxGeo(V(cx - 0.8, 0.75, rz - 0.44), V(cx + 0.8, 1.22, rz - 0.4)), M.fabric);
    // monitor (stand + body); the screen is a separate glow quad
    furn.add(boxGeo(V(cx - 0.05, 0.75, rz - 0.3), V(cx + 0.05, 0.9, rz - 0.26)), M.dark);
    furn.add(boxGeo(V(cx - 0.29, 0.86, rz - 0.31), V(cx + 0.29, 1.22, rz - 0.285)), M.dark);
    furn.add(boxGeo(V(cx - 0.21, 0.75, rz - 0.1), V(cx + 0.21, 0.765, rz + 0.04)), M.keys);
    const hsh = Math.sin(ri * 7.1 + cx * 3.3);
    if (hsh > 0.2) furn.add(boxGeo(V(cx + 0.35, 0.75, rz - 0.15), V(cx + 0.6, 0.77, rz + 0.17)), M.paper);
    if (hsh < -0.3) furn.add(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12).translate(cx - 0.45, 0.8, rz + 0.05), M.mug);
    // chair: a group so it can turn
    const g = new THREE.Group();
    const seat = new THREE.Mesh(boxGeo(V(-0.24, 0.44, -0.24), V(0.24, 0.51, 0.24), 0, true), M.seat);
    const back = new THREE.Mesh(boxGeo(V(-0.22, 0.58, -0.3), V(0.22, 1.04, -0.24), 0, true), M.seat);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8).translate(0, 0.27, 0), M.metal);
    const spine = new THREE.Mesh(boxGeo(V(-0.03, 0.5, -0.28), V(0.03, 0.62, -0.25)), M.metal);
    g.add(seat, back, post, spine);
    for (let k = 0; k < 5; k++) { const leg = new THREE.Mesh(boxGeo(V(-0.018, 0.05, 0), V(0.018, 0.09, 0.3)), M.metal); leg.rotation.y = (k * 2 * Math.PI) / 5; g.add(leg); }
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    root.add(g);
    chairs.push({ g, desk: [cx, rz], mine: cx === MY_DESK[0] && rz === MY_DESK[2], i: ci++ });
  }));
  // other monitors: dark screens (one shared material)
  const screens = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.035, 0.04, 0.055), fog: true });
  { const b = new Batch(); ROWS.forEach((rz) => COLS.forEach((cx) => { if (cx === MY_DESK[0] && rz === MY_DESK[2]) return; b.add(new THREE.PlaneGeometry(0.52, 0.3).translate(cx, 1.04, rz - 0.282), screens); })); b.build(root, false); }
  const monitor = new Dyn(512, 300);
  const monitorMat = new THREE.MeshBasicMaterial({ map: monitor.tex, color: new THREE.Color(1, 1, 1), fog: false });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.3), monitorMat); m.position.set(MY_DESK[0], 1.04, MY_DESK[2] - 0.282); root.add(m); }
  // ---------- dressing: whiteboard, posters, exit sign, plants, water cooler, the city outside ----------
  const wb = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), lam("whiteboard", () => ({ map: whiteboardTex() })));
  place(wb, x0 + 0.02, 1.55, -5.2, Math.PI / 2); root.add(wb);
  [["#e2453c", "#ffd84a", "TEAM", -8.4], ["#2f6a8a", "#9fe0c8", "FOCUS", -1.6]].forEach(([bg, fg, w, z], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), lam("poster" + i, () => ({ map: posterTex("poster" + i, bg as string, fg as string, w as string) })));
    place(p, x0 + 0.02, 1.6, z as number, Math.PI / 2); root.add(p);
  });
  const exit = glowMat(exitTex(), [1.6, 1.6, 1.6]);
  { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), exit); place(e, -4.6, 2.62, z0 + 0.02); root.add(e); }
  { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), exit); place(e, (STAIR.x0 + STAIR.x1) / 2, STAIR.h + 0.28, WALL_Z - 0.02, Math.PI); root.add(e); }
  // ---------- the stairwell door (fire door, hinged on its +x edge, opens into the office) and the red stairwell behind it ----------
  const sw = STAIR.x1 - STAIR.x0, sx = (STAIR.x0 + STAIR.x1) / 2;
  furn.add(boxGeo(V(STAIR.x0 - 0.07, 0, WALL_Z - 0.03), V(STAIR.x0, STAIR.h + 0.07, WALL_Z + 0.05)), M.trim);
  furn.add(boxGeo(V(STAIR.x1, 0, WALL_Z - 0.03), V(STAIR.x1 + 0.07, STAIR.h + 0.07, WALL_Z + 0.05)), M.trim);
  furn.add(boxGeo(V(STAIR.x0 - 0.07, STAIR.h, WALL_Z - 0.03), V(STAIR.x1 + 0.07, STAIR.h + 0.07, WALL_Z + 0.05)), M.trim);
  const stairDoor = new THREE.Group();
  { const dm = lam("fireDoor", () => ({ color: "#6b7a72" })), bar = lam("pushBar", () => ({ color: "#c3c9cc" })), glass = lam("wireGlass", () => ({ color: "#1d2a2c" }));
    const parts: [THREE.BufferGeometry, THREE.Material][] = [
      [boxGeo(V(-sw + 0.01, 0, -0.022), V(-0.005, STAIR.h - 0.01, 0.022), 0, true), dm],
      [boxGeo(V(-sw + 0.12, 0.98, -0.05), V(-0.1, 1.04, -0.022)), bar],
      [boxGeo(V(-sw + 0.18, 1.3, -0.026), V(-sw + 0.32, 1.85, -0.021)), glass],
    ];
    for (const [g, m] of parts) { const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; stairDoor.add(mesh); }
    stairDoor.position.set(STAIR.x1, 0, WALL_Z - 0.02); root.add(stairDoor); }
  const RB = (c: string) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), side: THREE.DoubleSide, fog: false });
  const red = { floor: RB("#7a2826"), wall: RB("#561c1b"), far: RB("#5e1c1a"), step: RB("#8e302b"), riser: RB("#3a1010"), rail: RB("#b0443b") };
  { const b = new Batch(), zA = WALL_Z + 0.03, zB = 5.7, xa = STAIR.x0 - 0.15, xb = STAIR.x1 + 0.9;
    b.add(boxGeo(V(xa, -0.02, zA), V(xb, 0, 3.3)), red.floor);
    b.add(quad(V(xa, -1.6, zA), V(xa, -1.6, zB), V(xa, CEIL, zB), V(xa, CEIL, zA)), red.wall);
    b.add(quad(V(xb, -1.6, zB), V(xb, -1.6, zA), V(xb, CEIL, zA), V(xb, CEIL, zB)), red.wall);
    b.add(quad(V(xb, -1.6, zB), V(xa, -1.6, zB), V(xa, CEIL, zB), V(xb, CEIL, zB)), red.far);
    b.add(quad(V(xa, CEIL, zA), V(xa, CEIL, zB), V(xb, CEIL, zB), V(xb, CEIL, zA)), red.far);
    for (let i = 0; i < 9; i++) {  // stairs going down, away from the door
      const z = 3.3 + i * 0.27, y = -0.17 * (i + 1);
      b.add(boxGeo(V(xa, y, z), V(xb - 0.4, y + 0.025, z + 0.27)), i % 2 ? red.step : red.floor);
      b.add(quad(V(xa, y, z), V(xb - 0.4, y, z), V(xb - 0.4, y + 0.17, z), V(xa, y + 0.17, z)), red.riser);
    }
    b.add(boxGeo(V(xb - 0.42, 0.9, 3.3), V(xb - 0.38, 0.94, 5.6)), red.rail);
    b.build(root, false); }
  const stairLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.5, 0.35), fog: false });
  { const l = new THREE.Mesh(boxGeo(V(-0.12, -0.06, -0.04), V(0.12, 0.06, 0)), stairLamp); l.position.set(sx + 0.2, 2.25, 5.68); root.add(l); }
  const shadowTex = ctex("stairShadow", 256, 512, (g) => {
    const gr = g.createRadialGradient(128, 300, 20, 128, 300, 240); gr.addColorStop(0, "rgba(0,0,0,0.95)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = "rgba(0,0,0,0.92)"; g.beginPath(); g.ellipse(128, 90, 46, 54, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(60, 150); g.quadraticCurveTo(128, 120, 196, 150); g.lineTo(214, 512); g.lineTo(42, 512); g.closePath(); g.fill();
    g.fillStyle = gr; g.globalCompositeOperation = "destination-in"; g.fillRect(0, 0, 256, 512);
  });
  const stairShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85, fog: false }));
  place(stairShadow, sx + 0.35, -1.2, 5.66, Math.PI); stairShadow.layers.set(NOINK); root.add(stairShadow);
  for (const [px, pz] of [[-6.2, 1.7], [6.2, 1.7], [-6.3, -6.9], [6.3, -10.2]]) {
    furn.add(new THREE.CylinderGeometry(0.22, 0.17, 0.5, 16).translate(px, 0.25, pz), M.pot);
    for (let k = 0; k < 6; k++) { const a = k * 1.1, r = 0.16; furn.add(new THREE.SphereGeometry(0.2 - 0.015 * k, 10, 8).translate(px + r * Math.cos(a), 0.62 + 0.11 * k, pz + r * Math.sin(a)), k % 2 ? M.leaf : M.leaf2); }
  }
  furn.add(boxGeo(V(-5.2, 0, 1.85), V(-4.8, 1.0, 2.25)), M.cooler);
  furn.add(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 14).translate(-5.0, 1.2, 2.05), M.bottle);
  const city = new THREE.Mesh(new THREE.PlaneGeometry(64, 20), new THREE.MeshBasicMaterial({ map: cityTex(), color: new THREE.Color(0.75, 0.75, 0.8), fog: false }));
  place(city, 16, -2, -5, -Math.PI / 2); city.layers.set(NOINK); root.add(city);
  // ---------- the elevator wall: call button, displays, clock, floor plaque ----------
  const callBtn = new Dyn(128, 256);
  const callMat = new THREE.MeshBasicMaterial({ map: callBtn.tex, color: new THREE.Color(1, 1, 1), fog: true });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.24), callMat); place(m, CALL_BTN[0], CALL_BTN[1], CALL_BTN[2], Math.PI); root.add(m); }
  const displayOut = new Dyn(256, 128);
  const displayOutMat = new THREE.MeshBasicMaterial({ map: displayOut.tex, color: new THREE.Color(1.6, 1.6, 1.6), fog: true });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), displayOutMat); place(m, DISPLAY_OUT[0], DISPLAY_OUT[1], DISPLAY_OUT[2], Math.PI); root.add(m); }
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: (() => { const d = new Dyn(256, 128); d.draw("3", (g, w, h) => digits(g, w, h, "3")); return d.tex; })(), color: new THREE.Color(1.3, 1.3, 1.3) })); place(m, E2, DISPLAY_OUT[1], DISPLAY_OUT[2], Math.PI); root.add(m); }
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), lam("plaque", () => ({ map: plaqueTex() }))); place(m, 1.5, 1.6, WALL_Z - 0.015, Math.PI); root.add(m); }
  const clock = new Dyn(512, 512);
  { const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 40).rotateX(Math.PI / 2), M.dark); rim.position.set(CLOCK[0], CLOCK[1], CLOCK[2] + 0.005); root.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.205, 40), lam("clockFace", () => ({ map: clock.tex }))); place(face, CLOCK[0], CLOCK[1], CLOCK[2] - 0.022, Math.PI); root.add(face); }
  // ---------- the elevator car ----------
  const cab = new Batch();
  const { x0: cx0, x1: cx1, z0: cz0, z1: cz1, h: ch } = CAB;
  cab.add(boxGeo(V(cx0, -0.02, cz0 - 0.05), V(cx1, 0, cz1), 0.6), M.cabFloor);
  cab.add(boxGeo(V(-DOOR.hw, -0.02, WALL_Z - 0.08), V(DOOR.hw, 0.003, cz0)), M.steel); // the sill
  const cabB = (geo: THREE.BufferGeometry, mat: THREE.Material, key: keyof SetHandles["walls"]) => { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; root.add(m); walls[key].push(m); return m; };
  cabB(quad(V(cx0, 0, cz1), V(cx0, 0, cz0), V(cx0, ch, cz0), V(cx0, ch, cz1), 1, 1), M.cabWall, "left");
  cabB(quad(V(cx1, 0, cz0), V(cx1, 0, cz1), V(cx1, ch, cz1), V(cx1, ch, cz0), 1, 1), M.cabWall, "right");
  cabB(quad(V(cx1, 0, cz1), V(cx0, 0, cz1), V(cx0, ch, cz1), V(cx1, ch, cz1), 1, 1), lam("mirror", () => ({ map: mirrorTex() })), "back");
  // inner front wall (faces +z): strips beside the door, lintel above; the panel lives on the right strip
  cabB(quad(V(cx0, 0, cz0), V(-DOOR.hw, 0, cz0), V(-DOOR.hw, ch, cz0), V(cx0, ch, cz0), 0.3, 1), M.cabWall, "front");
  cabB(quad(V(DOOR.hw, 0, cz0), V(cx1, 0, cz0), V(cx1, ch, cz0), V(DOOR.hw, ch, cz0), 0.3, 1), M.cabWall, "front");
  cabB(quad(V(-DOOR.hw, DOOR.h, cz0), V(DOOR.hw, DOOR.h, cz0), V(DOOR.hw, ch, cz0), V(-DOOR.hw, ch, cz0), 1, 0.2), M.cabWall, "front");
  // the wall cavity between the two faces (so nothing is see-through at the door jambs)
  for (const s of [-1, 1]) cab.add(boxGeo(V(s > 0 ? DOOR.hw : -DOOR.hw - 0.02, 0, WALL_Z), V(s > 0 ? DOOR.hw + 0.02 : -DOOR.hw, DOOR.h, cz0)), M.steel);
  // car ceiling with its light panel
  const cabCeil = cabB(quad(V(cx0, ch, cz0), V(cx1, ch, cz0), V(cx1, ch, cz1), V(cx0, ch, cz1), 1, 1), lam("cabCeil", () => ({ color: "#6b726d" })), "cabCeil");
  cabCeil.castShadow = false;
  const cabLight = glowMat(null, [2.2, 2.9, 2.1]);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.3).rotateX(Math.PI / 2), cabLight); m.position.set(0, ch - 0.01, (cz0 + cz1) / 2); root.add(m); walls.cabCeil.push(m); }
  // handrails (left, right, back)
  const railY = 0.92;
  for (const [a, b] of [[V(cx0 + 0.06, railY, cz0 + 0.25), V(cx0 + 0.06, railY, cz1 - 0.12)], [V(cx1 - 0.06, railY, cz0 + 0.25), V(cx1 - 0.06, railY, cz1 - 0.12)], [V(cx0 + 0.12, railY, cz1 - 0.06), V(cx1 - 0.12, railY, cz1 - 0.06)]]) {
    const d = b.clone().sub(a), g = new THREE.CylinderGeometry(0.018, 0.018, d.length(), 10);
    cab.add(g, M.rail, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
  }
  cab.build(root, false);
  // the doors (one pair serves the landing and the car): slide into the wall cavity
  const dw = DOOR.hw + 0.02, doorG = boxGeo(V(-dw / 2, 0, -0.012), V(dw / 2, DOOR.h, 0.012));
  const doorL = new THREE.Mesh(doorG, M.steelDoor), doorR = new THREE.Mesh(doorG, M.steelDoor);
  for (const d of [doorL, doorR]) { d.castShadow = false; d.receiveShadow = true; d.position.set(0, 0, (WALL_Z + cz0) / 2); root.add(d); walls.front.push(d); }
  // the panel: steel plate with buttons (lit by the car light) + an additive glow layer for lit buttons
  const panel = new Dyn(256, 1024), panelGlow = new Dyn(256, 1024);
  const panelMat = new THREE.MeshBasicMaterial({ map: panel.tex, color: new THREE.Color(1, 1, 1), fog: false });
  const panelGlowMat = new THREE.MeshBasicMaterial({ map: panelGlow.tex, color: new THREE.Color(2.2, 2.2, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  { const h = PANEL.y1 - PANEL.y0, m = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, h), panelMat); m.position.set(PANEL.x, (PANEL.y0 + PANEL.y1) / 2, PANEL.z); root.add(m);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, h), panelGlowMat); gl.position.set(PANEL.x, (PANEL.y0 + PANEL.y1) / 2, PANEL.z + 0.002); gl.layers.set(NOINK); gl.renderOrder = 2; root.add(gl); }
  const display = new Dyn(256, 128);
  const displayMat = new THREE.MeshBasicMaterial({ map: display.tex, color: new THREE.Color(1.8, 1.8, 1.8), fog: false });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), displayMat); m.position.set(...DISPLAY_IN); root.add(m); }
  // the rules card, taped to the mirror (faces -z)
  const card = new Dyn(720, 1000);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.25), lam("rulesCard", () => ({ map: card.tex }))); place(m, CARD_AT[0], CARD_AT[1], CARD_AT[2], Math.PI); m.rotation.z = 0.035; root.add(m); walls.back.push(m); }
  // the phone (posed per frame in world.ts)
  const phone = new THREE.Group(), phoneScreen = new Dyn(360, 760);
  { const body = new THREE.Mesh(boxGeo(V(-0.037, -0.077, -0.005), V(0.037, 0.077, 0.005), 0, true), M.dark);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.139), new THREE.MeshBasicMaterial({ map: phoneScreen.tex, color: new THREE.Color(1.15, 1.15, 1.15), fog: false }));
    scr.position.z = 0.0056; phone.add(body, scr); phone.visible = false; root.add(phone); }
  furn.build(root, true);
  flat.build(root, false);
  const msg = new Dyn(512, 300);
  return { rows, lobby, cabLight, chairs, doorL, doorR, display, displayMat, displayOut, displayOutMat, panel, panelGlow, panelMat, panelGlowMat,
    callBtn, callMat, monitor, monitorMat, clock, card, phone, phoneScreen, walls, exit, screens, msg, stairDoor, stairShadow, stairLamp };
};

// ---------------- dynamic drawings ----------------
/** amber dot-matrix-ish floor digits */
export const digits = (g: CanvasRenderingContext2D, w: number, h: number, s: string, col = "#ffb347") => {
  g.fillStyle = "#120c08"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#2a2018"; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  g.font = `800 ${Math.round(h * 0.78)}px Montserrat, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = col; g.shadowBlur = 14; g.fillStyle = col;
  if (s === "v") { g.beginPath(); g.moveTo(w / 2 - 34, h / 2 - 22); g.lineTo(w / 2 + 34, h / 2 - 22); g.lineTo(w / 2, h / 2 + 26); g.closePath(); g.fill(); }
  else g.fillText(s, w / 2, h / 2 + 4);
  g.shadowBlur = 0;
  g.fillStyle = "rgba(0,0,0,0.35)"; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
};
/** the car panel (256 x 1024): floors 12..1 in two columns, G, the hidden basement floors 0..-7, door buttons + bell */
export const PANEL_LABELS: string[][] = [["11", "12"], ["9", "10"], ["7", "8"], ["5", "6"], ["3", "4"], ["1", "2"], ["G"], ["0", "-1"], ["-2", "-3"], ["-4", "-5"], ["-6", "-7"], ["<>", "BELL"]];
const btnXY = (row: number, k: number, n: number, w: number, h: number): [number, number] => {
  const y = ((PANEL.y1 - PANEL_ROW_Y(row)) / (PANEL.y1 - PANEL.y0)) * h;
  return [n === 1 ? w / 2 : k === 0 ? w * 0.3 : w * 0.7, y];
};
export const drawPanel = (g: CanvasRenderingContext2D, w: number, h: number, shown: Set<string>, lit: Set<string>, glow: boolean) => {
  if (!glow) {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#8c9398"); gr.addColorStop(0.5, "#b3babe"); gr.addColorStop(1, "#858c91");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3a3f44"; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
    // speaker grille at the top
    g.fillStyle = "#4a4f55"; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(w * 0.3 + j * 0.13 * w, 26 + i * 12, 3.5, 0, 7); g.fill(); }
  }
  PANEL_LABELS.forEach((row, ri) => row.forEach((lab, k) => {
    const basement = ri >= BTN_ROW.zero && ri <= BTN_ROW.last;
    if (basement && !shown.has(lab)) return;
    const [x, y] = btnXY(ri, k, row.length, w, h), r = 26, on = lit.has(lab), bell = lab === "BELL";
    if (glow) {
      if (!on) return;
      const gr = g.createRadialGradient(x, y, r * 0.95, x, y, r * 1.9);
      const c = bell ? "255,90,60" : basement ? "255,80,70" : "255,200,120";
      gr.addColorStop(0, `rgba(${c},0.9)`); gr.addColorStop(0.35, `rgba(${c},0.5)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.9, 0, 7); g.fill();
      return;
    }
    g.fillStyle = "#2b2f34"; g.beginPath(); g.arc(x, y, r + 5, 0, 7); g.fill();
    g.fillStyle = bell ? "#d4483a" : on ? (basement ? "#ffd2c8" : "#ffe0a8") : "#d7dbde"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = on ? (basement ? "#ff4030" : "#ffb347") : "#777d83"; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r - 3, 0, 7); g.stroke();
    g.fillStyle = bell ? "#ffffff" : basement && on ? "#5a0c06" : "#1e2226"; g.textAlign = "center"; g.textBaseline = "middle";
    if (bell) { g.beginPath(); g.moveTo(x - 11, y + 9); g.quadraticCurveTo(x - 11, y - 14, x, y - 14); g.quadraticCurveTo(x + 11, y - 14, x + 11, y + 9); g.closePath(); g.fill(); g.beginPath(); g.arc(x, y + 12, 4, 0, 7); g.fill(); }
    else if (lab === "<>") { g.font = "800 22px Montserrat, sans-serif"; g.fillText("<|>", x, y + 1); }
    else { g.font = `900 ${lab.length > 1 ? 24 : 28}px Montserrat, sans-serif`; g.fillText(lab, x, y + 1); }
  }));
};
export const drawCallBtn = (g: CanvasRenderingContext2D, w: number, h: number, lit: boolean) => {
  g.fillStyle = "#9aa1a7"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3a3f44"; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  for (const [y, up] of [[h * 0.32, true], [h * 0.68, false]] as const) {
    const on = lit && !up;
    g.fillStyle = "#2b2f34"; g.beginPath(); g.arc(w / 2, y, 34, 0, 7); g.fill();
    g.fillStyle = on ? "#ffd27a" : "#d7dbde"; g.beginPath(); g.arc(w / 2, y, 29, 0, 7); g.fill();
    g.fillStyle = "#1e2226"; g.beginPath();
    if (up) { g.moveTo(w / 2, y - 13); g.lineTo(w / 2 + 13, y + 10); g.lineTo(w / 2 - 13, y + 10); } else { g.moveTo(w / 2, y + 13); g.lineTo(w / 2 + 13, y - 10); g.lineTo(w / 2 - 13, y - 10); }
    g.closePath(); g.fill();
  }
};
/** wall clock face at hh:mm:ss (+ sub-second for a sweeping second hand) */
export const drawClock = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  const c = w / 2, R = w * 0.47;
  g.fillStyle = "#f4f2ea"; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
  g.strokeStyle = "#1d1d22";
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, l = i % 5 ? 14 : 34; g.lineWidth = i % 5 ? 4 : 10; g.beginPath(); g.moveTo(c + Math.sin(a) * (R - 10), c - Math.cos(a) * (R - 10)); g.lineTo(c + Math.sin(a) * (R - 10 - l), c - Math.cos(a) * (R - 10 - l)); g.stroke(); }
  const hand = (a: number, len: number, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = "round"; g.beginPath(); g.moveTo(c - Math.sin(a) * 26, c + Math.cos(a) * 26); g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len); g.stroke(); };
  const s = t % 60, m = (t / 60) % 60, hr = (t / 3600) % 12;
  hand((hr / 12) * Math.PI * 2, R * 0.5, 16, "#1d1d22");
  hand((m / 60) * Math.PI * 2, R * 0.78, 11, "#1d1d22");
  hand((s / 60) * Math.PI * 2, R * 0.86, 4, "#d23a2e");
  g.fillStyle = "#d23a2e"; g.beginPath(); g.arc(c, c, 12, 0, 7); g.fill();
};
/** your monitor: a desktop (normal floor), off, or the floor-zero document typing your name */
export const drawMonitor = (g: CanvasRenderingContext2D, w: number, h: number, mode: "desk" | "off" | "type", typed = "", cursor = true) => {
  if (mode === "off") { g.fillStyle = "#06080c"; g.fillRect(0, 0, w, h); return; }
  if (mode === "desk") {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#2b5aa8"); gr.addColorStop(1, "#173467"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e9eef6"; g.fillRect(60, 40, 300, 190); g.fillStyle = "#3d6fc0"; g.fillRect(60, 40, 300, 22);
    g.fillStyle = "#9aa6b8"; for (let i = 0; i < 6; i++) g.fillRect(80, 80 + i * 22, 180 + ((i * 37) % 80), 8);
    g.fillStyle = "#0d1830"; g.fillRect(0, h - 26, w, 26);
    return;
  }
  g.fillStyle = "#eaf2ff"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#cfdaf0"; g.fillRect(0, 0, w, 30);
  g.fillStyle = "#1a1f2b"; g.font = "800 104px Montserrat, sans-serif"; g.textBaseline = "middle"; g.textAlign = "left";
  const x0 = 120, y = h / 2 + 14;
  g.fillText(typed, x0, y);
  if (cursor) { const tw = g.measureText(typed).width; g.fillRect(x0 + tw + 8, y - 50, 10, 100); }
};
/** the rules card: printed header, Rule 1 in full, Rule 2 half legible under scribbles, Rule 3 scratched out */
export const drawCard = (g: CanvasRenderingContext2D, w: number, h: number) => {
  g.fillStyle = "#f3efe2"; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(120,100,60,0.08)"; for (let i = 0; i < 30; i++) g.fillRect(0, i * 34, w, 2);
  g.fillStyle = "#1d1b22"; g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.font = "800 62px Montserrat, sans-serif"; g.fillText("NIGHT SHIFT", 56, 130);
  g.font = "800 44px Montserrat, sans-serif"; g.fillStyle = "#b2322a"; g.fillText("ELEVATOR RULES", 58, 190);
  g.fillStyle = "#1d1b22"; g.fillRect(56, 214, w - 112, 6);
  const lines = (txt: string[], y0: number, size: number) => { g.font = `700 ${size}px Montserrat, sans-serif`; txt.forEach((t, i) => g.fillText(t, 56, y0 + i * (size + 12))); };
  lines(["1. IF THE DOORS OPEN ON", "A FLOOR THAT IS NOT ON", "THE PANEL, DO NOT", "STEP OUT."], 300, 46);
  lines(["2. IF SOMEONE IS FACING", "THE WALL, NEVER LO"], 590, 40);
  // scribbles over rule 2 (half legible) and rule 3 (gone)
  const scrib = (x0: number, y0: number, x1: number, y1: number, n: number, k: number) => {
    g.strokeStyle = "#141218"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath();
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = i % 2 ? y0 : y1; if (i) g.lineTo(x + k * Math.sin(i * 1.7), y); else g.moveTo(x, y); }
    g.stroke();
  };
  scrib(430, 600, 680, 650, 13, 10);
  scrib(330, 560, 690, 610, 9, 8);
  scrib(50, 700, 690, 930, 22, 14);
  scrib(60, 760, 680, 900, 18, 10);
  // tape strips
  g.fillStyle = "rgba(240,232,200,0.75)"; g.save(); g.translate(w / 2, 18); g.rotate(-0.04); g.fillRect(-90, -24, 180, 48); g.restore();
  g.save(); g.translate(w / 2 + 40, h - 16); g.rotate(0.05); g.fillRect(-80, -22, 160, 44); g.restore();
};
/** phone lock screen: 23:59, battery 2 %, No Service */
export const drawPhone = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1b2140"); gr.addColorStop(1, "#090b17"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = "#e7ebf5"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "800 112px Montserrat, sans-serif"; g.fillText("23:59", w / 2, 210);
  g.font = "700 26px Montserrat, sans-serif"; g.fillStyle = "#aab3cc"; g.fillText("Friday", w / 2, 128);
  // status bar
  g.font = "700 22px Montserrat, sans-serif"; g.textAlign = "left"; g.fillStyle = "#e7ebf5"; g.fillText("No Service", 22, 30);
  g.strokeStyle = "#e7ebf5"; g.lineWidth = 3; g.strokeRect(w - 74, 20, 46, 22); g.fillRect(w - 27, 26, 4, 10);
  const blink = Math.floor(t * 2) % 2 === 0;
  g.fillStyle = "#ff3b30"; if (blink) g.fillRect(w - 71, 23, 4, 16);
  // big battery warning
  g.fillStyle = "rgba(255,59,48,0.16)"; g.beginPath(); g.roundRect(40, 380, w - 80, 190, 28); g.fill();
  g.strokeStyle = "#ff3b30"; g.lineWidth = 6; g.strokeRect(110, 420, 120, 58); g.fillStyle = "#ff3b30"; g.fillRect(232, 438, 10, 22); if (blink) g.fillRect(116, 426, 8, 46);
  g.font = "800 54px Montserrat, sans-serif"; g.textAlign = "left"; g.fillText("2%", 252, 450);
  g.font = "700 28px Montserrat, sans-serif"; g.fillStyle = "#ffd2cf"; g.textAlign = "center"; g.fillText("No signal", w / 2, 528);
};

/** every screen on floor zero: WELCOME TO THE NIGHT SHIFT / 7 FLOORS · 1 RULE EACH / THE ONLY WAY OUT IS DOWN / CLOCK OUT BEFORE 06:00 + countdown */
export const drawMessage = (g: CanvasRenderingContext2D, w: number, h: number, lines: number, left: number) => {
  g.fillStyle = "#04070d"; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.03)"; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#c9d3e6"; g.font = "800 24px Montserrat, sans-serif"; g.fillText("WELCOME TO THE", w / 2, 34);
  g.fillStyle = "#ffb347"; g.font = "900 52px Montserrat, sans-serif"; g.fillText("NIGHT SHIFT", w / 2, 80);
  g.fillStyle = "#e9eef6"; g.font = "800 26px Montserrat, sans-serif";
  if (lines >= 2) g.fillText("7 FLOORS \u00b7 1 RULE EACH", w / 2, 132);
  if (lines >= 3) g.fillText("THE ONLY WAY OUT IS DOWN", w / 2, 170);
  if (lines >= 4) {
    g.fillStyle = "#c9d3e6"; g.font = "800 22px Montserrat, sans-serif"; g.fillText("CLOCK  OUT  BEFORE  06:00", w / 2, 210);
    const hh = Math.floor(left / 3600), mm = Math.floor((left % 3600) / 60), ss = left % 60, p = (n: number) => String(n).padStart(2, "0");
    g.fillStyle = "#ff4a3a"; g.font = "900 54px Montserrat, sans-serif"; g.shadowColor = "#ff2a1a"; g.shadowBlur = 12;
    g.fillText(`${p(hh)}:${p(mm)}:${p(ss)}`, w / 2, 260); g.shadowBlur = 0;
  }
};
