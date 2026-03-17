#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'unicode_firewall_enabled')" = "false" ] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

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
  xargs -0 perl -CSD -lne '
    if (/[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]/) {
      print $ARGV;
      close ARGV;  # skip to next file after first match
    }
  ' 2>/dev/null | sort -u)

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

  jq -nc --arg count "$FILE_COUNT" --arg files "$FILE_LIST" \
    '{systemMessage:("UNICODE FIREWALL — SESSION SCAN: Found " + $count + " file(s) containing dangerous invisible Unicode characters (zero-width, bidi overrides, variation selectors, or tag characters). These may indicate a Glassworm/Trojan Source supply-chain compromise.\n\nAffected files:\n" + $files + "\n\nRun /agentops:unicode-scan to get a detailed analysis and clean these files.")}'
else
  jq -nc '{systemMessage:"Unicode firewall: session scan clean — no dangerous invisible characters detected in project files."}'
fi
