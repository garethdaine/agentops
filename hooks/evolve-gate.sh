#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_evolve_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
agentops_is_bypass "$INPUT" && exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."

EVOLVE_COUNTER="${CWD}/.agentops/evolve-batch-count"

UNPROCESSED=$(agentops_unprocessed_failures "$CWD")

# Trigger evolve every 5 unprocessed failures
[ "$UNPROCESSED" -lt 5 ] && exit 0

# Check if we already nudged at this threshold (avoid nagging on every subsequent failure)
LAST_NUDGE=0
[ -f "$EVOLVE_COUNTER" ] && LAST_NUDGE=$(tr -d '[:space:]' < "$EVOLVE_COUNTER" 2>/dev/null)
LAST_NUDGE=${LAST_NUDGE:-0}

# Nudge at every multiple of 5
THRESHOLD=$(( (UNPROCESSED / 5) * 5 ))
[ "$THRESHOLD" -le "$LAST_NUDGE" ] && exit 0

COUNTER_TMP="${EVOLVE_COUNTER}.$$"
echo "$THRESHOLD" > "$COUNTER_TMP" 2>/dev/null && mv "$COUNTER_TMP" "$EVOLVE_COUNTER" 2>/dev/null

jq -nc --arg count "$UNPROCESSED" \
  '{systemMessage: ("AgentOps: " + $count + " unprocessed failures accumulated. Run /agentops:evolve NOW to analyze failure patterns and propose skill improvements. This uses the Read tool and Agent tool (proposer + skill-builder subagents) — no Bash required.")}'
