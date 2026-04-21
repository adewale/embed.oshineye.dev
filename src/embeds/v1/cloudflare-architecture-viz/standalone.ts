import type { Project, RenderedDiagrams } from "./mermaid";

export interface StandaloneUserEntry {
  username: string;
  displayName: string;
  projects: Project[];
  totalDiscovered: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildStandaloneArchitecturesHtml(
  entry: StandaloneUserEntry,
  diagrams: RenderedDiagrams,
): string {
  const sections = entry.projects.map((project) => {
    const badges = [...new Set(
      project.nodes
        .map((node) => node.primitive)
        .filter((primitive) => primitive !== "client" && primitive !== "terminal"),
    )]
      .map((primitive) => `<span class="badge">${escapeHtml(primitive)}</span>`)
      .join("");

    const flows = project.flows
      .map(
        (flow) =>
          `<li><code>${escapeHtml(flow.from)}</code> -> <code>${escapeHtml(flow.to)}</code>: ${escapeHtml(flow.label)}</li>`,
      )
      .join("");

    return `
    <section class="project" id="${escapeHtml(project.id)}">
      <div class="project-header">
        <div>
          <h2>${escapeHtml(project.id)}</h2>
          <div class="badges">${badges}</div>
        </div>
        <a class="repo-link" href="https://github.com/${escapeHtml(entry.username)}/${escapeHtml(project.id)}" target="_blank" rel="noopener">Repo</a>
      </div>
      <div class="diagram">${diagrams[project.id]?.svg ?? ""}</div>
      <div class="flows">
        <h3>Flows</h3>
        <ul>${flows}</ul>
      </div>
    </section>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(entry.displayName)} Architecture Diagrams</title>
  <style>
    :root { --bg: #f8fafc; --fg: #0f172a; --muted: #475569; --border: #cbd5e1; --surface: #ffffff; --accent: #f97316; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.5; }
    main { max-width: 1200px; margin: 0 auto; padding: 32px 20px 64px; }
    header { margin-bottom: 32px; padding: 24px; background: linear-gradient(135deg, #fff7ed, #ffffff); border: 1px solid var(--border); border-radius: 16px; }
    h1 { margin: 0 0 8px; font-size: 2rem; }
    p { margin: 0; color: var(--muted); }
    .meta { margin-top: 12px; font-size: 0.95rem; }
    .projects { display: grid; gap: 24px; }
    .project { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; overflow: hidden; }
    .project-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .project-header h2 { margin: 0 0 8px; font-size: 1.25rem; }
    .repo-link { color: var(--accent); text-decoration: none; font-weight: 600; white-space: nowrap; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge { border: 1px solid #fed7aa; background: #fff7ed; color: #9a3412; border-radius: 999px; padding: 2px 8px; font-size: 0.75rem; }
    .diagram { overflow-x: auto; padding: 8px 0 16px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    .flows h3 { margin: 16px 0 8px; font-size: 0.95rem; }
    .flows ul { margin: 0; padding-left: 20px; color: var(--muted); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
    @media (max-width: 720px) { header { padding: 20px; } .project { padding: 16px; } .project-header { flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(entry.displayName)}</h1>
      <p>Standalone architecture report generated from Cloudflare project discovery for <code>${escapeHtml(entry.username)}</code>.</p>
      <p class="meta">Projects found: ${entry.projects.length} of ${entry.totalDiscovered}. Generated locally.</p>
    </header>
    <div class="projects">${sections}</div>
  </main>
</body>
</html>`;
}
