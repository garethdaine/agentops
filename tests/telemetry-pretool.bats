#!/usr/bin/env bats

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

@test "PreToolUse event is emitted to telemetry.jsonl" {
  echo '{"tool_name":"Bash","hook_event_name":"PreToolUse","session_id":"test-123","cwd":"/tmp"}' \
    | bash hooks/telemetry.sh
  result=$(jq -r '.event' "$TEST_PROJECT_DIR/.agentops/telemetry.jsonl")
  [ "$result" = "PreToolUse" ]
}

@test "PreToolUse event includes cwd field" {
  echo '{"tool_name":"Bash","hook_event_name":"PreToolUse","session_id":"test-123","cwd":"/tmp/myproject"}' \
    | bash hooks/telemetry.sh
  result=$(jq -r '.cwd' "$TEST_PROJECT_DIR/.agentops/telemetry.jsonl")
  [ "$result" = "/tmp/myproject" ]
}

@test "PreToolUse event includes session and tool fields" {
  echo '{"tool_name":"Read","hook_event_name":"PreToolUse","session_id":"sess-456","cwd":"/tmp"}' \
    | bash hooks/telemetry.sh
  session=$(jq -r '.session' "$TEST_PROJECT_DIR/.agentops/telemetry.jsonl")
  tool=$(jq -r '.tool' "$TEST_PROJECT_DIR/.agentops/telemetry.jsonl")
  [ "$session" = "sess-456" ]
  [ "$tool" = "Read" ]
}

@test "PostToolUse events still work after PreToolUse addition" {
  echo '{"tool_name":"Bash","hook_event_name":"PostToolUse","session_id":"test-789","cwd":"/tmp"}' \
    | bash hooks/telemetry.sh
  result=$(jq -r '.event' "$TEST_PROJECT_DIR/.agentops/telemetry.jsonl")
  [ "$result" = "PostToolUse" ]
}
