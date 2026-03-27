#!/usr/bin/env bats
# Tests for hooks/compliance-gate.sh — Stop hook that enforces plan, verification,
# and test gates before allowing a session to finish.

load test-helpers

setup() {
  setup_project_dir
  # All gates default to true; disable all by default — each test enables what it needs
  set_flag "plan_gate_enabled" "false"
  set_flag "verification_gate_enabled" "false"
  set_flag "test_gate_enabled" "false"
}

teardown() {
  teardown_project_dir
}

# ── Helper: build stop-event JSON input ──────────────────────────────────────

stop_event() {
  jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "Stop",
    cwd: $cwd,
    permission_mode: "default"
  }'
}

run_hook() {
  echo "$1" | bash "$HOOKS_DIR/compliance-gate.sh"
}

# Seed modified-files.txt with N unique file entries
seed_modified_files() {
  local COUNT="$1"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  for i in $(seq 1 "$COUNT"); do
    echo "src/file-${i}.ts" >> "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  done
}

# Create a tasks/todo.md with given content (interprets \n as newlines)
create_todo() {
  local CONTENT="$1"
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  printf '%b\n' "$CONTENT" > "$TEST_PROJECT_DIR/tasks/todo.md"
}

# Mark tests as having been run
mark_tests_ran() {
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch "$TEST_PROJECT_DIR/.agentops/tests-ran"
}

# ── No output when all gates disabled ────────────────────────────────────────

@test "exits silently when all gates are disabled" {
  seed_modified_files 10
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Plan gate tests ─────────────────────────────────────────────────────────

@test "plan gate: silent when disabled even if other gates trigger" {
  # Enable verification + test gates so they can fire; only plan gate is disabled
  set_flag "verification_gate_enabled" "true"
  set_flag "test_gate_enabled" "true"
  seed_modified_files 5
  create_todo "- [ ] pending"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  # Other gates fire, but plan gate does not
  echo "$output" | grep -q "Verification gate"
  echo "$output" | grep -q "Test gate"
  ! echo "$output" | grep -q "Plan gate"
}

@test "plan gate: silent when no modified-files tracker exists" {
  set_flag "plan_gate_enabled" "true"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "plan gate: silent when file count below threshold" {
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 2
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "plan gate: triggers when files >= threshold and no todo.md" {
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 3
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.stopReason' >/dev/null
  echo "$output" | grep -q "Plan gate"
  echo "$output" | grep -q "no plan in tasks/todo.md"
}

@test "plan gate: triggers when todo.md exists but is empty" {
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 5
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  touch "$TEST_PROJECT_DIR/tasks/todo.md"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.stopReason' >/dev/null
  echo "$output" | grep -q "Plan gate"
}

@test "plan gate: silent when todo.md has content" {
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 5
  create_todo "# Plan\n- Step 1\n- Step 2"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "plan gate: counts unique files only (dedup via sort -u)" {
  set_flag "plan_gate_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  # Write 4 entries but only 2 unique
  printf "src/a.ts\nsrc/b.ts\nsrc/a.ts\nsrc/b.ts\n" > "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  # 2 unique < threshold 3, so no output
  [ -z "$output" ]
}

@test "plan gate: includes file count in stop message" {
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 7
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "7 files modified"
}

# ── Verification gate tests ─────────────────────────────────────────────────

@test "verification gate: silent when disabled" {
  create_todo "- [ ] unchecked item"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "verification gate: silent when no todo.md exists" {
  set_flag "verification_gate_enabled" "true"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "verification gate: triggers when unchecked items exist" {
  set_flag "verification_gate_enabled" "true"
  create_todo "- [x] done\n- [ ] pending\n- [ ] also pending"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.stopReason' >/dev/null
  echo "$output" | grep -q "Verification gate"
  echo "$output" | grep -q "unchecked items"
}

@test "verification gate: silent when all items checked" {
  set_flag "verification_gate_enabled" "true"
  create_todo "- [x] done\n- [x] also done"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "verification gate: counts unchecked items correctly" {
  set_flag "verification_gate_enabled" "true"
  create_todo "- [ ] one\n- [ ] two\n- [x] three\n- [ ] four"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "3 unchecked items"
}

# ── Test gate tests ──────────────────────────────────────────────────────────

@test "test gate: silent when disabled even if other gates trigger" {
  # Enable verification gate so it fires; only test gate is disabled
  set_flag "verification_gate_enabled" "true"
  seed_modified_files 10
  create_todo "- [ ] pending\n- [x] done"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Verification gate"
  ! echo "$output" | grep -q "Test gate"
}

@test "test gate: silent when no modified-files tracker exists" {
  set_flag "test_gate_enabled" "true"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "test gate: silent when tests-ran marker exists" {
  set_flag "test_gate_enabled" "true"
  seed_modified_files 5
  mark_tests_ran
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "test gate: triggers when files >= threshold and no tests-ran marker" {
  set_flag "test_gate_enabled" "true"
  seed_modified_files 3
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.stopReason' >/dev/null
  echo "$output" | grep -q "Test gate"
  echo "$output" | grep -q "no tests were run"
}

@test "test gate: silent when file count below threshold" {
  set_flag "test_gate_enabled" "true"
  seed_modified_files 2
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "test gate: includes file count in stop message" {
  set_flag "test_gate_enabled" "true"
  seed_modified_files 4
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "4 files modified"
}

# ── Multi-gate combination tests ────────────────────────────────────────────

@test "verification and test gates trigger together" {
  set_flag "verification_gate_enabled" "true"
  set_flag "test_gate_enabled" "true"
  seed_modified_files 5
  create_todo "- [ ] unchecked item"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Verification gate"
  echo "$output" | grep -q "Test gate"
}

@test "plan and test gates trigger when no todo.md and many files" {
  set_flag "plan_gate_enabled" "true"
  set_flag "test_gate_enabled" "true"
  seed_modified_files 5
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Plan gate"
  echo "$output" | grep -q "Test gate"
}

@test "plan and verification gates are mutually exclusive" {
  set_flag "plan_gate_enabled" "true"
  set_flag "verification_gate_enabled" "true"
  set_flag "test_gate_enabled" "true"
  seed_modified_files 5
  # No todo.md → plan gate triggers, verification gate does not (no todo to check)
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Plan gate"
  ! echo "$output" | grep -q "Verification gate"
  echo "$output" | grep -q "Test gate"
}

@test "all gates pass — no output" {
  set_flag "plan_gate_enabled" "true"
  set_flag "verification_gate_enabled" "true"
  set_flag "test_gate_enabled" "true"
  seed_modified_files 5
  create_todo "- [x] all done"
  mark_tests_ran
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── JSON output shape ───────────────────────────────────────────────────────

@test "output is valid JSON with stopReason and continue fields" {
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 5
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.stopReason' >/dev/null
  echo "$output" | jq -e 'has("continue")' >/dev/null
}

@test "stopReason starts with AgentOps compliance prefix" {
  set_flag "test_gate_enabled" "true"
  seed_modified_files 3
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  local REASON
  REASON=$(echo "$output" | jq -r '.stopReason')
  [[ "$REASON" == "AgentOps compliance:"* ]]
}

@test "stopReason ends with address instruction" {
  set_flag "test_gate_enabled" "true"
  seed_modified_files 3
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  local REASON
  REASON=$(echo "$output" | jq -r '.stopReason')
  [[ "$REASON" == *"Address these before finishing." ]]
}

# ── Enforcement mode ────────────────────────────────────────────────────────

@test "continue is true in advisory mode" {
  set_flag "enforcement_mode" "advisory"
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 5
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  local CONT
  CONT=$(echo "$output" | jq -r '.continue')
  [ "$CONT" = "true" ]
}

@test "continue is false in blocking mode" {
  set_flag "enforcement_mode" "blocking"
  set_flag "plan_gate_enabled" "true"
  seed_modified_files 5
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  local CONT
  CONT=$(echo "$output" | jq -r '.continue')
  [ "$CONT" = "false" ]
}

# ── Edge cases ──────────────────────────────────────────────────────────────

@test "handles empty modified-files.txt gracefully" {
  set_flag "plan_gate_enabled" "true"
  set_flag "test_gate_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "threshold is exactly 3 (default AGENTOPS_PLAN_THRESHOLD)" {
  set_flag "plan_gate_enabled" "true"
  # 2 files — below threshold
  seed_modified_files 2
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]

  # 3 files — at threshold
  seed_modified_files 3
  run run_hook "$(stop_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Plan gate"
}
