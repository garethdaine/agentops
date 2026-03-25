#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'command_validation_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || agentops_fail_closed
[ -z "$COMMAND" ] && exit 0

# Hard-deny rules execute BEFORE bypass check — they always enforce.
HARD_DENY=$(agentops_hard_deny)

# 1. Destructive system commands (always deny, even in bypass/unrestricted)
if echo "$COMMAND" | grep -qE "(rm\s+-rf\s+/([^t]|t[^m]|tm[^p]|tmp[^/])|mkfs\s|dd\s+if=|shutdown|reboot|init\s+[06])"; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Destructive system command blocked by AgentOps CommandPolicy (hard deny)"}}'
  exit 0
fi

# 2. Indirect execution of destructive commands (always deny)
if echo "$COMMAND" | grep -qE "(eval\s|bash\s+-c|sh\s+-c|exec\s)" && echo "$COMMAND" | grep -qiE "(rm\s+-rf|chmod\s+777|curl.*\|.*sh|wget.*\|.*bash|mkfs|dd\s+if=)"; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Indirect execution of dangerous command blocked by AgentOps CommandPolicy (hard deny)"}}'
  exit 0
fi

# 3. Fork bomb / resource exhaustion (always deny)
if echo "$COMMAND" | grep -qE ':\(\)\{|:\(\)\s*\{|\(\)\s*\{.*\|.*:\s*;'; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Fork bomb pattern detected (hard deny)"}}'
  exit 0
fi

# 4. Tampering with .agentops/ state files via Bash (always deny)
# Covers: writes, deletions, permission changes, symlink replacement
# Exception: AGENTOPS_WRITABLE_STATE paths (e.g. flags.json) are whitelisted
if echo "$COMMAND" | grep -qE '>\s*[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE '(tee|cp|mv|install)\s+[^ ]*\s+[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE '(tee|cp|mv|install)\s+[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE 'sed\s+-i[^ ]*\s+[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE 'dd\s+of=[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE '(rm|unlink|shred|truncate)\s+[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE '(chmod|chown)\s+[^ ]*\s+[^ ]*\.agentops/' \
   || echo "$COMMAND" | grep -qE '(ln)\s+[^ ]*\s+[^ ]*\.agentops/'; then
  if ! echo "$COMMAND" | grep -qE "$AGENTOPS_WRITABLE_STATE"; then
    jq -nc --arg action "$HARD_DENY" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Tampering with .agentops/ state files via Bash is blocked by AgentOps CommandPolicy (hard deny)"}}'
    exit 0
  fi
fi

# 4b. Tampering with hooks/ directory via Bash write operations (always deny — prevent hook tampering)
if echo "$COMMAND" | grep -qE '>\s*[^ ]*hooks/' \
   || echo "$COMMAND" | grep -qE '(tee|cp|mv|install)\s+[^ ]*\s+[^ ]*hooks/' \
   || echo "$COMMAND" | grep -qE 'sed\s+-i[^ ]*\s+[^ ]*hooks/' \
   || echo "$COMMAND" | grep -qE '(rm|unlink|shred|truncate)\s+[^ ]*hooks/' \
   || echo "$COMMAND" | grep -qE '(chmod|chown)\s+[^ ]*\s+[^ ]*hooks/' \
   || echo "$COMMAND" | grep -qE '(ln)\s+[^ ]*\s+[^ ]*hooks/'; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Tampering with hooks/ directory via Bash is blocked by AgentOps CommandPolicy (hard deny)"}}'
  exit 0
fi

# 4c. Scripting language file I/O to protected paths (always deny — prevent bypass via python/ruby/node)
if echo "$COMMAND" | grep -qE "(python3?|ruby|node|perl)\s+(-c|(-e\s))" && \
   echo "$COMMAND" | grep -qE '(\.agentops/|hooks/)'; then
  jq -nc --arg action "$HARD_DENY" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Scripting language referencing protected paths blocked by AgentOps CommandPolicy (hard deny)"}}'
  exit 0
fi

# Soft rules below — bypass/unrestricted can downgrade these
agentops_is_bypass "$INPUT" && agentops_bypass_advisory "validate-command"
ACTION=$(agentops_enforcement_action)

# 5. Shell injection + dangerous pattern combo
if echo "$COMMAND" | grep -qE '\|\||&&' && echo "$COMMAND" | grep -qiE "(rm\s+-rf|chmod\s+777|curl.*\|.*sh|wget.*\|.*bash)"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Shell injection risk: chained operators with dangerous command"}}'
  exit 0
fi

# 6. Pipe-to-shell without chaining operators
if echo "$COMMAND" | grep -qE "(curl|wget)\s.*\|\s*(bash|sh|zsh|dash)\b"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Pipe-to-shell pattern detected"}}'
  exit 0
fi

# 7. Credential file access
if echo "$COMMAND" | grep -qiE "(/etc/shadow|/etc/passwd|\.ssh/id_|\.env\b|\.pem\b)" && echo "$COMMAND" | grep -qE "(cat|less|head|more|tail|grep|jq|python|ruby|node|base64|xxd)\s"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Credential/sensitive file access detected"}}'
  exit 0
fi

# 8. Bash accessing system directories (HS-1 — path validation for Bash tool)
if echo "$COMMAND" | grep -qE "^/(etc|proc|sys|dev|boot|root|sbin)(/|\s)" || echo "$COMMAND" | grep -qE "\s/(etc|proc|sys|dev|boot|root|sbin)(/|\s)"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Bash command references system directory — review before proceeding"}}'
  exit 0
fi

# 9. Bash accessing sensitive dotfiles (HS-1)
if echo "$COMMAND" | grep -qE "/\.(ssh|gnupg|aws|docker/config\.json|kube/config|npmrc|pypirc|netrc|git-credentials)"; then
  jq -nc --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:"Bash command references sensitive dotfile/directory"}}'
  exit 0
fi
