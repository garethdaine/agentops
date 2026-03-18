#!/bin/bash
# Shared test helpers for AgentOps hook tests.

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../hooks" && pwd)"

# Create a temporary project directory with a minimal flags.json
setup_project_dir() {
  export TEST_PROJECT_DIR=$(mktemp -d)
  mkdir -p "$TEST_PROJECT_DIR/.agentops"
  echo '{}' > "$TEST_PROJECT_DIR/.agentops/flags.json"
  export CLAUDE_PROJECT_DIR="$TEST_PROJECT_DIR"
}

teardown_project_dir() {
  [ -n "$TEST_PROJECT_DIR" ] && rm -rf "$TEST_PROJECT_DIR"
}

# Build a PreToolUse JSON input for Bash commands
bash_input() {
  local COMMAND="$1"
  jq -nc --arg cmd "$COMMAND" '{
    hook_event: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command: $cmd },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

# Build a PreToolUse JSON input for Read/Write/Edit tools
file_tool_input() {
  local TOOL="$1"
  local FILE_PATH="$2"
  jq -nc --arg tool "$TOOL" --arg fp "$FILE_PATH" '{
    hook_event: "PreToolUse",
    tool_name: $tool,
    tool_input: { file_path: $fp },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

# Build a PreToolUse JSON input for Glob/Grep tools
search_tool_input() {
  local TOOL="$1"
  local PATH_ARG="$2"
  jq -nc --arg tool "$TOOL" --arg p "$PATH_ARG" '{
    hook_event: "PreToolUse",
    tool_name: $tool,
    tool_input: { path: $p },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

# Build a PreToolUse JSON input with bypass permissions
bypass_input() {
  local TOOL="$1"
  local COMMAND="$2"
  jq -nc --arg tool "$TOOL" --arg cmd "$COMMAND" '{
    hook_event: "PreToolUse",
    tool_name: $tool,
    tool_input: { command: $cmd },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "bypassPermissions"
  }'
}

# Build a PreToolUse JSON input for injection scan testing
injection_input() {
  local TOOL="$1"
  local INPUT_TEXT="$2"
  jq -nc --arg tool "$TOOL" --arg txt "$INPUT_TEXT" '{
    hook_event: "PreToolUse",
    tool_name: $tool,
    tool_input: { command: $txt },
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

# Extract the permission decision from hook JSON output
get_decision() {
  echo "$1" | jq -r '.hookSpecificOutput.permissionDecision // empty' 2>/dev/null
}

# Extract the decision reason from hook JSON output
get_reason() {
  echo "$1" | jq -r '.hookSpecificOutput.permissionDecisionReason // empty' 2>/dev/null
}

# Extract system message from hook JSON output
get_system_message() {
  echo "$1" | jq -r '.systemMessage // empty' 2>/dev/null
}

# Set a flag in the test project's flags.json
set_flag() {
  local KEY="$1"
  local VALUE="$2"
  local TMP=$(mktemp)
  jq --arg k "$KEY" --arg v "$VALUE" '.[$k] = $v' "$TEST_PROJECT_DIR/.agentops/flags.json" > "$TMP"
  mv "$TMP" "$TEST_PROJECT_DIR/.agentops/flags.json"
}
