import { Hono } from "hono";
import { embedHeaders } from "./middleware/embed-headers";
import { embeds, embedsBySlug } from "./embeds/registry";

const app = new Hono();

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
  <title>Embeds Catalogue — embeds.oshineye.dev</title>
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

// Apply embed headers middleware to all /v1/* routes
app.use("/v1/*", embedHeaders);

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
