import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.js",
  timeout: 30_000,
  expect: { timeout: 3_000 },
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  webServer: {
    command: "node test/server.js",
    port: 4859,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:4859",
    headless: true,
    // CI only: a trace recorded for every passing test costs per-action
    // instrumentation (screenshot + DOM snapshot) and is discarded on green.
    // With retries enabled above, recording on the first retry keeps the happy
    // path cheap and still yields a trace for a real failure; locally nothing
    // changes and failures stay traced immediately.
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
