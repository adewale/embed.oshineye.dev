import { renderMermaidSVG } from "beautiful-mermaid";

interface Node {
  label: string;
  primitive: string;
  detail: string;
}

interface Tier {
  label: string;
  nodes: Node[];
  children?: Tier[];
}

interface Flow {
  from: string;
  to: string;
  label: string;
}

interface Project {
  id: string;
  tiers: Tier[];
  flows: Flow[];
  direction?: "TD" | "LR";
}

const PRIMITIVE_COLORS: Record<string, { bg: string; stroke: string; fg: string }> = {
  "workers":          { bg: "#e85e2e", stroke: "#c94d22", fg: "#fff" },
  "static-assets":    { bg: "#6b5347", stroke: "#5a4539", fg: "#fff" },
  "durable-objects":  { bg: "#2c7cb0", stroke: "#236897", fg: "#fff" },
  "kv":               { bg: "#398557", stroke: "#2d6b46", fg: "#fff" },
  "d1":               { bg: "#6373b6", stroke: "#505f9a", fg: "#fff" },
  "r2":               { bg: "#2b818e", stroke: "#226a75", fg: "#fff" },
  "queues":           { bg: "#9f5bb0", stroke: "#854a94", fg: "#fff" },
  "ai":               { bg: "#da304c", stroke: "#b8283f", fg: "#fff" },
  "vectorize":        { bg: "#6373b6", stroke: "#505f9a", fg: "#fff" },
  "cron":             { bg: "#a26a09", stroke: "#875808", fg: "#fff" },
  "client":           { bg: "#6b5347", stroke: "#5a4539", fg: "#fff" },
  "terminal":         { bg: "#6b5347", stroke: "#5a4539", fg: "#fff" },
};

const PRIMITIVE_ICONS: Record<string, string> = {
  "workers": '<path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"/><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="8" height="8" x="8" y="8" rx="1"/>',
  "static-assets": '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  "durable-objects": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "kv": '<path d="m15.5 7.5l2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4m2-2l-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  "d1": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  "r2": '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8m-10 4h4"/>',
  "queues": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  "ai": '<path d="M12 18V5m3 8a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4m8.598-6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>',
  "vectorize": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  "cron": '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/>',
  "client": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  "terminal": '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
};

// Shape syntax per primitive type
const PRIMITIVE_SHAPES: Record<string, "cylinder" | "rounded" | "stadium"> = {
  "d1": "cylinder",
  "kv": "cylinder",
  "r2": "cylinder",
  "vectorize": "cylinder",
  "workers": "rounded",
  "durable-objects": "rounded",
  "ai": "rounded",
  "queues": "stadium",
  "cron": "stadium",
};

function nodeShapeSyntax(id: string, label: string, primitive: string): string {
  const shape = PRIMITIVE_SHAPES[primitive];
  switch (shape) {
    case "cylinder": return `${id}[("${label}")]`;
    case "rounded":  return `${id}("${label}")`;
    case "stadium":  return `${id}(["${label}"])`;
    default:         return `${id}["${label}"]`;
  }
}

// Architecture data mirroring the client-side PROJECTS in index.html.
// Kept in sync manually — only the fields needed for Mermaid generation.
const PROJECTS: Project[] = [
  {
    id: "planet-cf",
    tiers: [
      { label: "Client", nodes: [{ label: "Browser", primitive: "client", detail: "Reader" }] },
      {
        label: "Edge",
        nodes: [
          { label: "Static Assets", primitive: "static-assets", detail: "HTML / CSS" },
          { label: "Workers", primitive: "workers", detail: "Python" },
        ],
      },
      {
        label: "Backend",
        nodes: [],
        children: [
          {
            label: "Scheduling",
            nodes: [
              { label: "Cron Trigger", primitive: "cron", detail: "Hourly" },
              { label: "Queues", primitive: "queues", detail: "Feed queue + DLQ" },
            ],
          },
          {
            label: "Storage & AI",
            nodes: [
              { label: "D1", primitive: "d1", detail: "Feed entries" },
              { label: "Workers AI", primitive: "ai", detail: "Embeddings" },
              { label: "Vectorize", primitive: "vectorize", detail: "Search index" },
            ],
          },
        ],
      },
    ],
    flows: [
      { from: "Browser", to: "Static Assets", label: "GET /" },
      { from: "Browser", to: "Workers", label: "Search / browse" },
      { from: "Cron Trigger", to: "Workers", label: "Scheduled event" },
      { from: "Workers", to: "Queues", label: "Enqueue feeds" },
      { from: "Queues", to: "Workers", label: "Consume batch" },
      { from: "Workers", to: "D1", label: "Read / write entries" },
      { from: "Workers", to: "Workers AI", label: "Generate embeddings" },
      { from: "Workers AI", to: "Vectorize", label: "Index vectors" },
      { from: "Workers", to: "Vectorize", label: "Semantic query" },
    ],
  },
  {
    id: "keyboardia",
    tiers: [
      { label: "Client", nodes: [{ label: "Browser", primitive: "client", detail: "SPA client" }] },
      {
        label: "Edge",
        nodes: [
          { label: "Static Assets", primitive: "static-assets", detail: "Vite build" },
          { label: "Workers", primitive: "workers", detail: "API router" },
        ],
      },
      {
        label: "State",
        nodes: [
          { label: "KV", primitive: "kv", detail: "Sessions" },
          { label: "Durable Objects", primitive: "durable-objects", detail: "LiveSession (SQLite)" },
          { label: "R2", primitive: "r2", detail: "Audio samples" },
        ],
      },
    ],
    flows: [
      { from: "Browser", to: "Static Assets", label: "GET /" },
      { from: "Browser", to: "Workers", label: "API requests" },
      { from: "Workers", to: "KV", label: "Session lookup" },
      { from: "Workers", to: "Durable Objects", label: "Live session" },
      { from: "Workers", to: "R2", label: "Store / fetch samples" },
      { from: "Durable Objects", to: "Browser", label: "WS sync" },
    ],
  },
  {
    id: "vaders",
    tiers: [
      {
        label: "Edge",
        nodes: [
          { label: "Terminal", primitive: "terminal", detail: "TUI client" },
          { label: "Workers", primitive: "workers", detail: "Entry point" },
        ],
      },
      { label: "Coordination", nodes: [{ label: "Matchmaker", primitive: "durable-objects", detail: "Lobby mgmt" }] },
      { label: "Game State", nodes: [{ label: "GameRoom", primitive: "durable-objects", detail: "SQLite state" }] },
    ],
    flows: [
      { from: "Terminal", to: "Workers", label: "Join game" },
      { from: "Workers", to: "Matchmaker", label: "Find / create room" },
      { from: "Matchmaker", to: "GameRoom", label: "Route player" },
      { from: "GameRoom", to: "Terminal", label: "WS game state" },
      { from: "Terminal", to: "GameRoom", label: "Player input" },
    ],
  },
  {
    id: "embed-oshineye-dev",
    tiers: [
      { label: "Client", nodes: [{ label: "Browser", primitive: "client", detail: "iframe embed" }] },
      {
        label: "Edge",
        nodes: [
          { label: "Static Assets", primitive: "static-assets", detail: "loader.js" },
          { label: "Workers", primitive: "workers", detail: "Hono router" },
        ],
      },
      { label: "State", nodes: [{ label: "Durable Objects", primitive: "durable-objects", detail: "PresenceRoom" }] },
    ],
    flows: [
      { from: "Browser", to: "Static Assets", label: "GET /static/*" },
      { from: "Browser", to: "Workers", label: "GET /v1/:slug" },
      { from: "Workers", to: "Durable Objects", label: "stub.fetch()" },
      { from: "Durable Objects", to: "Browser", label: "WS broadcast" },
    ],
  },
  {
    id: "fibonacci-do",
    tiers: [
      { label: "Client", nodes: [{ label: "Browser", primitive: "client", detail: "Demo UI" }] },
      { label: "Edge", nodes: [{ label: "Static Assets", primitive: "static-assets", detail: "HTML" }] },
      {
        label: "Compute",
        nodes: [
          { label: "Workers", primitive: "workers", detail: "Router" },
          { label: "Durable Objects", primitive: "durable-objects", detail: "Fibonacci (SQLite)" },
        ],
      },
    ],
    flows: [
      { from: "Browser", to: "Static Assets", label: "GET /" },
      { from: "Browser", to: "Workers", label: "Compute request" },
      { from: "Workers", to: "Durable Objects", label: "stub.fetch()" },
    ],
  },
  {
    id: "oshineye-dev",
    tiers: [
      { label: "Client", nodes: [{ label: "Browser", primitive: "client", detail: "oshineye.dev" }] },
      { label: "Edge", nodes: [{ label: "Static Assets", primitive: "static-assets", detail: "HTML / CSS / JS" }] },
    ],
    flows: [{ from: "Browser", to: "Static Assets", label: "GET /*" }],
  },
];

function nodeId(label: string): string {
  return label.replace(/[^a-zA-Z0-9]/g, "");
}

function primitiveClass(primitive: string): string {
  return primitive.replace(/-/g, "");
}

// Count tiers with actual nodes (ignoring pure wrapper tiers)
function countEffectiveTiers(tiers: Tier[]): number {
  let count = 0;
  for (const tier of tiers) {
    if (tier.nodes.length > 0) count++;
    if (tier.children) count += countEffectiveTiers(tier.children);
  }
  return count;
}

// Collect all unique primitives recursively
function collectPrimitives(tiers: Tier[], out: Set<string>): void {
  for (const tier of tiers) {
    for (const node of tier.nodes) {
      out.add(node.primitive);
    }
    if (tier.children) collectPrimitives(tier.children, out);
  }
}

function projectToMermaid(project: Project): string {
  // Determine direction: LR for small diagrams, TD for large ones
  const direction = project.direction || (countEffectiveTiers(project.tiers) <= 3 ? "LR" : "TD");
  const lines: string[] = [`graph ${direction}`];

  // Collect unique primitives used in this project for classDef generation
  const usedPrimitives = new Set<string>();
  collectPrimitives(project.tiers, usedPrimitives);

  // Recursively emit subgraph blocks
  function emitTiers(tiers: Tier[], indent: string): void {
    for (const tier of tiers) {
      const sgId = nodeId(tier.label);
      lines.push(`${indent}subgraph ${sgId}["${tier.label}"]`);
      for (const node of tier.nodes) {
        const id = nodeId(node.label);
        const cls = primitiveClass(node.primitive);
        lines.push(`${indent}  ${nodeShapeSyntax(id, node.label, node.primitive)}:::${cls}`);
      }
      if (tier.children) {
        emitTiers(tier.children, indent + "  ");
      }
      lines.push(`${indent}end`);
    }
  }

  emitTiers(project.tiers, "  ");

  for (const flow of project.flows) {
    lines.push(
      `  ${nodeId(flow.from)} -->|"${flow.label}"| ${nodeId(flow.to)}`
    );
  }

  // Emit classDef lines for each primitive used
  for (const prim of usedPrimitives) {
    const colors = PRIMITIVE_COLORS[prim];
    if (colors) {
      const cls = primitiveClass(prim);
      lines.push(`  classDef ${cls} fill:${colors.bg},stroke:${colors.stroke},color:${colors.fg}`);
    }
  }

  return lines.join("\n");
}

interface RenderedDiagram {
  svg: string;
  source: string;
}

export interface RenderedDiagrams {
  [projectId: string]: RenderedDiagram;
}

// Build a lookup from nodeId -> Node for post-processing (recursive)
function buildNodeMap(project: Project): Map<string, Node> {
  const map = new Map<string, Node>();
  function walk(tiers: Tier[]): void {
    for (const tier of tiers) {
      for (const node of tier.nodes) {
        map.set(nodeId(node.label), node);
      }
      if (tier.children) walk(tier.children);
    }
  }
  walk(project.tiers);
  return map;
}

function postProcessSvg(svg: string, project: Project, isDark: boolean): string {
  const nodeMap = buildNodeMap(project);
  let result = svg;

  // 1. Subgraph header styling — inject CSS into SVG <style> block
  const subgraphCss = `
    .subgraph text { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }`;
  result = result.replace(/<style>/, `<style>${subgraphCss}`);

  // 2. Icon badges — for each node group, insert a coloured circle with Lucide icon
  result = result.replace(
    /<g class="node" data-id="([^"]*)" data-label="([^"]*)"[^>]*>([\s\S]*?)<\/g>/g,
    (match, id, _label, inner) => {
      const node = nodeMap.get(id);
      if (!node) return match;

      const iconPaths = PRIMITIVE_ICONS[node.primitive];
      const colors = PRIMITIVE_COLORS[node.primitive];
      if (!iconPaths || !colors) return match;

      // Find shape position — try rect first (rectangle, rounded, stadium, cylinder body)
      let shapeX: number | undefined;
      let shapeY: number | undefined;

      const rectXY = inner.match(/<rect[^>]*\bx="([^"]*)"[^>]*\by="([^"]*)"/);
      const rectYX = inner.match(/<rect[^>]*\by="([^"]*)"[^>]*\bx="([^"]*)"/);
      if (rectXY) {
        shapeX = parseFloat(rectXY[1]);
        shapeY = parseFloat(rectXY[2]);
      } else if (rectYX) {
        shapeX = parseFloat(rectYX[2]);
        shapeY = parseFloat(rectYX[1]);
      }

      // For cylinder shapes, try ellipse to get true top position
      if (PRIMITIVE_SHAPES[node.primitive] === "cylinder") {
        const ellipseMatch = inner.match(/<ellipse[^>]*\bcx="([^"]*)"[^>]*\bcy="([^"]*)"/);
        const rxMatch = inner.match(/<ellipse[^>]*\brx="([^"]*)"/);
        if (ellipseMatch && rxMatch) {
          const cx = parseFloat(ellipseMatch[1]);
          const cy = parseFloat(ellipseMatch[2]);
          const erx = parseFloat(rxMatch[1]);
          shapeX = cx - erx;
          shapeY = cy - 7; // ry=7 for BM cylinder caps
        }
      }

      if (shapeX === undefined || shapeY === undefined) return match;

      const badgeR = 10;
      const badgeCx = shapeX - 2;
      const badgeCy = shapeY - 2;
      const iconSize = 12;
      const iconOffset = iconSize / 2;

      const badge = `<g class="node-icon-badge" transform="translate(${badgeCx},${badgeCy})">` +
        `<circle r="${badgeR}" fill="${colors.bg}" stroke="${colors.stroke}" stroke-width="1"/>` +
        `<svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" x="${-iconOffset}" y="${-iconOffset}" fill="none" stroke="${colors.fg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</svg>` +
        `</g>`;

      // 3. Detail text — insert after last <text> in the node group
      const detailText = node.detail
        ? `<text class="node-detail-text" x="${shapeX}" y="${shapeY}" dy="28" text-anchor="start" font-size="9" fill="${colors.bg}" opacity="0.85">${node.detail}</text>`
        : "";

      // Insert badge and detail before closing </g>
      return match.replace(/<\/g>$/, `${badge}${detailText}</g>`);
    }
  );

  // 4. Rounded corners on subgraph rects + 5. Subgraph background tints
  const tint = isDark ? "rgba(201,184,150,0.06)" : "rgba(139,115,85,0.04)";
  result = result.replace(
    /(<g\s+class="subgraph"[^>]*>\s*<rect\b)([^>]*?)(\/?>)/g,
    (_match, before, attrs, close) => {
      let newAttrs = attrs;
      // Replace existing rx/ry="0" or add if missing
      if (/\brx="/.test(newAttrs)) {
        newAttrs = newAttrs.replace(/\brx="[^"]*"/, 'rx="6"');
        newAttrs = newAttrs.replace(/\bry="[^"]*"/, 'ry="6"');
      } else {
        newAttrs += ' rx="6" ry="6"';
      }
      newAttrs = newAttrs.replace(/fill="[^"]*"/, `fill="${tint}"`);
      return `${before}${newAttrs}${close}`;
    }
  );

  // 6. Drop shadow filter on subgraph groups
  const filterDef = '<filter id="groupShadow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/></filter>';
  if (result.includes('<defs>')) {
    result = result.replace(/<defs>/, `<defs>${filterDef}`);
  } else {
    result = result.replace(/(<svg[^>]*>)/, `$1<defs>${filterDef}</defs>`);
  }
  result = result.replace(
    /(<g\s+class="subgraph")/g,
    '$1 filter="url(#groupShadow)"'
  );

  return result;
}

export function renderAllMermaidSvgs(theme: string): RenderedDiagrams {
  const isDark = theme === "dark";
  const result: RenderedDiagrams = {};

  for (const project of PROJECTS) {
    const source = projectToMermaid(project);
    const svg = renderMermaidSVG(source, {
      bg: isDark ? "#1a120e" : "#fffcf6",
      fg: isDark ? "#f5efe5" : "#2c1a14",
      font: "DM Sans",
      nodeSpacing: 32,
      layerSpacing: 72,
      line: isDark ? "#8b7355" : "#8b7355",
      accent: isDark ? "#c9b896" : "#5c4a32",
      muted: isDark ? "#7a6b55" : "#9e8c74",
      surface: isDark ? "#2a1e16" : "#f5efe5",
      border: isDark ? "#4a3828" : "#d4c4aa",
    });
    const processed = postProcessSvg(svg, project, isDark);
    result[project.id] = { svg: processed, source };
  }

  return result;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function buildMermaidHtml(diagrams: RenderedDiagrams, defaultProject: string): string {
  return Object.entries(diagrams)
    .map(
      ([id, { svg, source }]) =>
        `<div class="mermaid-project-svg" data-mermaid-project="${id}" data-mermaid-source="${escapeAttr(source)}" style="${id !== defaultProject ? "display: none" : ""}">${svg}</div>`
    )
    .join("\n");
}
