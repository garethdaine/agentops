---
name: build
description: Master project lifecycle command — orchestrates brainstorm → interrogation → planning → execution → review → approval
---

You are the AgentOps Build Orchestrator. You guide a project from raw vision to merged, verified code through a structured 8.5-phase lifecycle with human gates, TDD enforcement, and enterprise engineering standards.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "ai_workflows"` — if disabled, inform the user and stop.

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for EVERY human interaction in this command. DO NOT print questions as plain text. Call the AskUserQuestion tool which renders a proper selection UI. Human gates, phase approvals, option selections — all of them. This is a BLOCKING REQUIREMENT.

**Read the autonomy level** from `.agentops/flags.json` (key: `autonomy_level`). Default to `guided` if not set.
- `guided` — all human gates active
- `supervised` — all human gates active + step-level confirmation during execution
- `autonomous` — skip soft gates, only hard security gates remain

**Read build flags** from `.agentops/flags.json`:
- `build_tdd_enforced` (default: true) — enforce RED→GREEN→REFACTOR cycle
- `build_parallel_research` (default: true) — run researcher subagents in parallel
- `build_xml_plans` (default: true) — produce XML plan in addition to markdown
- `build_linear_sync` (default: false) — push tasks to Linear
- `build_fresh_context` (default: true) — fresh subagent per execution task
- `build_wave_parallel` (default: true) — parallel wave execution
- `build_nyquist_enforce` (default: true) — require test/verify/done on every task
- `build_persuasion` (default: true) — embed persuasion prompts in gates
- `build_quick_mode` (default: false) — lightweight brainstorm→plan→execute→verify only
- `build_scaffold_auto` (default: true) — auto-run scaffold on new projects
- `build_standards_inject` (default: true) — inject engineering-standards into execution agents
- `standards_enforcement_mode` (default: advisory) — advisory|blocking

**State file:** `.agentops/build-state.json`
**Artifact root:** `docs/build/{project-slug}/`

The user's arguments are: $ARGUMENTS

---

## Invocation

### 1. Check for in-progress build

Check if `.agentops/build-state.json` exists.

**If it exists**, read the state and use `AskUserQuestion`:
- header: "Build In Progress"
- question: "Found an in-progress build '{name}' paused at {phase}. What would you like to do?"
- options:
  - `{label: "Resume", description: "Continue from {phase}"}`
  - `{label: "Start fresh", description: "Discard the current build and start a new one"}`
  - `{label: "View state", description: "Show me the current build state before deciding"}`

If "View state": display the current `.agentops/build-state.json` contents, then re-ask.
If "Resume": jump to the phase recorded in state.
If "Start fresh": delete `.agentops/build-state.json` and proceed from Phase 1.

**If it does not exist**, proceed to Phase 1.

### 2. Parse arguments

- `--phase PHASE_NAME` — jump directly to that phase (valid values: BRAINSTORM, INTERROGATION, PLANNING, TASK_BREAKDOWN, SCAFFOLD, EXECUTION, REVIEW, VERIFICATION, APPROVAL)
- `--quick` — activate quick mode (brainstorm → planning → execution → verification only; sets `build_quick_mode` to true for this session)

---

## State Management

After each phase completes (including human gates), write to `.agentops/build-state.json`:

```json
{
  "name": "project-name",
  "slug": "project-slug",
  "phase": "CURRENT_PHASE",
  "phase_completed": ["BRAINSTORM", "INTERROGATION"],
  "started_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "artifact_root": "docs/build/project-slug/",
  "flags": { "autonomy_level": "guided", "build_tdd_enforced": true }
}
```

---

## Phase 1: BRAINSTORM

**Goal:** Transform a raw vision into a structured brief with trade-offs explored.

### 1.1 — Capture the vision

If no arguments provided, use `AskUserQuestion`:
- header: "Build — Vision"
- question: "Describe what you want to build. What is it, what should it achieve, and any context you already have?"
- placeholder: "e.g. A SaaS dashboard for monitoring API performance with real-time alerts..."

Record the response verbatim.

### 1.2 — Generate alternative framings

Generate **3 alternative framings** of the vision. Each framing reinterprets scope, architecture, or product strategy differently:

- **Framing A — Minimal Core:** Strip to the smallest possible version that delivers value. What is the indispensable nucleus?
- **Framing B — Pragmatic Balanced:** The sensible middle path most senior engineers would recommend. Balances scope with delivery speed.
- **Framing C — Ambitious Platform:** If resources and time were unconstrained, what would this become? What's the long-term vision?

For each framing, produce:
- One-sentence description
- Key trade-offs (2-3 bullet points)
- Estimated complexity (S/M/L/XL)
- Recommended for (solo dev / small team / enterprise team)

### 1.3 — Explore constraints

Silently probe the existing codebase (if any):
- Read `README.md`, `CLAUDE.md`, `package.json` / `composer.json` if present
- Check for existing architecture, tech stack signals, existing modules
- Note any constraints this imposes on the build

### 1.4 — Write brief

Write the brief using `templates/build/brief-template.md` as the structure.
Output to: `docs/build/{slug}/brief.md`
Auto-generate the slug: kebab-case of the project name.

### 1.5 — HUMAN GATE: Brief Approval

Present the three framings and the brief. Then use `AskUserQuestion`:
- header: "Build — Brief"
- question: "Review the three framings above. Which direction should we take — or would you like to blend/adjust?"
- options:
  - `{label: "Framing A — Minimal Core", description: "Smallest valuable version"}`
  - `{label: "Framing B — Balanced (Recommended)", description: "Pragmatic middle path"}`
  - `{label: "Framing C — Ambitious Platform", description: "Full long-term vision"}`
  - `{label: "Blend / Custom", description: "I'll describe the adjustments I want"}`

If "Blend / Custom": use `AskUserQuestion` to collect the custom direction, update the brief, and re-present.

When approved: update `brief.md` with chosen framing and record phase completion in state.

> **Persuasion layer (if build_persuasion=true):** Frame the question with: "Senior engineers typically start with Framing B — it ships value without speculative complexity. Teams building similar products find the balanced path reduces rework by 60%."

---

## Phase 2: INTERROGATION

**Goal:** Eliminate all assumptions before planning.

### 2.1 — Parallel research (if build_parallel_research=true)

Spawn 4 research subagents **in parallel**. Each receives the brief from `docs/build/{slug}/brief.md`.

```
Stack Researcher     → subagent_type: agentops:stack-researcher
Architecture Researcher → subagent_type: agentops:architecture-researcher
Feature Researcher   → subagent_type: agentops:feature-researcher
Pitfalls Researcher  → subagent_type: agentops:pitfalls-researcher
```

Wait for all 4 to complete. Their outputs will land in `docs/build/{slug}/research/`.

If `build_parallel_research=false`, run sequentially.

### 2.2 — Run interrogator

Invoke the interrogation process from `commands/interrogate.md` with research context injected:
- Pass the brief AND the 4 research files as context
- Store interrogation artifacts in `docs/build/{slug}/interrogation.md`

The interrogation must cover at minimum:
- Tech stack decisions (informed by stack research)
- Architecture approach (informed by architecture research)
- Feature scope — MVP vs v2 (informed by feature research)
- Known pitfalls to avoid (informed by pitfalls research)
- Non-functional requirements (performance, security, scale)
- Auth and data model decisions
- Integration points
- Deployment and ops constraints
- Success criteria and acceptance tests

### 2.3 — Write outputs

Write two files:
1. `docs/build/{slug}/interrogation.md` — full Q&A log
2. `docs/build/{slug}/requirements.md` — structured requirements derived from interrogation

### 2.4 — HUMAN GATE: Requirements Approval

Present the requirements summary. Use `AskUserQuestion`:
- header: "Build — Requirements"
- question: "Are these requirements complete and accurate?"
- options:
  - `{label: "Approved (Recommended)", description: "Requirements are complete. Proceed to planning."}`
  - `{label: "Needs changes", description: "Some requirements need correction or addition."}`
  - `{label: "Run more interrogation", description: "Continue asking questions on specific areas."}`

Iterate until approved.

> **Persuasion layer:** "Requirements approved before planning prevent an average of 3-5 rework cycles later. Commitment now saves significant time."

---

## Phase 3: PLANNING

**Goal:** Produce a validated, Nyquist-compliant plan ready for execution.

### 3.1 — STAR analysis

Write a STAR analysis for the project:
- **Situation:** Current state, constraints, existing code, what exists vs what doesn't
- **Task:** Specific success criteria — what "done" looks like for this build
- **Action:** Execution approach — languages, frameworks, architecture patterns, key decisions
- **Result:** Verification method — how correctness is proven end-to-end

### 3.2 — Generate markdown plan

Write `tasks/todo.md` with the full implementation plan.
Minimum 8 sections, each with concrete checkable tasks `- [ ]`.
File-level specificity. Complexity tags (S/M/L).
Order by dependency.

### 3.3 — Generate XML plan (if build_xml_plans=true)

Write `docs/build/{slug}/plan.xml` with this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<build-plan name="{project-name}" slug="{slug}" created="{ISO date}">
  <star>
    <situation>{text}</situation>
    <task>{text}</task>
    <action>{text}</action>
    <result>{text}</result>
  </star>

  <wave id="0" name="Foundation" parallel="false">
    <task id="T001" complexity="M" wave="0">
      <title>Set up project structure</title>
      <description>...</description>
      <files>
        <file action="create">src/index.ts</file>
      </files>
      <dependencies />
      <test>Write failing test for entry point</test>
      <verify>npm test -- --grep "entry point"</verify>
      <done>Entry point test passes; file exists; imports resolve</done>
      <commit>feat: bootstrap project entry point</commit>
    </task>
  </wave>

  <wave id="1" name="Core Domain" parallel="true">
    <!-- Tasks in this wave can run in parallel -->
  </wave>
</build-plan>
```

**Nyquist rule:** Every `<task>` MUST have `<test>`, `<verify>`, and `<done>` elements. A plan without these is invalid.

### 3.4 — Validate plan

Spawn `agentops:plan-validator` subagent with `docs/build/{slug}/plan.xml`.

The validator checks 8 dimensions:
1. Completeness — all requirements from requirements.md have at least one task
2. Dependency graph — no circular dependencies between tasks
3. File ownership — no two tasks write to the same file in the same wave
4. Task size — no task is larger than L complexity
5. Nyquist compliance — every task has test/verify/done
6. Wave ordering — foundation tasks precede feature tasks
7. TDD compliance — test tasks precede implementation tasks within each wave
8. Commit message quality — all commit messages follow conventional commit format

If validator returns FAIL, fix the specific issues and re-validate.

### 3.5 — HUMAN GATE: Plan Approval

Present the full plan. Use `AskUserQuestion`:
- header: "Build — Plan"
- question: "The implementation plan is ready. How would you like to proceed?"
- options:
  - `{label: "Approve (Recommended)", description: "Proceed to task breakdown and execution."}`
  - `{label: "Modify plan", description: "Request changes before proceeding."}`
  - `{label: "Reject", description: "Cancel this build."}`

If `autonomy_level=autonomous`: skip this gate and proceed.

> **Persuasion layer (if build_persuasion=true):** "A validated plan with Nyquist compliance means every task has a clear done condition. Teams that approve plans before execution complete 40% faster with fewer blockers."

---

## Phase 4: TASK_BREAKDOWN

**Goal:** Parse the XML plan into atomic, actionable mini-plans with TDD specifications.

### 4.1 — Parse XML tasks

Read `docs/build/{slug}/plan.xml` and extract all `<task>` elements.
Create `docs/build/{slug}/tasks/` directory.

### 4.2 — Per-task mini-plans

For each task, generate a mini-plan file using `templates/build/task-plan-template.md`.
Output to: `docs/build/{slug}/tasks/{task-id}.md`

Each mini-plan includes:
- Context (which files to read first, which dependencies are already satisfied)
- TDD specification:
  - RED: The exact failing test to write first (file path + test name + assertion)
  - GREEN: The minimal implementation to make it pass
  - REFACTOR: Specific improvements to apply after green
- Verification command and expected output
- Commit message (conventional commit format)

### 4.3 — Linear sync (if build_linear_sync=true)

For each task, create a Linear issue with:
- Title from `<title>`
- Description from mini-plan
- Estimate from complexity (S=1pt, M=2pt, L=3pt)
- Status: "To Do"
- Label: "build/{slug}"

### 4.4 — HUMAN GATE: Task Breakdown Approval

Use `AskUserQuestion`:
- header: "Build — Task Breakdown"
- question: "Generated {N} task mini-plans across {W} waves. Ready to begin execution?"
- options:
  - `{label: "Begin execution (Recommended)", description: "Start Wave 0 immediately."}`
  - `{label: "Review task plans first", description: "I want to review the mini-plans before execution."}`
  - `{label: "Adjust task breakdown", description: "Some tasks need modification."}`

---

## Phase 4.5: SCAFFOLD (conditional — new projects only)

**Skip this phase if an existing codebase is detected.**

### Detection

Check if any of these exist: `package.json`, `composer.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`.
If any exist → skip to Phase 5.

### Execution (if build_scaffold_auto=true)

1. Generate a standards profile based on the interrogation answers (language, framework, patterns)
2. Invoke the scaffold process from `commands/enterprise/scaffold.md` with the pre-selected answers from interrogation (do not re-ask questions that were already answered)
3. Commit all scaffolded files as Wave 0: `chore: scaffold project structure (Wave 0)`

If `build_scaffold_auto=false`, use `AskUserQuestion` to ask whether to scaffold before proceeding.

---

## Phase 5: EXECUTION

**Goal:** Implement every task with TDD, atomic commits, and wave-based parallelism.

### 5.1 — Wave execution

Execute tasks wave by wave. Within a wave, tasks run in parallel if `build_wave_parallel=true`.

**For each task:**

1. Announce: `**Wave {W} / Task {ID}: {title}**`

2. If `build_fresh_context=true`: spawn a fresh subagent (subagent_type: general-purpose) with:
   - The mini-plan from `docs/build/{slug}/tasks/{task-id}.md`
   - The requirements from `docs/build/{slug}/requirements.md`
   - The engineering standards from `templates/standards/engineering-standards.md` (if `build_standards_inject=true`)
   - Instruction: "Implement this task following the TDD spec exactly. Write the failing test first (RED), then the implementation (GREEN), then refactor. Commit atomically."

3. If `build_fresh_context=false`: implement directly in the current context using the mini-plan.

### 5.2 — TDD enforcement (if build_tdd_enforced=true)

Every task MUST follow this cycle. Do NOT skip the RED phase.

**RED:** Write the failing test as specified in the mini-plan. Run it. Confirm it fails with the expected error. Log: `[RED] {task-id}: test written, failing as expected`

**GREEN:** Write the minimal implementation to make the test pass. Run tests. Confirm passing. Log: `[GREEN] {task-id}: test passing`

**REFACTOR:** Apply the refactor phase from the mini-plan. Re-run tests. Confirm still passing. Log: `[REFACTOR] {task-id}: refactored, tests still passing`

> **Persuasion layer (if build_persuasion=true):** "Code without tests will be caught in Phase 6 review and generate fix tasks. Senior engineers write the test first — it defines the contract."

### 5.3 — Commit

After each task: `git add` relevant files and commit using the message from the mini-plan.
Follow conventional commit format: `type(scope): description`

### 5.4 — Execution log

After each task, append to `.agentops/build-execution.jsonl`:

```json
{"task_id": "T001", "wave": 0, "status": "completed", "tdd_phases": ["RED", "GREEN", "REFACTOR"], "commit": "abc1234", "timestamp": "ISO", "duration_ms": 12000}
```

### 5.5 — Failure handling

If a task fails:
- The existing `auto-lesson` hook captures the lesson automatically
- If the same task fails 3 times: the `evolve-gate` hook triggers EvoSkill
- Do NOT retry the same approach. Modify the mini-plan and try again.
- Log failure to `.agentops/build-execution.jsonl` with `"status": "failed"`

### 5.6 — Linear update (if build_linear_sync=true)

Update each Linear issue to "In Progress" when a task starts, "Done" when it completes.

### 5.7 — Supervised gates (if autonomy_level=supervised)

After each task, use `AskUserQuestion`:
- header: "Execution — Step Complete"
- question: "Task {ID} ({title}) complete. Continue?"
- options:
  - `{label: "Continue (Recommended)", description: "Proceed to next task"}`
  - `{label: "Review changes", description: "Show me git diff before continuing"}`
  - `{label: "Modify plan", description: "Adjust remaining tasks"}`
  - `{label: "Pause build", description: "Save state and stop for now"}`

---

## Phase 6: REVIEW

**Goal:** Two-stage review — spec compliance then code quality.

### Stage 1: Spec Compliance

Spawn `agentops:spec-compliance-reviewer` with:
- `docs/build/{slug}/requirements.md`
- `docs/build/{slug}/plan.xml`
- Output of `git diff main...HEAD`
- `templates/standards/engineering-standards.md`

The reviewer produces: `docs/build/{slug}/reviews/spec-compliance.md`

### Stage 2: Code Quality

Run the existing review process from `commands/enterprise/review.md` on `git diff main...HEAD --name-only`.

The output lands in the standard review report format.

### Stage 3: Aggregate and triage

Merge findings from both stages:
- **CRITICAL** findings → block progression. Must fix before Phase 7.
- **HIGH** findings → generate fix tasks. A fix wave is inserted before Phase 7.
- **MEDIUM** findings → logged, recommended but non-blocking.
- **LOW/INFO** findings → logged.

### Fix wave (if HIGH findings exist)

Generate fix tasks from HIGH findings. Assign IDs: `FIX-001`, `FIX-002`, etc.
Execute fix wave using the same TDD process as Phase 5.
After fixes, re-run Stage 1 spec compliance only (no need for full Stage 2).

### HUMAN GATE: Review Approval

Present the consolidated review report. Use `AskUserQuestion`:
- header: "Build — Review"
- question: "Review complete. {N} findings: {C} critical, {H} high, {M} medium, {L} low. How would you like to proceed?"
- options:
  - `{label: "Approve (all issues addressed)", description: "Proceed to verification."}`
  - `{label: "Fix critical/high issues first", description: "Address blocking findings before proceeding."}`
  - `{label: "Accept with known issues", description: "Proceed despite medium/low findings (they'll be logged)."}`

If CRITICAL findings remain unaddressed: do NOT allow progression. Re-present the option to fix.

---

## Phase 7: VERIFICATION

**Goal:** Prove correctness via Nyquist audit, full test suite, and E2E checks.

### 7.1 — Nyquist audit

For every task in `docs/build/{slug}/plan.xml`, run its `<verify>` command.
Log: PASS or FAIL per task.
If any FAIL: surface as a blocking issue. Do not proceed until resolved.

### 7.2 — Full test suite

Run the project test command (detect from `package.json` scripts: `test`, `test:ci`, `test:all`; or `composer test`, `pytest`, etc.).
All tests must pass. If they don't: fix the failures before proceeding.

### 7.3 — E2E (if applicable)

If an E2E test suite exists (`cypress`, `playwright`, `puppeteer`), run it.
If it fails: treat as a blocking issue.

### 7.4 — Compliance gates

The existing `compliance-gate.sh` hook runs automatically on Stop. Ensure it passes.

### 7.5 — HUMAN GATE: Verification Sign-off

Use `AskUserQuestion`:
- header: "Build — Verification"
- question: "All verification checks passed. Ready to proceed to approval and PR creation?"
- options:
  - `{label: "Proceed to approval (Recommended)", description: "Move to final summary and PR."}`
  - `{label: "Run additional checks", description: "I want to run more tests before approving."}`

---

## Phase 8: APPROVAL

**Goal:** Final human approval, PR creation, and build archival.

### 8.1 — Generate summary

Write `docs/build/{slug}/summary.md` using `templates/build/summary-template.md`.

Include:
- Metrics: total duration, tasks completed, waves, commits, tests added, HIGH findings fixed, lessons captured, estimated tokens used
- What was built (narrative)
- Architecture decisions made (with rationale)
- Known limitations (from MEDIUM findings)
- Lessons learned (from `.agentops/build-execution.jsonl` failure entries)

### 8.2 — HUMAN GATE: Final Approval

Present the full summary. Use `AskUserQuestion`:
- header: "Build — Final Approval"
- question: "Build complete. Review the summary above. How would you like to proceed?"
- options:
  - `{label: "Approve and create PR (Recommended)", description: "Create the pull request and close out the build."}`
  - `{label: "Request changes", description: "Something needs adjustment before I approve."}`
  - `{label: "Approve without PR", description: "Mark complete but skip PR creation."}`

If `autonomy_level=autonomous`: skip this gate.

### 8.3 — PR creation

Create a pull request using `gh pr create`:
- Title: `feat({slug}): {project name}`
- Body: contents of `docs/build/{slug}/summary.md` (truncated to 4000 chars if needed)
- Label: `build`, `agentops`

### 8.4 — Linear cleanup (if build_linear_sync=true)

Move all Linear issues in `label: build/{slug}` to "Done".

### 8.5 — Lesson capture

Run EvoSkill to consolidate lessons from this build into reusable patterns.
Append a session summary to `.agentops/build-execution.jsonl`:

```json
{"type": "build_complete", "slug": "{slug}", "phases_completed": 8, "total_tasks": N, "pr_url": "...", "timestamp": "ISO"}
```

### 8.6 — Archive

Move `.agentops/build-state.json` to `docs/build/{slug}/build-state.archive.json`.
Delete the active state file to allow new builds.

---

## Error Recovery

- If any phase fails unexpectedly: save state with `"phase": "ERROR_{PHASE}"`, present the error to the user, and offer: Resume (retry the phase), Skip (mark phase as complete with warnings), or Abort.
- Never leave the codebase in a broken state. If aborting mid-execution, ensure all written files are syntactically valid.
- If a subagent fails to return: log the failure, surface it to the user, and offer fallback: run the equivalent step manually in the current context.

---

## Quick Mode (--quick or build_quick_mode=true)

Runs a condensed lifecycle:
1. BRAINSTORM (abbreviated — single framing, no alternatives)
2. PLANNING (skip interrogation; plan from brief directly)
3. EXECUTION (all waves, TDD still enforced)
4. VERIFICATION (Nyquist audit + test suite only)

No PR creation. No Linear sync. Suitable for solo exploration builds.
