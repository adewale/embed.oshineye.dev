import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("GET /", () => {
  it("returns 200 and lists available embeds", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("reading-timeline");
    expect(body).toContain("tech-radar");
    expect(body).toContain("Embeds Catalogue");
  });
});

describe("GET /v1/reading-timeline", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/reading-timeline");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Reading Timeline");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
  });
});

describe("GET /v1/tech-radar", () => {
  it("returns 200 with correct HTML", async () => {
    const res = await app.request("/v1/tech-radar");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Tech Radar");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("ResizeObserver");
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
    const res = await app.request("/v1/reading-timeline");
    expect(res.headers.get("X-Frame-Options")).toBe("ALLOWALL");
  });

  it("sets correct Content-Security-Policy on /v1/* responses", async () => {
    const res = await app.request("/v1/tech-radar");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors *");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://d3js.org");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("connect-src 'self' https:");
    expect(csp).toContain("font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;");
  });

  it("sets Access-Control-Allow-Origin: * on /v1/* responses", async () => {
    const res = await app.request("/v1/reading-timeline");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("sets Cache-Control on /v1/* responses", async () => {
    const res = await app.request("/v1/reading-timeline");
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

describe("theme support", () => {
  it("embed HTML contains theme reading logic", async () => {
    const res = await app.request("/v1/reading-timeline");
    const body = await res.text();
    // The embed reads ?theme= from the URL
    expect(body).toContain("searchParams.get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });

  it("embed HTML for tech-radar contains theme reading logic", async () => {
    const res = await app.request("/v1/tech-radar");
    const body = await res.text();
    expect(body).toContain("searchParams.get('theme')");
    expect(body).toContain("'light'");
    expect(body).toContain("'dark'");
  });
});

describe("postMessage resize contract", () => {
  it("embeds include the correct postMessage type string", async () => {
    const res1 = await app.request("/v1/reading-timeline");
    const body1 = await res1.text();
    expect(body1).toContain("embed.oshineye.resize");
    expect(body1).toContain("document.body.scrollHeight");

    const res2 = await app.request("/v1/tech-radar");
    const body2 = await res2.text();
    expect(body2).toContain("embed.oshineye.resize");
    expect(body2).toContain("document.body.scrollHeight");
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
});

describe("GET /v1/avatar-stack/ws", () => {
  it("returns 426 when not a WebSocket upgrade", async () => {
    const res = await app.request("/v1/avatar-stack/ws");
    expect(res.status).toBe(426);
  });
});

describe("catalogue page", () => {
  it("contains links to each embed", async () => {
    const res = await app.request("/");
    const body = await res.text();
    expect(body).toContain('href="/v1/reading-timeline"');
    expect(body).toContain('href="/v1/tech-radar"');
    expect(body).toContain('href="/v1/avatar-stack"');
    expect(body).toContain('href="/v1/avatar-stack-playground"');
  });

  it("returns HTML content type", async () => {
    const res = await app.request("/");
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });
});
