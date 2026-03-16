#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
LOG_FILE="$LOG_DIR/telemetry.jsonl"
mkdir -p "$LOG_DIR" 2>/dev/null

TS=$(date -u +%FT%TZ)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null) || EVENT="unknown"
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null) || SESSION="unknown"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || TOOL=""
CWD=$(echo "$INPUT" | jq -r '.cwd // ""' 2>/dev/null) || CWD=""

jq -nc \
  --arg ts "$TS" --arg event "$EVENT" --arg session "$SESSION" \
  --arg tool "$TOOL" --arg cwd "$CWD" \
  '{ts:$ts, event:$event, session:$session, tool:$tool, cwd:$cwd}' >> "$LOG_FILE" 2>/dev/null || true

# Forward to OTLP if configured
if [ -n "${OTLP_ENDPOINT:-}" ]; then
  PAYLOAD=$(tail -1 "$LOG_FILE" 2>/dev/null) || true
  curl -sf -X POST "$OTLP_ENDPOINT/v1/logs" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" &>/dev/null &
fi
