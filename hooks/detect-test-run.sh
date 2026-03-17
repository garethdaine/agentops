#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -z "$COMMAND" ] && exit 0

# Detect common test runner invocations
if echo "$COMMAND" | grep -qE "(npm\s+test|npx\s+(jest|vitest|mocha)|yarn\s+test|pnpm\s+test|pytest|python\s+-m\s+(pytest|unittest)|go\s+test|cargo\s+test|bundle\s+exec\s+rspec|rspec\b|phpunit|dotnet\s+test|mvn\s+test|gradle\s+test|make\s+test|bats\s|bash\s+.*test|\.\/test)"; then
  CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
  STATE_DIR="${CWD}/.agentops"
  mkdir -p "$STATE_DIR" 2>/dev/null
  date -u +%FT%TZ > "${STATE_DIR}/tests-ran" 2>/dev/null
fi
