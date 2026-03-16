---
name: verify
description: Verify task completion against plan, tests, and compliance gates
---

Verify that all work is complete and meets acceptance criteria.

## Process

1. **Read the plan** — load `tasks/todo.md` and identify the STAR Result criteria
2. **Check completeness** — are all items marked `- [x]`?
3. **Run tests** — execute the project's test suite
4. **Check regressions** — verify existing functionality still works
5. **Compliance gates:**
   - Plan gate: plan exists if 3+ files modified
   - Verification gate: all todo items checked
   - Test gate: tests were run
6. **Report results** — summarize what passed and what needs attention

## Output Format

```markdown
## Verification Report

### Completion: X/Y items checked
- [x] Item 1
- [ ] Item 2 (INCOMPLETE)

### Tests: PASS/FAIL
- Test suite: [result]
- Regressions: [none found / details]

### Compliance Gates
| Gate | Status |
|------|--------|
| Plan | PASS   |
| Verification | FAIL — 2 unchecked |
| Test | PASS   |
```

Arguments: $ARGUMENTS
