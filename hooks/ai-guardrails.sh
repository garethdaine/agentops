#!/bin/bash
set -uo pipefail
# AI guardrails hook — detects common AI-assisted development pitfalls.
# PostToolUse on Write/Edit. Non-blocking: additionalContext guidance only.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

INPUT=$(cat) || exit 0

# Check feature flag
agentops_enterprise_enabled "ai_workflows" || exit 0

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[ -z "$TOOL" ] && exit 0

# Only process Write and Edit
case "$TOOL" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$FILE_PATH" ] && exit 0

# Get content for Write operations
CONTENT=""
if [ "$TOOL" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null)
fi

FILENAME=$(basename "$FILE_PATH")
EXTENSION="${FILENAME##*.}"
DIR=$(dirname "$FILE_PATH")

MESSAGES=()

# ── Detector 1: Untested Generated Code ──────────────────────────────────────
# When a new source file is created, check if a test file exists

if [ "$TOOL" = "Write" ]; then
  # Only check source code files
  if echo "$EXTENSION" | grep -qE '^(ts|tsx|js|jsx)$'; then
    # Skip test files, config files, type declarations
    if ! echo "$FILENAME" | grep -qE '\.(test|spec|stories|config|d)\.(ts|tsx|js|jsx)$' && \
       ! echo "$FILENAME" | grep -qE '^(index|env|next-env|jest|vitest|playwright|eslint|prettier)'; then
      # Check if a test file exists
      BASENAME="${FILENAME%.*}"
      TEST_EXISTS=false
      for TEST_SUFFIX in ".test.ts" ".test.tsx" ".spec.ts" ".spec.tsx" ".test.js" ".test.jsx"; do
        if [ -f "${DIR}/${BASENAME}${TEST_SUFFIX}" ] || \
           [ -f "${DIR}/__tests__/${BASENAME}${TEST_SUFFIX}" ]; then
          TEST_EXISTS=true
          break
        fi
      done
      if [ "$TEST_EXISTS" = "false" ]; then
        MESSAGES+=("New source file '${FILENAME}' has no corresponding test. Consider adding '${BASENAME}.test.${EXTENSION}'.")
      fi
    fi
  fi
fi

# ── Detector 2: Generic Placeholders ─────────────────────────────────────────
# Flag TODO, FIXME, placeholder values in written content

if [ -n "$CONTENT" ]; then
  PLACEHOLDER_COUNT=0

  # Count generic placeholders
  if echo "$CONTENT" | grep -qiE '\bTODO\b'; then
    PLACEHOLDER_COUNT=$((PLACEHOLDER_COUNT + 1))
  fi
  if echo "$CONTENT" | grep -qiE '\bFIXME\b'; then
    PLACEHOLDER_COUNT=$((PLACEHOLDER_COUNT + 1))
  fi
  if echo "$CONTENT" | grep -qiE '\blorem ipsum\b'; then
    PLACEHOLDER_COUNT=$((PLACEHOLDER_COUNT + 1))
  fi
  if echo "$CONTENT" | grep -qE 'example\.com|your-api-key|changeme|password123|REPLACE_ME'; then
    PLACEHOLDER_COUNT=$((PLACEHOLDER_COUNT + 1))
  fi

  if [ "$PLACEHOLDER_COUNT" -ge 2 ]; then
    MESSAGES+=("This file contains ${PLACEHOLDER_COUNT} generic placeholders (TODO, FIXME, example values). Verify all values are project-specific before committing.")
  fi
fi

# ── Detector 3: Hallucinated Dependencies (package.json) ────────────────────
# When package.json is modified, flag for verification

if [ "$FILENAME" = "package.json" ] && [ "$TOOL" = "Write" ]; then
  MESSAGES+=("package.json was written. Verify all dependencies exist on npm before running install. Run 'npm info <package>' for any unfamiliar packages.")
fi

# ── Detector 4: Large Unstructured Files ─────────────────────────────────────
# Flag files that are suspiciously large for a single write (may indicate copy-paste)

if [ "$TOOL" = "Write" ] && [ -n "$CONTENT" ]; then
  LINE_COUNT=$(echo "$CONTENT" | wc -l | tr -d ' ')
  if [ "$LINE_COUNT" -gt 300 ]; then
    MESSAGES+=("This file is ${LINE_COUNT} lines — unusually large for a single write. Consider breaking into smaller, focused modules.")
  fi
fi

# ── Output ───────────────────────────────────────────────────────────────────

if [ ${#MESSAGES[@]} -gt 0 ]; then
  GUIDANCE=$(printf "AI Guardrails: %s" "$(IFS='; '; echo "${MESSAGES[*]}")")
  jq -nc --arg msg "$GUIDANCE" '{additionalContext: $msg}'
fi

exit 0
