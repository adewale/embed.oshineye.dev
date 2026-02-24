import { Hono } from "hono";
import { embedHeaders } from "./middleware/embed-headers";
import { embeds, embedsBySlug } from "./embeds/registry";
import {
  renderAllMermaidSvgs,
  buildMermaidHtml,
  escapeAttr,
  TEAM_REGISTRY,
  PRIMITIVE_TIER,
} from "./embeds/v1/cloudflare-architecture-viz/mermaid";
import type { UserEntry } from "./embeds/v1/cloudflare-architecture-viz/mermaid";
import { TEAM_RENDERED } from "./embeds/v1/cloudflare-architecture-viz/team-svgs";
import type { PreRenderedDiagrams } from "./embeds/v1/cloudflare-architecture-viz/team-svgs";
import archVizHtml from "./embeds/v1/cloudflare-architecture-viz/index.html";

const TIER_ORDER = ["client", "edge", "compute", "storage", "ai"];
const TIER_LABELS: Record<string, string> = {
  client: "Client", edge: "Edge", compute: "Compute", storage: "Storage", ai: "AI",
};

// Transform server-side project data to client-side format (with computed tiers)
function toClientProjects(entry: UserEntry, username: string) {
  return entry.projects.map((p) => {
    const groups = new Map<string, { label: string; detail: string }[]>();
    for (const node of p.nodes) {
      const cat = PRIMITIVE_TIER[node.primitive];
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push({ label: node.label, detail: node.detail });
    }
    const tiers = TIER_ORDER
      .filter((cat) => groups.has(cat))
      .map((cat) => ({ label: TIER_LABELS[cat], nodes: groups.get(cat)! }));
    return {
      id: p.id,
      name: p.id,
      description: "",
      url: `https://github.com/${username}/${p.id}`,
      tiers,
      flows: p.flows,
    };
  });
}

// Build mermaid HTML from pre-rendered SVG data (no runtime rendering)
function buildPreRenderedHtml(diagrams: PreRenderedDiagrams, defaultProject: string): string {
  return Object.entries(diagrams)
    .map(
      ([id, { svg, source, composite }]) =>
        `<div class="mermaid-project-svg" data-mermaid-project="${id}" data-mermaid-source="${escapeAttr(source)}" data-mermaid-score="${composite}" style="${id !== defaultProject ? "display: none" : ""}">${svg}</div>`
    )
    .join("\n");
}

// Render a user's architecture page using pre-rendered SVGs
function renderUserPage(entry: UserEntry, username: string, theme: string, projectId?: string) {
  const rendered = TEAM_RENDERED[username];
  if (!rendered) return null;
  const defaultProject = projectId || entry.projects[0].id;
  const diagrams = theme === "dark" ? rendered.dark : rendered.light;
  const mermaidHtml = buildPreRenderedHtml(diagrams, defaultProject);
  const clientProjects = toClientProjects(entry, username);
  return archVizHtml
    .replace("<!-- MERMAID_DIAGRAMS -->", mermaidHtml)
    .replace(
      "var PROJECTS = [",
      `var PROJECTS = ${JSON.stringify(clientProjects)};var _IGNORE = [`
    )
    .replace("<title>Cloudflare Architecture</title>", `<title>${entry.displayName}'s Cloudflare Architecture</title>`)
    .replace(">Cloudflare Architecture</h1>", `>${entry.displayName}'s Cloudflare Architecture</h1>`);
}

export { PresenceRoom } from "./presence/room";

type Env = {
  Bindings: {
    PRESENCE_ROOM: DurableObjectNamespace;
  };
};

const app = new Hono<Env>();

// Index / catalogue page
app.get("/", (c) => {
  const embedList = embeds
    .map(
      (e) =>
        `<li><a href="/v1/${e.slug}">${e.title}</a> &mdash; ${e.description}</li>`
    )
    .join("\n        ");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Embeds Catalogue — embed.oshineye.dev</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 640px;
      margin: 40px auto;
      padding: 0 24px;
      color: #1a1a2e;
      line-height: 1.6;
    }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    h2 { font-size: 1.1rem; margin-top: 28px; margin-bottom: 8px; color: #333; }
    p { color: #555; margin-bottom: 24px; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 12px; }
    a { color: #0f3460; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Embeds Catalogue</h1>
  <p>Self-contained interactive visualisations, designed to be embedded via iframe.</p>
  <ul>
    ${embedList}
  </ul>
  <h2>Architecture Diagrams</h2>
  <ul>
    <li><a href="/team-architectures">Team Architectures</a> &mdash; Cloudflare architecture diagrams for the team</li>
  </ul>
</body>
</html>`;

  return c.html(html);
});

// WebSocket upgrade for avatar-stack presence (before embed headers middleware)
app.get("/v1/avatar-stack/ws", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket", 426);
  }

  const page = c.req.query("page") || "default";
  const playerId = c.req.query("playerId");
  if (!playerId) {
    return c.text("Missing playerId", 400);
  }

  const id = c.env.PRESENCE_ROOM.idFromName(page);
  const stub = c.env.PRESENCE_ROOM.get(id);
  return stub.fetch(c.req.raw);
});

// Apply embed headers middleware to all /v1/* routes
app.use("/v1/*", embedHeaders);

// Serve cloudflare-architecture-viz with server-side Mermaid rendering
app.get("/v1/cloudflare-architecture-viz", (c) => {
  const theme = c.req.query("theme") || "light";
  const project = c.req.query("project") || "planet-cf";
  const diagrams = renderAllMermaidSvgs(theme);
  const mermaidHtml = buildMermaidHtml(diagrams, project);
  const html = archVizHtml.replace("<!-- MERMAID_DIAGRAMS -->", mermaidHtml);
  return c.html(html);
});

// Team architectures gallery page
app.get("/team-architectures", (c) => {
  const theme = c.req.query("theme") || "light";
  const isDark = theme === "dark";

  const cards = Object.entries(TEAM_REGISTRY)
    .filter(([, entry]) => entry.projects.length > 0)
    .map(([username, entry]) => {
      const uniquePrims = new Set<string>();
      for (const p of entry.projects) {
        for (const n of p.nodes) {
          if (n.primitive !== "client" && n.primitive !== "terminal") {
            uniquePrims.add(n.primitive);
          }
        }
      }
      const badges = [...uniquePrims]
        .map((p) => `<span class="badge">${p}</span>`)
        .join(" ");
      return `<a href="/team-architectures/${username}?theme=${theme}" class="card">
        <img src="https://github.com/${username}.png?size=80" alt="${entry.displayName}" width="48" height="48" class="avatar" />
        <div class="card-body">
          <strong class="name">${entry.displayName}</strong>
          <span class="meta">${entry.projects.length} project${entry.projects.length !== 1 ? "s" : ""}</span>
          <div class="badges">${badges}</div>
        </div>
      </a>`;
    })
    .join("\n      ");

  const html = `<!DOCTYPE html>
<html lang="en" class="${isDark ? "dark" : ""}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Architectures — embed.oshineye.dev</title>
  <style>
    :root {
      --bg: #f9fafb;
      --fg: #111827;
      --surface: #ffffff;
      --surface-hover: #f9fafb;
      --border: #e5e7eb;
      --text: #111827;
      --text-muted: #6b7280;
      --accent: #f97316;
      --accent-dark: #ea580c;
    }
    :root.dark {
      --bg: #111827;
      --fg: #f9fafb;
      --surface: #1f2937;
      --surface-hover: #374151;
      --border: #374151;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --accent: #f97316;
      --accent-dark: #ea580c;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg); color: var(--text);
      max-width: 960px; margin: 0 auto; padding: 32px 24px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .subtitle { color: var(--text-muted); margin-bottom: 24px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }
    .card {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px; border-radius: 8px;
      background: var(--surface); border: 1px solid var(--border);
      text-decoration: none; color: var(--text);
      transition: border-color 0.15s;
    }
    .card:hover { border-color: var(--accent); }
    .avatar { border-radius: 50%; flex-shrink: 0; }
    .card-body { min-width: 0; }
    .name { display: block; color: var(--accent); font-size: 0.95rem; }
    .meta { display: block; font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 6px; }
    .badges { display: flex; flex-wrap: wrap; gap: 4px; }
    .badge {
      font-size: 0.65rem; padding: 1px 6px; border-radius: 4px;
      background: var(--surface-hover); color: var(--text-muted);
      border: 1px solid var(--border);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <h1>Team Architectures</h1>
  <p class="subtitle">Cloudflare architecture diagrams for the team</p>
  <div class="grid">
      ${cards}
  </div>
</body>
</html>`;

  return c.html(html);
});

// Team architectures user sub-page (serves pre-rendered SVGs — no runtime rendering)
app.get("/team-architectures/:username", (c) => {
  const username = c.req.param("username");
  const entry = TEAM_REGISTRY[username];
  if (!entry || entry.projects.length === 0) return c.text("Not Found", 404);

  const theme = c.req.query("theme") || "light";
  const project = c.req.query("project");
  const html = renderUserPage(entry, username, theme, project);
  if (!html) return c.text("Not Found", 404);
  return c.html(html);
});

// Serve embed by slug
app.get("/v1/:slug", (c) => {
  const slug = c.req.param("slug");
  const embed = embedsBySlug.get(slug);

  if (!embed) {
    return c.text("Not Found", 404);
  }

  return c.html(embed.html);
});

export default app;
