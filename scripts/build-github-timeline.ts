/**
 * Fetches public repos for github.com/adewale and generates
 * a static github-timeline HTML embed with all data baked in.
 *
 * Usage: npx tsx scripts/build-github-timeline.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateTimelineHtml,
  escapeHtml,
  MONTHS,
  type TimelineItem,
  type StyleFn,
} from "./lib/timeline-template.ts";

interface Repo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  created_at: string;
  fork: boolean;
}

const USERNAME = "adewale";
const OUT_PATH = join(
  import.meta.dirname,
  "..",
  "src",
  "embeds",
  "v1",
  "github-timeline",
  "index.html"
);

async function fetchAllRepos(): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=created&direction=desc&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "embeds-build-script" },
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}: ${await res.text()}`);
    }

    const batch: Repo[] = await res.json();
    if (batch.length === 0) break;

    repos.push(...batch);
    page++;
  }

  return repos;
}

function repoToItem(repo: Repo): TimelineItem {
  const date = new Date(repo.created_at);
  return {
    year: date.getFullYear(),
    month: MONTHS[date.getMonth()],
    title: repo.name,
    url: `https://github.com/adewale/${encodeURIComponent(repo.name)}`,
    description: repo.description || undefined,
    tags: repo.language ? [repo.language] : undefined,
    dataAttrs: { fork: String(repo.fork) },
  };
}

/** Style function: forks get dimmed with a muted dot. */
const githubStyleFn: StyleFn = (item) => {
  if (item.dataAttrs?.fork === "true") {
    return { itemClass: "fork", dotClass: "dot-muted" };
  }
  return {};
};

const EXTRA_CSS = `

    .timeline-item.fork {
      opacity: 0.55;
    }

    .timeline-item.dot-muted::before {
      background: var(--muted);
    }`;

const EXTRA_JS = `
      // Hide forks by default; show with ?forks=show
      if (params.get('forks') !== 'show') {
        var forks = document.querySelectorAll('[data-fork="true"]');
        for (var i = 0; i < forks.length; i++) {
          forks[i].style.display = 'none';
        }
        // Hide year headers that have no visible items after them
        var headers = document.querySelectorAll('.year-header');
        for (var i = 0; i < headers.length; i++) {
          var next = headers[i].nextElementSibling;
          var hasVisible = false;
          while (next && !next.classList.contains('year-header')) {
            if (next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
          }
          if (!hasVisible) headers[i].style.display = 'none';
        }
      }
`;

async function main() {
  console.log(`Fetching repos for ${USERNAME}...`);
  const repos = await fetchAllRepos();
  console.log(`Fetched ${repos.length} repos.`);

  const items = repos.map(repoToItem);
  const html = generateTimelineHtml({
    title: "GitHub Timeline",
    items,
    defaultYears: 2,
    extraCss: EXTRA_CSS,
    extraJs: EXTRA_JS,
    styleFn: githubStyleFn,
  });

  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
