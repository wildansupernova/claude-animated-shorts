// The whole place as one three.js scene (office + elevator, office.ts) posed per frame from the story timeline:
// update(id, f, camera) sets the camera and the wild walls, lights the room from the ceiling pools (rows switching off
// one by one, the car light flickering, the lit car spilling out of the open doors, your monitor's glow), slides the
// doors, turns the chairs, redraws every screen that changed (floor displays, car panel, call button, monitor, clock,
// phone), then places the cast from cast.ts, each card lit by the pools at its position. A pure function of (id, f).
import * as THREE from "three";
import { staticFile } from "remotion";
import { Kit } from "./build";
import { LIGHTS } from "./lights";
import { POOL, CHAR, PoolDef, poolAt, untone, MAXP } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { buildFlood, FloodHandles, GHOST } from "./flood";
import { buildSet, SetHandles, digits, drawPanel, drawCallBtn, drawClock, drawMonitor, drawCard, drawMessage, PANEL_LABELS } from "./office";
import {
  FPS, SHOTS, SH, camAt, ShotDef, CEIL, ROWS, WALL_Z, DOOR, CAB, LOBBY_Z, MONITOR, doorAt, displayOutAt, displayInAt, cabLightAt,
  screensOnAt, messageAt, stairOpenAt, shadowAt, PANEL_DARK, STAIR,
  floorAt, rowOnAt, TORCH, LAMP_FLICK, LAMP_DIE, BLACKS, lobbyOnAt, torchOn, climbPos, cctvAt, FAR_DOOR, WATER,
} from "./story";
import { drawCCTV, clockOf } from "./cctv";

// ---------------- assets: fonts (canvas text + captions); no external models ----------------
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const faces = [
      new FontFace("Fredoka", `url(${staticFile("fonts/fredoka-latin-700-normal.woff2")})`, { weight: "700" }),
      new FontFace("Montserrat", `url(${staticFile("fonts/montserrat-latin-900-normal.woff2")})`, { weight: "900" }),
      new FontFace("Montserrat", `url(${staticFile("fonts/montserrat-latin-800-normal.woff2")})`, { weight: "800" }),
      new FontFace("Montserrat", `url(${staticFile("fonts/montserrat-latin-700-normal.woff2")})`, { weight: "700" }),
    ];
    kitP = Promise.all(faces.map((f) => f.load().then((ff) => { (document.fonts as unknown as { add(x: FontFace): void }).add(ff); }).catch(() => undefined))).then(() => ({} as Kit));
  }
  return kitP;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const OFF_GLOW: [number, number, number] = [0.07, 0.075, 0.085];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private ghosts: Actor[] = [];
  private flood: FloodHandles;
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#0b1020", 7, 26);
  private bg = new THREE.Color();
  private set: SetHandles;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private pools: PoolDef[] = [];

  constructor(_kit: Kit) {
    this.sun = new THREE.DirectionalLight("#ffffff", 1.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.root.add(this.sun, this.sun.target);
    this.set = buildSet(this.root);
    this.set.card.draw("card", drawCard);
    this.flood = buildFlood(this.root, this.set.exit);
  }

  private shotSun(id: number, s: ShotDef, az0: number, el0: number) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? az0), el = THREE.MathUtils.degToRad(s.sunEl ?? el0);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private ghost(i: number) { while (this.ghosts.length <= i) { const a = new Actor(this.root); a.mesh.layers.set(GHOST); this.ghosts.push(a); } return this.ghosts[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }


  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], S = this.set, _m = MONITOR;
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 80; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    // ---- wild walls ----
    for (const [k, list] of Object.entries(S.walls)) for (const o of list) o.visible = !s.hide?.includes(k as never);
    // ---- light pools: floor zero is fully lit (sick green); the car light can die; the screens glow once they wake ----
    const cab = cabLightAt(f), open = doorAt(f), scr = screensOnAt(f), fl = floorAt(f);
    const RL = fl === -1 ? LIGHTS.flood : fl === -3 ? LIGHTS.cctv : LIGHTS.zero, roomCol = RL.panel, roomGlow = RL.panelGlow;
    const P: PoolDef[] = [];
    const office = -(WALL_Z + 0.03), inCab = CAB.z0 - 0.04;
    // the stairwell's red emergency lamp (it gasps once, then dies after the end) and your phone light
    const sx = (STAIR.x0 + STAIR.x1) / 2;
    let lampK = 1;
    if (f >= LAMP_FLICK && f < LAMP_FLICK + 16) { const h = Math.sin(f * 12.9898) * 43758.5453; lampK = h - Math.floor(h) < 0.5 ? 0.15 : 0.9; }
    for (const [a, b] of BLACKS) if (f >= a && f < b) lampK = 0;
    if (s.light === "stair") {
      P.push({ x: sx + 0.2, y: 2.2, z: 4.6, hx: 0.9, hz: 1.5, r: 2.6, wrap: 0.45, clip: inCab, col: [1.1 * lampK, 0.16 * lampK, 0.12 * lampK] });
      if (f >= TORCH[0] && f < TORCH[1]) P.push({ x: sx, y: -0.65, z: 5.15, hx: 0.38, hz: 0.5, r: 1.4, wrap: 0.3, clip: inCab, col: [0.95, 0.9, 0.78] });
    }
    S.stairLamp.color.setRGB(3.2 * lampK * (0.9 + 0.1 * Math.sin(t * 9)), 0.5 * lampK, 0.35 * lampK);
    ROWS.forEach((rz, k) => {
      const on = rowOnAt(f, k);
      S.rows[k].color.setRGB(...(on ? roomGlow : [0.02, 0.03, 0.035] as [number, number, number]));
      if (on) P.push({ x: 0, y: CEIL - 0.05, z: rz, hx: 5.2, hz: 0.4, r: 1.9, wrap: 0.3, clip: office, col: roomCol });
      if (scr) P.push({ x: 0, y: 1.15, z: rz - 0.2, hx: 5.0, hz: 0.25, r: 1.1, wrap: 0.2, clip: office, col: [0.12, 0.3, 0.17] });
    });
    const lob = lobbyOnAt(f);
    S.lobby.color.setRGB(...(lob ? roomGlow : [0.02, 0.03, 0.035] as [number, number, number]));
    if (lob) P.push({ x: 0, y: CEIL - 0.05, z: LOBBY_Z, hx: 4.0, hz: 0.35, r: 1.9, wrap: 0.3, clip: office, col: roomCol.map((v) => v * 0.9) as [number, number, number] });
    // the far stairs door's EXIT glow (-1 and -3), and your phone light while you climb in the dark
    if (fl === -1 || fl === -3) P.push({ x: FAR_DOOR.x, y: 2.4, z: FAR_DOOR.z + 0.35, hx: 0.45, hz: 0.2, r: 2.4, wrap: 0.3, clip: office, col: [0.1, 0.5, 0.22] });
    if (fl === -1 && torchOn(f)) { const p = climbPos(f); P.push({ x: p[0] - 0.15, y: p[1] + 1.4, z: p[2] - 0.35, hx: 0.15, hz: 0.15, r: 3.2, wrap: 0.4, clip: office, col: [0.85, 0.9, 0.95] }); }
    const cabC = LIGHTS.cab.panel.map((v) => v * cab) as [number, number, number];
    S.cabLight.color.setRGB(...(LIGHTS.cab.panelGlow.map((v) => v * (0.05 + 0.95 * cab)) as [number, number, number]));
    P.push({ x: 0, y: CAB.h - 0.04, z: (CAB.z0 + CAB.z1) / 2, hx: 0.6, hz: 0.65, r: 1.5, wrap: 0.45, clip: inCab, col: cabC });
    if (open > 0.02) P.push({ x: 0, y: 1.3, z: WALL_Z + 0.05, hx: DOOR.hw * open, hz: 0.05, r: 1.4, wrap: 0.2, clip: office, col: cabC.map((v) => v * 0.55 * open) as [number, number, number] });
    const so = stairOpenAt(f);
    if (so > 0.02) P.push({ x: (STAIR.x0 + STAIR.x1) / 2, y: 1.0, z: WALL_Z - 0.05, hx: 0.4 * so, hz: 0.05, r: 1.2, wrap: 0.2, clip: office, col: [0.9 * so, 0.12 * so, 0.08 * so] });
    this.pools = P.slice(0, MAXP);
    POOL.uPN.value = this.pools.length;
    this.pools.forEach((q, i) => { POOL.uPA.value[i].set(q.x, q.y, q.z, q.hx); POOL.uPB.value[i].set(q.hz, q.r, q.wrap, q.clip); POOL.uPC.value[i].set(q.col[0], q.col[1], q.col[2], 0); });
    POOL.uViewInv.value.copy(cam.matrixWorld);
    POOL.uAmb.value.set(...L.amb); POOL.uShadowK.value = L.shadowK; POOL.uSat.value = L.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- the overhead key (shadows only) ----
    const sunDir = this.shotSun(id, s, L.az, L.el);
    const Rr = THREE.MathUtils.clamp(cam.position.distanceTo(focus) * 1.2 + 3, 4, 14);
    this.sun.position.copy(focus).addScaledVector(sunDir, 30); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 1; sc.far = 60; sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.01 * (Rr / 6);
    // ---- fog ----
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    // ---- doors: the car doors, the stairwell door and the shadow climbing its stairs ----
    const dw = DOOR.hw + 0.02;
    S.doorL.position.x = -dw / 2 - open * (dw - 0.02); S.doorR.position.x = dw / 2 + open * (dw - 0.02);
    S.stairDoor.rotation.y = -so * (Math.PI / 2);
    // inside the stairwell the fire door reads red (from the office side it stays grey-green)
    ((S.stairDoor.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial).color.set(s.light === "stair" ? "#4a1614" : "#6b7a72");
    const sh = shadowAt(f);
    S.stairShadow.visible = so > 0.1 && sh > 0; S.stairShadow.position.y = -1.3 + 2.0 * sh;
    (S.stairShadow.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.min(1, so * 2) * (sh > 0 ? 1 : 0.4);
    // ---- chairs: all turned to face the elevator ----
    for (const ch of S.chairs) {
      const [dx, dz] = ch.desk, j = Math.sin(ch.i * 3.7), j2 = Math.cos(ch.i * 5.1);
      if (fl === -1) { ch.g.position.set(dx + 0.35 * j2, 0, dz + 0.9 + 0.3 * j); ch.g.rotation.y = 2.4 * j; }
      else { ch.g.position.set(dx + (ch.mine ? 0.75 : 0.06 * j2), 0, dz + (ch.mine ? 1.35 : 1.08)); ch.g.rotation.y = 0.04 * j; }
    }
    // ---- -1: the water, the sign, the far door, the taped stairwell ----
    this.flood.group.visible = fl === -1;
    this.flood.props.visible = fl === -1 || fl === -3;
    this.flood.sign.map = fl === -3 ? this.flood.signTex.m3 : this.flood.signTex.m1;
    this.flood.sign.color.setRGB(...((fl === -3 ? [0.55, 0.7, 0.58] : [0.55, 0.62, 0.62]) as [number, number, number]));
    this.flood.cctvCam.visible = fl === -3;
    // ---- screens ----
    const dIn = displayInAt(f), dOut = displayOutAt(f);
    S.display.draw("d" + dIn, (g, w, h) => digits(g, w, h, dIn, "#ff5a46"));
    S.displayMat.color.setScalar(dIn === " " ? 0.3 : 1.3 + 0.6 * cab);
    S.displayOut.draw("o" + dOut, (g, w, h) => digits(g, w, h, dOut, "#ff5a46"));
    S.displayOutMat.color.setScalar(dOut === " " ? 0.25 : 1.6);
    const dark = f >= PANEL_DARK && f < SH[11].a;
    const shown = new Set<string>(PANEL_LABELS.slice(7, 11).flat()), lit = new Set<string>(dark ? [] : ["0"]);
    const pk = [...lit].join(",");
    S.panel.draw("p" + pk, (g, w, h) => drawPanel(g, w, h, shown, lit, false));
    S.panelGlow.draw("g" + pk, (g, w, h) => drawPanel(g, w, h, shown, lit, true));
    S.panelMat.color.setScalar(dark ? 0.1 + 0.25 * cab : 0.62 + 0.3 * cab);
    S.panelGlowMat.color.setScalar(dark ? 0 : 1.4);
    S.callBtn.draw("c0", (g, w, h) => drawCallBtn(g, w, h, false));
    S.callMat.color.setScalar(0.85);
    const m = messageAt(f), mk = `${m.lines}|${m.left}`;
    // -3: every monitor shows the same live security feed
    const cc = cctvAt(f), ck = `cc|${f}`;
    const drawCc = (g: CanvasRenderingContext2D, w: number, h: number) => drawCCTV(g, w, h, { t: cc.t, raise: cc.raise, fig: cc.fig, clock: clockOf(cc.left), grain: false });
    if (scr) { if (fl === -3) S.msg.draw(ck, drawCc); else S.msg.draw(mk, (g, w, h) => drawMessage(g, w, h, m.lines, m.left)); }
    S.screens.map = scr ? S.msg.tex : null; S.screens.color.setRGB(...((scr ? [1.35, 1.35, 1.35] : [0.035, 0.04, 0.055]) as [number, number, number]));
    S.screens.fog = !scr; S.screens.needsUpdate = true;
    const cur = Math.floor(f / 12) % 2 === 0;
    if (scr && fl === -3) { S.monitor.draw(ck, drawCc); S.monitorMat.color.setScalar(1.35); }
    else if (scr) { S.monitor.draw("msg" + mk, (g, w, h) => drawMessage(g, w, h, m.lines, m.left)); S.monitorMat.color.setScalar(1.35); }
    else if (fl === -1 || fl === -2) { S.monitor.draw("off", (g, w, h) => { g.fillStyle = "#04070b"; g.fillRect(0, 0, w, h); }); S.monitorMat.color.setScalar(0.06); }
    else { S.monitor.draw(`type|YOU|${cur}`, (g, w, h) => drawMonitor(g, w, h, "type", "YOU", cur)); S.monitorMat.color.setScalar(1.55); }
    { const ct = 0 * 3600 + 1 * 60 + 20 + t; S.clock.draw("k" + Math.round(ct * 15), (g, w, h) => drawClock(g, w, h, ct)); }
    S.exit.color.setScalar(1.6);
    S.phone.visible = false;

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1), fwd = V(0, 0, 0);
    cam.getWorldDirection(fwd);
    const st = stage(id, f, { pos: cam.position, right, up, fwd });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const amb = V(...L.amb), n = V(0, 0, 0), lp = V(0, 0, 0), lc = V(0, 0, 0);
    const lightAt = (x: number, y: number, z: number, k: number) => {
      lp.set(x, y, z); n.set(cam.position.x - x, 0, cam.position.z - z).normalize();
      poolAt(this.pools, lp, n, amb, lc).multiplyScalar(k);
      return lc.set(Math.min(1.25, Math.max(0.04, lc.x)), Math.min(1.25, Math.max(0.04, lc.y)), Math.min(1.25, Math.max(0.04, lc.z)));
    };
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.0 * sc2, p.z), 1.3 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = true;
      const lt = lightAt(p.x, p.y + 1.25 * sc2, p.z, L.cardGain * (p.light ?? 1));
      a.mat.color.setRGB(lt.x, lt.y, lt.z);
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let gi = 0;
    for (const p of st.ghosts ?? []) {
      const sc2 = p.scale ?? 1, a = this.ghost(gi++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      // a reflection-only card is seen by the water's mirrored camera (below the floor): pitch it to face that camera,
      // or a steep look down into the water sees it almost edge-on
      const vy = 2 * WATER.y - cam.position.y, dh = Math.hypot(cam.position.x - p.x, cam.position.z - p.z);
      a.mesh.rotation.set(Math.min(0.85, Math.atan2(p.y + 1.0 * sc2 - vy, Math.max(0.05, dh))), p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = false;
      const lt = lightAt(p.x, p.y + 1.25 * sc2, p.z, L.cardGain * (p.light ?? 1));
      a.mat.color.setRGB(lt.x, lt.y, lt.z);
      used.push(a);
    }
    for (let i = gi; i < this.ghosts.length; i++) this.ghosts[i].mesh.visible = false;
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
      e2.mat.depthTest = !p.top; e2.soft.depthTest = !p.top;
      const col = p.tint !== undefined ? lightAt(p.x, p.y, p.z, 1.0) : lc.set(1, 1, 1);
      e2.mat.color.setRGB(col.x, col.y, col.z); e2.soft.color.setRGB(col.x, col.y, col.z);
      e2.userTop = !!p.top;
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) { e2.bind(); if (e2.userTop) e2.mesh.renderOrder = 4; }
    return focus;
  }
}

