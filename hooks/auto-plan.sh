#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_plan_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
agentops_is_bypass "$INPUT" && exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only gate Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
TRACKER="${CWD}/.agentops/modified-files.txt"

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$FILE" ] && exit 0

TODO="${CWD}/tasks/todo.md"
REASON=""

# Check if todo.md exists AND is relevant to this session
if [ -f "$TODO" ] && [ -s "$TODO" ]; then
  SESSION_MARKER="${CWD}/.agentops/session-start"
  if [ -f "$SESSION_MARKER" ]; then
    # If todo.md is older than the current session, it's stale — treat as no plan
    if [ "$TODO" -ot "$SESSION_MARKER" ]; then
      REASON="stale"
    fi
  fi
  # todo.md exists and is current — track and allow
  if [ -z "$REASON" ]; then
    # Track file only when gate passes (avoids count inflation from blocked attempts)
    mkdir -p "$(dirname "$TRACKER")" 2>/dev/null
    echo "$FILE" >> "$TRACKER" 2>/dev/null
    exit 0
  fi
fi

# Count files already tracked (don't add this file yet — only track after gate passes)
FILE_COUNT=0
if [ -f "$TRACKER" ]; then
  FILE_COUNT=$(sort -u "$TRACKER" 2>/dev/null | wc -l | tr -d ' ')
fi
# Include this file in count check without persisting to tracker
FILE_COUNT=$((FILE_COUNT + 1))
[ "${FILE_COUNT:-0}" -lt 3 ] && exit 0

if [ "$REASON" = "stale" ]; then
  REASON="AgentOps auto-plan: ${FILE_COUNT} files modified but tasks/todo.md is stale (from a previous session). Update tasks/todo.md with a plan covering the current changes BEFORE continuing."
else
  REASON="AgentOps auto-plan: ${FILE_COUNT} files modified but no plan exists. Write a plan to tasks/todo.md with checkable items BEFORE making further changes."
fi

ACTION=$(agentops_enforcement_action)
jq -nc --arg action "$ACTION" --arg reason "$REASON" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$action,permissionDecisionReason:$reason}}'
