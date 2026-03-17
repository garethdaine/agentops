---
name: prune
description: Prune completed items from tasks/todo.md or archive it entirely
---

Prune completed tasks from `tasks/todo.md`.

## Process

1. Read `tasks/todo.md`. If it doesn't exist or is empty, report that there's nothing to prune and stop.
2. Categorize every checkbox item:
   - **Completed:** `- [x]` items
   - **Incomplete:** `- [ ]` items
3. If there are no completed items, report "nothing to prune" and stop.
4. Report what will be pruned — list the completed items so the user can see them before removal.
5. **If all items are completed:**
   - Archive the file to `tasks/archive/todo-{UTC timestamp}.md`
   - Delete `tasks/todo.md`
   - Report: archived and cleared, a fresh STAR plan is required for new work.
6. **If some items are incomplete:**
   - Remove all `- [x]` items
   - Keep `- [ ]` items with their section headings
   - Keep any non-checkbox content (e.g. STAR headers) that belongs to sections with remaining incomplete items
   - Write the pruned result back to `tasks/todo.md`
   - Report: how many items pruned, how many remain.

Arguments: $ARGUMENTS
