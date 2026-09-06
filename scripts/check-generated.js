/**
 * Drift gate for the committed generated artifact (custom-elements.json).
 *
 * Run after `bun run sync`: if a fresh regeneration differs from what is
 * committed, the gate lists the offending file and prints an actionable
 * message, so a stale manifest can never silently ship. It is intentionally
 * part of `verify`/CI and not the daily `check`, because a source edit
 * mid-task legitimately produces temporary drift.
 */

import { execFileSync } from "node:child_process";

const dirty = execFileSync("git", ["status", "--porcelain", "--", "custom-elements.json"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (dirty.length) {
  console.error("Generated artifacts are out of date. Run `bun run sync` and commit the result:");
  for (const line of dirty) console.error(`  ${line}`);
  process.exit(1);
}

console.log("generated artifacts in sync");
