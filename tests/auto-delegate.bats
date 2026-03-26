#!/usr/bin/env bats
# Tests for hooks/auto-delegate.sh — PostToolUse hook that triggers specialist
# agent delegation after 5+ unique source code files are modified.

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
  echo "$1" | bash "$HOOKS_DIR/auto-delegate.sh"
}

# Seed the modified-files tracker with N unique source files
seed_tracker() {
  local COUNT="$1"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  for i in $(seq 1 "$COUNT"); do
    echo "src/file${i}.ts" >> "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  done
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when auto_delegate_enabled is false" {
  set_flag "auto_delegate_enabled" "false"
  seed_tracker 10
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
}

@test "runs when auto_delegate_enabled is true" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -n "$result" ]
  echo "$result" | jq -e '.hookSpecificOutput.additionalContext' >/dev/null
}

# ── Tool filtering ───────────────────────────────────────────────────────────

@test "ignores non-Write/Edit tools (Read)" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  result=$(run_hook "$(other_tool_event "Read" "src/app.ts")")
  [ -z "$result" ]
}

@test "ignores Bash tool events" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  result=$(run_hook "$(other_tool_event "Bash" "src/app.ts")")
  [ -z "$result" ]
}

@test "ignores Glob tool events" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  result=$(run_hook "$(other_tool_event "Glob" "src/app.ts")")
  [ -z "$result" ]
}

@test "responds to Write events" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/new.ts")")
  [ -n "$result" ]
}

@test "responds to Edit events" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(edit_event "src/new.py")")
  [ -n "$result" ]
}

# ── File extension filtering ─────────────────────────────────────────────────

@test "ignores non-source-code files (markdown)" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  result=$(run_hook "$(write_event "docs/README.md")")
  [ -z "$result" ]
}

@test "ignores config files (json)" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  result=$(run_hook "$(write_event "package.json")")
  [ -z "$result" ]
}

@test "ignores yaml files" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  result=$(run_hook "$(write_event ".github/workflows/ci.yml")")
  [ -z "$result" ]
}

# ── Tracker dependency ───────────────────────────────────────────────────────

@test "exits silently when modified-files.txt does not exist" {
  set_flag "auto_delegate_enabled" "true"
  # Do NOT create the tracker file
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
}

@test "exits silently when modified-files.txt is empty" {
  set_flag "auto_delegate_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  : > "$TEST_PROJECT_DIR/.agentops/modified-files.txt"
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
}

# ── Threshold behavior ───────────────────────────────────────────────────────

@test "no delegation for fewer than 5 unique source files" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 4
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
}

@test "delegation triggers at exactly 5 unique source files" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -n "$result" ]
  echo "$result" | jq -e '.hookSpecificOutput.additionalContext' >/dev/null
}

@test "delegation triggers above threshold" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 8
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -n "$result" ]
}

@test "duplicate entries in tracker do not inflate count" {
  set_flag "auto_delegate_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  # 3 unique files, but 6 lines (duplicates)
  cat > "$TEST_PROJECT_DIR/.agentops/modified-files.txt" <<'EOF'
src/a.ts
src/b.ts
src/c.ts
src/a.ts
src/b.ts
src/c.ts
EOF
  result=$(run_hook "$(write_event "src/d.py")")
  [ -z "$result" ]
}

@test "mixed source and non-source entries — only source files count" {
  set_flag "auto_delegate_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  cat > "$TEST_PROJECT_DIR/.agentops/modified-files.txt" <<'EOF'
src/a.ts
docs/README.md
src/b.py
package.json
src/c.go
config.yaml
src/d.rs
EOF
  # 4 unique source files — still under threshold
  result=$(run_hook "$(write_event "src/e.ts")")
  [ -z "$result" ]
}

# ── Delegation output structure ──────────────────────────────────────────────

@test "output is valid JSON" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  echo "$result" | jq -e '.' >/dev/null
}

@test "output contains hookSpecificOutput with hookEventName" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  event=$(echo "$result" | jq -r '.hookSpecificOutput.hookEventName')
  [ "$event" = "PostToolUse" ]
}

@test "output additionalContext mentions auto-delegate" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  ctx=$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')
  [[ "$ctx" == *"auto-delegate"* ]]
}

@test "output additionalContext mentions code-critic agent" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  ctx=$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')
  [[ "$ctx" == *"code-critic"* ]]
}

@test "output additionalContext mentions security-reviewer agent" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  result=$(run_hook "$(write_event "src/app.ts")")
  ctx=$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')
  [[ "$ctx" == *"security-reviewer"* ]]
}

@test "output additionalContext includes file count" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 7
  result=$(run_hook "$(write_event "src/app.ts")")
  ctx=$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')
  [[ "$ctx" == *"7"* ]]
}

@test "output additionalContext includes file list" {
  set_flag "auto_delegate_enabled" "true"
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  cat > "$TEST_PROJECT_DIR/.agentops/modified-files.txt" <<'EOF'
src/alpha.ts
src/beta.py
src/gamma.go
src/delta.rs
src/epsilon.js
EOF
  result=$(run_hook "$(write_event "src/app.ts")")
  ctx=$(echo "$result" | jq -r '.hookSpecificOutput.additionalContext')
  [[ "$ctx" == *"alpha.ts"* ]]
  [[ "$ctx" == *"epsilon.js"* ]]
}

# ── Single-trigger deduplication ─────────────────────────────────────────────

@test "delegation is sent only once per session" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  # First trigger — should emit delegation
  result1=$(run_hook "$(write_event "src/app.ts")")
  [ -n "$result1" ]
  # delegate-sent marker should exist now
  [ -f "$TEST_PROJECT_DIR/.agentops/delegate-sent" ]
  # Second trigger — should be silent
  result2=$(run_hook "$(write_event "src/other.ts")")
  [ -z "$result2" ]
}

@test "delegate-sent marker prevents re-trigger even with more files" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  # Pre-create the marker
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  date -u +%FT%TZ > "$TEST_PROJECT_DIR/.agentops/delegate-sent"
  result=$(run_hook "$(write_event "src/app.ts")")
  [ -z "$result" ]
}

@test "delegate-sent marker contains a timestamp" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 5
  run_hook "$(write_event "src/app.ts")" >/dev/null
  [ -f "$TEST_PROJECT_DIR/.agentops/delegate-sent" ]
  # Should contain an ISO-ish timestamp
  content=$(cat "$TEST_PROJECT_DIR/.agentops/delegate-sent")
  [[ "$content" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles empty file_path gracefully" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  event=$(jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: "" },
    cwd: $cwd
  }')
  result=$(run_hook "$event")
  [ -z "$result" ]
}

@test "handles missing file_path field gracefully" {
  set_flag "auto_delegate_enabled" "true"
  seed_tracker 10
  event=$(jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: {},
    cwd: $cwd
  }')
  result=$(run_hook "$event")
  [ -z "$result" ]
}

@test "empty input does not crash the hook" {
  set_flag "auto_delegate_enabled" "true"
  run bash "$HOOKS_DIR/auto-delegate.sh" <<< '{}'
  [ "$status" -eq 0 ]
}
