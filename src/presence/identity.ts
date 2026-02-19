export const PALETTE = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1", "#3949AB", "#1E88E5",
  "#039BE5", "#00ACC1", "#00897B", "#43A047", "#7CB342", "#C0CA33",
  "#FDD835", "#FFB300", "#FB8C00", "#F4511E", "#6D4C41", "#757575",
];

export const COLOR_NAMES = [
  "Red", "Pink", "Purple", "Violet", "Indigo", "Blue",
  "Sky", "Cyan", "Teal", "Green", "Lime", "Olive",
  "Yellow", "Amber", "Orange", "Coral", "Brown", "Grey",
];

export const ANIMALS = [
  "Ant", "Badger", "Bat", "Bear", "Beaver", "Bee", "Bird", "Bison",
  "Butterfly", "Camel", "Cat", "Cheetah", "Chicken", "Crab", "Crow",
  "Deer", "Dog", "Dolphin", "Dove", "Dragon", "Duck", "Eagle", "Elephant",
  "Falcon", "Fish", "Flamingo", "Fox", "Frog", "Giraffe", "Goat",
  "Gorilla", "Hamster", "Hawk", "Hedgehog", "Hippo", "Horse", "Jaguar",
  "Kangaroo", "Koala", "Lemur", "Leopard", "Lion", "Llama", "Lobster",
  "Monkey", "Moose", "Mouse", "Octopus", "Otter", "Owl", "Panda",
  "Panther", "Parrot", "Peacock", "Penguin", "Pig", "Puma", "Rabbit",
  "Raccoon", "Raven", "Rhino", "Seal", "Shark", "Sheep", "Snake",
  "Spider", "Squid", "Swan", "Tiger", "Turtle", "Whale", "Wolf", "Zebra",
];

/** Simple string hash — deterministic, not cryptographic. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h; // Convert to 32-bit integer
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
  const colorIndex = h % PALETTE.length;
  const animalIndex = (h >> 8) % ANIMALS.length;

  const color = PALETTE[colorIndex];
  const colorName = COLOR_NAMES[colorIndex];
  const animal = ANIMALS[animalIndex];
  const initial = animal.charAt(0);

  return { name: `${colorName} ${animal}`, color, initial };
}
