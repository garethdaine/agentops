#!/usr/bin/env bats
# Tests for hooks/lockfile-audit.sh — SessionStart hook that scans lockfiles
# for Unicode anomalies, suspicious registry URLs, and malformed integrity hashes.

load test-helpers

setup() {
  setup_project_dir
}

teardown() {
  teardown_project_dir
}

# ── Helper: run the hook with CLAUDE_PROJECT_DIR pointed at $TEST_PROJECT_DIR ─
run_hook() {
  CLAUDE_PROJECT_DIR="$TEST_PROJECT_DIR" bash "$HOOKS_DIR/lockfile-audit.sh" </dev/null
}

# ── Feature flag gating ──────────────────────────────────────────────────────

@test "exits silently when lockfile_audit_enabled=false" {
  set_flag "lockfile_audit_enabled" "false"
  touch "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "runs when lockfile_audit_enabled is not set (default)" {
  touch "$TEST_PROJECT_DIR/package-lock.json"
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  [ -n "$output" ]
}

# ── No lockfiles → silent exit ──────────────────────────────────────────────

@test "exits silently when no lockfiles exist" {
  run run_hook
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# ── Lockfile discovery ─────────────────────────────────────────────────────

@test "detects package-lock.json" {
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects yarn.lock" {
  echo '# yarn lockfile' > "$TEST_PROJECT_DIR/yarn.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects pnpm-lock.yaml" {
  echo 'lockfileVersion: 5' > "$TEST_PROJECT_DIR/pnpm-lock.yaml"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects composer.lock" {
  echo '{}' > "$TEST_PROJECT_DIR/composer.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects Gemfile.lock" {
  echo 'GEM' > "$TEST_PROJECT_DIR/Gemfile.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects Cargo.lock" {
  echo '[metadata]' > "$TEST_PROJECT_DIR/Cargo.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects poetry.lock" {
  echo '[[package]]' > "$TEST_PROJECT_DIR/poetry.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects Pipfile.lock" {
  echo '{}' > "$TEST_PROJECT_DIR/Pipfile.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects go.sum" {
  echo 'golang.org/x/text v0.3.0 h1:abc==' > "$TEST_PROJECT_DIR/go.sum"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects pubspec.lock" {
  echo 'packages:' > "$TEST_PROJECT_DIR/pubspec.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects packages.lock.json" {
  echo '{}' > "$TEST_PROJECT_DIR/packages.lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "detects multiple lockfiles and reports correct count" {
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  echo '# yarn' > "$TEST_PROJECT_DIR/yarn.lock"
  echo '{}' > "$TEST_PROJECT_DIR/Pipfile.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("3 lockfile")' >/dev/null
}

# ── Workspace subdirectory discovery ────────────────────────────────────────

@test "discovers lockfiles in workspace subdirectories (1 level deep)" {
  # The hook iterates $PROJECT_DIR/*/ — so direct child directories only
  mkdir -p "$TEST_PROJECT_DIR/packages"
  echo '{}' > "$TEST_PROJECT_DIR/packages/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
}

@test "discovers lockfiles in both root and subdirectories" {
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  mkdir -p "$TEST_PROJECT_DIR/api"
  echo '# yarn' > "$TEST_PROJECT_DIR/api/yarn.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("2 lockfile")' >/dev/null
}

# ── Clean scan (no anomalies) ──────────────────────────────────────────────

@test "reports no anomalies for a clean lockfile" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "name": "test-project",
  "lockfileVersion": 3,
  "packages": {
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg=="
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "no audit.jsonl entry for clean scan" {
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  [ ! -f "$TEST_PROJECT_DIR/.agentops/audit.jsonl" ]
}

# ── Check 1: Unicode anomalies ─────────────────────────────────────────────

@test "detects invisible Unicode in lockfile (zero-width space)" {
  # U+200B zero-width space embedded in a lockfile
  printf '{"name":"evil\xe2\x80\x8bpackage"}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("CRITICAL")' >/dev/null
  echo "$output" | jq -e '.systemMessage | test("invisible Unicode")' >/dev/null
}

@test "Unicode finding increments finding count" {
  printf '{"name":"evil\xe2\x80\x8bpackage"}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 FINDING")' >/dev/null
}

@test "Unicode finding writes to audit.jsonl" {
  printf '{"name":"evil\xe2\x80\x8bpackage"}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  [ -f "$TEST_PROJECT_DIR/.agentops/audit.jsonl" ]
  jq -e '.event == "LOCKFILE_AUDIT_FINDINGS"' "$TEST_PROJECT_DIR/.agentops/audit.jsonl" >/dev/null
}

# ── Check 2: Suspicious registry URLs ──────────────────────────────────────

@test "flags non-standard registry URLs" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-package-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("WARNING")' >/dev/null
  echo "$output" | jq -e '.systemMessage | test("non-standard registry")' >/dev/null
}

@test "does not flag safe registry URLs (npmjs.org)" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/lodash": {
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg=="
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "does not flag pypi.org URLs" {
  cat > "$TEST_PROJECT_DIR/Pipfile.lock" <<'EOF'
{
  "default": {
    "requests": {
      "hashes": ["sha256:abc123"],
      "index": "pypi",
      "version": "==2.28.0"
    }
  },
  "_meta": {
    "sources": [{"url": "https://pypi.org/simple", "name": "pypi"}]
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "does not flag github.com URLs" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/my-fork": {
      "resolved": "https://github.com/user/repo/archive/v1.0.0.tar.gz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "does not flag crates.io URLs" {
  cat > "$TEST_PROJECT_DIR/Cargo.lock" <<'EOF'
[[package]]
name = "serde"
version = "1.0.0"
source = "registry+https://index.crates.io/serde"
checksum = "abc123"
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "does not flag .md/.html/.txt/.pdf URLs" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/docs": {
      "resolved": "https://some-site.example.com/readme.md"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "reports URL count in warning message" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "a": {"resolved": "https://evil1.example.com/a-1.0.0.tgz"},
    "b": {"resolved": "https://evil2.example.com/b-1.0.0.tgz"},
    "c": {"resolved": "https://evil3.example.com/c-1.0.0.tgz"}
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("3 non-standard registry")' >/dev/null
}

@test "limits suspicious URL sample to 5" {
  # Create more than 5 suspicious URLs — output should be capped
  local ENTRIES=""
  for i in $(seq 1 8); do
    ENTRIES="$ENTRIES\"pkg$i\":{\"resolved\":\"https://evil$i.example.com/pkg-1.0.tgz\"},"
  done
  ENTRIES="${ENTRIES%,}"
  echo "{\"packages\":{$ENTRIES}}" > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("8 non-standard registry")' >/dev/null
}

# ── Check 3: Integrity hash anomalies ──────────────────────────────────────

@test "flags malformed integrity hashes in package-lock.json" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/bad": {
      "integrity": "md5-abc123def456",
      "resolved": "https://registry.npmjs.org/bad/-/bad-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("malformed integrity")' >/dev/null
}

@test "flags malformed integrity hashes in yarn.lock" {
  cat > "$TEST_PROJECT_DIR/yarn.lock" <<'EOF'
lodash@^4.17.0:
  version "4.17.21"
  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz"
  "integrity": "md5-invalidhash"
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("malformed integrity")' >/dev/null
}

@test "does not flag valid sha512 integrity hashes" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/lodash": {
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "does not flag valid sha256 integrity hashes" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/test": {
      "integrity": "sha256-abc123def456ghi789jkl012mno345pqr678stu901vwx234=",
      "resolved": "https://registry.npmjs.org/test/-/test-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "integrity check only applies to package-lock.json and yarn.lock" {
  # Cargo.lock should not be checked for npm integrity hashes
  cat > "$TEST_PROJECT_DIR/Cargo.lock" <<'EOF'
[[package]]
name = "serde"
version = "1.0.0"
"integrity": "md5-thisisnotchecked"
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

# ── Multiple findings ──────────────────────────────────────────────────────

@test "reports combined finding count for multiple issues" {
  # Both suspicious URL and bad integrity in one file
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-1.0.0.tgz",
      "integrity": "md5-badhash"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("2 FINDING")' >/dev/null
}

@test "reports findings across multiple lockfiles" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/bad": {
      "resolved": "https://evil-registry.example.com/bad-1.0.0.tgz"
    }
  }
}
EOF
  cat > "$TEST_PROJECT_DIR/Pipfile.lock" <<'EOF'
{
  "_meta": {
    "sources": [{"url": "https://evil-pypi.example.com/simple", "name": "evil"}]
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("2 FINDING")' >/dev/null
  echo "$output" | jq -e '.systemMessage | test("2 lockfile")' >/dev/null
}

# ── Audit log output ──────────────────────────────────────────────────────

@test "audit.jsonl entry contains required fields" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  [ -f "$TEST_PROJECT_DIR/.agentops/audit.jsonl" ]
  local ENTRY
  ENTRY=$(head -1 "$TEST_PROJECT_DIR/.agentops/audit.jsonl")
  echo "$ENTRY" | jq -e '.ts' >/dev/null
  echo "$ENTRY" | jq -e '.event == "LOCKFILE_AUDIT_FINDINGS"' >/dev/null
  echo "$ENTRY" | jq -e '.findings' >/dev/null
  echo "$ENTRY" | jq -e '.files_scanned' >/dev/null
}

@test "audit.jsonl timestamp is ISO 8601 UTC" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  local TS
  TS=$(jq -r '.ts' "$TEST_PROJECT_DIR/.agentops/audit.jsonl")
  [[ "$TS" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

# ── JSON output shape ──────────────────────────────────────────────────────

@test "output is valid JSON with systemMessage field (clean scan)" {
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

@test "output is valid JSON with systemMessage field (findings)" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage' >/dev/null
}

@test "clean scan message mentions lockfile count" {
  echo '{}' > "$TEST_PROJECT_DIR/package-lock.json"
  echo '# yarn' > "$TEST_PROJECT_DIR/yarn.lock"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("2 lockfile")' >/dev/null
}

@test "findings message includes supply-chain attack warning" {
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("supply-chain")' >/dev/null
}

# ── Edge cases ─────────────────────────────────────────────────────────────

@test "handles empty lockfile" {
  touch "$TEST_PROJECT_DIR/package-lock.json"
  run run_hook
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("no anomalies")' >/dev/null
}

@test "creates .agentops directory if missing (findings case)" {
  rm -rf "$TEST_PROJECT_DIR/.agentops"
  cat > "$TEST_PROJECT_DIR/package-lock.json" <<'EOF'
{
  "packages": {
    "node_modules/evil": {
      "resolved": "https://evil-registry.example.com/evil-1.0.0.tgz"
    }
  }
}
EOF
  run run_hook
  [ "$status" -eq 0 ]
  [ -d "$TEST_PROJECT_DIR/.agentops" ]
}

@test "defaults CLAUDE_PROJECT_DIR to current directory when unset" {
  # Run from a temp dir with a lockfile — should work with default "."
  local TMPD
  TMPD=$(mktemp -d)
  echo '{}' > "$TMPD/package-lock.json"
  run bash -c "cd '$TMPD' && unset CLAUDE_PROJECT_DIR && bash '$HOOKS_DIR/lockfile-audit.sh' </dev/null"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.systemMessage | test("1 lockfile")' >/dev/null
  rm -rf "$TMPD"
}
