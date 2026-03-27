#!/usr/bin/env bats
# Tests for hooks/budget-check.sh — SessionStart hook that initialises and
# monitors per-session spending against a configurable USD budget.

load test-helpers

setup() {
  setup_project_dir
  # Ensure clean env defaults
  unset AGENTOPS_BUDGET_USD
  unset AGENTOPS_BUDGET_WARN_PCT
}

teardown() {
  teardown_project_dir
  unset AGENTOPS_BUDGET_USD 2>/dev/null || true
  unset AGENTOPS_BUDGET_WARN_PCT 2>/dev/null || true
}

# ── Helper: run the hook ─────────────────────────────────────────────────────

run_hook() {
  bash "$HOOKS_DIR/budget-check.sh"
}

# ── Initialisation (no existing budget file) ─────────────────────────────────

@test "creates budget.json when none exists" {
  run run_hook
  [ "$status" -eq 0 ]
  [ -f "$TEST_PROJECT_DIR/.agentops/budget.json" ]
}

@test "initialises budget.json with default values" {
  run run_hook
  [ "$status" -eq 0 ]
  # budget_usd: jq may render 5.00 or 5 depending on version
  jq -e '.budget_usd == 5' "$TEST_PROJECT_DIR/.agentops/budget.json" >/dev/null
  jq -e '.spent == 0' "$TEST_PROJECT_DIR/.agentops/budget.json" >/dev/null
  jq -e '.warn_pct == 80' "$TEST_PROJECT_DIR/.agentops/budget.json" >/dev/null
}

@test "budget.json includes ISO 8601 started timestamp" {
  run run_hook
  [ "$status" -eq 0 ]
  local STARTED
  STARTED=$(jq -r '.started' "$TEST_PROJECT_DIR/.agentops/budget.json")
  # Matches YYYY-MM-DDTHH:MM:SSZ pattern
  [[ "$STARTED" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

@test "outputs systemMessage on first run with budget info" {
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"$5.00"* ]] || [[ "$MSG" == *"5.00"* ]]
  [[ "$MSG" == *"80%"* ]]
}

# ── Custom budget via environment variables ──────────────────────────────────

@test "respects AGENTOPS_BUDGET_USD override" {
  export AGENTOPS_BUDGET_USD=25.00
  run run_hook
  [ "$status" -eq 0 ]
  jq -e '.budget_usd == 25' "$TEST_PROJECT_DIR/.agentops/budget.json" >/dev/null
}

@test "respects AGENTOPS_BUDGET_WARN_PCT override" {
  export AGENTOPS_BUDGET_WARN_PCT=50
  run run_hook
  [ "$status" -eq 0 ]
  local WARN_PCT
  WARN_PCT=$(jq -r '.warn_pct' "$TEST_PROJECT_DIR/.agentops/budget.json")
  [ "$WARN_PCT" = "50" ]
}

@test "systemMessage reflects custom budget and warn pct" {
  export AGENTOPS_BUDGET_USD=10.00
  export AGENTOPS_BUDGET_WARN_PCT=90
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"10.00"* ]]
  [[ "$MSG" == *"90%"* ]]
}

# ── Budget monitoring (existing budget file, under threshold) ────────────────

@test "no output when spending is under threshold" {
  export AGENTOPS_BUDGET_USD=10.00
  # Pre-seed budget.json with spending below 80%
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":3,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "no output when spending is zero" {
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":5,"spent":0,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "no output at just under threshold" {
  export AGENTOPS_BUDGET_USD=10.00
  # 79.9% of $10 = $7.99, threshold = $8.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":7.99,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Budget warning (existing budget file, at or over threshold) ──────────────

@test "outputs warning when spending hits threshold exactly" {
  export AGENTOPS_BUDGET_USD=10.00
  # 80% of $10 = $8.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":8,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"BUDGET WARNING"* ]]
  [[ "$MSG" == *"80.0%"* ]]
}

@test "outputs warning when spending exceeds threshold" {
  export AGENTOPS_BUDGET_USD=10.00
  # 90% of $10 = $9.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":9,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"BUDGET WARNING"* ]]
  [[ "$MSG" == *"90.0%"* ]]
}

@test "warning includes spent and budget amounts" {
  export AGENTOPS_BUDGET_USD=5.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":5,"spent":4.5,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"4.5"* ]]
  [[ "$MSG" == *"5"* ]]
}

@test "warning at 100% spending" {
  export AGENTOPS_BUDGET_USD=5.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":5,"spent":5,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"BUDGET WARNING"* ]]
  [[ "$MSG" == *"100.0%"* ]]
}

@test "warning when over-budget (>100%)" {
  export AGENTOPS_BUDGET_USD=5.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":5,"spent":7.5,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"BUDGET WARNING"* ]]
  [[ "$MSG" == *"150.0%"* ]]
}

# ── Custom warn threshold with existing file ─────────────────────────────────

@test "respects custom warn_pct from env when checking existing file" {
  export AGENTOPS_BUDGET_WARN_PCT=50
  # 60% of $10 = $6 — above 50% threshold
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":6,"warn_pct":50,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"BUDGET WARNING"* ]]
}

@test "env budget override applies to threshold calculation" {
  export AGENTOPS_BUDGET_USD=100.00
  # spent=60, budget=100, 80% threshold=80. 60 < 80 → no warning
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":100,"spent":60,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── JSON output shape ────────────────────────────────────────────────────────

@test "init output is valid JSON with systemMessage key" {
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

@test "warning output is valid JSON with systemMessage key" {
  export AGENTOPS_BUDGET_USD=5.00
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":5,"spent":5,"warn_pct":80,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

@test "budget.json is valid JSON after init" {
  run run_hook
  [ "$status" -eq 0 ]
  jq -e '.' "$TEST_PROJECT_DIR/.agentops/budget.json" >/dev/null
}

# ── Edge cases ───────────────────────────────────────────────────────────────

@test "creates .agentops directory if missing" {
  rm -rf "$TEST_PROJECT_DIR/.agentops"
  run run_hook
  [ "$status" -eq 0 ]
  [ -d "$TEST_PROJECT_DIR/.agentops" ]
  [ -f "$TEST_PROJECT_DIR/.agentops/budget.json" ]
}

@test "does not overwrite existing budget.json on subsequent runs" {
  # First run creates the file
  run_hook >/dev/null
  # Modify spent to $2
  local TMP
  TMP=$(mktemp)
  jq '.spent = 2' "$TEST_PROJECT_DIR/.agentops/budget.json" > "$TMP"
  mv "$TMP" "$TEST_PROJECT_DIR/.agentops/budget.json"
  # Second run should read existing file, not overwrite
  run run_hook
  [ "$status" -eq 0 ]
  local SPENT
  SPENT=$(jq -r '.spent' "$TEST_PROJECT_DIR/.agentops/budget.json")
  [ "$SPENT" = "2" ]
}

@test "handles zero budget gracefully" {
  export AGENTOPS_BUDGET_USD=0
  run run_hook
  [ "$status" -eq 0 ]
  [ -f "$TEST_PROJECT_DIR/.agentops/budget.json" ]
}

@test "handles very large budget value" {
  export AGENTOPS_BUDGET_USD=99999.99
  run run_hook
  [ "$status" -eq 0 ]
  local BUDGET_USD
  BUDGET_USD=$(jq -r '.budget_usd' "$TEST_PROJECT_DIR/.agentops/budget.json")
  [ "$BUDGET_USD" = "99999.99" ]
}

@test "handles warn_pct of 100" {
  export AGENTOPS_BUDGET_USD=10.00
  export AGENTOPS_BUDGET_WARN_PCT=100
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":9.99,"warn_pct":100,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  # 99.9% < 100% threshold, no warning
  [ -z "$output" ]
}

@test "warns at warn_pct of 100 when fully spent" {
  export AGENTOPS_BUDGET_USD=10.00
  export AGENTOPS_BUDGET_WARN_PCT=100
  cat > "$TEST_PROJECT_DIR/.agentops/budget.json" <<'EOF'
{"budget_usd":10,"spent":10,"warn_pct":100,"started":"2026-03-27T00:00:00Z"}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  local MSG
  MSG=$(echo "$output" | jq -r '.systemMessage')
  [[ "$MSG" == *"BUDGET WARNING"* ]]
}
