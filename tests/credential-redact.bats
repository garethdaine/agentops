#!/usr/bin/env bats
load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# Helper: build PostToolUse input for Bash
bash_post_input() {
  local COMMAND="$1"
  jq -nc --arg cmd "$COMMAND" '{
    hook_event: "PostToolUse",
    tool_name: "Bash",
    tool_input: { command: $cmd },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

# Helper: build PostToolUse input for Read
read_post_input() {
  local FILE_PATH="$1"
  jq -nc --arg fp "$FILE_PATH" '{
    hook_event: "PostToolUse",
    tool_name: "Read",
    tool_input: { file_path: $fp },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

# ── Bash tool credential detection ───────────────────────────────────────────

@test "warns on cat .env" {
  result=$(bash_post_input 'cat .env' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "CREDENTIAL_ACCESS\|credentials"
}

@test "warns on tail .pem" {
  result=$(bash_post_input 'tail server.pem' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "credentials"
}

@test "warns on grep .key" {
  result=$(bash_post_input 'grep password app.key' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "credentials"
}

@test "warns on source .env" {
  result=$(bash_post_input 'source .env' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "credentials"
}

@test "no warning on cat README.md" {
  result=$(bash_post_input 'cat README.md' | bash "$HOOKS_DIR/credential-redact.sh")
  [ -z "$result" ]
}

# ── Read tool credential detection ───────────────────────────────────────────

@test "warns on Read of .env file" {
  result=$(read_post_input '/project/.env' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "credentials"
}

@test "warns on Read of .pem file" {
  result=$(read_post_input '/project/server.pem' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "credentials"
}

@test "warns on Read of .secret file" {
  result=$(read_post_input '/project/db.secret' | bash "$HOOKS_DIR/credential-redact.sh")
  echo "$result" | grep -q "credentials"
}

@test "no warning on Read of normal file" {
  result=$(read_post_input '/project/src/main.ts' | bash "$HOOKS_DIR/credential-redact.sh")
  [ -z "$result" ]
}

# ── Disabled flag ─────────────────────────────────────────────────────────────

@test "exits silently when credential_redaction_enabled is false" {
  set_flag "credential_redaction_enabled" "false"
  result=$(bash_post_input 'cat .env' | bash "$HOOKS_DIR/credential-redact.sh")
  [ -z "$result" ]
}

# ── Skips non-Bash/Read tools ────────────────────────────────────────────────

@test "skips Write tool" {
  INPUT=$(jq -nc '{
    hook_event: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: "/project/.env" },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }')
  result=$(echo "$INPUT" | bash "$HOOKS_DIR/credential-redact.sh")
  [ -z "$result" ]
}
