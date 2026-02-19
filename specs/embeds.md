# embed.oshineye.dev — Spec

## Overview

A lightweight **TypeScript on Cloudflare Workers** service that hosts self-contained interactive visualisations, designed to be embedded via `<iframe>` in Blogger posts and other sites.

---

## Problem Space — Key Findings

| Concern | Detail |
|---|---|
| **iframe headers** | Cloudflare Workers set `X-Frame-Options: DENY` by default. The worker **must** return permissive `X-Frame-Options` and `Content-Security-Policy: frame-ancestors` headers, or the embed will be blocked. |
| **Blogger compatibility** | Blogger allows `<iframe>` in the HTML editor of posts and in HTML/JS gadgets. No special allow-listing is required for custom domains — standard iframes work. |
| **Cross-origin resize** | iframes don't auto-size. The industry-standard pattern is `window.postMessage({ type: 'resize', height })` from child → parent, with a small loader script on the host page. |
| **CORS** | If visualisations fetch data from external APIs, the worker may need to act as a CORS proxy. For self-contained embeds serving their own HTML, CORS is not a concern. |
| **CSP on embed pages** | The served HTML pages should have a tight CSP (`default-src 'self'; script-src 'self' 'unsafe-inline'` etc.) to protect against injection, since embeds run on a domain you control. |

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────┐
│  Blogger / any site │        │  embed.oshineye.dev          │
│                     │ iframe │  (Cloudflare Worker + Assets) │
│  <iframe src="      │───────▶│                              │
│   embed.oshineye    │        │  GET /v1/:slug?theme=light   │
│   .dev/v1/chart-1"> │◀───────│  → returns self-contained    │
│                     │postMsg │    HTML+JS+CSS page           │
└─────────────────────┘        └──────────────────────────────┘
```

### Stack

- **Runtime:** Cloudflare Workers
- **Framework:** [Hono](https://hono.dev) (ultrafast, first-class Workers support, typed routes)
- **Language:** TypeScript
- **Static assets:** Workers Static Assets (configured via `wrangler.jsonc`)
- **Build/dev:** Wrangler + Vite (optional, for bundling visualisation source)
- **Custom domain:** `embed.oshineye.dev` via Cloudflare DNS

---

## URL Scheme

```
GET /                           → index / catalogue page (not embedded)
GET /v1/:slug                   → full-page embed (the iframe target)
GET /v1/:slug?theme=dark        → embed with dark theme
GET /v1/github-timeline?years=2 → github-timeline filtered to last 2 years (default)
GET /v1/github-timeline?years=all&forks=show → full history including forks
GET /static/*                   → JS/CSS/image assets (unversioned, cache-busted by hash)
```

URLs are **versioned** (`/v1/`). This means embed snippets already pasted into blog posts will continue to work indefinitely, even if a future `/v2/` introduces breaking changes to a visualisation's markup, behaviour, or query params.

Each visualisation is a **slug** (e.g. `/v1/avatar-stack`, `/v1/github-timeline`). Adding a new visualisation means adding a new slug and its assets.

### Theme Support

Embeds accept a `?theme=light|dark` query parameter (default: `light`). Each visualisation reads this on init and applies styles accordingly. The loader script can also pass this automatically via a `data-theme` attribute.

---

## Embed Protocol

### 1. Embed snippet (placed in Blogger HTML editor)

```html
<div id="embed-avatar-stack"></div>
<script src="https://embed.oshineye.dev/static/loader.js"
        data-slug="avatar-stack"
        data-target="embed-avatar-stack"
        data-theme="light"></script>
```

The **loader script** (`loader.js`):
- Creates an `<iframe>` pointing to `https://embed.oshineye.dev/v1/{slug}?theme={theme}`
- Sets `width: 100%; border: none;`
- Listens for `postMessage` events from the iframe origin to auto-resize height
- Reads `data-theme` (default: `light`) and forwards it as a query param
- Accepts other optional `data-*` attributes for configuration (height override, etc.)

### 2. Fallback: raw iframe

For sites where custom JS isn't allowed, a plain iframe also works:

```html
<iframe src="https://embed.oshineye.dev/v1/avatar-stack?theme=light"
        style="width:100%; height:600px; border:none;"
        loading="lazy"></iframe>
```

(No auto-resize in this mode — a sensible default height is required.)

### 3. postMessage contract

The embedded page sends:

```jsonc
{ "type": "embed.oshineye.resize", "height": 482 }
```

The loader listens and validates `event.origin === "https://embed.oshineye.dev"` before applying.

---

## Response Headers

Every response from `/v1/:slug` must include:

```http
X-Frame-Options: ALLOWALL
Content-Security-Policy: frame-ancestors *; default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://d3js.org; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; img-src 'self' data: blob:; connect-src 'self' https:; font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=3600, s-maxage=86400
```

These override Cloudflare's defaults and ensure the embed works on any host page.

---

## Constraints & Library Guidance

### Platform Limits (Cloudflare Workers Static Assets)

| Limit | Value |
|---|---|
| Individual file size | 25 MiB |
| File count (free plan) | 20,000 |
| File count (paid plan) | 100,000 |
| Static asset requests | Free and unlimited |
| Worker script size | 3 MiB free / 10 MiB paid (router only, not assets) |

### Size Budget

Each embed should target **< 200 KB compressed** (HTML + JS + CSS combined). This keeps load times fast on mobile connections inside Blogger posts that already carry their own overhead.

| Category | Guideline |
|---|---|
| **< 100 KB** | Ideal. Vanilla JS, Observable Plot, Chart.js. |
| **100–200 KB** | Acceptable. D3 (modular imports), Leaflet, Three.js (subset). |
| **200 KB–1 MiB** | Use sparingly. Plotly, full Three.js. Justify the weight. |
| **> 1 MiB** | Avoid. Consider whether a lighter library achieves the same goal. |

These are soft targets, not hard gates. A single heavy embed on a page is fine; five heavy embeds on one page will hurt.

### Allowed CDN Origins

Embeds may load scripts, styles, and fonts from these CDNs. The CSP enforces this allowlist.

| CDN | Origin | Notes |
|---|---|---|
| **cdnjs (Cloudflare)** | `https://cdnjs.cloudflare.com` | Preferred — same network, lowest latency |
| **jsDelivr** | `https://cdn.jsdelivr.net` | npm + GitHub, good ESM support |
| **unpkg** | `https://unpkg.com` | npm mirror, simple URL scheme |
| **esm.sh** | `https://esm.sh` | On-the-fly ESM builds from npm |
| **d3js.org** | `https://d3js.org` | D3's official CDN |

To add a new CDN, update the CSP in the embed-headers middleware and this table.

### Bundled vs. CDN-loaded

Either approach is valid per embed:

- **Bundled** (inline or from `/static/*`): Zero external runtime dependencies. Best for reliability and offline-capable embeds. Slightly larger deploy size.
- **CDN-loaded** (via `<script src="https://cdnjs.cloudflare.com/...">`): Smaller deploy. Benefits from shared browser cache if the visitor has seen the same CDN URL on other sites. Adds an external point of failure.

Recommendation: **default to CDN-loaded from cdnjs** (same Cloudflare network, likely cached). Bundle only when you need guaranteed availability or are combining many modules into a single file.

### No Shared Dependencies Across Embeds

Each embed is a separate iframe with its own document. If two embeds on the same page both use D3, the browser loads D3 twice. This is acceptable for one or two embeds per page. If a blog post will contain many visualisations using the same library, consider:

- Combining them into a single multi-panel embed under one slug
- Using a lighter library to keep the total page weight down

### Browser API Access

Inside the iframe, embeds have full access to all standard browser APIs: Canvas 2D, WebGL/WebGPU, SVG, Web Animations, Web Audio, Resize Observer, Intersection Observer, Fetch, etc. No restrictions beyond what the CSP imposes on network requests.

---

## Project Structure

```
embeds/
├── wrangler.jsonc              # Workers config, custom domain, assets dir
├── src/
│   ├── index.ts                # Hono app — routes, headers middleware
│   ├── middleware/
│   │   └── embed-headers.ts    # X-Frame-Options, CSP, CORS, Cache headers
│   └── embeds/
│       └── v1/                 # Versioned embed source
│           ├── avatar-stack/
│           │   └── index.html
│           ├── avatar-stack-playground/
│           │   └── index.html
│           └── github-timeline/
│               └── index.html  # Generated by scripts/build-github-timeline.ts
├── public/
│   └── static/
│       └── loader.js           # Universal embed loader
├── package.json
└── tsconfig.json
```

---

## Adding a New Visualisation

1. Create `src/embeds/v1/{slug}/index.html` (self-contained; inline CSS+JS or reference `/static/*` assets).
2. Read the theme from the URL: `new URL(location.href).searchParams.get('theme') || 'light'`
3. Include the resize snippet at the bottom:
   ```js
   new ResizeObserver(() => {
     window.parent.postMessage(
       { type: 'embed.oshineye.resize', height: document.body.scrollHeight },
       '*'
     );
   }).observe(document.body);
   ```
4. Deploy with `wrangler deploy`.
5. Paste the embed snippet into a Blogger post.

---

## Deployment

Manual via Wrangler from local machine:

```bash
wrangler deploy
```

No CI/CD pipeline for v1. The custom domain `embed.oshineye.dev` is configured in `wrangler.jsonc` and resolved via Cloudflare DNS.

---

## Non-Goals (for v1)

- **Server-side storage** — deferred; addable later via KV or D1 bindings without breaking the embed contract.
- **Server-side data fetching / API proxying** — each embed is self-contained HTML+JS. Data can be inlined or fetched client-side.
- **Authentication / access control** — all embeds are public.
- **Build pipeline per visualisation** — keep it simple; one HTML file per embed. A bundler can be added later if needed.
- **Analytics** — rely on Cloudflare Workers Analytics for now.

---

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Theme support | **Yes.** Embeds accept `?theme=light\|dark`. Loader passes `data-theme`. |
| 2 | Versioning | **Yes.** All embed URLs are prefixed `/v1/`. Old snippets survive indefinitely. |
| 3 | KV / D1 storage | **Deferred.** Start stateless. Add when needed (see below). |

### Storage — Deferred, Addable Without Breaking Changes

v1 ships with no server-side storage. Every embed is self-contained HTML+JS.

When a use case arises (e.g. persisting poll results, caching API data, serving structured datasets), storage can be added incrementally:

| Option | Good for | Add how | Free tier |
|---|---|---|---|
| **KV** | Read-heavy config, counters, cached API responses | Add a `kv_namespaces` binding in `wrangler.jsonc`, call `env.MY_KV.get()` in the route handler | 100k reads/day, 1k writes/day |
| **D1** | Relational/filterable data, user-generated input | Add a `d1_databases` binding, create a migration | 5M rows read/day, 100k writes/day |

Adding either requires **zero changes** to the URL scheme, embed snippets, or loader script. The iframe contract stays the same — the worker simply starts reading from a store before rendering the HTML response.
