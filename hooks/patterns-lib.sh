#!/bin/bash
# Shared patterns, thresholds, and protected path constants.
# Sourced by: feature-flags.sh (facade)

# ── Shared thresholds ────────────────────────────────────────────────────────
# Number of modified files before plan/test/compliance gates trigger.
AGENTOPS_PLAN_THRESHOLD=3
AGENTOPS_TEST_THRESHOLD=3
AGENTOPS_COMPLIANCE_THRESHOLD=3

# Shared source code file extension pattern (used by auto-test, auto-delegate, etc.)
SOURCE_CODE_EXTENSIONS='\.(js|ts|tsx|jsx|py|rb|go|rs|java|php|c|cpp|h|hpp|cs|swift|kt|scala|sh|vue|svelte)$'

# Shared test runner detection pattern (used by detect-test-run)
TEST_RUNNER_PATTERN='(npm\s+test|npx\s+(jest|vitest|mocha)|yarn\s+test|pnpm\s+test|pytest|python\s+-m\s+(pytest|unittest)|go\s+test|cargo\s+test|bundle\s+exec\s+rspec|rspec\b|phpunit|pest|artisan\s+test|phpstan|pint|dotnet\s+test|mvn\s+test|gradle\s+test|make\s+test|bats\s|bash\s+.*test|\.\/test)'

# Protected paths — block Write/Edit tool access to plugin state, hooks, and trust-relevant files
AGENTOPS_PROTECTED_PATHS='(\.agentops/|tasks/lessons\.md$)'

# Writable state files — whitelisted from protected path enforcement
# so that plugin commands (e.g. /agentops:flags) can manage them via Write/Edit.
AGENTOPS_WRITABLE_STATE='(\.agentops/flags\.json$|\.agentops/build-state\.json$|\.agentops/build-execution\.jsonl$|tasks/lessons\.md$)'

# Delegation threshold — number of modified source files before auto-delegate triggers
AGENTOPS_DELEGATE_THRESHOLD=5
