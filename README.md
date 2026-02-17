# embed.oshineye.dev

Self-contained interactive visualisations hosted on Cloudflare Workers, designed to be embedded via `<iframe>` in Blogger posts and other sites.

## Embeds

| Embed | Description |
|-------|-------------|
| **Reading Timeline** | A timeline visualisation of books read over time |
| **Tech Radar** | A technology radar showing adoption stages of tools and frameworks |
| **Avatar Stack** | An interactive avatar stack component with Keyboardia's "industrial warmth" aesthetic |

## Viewing the Embeds Locally

Start the dev server:

```bash
npm run dev
```

Then open in your browser:

- **Catalogue page:** http://localhost:8787/
- **Reading Timeline:** http://localhost:8787/v1/reading-timeline
- **Tech Radar:** http://localhost:8787/v1/tech-radar
- **Avatar Stack:** http://localhost:8787/v1/avatar-stack

Add `?theme=dark` or `?theme=light` to any embed URL to switch themes.

## Embedding on a Page

### Option 1: Loader script (recommended)

```html
<div id="embed-avatar-stack"></div>
<script src="https://embed.oshineye.dev/static/loader.js"
        data-slug="avatar-stack"
        data-target="embed-avatar-stack"
        data-theme="light"></script>
```

The loader creates the iframe, sets it to full width, and auto-resizes its height via `postMessage`.

### Option 2: Raw iframe

```html
<iframe src="https://embed.oshineye.dev/v1/avatar-stack?theme=light"
        style="width:100%; height:600px; border:none;"
        loading="lazy"></iframe>
```

Replace `avatar-stack` with any slug (`reading-timeline`, `tech-radar`).

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start local dev server
npm test           # Run tests
```

## Deployment

```bash
npx wrangler deploy
```

Deploys to `embed.oshineye.dev` via Cloudflare Workers.

## Adding a New Embed

1. Create `src/embeds/v1/{slug}/index.html` — self-contained HTML with inline CSS and JS
2. Add an entry in `src/embeds/registry.ts`
3. Include theme support: read `?theme=light|dark` from the URL (default: `light`)
4. Include the resize snippet:
   ```js
   new ResizeObserver(() => {
     window.parent.postMessage(
       { type: 'embed.oshineye.resize', height: document.body.scrollHeight },
       '*'
     );
   }).observe(document.body);
   ```
5. Add tests in `tests/app.test.ts`
