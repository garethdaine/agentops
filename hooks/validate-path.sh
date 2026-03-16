#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'path_validation_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
ACTION=$(agentops_enforcement_action)

# Extract path based on tool
case "$TOOL" in
  Read|Write|Edit) FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) ;;
  Glob|Grep) FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null) ;;
  *) exit 0 ;;
esac

[ -z "$FILE_PATH" ] && exit 0

# 1. Must be absolute
if [[ "$FILE_PATH" != /* ]]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"PathPolicy: path must be absolute (got: $FILE_PATH)\"}}"
  exit 0
fi

# 2. Path traversal
if echo "$FILE_PATH" | grep -qE '\.\.(/|$)'; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"PathPolicy: path traversal (..) blocked\"}}"
  exit 0
fi

# 3. Length limit (1024 chars)
if [ ${#FILE_PATH} -gt 1024 ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"PathPolicy: path exceeds 1024 character limit\"}}"
  exit 0
fi

# 4. System directory confinement
if echo "$FILE_PATH" | grep -qE "^/(etc|proc|sys|dev|boot|root|sbin)(/|$)"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"PathPolicy: access to system directory blocked ($FILE_PATH)\"}}"
  exit 0
fi

# 5. Sensitive dotfiles
if echo "$FILE_PATH" | grep -qE "/\.(ssh|gnupg|aws|docker/config\.json|kube/config)"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"PathPolicy: sensitive dotfile/directory access ($FILE_PATH)\"}}"
  exit 0
fi
