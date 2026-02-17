import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
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
  // Uncomment to auto-start wrangler dev:
  // webServer: {
  //   command: 'npx wrangler dev',
  //   port: 8787,
  //   reuseExistingServer: true,
  //   timeout: 15_000,
  // },
});
