#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'path_validation_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || agentops_fail_closed

# Extract path based on tool
case "$TOOL" in
  Read|Write|Edit) FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) ;;
  Glob|Grep) FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null) ;;
  *) exit 0 ;;
esac

[ -z "$FILE_PATH" ] && exit 0

# --- Hard-deny rules (always enforce, even in bypass mode) ---

# 1. Must be absolute
if [[ "$FILE_PATH" != /* ]]; then
  jq -nc --arg fp "$FILE_PATH" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("PathPolicy: path must be absolute (got: " + $fp + ")")}}'
  exit 0
fi

# 2. Path traversal
if echo "$FILE_PATH" | grep -qE '\.\.(/|$)'; then
  jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"PathPolicy: path traversal (..) blocked"}}'
  exit 0
fi

# 3. Length limit (1024 chars)
if [ ${#FILE_PATH} -gt 1024 ]; then
  jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"PathPolicy: path exceeds 1024 character limit"}}'
  exit 0
fi

# Canonicalize for symlink resolution (resolve existing paths for all tools)
CANONICAL="$FILE_PATH"
PARENT_DIR=$(dirname "$FILE_PATH")
if [ -d "$PARENT_DIR" ]; then
  RESOLVED=$(realpath -m "$FILE_PATH" 2>/dev/null) || RESOLVED="$FILE_PATH"
  CANONICAL="$RESOLVED"
fi

# 4. Protect plugin state files from agent writes (hard deny)
#    Exception: AGENTOPS_WRITABLE_STATE paths (e.g. flags.json) are whitelisted
if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ]; then
  if echo "$CANONICAL" | grep -qE "$AGENTOPS_PROTECTED_PATHS"; then
    if ! echo "$CANONICAL" | grep -qE "$AGENTOPS_WRITABLE_STATE"; then
      jq -nc --arg fp "$CANONICAL" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("PathPolicy: protected AgentOps state file (" + $fp + ")")}}'
      exit 0
    fi
  fi
fi

# --- Soft rules (bypass/unrestricted can downgrade) ---
agentops_is_bypass "$INPUT" && agentops_bypass_advisory "validate-path"
ACTION=$(agentops_enforcement_action)

# 5. System directory confinement (check both raw and canonical)
for CHECK_PATH in "$FILE_PATH" "$CANONICAL"; do
  if echo "$CHECK_PATH" | grep -qE "^/(etc|proc|sys|dev|boot|root|sbin)(/|$)"; then
    jq -nc --arg fp "$CHECK_PATH" --arg action "$ACTION" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:("PathPolicy: access to system directory blocked (" + $fp + ")")}}'
    exit 0
  fi
done

# 6. Sensitive dotfiles
if echo "$CANONICAL" | grep -qE "/\.(ssh|gnupg|aws|docker/config\.json|kube/config)"; then
  jq -nc --arg fp "$CANONICAL" --arg action "$ACTION" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:("PathPolicy: sensitive dotfile/directory access (" + $fp + ")")}}'
  exit 0
fi
