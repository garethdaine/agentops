#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_lesson_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
ERROR=$(echo "$INPUT" | jq -r '.tool_result // .error // empty' 2>/dev/null | head -c 300) || ERROR=""
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
STATE_DIR="${CWD}/.agentops"

mkdir -p "$STATE_DIR" 2>/dev/null

# Track consecutive failures to avoid nagging on single transient errors
FAIL_COUNT_FILE="${STATE_DIR}/consecutive-failures"
if [ -f "$FAIL_COUNT_FILE" ]; then
  FAIL_COUNT=$(cat "$FAIL_COUNT_FILE" 2>/dev/null || echo 0)
else
  FAIL_COUNT=0
fi
FAIL_COUNT=$((FAIL_COUNT + 1))
echo "$FAIL_COUNT" > "$FAIL_COUNT_FILE" 2>/dev/null

# Only inject lesson instruction after 2+ consecutive failures (avoids noise from single transient errors)
if [ "$FAIL_COUNT" -ge 2 ]; then
  # Reset counter so we don't keep nagging
  echo "0" > "$FAIL_COUNT_FILE" 2>/dev/null
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUseFailure\",\"additionalContext\":\"AgentOps auto-lesson: ${FAIL_COUNT} consecutive tool failures detected (tool: ${TOOL}). Capture a lesson learned NOW. Append to tasks/lessons.md using this format:\\n\\n## Lesson: [Short title]\\n**Date:** [Today]\\n**Trigger:** [What failed — tool: ${TOOL}]\\n**Pattern:** [The underlying pattern that caused the failures]\\n**Rule:** [Concrete rule to prevent recurrence]\\n**Applies to:** [Contexts where this rule matters]\\n\\nCreate tasks/lessons.md with a '# Lessons Learned' header if it doesn't exist.\"}}"
fi
