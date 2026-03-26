#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'integrity_verification_enabled')" = "false" ] && exit 0

INPUT=$(cat) || exit 0
EVENT=$(echo "$INPUT" | jq -r '.hook_event // empty' 2>/dev/null)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_DIR="${PROJECT_DIR}/.agentops"
MANIFEST="$LOG_DIR/integrity.jsonl"
mkdir -p "$LOG_DIR" 2>/dev/null

# ── PostToolUse Write/Edit: Record SHA-256 of written files ─────────────────
if [ "$EVENT" = "PostToolUse" ]; then
  case "$TOOL" in
    Write|Edit)
      FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
      [ -z "$FILE_PATH" ] && exit 0
      [ ! -f "$FILE_PATH" ] && exit 0

      # Compute SHA-256
      HASH=$(shasum -a 256 "$FILE_PATH" 2>/dev/null | awk '{print $1}')
      [ -z "$HASH" ] && exit 0

      # Make path relative to project for portability
      REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"

      SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
      TS=$(date -u +%FT%TZ)

      jq -nc --arg ts "$TS" --arg path "$REL_PATH" --arg abs "$FILE_PATH" \
             --arg sha256 "$HASH" --arg session "$SESSION" \
        '{ts:$ts, path:$path, abs_path:$abs, sha256:$sha256, session:$session}' >> "$MANIFEST" 2>/dev/null
      ;;
  esac
  exit 0
fi

# ── SessionStart: Verify integrity of previously written files ──────────────
if [ "$EVENT" = "SessionStart" ]; then
  [ ! -f "$MANIFEST" ] && exit 0
  [ ! -s "$MANIFEST" ] && exit 0

  MISMATCHES=""
  MISMATCH_COUNT=0
  CHECKED=0
  MISSING=0

  # Build a map of latest hash per absolute path (single jq invocation — last entry wins)
  declare -A LATEST_HASH
  while IFS=$'\t' read -r ABS HASH; do
    [ -n "$ABS" ] && [ -n "$HASH" ] && LATEST_HASH["$ABS"]="$HASH"
  done < <(jq -r '[., inputs] | group_by(.abs_path) | .[] | last | [.abs_path, .sha256] | @tsv' "$MANIFEST" 2>/dev/null)

  for ABS in "${!LATEST_HASH[@]}"; do
    EXPECTED="${LATEST_HASH[$ABS]}"

    if [ ! -f "$ABS" ]; then
      MISSING=$((MISSING + 1))
      continue
    fi

    CHECKED=$((CHECKED + 1))
    ACTUAL=$(shasum -a 256 "$ABS" 2>/dev/null | awk '{print $1}')

    if [ "$ACTUAL" != "$EXPECTED" ]; then
      MISMATCH_COUNT=$((MISMATCH_COUNT + 1))
      REL="${ABS#"$PROJECT_DIR"/}"
      MISMATCHES="${MISMATCHES}\n  - ${REL} (expected: ${EXPECTED:0:12}... got: ${ACTUAL:0:12}...)"
    fi
  done

  if [ "$MISMATCH_COUNT" -gt 0 ]; then
    jq -nc --arg ts "$(date -u +%FT%TZ)" --arg count "$MISMATCH_COUNT" \
      '{ts:$ts, event:"INTEGRITY_MISMATCH", files_changed:($count|tonumber)}' >> "$LOG_DIR/audit.jsonl" 2>/dev/null

    MSG=$(printf "INTEGRITY VERIFICATION WARNING: %d file(s) have been modified outside this session since they were last written by the agent.\\n\\nMismatched files:%b\\n\\nThese files may have been tampered with. Inspect changes with git diff before trusting their contents." "$MISMATCH_COUNT" "$MISMATCHES")

    jq -nc --arg msg "$MSG" '{systemMessage:$msg}'
  else
    TOTAL=${#LATEST_HASH[@]}
    if [ "$TOTAL" -gt 0 ]; then
      jq -nc --arg checked "$CHECKED" --arg missing "$MISSING" \
        '{systemMessage:("Integrity verification: " + $checked + " tracked file(s) verified, all hashes match." + (if ($missing | tonumber) > 0 then " (" + $missing + " file(s) no longer exist.)" else "" end))}'
    fi
  fi
fi
