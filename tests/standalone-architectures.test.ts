import { describe, expect, it } from "vitest";
import { buildStandaloneArchitecturesHtml } from "../src/embeds/v1/cloudflare-architecture-viz/standalone";

describe("buildStandaloneArchitecturesHtml", () => {
  it("renders a standalone page with project metadata, flows, and SVGs", () => {
    const html = buildStandaloneArchitecturesHtml(
      {
        username: "timowilhelm",
        displayName: "Timo Wilhelm",
        totalDiscovered: 1,
        projects: [
          {
            id: "worker-ide",
            nodes: [
              { label: "Browser", primitive: "client", detail: "User" },
              { label: "Workers", primitive: "workers", detail: "Router" },
              { label: "D1", primitive: "d1", detail: "Database" },
            ],
            flows: [
              { from: "Browser", to: "Workers", label: "Open app" },
              { from: "Workers", to: "D1", label: "Read data" },
            ],
          },
        ],
      },
      {
        "worker-ide": {
          svg: "<svg><text>diagram</text></svg>",
          source: "graph TD",
          score: {
            crossings: 0,
            bends: 0,
            edgeLength: 0,
            overlapPenalty: 0,
            width: 0,
            height: 0,
            area: 0,
            composite: 1,
          },
        },
      },
    );

    expect(html).toContain("Timo Wilhelm Architecture Diagrams");
    expect(html).toContain("Projects found: 1 of 1");
    expect(html).toContain("https://github.com/timowilhelm/worker-ide");
    expect(html).toContain("<span class=\"badge\">workers</span>");
    expect(html).toContain("Open app");
    expect(html).toContain("<svg><text>diagram</text></svg>");
  });
});
