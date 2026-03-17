---
name: supply-chain-scan
description: Run all supply-chain defense scans — Unicode firewall, integrity verification, and lockfile audit
---

Run all three supply-chain defense scans against the current project directory and present a unified report.

## Procedure

Run these three scans sequentially using Bash, then compile the results:

### 1. Unicode Scan
```bash
"${CLAUDE_PLUGIN_ROOT}/hooks/unicode-scan-session.sh" <<< '{"hook_event":"SessionStart"}'
```

### 2. Integrity Verification
```bash
"${CLAUDE_PLUGIN_ROOT}/hooks/integrity-verify.sh" <<< '{"hook_event":"SessionStart"}'
```

### 3. Lockfile Audit
```bash
"${CLAUDE_PLUGIN_ROOT}/hooks/lockfile-audit.sh" <<< '{"hook_event":"SessionStart"}'
```

Parse the JSON output from each hook (the `systemMessage` field) and present a unified report:

```
## Supply-Chain Defense Scan

| Check | Status | Details |
|-------|--------|---------|
| Unicode firewall | CLEAN / ⚠ FINDINGS | N file(s) flagged |
| Integrity verification | CLEAN / ⚠ MISMATCH | N file(s) changed |
| Lockfile audit | CLEAN / ⚠ FINDINGS | N finding(s) |

### Details
[Include detail sections from any scan that reported findings]
```

If all three scans are clean, report a single summary line confirming the project is clear.

If any scan has findings, ask the user what they'd like to do about each finding category using AskUserQuestion.
