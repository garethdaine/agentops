#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0

[[ "$FILE" != *"SKILL.md"* ]] && exit 0
[ ! -f "$FILE" ] && exit 0

CONTENT=$(cat "$FILE" 2>/dev/null) || exit 0
WARNINGS=""

# Check for shell execution in skills
echo "$CONTENT" | grep -qiE "\b(curl|wget|nc|ncat|eval|exec|system)\b" && \
  WARNINGS="${WARNINGS}Contains potentially dangerous command references. "

# Check for credential references
echo "$CONTENT" | grep -qiE "(api_key|secret|token|password|credential|private_key)" && \
  WARNINGS="${WARNINGS}References credentials. "

# Check for external URLs (data exfiltration risk)
echo "$CONTENT" | grep -qE "https?://[^ ]*\.(xyz|tk|ml|ga|cf)\b" && \
  WARNINGS="${WARNINGS}Contains suspicious external URLs. "

if [ -n "$WARNINGS" ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"AgentOps SkillValidator WARNING: $WARNINGS Review this skill file for security risks before using it.\"}}"
fi
