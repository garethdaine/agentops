#!/usr/bin/env bats
# Tests for hooks/audit-log.sh — PostToolUse hook that writes structured
# audit entries to .agentops/audit.jsonl with secret redaction.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: build a generic tool-use event ──────────────────────────────────

audit_event() {
  local SESSION="$1"
  local EVENT="$2"
  local TOOL="$3"
  local INPUT="${4:-\{\}}"
  jq -nc \
    --arg s "$SESSION" \
    --arg e "$EVENT" \
    --arg t "$TOOL" \
    --arg i "$INPUT" \
    '{session_id:$s, hook_event_name:$e, tool_name:$t, tool_input:($i | fromjson)}'
}

run_hook() {
  echo "$1" | bash "$HOOKS_DIR/audit-log.sh"
}

AUDIT_FILE() {
  echo "$TEST_PROJECT_DIR/.agentops/audit.jsonl"
}

# ── Basic functionality ─────────────────────────────────────────────────────

@test "creates audit.jsonl and writes a valid JSONL entry" {
  run_hook "$(audit_event "sess-001" "PostToolUse" "Bash" '{"command":"ls"}')"
  [ -f "$(AUDIT_FILE)" ]
  local COUNT
  COUNT=$(wc -l < "$(AUDIT_FILE)" | tr -d ' ')
  [ "$COUNT" -eq 1 ]
  # Each line must be valid JSON
  jq -e '.' "$(AUDIT_FILE)" >/dev/null
}

@test "entry contains all required fields" {
  run_hook "$(audit_event "sess-002" "PostToolUse" "Read" '{"file_path":"/tmp/x"}')"
  local ENTRY
  ENTRY=$(head -1 "$(AUDIT_FILE)")
  echo "$ENTRY" | jq -e '.ts' >/dev/null
  echo "$ENTRY" | jq -e '.session' >/dev/null
  echo "$ENTRY" | jq -e '.event' >/dev/null
  echo "$ENTRY" | jq -e '.tool' >/dev/null
  echo "$ENTRY" | jq -e '.input' >/dev/null
}

@test "session_id is captured correctly" {
  run_hook "$(audit_event "my-session-123" "PostToolUse" "Bash" '{"command":"echo hi"}')"
  local SESSION
  SESSION=$(jq -r '.session' "$(AUDIT_FILE)")
  [ "$SESSION" = "my-session-123" ]
}

@test "hook_event_name is captured correctly" {
  run_hook "$(audit_event "sess-003" "PreToolUse" "Bash" '{"command":"echo"}')"
  local EVENT
  EVENT=$(jq -r '.event' "$(AUDIT_FILE)")
  [ "$EVENT" = "PreToolUse" ]
}

@test "tool_name is captured correctly" {
  run_hook "$(audit_event "sess-004" "PostToolUse" "Write" '{"file_path":"/tmp/y"}')"
  local TOOL
  TOOL=$(jq -r '.tool' "$(AUDIT_FILE)")
  [ "$TOOL" = "Write" ]
}

@test "timestamp is in ISO 8601 UTC format" {
  run_hook "$(audit_event "sess-005" "PostToolUse" "Bash" '{"command":"date"}')"
  local TS
  TS=$(jq -r '.ts' "$(AUDIT_FILE)")
  # Should match YYYY-MM-DDTHH:MM:SSZ
  [[ "$TS" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

# ── Multiple entries ─────────────────────────────────────────────────────────

@test "appends multiple entries without overwriting" {
  run_hook "$(audit_event "sess-010" "PostToolUse" "Bash" '{"command":"ls"}')"
  run_hook "$(audit_event "sess-010" "PostToolUse" "Read" '{"file_path":"/tmp/a"}')"
  run_hook "$(audit_event "sess-010" "PostToolUse" "Write" '{"file_path":"/tmp/b"}')"
  local COUNT
  COUNT=$(wc -l < "$(AUDIT_FILE)" | tr -d ' ')
  [ "$COUNT" -eq 3 ]
  # All lines must be valid JSON
  while IFS= read -r line; do
    echo "$line" | jq -e '.' >/dev/null
  done < "$(AUDIT_FILE)"
}

# ── Secret redaction ─────────────────────────────────────────────────────────

@test "redacts API key patterns from tool_input" {
  run_hook "$(audit_event "sess-020" "PostToolUse" "Bash" '{"command":"curl -H Authorization: sk-ant-abc123def456ghi789jkl012"}')"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [[ "$INPUT" != *"sk-ant-abc123def456ghi789jkl012"* ]]
  [[ "$INPUT" == *"[REDACTED]"* ]]
}

@test "redacts Bearer tokens from tool_input" {
  run_hook "$(audit_event "sess-021" "PostToolUse" "Bash" '{"command":"curl -H Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"}')"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [[ "$INPUT" != *"eyJhbGciOiJIUzI1NiI"* ]]
}

@test "redacts PASSWORD= patterns from tool_input" {
  run_hook "$(audit_event "sess-022" "PostToolUse" "Bash" '{"command":"export PASSWORD=supersecret123"}')"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [[ "$INPUT" != *"supersecret123"* ]]
  [[ "$INPUT" == *"[REDACTED]"* ]]
}

@test "redacts GitHub tokens from tool_input" {
  run_hook "$(audit_event "sess-023" "PostToolUse" "Bash" '{"command":"git clone https://ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn@github.com/repo"}')"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [[ "$INPUT" != *"ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ"* ]]
}

@test "redacts AWS access keys from tool_input" {
  run_hook "$(audit_event "sess-024" "PostToolUse" "Bash" '{"command":"export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"}')"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [[ "$INPUT" != *"AKIAIOSFODNN7EXAMPLE"* ]]
}

@test "redacts Slack webhook URLs from tool_input" {
  run_hook "$(audit_event "sess-025" "PostToolUse" "Bash" '{"command":"curl hooks.slack.com/services/T00000000/B00000000/XXXX"}')"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [[ "$INPUT" != *"T00000000/B00000000/XXXX"* ]]
  [[ "$INPUT" == *"[REDACTED]"* ]]
}

# ── Input truncation ─────────────────────────────────────────────────────────

@test "truncates tool_input to 500 characters" {
  # Generate a command string longer than 500 chars
  local LONG_CMD
  LONG_CMD=$(printf 'x%.0s' {1..600})
  run_hook "$(audit_event "sess-030" "PostToolUse" "Bash" "{\"command\":\"$LONG_CMD\"}")"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  local LEN
  LEN=${#INPUT}
  [ "$LEN" -le 500 ]
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "handles missing session_id gracefully" {
  echo '{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"ls"}}' | \
    bash "$HOOKS_DIR/audit-log.sh"
  local SESSION
  SESSION=$(jq -r '.session' "$(AUDIT_FILE)")
  [ "$SESSION" = "unknown" ]
}

@test "handles missing hook_event_name gracefully" {
  echo '{"session_id":"sess-040","tool_name":"Bash","tool_input":{"command":"ls"}}' | \
    bash "$HOOKS_DIR/audit-log.sh"
  local EVENT
  EVENT=$(jq -r '.event' "$(AUDIT_FILE)")
  [ "$EVENT" = "unknown" ]
}

@test "handles missing tool_name gracefully" {
  echo '{"session_id":"sess-041","hook_event_name":"PostToolUse","tool_input":{"command":"ls"}}' | \
    bash "$HOOKS_DIR/audit-log.sh"
  local TOOL
  TOOL=$(jq -r '.tool' "$(AUDIT_FILE)")
  [ "$TOOL" = "unknown" ]
}

@test "handles missing tool_input gracefully" {
  echo '{"session_id":"sess-042","hook_event_name":"PostToolUse","tool_name":"Bash"}' | \
    bash "$HOOKS_DIR/audit-log.sh"
  local INPUT
  INPUT=$(jq -r '.input' "$(AUDIT_FILE)")
  [ "$INPUT" = "{}" ]
}

@test "handles empty JSON input" {
  echo '{}' | bash "$HOOKS_DIR/audit-log.sh"
  local ENTRY
  ENTRY=$(head -1 "$(AUDIT_FILE)")
  echo "$ENTRY" | jq -e '.session == "unknown"' >/dev/null
  echo "$ENTRY" | jq -e '.event == "unknown"' >/dev/null
}

@test "creates .agentops directory if it does not exist" {
  rm -rf "$TEST_PROJECT_DIR/.agentops"
  run_hook "$(audit_event "sess-050" "PostToolUse" "Bash" '{"command":"ls"}')"
  [ -d "$TEST_PROJECT_DIR/.agentops" ]
  [ -f "$(AUDIT_FILE)" ]
}

@test "handles tool_input with special JSON characters" {
  run_hook "$(audit_event "sess-051" "PostToolUse" "Bash" '{"command":"echo \"hello world\""}')"
  [ -f "$(AUDIT_FILE)" ]
  jq -e '.' "$(AUDIT_FILE)" >/dev/null
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "output is valid JSONL with exactly 5 fields per entry" {
  run_hook "$(audit_event "sess-060" "PostToolUse" "Bash" '{"command":"ls"}')"
  local ENTRY
  ENTRY=$(head -1 "$(AUDIT_FILE)")
  local KEYS
  KEYS=$(echo "$ENTRY" | jq -r 'keys | length')
  [ "$KEYS" -eq 5 ]
  # Verify exact field names
  echo "$ENTRY" | jq -e 'keys == ["event","input","session","tool","ts"]' >/dev/null
}

# ── Tool coverage ────────────────────────────────────────────────────────────

@test "logs Read tool events" {
  run_hook "$(audit_event "sess-070" "PostToolUse" "Read" '{"file_path":"/etc/hosts"}')"
  local TOOL
  TOOL=$(jq -r '.tool' "$(AUDIT_FILE)")
  [ "$TOOL" = "Read" ]
}

@test "logs Write tool events" {
  run_hook "$(audit_event "sess-071" "PostToolUse" "Write" '{"file_path":"/tmp/out.txt","content":"hello"}')"
  local TOOL
  TOOL=$(jq -r '.tool' "$(AUDIT_FILE)")
  [ "$TOOL" = "Write" ]
}

@test "logs Edit tool events" {
  run_hook "$(audit_event "sess-072" "PostToolUse" "Edit" '{"file_path":"/tmp/f.txt"}')"
  local TOOL
  TOOL=$(jq -r '.tool' "$(AUDIT_FILE)")
  [ "$TOOL" = "Edit" ]
}

@test "logs MCP tool events" {
  run_hook "$(audit_event "sess-073" "PostToolUse" "mcp__server__tool" '{"arg":"value"}')"
  local TOOL
  TOOL=$(jq -r '.tool' "$(AUDIT_FILE)")
  [ "$TOOL" = "mcp__server__tool" ]
}
