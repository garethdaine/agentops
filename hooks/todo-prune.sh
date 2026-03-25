#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'auto_prune_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0

# Respect bypass mode — skip auto-pruning but don't block
agentops_is_bypass "$INPUT" && exit 0

CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
TODO="${CWD}/tasks/todo.md"

# Nothing to prune
[ ! -f "$TODO" ] && exit 0
[ ! -s "$TODO" ] && exit 0

# Build a pruned version: keep unchecked items and their nearest heading
# Remove checked items (- [x]) and blank lines that result from removal
# Create temp file in same directory as target for atomic mv (same filesystem)
TEMP=$(mktemp "${TODO}.XXXXXX")
trap 'rm -f "$TEMP"' EXIT

HAS_UNCHECKED=false
CURRENT_HEADING=""
SECTION_BUFFER=""
SECTION_HAS_UNCHECKED=false

while IFS= read -r line; do
  # Track headings — start a new section buffer
  if [[ "$line" =~ ^#{1,6}\  ]]; then
    # Flush previous section if it had unchecked items
    if [ "$SECTION_HAS_UNCHECKED" = true ] && [ -n "$SECTION_BUFFER" ]; then
      printf '%s\n' "$SECTION_BUFFER" >> "$TEMP"
    fi
    CURRENT_HEADING="$line"
    SECTION_BUFFER="$CURRENT_HEADING"
    SECTION_HAS_UNCHECKED=false
    continue
  fi

  # Skip checked items — don't add to buffer
  if [[ "$line" =~ ^[[:space:]]*-\ \[x\] ]]; then
    continue
  fi

  # Unchecked items — mark section as having unchecked content
  if [[ "$line" =~ ^[[:space:]]*-\ \[\ \] ]]; then
    HAS_UNCHECKED=true
    SECTION_HAS_UNCHECKED=true
    SECTION_BUFFER="${SECTION_BUFFER}
${line}"
    continue
  fi

  # Non-checkbox, non-heading content (notes, context paragraphs) — buffer it
  if [ -n "$line" ]; then
    SECTION_BUFFER="${SECTION_BUFFER}
${line}"
  fi
done < "$TODO"

# Flush final section if it had unchecked items
if [ "$SECTION_HAS_UNCHECKED" = true ] && [ -n "$SECTION_BUFFER" ]; then
  printf '%s\n' "$SECTION_BUFFER" >> "$TEMP"
fi

if [ "$HAS_UNCHECKED" = true ]; then
  # Replace with pruned version containing only incomplete items (atomic rename)
  trap - EXIT
  mv "$TEMP" "$TODO"
  REMAINING=$(grep -cE '^\s*- \[ \]' "$TODO" 2>/dev/null || echo 0)
  jq -nc --arg remaining "$REMAINING" \
    '{systemMessage: ("AgentOps: Pruned completed todos from previous session. " + $remaining + " incomplete item(s) remain in tasks/todo.md — review them before planning new work.")}'
else
  # All items were completed — archive and remove
  ARCHIVE_DIR="${CWD}/tasks/archive"
  mkdir -p "$ARCHIVE_DIR" 2>/dev/null
  TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
  mv "$TODO" "${ARCHIVE_DIR}/todo-${TIMESTAMP}.md"
  trap - EXIT
  jq -nc '{systemMessage: "AgentOps: Previous session'\''s todo was fully completed. Archived to tasks/archive/. A fresh STAR plan is required for new work."}'
fi
