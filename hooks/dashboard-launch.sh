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
REGISTRY_DIR="$HOME/.agentops"
REGISTRY_FILE="$REGISTRY_DIR/active-sessions.jsonl"
mkdir -p "$REGISTRY_DIR" 2>/dev/null

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

# Check if dashboard is already running
dashboard_running() {
  # Check PID file exists and port 3100 is in use
  [ -f "$PID_FILE" ] && lsof -i :3100 >/dev/null 2>&1
}

if dashboard_running; then
  # Dashboard already running — nothing to do
  exit 0
fi

# Launch relay + Next.js in background
nohup node "$PLUGIN_ROOT/dashboard/server/relay.ts" > /dev/null 2>&1 &
RELAY_PID=$!
nohup npx --prefix "$PLUGIN_ROOT/dashboard" next dev --port 3100 > /dev/null 2>&1 &
NEXT_PID=$!
echo "$RELAY_PID $NEXT_PID" > "$PID_FILE"

# Open browser
open http://localhost:3100

exit 0
