#!/bin/bash
# Core flag reading and mode helpers.
# Sourced by: feature-flags.sh (facade)

FLAGS_FILE="${CLAUDE_PROJECT_DIR:-.}/.agentops/flags.json"

# Internal cache — avoids re-reading flags.json on every agentops_flag call.
_AGENTOPS_FLAGS_CACHE=""
_AGENTOPS_FLAGS_LOADED=false

# Read a single flag value from flags.json (cached after first read).
# Usage: VALUE=$(agentops_flag "flag_name" "default")
agentops_flag() {
  local FLAG="$1"
  local DEFAULT="${2:-true}"
  if [ "$_AGENTOPS_FLAGS_LOADED" = false ]; then
    if [ -f "$FLAGS_FILE" ]; then
      _AGENTOPS_FLAGS_CACHE=$(cat "$FLAGS_FILE" 2>/dev/null) || true
    fi
    _AGENTOPS_FLAGS_LOADED=true
  fi
  if [ -n "$_AGENTOPS_FLAGS_CACHE" ]; then
    echo "$_AGENTOPS_FLAGS_CACHE" | jq -r --arg key "$FLAG" --arg def "$DEFAULT" \
      'if .[$key] == null then $def else (.[$key] | tostring) end' 2>/dev/null || echo "$DEFAULT"
  else
    echo "$DEFAULT"
  fi
}

# Returns the current enforcement mode (advisory|blocking).
agentops_mode() {
  agentops_flag "enforcement_mode" "advisory"
}

# ── Standardised flag-check helpers ────────────────────────────────────────
# Security hooks default ON — only disabled on explicit "false" (fail-safe).
agentops_security_enabled() { [ "$(agentops_flag "$1")" != "false" ]; }

# Automation hooks default ON — only enabled on explicit "true" (strict).
agentops_automation_enabled() { [ "$(agentops_flag "$1")" = "true" ]; }

# Check an enterprise feature flag — convenience wrapper with consistent defaults.
# Usage: agentops_enterprise_enabled "enterprise_scaffold" && run_scaffold
agentops_enterprise_enabled() {
  local FLAG="$1"
  [ "$(agentops_flag "$FLAG" "true")" = "true" ]
}

# Dashboard flag — controls auto-launch of Agent Office Dashboard.
# Usage: agentops_dashboard_enabled && launch_dashboard
agentops_dashboard_enabled() {
  [ "$(agentops_flag "dashboard_enabled" "true")" = "true" ]
}
