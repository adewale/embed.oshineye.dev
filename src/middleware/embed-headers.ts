import { createMiddleware } from "hono/factory";

export const embedHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("X-Frame-Options", "ALLOWALL");
  c.header(
    "Content-Security-Policy",
    "frame-ancestors *; default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://d3js.org; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; img-src 'self' data: blob:; connect-src 'self' https:; font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;"
  );
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Cache-Control", "public, max-age=3600, s-maxage=86400");
});
