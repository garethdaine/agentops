#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

agentops_automation_enabled 'auto_delegate_enabled' || exit 0

INPUT=$(cat) || exit 0
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Only trigger on Write and Edit
[ "$TOOL" != "Write" ] && [ "$TOOL" != "Edit" ] && exit 0

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -z "$FILE" ] && exit 0

# Only track source code files
if ! echo "$FILE" | grep -qE "$SOURCE_CODE_EXTENSIONS"; then
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
CODE_COUNT=$(sort -u "$CODE_TRACKER" 2>/dev/null | grep -cE "$SOURCE_CODE_EXTENSIONS") || CODE_COUNT=0

# After threshold source code files modified, trigger delegation
if [ "$CODE_COUNT" -ge "$AGENTOPS_DELEGATE_THRESHOLD" ]; then
  date -u +%FT%TZ > "$DELEGATE_SENT" 2>/dev/null

  # Collect the modified source files for review context
  FILES_LIST=$(sort -u "$CODE_TRACKER" 2>/dev/null | grep -E "$SOURCE_CODE_EXTENSIONS" | head -20 | tr '\n' ', ')

  jq -nc --arg count "$CODE_COUNT" --arg files "$FILES_LIST" \
    '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:("AgentOps auto-delegate: " + $count + " source code files modified. Delegate review to specialist agents NOW before continuing:\n\n1. Spawn the **code-critic** agent (subagent_type: agentops:code-critic) to review: architecture, code quality, performance, testing gaps, and simplification opportunities. Pass it the list of modified files: " + $files + "\n\n2. Spawn the **security-reviewer** agent (subagent_type: agentops:security-reviewer) to review: injection vulnerabilities, auth gaps, data exposure, dependency risks, OWASP compliance. Pass it the same file list.\n\nRun both agents in parallel. Address any critical or high severity findings before proceeding.")}}'
fi
