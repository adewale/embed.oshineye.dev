# Lessons Learned

Captured during the initial build-out of embed.oshineye.dev from spec to working implementation.

## 1. Spec-first development works well with a clear spec

The `embeds.md` spec was detailed enough (URL scheme, exact headers, project structure, embed protocol) that implementation could proceed without ambiguity. Having exact header values in the spec meant the middleware could be written and tested with byte-for-byte assertions. Specs that include concrete examples (not just descriptions) dramatically reduce implementation guesswork.

## 2. `?raw` imports are the right pattern for serving HTML through a Worker

The spec defines embed HTML in `src/embeds/v1/{slug}/index.html` but the Worker needs to return that HTML with custom response headers. Vite's `?raw` import suffix bundles the HTML as string constants at build time, letting the Worker return them programmatically with the exact headers the spec requires. A static-asset-only approach would bypass the middleware. This required a `raw.d.ts` TypeScript declaration and a `registry.ts` module — infrastructure the spec didn't mention but that the architecture demands.

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

The first audit caught zero blocking issues but surfaced two concerns that turned out to be false positives after careful re-reading of the spec. The re-evaluation process forced a deeper understanding of why `?raw` imports and client-side theming are the correct choices. Even when the audit finds nothing to fix, the act of defending design decisions against the spec sharpens understanding.
