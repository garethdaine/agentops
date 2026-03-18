#!/bin/bash
# Enforcement actions, bypass detection, and fail-closed behavior.
# Sourced by: feature-flags.sh (facade)
# Depends on: flag-utils.sh (agentops_flag, agentops_mode)

# Check if Claude Code is running with --dangerously-skip-permissions.
# Pass the hook's JSON input as $1; returns 0 (true) if bypass is active.
agentops_is_bypass() {
  local INPUT="$1"
  local perm_mode
  perm_mode=$(echo "$INPUT" | jq -r '.permission_mode // "default"' 2>/dev/null)
  [ "$perm_mode" = "bypassPermissions" ]
}

# Emit advisory system message and exit — used by security hooks in bypass mode.
agentops_bypass_advisory() {
  local HOOK_NAME="$1"
  local DETAIL="${2:-}"
  local MSG="AgentOps advisory (bypass mode): ${HOOK_NAME} enforcement skipped."
  [ -n "$DETAIL" ] && MSG="${MSG} ${DETAIL}"
  jq -nc --arg msg "$MSG" '{systemMessage: $msg}'
  exit 0
}

# Returns "deny" in blocking mode, "ask" in advisory mode (for configurable/soft gates).
# Note: AGENTOPS_MODE=unrestricted returns "allow" for soft gates only.
agentops_enforcement_action() {
  if [ "${AGENTOPS_MODE:-}" = "unrestricted" ]; then
    echo "allow"
    return
  fi
  local MODE=$(agentops_mode)
  if [ "$MODE" = "blocking" ]; then
    echo "deny"
  else
    echo "ask"
  fi
}

# Always returns "deny" — for hard-deny rules that MUST enforce regardless of
# mode, bypass, or unrestricted.
agentops_hard_deny() {
  echo "deny"
}

# Emit deny and exit — for security hooks that fail closed on malformed input.
agentops_fail_closed() {
  jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"AgentOps: failed to parse hook input (fail closed)"}}'
  exit 0
}

# Returns "block" in blocking mode, "approve" in advisory mode (for Stop hooks).
agentops_stop_action() {
  local MODE=$(agentops_mode)
  if [ "$MODE" = "blocking" ]; then
    echo "block"
  else
    echo "approve"
  fi
}
