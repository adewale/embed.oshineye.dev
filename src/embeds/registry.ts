import avatarStackHtml from "./v1/avatar-stack/index.html";
import avatarStackPlaygroundHtml from "./v1/avatar-stack-playground/index.html";
import githubTimelineHtml from "./v1/github-timeline/index.html";
import bloggingTimelineHtml from "./v1/blogging-timeline/index.html";
import cloudflareArchitectureVizHtml from "./v1/cloudflare-architecture-viz/index.html";

export interface EmbedEntry {
  slug: string;
  title: string;
  description: string;
  html: string;
}

export const embeds: EmbedEntry[] = [
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
  {
    slug: "github-timeline",
    title: "GitHub Timeline",
    description: "A timeline of public GitHub projects for adewale, newest first. Shows last 2 years by default; use ?years=all for full history, ?forks=show to include forks.",
    html: githubTimelineHtml,
  },
  {
    slug: "blogging-timeline",
    title: "Blogging Timeline",
    description: "A timeline of blog posts from blog.oshineye.com, newest first. Shows last 2 years by default; use ?years=all for full history.",
    html: bloggingTimelineHtml,
  },
  {
    slug: "cloudflare-architecture-viz",
    title: "Cloudflare Architecture",
    description: "Interactive architecture diagrams showing Cloudflare primitives and data flows for real projects. Switch between projects to compare architectures.",
    html: cloudflareArchitectureVizHtml,
  },
];

export const embedsBySlug = new Map<string, EmbedEntry>(
  embeds.map((e) => [e.slug, e])
);
