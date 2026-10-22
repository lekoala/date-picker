/** Build classic, minified, CSS and standalone artifacts. */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const { version } = await Bun.file("package.json").json();
const BANNER = `/*** @lekoala/date-picker v${version} - https://github.com/lekoala/date-picker ***/`;
mkdirSync("dist", { recursive: true });

/**
 * Strip comments and layout whitespace only. Bun's CSS bundler lowers modern
 * syntax (:is(), logical properties) for old engines, which makes the output
 * larger than the source for a package that already requires Popover.
 * @param {string} css
 */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

const css = readFileSync("src/date-picker.css", "utf8");

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
await bundle("scripts/standalone.js", "date-picker.standalone.min.js", true, {
  loader: { ".css": "text" },
  plugins: [
    {
      name: "minified-css-text",
      setup(build) {
        build.onLoad({ filter: /\.css$/ }, () => ({
          contents: `export default ${JSON.stringify(minifyCss(css))};`,
          loader: "js",
        }));
      },
    },
  ],
});

copyFileSync("src/date-picker.css", "dist/date-picker.css");
writeFileSync("dist/date-picker.min.css", `${minifyCss(css)}\n`);
