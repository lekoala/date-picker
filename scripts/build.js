/** Build classic, minified, CSS and standalone artifacts. */
import { copyFileSync, mkdirSync } from "node:fs";

const { version } = await Bun.file("package.json").json();
const BANNER = `/*** @lekoala/date-picker v${version} - https://github.com/lekoala/date-picker ***/`;
mkdirSync("dist", { recursive: true });

async function bundle(entry, outfile, minify, options = {}) {
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: "dist",
    naming: outfile,
    target: "browser",
    format: "iife",
    minify,
    ...options,
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  const file = Bun.file(`dist/${outfile}`);
  await Bun.write(`dist/${outfile}`, `${BANNER}\n${await file.text()}`);
}

await bundle("src/define.js", "date-picker.js", false);
await bundle("src/define.js", "date-picker.min.js", true);
await bundle("scripts/standalone.js", "date-picker.standalone.min.js", true, { loader: { ".css": "text" } });

copyFileSync("src/date-picker.css", "dist/date-picker.css");
const cssResult = await Bun.build({
  entrypoints: ["src/date-picker.css"],
  outdir: "dist",
  naming: "date-picker.min.css",
  minify: true,
});
if (!cssResult.success) {
  for (const log of cssResult.logs) console.error(log);
  process.exit(1);
}
