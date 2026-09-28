import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3100",
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    { command: "node tests/mock-backend.mjs", url: "http://127.0.0.1:3901/health", reuseExistingServer: false },
    { command: "node node_modules/next/dist/bin/next start -p 3100", url: "http://localhost:3100", env: { BACKEND_URL: "", OAUTH_CLIENT_ID: "test-client", OAUTH_CLIENT_SECRET: "test-secret" }, reuseExistingServer: false },
    { command: "node node_modules/next/dist/bin/next start -p 3101", url: "http://localhost:3101", env: { BACKEND_URL: "http://127.0.0.1:3901", OAUTH_CLIENT_ID: "test-client", OAUTH_CLIENT_SECRET: "test-secret" }, reuseExistingServer: false },
  ],
});
