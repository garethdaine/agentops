#!/bin/bash
set -uo pipefail

MODE=${AGENTOPS_MODE:-standard}

# Unrestricted mode: skip all permission gates (use with --dangerously-ignore-permissions)
[ "$MODE" = "unrestricted" ] && exit 0

INPUT=$(cat) || exit 0

# Inject mode context at session start
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null) || exit 0
if [ "$EVENT" = "SessionStart" ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"AgentOps runtime mode: $MODE. Tool access is restricted per mode policy.\"}}"
  exit 0
fi

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ -z "$TOOL" ] && exit 0

WRITE_TOOLS="^(Write|Edit|NotebookEdit)$"
EXTERNAL_TOOLS="^(WebFetch|WebSearch|mcp__.*)$"
ELEVATED_TOOLS="^(Bash)$"

case "$MODE" in
  safe)
    if echo "$TOOL" | grep -qE "$WRITE_TOOLS|$EXTERNAL_TOOLS|$ELEVATED_TOOLS"; then
      echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Blocked in safe mode. Switch to standard or full mode to use $TOOL.\"}}"
      exit 0
    fi
    ;;
  standard)
    if echo "$TOOL" | grep -qE "$EXTERNAL_TOOLS"; then
      echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"External tool $TOOL requires approval in standard mode.\"}}"
      exit 0
    fi
    ;;
  full)
    if echo "$TOOL" | grep -qE "$ELEVATED_TOOLS"; then
      echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"Elevated operation via $TOOL. Confirm in full mode.\"}}"
      exit 0
    fi
    ;;
esac
