#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

MODE=${AGENTOPS_MODE:-standard}

INPUT=$(cat) || exit 0

# Unrestricted mode: skip permission gates but advise
if [ "$MODE" = "unrestricted" ]; then
  jq -nc --arg msg "AgentOps advisory: running in UNRESTRICTED mode. All permission gates are bypassed." '{systemMessage: $msg}'
  exit 0
fi

# Respect --dangerously-skip-permissions — advise but don't block
agentops_is_bypass "$INPUT" && agentops_bypass_advisory "runtime-mode"

# Inject mode context at session start
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null) || exit 0
if [ "$EVENT" = "SessionStart" ]; then
  jq -nc --arg mode "$MODE" \
    '{systemMessage: ("AgentOps runtime mode: " + $mode + ". Tool access is restricted per mode policy.")}'
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
      jq -nc --arg tool "$TOOL" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("Blocked in safe mode. Switch to standard or full mode to use " + $tool + ".")}}'
      exit 0
    fi
    ;;
  standard)
    if echo "$TOOL" | grep -qE "$EXTERNAL_TOOLS"; then
      jq -nc --arg tool "$TOOL" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:("External tool " + $tool + " requires approval in standard mode.")}}'
      exit 0
    fi
    ;;
  full)
    if echo "$TOOL" | grep -qE "$ELEVATED_TOOLS"; then
      jq -nc --arg tool "$TOOL" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:("Elevated operation via " + $tool + ". Confirm in full mode.")}}'
      exit 0
    fi
    ;;
esac
