// Light / colour presets per place and mood. Sky and fog are ON-SCREEN targets (world.ts pre-inverts the Neutral
// tone map with untone); lit/shade/lift drive the two-tone world shading (shade.ts TONE); tint multiplies the
// unlit character cards so they sit in the scene light; grade picks the post colour grade.
type C3 = [number, number, number];
export type Look = {
  sky: [string, string, string]; // horizon, ~15 deg, zenith
  ground?: string;               // below-horizon sky colour
  stars?: number; nebula?: string; sun?: string;
  fog: string; fogNear: number; fogFar: number;
  lit: C3; shade: C3; lift: C3; sat?: number;
  az: number; el: number;        // sun direction relative to the shot camera (deg): az 0 = backlight, 90 = from the right
  tint: string; grade: "day" | "golden"; vig?: number;
};
export const LOOKS = {
  day: { sky: ["#b8d0ec", "#6a9fe0", "#3373cc"], fog: "#b8d0ec", fogNear: 60, fogFar: 520, lit: [1.58, 1.5, 1.33], shade: [0.36, 0.35, 0.44], lift: [0.05, 0.06, 0.11], az: 75, el: 48, tint: "#ffffff", grade: "day" },
  golden: { sky: ["#ffc47c", "#e8967c", "#8a6f8a"], fog: "#efb489", fogNear: 60, fogFar: 520, lit: [1.5, 0.95, 0.55], shade: [0.2, 0.2, 0.38], lift: [0.04, 0.06, 0.17], az: 35, el: 14, tint: "#ffe2c4", grade: "golden", sun: "#ffcf9e" },
  dusk: { sky: ["#f2a77c", "#a77a9e", "#3c3f7a"], fog: "#c99096", fogNear: 60, fogFar: 520, lit: [1.4, 0.98, 0.78], shade: [0.34, 0.29, 0.44], lift: [0.05, 0.05, 0.16], az: 40, el: 10, tint: "#f6dccd", grade: "golden" },
  night: { sky: ["#3c4a7a", "#22285a", "#0e1030"], stars: 0.5, fog: "#2c3462", fogNear: 40, fogFar: 420, lit: [0.75, 0.8, 1.15], shade: [0.16, 0.17, 0.32], lift: [0.03, 0.04, 0.1], az: 120, el: 40, tint: "#b9c4ec", grade: "day" },
  snowNight: { sky: ["#5a6a9a", "#2c3468", "#141640"], stars: 0.4, fog: "#46527e", fogNear: 30, fogFar: 300, lit: [0.85, 0.9, 1.2], shade: [0.2, 0.22, 0.38], lift: [0.04, 0.05, 0.12], az: 120, el: 40, tint: "#c6d0f0", grade: "day" },
  space: { sky: ["#3a2a6a", "#1e1a46", "#0a0a1e"], ground: "#1a1238", stars: 1, nebula: "#8a3f9a", fog: "#2a2050", fogNear: 400, fogFar: 2400, lit: [1.45, 1.3, 1.25], shade: [0.22, 0.2, 0.42], lift: [0.05, 0.04, 0.12], az: 70, el: 30, tint: "#f0e6ff", grade: "day" },
  endtime: { sky: ["#c9a06a", "#6a4a8a", "#1c1440"], ground: "#2a1a40", stars: 0.8, nebula: "#d07a3a", fog: "#5a3a6a", fogNear: 300, fogFar: 2400, lit: [1.5, 1.25, 1.05], shade: [0.24, 0.2, 0.42], lift: [0.05, 0.04, 0.12], az: 40, el: 25, tint: "#ffe8d8", grade: "golden" },
  incursion: { sky: ["#c84a3a", "#6a1f3a", "#1a0a1e"], ground: "#2a0a1a", stars: 0.7, nebula: "#e0603a", fog: "#4a1a2a", fogNear: 400, fogFar: 2400, lit: [1.6, 1.1, 0.95], shade: [0.25, 0.15, 0.3], lift: [0.06, 0.03, 0.08], az: 50, el: 20, tint: "#ffd8cc", grade: "golden" },
  quantum: { sky: ["#f0a050", "#7a3f8a", "#1e2a5a"], ground: "#3a2a5a", stars: 0.3, nebula: "#4fd0a0", fog: "#8a5a7a", fogNear: 120, fogFar: 1400, lit: [1.4, 1.25, 1.1], shade: [0.25, 0.22, 0.45], lift: [0.06, 0.05, 0.14], az: 60, el: 30, tint: "#f6e4ff", grade: "golden" },
  tva: { sky: ["#3a2a1e", "#2a1e16", "#1a120c"], fog: "#5a4430", fogNear: 30, fogFar: 160, lit: [1.5, 1.2, 0.85], shade: [0.34, 0.26, 0.24], lift: [0.06, 0.04, 0.03], az: 150, el: 60, tint: "#ffe6c8", grade: "golden" },
  cave: { sky: ["#2a2420", "#1a1614", "#0e0c0a"], fog: "#3a2e24", fogNear: 12, fogFar: 70, lit: [1.6, 1.15, 0.7], shade: [0.22, 0.18, 0.24], lift: [0.04, 0.03, 0.05], az: 120, el: 35, tint: "#ffd8b0", grade: "golden" },
  snow: { sky: ["#dfe8f4", "#a9c4e6", "#6a94cc"], fog: "#dfe8f4", fogNear: 40, fogFar: 420, lit: [1.5, 1.52, 1.6], shade: [0.42, 0.48, 0.66], lift: [0.06, 0.08, 0.14], az: 80, el: 30, tint: "#f4f8ff", grade: "day" },
  desert: { sky: ["#f2d6a8", "#8ab8e6", "#3f7fd2"], fog: "#f0d8b0", fogNear: 80, fogFar: 700, lit: [1.62, 1.45, 1.2], shade: [0.4, 0.32, 0.42], lift: [0.06, 0.05, 0.1], az: 80, el: 45, tint: "#fff4e6", grade: "day" },
  battle: { sky: ["#c99a6a", "#8a6a5a", "#4a3a44"], fog: "#a8846a", fogNear: 40, fogFar: 380, lit: [1.45, 1.1, 0.8], shade: [0.26, 0.22, 0.32], lift: [0.05, 0.04, 0.08], az: 45, el: 20, tint: "#f6dcc4", grade: "golden" },
  void: { sky: ["#f0a050", "#c86a3a", "#6a3a3a"], fog: "#d8925a", fogNear: 40, fogFar: 420, lit: [1.6, 1.15, 0.7], shade: [0.32, 0.22, 0.3], lift: [0.06, 0.04, 0.06], az: 60, el: 25, tint: "#ffe0c0", grade: "golden" },
  ocean: { sky: ["#d6e8f0", "#7ab6e0", "#3a7fcc"], fog: "#cfe4ee", fogNear: 80, fogFar: 700, lit: [1.55, 1.5, 1.4], shade: [0.34, 0.38, 0.5], lift: [0.05, 0.07, 0.12], az: 70, el: 35, tint: "#ffffff", grade: "day" },
  retro: { sky: ["#f6e2c0", "#9ad0d8", "#3f9ab8"], fog: "#f0e0c4", fogNear: 80, fogFar: 700, lit: [1.58, 1.48, 1.3], shade: [0.38, 0.36, 0.46], lift: [0.06, 0.07, 0.12], az: 70, el: 40, tint: "#fffaf0", grade: "day" },
  retroNight: { sky: ["#3a4a7a", "#1e2a5a", "#0c1030"], stars: 0.5, fog: "#2a3462", fogNear: 20, fogFar: 300, lit: [1.3, 1.1, 0.85], shade: [0.16, 0.18, 0.34], lift: [0.03, 0.04, 0.1], az: 130, el: 35, tint: "#d6d6f0", grade: "golden" },
  storm: { sky: ["#6a7a5a", "#3a4a3a", "#141a1a"], stars: 0, fog: "#4a5448", fogNear: 40, fogFar: 380, lit: [1.2, 1.25, 1.1], shade: [0.18, 0.22, 0.24], lift: [0.03, 0.05, 0.05], az: 60, el: 35, tint: "#d6e6d0", grade: "day", vig: 0.3 },
} satisfies Record<string, Look>;
export type LookId = keyof typeof LOOKS;
