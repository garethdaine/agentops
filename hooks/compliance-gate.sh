#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
ISSUES=""

# Plan gate
if [ "$(agentops_flag 'plan_gate_enabled')" = "true" ]; then
  TRACKER="${CWD}/.agentops/modified-files.txt"
  if [ -f "$TRACKER" ]; then
    FILE_COUNT=$(sort -u "$TRACKER" | wc -l | tr -d ' ')
    if [ "$FILE_COUNT" -ge 3 ]; then
      if [ ! -f "${CWD}/tasks/todo.md" ] || [ ! -s "${CWD}/tasks/todo.md" ]; then
        ISSUES="${ISSUES}Plan gate: ${FILE_COUNT} files modified but no plan in tasks/todo.md. "
      fi
    fi
  fi
fi

# Verification gate
if [ "$(agentops_flag 'verification_gate_enabled')" = "true" ]; then
  if [ -f "${CWD}/tasks/todo.md" ]; then
    UNCHECKED=$(grep -c '^\s*- \[ \]' "${CWD}/tasks/todo.md" 2>/dev/null | tr -d '[:space:]')
    UNCHECKED=${UNCHECKED:-0}
    if [ "$UNCHECKED" -gt 0 ]; then
      ISSUES="${ISSUES}Verification gate: ${UNCHECKED} unchecked items in tasks/todo.md. "
    fi
  fi
fi

# Test gate
if [ "$(agentops_flag 'test_gate_enabled')" = "true" ]; then
  TRACKER="${CWD}/.agentops/modified-files.txt"
  TEST_RAN="${CWD}/.agentops/tests-ran"
  if [ -f "$TRACKER" ] && [ ! -f "$TEST_RAN" ]; then
    FILE_COUNT=$(sort -u "$TRACKER" | wc -l | tr -d ' ')
    if [ "$FILE_COUNT" -ge 3 ]; then
      ISSUES="${ISSUES}Test gate: ${FILE_COUNT} files modified but no tests were run. "
    fi
  fi
fi

if [ -n "$ISSUES" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"AgentOps compliance: ${ISSUES}Address these before finishing.\"}"
fi
