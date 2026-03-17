# Workflow Template: Architecture Decision

## Context Gathering

1. **Problem statement**
   - What architectural question needs answering?
   - What triggered this decision? (new feature, scaling issue, tech debt)
   - What is the current architecture in the affected area?

2. **Constraints**
   - Timeline constraints
   - Team skill constraints
   - Budget/infrastructure constraints
   - Compatibility requirements
   - Compliance/regulatory requirements

3. **Quality attributes**
   - Which matter most? (performance, scalability, maintainability, security, developer experience)
   - What are the measurable targets?

## Analysis Steps

### Step 1: Context Documentation
- Document the current state
- Identify the forces driving this decision
- List all constraints and requirements

### Step 2: Options Generation
Generate minimum 3 distinct options:
- **Option A:** The conservative approach (low risk, incremental)
- **Option B:** The balanced approach (moderate risk, good ROI)
- **Option C:** The ambitious approach (higher risk, higher reward)
- Additional options as relevant

### Step 3: Trade-off Analysis
For each option, evaluate against:
- Feasibility (1-5)
- Risk (1-5)
- Time to implement (1-5)
- Long-term quality (1-5)
- Team alignment (1-5)

### Step 4: Recommendation
- Select the recommended option with rationale
- Address each major trade-off
- Define implementation implications
- Identify risks and mitigations

## Output Format (ADR)

```
# ADR-[number]: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
[What is the issue motivating this decision?]

## Decision
[What is the change that we're proposing?]

## Consequences

### Positive
- [benefit]

### Negative
- [drawback]

### Neutral
- [observation]

## Alternatives Considered

### [Alternative 1]
- Rejected because: [reason]

### [Alternative 2]
- Rejected because: [reason]
```

## Quality Checks

- [ ] Problem statement is clear and specific
- [ ] At least 3 options were considered
- [ ] Trade-offs are honestly assessed (no straw-man alternatives)
- [ ] Recommendation has clear rationale
- [ ] Consequences (positive AND negative) are documented
- [ ] Implementation path is actionable
