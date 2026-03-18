#!/usr/bin/env bats
# Tests for the feature-flags.sh library (facade) and its sub-libraries.

load test-helpers

setup() {
  setup_project_dir
  # Source the facade so all functions are available
  source "$HOOKS_DIR/feature-flags.sh"
}

teardown() {
  teardown_project_dir
}

# ── agentops_flag ─────────────────────────────────────────────────────────────

@test "agentops_flag returns value from flags.json" {
  set_flag "my_flag" "custom_value"
  result=$(agentops_flag "my_flag")
  [ "$result" = "custom_value" ]
}

@test "agentops_flag returns default when flag missing" {
  result=$(agentops_flag "nonexistent_flag" "my_default")
  [ "$result" = "my_default" ]
}

@test "agentops_flag defaults to true when no default given" {
  result=$(agentops_flag "nonexistent_flag")
  [ "$result" = "true" ]
}

@test "agentops_flag returns default when flags.json missing" {
  rm -f "$TEST_PROJECT_DIR/.agentops/flags.json"
  result=$(agentops_flag "any_flag" "fallback")
  [ "$result" = "fallback" ]
}

# ── agentops_mode ─────────────────────────────────────────────────────────────

@test "agentops_mode returns advisory by default" {
  result=$(agentops_mode)
  [ "$result" = "advisory" ]
}

@test "agentops_mode returns blocking when set" {
  set_flag "enforcement_mode" "blocking"
  result=$(agentops_mode)
  [ "$result" = "blocking" ]
}

# ── agentops_enforcement_action ───────────────────────────────────────────────

@test "enforcement_action returns ask in advisory mode" {
  result=$(agentops_enforcement_action)
  [ "$result" = "ask" ]
}

@test "enforcement_action returns deny in blocking mode" {
  set_flag "enforcement_mode" "blocking"
  result=$(agentops_enforcement_action)
  [ "$result" = "deny" ]
}

@test "enforcement_action returns allow in unrestricted mode" {
  export AGENTOPS_MODE=unrestricted
  result=$(agentops_enforcement_action)
  [ "$result" = "allow" ]
  unset AGENTOPS_MODE
}

# ── agentops_hard_deny ────────────────────────────────────────────────────────

@test "hard_deny always returns deny" {
  result=$(agentops_hard_deny)
  [ "$result" = "deny" ]
}

@test "hard_deny returns deny even in unrestricted mode" {
  export AGENTOPS_MODE=unrestricted
  result=$(agentops_hard_deny)
  [ "$result" = "deny" ]
  unset AGENTOPS_MODE
}

# ── agentops_stop_action ──────────────────────────────────────────────────────

@test "stop_action returns approve in advisory mode" {
  result=$(agentops_stop_action)
  [ "$result" = "approve" ]
}

@test "stop_action returns block in blocking mode" {
  set_flag "enforcement_mode" "blocking"
  result=$(agentops_stop_action)
  [ "$result" = "block" ]
}

# ── agentops_is_bypass ────────────────────────────────────────────────────────

@test "is_bypass returns true for bypassPermissions" {
  agentops_is_bypass '{"permission_mode":"bypassPermissions"}'
}

@test "is_bypass returns false for default mode" {
  ! agentops_is_bypass '{"permission_mode":"default"}'
}

@test "is_bypass returns false for missing field" {
  ! agentops_is_bypass '{}'
}

# ── agentops_security_enabled ─────────────────────────────────────────────────

@test "security_enabled returns true by default" {
  agentops_security_enabled "some_flag"
}

@test "security_enabled returns false when flag is false" {
  set_flag "some_flag" "false"
  ! agentops_security_enabled "some_flag"
}

@test "security_enabled returns true for typo value (fail-safe)" {
  set_flag "some_flag" "tru"
  agentops_security_enabled "some_flag"
}

# ── agentops_automation_enabled ───────────────────────────────────────────────

@test "automation_enabled returns true when flag is true" {
  set_flag "some_flag" "true"
  agentops_automation_enabled "some_flag"
}

@test "automation_enabled returns false for typo value (strict)" {
  set_flag "some_flag" "tru"
  ! agentops_automation_enabled "some_flag"
}

@test "automation_enabled returns true by default (agentops_flag defaults to true)" {
  agentops_automation_enabled "nonexistent_flag"
}

# ── agentops_enterprise_enabled ───────────────────────────────────────────────

@test "enterprise_enabled returns true by default" {
  agentops_enterprise_enabled "enterprise_scaffold"
}

@test "enterprise_enabled returns false when flag is false" {
  set_flag "enterprise_scaffold" "false"
  ! agentops_enterprise_enabled "enterprise_scaffold"
}

# ── agentops_redact ───────────────────────────────────────────────────────────

@test "redact masks PASSWORD= values" {
  result=$(echo "PASSWORD=s3cret123" | agentops_redact)
  [[ "$result" == *"[REDACTED]"* ]]
  [[ "$result" != *"s3cret123"* ]]
}

@test "redact masks Bearer tokens" {
  result=$(echo "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" | agentops_redact)
  [[ "$result" == *"[REDACTED"* ]]
}

@test "redact masks AWS access keys" {
  result=$(echo "key=AKIAIOSFODNN7EXAMPLE" | agentops_redact)
  [[ "$result" == *"[REDACTED]"* ]]
  [[ "$result" != *"AKIAIOSFODNN7EXAMPLE"* ]]
}

@test "redact masks GitHub tokens" {
  result=$(echo "token=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn" | agentops_redact)
  [[ "$result" == *"[REDACTED]"* ]]
}

@test "redact masks connection strings" {
  result=$(echo "postgres://admin:p4ssw0rd@db.host:5432/mydb" | agentops_redact)
  [[ "$result" == *"[REDACTED_CONN]"* ]]
  [[ "$result" != *"p4ssw0rd"* ]]
}

@test "redact preserves non-sensitive text" {
  result=$(echo "Hello world, this is normal text" | agentops_redact)
  [ "$result" = "Hello world, this is normal text" ]
}

# ── Shared thresholds ────────────────────────────────────────────────────────

@test "AGENTOPS_PLAN_THRESHOLD is defined" {
  [ "$AGENTOPS_PLAN_THRESHOLD" = "3" ]
}

@test "AGENTOPS_TEST_THRESHOLD is defined" {
  [ "$AGENTOPS_TEST_THRESHOLD" = "3" ]
}

# ── Shared patterns ──────────────────────────────────────────────────────────

@test "SOURCE_CODE_EXTENSIONS matches .ts" {
  echo "app.ts" | grep -qE "$SOURCE_CODE_EXTENSIONS"
}

@test "SOURCE_CODE_EXTENSIONS matches .py" {
  echo "main.py" | grep -qE "$SOURCE_CODE_EXTENSIONS"
}

@test "SOURCE_CODE_EXTENSIONS does not match .md" {
  ! echo "readme.md" | grep -qE "$SOURCE_CODE_EXTENSIONS"
}

@test "AGENTOPS_PROTECTED_PATHS matches .agentops/" {
  echo ".agentops/audit.jsonl" | grep -qE "$AGENTOPS_PROTECTED_PATHS"
}

@test "AGENTOPS_WRITABLE_STATE matches flags.json" {
  echo ".agentops/flags.json" | grep -qE "$AGENTOPS_WRITABLE_STATE"
}

@test "AGENTOPS_WRITABLE_STATE does not match audit.jsonl" {
  ! echo ".agentops/audit.jsonl" | grep -qE "$AGENTOPS_WRITABLE_STATE"
}

# ── Facade sources all sub-libraries ──────────────────────────────────────────

@test "facade provides agentops_flag" {
  type agentops_flag | grep -q "function"
}

@test "facade provides agentops_enforcement_action" {
  type agentops_enforcement_action | grep -q "function"
}

@test "facade provides agentops_redact" {
  type agentops_redact | grep -q "function"
}

@test "facade provides agentops_unprocessed_failures" {
  type agentops_unprocessed_failures | grep -q "function"
}
