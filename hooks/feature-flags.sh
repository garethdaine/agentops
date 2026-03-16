#!/bin/bash
# Shared library — source this from all hooks
# Usage: source "${SCRIPT_DIR}/feature-flags.sh"

FLAGS_FILE="${CLAUDE_PROJECT_DIR:-.}/.agentops/flags.json"

agentops_flag() {
  local FLAG="$1"
  local DEFAULT="${2:-true}"
  if [ -f "$FLAGS_FILE" ]; then
    jq -r ".$FLAG // \"$DEFAULT\"" "$FLAGS_FILE" 2>/dev/null || echo "$DEFAULT"
  else
    echo "$DEFAULT"
  fi
}

agentops_mode() {
  agentops_flag "enforcement_mode" "advisory"
}

# Returns "deny" in blocking mode, "ask" in advisory mode, or skips in unrestricted (for PreToolUse hooks)
agentops_enforcement_action() {
  # When AGENTOPS_MODE=unrestricted, auto-allow everything
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

# Returns "block" in blocking mode, "approve" in advisory mode (for Stop hooks)
agentops_stop_action() {
  local MODE=$(agentops_mode)
  if [ "$MODE" = "blocking" ]; then
    echo "block"
  else
    echo "block"
  fi
}
