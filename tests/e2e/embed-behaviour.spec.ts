import { test, expect, type Page } from "@playwright/test";
import { getIdentity } from "../../src/presence/identity";

// Behaviour of the embeds' client-side scripts, observed in a real browser.
// These replace Vitest checks that grepped the served HTML for the script's
// source text (e.g. ".get('theme')", "|| 2"), which passed as long as the
// words were present whether or not the behaviour worked.

const EMBEDS = [
  "avatar-stack",
  "avatar-stack-playground",
  "github-timeline",
  "blogging-timeline",
  "cloudflare-architecture-viz",
];

async function bodyColours(page: Page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { background: s.backgroundColor, text: s.color };
  });
}

for (const slug of EMBEDS) {
  test.describe(`/v1/${slug}`, () => {
    test("?theme=dark switches to a dark palette; default is light", async ({ page }) => {
      await page.goto(`/v1/${slug}`);
      const byDefault = await bodyColours(page);
      await page.goto(`/v1/${slug}?theme=light`);
      const light = await bodyColours(page);
      await page.goto(`/v1/${slug}?theme=dark`);
      const dark = await bodyColours(page);

      expect(byDefault).toEqual(light);
      expect(dark.background).not.toBe(light.background);
      expect(dark.text).not.toBe(light.text);
      // Dark means a darker background than the light theme's.
      expect(luminance(dark.background)).toBeLessThan(luminance(light.background));
    });

    test("resize message reports the body's scroll height", async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__resizeHeights = [];
        window.addEventListener("message", (event) => {
          if (event.data && event.data.type === "embed.oshineye.resize") {
            (window as any).__resizeHeights.push(event.data.height);
          }
        });
      });
      await page.goto(`/v1/${slug}`);

      await expect
        .poll(() =>
          page.evaluate(() => {
            const h = (window as any).__resizeHeights as number[];
            return h.length > 0 && h[h.length - 1] === document.body.scrollHeight;
          }),
        )
        .toBe(true);
      expect(await page.evaluate(() => document.body.scrollHeight)).toBeGreaterThan(0);
    });
  });
}

function luminance(rgb: string): number {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// --- Timelines -------------------------------------------------------------

type Item = { year: number; fork: boolean; language: string; categories: string[]; visible: boolean };

async function timelineItems(page: Page): Promise<Item[]> {
  return page.locator(".timeline-item").evaluateAll((els) =>
    els.map((el) => ({
      year: Number(el.getAttribute("data-year")),
      fork: el.getAttribute("data-fork") === "true",
      language: (el.getAttribute("data-language") || "").toLowerCase(),
      categories: (el.getAttribute("data-categories") || "").split(",").filter(Boolean),
      visible: (el as HTMLElement).checkVisibility(),
    })),
  );
}

async function visibleYearHeaders(page: Page): Promise<number[]> {
  return page.locator(".year-header").evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).checkVisibility()).map((el) => Number(el.getAttribute("data-year"))),
  );
}

for (const slug of ["github-timeline", "blogging-timeline"]) {
  test.describe(`/v1/${slug} ?years`, () => {
    // Pin "now" so the year cutoff does not move with the calendar.
    // Mid-2026: the default two-year window is 2025-2026.
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-06-15T12:00:00Z"));
    });

    test("shows only the last two calendar years by default", async ({ page }) => {
      await page.goto(`/v1/${slug}?forks=show`);
      const items = await timelineItems(page);
      const recent = items.filter((i) => i.year >= 2025);
      const older = items.filter((i) => i.year <= 2024);
      expect(recent.length).toBeGreaterThan(0);
      expect(older.length).toBeGreaterThan(0);
      expect(recent.every((i) => i.visible)).toBe(true);
      expect(older.some((i) => i.visible)).toBe(false);
      expect((await visibleYearHeaders(page)).every((y) => y >= 2025)).toBe(true);
    });

    test("?years=all shows every item and ?years=N widens the window", async ({ page }) => {
      await page.goto(`/v1/${slug}?forks=show&years=all`);
      expect((await timelineItems(page)).every((i) => i.visible)).toBe(true);

      // Ten years back from 2026: 2016 and earlier are hidden.
      await page.goto(`/v1/${slug}?forks=show&years=10`);
      const items = await timelineItems(page);
      const inWindow = items.filter((i) => i.year >= 2017);
      const outside = items.filter((i) => i.year <= 2016);
      expect(inWindow.length).toBeGreaterThan(0);
      expect(outside.length).toBeGreaterThan(0);
      expect(inWindow.every((i) => i.visible)).toBe(true);
      expect(outside.some((i) => i.visible)).toBe(false);
    });

    test("the window follows the current date", async ({ page }) => {
      await page.clock.setFixedTime(new Date("2027-06-15T12:00:00Z"));
      await page.goto(`/v1/${slug}?forks=show`);
      const items = await timelineItems(page);
      expect(items.filter((i) => i.year === 2025).some((i) => i.visible)).toBe(false);
      expect(items.filter((i) => i.year === 2026).every((i) => i.visible)).toBe(true);
    });
  });
}

test.describe("/v1/github-timeline forks and language filter", () => {
  test("hides forks unless ?forks=show, and shows them dimmed", async ({ page }) => {
    await page.goto("/v1/github-timeline?years=all");
    let items = await timelineItems(page);
    expect(items.filter((i) => i.fork).length).toBeGreaterThan(0);
    expect(items.filter((i) => i.fork).some((i) => i.visible)).toBe(false);
    expect(items.filter((i) => !i.fork).every((i) => i.visible)).toBe(true);

    await page.goto("/v1/github-timeline?years=all&forks=show");
    items = await timelineItems(page);
    expect(items.every((i) => i.visible)).toBe(true);
    const opacity = (sel: string) =>
      page.locator(sel).first().evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await opacity(".timeline-item.fork")).toBeLessThan(await opacity(".timeline-item:not(.fork)"));
  });

  test("timeline dots are coloured by language", async ({ page }) => {
    await page.goto("/v1/github-timeline?years=all&forks=show");
    const dot = (lang: string) =>
      page.locator(`.timeline-item[data-language="${lang}"]`).first()
        .evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
    const colours = new Set([await dot("python"), await dot("typescript"), await dot("go")]);
    expect(colours.size).toBe(3);
  });

  test("clicking a language tag filters to that language; clicking again clears it", async ({ page }) => {
    await page.goto("/v1/github-timeline?years=all");
    const before = await timelineItems(page);
    const tag = page.locator(".timeline-item:visible .timeline-tag", { hasText: /^Python$/ }).first();

    await tag.click();
    const filtered = await timelineItems(page);
    const shown = filtered.filter((i) => i.visible);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(before.filter((i) => i.visible).length);
    expect(shown.every((i) => i.language === "python")).toBe(true);
    // Forks stay hidden even when they match the language.
    expect(shown.some((i) => i.fork)).toBe(false);
    expect(filtered.filter((i) => i.language === "python" && !i.fork).every((i) => i.visible)).toBe(true);
    await expect(page.locator(".timeline-tag-active").first()).toHaveText("Python");
    for (const y of await visibleYearHeaders(page)) {
      expect(shown.some((i) => i.year === y), `year header ${y} has no visible item`).toBe(true);
    }

    await tag.click();
    expect(await timelineItems(page)).toEqual(before);
    await expect(page.locator(".timeline-tag-active")).toHaveCount(0);
  });
});

test.describe("/v1/blogging-timeline category filter", () => {
  test("clicking a category tag filters to posts in that category; clicking again clears it", async ({ page }) => {
    await page.goto("/v1/blogging-timeline?years=all");
    const before = await timelineItems(page);
    const tag = page.locator(".timeline-tag", { hasText: /^presentations$/ }).first();

    await tag.click();
    const shown = (await timelineItems(page)).filter((i) => i.visible);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(before.length);
    expect(shown.every((i) => i.categories.includes("presentations"))).toBe(true);
    expect(before.filter((i) => i.categories.includes("presentations")).length).toBe(shown.length);
    await expect(page.locator(".timeline-tag-active").first()).toHaveText("presentations");

    await tag.click();
    expect(await timelineItems(page)).toEqual(before);
  });
});

// --- Avatar stack ----------------------------------------------------------

test.describe("/v1/avatar-stack", () => {
  test("joins the room named by the embed's own URL, not the referrer", async ({ page }) => {
    const sockets: string[] = [];
    page.on("websocket", (ws) => sockets.push(ws.url()));
    await page.goto("/v1/avatar-stack?theme=dark", { referer: "https://blog.example/some-post" });
    await expect.poll(() => sockets.length).toBeGreaterThan(0);

    const ws = new URL(sockets[0]);
    expect(ws.pathname).toBe("/v1/avatar-stack/ws");
    expect(ws.searchParams.get("page")).toBe(page.url());
    expect(ws.searchParams.get("playerId")).toBeTruthy();
  });

  for (const [layout, shown] of [
    [null, ["compactSection"]],
    ["spread", ["spreadSection"]],
    ["list", ["listSection"]],
    ["both", ["compactSection", "spreadSection"]],
  ] as const) {
    test(`?layout=${layout ?? "(default)"} shows ${shown.join(" and ")}`, async ({ page }) => {
      await page.goto(`/v1/avatar-stack${layout ? `?layout=${layout}` : ""}`);
      for (const id of ["compactSection", "spreadSection", "listSection"]) {
        const section = page.locator(`#${id}`);
        if ((shown as readonly string[]).includes(id)) await expect(section).toBeVisible();
        else await expect(section).toBeHidden();
      }
      // The visible layout renders the local player once the page has loaded.
      await expect(page.locator("#userCount")).toHaveText(/\d+ online/);
    });
  }
});

test.describe("/v1/avatar-stack offline identity", () => {
  // Before the WebSocket snapshot arrives the page renders the local player
  // from a client-side copy of src/presence/identity.ts. Both must agree, and
  // the copy must survive the hash value -2^31 ("polygenelubricants").
  for (const playerId of ["player-7", "polygenelubricants"]) {
    test(`shows the server's identity for ${playerId} without a connection`, async ({ page }) => {
      await page.routeWebSocket(/\/v1\/avatar-stack\/ws/, () => {
        // Never connect: the page keeps its offline fallback.
      });
      await page.addInitScript((id) => sessionStorage.setItem("embeds_player_id", id), playerId);
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto("/v1/avatar-stack");

      const expected = getIdentity(playerId);
      const avatar = page.locator("#avatarStack [title]").first();
      await expect(avatar).toHaveAttribute("title", expected.name);
      await expect(avatar).toHaveText(expected.initial);
      expect(await avatar.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(hexToRgb(expected.color));
      expect(errors).toEqual([]);
    });
  }
});

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
