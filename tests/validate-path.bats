#!/usr/bin/env bats
# Tests for hooks/validate-path.sh

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Hard-deny rules ──────────────────────────────────────────────────────────

@test "Rule 1: blocks relative paths" {
  result=$(file_tool_input "Read" "relative/path.txt" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "deny" ]
  [[ "$(get_reason "$result")" == *"absolute"* ]]
}

@test "Rule 2: blocks path traversal" {
  result=$(file_tool_input "Read" "/home/user/../../../etc/shadow" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "deny" ]
  [[ "$(get_reason "$result")" == *"traversal"* ]]
}

@test "Rule 3: blocks paths exceeding 1024 chars" {
  LONG_PATH="/$(printf 'a%.0s' {1..1025})"
  result=$(file_tool_input "Read" "$LONG_PATH" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "deny" ]
  [[ "$(get_reason "$result")" == *"1024"* ]]
}

@test "Rule 4: blocks Write to .agentops/ (protected)" {
  result=$(file_tool_input "Write" "$TEST_PROJECT_DIR/.agentops/audit.jsonl" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "deny" ]
  [[ "$(get_reason "$result")" == *"protected"* ]]
}

@test "Rule 4: allows Write to .agentops/flags.json (writable state)" {
  result=$(file_tool_input "Write" "$TEST_PROJECT_DIR/.agentops/flags.json" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" != "deny" ]
}

@test "Rule 4: allows Edit to tasks/lessons.md (whitelisted writable state)" {
  result=$(file_tool_input "Edit" "$TEST_PROJECT_DIR/tasks/lessons.md" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" != "deny" ]
}

@test "Rule 4: allows Read of .agentops/ (not write-protected)" {
  result=$(file_tool_input "Read" "$TEST_PROJECT_DIR/.agentops/audit.jsonl" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" != "deny" ]
}

# ── Soft rules ────────────────────────────────────────────────────────────────

@test "Rule 5: flags /etc access" {
  result=$(file_tool_input "Read" "/etc/passwd" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "ask" ]
  [[ "$(get_reason "$result")" == *"system directory"* ]]
}

@test "Rule 5: flags /proc access" {
  result=$(file_tool_input "Read" "/proc/1/status" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "ask" ]
}

@test "Rule 6: flags .ssh directory" {
  result=$(file_tool_input "Read" "/home/user/.ssh/id_rsa" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "ask" ]
  [[ "$(get_reason "$result")" == *"sensitive dotfile"* ]]
}

@test "Rule 6: flags .aws credentials" {
  result=$(file_tool_input "Read" "/home/user/.aws/credentials" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "ask" ]
}

# ── Safe paths pass through ──────────────────────────────────────────────────

@test "allows Read of normal project file" {
  result=$(file_tool_input "Read" "$TEST_PROJECT_DIR/src/app.ts" | bash "$HOOKS_DIR/validate-path.sh")
  [ -z "$result" ]
}

@test "allows Write to normal project file" {
  result=$(file_tool_input "Write" "$TEST_PROJECT_DIR/src/app.ts" | bash "$HOOKS_DIR/validate-path.sh")
  [ -z "$result" ]
}

@test "allows Glob in project directory" {
  result=$(search_tool_input "Glob" "$TEST_PROJECT_DIR/src" | bash "$HOOKS_DIR/validate-path.sh")
  [ -z "$result" ]
}

# ── Feature flag disable ─────────────────────────────────────────────────────

@test "exits silently when path_validation_enabled is false" {
  set_flag "path_validation_enabled" "false"
  result=$(file_tool_input "Read" "/etc/shadow" | bash "$HOOKS_DIR/validate-path.sh")
  [ -z "$result" ]
}

# ── Enforcement mode ─────────────────────────────────────────────────────────

@test "soft rules return deny in blocking mode" {
  set_flag "enforcement_mode" "blocking"
  result=$(file_tool_input "Read" "/etc/passwd" | bash "$HOOKS_DIR/validate-path.sh")
  [ "$(get_decision "$result")" = "deny" ]
}
