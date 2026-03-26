# Improvement Backlog

> Prioritised work items for the auto-improvement agent. Items marked [REVIEW] require human approval before implementation. Items marked [READY] can be picked up autonomously.

## Priority Queue

### Batch 1 — Test Coverage Foundation
1. [DONE] Add BATS tests for `auto-test.sh` hook — PR #1 (2026-03-26)
2. [DONE] Add BATS tests for `auto-plan.sh` hook — PR #2 (2026-03-26)
3. [DONE] Add BATS tests for `auto-verify.sh` hook — PR #3 (2026-03-26)
4. [DONE] Add BATS tests for `auto-delegate.sh` hook — PR #4 (2026-03-26)
5. [READY] Add BATS tests for `auto-lesson.sh` hook — verify lesson capture on tool failure
6. [READY] Improve ShellCheck compliance — fix warnings in all hook scripts

### Batch 2 — Security Hardening
7. [READY] Add BATS tests for `delegation-trust.sh` hook — verify subagent trust boundaries
8. [READY] Add BATS tests for `standards-enforce.sh` hook — verify standards checks on Write/Edit
9. [READY] Harden `injection-scan.sh` — add detection for base64-encoded injection payloads
10. [READY] Harden `exfiltration-check.sh` — add detection for DNS exfiltration patterns
11. [READY] Add `--sarif` output option to security-reviewer agent for CI integration
12. [REVIEW] Add SBOM generation to `supply-chain-scan.md` command using `syft` or `cdxgen`

### Batch 3 — EvoSkill Improvements
13. [READY] Add `--dry-run` flag to evolve command — show proposals without applying
14. [READY] Add skill invocation counter to feedback-history.jsonl — track reuse metrics
15. [READY] Add skill scoring: success_rate, invocation_count, avg_token_savings fields
16. [REVIEW] Implement trajectory distillation — extract principles from build-execution.jsonl
17. [REVIEW] Add cross-agent reflection step to proposer agent — require critique before materialisation

### Batch 4 — Agent Optimisation
18. [READY] Add difficulty estimation heuristic to delegation-router agent
19. [READY] Add token cost tracking per specialist agent invocation to telemetry
20. [REVIEW] Implement agent fusion config — merge 4 researcher agents into 2 for simple builds
21. [REVIEW] Surface AST test dependency maps in execution context for TDD phases

### Batch 5 — Platform & Ecosystem
22. [READY] Add Mermaid architecture diagram to docs/ARCHITECTURE.md
23. [READY] Add GETTING-STARTED.md contributor guide
24. [REVIEW] Expose `/agentops:review` as MCP tool
25. [REVIEW] Add CI-native mode — GitHub Action that runs security hooks on PRs
26. [REVIEW] Add `/agentops:metrics` command for session dashboard

### Batch 6 — Documentation
27. [READY] Add hook development guide with BATS test template
28. [READY] Add command development guide with AskUserQuestion patterns
29. [READY] Document feature flag interaction rules and precedence
30. [READY] Add troubleshooting guide for common hook failures

---

## Completed Items
1. Add BATS tests for `auto-test.sh` hook — PR #1 (2026-03-26)
2. Add BATS tests for `auto-plan.sh` hook — PR #2 (2026-03-26)
3. Add BATS tests for `auto-verify.sh` hook — PR #3 (2026-03-26)
4. Add BATS tests for `auto-delegate.sh` hook — PR #4 (2026-03-26)
