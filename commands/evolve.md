---
name: evolve
description: Run the EvoSkill loop to discover and refine skills from execution failures
---

Run the EvoSkill self-evolution loop. This analyzes recent failures, proposes skill improvements, builds them, and retains only the ones that improve performance.

## Process

### Step 1: Collect Failures
Read `.agentops/failures.jsonl` for recent execution failures (from PostToolUseFailure hook and task failures). If no failures exist, report that and stop.

### Step 2: Load Feedback History
Read `.agentops/feedback-history.jsonl` for prior proposals, their outcomes, and score deltas. This prevents redundant proposals and enables the Proposer to learn from past iterations.

### Step 3: Spawn Proposer Agent
For each failure cluster (group similar failures):
- Pass the execution trace, expected outcome, existing skills inventory, and feedback history to the Proposer agent
- The Proposer diagnoses root causes and outputs a skill proposal (create or edit)

### Step 4: Spawn Skill-Builder Agent
For each accepted proposal:
- Pass the proposal to the Skill-Builder agent
- The Skill-Builder materializes it into a concrete SKILL.md + optional scripts
- Write the skill to `skills/{skill-name}/`

### Step 5: Frontier Update
- Score the candidate skill set against a validation set (if available) or log for future evaluation
- If the candidate outscores the current weakest frontier member, add it
- If the frontier exceeds capacity k (default 5), remove the weakest
- Record the result in `.agentops/feedback-history.jsonl`

### Step 6: Report
Output a summary: how many failures analyzed, proposals made, skills created/edited, frontier changes.

### Step 7: Mark Completion
After the evolve loop completes (even if no skills were created), create the sentinel file `.agentops/evolve-ran` to signal that failures have been processed this session. This MUST be done by the skill — agents should NEVER manually create this file.

Arguments: $ARGUMENTS (optional: --max-iterations N, --frontier-size K, --dry-run)
