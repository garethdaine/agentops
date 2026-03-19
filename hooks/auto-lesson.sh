#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_lesson_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
ERROR=$(echo "$INPUT" | jq -r '.tool_result // .error // empty | tostring | .[:300]' 2>/dev/null) || ERROR=""

# Skip expected/benign failures that don't warrant a lesson
# - Read/Glob on non-existent files is a normal existence check pattern
if [ "$TOOL" = "Read" ] || [ "$TOOL" = "Glob" ]; then
  echo "$ERROR" | grep -qi "does not exist\|no such file\|not found\|no matches" && exit 0
fi

# Skip when the failing command is itself a lesson-capture operation
# to prevent infinite loop: Bash fails → auto-lesson → lesson Bash fails → auto-lesson …
if [ "$TOOL" = "Bash" ]; then
  TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || TOOL_INPUT=""
  echo "$TOOL_INPUT" | grep -qi "lessons\.\|/agentops:lesson\|lesson.*learned" && exit 0
fi

jq -nc --arg tool "$TOOL" --arg error "$ERROR" \
  '{systemMessage: ("AgentOps: Tool failure (" + $tool + "). Capture a lesson NOW using /agentops:lesson — describe what failed, the pattern behind it, and a rule to prevent recurrence. Error: " + $error)}'
