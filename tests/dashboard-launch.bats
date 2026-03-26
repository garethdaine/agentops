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

  # Mock lsof: by default, dashboard is not running (exit 1)
  cat > "$MOCK_BIN/lsof" << 'LSOFEOF'
#!/bin/bash
exit 1
LSOFEOF
  chmod +x "$MOCK_BIN/lsof"

  # Mock open: just record that it was called
  cat > "$MOCK_BIN/open" << 'OPENEOF'
#!/bin/bash
echo "$@" >> "$HOME/.agentops/open-calls.log"
OPENEOF
  chmod +x "$MOCK_BIN/open"

  # Mock nohup: record and simulate background process
  cat > "$MOCK_BIN/nohup" << 'NOHUPEOF'
#!/bin/bash
echo "$@" >> "$HOME/.agentops/nohup-calls.log"
# Simulate a backgroundable process - just exit cleanly
exec "$@"
NOHUPEOF
  chmod +x "$MOCK_BIN/nohup"

  # Mock node: just exit
  cat > "$MOCK_BIN/node" << 'NODEEOF'
#!/bin/bash
echo "mock-node $@" >> "$HOME/.agentops/node-calls.log"
NODEEOF
  chmod +x "$MOCK_BIN/node"

  # Mock npx: just exit
  cat > "$MOCK_BIN/npx" << 'NPXEOF'
#!/bin/bash
echo "mock-npx $@" >> "$HOME/.agentops/npx-calls.log"
NPXEOF
  chmod +x "$MOCK_BIN/npx"
}

teardown() {
  teardown_project_dir
}

@test "exits when dashboard_enabled is false" {
  set_flag "dashboard_enabled" "false"
  run bash -c 'echo "{\"session_id\":\"s1\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  # Should not write to active-sessions.jsonl
  [ ! -f "$HOME/.agentops/active-sessions.jsonl" ]
}

@test "writes session entry to registry on start" {
  run bash -c 'echo "{\"session_id\":\"test-session-42\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  [ -f "$HOME/.agentops/active-sessions.jsonl" ]
  result=$(jq -r '.session_id' "$HOME/.agentops/active-sessions.jsonl")
  [ "$result" = "test-session-42" ]
}

@test "session entry contains required fields" {
  run bash -c 'echo "{\"session_id\":\"s-fields\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  # Check all four required fields exist
  jq -e '.session_id' "$HOME/.agentops/active-sessions.jsonl" >/dev/null
  jq -e '.project_dir' "$HOME/.agentops/active-sessions.jsonl" >/dev/null
  jq -e '.started_at' "$HOME/.agentops/active-sessions.jsonl" >/dev/null
  jq -e '.pid' "$HOME/.agentops/active-sessions.jsonl" >/dev/null
}

@test "detects existing running dashboard and skips launch" {
  # Simulate dashboard already running: lsof returns success
  cat > "$MOCK_BIN/lsof" << 'EOF'
#!/bin/bash
exit 0
EOF
  chmod +x "$MOCK_BIN/lsof"

  # Create existing PID file
  echo "12345 12346" > "$TEST_PROJECT_DIR/.agentops/dashboard.pid"

  run bash -c 'echo "{\"session_id\":\"s2\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  # Should still write session registry
  [ -f "$HOME/.agentops/active-sessions.jsonl" ]
  # Should NOT have called open (dashboard already running)
  [ ! -f "$HOME/.agentops/open-calls.log" ]
}

@test "writes PID file on launch" {
  run bash -c 'echo "{\"session_id\":\"s3\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  [ -f "$TEST_PROJECT_DIR/.agentops/dashboard.pid" ]
}

@test "opens browser after launch" {
  run bash -c 'echo "{\"session_id\":\"s4\",\"hook_event_name\":\"SessionStart\",\"cwd\":\"$TEST_PROJECT_DIR\"}" | bash hooks/dashboard-launch.sh'
  [ "$status" -eq 0 ]
  [ -f "$HOME/.agentops/open-calls.log" ]
  grep -q "http://localhost:3100" "$HOME/.agentops/open-calls.log"
}
