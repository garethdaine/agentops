#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'exfiltration_detection_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -z "$COMMAND" ] && exit 0

ACTION=$(agentops_enforcement_action)

# Network transfer of sensitive files
if echo "$COMMAND" | grep -qE "curl.*(-d|--data|--upload-file)|wget.*--post|nc\s|ncat\s|socat\s"; then
  if echo "$COMMAND" | grep -qiE "\.(env|pem|key|crt|p12|pfx|secret|credential|token|password|ssh)"; then
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"ExfiltrationDetector: network transfer of sensitive file type\"}}"
    exit 0
  fi
fi

# Piping secrets to network
if echo "$COMMAND" | grep -qE "(cat|less|head|tail).*\.(env|key|pem|secret|crt).*\|.*(curl|wget|nc|ssh)"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"ExfiltrationDetector: piping sensitive file to network command\"}}"
  exit 0
fi

# Base64 encoding + network (obfuscation attempt)
if echo "$COMMAND" | grep -qE "base64.*\|.*(curl|wget|nc)" || echo "$COMMAND" | grep -qE "(curl|wget).*base64"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"ExfiltrationDetector: base64 encoding with network transfer detected\"}}"
  exit 0
fi
