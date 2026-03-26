# Change Log

> Records every change made by the auto-improvement agent. Newest first.

---

## 2026-03-26 — test(hooks): add BATS tests for auto-delegate.sh

- **Branch:** `auto-improve/20260326-auto-delegate-bats`
- **PR:** #4
- **What changed:** Added 30 BATS tests for `hooks/auto-delegate.sh` covering feature flag gating, tool filtering (Write/Edit only), source code extension filtering, tracker dependency, threshold behavior (5 unique source files), duplicate entry handling, delegation output JSON structure, single-trigger deduplication via delegate-sent marker, and edge cases.
- **Files:** `tests/auto-delegate.bats` (new)
- **Rollback:** `git revert <merge-commit-sha>` or delete `tests/auto-delegate.bats`.
- **Research:** No new relevant findings this run.

---

## 2026-03-26 — test(hooks): add BATS tests for auto-verify.sh

- **Branch:** `auto-improve/20260326-auto-verify-bats`
- **PR:** #3
- **What changed:** Added 20 BATS tests for `hooks/auto-verify.sh` covering feature flag gating, todo.md existence and completion checks, checked/unchecked counting, test-ran marker detection, enforcement modes (advisory vs blocking), and edge cases (empty files, indented items, non-checkbox lines).
- **Files:** `tests/auto-verify.bats` (new)
- **Rollback:** `git revert <merge-commit-sha>` or delete `tests/auto-verify.bats`.
- **Research:** No new relevant findings this run.

---

## 2026-03-26 — test(hooks): add BATS tests for auto-plan.sh

- **Branch:** `auto-improve/20260326-auto-plan-bats`
- **PR:** #2
- **What changed:** Added 25 BATS tests for `hooks/auto-plan.sh` covering feature flag gating, bypass mode, tool filtering (Write/Edit only), plan existence and staleness detection, threshold behavior, enforcement modes, file tracking, deduplication, and empty input handling.
- **Files:** `tests/auto-plan.bats` (new)
- **Rollback:** `git revert <merge-commit-sha>` or delete `tests/auto-plan.bats`.
- **Research:** No new relevant findings this run.

---

## 2026-03-26 — test(hooks): add BATS tests for auto-test.sh

- **Branch:** `auto-improve/20260326-auto-test-bats`
- **PR:** #1
- **What changed:** Added 20 BATS tests for `hooks/auto-test.sh` covering feature flag gating, tool filtering, source code extension filtering, threshold behavior, single-nudge enforcement, deduplication, and reset/re-trigger cycles.
- **Files:** `tests/auto-test.bats` (new)
- **Rollback:** `git revert <merge-commit-sha>` or delete the test file.
- **Research:** Claude Code changelog checked — no breaking changes to hook API. Plugin hooks now load without restart (already compatible).
