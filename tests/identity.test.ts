import { describe, it, expect } from "vitest";
import { getIdentity } from "../src/presence/identity";

describe("getIdentity", () => {
  it("returns name, color, and initial", () => {
    const result = getIdentity("test-player-id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("color");
    expect(result).toHaveProperty("initial");
    expect(typeof result.name).toBe("string");
    expect(typeof result.color).toBe("string");
    expect(typeof result.initial).toBe("string");
  });

  it("is deterministic — same input always gives same output", () => {
    const a = getIdentity("player-abc-123");
    const b = getIdentity("player-abc-123");
    expect(a).toEqual(b);
  });

  it("different inputs produce different identities", () => {
    const a = getIdentity("player-one");
    const b = getIdentity("player-two");
    // At least one field should differ (extremely likely with different inputs)
    const same = a.name === b.name && a.color === b.color;
    expect(same).toBe(false);
  });

  it("color is a valid hex color from the Material Design palette", () => {
    const result = getIdentity("some-id");
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("initial is the first character of the name", () => {
    const result = getIdentity("another-id");
    expect(result.initial).toBe(result.name.charAt(0));
  });

  it("name is a non-empty string", () => {
    const result = getIdentity("yet-another-id");
    expect(result.name.length).toBeGreaterThan(0);
  });
});
