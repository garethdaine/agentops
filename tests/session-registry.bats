#!/usr/bin/env bats

load test-helpers

setup() {
  setup_project_dir
  export HOME="$TEST_PROJECT_DIR"
  mkdir -p "$HOME/.agentops"

  # Create mock bin directory and add to PATH
  export MOCK_BIN="$TEST_PROJECT_DIR/mock-bin"
  mkdir -p "$MOCK_BIN"
  export PATH="$MOCK_BIN:$PATH"

  # Mock lsof: dashboard already running (skip launch logic for registry tests)
  cat > "$MOCK_BIN/lsof" << 'EOF'
#!/bin/bash
exit 0
EOF
  chmod +x "$MOCK_BIN/lsof"

  # Create existing PID file so launch is skipped
  echo "99999 99998" > "$TEST_PROJECT_DIR/.agentops/dashboard.pid"
}

teardown() {
  teardown_project_dir
}

@test "appends session entry to registry on start" {
  run bash -c 'echo "{\"session_id\":\"reg-1\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  [ -f "$HOME/.agentops/active-sessions.jsonl" ]
  count=$(wc -l < "$HOME/.agentops/active-sessions.jsonl")
  [ "$count" -eq 1 ]
}

@test "appends multiple sessions to registry" {
  bash -c 'echo "{\"session_id\":\"reg-a\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  bash -c 'echo "{\"session_id\":\"reg-b\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  count=$(wc -l < "$HOME/.agentops/active-sessions.jsonl")
  [ "$count" -eq 2 ]
  jq -r '.session_id' "$HOME/.agentops/active-sessions.jsonl" | grep -q "reg-a"
  jq -r '.session_id' "$HOME/.agentops/active-sessions.jsonl" | grep -q "reg-b"
}

@test "removes session entry on cleanup" {
  # Seed two sessions
  echo '{"session_id":"keep-me","project_dir":"/tmp","started_at":"2026-01-01T00:00:00Z","pid":1}' > "$HOME/.agentops/active-sessions.jsonl"
  echo '{"session_id":"remove-me","project_dir":"/tmp","started_at":"2026-01-01T00:00:00Z","pid":2}' >> "$HOME/.agentops/active-sessions.jsonl"

  # Run session-cleanup.sh with session_id to remove
  run bash -c 'echo "{\"session_id\":\"remove-me\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/session-cleanup.sh'
  [ "$status" -eq 0 ]
  # Only keep-me should remain
  remaining=$(jq -r '.session_id' "$HOME/.agentops/active-sessions.jsonl")
  [ "$remaining" = "keep-me" ]
}

@test "handles missing registry file on cleanup" {
  rm -f "$HOME/.agentops/active-sessions.jsonl"
  run bash -c 'echo "{\"session_id\":\"no-file\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/session-cleanup.sh'
  [ "$status" -eq 0 ]
}

@test "handles missing ~/.agentops/ directory" {
  rm -rf "$HOME/.agentops"
  # Mock lsof and create mock bin since HOME changed
  mkdir -p "$MOCK_BIN"
  run bash -c 'echo "{\"session_id\":\"no-dir\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
}
