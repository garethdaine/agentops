#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'credential_redaction_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0

# Log to audit if command reads credential files (redact the command before logging)
if echo "$COMMAND" | grep -qiE "(cat|less|head|more|tail|grep).*\.(env|pem|key|crt|secret)"; then
  LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
  mkdir -p "$LOG_DIR" 2>/dev/null
  REDACTED_CMD=$(echo "$COMMAND" | agentops_redact)
  jq -nc --arg ts "$(date -u +%FT%TZ)" --arg cmd "$REDACTED_CMD" \
    '{ts:$ts, event:"CREDENTIAL_ACCESS", command:$cmd}' >> "$LOG_DIR/audit.jsonl" 2>/dev/null

  jq -nc '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"WARNING: This command accessed a file that may contain credentials. Do NOT include any secrets, API keys, tokens, or passwords in your response. Redact any sensitive values with [REDACTED]."}}'
fi
