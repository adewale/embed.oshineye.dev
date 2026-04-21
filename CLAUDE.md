# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript Cloudflare Workers service (using Hono) that hosts self-contained interactive visualisations, embedded via `<iframe>` in Blogger posts and other sites. Hosted at `embed.oshineye.dev`.

The full spec is in `specs/embeds.md` — read it before making architectural decisions.

## Commands

```bash
npx wrangler dev              # Local dev server
npx wrangler deploy           # Deploy to Cloudflare Workers
npx wrangler whoami           # Verify Cloudflare auth
npm test                      # Run tests
npm run test -- --testNamePattern "pattern"  # Run a single test
npm run build:team-architectures             # Refresh team architecture data + SVGs
python3 scripts/build_user_architectures.py <username> --open  # One-user standalone report
```

## Architecture

- **Runtime:** Cloudflare Workers with Static Assets
- **Framework:** Hono (typed routes)
- **Config:** `wrangler.jsonc`

### URL scheme

- `GET /` — catalogue page
- `GET /team-architectures` — team architecture gallery
- `GET /team-architectures/:username` — user architecture page
- `GET /team-architectures/:username/:projectId` — project architecture page
- `GET /user-architectures/:username` — redirect to generated standalone report
- `GET /v1/:slug` — embed page (iframe target), accepts `?theme=light|dark`
- `GET /static/*` — JS/CSS/image assets

### Key directories

- `src/index.ts` — Hono app, routes, headers middleware
- `src/middleware/embed-headers.ts` — X-Frame-Options, CSP, CORS, Cache headers
- `src/embeds/v1/{slug}/index.html` — one self-contained HTML page per visualisation
- `data/team-discovery.json` — cached team repo snapshots and discovered projects
- `public/user-architectures/*.html` — generated standalone user architecture reports
- `public/static/loader.js` — universal embed loader script (creates iframe, handles postMessage resize)

### Required response headers for `/v1/:slug`

Every embed response must include `X-Frame-Options: ALLOWALL`, permissive `Content-Security-Policy` with `frame-ancestors *`, and `Access-Control-Allow-Origin: *`. See `specs/embeds.md` for the full header set.

### Allowed CDN origins (CSP allowlist)

`cdnjs.cloudflare.com` (preferred), `cdn.jsdelivr.net`, `unpkg.com`, `esm.sh`, `d3js.org`. Adding a new CDN requires updating the CSP in `embed-headers` middleware.

## Adding a new visualisation

1. Create `src/embeds/v1/{slug}/index.html` (self-contained HTML+CSS+JS)
2. Read theme from URL: `new URL(location.href).searchParams.get('theme') || 'light'`
3. Include resize observer snippet for auto-height via `postMessage({ type: 'embed.oshineye.resize', height })`
4. Target < 200 KB compressed per embed

## Constraints

- Size budget: < 200 KB compressed per embed (< 100 KB ideal)
- Worker script size limit: 3 MiB free / 10 MiB paid
- No shared dependencies across embeds (each iframe is isolated)
- No server-side storage in v1 (KV/D1 deferred)
- No build pipeline per visualisation in v1 — one HTML file per embed
- Always set `compatibility_date` in `wrangler.jsonc`
- Never commit `.dev.vars` (contains secrets)
- Always use prepared statements with `.bind()` for D1 queries (when storage is added)

## Development Approach: TDD

Use test-driven development with red-green-refactor. Work in vertical slices (one test -> one implementation -> repeat), never horizontal (all tests first, then all code).

### TDD cycle

1. **Plan** — confirm interface and which behaviors to test with the user
2. **Tracer bullet** — write ONE test for ONE behavior, watch it fail, write minimal code to pass
3. **Incremental loop** — repeat for each remaining behavior
4. **Refactor** — only after all tests pass; never refactor while red

### Test quality

- Tests verify behavior through public interfaces, not implementation details
- Mock only at system boundaries (external APIs, time, randomness), never internal collaborators
- Use dependency injection for external dependencies
- A good test survives internal refactors unchanged

## Cloudflare-Specific Patterns

- Prefer `wrangler.jsonc` over `wrangler.toml` for comments support
- Workers Static Assets are configured via `wrangler.jsonc` `assets` field
- Wrangler's built-in text-module defaults already cover `.html`; don't add a redundant custom `.html` rule
- Static asset requests are free and unlimited on Cloudflare
- For Hono on Workers, export the app as default: `export default app`
