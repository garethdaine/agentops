#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_verify_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."

# If no todo.md exists, nothing to verify
[ ! -f "${CWD}/tasks/todo.md" ] && exit 0

UNCHECKED=$(grep -c '^\s*- \[ \]' "${CWD}/tasks/todo.md" 2>/dev/null | tr -d '[:space:]')
UNCHECKED=${UNCHECKED:-0}
TOTAL=$(grep -c '^\s*- \[' "${CWD}/tasks/todo.md" 2>/dev/null | tr -d '[:space:]')
TOTAL=${TOTAL:-0}
CHECKED=$((TOTAL - UNCHECKED))

# All items complete — allow stop
[ "$UNCHECKED" -eq 0 ] && exit 0

# Check if tests were run
TESTS_RAN="${CWD}/.agentops/tests-ran"
TEST_STATUS="NOT RUN"
[ -f "$TESTS_RAN" ] && TEST_STATUS="ran at $(cat "$TESTS_RAN" 2>/dev/null)"

echo "{\"decision\":\"block\",\"reason\":\"AgentOps auto-verify: Completion ${CHECKED}/${TOTAL} items (${UNCHECKED} unchecked). Tests: ${TEST_STATUS}. Before finishing: 1) Review tasks/todo.md and complete or check off remaining items, 2) Run the test suite if not yet run, 3) Verify the STAR Result criteria are met. Only stop when all items are checked and tests pass.\"}"
