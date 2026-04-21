import { renderMermaidSVG } from "beautiful-mermaid";
export { TEAM_REGISTRY } from "./team-data";

export interface Node {
  label: string;
  primitive: string;
  detail: string;
}

export interface Flow {
  from: string;
  to: string;
  label: string;
}

export interface Project {
  id: string;
  nodes: Node[];
  flows: Flow[];
  direction?: "TD" | "LR";
}

// Canonical tier assignment based on Cloudflare's product categories.
// See: https://developers.cloudflare.com/.well-known/skills/cloudflare/SKILL.md
//   Client          — external consumers (not a CF product)
//   Edge            — Compute & Runtime, stateless (Workers, Static Assets, Cron Triggers)
//   Compute         — Compute & Runtime, stateful (Durable Objects)
//   Storage         — Storage & Data (KV, D1, R2, Queues)
//   AI              — AI & Machine Learning (Workers AI, Vectorize)
type TierCategory = "client" | "edge" | "compute" | "storage" | "ai";

export const PRIMITIVE_TIER: Record<string, TierCategory> = {
  "client":           "client",
  "terminal":         "client",
  "workers":          "edge",
  "pages":            "edge",
  "static-assets":    "edge",
  "cron":             "edge",
  "email":            "edge",
  "workers-for-platforms": "edge",
  "durable-objects":  "compute",
  "workflows":        "compute",
  "browser":          "compute",
  "containers":       "compute",
  "realtime":         "compute",
  "sandboxes":        "compute",
  "kv":               "storage",
  "d1":               "storage",
  "r2":               "storage",
  "queues":           "storage",
  "hyperdrive":       "storage",
  "images":           "storage",
  "analytics-engine": "storage",
  "secret-store":     "storage",
  "stream":           "storage",
  "ai":               "ai",
  "ai-gateway":       "ai",
  "vectorize":        "ai",
  "voice":            "ai",
  "agents":           "ai",
};

const TIER_ORDER: TierCategory[] = ["client", "edge", "compute", "storage", "ai"];

const TIER_LABELS: Record<TierCategory, string> = {
  "client":  "Client",
  "edge":    "Edge",
  "compute": "Compute",
  "storage": "Storage",
  "ai":      "AI",
};

// Product palette extended from demoscene's Cloudflare product catalog.
export const PRIMITIVE_COLORS: Record<string, { bg: string; stroke: string; fg: string }> = {
  "workers":          { bg: "#f97316", stroke: "#ea580c", fg: "#fff" },
  "pages":            { bg: "#4488ff", stroke: "#2563eb", fg: "#fff" },
  "static-assets":    { bg: "#6b7280", stroke: "#4b5563", fg: "#fff" },
  "durable-objects":  { bg: "#16a34a", stroke: "#15803d", fg: "#fff" },
  "kv":               { bg: "#ca8a04", stroke: "#a16207", fg: "#fff" },
  "d1":               { bg: "#3b82f6", stroke: "#2563eb", fg: "#fff" },
  "r2":               { bg: "#a855f7", stroke: "#9333ea", fg: "#fff" },
  "queues":           { bg: "#14b8a6", stroke: "#0d9488", fg: "#fff" },
  "hyperdrive":       { bg: "#0ea5e9", stroke: "#0284c7", fg: "#fff" },
  "images":           { bg: "#ec4899", stroke: "#db2777", fg: "#fff" },
  "analytics-engine": { bg: "#059669", stroke: "#047857", fg: "#fff" },
  "secret-store":     { bg: "#84cc16", stroke: "#65a30d", fg: "#fff" },
  "stream":           { bg: "#ec4899", stroke: "#db2777", fg: "#fff" },
  "ai":               { bg: "#8b5cf6", stroke: "#7c3aed", fg: "#fff" },
  "ai-gateway":       { bg: "#d23dff", stroke: "#a21caf", fg: "#fff" },
  "vectorize":        { bg: "#6366f1", stroke: "#4f46e5", fg: "#fff" },
  "voice":            { bg: "#ef4444", stroke: "#dc2626", fg: "#fff" },
  "agents":           { bg: "#fb923c", stroke: "#f97316", fg: "#fff" },
  "cron":             { bg: "#f59e0b", stroke: "#d97706", fg: "#fff" },
  "workflows":        { bg: "#0ea5e9", stroke: "#0284c7", fg: "#fff" },
  "browser":          { bg: "#ec4899", stroke: "#db2777", fg: "#fff" },
  "containers":       { bg: "#06b6d4", stroke: "#0891b2", fg: "#fff" },
  "realtime":         { bg: "#f43f5e", stroke: "#e11d48", fg: "#fff" },
  "sandboxes":        { bg: "#f59e0b", stroke: "#d97706", fg: "#fff" },
  "email":            { bg: "#ef4444", stroke: "#dc2626", fg: "#fff" },
  "workers-for-platforms": { bg: "#64748b", stroke: "#475569", fg: "#fff" },
  "client":           { bg: "#6b7280", stroke: "#4b5563", fg: "#fff" },
  "terminal":         { bg: "#6b7280", stroke: "#4b5563", fg: "#fff" },
};

export const PRIMITIVE_ICONS: Record<string, string> = {
  "workers": '<path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"/><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="8" height="8" x="8" y="8" rx="1"/>',
  "pages": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/>',
  "static-assets": '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  "durable-objects": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "kv": '<path d="m15.5 7.5l2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4m2-2l-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  "d1": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  "r2": '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8m-10 4h4"/>',
  "queues": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  "hyperdrive": '<path d="M5 14c-2 1-3 3.5-3 5 1.5 0 4-.5 5-2l2-2"/><path d="M14 10 9 15"/><path d="M15 2c4 0 7 3 7 7 0 0-3 0-6 3l-4-4c3-3 3-6 3-6"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" stroke="none"/>',
  "images": '<rect width="20" height="16" x="2" y="4" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  "analytics-engine": '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19v-11"/>',
  "secret-store": '<path d="M6 12h12"/><path d="M12 6v12"/><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="2"/>',
  "stream": '<polygon points="8 5 19 12 8 19 8 5"/><rect width="18" height="18" x="3" y="3" rx="2"/>',
  "ai": '<path d="M12 18V5m3 8a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4m8.598-6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>',
  "ai-gateway": '<rect width="6" height="6" x="9" y="2" rx="1"/><rect width="6" height="6" x="2" y="16" rx="1"/><rect width="6" height="6" x="16" y="16" rx="1"/><path d="M12 8v4"/><path d="M5 16v-2a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2"/>',
  "vectorize": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  "voice": '<path d="M9 9v6"/><path d="M5 7v10"/><path d="M13 5v14"/><path d="M17 8v8"/><path d="M21 10v4"/>',
  "agents": '<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 16h.01"/><path d="M16 16h.01"/>',
  "cron": '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/>',
  "workflows": '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  "browser": '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  "containers": '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  "realtime": '<path d="M4.9 19.1A10 10 0 0 1 12 2a10 10 0 0 1 7.1 17.1"/><path d="M8 15a5 5 0 0 1 8 0"/><path d="M12 12h.01"/>',
  "sandboxes": '<rect width="18" height="18" x="3" y="3" rx="2" stroke-dasharray="3 2"/><path d="M9 9h6v6H9z"/>',
  "email": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
  "workers-for-platforms": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M8 4v16"/><path d="M12 8h6"/><path d="M12 12h6"/>',
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
  "pages": "rounded",
  "durable-objects": "rounded",
  "ai": "rounded",
  "ai-gateway": "rounded",
  "agents": "rounded",
  "containers": "rounded",
  "images": "rounded",
  "realtime": "rounded",
  "sandboxes": "rounded",
  "queues": "stadium",
  "cron": "stadium",
  "email": "stadium",
  "workflows": "stadium",
  "browser": "rounded",
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

// Architecture data — flat node lists. Tiers are computed from PRIMITIVE_TIER.
export const PROJECTS: Project[] = [
  {
    id: "planet-cf",
    nodes: [
      { label: "Browser", primitive: "client", detail: "Reader" },
      { label: "Static Assets", primitive: "static-assets", detail: "HTML / CSS" },
      { label: "Workers", primitive: "workers", detail: "Python" },
      { label: "Cron Trigger", primitive: "cron", detail: "Hourly" },
      { label: "D1", primitive: "d1", detail: "Feed entries" },
      { label: "Queues", primitive: "queues", detail: "Feed queue + DLQ" },
      { label: "Workers AI", primitive: "ai", detail: "Embeddings" },
      { label: "Vectorize", primitive: "vectorize", detail: "Search index" },
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
    nodes: [
      { label: "Browser", primitive: "client", detail: "SPA client" },
      { label: "Static Assets", primitive: "static-assets", detail: "Vite build" },
      { label: "Workers", primitive: "workers", detail: "API router" },
      { label: "Durable Objects", primitive: "durable-objects", detail: "LiveSession (SQLite)" },
      { label: "KV", primitive: "kv", detail: "Sessions" },
      { label: "R2", primitive: "r2", detail: "Audio samples" },
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
    nodes: [
      { label: "Terminal", primitive: "terminal", detail: "TUI client" },
      { label: "Workers", primitive: "workers", detail: "Entry point" },
      { label: "Matchmaker", primitive: "durable-objects", detail: "Lobby mgmt" },
      { label: "GameRoom", primitive: "durable-objects", detail: "SQLite state" },
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
    nodes: [
      { label: "Browser", primitive: "client", detail: "iframe embed" },
      { label: "Static Assets", primitive: "static-assets", detail: "loader.js" },
      { label: "Workers", primitive: "workers", detail: "Hono router" },
      { label: "Durable Objects", primitive: "durable-objects", detail: "PresenceRoom" },
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
    nodes: [
      { label: "Browser", primitive: "client", detail: "Demo UI" },
      { label: "Static Assets", primitive: "static-assets", detail: "HTML" },
      { label: "Workers", primitive: "workers", detail: "Router" },
      { label: "Durable Objects", primitive: "durable-objects", detail: "Fibonacci (SQLite)" },
    ],
    flows: [
      { from: "Browser", to: "Static Assets", label: "GET /" },
      { from: "Browser", to: "Workers", label: "Compute request" },
      { from: "Workers", to: "Durable Objects", label: "stub.fetch()" },
    ],
  },
  {
    id: "oshineye-dev",
    nodes: [
      { label: "Browser", primitive: "client", detail: "oshineye.dev" },
      { label: "Static Assets", primitive: "static-assets", detail: "HTML / CSS / JS" },
    ],
    flows: [{ from: "Browser", to: "Static Assets", label: "GET /*" }],
  },
];

// User entry type — maps a display name + project set for a developer
export interface UserEntry {
  displayName: string;
  projects: Project[];
  totalDiscovered: number; // total CF projects found before capping
}

function nodeId(label: string): string {
  return label.replace(/[^a-zA-Z0-9]/g, "");
}

function primitiveClass(primitive: string): string {
  return primitive.replace(/-/g, "");
}

// Group a flat node list into ordered tiers based on PRIMITIVE_TIER
export interface ComputedTier {
  category: TierCategory;
  label: string;
  nodes: Node[];
}

export function computeTiers(nodes: Node[]): ComputedTier[] {
  const groups = new Map<TierCategory, Node[]>();
  for (const node of nodes) {
    const cat = PRIMITIVE_TIER[node.primitive];
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(node);
  }
  return TIER_ORDER
    .filter((cat) => groups.has(cat))
    .map((cat) => ({ category: cat, label: TIER_LABELS[cat], nodes: groups.get(cat)! }));
}

// --- SVG-level scoring ---

interface Point { x: number; y: number; }
interface Segment { p1: Point; p2: Point; }

function parsePolylinePoints(points: string): Point[] {
  return points.trim().split(/\s+/).map(pair => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });
}

function segmentsFromPoints(points: Point[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segs.push({ p1: points[i], p2: points[i + 1] });
  }
  return segs;
}

// Proper intersection test for two line segments (not counting shared endpoints)
function segmentsIntersect(a: Segment, b: Segment): boolean {
  function ccw(A: Point, B: Point, C: Point): number {
    return (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
  }
  const d1 = ccw(a.p1, a.p2, b.p1);
  const d2 = ccw(a.p1, a.p2, b.p2);
  const d3 = ccw(b.p1, b.p2, a.p1);
  const d4 = ccw(b.p1, b.p2, a.p2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

// Count actual geometric edge crossings in the rendered SVG
export function countSvgEdgeCrossings(svg: string): number {
  const polylines = [...svg.matchAll(/<polyline[^>]*class="edge"[^>]*points="([^"]*)"[^>]*\/?>/g)];
  const edgeSegments: Segment[][] = polylines.map(m => segmentsFromPoints(parsePolylinePoints(m[1])));

  let crossings = 0;
  for (let i = 0; i < edgeSegments.length; i++) {
    for (let j = i + 1; j < edgeSegments.length; j++) {
      for (const segA of edgeSegments[i]) {
        for (const segB of edgeSegments[j]) {
          if (segmentsIntersect(segA, segB)) crossings++;
        }
      }
    }
  }
  return crossings;
}

// Compute total edge length (Manhattan distance) from rendered SVG polylines
export function computeSvgTotalEdgeLength(svg: string): number {
  const polylines = [...svg.matchAll(/<polyline[^>]*class="edge"[^>]*points="([^"]*)"[^>]*\/?>/g)];
  let total = 0;
  for (const m of polylines) {
    const points = parsePolylinePoints(m[1]);
    for (let i = 0; i < points.length - 1; i++) {
      total += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
    }
  }
  return total;
}

// Kendall tau distance: count inversions between two permutations
function kendallTau(a: number[], b: number[]): number {
  const n = a.length;
  if (n <= 1) return 0;
  // Build rank of each element in b
  const rankB = new Map<number, number>();
  for (let i = 0; i < n; i++) rankB.set(b[i], i);
  let inversions = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ri = rankB.get(a[i])!;
      const rj = rankB.get(a[j])!;
      if (ri > rj) inversions++;
    }
  }
  const maxInversions = (n * (n - 1)) / 2;
  return inversions / maxInversions; // 0 = identical, 1 = reversed
}

// Compute barycenter deviation: how far the actual order is from barycenter-optimal
function computeBarycenterDeviation(tiers: ComputedTier[], flows: Flow[]): number {
  const nodePos = new Map<string, { tier: number; pos: number }>();
  for (let t = 0; t < tiers.length; t++) {
    for (let p = 0; p < tiers[t].nodes.length; p++) {
      nodePos.set(tiers[t].nodes[p].label, { tier: t, pos: p });
    }
  }

  let totalDeviation = 0;
  let tiersScored = 0;

  for (let t = 0; t < tiers.length; t++) {
    const tier = tiers[t];
    if (tier.nodes.length < 2) continue;

    // Compute barycenter for each node (mean position of neighbors in adjacent tiers)
    const barycenters: { index: number; bc: number }[] = [];
    for (let p = 0; p < tier.nodes.length; p++) {
      const label = tier.nodes[p].label;
      const neighborPositions: number[] = [];

      for (const flow of flows) {
        if (flow.from === label) {
          const toPos = nodePos.get(flow.to);
          if (toPos && toPos.tier !== t) neighborPositions.push(toPos.pos);
        }
        if (flow.to === label) {
          const fromPos = nodePos.get(flow.from);
          if (fromPos && fromPos.tier !== t) neighborPositions.push(fromPos.pos);
        }
      }

      const bc = neighborPositions.length > 0
        ? neighborPositions.reduce((a, b) => a + b, 0) / neighborPositions.length
        : p; // no neighbors → keep original position
      barycenters.push({ index: p, bc });
    }

    // Ideal order: sort by barycenter
    const idealOrder = [...barycenters].sort((a, b) => a.bc - b.bc).map(b => b.index);
    const actualOrder = barycenters.map(b => b.index);

    totalDeviation += kendallTau(actualOrder, idealOrder);
    tiersScored++;
  }

  if (tiersScored === 0) return 100;
  return Math.round((1 - totalDeviation / tiersScored) * 100);
}

export interface LayoutScore {
  composite: number;           // 0-100 weighted sum
  svgEdgeCrossings: number;    // 0-100 SVG-level (fewer geometric crossings = better)
  svgEdgeLength: number;       // 0-100 SVG-level (shorter total edge length = better)
  barycenterDeviation: number; // 0-100 (closer to ideal = better)
}

// Graph-only scoring (used by barycenterOrder tests and as fallback)
// Without SVG data, scores barycenter deviation only (SVG metrics require a rendered diagram)
export function scoreOrdering(tiers: ComputedTier[], flows: Flow[]): LayoutScore {
  const barycenterDeviation = computeBarycenterDeviation(tiers, flows);

  return { composite: barycenterDeviation, svgEdgeCrossings: 0, svgEdgeLength: 0, barycenterDeviation };
}

// Full scoring including SVG-level metrics from a rendered SVG
function scoreWithSvg(tiers: ComputedTier[], flows: Flow[], svg: string): LayoutScore {
  const svgCrossings = countSvgEdgeCrossings(svg);
  const svgEdgeCrossings = Math.round(100 / (1 + svgCrossings));

  const svgLength = computeSvgTotalEdgeLength(svg);
  // Normalize: 100 for 0 length, decays with a 2000px baseline
  const svgEdgeLength = Math.round(100 / (1 + svgLength / 2000));

  const barycenterDeviation = computeBarycenterDeviation(tiers, flows);

  const composite = Math.round(
    svgEdgeCrossings * 0.50 +
    svgEdgeLength * 0.15 +
    barycenterDeviation * 0.35
  );

  return { composite, svgEdgeCrossings, svgEdgeLength, barycenterDeviation };
}

// Generate all permutations of an array
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// Generate Mermaid source notation from tiers (pure, no optimization)
function generateMermaidSource(project: Project, tiers: ComputedTier[], directionOverride?: string): string {
  const direction = directionOverride || project.direction || (tiers.length <= 3 ? "LR" : "TD");
  const lines: string[] = [`graph ${direction}`];

  const usedPrimitives = new Set<string>();
  for (const node of project.nodes) {
    usedPrimitives.add(node.primitive);
  }

  for (const tier of tiers) {
    const sgId = nodeId(tier.label);
    lines.push(`  subgraph ${sgId}["${tier.label}"]`);
    for (const node of tier.nodes) {
      const id = nodeId(node.label);
      const cls = primitiveClass(node.primitive);
      lines.push(`    ${nodeShapeSyntax(id, node.label, node.primitive)}:::${cls}`);
    }
    lines.push("  end");
  }

  // Invisible links between adjacent tiers to enforce visual ordering
  for (let i = 0; i < tiers.length - 1; i++) {
    lines.push(`  ${nodeId(tiers[i].label)} ~~~ ${nodeId(tiers[i + 1].label)}`);
  }

  for (const flow of project.flows) {
    lines.push(
      `  ${nodeId(flow.from)} -->|"${flow.label}"| ${nodeId(flow.to)}`
    );
  }

  for (const prim of usedPrimitives) {
    const colors = PRIMITIVE_COLORS[prim];
    if (colors) {
      const cls = primitiveClass(prim);
      lines.push(`  classDef ${cls} fill:${colors.bg},stroke:${colors.stroke},color:${colors.fg}`);
    }
  }

  return lines.join("\n");
}

interface RenderOpts {
  bg: string; fg: string; font: string; nodeSpacing: number; layerSpacing: number;
  line: string; accent: string; muted: string; surface: string; border: string;
}

// Try a single tier ordering in both directions, return the best result
function tryLayout(
  project: Project, tiers: ComputedTier[], renderOpts: RenderOpts, extraOpts?: { thoroughness?: number }
): { source: string; svg: string; score: LayoutScore } {
  const lrOpts = { ...renderOpts, layerSpacing: 96, nodeSpacing: 24, ...extraOpts };
  const tdOpts = { ...renderOpts, layerSpacing: 64, nodeSpacing: 40, ...extraOpts };

  if (project.direction) {
    const opts = project.direction === "LR" ? lrOpts : tdOpts;
    const source = generateMermaidSource(project, tiers);
    const svg = renderMermaidSVG(source, opts);
    const score = scoreWithSvg(tiers, project.flows, svg);
    return { source, svg, score };
  }

  const lrSource = generateMermaidSource(project, tiers, "LR");
  const lrSvg = renderMermaidSVG(lrSource, lrOpts);
  const lrScore = scoreWithSvg(tiers, project.flows, lrSvg);

  const tdSource = generateMermaidSource(project, tiers, "TD");
  const tdSvg = renderMermaidSVG(tdSource, tdOpts);
  const tdScore = scoreWithSvg(tiers, project.flows, tdSvg);

  if (lrScore.composite >= tdScore.composite) {
    return { source: lrSource, svg: lrSvg, score: lrScore };
  }
  return { source: tdSource, svg: tdSvg, score: tdScore };
}

// Optimize layout: fast path (barycenter + LR/TD), slow fallback (permutations + higher thoroughness)
function optimizeLayout(project: Project, renderOpts: RenderOpts): { source: string; svg: string; score: LayoutScore } {
  const rawTiers = computeTiers(project.nodes);
  const orderedTiers = barycenterOrder(rawTiers, project.flows);

  // Fast path: barycenter ordering, try both directions
  let best = tryLayout(project, orderedTiers, renderOpts);
  if (best.score.composite >= 70) return best;

  // Slow path: exhaustive permutation search with higher ELK thoroughness
  // Only reached for complex layouts that don't score well with the heuristic
  for (const tier of orderedTiers) {
    if (tier.nodes.length > 5) return best; // cap: 5! = 120, beyond that is too slow
  }

  for (const perm of tierPermutations(orderedTiers)) {
    const candidate = tryLayout(project, perm, renderOpts, { thoroughness: 15 });
    if (candidate.score.composite > best.score.composite) {
      best = candidate;
    }
    if (best.score.composite >= 70) break; // good enough, stop searching
  }

  return best;
}

// Generate all permutations of node orderings within each tier (cartesian product)
function tierPermutations(tiers: ComputedTier[]): ComputedTier[][] {
  // Find tiers with >1 node (those are worth permuting)
  const multiNodeIndices = tiers.map((t, i) => ({ i, len: t.nodes.length })).filter(x => x.len > 1);
  if (multiNodeIndices.length === 0) return [tiers];

  // Build array of per-tier permutation sets
  const perTierPerms = tiers.map(tier =>
    tier.nodes.length > 1 ? permutations(tier.nodes) : [tier.nodes]
  );

  // Cartesian product of all tier permutations
  const results: ComputedTier[][] = [];
  function cartesian(idx: number, current: ComputedTier[]) {
    if (idx === tiers.length) {
      results.push(current);
      return;
    }
    for (const nodePerm of perTierPerms[idx]) {
      cartesian(idx + 1, [...current, { ...tiers[idx], nodes: nodePerm }]);
    }
  }
  cartesian(0, []);

  // Skip the first one (identical to barycenter ordering already tried)
  return results.slice(1);
}

// Compute barycenter-sorted ordering for a set of tiers (deterministic heuristic)
export function barycenterOrder(tiers: ComputedTier[], flows: Flow[]): ComputedTier[] {
  const nodePos = new Map<string, { tier: number; pos: number }>();
  for (let t = 0; t < tiers.length; t++) {
    for (let p = 0; p < tiers[t].nodes.length; p++) {
      nodePos.set(tiers[t].nodes[p].label, { tier: t, pos: p });
    }
  }

  return tiers.map((tier, t) => {
    if (tier.nodes.length < 2) return tier;

    const scored = tier.nodes.map((node, p) => {
      const neighborPositions: number[] = [];
      for (const flow of flows) {
        if (flow.from === node.label) {
          const toPos = nodePos.get(flow.to);
          if (toPos && toPos.tier !== t) neighborPositions.push(toPos.pos);
        }
        if (flow.to === node.label) {
          const fromPos = nodePos.get(flow.from);
          if (fromPos && fromPos.tier !== t) neighborPositions.push(fromPos.pos);
        }
      }
      const bc = neighborPositions.length > 0
        ? neighborPositions.reduce((a, b) => a + b, 0) / neighborPositions.length
        : p;
      return { node, bc };
    });

    scored.sort((a, b) => a.bc - b.bc);
    return { ...tier, nodes: scored.map(s => s.node) };
  });
}

interface RenderedDiagram {
  svg: string;
  source: string;
  score: LayoutScore;
}

export interface RenderedDiagrams {
  [projectId: string]: RenderedDiagram;
}

// Build a lookup from nodeId -> Node for post-processing
function buildNodeMap(project: Project): Map<string, Node> {
  const map = new Map<string, Node>();
  for (const node of project.nodes) {
    map.set(nodeId(node.label), node);
  }
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

function themeRenderOpts(isDark: boolean): RenderOpts {
  return {
    bg: isDark ? "#1f2937" : "#ffffff",
    fg: isDark ? "#f9fafb" : "#111827",
    font: "ui-sans-serif, system-ui, sans-serif",
    nodeSpacing: 32,
    layerSpacing: 72,
    line: isDark ? "#6b7280" : "#9ca3af",
    accent: isDark ? "#d1d5db" : "#374151",
    muted: isDark ? "#4b5563" : "#6b7280",
    surface: isDark ? "#1f2937" : "#f3f4f6",
    border: isDark ? "#374151" : "#e5e7eb",
  };
}

export function renderAllMermaidSvgs(theme: string, projects: Project[] = PROJECTS): RenderedDiagrams {
  const isDark = theme === "dark";
  const renderOpts = themeRenderOpts(isDark);
  const result: RenderedDiagrams = {};

  for (const project of projects) {
    const { source, svg, score } = optimizeLayout(project, renderOpts);
    const processed = postProcessSvg(svg, project, isDark);
    result[project.id] = { svg: processed, source, score };
  }

  return result;
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function buildMermaidHtml(diagrams: RenderedDiagrams, defaultProject: string): string {
  return Object.entries(diagrams)
    .map(
      ([id, { svg, source, score }]) =>
        `<div class="mermaid-project-svg" data-mermaid-project="${id}" data-mermaid-source="${escapeAttr(source)}" data-mermaid-score="${score.composite}" style="${id !== defaultProject ? "display: none" : ""}">${svg}</div>`
    )
    .join("\n");
}
