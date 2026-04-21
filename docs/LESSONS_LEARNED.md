# Lessons Learned

Captured during the initial build-out of embed.oshineye.dev from spec to working implementation.

## 1. Spec-first development works well with a clear spec

The `embeds.md` spec was detailed enough (URL scheme, exact headers, project structure, embed protocol) that implementation could proceed without ambiguity. Having exact header values in the spec meant the middleware could be written and tested with byte-for-byte assertions. Specs that include concrete examples (not just descriptions) dramatically reduce implementation guesswork.

## 2. Plain `.html` module imports are the right pattern for serving HTML through a Worker

The spec defines embed HTML in `src/embeds/v1/{slug}/index.html` but the Worker needs to return that HTML with custom response headers. Importing `.html` files as text modules lets the Worker return them programmatically with the exact headers the spec requires. A static-asset-only approach would bypass the middleware. This still required a `raw.d.ts` TypeScript declaration and a `registry.ts` module — infrastructure the spec didn't mention but that the architecture demands.

## 3. Hono's `app.request()` makes Worker testing trivial

Using `app.request('/path')` directly in Vitest avoids the complexity of `@cloudflare/vitest-pool-workers` while still exercising real routes, middleware, and response generation. The 14 integration tests run in ~6ms total. This approach validates headers, status codes, and response bodies through the same public interface that production traffic uses. No mocks needed.

## 4. Separate embed headers middleware from route logic

Placing the four required headers (X-Frame-Options, CSP, CORS, Cache-Control) in a dedicated middleware (`embed-headers.ts`) applied to `/v1/*` keeps route handlers clean and makes the header contract independently testable. The test that verifies headers are NOT set on `GET /` caught a real design concern — headers should only apply to embed routes.

## 5. Client-side theming is the right default for iframe embeds

The `?theme=light|dark` parameter is read by JavaScript in the embed HTML, not by the Worker. This means the Worker returns identical HTML regardless of theme, which simplifies caching (no `Vary` header needed) and means `s-maxage=86400` works correctly. The initial audit raised this as a concern before recognizing it was the spec's explicit design.

## 6. Loader script needs defensive origin validation

The `loader.js` validates `event.origin === "https://embed.oshineye.dev"` before acting on any postMessage. This is critical security — without it, any page could send resize messages and manipulate the iframe height. The spec was explicit about this, and the implementation follows it exactly.

## 7. The registry pattern makes adding embeds straightforward

Each embed is an entry in `registry.ts` with a slug, title, description, and imported HTML. Adding a new visualisation is: create the HTML file, add one entry to the array, done. The catalogue page and slug routing both read from this single source of truth. This is slightly more coupled than filesystem-based discovery, but simpler and more explicit.

## 8. Self-contained HTML embeds are surprisingly capable

All embeds are fully self-contained single HTML files with inline CSS and JS. No build step, no external dependencies, no framework. The browser APIs available inside an iframe (SVG, Canvas, ResizeObserver, CSS custom properties) are more than sufficient for rich visualisations under the 200 KB budget.

## 9. Test what the spec specifies, not what the implementation does

The tests check for `searchParams.get('theme')`, `embed.oshineye.resize`, `document.body.scrollHeight` — strings that the spec defines as part of the contract. They don't test internal function calls or module structure. When the auditor reviewed the tests, the question was "would this test break if we refactored the internals?" and the answer was no for all 14 tests.

## 10. Audit-then-fix cycles are efficient

The first audit caught zero blocking issues but surfaced two concerns that turned out to be false positives after careful re-reading of the spec. The re-evaluation process forced a deeper understanding of why HTML text-module imports and client-side theming are the correct choices. Even when the audit finds nothing to fix, the act of defending design decisions against the spec sharpens understanding.

## 11. Wrangler already provides a default `.html` text-module rule

Wrangler's default text-module rule already covers `**/*.html`, along with `**/*.txt` and `**/*.sql`. Adding a custom `.html` rule in `wrangler.jsonc` causes an overlap warning during deploy and shadows the broader default rule for no benefit. The fix is to rely on Wrangler's built-in defaults unless the project truly needs custom rule behavior.

## 12. GitHub architecture discovery has to be repo-tree-first to stay within rate limits

Walking repos with repeated `contents/` API calls is too expensive at team scale. A single recursive `git/trees/{ref}?recursive=1` call per repo is far more efficient, because candidate files like `wrangler.jsonc`, `wrangler.toml`, and `package.json` can be found locally from the tree before fetching only the few blobs that matter. This change reduced the amount of GitHub API work enough to make full-team refreshes practical again.

## 13. Repo-level snapshots are the right cache boundary for refreshable discovery

Caching only per-user project lists is too coarse. The architecture discovery cache now stores per-repo snapshots with tree SHA, selected file paths, fetched blob contents, and analyzed project output. That lets refreshes reanalyze unchanged repos from local cached blobs, update only changed repos, and preserve untouched users when a long-running refresh is interrupted.

## 14. `package.json` can be a valid source of truth for Cloudflare product usage

Some projects use Cloudflare products without a Wrangler config in the repo location the crawler inspects. Package signals like `@cloudflare/agents`, `@cloudflare/realtimekit*`, `@cloudflare/voice`, `@cloudflare/stream-react`, and `@cloudflare/ai-gateway` are enough to identify real Cloudflare usage. Allowing package-only admission surfaced projects that were previously invisible to the team architecture pages.

## 15. Rate-limit failures must abort refreshes, not look like empty data

Treating GitHub API failures as "no repos found" silently corrupts the cache. The correct behavior is exponential backoff with jitter for retryable failures, an early stop when the remaining GitHub budget is too low, and preserving the existing cache if refresh still fails. This turns rate limits into an operational pause instead of a data-loss bug.

## 16. Standalone user architecture reports work best as generated static assets

For one-off users who should not be added to the shared team registry, the simplest pattern is to generate a standalone HTML report into `public/user-architectures/` and serve it through `/user-architectures/:username`. That keeps the Worker logic simple, works locally and in production, and avoids mixing ad hoc users into the curated team dataset.

## 17. Docs drift quickly around infrastructure defaults and generated routes

The recent work exposed stale documentation in two places: HTML import behavior and generated standalone architecture routes. Keeping `README.md`, `CLAUDE.md`, and `docs/LESSONS_LEARNED.md` aligned with the actual Worker, Wrangler, and generation pipeline is part of the implementation work, not cleanup to defer indefinitely. Infrastructure defaults are especially easy to misdocument because they often work until a warning or deploy audit proves otherwise.
