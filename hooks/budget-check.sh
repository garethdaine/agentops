#!/bin/bash
set -uo pipefail

BUDGET=${AGENTOPS_BUDGET_USD:-5.00}
WARN_PCT=${AGENTOPS_BUDGET_WARN_PCT:-80}
BUDGET_FILE="${CLAUDE_PROJECT_DIR:-.}/.agentops/budget.json"
mkdir -p "$(dirname "$BUDGET_FILE")" 2>/dev/null

if [ ! -f "$BUDGET_FILE" ]; then
  jq -nc --arg budget "$BUDGET" --arg pct "$WARN_PCT" --arg started "$(date -u +%FT%TZ)" \
    '{budget_usd:($budget|tonumber), spent:0, warn_pct:($pct|tonumber), started:$started}' > "$BUDGET_FILE" 2>/dev/null
  jq -nc --arg budget "$BUDGET" --arg pct "$WARN_PCT" \
    '{systemMessage: ("AgentOps budget: $" + $budget + " USD. Warning at " + $pct + "%.")}'
else
  SPENT=$(jq -r '.spent' "$BUDGET_FILE" 2>/dev/null) || SPENT=0
  OVER_THRESHOLD=$(awk -v spent="$SPENT" -v budget="$BUDGET" -v pct="$WARN_PCT" \
    'BEGIN { threshold = budget * pct / 100; print (spent >= threshold) ? "1" : "0" }' 2>/dev/null) || OVER_THRESHOLD=0
  if [ "$OVER_THRESHOLD" = "1" ]; then
    USAGE_PCT=$(awk -v spent="$SPENT" -v budget="$BUDGET" \
      'BEGIN { printf "%.1f", (spent / budget * 100) }' 2>/dev/null) || USAGE_PCT="unknown"
    jq -nc --arg pct "$USAGE_PCT" --arg spent "$SPENT" --arg budget "$BUDGET" \
      '{systemMessage: ("AgentOps BUDGET WARNING: " + $pct + "% used ($" + $spent + " / $" + $budget + ")")}'
  fi
fi
