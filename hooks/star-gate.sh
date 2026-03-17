#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'star_preamble_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
agentops_is_bypass "$INPUT" && exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
TODO="${CWD}/tasks/todo.md"

# If a current plan exists, STAR is satisfied — allow everything
if [ -f "$TODO" ] && [ -s "$TODO" ]; then
  SESSION_MARKER="${CWD}/.agentops/session-start"
  if [ -f "$SESSION_MARKER" ]; then
    # Stale plan from a previous session doesn't count
    [ "$TODO" -ot "$SESSION_MARKER" ] || exit 0
  else
    exit 0
  fi
fi

# No plan exists — decide what to allow and what to block

# Allow writing the plan itself (bootstrap)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$FILE" in
  */tasks/todo.md|*/tasks/todo.txt) exit 0 ;;
esac

# Allow creating the tasks directory (bootstrap)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
case "$COMMAND" in
  *mkdir*tasks*) exit 0 ;;
esac

# Grace period: allow observation tools for initial investigation
# Track call count and block after the grace window expires
STATE_DIR="${CWD}/.agentops"
COUNTER="${STATE_DIR}/star-obs-count"
GRACE_LIMIT=5

case "$TOOL" in
  Read|Glob|Grep|Agent|ToolSearch)
    # Count this observation call
    COUNT=0
    [ -f "$COUNTER" ] && COUNT=$(cat "$COUNTER" 2>/dev/null | tr -d '[:space:]')
    COUNT=${COUNT:-0}
    COUNT=$((COUNT + 1))
    mkdir -p "$STATE_DIR" 2>/dev/null
    echo "$COUNT" > "$COUNTER" 2>/dev/null

    if [ "$COUNT" -le "$GRACE_LIMIT" ]; then
      # Within grace period — allow but warn on the last call
      if [ "$COUNT" -eq "$GRACE_LIMIT" ]; then
        echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"AgentOps STAR Protocol: This is your last observation call before ALL tools are blocked. Output the full STAR analysis as text in the chat, then write it to tasks/todo.md NOW.\"}}"
      fi
      exit 0
    fi
    # Grace period expired — fall through to block
    ;;
esac

# Block until a STAR plan exists
ACTION=$(agentops_enforcement_action)
echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"${ACTION}\",\"permissionDecisionReason\":\"AgentOps STAR Protocol: You MUST output the full STAR analysis as text in the chat, then write it to tasks/todo.md BEFORE continuing. Your observation grace period (${GRACE_LIMIT} calls) has been used. Include: Situation (current state), Task (success criteria), Action (concrete steps with file paths), Result (how to verify). Use /agentops:star or write it directly.\"}}"
