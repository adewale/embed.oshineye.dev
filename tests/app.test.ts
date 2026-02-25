import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("GET /", () => {
  it("returns 200 and lists available embeds", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("avatar-stack");
    expect(body).toContain("github-timeline");
    expect(body).toContain("Embeds Catalogue");
  });
});

describe("GET /v1/nonexistent", () => {
  it("returns 404", async () => {
    const res = await app.request("/v1/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("embed response headers", () => {
  it("sets X-Frame-Options: ALLOWALL on /v1/* responses", async () => {
    const res = await app.request("/v1/avatar-stack");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
  });

  it("sets correct Content-Security-Policy on /v1/* responses", async () => {
    const res = await app.request("/v1/avatar-stack");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://d3js.org");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("connect-src 'self' https:");
    expect(csp).toContain("font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.gstatic.com;");
  });

  it("sets Access-Control-Allow-Origin: * on /v1/* responses", async () => {
    const res = await app.request("/v1/avatar-stack");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("sets Cache-Control on /v1/* responses", async () => {
    const res = await app.request("/v1/avatar-stack");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, s-maxage=86400"
    );
  });

  it("does NOT set embed headers on GET /", async () => {
    const res = await app.request("/");
    expect(res.headers.get("X-Frame-Options")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("GET /v1/avatar-stack", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/avatar-stack");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Avatar Stack");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
  });

  it("sets correct response headers", async () => {
    const res = await app.request("/v1/avatar-stack");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, s-maxage=86400"
    );
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
  });

  it("HTML contains theme reading logic", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).toContain(".get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });

  it("HTML contains postMessage resize contract", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).toContain("embed.oshineye.resize");
    expect(body).toContain("document.body.scrollHeight");
  });

  it("room key is derived from location.href, not document.referrer", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).toContain("encodeURIComponent(location.href)");
    expect(body).not.toContain("document.referrer");
  });
});

describe("GET /v1/avatar-stack-playground", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/avatar-stack-playground");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Avatar Stack Playground");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
  });

  it("sets correct response headers", async () => {
    const res = await app.request("/v1/avatar-stack-playground");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
  });

  it("HTML contains theme reading logic", async () => {
    const res = await app.request("/v1/avatar-stack-playground");
    const body = await res.text();
    expect(body).toContain("searchParams.get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });

  it("HTML contains postMessage resize contract", async () => {
    const res = await app.request("/v1/avatar-stack-playground");
    const body = await res.text();
    expect(body).toContain("embed.oshineye.resize");
    expect(body).toContain("document.body.scrollHeight");
  });

  it("contains interactive controls", async () => {
    const res = await app.request("/v1/avatar-stack-playground");
    const body = await res.text();
    expect(body).toContain("btnAdd");
    expect(body).toContain("btnRemove");
    expect(body).toContain("toggleSpread");
  });
});

describe("avatar-stack live vs playground separation", () => {
  it("live embed does not contain playground controls", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).not.toContain("btnAdd");
    expect(body).not.toContain("btnRemove");
    expect(body).not.toContain("toggleSpread");
    expect(body).not.toContain("hero-title");
  });

  it("live embed supports layout query param (spread, both, list)", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).toContain("params.get('layout')");
    expect(body).toContain("'spread'");
    expect(body).toContain("'both'");
    expect(body).toContain("'list'");
    expect(body).toContain("avatarStackSpread");
    expect(body).toContain("userList");
    expect(body).toContain("user-list-item");
  });

  it("live embed uses WebSocket for real presence", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).toContain("WebSocket");
    expect(body).toContain("sessionStorage");
    expect(body).toContain("player_joined");
    expect(body).toContain("player_left");
    expect(body).toContain("snapshot");
    expect(body).toContain("/v1/avatar-stack/ws");
  });

  it("live embed does NOT contain simulated presence", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    expect(body).not.toContain("scheduleNextChange");
    expect(body).not.toContain("PRESENCE_INTERVAL");
    expect(body).not.toContain("NAMES_POOL");
  });

  it("list layout caps visible rows with overflow indicator", async () => {
    const res = await app.request("/v1/avatar-stack");
    const body = await res.text();
    // List rendering should respect MAX_VISIBLE and show overflow
    expect(body).toContain("MAX_VISIBLE_LIST");
    expect(body).toContain("more-users");
  });
});

describe("GET /v1/avatar-stack/ws", () => {
  it("returns 426 when not a WebSocket upgrade", async () => {
    const res = await app.request("/v1/avatar-stack/ws");
    expect(res.status).toBe(426);
  });
});

describe("GET /v1/github-timeline", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/github-timeline");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("GitHub Timeline");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
  });

  it("sets correct response headers", async () => {
    const res = await app.request("/v1/github-timeline");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
  });

  it("HTML contains theme reading logic", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    expect(body).toContain(".get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });

  it("HTML contains postMessage resize contract", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    expect(body).toContain("embed.oshineye.resize");
    expect(body).toContain("document.body.scrollHeight");
  });

  it("contains baked-in repo data (no runtime API call)", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    // Should NOT fetch from GitHub at runtime
    expect(body).not.toContain("api.github.com");
    // Should contain actual baked-in timeline entries
    expect(body).toContain("timeline-item");
    expect(body).toContain("timeline-title");
    expect(body).toContain("github.com/adewale");
  });

  it("defaults to showing last 2 years only", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    // Items and year headers have data-year for client-side filtering
    expect(body).toContain("data-year=");
    // Script reads years param with default of 2
    expect(body).toContain(".get('years')");
    // Default is 2 years when param is not set
    expect(body).toMatch(/var\s+n\s*=\s*.*\|\|\s*2/);
  });

  it("supports ?years=all to show full history", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    expect(body).toContain("'all'");
  });

  it("bakes in fork metadata for each repo", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    // Each timeline item has a data-fork attribute
    expect(body).toContain('data-fork="true"');
    expect(body).toContain('data-fork="false"');
  });

  it("hides forks by default, shows with ?forks=show", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    // Script reads the forks param and hides forks by default
    expect(body).toContain(".get('forks')");
    expect(body).toContain("data-fork");
  });

  it("styles forks differently: muted dot and dimmed card", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    // CSS for fork items: muted dot color and reduced opacity
    expect(body).toContain(".timeline-item.fork");
    expect(body).toContain("opacity");
  });

  it("color-codes timeline dots by programming language", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    // Language-specific CSS classes on timeline items
    expect(body).toContain("lang-python");
    expect(body).toContain("lang-typescript");
    expect(body).toContain("lang-go");
    expect(body).toContain("lang-javascript");
    expect(body).toContain("lang-java");
    // Each language class has a distinct dot color
    expect(body).toContain(".timeline-item.lang-python::before");
    expect(body).toContain(".timeline-item.lang-go::before");
  });

  it("language tags are clickable and filter the timeline dynamically", async () => {
    const res = await app.request("/v1/github-timeline");
    const body = await res.text();
    expect(body).toContain("cursor: pointer");
    expect(body).toContain("activeFilter");
    expect(body).toContain("timeline-tag-active");
  });
});

describe("GET /v1/blogging-timeline", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/blogging-timeline");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Blogging Timeline");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
  });

  it("sets correct response headers", async () => {
    const res = await app.request("/v1/blogging-timeline");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
  });

  it("HTML contains theme reading logic", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    expect(body).toContain(".get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });

  it("HTML contains postMessage resize contract", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    expect(body).toContain("embed.oshineye.resize");
    expect(body).toContain("document.body.scrollHeight");
  });

  it("contains baked-in blog post data (no runtime API call)", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    expect(body).not.toContain("feeds/posts");
    expect(body).toContain("timeline-item");
    expect(body).toContain("timeline-title");
    expect(body).toContain("blog.oshineye.com");
  });

  it("defaults to showing last 2 years only", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    expect(body).toContain("data-year=");
    expect(body).toContain(".get('years')");
    expect(body).toMatch(/var\s+n\s*=\s*.*\|\|\s*2/);
  });

  it("supports ?years=all to show full history", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    expect(body).toContain("'all'");
  });

  it("includes category tags on posts", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    expect(body).toContain("timeline-tag");
  });

  it("tags are clickable and filter the timeline dynamically", async () => {
    const res = await app.request("/v1/blogging-timeline");
    const body = await res.text();
    // Tags have cursor pointer styling
    expect(body).toContain("cursor: pointer");
    // Click handler filters by data-categories
    expect(body).toContain("data-categories");
    expect(body).toContain("activeFilter");
    // Active tag gets a visual indicator
    expect(body).toContain("timeline-tag-active");
  });
});

describe("GET /v1/cloudflare-architecture-viz", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Cloudflare Architecture");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
  });

  it("sets correct response headers", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
  });

  it("HTML contains theme reading logic", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    expect(body).toContain(".get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });

  it("HTML contains postMessage resize contract", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    expect(body).toContain("embed.oshineye.resize");
    expect(body).toContain("document.body.scrollHeight");
  });

  it("uses Gardener product-icon color palette", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // Uses Workers orange-500 from the Gardener palette
    expect(body).toContain("#f97316");
    // Uses gray-900 for dark mode background
    expect(body).toContain("#111827");
  });

  it("contains baked-in architecture data for Adewale's projects", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // embed.oshineye.dev project
    expect(body).toContain("embed.oshineye.dev");
    // Should contain known Cloudflare primitives
    expect(body).toContain("Workers");
    expect(body).toContain("Durable Objects");
    expect(body).toContain("Static Assets");
  });

  it("supports switching between projects", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // Project selector
    expect(body).toContain("project-selector");
    // Multiple projects baked in
    expect(body).toContain("switchProject");
  });

});

describe("Mermaid diagram generation", () => {
  it("Mermaid source contains classDef for node colours", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // The source is baked into data-mermaid-source attribute (Gardener palette)
    expect(body).toContain("classDef workers fill:#f97316");
    expect(body).toContain("classDef cron fill:#f59e0b");
    expect(body).toContain("classDef queues fill:#14b8a6");
  });

  it("Mermaid source applies class to nodes with shape syntax", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // Source is in data-mermaid-source attribute where " → &quot;
    // Workers uses rounded shape: ("label")
    expect(body).toContain("Workers(&quot;Workers&quot;):::workers");
    // D1 uses cylinder shape: [("label")]
    expect(body).toContain("D1[(&quot;D1&quot;)]:::d1");
  });

  it("rendered SVGs contain icon badge elements", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // Icon badges are SVG groups with class "node-icon-badge"
    expect(body).toContain("node-icon-badge");
  });

  it("rendered SVGs contain detail text elements", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // Detail text shows primitive detail info
    expect(body).toContain("node-detail-text");
    expect(body).toContain("Python");
    expect(body).toContain("Feed entries");
  });

  it("rendered SVGs contain subgraph header styling", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    expect(body).toContain("text-transform: uppercase");
    expect(body).toContain("letter-spacing");
  });

  it("small projects use graph LR, large projects use graph TD", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // planet-cf (4 tiers: client, edge, storage, ai) → TD
    expect(body).toMatch(/data-mermaid-project="planet-cf"[^>]*data-mermaid-source="[^"]*graph TD/i);
    // keyboardia (4 tiers: client, edge, compute, storage) → TD
    expect(body).toMatch(/data-mermaid-project="keyboardia"[^>]*data-mermaid-source="[^"]*graph TD/i);
    // vaders (3 tiers: client, edge, compute) → LR
    expect(body).toMatch(/data-mermaid-project="vaders"[^>]*data-mermaid-source="[^"]*graph LR/i);
  });

  it("Mermaid source uses cylinder syntax for storage nodes", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=keyboardia");
    const body = await res.text();
    // KV uses cylinder: [("label")]
    expect(body).toContain("KV[(&quot;KV&quot;)]:::kv");
    // R2 uses cylinder
    expect(body).toContain("R2[(&quot;R2&quot;)]:::r2");
  });

  it("Mermaid source uses stadium syntax for scheduling nodes", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // Cron uses stadium: (["label"])
    expect(body).toContain("CronTrigger([&quot;Cron Trigger&quot;]):::cron");
    // Queues uses stadium
    expect(body).toContain("Queues([&quot;Queues&quot;]):::queues");
  });

  it("rendered SVGs contain groupShadow filter", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    expect(body).toContain("groupShadow");
    expect(body).toContain("feDropShadow");
  });

  it("rendered SVGs contain rounded corners on subgraph rects", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    expect(body).toContain('rx="6"');
    expect(body).toContain('ry="6"');
  });

  it("planet-cf Mermaid source contains canonical tier names", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // Canonical tiers based on PRIMITIVE_TIER: Client, Edge, Storage, AI
    expect(body).toContain("Client");
    expect(body).toContain("Edge");
    expect(body).toContain("Storage");
    // AI tier label in subgraph header
    expect(body).toMatch(/subgraph\s+AI/);
  });

  it("rendered SVGs contain enrichment color CSS variables", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // Enrichment colors are set via BM's CSS variables in the SVG style block
    expect(body).toContain("#9ca3af"); // line color (gray-400)
    expect(body).toContain("#e5e7eb"); // border color (gray-200)
  });
});

describe("PRIMITIVE_TIER completeness", () => {
  // These tests enforce that every primitive used in the system has a
  // canonical tier assignment. Adding a new CF primitive without updating
  // PRIMITIVE_TIER will fail here.

  it("every primitive in PRIMITIVE_COLORS has a PRIMITIVE_TIER entry", async () => {
    const { PRIMITIVE_COLORS, PRIMITIVE_TIER } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const prim of Object.keys(PRIMITIVE_COLORS)) {
      expect(PRIMITIVE_TIER, `Missing PRIMITIVE_TIER entry for "${prim}"`).toHaveProperty(prim);
    }
  });

  it("every primitive in PRIMITIVE_ICONS has a PRIMITIVE_TIER entry", async () => {
    const { PRIMITIVE_ICONS, PRIMITIVE_TIER } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const prim of Object.keys(PRIMITIVE_ICONS)) {
      expect(PRIMITIVE_TIER, `Missing PRIMITIVE_TIER entry for "${prim}"`).toHaveProperty(prim);
    }
  });

  it("every node in PROJECTS uses a primitive in PRIMITIVE_TIER", async () => {
    const { PROJECTS, PRIMITIVE_TIER } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const project of PROJECTS) {
      for (const node of project.nodes) {
        expect(
          PRIMITIVE_TIER,
          `${project.id}: node "${node.label}" uses unknown primitive "${node.primitive}"`
        ).toHaveProperty(node.primitive);
      }
    }
  });

  it("every node in TEAM_REGISTRY projects uses a primitive in PRIMITIVE_TIER", async () => {
    const { TEAM_REGISTRY, PRIMITIVE_TIER } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      for (const project of entry.projects) {
        for (const node of project.nodes) {
          expect(
            PRIMITIVE_TIER,
            `${username}/${project.id}: node "${node.label}" uses unknown primitive "${node.primitive}"`
          ).toHaveProperty(node.primitive);
        }
      }
    }
  });

  it("PRIMITIVE_TIER, PRIMITIVE_COLORS, and PRIMITIVE_ICONS cover the same set", async () => {
    const { PRIMITIVE_TIER, PRIMITIVE_COLORS, PRIMITIVE_ICONS } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const tierKeys = new Set(Object.keys(PRIMITIVE_TIER));
    const colorKeys = new Set(Object.keys(PRIMITIVE_COLORS));
    const iconKeys = new Set(Object.keys(PRIMITIVE_ICONS));
    expect([...tierKeys].sort()).toEqual([...colorKeys].sort());
    expect([...tierKeys].sort()).toEqual([...iconKeys].sort());
  });
});

describe("Layout scoring", () => {
  it("scoreOrdering returns valid LayoutScore for each project", async () => {
    const { PROJECTS, scoreOrdering, computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );

    for (const project of PROJECTS) {
      const tiers = computeTiers(project.nodes);
      const score = scoreOrdering(tiers, project.flows);
      expect(score.composite).toBeGreaterThanOrEqual(0);
      expect(score.composite).toBeLessThanOrEqual(100);
      expect(score.barycenterDeviation).toBeGreaterThanOrEqual(0);
      expect(score.svgEdgeCrossings).toBeGreaterThanOrEqual(0);
      // Graph-only scoreOrdering sets SVG edge length to 0
      expect(score.svgEdgeLength).toBe(0);
    }
  });

  it("optimized diagrams have SVG-level scores populated", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // data-mermaid-score is the composite from SVG-level scoring
    const scores = [...body.matchAll(/data-mermaid-score="(\d+)"/g)].map(m => parseInt(m[1]));
    expect(scores.length).toBeGreaterThan(0);
    // SVG-level composite should be reasonable (not 0, which would mean no SVG scoring)
    for (const score of scores) {
      expect(score).toBeGreaterThan(0);
    }
  });

  it("countSvgEdgeCrossings detects geometric crossings in SVG polylines", async () => {
    const { countSvgEdgeCrossings } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    // Two crossing polylines: one going left-to-right, one going right-to-left
    const crossingSvg = `
      <polyline class="edge" points="0,0 100,100" />
      <polyline class="edge" points="100,0 0,100" />
    `;
    expect(countSvgEdgeCrossings(crossingSvg)).toBe(1);

    // Two parallel polylines: no crossings
    const parallelSvg = `
      <polyline class="edge" points="0,0 100,0" />
      <polyline class="edge" points="0,10 100,10" />
    `;
    expect(countSvgEdgeCrossings(parallelSvg)).toBe(0);
  });

  it("all projects score >= 60 composite after optimization", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // Each project div has data-mermaid-score attribute
    const scores = [...body.matchAll(/data-mermaid-score="(\d+)"/g)].map(m => parseInt(m[1]));
    expect(scores.length).toBeGreaterThan(0);
    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(60);
    }
  });

  it("barycenter ordering beats initial ordering for all projects", async () => {
    const { PROJECTS, scoreOrdering, barycenterOrder, computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );

    for (const project of PROJECTS) {
      const tiers = computeTiers(project.nodes);
      const bcTiers = barycenterOrder(tiers, project.flows);
      const bcScore = scoreOrdering(bcTiers, project.flows);
      const initialScore = scoreOrdering(tiers, project.flows);
      expect(
        bcScore.composite,
        `${project.id}: barycenter (${bcScore.composite}) should be >= initial (${initialScore.composite})`
      ).toBeGreaterThanOrEqual(initialScore.composite);
    }
  });

  it("all team project diagrams score >= 60 composite", async () => {
    const { TEAM_RENDERED } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/team-svgs"
    );
    for (const [username, rendered] of Object.entries(TEAM_RENDERED)) {
      for (const [id, diagram] of Object.entries(rendered.light)) {
        expect(
          diagram.composite,
          `${username}/${id} composite=${diagram.composite}`
        ).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it("barycenter ordering beats initial ordering for all team projects", async () => {
    const { TEAM_REGISTRY, scoreOrdering, barycenterOrder, computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const [, entry] of Object.entries(TEAM_REGISTRY)) {
      for (const project of entry.projects) {
        const tiers = computeTiers(project.nodes);
        const bcTiers = barycenterOrder(tiers, project.flows);
        const bcScore = scoreOrdering(bcTiers, project.flows);
        const initialScore = scoreOrdering(tiers, project.flows);
        expect(bcScore.composite).toBeGreaterThanOrEqual(initialScore.composite);
      }
    }
  });

  it("pre-rendered scores show meaningful variation across projects", async () => {
    const { TEAM_RENDERED } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/team-svgs"
    );
    const scores: number[] = [];
    for (const rendered of Object.values(TEAM_RENDERED)) {
      for (const diagram of Object.values(rendered.light)) {
        scores.push(diagram.composite);
      }
    }
    const unique = new Set(scores);
    expect(unique.size).toBeGreaterThan(3);
  });

  it("scoreOrdering returns valid scores for every team project", async () => {
    const { TEAM_REGISTRY, scoreOrdering, computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const [, entry] of Object.entries(TEAM_REGISTRY)) {
      for (const project of entry.projects) {
        const tiers = computeTiers(project.nodes);
        const score = scoreOrdering(tiers, project.flows);
        expect(score.composite).toBeGreaterThanOrEqual(0);
        expect(score.composite).toBeLessThanOrEqual(100);
        expect(score.barycenterDeviation).toBeGreaterThanOrEqual(0);
        expect(score.barycenterDeviation).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("escapeAttr", () => {
  it("escapes ampersands, quotes, and angle brackets", async () => {
    const { escapeAttr } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    expect(escapeAttr('a&b"c<d')).toBe("a&amp;b&quot;c&lt;d");
  });

  it("leaves clean strings unchanged", async () => {
    const { escapeAttr } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    expect(escapeAttr("hello world")).toBe("hello world");
  });

  it("handles empty string", async () => {
    const { escapeAttr } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    expect(escapeAttr("")).toBe("");
  });
});

describe("computeSvgTotalEdgeLength", () => {
  it("computes Manhattan distance for simple polylines", async () => {
    const { computeSvgTotalEdgeLength } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const svg = '<polyline class="edge" points="0,0 100,0 100,50" />';
    expect(computeSvgTotalEdgeLength(svg)).toBe(150);
  });

  it("returns 0 for SVG with no edges", async () => {
    const { computeSvgTotalEdgeLength } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    expect(computeSvgTotalEdgeLength("<svg></svg>")).toBe(0);
  });
});

describe("computeTiers", () => {
  it("groups nodes into canonical tier order", async () => {
    const { computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const nodes = [
      { label: "DB", primitive: "d1", detail: "" },
      { label: "Worker", primitive: "workers", detail: "" },
      { label: "User", primitive: "client", detail: "" },
    ];
    const tiers = computeTiers(nodes);
    expect(tiers.map(t => t.category)).toEqual(["client", "edge", "storage"]);
    expect(tiers[0].nodes[0].label).toBe("User");
    expect(tiers[1].nodes[0].label).toBe("Worker");
    expect(tiers[2].nodes[0].label).toBe("DB");
  });

  it("omits tiers with no nodes", async () => {
    const { computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const nodes = [
      { label: "Worker", primitive: "workers", detail: "" },
    ];
    const tiers = computeTiers(nodes);
    expect(tiers.length).toBe(1);
    expect(tiers[0].category).toBe("edge");
  });

  it("handles single-node projects", async () => {
    const { computeTiers } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const nodes = [
      { label: "AI", primitive: "ai", detail: "" },
    ];
    const tiers = computeTiers(nodes);
    expect(tiers.length).toBe(1);
    expect(tiers[0].category).toBe("ai");
    expect(tiers[0].nodes.length).toBe(1);
  });
});

describe("dark theme for main embed", () => {
  it("returns dark-themed HTML for ?theme=dark", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?theme=dark");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("data-mermaid-project");
  });
});

describe("GET /team-architectures", () => {
  it("returns 200 with gallery page", async () => {
    const res = await app.request("/team-architectures");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Team Architectures");
    expect(body).toContain("<!DOCTYPE html>");
  });

  it("contains avatar images for users with projects", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures");
    const body = await res.text();
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length > 0) {
        expect(body).toContain(`github.com/${username}.png`);
        expect(body).toContain(entry.displayName);
      }
    }
  });

  it("contains links to sub-pages", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures");
    const body = await res.text();
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length > 0) {
        expect(body).toContain(`/team-architectures/${username}`);
      }
    }
  });

  it("contains GitHub profile links with icon", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures");
    const body = await res.text();
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length > 0) {
        expect(body).toContain(`href="https://github.com/${username}"`);
      }
    }
    expect(body).toContain("gh-link");
    expect(body).toContain("viewBox");
  });

  it("supports dark theme", async () => {
    const res = await app.request("/team-architectures?theme=dark");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("#1f2937");
  });
});

describe("GET /team-architectures/:username (grid page)", () => {
  it("returns 200 with project grid for every user", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length === 0) continue;
      const res = await app.request(`/team-architectures/${username}`);
      expect(res.status, `${username} should return 200`).toBe(200);
      const body = await res.text();
      expect(body).toContain("<!DOCTYPE html>");
      expect(body).toContain(entry.displayName);
    }
  });

  it("contains all project SVGs for the user", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures/adewale");
    const body = await res.text();
    const entry = TEAM_REGISTRY["adewale"];
    for (const p of entry.projects) {
      expect(body, `should contain project ${p.id}`).toContain(`/team-architectures/adewale/${p.id}`);
    }
  });

  it("contains project card links to /:username/:projectId", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures/adewale");
    const body = await res.text();
    const entry = TEAM_REGISTRY["adewale"];
    for (const p of entry.projects) {
      expect(body).toContain(`href="/team-architectures/adewale/${p.id}"`);
    }
  });

  it("shows user avatar and display name", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures/adewale");
    const body = await res.text();
    const entry = TEAM_REGISTRY["adewale"];
    expect(body).toContain(entry.displayName);
    expect(body).toContain("github.com/adewale.png");
    expect(body).toContain(`href="https://github.com/adewale"`);
  });

  it("supports dark theme on user grid page", async () => {
    const res = await app.request("/team-architectures/adewale?theme=dark");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("#1f2937");
    expect(body).toContain('class="dark"');
  });

  it("returns 404 for unknown username", async () => {
    const res = await app.request("/team-architectures/nobody");
    expect(res.status).toBe(404);
  });
});

describe("GET /team-architectures/:username/:projectId (paginated)", () => {
  it("returns 200 with single SVG for every user's first project", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length === 0) continue;
      const projectId = entry.projects[0].id;
      const res = await app.request(`/team-architectures/${username}/${projectId}`);
      expect(res.status, `${username}/${projectId} should return 200`).toBe(200);
      const body = await res.text();
      expect(body).toContain(entry.displayName);
      expect(body).toContain("mermaid-project-svg");
    }
  });

  it("contains exactly ONE mermaid-project-svg div", async () => {
    const res = await app.request("/team-architectures/adewale/planet-cf");
    const body = await res.text();
    const matches = body.match(/class="mermaid-project-svg"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it("contains ACTIVE_PROJECT with back link and display name", async () => {
    const res = await app.request("/team-architectures/adewale/planet-cf");
    const body = await res.text();
    expect(body).toContain("ACTIVE_PROJECT");
    expect(body).toContain("_BACK_URL");
    expect(body).toContain("_DISPLAY_NAME");
  });

  it("returns dark-themed SVGs for ?theme=dark", async () => {
    const res = await app.request("/team-architectures/adewale/planet-cf?theme=dark");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("#1f2937");
    expect(body).toContain("mermaid-project-svg");
  });

  it("pre-rendered SVGs contain icon badges and detail text", async () => {
    const res = await app.request("/team-architectures/adewale/planet-cf");
    const body = await res.text();
    expect(body).toContain("node-icon-badge");
    expect(body).toContain("node-detail-text");
  });

  it("returns 404 for unknown project ID", async () => {
    const res = await app.request("/team-architectures/adewale/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown username", async () => {
    const res = await app.request("/team-architectures/nobody/planet-cf");
    expect(res.status).toBe(404);
  });

  it("contains back link to user grid page", async () => {
    const res = await app.request("/team-architectures/adewale/planet-cf");
    const body = await res.text();
    expect(body).toContain("/team-architectures/adewale");
    expect(body).toContain("Ade");
  });
});

describe("TEAM_RENDERED / TEAM_REGISTRY sync", () => {
  it("TEAM_RENDERED has an entry for every user in TEAM_REGISTRY with projects", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const { TEAM_RENDERED } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/team-svgs"
    );
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length === 0) continue;
      expect(TEAM_RENDERED, `Missing TEAM_RENDERED entry for "${username}"`).toHaveProperty(username);
      expect(TEAM_RENDERED[username]).toHaveProperty("light");
      expect(TEAM_RENDERED[username]).toHaveProperty("dark");
    }
  });

  it("TEAM_RENDERED project IDs match TEAM_REGISTRY project IDs", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const { TEAM_RENDERED } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/team-svgs"
    );
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length === 0) continue;
      const rendered = TEAM_RENDERED[username];
      if (!rendered) continue;

      const expectedIds = new Set(entry.projects.map((p: { id: string }) => p.id));
      const lightIds = new Set(Object.keys(rendered.light));
      const darkIds = new Set(Object.keys(rendered.dark));

      expect([...lightIds].sort(), `${username}: light project IDs mismatch`).toEqual([...expectedIds].sort());
      expect([...darkIds].sort(), `${username}: dark project IDs mismatch`).toEqual([...expectedIds].sort());
    }
  });

  it("ADE_RENDERED project IDs match PROJECTS", async () => {
    const { PROJECTS } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const { ADE_RENDERED } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/team-svgs"
    );
    const expectedIds = new Set(PROJECTS.map((p: { id: string }) => p.id));
    const lightIds = new Set(Object.keys(ADE_RENDERED.light));
    expect([...lightIds].sort()).toEqual([...expectedIds].sort());
  });

  it("every pre-rendered SVG has non-empty svg and source", async () => {
    const { TEAM_RENDERED, ADE_RENDERED } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/team-svgs"
    );
    for (const [username, rendered] of Object.entries(TEAM_RENDERED)) {
      for (const [id, diagram] of Object.entries(rendered.light)) {
        expect(diagram.svg.length, `${username}/${id} light SVG is empty`).toBeGreaterThan(100);
        expect(diagram.source.length, `${username}/${id} light source is empty`).toBeGreaterThan(10);
      }
      for (const [id, diagram] of Object.entries(rendered.dark)) {
        expect(diagram.svg.length, `${username}/${id} dark SVG is empty`).toBeGreaterThan(100);
        expect(diagram.source.length, `${username}/${id} dark source is empty`).toBeGreaterThan(10);
      }
    }
    for (const [id, diagram] of Object.entries(ADE_RENDERED.light)) {
      expect(diagram.svg.length, `ade/${id} light SVG is empty`).toBeGreaterThan(100);
      expect(diagram.source.length, `ade/${id} light source is empty`).toBeGreaterThan(10);
    }
  });

  it("totalDiscovered >= projects.length for every user", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    for (const [username, entry] of Object.entries(TEAM_REGISTRY)) {
      expect(
        entry.totalDiscovered,
        `${username}: totalDiscovered (${entry.totalDiscovered}) < projects.length (${entry.projects.length})`
      ).toBeGreaterThanOrEqual(entry.projects.length);
    }
  });

  it("totalDiscovered values are diverse across users", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const totals = Object.values(TEAM_REGISTRY).map((e: { totalDiscovered: number }) => e.totalDiscovered);
    const unique = new Set(totals);
    expect(unique.size, `All ${totals.length} users have totalDiscovered=${totals[0]} — suspicious`).toBeGreaterThan(1);
  });
});

describe("Gallery HTML structure", () => {
  it("cards do not use nested <a> tags", async () => {
    const res = await app.request("/team-architectures");
    const body = await res.text();
    // Cards should be <div class="card">, not <a class="card">
    expect(body).not.toMatch(/<a[^>]*class="card"/);
    expect(body).toMatch(/<div[^>]*class="card"/);
  });

  it("gallery shows actual project counts", async () => {
    const { TEAM_REGISTRY } = await import(
      "../src/embeds/v1/cloudflare-architecture-viz/mermaid"
    );
    const res = await app.request("/team-architectures");
    const body = await res.text();
    for (const [, entry] of Object.entries(TEAM_REGISTRY)) {
      if (entry.projects.length === 0) continue;
      expect(body).toContain(`${entry.projects.length} project`);
    }
  });

  it("rendered user pages include mermaid source in data attributes", async () => {
    const res = await app.request("/team-architectures/adewale/planet-cf");
    const body = await res.text();
    // Each SVG div should have data-mermaid-source with actual mermaid syntax
    const sources = body.match(/data-mermaid-source="([^"]*)"/g);
    expect(sources).not.toBeNull();
    expect(sources!.length).toBeGreaterThan(0);
    // Mermaid source should contain graph directive
    for (const attr of sources!) {
      const value = attr.replace(/data-mermaid-source="/, "").replace(/"$/, "");
      const decoded = value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      expect(decoded, "Mermaid source should contain graph directive").toMatch(/graph (LR|TD)/);
    }
  });
});

describe("removed routes", () => {
  it("/u/:username returns 404", async () => {
    const res = await app.request("/u/fayazara");
    expect(res.status).toBe(404);
  });

  it("/fayaz returns 404", async () => {
    const res = await app.request("/fayaz");
    expect(res.status).toBe(404);
  });
});

describe("catalogue page", () => {
  it("contains links to each embed", async () => {
    const res = await app.request("/");
    const body = await res.text();
    expect(body).toContain('href="/v1/avatar-stack"');
    expect(body).toContain('href="/v1/avatar-stack-playground"');
    expect(body).toContain('href="/v1/github-timeline"');
    expect(body).toContain('href="/v1/blogging-timeline"');
    expect(body).toContain('href="/v1/cloudflare-architecture-viz"');
  });

  it("contains link to team architectures", async () => {
    const res = await app.request("/");
    const body = await res.text();
    expect(body).toContain('href="/team-architectures"');
    expect(body).toContain("Architecture Diagrams");
  });

  it("returns HTML content type", async () => {
    const res = await app.request("/");
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });
});
