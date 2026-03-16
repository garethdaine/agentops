#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_evolve_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."

FAILURES_FILE="${CWD}/.agentops/failures.jsonl"
EVOLVE_RAN="${CWD}/.agentops/evolve-ran"
FEEDBACK_FILE="${CWD}/.agentops/feedback-history.jsonl"

# No failures to process
[ ! -f "$FAILURES_FILE" ] && exit 0
[ ! -s "$FAILURES_FILE" ] && exit 0

# Already ran evolve this session
[ -f "$EVOLVE_RAN" ] && exit 0

# Count only NEW failures (not already addressed in feedback-history)
if [ -f "$FEEDBACK_FILE" ] && [ -s "$FEEDBACK_FILE" ]; then
  # Extract timestamps of failures already addressed
  ADDRESSED=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' "$FEEDBACK_FILE" 2>/dev/null | sort -u)
  # Count failures whose timestamps are NOT in the addressed list
  UNPROCESSED=0
  while IFS= read -r line; do
    TS=$(echo "$line" | jq -r '.ts // empty' 2>/dev/null)
    [ -z "$TS" ] && continue
    if ! echo "$ADDRESSED" | grep -qF "$TS"; then
      UNPROCESSED=$((UNPROCESSED + 1))
    fi
  done < "$FAILURES_FILE"
  FAILURE_COUNT=$UNPROCESSED
else
  FAILURE_COUNT=$(wc -l < "$FAILURES_FILE" 2>/dev/null | tr -d ' ')
fi

[ "$FAILURE_COUNT" -lt 2 ] && exit 0

echo "{\"decision\":\"block\",\"reason\":\"AgentOps auto-evolve: ${FAILURE_COUNT} unprocessed failures in .agentops/failures.jsonl. Run the EvoSkill loop before finishing: 1) Read .agentops/failures.jsonl for failure clusters, 2) Read .agentops/feedback-history.jsonl for prior proposals, 3) Spawn the proposer agent to diagnose root causes and propose skills, 4) Spawn the skill-builder agent to materialize accepted proposals into skills/{name}/ directories, 5) Record results in .agentops/feedback-history.jsonl. After evolve completes, touch .agentops/evolve-ran to mark it done.\"}"
