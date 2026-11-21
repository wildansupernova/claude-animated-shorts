// Copies the caption / canvas fonts from node_modules into public/fonts (cross-platform: macOS, Windows, Linux).
import fs from "node:fs";
import path from "node:path";
const src = [
  "@fontsource/montserrat/files/montserrat-latin-900-normal.woff2",
  "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2",
  "@fontsource/montserrat/files/montserrat-latin-700-normal.woff2",
  "@fontsource/fredoka/files/fredoka-latin-700-normal.woff2",
];
fs.mkdirSync("public/fonts", { recursive: true });
for (const f of src) fs.copyFileSync(path.join("node_modules", f), path.join("public/fonts", path.basename(f)));
console.log("fonts copied:", src.length);
