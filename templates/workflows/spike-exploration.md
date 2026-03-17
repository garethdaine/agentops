# Workflow Template: Spike / Time-boxed Exploration

## Context Gathering

1. **Hypothesis**
   - What are we trying to learn or prove?
   - What question will this spike answer?
   - What does success look like?

2. **Time box**
   - Maximum time allocated for this spike
   - What happens if we don't find an answer in time?

3. **Scope boundaries**
   - What is in scope for exploration?
   - What is explicitly out of scope?
   - What deliverables are expected at the end?

## Analysis Steps

### Step 1: Define the Hypothesis
State clearly:
- "We believe [approach] will [outcome]"
- "We will know this is true when [measurable result]"
- "Time box: [duration]"

### Step 2: Plan the Exploration
- List specific things to try/investigate
- Order by likelihood of providing answers
- Identify dependencies or prerequisites
- Set checkpoint times

### Step 3: Execute
- Try each approach in order
- Document findings as you go (don't rely on memory)
- If an approach fails, note WHY and move on
- Stop when the time box expires, even if incomplete

### Step 4: Capture Findings
Document everything learned, including dead ends.

## Output Format

```
## Spike Report

### Hypothesis
[What we set out to learn]

### Time Box
[Duration] | Started: [time] | Ended: [time]

### Findings

#### Approach 1: [Name]
- **Result:** Success / Partial / Failed
- **Evidence:** [What we observed]
- **Notes:** [Key learnings]

#### Approach 2: [Name]
- **Result:** Success / Partial / Failed
- **Evidence:** [What we observed]
- **Notes:** [Key learnings]

### Recommendation
[Based on findings, what should we do next?]

### Open Questions
- [What we still don't know]

### Artefacts
- [Links to prototype code, diagrams, or docs produced]
```

## Quality Checks

- [ ] Hypothesis was clearly stated before starting
- [ ] Time box was respected
- [ ] All approaches tried were documented (including failures)
- [ ] Findings are specific and evidence-based
- [ ] Recommendation is actionable
- [ ] Open questions are captured for follow-up
