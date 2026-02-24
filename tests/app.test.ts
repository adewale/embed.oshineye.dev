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

  it("uses Cloudflare official color palette", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // Uses accent orange from the design system
    expect(body).toContain("#e85e2e");
    // Uses warm dark brown for dark mode background
    expect(body).toContain("#1a120e");
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
    // The source is baked into data-mermaid-source attribute
    expect(body).toContain("classDef workers fill:#e85e2e");
    expect(body).toContain("classDef cron fill:#a26a09");
    expect(body).toContain("classDef queues fill:#9f5bb0");
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

  it("small projects use graph LR, planet-cf uses graph TD", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // planet-cf (4 effective tiers) → TD
    expect(body).toMatch(/data-mermaid-source="[^"]*graph TD[^"]*" /i);
    // keyboardia (3 tiers) → LR
    expect(body).toMatch(/data-mermaid-project="keyboardia"[^>]*data-mermaid-source="[^"]*graph LR/i);
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

  it("planet-cf Mermaid source contains nested subgraph", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz?project=planet-cf");
    const body = await res.text();
    // Backend is a wrapper subgraph containing Scheduling and Storage & AI
    expect(body).toContain("Backend");
    expect(body).toContain("Scheduling");
    expect(body).toContain("Storage &amp; AI");
  });

  it("rendered SVGs contain enrichment color CSS variables", async () => {
    const res = await app.request("/v1/cloudflare-architecture-viz");
    const body = await res.text();
    // Enrichment colors are set via BM's CSS variables in the SVG style block
    expect(body).toContain("#8b7355"); // line color
    expect(body).toContain("#d4c4aa"); // border color (light mode)
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

  it("returns HTML content type", async () => {
    const res = await app.request("/");
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });
});
