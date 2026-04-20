import { Hono } from "hono";
import { embedHeaders } from "./middleware/embed-headers";
import { embeds, embedsBySlug } from "./embeds/registry";
import {
  escapeAttr,
  TEAM_REGISTRY,
  PRIMITIVE_TIER,
  PROJECTS,
} from "./embeds/v1/cloudflare-architecture-viz/mermaid";
import type { UserEntry } from "./embeds/v1/cloudflare-architecture-viz/mermaid";
import { TEAM_RENDERED, ADE_RENDERED } from "./embeds/v1/cloudflare-architecture-viz/team-svgs";
import type { PreRenderedDiagrams } from "./embeds/v1/cloudflare-architecture-viz/team-svgs";
import archVizHtml from "./embeds/v1/cloudflare-architecture-viz/index.html";
import { EMDASH_LIGHT, EMDASH_DARK } from "./embeds/v1/emdash-architecture-diagram/svgs";
import emdashHtml from "./embeds/v1/emdash-architecture-diagram/index.html";

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

// Build mermaid HTML from pre-rendered SVG data — ALL projects (for embed route)
function buildPreRenderedHtml(diagrams: PreRenderedDiagrams, defaultProject: string): string {
  return Object.entries(diagrams)
    .map(
      ([id, { svg, source, composite }]) =>
        `<div class="mermaid-project-svg" data-mermaid-project="${id}" data-mermaid-source="${escapeAttr(source)}" data-mermaid-score="${composite}" style="${id !== defaultProject ? "display: none" : ""}">${svg}</div>`
    )
    .join("\n");
}

// Build mermaid HTML for a SINGLE project (for paginated team pages)
function buildSingleProjectHtml(diagrams: PreRenderedDiagrams, projectId: string): string {
  const diagram = diagrams[projectId];
  if (!diagram) return "";
  return `<div class="mermaid-project-svg" data-mermaid-project="${projectId}" data-mermaid-source="${escapeAttr(diagram.source)}" data-mermaid-score="${diagram.composite}">${diagram.svg}</div>`;
}

// Render a single project page for a team member (paginated — one SVG per page)
function renderProjectPage(entry: UserEntry, username: string, theme: string, projectId: string) {
  const rendered = TEAM_RENDERED[username];
  if (!rendered) return null;
  const diagrams = theme === "dark" ? rendered.dark : rendered.light;
  if (!diagrams[projectId]) return null;

  const mermaidHtml = buildSingleProjectHtml(diagrams, projectId);
  const activeProject = toClientProjects(entry, username).find((p) => p.id === projectId);
  const themeParam = theme !== "light" ? `?theme=${theme}` : "";
  const backUrl = `/team-architectures/${username}${themeParam}`;

  return archVizHtml
    .replace("<!-- MERMAID_DIAGRAMS -->", mermaidHtml)
    .replace(
      "var PROJECTS = [",
      `var ACTIVE_PROJECT = ${JSON.stringify(activeProject)};var _BACK_URL = "${backUrl}";var _DISPLAY_NAME = "${entry.displayName}";var _IGNORE = [`
    )
    .replace("<title>Cloudflare Architecture</title>", `<title>${entry.displayName}'s ${projectId}</title>`)
    .replace(">Cloudflare Architecture</h1>", `>${entry.displayName}'s Cloudflare Architecture</h1>`);
}

// Render a grid page showing all projects for a team member
function renderUserGridPage(entry: UserEntry, username: string, theme: string): string {
  const isDark = theme === "dark";
  const themeParam = theme !== "light" ? `?theme=${theme}` : "";

  const projectCards = entry.projects
    .map((p) => {
      const uniquePrims = new Set<string>();
      for (const n of p.nodes) {
        if (n.primitive !== "client" && n.primitive !== "terminal") {
          uniquePrims.add(n.primitive);
        }
      }
      const badges = [...uniquePrims]
        .map((prim) => `<span class="badge">${prim}</span>`)
        .join(" ");
      return `<a class="project-card" href="/team-architectures/${username}/${p.id}${themeParam}">
        <strong class="project-name">${p.id}</strong>
        <div class="badges">${badges}</div>
      </a>`;
    })
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? "dark" : ""}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entry.displayName}'s Architectures — embed.oshineye.dev</title>
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
    .user-header {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 24px;
    }
    .user-header .avatar { border-radius: 50%; flex-shrink: 0; }
    .user-header .user-info { min-width: 0; }
    .user-header h1 { font-size: 1.5rem; margin-bottom: 2px; }
    .user-header .gh-link {
      color: var(--text-muted); display: inline-flex; align-items: center;
      text-decoration: none; font-size: 0.85rem; gap: 4px;
      transition: color 0.15s;
    }
    .user-header .gh-link:hover { color: var(--accent); }
    .back-link {
      display: inline-block; margin-bottom: 16px;
      color: var(--text-muted); text-decoration: none; font-size: 0.85rem;
    }
    .back-link:hover { color: var(--accent); }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
      body { padding: 20px 16px; }
      .user-header h1 { font-size: 1.25rem; }
    }
    .project-card {
      display: block; padding: 16px; border-radius: 8px;
      background: var(--surface); border: 1px solid var(--border);
      text-decoration: none; color: var(--text);
      transition: border-color 0.15s;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .project-card:hover { border-color: var(--accent); }
    .project-card:active { border-color: var(--accent); background: var(--surface-hover); }
    .project-name { color: var(--accent); font-size: 0.95rem; display: block; margin-bottom: 8px; }
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
  <a class="back-link" href="/team-architectures${themeParam}">&larr; Back to team</a>
  <div class="user-header">
    <img src="https://github.com/${username}.png?size=80" alt="${entry.displayName}" width="64" height="64" class="avatar" />
    <div class="user-info">
      <h1>${entry.displayName}</h1>
      <a href="https://github.com/${username}" class="gh-link" target="_blank" rel="noopener">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        ${username}
      </a>
    </div>
  </div>
  <div class="grid">
      ${projectCards}
  </div>
</body>
</html>`;
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

// Serve cloudflare-architecture-viz with pre-rendered SVGs
app.get("/v1/cloudflare-architecture-viz", (c) => {
  const theme = c.req.query("theme") || "light";
  const project = c.req.query("project") || "planet-cf";
  const diagrams = theme === "dark" ? ADE_RENDERED.dark : ADE_RENDERED.light;
  const mermaidHtml = buildPreRenderedHtml(diagrams, project);
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
      const themeParam = theme !== "light" ? `?theme=${theme}` : "";
      return `<div class="card" onclick="window.location='/team-architectures/${username}${themeParam}'" role="link" tabindex="0">
        <img src="https://github.com/${username}.png?size=80" alt="${entry.displayName}" width="48" height="48" class="avatar" />
        <div class="card-body">
          <div class="card-header">
            <strong class="name">${entry.displayName}</strong>
            <a href="https://github.com/${username}" class="gh-link" target="_blank" rel="noopener" title="GitHub profile" onclick="event.stopPropagation()"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
          </div>
          <span class="meta">${entry.projects.length} project${entry.projects.length !== 1 ? "s" : ""}</span>
          <div class="badges">${badges}</div>
        </div>
      </div>`;
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
    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
      body { padding: 20px 16px; }
      h1 { font-size: 1.25rem; }
    }
    .card {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px; border-radius: 8px;
      background: var(--surface); border: 1px solid var(--border);
      text-decoration: none; color: var(--text);
      transition: border-color 0.15s;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .card:hover { border-color: var(--accent); }
    .card:active { border-color: var(--accent); background: var(--surface-hover); }
    .avatar { border-radius: 50%; flex-shrink: 0; }
    .card-body { min-width: 0; flex: 1; }
    .card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .name { color: var(--accent); font-size: 0.95rem; }
    .gh-link { color: var(--text-muted); display: flex; align-items: center; transition: color 0.15s; flex-shrink: 0; padding: 4px; margin: -4px; }
    .gh-link:hover { color: var(--accent); }
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

// Team architectures user page — grid of all projects
app.get("/team-architectures/:username", (c) => {
  const username = c.req.param("username");
  const entry = TEAM_REGISTRY[username];
  if (!entry || entry.projects.length === 0) return c.text("Not Found", 404);

  const theme = c.req.query("theme") || "light";
  const html = renderUserGridPage(entry, username, theme);
  return c.html(html);
});

// Team architectures single project page (paginated — one SVG per page)
app.get("/team-architectures/:username/:projectId", (c) => {
  const username = c.req.param("username");
  const projectId = c.req.param("projectId");
  const entry = TEAM_REGISTRY[username];
  if (!entry || entry.projects.length === 0) return c.text("Not Found", 404);
  if (!entry.projects.some((p) => p.id === projectId)) return c.text("Not Found", 404);

  const theme = c.req.query("theme") || "light";
  const html = renderProjectPage(entry, username, theme, projectId);
  if (!html) return c.text("Not Found", 404);
  return c.html(html);
});

// Serve emdash architecture diagram with pre-rendered SVGs
app.get("/v1/emdash-architecture-diagram", (c) => {
  const theme = c.req.query("theme") || "light";
  const svgs = theme === "dark" ? EMDASH_DARK : EMDASH_LIGHT;
  const viewSvgsHtml = Object.entries(svgs)
    .map(([id, svg]) => `<div class="emdash-view-svg" data-view-id="${id}">${svg}</div>`)
    .join("\n");
  const html = emdashHtml.replace("<!-- EMDASH_DIAGRAMS -->", viewSvgsHtml);
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
