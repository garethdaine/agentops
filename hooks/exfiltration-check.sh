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

# Normalize command: strip path prefixes so /usr/bin/curl matches as curl
NORM_CMD=$(echo "$COMMAND" | sed -E 's|/[^ ]*/([^ /]+)|\1|g')

HARD_DENY=$(agentops_hard_deny)
SENSITIVE_FILES='\.(env|pem|key|crt|p12|pfx|secret|credential|token|password|ssh)'

# Network tool pattern — covers common and uncommon transfer utilities
NET_TOOLS='(curl|wget|nc|ncat|socat|scp|rsync|sftp|ssh|http|httpie|aria2c|openssl\s+s_client|telnet|lwp-request|fetch)'

# Hard-deny rules — always enforce, even in bypass/unrestricted mode

# 1. Network transfer of sensitive files (including -F for curl form uploads)
if echo "$NORM_CMD" | grep -qE "curl.*(-d|--data|--upload-file|-F)|wget.*--post|nc\s|ncat\s|socat\s|http\s+(POST|PUT|PATCH)|aria2c\s|openssl\s+s_client"; then
  if echo "$NORM_CMD" | grep -qiE "$SENSITIVE_FILES"; then
    jq -nc --arg action "$HARD_DENY" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: network transfer of sensitive file type (hard deny)"}}'
    exit 0
  fi
fi

# 2. Piping secrets to network (including command substitution: curl -d "$(cat .env)")
if echo "$NORM_CMD" | grep -qE "(cat|less|head|tail|base64|xxd).*${SENSITIVE_FILES}.*\|.*${NET_TOOLS}" || \
   echo "$NORM_CMD" | grep -qE "${NET_TOOLS}.*\\$\(.*${SENSITIVE_FILES}"; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: piping sensitive file to network command (hard deny)"}}'
  exit 0
fi

# 3. Direct file transfer tools with sensitive files
if echo "$NORM_CMD" | grep -qE "(scp|rsync|sftp)\s" && echo "$NORM_CMD" | grep -qiE "$SENSITIVE_FILES"; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: file transfer of sensitive file type (hard deny)"}}'
  exit 0
fi

# Soft rules below — bypass/unrestricted can downgrade these
agentops_is_bypass "$INPUT" && agentops_bypass_advisory "exfiltration-check"
ACTION=$(agentops_enforcement_action)

# 4. Base64 encoding + network (obfuscation attempt)
if echo "$NORM_CMD" | grep -qE "base64.*\|.*${NET_TOOLS}" || echo "$NORM_CMD" | grep -qE "${NET_TOOLS}.*base64"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: base64 encoding with network transfer detected"}}'
  exit 0
fi

# 5. DNS exfiltration via command substitution (including backticks)
if echo "$NORM_CMD" | grep -qE "(dig|nslookup|host)\s.*(\\$\(|\`)" ; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: possible DNS exfiltration via command substitution"}}'
  exit 0
fi

# 6. Scripting language network calls with sensitive file references
if echo "$NORM_CMD" | grep -qE "(python3?|ruby|node|perl)\s" && echo "$NORM_CMD" | grep -qiE "(requests\.(post|put|patch)|urllib|http\.request|Net::HTTP|fetch|open\()" && echo "$NORM_CMD" | grep -qiE "$SENSITIVE_FILES"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: scripting language network call with sensitive file reference"}}'
  exit 0
fi

# 7. Script-write-then-execute pattern (write a script and immediately run it)
if echo "$NORM_CMD" | grep -qE "(echo|cat|printf|tee).*>.*\.(sh|py|rb|pl|js)\s*[;&|]" && \
   echo "$NORM_CMD" | grep -qE "(bash|sh|python3?|ruby|perl|node)\s"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"ExfiltrationDetector: script-write-then-execute pattern detected — review for exfiltration"}}'
  exit 0
fi
