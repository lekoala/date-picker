/**
 * Start/stop the static demo/test server for ad-hoc probes and manual checks.
 *
 * The server reads PORT from the environment, so several independent probes can
 * run without clobbering the Playwright webServer port (4859).
 *
 *   const { baseURL, stop } = await startServer({ port });
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const SERVER_ENTRY = fileURLToPath(new URL("../../test/server.js", import.meta.url));

/**
 * Pick an unused TCP port on 127.0.0.1.
 * @returns {Promise<number>}
 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close(() => resolve(port));
    });
  });
}

/**
 * Start the static server and wait until it accepts requests.
 * @param {{port?: number, timeout?: number}} [options]
 * @returns {Promise<{baseURL: string, stop: () => Promise<void>}>}
 */
export async function startServer(options = {}) {
  const port = options.port ?? (await freePort());
  const timeout = options.timeout ?? 10_000;
  const child = spawn(process.execPath, ["run", SERVER_ENTRY], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const baseURL = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`static server exited early (code ${child.exitCode})\n${stderr}`.trim());
    }
    try {
      const response = await fetch(`${baseURL}/demo/index.html`);
      if (response.ok) {
        return {
          baseURL,
          stop: () =>
            new Promise((resolve) => {
              child.once("exit", resolve);
              child.kill();
            }),
        };
      }
    } catch {
      // Server not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill();
  throw new Error(`static server did not start within ${timeout}ms`);
}
