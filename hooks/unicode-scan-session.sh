#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'unicode_firewall_enabled')" = "false" ] && exit 0

source "${SCRIPT_DIR}/unicode-lib.sh"

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
CACHE_DIR="${PROJECT_DIR}/.agentops"
CACHE_FILE="${CACHE_DIR}/unicode-scan-cache"

# Skip scan if cache exists and no files have been modified since last scan
if [ -f "$CACHE_FILE" ]; then
  NEWER_FILES=$(find "$PROJECT_DIR" \
    -type f \
    \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' \
       -o -name '*.py' -o -name '*.rb' -o -name '*.go' -o -name '*.rs' \
       -o -name '*.java' -o -name '*.php' -o -name '*.sh' -o -name '*.json' \
       -o -name '*.yaml' -o -name '*.yml' -o -name '*.md' -o -name '*.env' \) \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -not -path '*/vendor/*' \
    -not -path '*/.agentops/*' \
    -newer "$CACHE_FILE" \
    -print -quit 2>/dev/null)
  if [ -z "$NEWER_FILES" ]; then
    # No files modified since last scan — use cached result
    CACHED_MSG=$(cat "$CACHE_FILE" 2>/dev/null)
    [ -n "$CACHED_MSG" ] && echo "$CACHED_MSG"
    exit 0
  fi
fi

# Scan project directory for files containing dangerous invisible Unicode.
# Skips: .git, node_modules, vendor, .agentops, binary files, lock files.
RESULTS=$(find "$PROJECT_DIR" \
  -type f \
  \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' \
     -o -name '*.py' -o -name '*.rb' -o -name '*.go' -o -name '*.rs' \
     -o -name '*.java' -o -name '*.php' -o -name '*.c' -o -name '*.cpp' \
     -o -name '*.h' -o -name '*.hpp' -o -name '*.cs' -o -name '*.swift' \
     -o -name '*.kt' -o -name '*.scala' -o -name '*.sh' -o -name '*.bash' \
     -o -name '*.vue' -o -name '*.svelte' -o -name '*.json' -o -name '*.yaml' \
     -o -name '*.yml' -o -name '*.toml' -o -name '*.xml' -o -name '*.md' \
     -o -name '*.txt' -o -name '*.html' -o -name '*.css' -o -name '*.scss' \
     -o -name '*.env' -o -name '*.env.*' -o -name 'Makefile' -o -name 'Dockerfile' \
     -o -name '*.cfg' -o -name '*.ini' -o -name '*.conf' \) \
  -not -path '*/.git/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/vendor/*' \
  -not -path '*/.agentops/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/*.min.js' \
  -not -path '*/*.min.css' \
  -not -name 'package-lock.json' \
  -not -name 'yarn.lock' \
  -not -name 'pnpm-lock.yaml' \
  -not -name 'composer.lock' \
  -not -name 'Cargo.lock' \
  -not -name 'Gemfile.lock' \
  -print0 2>/dev/null | \
  xargs -0 perl -CSD -lne "
    if (/$UNICODE_PATTERN/) {
      print \$ARGV;
      close ARGV;  # skip to next file after first match
    }
  " 2>/dev/null | sort -u)

if [ -n "$RESULTS" ]; then
  FILE_COUNT=$(echo "$RESULTS" | wc -l | tr -d ' ')

  # Build a truncated file list (max 10 files shown)
  FILE_LIST=$(echo "$RESULTS" | head -10 | sed "s|^$PROJECT_DIR/||")
  [ "$FILE_COUNT" -gt 10 ] && FILE_LIST="${FILE_LIST}
... and $((FILE_COUNT - 10)) more"

  # Audit log
  LOG_DIR="${PROJECT_DIR}/.agentops"
  mkdir -p "$LOG_DIR" 2>/dev/null
  jq -nc --arg ts "$(date -u +%FT%TZ)" --arg count "$FILE_COUNT" \
    '{ts:$ts, event:"UNICODE_SESSION_SCAN", files_flagged:($count|tonumber)}' >> "$LOG_DIR/audit.jsonl" 2>/dev/null

  OUTPUT=$(jq -nc --arg count "$FILE_COUNT" --arg files "$FILE_LIST" \
    '{systemMessage:("UNICODE FIREWALL — SESSION SCAN: Found " + $count + " file(s) containing dangerous invisible Unicode characters (zero-width, bidi overrides, variation selectors, or tag characters). These may indicate a Glassworm/Trojan Source supply-chain compromise.\n\nAffected files:\n" + $files + "\n\nRun /agentops:unicode-scan to get a detailed analysis and clean these files.")}')
  echo "$OUTPUT"
  mkdir -p "$CACHE_DIR" 2>/dev/null
  echo "$OUTPUT" > "$CACHE_FILE" 2>/dev/null
else
  OUTPUT=$(jq -nc '{systemMessage:"Unicode firewall: session scan clean — no dangerous invisible characters detected in project files."}')
  echo "$OUTPUT"
  mkdir -p "$CACHE_DIR" 2>/dev/null
  echo "$OUTPUT" > "$CACHE_FILE" 2>/dev/null
fi
