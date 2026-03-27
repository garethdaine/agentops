# Worktree Telemetry Support

## Problem

When Claude Code runs in a git worktree (e.g., `.claude/worktrees/build-xyz/`), telemetry files are written to the worktree's `.agentops/` directory, not the main repo's. The relay server discovers sessions from `~/.agentops/active-sessions.jsonl` which may point to worktree paths that the relay isn't watching.

## Current Behavior

- Relay watches `cwd/.agentops/` and paths from `active-sessions.jsonl`
- Worktree sessions register with their worktree path as `project_dir`
- If the relay was started from the main repo, it doesn't watch worktree paths
- Subagents spawned within a session share the parent session's telemetry

## Required Fix

1. Relay should watch `~/.agentops/` globally as a catch-all
2. Session discovery should follow `.git` file in worktrees to find the parent repo
3. When a session registers from a worktree path, the relay should also watch the main repo's `.agentops/`
4. The relay's `/api/sessions` endpoint should include worktree origin info
5. Subagent telemetry should be distinguishable from parent session telemetry (agent_id in events)

## Implementation Notes

- `git rev-parse --git-common-dir` resolves worktree `.git` to the main repo
- The relay already handles multiple FileWatcher instances per session
- Adding a global `~/.agentops/` watcher would catch all sessions regardless of cwd
