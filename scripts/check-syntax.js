/**
 * Parse every source module without executing it. `node --check` is not
 * usable under `bun run`: Bun shims `node`, and `bun --check` runs the module,
 * which fails on browser globals such as HTMLElement.
 */
import { readdirSync, readFileSync } from "node:fs";

const transpiler = new Bun.Transpiler({ loader: "js" });
const files = readdirSync("src", { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".js"))
  .sort();
let failed = false;
for (const file of files) {
  try {
    transpiler.scan(readFileSync(`src/${file}`, "utf8"));
  } catch (error) {
    failed = true;
    console.error(`src/${file}: ${error instanceof Error ? error.message : error}`);
  }
}
if (failed) process.exit(1);
console.log(`syntax ok (${files.length} files)`);
