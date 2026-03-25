#!/usr/bin/env bats
load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Hard-deny rules ──────────────────────────────────────────────────────────

@test "blocks export PATH" {
  result=$(bash_input 'export PATH=/evil:$PATH' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export HOME" {
  result=$(bash_input 'export HOME=/tmp/evil' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export LD_PRELOAD" {
  result=$(bash_input 'export LD_PRELOAD=/tmp/evil.so' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export DYLD_INSERT_LIBRARIES" {
  result=$(bash_input 'export DYLD_INSERT_LIBRARIES=/tmp/evil.dylib' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export NODE_OPTIONS" {
  result=$(bash_input 'export NODE_OPTIONS="--require /tmp/evil.js"' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export PYTHONPATH" {
  result=$(bash_input 'export PYTHONPATH=/tmp/evil' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export RUBYOPT" {
  result=$(bash_input 'export RUBYOPT="-r/tmp/evil"' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export PERL5OPT" {
  result=$(bash_input 'export PERL5OPT="-M/tmp/evil"' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks export CLASSPATH" {
  result=$(bash_input 'export CLASSPATH=/tmp/evil.jar' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks DB credential vars" {
  result=$(bash_input 'export DB_PASSWORD=secret123' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

@test "blocks REDIS credential vars" {
  result=$(bash_input 'export REDIS_URL=redis://user:pass@host' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "deny" ]
}

# ── Soft rules ────────────────────────────────────────────────────────────────

@test "flags SECRET_KEY as ask" {
  result=$(bash_input 'export SECRET_KEY=abc123' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "ask" ]
}

@test "flags API_TOKEN as ask" {
  result=$(bash_input 'export API_TOKEN=xyz' | bash "$HOOKS_DIR/validate-env.sh")
  decision=$(get_decision "$result")
  [ "$decision" = "ask" ]
}

# ── Allow rules ───────────────────────────────────────────────────────────────

@test "allows safe env vars" {
  result=$(bash_input 'export EDITOR=vim' | bash "$HOOKS_DIR/validate-env.sh")
  [ -z "$result" ]
}

@test "allows DEBUG=true" {
  result=$(bash_input 'export DEBUG=true' | bash "$HOOKS_DIR/validate-env.sh")
  [ -z "$result" ]
}

@test "skips non-export commands" {
  result=$(bash_input 'echo hello' | bash "$HOOKS_DIR/validate-env.sh")
  [ -z "$result" ]
}

@test "exits silently when env_validation_enabled is false" {
  set_flag "env_validation_enabled" "false"
  result=$(bash_input 'export PATH=/evil' | bash "$HOOKS_DIR/validate-env.sh")
  [ -z "$result" ]
}
