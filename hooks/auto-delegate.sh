#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_delegate_enabled')" != "true" ] && exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only trigger on Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -z "$FILE" ] && exit 0

# Only track source code files
if ! echo "$FILE" | grep -qE '\.(js|ts|tsx|jsx|py|rb|go|rs|java|php|c|cpp|h|hpp|cs|swift|kt|scala|vue|svelte)$'; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
STATE_DIR="${CWD}/.agentops"
DELEGATE_SENT="${STATE_DIR}/delegate-sent"
CODE_TRACKER="${STATE_DIR}/modified-files.txt"

# Already delegated this session
[ -f "$DELEGATE_SENT" ] && exit 0

# Need the tracker to exist
[ ! -f "$CODE_TRACKER" ] && exit 0

# Count source code files only
CODE_COUNT=$(sort -u "$CODE_TRACKER" 2>/dev/null | grep -cE '\.(js|ts|tsx|jsx|py|rb|go|rs|java|php|c|cpp|h|hpp|cs|swift|kt|scala|vue|svelte)$' || echo 0)

# After 5+ source code files modified, trigger delegation
if [ "$CODE_COUNT" -ge 5 ]; then
  date -u +%FT%TZ > "$DELEGATE_SENT" 2>/dev/null

  # Collect the modified source files for review context
  FILES_LIST=$(sort -u "$CODE_TRACKER" 2>/dev/null | grep -E '\.(js|ts|tsx|jsx|py|rb|go|rs|java|php|c|cpp|h|hpp|cs|swift|kt|scala|vue|svelte)$' | head -20 | tr '\n' ', ')

  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"AgentOps auto-delegate: ${CODE_COUNT} source code files modified. Delegate review to specialist agents NOW before continuing:\\n\\n1. Spawn the **code-critic** agent (subagent_type: agentops:code-critic) to review: architecture, code quality, performance, testing gaps, and simplification opportunities. Pass it the list of modified files: ${FILES_LIST}\\n\\n2. Spawn the **security-reviewer** agent (subagent_type: agentops:security-reviewer) to review: injection vulnerabilities, auth gaps, data exposure, dependency risks, OWASP compliance. Pass it the same file list.\\n\\nRun both agents in parallel. Address any critical or high severity findings before proceeding.\"}}"
fi
