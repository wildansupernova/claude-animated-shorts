// Light presets for "Floor Zero" (interiors at night). Linear multipliers for shade.ts; fog colours are on-screen targets
// (world.ts pre-inverts the tone map). The overhead key only casts shadows (az = degrees from the shot camera's forward
// axis, el = elevation); the visible light comes from the ceiling pools world.ts builds per frame.
type C3 = [number, number, number];
export type LightName = "office" | "cab" | "zero";
export type LightPreset = {
  az: number; el: number;
  amb: C3; shadowK: number; sat: number;
  panel: C3;            // pool colour x intensity of one ceiling panel row
  panelGlow: C3;        // emissive colour of the panel diffusers (bloom above 1)
  fog: string; fogNear: number; fogFar: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  cardGain: number;     // character card brightness relative to the pool light at the card
};
export const LIGHTS: Record<LightName, LightPreset> = {
  // the real office at 23:58: cool white fluorescent rows, navy darkness beyond the lit rows
  office: {
    az: 110, el: 68,
    amb: [0.012, 0.016, 0.03], shadowK: 0.5, sat: 0.95,
    panel: [0.78, 0.82, 0.92], panelGlow: [2.4, 2.5, 2.7],
    fog: "#070b16", fogNear: 4, fogFar: 19,
    charTint: [0.97, 0.98, 1.04], charShade: 0.8, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.85, 0.88, 1.0],
    cardGain: 0.9,
  },
  // inside the elevator: one flat greenish fluorescent ceiling, brushed steel
  cab: {
    az: 100, el: 72,
    amb: [0.03, 0.04, 0.035], shadowK: 0.55, sat: 0.92,
    panel: [1.05, 1.3, 1.0], panelGlow: [2.2, 2.9, 2.1],
    fog: "#0a120e", fogNear: 9, fogFar: 30,
    charTint: [0.95, 1.04, 0.94], charShade: 0.8, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.86, 0.95, 0.9],
    cardGain: 1.0,
  },
  // floor zero: your office, but every light on in a sick cyan-green, and the dark starts closer
  zero: {
    az: 100, el: 70,
    amb: [0.01, 0.025, 0.022], shadowK: 0.42, sat: 0.85,
    panel: [0.62, 1.05, 0.88], panelGlow: [1.6, 2.6, 2.2],
    fog: "#040d0b", fogNear: 3.5, fogFar: 17,
    charTint: [0.92, 1.04, 0.98], charShade: 0.78, charGrad: 0.09, bodyGrad: 0.24, sideTint: [0.82, 0.95, 0.92],
    cardGain: 0.85,
  },
};
