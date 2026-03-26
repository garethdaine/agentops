#!/usr/bin/env bats
# Tests for hooks/auto-lesson.sh — PostToolUseFailure hook that prompts
# lesson capture when a tool fails unexpectedly.

load test-helpers

setup() {
  setup_project_dir
  set_flag "auto_lesson_enabled" "true"
}

teardown() {
  teardown_project_dir
}

# ── Helper: build PostToolUseFailure JSON ────────────────────────────────────

failure_event() {
  local TOOL="$1"
  local ERROR="$2"
  jq -nc --arg tool "$TOOL" --arg err "$ERROR" '{
    hook_event: "PostToolUseFailure",
    tool_name: $tool,
    tool_result: $err,
    cwd: (env.TEST_PROJECT_DIR // ".")
  }'
}

failure_event_with_error_field() {
  local TOOL="$1"
  local ERROR="$2"
  jq -nc --arg tool "$TOOL" --arg err "$ERROR" '{
    hook_event: "PostToolUseFailure",
    tool_name: $tool,
    error: $err,
    cwd: (env.TEST_PROJECT_DIR // ".")
  }'
}

bash_failure_event() {
  local COMMAND="$1"
  local ERROR="$2"
  jq -nc --arg cmd "$COMMAND" --arg err "$ERROR" '{
    hook_event: "PostToolUseFailure",
    tool_name: "Bash",
    tool_input: { command: $cmd },
    tool_result: $err,
    cwd: (env.TEST_PROJECT_DIR // ".")
  }'
}

run_hook() {
  echo "$1" | bash "$HOOKS_DIR/auto-lesson.sh"
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when auto_lesson_enabled is false" {
  set_flag "auto_lesson_enabled" "false"
  result=$(run_hook "$(failure_event "Bash" "command not found: foo")")
  [ -z "$result" ]
}

@test "produces output when auto_lesson_enabled is true" {
  result=$(run_hook "$(failure_event "Bash" "command not found: foo")")
  [ -n "$result" ]
}

# ── System message output ───────────────────────────────────────────────────

@test "emits systemMessage JSON on tool failure" {
  result=$(run_hook "$(failure_event "Bash" "exit code 1")")
  echo "$result" | jq -e '.systemMessage' >/dev/null
}

@test "systemMessage mentions the tool name" {
  result=$(run_hook "$(failure_event "Write" "permission denied")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"Write"* ]]
}

@test "systemMessage includes error text" {
  result=$(run_hook "$(failure_event "Edit" "file is read-only")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"file is read-only"* ]]
}

@test "systemMessage mentions agentops:lesson command" {
  result=$(run_hook "$(failure_event "Bash" "something broke")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"/agentops:lesson"* ]]
}

@test "reads error from .error field when .tool_result is absent" {
  result=$(run_hook "$(failure_event_with_error_field "Bash" "network timeout")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"network timeout"* ]]
}

# ── Benign failure filtering (Read/Glob) ─────────────────────────────────────

@test "skips Read failure with 'does not exist'" {
  result=$(run_hook "$(failure_event "Read" "File does not exist: /tmp/missing.txt")")
  [ -z "$result" ]
}

@test "skips Read failure with 'no such file'" {
  result=$(run_hook "$(failure_event "Read" "No such file or directory")")
  [ -z "$result" ]
}

@test "skips Read failure with 'not found'" {
  result=$(run_hook "$(failure_event "Read" "File not found")")
  [ -z "$result" ]
}

@test "skips Glob failure with 'no matches'" {
  result=$(run_hook "$(failure_event "Glob" "No matches found for pattern")")
  [ -z "$result" ]
}

@test "skips Glob failure with 'does not exist'" {
  result=$(run_hook "$(failure_event "Glob" "Path does not exist")")
  [ -z "$result" ]
}

@test "does not skip Read failure with other errors" {
  result=$(run_hook "$(failure_event "Read" "permission denied")")
  [ -n "$result" ]
  echo "$result" | jq -e '.systemMessage' >/dev/null
}

@test "does not skip Glob failure with other errors" {
  result=$(run_hook "$(failure_event "Glob" "invalid pattern syntax")")
  [ -n "$result" ]
  echo "$result" | jq -e '.systemMessage' >/dev/null
}

# ── Infinite loop prevention (Bash lesson operations) ────────────────────────

@test "skips Bash failure when command references lessons." {
  result=$(run_hook "$(bash_failure_event "cat tasks/lessons.md" "file not found")")
  [ -z "$result" ]
}

@test "skips Bash failure when command references /agentops:lesson" {
  result=$(run_hook "$(bash_failure_event "echo /agentops:lesson" "error")")
  [ -z "$result" ]
}

@test "skips Bash failure when command references lesson learned" {
  result=$(run_hook "$(bash_failure_event "echo lesson learned from failure" "error")")
  [ -z "$result" ]
}

@test "does not skip Bash failure for unrelated commands" {
  result=$(run_hook "$(bash_failure_event "npm test" "exit code 1")")
  [ -n "$result" ]
  echo "$result" | jq -e '.systemMessage' >/dev/null
}

# ── Error truncation ────────────────────────────────────────────────────────

@test "truncates long error messages to 300 characters" {
  long_error=$(python3 -c "print('x' * 500)")
  result=$(run_hook "$(failure_event "Bash" "$long_error")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  # The error portion in the message should be truncated
  # The full message includes prefix text, so check that the error part is ≤300 chars
  error_in_msg=$(echo "$msg" | sed 's/.*Error: //')
  [ ${#error_in_msg} -le 300 ]
}

# ── Tool coverage ────────────────────────────────────────────────────────────

@test "handles Write tool failures" {
  result=$(run_hook "$(failure_event "Write" "disk full")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"Write"* ]]
  [[ "$msg" == *"disk full"* ]]
}

@test "handles Edit tool failures" {
  result=$(run_hook "$(failure_event "Edit" "old_string not found")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"Edit"* ]]
}

@test "handles WebFetch tool failures" {
  result=$(run_hook "$(failure_event "WebFetch" "connection refused")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"WebFetch"* ]]
}

@test "handles mcp tool failures" {
  result=$(run_hook "$(failure_event "mcp__server__tool" "timeout")")
  msg=$(echo "$result" | jq -r '.systemMessage')
  [[ "$msg" == *"mcp__server__tool"* ]]
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles empty error gracefully" {
  result=$(run_hook "$(failure_event "Bash" "")")
  # Should still emit a systemMessage even with empty error
  echo "$result" | jq -e '.systemMessage' >/dev/null
}

@test "handles missing tool_name gracefully" {
  input=$(jq -nc '{hook_event: "PostToolUseFailure", tool_result: "some error"}')
  result=$(echo "$input" | bash "$HOOKS_DIR/auto-lesson.sh")
  # Should exit cleanly (no crash), output may be empty or minimal
  true  # If we got here without crash, the test passes
}

@test "benign filter is case-insensitive" {
  result=$(run_hook "$(failure_event "Read" "FILE DOES NOT EXIST")")
  [ -z "$result" ]
}
