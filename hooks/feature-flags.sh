#!/bin/bash
# Shared library — source this from all hooks
# Usage: source "${SCRIPT_DIR}/feature-flags.sh"

FLAGS_FILE="${CLAUDE_PROJECT_DIR:-.}/.agentops/flags.json"

# Check if Claude Code is running with --dangerously-skip-permissions
# Pass the hook's JSON input as $1; returns 0 (true) if bypass is active
agentops_is_bypass() {
  local INPUT="$1"
  local perm_mode
  perm_mode=$(echo "$INPUT" | jq -r '.permission_mode // "default"' 2>/dev/null)
  [ "$perm_mode" = "bypassPermissions" ]
}

# Emit advisory system message and exit — used by security hooks in bypass mode.
# Bypass mode skips enforcement but still surfaces warnings in chat.
agentops_bypass_advisory() {
  local HOOK_NAME="$1"
  local DETAIL="${2:-}"
  local MSG="AgentOps advisory (bypass mode): ${HOOK_NAME} enforcement skipped."
  [ -n "$DETAIL" ] && MSG="${MSG} ${DETAIL}"
  jq -nc --arg msg "$MSG" '{systemMessage: $msg}'
  exit 0
}

agentops_flag() {
  local FLAG="$1"
  local DEFAULT="${2:-true}"
  if [ -f "$FLAGS_FILE" ]; then
    jq -r --arg key "$FLAG" --arg def "$DEFAULT" 'if .[$key] == null then $def else (.[$key] | tostring) end' "$FLAGS_FILE" 2>/dev/null || echo "$DEFAULT"
  else
    echo "$DEFAULT"
  fi
}

agentops_mode() {
  agentops_flag "enforcement_mode" "advisory"
}

# Returns "deny" in blocking mode, "ask" in advisory mode (for configurable/soft gates)
# Note: AGENTOPS_MODE=unrestricted returns "allow" for soft gates only.
agentops_enforcement_action() {
  if [ "${AGENTOPS_MODE:-}" = "unrestricted" ]; then
    echo "allow"
    return
  fi
  local MODE=$(agentops_mode)
  if [ "$MODE" = "blocking" ]; then
    echo "deny"
  else
    echo "ask"
  fi
}

# Always returns "deny" — for hard-deny rules that MUST enforce regardless of
# mode, bypass, or unrestricted. Use for: destructive commands, fork bombs,
# sensitive file exfiltration, and other non-negotiable safety rules.
agentops_hard_deny() {
  echo "deny"
}

# Emit deny and exit — for security hooks that fail closed on malformed input.
# Usage: TOOL=$(echo "$INPUT" | jq -r '...' 2>/dev/null) || agentops_fail_closed
agentops_fail_closed() {
  jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"AgentOps: failed to parse hook input (fail closed)"}}'
  exit 0
}

# Returns "block" in blocking mode, "approve" in advisory mode (for Stop hooks)
agentops_stop_action() {
  local MODE=$(agentops_mode)
  if [ "$MODE" = "blocking" ]; then
    echo "block"
  else
    echo "approve"
  fi
}

# Shared source code file extension pattern (used by auto-test, auto-delegate, etc.)
# Convention: security hooks default ON (check = "false"), automation hooks default OFF (check != "true")
SOURCE_CODE_EXTENSIONS='\.(js|ts|tsx|jsx|py|rb|go|rs|java|php|c|cpp|h|hpp|cs|swift|kt|scala|sh|vue|svelte)$'

# Shared test runner detection pattern (used by detect-test-run)
TEST_RUNNER_PATTERN='(npm\s+test|npx\s+(jest|vitest|mocha)|yarn\s+test|pnpm\s+test|pytest|python\s+-m\s+(pytest|unittest)|go\s+test|cargo\s+test|bundle\s+exec\s+rspec|rspec\b|phpunit|pest|artisan\s+test|phpstan|pint|dotnet\s+test|mvn\s+test|gradle\s+test|make\s+test|bats\s|bash\s+.*test|\.\/test)'

# Protected paths — block Write/Edit tool access to plugin state, hooks, and trust-relevant files
AGENTOPS_PROTECTED_PATHS='(\.agentops/|tasks/lessons\.md$)'

# Canonical secret redaction — single source of truth for all log scrubbing.
# Usage: VALUE=$(echo "$VALUE" | agentops_redact)
agentops_redact() {
  sed -E \
    -e 's/(PASSWORD|PASS|SECRET|TOKEN|API_KEY|PRIVATE_KEY|AUTH|CREDENTIAL)=[^ "'\''&]*/\1=[REDACTED]/gi' \
    -e 's/(sk|pk|api|key|token|secret|auth)[-_][A-Za-z0-9]{16,}/[REDACTED]/g' \
    -e 's/Bearer [A-Za-z0-9._~+\/=-]{20,}/Bearer [REDACTED]/g' \
    -e 's/AKIA[A-Z0-9]{16}/[REDACTED]/g' \
    -e 's/gh[pousr]_[A-Za-z0-9]{36,}/[REDACTED]/g' \
    -e 's|[a-zA-Z]+://[^:@/]+:[^@/]+@|[REDACTED_CONN]@|g' \
    -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED_JWT]/g'
}

# ── Enterprise Extension Flags ──────────────────────────────────────────────
# These flags gate the enterprise delivery framework capabilities.
# All default to "true" via agentops_flag's default mechanism.
# Toggle via /agentops:flags or by editing .agentops/flags.json directly.
#
# Flag name                      Phase   Description
# enterprise_scaffold            2       Project scaffolding system
# ai_workflows                   3       AI-first workflow commands
# unified_review                 4       Unified code review system
# architecture_guardrails        5       Architecture pattern enforcement
# delivery_lifecycle             6       Delivery phase management
# team_governance                7       Team scalability features
# client_comms                   8       Client communication templates

# Check an enterprise feature flag — convenience wrapper with consistent defaults.
# Usage: agentops_enterprise_enabled "enterprise_scaffold" && run_scaffold
agentops_enterprise_enabled() {
  local FLAG="$1"
  [ "$(agentops_flag "$FLAG" "true")" = "true" ]
}

# Count unprocessed failures in .agentops/failures.jsonl.
# Usage: COUNT=$(agentops_unprocessed_failures "$CWD")
agentops_unprocessed_failures() {
  local CWD="$1"
  local FAILURES_FILE="${CWD}/.agentops/failures.jsonl"
  local FEEDBACK_FILE="${CWD}/.agentops/feedback-history.jsonl"

  [ ! -f "$FAILURES_FILE" ] && echo 0 && return
  [ ! -s "$FAILURES_FILE" ] && echo 0 && return

  if [ -f "$FEEDBACK_FILE" ] && [ -s "$FEEDBACK_FILE" ]; then
    local ADDRESSED
    ADDRESSED=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' "$FEEDBACK_FILE" 2>/dev/null | sort -u)
    local UNPROCESSED=0
    while IFS= read -r line; do
      local TS
      TS=$(echo "$line" | jq -r '.ts // empty' 2>/dev/null)
      [ -z "$TS" ] && continue
      if ! echo "$ADDRESSED" | grep -qF "$TS"; then
        UNPROCESSED=$((UNPROCESSED + 1))
      fi
    done < "$FAILURES_FILE"
    echo "$UNPROCESSED"
  else
    wc -l < "$FAILURES_FILE" 2>/dev/null | tr -d ' '
  fi
}
