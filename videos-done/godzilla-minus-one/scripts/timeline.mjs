// Bundle story.ts with esbuild and dump the picture timeline (shots, kicks, flashes, cues) for the sound script.
import { build } from "esbuild";
import fs from "node:fs";
const r = await build({ entryPoints: ["src/videos/godzilla/story.ts"], bundle: true, format: "esm", platform: "node", write: false, loader: { ".json": "json" }, logLevel: "error" });
const tmp = "out/_timeline.mjs"; fs.mkdirSync("out", { recursive: true }); fs.writeFileSync(tmp, r.outputFiles[0].text);
const m = await import(process.cwd() + "/" + tmp);
fs.writeFileSync("audio/timeline.json", JSON.stringify(m.TIMELINE, null, 1));
console.log("shots", m.TIMELINE.shots.length, "kicks", m.TIMELINE.kicks.length, "total", m.TIMELINE.total);
