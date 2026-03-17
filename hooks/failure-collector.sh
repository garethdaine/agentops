#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

INPUT=$(cat) || exit 0
LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
LOG_FILE="$LOG_DIR/failures.jsonl"
mkdir -p "$LOG_DIR" 2>/dev/null

TS=$(date -u +%FT%TZ)
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null) || SESSION="unknown"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null) || TOOL="unknown"
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {} | tostring | .[:1000]' 2>/dev/null) || TOOL_INPUT="{}"
ERROR=$(echo "$INPUT" | jq -r '.tool_result // .error // "unknown" | tostring | .[:500]' 2>/dev/null) || ERROR="unknown"

# Redact secrets using canonical shared function
TOOL_INPUT=$(echo "$TOOL_INPUT" | agentops_redact)
ERROR=$(echo "$ERROR" | agentops_redact)

jq -nc \
  --arg ts "$TS" \
  --arg session "$SESSION" \
  --arg tool "$TOOL" \
  --arg input "$TOOL_INPUT" \
  --arg error "$ERROR" \
  '{ts:$ts, session:$session, tool:$tool, input:$input, error:$error}' >> "$LOG_FILE" 2>/dev/null || true
