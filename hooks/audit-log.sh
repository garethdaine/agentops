#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

INPUT=$(cat) || exit 0
LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
LOG_FILE="$LOG_DIR/audit.jsonl"
mkdir -p "$LOG_DIR" 2>/dev/null

TS=$(date -u +%FT%TZ)
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null) || SESSION="unknown"
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null) || EVENT="unknown"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || TOOL=""
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {} | tostring | .[:500]' 2>/dev/null) || TOOL_INPUT="{}"

# Redact secrets using canonical shared function
TOOL_INPUT=$(echo "$TOOL_INPUT" | agentops_redact)

jq -nc \
  --arg ts "$TS" \
  --arg session "$SESSION" \
  --arg event "$EVENT" \
  --arg tool "$TOOL" \
  --arg input "$TOOL_INPUT" \
  '{ts:$ts, session:$session, event:$event, tool:$tool, input:$input}' >> "$LOG_FILE" 2>/dev/null || true
