#!/usr/bin/env bash
# Stop hook for the vendored guardrails skill (.claude/skills/guardrails):
# before the agent hands control back, run the fast check (`npm run check`:
# typecheck, Vitest, Python unittest). If it fails, exit 2 so Claude Code
# blocks the stop and feeds the failure back to the agent.
set -uo pipefail

input="$(cat)"

# Claude Code sets stop_hook_active when the agent is already continuing
# because this hook blocked it. Don't block a second time: a failure the agent
# cannot fix should end with a report to the user, not a loop.
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 1

# Nothing changed since the last commit: nothing new to verify (CI covers
# commits).
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

if ! output="$(npm run --silent check 2>&1)"; then
  {
    echo "Fast check failed (npm run check). Fix it before finishing:"
    printf '%s\n' "$output" | tail -n 80
  } >&2
  exit 2
fi
