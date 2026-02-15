import readingTimelineHtml from "./v1/reading-timeline/index.html";
import techRadarHtml from "./v1/tech-radar/index.html";
import avatarStackHtml from "./v1/avatar-stack/index.html";
import avatarStackPlaygroundHtml from "./v1/avatar-stack-playground/index.html";

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
    description: "A live presence indicator showing visitors currently on the page.",
    html: avatarStackHtml,
  },
  {
    slug: "avatar-stack-playground",
    title: "Avatar Stack Playground",
    description: "Interactive demo of the avatar stack with add/remove controls and layout modes.",
    html: avatarStackPlaygroundHtml,
  },
];

export const embedsBySlug = new Map<string, EmbedEntry>(
  embeds.map((e) => [e.slug, e])
);
