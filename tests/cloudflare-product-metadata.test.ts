import { describe, expect, it } from "vitest";
import {
  PRIMITIVE_COLORS,
  PRIMITIVE_ICONS,
  PRIMITIVE_TIER,
} from "../src/embeds/v1/cloudflare-architecture-viz/mermaid";

describe("expanded Cloudflare product metadata", () => {
  it("provides tier, color, and icon metadata for richer detected products", () => {
    const products = [
      "pages",
      "ai-gateway",
      "containers",
      "hyperdrive",
      "images",
      "email",
      "analytics-engine",
      "workers-for-platforms",
      "secret-store",
      "realtime",
      "stream",
      "voice",
      "sandboxes",
      "agents",
    ] as const;

    for (const product of products) {
      expect(PRIMITIVE_TIER[product], `${product} missing tier`).toBeTruthy();
      expect(PRIMITIVE_COLORS[product], `${product} missing color`).toBeTruthy();
      expect(PRIMITIVE_ICONS[product], `${product} missing icon`).toBeTruthy();
    }
  });
});
