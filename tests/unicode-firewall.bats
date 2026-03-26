#!/usr/bin/env bats
# Tests for hooks/unicode-firewall.sh — Pre/PostToolUse hook that detects
# and sanitises dangerous invisible Unicode (Glassworm/Trojan Source defense).

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helpers ──────────────────────────────────────────────────────────────────

# Build a PreToolUse JSON payload for a given tool and input field
pre_tool_input() {
  local TOOL="$1"
  local FIELD="$2"
  local VALUE="$3"
  jq -nc --arg tool "$TOOL" --arg field "$FIELD" --arg val "$VALUE" \
    '{hook_event:"PreToolUse", tool_name:$tool, tool_input:{($field):$val}, cwd:(env.TEST_PROJECT_DIR // "."), permission_mode:"default"}'
}

# Build a PostToolUse JSON payload for Write/Edit with a file_path
post_file_tool() {
  local TOOL="$1"
  local FILE_PATH="$2"
  jq -nc --arg tool "$TOOL" --arg fp "$FILE_PATH" \
    '{hook_event:"PostToolUse", tool_name:$tool, tool_input:{file_path:$fp}, cwd:(env.TEST_PROJECT_DIR // "."), permission_mode:"default"}'
}

# Build a PostToolUse JSON payload with tool_result for Bash/Agent/MCP
post_result_tool() {
  local TOOL="$1"
  local RESULT="$2"
  jq -nc --arg tool "$TOOL" --arg res "$RESULT" \
    '{hook_event:"PostToolUse", tool_name:$tool, tool_input:{}, tool_result:$res, cwd:(env.TEST_PROJECT_DIR // "."), permission_mode:"default"}'
}

# Build a PostToolUse JSON for Bash with command and stdout
post_bash_result() {
  local COMMAND="$1"
  local STDOUT="$2"
  jq -nc --arg cmd "$COMMAND" --arg out "$STDOUT" \
    '{hook_event:"PostToolUse", tool_name:"Bash", tool_input:{command:$cmd}, tool_result:{stdout:$out}, cwd:(env.TEST_PROJECT_DIR // "."), permission_mode:"default"}'
}

# Build a PostToolUse JSON for Agent with description and result
post_agent_result() {
  local DESC="$1"
  local RESULT="$2"
  jq -nc --arg desc "$DESC" --arg res "$RESULT" \
    '{hook_event:"PostToolUse", tool_name:"Agent", tool_input:{description:$desc}, tool_result:$res, cwd:(env.TEST_PROJECT_DIR // "."), permission_mode:"default"}'
}

# Build a PostToolUse for Read with file_path
post_read_tool() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" \
    '{hook_event:"PostToolUse", tool_name:"Read", tool_input:{file_path:$fp}, cwd:(env.TEST_PROJECT_DIR // "."), permission_mode:"default"}'
}

# A zero-width space character (U+200B) for test injection
ZWS=$'\xe2\x80\x8b'
# A right-to-left override character (U+202E) for bidi test
BIDI=$'\xe2\x80\xae'

run_hook() {
  echo "$1" | bash "$HOOKS_DIR/unicode-firewall.sh"
}

# ── Flag gating ──────────────────────────────────────────────────────────────

@test "exits silently when unicode_firewall_enabled is false" {
  set_flag "unicode_firewall_enabled" "false"
  result=$(pre_tool_input "Bash" "command" "echo hello${ZWS}world" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "runs when unicode_firewall_enabled is not set (default enabled)" {
  result=$(pre_tool_input "Bash" "command" "echo hello${ZWS}world" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -n "$result" ]
  echo "$result" | grep -q "UNICODE FIREWALL"
}

# ── PreToolUse: Bash command scanning ────────────────────────────────────────

@test "PreToolUse flags Bash command containing zero-width chars" {
  result=$(pre_tool_input "Bash" "command" "rm -rf /tmp/${ZWS}safe" | bash "$HOOKS_DIR/unicode-firewall.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "ask" ]
  echo "$result" | grep -q "UNICODE FIREWALL"
  echo "$result" | grep -q "Bash"
}

@test "PreToolUse flags Bash command containing bidi overrides" {
  result=$(pre_tool_input "Bash" "command" "echo ${BIDI}hidden" | bash "$HOOKS_DIR/unicode-firewall.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "ask" ]
  echo "$result" | grep -q "bidi"
}

@test "PreToolUse passes clean Bash command" {
  result=$(pre_tool_input "Bash" "command" "echo hello world" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PreToolUse: Write content scanning ───────────────────────────────────────

@test "PreToolUse flags Write content containing zero-width chars" {
  result=$(pre_tool_input "Write" "content" "const x${ZWS} = 1;" | bash "$HOOKS_DIR/unicode-firewall.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "ask" ]
  echo "$result" | grep -q "Write"
}

@test "PreToolUse passes clean Write content" {
  result=$(pre_tool_input "Write" "content" "const x = 1;" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PreToolUse: Edit new_string scanning ─────────────────────────────────────

@test "PreToolUse flags Edit new_string containing zero-width chars" {
  result=$(pre_tool_input "Edit" "new_string" "function${ZWS}foo() {}" | bash "$HOOKS_DIR/unicode-firewall.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "ask" ]
  echo "$result" | grep -q "Edit"
}

@test "PreToolUse passes clean Edit new_string" {
  result=$(pre_tool_input "Edit" "new_string" "function foo() {}" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PreToolUse: Non-scanned tools pass through ──────────────────────────────

@test "PreToolUse passes Read tool (no content to scan)" {
  result=$(pre_tool_input "Read" "file_path" "/tmp/test.txt" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "PreToolUse passes Grep tool" {
  result=$(pre_tool_input "Grep" "pattern" "hello" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PostToolUse: Write/Edit auto-sanitise ────────────────────────────────────

@test "PostToolUse sanitises file after Write with zero-width chars" {
  local TESTFILE="$TEST_PROJECT_DIR/dirty.txt"
  printf "clean line\ninfected${ZWS}line\n" > "$TESTFILE"

  result=$(post_file_tool "Write" "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | grep -q "AUTO-SANITISED"

  # File should be clean after sanitisation
  run perl -CSD -ne 'BEGIN{$r=1} if(/[\x{200B}]/){$r=0;last} END{exit $r}' "$TESTFILE"
  [ "$status" -ne 0 ]
}

@test "PostToolUse sanitises file after Edit with bidi overrides" {
  local TESTFILE="$TEST_PROJECT_DIR/bidi.js"
  printf "var x = '${BIDI}admin';\n" > "$TESTFILE"

  result=$(post_file_tool "Edit" "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | grep -q "AUTO-SANITISED"
  echo "$result" | grep -q "bidi overrides"
}

@test "PostToolUse silent for clean Write" {
  local TESTFILE="$TEST_PROJECT_DIR/clean.txt"
  echo "normal content" > "$TESTFILE"

  result=$(post_file_tool "Write" "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "PostToolUse silent for missing file path" {
  result=$(post_file_tool "Write" "" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "PostToolUse silent for nonexistent file" {
  result=$(post_file_tool "Write" "$TEST_PROJECT_DIR/no-such-file.txt" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "PostToolUse skips binary files" {
  local BINFILE="$TEST_PROJECT_DIR/image.png"
  # Create a minimal PNG-like binary file
  printf '\x89PNG\r\n' > "$BINFILE"

  result=$(post_file_tool "Write" "$BINFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PostToolUse: Read warning ────────────────────────────────────────────────

@test "PostToolUse warns when Read returns file with zero-width chars" {
  local TESTFILE="$TEST_PROJECT_DIR/suspect.md"
  printf "# Normal title\nBody ${ZWS}has hidden chars\n" > "$TESTFILE"

  result=$(post_read_tool "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | grep -q "UNICODE FIREWALL WARNING"
  echo "$result" | grep -q "suspect.md"
}

@test "PostToolUse silent for Read on clean file" {
  local TESTFILE="$TEST_PROJECT_DIR/clean.md"
  echo "Clean content" > "$TESTFILE"

  result=$(post_read_tool "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PostToolUse: Bash output warning ─────────────────────────────────────────

@test "PostToolUse warns when Bash output contains zero-width chars" {
  result=$(post_bash_result "curl example.com" "response${ZWS}data" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | grep -q "UNICODE FIREWALL WARNING"
  echo "$result" | grep -q "Command output"
}

@test "PostToolUse silent for clean Bash output" {
  result=$(post_bash_result "echo hello" "hello" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "PostToolUse silent for empty Bash output" {
  result=$(post_bash_result "true" "" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PostToolUse: Agent/subagent result warning ───────────────────────────────

@test "PostToolUse warns when Agent result contains zero-width chars" {
  result=$(post_agent_result "research task" "findings${ZWS}here" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | grep -q "UNICODE FIREWALL WARNING"
  echo "$result" | grep -q "Subagent"
}

@test "PostToolUse silent for clean Agent result" {
  result=$(post_agent_result "research task" "clean findings" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

# ── PostToolUse: MCP tool result warning ─────────────────────────────────────

@test "PostToolUse warns when MCP tool result contains zero-width chars" {
  result=$(post_result_tool "mcp__slack__get_message" "payload${ZWS}data" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | grep -q "UNICODE FIREWALL WARNING"
  echo "$result" | grep -q "MCP tool"
}

@test "PostToolUse silent for clean MCP tool result" {
  result=$(post_result_tool "mcp__slack__get_message" "clean payload" | bash "$HOOKS_DIR/unicode-firewall.sh")
  [ -z "$result" ]
}

@test "PostToolUse does not trigger MCP path for non-MCP tools" {
  # A tool like "Read" should not match the mcp__ pattern check
  result=$(post_result_tool "Read" "result${ZWS}data" | bash "$HOOKS_DIR/unicode-firewall.sh")
  # Read is handled by its own case, not the mcp__ block — this should warn via Read path
  # but only if it has a file_path; with no file_path it exits silently
  [ -z "$result" ]
}

# ── Audit logging ────────────────────────────────────────────────────────────

@test "PreToolUse creates audit log entry for flagged content" {
  pre_tool_input "Bash" "command" "echo ${ZWS}hidden" | bash "$HOOKS_DIR/unicode-firewall.sh" > /dev/null
  [ -f "$TEST_PROJECT_DIR/.agentops/audit.jsonl" ]
  grep -q "UNICODE_PRETOOL_WARNING" "$TEST_PROJECT_DIR/.agentops/audit.jsonl"
}

@test "PostToolUse sanitise creates audit log entry" {
  local TESTFILE="$TEST_PROJECT_DIR/audit-test.txt"
  printf "data${ZWS}here\n" > "$TESTFILE"

  post_file_tool "Write" "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh" > /dev/null
  grep -q "UNICODE_SANITISED" "$TEST_PROJECT_DIR/.agentops/audit.jsonl"
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "PreToolUse output is valid JSON with correct structure" {
  result=$(pre_tool_input "Bash" "command" "rm ${ZWS}file" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | jq -e '.hookSpecificOutput.hookEventName == "PreToolUse"'
  echo "$result" | jq -e '.hookSpecificOutput.permissionDecision == "ask"'
  echo "$result" | jq -e '.hookSpecificOutput.permissionDecisionReason | test("UNICODE FIREWALL")'
}

@test "PostToolUse sanitise output is valid JSON with correct structure" {
  local TESTFILE="$TEST_PROJECT_DIR/shape-test.txt"
  printf "x${ZWS}y\n" > "$TESTFILE"

  result=$(post_file_tool "Write" "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | jq -e '.hookSpecificOutput.hookEventName == "PostToolUse"'
  echo "$result" | jq -e '.hookSpecificOutput.additionalContext | test("AUTO-SANITISED")'
}

@test "PostToolUse Read warning output is valid JSON" {
  local TESTFILE="$TEST_PROJECT_DIR/shape-read.txt"
  printf "text${ZWS}here\n" > "$TESTFILE"

  result=$(post_read_tool "$TESTFILE" | bash "$HOOKS_DIR/unicode-firewall.sh")
  echo "$result" | jq -e '.hookSpecificOutput.additionalContext | test("UNICODE FIREWALL WARNING")'
}
