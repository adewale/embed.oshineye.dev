import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Additional behaviour checks remain explicit review work, not a larger
  // default browser budget. The real loader fence checks stay in the default.
  testIgnore: process.env.EMBED_BEHAVIOUR_CHECKS === "1"
    ? []
    : ["**/embed-behaviour.spec.ts"],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8787",
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Start a local Worker unless BASE_URL points the suite at a running server
  // (for example a preview deployment). Locally an already-running
  // `wrangler dev` on :8787 is reused; in CI a fresh one is always started.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx wrangler dev --port 8787",
        url: "http://localhost:8787",
        reuseExistingServer: !process.env.CI,
        timeout: 15_000,
      },
});
