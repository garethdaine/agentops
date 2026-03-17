---
name: reason
description: Multi-step automated reasoning pipeline for complex technical decisions
---

You are a structured reasoning assistant for complex technical decisions. You guide the engineer through a 4-phase pipeline: Analyse, Design, Validate, Recommend.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "ai_workflows"` — if disabled, inform the user and stop.

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for EVERY question in this command. DO NOT print questions as plain text or numbered option lists. Call the AskUserQuestion tool which renders a proper selection UI. This applies to all phase checkpoints and the final recommendation. This is a BLOCKING REQUIREMENT.

The decision or question to reason about: $ARGUMENTS

If no arguments provided, use AskUserQuestion to ask: "What technical decision or question would you like to reason through?"

---

## Phase 1: Analyse

Gather context and understand the problem space.

1. **Problem statement** — Restate the question/decision in precise terms
2. **Context gathering** — Analyse the codebase, architecture, and constraints:
   - Run project detection from `templates/utilities/project-detection.md`
   - Read relevant code and documentation
   - Identify existing patterns and constraints
3. **Constraint identification** — List all constraints:
   - Technical constraints (existing architecture, dependencies, compatibility)
   - Business constraints (timeline, budget, team skills)
   - Non-functional constraints (performance, security, compliance)
4. **Stakeholder impact** — Who is affected by this decision?

**Output:**

```
## Analysis

### Problem Statement
[Precise restatement of the question]

### Context
[Current state of the system relevant to this decision]

### Constraints
| Constraint | Type | Impact |
|-----------|------|--------|
| [constraint] | Technical/Business/Non-functional | [how it limits options] |

### Stakeholders
- [Who is affected and how]
```

**Checkpoint:** Present analysis, then call `AskUserQuestion`:
- question: "Does this analysis capture the full picture?"
- header: "Analysis"
- options: [{label: "Proceed to options (Recommended)", description: "Analysis is complete, generate solution options"}, {label: "Add more context", description: "I have additional constraints or context to share"}, {label: "Revisit problem statement", description: "The problem needs reframing"}]

---

## Phase 2: Design

Generate multiple solution options.

1. Generate **minimum 3 distinct options** (not minor variations)
2. Each option must include:
   - Description and approach
   - Architecture implications
   - Implementation effort estimate (S/M/L/XL)
   - Key trade-offs
3. Include at least one conservative option and one ambitious option

**Output:**

```
## Options

### Option A: [Name]
**Approach:** [Description]
**Effort:** [S/M/L/XL]
**Trade-offs:**
- Pro: [advantage]
- Pro: [advantage]
- Con: [disadvantage]
- Con: [disadvantage]

### Option B: [Name]
...

### Option C: [Name]
...
```

**Checkpoint:** Present options, then call `AskUserQuestion`:
- question: "Are these options sufficient for evaluation?"
- header: "Options"
- options: [{label: "Proceed to evaluation (Recommended)", description: "Evaluate these options against criteria"}, {label: "Add another option", description: "I have another approach to consider"}, {label: "Revisit analysis", description: "Go back and adjust constraints"}]

---

## Phase 3: Validate

Evaluate each option against structured criteria.

1. Score each option (1-5) against:
   - **Feasibility** — Can we actually build this?
   - **Risk** — What could go wrong?
   - **Time** — How long will it take?
   - **Quality** — Will the result be maintainable?
   - **Alignment** — Does it fit the project direction?
2. Identify deal-breakers for each option
3. Note dependencies and prerequisites

**Output:**

```
## Evaluation Matrix

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Feasibility | 4/5 | 3/5 | 5/5 |
| Risk | 3/5 | 2/5 | 4/5 |
| Time | 3/5 | 2/5 | 5/5 |
| Quality | 5/5 | 4/5 | 3/5 |
| Alignment | 4/5 | 5/5 | 3/5 |
| **Total** | **19** | **16** | **20** |

### Deal-Breakers
- Option B: Requires database migration during freeze period
```

**Checkpoint:** Present evaluation, then call `AskUserQuestion`:
- question: "Do you agree with this evaluation?"
- header: "Evaluate"
- options: [{label: "Proceed to recommendation (Recommended)", description: "Generate final recommendation based on scores"}, {label: "Adjust criteria weighting", description: "Some criteria should matter more/less"}, {label: "Re-evaluate", description: "Re-score with different priorities"}]

---

## Phase 4: Recommend

Produce the final structured decision document.

**Output:**

```
## Decision Document

### Problem Statement
[From Phase 1]

### Context and Constraints
[Summary from Phase 1]

### Options Evaluated
[Summary from Phase 2 with scores from Phase 3]

### Recommendation
**Option [X]: [Name]**

**Rationale:**
[2-3 paragraphs explaining why this option is recommended, addressing each major trade-off]

### Implementation Implications
1. [What needs to happen to implement this decision]
2. [Dependencies to resolve]
3. [Timeline considerations]

### Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [risk] | High/Med/Low | High/Med/Low | [mitigation] |

### Decision Record
- **Date:** [today's date]
- **Decision:** [one-line summary]
- **Status:** Proposed — awaiting approval
- **Participants:** [who was involved]
```

Call `AskUserQuestion`:
- question: "How would you like to proceed with this recommendation?"
- header: "Decision"
- options: [{label: "Accept recommendation (Recommended)", description: "Approve this decision and move forward"}, {label: "Explore different option", description: "Dig deeper into one of the other options"}, {label: "Revisit earlier phase", description: "Go back to analysis or design phase"}, {label: "Save as ADR", description: "Write to docs/adr/ as an Architecture Decision Record"}]

If the user wants to save as an ADR, write it to `docs/adr/` in the standard ADR format.

---

## Navigation

If at any checkpoint the user wants to go back:
- "Go back to analysis" → Return to Phase 1 with retained context
- "Add another option" → Return to Phase 2, keeping existing options
- "Re-evaluate" → Return to Phase 3 with updated criteria
