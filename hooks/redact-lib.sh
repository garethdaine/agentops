#!/bin/bash
# Canonical secret redaction — single source of truth for all log scrubbing.
# Sourced by: feature-flags.sh (facade)

# Usage: VALUE=$(echo "$VALUE" | agentops_redact)
agentops_redact() {
  sed -E \
    -e 's/(PASSWORD|PASS|SECRET|TOKEN|API_KEY|PRIVATE_KEY|AUTH|CREDENTIAL)=[^ "'\''&]*/\1=[REDACTED]/gi' \
    -e 's/(sk|pk|api|key|token|secret|auth)[-_][A-Za-z0-9]{16,}/[REDACTED]/g' \
    -e 's/Bearer [A-Za-z0-9._~+\/=-]{20,}/Bearer [REDACTED]/g' \
    -e 's/Basic [A-Za-z0-9+\/=]{20,}/Basic [REDACTED]/g' \
    -e 's/AKIA[A-Z0-9]{16}/[REDACTED]/g' \
    -e 's/gh[pousr]_[A-Za-z0-9]{36,}/[REDACTED]/g' \
    -e 's/xox[bpas]-[A-Za-z0-9-]{10,}/[REDACTED]/g' \
    -e 's/sk_(live|test)_[A-Za-z0-9]{10,}/[REDACTED]/g' \
    -e 's/pk_(live|test)_[A-Za-z0-9]{10,}/[REDACTED]/g' \
    -e 's/sk-ant-[A-Za-z0-9_-]{10,}/[REDACTED]/g' \
    -e 's|hooks\.slack\.com/services/[A-Za-z0-9/]+|hooks.slack.com/services/[REDACTED]|g' \
    -e 's|discord(app)?\.com/api/webhooks/[A-Za-z0-9/]+|discord.com/api/webhooks/[REDACTED]|g' \
    -e 's|[a-zA-Z]+://[^:@/]+:[^@/]+@|[REDACTED_CONN]@|g' \
    -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED_JWT]/g' \
    -e 's/-----BEGIN[A-Z ]*PRIVATE KEY-----/[REDACTED_PEM]/g'
}
