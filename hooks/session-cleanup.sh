#!/bin/bash
set -uo pipefail

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // "."' 2>/dev/null) || CWD="."
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null) || SESSION_ID=""
STATE_DIR="${CWD}/.agentops"

mkdir -p "$STATE_DIR" 2>/dev/null

# ── Session Registry Cleanup ─────────────────────────────────────────────────
# Remove previous session entry from the global active-sessions registry.
REGISTRY_FILE="$HOME/.agentops/active-sessions.jsonl"
if [ -n "$SESSION_ID" ] && [ -f "$REGISTRY_FILE" ]; then
  TMP_REG=$(mktemp)
  grep -v "\"session_id\":\"${SESSION_ID}\"" "$REGISTRY_FILE" > "$TMP_REG" 2>/dev/null || true
  mv "$TMP_REG" "$REGISTRY_FILE" 2>/dev/null || true
fi

# Mark session start time for staleness checks
date -u +%FT%TZ > "${STATE_DIR}/session-start" 2>/dev/null

# Reset per-session state markers from previous sessions
# All session-scoped files are listed here; add new ones as needed
SESSION_FILES=(
  "consecutive-failures"
  "delegate-sent"
  "test-nudge-sent"
  "code-files-since-test.txt"
  "evolve-ran"
  "evolve-batch-count"
  "modified-files.txt"
  "star-obs-count"
  "star-plan-active"
  "tests-ran"
)
for f in "${SESSION_FILES[@]}"; do
  rm -f "${STATE_DIR}/${f}" 2>/dev/null
done

# Provision .gitignore files in plugin-created folders.
# Rules:
#   - .agentops/ always gets .gitignore (always plugin-created)
#   - tasks/, skills/, docs/ only get .gitignore if the plugin has created content in them
#   - Skip if directory doesn't exist, .gitignore already exists, or directory is git-tracked
IS_GIT_REPO=false
git -C "$CWD" rev-parse --git-dir &>/dev/null && IS_GIT_REPO=true

agentops_provision_gitignore() {
  local dir="$1"
  local DIR_PATH="${CWD}/${dir}"
  local GITIGNORE_PATH="${DIR_PATH}/.gitignore"

  [ ! -d "$DIR_PATH" ] && return
  [ -f "$GITIGNORE_PATH" ] && return

  if [ "$IS_GIT_REPO" = true ]; then
    local TRACKED
    TRACKED=$(git -C "$CWD" ls-files -- "${dir}/" 2>/dev/null | head -1)
    [ -n "$TRACKED" ] && return
  fi

  echo "*" > "$GITIGNORE_PATH" 2>/dev/null
}

# .agentops/ — always provision (this plugin creates it)
agentops_provision_gitignore ".agentops"

# tasks/ — only if plugin has created todo.md, lessons.md, or archive/
if [ -f "${CWD}/tasks/todo.md" ] || [ -f "${CWD}/tasks/lessons.md" ] || [ -d "${CWD}/tasks/archive" ]; then
  agentops_provision_gitignore "tasks"
fi

# skills/ — only if plugin-generated SKILL.md files exist
if [ -d "${CWD}/skills" ] && [ -n "$(find "${CWD}/skills" -name 'SKILL.md' -maxdepth 2 2>/dev/null | head -1)" ]; then
  agentops_provision_gitignore "skills"
fi

# docs/ — only if the plugin's code-analysis output directory exists
if [ -d "${CWD}/docs/discovery/code-analysis" ]; then
  agentops_provision_gitignore "docs"
fi

exit 0
