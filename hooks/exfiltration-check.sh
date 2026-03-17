#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'exfiltration_detection_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || agentops_fail_closed
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || agentops_fail_closed
[ -z "$COMMAND" ] && exit 0

HARD_DENY=$(agentops_hard_deny)
SENSITIVE_FILES='\.(env|pem|key|crt|p12|pfx|secret|credential|token|password|ssh)'

# Hard-deny rules — always enforce, even in bypass/unrestricted mode

# 1. Network transfer of sensitive files (including -F for curl form uploads)
if echo "$COMMAND" | grep -qE "curl.*(-d|--data|--upload-file|-F)|wget.*--post|nc\s|ncat\s|socat\s"; then
  if echo "$COMMAND" | grep -qiE "$SENSITIVE_FILES"; then
    jq -nc --arg action "$HARD_DENY" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: network transfer of sensitive file type (hard deny)"}}'
    exit 0
  fi
fi

# 2. Piping secrets to network
if echo "$COMMAND" | grep -qE "(cat|less|head|tail|base64|xxd).*${SENSITIVE_FILES}.*\|.*(curl|wget|nc|ssh|scp|rsync|sftp)"; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: piping sensitive file to network command (hard deny)"}}'
  exit 0
fi

# 3. Direct file transfer tools with sensitive files
if echo "$COMMAND" | grep -qE "(scp|rsync|sftp)\s" && echo "$COMMAND" | grep -qiE "$SENSITIVE_FILES"; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: file transfer of sensitive file type (hard deny)"}}'
  exit 0
fi

# Soft rules below — bypass/unrestricted can downgrade these
agentops_is_bypass "$INPUT" && agentops_bypass_advisory "exfiltration-check"
ACTION=$(agentops_enforcement_action)

# 4. Base64 encoding + network (obfuscation attempt)
if echo "$COMMAND" | grep -qE "base64.*\|.*(curl|wget|nc)" || echo "$COMMAND" | grep -qE "(curl|wget).*base64"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: base64 encoding with network transfer detected"}}'
  exit 0
fi

# 5. DNS exfiltration via command substitution (including backticks)
if echo "$COMMAND" | grep -qE "(dig|nslookup|host)\s.*(\\$\(|\`)" ; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: possible DNS exfiltration via command substitution"}}'
  exit 0
fi

# 6. Scripting language network calls with sensitive file references
if echo "$COMMAND" | grep -qE "(python|ruby|node|perl)\s" && echo "$COMMAND" | grep -qiE "(requests\.post|urllib|http\.request|Net::HTTP|fetch|open\()" && echo "$COMMAND" | grep -qiE "$SENSITIVE_FILES"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: scripting language network call with sensitive file reference"}}'
  exit 0
fi
