#!/usr/bin/env bats
load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# Helper: build PostToolUse input for any tool
post_tool_input() {
  local TOOL="$1"
  jq -nc --arg tool "$TOOL" '{
    hook_event: "PostToolUse",
    tool_name: $tool,
    tool_input: {},
    cwd: (env.TEST_PROJECT_DIR // "."),
    permission_mode: "default"
  }'
}

@test "marks WebFetch as untrusted" {
  result=$(post_tool_input 'WebFetch' | bash "$HOOKS_DIR/content-trust.sh")
  echo "$result" | grep -q "UNTRUSTED"
}

@test "marks WebSearch as untrusted" {
  result=$(post_tool_input 'WebSearch' | bash "$HOOKS_DIR/content-trust.sh")
  echo "$result" | grep -q "UNTRUSTED"
}

@test "marks Agent as untrusted" {
  result=$(post_tool_input 'Agent' | bash "$HOOKS_DIR/content-trust.sh")
  echo "$result" | grep -q "UNTRUSTED"
}

@test "marks MCP tools as untrusted" {
  result=$(post_tool_input 'mcp__slack__post' | bash "$HOOKS_DIR/content-trust.sh")
  echo "$result" | grep -q "UNTRUSTED"
}

@test "does not warn on Read tool" {
  result=$(post_tool_input 'Read' | bash "$HOOKS_DIR/content-trust.sh")
  [ -z "$result" ]
}

@test "does not warn on Bash tool" {
  result=$(post_tool_input 'Bash' | bash "$HOOKS_DIR/content-trust.sh")
  [ -z "$result" ]
}

@test "does not warn on Write tool" {
  result=$(post_tool_input 'Write' | bash "$HOOKS_DIR/content-trust.sh")
  [ -z "$result" ]
}

@test "exits silently when content_trust_enabled is false" {
  set_flag "content_trust_enabled" "false"
  result=$(post_tool_input 'WebFetch' | bash "$HOOKS_DIR/content-trust.sh")
  [ -z "$result" ]
}
