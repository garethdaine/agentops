#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_test_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only trigger on Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -z "$FILE" ] && exit 0

# Only track source code files (not config, docs, plans, etc.)
if ! echo "$FILE" | grep -qE '\.(js|ts|tsx|jsx|py|rb|go|rs|java|php|c|cpp|h|hpp|cs|swift|kt|scala|sh|vue|svelte)$'; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
STATE_DIR="${CWD}/.agentops"
TESTS_RAN="${STATE_DIR}/tests-ran"
TEST_NUDGE="${STATE_DIR}/test-nudge-sent"
CODE_TRACKER="${STATE_DIR}/code-files-since-test.txt"

mkdir -p "$STATE_DIR" 2>/dev/null

# If tests were run after our last nudge, reset tracking
if [ -f "$TESTS_RAN" ] && [ -f "$TEST_NUDGE" ]; then
  if [ "$TESTS_RAN" -nt "$TEST_NUDGE" ]; then
    rm -f "$CODE_TRACKER" "$TEST_NUDGE" 2>/dev/null
  fi
fi

# Track this code file
echo "$FILE" >> "$CODE_TRACKER" 2>/dev/null
CODE_COUNT=$(sort -u "$CODE_TRACKER" 2>/dev/null | wc -l | tr -d ' ')

# After 3+ source files modified since last test, inject instruction (once)
if [ "$CODE_COUNT" -ge 3 ] && [ ! -f "$TEST_NUDGE" ]; then
  date -u +%FT%TZ > "$TEST_NUDGE" 2>/dev/null
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"AgentOps auto-test: ${CODE_COUNT} source code files modified since tests were last run. Run the project's test suite NOW before making further changes. Detect the test framework (jest, pytest, go test, cargo test, phpunit, rspec, etc.) from project config and execute it.\"}}"
fi
