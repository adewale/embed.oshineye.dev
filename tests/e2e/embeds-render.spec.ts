import { test, expect } from "@playwright/test";

const EMBEDS = [
  "avatar-stack",
  "avatar-stack-playground",
  "github-timeline",
  "blogging-timeline",
  "cloudflare-architecture-viz",
];

for (const slug of EMBEDS) {
  test.describe(`/v1/${slug}`, () => {
    test("renders without console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(`/v1/${slug}`);
      await expect(page.locator("body")).not.toBeEmpty();

      expect(errors).toEqual([]);
    });

    test("renders with ?theme=dark without console errors", async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(`/v1/${slug}?theme=dark`);
      await expect(page.locator("body")).not.toBeEmpty();

      expect(errors).toEqual([]);
    });
  });
}
