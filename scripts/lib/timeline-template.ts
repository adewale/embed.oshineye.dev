/**
 * Shared timeline template for generating static timeline embeds.
 *
 * Each embed provides its own data and a style function that controls
 * how individual items are rendered (dot color, card class, opacity).
 */

export interface TimelineItem {
  year: number;
  month: string;
  title: string;
  url: string;
  description?: string;
  tags?: string[];
  /** Extra data-* attributes for client-side filtering (e.g. data-fork="true") */
  dataAttrs?: Record<string, string>;
}

export interface ItemStyle {
  /** Extra CSS class(es) added to the .timeline-item div */
  itemClass?: string;
  /** Inline style for the timeline dot (::before is CSS-only, so this uses a class) */
  dotClass?: string;
}

/**
 * A function that decides how each timeline item should be styled.
 * Called at build time for each item. Return classes that map to
 * CSS rules provided via extraCss.
 */
export type StyleFn = (item: TimelineItem) => ItemStyle;

export interface TimelineConfig {
  title: string;
  items: TimelineItem[];
  /** Default value for ?years=N filtering. Default: 2. */
  defaultYears?: number;
  /** Additional CSS rules (e.g. for .fork, .category-web) */
  extraCss?: string;
  /** Additional JS injected after theme/years logic, before resize observer */
  extraJs?: string;
  /** Per-item style function. Called at build time. */
  styleFn?: StyleFn;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildTimelineItems(config: TimelineConfig): string {
  const { items, styleFn } = config;
  let html = "";
  let currentYear: number | null = null;

  for (const item of items) {
    if (item.year !== currentYear) {
      currentYear = item.year;
      html += `    <div class="year-header" data-year="${item.year}">${item.year}</div>\n`;
    }

    const style = styleFn ? styleFn(item) : {};
    const classes = ["timeline-item", style.itemClass, style.dotClass]
      .filter(Boolean)
      .join(" ");

    const dataAttrs = item.dataAttrs
      ? Object.entries(item.dataAttrs)
          .map(([k, v]) => ` data-${k}="${escapeHtml(v)}"`)
          .join("")
      : "";

    html += `    <div class="${classes}" data-year="${item.year}"${dataAttrs}>\n`;
    html += `      <div class="timeline-date">${item.month} ${item.year}</div>\n`;
    html += `      <div class="timeline-title"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a></div>\n`;

    if (item.description) {
      html += `      <div class="timeline-desc">${escapeHtml(item.description)}</div>\n`;
    }

    if (item.tags && item.tags.length > 0) {
      for (const tag of item.tags) {
        html += `      <span class="timeline-tag">${escapeHtml(tag)}</span>\n`;
      }
    }

    html += `    </div>\n`;
  }

  return html;
}

export function generateTimelineHtml(config: TimelineConfig): string {
  const defaultYears = config.defaultYears ?? 2;
  const timelineItems = buildTimelineItems(config);
  const extraCss = config.extraCss ? `\n${config.extraCss}` : "";
  const extraJs = config.extraJs
    ? `\n${config.extraJs}\n`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a2e;
      --accent: #0f3460;
      --line: #e0e0e0;
      --dot: #e94560;
      --card-bg: #f8f9fa;
      --card-border: #dee2e6;
      --tag-bg: #e9ecef;
      --tag-text: #495057;
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
      --tag-bg: #0f3460;
      --tag-text: #e0e0e0;
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

    .timeline-tag {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--tag-bg);
      color: var(--tag-text);
      margin-top: 4px;
      margin-right: 4px;
    }${extraCss}
  </style>
</head>
<body>
  <h1>${escapeHtml(config.title)}</h1>
  <div class="timeline" id="timeline">
${timelineItems}  </div>

  <script>
    (function () {
      var params = new URL(location.href).searchParams;
      var theme = params.get('theme') || 'light';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
${extraJs}
      // Filter by ?years=N (default: ${defaultYears}). Use ?years=all to show full history.
      var yearsParam = params.get('years');
      if (yearsParam !== 'all') {
        var n = parseInt(yearsParam, 10) || ${defaultYears};
        if (n > 0) {
          var cutoff = new Date().getFullYear() - n;
          var items = document.querySelectorAll('[data-year]');
          for (var i = 0; i < items.length; i++) {
            var year = parseInt(items[i].getAttribute('data-year'), 10);
            if (year <= cutoff) {
              items[i].style.display = 'none';
              items[i].setAttribute('data-hidden-by-years', 'true');
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
