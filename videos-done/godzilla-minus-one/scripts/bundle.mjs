// Bundle once and print the serve dir (render.mjs reuses it through SERVE=...)
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || "/home/user/remotion-tmp";
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
console.log(await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") }));
