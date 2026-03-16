#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only track Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -z "$FILE" ] && exit 0

TRACKER="${CLAUDE_PROJECT_DIR:-.}/.agentops/modified-files.txt"
mkdir -p "$(dirname "$TRACKER")" 2>/dev/null
echo "$FILE" >> "$TRACKER" 2>/dev/null

# After 5+ modifications, inject planning reminder
COUNT=$(sort -u "$TRACKER" 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -eq 5 ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"AgentOps: 5+ files modified. If you haven't already, write a plan to tasks/todo.md with checkable items. Run tests before finishing.\"}}"
fi
