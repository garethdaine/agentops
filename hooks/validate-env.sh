#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'env_validation_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -z "$COMMAND" ] && exit 0

# Only check commands that set env vars
echo "$COMMAND" | grep -qE "(export\s+|^[A-Z_]+=)" || exit 0

ACTION=$(agentops_enforcement_action)
VARS=$(echo "$COMMAND" | grep -oE '\b[A-Z][A-Z0-9_]*=' | sed 's/=$//' 2>/dev/null) || exit 0

for VAR in $VARS; do
  # Forbidden keys
  if echo "$VAR" | grep -qE "^(PATH|HOME|SHELL|USER|LD_PRELOAD|LD_LIBRARY_PATH|DYLD_)"; then
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"EnvPolicy: forbidden env var $VAR\"}}"
    exit 0
  fi

  # DB credentials
  if echo "$VAR" | grep -qE "^(DB_|TEST_DB_|REDIS_|MYSQL_|POSTGRES_)"; then
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"EnvPolicy: database credential var $VAR\"}}"
    exit 0
  fi

  # Secret patterns
  if echo "$VAR" | grep -qiE "(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|CREDENTIAL|API_KEY|AUTH)"; then
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"EnvPolicy: var matches secret pattern ($VAR)\"}}"
    exit 0
  fi
done
