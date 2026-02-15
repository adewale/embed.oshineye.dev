const PALETTE = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1", "#3949AB", "#1E88E5",
  "#039BE5", "#00ACC1", "#00897B", "#43A047", "#7CB342", "#C0CA33",
  "#FDD835", "#FFB300", "#FB8C00", "#F4511E", "#6D4C41", "#757575",
];

const ANIMALS = [
  "Fox", "Owl", "Bear", "Wolf", "Hawk", "Deer",
  "Lynx", "Hare", "Seal", "Crow", "Dove", "Swan",
  "Orca", "Ibis", "Wren", "Kite", "Newt", "Moth",
  "Wasp", "Crab", "Toad", "Mole", "Vole", "Lark",
];

/** Simple string hash — deterministic, not cryptographic. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface PlayerIdentity {
  name: string;
  color: string;
  initial: string;
}

/** Deterministic identity from a playerId string. */
export function getIdentity(playerId: string): PlayerIdentity {
  const h = hash(playerId);
  const color = PALETTE[h % PALETTE.length];
  const name = ANIMALS[h % ANIMALS.length];
  const initial = name.charAt(0);
  return { name, color, initial };
}
