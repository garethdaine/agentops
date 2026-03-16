#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
LOG_FILE="$LOG_DIR/failures.jsonl"
mkdir -p "$LOG_DIR" 2>/dev/null

TS=$(date -u +%FT%TZ)
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null) || SESSION="unknown"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null) || TOOL="unknown"
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}' 2>/dev/null | head -c 1000) || TOOL_INPUT="{}"
ERROR=$(echo "$INPUT" | jq -r '.tool_result // .error // "unknown"' 2>/dev/null | head -c 500) || ERROR="unknown"

jq -nc \
  --arg ts "$TS" \
  --arg session "$SESSION" \
  --arg tool "$TOOL" \
  --argjson input "$TOOL_INPUT" \
  --arg error "$ERROR" \
  '{ts:$ts, session:$session, tool:$tool, input:$input, error:$error}' >> "$LOG_FILE" 2>/dev/null || true
