#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_plan_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only gate Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
TRACKER="${CWD}/.agentops/modified-files.txt"

# No tracker yet — not enough modifications to require a plan
[ ! -f "$TRACKER" ] && exit 0

FILE_COUNT=$(sort -u "$TRACKER" 2>/dev/null | wc -l | tr -d ' ')
[ "$FILE_COUNT" -lt 3 ] && exit 0

TODO="${CWD}/tasks/todo.md"
REASON=""

# Check if todo.md exists AND is relevant to this session
if [ -f "$TODO" ] && [ -s "$TODO" ]; then
  SESSION_MARKER="${CWD}/.agentops/session-start"
  if [ -f "$SESSION_MARKER" ]; then
    # If todo.md is older than the current session, it's stale — treat as no plan
    if [ "$TODO" -ot "$SESSION_MARKER" ]; then
      REASON="AgentOps auto-plan: ${FILE_COUNT} files modified but tasks/todo.md is stale (from a previous session). Generate a fresh STAR-based implementation plan and write it to tasks/todo.md with checkable items BEFORE making further changes."
    fi
  fi
  # todo.md exists and is current — allow
  [ -z "$REASON" ] && exit 0
else
  REASON="AgentOps auto-plan: ${FILE_COUNT} files modified but no plan exists. Generate a STAR-based implementation plan and write it to tasks/todo.md with checkable items BEFORE making further changes."
fi

ACTION=$(agentops_enforcement_action)
echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"${ACTION}\",\"permissionDecisionReason\":\"${REASON} Include: Situation (current state), Task (success criteria), Action (concrete steps with file paths), Result (how to verify). Minimum 8 implementation sections with [ ] checkboxes.\"}}"
