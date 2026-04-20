#!/usr/bin/env tsx
// Pre-renders EmDash architecture diagram SVGs at build time.
// Run: tsx scripts/build-emdash-svgs.ts

import { renderMermaidSVG } from "beautiful-mermaid";
import type { RenderOptions } from "beautiful-mermaid";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../src/embeds/v1/emdash-architecture-diagram/svgs.ts");

interface ViewData {
  id: string;
  mermaid: string;
}

const VIEWS: ViewData[] = [
  {
    id: "overview",
    mermaid: `graph TD
  subgraph Clients
    Admin["Admin Dashboard\\nTipTap editor"]
    Api["API Consumers"]
    Agents["AI Agents"]
    Cli["emdash-cli"]
  end
  subgraph Runtime["Runtime · Cloudflare Workers"]
    Astro("Astro Integration")
  end
  subgraph Core["packages/core"]
    ContentApi["Content API\\n22 REST handlers"]
    SchemaEng["Schema Engine\\nDB-driven types"]
    PluginMgr["Plugin Manager\\nWorker sandbox"]
    McpSrv["MCP Server"]
  end
  subgraph Auth["packages/auth"]
    Passkey["Passkey\\nWebAuthn · primary"]
    Oauth["OAuth\\nsocial providers"]
    Magic["Magic Link"]
    Rbac["RBAC"]
  end
  subgraph CF["Cloudflare Services"]
    D1[("D1 · SQLite")]
    R2[("R2 · Objects")]
    Kv[("KV · Sessions")]
    Wai{{"Workers AI"}}
  end
  Admin --> Astro
  Api --> Astro
  Cli --> Astro
  Agents --> McpSrv
  Astro --> ContentApi
  Astro --> PluginMgr
  Astro --> Passkey
  Astro --> Oauth
  Astro --> Magic
  ContentApi -->|"Kysely SQL"| D1
  ContentApi --> R2
  ContentApi --> SchemaEng
  PluginMgr --> Wai
  PluginMgr --> Kv`,
  },
  {
    id: "packages",
    mermaid: `graph LR
  subgraph Application
    Admin["packages/admin\\nDashboard UI"]
    Blocks["packages/blocks\\nPortable Text + TipTap"]
    Scaffold["create-emdash\\nnpm create CLI"]
    Templates["9 templates\\nblog · portfolio · marketing"]
  end
  subgraph Infrastructure
    Core["packages/core\\nAstro integration\\n22 API handlers\\nPlugin system · MCP server"]
    AuthPkg["packages/auth\\nPasskey · OAuth\\nMagic Link · RBAC · JWT"]
  end
  subgraph Platform
    CF["packages/cloudflare\\nD1 · R2 · KV\\nDynamic Worker Loaders"]
  end
  subgraph Ecosystem
    Market["packages/marketplace\\nPlugin store + Workers AI audit"]
    Plugins["packages/plugins\\nai-moderation · atproto\\nforms · audit-log · webhooks"]
    G2P["gutenberg-to-pt\\nWordPress block converter"]
    Skills["skills/\\nAI agent skill files"]
  end
  Admin --> Core
  Blocks --> Admin
  Scaffold --> Templates
  Core --> AuthPkg
  Core -. "storage interface" .-> CF
  Plugins --> Core
  Market --> Core
  G2P --> Core`,
  },
  {
    id: "pipeline",
    mermaid: `graph TD
  Req["Incoming Request"]
  S1["setup.ts\\ninit + migrations"]
  S2["auth.ts\\nsession + WebAuthn"]
  S3["request-context.ts\\nDB · user · locale"]
  S4["redirect.ts\\nURL rewrites"]
  subgraph API["API Layer"]
    Route["Astro Route\\nthin wrapper"]
    Handler["Handler\\nApiResponse<T>"]
  end
  subgraph ContentEng["Content Engine"]
    Content["Content Service\\nPortable Text"]
    Schema["Schema Registry\\nec_ tables in D1"]
    Revisions["Revision Service\\nauto-versioning"]
  end
  subgraph Storage["Storage Adapters"]
    DB[("D1 via Kysely\\nprepared statements")]
    Obj[("R2 media")]
    Cache[("KV cache")]
    FTS[("FTS5 search")]
  end
  Req --> S1 --> S2 --> S3 --> S4
  S4 --> Route --> Handler
  Handler --> Content
  Content --> Schema
  Content --> Revisions
  Content --> DB
  Content --> Obj
  Handler --> Cache
  Handler --> FTS`,
  },
  {
    id: "auth",
    mermaid: `graph TD
  subgraph Entry["Entry Strategies"]
    Pk["Passkey\\nWebAuthn ceremony\\nprimary method"]
    Oa["OAuth Flow\\nauthorization code"]
    Ml["Magic Link\\nemail token"]
    Df["Device Flow\\nCLI polling"]
  end
  subgraph Core["Auth Core"]
    Ts["Token Service\\nJWT issue + verify"]
    Rb["RBAC\\nroles + permissions"]
    Su["Signup / Invite"]
  end
  subgraph Adapters
    Pka["Passkey Adapter\\nWebAuthn RP"]
    Oaa["OAuth Adapters\\nGitHub · Google…"]
    Ema["Email Adapter\\nmagic link delivery"]
  end
  subgraph Persist["Persistence"]
    D1s[("D1\\nusers · sessions · roles")]
    Kvs[("KV\\ntoken cache")]
  end
  Pk --> Pka --> Ts
  Oa --> Oaa --> Ts
  Ml --> Ema --> Ts
  Df --> Ts
  Ts --> Rb
  Ts --> D1s & Kvs
  Su --> D1s`,
  },
  {
    id: "plugins",
    mermaid: `graph TD
  subgraph Sources["Plugin Sources"]
    Mkt["Marketplace"]
    Du["Direct Upload"]
    Wpc["WP Converter"]
  end
  subgraph Gate["Security Gate · Workers AI"]
    Ca["Code Auditor\\nJS threat detection"]
    Mv["Manifest Validator\\ncapability schema"]
  end
  subgraph Runtime["Plugin Runtime"]
    Pm["Plugin Manager\\ninstall · enable · disable"]
    Hk["Hook System\\nevent-driven hooks"]
    Iso["Worker Isolate\\nDynamic Worker Loaders"]
    Sch["Scheduler\\ncron triggers"]
  end
  FP["First-Party Plugins\\nai-moderation · atproto · forms\\nwebhook-notifier · audit-log"]
  subgraph Scoped["Scoped Storage"]
    Pkv[("KV · state")]
    Pd1[("D1 · tables")]
    Pr2[("R2 · assets")]
  end
  Mkt --> Ca
  Du --> Mv
  Wpc --> Mv
  Ca --> Pm
  Mv --> Pm
  Pm --> Hk --> Iso
  Sch --> Pm
  Iso --> Scoped
  FP --> Pm`,
  },
];

function themeOpts(isDark: boolean): RenderOptions {
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

const light: Record<string, string> = {};
const dark: Record<string, string> = {};

for (const view of VIEWS) {
  console.log(`Rendering ${view.id}...`);
  light[view.id] = renderMermaidSVG(view.mermaid, themeOpts(false));
  dark[view.id] = renderMermaidSVG(view.mermaid, themeOpts(true));
}

function serialize(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([id, svg]) => `  ${JSON.stringify(id)}: ${JSON.stringify(svg)},`)
    .join("\n");
}

const ts = `// Auto-generated by scripts/build-emdash-svgs.ts — do not edit manually
// Generated: ${new Date().toISOString()}

export type EmdashSvgs = Record<string, string>;

export const EMDASH_LIGHT: EmdashSvgs = {
${serialize(light)}
};

export const EMDASH_DARK: EmdashSvgs = {
${serialize(dark)}
};
`;

writeFileSync(outPath, ts, "utf8");
console.log(`Wrote ${outPath}`);
