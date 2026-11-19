// Camera motion blur for whips, snap zooms, spins and fast fly-throughs. The camera's own motion over the shutter
// is reduced to one screen-space affine path: a translation (vel, uv units), a rotation about the frame centre (rot,
// radians) and a scale about the centre (zoom, fraction). Each pixel averages 16 taps along that path. When the
// camera barely moves the effect copies its input, so gentle moves stay crisp.
import { Effect } from "postprocessing";
import * as THREE from "three";
import { Cam, basis, sub, len, dot } from "./moves";

const frag = /* glsl */ `
uniform vec2 vel; uniform float rot; uniform float zoom; uniform float aspect;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (abs(vel.x) + abs(vel.y) + abs(rot) + abs(zoom) < 1e-5) { outputColor = inputColor; return; }
  vec4 acc = vec4(0.0);
  vec2 c = uv - 0.5; c.x *= aspect;
  for (int i = 0; i < 16; i++) {
    float s = float(i) / 15.0 - 0.5;
    float a = rot * s, k = 1.0 + zoom * s;
    vec2 p = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a)) * k;
    p.x /= aspect;
    acc += texture2D(inputBuffer, clamp(p + 0.5 + vel * s, 0.001, 0.999));
  }
  outputColor = acc / 16.0;
}`;
export class MotionBlur extends Effect {
  constructor() {
    super("MotionBlur", frag, { uniforms: new Map<string, THREE.Uniform>([
      ["vel", new THREE.Uniform(new THREE.Vector2())], ["rot", new THREE.Uniform(0)], ["zoom", new THREE.Uniform(0)], ["aspect", new THREE.Uniform(9 / 16)],
    ]) });
  }
  set(v: { vel: [number, number]; rot: number; zoom: number }, aspect: number) {
    (this.uniforms.get("vel")!.value as THREE.Vector2).set(v.vel[0], v.vel[1]);
    this.uniforms.get("rot")!.value = v.rot; this.uniforms.get("zoom")!.value = v.zoom; this.uniforms.get("aspect")!.value = aspect;
  }
}

/** screen motion of the camera between two poses (a = earlier, b = now), as the blur path. The look-distance plane
 *  stands in for the scene depth (right for pans, tilts, rolls and zooms; approximate for fast travel). */
export const camMotion = (a: Cam, b: Cam, aspect = 9 / 16) => {
  const A = basis(a), Bb = basis(b);
  const D = Math.max(0.3, len(sub(a.look, a.pos)));
  // where the earlier frame's centre point lands in the current frame
  const p = sub(a.look, b.pos), z = dot(p, Bb.fw);
  const ty = Math.tan(((b.fov * Math.PI) / 180) / 2), tx = ty * aspect;
  let vx = 0, vy = 0;
  if (z > 0.05) { vx = dot(p, Bb.rt) / (z * tx) / 2; vy = dot(p, Bb.up) / (z * ty) / 2; }
  const rot = -(b.roll - a.roll);
  const sa = 1 / (Math.tan(((a.fov * Math.PI) / 180) / 2) * D), sb = 1 / (ty * Math.max(0.3, len(sub(b.look, b.pos))));
  void A;
  return { vel: [vx, vy] as [number, number], rot, zoom: sb / sa - 1 };
};
/** blur amount below which nothing is applied (about 1.5 px of travel at the frame edge) */
export const blurTiny = (m: { vel: [number, number]; rot: number; zoom: number }, H: number) =>
  Math.abs(m.vel[0]) * H * 0.56 + Math.abs(m.vel[1]) * H + Math.abs(m.rot) * H * 0.5 + Math.abs(m.zoom) * H * 0.5 < 1.5;
