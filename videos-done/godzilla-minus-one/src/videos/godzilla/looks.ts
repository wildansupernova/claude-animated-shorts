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
  day: { sky: ["#b8d0ec", "#6a9fe0", "#3373cc"], fog: "#b8d0ec", fogNear: 60, fogFar: 700, lit: [1.58, 1.5, 1.33], shade: [0.36, 0.35, 0.44], lift: [0.05, 0.06, 0.11], az: 75, el: 48, tint: "#ffffff", grade: "day" },
  golden: { sky: ["#ffc47c", "#e8967c", "#8a6f8a"], fog: "#efb489", fogNear: 60, fogFar: 700, lit: [1.5, 0.95, 0.55], shade: [0.2, 0.2, 0.38], lift: [0.04, 0.06, 0.17], az: 35, el: 14, tint: "#ffe2c4", grade: "golden", sun: "#ffcf9e" },
  predawn: { sky: ["#5a5a8a", "#2c3468", "#121638"], stars: 0.45, fog: "#3a4272", fogNear: 60, fogFar: 900, lit: [0.8, 0.85, 1.15], shade: [0.18, 0.2, 0.36], lift: [0.04, 0.05, 0.12], az: 110, el: 30, tint: "#c0c8ee", grade: "day" },
  westglow: { sky: ["#ffe2b0", "#f0907a", "#3a3270"], stars: 0.15, fog: "#e8a888", fogNear: 80, fogFar: 1100, lit: [1.6, 1.15, 0.8], shade: [0.22, 0.2, 0.4], lift: [0.05, 0.05, 0.14], az: 0, el: 4, tint: "#ffd8c0", grade: "golden", sun: "#fff2d0" },
  westface: { sky: ["#ffe2b0", "#f0907a", "#3a3270"], stars: 0.15, fog: "#e8a888", fogNear: 80, fogFar: 1100, lit: [1.62, 1.18, 0.82], shade: [0.24, 0.22, 0.42], lift: [0.05, 0.05, 0.14], az: 180, el: 8, tint: "#ffe0c8", grade: "golden" },
  ash: { sky: ["#cfcac0", "#aeaca8", "#8c8e96"], fog: "#c4c0b6", fogNear: 40, fogFar: 520, lit: [1.25, 1.22, 1.15], shade: [0.42, 0.42, 0.48], lift: [0.06, 0.06, 0.09], az: 80, el: 55, tint: "#e8e6e2", grade: "day" },
  night54: { sky: ["#8a4a3a", "#3a2444", "#100c22"], stars: 0.2, fog: "#4a2e3a", fogNear: 40, fogFar: 520, lit: [1.15, 0.8, 0.6], shade: [0.16, 0.14, 0.3], lift: [0.04, 0.03, 0.1], az: 60, el: 25, tint: "#e8c8bc", grade: "golden", vig: 0.3 },
  stage: { sky: ["#2a2a30", "#1e1e24", "#141418"], fog: "#24242a", fogNear: 40, fogFar: 260, lit: [1.62, 1.46, 1.2], shade: [0.3, 0.28, 0.36], lift: [0.05, 0.05, 0.08], az: 60, el: 45, tint: "#fff2e2", grade: "golden" },
  stormsea: { sky: ["#6a7480", "#3e4654", "#1c222e"], fog: "#545c68", fogNear: 50, fogFar: 700, lit: [1.1, 1.14, 1.2], shade: [0.2, 0.22, 0.3], lift: [0.04, 0.05, 0.08], az: 60, el: 35, tint: "#d4dce4", grade: "day", vig: 0.3 },
  ruins: { sky: ["#dccaa8", "#aaa8a2", "#7a8296"], fog: "#cbbca2", fogNear: 50, fogFar: 600, lit: [1.48, 1.32, 1.1], shade: [0.34, 0.3, 0.38], lift: [0.05, 0.05, 0.09], az: 70, el: 40, tint: "#f6eadb", grade: "golden" },
  islandNight: { sky: ["#4a3a5a", "#1e2244", "#0a0c22"], stars: 0.5, fog: "#2c3052", fogNear: 40, fogFar: 600, lit: [1.05, 0.82, 0.78], shade: [0.15, 0.16, 0.32], lift: [0.03, 0.04, 0.1], az: 50, el: 30, tint: "#d0c4dc", grade: "golden", vig: 0.3 },
  hall: { sky: ["#3a2a1e", "#2a1e16", "#1a120c"], fog: "#4a3a2c", fogNear: 30, fogFar: 160, lit: [1.55, 1.28, 0.98], shade: [0.34, 0.28, 0.28], lift: [0.06, 0.04, 0.04], az: 120, el: 50, tint: "#ffead4", grade: "golden" },
  hospital: { sky: ["#e8f0ea", "#d8e4e8", "#c8d8e4"], fog: "#e0e8e4", fogNear: 30, fogFar: 160, lit: [1.52, 1.52, 1.46], shade: [0.46, 0.5, 0.56], lift: [0.06, 0.07, 0.09], az: 100, el: 40, tint: "#fbfcff", grade: "day" },
  oscar: { sky: ["#2a1a20", "#1a1016", "#0c080c"], fog: "#1c1418", fogNear: 40, fogFar: 160, lit: [1.75, 1.42, 1.02], shade: [0.24, 0.17, 0.25], lift: [0.05, 0.03, 0.06], az: 20, el: 50, tint: "#fff0d8", grade: "golden", vig: 0.3 },
  cinema: { sky: ["#1e2236", "#141626", "#0a0c16"], fog: "#141626", fogNear: 30, fogFar: 160, lit: [0.95, 1.0, 1.25], shade: [0.16, 0.16, 0.3], lift: [0.03, 0.03, 0.08], az: 180, el: 20, tint: "#c8d4f2", grade: "day", vig: 0.35 },
  cineNight: { sky: ["#3a3060", "#1e1a40", "#0c0a20"], stars: 0.3, fog: "#2a2448", fogNear: 40, fogFar: 600, lit: [1.1, 0.95, 1.15], shade: [0.18, 0.16, 0.32], lift: [0.04, 0.03, 0.1], az: 80, el: 35, tint: "#e0d4ee", grade: "golden" },
  underwater: { sky: ["#0e4050", "#0a2e3e", "#061c28"], ground: "#061a24", fog: "#0e3644", fogNear: 4, fogFar: 140, lit: [0.62, 0.92, 1.02], shade: [0.12, 0.2, 0.26], lift: [0.02, 0.05, 0.07], az: 60, el: 70, tint: "#80b4c4", grade: "day", vig: 0.4 },
  stormGold: { sky: ["#8a7650", "#3e3644", "#14121c"], fog: "#4c4448", fogNear: 50, fogFar: 700, lit: [1.25, 1.08, 0.82], shade: [0.2, 0.18, 0.24], lift: [0.04, 0.04, 0.06], az: 50, el: 30, tint: "#ecdcc4", grade: "golden", vig: 0.35 },
  dawn: { sky: ["#ffb878", "#cc6e7c", "#38387a"], fog: "#e89a7c", fogNear: 80, fogFar: 1100, lit: [1.42, 0.98, 0.72], shade: [0.2, 0.2, 0.4], lift: [0.04, 0.05, 0.15], az: 0, el: 4, tint: "#ffd8c2", grade: "golden", sun: "#ffe4b4" },
  sky: { sky: ["#d4e4f2", "#8ab8e6", "#3f7fd2"], fog: "#d4e4f2", fogNear: 100, fogFar: 1400, lit: [1.6, 1.52, 1.36], shade: [0.38, 0.38, 0.48], lift: [0.05, 0.06, 0.11], az: 70, el: 40, tint: "#ffffff", grade: "day" },
  ginza: { sky: ["#dcd6c8", "#8ab4e0", "#3f7cc8"], fog: "#d6d0c2", fogNear: 60, fogFar: 700, lit: [1.58, 1.48, 1.3], shade: [0.36, 0.34, 0.42], lift: [0.05, 0.06, 0.1], az: 70, el: 42, tint: "#fffaf2", grade: "day" },
} satisfies Record<string, Look>;
export type LookId = keyof typeof LOOKS;
