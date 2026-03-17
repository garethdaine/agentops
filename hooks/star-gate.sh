#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'star_gate_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
# NOTE: star-gate NEVER skips — STAR enforcement is mandatory regardless of
# bypass mode, unrestricted mode, or any other permission setting.
# It uses additionalContext (not permissionDecision) so it instructs the agent
# without blocking tools or prompting the user for confirmation.
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
TODO="${CWD}/tasks/todo.md"

# Check if a valid, active plan exists
PLAN_VALID=false
if [ -f "$TODO" ] && [ -s "$TODO" ]; then
  SESSION_MARKER="${CWD}/.agentops/session-start"
  IS_CURRENT=true

  # Stale plan from a previous session doesn't count
  if [ -f "$SESSION_MARKER" ] && [ "$TODO" -ot "$SESSION_MARKER" ]; then
    IS_CURRENT=false
  fi

  # Plan must be current AND have at least one incomplete item
  if [ "$IS_CURRENT" = true ]; then
    UNCHECKED=$(grep -c '^\s*- \[ \]' "$TODO" 2>/dev/null || echo 0)
    [ "$UNCHECKED" -gt 0 ] && PLAN_VALID=true
  fi
fi

STATE_DIR="${CWD}/.agentops"
PLAN_ACTIVE_MARKER="${STATE_DIR}/star-plan-active"

# Valid active plan — STAR is satisfied, allow everything
if [ "$PLAN_VALID" = true ]; then
  # Mark that we have an active plan (used to detect task transitions)
  mkdir -p "$STATE_DIR" 2>/dev/null
  [ ! -f "$PLAN_ACTIVE_MARKER" ] && date -u +%FT%TZ > "$PLAN_ACTIVE_MARKER" 2>/dev/null
  exit 0
fi

# No valid plan — if we previously had one, this is a new task cycle. Reset grace period.
if [ -f "$PLAN_ACTIVE_MARKER" ]; then
  rm -f "$PLAN_ACTIVE_MARKER" "${STATE_DIR}/star-obs-count" 2>/dev/null
fi

# Allow writing the plan itself (bootstrap)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$FILE" in
  */tasks/todo.md|*/tasks/todo.txt) exit 0 ;;
esac

# Allow creating the tasks directory (bootstrap — only exact mkdir commands)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
case "$COMMAND" in
  "mkdir tasks"|"mkdir -p tasks"|"mkdir -p tasks/"|"mkdir tasks/") exit 0 ;;
esac

# Grace period: allow observation tools for initial investigation
# Track call count and inject STAR instruction after grace window expires
COUNTER="${STATE_DIR}/star-obs-count"
GRACE_LIMIT=5

case "$TOOL" in
  Read|Glob|Grep|Agent|ToolSearch)
    # Count this observation call (atomic write to avoid race conditions)
    COUNT=0
    [ -f "$COUNTER" ] && COUNT=$(tr -d '[:space:]' < "$COUNTER" 2>/dev/null)
    COUNT=${COUNT:-0}
    COUNT=$((COUNT + 1))
    mkdir -p "$STATE_DIR" 2>/dev/null
    COUNTER_TMP="${COUNTER}.$$"
    echo "$COUNT" > "$COUNTER_TMP" 2>/dev/null && mv "$COUNTER_TMP" "$COUNTER" 2>/dev/null

    if [ "$COUNT" -le "$GRACE_LIMIT" ]; then
      # Within grace period — allow but warn on the last call
      if [ "$COUNT" -eq "$GRACE_LIMIT" ]; then
        jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:"AgentOps STAR Protocol: This is your last observation call before STAR is required. Output the full STAR analysis as text in the chat, then write it to tasks/todo.md NOW."}}'
      fi
      exit 0
    fi
    # Grace period expired — fall through to inject STAR instruction
    ;;
esac

# Inject STAR instruction — tells the agent to run STAR without blocking the tool call
jq -nc --argjson limit "$GRACE_LIMIT" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:("AgentOps STAR Protocol: You MUST output the full STAR analysis as text in the chat, then write it to tasks/todo.md BEFORE continuing. Your observation grace period (" + ($limit|tostring) + " calls) has been used. Include: Situation (current state), Task (success criteria), Action (concrete steps with file paths), Result (how to verify). Use /agentops:star or write it directly.")}}'
