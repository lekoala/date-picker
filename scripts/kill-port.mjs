/**
 * Kill any process listening on the dev/test server port (PORT || 4859).
 *
 * Cross-platform, zero-dependency, idempotent: safe to run whether or not a
 * server is alive. Clears an orphaned `node test/server.js` holding
 * 127.0.0.1:4859, which otherwise makes `bun run dev` fail with EADDRINUSE
 * (Playwright's webServer reuses that same port).
 */

import { execFileSync } from "node:child_process";

const port = process.env.PORT || "4859";

/** @returns {number[]} */
function findListeningPids() {
  const pids = new Set();
  if (process.platform === "win32") {
    const lines = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" }).split(/\r?\n/);
    for (const line of lines) {
      const fields = line.trim().split(/\s+/);
      if (fields.length < 5) continue;
      const [protocol, local, , state] = fields;
      const pid = Number(fields[4]);
      if (protocol !== "TCP" || !local.startsWith(`127.0.0.1:${port}`) || state !== "LISTENING") {
        continue;
      }
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  }
  const ids = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const id of ids) {
    const pid = Number(id);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

/** @param {number} pid */
function terminate(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Already gone.
  }
}

const pids = findListeningPids();
if (pids.length === 0) {
  console.log(`port ${port} is free`);
  process.exit(0);
}
for (const pid of pids) terminate(pid);
console.log(`killed on port ${port}: ${pids.join(", ")}`);
