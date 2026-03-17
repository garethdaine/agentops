---
name: unicode-scan
description: Scan project for dangerous invisible Unicode characters (Glassworm/Trojan Source defense)
---

You are running a Unicode security scan on the current project directory.

## What to scan for

Use `perl -CSD` to scan all source code files in the project (skip .git, node_modules, vendor, dist, build, lock files, .agentops). Detect these dangerous invisible Unicode character categories:

1. **Zero-width / invisible chars**: U+200B–U+200F, U+2060–U+2064, U+FEFF (mid-file only)
2. **Bidi overrides (Trojan Source)**: U+202A–U+202E, U+2066–U+2069
3. **Variation selectors (Glassworm)**: U+FE00–U+FE0F
4. **Tag characters**: U+E0001–U+E007F
5. **Variation selectors supplement (Glassworm)**: U+E0100–U+E01EF

The perl detection pattern is:
```
/[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]/
```

## Scan procedure

1. Run a find + perl scan across the project to identify all affected files
2. For each affected file, show:
   - File path (relative to project root)
   - Line numbers containing dangerous characters
   - Character categories found (zero-width, bidi, variation selectors, tags)
   - The visible context around the invisible characters (show 30 chars either side)
   - A hex dump of the specific dangerous bytes found using: `perl -CSD -ne 'if (/[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]/) { while (/[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]/g) { printf "  U+%04X at col %d\n", ord($&), pos($_) } }'`
3. Present a summary table

## After scanning

Present findings using this format:

```
## Unicode Security Scan Results

**Status**: CLEAN | ⚠ FINDINGS
**Files scanned**: N
**Files flagged**: N

### Findings

| File | Line | Category | Codepoints |
|------|------|----------|------------|
| ... | ... | ... | ... |

### Detail

For each file, show the surrounding context and exact codepoints found.
```

If findings exist, ask the user: **"Would you like me to strip these dangerous characters? I will remove only the invisible Unicode — no visible content will change."**

If the user confirms, use `perl -CSD -pi -e` to strip the characters in-place:
```
perl -CSD -pi -e 's/[\x{200B}-\x{200F}\x{2060}-\x{2064}\x{FEFF}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FE00}-\x{FE0F}\x{E0001}-\x{E007F}\x{E0100}-\x{E01EF}]//g'
```

After cleaning, re-run the scan to verify the files are now clean.
