#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'env_validation_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || agentops_fail_closed
[ -z "$COMMAND" ] && exit 0

# Only check commands that set env vars (case-insensitive to catch export path=, Ld_Preload=, etc.)
echo "$COMMAND" | grep -qiE "(export\s+|^[A-Za-z_]+=)" || exit 0

VARS=$(echo "$COMMAND" | grep -oiE '\b[A-Za-z_][A-Za-z0-9_]*=' | sed 's/=$//' 2>/dev/null) || exit 0

# --- Hard-deny rules (always enforce, even in bypass mode) ---
HARD_DENY=$(agentops_hard_deny)

for VAR in $VARS; do
  # Normalize to uppercase for comparison
  VAR_UPPER=$(echo "$VAR" | tr '[:lower:]' '[:upper:]')

  # Forbidden keys — LD_PRELOAD, PATH, HOME etc. are always dangerous
  if echo "$VAR_UPPER" | grep -qE "^(PATH|HOME|SHELL|USER|LD_PRELOAD|LD_LIBRARY_PATH|DYLD_)"; then
    jq -nc --arg var "$VAR" --arg action "$HARD_DENY" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:("EnvPolicy: forbidden env var " + $var + " (hard deny)")}}'
    exit 0
  fi

  # DB credentials — always deny
  if echo "$VAR_UPPER" | grep -qE "^(DB_|TEST_DB_|REDIS_|MYSQL_|POSTGRES_)"; then
    jq -nc --arg var "$VAR" --arg action "$HARD_DENY" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:("EnvPolicy: database credential var " + $var + " (hard deny)")}}'
    exit 0
  fi
done

# --- Soft rules (bypass can skip these) ---
agentops_is_bypass "$INPUT" && agentops_bypass_advisory "validate-env"
ACTION=$(agentops_enforcement_action)

for VAR in $VARS; do
  VAR_UPPER=$(echo "$VAR" | tr '[:lower:]' '[:upper:]')
  # Secret patterns
  if echo "$VAR_UPPER" | grep -qE "(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|CREDENTIAL|API_KEY|AUTH)"; then
    jq -nc --arg var "$VAR" --arg action "$ACTION" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:("EnvPolicy: var matches secret pattern (" + $var + ")")}}'
    exit 0
  fi
done
