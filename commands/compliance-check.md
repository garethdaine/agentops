---
name: compliance-check
description: Run AgentOps compliance checks manually
---

Run all AgentOps compliance gates and report their status:

## Checks

### 1. Plan Gate
- Count modified files tracked in `.agentops/modified-files.txt`
- If 3+ files modified, verify `tasks/todo.md` exists and is non-empty
- Report: PASS/FAIL with file count

### 2. Verification Gate
- Read `tasks/todo.md` and count unchecked items (`- [ ]`)
- Report: PASS/FAIL with count of remaining items

### 3. Test Gate
- Check if `.agentops/tests-ran` exists (populated by ci-guard hook)
- If 3+ files modified and no tests run, report FAIL
- Report: PASS/FAIL with last test timestamp if available

### 4. Lessons Check
- Check if `tasks/lessons.md` exists
- Count total lessons
- Report: INFO with lesson count

Present results in a table format:

| Gate | Status | Details |
|------|--------|---------|

Arguments: $ARGUMENTS
