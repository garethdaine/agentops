#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
STATE_DIR="${CWD}/.agentops"

mkdir -p "$STATE_DIR" 2>/dev/null

# Mark session start time for staleness checks
date -u +%FT%TZ > "${STATE_DIR}/session-start" 2>/dev/null

# Reset per-session state markers from previous sessions
rm -f "${STATE_DIR}/consecutive-failures" 2>/dev/null
rm -f "${STATE_DIR}/delegate-sent" 2>/dev/null
rm -f "${STATE_DIR}/test-nudge-sent" 2>/dev/null
rm -f "${STATE_DIR}/code-files-since-test.txt" 2>/dev/null
rm -f "${STATE_DIR}/evolve-ran" 2>/dev/null
rm -f "${STATE_DIR}/evolve-batch-count" 2>/dev/null
rm -f "${STATE_DIR}/modified-files.txt" 2>/dev/null
rm -f "${STATE_DIR}/star-obs-count" 2>/dev/null

exit 0
