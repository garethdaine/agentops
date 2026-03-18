#!/bin/bash
# Shared Unicode detection library — single source of truth for Glassworm/Trojan Source defense.
# Sourced by: unicode-firewall.sh, unicode-scan-session.sh, lockfile-audit.sh

# Dangerous invisible Unicode character ranges:
#   Cat 1: Zero-width / invisible  U+200B-200F, U+2060-2064, U+FEFF
#   Cat 2: Bidi overrides          U+202A-202E, U+2066-2069
#   Cat 3: Variation selectors     U+FE00-FE0F
#   Cat 4: Tag characters          U+E0001-E007F
#   Cat 5: Variation sel. supp.    U+E0100-E01EF
UNICODE_PATTERN='[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]'

# Returns 0 (match) if dangerous invisible Unicode is found in stdin.
unicode_detect() {
  perl -CSD -ne "if (/$UNICODE_PATTERN/) { exit 0 } END { exit 1 }" 2>/dev/null
}

# Returns 0 (match) if dangerous invisible Unicode is found in a file.
unicode_detect_file() {
  local FILE="$1"
  perl -CSD -ne "if (/$UNICODE_PATTERN/) { exit 0 } END { exit 1 }" "$FILE" 2>/dev/null
}

# Returns human-readable category summary from stdin.
unicode_classify() {
  perl -CSD -ne '
    BEGIN { %c = () }
    $c{"zero-width chars"}++            if /[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}]/;
    $c{"bidi overrides"}++              if /[\x{202A}-\x{202E}\x{2066}-\x{2069}]/;
    $c{"variation selectors"}++         if /[\x{FE00}-\x{FE0F}]/;
    $c{"tag characters"}++              if /[\x{E0001}-\x{E007F}]/;
    $c{"variation sel. supplement"}++   if /[\x{E0100}-\x{E01EF}]/;
    END { print join(", ", sort keys %c) if %c }
  ' 2>/dev/null
}

# Returns human-readable category summary from a file.
unicode_classify_file() {
  local FILE="$1"
  perl -CSD -ne '
    BEGIN { %c = () }
    $c{"zero-width chars"}++            if /[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}]/;
    $c{"bidi overrides"}++              if /[\x{202A}-\x{202E}\x{2066}-\x{2069}]/;
    $c{"variation selectors"}++         if /[\x{FE00}-\x{FE0F}]/;
    $c{"tag characters"}++              if /[\x{E0001}-\x{E007F}]/;
    $c{"variation sel. supplement"}++   if /[\x{E0100}-\x{E01EF}]/;
    END { print join(", ", sort keys %c) if %c }
  ' "$FILE" 2>/dev/null
}

# Count affected lines from stdin.
unicode_count_lines() {
  perl -CSD -ne "print if /$UNICODE_PATTERN/" 2>/dev/null | wc -l | tr -d ' '
}

# Count affected lines in a file.
unicode_count_lines_file() {
  local FILE="$1"
  perl -CSD -ne "print if /$UNICODE_PATTERN/" "$FILE" 2>/dev/null | wc -l | tr -d ' '
}

# Strip dangerous Unicode from a file in-place.
unicode_strip_file() {
  local FILE="$1"
  perl -CSD -pi -e "s/$UNICODE_PATTERN//g" "$FILE" 2>/dev/null
}
