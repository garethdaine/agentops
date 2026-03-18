#!/bin/bash
# Failure tracking helpers for the evolve loop.
# Sourced by: feature-flags.sh (facade)
# Depends on: flag-utils.sh (via jq)

# Count unprocessed failures in .agentops/failures.jsonl.
# Usage: COUNT=$(agentops_unprocessed_failures "$CWD")
agentops_unprocessed_failures() {
  local CWD="$1"
  local FAILURES_FILE="${CWD}/.agentops/failures.jsonl"
  local FEEDBACK_FILE="${CWD}/.agentops/feedback-history.jsonl"

  [ ! -f "$FAILURES_FILE" ] && echo 0 && return
  [ ! -s "$FAILURES_FILE" ] && echo 0 && return

  if [ -f "$FEEDBACK_FILE" ] && [ -s "$FEEDBACK_FILE" ]; then
    local ADDRESSED
    ADDRESSED=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' "$FEEDBACK_FILE" 2>/dev/null | sort -u)
    local UNPROCESSED=0
    while IFS= read -r line; do
      local TS
      TS=$(echo "$line" | jq -r '.ts // empty' 2>/dev/null)
      [ -z "$TS" ] && continue
      if ! echo "$ADDRESSED" | grep -qF "$TS"; then
        UNPROCESSED=$((UNPROCESSED + 1))
      fi
    done < "$FAILURES_FILE"
    echo "$UNPROCESSED"
  else
    wc -l < "$FAILURES_FILE" 2>/dev/null | tr -d ' '
  fi
}
