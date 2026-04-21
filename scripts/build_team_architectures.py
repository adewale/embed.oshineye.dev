#!/usr/bin/env python3
"""
Discovers Cloudflare projects for team members via the GitHub API
and generates TypeScript data for the team-architectures page.

Usage:
  python3 scripts/build_team_architectures.py              # uses cache
  python3 scripts/build_team_architectures.py --refresh    # fetch new projects only
  python3 scripts/build_team_architectures.py --force-refresh  # re-fetch all projects

Requires: gh CLI (authenticated)
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import random
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# --- Paths ---
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT = (
    PROJECT_ROOT
    / "src"
    / "embeds"
    / "v1"
    / "cloudflare-architecture-viz"
    / "team-data.ts"
)
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
    ("jamesqquick", "James"),
    ("zeke", "Zeke"),
]

# --- Curated project data (hand-verified, takes precedence over auto-discovered) ---

CURATED: dict[str, list[dict]] = {
    "adewale": [
        {
            "id": "planet-cf",
            "nodes": [
                {"label": "Browser", "primitive": "client", "detail": "Reader"},
                {
                    "label": "Static Assets",
                    "primitive": "static-assets",
                    "detail": "HTML / CSS",
                },
                {"label": "Workers", "primitive": "workers", "detail": "Python"},
                {"label": "Cron Trigger", "primitive": "cron", "detail": "Hourly"},
                {"label": "D1", "primitive": "d1", "detail": "Feed entries"},
                {
                    "label": "Queues",
                    "primitive": "queues",
                    "detail": "Feed queue + DLQ",
                },
                {"label": "Workers AI", "primitive": "ai", "detail": "Embeddings"},
                {
                    "label": "Vectorize",
                    "primitive": "vectorize",
                    "detail": "Search index",
                },
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
                {
                    "label": "Static Assets",
                    "primitive": "static-assets",
                    "detail": "Vite build",
                },
                {"label": "Workers", "primitive": "workers", "detail": "API router"},
                {
                    "label": "Durable Objects",
                    "primitive": "durable-objects",
                    "detail": "LiveSession (SQLite)",
                },
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
                {
                    "label": "Matchmaker",
                    "primitive": "durable-objects",
                    "detail": "Lobby mgmt",
                },
                {
                    "label": "GameRoom",
                    "primitive": "durable-objects",
                    "detail": "SQLite state",
                },
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
                {
                    "label": "Static Assets",
                    "primitive": "static-assets",
                    "detail": "loader.js",
                },
                {"label": "Workers", "primitive": "workers", "detail": "Hono router"},
                {
                    "label": "Durable Objects",
                    "primitive": "durable-objects",
                    "detail": "PresenceRoom",
                },
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
                {
                    "label": "Static Assets",
                    "primitive": "static-assets",
                    "detail": "HTML",
                },
                {"label": "Workers", "primitive": "workers", "detail": "Router"},
                {
                    "label": "Durable Objects",
                    "primitive": "durable-objects",
                    "detail": "Fibonacci (SQLite)",
                },
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
                {
                    "label": "Static Assets",
                    "primitive": "static-assets",
                    "detail": "HTML / CSS / JS",
                },
            ],
            "flows": [
                {"from": "Browser", "to": "Static Assets", "label": "GET /*"},
            ],
        },
    ],
}

# --- Wrangler config -> primitive detection ---

KNOWN_PRIMITIVES = {
    "pages_build_output_dir": "pages",
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
    "containers": "containers",
    "hyperdrive": "hyperdrive",
    "images": "images",
    "send_email": "email",
    "analytics_engine_datasets": "analytics-engine",
    "dispatch_namespaces": "workers-for-platforms",
    "secrets_store_secrets": "secret-store",
    "workflows": "workflows",
}

PRIMITIVE_DETAIL = {
    "workers": "Worker",
    "pages": "Pages app",
    "static-assets": "Static files",
    "durable-objects": "Stateful DO",
    "kv": "Key-value store",
    "d1": "SQL database",
    "r2": "Object storage",
    "queues": "Message queue",
    "ai": "Workers AI",
    "ai-gateway": "AI traffic gateway",
    "vectorize": "Vector search",
    "cron": "Scheduled trigger",
    "client": "Web client",
    "browser": "Browser Run",
    "containers": "Workers Containers",
    "hyperdrive": "Database connector",
    "images": "Image pipeline",
    "email": "Email Workers",
    "analytics-engine": "Analytics dataset",
    "workers-for-platforms": "Dispatch namespace",
    "secret-store": "Secrets store",
    "realtime": "Realtime session",
    "stream": "Video stream",
    "voice": "Voice session",
    "sandboxes": "Sandbox runtime",
    "agents": "Agents SDK",
    "workflows": "Workflow steps",
}

PRIMITIVE_LABEL = {
    "workers": "Workers",
    "pages": "Pages",
    "static-assets": "Static Assets",
    "durable-objects": "Durable Objects",
    "kv": "KV",
    "d1": "D1",
    "r2": "R2",
    "queues": "Queues",
    "ai": "Workers AI",
    "ai-gateway": "AI Gateway",
    "vectorize": "Vectorize",
    "cron": "Cron Trigger",
    "browser": "Browser Run",
    "containers": "Containers",
    "hyperdrive": "Hyperdrive",
    "images": "Cloudflare Images",
    "email": "Email Workers",
    "analytics-engine": "Analytics Engine",
    "workers-for-platforms": "Workers for Platforms",
    "secret-store": "Secret Store",
    "realtime": "Realtime",
    "stream": "Stream",
    "voice": "Voice",
    "sandboxes": "Sandboxes",
    "agents": "Agents",
    "workflows": "Workflow",
}

PACKAGE_DEPENDENCY_FIELDS = (
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
)

AI_PACKAGE_NAMES = (
    "@cloudflare/ai",
    "@cloudflare/ai-chat",
    "@cloudflare/ai-utils",
    "workers-ai-provider",
)
AI_GATEWAY_PACKAGE_NAMES = ("@cloudflare/ai-gateway",)
BROWSER_RUN_PACKAGE_NAMES = (
    "@cloudflare/playwright",
    "@cloudflare/playwright-mcp",
    "@cloudflare/puppeteer",
)
CONTAINER_PACKAGE_NAMES = ("@cloudflare/containers",)
PAGE_PACKAGE_NAMES = (
    "@cloudflare/next-on-pages",
    "@cloudflare/pages-plugin-cloudflare-access",
)
REALTIME_PACKAGE_PREFIXES = ("@cloudflare/realtimekit",)
SANDBOX_PACKAGE_NAMES = ("@cloudflare/sandbox",)
SANDBOX_PACKAGE_COMBINATIONS = (("@cloudflare/shell", "@cloudflare/think"),)
STREAM_PACKAGE_NAMES = ("@cloudflare/stream-react",)
VOICE_PACKAGE_NAMES = ("@cloudflare/voice",)
AGENT_PACKAGE_NAMES = ("agents", "hono-agents", "@cloudflare/agents")
WRANGLER_FILE_NAMES = ("wrangler.toml", "wrangler.jsonc", "wrangler.json")
COMMON_DISCOVERY_DIRS = (
    "apps",
    "packages",
    "workers",
    "worker",
    "server",
    "api",
    "backend",
    "frontend",
    "web",
    "website",
    "site",
    "src",
)
ANALYSIS_VERSION = 1
MIN_RATE_LIMIT_REMAINING = 150


# --- GitHub API helpers ---


class GitHubApiError(RuntimeError):
    """Raised when a GitHub API call fails in a way that should abort discovery."""


def is_rate_limit_error(message: str) -> bool:
    lowered = message.lower()
    return "api rate limit exceeded" in lowered or "secondary rate limit" in lowered


def is_retryable_github_error(message: str) -> bool:
    lowered = message.lower()
    return is_rate_limit_error(message) or any(
        token in lowered
        for token in (
            "http 502",
            "http 503",
            "http 504",
            "timed out",
            "connection reset",
        )
    )


def gh(args: str, timeout: int = 30) -> str:
    """Run a gh CLI command and return stdout."""
    attempts = 5
    for attempt in range(attempts):
        try:
            result = subprocess.run(
                f"gh {args}",
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            if attempt < attempts - 1:
                time.sleep((2**attempt) + random.uniform(0, 1))
                continue
            raise GitHubApiError(f"GitHub CLI command timed out: gh {args}")

        if result.returncode == 0:
            return result.stdout.strip()

        message = "\n".join(
            part.strip() for part in (result.stdout, result.stderr) if part.strip()
        )

        if is_retryable_github_error(message) and attempt < attempts - 1:
            time.sleep((2**attempt) + random.uniform(0, 1))
            continue

        if is_rate_limit_error(message):
            raise GitHubApiError("GitHub API rate limit exceeded")

        return ""

    raise GitHubApiError(f"GitHub CLI command failed after retries: gh {args}")


def gh_json(args: str) -> object | None:
    """Run a gh CLI command and parse JSON output."""
    raw = gh(args)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def check_github_auth() -> tuple[bool, str]:
    """
    Check if gh CLI is authenticated and can make API calls.

    Returns:
        (is_authenticated, error_message)
    """
    result = subprocess.run(
        ["gh", "auth", "status", "-h", "github.com"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        return False, "GitHub CLI not authenticated. Run: gh auth login"

    # Try a lightweight API call to verify token works
    test = gh('api "user" --jq .login')
    if not test:
        return False, "GitHub API token invalid or rate limited."

    return True, ""


def get_core_rate_limit() -> dict | None:
    """Fetch the current GitHub core API rate limit bucket."""
    data = gh_json('api "rate_limit"')
    if not isinstance(data, dict):
        return None
    resources = data.get("resources")
    if not isinstance(resources, dict):
        return None
    core = resources.get("core")
    return core if isinstance(core, dict) else None


def ensure_rate_limit_budget(min_remaining: int = MIN_RATE_LIMIT_REMAINING) -> None:
    """Abort early when the remaining core GitHub budget is too low."""
    core = get_core_rate_limit()
    if not core:
        return

    remaining = int(core.get("remaining") or 0)
    if remaining >= min_remaining:
        return

    reset = int(core.get("reset") or 0)
    reset_at = datetime.fromtimestamp(reset, timezone.utc).strftime(
        "%Y-%m-%d %H:%M:%SZ"
    )
    raise GitHubApiError(
        f"GitHub core rate limit too low ({remaining} remaining, resets at {reset_at})"
    )


def parse_csv_arg(raw: str | None) -> set[str]:
    if not raw:
        return set()
    return {item.strip() for item in raw.split(",") if item.strip()}


def parse_repo_filters(raw: str | None) -> dict[str, set[str]]:
    filters: dict[str, set[str]] = {}
    for item in parse_csv_arg(raw):
        if "/" not in item:
            raise ValueError(f"Invalid repo filter '{item}'. Expected username/repo")
        username, repo = item.split("/", 1)
        filters.setdefault(username, set()).add(repo)
    return filters


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--refresh",
        action="store_true",
        help="Refresh changed or uncached repos while reusing repo snapshots when unchanged",
    )
    mode.add_argument(
        "--force-refresh",
        action="store_true",
        help="Reanalyze every targeted repo, reusing cached local blobs when the tree is unchanged",
    )
    parser.add_argument(
        "--users",
        help="Comma-separated team usernames to refresh (others stay on cache)",
    )
    parser.add_argument(
        "--repos",
        help="Comma-separated username/repo targets to refresh (others stay on cache)",
    )
    return parser.parse_args(argv)


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
        fixed = re.sub(r"\]\s*\[", ",", raw)
        repos = json.loads(fixed)
    except json.JSONDecodeError:
        return []
    return [
        {
            "name": r["name"],
            "description": r.get("description") or "",
            "defaultBranch": r.get("default_branch") or "HEAD",
        }
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


def find_repo_file(username: str, repo: str, candidates: list[str]) -> str | None:
    """Find and return a file's content from root or common monorepo subdirectories."""
    root_files = list_root_files(username, repo)

    # Check root
    for name in candidates:
        if name in root_files:
            content = fetch_file_content(username, repo, name)
            if content and content.strip():
                return content

    # Check common monorepo subdirs
    sub_dirs = [
        d
        for d in root_files
        if d
        in (
            "apps",
            "packages",
            "workers",
            "worker",
            "server",
            "api",
            "backend",
            "frontend",
            "web",
            "website",
            "site",
            "src",
        )
    ]
    for d in sub_dirs:
        sub_data = gh_json(
            f'api "repos/{username}/{repo}/contents/{d}" --jq "[.[].name]"'
        )
        sub_names = [str(f) for f in sub_data] if isinstance(sub_data, list) else []
        for name in candidates:
            if name in sub_names:
                content = fetch_file_content(username, repo, f"{d}/{name}")
                if content and content.strip():
                    return content
        # One more level deep for monorepos (apps/worker-name/)
        for sub in sub_names:
            deep_data = gh_json(
                f'api "repos/{username}/{repo}/contents/{d}/{sub}" --jq "[.[].name]"'
            )
            deep_names = (
                [str(f) for f in deep_data] if isinstance(deep_data, list) else []
            )
            for name in candidates:
                if name in deep_names:
                    content = fetch_file_content(username, repo, f"{d}/{sub}/{name}")
                    if content and content.strip():
                        return content

    return None


def find_wrangler_config(username: str, repo: str) -> str | None:
    """Find and return wrangler config content from a repo."""
    return find_repo_file(
        username, repo, ["wrangler.toml", "wrangler.jsonc", "wrangler.json"]
    )


def find_package_manifest(username: str, repo: str) -> str | None:
    """Find and return package.json content from a repo."""
    return find_repo_file(username, repo, ["package.json"])


def list_repo_tree(username: str, repo: str, ref: str) -> dict | None:
    """Fetch the recursive Git tree for a repo ref."""
    data = gh_json(f'api "repos/{username}/{repo}/git/trees/{ref}?recursive=1"')
    if not isinstance(data, dict):
        return None
    tree = data.get("tree")
    if not isinstance(tree, list):
        return None

    entries = [
        entry
        for entry in tree
        if isinstance(entry, dict)
        and entry.get("type") == "blob"
        and isinstance(entry.get("path"), str)
        and isinstance(entry.get("sha"), str)
    ]
    return {"sha": str(data.get("sha") or ""), "entries": entries}


def path_parent(path: str) -> str:
    return path.rsplit("/", 1)[0] if "/" in path else ""


def path_priority(
    path: str, preferred_dir: str | None = None
) -> tuple[int, int, int, str]:
    top_level = path.split("/", 1)[0]
    depth = path.count("/")
    parent = path_parent(path)

    if preferred_dir:
        if parent == preferred_dir:
            bucket = 0
        elif parent.startswith(f"{preferred_dir}/"):
            bucket = 1
        elif "/" not in path:
            bucket = 2
        elif top_level in COMMON_DISCOVERY_DIRS:
            bucket = 3
        else:
            bucket = 4
    else:
        if "/" not in path:
            bucket = 0
        elif top_level in COMMON_DISCOVERY_DIRS:
            bucket = 1
        else:
            bucket = 2

    return (bucket, depth, len(path), path)


def sorted_tree_entries(
    tree_entries: list[dict],
    filenames: tuple[str, ...],
    preferred_dir: str | None = None,
) -> list[dict]:
    matches = [
        entry
        for entry in tree_entries
        if str(entry["path"]).split("/")[-1] in filenames
    ]
    return sorted(
        matches, key=lambda entry: path_priority(str(entry["path"]), preferred_dir)
    )


def clone_repo_snapshot(snapshot: dict | None) -> dict:
    if not isinstance(snapshot, dict):
        return {"files": {}}

    cloned = dict(snapshot)
    files = snapshot.get("files")
    cloned["files"] = dict(files) if isinstance(files, dict) else {}
    return cloned


def fetch_blob_content(username: str, repo: str, sha: str) -> str | None:
    """Fetch a git blob's content by SHA and decode it."""
    raw = gh(f'api "repos/{username}/{repo}/git/blobs/{sha}" --jq .content')
    if not raw:
        return None
    try:
        return base64.b64decode(raw.replace("\n", "")).decode("utf-8")
    except Exception:
        return None


def get_snapshot_file_content(snapshot: dict, path: str, sha: str) -> str | None:
    files = snapshot.get("files")
    if not isinstance(files, dict):
        return None
    entry = files.get(path)
    if not isinstance(entry, dict):
        return None
    if entry.get("sha") != sha:
        return None
    content = entry.get("content")
    return content if isinstance(content, str) else None


def remember_snapshot_file(snapshot: dict, path: str, sha: str, content: str) -> None:
    files = snapshot.setdefault("files", {})
    if isinstance(files, dict):
        files[path] = {"sha": sha, "content": content}


def load_blob_from_snapshot_or_github(
    username: str, repo: str, snapshot: dict, tree_entry: dict
) -> str | None:
    path = str(tree_entry["path"])
    sha = str(tree_entry["sha"])
    cached = get_snapshot_file_content(snapshot, path, sha)
    if cached is not None:
        return cached

    content = fetch_blob_content(username, repo, sha)
    if content is not None:
        remember_snapshot_file(snapshot, path, sha, content)
    return content


def select_package_manifest_from_tree(
    username: str,
    repo: str,
    tree_entries: list[dict],
    snapshot: dict,
    preferred_dir: str | None,
    require_primitives: bool,
) -> tuple[dict | None, str | None]:
    first_entry = None
    first_content = None

    for entry in sorted_tree_entries(tree_entries, ("package.json",), preferred_dir):
        content = load_blob_from_snapshot_or_github(username, repo, snapshot, entry)
        if not content:
            continue
        if first_entry is None:
            first_entry = entry
            first_content = content
        if detect_package_primitives(parse_package_manifest(content)):
            return entry, content

    if require_primitives:
        return None, None
    return first_entry, first_content


def build_project(
    repo_name: str, primitives: set[str], has_static: bool, has_cron: bool
) -> dict:
    return {
        "id": repo_name,
        "nodes": generate_nodes(primitives, has_static, has_cron),
        "flows": generate_flows(primitives, has_static, has_cron),
    }


def load_repo_snapshots(cache_entry: dict | None) -> dict[str, dict]:
    if not isinstance(cache_entry, dict):
        return {}
    snapshots = cache_entry.get("repoSnapshots")
    return dict(snapshots) if isinstance(snapshots, dict) else {}


def analyze_repo_via_tree(
    username: str, repo: dict, repo_snapshot: dict | None, force_refresh: bool
) -> tuple[dict | None, dict | None]:
    repo_name = str(repo["name"])
    default_branch = str(repo.get("defaultBranch") or "HEAD")
    tree = list_repo_tree(username, repo_name, default_branch)
    if not tree:
        return None, None

    tree_sha = str(tree.get("sha") or "")
    snapshot = clone_repo_snapshot(repo_snapshot)
    previous_tree_sha = str(snapshot.get("treeSha") or "")

    if (
        not force_refresh
        and previous_tree_sha == tree_sha
        and snapshot.get("analysisVersion") == ANALYSIS_VERSION
        and "included" in snapshot
    ):
        project = snapshot.get("project") if snapshot.get("included") else None
        return project if isinstance(project, dict) else None, snapshot

    snapshot["treeSha"] = tree_sha
    snapshot["defaultBranch"] = default_branch

    tree_entries = tree["entries"]
    wrangler_entry = next(
        iter(sorted_tree_entries(tree_entries, WRANGLER_FILE_NAMES)),
        None,
    )
    wrangler_content = (
        load_blob_from_snapshot_or_github(username, repo_name, snapshot, wrangler_entry)
        if wrangler_entry
        else None
    )

    preferred_dir = path_parent(str(wrangler_entry["path"])) if wrangler_entry else None
    package_entry, package_content = select_package_manifest_from_tree(
        username,
        repo_name,
        tree_entries,
        snapshot,
        preferred_dir,
        require_primitives=wrangler_entry is None,
    )

    snapshot["selectedWranglerPath"] = (
        str(wrangler_entry["path"]) if wrangler_entry else None
    )
    snapshot["selectedPackagePath"] = (
        str(package_entry["path"]) if package_entry else None
    )
    snapshot["analysisVersion"] = ANALYSIS_VERSION

    if not wrangler_content and not package_content:
        snapshot["included"] = False
        snapshot["project"] = None
        return None, snapshot

    detected = detect_primitives(wrangler_content, package_content)
    primitives = detected["primitives"]
    has_static = detected["has_static_assets"]
    has_cron = detected["has_cron"]

    if not should_include_detected_project(primitives, has_static, has_cron):
        snapshot["included"] = False
        snapshot["project"] = None
        return None, snapshot

    project = build_project(repo_name, primitives, has_static, has_cron)
    snapshot["included"] = True
    snapshot["project"] = project
    return project, snapshot


def analyze_repo_via_legacy_fetchers(username: str, repo_name: str) -> dict | None:
    config = find_wrangler_config(username, repo_name)
    package_manifest = find_package_manifest(username, repo_name)
    if not config and not package_manifest:
        return None

    detected = detect_primitives(config, package_manifest)
    if not should_include_detected_project(
        detected["primitives"],
        detected["has_static_assets"],
        detected["has_cron"],
    ):
        return None

    return build_project(
        repo_name,
        detected["primitives"],
        detected["has_static_assets"],
        detected["has_cron"],
    )


def strip_comments(content: str) -> str:
    """Strip comment lines from TOML (# ...) and JSONC (// ...) config files."""
    lines = []
    for line in content.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith("#") or stripped.startswith("//"):
            continue
        lines.append(line)
    return "\n".join(lines)


def parse_package_manifest(content: str | None) -> dict | None:
    """Parse a package.json file, returning None on invalid or missing content."""
    if not content:
        return None

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def dependency_names(manifest: dict | None) -> set[str]:
    """Collect dependency names from all package dependency sections."""
    names: set[str] = set()
    if not manifest:
        return names

    for field in PACKAGE_DEPENDENCY_FIELDS:
        section = manifest.get(field)
        if isinstance(section, dict):
            names.update(str(name) for name in section.keys())

    return names


def has_pages_script(manifest: dict | None) -> bool:
    """Detect wrangler pages usage from package scripts."""
    if not manifest:
        return False

    scripts = manifest.get("scripts")
    if not isinstance(scripts, dict):
        return False

    return any(
        isinstance(command, str) and re.search(r"\bwrangler\s+pages\b", command, re.I)
        for command in scripts.values()
    )


def has_any_dependency(names: set[str], package_names: tuple[str, ...]) -> bool:
    return any(package_name in names for package_name in package_names)


def has_all_dependencies(names: set[str], package_names: tuple[str, ...]) -> bool:
    return all(package_name in names for package_name in package_names)


def has_dependency_prefix(names: set[str], prefixes: tuple[str, ...]) -> bool:
    return any(name.startswith(prefix) for name in names for prefix in prefixes)


def detect_package_primitives(manifest: dict | None) -> set[str]:
    """Infer Cloudflare products from package.json dependencies and scripts."""
    names = dependency_names(manifest)
    primitives: set[str] = set()

    if has_pages_script(manifest) or has_any_dependency(names, PAGE_PACKAGE_NAMES):
        primitives.add("pages")
    if has_any_dependency(names, AI_PACKAGE_NAMES):
        primitives.add("ai")
    if has_any_dependency(names, AI_GATEWAY_PACKAGE_NAMES):
        primitives.add("ai-gateway")
    if has_any_dependency(names, BROWSER_RUN_PACKAGE_NAMES):
        primitives.add("browser")
    if has_any_dependency(names, CONTAINER_PACKAGE_NAMES):
        primitives.add("containers")
    if has_dependency_prefix(names, REALTIME_PACKAGE_PREFIXES):
        primitives.add("realtime")
    if has_any_dependency(names, STREAM_PACKAGE_NAMES):
        primitives.add("stream")
    if has_any_dependency(names, VOICE_PACKAGE_NAMES):
        primitives.add("voice")
    if has_any_dependency(names, SANDBOX_PACKAGE_NAMES) or any(
        has_all_dependencies(names, combo) for combo in SANDBOX_PACKAGE_COMBINATIONS
    ):
        primitives.add("sandboxes")
    if has_any_dependency(names, AGENT_PACKAGE_NAMES):
        primitives.add("agents")

    return primitives


def detect_primitives(content: str | None, package_content: str | None = None) -> dict:
    """Detect CF primitives from wrangler config content (comments stripped)."""
    package_primitives = detect_package_primitives(
        parse_package_manifest(package_content)
    )
    primitives: set[str] = set(package_primitives)
    has_static_assets = False
    has_cron = False

    if content:
        primitives.add("workers")

        # Strip comments to avoid matching scaffolded / commented-out bindings
        cleaned = strip_comments(content)
        lc = cleaned.lower()

        for key, primitive in KNOWN_PRIMITIVES.items():
            patterns = [
                re.compile(rf"\[\[?{key}", re.IGNORECASE),
                re.compile(rf'"{key}"\s*:', re.IGNORECASE),
                re.compile(rf"{key}\s*=", re.IGNORECASE),
            ]
            if any(p.search(cleaned) for p in patterns):
                primitives.add(primitive)

        # AI detection (more specific)
        if re.search(r'(workers_ai|"ai"\s*:\s*\{|ai\s*=\s*\{|\[ai\])', lc):
            primitives.add("ai")

        # Static assets
        if re.search(r'(\[assets\]|"assets"\s*:|assets\s*=\s*\{)', lc):
            has_static_assets = True
        elif re.search(r"(assets|static_assets|site)", lc) and re.search(
            r"(bucket|directory|build)", lc
        ):
            has_static_assets = True

        # Cron triggers
        if re.search(r'(\[triggers\]|crons|"crons"\s*:)', lc) and "cron" in lc:
            has_cron = True
    elif package_primitives:
        primitives.add("workers")

    return {
        "primitives": primitives,
        "has_static_assets": has_static_assets,
        "has_cron": has_cron,
    }


def fetch_description(username: str, repo: str, root_files: list[str]) -> str:
    """Get a description for a repo from API description or README."""
    data = gh_json(
        f'api "repos/{username}/{repo}" --jq "{{description: .description}}"'
    )
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
            if not trimmed or trimmed.startswith(
                ("#", "[!", "![", "[![", "---", "```")
            ):
                continue
            if len(trimmed) > 20:
                readme_desc = trimmed[:300]
                break

    return readme_desc or api_desc or ""


def generate_nodes(
    primitives: set[str], has_static_assets: bool, has_cron: bool
) -> list[dict]:
    """Generate node list from detected primitives."""
    nodes = [{"label": "Browser", "primitive": "client", "detail": "Web client"}]
    if "pages" in primitives:
        nodes.append({"label": "Pages", "primitive": "pages", "detail": "Pages app"})
    if has_static_assets:
        nodes.append(
            {
                "label": "Static Assets",
                "primitive": "static-assets",
                "detail": "Static files",
            }
        )
    nodes.append({"label": "Workers", "primitive": "workers", "detail": "Worker"})
    if has_cron:
        nodes.append(
            {"label": "Cron Trigger", "primitive": "cron", "detail": "Scheduled"}
        )

    # Add remaining primitives in a stable order
    prim_order = [
        "durable-objects",
        "browser",
        "containers",
        "realtime",
        "sandboxes",
        "kv",
        "d1",
        "r2",
        "queues",
        "hyperdrive",
        "images",
        "analytics-engine",
        "secret-store",
        "ai",
        "ai-gateway",
        "vectorize",
        "stream",
        "email",
        "workflows",
        "workers-for-platforms",
        "voice",
        "agents",
    ]
    for prim in prim_order:
        if prim in primitives:
            label = PRIMITIVE_LABEL.get(prim, prim)
            detail = PRIMITIVE_DETAIL.get(prim, prim)
            nodes.append({"label": label, "primitive": prim, "detail": detail})

    return nodes


def generate_flows(
    primitives: set[str], has_static_assets: bool, has_cron: bool
) -> list[dict]:
    """Generate default flows based on detected primitives."""
    flows = []
    if "pages" in primitives:
        flows.append({"from": "Browser", "to": "Pages", "label": "GET /"})
    if has_static_assets:
        flows.append({"from": "Browser", "to": "Static Assets", "label": "GET /"})
    flows.append({"from": "Browser", "to": "Workers", "label": "API requests"})
    if has_cron:
        flows.append(
            {"from": "Cron Trigger", "to": "Workers", "label": "Scheduled event"}
        )

    prim_order = [
        "durable-objects",
        "browser",
        "containers",
        "realtime",
        "sandboxes",
        "kv",
        "d1",
        "r2",
        "queues",
        "hyperdrive",
        "images",
        "analytics-engine",
        "secret-store",
        "ai",
        "ai-gateway",
        "vectorize",
        "stream",
        "email",
        "workflows",
        "workers-for-platforms",
        "voice",
        "agents",
    ]
    flow_labels = {
        "durable-objects": "Route to DO",
        "browser": "Run browser task",
        "containers": "Run container workload",
        "realtime": "Realtime session",
        "sandboxes": "Execute sandboxed code",
        "kv": "KV read / write",
        "d1": "SQL queries",
        "r2": "Object storage",
        "queues": "Enqueue / consume",
        "hyperdrive": "Database connection",
        "images": "Transform images",
        "analytics-engine": "Write analytics",
        "secret-store": "Read secrets",
        "ai": "AI inference",
        "ai-gateway": "Proxy AI traffic",
        "vectorize": "Vector search",
        "stream": "Publish stream",
        "email": "Send / receive email",
        "workflows": "Run workflow",
        "workers-for-platforms": "Dispatch worker",
        "voice": "Handle voice session",
        "agents": "Run agents",
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


def should_skip_project(repo_name: str, cached_projects: list[dict]) -> bool:
    """
    Check if a project should be skipped because it already exists in cache.

    Args:
        repo_name: The repository name from GitHub
        cached_projects: List of cached project dicts with 'id' keys

    Returns:
        True if project exists in cache and should be skipped
    """
    cached_ids = {p["id"] for p in cached_projects}
    return repo_name in cached_ids


def should_include_detected_project(
    primitives: set[str], has_static_assets: bool, has_cron: bool
) -> bool:
    """Decide whether detected primitives are interesting enough to surface."""
    if not primitives:
        return False

    return not (primitives == {"workers"} and not has_static_assets and not has_cron)


def discover_user_with_snapshots(
    username: str,
    cache_entry: dict | None = None,
    force_refresh: bool = False,
    target_repos: set[str] | None = None,
) -> tuple[list[dict], int, dict[str, dict]]:
    """Discover Cloudflare projects for a GitHub user and update repo snapshots."""
    repos = list_repos(username)
    existing_snapshots = load_repo_snapshots(cache_entry)
    if not repos:
        return [], 0, existing_snapshots

    updated_snapshots = (
        {
            name: snapshot
            for name, snapshot in existing_snapshots.items()
            if name not in target_repos
        }
        if target_repos
        else {}
    )
    projects: list[dict] = []

    for repo in repos:
        repo_name = str(repo["name"])
        if target_repos and repo_name not in target_repos:
            if repo_name in existing_snapshots:
                updated_snapshots[repo_name] = existing_snapshots[repo_name]
            continue

        if repo.get("defaultBranch"):
            project, snapshot = analyze_repo_via_tree(
                username,
                repo,
                existing_snapshots.get(repo_name),
                force_refresh=force_refresh,
            )
            if snapshot is not None:
                updated_snapshots[repo_name] = snapshot
        else:
            project = analyze_repo_via_legacy_fetchers(username, repo_name)

        if project:
            projects.append(project)
            primitives = {node["primitive"] for node in project["nodes"]} - {
                "client",
                "terminal",
            }
            print(
                f"    Found: {repo_name} ({', '.join(sorted(primitives))})",
                file=sys.stderr,
            )

    before = len(projects)
    projects = deduplicate_variants(projects)
    if len(projects) < before:
        print(f"    Deduplicated {before - len(projects)} variant(s)", file=sys.stderr)

    total_found = len(projects)
    projects.sort(key=project_complexity, reverse=True)
    if len(projects) > MAX_PROJECTS:
        print(
            f"    Trimmed from {len(projects)} to {MAX_PROJECTS} most interesting",
            file=sys.stderr,
        )
        projects = projects[:MAX_PROJECTS]

    return projects, total_found, updated_snapshots


def discover_user(
    username: str, cached_projects: list[dict] | None = None
) -> tuple[list[dict], int]:
    """Backward-compatible discovery wrapper used by tests and one-off scripts."""
    del cached_projects
    projects, total_found, _ = discover_user_with_snapshots(username)
    return projects, total_found


def normalize_id(project_id: str) -> str:
    """Normalize a project ID for deduplication (hyphens, underscores, dots → lowercase hyphen)."""
    return re.sub(r"[_.]", "-", project_id).lower()


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
        merged = list(curated) + extra[: MAX_PROJECTS - len(curated)]
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
        lines.append(f"    totalDiscovered: {total_discovered},")
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


def main(argv: list[str] | None = None):
    args = parse_args(argv)
    use_cache = not args.refresh and not args.force_refresh
    force_refresh = args.force_refresh
    target_usernames = parse_csv_arg(args.users)
    try:
        repo_filters = parse_repo_filters(args.repos)
    except ValueError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
    requested_users = target_usernames | set(repo_filters.keys())

    # Check GitHub auth before proceeding (prevents corrupting cache on auth failure)
    is_authed, auth_error = check_github_auth()
    if not is_authed:
        print(f"ERROR: {auth_error}", file=sys.stderr)
        print("Cache was NOT modified.", file=sys.stderr)
        sys.exit(1)

    cache = load_cache()
    if use_cache and cache:
        print("Building team architectures data (using cache)...\n", file=sys.stderr)
    elif force_refresh:
        print(
            "Building team architectures data (FORCE REFRESH - re-fetching all)...\n",
            file=sys.stderr,
        )
    else:
        print(
            "Building team architectures data (fresh from GitHub)...\n", file=sys.stderr
        )

    registry: dict[str, dict] = {}

    for username, display_name in TEAM:
        cache_entry = (
            cache.get(username, {}) if isinstance(cache.get(username), dict) else {}
        )
        discovered = (
            cache_entry.get("projects", []) if isinstance(cache_entry, dict) else []
        )
        discovered_total = (
            cache_entry.get("totalFound", len(discovered))
            if isinstance(cache_entry, dict)
            else 0
        )
        target_repos = repo_filters.get(username)
        should_process_user = False

        if username not in cache:
            should_process_user = True
        elif not use_cache and (not requested_users or username in requested_users):
            should_process_user = True
        elif target_repos:
            should_process_user = True

        if not should_process_user and username in cache:
            print(
                f"  {username} ({display_name}): {len(discovered)} project(s) from cache ({discovered_total} before cap)",
                file=sys.stderr,
            )
        else:
            ensure_rate_limit_budget()
            print(f"  Processing {username} ({display_name})...", file=sys.stderr)
            try:
                discovered, discovered_total, repo_snapshots = (
                    discover_user_with_snapshots(
                        username,
                        cache_entry=cache_entry,
                        force_refresh=force_refresh,
                        target_repos=target_repos,
                    )
                )
            except Exception as e:
                print(
                    f"    ERROR: {e} — saving partial cache and aborting",
                    file=sys.stderr,
                )
                save_cache(cache)
                raise
            print(
                f"    Discovered {len(discovered)} project(s) from GitHub ({discovered_total} before cap)",
                file=sys.stderr,
            )
            cache[username] = {
                "projects": discovered,
                "totalFound": discovered_total,
                "repoSnapshots": repo_snapshots,
            }
            # Save cache after each user so partial progress is preserved
            save_cache(cache)

        # Get curated data if available
        curated = CURATED.get(username, [])
        if curated:
            print(f"    Have {len(curated)} curated project(s)", file=sys.stderr)

        # Merge: curated takes precedence
        merged = merge_projects(discovered, curated)
        total_discovered = discovered_total + len(curated)
        print(
            f"    Total: {len(merged)} project(s) (of {total_discovered} found)\n",
            file=sys.stderr,
        )

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
