#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
LOG_FILE="$LOG_DIR/provenance.jsonl"
mkdir -p "$LOG_DIR" 2>/dev/null

TS=$(date -u +%FT%TZ)
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null) || SESSION="unknown"

case "$TOOL" in
  WebFetch)
    URL=$(echo "$INPUT" | jq -r '.tool_input.url // "unknown"' 2>/dev/null) || URL="unknown"
    jq -nc --arg ts "$TS" --arg session "$SESSION" --arg url "$URL" \
      '{ts:$ts, session:$session, source:"web", url:$url, trust:"untrusted"}' >> "$LOG_FILE" 2>/dev/null
    ;;
  Read)
    FP=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown"' 2>/dev/null) || FP="unknown"
    TRUST="contextual"
    echo "$FP" | grep -qE "^/(tmp|var/tmp)" && TRUST="untrusted"
    jq -nc --arg ts "$TS" --arg session "$SESSION" --arg fp "$FP" --arg trust "$TRUST" \
      '{ts:$ts, session:$session, source:"file", path:$fp, trust:$trust}' >> "$LOG_FILE" 2>/dev/null
    ;;
  Write)
    FP=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown"' 2>/dev/null) || FP="unknown"
    jq -nc --arg ts "$TS" --arg session "$SESSION" --arg fp "$FP" \
      '{ts:$ts, session:$session, source:"write", path:$fp, trust:"trusted"}' >> "$LOG_FILE" 2>/dev/null
    ;;
esac
