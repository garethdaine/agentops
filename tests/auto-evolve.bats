#!/usr/bin/env bats
# Tests for hooks/auto-evolve.sh — Stop hook that triggers /agentops:evolve
# when 2+ unprocessed failures remain and evolve hasn't run this session.

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
  echo "$1" | bash "$HOOKS_DIR/auto-evolve.sh"
}

# Seed failures.jsonl with N failure entries (each with unique timestamp)
seed_failures() {
  local COUNT="$1"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  for i in $(seq 1 "$COUNT"); do
    echo "{\"ts\":\"2026-03-26T10:00:$(printf '%02d' "$i")Z\",\"tool\":\"Bash\",\"error\":\"fail $i\"}" \
      >> "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  done
}

# Seed feedback-history.jsonl marking specific timestamps as addressed
seed_feedback() {
  local TIMESTAMPS=("$@")
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/feedback-history.jsonl"
  for ts in "${TIMESTAMPS[@]}"; do
    echo "{\"addressed\":\"$ts\"}" >> "$TEST_PROJECT_DIR/.agentops/feedback-history.jsonl"
  done
}

# Mark evolve as already run this session
mark_evolve_ran() {
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  touch "$TEST_PROJECT_DIR/.agentops/evolve-ran"
}

# ── Flag gating ──────────────────────────────────────────────────────────────

@test "exits silently when auto_evolve_enabled is false" {
  set_flag "auto_evolve_enabled" "false"
  seed_failures 5
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "produces output when auto_evolve_enabled is true and failures exist" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
}

# ── Session dedup (evolve-ran sentinel) ──────────────────────────────────────

@test "exits silently when evolve already ran this session" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  mark_evolve_ran
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "triggers when evolve has not run this session" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
  echo "$result" | jq -e '.stopReason' >/dev/null
}

# ── Failure threshold ────────────────────────────────────────────────────────

@test "exits silently with 0 failures" {
  set_flag "auto_evolve_enabled" "true"
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "exits silently with 1 failure (below threshold)" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 1
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "triggers with exactly 2 failures (at threshold)" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 2
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
  echo "$result" | jq -e '.stopReason' >/dev/null
}

@test "triggers with 5 failures (above threshold)" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 5
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "output contains stopReason field" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  echo "$result" | jq -e '.stopReason' >/dev/null
}

@test "output contains continue field" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  echo "$result" | jq -e 'has("continue")' >/dev/null
}

@test "stopReason mentions failure count" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 4
  result=$(run_hook "$(stop_event)")
  msg=$(echo "$result" | jq -r '.stopReason')
  [[ "$msg" == *"4"* ]]
}

@test "stopReason mentions evolve skill" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  msg=$(echo "$result" | jq -r '.stopReason')
  [[ "$msg" == *"evolve"* ]]
}

# ── Enforcement mode interaction ─────────────────────────────────────────────

@test "continue is true in advisory mode" {
  set_flag "auto_evolve_enabled" "true"
  set_flag "enforcement_mode" "advisory"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  cont=$(echo "$result" | jq -r '.continue')
  [ "$cont" = "true" ]
}

@test "continue is false in blocking mode" {
  set_flag "auto_evolve_enabled" "true"
  set_flag "enforcement_mode" "blocking"
  seed_failures 3
  result=$(run_hook "$(stop_event)")
  cont=$(echo "$result" | jq -r '.continue')
  [ "$cont" = "false" ]
}

# ── Feedback-aware counting ──────────────────────────────────────────────────

@test "subtracts addressed failures from count" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  # Mark 2 of 3 failures as addressed
  seed_feedback "2026-03-26T10:00:01Z" "2026-03-26T10:00:02Z"
  # Only 1 unprocessed — below threshold
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "triggers when unaddressed failures meet threshold" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 4
  # Mark 1 of 4 as addressed — 3 unprocessed remaining
  seed_feedback "2026-03-26T10:00:01Z"
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
  msg=$(echo "$result" | jq -r '.stopReason')
  [[ "$msg" == *"3"* ]]
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles missing failures.jsonl gracefully" {
  set_flag "auto_evolve_enabled" "true"
  rm -f "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "handles empty failures.jsonl" {
  set_flag "auto_evolve_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/failures.jsonl"
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "handles missing .agentops directory" {
  set_flag "auto_evolve_enabled" "true"
  rm -rf "$TEST_PROJECT_DIR/.agentops"
  # Re-create just flags.json so flag check passes
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  echo '{"auto_evolve_enabled":"true"}' > "$TEST_PROJECT_DIR/.agentops/flags.json"
  result=$(run_hook "$(stop_event)")
  [ -z "$result" ]
}

@test "handles empty feedback-history with failures above threshold" {
  set_flag "auto_evolve_enabled" "true"
  seed_failures 3
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/feedback-history.jsonl"
  result=$(run_hook "$(stop_event)")
  [ -n "$result" ]
}
