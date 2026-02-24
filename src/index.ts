import { Hono } from "hono";
import { embedHeaders } from "./middleware/embed-headers";
import { embeds, embedsBySlug } from "./embeds/registry";
import {
  renderAllMermaidSvgs,
  buildMermaidHtml,
} from "./embeds/v1/cloudflare-architecture-viz/mermaid";
import archVizHtml from "./embeds/v1/cloudflare-architecture-viz/index.html";

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
