#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'star_preamble_enabled')" = "false" ] && exit 0

CONTEXT="AgentOps STAR Protocol: Before beginning ANY non-trivial task (3+ steps or architectural decisions), you MUST articulate: SITUATION (current state, what exists/doesn't), TASK (specific success criteria), ACTION (concrete steps with file-level specificity), RESULT (how completion will be verified — tests, behavior, demonstration). IMPORTANT: Output the full STAR analysis as text in the chat so the user can see it, THEN write it to tasks/todo.md with checkable items. Do NOT silently write to the file — the user must see the plan in the conversation. This is MANDATORY — do not skip this step. Use the /agentops:star or /agentops:plan skill to generate the analysis, or write it directly. Do NOT begin implementation until the STAR analysis is written to tasks/todo.md."

echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"$CONTEXT\"}}"
