---
name: plan
description: Generate a STAR-based implementation plan with checkable tasks
---

Generate a structured implementation plan for the current task.

## Process

1. **Analyze the task** — understand scope, constraints, existing code
2. **Write STAR header:**
   - **Situation:** Current state and constraints
   - **Task:** Specific, measurable success criteria
   - **Action:** Concrete steps with file-level specificity
   - **Result:** Verification method (tests, behavior, acceptance criteria)
3. **Break into checkable items** — each item is a concrete, completable unit of work
4. **Order by dependency** — items that block others come first
5. **Estimate complexity** — tag each item as S (small), M (medium), or L (large)
6. **Write to `tasks/todo.md`** using checkbox format (`- [ ]`)

## Output Format

```markdown
# Plan: [Task Title]

## STAR Analysis
- **Situation:** ...
- **Task:** ...
- **Action:** ...
- **Result:** ...

## Implementation

### Section 1: [Domain/Phase]
- [ ] [S] Task description (file: path/to/file)
- [ ] [M] Task description (file: path/to/file)

### Section 2: [Domain/Phase]
- [ ] [L] Task description (files: path/a, path/b)
```

Minimum 8 implementation sections. If `tasks/todo.md` already exists and has content, ask the user whether to append or replace.

Arguments: $ARGUMENTS
