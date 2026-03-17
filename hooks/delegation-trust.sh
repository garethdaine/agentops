#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"' 2>/dev/null) || AGENT_TYPE="unknown"

# Log delegation attempt
LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentops"
mkdir -p "$LOG_DIR" 2>/dev/null
jq -nc --arg ts "$(date -u +%FT%TZ)" --arg agent "$AGENT_TYPE" \
  '{ts:$ts, event:"delegation", agent:$agent}' >> "$LOG_DIR/delegation.jsonl" 2>/dev/null || true

# Inject trust context
jq -nc --arg agent "$AGENT_TYPE" \
  '{systemMessage: ("AgentOps delegation policy: This subagent (" + $agent + ") operates with restricted trust. It should only use tools listed in its agent definition. Do not grant additional tool access.")}'
