#!/usr/bin/env bats
# Tests for hooks/evolve-gate.sh — PostToolUseFailure hook that nudges
# /agentops:evolve when unprocessed failures reach multiples of 5.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: build PostToolUseFailure JSON input ──────────────────────────────

failure_event() {
  jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUseFailure",
    tool_name: "Bash",
    tool_input: { command: "false" },
    cwd: $cwd,
    permission_mode: "default"
  }'
}

run_hook() {
  echo "$1" | bash "$HOOKS_DIR/evolve-gate.sh"
}

# Seed failures.jsonl with N failure entries
seed_failures() {
  local COUNT="$1"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  for i in $(seq 1 "$COUNT"); do
    echo "{\"ts\":\"2026-03-26T10:00:$(printf '%02d' "$i")Z\",\"tool\":\"Bash\",\"error\":\"fail $i\"}" \
      >> "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  done
}

# Seed feedback-history.jsonl marking timestamps as addressed
seed_feedback() {
  local TIMESTAMPS=("$@")
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/feedback-history.jsonl"
  for ts in "${TIMESTAMPS[@]}"; do
    echo "{\"addressed\":\"$ts\"}" >> "$TEST_PROJECT_DIR/.agentops/feedback-history.jsonl"
  done
}

# Set the evolve-batch-count file to a given value
set_nudge_counter() {
  local VALUE="$1"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  echo "$VALUE" > "$TEST_PROJECT_DIR/.agentops/evolve-batch-count"
}

# ── Flag gating ──────────────────────────────────────────────────────────────

@test "exits silently when auto_evolve_enabled is false" {
  set_flag "auto_evolve_enabled" "false"
  seed_failures 10
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "runs when auto_evolve_enabled is true" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -n "$output" ]
}

# ── Bypass handling ──────────────────────────────────────────────────────────

@test "exits silently in bypassPermissions mode" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 10
  local INPUT
  INPUT=$(jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUseFailure",
    tool_name: "Bash",
    tool_input: { command: "false" },
    cwd: $cwd,
    permission_mode: "bypassPermissions"
  }')
  run run_hook "$INPUT"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Threshold: below 5 unprocessed ───────────────────────────────────────────

@test "exits silently with 0 failures" {
  set_flag "auto_evolve_enabled" "true"
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "exits silently with 1 failure" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 1
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "exits silently with 4 failures" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 4
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Threshold: triggers at 5 ─────────────────────────────────────────────────

@test "nudges at exactly 5 unprocessed failures" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
  echo "$output" | grep -q '5 unprocessed failures'
}

@test "nudges at 10 unprocessed failures" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 10
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
  echo "$output" | grep -q '10 unprocessed failures'
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "output is valid JSON with systemMessage" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

@test "systemMessage mentions /agentops:evolve" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '/agentops:evolve'
}

# ── Dedup: nudge counter prevents re-nudging ─────────────────────────────────

@test "does not re-nudge at same threshold" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  set_nudge_counter 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "does not re-nudge when counter matches threshold" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 7
  set_nudge_counter 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "nudges again at next multiple of 5" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 10
  set_nudge_counter 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
  echo "$output" | grep -q '10 unprocessed failures'
}

@test "updates counter file after nudge" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -f "$TEST_PROJECT_DIR/.agentops/evolve-batch-count" ]
  local STORED
  STORED=$(cat "$TEST_PROJECT_DIR/.agentops/evolve-batch-count")
  [ "$STORED" = "5" ]
}

@test "counter updates to 10 at second threshold" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 10
  set_nudge_counter 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  local STORED
  STORED=$(cat "$TEST_PROJECT_DIR/.agentops/evolve-batch-count")
  [ "$STORED" = "10" ]
}

# ── Feedback-aware counting ──────────────────────────────────────────────────

@test "subtracts addressed failures from count" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 7
  # Address 3 of them, leaving 4 unprocessed (below threshold)
  seed_feedback "2026-03-26T10:00:01Z" "2026-03-26T10:00:02Z" "2026-03-26T10:00:03Z"
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "nudges when unprocessed minus addressed reaches 5" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 8
  # Address 3, leaving 5 unprocessed
  seed_feedback "2026-03-26T10:00:01Z" "2026-03-26T10:00:02Z" "2026-03-26T10:00:03Z"
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
  echo "$output" | grep -q '5 unprocessed failures'
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles missing failures.jsonl gracefully" {
  set_flag "auto_evolve_enabled" "true"
  # No failures.jsonl at all
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "handles empty failures.jsonl gracefully" {
  set_flag "auto_evolve_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "handles missing cwd field in input" {
  set_flag "auto_evolve_enabled" "true"
  local INPUT
  INPUT=$(jq -nc '{
    hook_event: "PostToolUseFailure",
    tool_name: "Bash",
    tool_input: { command: "false" },
    permission_mode: "default"
  }')
  pushd "$TEST_PROJECT_DIR" >/dev/null
  run run_hook "$INPUT"
  popd >/dev/null
  [ "$status" -eq 0 ]
}

@test "handles empty input gracefully" {
  set_flag "auto_evolve_enabled" "true"
  run bash -c 'cd "'"$TEST_PROJECT_DIR"'" && printf "" | bash "'"$HOOKS_DIR"'/evolve-gate.sh"'
  [ "$status" -eq 0 ]
}

@test "counter file absent defaults to 0 nudge level" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  # No counter file — should nudge at 5
  run run_hook "$(failure_event)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}
