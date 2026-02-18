/**
 * Fetches public repos for github.com/adewale and generates
 * a static github-timeline HTML embed with all data baked in.
 *
 * Usage: npx tsx scripts/build-github-timeline.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildTimelineItems(repos: Repo[]): string {
  let html = "";
  let currentYear: number | null = null;

  for (const repo of repos) {
    const date = new Date(repo.created_at);
    const year = date.getFullYear();
    const month = MONTHS[date.getMonth()];

    if (year !== currentYear) {
      currentYear = year;
      html += `    <div class="year-header" data-year="${year}">${year}</div>\n`;
    }

    html += `    <div class="timeline-item${repo.fork ? ' fork' : ''}" data-year="${year}" data-fork="${repo.fork}">\n`;
    html += `      <div class="timeline-date">${month} ${year}</div>\n`;
    html += `      <div class="timeline-title"><a href="https://github.com/adewale/${escapeHtml(repo.name)}" target="_blank" rel="noopener">${escapeHtml(repo.name)}</a></div>\n`;

    if (repo.description) {
      html += `      <div class="timeline-desc">${escapeHtml(repo.description)}</div>\n`;
    }

    if (repo.language) {
      html += `      <span class="timeline-lang">${escapeHtml(repo.language)}</span>\n`;
    }

    html += `    </div>\n`;
  }

  return html;
}

function generateHtml(timelineItems: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Timeline</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a2e;
      --accent: #0f3460;
      --line: #e0e0e0;
      --dot: #e94560;
      --card-bg: #f8f9fa;
      --card-border: #dee2e6;
      --lang-bg: #e9ecef;
      --lang-text: #495057;
      --link: #0f3460;
      --muted: #6c757d;
    }

    :root.dark {
      --bg: #1a1a2e;
      --text: #e0e0e0;
      --accent: #e94560;
      --line: #333;
      --dot: #0f3460;
      --card-bg: #16213e;
      --card-border: #0f3460;
      --lang-bg: #0f3460;
      --lang-text: #e0e0e0;
      --link: #e94560;
      --muted: #9ca3af;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.6;
    }

    h1 {
      font-size: 1.25rem;
      margin-bottom: 24px;
      color: var(--accent);
    }

    .timeline {
      position: relative;
      padding-left: 32px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--line);
    }

    .year-header {
      position: relative;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 16px;
      margin-top: 8px;
    }

    .year-header::before {
      content: '';
      position: absolute;
      left: -28px;
      top: 6px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      border: 2px solid var(--bg);
    }

    .timeline-item {
      position: relative;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
    }

    .timeline-item::before {
      content: '';
      position: absolute;
      left: -28px;
      top: 16px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--dot);
      border: 2px solid var(--bg);
    }

    .timeline-date {
      font-size: 0.75rem;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .timeline-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 2px 0;
    }

    .timeline-title a {
      color: var(--link);
      text-decoration: none;
    }

    .timeline-title a:hover {
      text-decoration: underline;
    }

    .timeline-desc {
      font-size: 0.85rem;
      opacity: 0.8;
      margin: 2px 0;
    }

    .timeline-lang {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--lang-bg);
      color: var(--lang-text);
      margin-top: 4px;
    }

    .timeline-item.fork {
      opacity: 0.55;
    }

    .timeline-item.fork::before {
      background: var(--muted);
    }
  </style>
</head>
<body>
  <h1>GitHub Timeline</h1>
  <div class="timeline" id="timeline">
${timelineItems}  </div>

  <script>
    (function () {
      var params = new URL(location.href).searchParams;
      var theme = params.get('theme') || 'light';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }

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

      // Filter by ?years=N (default: 2). Use ?years=all to show full history.
      var yearsParam = params.get('years');
      if (yearsParam !== 'all') {
        var n = parseInt(yearsParam, 10) || 2;
        if (n > 0) {
          var cutoff = new Date().getFullYear() - n;
          var items = document.querySelectorAll('[data-year]');
          for (var i = 0; i < items.length; i++) {
            var year = parseInt(items[i].getAttribute('data-year'), 10);
            if (year <= cutoff) {
              items[i].style.display = 'none';
            }
          }
        }
      }

      // Resize observer for postMessage-based auto-height
      new ResizeObserver(function () {
        window.parent.postMessage(
          { type: 'embed.oshineye.resize', height: document.body.scrollHeight },
          '*'
        );
      }).observe(document.body);
    })();
  </script>
</body>
</html>
`;
}

async function main() {
  console.log(`Fetching repos for ${USERNAME}...`);
  const repos = await fetchAllRepos();
  console.log(`Fetched ${repos.length} repos.`);

  const timelineItems = buildTimelineItems(repos);
  const html = generateHtml(timelineItems);

  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
