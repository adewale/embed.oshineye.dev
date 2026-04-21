#!/usr/bin/env python3
"""
Discover Cloudflare projects for a single GitHub user and render a standalone HTML page.

Usage:
  python3 scripts/build_user_architectures.py timowilhelm
  python3 scripts/build_user_architectures.py timowilhelm --display-name "Timo Wilhelm" --open
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys

from build_team_architectures import PROJECT_ROOT, check_github_auth, discover_user


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("username", help="GitHub username to crawl")
    parser.add_argument(
        "--display-name",
        help="Display name for the generated page (defaults to username)",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the generated HTML file after rendering",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ok, err = check_github_auth()
    if not ok:
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(1)

    display_name = args.display_name or args.username
    projects, total = discover_user(args.username)

    payload = {
        "username": args.username,
        "displayName": display_name,
        "projects": projects,
        "totalDiscovered": total,
    }

    output_json = PROJECT_ROOT / "data" / f"{args.username}-architectures.json"
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {output_json.relative_to(PROJECT_ROOT)}")

    subprocess.run(
        ["npx", "tsx", "scripts/render-user-architectures.ts", args.username],
        cwd=PROJECT_ROOT,
        check=True,
    )

    output_html = PROJECT_ROOT / "data" / f"{args.username}-architectures.html"
    print(f"Rendered {output_html.relative_to(PROJECT_ROOT)}")
    print(f"Local route: /user-architectures/{args.username}")

    if args.open:
        subprocess.run(["open", str(output_html)], check=True)


if __name__ == "__main__":
    main()
