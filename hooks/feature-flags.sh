#!/bin/bash
# Shared library facade — source this from all hooks.
# Usage: source "${SCRIPT_DIR}/feature-flags.sh"
#
# This file assembles focused sub-libraries into a single entry point.
# All existing hooks continue to work unchanged by sourcing this file.
#
# Sub-libraries:
#   flag-utils.sh      — Core flag reading, mode, check helpers
#   enforcement-lib.sh — Enforcement actions, bypass, fail-closed
#   patterns-lib.sh    — Shared patterns, thresholds, protected paths
#   redact-lib.sh      — Secret redaction
#   evolve-lib.sh      — Failure tracking helpers

_AGENTOPS_LIB_DIR="${BASH_SOURCE[0]%/*}"

source "${_AGENTOPS_LIB_DIR}/flag-utils.sh"
source "${_AGENTOPS_LIB_DIR}/enforcement-lib.sh"
source "${_AGENTOPS_LIB_DIR}/patterns-lib.sh"
source "${_AGENTOPS_LIB_DIR}/redact-lib.sh"
source "${_AGENTOPS_LIB_DIR}/evolve-lib.sh"

# ── Supply-Chain Defense Flags ───────────────────────────────────────────────
# code_field_rules_enabled        Code Field methodology — session-start injection
#                                 (confidence scoring, verify, Answer/Confidence/Caveats).
# unicode_firewall_enabled        Glassworm/Trojan Source defense — auto-strips
#                                 invisible Unicode on writes, warns on reads,
#                                 scans project at session start.
# integrity_verification_enabled  SHA-256 manifest of agent-written files —
#                                 records hashes on write, verifies on session start.
# lockfile_audit_enabled          Scans dependency lockfiles at session start for
#                                 Unicode anomalies, suspicious registries, and
#                                 malformed integrity hashes.

# ── Enterprise Extension Flags ──────────────────────────────────────────────
# These flags gate the enterprise delivery framework capabilities.
# All default to "true" via agentops_flag's default mechanism.
# Toggle via /agentops:flags or by editing .agentops/flags.json directly.
#
# Flag name                      Phase   Description
# enterprise_scaffold            2       Project scaffolding system
# ai_workflows                   3       AI-first workflow commands
# unified_review                 4       Unified code review system
# architecture_guardrails        5       Architecture pattern enforcement
# delivery_lifecycle             6       Delivery phase management
# team_governance                7       Team scalability features
# client_comms                   8       Client communication templates

# ── Build Lifecycle Flags ────────────────────────────────────────────────────
# Flags for the /agentops:build master lifecycle command.
# Gated by: agentops_enterprise_enabled "ai_workflows"
# Default values shown below — override in .agentops/flags.json.
#
# Flag name                      Default  Description
# build_tdd_enforced             true     Enforce RED→GREEN→REFACTOR TDD cycle
# build_parallel_research        true     Run Phase 2 researcher subagents in parallel
# build_xml_plans                true     Produce XML plan (docs/build/{slug}/plan.xml)
# build_linear_sync              false    Push tasks to Linear and update status
# build_fresh_context            true     Spawn fresh subagent per execution task
# build_wave_parallel            true     Execute independent tasks in parallel within waves
# build_nyquist_enforce          true     Require <test>/<verify>/<done> on every plan task
# build_persuasion               true     Embed persuasion prompts in human gate messages
# build_quick_mode               false    Lightweight mode: brainstorm→plan→execute→verify
# build_scaffold_auto            true     Auto-run scaffold on new projects (Phase 4.5)
# build_standards_inject         true     Inject engineering-standards.md into execution agents
# standards_enforcement_mode     advisory Advisory or blocking mode for standards violations
# build_git_workflow             worktree Git branching strategy: worktree, feature-branch, or trunk
