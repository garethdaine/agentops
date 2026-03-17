#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_lesson_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
ERROR=$(echo "$INPUT" | jq -r '.tool_result // .error // empty' 2>/dev/null | head -c 300) || ERROR=""

echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUseFailure\",\"additionalContext\":\"AgentOps: Tool failure (${TOOL}). Capture a lesson NOW using /agentops:lesson — describe what failed, the pattern behind it, and a rule to prevent recurrence. Error: ${ERROR}\"}}"
