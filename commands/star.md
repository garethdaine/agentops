---
name: star
description: Generate a STAR analysis for the current task
---

Generate a STAR (Situation, Task, Action, Result) analysis for the current task or request:

1. **Situation:** Describe the current state — what exists, what doesn't, relevant constraints and context.
2. **Task:** Define specific success criteria — what does "done" look like? Be concrete and measurable.
3. **Action:** List concrete steps with file-level specificity — which files to create, modify, or delete.
4. **Result:** Describe how completion will be verified — tests to run, behavior to demonstrate, acceptance criteria.

Write the analysis to `tasks/todo.md` with checkable items (`- [ ]`) for each action step.

If `tasks/todo.md` already exists and has content, ask the user whether to append or replace.

Arguments: $ARGUMENTS
