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
import { buildSet, SetHandles, digits, drawPanel, drawCallBtn, drawClock, drawMonitor, drawCard, drawPhone, PANEL_LABELS } from "./office";
import {
  FPS, SHOTS, SH, camAt, ShotDef, clamp01, smooth, span, CEIL, ROWS, WALL_Z, DOOR, CAB, LOBBY_Z, MY_DESK, MONITOR, RISE, ROW_OFF,
  CALL_PRESS, OPEN1, doorAt, PRESS_G, displayAt, NEW_BTN, ZERO_LIT, JOLT, BELL, CHAIR_TURN, TYPE, flickerAt, YOU_CAB,
} from "./story";

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
const ZERO_FROM = () => SH[8].a; // after the doors close the outside is floor zero
const OFF_GLOW: [number, number, number] = [0.07, 0.075, 0.085];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
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
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** which ceiling rows are lit (0 nearest the elevator): the real floor dies row by row; floor zero is fully lit */
  private rowOn(k: number, f: number) {
    if (f >= ZERO_FROM()) return 1;
    return f < ROW_OFF[k] ? 1 : f < ROW_OFF[k] + 2 ? 0.35 : 0;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], S = this.set;
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 80; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    // ---- wild walls ----
    for (const [k, list] of Object.entries(S.walls)) for (const o of list) o.visible = !s.hide?.includes(k as never);
    // ---- light pools ----
    const zero = f >= ZERO_FROM(), flick = flickerAt(f), open = doorAt(f);
    const roomCol = zero ? LIGHTS.zero.panel : LIGHTS.office.panel, roomGlow = zero ? LIGHTS.zero.panelGlow : LIGHTS.office.panelGlow;
    const P: PoolDef[] = [];
    const office = -(WALL_Z + 0.03), inCab = CAB.z0 - 0.04;
    ROWS.forEach((rz, k) => {
      const on = this.rowOn(k, f);
      S.rows[k].color.setRGB(...(roomGlow.map((v, i) => OFF_GLOW[i] + (v - OFF_GLOW[i]) * on) as [number, number, number]));
      if (on > 0) P.push({ x: 0, y: CEIL - 0.05, z: rz, hx: 5.2, hz: 0.4, r: 1.9, wrap: 0.3, clip: office, col: roomCol.map((v) => v * on) as [number, number, number] });
    });
    S.lobby.color.setRGB(...roomGlow);
    P.push({ x: 0, y: CEIL - 0.05, z: LOBBY_Z, hx: 4.0, hz: 0.35, r: 1.9, wrap: 0.3, clip: office, col: roomCol.map((v) => v * 0.9) as [number, number, number] });
    const cabC = LIGHTS.cab.panel.map((v) => v * flick) as [number, number, number];
    S.cabLight.color.setRGB(...(LIGHTS.cab.panelGlow.map((v) => v * (0.15 + 0.85 * flick)) as [number, number, number]));
    P.push({ x: 0, y: CAB.h - 0.04, z: (CAB.z0 + CAB.z1) / 2, hx: 0.6, hz: 0.65, r: 1.5, wrap: 0.45, clip: inCab, col: cabC });
    if (open > 0.02) P.push({ x: 0, y: 1.3, z: WALL_Z + 0.05, hx: DOOR.hw * open, hz: 0.05, r: 1.4, wrap: 0.2, clip: office, col: cabC.map((v) => v * 0.55 * open) as [number, number, number] });
    // your monitor: a soft glow on your desk (and on you in shot 1)
    const monOn = zero || f < RISE + 30;
    if (monOn) P.push({ x: MONITOR[0], y: MONITOR[1], z: MONITOR[2] + 0.02, hx: 0.25, hz: 0.02, r: 0.7, wrap: 0.1, clip: office, col: zero ? [0.9, 1.0, 1.15] : [0.35, 0.45, 0.8] });
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
    // ---- fog: the dark past the lit rows ----
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; this.bg.copy(this.fog.color); scene.background = null;
    // ---- doors ----
    const dw = DOOR.hw + 0.02;
    S.doorL.position.x = -dw / 2 - open * (dw - 0.02); S.doorR.position.x = dw / 2 + open * (dw - 0.02);
    // ---- chairs: tucked in and facing the desks on the real floor; all turned to face the elevator on floor zero ----
    for (const ch of S.chairs) {
      const [dx, dz] = ch.desk, j = Math.sin(ch.i * 3.7), j2 = Math.cos(ch.i * 5.1);
      if (!zero) {
        let z = dz + 0.82 + 0.06 * j, yaw = Math.PI + 0.12 * j2;
        if (ch.mine) { const u = smooth((f - RISE) / 10); z = dz + 0.82 + 0.32 * u; yaw = Math.PI + 0.5 * u; }
        ch.g.position.set(dx + 0.05 * j2, 0, z); ch.g.rotation.y = yaw;
      } else {
        let yaw = 0.04 * j;
        const near = dz > -1.5 && dx > 0; // the two right-hand chairs in the first row finish turning while we watch
        if (near) yaw = (0.75 + 0.3 * j2) * (1 - span(f, CHAIR_TURN[0] + (dx > 4 ? 10 : 0), CHAIR_TURN[1]));
        ch.g.position.set(dx + (ch.mine ? 0.75 : 0.06 * j2), 0, dz + (ch.mine ? 1.35 : 1.08)); ch.g.rotation.y = yaw;
      }
    }
    // ---- screens ----
    const disp = displayAt(f);
    S.display.draw("d" + disp, (g, w, h) => digits(g, w, h, disp, disp === "0" ? "#ff5a46" : "#ffb347"));
    S.displayMat.color.setScalar(1.3 + 0.6 * flick);
    const outD = zero ? "0" : f < OPEN1 ? "12" : disp;
    S.displayOut.draw("o" + outD, (g, w, h) => digits(g, w, h, outD, outD === "0" ? "#ff5a46" : "#ffb347"));
    const shown = new Set<string>(), lit = new Set<string>();
    const basement = PANEL_LABELS.slice(7, 11).flat();
    basement.forEach((lab, i) => { if (f >= NEW_BTN[i]) { shown.add(lab); lit.add(lab); } });
    if (f >= PRESS_G && f < JOLT) lit.add("G");
    if (f >= ZERO_LIT) lit.add("0");
    if (f >= BELL && f < BELL + 120) lit.add("BELL");
    const pk = [...shown].join(",") + "|" + [...lit].join(",");
    S.panel.draw("p" + pk, (g, w, h) => drawPanel(g, w, h, shown, lit, false));
    S.panelGlow.draw("g" + pk, (g, w, h) => drawPanel(g, w, h, shown, lit, true));
    // newly lit basement buttons flare as they appear
    const flare = Math.max(0, ...NEW_BTN.map((a) => (f >= a && f < a + 8 ? 1 - (f - a) / 8 : 0)));
    S.panelMat.color.setScalar(0.62 + 0.3 * flick);
    S.panelGlowMat.color.setScalar(1.4 + 1.2 * flare);
    const call = f >= CALL_PRESS && f < OPEN1 + 20;
    S.callBtn.draw(call ? "c1" : "c0", (g, w, h) => drawCallBtn(g, w, h, call));
    S.callMat.color.setScalar(call ? 1.3 : 0.85);
    const typed = "YOU".slice(0, TYPE.filter((a) => f >= a).length), cur = Math.floor(f / 12) % 2 === 0;
    const mode = zero ? "type" : f < RISE + 30 ? "desk" : "off";
    S.monitor.draw(`${mode}|${typed}|${mode === "type" && cur}`, (g, w, h) => drawMonitor(g, w, h, mode, typed, cur));
    S.monitorMat.color.setScalar(mode === "type" ? 1.55 : mode === "desk" ? 1.1 : 1);
    if (id <= 4) { const ct = 23 * 3600 + 58 * 60 + 12 + t; S.clock.draw("k" + Math.round(ct * 15), (g, w, h) => drawClock(g, w, h, ct)); }
    S.exit.color.setScalar(1.6);
    // ---- the phone (POV in shot 10) ----
    S.phone.visible = id === 10;
    if (id === 10) {
      const rise = smooth((f - SH[10].a) / 10), fwd = V(0, 0, 0), right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1);
      cam.getWorldDirection(fwd);
      S.phone.position.copy(cam.position).addScaledVector(fwd, 0.3).addScaledVector(up, -0.035 - 0.2 * (1 - rise)).addScaledVector(right, 0.012);
      S.phone.quaternion.copy(cam.quaternion);
      S.phone.rotateX(0.12 + 0.02 * Math.sin(t * 2.1)); S.phone.rotateZ(-0.05 + 0.015 * Math.sin(t * 1.7));
      S.phoneScreen.draw("ph" + Math.floor(t * 2), (g, w, h) => drawPhone(g, w, h, t));
    }

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
export const _keep = { clamp01, JOLT, YOU_CAB, MY_DESK };
