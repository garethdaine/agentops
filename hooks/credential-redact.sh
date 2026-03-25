#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'credential_redaction_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

SENSITIVE_EXTENSIONS='\.(env|pem|key|crt|secret|p12|pfx|credential|token|password|ssh)'
SENSITIVE_CONFIG='\.(json|yaml|yml|toml|cfg|ini)$'

# Handle Read tool — warn when reading sensitive files
if [ "$TOOL" = "Read" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
  if echo "$FILE_PATH" | grep -qiE "$SENSITIVE_EXTENSIONS"; then
    LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
    mkdir -p "$LOG_DIR" 2>/dev/null
    jq -nc --arg ts "$(date -u +%FT%TZ)" --arg fp "$FILE_PATH" \
      '{ts:$ts, event:"CREDENTIAL_ACCESS", tool:"Read", file:$fp}' >> "$LOG_DIR/audit.jsonl" 2>/dev/null

    jq -nc '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"WARNING: This file may contain credentials. Do NOT include any secrets, API keys, tokens, or passwords in your response. Redact any sensitive values with [REDACTED]."}}'
    exit 0
  fi
  exit 0
fi

# Handle Bash tool — warn when commands read credential files
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0

# Match: reading credential files via common tools or scripting languages
if echo "$COMMAND" | grep -qiE "(cat|less|head|more|tail|grep|jq|python3?|ruby|node|source|base64|xxd)\s.*${SENSITIVE_EXTENSIONS}" || \
   echo "$COMMAND" | grep -qiE "source\s+.*\.env\b"; then
  LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
  mkdir -p "$LOG_DIR" 2>/dev/null
  REDACTED_CMD=$(echo "$COMMAND" | agentops_redact)
  jq -nc --arg ts "$(date -u +%FT%TZ)" --arg cmd "$REDACTED_CMD" \
    '{ts:$ts, event:"CREDENTIAL_ACCESS", command:$cmd}' >> "$LOG_DIR/audit.jsonl" 2>/dev/null

  jq -nc '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"WARNING: This command accessed a file that may contain credentials. Do NOT include any secrets, API keys, tokens, or passwords in your response. Redact any sensitive values with [REDACTED]."}}'
fi
