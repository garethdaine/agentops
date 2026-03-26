#!/usr/bin/env bats
# Tests for hooks/standards-enforce.sh — PreToolUse hook that provides
# enterprise standards guidance on Write/Edit operations.
# Non-blocking: only emits additionalContext, never denies writes.

load test-helpers

setup() {
  setup_project_dir
  # Enable the enterprise_scaffold flag (hook gates on it)
  set_flag "enterprise_scaffold" "true"
}

teardown() {
  teardown_project_dir
}

# ── Helper: build Write/Edit JSON input ─────────────────────────────────────
# Reuse file_tool_input from test-helpers.bash for consistency.

write_input() {
  file_tool_input "Write" "$1"
}

edit_input() {
  file_tool_input "Edit" "$1"
}

other_tool_input() {
  file_tool_input "$1" "$2"
}

run_hook() {
  printf '%s' "$1" | bash "$HOOKS_DIR/standards-enforce.sh"
}

# ── Feature flag gating ─────────────────────────────────────────────────────

@test "exits silently when enterprise_scaffold flag is disabled" {
  set_flag "enterprise_scaffold" "false"
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "produces output when enterprise_scaffold flag is enabled" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  [ -n "$output" ]
}

# ── Tool filtering ──────────────────────────────────────────────────────────

@test "exits silently for non-Write/Edit tools" {
  run run_hook "$(other_tool_input "Bash" "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "exits silently for Read tool" {
  run run_hook "$(other_tool_input "Read" "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "processes Write tool" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  [ -n "$output" ]
}

@test "processes Edit tool on camelCase source file" {
  run run_hook "$(edit_input "/src/myHelper.ts")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.additionalContext' >/dev/null
}

# ── Empty/missing input handling ────────────────────────────────────────────

@test "exits silently on empty input" {
  run run_hook '{}'
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "exits silently when file_path is missing" {
  INPUT=$(jq -nc --arg cwd "$TEST_PROJECT_DIR" '{
    hook_event: "PreToolUse",
    tool_name: "Write",
    tool_input: {},
    cwd: $cwd,
    permission_mode: "default"
  }')
  run run_hook "$INPUT"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Rule 1a: PascalCase for component files ─────────────────────────────────

@test "flags lowercase tsx component file in components directory" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
}

@test "flags lowercase jsx component file in pages directory" {
  run run_hook "$(write_input "/src/pages/userProfile.jsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
}

@test "flags lowercase vue component in layouts directory" {
  run run_hook "$(write_input "/src/layouts/mainLayout.vue")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
}

@test "suggests PascalCase conversion for kebab-case component" {
  run run_hook "$(write_input "/src/components/my-widget.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "MyWidget"
}

@test "does not flag PascalCase tsx component" {
  run run_hook "$(write_input "/src/components/MyWidget.tsx")"
  [ "$status" -eq 0 ]
  # Should not mention PascalCase (file is already PascalCase)
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

@test "does not flag index.tsx in components directory" {
  run run_hook "$(write_input "/src/components/index.tsx")"
  [ "$status" -eq 0 ]
  # index files are excluded from PascalCase check
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

@test "does not flag test.tsx files" {
  run run_hook "$(write_input "/src/components/Widget.test.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

@test "does not flag spec.tsx files" {
  run run_hook "$(write_input "/src/components/Widget.spec.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

@test "does not flag stories.tsx files" {
  run run_hook "$(write_input "/src/components/Widget.stories.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

@test "does not flag tsx file outside component directories" {
  run run_hook "$(write_input "/src/utils/myHelper.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

@test "does not flag useHook pattern in component dir" {
  run run_hook "$(write_input "/src/components/useWidget.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "PascalCase"
  fi
}

# ── Rule 1b: kebab-case for source files ────────────────────────────────────

@test "flags camelCase ts source file" {
  run run_hook "$(edit_input "/src/myHelper.ts")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "kebab-case"
}

@test "flags camelCase js source file" {
  run run_hook "$(edit_input "/src/myUtils.js")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "kebab-case"
}

@test "emits kebab-case guidance for camelCase ts file" {
  run run_hook "$(edit_input "/src/myHelper.ts")"
  [ "$status" -eq 0 ]
  # The hook suggests a kebab-case alternative (exact output depends on platform sed),
  # so this test only verifies that kebab-case guidance is present.
  echo "$output" | jq -r '.additionalContext' | grep -q "kebab-case"
}

@test "does not flag kebab-case ts file" {
  run run_hook "$(edit_input "/src/my-helper.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "does not flag index.ts" {
  run run_hook "$(edit_input "/src/index.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "does not flag config files" {
  run run_hook "$(edit_input "/jest.config.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "does not flag SCREAMING_CASE constant files" {
  run run_hook "$(edit_input "/src/API_CONSTANTS.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "flags camelCase mjs file" {
  run run_hook "$(edit_input "/src/dataLoader.mjs")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "kebab-case"
}

@test "flags camelCase cjs file" {
  run run_hook "$(edit_input "/src/configHelper.cjs")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "kebab-case"
}

# ── Rule 2: Test file placement ─────────────────────────────────────────────

@test "warns about misplaced test file when source is not co-located" {
  run run_hook "$(write_input "/random/widget.test.ts")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "co-locating"
}

@test "does not warn about test file in __tests__ directory" {
  run run_hook "$(write_input "/src/__tests__/widget.test.ts")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "co-locating"
  fi
}

@test "does not warn about test file in tests directory" {
  run run_hook "$(write_input "/src/tests/widget.test.ts")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "co-locating"
  fi
}

@test "does not warn about co-located test file when source exists" {
  # Create the source file so co-location check passes
  mkdir -p "$TEST_PROJECT_DIR/src"
  touch "$TEST_PROJECT_DIR/src/widget.ts"
  run run_hook "$(write_input "$TEST_PROJECT_DIR/src/widget.test.ts")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "co-locating"
  fi
}

@test "warns about misplaced spec file" {
  run run_hook "$(write_input "/random/widget.spec.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "co-locating"
}

# ── Rule 3: Import ordering guidance (Write only) ──────────────────────────

@test "includes import ordering guidance for Write on ts file" {
  run run_hook "$(write_input "/src/my-module.ts")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "Imports should follow"
}

@test "includes import ordering guidance for Write on tsx file" {
  run run_hook "$(write_input "/src/components/MyWidget.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "Imports should follow"
}

@test "does not include import ordering guidance for Edit" {
  run run_hook "$(edit_input "/src/my-module.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "includes import ordering guidance for mjs files" {
  run run_hook "$(write_input "/src/my-module.mjs")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "Imports should follow"
}

@test "does not include import ordering for non-JS files" {
  run run_hook "$(write_input "/src/styles.css")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Rule 4: Named export guidance (Write + component dirs) ──────────────────

@test "includes named export guidance for Write on tsx in component dir" {
  run run_hook "$(write_input "/src/components/MyWidget.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "named exports"
}

@test "includes named export guidance for Write on jsx in ui dir" {
  run run_hook "$(write_input "/src/ui/Button.jsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "named exports"
}

@test "includes named export guidance for Write on tsx in widget dir" {
  run run_hook "$(write_input "/src/widget/Slider.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "named exports"
}

@test "does not include export guidance for Edit" {
  run run_hook "$(edit_input "/src/components/MyWidget.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "named exports"
  fi
}

@test "does not include export guidance for tsx outside component dirs" {
  run run_hook "$(write_input "/src/utils/MyHelper.tsx")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "named exports"
  fi
}

@test "does not include export guidance for ts files in component dir" {
  run run_hook "$(write_input "/src/components/utils.ts")"
  [ "$status" -eq 0 ]
  if [ -n "$output" ]; then
    ! echo "$output" | jq -r '.additionalContext' | grep -q "named exports"
  fi
}

# ── JSON output shape ───────────────────────────────────────────────────────

@test "output is valid JSON with additionalContext key" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.additionalContext' >/dev/null
}

@test "additionalContext starts with Enterprise Standards prefix" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  echo "$output" | jq -r '.additionalContext' | grep -q "^Enterprise Standards:"
}

@test "no output for files with no rule violations" {
  run run_hook "$(edit_input "/src/my-module.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Multiple rules fire together ────────────────────────────────────────────

@test "Write on camelCase tsx in components fires PascalCase + import + export rules" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
  local ctx
  ctx=$(echo "$output" | jq -r '.additionalContext')
  echo "$ctx" | grep -q "PascalCase"
  echo "$ctx" | grep -q "Imports should follow"
  echo "$ctx" | grep -q "named exports"
}

@test "always exits 0 (non-blocking)" {
  run run_hook "$(write_input "/src/components/myWidget.tsx")"
  [ "$status" -eq 0 ]
}
