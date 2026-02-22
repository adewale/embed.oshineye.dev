import { test, expect } from "@playwright/test";

// Expected architecture per project — used to verify the diagram renders
// the right components in the right tiers with correct primitives.
//
// ASCII reference diagrams:
//
// planet-cf:
//   EDGE:          [Browser]  [Static Assets]  [Workers]
//                       |           |              |
//   SCHEDULING:   [Cron Trigger]           [Queues]
//                       |                     |
//   STORAGE & AI:    [D1]    [Workers AI]  [Vectorize]
//
// keyboardia:
//   EDGE:    [Browser]  [Static Assets]  [Workers]
//                  |           |             |
//   STATE:      [KV]   [Durable Objects]   [R2]
//
// vaders:
//   EDGE:         [Browser]    [Workers]
//                     |            |
//   COORDINATION:       [Matchmaker]
//                           |
//   GAME STATE:          [GameRoom]
//
// embed-oshineye-dev:
//   EDGE:    [Browser]  [Static Assets]  [Workers]
//                  |           |             |
//   STATE:          [Durable Objects]
//
// fibonacci-do:
//   EDGE:    [Browser]  [Static Assets]  [Workers]
//                  |           |             |
//   STATE:          [Durable Objects]
//
// oshineye-dev:
//   EDGE:    [Browser]  [Static Assets]

const EXPECTED_PROJECTS = {
  "planet-cf": {
    tiers: [
      { label: "Edge", nodes: ["Browser", "Static Assets", "Workers"] },
      { label: "Scheduling", nodes: ["Cron Trigger", "Queues"] },
      { label: "Storage & AI", nodes: ["D1", "Workers AI", "Vectorize"] },
    ],
    primitives: {
      Browser: "client",
      "Static Assets": "static-assets",
      Workers: "workers",
      "Cron Trigger": "cron",
      Queues: "queues",
      D1: "d1",
      "Workers AI": "ai",
      Vectorize: "vectorize",
    },
    flowCount: 9,
  },
  keyboardia: {
    tiers: [
      { label: "Edge", nodes: ["Browser", "Static Assets", "Workers"] },
      { label: "State", nodes: ["KV", "Durable Objects", "R2"] },
    ],
    primitives: {
      Browser: "client",
      "Static Assets": "static-assets",
      Workers: "workers",
      KV: "kv",
      "Durable Objects": "durable-objects",
      R2: "r2",
    },
    flowCount: 6,
  },
  vaders: {
    tiers: [
      { label: "Edge", nodes: ["Browser", "Workers"] },
      { label: "Coordination", nodes: ["Matchmaker"] },
      { label: "Game State", nodes: ["GameRoom"] },
    ],
    primitives: {
      Browser: "client",
      Workers: "workers",
      Matchmaker: "durable-objects",
      GameRoom: "durable-objects",
    },
    flowCount: 5,
  },
  "oshineye-dev": {
    tiers: [{ label: "Edge", nodes: ["Browser", "Static Assets"] }],
    primitives: { Browser: "client", "Static Assets": "static-assets" },
    flowCount: 1,
  },
  "fibonacci-do": {
    tiers: [
      { label: "Edge", nodes: ["Browser", "Static Assets", "Workers"] },
      { label: "State", nodes: ["Durable Objects"] },
    ],
    primitives: {
      Browser: "client",
      "Static Assets": "static-assets",
      Workers: "workers",
      "Durable Objects": "durable-objects",
    },
    flowCount: 3,
  },
  "embed-oshineye-dev": {
    tiers: [
      { label: "Edge", nodes: ["Browser", "Static Assets", "Workers"] },
      { label: "State", nodes: ["Durable Objects"] },
    ],
    primitives: {
      Browser: "client",
      "Static Assets": "static-assets",
      Workers: "workers",
      "Durable Objects": "durable-objects",
    },
    flowCount: 4,
  },
};

test.describe("/v1/cloudflare-architecture-viz", () => {
  test("renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/v1/cloudflare-architecture-viz");
    await expect(page.locator("body")).not.toBeEmpty();

    expect(errors).toEqual([]);
  });

  test("renders with ?theme=dark without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/v1/cloudflare-architecture-viz?theme=dark");
    await expect(page.locator("body")).not.toBeEmpty();

    expect(errors).toEqual([]);
  });

  test("fires resize postMessage", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__resizeMessages = [];
      window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "embed.oshineye.resize") {
          (window as any).__resizeMessages.push(event.data);
        }
      });
    });

    await page.goto("/v1/cloudflare-architecture-viz");

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

  test("every node icon contains a visible SVG with Lucide attributes", async ({
    page,
  }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    // Wait for render
    await page.waitForSelector(".arch-node");

    // Check every node icon on the default project (Planet CF)
    const iconData = await page.$$eval(
      ".arch-node .node-icon",
      (icons: Element[]) =>
        icons.map((icon) => {
          const svg = icon.querySelector("svg");
          if (!svg) return { hasSvg: false } as any;
          const rect = svg.getBoundingClientRect();
          return {
            hasSvg: true,
            width: rect.width,
            height: rect.height,
            viewBox: svg.getAttribute("viewBox"),
            fill: svg.getAttribute("fill"),
            stroke: svg.getAttribute("stroke"),
            strokeWidth: svg.getAttribute("stroke-width"),
            strokeLinecap: svg.getAttribute("stroke-linecap"),
            strokeLinejoin: svg.getAttribute("stroke-linejoin"),
            childCount: svg.children.length,
            childTags: Array.from(svg.children).map((c) =>
              c.tagName.toLowerCase()
            ),
            label:
              icon.closest(".arch-node")?.getAttribute("data-label") || "",
          };
        })
    );

    expect(iconData.length).toBeGreaterThan(0);

    for (const icon of iconData) {
      // SVG must exist
      expect(icon.hasSvg).toBe(true);

      // Visible dimensions (not a zero-sized box)
      expect(icon.width).toBeGreaterThan(0);
      expect(icon.height).toBeGreaterThan(0);

      // Correct Lucide SVG attributes
      expect(icon.viewBox).toBe("0 0 24 24");
      expect(icon.fill).toBe("none");
      expect(icon.stroke).toBe("white");
      expect(icon.strokeWidth).toBe("2");
      expect(icon.strokeLinecap).toBe("round");
      expect(icon.strokeLinejoin).toBe("round");

      // Contains actual shape elements (paths, rects, circles, etc.)
      expect(icon.childCount).toBeGreaterThan(0);
      for (const tag of icon.childTags) {
        expect(["path", "rect", "circle", "ellipse", "line"]).toContain(tag);
      }
    }
  });

  test("icons persist across project switches", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".arch-node");

    // Switch to each project and verify icons
    const projectButtons = page.locator(".project-btn");
    const count = await projectButtons.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      await projectButtons.nth(i).click();
      // Wait for re-render
      await page.waitForTimeout(100);

      const allHaveIcons = await page.$$eval(
        ".arch-node .node-icon",
        (icons: Element[]) =>
          icons.every((icon) => {
            const svg = icon.querySelector("svg");
            if (!svg) return false;
            const r = svg.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && svg.children.length > 0;
          })
      );

      const projectName = await projectButtons.nth(i).textContent();
      expect(allHaveIcons, `Icons missing for project: ${projectName}`).toBe(
        true
      );
    }
  });

  // Verify diagram structure matches expected architecture
  for (const [projectId, expected] of Object.entries(EXPECTED_PROJECTS)) {
    test(`${projectId}: renders correct tiers and nodes`, async ({ page }) => {
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${projectId}`
      );
      await page.waitForSelector(".arch-node");

      // Verify tier labels
      const tierLabels = await page.$$eval(".tier-label", (els: Element[]) =>
        els.map((e) => e.textContent || "")
      );
      expect(tierLabels).toEqual(expected.tiers.map((t) => t.label));

      // Verify node labels per tier
      const tiers = page.locator(".arch-tier");
      const tierCount = await tiers.count();
      expect(tierCount).toBe(expected.tiers.length);

      for (let ti = 0; ti < tierCount; ti++) {
        const nodeLabels = await tiers
          .nth(ti)
          .locator(".arch-node")
          .evaluateAll((nodes: Element[]) =>
            nodes.map((n) => n.getAttribute("data-label") || "")
          );
        expect(nodeLabels).toEqual(expected.tiers[ti].nodes);
      }

      // Verify primitive types
      for (const [label, primitive] of Object.entries(expected.primitives)) {
        const node = page.locator(`.arch-node[data-label="${label}"]`);
        await expect(node).toHaveAttribute("data-primitive", primitive);
      }
    });

    test(`${projectId}: renders correct number of flow arrows`, async ({
      page,
    }) => {
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${projectId}`
      );
      await page.waitForSelector(".arch-node");
      // Wait for rAF-based arrow rendering
      await page.waitForTimeout(200);

      const arrowCount = await page.locator(".arch-flow").count();
      expect(arrowCount).toBe(expected.flowCount);
    });
  }

  // --- Overlap detection tests (full bounding-box intersection) ---

  // Helper: check rect-rect overlap with a small tolerance
  // Returns list of { a, b } collision pairs with descriptive labels
  const OVERLAP_PROJECTS = [
    "oshineye-dev",
    "fibonacci-do",
    "embed-oshineye-dev",
    "keyboardia",
    "vaders",
    "planet-cf",
  ];

  for (const pid of OVERLAP_PROJECTS) {
    test(`${pid}: no flow label overlaps a component node (full bbox)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForTimeout(300);

      const collisions = await page.evaluate(() => {
        const PAD = 2; // 2px tolerance
        const labels = document.querySelectorAll(".arch-flow-label");
        const nodes = document.querySelectorAll(".arch-node");
        const hits: { label: string; node: string }[] = [];

        for (const lbl of labels) {
          const lr = lbl.getBoundingClientRect();
          if (lr.width === 0 || lr.height === 0) continue;

          for (const nd of nodes) {
            const nr = nd.getBoundingClientRect();
            // Full AABB intersection test
            if (
              lr.left + PAD < nr.right &&
              lr.right - PAD > nr.left &&
              lr.top + PAD < nr.bottom &&
              lr.bottom - PAD > nr.top
            ) {
              hits.push({
                label: lbl.textContent || "",
                node: nd.getAttribute("data-label") || "",
              });
            }
          }
        }
        return hits;
      });

      expect(
        collisions,
        `Labels overlapping nodes: ${JSON.stringify(collisions)}`
      ).toEqual([]);
    });

    test(`${pid}: no flow label overlaps another flow label`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForTimeout(300);

      const collisions = await page.evaluate(() => {
        const PAD = 1;
        const labels = Array.from(
          document.querySelectorAll(".arch-flow-label")
        );
        const rects = labels.map((l) => ({
          text: l.textContent || "",
          r: l.getBoundingClientRect(),
        }));
        const hits: { a: string; b: string }[] = [];

        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].r;
            const b = rects[j].r;
            if (a.width === 0 || b.width === 0) continue;
            if (
              a.left + PAD < b.right &&
              a.right - PAD > b.left &&
              a.top + PAD < b.bottom &&
              a.bottom - PAD > b.top
            ) {
              hits.push({ a: rects[i].text, b: rects[j].text });
            }
          }
        }
        return hits;
      });

      expect(
        collisions,
        `Labels overlapping each other: ${JSON.stringify(collisions)}`
      ).toEqual([]);
    });

    test(`${pid}: arrow paths do not cross through unrelated nodes`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForTimeout(300);

      const collisions = await page.evaluate(() => {
        const PAD = 4; // 4px inset so endpoints touching edges don't count
        const paths = document.querySelectorAll("path.arch-flow");
        const nodeEls = document.querySelectorAll(".arch-node");
        const nodes = Array.from(nodeEls).map((n) => ({
          label: n.getAttribute("data-label") || "",
          r: n.getBoundingClientRect(),
        }));
        const hits: { path: string; node: string }[] = [];

        for (const path of paths) {
          const svgPath = path as SVGPathElement;
          const totalLen = svgPath.getTotalLength();
          if (totalLen === 0) continue;

          // Get source/target from the path's flow data
          // Sample start and end to identify source/target nodes
          const startPt = svgPath.getPointAtLength(0);
          const endPt = svgPath.getPointAtLength(totalLen);

          // Convert SVG coordinates to page coordinates
          const svg = svgPath.ownerSVGElement!;
          const svgRect = svg.getBoundingClientRect();

          // Find which nodes are the source and target (path endpoints touch them)
          const sourceTarget = new Set<string>();
          for (const nd of nodes) {
            const nr = nd.r;
            // Check if start or end point is near this node
            const sx = svgRect.left + startPt.x;
            const sy = svgRect.top + startPt.y;
            const ex = svgRect.left + endPt.x;
            const ey = svgRect.top + endPt.y;
            if (
              (sx >= nr.left - 10 &&
                sx <= nr.right + 10 &&
                sy >= nr.top - 10 &&
                sy <= nr.bottom + 10) ||
              (ex >= nr.left - 10 &&
                ex <= nr.right + 10 &&
                ey >= nr.top - 10 &&
                ey <= nr.bottom + 10)
            ) {
              sourceTarget.add(nd.label);
            }
          }

          // Sample points along the path (skip first/last 15% to avoid endpoints)
          const samples = 20;
          const startFrac = 0.15;
          const endFrac = 0.85;
          for (let s = 0; s <= samples; s++) {
            const frac = startFrac + (endFrac - startFrac) * (s / samples);
            const pt = svgPath.getPointAtLength(frac * totalLen);
            const px = svgRect.left + pt.x;
            const py = svgRect.top + pt.y;

            for (const nd of nodes) {
              if (sourceTarget.has(nd.label)) continue;
              const nr = nd.r;
              if (
                px > nr.left + PAD &&
                px < nr.right - PAD &&
                py > nr.top + PAD &&
                py < nr.bottom - PAD
              ) {
                const key = `${Array.from(sourceTarget).join("→")} through ${nd.label}`;
                if (!hits.some((h) => h.path === key)) {
                  hits.push({ path: key, node: nd.label });
                }
              }
            }
          }
        }
        return hits;
      });

      expect(
        collisions,
        `Arrow paths crossing through nodes: ${JSON.stringify(collisions)}`
      ).toEqual([]);
    });
  }

  test("arrows have spacing between tiers for readability", async ({
    page,
  }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".arch-node");

    // Verify tier connectors have sufficient height for arrow routing
    const connectorHeights = await page.$$eval(
      ".tier-connector",
      (els: Element[]) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return r.height;
        })
    );

    for (const h of connectorHeights) {
      // Should be at least 50px to give arrows room
      expect(h).toBeGreaterThanOrEqual(50);
    }
  });

  // Screenshot tests for visual regression
  test("screenshot: Planet CF (light)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("planet-cf-light.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("screenshot: Planet CF (dark)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto(
      "/v1/cloudflare-architecture-viz?project=planet-cf&theme=dark"
    );
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("planet-cf-dark.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("screenshot: vaders (3-tier multi-hop arrows)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=vaders");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("vaders-light.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("screenshot: keyboardia", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=keyboardia");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("keyboardia-light.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("screenshot: oshineye-dev", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=oshineye-dev");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("oshineye-dev-light.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("screenshot: fibonacci-do", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=fibonacci-do");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("fibonacci-do-light.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("screenshot: embed-oshineye-dev", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto(
      "/v1/cloudflare-architecture-viz?project=embed-oshineye-dev"
    );
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("embed-oshineye-dev-light.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
