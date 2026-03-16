#!/bin/bash
set -uo pipefail

BUDGET=${AGENTOPS_BUDGET_USD:-5.00}
WARN_PCT=${AGENTOPS_BUDGET_WARN_PCT:-80}
BUDGET_FILE="${CLAUDE_PROJECT_DIR:-.}/.agentops/budget.json"
mkdir -p "$(dirname "$BUDGET_FILE")" 2>/dev/null

if [ ! -f "$BUDGET_FILE" ]; then
  echo "{\"budget_usd\":$BUDGET,\"spent\":0,\"warn_pct\":$WARN_PCT,\"started\":\"$(date -u +%FT%TZ)\"}" > "$BUDGET_FILE" 2>/dev/null
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"AgentOps budget: \$$BUDGET USD. Warning at ${WARN_PCT}%.\"}}"
else
  SPENT=$(jq -r '.spent' "$BUDGET_FILE" 2>/dev/null) || SPENT=0
  THRESHOLD=$(echo "$BUDGET * $WARN_PCT / 100" | bc -l 2>/dev/null) || THRESHOLD=0
  if [ "$(echo "$SPENT >= $THRESHOLD" | bc -l 2>/dev/null)" = "1" ] 2>/dev/null; then
    PCT=$(echo "$SPENT / $BUDGET * 100" | bc -l 2>/dev/null) || PCT="unknown"
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"AgentOps BUDGET WARNING: ${PCT}% used (\$${SPENT} / \$${BUDGET})\"}}"
  fi
fi
