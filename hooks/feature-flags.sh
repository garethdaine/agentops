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
