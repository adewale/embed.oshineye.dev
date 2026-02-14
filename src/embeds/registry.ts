import readingTimelineHtml from "./v1/reading-timeline/index.html";
import techRadarHtml from "./v1/tech-radar/index.html";
import avatarStackHtml from "./v1/avatar-stack/index.html";

export interface EmbedEntry {
  slug: string;
  title: string;
  description: string;
  html: string;
}

export const embeds: EmbedEntry[] = [
  {
    slug: "reading-timeline",
    title: "Reading Timeline",
    description: "A timeline visualisation of books read over time.",
    html: readingTimelineHtml,
  },
  {
    slug: "tech-radar",
    title: "Tech Radar",
    description: "A technology radar showing adoption stages of tools and frameworks.",
    html: techRadarHtml,
  },
  {
    slug: "avatar-stack",
    title: "Avatar Stack",
    description: "An interactive multiplayer avatar stack with the Keyboardia design language.",
    html: avatarStackHtml,
  },
];

export const embedsBySlug = new Map<string, EmbedEntry>(
  embeds.map((e) => [e.slug, e])
);
