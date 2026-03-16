#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'injection_scan_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0

# Skip MCP tools and internal tools — they produce legitimate structured data
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
case "$TOOL" in
  mcp__*|ToolSearch|Agent|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskOutput|TaskStop) exit 0 ;;
esac

TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input | tostring' 2>/dev/null) || exit 0
[ -z "$TOOL_INPUT" ] && exit 0

SCORE=0

# Role switching phrases
if echo "$TOOL_INPUT" | grep -qiE "you are now|pretend you are|act as if|ignore previous|forget your|disregard all|new instructions"; then
  SCORE=$((SCORE + 40))
fi

# Authority markers — only match standalone directives, not data content
if echo "$TOOL_INPUT" | grep -qiE "^(IMPORTANT:|ADMIN OVERRIDE|developer mode|system prompt|PRIORITY:|URGENT:|OVERRIDE:)"; then
  SCORE=$((SCORE + 30))
fi

# Delimiter/boundary attacks
if echo "$TOOL_INPUT" | grep -qiE "---END SYSTEM---|</system>|\[/INST\]|<\|im_end\|>|<\|endoftext\|>|Human:|Assistant:"; then
  SCORE=$((SCORE + 50))
fi

# Imperative density
IMPERATIVES=$(echo "$TOOL_INPUT" | grep -oiE "\b(ignore|forget|override|execute|bypass|disable|skip|delete|remove|drop|erase)\b" | wc -l | tr -d ' ')
WORDS=$(echo "$TOOL_INPUT" | wc -w | tr -d ' ')
if [ "$WORDS" -gt 0 ] && [ "$IMPERATIVES" -gt 3 ]; then
  DENSITY=$((IMPERATIVES * 100 / WORDS))
  [ "$DENSITY" -gt 10 ] && SCORE=$((SCORE + 20))
fi

ACTION=$(agentops_enforcement_action)

if [ "$SCORE" -ge 50 ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"$ACTION\",\"permissionDecisionReason\":\"Injection risk detected (score: $SCORE/100). Suspicious patterns found in tool input.\"}}"
elif [ "$SCORE" -ge 25 ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"Moderate injection risk (score: $SCORE/100). Review before proceeding.\"}}"
fi
