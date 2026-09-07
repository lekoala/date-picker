/**
 * Forced-colors screenshot helper for visual accessibility checks.
 *
 * Usage:
 *   bun scripts/forced-colors-shot.js [page] [--scheme light|dark] [--selector css]
 *     [--setup expression] [--out file.png] [--width px] [--height px]
 *   bun scripts/forced-colors-shot.js [page] --scenario important [--out-dir dir]
 *
 *   page      root-relative path, workspace path or URL (default: /demo/index.html)
 *   --scheme  prefers-color-scheme to emulate alongside forced colors (default: light)
 *   --selector  optional CSS selector to capture instead of the full page
 *   --setup   optional async expression/IIFE to run in the page before capture
 *   --out     output file (default: tmp/forced-colors-<scheme>.png)
 *   --scenario  built-in multi-shot preset (currently: important)
 *   --out-dir  output directory for a scenario preset
 *   --scale   device scale factor for sharper captures (default: 2)
 *   --width   viewport width (default: 1600)
 *   --height  viewport height (default: 1800)
 *
 * Set PROBE_HEADED=1 to run with a visible window.
 */

import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { freePort, startServer } from "./helpers/server.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** @param {string} message */
function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  return (
    "usage: bun scripts/forced-colors-shot.js [page] [--scheme light|dark] [--selector css] " +
    "[--setup expression] [--out file.png] [--width px] [--height px]\n" +
    "   or: bun scripts/forced-colors-shot.js [page] --scenario important [--out-dir dir]"
  );
}

const SCENARIOS = {
  important: [
    {
      name: "overview",
      fullPage: true,
    },
    {
      name: "inline-states",
      selector: "#inline",
    },
    {
      name: "constrained-disabled",
      selector: "#constrained",
    },
    {
      name: "constrained-disabled-focus",
      selector: "#constrained",
      setup:
        "(async () => { const cell = document.querySelector('#constrained .dp-day[data-date=\"2026-09-05\"]'); cell?.focus(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return document.activeElement === cell; })()",
    },
    {
      name: "picker-open",
      selector: "section.card:nth-of-type(2)",
      setup:
        "(async () => { document.querySelector('#simple-picker .dp-picker-button')?.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return document.querySelector('#simple-picker .dp-picker-panel')?.matches(':popover-open') ?? false; })()",
    },
    {
      name: "range-band",
      selector: "#stay-calendar",
      setup:
        "(async () => { const calendar = document.querySelector('#stay-calendar'); calendar.highlightedRange = { start: '2026-09-10', end: '2026-09-15' }; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return calendar.querySelector('[data-range-start]') !== null; })()",
    },
  ],
};

const args = process.argv.slice(2);
let pageArg = "";
let scheme = "light";
let selector = "";
let setup = "";
let out = "";
let outDir = "";
let scenario = "";
let scale = 2;
let width = 1600;
let height = 1800;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--help") {
    console.log(usage());
    process.exit(0);
  }
  if (arg === "--list-scenarios") {
    console.log(Object.keys(SCENARIOS).join("\n"));
    process.exit(0);
  }
  if (!arg.startsWith("--")) {
    if (pageArg) fail(`${usage()}\nUnexpected extra positional argument: ${arg}`);
    pageArg = arg;
    continue;
  }
  const next = args[index + 1];
  if (!next) fail(`${usage()}\nMissing value for ${arg}`);
  index += 1;
  if (arg === "--scheme") scheme = next === "dark" ? "dark" : "light";
  else if (arg === "--selector") selector = next;
  else if (arg === "--setup") setup = next;
  else if (arg === "--out") out = next;
  else if (arg === "--out-dir") outDir = next;
  else if (arg === "--scenario") scenario = next;
  else if (arg === "--scale") scale = Number.parseFloat(next);
  else if (arg === "--width") width = Number.parseInt(next, 10);
  else if (arg === "--height") height = Number.parseInt(next, 10);
  else fail(`${usage()}\nUnknown option: ${arg}`);
}

if (!Number.isInteger(width) || width <= 0) fail(`${usage()}\n--width must be a positive integer`);
if (!Number.isInteger(height) || height <= 0) fail(`${usage()}\n--height must be a positive integer`);
if (!Number.isFinite(scale) || scale <= 0) fail(`${usage()}\n--scale must be a positive number`);
if (scenario && !SCENARIOS[scenario]) fail(`${usage()}\nUnknown scenario preset: ${scenario}`);
if (scenario && out) fail(`${usage()}\n--out cannot be used with --scenario; use --out-dir instead`);
if (scenario && (selector || setup)) {
  fail(`${usage()}\n--selector and --setup cannot be combined with --scenario`);
}

/** @param {string} target @param {string} baseURL */
function resolveTarget(target, baseURL) {
  if (!target) return `${baseURL}/demo/index.html`;
  if (/^https?:\/\//i.test(target)) return target;
  if (target.startsWith("/")) return `${baseURL}${target.replaceAll("\\", "/")}`;
  const absolute = isAbsolute(target) ? target : resolve(ROOT, target);
  const rel = relative(ROOT, absolute).replaceAll("\\", "/");
  if (!rel || rel.startsWith("../") || rel === "..") {
    fail(`Path must stay inside the repo: ${target}`);
  }
  return `${baseURL}/${rel}`;
}

/** @param {string} filePath */
async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

/**
 * @param {import('playwright').Page} page
 * @param {{selector?: string, fullPage?: boolean}} shot
 * @param {string} outputPath
 */
async function saveShot(page, shot, outputPath) {
  await ensureParentDir(outputPath);
  if (shot.selector) {
    const locator = page.locator(shot.selector);
    await locator.scrollIntoViewIfNeeded();
    await locator.screenshot({ path: outputPath });
    return;
  }
  await page.screenshot({ path: outputPath, fullPage: shot.fullPage !== false });
}

const server = await startServer({ port: await freePort() });
const browser = await chromium.launch({ headless: !process.env.PROBE_HEADED });

try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const target = resolveTarget(pageArg, server.baseURL);

  await page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
  if (scenario) {
    const scenarioDir = resolve(ROOT, outDir || `tmp/forced-colors-${scenario}-${scheme}`);
    for (const shot of SCENARIOS[scenario]) {
      const outputPath = resolve(scenarioDir, `${shot.name}.png`);
      await page.goto(target);
      await page.waitForLoadState("networkidle");
      if (shot.setup) {
        await page.evaluate(`(async () => (${shot.setup}))()`);
      }
      await saveShot(page, shot, outputPath);
      console.log(`Saved ${outputPath} (${target}, forced-colors ${scheme}, scenario ${shot.name})`);
    }
  } else {
    const outputPath = resolve(ROOT, out || `tmp/forced-colors-${scheme}.png`);
    await page.goto(target);
    await page.waitForLoadState("networkidle");

    if (setup) {
      await page.evaluate(`(async () => (${setup}))()`);
    }

    await saveShot(page, { selector, fullPage: true }, outputPath);
    console.log(
      `Saved ${outputPath} (${target}, forced-colors ${scheme}${selector ? `, selector ${selector}` : ""})`,
    );
  }
} finally {
  await browser.close();
  await server.stop();
}
