---
name: flags
description: View or toggle AgentOps feature flags
---

Read `.agentops/flags.json` in the project root. Display all flags in a table with current values. If the user provides a flag name and value as $ARGUMENTS, update it.

Available flags:
- `command_validation_enabled` (bool) — Validate Bash commands
- `path_validation_enabled` (bool) — Validate file paths
- `env_validation_enabled` (bool) — Validate env var assignments
- `injection_scan_enabled` (bool) — Scan for prompt injection
- `content_trust_enabled` (bool) — Tag external content as untrusted
- `exfiltration_detection_enabled` (bool) — Detect data exfiltration
- `credential_redaction_enabled` (bool) — Warn about credential exposure
- `plan_gate_enabled` (bool) — Require plan for multi-file changes
- `verification_gate_enabled` (bool) — Require all items checked before stop
- `test_gate_enabled` (bool) — Require tests to be run
- `star_preamble_enabled` (bool) — Inject STAR framework at session start
- `lessons_enabled` (bool) — Load and enforce lessons from tasks/lessons.md
- `llm_content_firewall_enabled` (bool) — LLM-based content injection detection
- `auto_plan_enabled` (bool) — Auto-generate STAR plan after 3+ file modifications
- `auto_test_enabled` (bool) — Auto-run tests after 3+ source code files modified
- `auto_lesson_enabled` (bool) — Auto-capture lessons after consecutive tool failures
- `auto_verify_enabled` (bool) — Auto-verify task completion before session stop
- `auto_evolve_enabled` (bool) — Auto-run EvoSkill loop if unprocessed failures exist at stop
- `auto_delegate_enabled` (bool) — Auto-delegate to code-critic and security-reviewer after 5+ source files modified
- `enforcement_mode` ("advisory"|"blocking") — Advisory uses "ask", blocking uses "deny"

Enterprise extension flags:
- `enterprise_scaffold` (bool) — Enable project scaffolding system
- `ai_workflows` (bool) — Enable AI-first workflow commands
- `unified_review` (bool) — Enable unified code review system
- `architecture_guardrails` (bool) — Enable architecture pattern enforcement
- `delivery_lifecycle` (bool) — Enable delivery phase management
- `team_governance` (bool) — Enable team scalability features
- `client_comms` (bool) — Enable client communication templates
- `autonomy_level` ("guided"|"supervised"|"autonomous") — Configurable autonomy for workflow gates

If `.agentops/flags.json` doesn't exist, create it with all flags set to their defaults (all true, mode advisory, autonomy guided).
