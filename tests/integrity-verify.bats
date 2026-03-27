#!/usr/bin/env bats
# Tests for hooks/integrity-verify.sh — PostToolUse hook that records SHA-256
# of written files, and SessionStart hook that verifies their integrity.
#
# NOTE: SessionStart verification uses bash associative arrays (declare -A)
# which require bash 4+. On macOS with /bin/bash 3.x, SessionStart tests
# are skipped. PostToolUse recording tests work on all bash versions.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: run the hook with JSON input as argument ─────────────────────────

run_hook() {
  echo "$1" | bash "$HOOKS_DIR/integrity-verify.sh"
}

MANIFEST() {
  echo "$TEST_PROJECT_DIR/.agentops/integrity.jsonl"
}

# Build a PostToolUse JSON input for Write/Edit tools
post_tool_input() {
  local TOOL="$1"
  local FILE_PATH="$2"
  local SESSION="${3:-test-session-001}"
  jq -nc --arg tool "$TOOL" --arg fp "$FILE_PATH" --arg sess "$SESSION" '{
    hook_event: "PostToolUse",
    tool_name: $tool,
    tool_input: { file_path: $fp },
    session_id: $sess
  }'
}

session_start_input() {
  jq -nc '{ hook_event: "SessionStart", session_id: "verify-session" }'
}

# Check if bash supports associative arrays (bash 4+)
requires_bash4() {
  local BASH_MAJOR
  BASH_MAJOR=$(bash -c 'echo ${BASH_VERSINFO[0]}')
  if [ "$BASH_MAJOR" -lt 4 ]; then
    skip "requires bash 4+ for declare -A (current: bash $BASH_MAJOR)"
  fi
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when integrity_verification_enabled is false" {
  set_flag "integrity_verification_enabled" "false"
  run run_hook '{}'
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "runs when integrity_verification_enabled is not set (default)" {
  echo "hello" > "$TEST_PROJECT_DIR/test.txt"
  run run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/test.txt")"
  [ "$status" -eq 0 ]
}

# ── PostToolUse: SHA-256 recording ──────────────────────────────────────────

@test "records SHA-256 to integrity.jsonl on Write" {
  echo "content-a" > "$TEST_PROJECT_DIR/file-a.txt"
  run run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/file-a.txt")"
  [ "$status" -eq 0 ]
  [ -f "$(MANIFEST)" ]
}

@test "recorded entry contains expected fields" {
  echo "content-b" > "$TEST_PROJECT_DIR/file-b.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/file-b.txt")"

  local ENTRY
  ENTRY=$(tail -1 "$(MANIFEST)")
  echo "$ENTRY" | jq -e '.ts' >/dev/null
  echo "$ENTRY" | jq -e '.path' >/dev/null
  echo "$ENTRY" | jq -e '.abs_path' >/dev/null
  echo "$ENTRY" | jq -e '.sha256' >/dev/null
  echo "$ENTRY" | jq -e '.session' >/dev/null
}

@test "recorded SHA-256 matches actual file hash" {
  echo "deterministic content" > "$TEST_PROJECT_DIR/hash-check.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/hash-check.txt")"

  local RECORDED_HASH ACTUAL_HASH
  RECORDED_HASH=$(jq -r '.sha256' "$(MANIFEST)")
  ACTUAL_HASH=$(shasum -a 256 "$TEST_PROJECT_DIR/hash-check.txt" | awk '{print $1}')
  [ "$RECORDED_HASH" = "$ACTUAL_HASH" ]
}

@test "records SHA-256 on Edit tool" {
  echo "edit-content" > "$TEST_PROJECT_DIR/edit-file.txt"
  run run_hook "$(post_tool_input "Edit" "$TEST_PROJECT_DIR/edit-file.txt")"
  [ "$status" -eq 0 ]
  [ -f "$(MANIFEST)" ]
  local ABS
  ABS=$(jq -r '.abs_path' "$(MANIFEST)")
  [[ "$ABS" == *"edit-file.txt" ]]
}

@test "appends multiple entries for multiple writes" {
  echo "first" > "$TEST_PROJECT_DIR/f1.txt"
  echo "second" > "$TEST_PROJECT_DIR/f2.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/f1.txt")"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/f2.txt")"

  local COUNT
  COUNT=$(wc -l < "$(MANIFEST)" | tr -d ' ')
  [ "$COUNT" -eq 2 ]
}

@test "records session_id from input" {
  echo "sess-test" > "$TEST_PROJECT_DIR/sess.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/sess.txt" "my-session-42")"

  local SESSION
  SESSION=$(jq -r '.session' "$(MANIFEST)")
  [ "$SESSION" = "my-session-42" ]
}

@test "records ISO 8601 timestamp" {
  echo "ts-test" > "$TEST_PROJECT_DIR/ts.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/ts.txt")"

  local TS
  TS=$(jq -r '.ts' "$(MANIFEST)")
  [[ "$TS" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

@test "makes path relative to project dir" {
  mkdir -p "$TEST_PROJECT_DIR/subdir"
  echo "rel-test" > "$TEST_PROJECT_DIR/subdir/rel.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/subdir/rel.txt")"

  local REL
  REL=$(jq -r '.path' "$(MANIFEST)")
  [ "$REL" = "subdir/rel.txt" ]
}

# ── PostToolUse: ignored tools and edge cases ────────────────────────────────

@test "ignores non-Write/Edit tools in PostToolUse" {
  echo "read-content" > "$TEST_PROJECT_DIR/read.txt"
  run run_hook "$(jq -nc --arg fp "$TEST_PROJECT_DIR/read.txt" '{
    hook_event: "PostToolUse",
    tool_name: "Read",
    tool_input: { file_path: $fp },
    session_id: "s1"
  }')"
  [ "$status" -eq 0 ]
  [ ! -f "$(MANIFEST)" ]
}

@test "exits silently when file_path is empty" {
  run run_hook "$(jq -nc '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: "" },
    session_id: "s1"
  }')"
  [ "$status" -eq 0 ]
  [ ! -f "$(MANIFEST)" ]
}

@test "exits silently when file does not exist" {
  run run_hook "$(jq -nc '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: "/nonexistent/path/file.txt" },
    session_id: "s1"
  }')"
  [ "$status" -eq 0 ]
  [ ! -f "$(MANIFEST)" ]
}

@test "defaults session to unknown when missing" {
  echo "no-session" > "$TEST_PROJECT_DIR/nosess.txt"
  run_hook "$(jq -nc --arg fp "$TEST_PROJECT_DIR/nosess.txt" '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: $fp }
  }')"

  local SESSION
  SESSION=$(jq -r '.session' "$(MANIFEST)")
  [ "$SESSION" = "unknown" ]
}

# ── SessionStart: integrity verification (requires bash 4+) ─────────────────

@test "SessionStart exits silently when no manifest exists" {
  requires_bash4
  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "SessionStart exits silently when manifest is empty" {
  requires_bash4
  touch "$(MANIFEST)"
  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "SessionStart reports all hashes match when files unchanged" {
  requires_bash4
  echo "verified-content" > "$TEST_PROJECT_DIR/verified.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/verified.txt")"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"verified"* ]]
  [[ "$MSG" == *"match"* ]]
}

@test "SessionStart detects file modification (mismatch)" {
  requires_bash4
  echo "original" > "$TEST_PROJECT_DIR/tampered.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/tampered.txt")"

  echo "modified" > "$TEST_PROJECT_DIR/tampered.txt"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"INTEGRITY VERIFICATION WARNING"* ]]
  [[ "$MSG" == *"tampered"* ]]
}

@test "SessionStart mismatch warning includes file count" {
  requires_bash4
  echo "orig1" > "$TEST_PROJECT_DIR/m1.txt"
  echo "orig2" > "$TEST_PROJECT_DIR/m2.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/m1.txt")"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/m2.txt")"

  echo "changed1" > "$TEST_PROJECT_DIR/m1.txt"
  echo "changed2" > "$TEST_PROJECT_DIR/m2.txt"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"2 file(s)"* ]]
}

@test "SessionStart uses latest hash when file written multiple times" {
  requires_bash4
  echo "version1" > "$TEST_PROJECT_DIR/multi.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/multi.txt")"
  echo "version2" > "$TEST_PROJECT_DIR/multi.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/multi.txt")"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"match"* ]]
  [[ "$MSG" != *"WARNING"* ]]
}

@test "SessionStart handles missing files gracefully" {
  requires_bash4
  echo "will-delete" > "$TEST_PROJECT_DIR/gone.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/gone.txt")"

  rm "$TEST_PROJECT_DIR/gone.txt"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"no longer exist"* ]]
}

@test "SessionStart logs mismatch event to audit.jsonl" {
  requires_bash4
  echo "orig-audit" > "$TEST_PROJECT_DIR/audit-test.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/audit-test.txt")"
  echo "tampered-audit" > "$TEST_PROJECT_DIR/audit-test.txt"

  run_hook "$(session_start_input)" >/dev/null

  [ -f "$TEST_PROJECT_DIR/.agentops/audit.jsonl" ]
  local EVENT
  EVENT=$(jq -r '.event' "$TEST_PROJECT_DIR/.agentops/audit.jsonl")
  [ "$EVENT" = "INTEGRITY_MISMATCH" ]
}

@test "SessionStart audit log includes mismatch count" {
  requires_bash4
  echo "orig" > "$TEST_PROJECT_DIR/audit-count.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/audit-count.txt")"
  echo "changed" > "$TEST_PROJECT_DIR/audit-count.txt"

  run_hook "$(session_start_input)" >/dev/null

  local COUNT
  COUNT=$(jq -r '.files_changed' "$TEST_PROJECT_DIR/.agentops/audit.jsonl")
  [ "$COUNT" -eq 1 ]
}

@test "SessionStart mismatch warning suggests git diff" {
  requires_bash4
  echo "orig-diff" > "$TEST_PROJECT_DIR/diff-test.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/diff-test.txt")"
  echo "changed-diff" > "$TEST_PROJECT_DIR/diff-test.txt"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"git diff"* ]]
}

@test "SessionStart mixed match and mismatch reports correctly" {
  requires_bash4
  echo "unchanged" > "$TEST_PROJECT_DIR/ok.txt"
  echo "will-change" > "$TEST_PROJECT_DIR/bad.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/ok.txt")"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/bad.txt")"

  echo "tampered" > "$TEST_PROJECT_DIR/bad.txt"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"1 file(s)"* ]]
  [[ "$MSG" == *"bad.txt"* ]]
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "integrity.jsonl entries are valid JSON" {
  echo "json-test" > "$TEST_PROJECT_DIR/jtest.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/jtest.txt")"
  jq -e '.' "$(MANIFEST)" >/dev/null
}

@test "SessionStart match output is valid JSON with systemMessage" {
  requires_bash4
  echo "match-json" > "$TEST_PROJECT_DIR/matchj.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/matchj.txt")"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

@test "SessionStart mismatch output is valid JSON with systemMessage" {
  requires_bash4
  echo "mismatch-json" > "$TEST_PROJECT_DIR/mmj.txt"
  run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/mmj.txt")"
  echo "different" > "$TEST_PROJECT_DIR/mmj.txt"

  run run_hook "$(session_start_input)"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "creates .agentops directory if missing" {
  rm -rf "$TEST_PROJECT_DIR/.agentops"
  echo "dir-test" > "$TEST_PROJECT_DIR/dir-create.txt"
  run run_hook "$(post_tool_input "Write" "$TEST_PROJECT_DIR/dir-create.txt")"
  [ "$status" -eq 0 ]
  [ -d "$TEST_PROJECT_DIR/.agentops" ]
}

@test "handles empty JSON input gracefully" {
  run run_hook '{}'
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "handles unknown hook_event gracefully" {
  run run_hook '{"hook_event":"Stop","tool_name":"Write"}'
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}
