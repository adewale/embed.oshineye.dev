#!/usr/bin/env python3
"""
Discovers Cloudflare projects for team members via the GitHub API
and generates TypeScript data for the team-architectures page.

Usage:
  python3 scripts/build_team_architectures.py           # uses cache
  python3 scripts/build_team_architectures.py --refresh  # fresh API calls

Requires: gh CLI (authenticated)
"""

import subprocess
import json
import base64
import re
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# --- Paths ---
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT = PROJECT_ROOT / "src" / "embeds" / "v1" / "cloudflare-architecture-viz" / "team-data.ts"
CACHE_FILE = PROJECT_ROOT / "data" / "team-discovery.json"

# --- Team members ---
TEAM = [
    ("craigsdennis", "Craig"),
    ("megaconfidence", "Confidence"),
    ("fayazara", "Fayaz"),
    ("jillesme", "Jilles"),
    ("lauragift21", "Gift"),
    ("kristianfreeman", "Kristian"),
    ("harshil1712", "Harshil"),
    ("yusukebe", "Yusuke"),
    ("adewale", "Ade"),
]

# --- Curated project data (hand-verified, takes precedence over auto-discovered) ---

CURATED: dict[str, list[dict]] = {
    "adewale": [
        {
            "id": "planet-cf",
            "nodes": [
                {"label": "Browser", "primitive": "client", "detail": "Reader"},
                {"label": "Static Assets", "primitive": "static-assets", "detail": "HTML / CSS"},
                {"label": "Workers", "primitive": "workers", "detail": "Python"},
                {"label": "Cron Trigger", "primitive": "cron", "detail": "Hourly"},
                {"label": "D1", "primitive": "d1", "detail": "Feed entries"},
                {"label": "Queues", "primitive": "queues", "detail": "Feed queue + DLQ"},
                {"label": "Workers AI", "primitive": "ai", "detail": "Embeddings"},
                {"label": "Vectorize", "primitive": "vectorize", "detail": "Search index"},
            ],
            "flows": [
                {"from": "Browser", "to": "Static Assets", "label": "GET /"},
                {"from": "Browser", "to": "Workers", "label": "Search / browse"},
                {"from": "Cron Trigger", "to": "Workers", "label": "Scheduled event"},
                {"from": "Workers", "to": "Queues", "label": "Enqueue feeds"},
                {"from": "Queues", "to": "Workers", "label": "Consume batch"},
                {"from": "Workers", "to": "D1", "label": "Read / write entries"},
                {"from": "Workers", "to": "Workers AI", "label": "Generate embeddings"},
                {"from": "Workers AI", "to": "Vectorize", "label": "Index vectors"},
                {"from": "Workers", "to": "Vectorize", "label": "Semantic query"},
            ],
        },
        {
            "id": "keyboardia",
            "nodes": [
                {"label": "Browser", "primitive": "client", "detail": "SPA client"},
                {"label": "Static Assets", "primitive": "static-assets", "detail": "Vite build"},
                {"label": "Workers", "primitive": "workers", "detail": "API router"},
                {"label": "Durable Objects", "primitive": "durable-objects", "detail": "LiveSession (SQLite)"},
                {"label": "KV", "primitive": "kv", "detail": "Sessions"},
                {"label": "R2", "primitive": "r2", "detail": "Audio samples"},
            ],
            "flows": [
                {"from": "Browser", "to": "Static Assets", "label": "GET /"},
                {"from": "Browser", "to": "Workers", "label": "API requests"},
                {"from": "Workers", "to": "KV", "label": "Session lookup"},
                {"from": "Workers", "to": "Durable Objects", "label": "Live session"},
                {"from": "Workers", "to": "R2", "label": "Store / fetch samples"},
                {"from": "Durable Objects", "to": "Browser", "label": "WS sync"},
            ],
        },
        {
            "id": "vaders",
            "nodes": [
                {"label": "Terminal", "primitive": "terminal", "detail": "TUI client"},
                {"label": "Workers", "primitive": "workers", "detail": "Entry point"},
                {"label": "Matchmaker", "primitive": "durable-objects", "detail": "Lobby mgmt"},
                {"label": "GameRoom", "primitive": "durable-objects", "detail": "SQLite state"},
            ],
            "flows": [
                {"from": "Terminal", "to": "Workers", "label": "Join game"},
                {"from": "Workers", "to": "Matchmaker", "label": "Find / create room"},
                {"from": "Matchmaker", "to": "GameRoom", "label": "Route player"},
                {"from": "GameRoom", "to": "Terminal", "label": "WS game state"},
                {"from": "Terminal", "to": "GameRoom", "label": "Player input"},
            ],
        },
        {
            "id": "embed-oshineye-dev",
            "nodes": [
                {"label": "Browser", "primitive": "client", "detail": "iframe embed"},
                {"label": "Static Assets", "primitive": "static-assets", "detail": "loader.js"},
                {"label": "Workers", "primitive": "workers", "detail": "Hono router"},
                {"label": "Durable Objects", "primitive": "durable-objects", "detail": "PresenceRoom"},
            ],
            "flows": [
                {"from": "Browser", "to": "Static Assets", "label": "GET /static/*"},
                {"from": "Browser", "to": "Workers", "label": "GET /v1/:slug"},
                {"from": "Workers", "to": "Durable Objects", "label": "stub.fetch()"},
                {"from": "Durable Objects", "to": "Browser", "label": "WS broadcast"},
            ],
        },
        {
            "id": "fibonacci-do",
            "nodes": [
                {"label": "Browser", "primitive": "client", "detail": "Demo UI"},
                {"label": "Static Assets", "primitive": "static-assets", "detail": "HTML"},
                {"label": "Workers", "primitive": "workers", "detail": "Router"},
                {"label": "Durable Objects", "primitive": "durable-objects", "detail": "Fibonacci (SQLite)"},
            ],
            "flows": [
                {"from": "Browser", "to": "Static Assets", "label": "GET /"},
                {"from": "Browser", "to": "Workers", "label": "Compute request"},
                {"from": "Workers", "to": "Durable Objects", "label": "stub.fetch()"},
            ],
        },
        {
            "id": "oshineye-dev",
            "nodes": [
                {"label": "Browser", "primitive": "client", "detail": "oshineye.dev"},
                {"label": "Static Assets", "primitive": "static-assets", "detail": "HTML / CSS / JS"},
            ],
            "flows": [
                {"from": "Browser", "to": "Static Assets", "label": "GET /*"},
            ],
        },
    ],
}

# --- Wrangler config -> primitive detection ---

KNOWN_PRIMITIVES = {
    "durable_objects": "durable-objects",
    "durable_object": "durable-objects",
    "kv_namespaces": "kv",
    "kv_namespace": "kv",
    "d1_databases": "d1",
    "d1_database": "d1",
    "r2_buckets": "r2",
    "r2_bucket": "r2",
    "queues": "queues",
    "vectorize": "vectorize",
    "browser": "browser",
    "workflows": "workflows",
}

PRIMITIVE_DETAIL = {
    "workers": "Worker",
    "static-assets": "Static files",
    "durable-objects": "Stateful DO",
    "kv": "Key-value store",
    "d1": "SQL database",
    "r2": "Object storage",
    "queues": "Message queue",
    "ai": "Workers AI",
    "vectorize": "Vector search",
    "cron": "Scheduled trigger",
    "client": "Web client",
    "browser": "Browser rendering",
    "workflows": "Workflow steps",
}

PRIMITIVE_LABEL = {
    "workers": "Workers",
    "static-assets": "Static Assets",
    "durable-objects": "Durable Objects",
    "kv": "KV",
    "d1": "D1",
    "r2": "R2",
    "queues": "Queues",
    "ai": "Workers AI",
    "vectorize": "Vectorize",
    "cron": "Cron Trigger",
    "browser": "Browser Rendering",
    "workflows": "Workflow",
}


# --- GitHub API helpers ---

def gh(args: str, timeout: int = 30) -> str:
    """Run a gh CLI command and return stdout."""
    try:
        result = subprocess.run(
            f"gh {args}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
        return ""


def gh_json(args: str) -> object | None:
    """Run a gh CLI command and parse JSON output."""
    raw = gh(args)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def list_repos(username: str) -> list[dict]:
    """List non-fork, non-archived repos for a GitHub user."""
    raw = gh(
        f'api "users/{username}/repos?per_page=100&sort=updated&type=owner" --paginate',
        timeout=60,
    )
    if not raw:
        return []
    # gh --paginate may concatenate JSON arrays
    try:
        fixed = re.sub(r'\]\s*\[', ',', raw)
        repos = json.loads(fixed)
    except json.JSONDecodeError:
        return []
    return [
        {"name": r["name"], "description": r.get("description") or ""}
        for r in repos
        if isinstance(r, dict) and not r.get("fork") and not r.get("archived")
    ]


def fetch_file_content(username: str, repo: str, path: str) -> str | None:
    """Fetch a file's content from a GitHub repo (base64-decoded)."""
    raw = gh(f'api "repos/{username}/{repo}/contents/{path}" --jq .content')
    if not raw:
        return None
    try:
        return base64.b64decode(raw.replace("\n", "")).decode("utf-8")
    except Exception:
        return None


def list_root_files(username: str, repo: str) -> list[str]:
    """List filenames in the root of a repo."""
    data = gh_json(f'api "repos/{username}/{repo}/contents/" --jq "[.[].name]"')
    if isinstance(data, list):
        return [str(f) for f in data]
    return []


def find_wrangler_config(username: str, repo: str) -> str | None:
    """Find and return wrangler config content from a repo."""
    root_files = list_root_files(username, repo)
    candidates = ["wrangler.toml", "wrangler.jsonc", "wrangler.json"]

    # Check root
    for name in candidates:
        if name in root_files:
            content = fetch_file_content(username, repo, name)
            if content and content.strip():
                return content

    # Check common monorepo subdirs
    sub_dirs = [
        d for d in root_files
        if d in ("apps", "packages", "workers", "worker", "server", "api", "backend", "frontend", "web", "src")
    ]
    for d in sub_dirs:
        sub_data = gh_json(f'api "repos/{username}/{repo}/contents/{d}" --jq "[.[].name]"')
        sub_names = [str(f) for f in sub_data] if isinstance(sub_data, list) else []
        for name in candidates:
            if name in sub_names:
                content = fetch_file_content(username, repo, f"{d}/{name}")
                if content and content.strip():
                    return content
        # One more level deep for monorepos (apps/worker-name/)
        for sub in sub_names:
            deep_data = gh_json(f'api "repos/{username}/{repo}/contents/{d}/{sub}" --jq "[.[].name]"')
            deep_names = [str(f) for f in deep_data] if isinstance(deep_data, list) else []
            for name in candidates:
                if name in deep_names:
                    content = fetch_file_content(username, repo, f"{d}/{sub}/{name}")
                    if content and content.strip():
                        return content

    return None


def strip_comments(content: str) -> str:
    """Strip comment lines from TOML (# ...) and JSONC (// ...) config files."""
    lines = []
    for line in content.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith("#") or stripped.startswith("//"):
            continue
        lines.append(line)
    return "\n".join(lines)


def detect_primitives(content: str) -> dict:
    """Detect CF primitives from wrangler config content (comments stripped)."""
    primitives: set[str] = {"workers"}
    has_static_assets = False
    has_cron = False

    # Strip comments to avoid matching scaffolded / commented-out bindings
    cleaned = strip_comments(content)
    lc = cleaned.lower()

    for key, primitive in KNOWN_PRIMITIVES.items():
        patterns = [
            re.compile(rf'\[\[?{key}', re.IGNORECASE),
            re.compile(rf'"{key}"\s*:', re.IGNORECASE),
            re.compile(rf'{key}\s*=', re.IGNORECASE),
        ]
        if any(p.search(cleaned) for p in patterns):
            primitives.add(primitive)

    # AI detection (more specific)
    if re.search(r'(workers_ai|"ai"\s*:\s*\{|ai\s*=\s*\{|\[ai\])', lc):
        primitives.add("ai")

    # Static assets
    if re.search(r'(\[assets\]|"assets"\s*:|assets\s*=\s*\{)', lc):
        has_static_assets = True
    elif re.search(r'(assets|static_assets|site)', lc) and re.search(r'(bucket|directory|build)', lc):
        has_static_assets = True

    # Cron triggers
    if re.search(r'(\[triggers\]|crons|"crons"\s*:)', lc) and "cron" in lc:
        has_cron = True

    return {
        "primitives": primitives,
        "has_static_assets": has_static_assets,
        "has_cron": has_cron,
    }


def fetch_description(username: str, repo: str, root_files: list[str]) -> str:
    """Get a description for a repo from API description or README."""
    data = gh_json(f'api "repos/{username}/{repo}" --jq "{{description: .description}}"')
    api_desc = ""
    if isinstance(data, dict):
        api_desc = data.get("description") or ""

    # Try README
    readme_content = ""
    for name in ("README.md", "readme.md", "README.rst", "README"):
        if name in root_files:
            readme_content = fetch_file_content(username, repo, name) or ""
            if readme_content:
                break

    readme_desc = ""
    if readme_content:
        for line in readme_content.split("\n"):
            trimmed = line.strip()
            if not trimmed or trimmed.startswith(("#", "[!", "![", "[![", "---", "```")):
                continue
            if len(trimmed) > 20:
                readme_desc = trimmed[:300]
                break

    return readme_desc or api_desc or ""


def generate_nodes(primitives: set[str], has_static_assets: bool, has_cron: bool) -> list[dict]:
    """Generate node list from detected primitives."""
    nodes = [{"label": "Browser", "primitive": "client", "detail": "Web client"}]
    if has_static_assets:
        nodes.append({"label": "Static Assets", "primitive": "static-assets", "detail": "Static files"})
    nodes.append({"label": "Workers", "primitive": "workers", "detail": "Worker"})
    if has_cron:
        nodes.append({"label": "Cron Trigger", "primitive": "cron", "detail": "Scheduled"})

    # Add remaining primitives in a stable order
    prim_order = ["durable-objects", "kv", "d1", "r2", "queues", "ai", "vectorize", "workflows", "browser"]
    for prim in prim_order:
        if prim in primitives:
            label = PRIMITIVE_LABEL.get(prim, prim)
            detail = PRIMITIVE_DETAIL.get(prim, prim)
            nodes.append({"label": label, "primitive": prim, "detail": detail})

    return nodes


def generate_flows(primitives: set[str], has_static_assets: bool, has_cron: bool) -> list[dict]:
    """Generate default flows based on detected primitives."""
    flows = []
    if has_static_assets:
        flows.append({"from": "Browser", "to": "Static Assets", "label": "GET /"})
    flows.append({"from": "Browser", "to": "Workers", "label": "API requests"})
    if has_cron:
        flows.append({"from": "Cron Trigger", "to": "Workers", "label": "Scheduled event"})

    prim_order = ["durable-objects", "kv", "d1", "r2", "queues", "ai", "vectorize", "workflows", "browser"]
    flow_labels = {
        "durable-objects": "Route to DO",
        "kv": "KV read / write",
        "d1": "SQL queries",
        "r2": "Object storage",
        "queues": "Enqueue / consume",
        "ai": "AI inference",
        "vectorize": "Vector search",
        "workflows": "Run workflow",
        "browser": "Render page",
    }
    for prim in prim_order:
        if prim in primitives:
            label_to = PRIMITIVE_LABEL.get(prim, prim)
            flow_label = flow_labels.get(prim, f"Use {label_to}")
            flows.append({"from": "Workers", "to": label_to, "label": flow_label})

    return flows


MAX_PROJECTS = 999  # No practical cap — show all relevant CF projects per user


def project_complexity(project: dict) -> int:
    """Score a project by primitive diversity (more unique primitives = more interesting)."""
    prims = {n["primitive"] for n in project["nodes"]}
    # Bonus for non-trivial primitives (not just workers + client + static-assets)
    interesting = prims - {"client", "terminal", "workers", "static-assets"}
    return len(interesting) * 10 + len(prims)


def deduplicate_variants(projects: list[dict]) -> list[dict]:
    """Remove project name variants (e.g. foo, foo-demo, foo-video-demo).
    Keeps the shortest-named variant (assumed to be the canonical project)."""
    # Sort by name length so shorter names come first
    by_len = sorted(projects, key=lambda p: len(p["id"]))
    kept: list[dict] = []
    kept_ids: list[str] = []

    for project in by_len:
        pid = project["id"].lower()
        # Check if this is a variant of an already-kept project
        is_variant = False
        for kid in kept_ids:
            if pid.startswith(kid) and len(pid) > len(kid):
                is_variant = True
                break
        if not is_variant:
            kept.append(project)
            kept_ids.append(pid)

    return kept


def discover_user(username: str) -> list[dict]:
    """Discover Cloudflare projects for a GitHub user."""
    repos = list_repos(username)
    if not repos:
        return []

    projects = []
    for repo in repos:
        config = find_wrangler_config(username, repo["name"])
        if not config:
            continue

        detected = detect_primitives(config)
        primitives = detected["primitives"]
        has_static = detected["has_static_assets"]
        has_cron = detected["has_cron"]

        # Skip trivial workers-only projects
        if primitives == {"workers"} and not has_static and not has_cron:
            continue

        nodes = generate_nodes(primitives, has_static, has_cron)
        flows = generate_flows(primitives, has_static, has_cron)

        projects.append({
            "id": repo["name"],
            "nodes": nodes,
            "flows": flows,
        })

        print(f"    Found: {repo['name']} ({', '.join(sorted(primitives))})", file=sys.stderr)

    # Deduplicate project name variants (foo, foo-demo, foo-slides → keep foo)
    before = len(projects)
    projects = deduplicate_variants(projects)
    if len(projects) < before:
        print(f"    Deduplicated {before - len(projects)} variant(s)", file=sys.stderr)

    # Rank by complexity and take top N
    total_found = len(projects)
    projects.sort(key=project_complexity, reverse=True)
    if len(projects) > MAX_PROJECTS:
        print(f"    Trimmed from {len(projects)} to {MAX_PROJECTS} most interesting", file=sys.stderr)
        projects = projects[:MAX_PROJECTS]

    return projects, total_found


def normalize_id(project_id: str) -> str:
    """Normalize a project ID for deduplication (hyphens, underscores, dots → lowercase hyphen)."""
    return re.sub(r'[_.]', '-', project_id).lower()


def merge_projects(discovered: list[dict], curated: list[dict]) -> list[dict]:
    """Merge discovered projects with curated data. Curated takes precedence.
    Uses normalized IDs so 'planet-cf' matches 'planet_cf' etc."""
    curated_norm = {normalize_id(p["id"]) for p in curated}
    merged = list(curated)
    for project in discovered:
        if normalize_id(project["id"]) not in curated_norm:
            merged.append(project)
    # If merged exceeds MAX_PROJECTS, keep all curated + top discovered
    if len(merged) > MAX_PROJECTS:
        extra = [p for p in merged if normalize_id(p["id"]) not in curated_norm]
        extra.sort(key=project_complexity, reverse=True)
        merged = list(curated) + extra[:MAX_PROJECTS - len(curated)]
    return merged


# --- TypeScript code generation ---

def indent(text: str, level: int) -> str:
    return " " * (level * 2) + text


def format_node(node: dict) -> str:
    return f'{{ label: "{node["label"]}", primitive: "{node["primitive"]}", detail: "{node["detail"]}" }}'


def format_flow(flow: dict) -> str:
    return f'{{ from: "{flow["from"]}", to: "{flow["to"]}", label: "{flow["label"]}" }}'


def format_project(project: dict, level: int) -> str:
    lines = []
    prefix = " " * (level * 2)
    inner = " " * ((level + 1) * 2)
    deeper = " " * ((level + 2) * 2)

    lines.append(f"{prefix}{{")
    lines.append(f'{inner}id: "{project["id"]}",')

    # Nodes
    lines.append(f"{inner}nodes: [")
    for node in project["nodes"]:
        lines.append(f"{deeper}{format_node(node)},")
    lines.append(f"{inner}],")

    # Flows
    lines.append(f"{inner}flows: [")
    for flow in project["flows"]:
        lines.append(f"{deeper}{format_flow(flow)},")
    lines.append(f"{inner}],")

    lines.append(f"{prefix}}}")
    return "\n".join(lines)


def generate_team_data_ts(registry: dict[str, dict]) -> str:
    """Generate the team-data.ts TypeScript file content."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        f"// Auto-generated by scripts/build_team_architectures.py -- do not edit manually",
        f"// Generated: {now}",
        "",
        'import type { UserEntry } from "./mermaid";',
        "",
        "export const TEAM_REGISTRY: Record<string, UserEntry> = {",
    ]

    for username, data in registry.items():
        display_name = data["displayName"]
        projects = data["projects"]
        total_discovered = data["totalDiscovered"]
        lines.append(f'  "{username}": {{')
        lines.append(f'    displayName: "{display_name}",')
        lines.append(f'    totalDiscovered: {total_discovered},')
        lines.append(f"    projects: [")
        for project in projects:
            lines.append(format_project(project, 3) + ",")
        lines.append(f"    ],")
        lines.append(f"  }},")

    lines.append("};")
    lines.append("")
    return "\n".join(lines)


# --- Cache ---

def load_cache() -> dict:
    """Load cached discovery results (keyed by username)."""
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_cache(cache: dict) -> None:
    """Save discovery cache to disk."""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, indent=2))
    print(f"  Cache saved to {CACHE_FILE.relative_to(PROJECT_ROOT)}", file=sys.stderr)


# --- Main ---

def main():
    use_cache = "--refresh" not in sys.argv

    cache = load_cache() if use_cache else {}
    if use_cache and cache:
        print("Building team architectures data (using cache)...\n", file=sys.stderr)
    else:
        print("Building team architectures data (fresh from GitHub)...\n", file=sys.stderr)

    registry: dict[str, dict] = {}

    for username, display_name in TEAM:
        # Try cache first
        if use_cache and username in cache:
            discovered = cache[username]["projects"]
            discovered_total = cache[username]["totalFound"]
            print(f"  {username} ({display_name}): {len(discovered)} project(s) from cache ({discovered_total} before cap)", file=sys.stderr)
        else:
            print(f"  Processing {username} ({display_name})...", file=sys.stderr)
            try:
                discovered, discovered_total = discover_user(username)
            except Exception as e:
                print(f"    ERROR: {e} — saving partial cache and aborting", file=sys.stderr)
                save_cache(cache)
                raise
            print(f"    Discovered {len(discovered)} project(s) from GitHub ({discovered_total} before cap)", file=sys.stderr)
            cache[username] = {"projects": discovered, "totalFound": discovered_total}
            # Save cache after each user so partial progress is preserved
            save_cache(cache)

        # Get curated data if available
        curated = CURATED.get(username, [])
        if curated:
            print(f"    Have {len(curated)} curated project(s)", file=sys.stderr)

        # Merge: curated takes precedence
        merged = merge_projects(discovered, curated)
        total_discovered = discovered_total + len(curated)
        print(f"    Total: {len(merged)} project(s) (of {total_discovered} found)\n", file=sys.stderr)

        registry[username] = {
            "displayName": display_name,
            "projects": merged,
            "totalDiscovered": total_discovered,
        }

    # Generate TypeScript
    ts_content = generate_team_data_ts(registry)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(ts_content)

    total = sum(len(d["projects"]) for d in registry.values())
    print(f"Generated {OUTPUT.relative_to(PROJECT_ROOT)}", file=sys.stderr)
    print(f"  {len(registry)} users, {total} total projects", file=sys.stderr)


if __name__ == "__main__":
    main()
