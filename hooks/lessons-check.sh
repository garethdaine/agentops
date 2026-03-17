#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'lessons_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
LESSONS_FILE="${CWD}/tasks/lessons.md"

if [ -f "$LESSONS_FILE" ] && [ -s "$LESSONS_FILE" ]; then
  LESSON_COUNT=$(grep -c "^## Lesson:" "$LESSONS_FILE" 2>/dev/null || echo 0)
  RECENT=$(tail -20 "$LESSONS_FILE" 2>/dev/null || echo "")
  jq -nc --arg count "$LESSON_COUNT" --arg recent "$RECENT" \
    '{systemMessage: ("AgentOps Lessons: " + $count + " lessons loaded from tasks/lessons.md. Most recent:\n" + $recent + "\n\nApply these rules to prevent repeating past mistakes.")}'
fi
