#!/usr/bin/env bats
# Tests for hooks/auto-test.sh — PostToolUse hook that nudges test runs
# after 3+ source code files are modified.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: build PostToolUse JSON for Write/Edit events ─────────────────────

write_event() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: $fp },
    cwd: $cwd
  }'
}

edit_event() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUse",
    tool_name: "Edit",
    tool_input: { file_path: $fp },
    cwd: $cwd
  }'
}

other_tool_event() {
  local TOOL="$1"
  local FILE_PATH="$2"
  jq -nc --arg tool "$TOOL" --arg fp "$FILE_PATH" --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUse",
    tool_name: $tool,
    tool_input: { file_path: $fp },
    cwd: $cwd
  }'
}

# Run the hook with a given event, capturing output
run_hook() {
  echo "$1" | bash "$HOOKS_DIR/auto-test.sh"
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when auto_test_enabled is false" {
  set_flag "auto_test_enabled" "false"
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
}

@test "runs when auto_test_enabled is true" {
  set_flag "auto_test_enabled" "true"
  # Single file write — no nudge yet, but hook should run without error
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
  # Verify the file was tracked
  [ -f "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt" ]
}

# ── Tool filtering ───────────────────────────────────────────────────────────

@test "ignores non-Write/Edit tools" {
  set_flag "auto_test_enabled" "true"
  result=$(run_hook "$(other_tool_event "Read" "src/app.ts")")
  [ -z "$result" ]
  # Should NOT have created tracking file
  [ ! -f "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt" ]
}

@test "ignores Bash tool events" {
  set_flag "auto_test_enabled" "true"
  result=$(run_hook "$(other_tool_event "Bash" "src/app.ts")")
  [ -z "$result" ]
  [ ! -f "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt" ]
}

@test "tracks Write events" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "src/foo.ts")" >/dev/null
  grep -q "src/foo.ts" "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt"
}

@test "tracks Edit events" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(edit_event "src/bar.py")" >/dev/null
  grep -q "src/bar.py" "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt"
}

# ── File extension filtering ─────────────────────────────────────────────────

@test "ignores non-source-code files (markdown)" {
  set_flag "auto_test_enabled" "true"
  result=$(run_hook "$(write_event "docs/README.md")")
  [ -z "$result" ]
  [ ! -f "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt" ]
}

@test "ignores config files (json)" {
  set_flag "auto_test_enabled" "true"
  result=$(run_hook "$(write_event "package.json")")
  [ -z "$result" ]
  [ ! -f "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt" ]
}

@test "ignores yaml files" {
  set_flag "auto_test_enabled" "true"
  result=$(run_hook "$(write_event ".github/workflows/ci.yml")")
  [ -z "$result" ]
  [ ! -f "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt" ]
}

@test "tracks .ts files" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "src/index.ts")" >/dev/null
  grep -q "src/index.ts" "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt"
}

@test "tracks .py files" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "app/main.py")" >/dev/null
  grep -q "app/main.py" "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt"
}

@test "tracks .go files" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "cmd/server.go")" >/dev/null
  grep -q "cmd/server.go" "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt"
}

@test "tracks .sh files" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "scripts/deploy.sh")" >/dev/null
  grep -q "scripts/deploy.sh" "$TEST_PROJECT_DIR/.agentops/code-files-since-test.txt"
}

# ── Threshold behavior ───────────────────────────────────────────────────────

@test "no nudge emitted for fewer than 3 files" {
  set_flag "auto_test_enabled" "true"
  result1=$(run_hook "$(write_event "src/a.ts")")
  result2=$(run_hook "$(write_event "src/b.ts")")
  [ -z "$result1" ]
  [ -z "$result2" ]
}

@test "nudge emitted on 3rd unique source file" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "src/a.ts")" >/dev/null
  run_hook "$(write_event "src/b.ts")" >/dev/null
  result=$(run_hook "$(write_event "src/c.ts")")
  [ -n "$result" ]
  echo "$result" | jq -e '.hookSpecificOutput.additionalContext' >/dev/null
  [[ "$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')" == *"auto-test"* ]]
}

@test "nudge mentions the file count" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "src/a.ts")" >/dev/null
  run_hook "$(write_event "src/b.ts")" >/dev/null
  result=$(run_hook "$(write_event "src/c.ts")")
  [[ "$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')" == *"3"* ]]
}

@test "nudge is only sent once" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "src/a.ts")" >/dev/null
  run_hook "$(write_event "src/b.ts")" >/dev/null
  run_hook "$(write_event "src/c.ts")" >/dev/null  # triggers nudge
  result=$(run_hook "$(write_event "src/d.ts")")    # 4th file — no second nudge
  [ -z "$result" ]
}

@test "duplicate file writes don't increment counter" {
  set_flag "auto_test_enabled" "true"
  run_hook "$(write_event "src/a.ts")" >/dev/null
  run_hook "$(write_event "src/a.ts")" >/dev/null  # same file again
  run_hook "$(write_event "src/b.ts")" >/dev/null
  result=$(run_hook "$(write_event "src/b.ts")")    # same file — still only 2 unique
  [ -z "$result" ]
}

# ── Reset behavior ───────────────────────────────────────────────────────────

@test "tracking resets after tests are detected as run" {
  set_flag "auto_test_enabled" "true"
  # Trigger nudge
  run_hook "$(write_event "src/a.ts")" >/dev/null
  run_hook "$(write_event "src/b.ts")" >/dev/null
  run_hook "$(write_event "src/c.ts")" >/dev/null

  # Simulate test run detected (tests-ran marker is newer than nudge)
  sleep 1
  date -u +%FT%TZ > "$TEST_PROJECT_DIR/.agentops/tests-ran"

  # Now write 2 more files — should not nudge (counter reset)
  result1=$(run_hook "$(write_event "src/d.ts")")
  result2=$(run_hook "$(write_event "src/e.ts")")
  [ -z "$result1" ]
  [ -z "$result2" ]
}

@test "nudge fires again after reset and 3 more files" {
  set_flag "auto_test_enabled" "true"
  # First cycle: trigger nudge
  run_hook "$(write_event "src/a.ts")" >/dev/null
  run_hook "$(write_event "src/b.ts")" >/dev/null
  run_hook "$(write_event "src/c.ts")" >/dev/null

  # Simulate test run
  sleep 1
  date -u +%FT%TZ > "$TEST_PROJECT_DIR/.agentops/tests-ran"

  # Second cycle: 3 more unique files
  run_hook "$(write_event "src/d.ts")" >/dev/null
  run_hook "$(write_event "src/e.ts")" >/dev/null
  result=$(run_hook "$(write_event "src/f.ts")")
  [ -n "$result" ]
  [[ "$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')" == *"auto-test"* ]]
}
