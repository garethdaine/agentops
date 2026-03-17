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

# Forward to OTLP if configured — validate endpoint and add timeout
if [ -n "${OTLP_ENDPOINT:-}" ]; then
  # Only allow https:// endpoints; reject localhost, private IPs, metadata endpoints
  if echo "$OTLP_ENDPOINT" | grep -qE '^https://[^/]+\.[^/]+' && \
     ! echo "$OTLP_ENDPOINT" | grep -qiE '(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|metadata\.google|\.internal[:/])'; then
    PAYLOAD=$(tail -1 "$LOG_FILE" 2>/dev/null) || true
    if [ -n "$PAYLOAD" ]; then
      curl -sf --max-time 10 --connect-timeout 5 \
        -X POST "$OTLP_ENDPOINT/v1/logs" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" &>/dev/null &
    fi
  fi
fi
