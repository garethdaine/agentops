#!/bin/bash
set -uo pipefail

# SessionStart hook: register session and auto-launch Agent Office Dashboard.
# Reads JSON on stdin: {"session_id":"...","hook_event_name":"SessionStart","cwd":"..."}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/flag-utils.sh"

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null) || SESSION_ID=""
export CLAUDE_PROJECT_DIR="$CWD"

# Check dashboard_enabled flag — exit silently if disabled
agentops_dashboard_enabled || exit 0

# ── Session Registry ─────────────────────────────────────────────────────────
SAFE_HOME="${HOME:-$(cd ~ 2>/dev/null && pwd)}"
if [ -z "$SAFE_HOME" ]; then
  exit 0
fi
REGISTRY_DIR="${SAFE_HOME}/.agentops"
REGISTRY_FILE="$REGISTRY_DIR/active-sessions.jsonl"
mkdir -p "$REGISTRY_DIR" 2>/dev/null

# Skip registry write if session_id is empty
[ -z "$SESSION_ID" ] && exit 0

# Append session metadata
jq -nc \
  --arg sid "$SESSION_ID" \
  --arg dir "$CWD" \
  --arg ts "$(date -u +%FT%TZ)" \
  --arg pid "$$" \
  '{session_id:$sid, project_dir:$dir, started_at:$ts, pid:($pid|tonumber)}' \
  >> "$REGISTRY_FILE" 2>/dev/null

# ── Dashboard Launch ─────────────────────────────────────────────────────────
STATE_DIR="$CWD/.agentops"
PID_FILE="$STATE_DIR/dashboard.pid"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$STATE_DIR" 2>/dev/null

# Ports used by the dashboard
RELAY_PORT=3099
NEXT_PORT=3100

# Quick check: if dashboard is already running with valid PID file and both ports LISTENING, exit
if [ -f "$PID_FILE" ] && lsof -iTCP:"$NEXT_PORT" -sTCP:LISTEN >/dev/null 2>&1 && lsof -iTCP:"$RELAY_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  exit 0
fi

# Detach the full cleanup + launch sequence so the hook returns immediately.
# This avoids the hook timeout (5s) killing the launch mid-flight.
(
  # Kill stale server processes on dashboard ports (only LISTEN sockets, not browser clients)
  stale=false
  for port in $RELAY_PORT $NEXT_PORT; do
    pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null) || true
    if [ -n "$pids" ]; then
      stale=true
      echo "$pids" | xargs kill 2>/dev/null || true
    fi
  done

  if [ "$stale" = true ]; then
    rm -f "$PID_FILE"
    # Wait for ports to actually be released (up to 5 seconds)
    attempts=0
    while [ $attempts -lt 10 ]; do
      if ! lsof -tiTCP:"$RELAY_PORT" -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -tiTCP:"$NEXT_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        break
      fi
      sleep 0.5
      attempts=$((attempts + 1))
    done
    # Force-kill if still hanging after graceful attempt
    if [ $attempts -ge 10 ]; then
      for port in $RELAY_PORT $NEXT_PORT; do
        pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null) || true
        [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
      done
      sleep 1
    fi
  fi

  # Ensure both ports are free before launching (handles TIME_WAIT / slow teardown)
  for port in $RELAY_PORT $NEXT_PORT; do
    attempts=0
    while lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && [ $attempts -lt 10 ]; do
      sleep 0.5
      attempts=$((attempts + 1))
    done
  done

  # Launch relay + Next.js in background
  DASHBOARD_BIN="$PLUGIN_ROOT/dashboard/node_modules/.bin"
  LOG_DIR="$STATE_DIR"
  DASHBOARD_DIR="$PLUGIN_ROOT/dashboard"

  # Relay — must cd to CWD so relay.ts process.cwd() resolves .agentops/ correctly
  nohup bash -c "cd '$CWD' && exec '$DASHBOARD_BIN/tsx' '$DASHBOARD_DIR/server/relay.ts'" > "$LOG_DIR/relay.log" 2>&1 &
  RELAY_PID=$!

  # Next.js — must run from dashboard dir for Turbopack to find src/app/
  nohup bash -c "cd '$DASHBOARD_DIR' && exec '$DASHBOARD_BIN/next' dev --port $NEXT_PORT" > "$LOG_DIR/next.log" 2>&1 &
  NEXT_PID=$!

  echo "$RELAY_PID $NEXT_PID" > "$PID_FILE"

  # Verify processes started — clean up if either died immediately
  sleep 1
  if ! kill -0 "$RELAY_PID" 2>/dev/null; then
    kill "$NEXT_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    exit 0
  fi
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    kill "$RELAY_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    exit 0
  fi

  # Wait for the server to be ready, then open browser if no client is already connected
  for _i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$NEXT_PORT" 2>/dev/null; then
      # Query relay for connected client count — skip browser open if a tab is already open
      CLIENT_COUNT=$(curl -s "http://localhost:$RELAY_PORT/api/clients" 2>/dev/null | jq -r '.count // 0' 2>/dev/null) || CLIENT_COUNT=0
      if [ "$CLIENT_COUNT" -gt 0 ] 2>/dev/null; then
        break
      fi
      if command -v open >/dev/null 2>&1; then
        open "http://localhost:$NEXT_PORT"
      elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:$NEXT_PORT"
      fi
      break
    fi
    sleep 0.5
  done
) </dev/null >/dev/null 2>&1 &
disown 2>/dev/null || true

exit 0
