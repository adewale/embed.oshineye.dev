import { test, expect, type Page } from "@playwright/test";

// public/static/loader.js is what third-party pages (Blogger posts) include.
// It hard-codes https://embed.oshineye.dev as the iframe origin and only
// trusts resize messages from that origin, so the test serves a host page on
// another origin and routes embed.oshineye.dev to the local Worker. No request
// leaves the machine: anything not routed is aborted.

const EMBED_ORIGIN = "https://embed.oshineye.dev";
const HOST = "https://blog.example";

async function serveHostPage(page: Page, baseURL: string, body: string) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === HOST) {
      return route.fulfill({ contentType: "text/html", body });
    }
    if (url.origin === EMBED_ORIGIN) {
      const local = await route.fetch({ url: baseURL + url.pathname + url.search });
      return route.fulfill({ response: local });
    }
    return route.abort();
  });
}

function loaderTag(slug: string, target: string, theme?: string) {
  const themeAttr = theme ? ` data-theme="${theme}"` : "";
  return `<div id="${target}"></div>
<script src="${EMBED_ORIGIN}/static/loader.js" data-slug="${slug}" data-target="${target}"${themeAttr}></script>`;
}

const heightOf = (page: Page, target: string) =>
  page.locator(`#${target} iframe`).evaluate((el) => (el as HTMLIFrameElement).style.height);

const contentHeightOf = (page: Page, target: string) =>
  page.frameLocator(`#${target} iframe`).locator("body").evaluate((b) => b.scrollHeight);

test("creates the iframe and sizes it to the embed's content", async ({ page, baseURL }) => {
  await serveHostPage(page, baseURL!, `<!DOCTYPE html><body>${loaderTag("github-timeline", "a", "dark")}</body>`);
  await page.goto(HOST + "/post");

  const iframe = page.locator("#a iframe");
  await expect(iframe).toHaveAttribute("src", `${EMBED_ORIGIN}/v1/github-timeline?theme=dark`);
  const content = await contentHeightOf(page, "a");
  await expect.poll(() => heightOf(page, "a")).toBe(`${content}px`);
});

// Resolves once the host window has dispatched a resize message of `height`.
// Listeners run in registration order, so by then loader.js's listener (added
// earlier) has already handled the message.
function hostReceives(page: Page, height: number) {
  return page.evaluate(
    (h) =>
      new Promise<void>((resolve) => {
        window.addEventListener("message", function seen(e) {
          if (e.data && e.data.height === h) {
            window.removeEventListener("message", seen);
            resolve();
          }
        });
      }),
    height,
  );
}

test("ignores resize messages that do not come from its iframe", async ({ page, baseURL }) => {
  await serveHostPage(page, baseURL!, `<!DOCTYPE html><body>${loaderTag("github-timeline", "a")}</body>`);
  await page.goto(HOST + "/post");
  const content = await contentHeightOf(page, "a");
  await expect.poll(() => heightOf(page, "a")).toBe(`${content}px`);

  const received = hostReceives(page, 7);
  await page.evaluate(() => window.postMessage({ type: "embed.oshineye.resize", height: 7 }, "*"));
  await received;
  expect(await heightOf(page, "a")).toBe(`${content}px`);
});

test("ignores resize messages once its iframe has navigated to another origin", async ({ page, baseURL }) => {
  const OTHER = "https://other.example";
  await serveHostPage(page, baseURL!, `<!DOCTYPE html><body>${loaderTag("github-timeline", "a")}</body>`);
  // Registered after serveHostPage's catch-all, so it takes precedence.
  await page.route(`${OTHER}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<script>parent.postMessage({ type: "embed.oshineye.resize", height: 9 }, "*")</script>`,
    }),
  );
  await page.goto(HOST + "/post");
  const content = await contentHeightOf(page, "a");
  await expect.poll(() => heightOf(page, "a")).toBe(`${content}px`);

  const received = hostReceives(page, 9);
  await page.locator("#a iframe").evaluate((el, url) => ((el as HTMLIFrameElement).src = url), `${OTHER}/page`);
  await received;
  expect(await heightOf(page, "a")).toBe(`${content}px`);
});

test("two embeds on one page are each sized to their own content", async ({ page, baseURL }) => {
  await serveHostPage(
    page,
    baseURL!,
    `<!DOCTYPE html><body>${loaderTag("avatar-stack", "small")}${loaderTag("github-timeline", "tall")}</body>`,
  );
  await page.goto(HOST + "/post");

  const small = await contentHeightOf(page, "small");
  const tall = await contentHeightOf(page, "tall");
  expect(tall).toBeGreaterThan(small);
  await expect.poll(() => heightOf(page, "tall")).toBe(`${tall}px`);
  await expect.poll(() => heightOf(page, "small")).toBe(`${small}px`);
});
