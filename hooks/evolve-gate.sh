#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_evolve_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
agentops_is_bypass "$INPUT" && exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."

FAILURES_FILE="${CWD}/.agentops/failures.jsonl"
FEEDBACK_FILE="${CWD}/.agentops/feedback-history.jsonl"
EVOLVE_COUNTER="${CWD}/.agentops/evolve-batch-count"

[ ! -f "$FAILURES_FILE" ] && exit 0
[ ! -s "$FAILURES_FILE" ] && exit 0

# Count unprocessed failures
if [ -f "$FEEDBACK_FILE" ] && [ -s "$FEEDBACK_FILE" ]; then
  ADDRESSED=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' "$FEEDBACK_FILE" 2>/dev/null | sort -u)
  UNPROCESSED=0
  while IFS= read -r line; do
    TS=$(echo "$line" | jq -r '.ts // empty' 2>/dev/null)
    [ -z "$TS" ] && continue
    if ! echo "$ADDRESSED" | grep -qF "$TS"; then
      UNPROCESSED=$((UNPROCESSED + 1))
    fi
  done < "$FAILURES_FILE"
else
  UNPROCESSED=$(wc -l < "$FAILURES_FILE" 2>/dev/null | tr -d ' ')
fi

# Trigger evolve every 5 unprocessed failures
[ "$UNPROCESSED" -lt 5 ] && exit 0

# Check if we already nudged at this threshold (avoid nagging on every subsequent failure)
LAST_NUDGE=0
[ -f "$EVOLVE_COUNTER" ] && LAST_NUDGE=$(cat "$EVOLVE_COUNTER" 2>/dev/null | tr -d '[:space:]')
LAST_NUDGE=${LAST_NUDGE:-0}

# Nudge at every multiple of 5
THRESHOLD=$(( (UNPROCESSED / 5) * 5 ))
[ "$THRESHOLD" -le "$LAST_NUDGE" ] && exit 0

echo "$THRESHOLD" > "$EVOLVE_COUNTER" 2>/dev/null

echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUseFailure\",\"additionalContext\":\"AgentOps: ${UNPROCESSED} unprocessed failures accumulated. Run /agentops:evolve NOW to analyze failure patterns and propose skill improvements. This uses the Read tool and Agent tool (proposer + skill-builder subagents) — no Bash required.\"}}"
