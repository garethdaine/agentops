#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only track Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

CWD_PG=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD_PG="."
TRACKER="${CWD_PG}/.agentops/modified-files.txt"
[ ! -f "$TRACKER" ] && exit 0

# File tracking is handled by auto-plan.sh (PreToolUse) — just read the count
COUNT=$(sort -u "$TRACKER" 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -eq 5 ]; then
  jq -nc '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"AgentOps: 5+ files modified. If you have not already, write a plan to tasks/todo.md with checkable items. Run tests before finishing."}}'
fi
