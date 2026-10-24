/** Keep generated declarations aligned with the documented public surface. */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "dist/types";

/** Remove underscore-prefixed members from generated ambient classes. The
 * declaration emitter terminates every member with `;`; brace depth handles
 * multiline object/function types without depending on TypeScript internals. */
function trimClassMembers(source) {
  const lines = source.split("\n");
  const kept = [];
  let classDepth = 0;
  let skipping = false;
  let inDoc = false;
  let pendingDoc = [];
  for (const line of lines) {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (!classDepth && /^export declare class\s/.test(line)) classDepth = opens - closes;
    else if (classDepth) {
      if (!skipping && classDepth === 1 && (inDoc || line.trimStart().startsWith("/**"))) {
        pendingDoc.push(line);
        inDoc = !line.includes("*/");
        continue;
      }
      if (!skipping && classDepth === 1 && /^\s+_[A-Za-z0-9]+/.test(line)) {
        pendingDoc = [];
        skipping = true;
      } else if (!skipping && pendingDoc.length) {
        kept.push(...pendingDoc);
        pendingDoc = [];
      }
      classDepth += opens - closes;
      if (skipping && classDepth === 1 && line.trimEnd().endsWith(";")) {
        skipping = false;
        continue;
      }
      if (skipping) continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

for (const path of [join(root, "date-calendar.d.ts"), join(root, "date-picker.d.ts")]) {
  let output = trimClassMembers(readFileSync(path, "utf8"));
  output = output.replace(/export type PickIntent = \{[\s\S]*?^};\n/m, "");
  output = output.replace(/\/\*\* A grid activation intent[\s\S]*?PickIntent \*\/\n/, "");
  output = output.replace(/\/\/# sourceMappingURL=.*\n?$/, "");
  if (path.endsWith("date-picker.d.ts")) {
    output = output
      .replace('import { DateFieldController } from "./date-field.js";\n', "")
      .replace('import { DateRangeController } from "./date-range.js";\n', "");
  }
  if (path.endsWith("date-calendar.d.ts")) {
    output = output.replace('import { CalendarModel } from "./calendar-model.js";\n', "");
  }
  if (/^\s+_[A-Za-z0-9]+/m.test(output)) {
    throw new Error(`${path} still exposes underscore-prefixed class members`);
  }
  writeFileSync(path, output);
}

for (const name of [
  "activation-intents.d.ts",
  "activation-intents.d.ts.map",
  "date-calendar.d.ts.map",
  "date-field.d.ts",
  "date-field.d.ts.map",
  "date-picker.d.ts.map",
  "time.d.ts",
  "time.d.ts.map",
  "upgrade-properties.d.ts",
  "upgrade-properties.d.ts.map",
]) {
  try {
    unlinkSync(join(root, name));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}
