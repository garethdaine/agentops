#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'lockfile_audit_enabled')" = "false" ] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_DIR="${PROJECT_DIR}/.agentops"
mkdir -p "$LOG_DIR" 2>/dev/null

UNICODE_PATTERN='[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]'

# Known safe registries — anything else is flagged
SAFE_REGISTRIES='(registry\.npmjs\.org|registry\.yarnpkg\.com|packagist\.org|rubygems\.org|pypi\.org|files\.pythonhosted\.org|crates\.io|index\.crates\.io|repo1?\.maven\.org|plugins\.gradle\.org|proxy\.golang\.org|ghcr\.io|docker\.io|registry\.hub\.docker\.com|cdn\.jsdelivr\.net|unpkg\.com)'

FINDINGS=""
FINDING_COUNT=0

# ── Lockfile discovery ──────────────────────────────────────────────────────
LOCKFILES=""
for CANDIDATE in \
  "package-lock.json" \
  "yarn.lock" \
  "pnpm-lock.yaml" \
  "composer.lock" \
  "Gemfile.lock" \
  "Cargo.lock" \
  "poetry.lock" \
  "Pipfile.lock" \
  "go.sum" \
  "pubspec.lock" \
  "packages.lock.json"; do
  [ -f "$PROJECT_DIR/$CANDIDATE" ] && LOCKFILES="$LOCKFILES $PROJECT_DIR/$CANDIDATE"
done

# Also check for lockfiles in workspace subdirectories (1 level deep)
for SUBDIR in "$PROJECT_DIR"/*/; do
  [ -d "$SUBDIR" ] || continue
  for CANDIDATE in "package-lock.json" "yarn.lock" "pnpm-lock.yaml" "composer.lock"; do
    [ -f "$SUBDIR$CANDIDATE" ] && LOCKFILES="$LOCKFILES $SUBDIR$CANDIDATE"
  done
done

[ -z "$LOCKFILES" ] && exit 0

# ── Check 1: Unicode anomalies in lockfiles ─────────────────────────────────
for LF in $LOCKFILES; do
  REL="${LF#$PROJECT_DIR/}"

  # Invisible Unicode check
  if perl -CSD -ne "if (/$UNICODE_PATTERN/) { exit 0 } END { exit 1 }" "$LF" 2>/dev/null; then
    CATEGORIES=$(perl -CSD -ne '
      BEGIN { %c = () }
      $c{"zero-width"}++        if /[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}]/;
      $c{"bidi"}++              if /[\x{202A}-\x{202E}\x{2066}-\x{2069}]/;
      $c{"variation-sel"}++     if /[\x{FE00}-\x{FE0F}]/;
      $c{"tag-chars"}++         if /[\x{E0001}-\x{E007F}]/;
      $c{"var-sel-supp"}++      if /[\x{E0100}-\x{E01EF}]/;
      END { print join(", ", sort keys %c) if %c }
    ' "$LF" 2>/dev/null)

    LINE_COUNT=$(perl -CSD -ne "print if /$UNICODE_PATTERN/" "$LF" 2>/dev/null | wc -l | tr -d ' ')

    FINDING_COUNT=$((FINDING_COUNT + 1))
    FINDINGS="${FINDINGS}\n  CRITICAL: ${REL} — invisible Unicode (${CATEGORIES}) on ${LINE_COUNT} line(s)"
  fi

  # ── Check 2: Suspicious registry URLs ───────────────────────────────────
  # Extract URLs/registry references and check against known-safe list
  SUSPICIOUS_URLS=$(grep -oE 'https?://[a-zA-Z0-9._~:/?#@!$&'"'"'()*+,;=-]+' "$LF" 2>/dev/null \
    | grep -vE "$SAFE_REGISTRIES" \
    | grep -vE '(github\.com|gitlab\.com|bitbucket\.org|raw\.githubusercontent\.com)' \
    | grep -vE '\.(md|html|txt|pdf)$' \
    | sort -u \
    | head -20)

  if [ -n "$SUSPICIOUS_URLS" ]; then
    URL_COUNT=$(echo "$SUSPICIOUS_URLS" | wc -l | tr -d ' ')
    SAMPLE=$(echo "$SUSPICIOUS_URLS" | head -5 | sed 's/^/      /')

    FINDING_COUNT=$((FINDING_COUNT + 1))
    FINDINGS="${FINDINGS}\n  WARNING: ${REL} — ${URL_COUNT} non-standard registry URL(s) detected:\n${SAMPLE}"
  fi

  # ── Check 3: Integrity hash format anomalies (npm/yarn specific) ────────
  case "$REL" in
    *package-lock.json|*yarn.lock)
      # Check for integrity hashes that don't match expected sha512-/sha256- pattern
      BAD_INTEGRITY=$(grep -oE '"integrity":\s*"[^"]*"' "$LF" 2>/dev/null \
        | grep -vE '"sha(256|384|512)-[A-Za-z0-9+/=]+"' \
        | head -5)

      if [ -n "$BAD_INTEGRITY" ]; then
        BAD_COUNT=$(echo "$BAD_INTEGRITY" | wc -l | tr -d ' ')
        FINDING_COUNT=$((FINDING_COUNT + 1))
        FINDINGS="${FINDINGS}\n  WARNING: ${REL} — ${BAD_COUNT} malformed integrity hash(es) detected"
      fi
      ;;
  esac
done

# ── Report findings ─────────────────────────────────────────────────────────
LOCKFILE_COUNT=$(echo "$LOCKFILES" | wc -w | tr -d ' ')

if [ "$FINDING_COUNT" -gt 0 ]; then
  jq -nc --arg ts "$(date -u +%FT%TZ)" --arg count "$FINDING_COUNT" --arg files "$LOCKFILE_COUNT" \
    '{ts:$ts, event:"LOCKFILE_AUDIT_FINDINGS", findings:($count|tonumber), files_scanned:($files|tonumber)}' \
    >> "$LOG_DIR/audit.jsonl" 2>/dev/null

  MSG=$(printf "LOCKFILE AUDIT — %d FINDING(S) across %d lockfile(s):\\n%b\\n\\nLockfiles are a prime target for supply-chain attacks (Glassworm, dependency confusion). Investigate findings before proceeding." \
    "$FINDING_COUNT" "$LOCKFILE_COUNT" "$FINDINGS")

  jq -nc --arg msg "$MSG" '{systemMessage:$msg}'
else
  jq -nc --arg count "$LOCKFILE_COUNT" \
    '{systemMessage:("Lockfile audit: " + $count + " lockfile(s) scanned — no anomalies detected.")}'
fi
