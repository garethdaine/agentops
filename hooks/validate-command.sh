#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'command_validation_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -z "$COMMAND" ] && exit 0

ACTION=$(agentops_enforcement_action)

# 1. Destructive system commands
if echo "$COMMAND" | grep -qE "^(rm\s+-rf\s+/[^t]|mkfs\s|dd\s+if=|:()\{|shutdown|reboot|init\s+[06])"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Destructive system command blocked by AgentOps CommandPolicy\"}}"
  exit 0
fi

# 2. Shell injection + dangerous pattern combo
if echo "$COMMAND" | grep -qE '\|\||&&' && echo "$COMMAND" | grep -qiE "(rm\s+-rf|chmod\s+777|curl.*\|.*sh|wget.*\|.*bash)"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"Shell injection risk: chained operators with dangerous command\"}}"
  exit 0
fi

# 3. Credential file access
if echo "$COMMAND" | grep -qE "(cat|less|head|more|tail).*(/etc/shadow|/etc/passwd|\.ssh/id_|\.env\b|\.pem\b)"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"Credential/sensitive file access detected\"}}"
  exit 0
fi

# 4. Fork bomb / resource exhaustion
if echo "$COMMAND" | grep -qE ':\(\)\{.*\|.*:\;'; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Fork bomb pattern detected\"}}"
  exit 0
fi
