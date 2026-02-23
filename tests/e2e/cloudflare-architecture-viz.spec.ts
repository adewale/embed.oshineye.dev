import { test, expect } from "@playwright/test";

// Expected architecture per project — used to verify the diagram renders
// the right components in the right tiers with correct primitives.
//
// ASCII reference diagrams:
//
// planet-cf:
//   CLIENT:               [Browser]
//                          |    |
//   EDGE:        [Static Assets]  [Workers]
//                                  |     |
//   SCHEDULING:      [Cron Trigger]  [Queues]
//                                  |
//   STORAGE & AI:    [D1]  [Workers AI]  [Vectorize]
//
// keyboardia:
//   CLIENT:            [Browser]
//                       |    |
//   EDGE:     [Static Assets]  [Workers]
//                               |  |  |
//   STATE:         [KV]  [Durable Objects]  [R2]
//
// vaders:
//   EDGE:         [Terminal]    [Workers]
//                     |            |
//   COORDINATION:       [Matchmaker]
//                           |
//   GAME STATE:          [GameRoom]
//
// embed-oshineye-dev:
//   CLIENT:            [Browser]
//                       |    |
//   EDGE:     [Static Assets]  [Workers]
//                                 |
//   STATE:          [Durable Objects]
//
// fibonacci-do:
//   CLIENT:        [Browser]
//                   |    |
//   EDGE:       [Static Assets]
//                        |
//   COMPUTE:  [Workers]  [Durable Objects]
//
// oshineye-dev:
//   CLIENT:   [Browser]
//                 |
//   EDGE:    [Static Assets]

const EXPECTED_PROJECTS = {
  "planet-cf": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers"] },
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
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers"] },
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
      { label: "Edge", nodes: ["Terminal", "Workers"] },
      { label: "Coordination", nodes: ["Matchmaker"] },
      { label: "Game State", nodes: ["GameRoom"] },
    ],
    primitives: {
      Terminal: "terminal",
      Workers: "workers",
      Matchmaker: "durable-objects",
      GameRoom: "durable-objects",
    },
    flowCount: 5,
  },
  "oshineye-dev": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets"] },
    ],
    primitives: { Browser: "client", "Static Assets": "static-assets" },
    flowCount: 1,
  },
  "fibonacci-do": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets"] },
      { label: "Compute", nodes: ["Workers", "Durable Objects"] },
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
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers"] },
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

  test("URL updates when switching projects", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".arch-node");

    // Click the keyboardia button
    await page.locator(".project-btn", { hasText: "keyboardia" }).click();
    await page.waitForSelector(".arch-node");

    // URL should contain ?project=keyboardia
    expect(page.url()).toContain("project=keyboardia");

    // Click vaders
    await page.locator(".project-btn", { hasText: "vaders" }).click();
    await page.waitForSelector(".arch-node");

    expect(page.url()).toContain("project=vaders");
  });

  test("icons persist across project switches", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".arch-node");

    // Switch to each project and verify icons
    const projectButtons = page.locator(".project-btn");
    const count = await projectButtons.count();
    expect(count).toBe(Object.keys(EXPECTED_PROJECTS).length);

    for (let i = 0; i < count; i++) {
      await projectButtons.nth(i).click();
      await page.waitForSelector(".arch-node");

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
        expect(nodeLabels.sort()).toEqual([...expected.tiers[ti].nodes].sort());
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
      await page.waitForSelector("path.arch-flow", { state: "attached" });

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
      await page.waitForSelector("path.arch-flow", { state: "attached" });

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
      await page.waitForSelector("path.arch-flow", { state: "attached" });

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
      await page.waitForSelector("path.arch-flow", { state: "attached" });

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

  // --- Diagram quality heuristic tests ---

  for (const pid of OVERLAP_PROJECTS) {
    test(`${pid}: arrows have visible line length`, async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const tooShort = await page.evaluate(() => {
        const MIN_LENGTH = 20;
        const paths = document.querySelectorAll("path.arch-flow");
        const violations: { index: number; length: number }[] = [];

        paths.forEach((p, i) => {
          const svgPath = p as SVGPathElement;
          const len = svgPath.getTotalLength();
          if (len < MIN_LENGTH) {
            violations.push({ index: i, length: Math.round(len * 10) / 10 });
          }
        });
        return violations;
      });

      expect(
        tooShort,
        `Arrows too short (< 20px): ${JSON.stringify(tooShort)}`
      ).toEqual([]);
    });

    test(`${pid}: arrow endpoints connect to nodes`, async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const disconnected = await page.evaluate(() => {
        const TOLERANCE = 15;
        const paths = document.querySelectorAll("path.arch-flow");
        const nodeEls = document.querySelectorAll(".arch-node");
        const nodes = Array.from(nodeEls).map((n) => ({
          label: n.getAttribute("data-label") || "",
          r: n.getBoundingClientRect(),
        }));

        const svg = document.querySelector("svg.arch-arrows");
        if (!svg) return [{ issue: "no SVG found" }];
        const svgRect = svg.getBoundingClientRect();

        const violations: { index: number; issue: string }[] = [];

        function nearNode(
          px: number,
          py: number
        ): string | null {
          for (const nd of nodes) {
            if (
              px >= nd.r.left - TOLERANCE &&
              px <= nd.r.right + TOLERANCE &&
              py >= nd.r.top - TOLERANCE &&
              py <= nd.r.bottom + TOLERANCE
            ) {
              return nd.label;
            }
          }
          return null;
        }

        paths.forEach((p, i) => {
          const svgPath = p as SVGPathElement;
          const totalLen = svgPath.getTotalLength();
          if (totalLen === 0) return;

          const startPt = svgPath.getPointAtLength(0);
          const endPt = svgPath.getPointAtLength(totalLen);

          const sx = svgRect.left + startPt.x;
          const sy = svgRect.top + startPt.y;
          const ex = svgRect.left + endPt.x;
          const ey = svgRect.top + endPt.y;

          const startNode = nearNode(sx, sy);
          const endNode = nearNode(ex, ey);

          if (!startNode) {
            violations.push({
              index: i,
              issue: `start (${Math.round(sx)},${Math.round(sy)}) not near any node`,
            });
          }
          if (!endNode) {
            violations.push({
              index: i,
              issue: `end (${Math.round(ex)},${Math.round(ey)}) not near any node`,
            });
          }
          if (startNode && endNode && startNode === endNode) {
            violations.push({
              index: i,
              issue: `self-loop: both endpoints touch "${startNode}"`,
            });
          }
        });
        return violations;
      });

      expect(
        disconnected,
        `Disconnected arrow endpoints: ${JSON.stringify(disconnected)}`
      ).toEqual([]);
    });

    test(`${pid}: labels don't overlay multiple flow lines`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const ambiguous = await page.evaluate(() => {
        const labels = document.querySelectorAll(".arch-flow-label");
        const paths = Array.from(
          document.querySelectorAll("path.arch-flow")
        );
        const svg = document.querySelector("svg.arch-arrows");
        if (!svg) return [];
        const svgRect = svg.getBoundingClientRect();

        const violations: { label: string; pathCount: number }[] = [];

        labels.forEach((lbl) => {
          const lr = lbl.getBoundingClientRect();
          if (lr.width === 0 || lr.height === 0) return;

          let touchedPaths = 0;

          for (const path of paths) {
            const svgPath = path as SVGPathElement;
            const totalLen = svgPath.getTotalLength();
            if (totalLen === 0) continue;

            let touches = false;
            // Sample 20 points from 10% to 90% of path length
            for (let s = 0; s < 20; s++) {
              const frac = 0.1 + (0.8 * s) / 19;
              const pt = svgPath.getPointAtLength(frac * totalLen);
              const px = svgRect.left + pt.x;
              const py = svgRect.top + pt.y;

              if (
                px >= lr.left &&
                px <= lr.right &&
                py >= lr.top &&
                py <= lr.bottom
              ) {
                touches = true;
                break;
              }
            }
            if (touches) touchedPaths++;
          }

          if (touchedPaths > 1) {
            violations.push({
              label: lbl.textContent || "",
              pathCount: touchedPaths,
            });
          }
        });
        return violations;
      });

      expect(
        ambiguous,
        `Labels overlaying multiple flow lines: ${JSON.stringify(ambiguous)}`
      ).toEqual([]);
    });

    test(`${pid}: component nodes don't overlap each other`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const collisions = await page.evaluate(() => {
        const PAD = 2;
        const nodeEls = Array.from(document.querySelectorAll(".arch-node"));
        const rects = nodeEls.map((n) => ({
          label: n.getAttribute("data-label") || "",
          r: n.getBoundingClientRect(),
        }));
        const hits: { a: string; b: string }[] = [];

        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].r;
            const b = rects[j].r;
            if (
              a.left + PAD < b.right &&
              a.right - PAD > b.left &&
              a.top + PAD < b.bottom &&
              a.bottom - PAD > b.top
            ) {
              hits.push({ a: rects[i].label, b: rects[j].label });
            }
          }
        }
        return hits;
      });

      expect(
        collisions,
        `Overlapping nodes: ${JSON.stringify(collisions)}`
      ).toEqual([]);
    });
  }

  // --- Additional quality heuristics ---

  for (const pid of OVERLAP_PROJECTS) {
    test(`${pid}: nodes have minimum spacing within tier`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");

      const tooClose = await page.evaluate(() => {
        const MIN_SPACING = 20;
        const tiers = document.querySelectorAll(".arch-tier");
        const violations: { tier: string; a: string; b: string; gap: number }[] = [];

        tiers.forEach((tier) => {
          const tierLabel = tier.querySelector(".tier-label")?.textContent || "";
          const nodes = Array.from(tier.querySelectorAll(".arch-node"));
          const rects = nodes.map((n) => ({
            label: n.getAttribute("data-label") || "",
            r: n.getBoundingClientRect(),
          }));

          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i].r;
              const b = rects[j].r;
              // Horizontal gap between adjacent nodes
              const gap = Math.max(b.left - a.right, a.left - b.right);
              if (gap < MIN_SPACING && gap >= 0) {
                violations.push({
                  tier: tierLabel,
                  a: rects[i].label,
                  b: rects[j].label,
                  gap: Math.round(gap),
                });
              }
            }
          }
        });
        return violations;
      });

      expect(
        tooClose,
        `Nodes too close (< 20px): ${JSON.stringify(tooClose)}`
      ).toEqual([]);
    });

    test(`${pid}: arrowheads are not hidden behind target nodes`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const hidden = await page.evaluate(() => {
        const paths = document.querySelectorAll("path.arch-flow");
        const nodeEls = document.querySelectorAll(".arch-node");
        const nodes = Array.from(nodeEls).map((n) => ({
          label: n.getAttribute("data-label") || "",
          r: n.getBoundingClientRect(),
        }));

        const svg = document.querySelector("svg.arch-arrows");
        if (!svg) return [];
        const svgRect = svg.getBoundingClientRect();

        const violations: { index: number; issue: string }[] = [];

        paths.forEach((p, i) => {
          const svgPath = p as SVGPathElement;
          const totalLen = svgPath.getTotalLength();
          if (totalLen === 0) return;

          // Check last 5% of path — arrowhead region
          const endPt = svgPath.getPointAtLength(totalLen);
          const nearEndPt = svgPath.getPointAtLength(totalLen * 0.95);
          const ex = svgRect.left + endPt.x;
          const ey = svgRect.top + endPt.y;
          const nex = svgRect.left + nearEndPt.x;
          const ney = svgRect.top + nearEndPt.y;

          // The arrowhead should be outside (or at the edge of) the target node
          // Check if the point at 95% length is deeply inside a node
          const PAD = 8;
          for (const nd of nodes) {
            if (
              nex > nd.r.left + PAD &&
              nex < nd.r.right - PAD &&
              ney > nd.r.top + PAD &&
              ney < nd.r.bottom - PAD
            ) {
              violations.push({
                index: i,
                issue: `arrowhead buried inside "${nd.label}"`,
              });
            }
          }
        });
        return violations;
      });

      expect(
        hidden,
        `Arrowheads hidden behind nodes: ${JSON.stringify(hidden)}`
      ).toEqual([]);
    });

    test(`${pid}: labels are near their associated flow path`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const tooFar = await page.evaluate(() => {
        const MAX_DISTANCE = 100;
        const labels = document.querySelectorAll(".arch-flow-label");
        const paths = Array.from(
          document.querySelectorAll("path.arch-flow")
        );
        const svg = document.querySelector("svg.arch-arrows");
        if (!svg) return [];
        const svgRect = svg.getBoundingClientRect();

        // Labels and paths are created in the same order
        const violations: { label: string; minDist: number }[] = [];

        labels.forEach((lbl, li) => {
          const lr = lbl.getBoundingClientRect();
          if (lr.width === 0) return;
          const cx = lr.left + lr.width / 2;
          const cy = lr.top + lr.height / 2;

          // Find minimum distance from label center to any path sample point
          let minDist = Infinity;
          for (const path of paths) {
            const svgPath = path as SVGPathElement;
            const totalLen = svgPath.getTotalLength();
            if (totalLen === 0) continue;

            for (let s = 0; s <= 20; s++) {
              const pt = svgPath.getPointAtLength((s / 20) * totalLen);
              const px = svgRect.left + pt.x;
              const py = svgRect.top + pt.y;
              const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
              minDist = Math.min(minDist, dist);
            }
          }

          if (minDist > MAX_DISTANCE) {
            violations.push({
              label: lbl.textContent || "",
              minDist: Math.round(minDist),
            });
          }
        });
        return violations;
      });

      expect(
        tooFar,
        `Labels too far from any flow (> 60px): ${JSON.stringify(tooFar)}`
      ).toEqual([]);
    });

  }

  // Bidirectional flow distinction: flows between the same pair of nodes
  // must have visually distinct paths (not overlapping)
  test("vaders: bidirectional flows are visually distinct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=vaders");
    await page.waitForSelector(".arch-node");
    await page.waitForSelector("path.arch-flow", { state: "attached" });

    const overlapping = await page.evaluate(() => {
      const paths = Array.from(
        document.querySelectorAll("path.arch-flow")
      );
      const svg = document.querySelector("svg.arch-arrows");
      if (!svg) return [];
      const svgRect = svg.getBoundingClientRect();

      // Sample midpoints of each path
      const midpoints = paths.map((p) => {
        const svgPath = p as SVGPathElement;
        const totalLen = svgPath.getTotalLength();
        const mid = svgPath.getPointAtLength(totalLen / 2);
        return {
          x: svgRect.left + mid.x,
          y: svgRect.top + mid.y,
        };
      });

      const MIN_SEPARATION = 10;
      const violations: { pathA: number; pathB: number; dist: number }[] = [];

      for (let i = 0; i < midpoints.length; i++) {
        for (let j = i + 1; j < midpoints.length; j++) {
          const dist = Math.sqrt(
            (midpoints[i].x - midpoints[j].x) ** 2 +
              (midpoints[i].y - midpoints[j].y) ** 2
          );
          if (dist < MIN_SEPARATION) {
            violations.push({
              pathA: i,
              pathB: j,
              dist: Math.round(dist),
            });
          }
        }
      }
      return violations;
    });

    expect(
      overlapping,
      `Bidirectional flows too close: ${JSON.stringify(overlapping)}`
    ).toEqual([]);
  });

  // --- Dark mode quality tests ---

  for (const pid of OVERLAP_PROJECTS) {
    test(`${pid}: dark mode — no label-node overlaps`, async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}&theme=dark`
      );
      await page.waitForSelector(".arch-node");
      await page.waitForSelector("path.arch-flow", { state: "attached" });

      const collisions = await page.evaluate(() => {
        const PAD = 2;
        const labels = document.querySelectorAll(".arch-flow-label");
        const nodes = document.querySelectorAll(".arch-node");
        const hits: { label: string; node: string }[] = [];

        for (const lbl of labels) {
          const lr = lbl.getBoundingClientRect();
          if (lr.width === 0 || lr.height === 0) continue;

          for (const nd of nodes) {
            const nr = nd.getBoundingClientRect();
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
        `Dark mode label-node overlaps: ${JSON.stringify(collisions)}`
      ).toEqual([]);
    });
  }

  // --- Mobile viewport quality tests ---

  const MOBILE_PROJECTS = ["oshineye-dev", "fibonacci-do", "keyboardia"];

  for (const pid of MOBILE_PROJECTS) {
    test(`${pid}: mobile viewport (480px) — no node overlaps`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 480, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");

      const collisions = await page.evaluate(() => {
        const PAD = 2;
        const nodeEls = Array.from(document.querySelectorAll(".arch-node"));
        const rects = nodeEls.map((n) => ({
          label: n.getAttribute("data-label") || "",
          r: n.getBoundingClientRect(),
        }));
        const hits: { a: string; b: string }[] = [];

        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].r;
            const b = rects[j].r;
            if (
              a.left + PAD < b.right &&
              a.right - PAD > b.left &&
              a.top + PAD < b.bottom &&
              a.bottom - PAD > b.top
            ) {
              hits.push({ a: rects[i].label, b: rects[j].label });
            }
          }
        }
        return hits;
      });

      expect(
        collisions,
        `Mobile node overlaps: ${JSON.stringify(collisions)}`
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

  // --- ASCII diagram tests ---

  test("ASCII section exists with container", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".arch-node");

    await expect(page.locator("#asciiDiagram")).toBeVisible();
    await expect(page.locator("#asciiCode")).toBeVisible();
  });

  test("ASCII contains tier labels from active project", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");

    const text = await page.locator("#asciiCode").textContent();
    for (const tier of EXPECTED_PROJECTS["planet-cf"].tiers) {
      expect(text).toContain(tier.label);
    }
  });

  test("ASCII contains node labels from active project", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");

    const text = await page.locator("#asciiCode").textContent();
    for (const tier of EXPECTED_PROJECTS["planet-cf"].tiers) {
      for (const node of tier.nodes) {
        expect(text).toContain(node);
      }
    }
  });

  test("ASCII contains flow list with all flows", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");

    const text = await page.locator("#asciiCode").textContent();
    expect(text).toContain("Flows:");
    // Check arrow count in flow list
    const flowLines = (text!.match(/→/g) || []).length;
    expect(flowLines).toBe(EXPECTED_PROJECTS["planet-cf"].flowCount);
  });

  test("ASCII updates when switching projects", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");

    const planetText = await page.locator("#asciiCode").textContent();
    expect(planetText).toContain("Cron Trigger");

    await page.locator(".project-btn", { hasText: "vaders" }).click();
    await page.waitForSelector(".arch-node");

    const vadersText = await page.locator("#asciiCode").textContent();
    expect(vadersText).toContain("Matchmaker");
    expect(vadersText).not.toContain("Cron Trigger");
  });

  test("ASCII copy button exists", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".arch-node");

    await expect(page.locator("#copyAscii")).toBeVisible();
    await expect(page.locator("#copyAscii")).toHaveText("Copy");
  });

  // Screenshot tests for visual regression
  test("screenshot: Planet CF (light)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("planet-cf-light.png", {
      maxDiffPixelRatio: 0.02,
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
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: vaders (3-tier multi-hop arrows)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=vaders");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("vaders-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: keyboardia", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=keyboardia");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("keyboardia-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: oshineye-dev", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=oshineye-dev");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("oshineye-dev-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: fibonacci-do", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=fibonacci-do");
    await page.waitForSelector(".arch-node");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("fibonacci-do-light.png", {
      maxDiffPixelRatio: 0.02,
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
      maxDiffPixelRatio: 0.02,
    });
  });

  // --- Diagram scoring tests ---

  test("scoreDiagram() is exposed on window and returns valid scores", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");
    await page.waitForSelector("path.arch-flow", { state: "attached" });

    const scores = await page.evaluate(() => (window as any).scoreDiagram());

    // Composite score
    expect(typeof scores.composite).toBe("number");
    expect(scores.composite).toBeGreaterThanOrEqual(0);
    expect(scores.composite).toBeLessThanOrEqual(100);

    // All 6 metrics present
    for (const key of [
      "edgeCrossings",
      "pathEfficiency",
      "flowDirection",
      "barycenterDeviation",
      "labelQuality",
      "whitespaceBalance",
    ]) {
      expect(typeof scores[key]).toBe("number");
      expect(scores[key]).toBeGreaterThanOrEqual(0);
      expect(scores[key]).toBeLessThanOrEqual(100);
    }
  });

  for (const pid of OVERLAP_PROJECTS) {
    test(`${pid}: scoreDiagram() composite >= 0`, async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      // Wait for flows if > 1 flow
      if (EXPECTED_PROJECTS[pid as keyof typeof EXPECTED_PROJECTS].flowCount > 1) {
        await page.waitForSelector("path.arch-flow", { state: "attached" });
      }

      const scores = await page.evaluate(() => (window as any).scoreDiagram());
      expect(scores.composite).toBeGreaterThanOrEqual(0);
      expect(scores.composite).toBeLessThanOrEqual(100);
    });
  }

  // --- Score threshold regression guards ---
  // Thresholds set at (actual - 5) to catch significant regressions
  const SCORE_THRESHOLDS: Record<string, number> = {
    "planet-cf": 80,
    "keyboardia": 85,
    "vaders": 78,
    "embed-oshineye-dev": 82,
    "fibonacci-do": 93,
    "oshineye-dev": 95,
  };

  for (const [pid, threshold] of Object.entries(SCORE_THRESHOLDS)) {
    test(`${pid}: diagram score >= ${threshold}`, async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 800 });
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".arch-node");
      if (EXPECTED_PROJECTS[pid as keyof typeof EXPECTED_PROJECTS].flowCount > 1) {
        await page.waitForSelector("path.arch-flow", { state: "attached" });
      }

      const scores = await page.evaluate(() => (window as any).scoreDiagram());
      expect(
        scores.composite,
        `${pid} composite score ${scores.composite} below threshold ${threshold}. Metrics: ${JSON.stringify(scores)}`
      ).toBeGreaterThanOrEqual(threshold);
    });
  }

  // --- Debug overlay test ---

  test("Shift+D toggles debug score overlay", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".arch-node");
    await page.waitForSelector("path.arch-flow", { state: "attached" });

    // Overlay should not be visible initially
    await expect(page.locator("#score-overlay")).not.toBeVisible();

    // Press Shift+D to show overlay
    await page.keyboard.press("Shift+D");
    await expect(page.locator("#score-overlay")).toBeVisible();

    // Should show composite score
    const text = await page.locator("#score-overlay").textContent();
    expect(text).toContain("Composite");

    // Press Shift+D again to hide
    await page.keyboard.press("Shift+D");
    await expect(page.locator("#score-overlay")).not.toBeVisible();
  });
});
