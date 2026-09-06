/**
 * Minimal Playwright probe for ad-hoc interaction debugging.
 *
 *   bun scripts/helpers/probe.mjs <path> <expression>
 *
 * Loads <path> on the static server and runs <expression> in the page (an
 * expression or IIFE; refer to the fixture's elements directly), then prints a
 * state snapshot: the expression result, document.activeElement, whether every
 * `[popover]` element is open, plus console errors and page errors.
 *
 * Set PROBE_HEADED=1 to run with a visible window for manual inspection.
 */

import { chromium } from "playwright";
import { freePort, startServer } from "./server.js";

const [pathArg, exprArg] = process.argv.slice(2);
if (!pathArg || !exprArg) {
  console.error(
    "usage: bun scripts/helpers/probe.mjs <fixture-path> <expression>\n" +
      "  e.g. bun scripts/helpers/probe.mjs /test/fixtures/focus.html " +
      "\"document.getElementById('focus-picker').value\"",
  );
  process.exit(1);
}

const server = await startServer({ port: await freePort() });
const browser = await chromium.launch({ headless: !process.env.PROBE_HEADED });
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(`${server.baseURL}${pathArg}`);
  const result = await page.evaluate(`(async () => (${exprArg}))()`);
  const snapshot = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      activeElement: active
        ? { tag: active.tagName, className: active.className || "", id: active.id || "" }
        : null,
      popovers: [...document.querySelectorAll("[popover]")].map((element) => ({
        id: element.id,
        open: element.matches(":popover-open"),
      })),
    };
  });

  console.log(JSON.stringify({ result, ...snapshot, consoleErrors, pageErrors }, null, 2));
} finally {
  await browser.close();
  await server.stop();
}
