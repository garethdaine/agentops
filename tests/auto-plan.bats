#!/usr/bin/env bats
# Tests for hooks/auto-plan.sh
#
# auto-plan.sh is a PreToolUse hook on Write|Edit that enforces planning:
#   - Gates on auto_plan_enabled feature flag
#   - Exits silently on bypass permission mode
#   - Only triggers on Write and Edit tools
#   - Allows writes when tasks/todo.md exists and is current
#   - Tracks modified files in .agentops/modified-files.txt
#   - Triggers planning prompt when file count >= threshold (3) with no plan
#   - Detects stale plans (todo.md older than session-start marker)

load test-helpers

setup() {
  setup_project_dir
  # auto-plan reads cwd from JSON input — set it explicitly
  export TEST_CWD="$TEST_PROJECT_DIR"
}

teardown() {
  teardown_project_dir
}

# ── Helper: build Write/Edit input with cwd ──────────────────────────────────

write_input() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" --arg cwd "$TEST_CWD" '{
    hook_event: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: $fp },
    cwd: $cwd,
    permission_mode: "default"
  }'
}

edit_input() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" --arg cwd "$TEST_CWD" '{
    hook_event: "PreToolUse",
    tool_name: "Edit",
    tool_input: { file_path: $fp },
    cwd: $cwd,
    permission_mode: "default"
  }'
}

non_write_input() {
  local TOOL="$1"
  jq -nc --arg tool "$TOOL" --arg cwd "$TEST_CWD" '{
    hook_event: "PreToolUse",
    tool_name: $tool,
    tool_input: { file_path: "/some/file.txt" },
    cwd: $cwd,
    permission_mode: "default"
  }'
}

bypass_write_input() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" --arg cwd "$TEST_CWD" '{
    hook_event: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: $fp },
    cwd: $cwd,
    permission_mode: "bypassPermissions"
  }'
}

create_plan() {
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  echo "- [ ] Step 1: do something" > "$TEST_PROJECT_DIR/tasks/todo.md"
}

create_stale_plan() {
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  echo "- [ ] Old plan" > "$TEST_PROJECT_DIR/tasks/todo.md"
  # Backdate the plan file
  touch -t 202601010000 "$TEST_PROJECT_DIR/tasks/todo.md"
  # Create a session marker that is newer than the plan
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch "$TEST_PROJECT_DIR/.agentops/session-start"
}

create_session_marker() {
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch "$TEST_PROJECT_DIR/.agentops/session-start"
}

seed_tracker() {
  local COUNT="${1:-0}"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  local TRACKER="$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  > "$TRACKER"
  for i in $(seq 1 "$COUNT"); do
    echo "/file${i}.ts" >> "$TRACKER"
  done
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when auto_plan_enabled is false" {
  set_flag "auto_plan_enabled" "false"
  # Seed tracker so the hook would normally emit a decision
  seed_tracker 3
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "runs when auto_plan_enabled is true" {
  set_flag "auto_plan_enabled" "true"
  # With tracker seeded and no plan, auto-plan should emit a decision
  seed_tracker 3
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
}

@test "runs when auto_plan_enabled is not set (defaults to true)" {
  # Default behavior should match auto_plan_enabled=true
  seed_tracker 3
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
}

# ── Bypass permission mode ───────────────────────────────────────────────────

@test "exits silently on bypass permission mode" {
  seed_tracker 5
  result=$(bypass_write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

# ── Tool filtering ───────────────────────────────────────────────────────────

@test "only triggers on Write tool" {
  seed_tracker 5
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
  [[ "$(get_reason "$result")" == *"auto-plan"* ]]
}

@test "only triggers on Edit tool" {
  seed_tracker 5
  result=$(edit_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
  [[ "$(get_reason "$result")" == *"auto-plan"* ]]
}

@test "exits silently for Read tool" {
  seed_tracker 5
  result=$(non_write_input "Read" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "exits silently for Bash tool" {
  seed_tracker 5
  result=$(non_write_input "Bash" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "exits silently for Glob tool" {
  seed_tracker 5
  result=$(non_write_input "Glob" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

# ── Plan exists and is current ───────────────────────────────────────────────

@test "allows write when tasks/todo.md exists and is current" {
  create_plan
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "tracks file in modified-files.txt when plan exists" {
  create_plan
  write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  TRACKER="$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  [ -f "$TRACKER" ]
  grep -q "/src/app.ts" "$TRACKER"
}

@test "tracks multiple files across writes" {
  create_plan
  write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  edit_input "/src/utils.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  write_input "/src/index.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  TRACKER="$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  [ "$(wc -l < "$TRACKER" | tr -d ' ')" -eq 3 ]
}

# ── Stale plan detection ────────────────────────────────────────────────────

@test "treats plan as stale when todo.md is older than session-start" {
  create_stale_plan
  seed_tracker 3
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
  [[ "$(get_reason "$result")" == *"stale"* ]]
}

@test "treats plan as current when no session-start marker exists" {
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  echo "- [ ] Step 1" > "$TEST_PROJECT_DIR/tasks/todo.md"
  # No session-start marker — plan is treated as current
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "treats plan as current when todo.md is newer than session-start" {
  # Use explicit timestamps for determinism instead of sleep
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch -t 202601010000 "$TEST_PROJECT_DIR/.agentops/session-start"
  mkdir -p "$TEST_PROJECT_DIR/tasks"
  echo "- [ ] Step 1: do something" > "$TEST_PROJECT_DIR/tasks/todo.md"
  touch -t 202601020000 "$TEST_PROJECT_DIR/tasks/todo.md"
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

# ── Threshold behavior ──────────────────────────────────────────────────────

@test "allows writes below threshold without plan" {
  # Threshold is 3 (from patterns-lib.sh). With 0 tracked + 1 current = 1 < 3
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "allows writes at threshold minus one without plan" {
  # 1 tracked + 1 current = 2 < 3
  seed_tracker 1
  result=$(write_input "/src/new.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

@test "blocks at threshold without plan" {
  # 2 tracked + 1 current = 3 >= 3
  seed_tracker 2
  result=$(write_input "/src/third.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
  [[ "$(get_reason "$result")" == *"no plan exists"* ]]
}

@test "blocks above threshold without plan" {
  # 5 tracked + 1 current = 6 >= 3
  seed_tracker 5
  result=$(write_input "/src/sixth.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -n "$result" ]
  [[ "$(get_reason "$result")" == *"auto-plan"* ]]
}

@test "includes file count in blocking reason" {
  seed_tracker 4
  result=$(write_input "/src/fifth.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  reason="$(get_reason "$result")"
  [[ "$reason" == *"5 files modified"* ]]
}

# ── Enforcement action ──────────────────────────────────────────────────────

@test "uses ask action in advisory mode (default)" {
  seed_tracker 5
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ "$(get_decision "$result")" = "ask" ]
}

@test "uses deny action in blocking mode" {
  set_flag "enforcement_mode" "blocking"
  seed_tracker 5
  result=$(write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ "$(get_decision "$result")" = "deny" ]
}

# ── No tracking on blocked attempts ────────────────────────────────────────

@test "does not track file when write is blocked" {
  seed_tracker 3
  write_input "/src/blocked.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  TRACKER="$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  ! grep -q "/src/blocked.ts" "$TRACKER"
}

# ── Deduplication in tracker ────────────────────────────────────────────────

@test "tracker counts unique files for threshold" {
  create_plan
  # Write same file multiple times — tracker will have duplicates
  write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null
  write_input "/src/app.ts" | bash "$HOOKS_DIR/auto-plan.sh" > /dev/null

  # Now remove plan and add one more unique file
  rm "$TEST_PROJECT_DIR/tasks/todo.md"

  # Tracker has 3 entries but only 1 unique — count should be 1 + 1 (current) = 2 < 3
  result=$(write_input "/src/other.ts" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}

# ── Empty file_path handling ────────────────────────────────────────────────

@test "exits silently when file_path is empty" {
  seed_tracker 5
  INPUT=$(jq -nc --arg cwd "$TEST_CWD" '{
    hook_event: "PreToolUse",
    tool_name: "Write",
    tool_input: {},
    cwd: $cwd,
    permission_mode: "default"
  }')
  result=$(echo "$INPUT" | bash "$HOOKS_DIR/auto-plan.sh")
  [ -z "$result" ]
}
