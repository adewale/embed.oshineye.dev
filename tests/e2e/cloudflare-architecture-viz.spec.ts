import { test, expect } from "@playwright/test";

// Expected architecture per project — used to verify the diagram renders
// the right components in the right tiers.
// Canonical tiers based on PRIMITIVE_TIER mapping from Cloudflare's product categories:
//   Client  — external consumers (Browser, Terminal)
//   Edge    — stateless compute (Workers, Static Assets, Cron Triggers)
//   Compute — stateful compute (Durable Objects)
//   Storage — data services (KV, D1, R2, Queues)
//   AI      — ML services (Workers AI, Vectorize)
const EXPECTED_PROJECTS = {
  "planet-cf": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers", "Cron Trigger"] },
      { label: "Storage", nodes: ["D1", "Queues"] },
      { label: "AI", nodes: ["Workers AI", "Vectorize"] },
    ],
  },
  keyboardia: {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers"] },
      { label: "Compute", nodes: ["Durable Objects"] },
      { label: "Storage", nodes: ["KV", "R2"] },
    ],
  },
  vaders: {
    tiers: [
      { label: "Client", nodes: ["Terminal"] },
      { label: "Edge", nodes: ["Workers"] },
      { label: "Compute", nodes: ["Matchmaker", "GameRoom"] },
    ],
  },
  "oshineye-dev": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets"] },
    ],
  },
  "fibonacci-do": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers"] },
      { label: "Compute", nodes: ["Durable Objects"] },
    ],
  },
  "embed-oshineye-dev": {
    tiers: [
      { label: "Client", nodes: ["Browser"] },
      { label: "Edge", nodes: ["Static Assets", "Workers"] },
      { label: "Compute", nodes: ["Durable Objects"] },
    ],
  },
};

const ALL_PROJECTS = Object.keys(EXPECTED_PROJECTS);

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

  test("URL updates when switching projects", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    // Click the keyboardia button
    await page.locator(".project-btn", { hasText: "keyboardia" }).click();
    expect(page.url()).toContain("project=keyboardia");

    // Click vaders
    await page.locator(".project-btn", { hasText: "vaders" }).click();
    expect(page.url()).toContain("project=vaders");
  });

  // --- ASCII diagram tests ---

  test("ASCII section exists with container", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    await expect(page.locator("#asciiDiagram")).toBeVisible();
    await expect(page.locator("#asciiCode")).toBeVisible();
  });

  test("ASCII contains tier labels from active project", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const text = await page.locator("#asciiCode").textContent();
    for (const tier of EXPECTED_PROJECTS["planet-cf"].tiers) {
      expect(text).toContain(tier.label);
    }
  });

  test("ASCII contains node labels from active project", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const text = await page.locator("#asciiCode").textContent();
    for (const tier of EXPECTED_PROJECTS["planet-cf"].tiers) {
      for (const node of tier.nodes) {
        expect(text).toContain(node);
      }
    }
  });

  test("ASCII contains flow list with all flows", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const text = await page.locator("#asciiCode").textContent();
    expect(text).toContain("Flows:");
    // planet-cf has 9 flows in the ASCII flow list
    const flowLines = (text!.match(/→/g) || []).length;
    expect(flowLines).toBe(9);
  });

  test("ASCII updates when switching projects", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const planetText = await page.locator("#asciiCode").textContent();
    expect(planetText).toContain("Cron Trigger");

    await page.locator(".project-btn", { hasText: "vaders" }).click();

    const vadersText = await page.locator("#asciiCode").textContent();
    expect(vadersText).toContain("Matchmaker");
    expect(vadersText).not.toContain("Cron Trigger");
  });

  test("ASCII copy button exists", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    await expect(page.locator("#copyAscii")).toBeVisible();
    await expect(page.locator("#copyAscii")).toHaveText("Copy");
  });

  // --- Screenshot tests for visual regression ---

  test("screenshot: Planet CF (light)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
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
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("planet-cf-dark.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: vaders", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=vaders");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("vaders-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: keyboardia", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=keyboardia");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("keyboardia-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: oshineye-dev", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=oshineye-dev");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("oshineye-dev-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: fibonacci-do", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/v1/cloudflare-architecture-viz?project=fibonacci-do");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
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
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("embed-oshineye-dev-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  // --- Mermaid diagram tests ---

  test("Mermaid section exists with container", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    await expect(page.locator("#mermaidDiagram")).toBeVisible();
    await expect(page.locator("#mermaidDiagram svg").first()).toBeVisible();
  });

  test("Mermaid SVG has valid structure — viewBox and groups", async ({
    page,
  }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const svg = page.locator("#mermaidDiagram svg").first();
    await expect(svg).toBeVisible();

    const viewBox = await svg.getAttribute("viewBox");
    expect(viewBox).toBeTruthy();
    expect(viewBox!.split(/[\s,]+/).length).toBe(4);

    // Should contain meaningful content
    const hasContent = await svg.evaluate((el) => {
      return el.querySelectorAll("path, rect, text, g").length > 0;
    });
    expect(hasContent).toBe(true);
  });

  test("Mermaid diagram contains node labels from active project", async ({
    page,
  }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const mermaidText = await page.locator("#mermaidDiagram").textContent();
    for (const tier of EXPECTED_PROJECTS["planet-cf"].tiers) {
      for (const node of tier.nodes) {
        expect(
          mermaidText,
          `Mermaid SVG should contain node label "${node}"`
        ).toContain(node);
      }
    }
  });

  test("Mermaid diagram updates when switching projects", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const planetSvg = await page.locator("#mermaidDiagram svg").first().innerHTML();
    expect(planetSvg).toContain("Cron Trigger");

    await page.locator(".project-btn", { hasText: "vaders" }).click();

    // After switching, the active project's mermaid should be visible
    const vadersSvg = await page
      .locator('#mermaidDiagram .mermaid-project-svg:not([style*="display: none"])')
      .first()
      .innerHTML();
    expect(vadersSvg).toContain("Matchmaker");
    expect(vadersSvg).not.toContain("Cron Trigger");
  });

  test("Mermaid section renders correctly in dark mode", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/v1/cloudflare-architecture-viz?theme=dark");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    await expect(page.locator("#mermaidDiagram svg").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Mermaid section has no copy button", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    await expect(page.locator("#copyMermaid")).toHaveCount(0);
  });

  for (const pid of ALL_PROJECTS) {
    test(`${pid}: Mermaid SVG contains all node labels`, async ({ page }) => {
      await page.goto(
        `/v1/cloudflare-architecture-viz?project=${pid}`
      );
      await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

      const expected =
        EXPECTED_PROJECTS[pid as keyof typeof EXPECTED_PROJECTS];
      const mermaidText = await page.locator("#mermaidDiagram").textContent();

      for (const tier of expected.tiers) {
        for (const node of tier.nodes) {
          expect(
            mermaidText,
            `${pid}: Mermaid should contain "${node}"`
          ).toContain(node);
        }
      }
    });
  }

  test("Mermaid nodes have coloured fills from classDef", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const nodeFills = await page.locator("#mermaidDiagram svg").first().evaluate((svgEl) => {
      // Check rect, ellipse, and other shape elements within nodes
      const nodes = svgEl.querySelectorAll(".node rect, .node ellipse");
      const fills: string[] = [];
      nodes.forEach((el) => {
        const fill = el.getAttribute("fill") || "";
        if (fill) fills.push(fill);
      });
      return fills;
    });

    // Should have some coloured fills (not all default grey)
    const coloured = nodeFills.filter((f) => f.startsWith("#") && f !== "#FFFFFF" && f !== "#ffffff");
    expect(coloured.length).toBeGreaterThan(0);
  });

  test("Mermaid SVG contains icon badge elements", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const badges = await page.locator("#mermaidDiagram svg .node-icon-badge").count();
    expect(badges).toBeGreaterThan(0);
  });

  test("Mermaid SVG contains detail text elements", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const details = await page.locator("#mermaidDiagram svg .node-detail-text").count();
    expect(details).toBeGreaterThan(0);

    // Check a specific detail text is present
    const detailTexts = await page.locator("#mermaidDiagram svg .node-detail-text").allTextContents();
    expect(detailTexts).toContain("Python");
  });

  test("Mermaid subgraph headers have uppercase styling", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const svgHtml = await page.locator("#mermaidDiagram svg").first().innerHTML();
    expect(svgHtml).toContain("text-transform: uppercase");
    expect(svgHtml).toContain("letter-spacing");
  });

  test("Mermaid SVG uses system font", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const svgHtml = await page.locator("#mermaidDiagram svg").first().innerHTML();
    expect(svgHtml).toContain("ui-sans-serif");
  });

  test("Mermaid flows section lists all flows for active project", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const flowsEl = page.locator("#mermaidFlows");
    await expect(flowsEl).toBeVisible();

    const text = await flowsEl.textContent();
    expect(text).toContain("Flows");
    expect(text).toContain("Browser");
    expect(text).toContain("Workers");
    expect(text).toContain("GET /");

    // Should have 9 flow items for planet-cf
    const items = await flowsEl.locator(".mermaid-flow-item").count();
    expect(items).toBe(9);
  });

  test("Mermaid flows section updates when switching projects", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const flowsEl = page.locator("#mermaidFlows");
    await expect(flowsEl).toContainText("Cron Trigger");

    await page.locator(".project-btn", { hasText: "vaders" }).click();

    await expect(flowsEl).toContainText("Matchmaker");
    await expect(flowsEl).not.toContainText("Cron Trigger");
  });

  test("Mermaid SVG contains drop shadow filter", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const svgHtml = await page.locator("#mermaidDiagram svg").first().innerHTML();
    expect(svgHtml).toContain("groupShadow");
    expect(svgHtml).toContain("feDropShadow");
  });

  test("Mermaid subgraph rects have rounded corners", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const hasRounded = await page.locator("#mermaidDiagram svg").first().evaluate((svgEl) => {
      const subgraphRects = svgEl.querySelectorAll(".subgraph rect");
      return Array.from(subgraphRects).some((r) => r.getAttribute("rx") === "6");
    });
    expect(hasRounded).toBe(true);
  });

  test("Mermaid subgraph groups have drop shadow filter applied", async ({ page }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const hasFilter = await page.locator("#mermaidDiagram svg").first().evaluate((svgEl) => {
      const subgroups = svgEl.querySelectorAll(".subgraph");
      return Array.from(subgroups).some((g) =>
        (g.getAttribute("filter") || "").includes("groupShadow")
      );
    });
    expect(hasFilter).toBe(true);
  });

  test("Mermaid orthogonal edges — all paths use only V and H segments", async ({
    page,
  }) => {
    await page.goto("/v1/cloudflare-architecture-viz?project=planet-cf");
    await page.waitForSelector(".mermaid-project-svg", { state: "attached" });

    const violations = await page.locator("#mermaidDiagram svg").first().evaluate((svgEl) => {
      // Only check edge paths, not icon badge paths
      const paths = svgEl.querySelectorAll("path");
      const issues: { index: number; d: string }[] = [];

      paths.forEach((path, i) => {
        // Skip paths inside icon badges
        if (path.closest(".node-icon-badge")) return;
        const d = path.getAttribute("d") || "";
        if (!d) return;

        const points: { x: number; y: number }[] = [];
        const re =
          /([MLQC])\s*([\d.eE+-]+)[\s,]+([\d.eE+-]+)(?:[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+))?(?:[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+))?/g;
        let m;
        while ((m = re.exec(d)) !== null) {
          const cmd = m[1];
          if (cmd === "Q") {
            points.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) });
            if (m[4] && m[5]) {
              points.push({ x: parseFloat(m[4]), y: parseFloat(m[5]) });
            }
          } else if (cmd === "C") {
            if (m[6] && m[7]) {
              points.push({ x: parseFloat(m[6]), y: parseFloat(m[7]) });
            }
          } else {
            points.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) });
          }
        }

        for (let j = 0; j < points.length - 1; j++) {
          const dx = Math.abs(points[j + 1].x - points[j].x);
          const dy = Math.abs(points[j + 1].y - points[j].y);
          if (dx < 1 || dy < 1) continue;
          if (dx >= 2 && dy >= 2) {
            issues.push({ index: i, d: d.slice(0, 80) });
            break;
          }
        }
      });

      return issues;
    });

    expect(
      violations,
      `Diagonal path segments in Mermaid SVG: ${JSON.stringify(violations)}`
    ).toEqual([]);
  });
});

test.describe("/team-architectures", () => {
  test("gallery page renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/team-architectures");
    await expect(page.locator("body")).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test("gallery page contains user cards", async ({ page }) => {
    await page.goto("/team-architectures");
    const cards = await page.locator(".card").count();
    expect(cards).toBeGreaterThan(0);
  });

  test("unknown user returns 404", async ({ page }) => {
    const res = await page.goto("/team-architectures/nobody-here-12345");
    expect(res?.status()).toBe(404);
  });

  test("removed routes return 404", async ({ page }) => {
    const res1 = await page.goto("/u/fayazara");
    expect(res1?.status()).toBe(404);
    const res2 = await page.goto("/fayaz");
    expect(res2?.status()).toBe(404);
  });
});
