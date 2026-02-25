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

    test("fires resize postMessage", async ({ page }) => {
      // addInitScript runs before page scripts, capturing the resize
      // message that fires on load via ResizeObserver.
      await page.addInitScript(() => {
        (window as any).__resizeMessages = [];
        window.addEventListener("message", (event) => {
          if (event.data && event.data.type === "embed.oshineye.resize") {
            (window as any).__resizeMessages.push(event.data);
          }
        });
      });

      await page.goto(`/v1/${slug}`);

      // Wait for at least one resize message
      await expect
        .poll(
          () => page.evaluate(() => (window as any).__resizeMessages.length),
          { timeout: 5_000 }
        )
        .toBeGreaterThan(0);

      const data = await page.evaluate(
        () => (window as any).__resizeMessages[0]
      );
      expect(data.type).toBe("embed.oshineye.resize");
      expect(typeof data.height).toBe("number");
      expect(data.height).toBeGreaterThan(0);
    });
  });
}
