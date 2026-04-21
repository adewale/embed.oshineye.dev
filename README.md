# embed.oshineye.dev

Self-contained interactive visualisations hosted on Cloudflare Workers, designed to be embedded via `<iframe>` in Blogger posts and other sites.

## Embeds

| Embed | Description |
|-------|-------------|
| **Avatar Stack** | An interactive avatar stack component with Keyboardia's "industrial warmth" aesthetic |
| **GitHub Timeline** | A timeline of public GitHub projects for adewale, newest first |
| **Blogging Timeline** | A timeline of blog posts from blog.oshineye.com, newest first |

## Viewing the Embeds Locally

Start the dev server:

```bash
npm run dev
```

Then open in your browser:

- **Catalogue page:** http://localhost:8787/
- **Team Architectures:** http://localhost:8787/team-architectures
- **Avatar Stack:** http://localhost:8787/v1/avatar-stack
- **GitHub Timeline:** http://localhost:8787/v1/github-timeline
- **Blogging Timeline:** http://localhost:8787/v1/blogging-timeline
- **Cloudflare Architecture Viz:** http://localhost:8787/v1/cloudflare-architecture-viz

Add `?theme=dark` or `?theme=light` to any embed URL to switch themes.

Generated standalone user architecture reports are also served locally when present:

- **Standalone report route:** http://localhost:8787/user-architectures/{username}

### GitHub Timeline query parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `theme` | `light` | `light` or `dark` |
| `years` | `2` | Show repos from the last N years. Use `years=all` to show full history. |
| `forks` | hidden | Set `forks=show` to include forked repos (dimmed, with muted timeline dot). |

Examples:
- Last 2 years, original repos only (default): `/v1/github-timeline`
- Full history with forks: `/v1/github-timeline?years=all&forks=show`
- Last 5 years, dark theme: `/v1/github-timeline?years=5&theme=dark`

### Blogging Timeline query parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `theme` | `light` | `light` or `dark` |
| `years` | `2` | Show posts from the last N years. Use `years=all` for full history. |

Timeline dots are color-coded by category: purple for presentations, cyan for web, amber for AI/ML, green for mobile.

### Rebuilding timeline data

Both timeline embeds bake in their data at build time. To refresh:

```bash
npm run build:timelines    # Rebuild both
npm run build:github-timeline   # GitHub only
npm run build:blogging-timeline # Blog only
```

### Rebuilding architecture data

```bash
npm run build:team-architectures                           # Refresh team registry + SVGs
python3 scripts/build_team_architectures.py --refresh     # Refresh changed repos/users
python3 scripts/build_team_architectures.py --force-refresh # Reanalyze all targeted repos
python3 scripts/build_user_architectures.py timowilhelm --display-name "Timo Wilhelm" --open
```

The team build uses GitHub repo snapshots in `data/team-discovery.json` so unchanged repos can be reanalyzed from cached local blobs instead of re-fetching every Wrangler config and `package.json` file.

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

Replace `avatar-stack` with any embed slug.

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start local dev server
npm test           # Run tests
```

Embed HTML files under `src/embeds/v1/*/index.html` are imported directly as text modules. Wrangler already provides a default text-module rule for `.html`, so this project does not need a custom `.html` rule in `wrangler.jsonc`.

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
