#!/bin/bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/feature-flags.sh"

[ "$(agentops_flag 'code_field_rules_enabled')" = "false" ] && exit 0

CONTEXT=$(cat <<'EOF'
AgentOps Code Field Methodology (MANDATORY): Before writing or materially changing code, follow this structured approach.

DECOMPOSE — Break complex problems into sub-problems: distinct parts, dependencies, logical order.

SOLVE — Address each sub-problem with explicit confidence (0.0–1.0): 0.9–1.0 high (proven pattern) → proceed; 0.7–0.8 moderate → extra testing; 0.5–0.6 low → verify first; <0.5 very low → research or clarify before coding.

VERIFY — For each solution: logic (reasoning holds?), facts (references accurate?), completeness (edge cases?), bias (familiar vs optimal?).

SYNTHESIZE — Weighted average of sub-problem confidences; flag any piece below 0.7.

REFLECT — If overall confidence <0.8: name the weakness, research or ask, retry with new information.

Required output for complex solutions (include in chat when delivering substantive technical answers, recommendations, or non-trivial code changes):
✅ Answer: [clear solution or recommendation]
📊 Confidence: [0.0–1.0] ([brief justification])
⚠️ Caveats: [assumptions, limitations, conditions]

Principle: Code that knows its own limits beats code that “works” but fails unexpectedly. Complements STAR planning — use Code Field during implementation and review.
EOF
)

jq -nc --arg msg "$CONTEXT" '{systemMessage: $msg}'
