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
    dataAttrs: {
      fork: String(repo.fork),
      ...(repo.language ? { language: repo.language.toLowerCase() } : {}),
    },
  };
}

/** Map languages to CSS classes for dot color coding. */
const LANGUAGE_STYLES: Record<string, string> = {
  python: "lang-python",
  typescript: "lang-typescript",
  javascript: "lang-javascript",
  go: "lang-go",
  java: "lang-java",
  ruby: "lang-ruby",
  "c++": "lang-cpp",
  html: "lang-html",
  css: "lang-css",
  shell: "lang-shell",
};

/** Style function: language dot color + fork dimming. */
const githubStyleFn: StyleFn = (item) => {
  const classes: string[] = [];

  if (item.dataAttrs?.fork === "true") {
    classes.push("fork");
  }

  if (item.tags && item.tags.length > 0) {
    const lang = item.tags[0].toLowerCase();
    if (LANGUAGE_STYLES[lang]) {
      classes.push(LANGUAGE_STYLES[lang]);
    }
  }

  return classes.length > 0 ? { itemClass: classes.join(" ") } : {};
};

const EXTRA_CSS = `

    .timeline-item.fork {
      opacity: 0.55;
    }

    .timeline-item.fork::before {
      background: var(--muted);
    }

    .timeline-item.lang-python::before {
      background: #3572A5;
    }

    .timeline-item.lang-typescript::before {
      background: #3178C6;
    }

    .timeline-item.lang-javascript::before {
      background: #f1e05a;
    }

    .timeline-item.lang-go::before {
      background: #00ADD8;
    }

    .timeline-item.lang-java::before {
      background: #b07219;
    }

    .timeline-item.lang-ruby::before {
      background: #701516;
    }

    .timeline-item.lang-cpp::before {
      background: #f34b7d;
    }

    .timeline-item.lang-html::before {
      background: #e34c26;
    }

    .timeline-item.lang-css::before {
      background: #563d7c;
    }

    .timeline-item.lang-shell::before {
      background: #89e051;
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
      // Hide forks by default; show with ?forks=show
      var showForks = params.get('forks') === 'show';
      if (!showForks) {
        var forks = document.querySelectorAll('[data-fork="true"]');
        for (var i = 0; i < forks.length; i++) {
          forks[i].style.display = 'none';
          forks[i].setAttribute('data-hidden-by-forks', 'true');
        }
      }

      // Refresh year header visibility based on visible children
      function refreshYearHeaders() {
        var headers = document.querySelectorAll('.year-header');
        for (var i = 0; i < headers.length; i++) {
          if (headers[i].getAttribute('data-hidden-by-years') === 'true') continue;
          var next = headers[i].nextElementSibling;
          var hasVisible = false;
          while (next && !next.classList.contains('year-header')) {
            if (next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
          }
          headers[i].style.display = hasVisible ? '' : 'none';
        }
      }
      refreshYearHeaders();

      // Interactive language tag filtering
      var activeFilter = null;
      document.getElementById('timeline').addEventListener('click', function (e) {
        var tag = e.target.closest('.timeline-tag');
        if (!tag) return;

        var filterText = tag.textContent.trim().toLowerCase();

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

        // Show/hide items based on filter
        var items = document.querySelectorAll('.timeline-item');
        for (var i = 0; i < items.length; i++) {
          if (items[i].getAttribute('data-hidden-by-years') === 'true') continue;
          if (!showForks && items[i].getAttribute('data-hidden-by-forks') === 'true') continue;

          if (!activeFilter) {
            items[i].style.display = '';
          } else {
            var lang = (items[i].getAttribute('data-language') || '').toLowerCase();
            items[i].style.display = lang === activeFilter ? '' : 'none';
          }
        }

        refreshYearHeaders();
      });
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
