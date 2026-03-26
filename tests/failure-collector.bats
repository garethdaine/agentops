#!/usr/bin/env bats
# Tests for hooks/failure-collector.sh — PostToolUse hook that logs tool
# failures to .agentops/failures.jsonl with secret redaction.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: build a tool failure JSON input ──────────────────────────────────

failure_event() {
  local TOOL="${1:-Bash}"
  local ERROR="${2:-command not found}"
  local INPUT="${3:-ls /nonexistent}"
  local SESSION="${4:-sess-abc123}"
  jq -nc \
    --arg tool "$TOOL" \
    --arg err "$ERROR" \
    --arg inp "$INPUT" \
    --arg sess "$SESSION" \
    '{
      session_id: $sess,
      tool_name: $tool,
      tool_input: $inp,
      tool_result: $err
    }'
}

# Run the hook with a given event
run_hook() {
  echo "$1" | bash "$HOOKS_DIR/failure-collector.sh"
}

# ── Basic collection ─────────────────────────────────────────────────────────

@test "appends failure entry to failures.jsonl" {
  run_hook "$(failure_event)"
  [ -f "$TEST_PROJECT_DIR/.agentops/failures.jsonl" ]
  local COUNT
  COUNT=$(wc -l < "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  [ "$COUNT" -eq 1 ]
}

@test "multiple failures append separate lines" {
  run_hook "$(failure_event "Bash" "error 1")"
  run_hook "$(failure_event "Read" "error 2")"
  run_hook "$(failure_event "Write" "error 3")"
  local COUNT
  COUNT=$(wc -l < "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  [ "$COUNT" -eq 3 ]
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "output contains ts field" {
  run_hook "$(failure_event)"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  echo "$ENTRY" | jq -e '.ts' >/dev/null
}

@test "output contains session field" {
  run_hook "$(failure_event "Bash" "err" "cmd" "sess-xyz789")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local SESSION
  SESSION=$(echo "$ENTRY" | jq -r '.session')
  [ "$SESSION" = "sess-xyz789" ]
}

@test "output contains tool field" {
  run_hook "$(failure_event "Read" "not found")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local TOOL
  TOOL=$(echo "$ENTRY" | jq -r '.tool')
  [ "$TOOL" = "Read" ]
}

@test "output contains input field" {
  run_hook "$(failure_event "Bash" "err" "cat /etc/passwd")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  echo "$ENTRY" | jq -e '.input' >/dev/null
}

@test "output contains error field" {
  run_hook "$(failure_event "Bash" "segmentation fault")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local ERROR
  ERROR=$(echo "$ENTRY" | jq -r '.error')
  [[ "$ERROR" == *"segmentation fault"* ]]
}

@test "output is valid JSON" {
  run_hook "$(failure_event)"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  echo "$ENTRY" | jq . >/dev/null 2>&1
}

# ── Field extraction ─────────────────────────────────────────────────────────

@test "session defaults to unknown when missing" {
  local INPUT
  INPUT=$(jq -nc '{ tool_name: "Bash", tool_result: "err" }')
  run_hook "$INPUT"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local SESSION
  SESSION=$(echo "$ENTRY" | jq -r '.session')
  [ "$SESSION" = "unknown" ]
}

@test "tool defaults to unknown when missing" {
  local INPUT
  INPUT=$(jq -nc '{ session_id: "s1", tool_result: "err" }')
  run_hook "$INPUT"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local TOOL
  TOOL=$(echo "$ENTRY" | jq -r '.tool')
  [ "$TOOL" = "unknown" ]
}

@test "error falls back to error field when tool_result is missing" {
  local INPUT
  INPUT=$(jq -nc '{ session_id: "s1", tool_name: "Bash", error: "fallback error msg" }')
  run_hook "$INPUT"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local ERROR
  ERROR=$(echo "$ENTRY" | jq -r '.error')
  [[ "$ERROR" == *"fallback error msg"* ]]
}

# ── Secret redaction ─────────────────────────────────────────────────────────

@test "redacts API key patterns in tool_input" {
  run_hook "$(failure_event "Bash" "err" "curl -H API_KEY=sk-ant-abc123xyzABC456")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local INPUT_FIELD
  INPUT_FIELD=$(echo "$ENTRY" | jq -r '.input')
  [[ "$INPUT_FIELD" == *"[REDACTED]"* ]]
  [[ "$INPUT_FIELD" != *"sk-ant-abc123xyzABC456"* ]]
}

@test "redacts Bearer tokens in error field" {
  run_hook "$(failure_event "Bash" "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature1234567890")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local ERROR
  ERROR=$(echo "$ENTRY" | jq -r '.error')
  [[ "$ERROR" != *"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9"* ]]
}

@test "redacts GitHub token patterns in tool_input" {
  run_hook "$(failure_event "Bash" "err" "git clone https://ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk@github.com/repo")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local INPUT_FIELD
  INPUT_FIELD=$(echo "$ENTRY" | jq -r '.input')
  [[ "$INPUT_FIELD" != *"ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ"* ]]
}

@test "redacts PASSWORD= patterns in error" {
  run_hook "$(failure_event "Bash" "connection string: PASSWORD=hunter2secret")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local ERROR
  ERROR=$(echo "$ENTRY" | jq -r '.error')
  [[ "$ERROR" == *"[REDACTED]"* ]]
  [[ "$ERROR" != *"hunter2secret"* ]]
}

@test "preserves non-secret content in tool_input" {
  run_hook "$(failure_event "Bash" "err" "ls -la /home/user/projects")"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local INPUT_FIELD
  INPUT_FIELD=$(echo "$ENTRY" | jq -r '.input')
  [[ "$INPUT_FIELD" == *"/home/user/projects"* ]]
}

# ── Directory creation ───────────────────────────────────────────────────────

@test "creates .agentops directory if missing" {
  rm -rf "$TEST_PROJECT_DIR/.agentops"
  run_hook "$(failure_event)"
  [ -d "$TEST_PROJECT_DIR/.agentops" ]
  [ -f "$TEST_PROJECT_DIR/.agentops/failures.jsonl" ]
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles empty input gracefully" {
  run bash "$HOOKS_DIR/failure-collector.sh" < /dev/null
  # Should succeed without crashing
  [ "$status" -eq 0 ]
  # Should create a log entry (fields may be empty or defaulted)
  [ -f "$TEST_PROJECT_DIR/.agentops/failures.jsonl" ]
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  # Entry must be valid JSON
  echo "$ENTRY" | jq . >/dev/null 2>&1
}

@test "handles invalid JSON input gracefully" {
  result=$(echo "not json" | bash "$HOOKS_DIR/failure-collector.sh" 2>&1) || true
  # Should not crash, and should log an entry with defaulted fields.
  [ -f "$TEST_PROJECT_DIR/.agentops/failures.jsonl" ]

  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")

  local TOOL
  TOOL=$(echo "$ENTRY" | jq -r '.tool')
  [ "$TOOL" = "unknown" ]

  local SESSION
  SESSION=$(echo "$ENTRY" | jq -r '.session')
  [ "$SESSION" = "unknown" ]
}

@test "timestamp is in ISO 8601 UTC format" {
  run_hook "$(failure_event)"
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/failures.jsonl")
  local TS
  TS=$(echo "$ENTRY" | jq -r '.ts')
  # Should match YYYY-MM-DDTHH:MM:SSZ pattern
  [[ "$TS" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}
