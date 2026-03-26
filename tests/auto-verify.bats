#!/usr/bin/env bats
# Tests for hooks/auto-verify.sh — Stop hook that checks todo.md completion
# and test run status before allowing session stop.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: build Stop hook JSON input ───────────────────────────────────────

stop_event() {
  jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "Stop",
    cwd: $cwd
  }'
}

# Run the hook with a given event, capturing output
run_hook() {
  echo "$1" | bash "$HOOKS_DIR/auto-verify.sh"
}

# Create a todo.md with given checked/unchecked items
create_todo() {
  local CHECKED="${1:-0}"
  local UNCHECKED="${2:-0}"
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  : > "$TEST_PROJECT_DIR/tasks/todo.md"
  for i in $(seq 1 "$CHECKED"); do
    echo "- [x] Completed item $i" >> "$TEST_PROJECT_DIR/tasks/todo.md"
  done
  for i in $(seq 1 "$UNCHECKED"); do
    echo "- [ ] Pending item $i" >> "$TEST_PROJECT_DIR/tasks/todo.md"
  done
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when auto_verify_enabled is false" {
  set_flag "auto_verify_enabled" "false"
  create_todo 2 3
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "runs when auto_verify_enabled is true and todo.md has unchecked items" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 2
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
  echo "$result" | jq -e '.stopReason' >/dev/null
}

# ── No todo.md — exits silently ──────────────────────────────────────────────

@test "exits silently when no todo.md exists" {
  set_flag "auto_verify_enabled" "true"
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "exits silently when tasks directory missing" {
  set_flag "auto_verify_enabled" "true"
  # Ensure no tasks/ dir exists
  [ ! -d "$TEST_PROJECT_DIR/tasks" ]
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

# ── All items complete — exits silently ──────────────────────────────────────

@test "exits silently when all items are checked" {
  set_flag "auto_verify_enabled" "true"
  create_todo 5 0
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "exits silently when todo.md is empty" {
  set_flag "auto_verify_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  : > "$TEST_PROJECT_DIR/tasks/todo.md"
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

# ── Unchecked items — emits stopReason ───────────────────────────────────────

@test "emits stopReason when unchecked items exist" {
  set_flag "auto_verify_enabled" "true"
  create_todo 2 3
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
  echo "$result" | jq -e '.stopReason' >/dev/null
}

@test "stopReason includes correct checked/total count" {
  set_flag "auto_verify_enabled" "true"
  create_todo 2 3
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"2/5"* ]]
}

@test "stopReason includes unchecked count" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 4
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"4 unchecked"* ]]
}

@test "stopReason mentions auto-verify" {
  set_flag "auto_verify_enabled" "true"
  create_todo 0 2
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"auto-verify"* ]]
}

# ── Test run status ──────────────────────────────────────────────────────────

@test "reports tests NOT RUN when no marker file exists" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 1
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"NOT RUN"* ]]
}

@test "reports test run timestamp when marker file exists" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 1
  echo "2026-03-26T10:00:00Z" > "$TEST_PROJECT_DIR/.agentops/tests-ran"
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"ran at"* ]]
}

# ── Enforcement mode — continue field ────────────────────────────────────────

@test "continue is true in advisory mode (default)" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 2
  result=$(run_hook "$(stop_event)")
  cont=$(echo "$result" | jq -r '.continue')
  [ "$cont" = "true" ]
}

@test "continue is false in blocking mode" {
  set_flag "auto_verify_enabled" "true"
  set_flag "enforcement_mode" "blocking"
  create_todo 1 2
  result=$(run_hook "$(stop_event)")
  cont=$(echo "$result" | jq -r '.continue')
  [ "$cont" = "false" ]
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles todo.md with only unchecked items" {
  set_flag "auto_verify_enabled" "true"
  create_todo 0 3
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"0/3"* ]]
}

@test "handles single unchecked item" {
  set_flag "auto_verify_enabled" "true"
  create_todo 0 1
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  [[ "$reason" == *"0/1"* ]]
  [[ "$reason" == *"1 unchecked"* ]]
}

@test "handles indented todo items" {
  set_flag "auto_verify_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  cat > "$TEST_PROJECT_DIR/tasks/todo.md" <<'EOF'
  - [x] Indented checked item
  - [ ] Indented unchecked item
- [x] Normal checked item
EOF
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  # 2 checked, 1 unchecked = 2/3
  [[ "$reason" == *"2/3"* ]]
}

@test "ignores non-checkbox lines in todo.md" {
  set_flag "auto_verify_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  cat > "$TEST_PROJECT_DIR/tasks/todo.md" <<'EOF'
# Task List
Some description text.

- [x] Done item
- [ ] Pending item
- Regular list item (not a checkbox)
EOF
  result=$(run_hook "$(stop_event)")
  reason=$(echo "$result" | jq -r '.stopReason')
  # 1 checked, 1 unchecked = 1/2
  [[ "$reason" == *"1/2"* ]]
}

@test "valid JSON output structure" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 2
  result=$(run_hook "$(stop_event)")
  # Must be valid JSON with required keys
  echo "$result" | jq -e '.stopReason' >/dev/null
  echo "$result" | jq -e '.continue' >/dev/null
}

@test "empty input does not crash the hook" {
  set_flag "auto_verify_enabled" "true"
  create_todo 1 1
  mkdir -p "$TEST_PROJECT_DIR/empty"
  cd "$TEST_PROJECT_DIR/empty"
  run bash "$HOOKS_DIR/auto-verify.sh" <<< '{}'
  # With empty cwd, hook uses "." — no todo.md here, so it should exit successfully and silently
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}
