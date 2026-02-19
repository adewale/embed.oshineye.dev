/**
 * Fetches blog posts from blog.oshineye.com (Blogger JSON feed)
 * and generates a static blogging-timeline HTML embed.
 *
 * Usage: npx tsx scripts/build-blogging-timeline.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateTimelineHtml,
  MONTHS,
  type TimelineItem,
  type StyleFn,
} from "./lib/timeline-template.ts";

const BLOG_URL = "https://blog.oshineye.com";
const OUT_PATH = join(
  import.meta.dirname,
  "..",
  "src",
  "embeds",
  "v1",
  "blogging-timeline",
  "index.html"
);

interface BloggerEntry {
  title: { $t: string };
  published: { $t: string };
  link: Array<{ rel: string; href: string }>;
  category?: Array<{ term: string }>;
}

interface BloggerFeed {
  feed: {
    openSearch$totalResults: { $t: string };
    entry?: BloggerEntry[];
  };
}

async function fetchAllPosts(): Promise<BloggerEntry[]> {
  const posts: BloggerEntry[] = [];
  let startIndex = 1;
  const batchSize = 150;

  while (true) {
    const url = `${BLOG_URL}/feeds/posts/default?alt=json&max-results=${batchSize}&start-index=${startIndex}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "embeds-build-script" },
    });

    if (!res.ok) {
      throw new Error(`Blogger feed returned ${res.status}: ${await res.text()}`);
    }

    const data: BloggerFeed = await res.json();
    const entries = data.feed.entry || [];
    if (entries.length === 0) break;

    posts.push(...entries);
    startIndex += entries.length;

    const total = parseInt(data.feed.openSearch$totalResults.$t, 10);
    if (startIndex > total) break;
  }

  return posts;
}

function postToItem(entry: BloggerEntry): TimelineItem {
  const date = new Date(entry.published.$t);
  const altLink = entry.link.find((l) => l.rel === "alternate");
  const url = altLink ? altLink.href : `${BLOG_URL}`;
  const categories = entry.category?.map((c) => c.term) || [];

  return {
    year: date.getFullYear(),
    month: MONTHS[date.getMonth()],
    title: entry.title.$t,
    url,
    tags: categories.length > 0 ? categories : undefined,
    dataAttrs: categories.length > 0 ? { categories: categories.join(",") } : undefined,
  };
}

/**
 * Style function: color the timeline dot based on post category.
 * Posts about presentations/talks get a distinct dot; technical posts
 * get another; everything else gets the default.
 */
const CATEGORY_STYLES: Record<string, { itemClass: string }> = {
  presentations: { itemClass: "cat-presentations" },
  web: { itemClass: "cat-web" },
  "progressive web apps": { itemClass: "cat-web" },
  "artificial intelligence": { itemClass: "cat-ai" },
  "machine learning": { itemClass: "cat-ai" },
  mobile: { itemClass: "cat-mobile" },
  android: { itemClass: "cat-mobile" },
};

const blogStyleFn: StyleFn = (item) => {
  if (!item.tags) return {};

  // Use the first matching category for styling
  for (const tag of item.tags) {
    const lower = tag.toLowerCase();
    if (CATEGORY_STYLES[lower]) {
      return { itemClass: CATEGORY_STYLES[lower].itemClass };
    }
  }

  return {};
};

const EXTRA_CSS = `

    .timeline-item.cat-presentations::before {
      background: #8b5cf6;
    }

    .timeline-item.cat-web::before {
      background: #06b6d4;
    }

    .timeline-item.cat-ai::before {
      background: #f59e0b;
    }

    .timeline-item.cat-mobile::before {
      background: #10b981;
    }

    .timeline-tag {
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .timeline-tag:hover {
      opacity: 0.8;
    }

    .timeline-tag-active {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }`;

const EXTRA_JS = `
      // Interactive tag filtering
      var activeFilter = null;
      document.getElementById('timeline').addEventListener('click', function (e) {
        var tag = e.target.closest('.timeline-tag');
        if (!tag) return;

        var filterText = tag.textContent.trim().toLowerCase();

        // Toggle: clicking the same tag clears the filter
        if (activeFilter === filterText) {
          activeFilter = null;
        } else {
          activeFilter = filterText;
        }

        // Update active indicator on all tags
        var allTags = document.querySelectorAll('.timeline-tag');
        for (var i = 0; i < allTags.length; i++) {
          if (activeFilter && allTags[i].textContent.trim().toLowerCase() === activeFilter) {
            allTags[i].classList.add('timeline-tag-active');
          } else {
            allTags[i].classList.remove('timeline-tag-active');
          }
        }

        // Show/hide items based on filter and existing years visibility
        var items = document.querySelectorAll('.timeline-item');
        for (var i = 0; i < items.length; i++) {
          // Skip items already hidden by years filter
          if (items[i].getAttribute('data-hidden-by-years') === 'true') continue;

          if (!activeFilter) {
            items[i].style.display = '';
          } else {
            var cats = (items[i].getAttribute('data-categories') || '').toLowerCase();
            items[i].style.display = cats.split(',').indexOf(activeFilter) !== -1 ? '' : 'none';
          }
        }

        // Update year header visibility
        var headers = document.querySelectorAll('.year-header');
        for (var i = 0; i < headers.length; i++) {
          // Skip headers already hidden by years filter
          if (headers[i].getAttribute('data-hidden-by-years') === 'true') continue;

          var next = headers[i].nextElementSibling;
          var hasVisible = false;
          while (next && !next.classList.contains('year-header')) {
            if (next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
          }
          headers[i].style.display = hasVisible ? '' : 'none';
        }
      });
`;

async function main() {
  console.log("Fetching blog posts...");
  const posts = await fetchAllPosts();
  console.log(`Fetched ${posts.length} posts.`);

  // Sort newest first
  posts.sort(
    (a, b) =>
      new Date(b.published.$t).getTime() - new Date(a.published.$t).getTime()
  );

  const items = posts.map(postToItem);
  const html = generateTimelineHtml({
    title: "Blogging Timeline",
    items,
    defaultYears: 2,
    extraCss: EXTRA_CSS,
    extraJs: EXTRA_JS,
    styleFn: blogStyleFn,
  });

  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
