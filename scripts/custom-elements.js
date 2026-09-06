/**
 * Generate custom-elements.json (Custom Elements Manifest 2.1.0) from source.
 *
 * The sources are read as text: the script never imports the browser-only
 * modules under Bun. The JS source stays the single source of truth:
 * - attributes come from `static observedAttributes` in each element class
 * - members come from methods/getters explicitly marked with `@public`
 * - events come from the literal names wired through `new CustomEvent(...)`
 * - CSS custom properties come from the `--dp-*` token block in date-picker.css
 */

import { readFile, writeFile } from "node:fs/promises";

const OUT = "custom-elements.json";
const SCHEMA_VERSION = "2.1.0";
const CSS_PROPERTY_SELECTOR = /:where\(date-calendar,\s*date-picker\)\s*\{([\s\S]*?)\n\}/;

/**
 * @param {string} file
 * @returns {Promise<string>}
 */
const read = (file) => readFile(file, "utf8");

/**
 * Extract the kebab-case attribute names from a `static observedAttributes = [...]`.
 * @param {string} source
 * @returns {string[]}
 */
function extractAttributes(source) {
  const block = source.match(/static\s+observedAttributes\s*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  const names = [];
  for (const match of block[1].matchAll(/"([^"]+)"/g)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/**
 * Extract methods/getters/fields whose preceding JSDoc block contains `@public`.
 * @param {string} source
 * @returns {Array<{ kind: string, name: string, description: string, static?: boolean }>}
 */
function extractPublicMembers(source) {
  const lines = source.split("\n");
  const members = [];
  /** @type {string[]|null} */
  let doc = null;
  /** @type {string|null} */
  let pendingDoc = null;
  for (const line of lines) {
    if (doc) {
      if (line.includes("*/")) {
        doc.push(line);
        const text = doc.join("\n");
        doc = null;
        pendingDoc = /@public/.test(text) ? text : null;
      } else {
        doc.push(line);
      }
      continue;
    }
    if (pendingDoc) {
      const def = line.trim().match(/^(?:static\s+)?(?:async\s+)?(?:get\s+)?([A-Za-z_$][\w$]*)\s*(\(|=|\{)/);
      if (def) {
        const trimmed = line.trim();
        const delimiter = def[2];
        let kind = "method";
        if (trimmed.startsWith("get ")) {
          kind = "getter";
        } else if (delimiter === "=") {
          kind = "field";
        }
        members.push({
          kind,
          name: def[1],
          static: trimmed.startsWith("static"),
          description: extractDescription(pendingDoc),
        });
      }
      pendingDoc = null;
    }
    if (/^\s*\/\*\*/.test(line)) {
      doc = [line];
      if (line.includes("*/")) {
        const text = doc.join("\n");
        doc = null;
        pendingDoc = /@public/.test(text) ? text : null;
      }
    }
  }
  return members;
}

/**
 * @param {string} text
 * @returns {string}
 */
function extractDescription(text) {
  const description = text
    .replace(/\/\*+|\*+\//g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .filter((l) => l && !l.startsWith("@"))
    .join(" ");
  return description || undefined;
}

/**
 * Extract literal custom event names from `new CustomEvent(...)` / `new Event(...)`
 * calls, skipping native DOM events.
 * @param {string} source
 * @returns {string[]}
 */
function extractEvents(source) {
  const NAMES = ["change", "input", "click", "reset", "submit", "blur", "focus"];
  const names = [];
  for (const match of source.matchAll(/new (?:CustomEvent|Event)\(\s*"([^"]+)"/g)) {
    if (NAMES.includes(match[1])) continue;
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names.sort();
}

/**
 * Extract the public `--dp-*` custom properties from the token block.
 * @param {string} css
 * @returns {string[]}
 */
function extractCssProperties(css) {
  const block = css.match(CSS_PROPERTY_SELECTOR);
  if (!block) return [];
  const names = [];
  for (const match of block[1].matchAll(/(--dp-[a-z][\w-]*)/g)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/**
 * @param {string} source
 * @param {string} className
 * @param {string} tagName
 * @param {string[]} cssProperties
 * @returns {object}
 */
function buildDeclaration(source, className, tagName, cssProperties) {
  const attributes = extractAttributes(source);
  const members = extractPublicMembers(source);
  const events = extractEvents(source);
  return {
    kind: "class",
    name: className,
    tagName,
    attributes: attributes.map((name) => ({ name })),
    members: members.map(({ kind, name, static: isStatic, description }) => ({
      kind,
      name,
      ...(isStatic ? { static: true } : {}),
      ...(description ? { description } : {}),
    })),
    events: events.map((name) => ({ name })),
    cssProperties: cssProperties.map((name) => ({ name })),
  };
}

async function main() {
  const calendarSource = await read("src/date-calendar.js");
  const pickerSource = await read("src/date-picker.js");
  const cssSource = await read("src/date-picker.css");

  const cssProperties = extractCssProperties(cssSource);

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    readme: "README.md",
    modules: [
      {
        kind: "javascript-module",
        path: "src/date-calendar.js",
        declarations: [
          buildDeclaration(calendarSource, "DateCalendarElement", "date-calendar", cssProperties),
        ],
        exports: [
          {
            kind: "js",
            name: "DateCalendarElement",
            declaration: { name: "DateCalendarElement", module: "src/date-calendar.js" },
          },
        ],
      },
      {
        kind: "javascript-module",
        path: "src/date-picker.js",
        declarations: [buildDeclaration(pickerSource, "DatePickerElement", "date-picker", cssProperties)],
        exports: [
          {
            kind: "js",
            name: "DatePickerElement",
            declaration: { name: "DatePickerElement", module: "src/date-picker.js" },
          },
        ],
      },
    ],
  };

  await writeFile(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `wrote ${OUT} (${cssProperties.length} css properties, calendar ${manifest.modules[0].declarations[0].members.length} members, picker ${manifest.modules[1].declarations[0].members.length} members)`,
  );
}

await main();
