import { describe, it, expect } from "vitest";
import { getIdentity, ANIMALS, PALETTE, COLOR_NAMES } from "../src/presence/identity";

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

  it("initial is the first character of the animal name", () => {
    const result = getIdentity("another-id");
    // Name is "Color Animal", initial should be first char of the animal part
    const animal = result.name.split(" ").slice(1).join(" ");
    expect(result.initial).toBe(animal.charAt(0));
  });

  it("name is a non-empty string", () => {
    const result = getIdentity("yet-another-id");
    expect(result.name.length).toBeGreaterThan(0);
  });
});

describe("identity pool sizes match Keyboardia", () => {
  it("has 73 animals", () => {
    expect(ANIMALS).toHaveLength(73);
  });

  it("has 18 colors", () => {
    expect(PALETTE).toHaveLength(18);
  });

  it("has 18 color names matching the palette", () => {
    expect(COLOR_NAMES).toHaveLength(18);
  });

  it("produces 1,314 unique combinations (18 x 73)", () => {
    expect(PALETTE.length * ANIMALS.length).toBe(1314);
  });
});

describe("display name format", () => {
  it("name is 'Color Animal' format (e.g. 'Red Fox')", () => {
    const result = getIdentity("test-id-123");
    const parts = result.name.split(" ");
    expect(parts.length).toBeGreaterThanOrEqual(2);
    // Color name should be from COLOR_NAMES
    expect(COLOR_NAMES).toContain(parts[0]);
    // Animal should be from ANIMALS
    expect(ANIMALS).toContain(parts.slice(1).join(" "));
  });
});

describe("independent color and animal distribution", () => {
  it("same animal can have different colors across different player IDs", () => {
    // Generate many identities and check that at least one animal appears with multiple colors
    const animalColors = new Map<string, Set<string>>();
    for (let i = 0; i < 500; i++) {
      const id = getIdentity(`player-${i}`);
      const animal = id.name.split(" ").slice(1).join(" ");
      if (!animalColors.has(animal)) animalColors.set(animal, new Set());
      animalColors.get(animal)!.add(id.color);
    }

    // At least some animals should appear with more than one color
    const multiColorAnimals = [...animalColors.values()].filter(
      (colors) => colors.size > 1
    );
    expect(multiColorAnimals.length).toBeGreaterThan(0);
  });

  it("same color can have different animals across different player IDs", () => {
    const colorAnimals = new Map<string, Set<string>>();
    for (let i = 0; i < 500; i++) {
      const id = getIdentity(`player-${i}`);
      const animal = id.name.split(" ").slice(1).join(" ");
      if (!colorAnimals.has(id.color)) colorAnimals.set(id.color, new Set());
      colorAnimals.get(id.color)!.add(animal);
    }

    const multiAnimalColors = [...colorAnimals.values()].filter(
      (animals) => animals.size > 1
    );
    expect(multiAnimalColors.length).toBeGreaterThan(0);
  });
});

describe("collision resistance", () => {
  it("100 random player IDs produce at least 80 unique display names", () => {
    const names = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = getIdentity(`uuid-${crypto.randomUUID()}`);
      names.add(id.name);
    }
    expect(names.size).toBeGreaterThanOrEqual(80);
  });
});
