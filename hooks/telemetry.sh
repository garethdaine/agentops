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

# Forward to OTLP if configured — validate endpoint with hostname allowlist
if [ -n "${OTLP_ENDPOINT:-}" ]; then
  # Require explicit hostname allowlist — reject if not configured
  OTLP_ALLOWLIST="${OTLP_HOSTNAME_ALLOWLIST:-}"
  if [ -z "$OTLP_ALLOWLIST" ]; then
    exit 0
  fi

  # Extract hostname from endpoint URL
  OTLP_HOST=$(echo "$OTLP_ENDPOINT" | sed -E 's|^https?://([^:/]+).*|\1|')

  # Must be HTTPS
  if ! echo "$OTLP_ENDPOINT" | grep -qE '^https://'; then
    exit 0
  fi

  # Check hostname against allowlist (comma-separated)
  ALLOWED=false
  IFS=',' read -ra HOSTS <<< "$OTLP_ALLOWLIST"
  for ALLOWED_HOST in "${HOSTS[@]}"; do
    ALLOWED_HOST=$(echo "$ALLOWED_HOST" | tr -d ' ')
    if [ "$OTLP_HOST" = "$ALLOWED_HOST" ]; then
      ALLOWED=true
      break
    fi
  done
  [ "$ALLOWED" = false ] && exit 0

  # Resolve hostname and reject private/loopback IPs (DNS rebinding defense)
  RESOLVED_IP=$(dig +short "$OTLP_HOST" 2>/dev/null | head -1)
  if echo "$RESOLVED_IP" | grep -qE '^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0|fe80:)'; then
    exit 0
  fi

  PAYLOAD=$(tail -1 "$LOG_FILE" 2>/dev/null) || true
  if [ -n "$PAYLOAD" ]; then
    CURL_ARGS=(
      -sf --max-time 10 --connect-timeout 5 --no-location
      -X POST "$OTLP_ENDPOINT/v1/logs"
      -H "Content-Type: application/json"
    )
    if [ -n "${OTLP_AUTH_TOKEN:-}" ]; then
      CURL_ARGS+=(-H "Authorization: Bearer ${OTLP_AUTH_TOKEN}")
    fi
    printf '%s' "$PAYLOAD" | curl "${CURL_ARGS[@]}" --data-binary @- &>/dev/null &
  fi
fi
