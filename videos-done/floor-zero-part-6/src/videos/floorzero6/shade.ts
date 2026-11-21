// Interior lighting for "Floor Zero" (night office + elevator), replacing the bridge's sun two-tone: every world
// material is lit by up to 16 ceiling "pools" (rectangular area lights: the fluorescent panels) with a soft falloff
// and a wrap term, plus a dim ambient. The one directional light is an overhead key that only casts the shadows
// (contact shadows under desks, chairs and people); its shadow visibility darkens the pool light. Rows of pools can
// switch off one by one, the elevator light can flicker: world.ts sets the uniforms every frame, and `poolAt` gives
// the same light on the CPU for the character cards.
import * as THREE from "three";

export const MAXP = 16;
/** A = (cx, cy, cz, half x), B = (half z, falloff radius, wrap, clip z: >0 lights only z >= clip, <0 only z <= -clip), C = colour x intensity */
export const POOL = {
  uPA: { value: Array.from({ length: MAXP }, () => new THREE.Vector4()) },
  uPB: { value: Array.from({ length: MAXP }, () => new THREE.Vector4()) },
  uPC: { value: Array.from({ length: MAXP }, () => new THREE.Vector4()) },
  uPN: { value: 0 },
  uViewInv: { value: new THREE.Matrix4() },
  uAmb: { value: new THREE.Vector3(0.02, 0.025, 0.04) },
  uShadowK: { value: 0.45 },
  uSat: { value: 1 },
};
/** kept for files that still import it */
export const TONE = POOL;
/** character-card uniforms; world.ts keeps them in sync with the preset */
export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1, 0.97, 0.95) }, uCharShade: { value: 0.8 }, uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 }, uSideTint: { value: new THREE.Vector3(0.9, 0.9, 1.0) },
};

// directional light 0 = the overhead key = the only shadow caster. Only the unrolled index 0 compiles the shadow block.
export const LFB = THREE.ShaderChunk.lights_fragment_begin
  .replace("directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
    "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]")
  .replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;");
if (!LFB.includes("directLight.color *= sunVis")) throw new Error("shade.ts: three lights_fragment_begin changed");

const POOLS = /* glsl */ `
{
  vec3 P = ( uViewInv * vec4( - vViewPosition, 1.0 ) ).xyz;
  vec3 Nw = normalize( ( uViewInv * vec4( geometryNormal, 0.0 ) ).xyz );
  vec3 pool = vec3( 0.0 );
  for ( int i = 0; i < ${MAXP}; i ++ ) {
    if ( i >= uPN ) break;
    vec4 A = uPA[ i ]; vec4 B = uPB[ i ];
    if ( ( B.w > 0.0 && P.z < B.w ) || ( B.w < 0.0 && P.z > - B.w ) ) continue; // clip: cab-only / office-only light
    vec3 q = vec3( clamp( P.x, A.x - A.w, A.x + A.w ), A.y, clamp( P.z, A.z - B.x, A.z + B.x ) );
    vec3 L = q - P; float d2 = dot( L, L ) + 0.02;
    float fall = B.y * B.y / ( B.y * B.y + d2 );
    float nl = max( dot( Nw, L * inversesqrt( d2 ) ), 0.0 );
    pool += uPC[ i ].rgb * fall * mix( B.z, 1.0, nl );
  }
  float vis = mix( uShadowK, 1.0, sunVis );
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  reflectedLight.directDiffuse = alb * ( uAmb + pool * vis );
  reflectedLight.indirectDiffuse = vec3( 0.0 );
  reflectedLight.directSpecular *= vis * 0.5;
}
`;
const DECL = `#include <common>
uniform vec4 uPA[ ${MAXP} ]; uniform vec4 uPB[ ${MAXP} ]; uniform vec4 uPC[ ${MAXP} ]; uniform int uPN;
uniform mat4 uViewInv; uniform vec3 uAmb; uniform float uShadowK; uniform float uSat;`;

/** Lambert (or Phong) -> pool-lit interior material. Call once per material. */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, _liftK = 1): T {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, POOL);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + POOLS);
  };
  m.customProgramCacheKey = () => "pools2";
  return m;
}

// ---------------- CPU mirror (cards) ----------------
export type PoolDef = { x: number; y: number; z: number; hx: number; hz: number; r: number; wrap: number; clip: number; col: [number, number, number] };
/** light reaching a vertical card at p facing direction n (unit, world), same formula as the shader, no shadows */
export const poolAt = (pools: PoolDef[], p: THREE.Vector3, n: THREE.Vector3, amb: THREE.Vector3, out = new THREE.Vector3()) => {
  out.copy(amb);
  for (const q of pools) {
    if ((q.clip > 0 && p.z < q.clip) || (q.clip < 0 && p.z > -q.clip)) continue;
    const qx = Math.min(Math.max(p.x, q.x - q.hx), q.x + q.hx), qz = Math.min(Math.max(p.z, q.z - q.hz), q.z + q.hz);
    const lx = qx - p.x, ly = q.y - p.y, lz = qz - p.z, d2 = lx * lx + ly * ly + lz * lz + 0.02, il = 1 / Math.sqrt(d2);
    const fall = (q.r * q.r) / (q.r * q.r + d2), nl = Math.max(0, (n.x * lx + n.y * ly + n.z * lz) * il);
    const k = fall * (q.wrap + (1 - q.wrap) * nl);
    out.x += q.col[0] * k; out.y += q.col[1] * k; out.z += q.col[2] * k;
  }
  return out;
};

// ---------------- tone-map inversion ----------------
const neutral = (c: number[]) => {
  const x = Math.min(c[0], c[1], c[2]), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const v = c.map((k) => k - off), peak = Math.max(v[0], v[1], v[2]), S = 0.76;
  if (peak < S) return v;
  const d = 1 - S, np = 1 - (d * d) / (peak + d - S), g = 1 - 1 / (0.15 * (peak - np) + 1);
  return v.map((k) => (k * np) / peak * (1 - g) + np * g);
};
/** linear input that the Neutral tone map turns into the given on-screen colour (hex or THREE.Color, sRGB target) */
export const untone = (target: THREE.ColorRepresentation, out = new THREE.Color()) => {
  const t = new THREE.Color(target);
  const tt = [t.r, t.g, t.b].map((k) => Math.min(k, 0.985));
  let c = tt.slice();
  for (let i = 0; i < 60; i++) { const y = neutral(c); c = c.map((k, j) => Math.max(0, k + (tt[j] - y[j]))); }
  return out.setRGB(c[0], c[1], c[2]);
};
