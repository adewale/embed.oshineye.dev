#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderAllMermaidSvgs } from "../src/embeds/v1/cloudflare-architecture-viz/mermaid";
import {
  buildStandaloneArchitecturesHtml,
  type StandaloneUserEntry,
} from "../src/embeds/v1/cloudflare-architecture-viz/standalone";

const username = process.argv[2];

if (!username) {
  console.error("Usage: tsx scripts/render-user-architectures.ts <github-username>");
  process.exit(1);
}

const inputPath = resolve(`data/${username}-architectures.json`);
const outputPath = resolve(`data/${username}-architectures.html`);
const publicOutputPath = resolve(`public/user-architectures/${username}.html`);

const entry = JSON.parse(readFileSync(inputPath, "utf8")) as StandaloneUserEntry;
const diagrams = renderAllMermaidSvgs("light", entry.projects);
const html = buildStandaloneArchitecturesHtml(entry, diagrams);

writeFileSync(outputPath, html);
mkdirSync(resolve("public/user-architectures"), { recursive: true });
writeFileSync(publicOutputPath, html);
console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${publicOutputPath}`);
