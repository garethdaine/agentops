#!/bin/bash
# Standards enforcement hook — fires on Write/Edit to provide enterprise standards guidance.
# Non-blocking: uses additionalContext only, never denies writes.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

INPUT=$(cat)

# Check feature flag — if disabled, exit silently
agentops_enterprise_enabled "enterprise_scaffold" || exit 0

# Extract tool name and file path
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[ -z "$TOOL" ] && exit 0

FILE_PATH=""
if [ "$TOOL" = "Write" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
elif [ "$TOOL" = "Edit" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
fi

[ -z "$FILE_PATH" ] && exit 0

# Extract just the filename and extension
FILENAME=$(basename "$FILE_PATH")
EXTENSION="${FILENAME##*.}"
DIR=$(dirname "$FILE_PATH")

MESSAGES=()

# ── Rule 1: File naming conventions ──────────────────────────────────────────

# React/Vue/Svelte components should be PascalCase
if echo "$EXTENSION" | grep -qE '^(tsx|jsx|vue|svelte)$'; then
  # Check if it looks like a component file (not a config, test, or index)
  if ! echo "$FILENAME" | grep -qE '(^index\.|\.test\.|\.spec\.|\.stories\.|\.config\.|\.d\.ts$)'; then
    # Check if filename starts with lowercase (not PascalCase)
    BASENAME="${FILENAME%.*}"
    if echo "$BASENAME" | grep -qE '^[a-z]'; then
      # Could be a kebab-case file that's not a component (e.g., hooks, utils)
      if ! echo "$BASENAME" | grep -qE '^(use[A-Z]|use-|lib/|utils?/|hooks?/|stores?/)'; then
        if echo "$DIR" | grep -qiE '(component|page|layout|view|screen)'; then
          PASCAL=$(echo "$BASENAME" | awk -F'[-_]' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' OFS='')
          # If input was camelCase (no separators), just uppercase first char
          if [ "$PASCAL" = "$BASENAME" ]; then
            PASCAL="$(echo "${BASENAME:0:1}" | tr '[:lower:]' '[:upper:]')${BASENAME:1}"
          fi
          MESSAGES+=("Component files in component directories should use PascalCase: '${BASENAME}' → '${PASCAL}'")
        fi
      fi
    fi
  fi
fi

# Non-component source files should be kebab-case
if echo "$EXTENSION" | grep -qE '^(ts|js|mjs|cjs)$'; then
  BASENAME="${FILENAME%.*}"
  # Skip index files, config files, and env.d.ts style files
  if ! echo "$BASENAME" | grep -qE '(^index$|\.config$|\.d$|^env$|^next-env$)'; then
    # Check for camelCase or mixed case (but not SCREAMING_CASE constants files)
    if echo "$BASENAME" | grep -qE '[a-z][A-Z]' && ! echo "$BASENAME" | grep -qE '^[A-Z_]+$'; then
      MESSAGES+=("Source files should use kebab-case naming: '${BASENAME}' → '$(echo "$BASENAME" | sed -E 's/([a-z])([A-Z])/\1-\L\2/g' | tr '[:upper:]' '[:lower:]')'")
    fi
  fi
fi

# ── Rule 2: Directory placement ──────────────────────────────────────────────

# Test files should be near their source or in __tests__
if echo "$FILENAME" | grep -qE '\.(test|spec)\.(ts|tsx|js|jsx)$'; then
  if ! echo "$DIR" | grep -qE '(__tests__|test|tests|spec|specs)'; then
    # Check if test is co-located with source (same dir) — that's fine
    SOURCE_NAME=$(echo "$FILENAME" | sed -E 's/\.(test|spec)\./\./')
    if [ ! -f "${DIR}/${SOURCE_NAME}" ]; then
      MESSAGES+=("Test file '${FILENAME}' — consider co-locating with its source file or placing in a __tests__ directory")
    fi
  fi
fi

# ── Rule 3: Import ordering guidance ─────────────────────────────────────────

# Only check TypeScript/JavaScript files being written (not edited — too noisy)
if [ "$TOOL" = "Write" ] && echo "$EXTENSION" | grep -qE '^(ts|tsx|js|jsx|mjs)$'; then
  MESSAGES+=("Imports should follow this order: (1) external packages, (2) internal aliases (@/), (3) relative imports (./)")
fi

# ── Rule 4: Export pattern guidance ──────────────────────────────────────────

# For new component files, recommend named exports
if [ "$TOOL" = "Write" ] && echo "$EXTENSION" | grep -qE '^(tsx|jsx)$'; then
  if echo "$DIR" | grep -qiE '(component|ui|widget)'; then
    MESSAGES+=("Prefer named exports for components (export function ComponentName) — use default exports only for page/route components")
  fi
fi

# ── Output ───────────────────────────────────────────────────────────────────

if [ ${#MESSAGES[@]} -gt 0 ]; then
  GUIDANCE=$(printf "Enterprise Standards: %s" "$(IFS='; '; echo "${MESSAGES[*]}")")
  jq -nc --arg msg "$GUIDANCE" '{additionalContext: $msg}'
fi

exit 0
