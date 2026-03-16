#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."

# Track if tests were run
if echo "$COMMAND" | grep -qE "(artisan test|phpunit|pest|vitest|jest|npm test|npx test|phpstan|pint|pytest|go test|cargo test|rspec|mocha)"; then
  mkdir -p "${CWD}/.agentops" 2>/dev/null
  date -u +%FT%TZ > "${CWD}/.agentops/tests-ran" 2>/dev/null
fi
