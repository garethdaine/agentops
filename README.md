# AgentOps Plugin for Claude Code CLI

An enterprise-grade guardrailing, workflow automation, and self-evolution plugin for the Claude Code CLI. AgentOps enforces security policies, structures work with the STAR methodology, auto-pilots common workflows, delegates to specialist agents, and continuously improves itself by learning from failures.

**Now extended with the AI-First Enterprise Delivery Framework** — project scaffolding, structured feature builds with configurable autonomy, unified code review, architecture guardrails, delivery lifecycle management, team governance, and client communication. 25 slash commands, 35+ hooks, 6 specialist agents, and 25+ enterprise templates.

**Author:** Gareth Daine | **License:** MIT | **Version:** 1.0.0

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Architecture](#architecture)
- [Security Policies](#security-policies)
- [STAR Methodology](#star-methodology)
- [Commands](#commands)
- [Hook System](#hook-system)
- [Automation Hooks](#automation-hooks)
- [Specialist Agents](#specialist-agents)
- [Skill System & EvoSkill](#skill-system--evoskill)
- [Compliance Gates](#compliance-gates)
- [Feature Flags](#feature-flags)
- [Runtime Modes](#runtime-modes)
- [Audit & Observability](#audit--observability)
- [Lessons Learned System](#lessons-learned-system)
- [Workflow Mapping](#workflow-mapping)
- [Configuration Reference](#configuration-reference)
- [Directory Structure](#directory-structure)

---

## Overview

AgentOps wraps every Claude Code session in multiple layers of protection and automation:

1. **Security** - Validates commands, paths, and environment variables. Detects prompt injection, data exfiltration, and credential exposure.
2. **Structure** - Enforces the STAR framework (Situation, Task, Action, Result) so every non-trivial task begins with a plan.
3. **Automation** - Automatically triggers planning, testing, verification, lesson capture, and delegation based on session activity.
4. **Delegation** - Routes complex work to specialist subagents (code-critic, security-reviewer, interrogator, etc.).
5. **Evolution** - Learns from tool failures and proposes new skills to prevent recurrence.
6. **Observability** - Maintains audit logs, telemetry, file provenance tracking, and cost budgets.

---

## Installation

1. Clone or copy the plugin directory into your project or a shared location:

   ```bash
   git clone <repo-url> agentops-plugin
   ```

2. On first session start, the plugin automatically initializes `.agentops/` with default flags and budget.

3. Optionally configure runtime mode and budget via environment variables:

   ```bash
   export AGENTOPS_MODE=standard    # safe | standard | full | unrestricted
   export AGENTOPS_BUDGET_USD=5     # session cost budget in USD
   ```

4. Optionally configure MCP servers (e.g., Slack) in `.mcp.json`.

---

## Architecture

The plugin integrates with Claude Code through four extension points:

| Extension Point | Location | Purpose |
|-----------------|----------|---------|
| **Hooks** | `hooks/hooks.json` | Intercept tool use at every lifecycle event |
| **Commands** | `commands/*.md` | User-facing slash commands (`/agentops:*`) |
| **Agents** | `agents/*.md` | Specialist subagents for complex analysis |
| **Skills** | `skills/*/SKILL.md` | Reusable rules and patterns |

Plugin metadata is declared in `.claude-plugin/plugin.json`. Runtime state (flags, logs, session markers) lives in `.agentops/`.

---

## Security Policies

Six security layers run as hooks on every tool invocation:

### Command Validation (`validate-command.sh`)

Blocks dangerous Bash commands before execution:

- Destructive operations: `rm -rf /`, `mkfs`, `dd`, fork bombs
- Shell injection patterns: chained eval/exec, backtick injection
- System-level commands that could damage the host

### Path Validation (`validate-path.sh`)

Prevents unauthorized file access:

- Blocks path traversal (`..` sequences)
- Protects system directories (`/etc`, `/usr`, `/var`)
- Guards sensitive dotfiles (`.ssh`, `.aws`, `.kube`, `.gnupg`)
- Requires absolute paths

### Environment Variable Protection (`validate-env.sh`)

Prevents credential and environment tampering:

- Blocks reassignment of critical variables (`PATH`, `HOME`, `LD_PRELOAD`)
- Detects database credential patterns
- Catches secret/token variable patterns

### Prompt Injection Detection (`injection-scan.sh`)

Scans tool inputs for injection attempts:

- Role-switching language ("ignore previous instructions", "you are now...")
- Authority markers and delimiter attacks
- High imperative density in input text

### Data Exfiltration Prevention (`exfiltration-check.sh`)

Blocks data from leaving the system:

- Network transfer of sensitive files via `curl`, `wget`, `nc`
- Piping secrets to external services
- Base64-encoded data combined with network commands

### Credential Redaction (`credential-redact.sh`)

Warns when sensitive files are accessed:

- `.env`, `.pem`, `.key`, credential files
- Logs access to audit trail
- Alerts user to potential credential exposure

### Content Trust (`content-trust.sh`)

Flags external content as untrusted:

- Marks WebFetch, WebSearch, and MCP tool outputs
- Optional LLM-based content firewall for deeper analysis (controlled by `llm_content_firewall_enabled` flag)

---

## STAR Methodology

Every non-trivial task (3+ steps or architectural decisions) must begin with a STAR analysis written to `tasks/todo.md`:

| Component | Purpose |
|-----------|---------|
| **Situation** | Current state - what exists, what doesn't, constraints |
| **Task** | Specific, measurable success criteria |
| **Action** | Concrete steps with file-level specificity |
| **Result** | How completion will be verified (tests, behavior, acceptance criteria) |

The `star-preamble.sh` hook injects this requirement at every session start. Use `/agentops:star` or `/agentops:plan` to generate the analysis.

---

## Commands

All commands are invoked with the `/agentops:` prefix.

### `/agentops:plan`

Generates a STAR-based implementation plan with checkable task items. Writes output to `tasks/todo.md`.

### `/agentops:star`

Quick STAR analysis generation. Lighter than `/agentops:plan` - produces the STAR header without full task breakdown.

### `/agentops:workflow`

Maps workflows or executes structured plans. Runs an 8-phase analysis:

1. Discovery Integration
2. Scope & Objectives
3. Stakeholder Mapping
4. As-Is Mapping
5. Pain Point Identification
6. Automation Assessment
7. To-Be Design
8. Tool & Stack Recommendations

Outputs YAML workflow schemas, Mermaid diagrams, and implementation plans.

### `/agentops:interrogate`

Exhaustive requirements discovery. Asks probing questions to eliminate assumptions before planning. Analyzes the codebase and produces findings summaries.

### `/agentops:verify`

Verifies task completion against the STAR plan criteria, test results, and compliance gates. Produces a completion report.

### `/agentops:evolve`

Runs the EvoSkill self-improvement loop. Analyzes collected failures, proposes new skills or edits to existing ones, and materializes them.

### `/agentops:lessons`

Displays all captured lessons from `tasks/lessons.md`, organized by date, trigger, pattern, and rule.

### `/agentops:lesson`

Captures a single lesson learned after a correction or mistake. Appends to `tasks/lessons.md`.

### `/agentops:compliance-check`

Runs compliance gates manually and reports status:

- Plan gate (does a plan exist?)
- Verification gate (are all items checked?)
- Test gate (have tests been run?)

### `/agentops:cost-report`

Displays current session cost tracking: budget, spent, remaining, and warning threshold.

### `/agentops:flags`

View or toggle feature flags. Displays all flags with their current values and allows modification.

### `/agentops:configure`

Unified configuration interface for the entire plugin. View all settings at once or update individual values:

```bash
/agentops:configure                          # Show full configuration
/agentops:configure autonomy autonomous      # Set autonomy level
/agentops:configure enforcement blocking     # Set enforcement mode
/agentops:configure budget 10                # Set session budget to $10
/agentops:configure auto_test_enabled off    # Disable auto-test
/agentops:configure preset minimal           # Apply minimal preset (security only, no automation)
/agentops:configure preset enterprise        # Apply enterprise preset (all features, guided autonomy)
```

Available presets: `minimal`, `standard`, `security-only`, `enterprise`, `autonomous`.

### Enterprise Commands

The following commands extend the plugin into an AI-first enterprise delivery framework:

| Command | Description |
|---------|-------------|
| `/agentops:scaffold` | Interactive project scaffolding with tech stack selection, enterprise patterns, and CI/CD |
| `/agentops:feature` | Structured 6-phase feature build with configurable autonomy (guided/supervised/autonomous) |
| `/agentops:review` | Unified code review orchestrating code-critic + security-reviewer agents |
| `/agentops:test-gen` | AI-generated test suites with quality validation (tests must compile and pass) |
| `/agentops:reason` | Multi-step reasoning pipeline: Analyse, Design, Validate, Recommend |
| `/agentops:adr` | Architecture Decision Records — capture the *why* behind technical decisions |
| `/agentops:design` | Solution design phase — architecture proposals, integration mapping, risk assessment |
| `/agentops:qa-check` | Pre-deployment QA checklist: security, performance, accessibility, code quality |
| `/agentops:handover` | Client handover documentation — runbooks, knowledge transfer, support procedures |
| `/agentops:onboard` | Generate onboarding guides for new team members from actual project structure |
| `/agentops:knowledge` | Search the project knowledge base — lessons, ADRs, patterns, templates |
| `/agentops:status-report` | Professional client-facing status report from git history and project state |

#### Configurable Autonomy

Feature workflows support three autonomy levels (stored in `.agentops/flags.json`):

- **guided** (default) — pause at plan approval + final review
- **supervised** — pause after every implementation step
- **autonomous** — proceed with minimal gates (for senior engineers)

#### Enterprise Feature Flags

Each capability area can be independently toggled:

`enterprise_scaffold`, `ai_workflows`, `unified_review`, `architecture_guardrails`, `delivery_lifecycle`, `team_governance`, `client_comms`

All default to `true`. Toggle via `/agentops:flags`.

---

## Hook System

Hooks are shell scripts that execute automatically at specific lifecycle events. The master registry is `hooks/hooks.json`.

### Hook Events

| Event | When It Fires | Purpose |
|-------|---------------|---------|
| `SessionStart` | Beginning of a new session | Initialize state, inject context, reset stale data |
| `PreToolUse` | Before any tool executes | Validate inputs, enforce policies, block dangerous operations |
| `PostToolUse` | After a tool completes | Log activity, trigger automation, track provenance |
| `PostToolUseFailure` | After a tool fails | Collect failures for EvoSkill, capture lessons |
| `SubagentStart` | When a subagent is spawned | Inject trust policies |
| `Stop` | When the session is ending | Enforce compliance gates, verify completion |
| `SessionEnd` | Final cleanup | Flush telemetry |

### Hook Matchers

Hooks can target specific tools using matchers:

```json
{
  "event": "PreToolUse",
  "hooks": [{
    "matcher": "Bash",
    "command": "./hooks/validate-command.sh"
  }]
}
```

Supported matchers: `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `Agent`, and MCP tool patterns.

---

## Automation Hooks

These hooks automatically trigger workflows based on session activity. Each is controlled by a feature flag.

### Auto-Plan (`auto-plan.sh`)

**Trigger:** 3+ files modified without a plan
**Action:** Blocks further writes and instructs the agent to create a plan in `tasks/todo.md`
**Flag:** `auto_plan_enabled`

### Auto-Test (`auto-test.sh`)

**Trigger:** 3+ source files modified (`.py`, `.ts`, `.js`, `.go`, `.rs`, etc.)
**Action:** Injects instruction to run the project's test suite
**Flag:** `auto_test_enabled`

### Auto-Verify (`auto-verify.sh`)

**Trigger:** Session stop requested
**Action:** Blocks stop if unchecked items (`- [ ]`) remain in `tasks/todo.md`
**Flag:** `auto_verify_enabled`

### Auto-Lesson (`auto-lesson.sh`)

**Trigger:** 2+ consecutive tool failures
**Action:** Injects instruction to capture a lesson in `tasks/lessons.md`
**Flag:** `auto_lesson_enabled`

### Auto-Delegate (`auto-delegate.sh`)

**Trigger:** 5+ source files modified
**Action:** Delegates to `code-critic` and `security-reviewer` subagents
**Flag:** `auto_delegate_enabled`

### Auto-Evolve (`auto-evolve.sh`)

**Trigger:** Session stop with 2+ unprocessed failures
**Action:** Blocks stop until the EvoSkill loop runs
**Flag:** `auto_evolve_enabled`

---

## Specialist Agents

Six subagents handle complex analysis tasks. They are spawned via the Claude Code Agent tool.

### Code Critic (`agents/code-critic.md`)

Reviews implementation quality, architecture patterns, performance, and test coverage. Has read-only access to the codebase (`Read`, `Grep`, `Glob`, `Bash`).

### Security Reviewer (`agents/security-reviewer.md`)

Scans for injection vulnerabilities, authentication gaps, data exposure, CVEs, and OWASP Top 10 compliance. Can search the web for CVE databases.

### Interrogator (`agents/interrogator.md`)

Discovers requirements through exhaustive questioning. Analyzes the codebase and produces implementation plans. Used by `/agentops:interrogate` and `/agentops:workflow`.

### Proposer (`agents/proposer.md`)

Analyzes tool failure traces, existing skills, and feedback history to propose new skills or edits. Core component of the EvoSkill loop.

### Skill Builder (`agents/skill-builder.md`)

Materializes skill proposals into production-ready `SKILL.md` files with optional helper scripts. Validates proposals before building.

### Delegation Router (`agents/delegation-router.md`)

Routes tasks to the appropriate specialist agent(s) based on task type and complexity. Used when complex delegation decisions are needed.

---

## Skill System & EvoSkill

### Skills

Skills are reusable rules and patterns stored in `skills/{skill-name}/SKILL.md`. Each skill has YAML frontmatter defining its name, description, and trigger conditions, followed by procedural instructions.

**Example skill:** `tool-selection-and-large-files` - Rules for using Grep over Bash for content searches and proper file pagination for large files.

### EvoSkill Self-Evolution Loop

The plugin improves itself by learning from failures:

```
Tool Failure → failure-collector.sh → failures.jsonl
                                          ↓
                                    /agentops:evolve
                                          ↓
                              proposer agent (analyze failures,
                              check existing skills & feedback history)
                                          ↓
                                    Skill Proposal
                                          ↓
                              skill-builder agent (materialize
                              SKILL.md + helper scripts)
                                          ↓
                              feedback-history.jsonl (record outcome)
```

1. **Collection** - Tool failures are logged to `.agentops/failures.jsonl` by the `failure-collector.sh` hook
2. **Analysis** - The proposer agent examines failure patterns, existing skills, and past feedback
3. **Proposal** - A new skill or edit to an existing skill is recommended
4. **Materialization** - The skill-builder agent creates or updates `skills/{name}/SKILL.md`
5. **Feedback** - The outcome is recorded in `.agentops/feedback-history.jsonl` to prevent redundant proposals

Triggered automatically at session stop if 2+ unprocessed failures exist, or manually via `/agentops:evolve`.

---

## Compliance Gates

Three gates run at session stop (`compliance-gate.sh`) to ensure work quality:

| Gate | Condition | Requirement |
|------|-----------|-------------|
| **Plan Gate** | 3+ files modified | `tasks/todo.md` must exist and be non-empty |
| **Verification Gate** | Plan exists | All checklist items (`- [ ]`) must be checked (`- [x]`) |
| **Test Gate** | 3+ source files modified | Tests must have been run during the session |

Each gate is individually controlled by a feature flag (`plan_gate_enabled`, `verification_gate_enabled`, `test_gate_enabled`).

---

## Feature Flags

All flags are stored in `.agentops/flags.json` and default to `true`. Toggle them with `/agentops:flags`.

### Security Flags

| Flag | Default | Controls |
|------|---------|----------|
| `command_validation_enabled` | `true` | Bash command validation |
| `path_validation_enabled` | `true` | File path validation |
| `env_validation_enabled` | `true` | Environment variable protection |
| `injection_scan_enabled` | `true` | Prompt injection detection |
| `content_trust_enabled` | `true` | External content flagging |
| `exfiltration_detection_enabled` | `true` | Data exfiltration prevention |
| `credential_redaction_enabled` | `true` | Credential access warnings |
| `llm_content_firewall_enabled` | `true` | LLM-based content analysis |

### Workflow Flags

| Flag | Default | Controls |
|------|---------|----------|
| `star_preamble_enabled` | `true` | STAR methodology injection at session start |
| `plan_gate_enabled` | `true` | Require plan for multi-file changes |
| `verification_gate_enabled` | `true` | Require all items checked before stop |
| `test_gate_enabled` | `true` | Require tests for multi-file changes |
| `lessons_enabled` | `true` | Lessons system |

### Automation Flags

| Flag | Default | Controls |
|------|---------|----------|
| `auto_plan_enabled` | `true` | Auto-trigger planning |
| `auto_test_enabled` | `true` | Auto-trigger test runs |
| `auto_verify_enabled` | `true` | Auto-verify at stop |
| `auto_lesson_enabled` | `true` | Auto-capture lessons on failures |
| `auto_evolve_enabled` | `true` | Auto-evolve at stop |
| `auto_delegate_enabled` | `true` | Auto-delegate to specialists |

### Enforcement Mode

```json
"enforcement_mode": "advisory"   // Warn but don't block
"enforcement_mode": "blocking"   // Block non-compliant actions
```

---

## Runtime Modes

Control tool access granularity via the `AGENTOPS_MODE` environment variable:

| Mode | Write/Edit | External Tools | Elevated Tools |
|------|-----------|----------------|----------------|
| `safe` | Blocked | Blocked | Blocked |
| `standard` | Allowed | Requires approval | Blocked |
| `full` | Allowed | Allowed | Requires approval |
| `unrestricted` | Allowed | Allowed | Allowed |

Default: `standard`

---

## Audit & Observability

### Audit Log (`.agentops/audit.jsonl`)

Every tool invocation is logged as a JSON line:

```json
{
  "timestamp": "2026-03-16T10:30:00Z",
  "session_id": "abc123",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": "first 500 chars of input..."
}
```

### Telemetry (`.agentops/telemetry.jsonl`)

Structured observability events:

```json
{
  "timestamp": "2026-03-16T10:30:00Z",
  "event": "tool_use",
  "session": "abc123",
  "tool": "Write",
  "cwd": "/Users/..."
}
```

Supports forwarding to an OpenTelemetry endpoint via `OTLP_ENDPOINT` environment variable.

### File Provenance (`.agentops/provenance.jsonl`)

Tracks the source and trust level of every file interaction:

- `untrusted` - Content from WebFetch, WebSearch, or MCP tools
- `trusted` - Content written or edited by the agent
- `contextual` - Content read from local files

### Cost Tracking (`.agentops/budget.json`)

```json
{
  "budget_usd": 5,
  "spent": 0,
  "warn_pct": 80,
  "started": "2026-03-16T10:00:00Z"
}
```

Default budget is $5. Override with `AGENTOPS_BUDGET_USD` environment variable. The `budget-check.sh` hook warns at 80% consumption.

---

## Lessons Learned System

Captures patterns and rules from mistakes to prevent recurrence. Stored in `tasks/lessons.md`.

### Lesson Format

```markdown
## Lesson: [Title]
**Date:** 2026-03-16
**Trigger:** What failed or what the user corrected
**Pattern:** Underlying cause pattern
**Rule:** Concrete rule to prevent recurrence
**Applies to:** File types, tools, or contexts
```

Lessons are loaded at session start (`lessons-check.sh`) and injected into the agent's context so the same mistakes are not repeated.

### Capture Methods

- **Manual:** Use `/agentops:lesson` to capture a lesson
- **Automatic:** The `auto-lesson.sh` hook triggers after 2+ consecutive tool failures
- **View all:** Use `/agentops:lessons` to display captured lessons

---

## Workflow Mapping

The `/agentops:workflow` command runs an 8-phase workflow analysis:

1. **Discovery Integration** - Search for prior interrogations, run one if needed
2. **Scope & Objectives** - Define the workflow, goals, triggers, and success criteria
3. **Stakeholder Mapping** - Identify actors, systems, and external parties
4. **As-Is Mapping** - Walk through the current workflow step by step
5. **Pain Point Identification** - Find delays, errors, and bottlenecks
6. **Automation Assessment** - Score each step for automation potential
7. **To-Be Design** - Design the improved workflow with automation
8. **Tool & Stack Recommendations** - AI-first, no-code, and custom options

**Outputs:** YAML workflow schema, 6 Mermaid diagrams (as-is and to-be flows), narrative analysis, and a phased implementation plan.

---

## Configuration Reference

| File | Purpose | Format |
|------|---------|--------|
| `.claude-plugin/plugin.json` | Plugin metadata (name, version, keywords) | JSON |
| `hooks/hooks.json` | Master hook registry | JSON |
| `.agentops/flags.json` | Feature flag toggles | JSON |
| `.agentops/budget.json` | Cost tracking configuration | JSON |
| `settings.json` | Plugin permission defaults | JSON |
| `.mcp.json` | MCP server configuration (e.g., Slack) | JSON |

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENTOPS_MODE` | `standard` | Runtime mode (`safe`, `standard`, `full`, `unrestricted`) |
| `AGENTOPS_BUDGET_USD` | `5` | Session cost budget in USD |
| `OTLP_ENDPOINT` | _(none)_ | OpenTelemetry endpoint for telemetry forwarding |

---

## Directory Structure

```
agentops-plugin/
├── .claude-plugin/
│   └── plugin.json                 # Plugin metadata
├── hooks/
│   ├── hooks.json                  # Master hook registry
│   ├── feature-flags.sh            # Shared flag system library
│   ├── session-cleanup.sh          # Reset stale session state
│   ├── star-preamble.sh            # STAR protocol injection
│   ├── validate-command.sh         # Bash command validation
│   ├── validate-path.sh            # Path traversal protection
│   ├── validate-env.sh             # Env var protection
│   ├── injection-scan.sh           # Prompt injection detection
│   ├── content-trust.sh            # External content flagging
│   ├── exfiltration-check.sh       # Data exfiltration prevention
│   ├── credential-redact.sh        # Credential access warnings
│   ├── file-provenance.sh          # Source tracking
│   ├── runtime-mode.sh             # Tool access by mode
│   ├── auto-plan.sh                # Auto-trigger planning
│   ├── auto-test.sh                # Auto-trigger tests
│   ├── auto-verify.sh              # Auto-verify completion
│   ├── auto-lesson.sh              # Auto-capture lessons
│   ├── auto-delegate.sh            # Auto-delegate to specialists
│   ├── auto-evolve.sh              # Auto-run skill evolution
│   ├── plan-gate.sh                # Plan compliance gate
│   ├── compliance-gate.sh          # Multi-gate compliance check
│   ├── skill-validator.sh          # Skill security validation
│   ├── ci-guard.sh                 # Test run tracking
│   ├── audit-log.sh                # Event logging
│   ├── telemetry.sh                # Observability + OTLP
│   ├── failure-collector.sh        # Failures for EvoSkill
│   ├── delegation-trust.sh         # Subagent trust policy
│   ├── lessons-check.sh            # Load lessons at start
│   └── budget-check.sh             # Budget tracking
├── commands/
│   ├── plan.md                     # /agentops:plan
│   ├── star.md                     # /agentops:star
│   ├── workflow.md                 # /agentops:workflow
│   ├── interrogate.md              # /agentops:interrogate
│   ├── verify.md                   # /agentops:verify
│   ├── evolve.md                   # /agentops:evolve
│   ├── lessons.md                  # /agentops:lessons
│   ├── lesson.md                   # /agentops:lesson
│   ├── compliance-check.md         # /agentops:compliance-check
│   ├── cost-report.md              # /agentops:cost-report
│   └── flags.md                    # /agentops:flags
├── agents/
│   ├── code-critic.md              # Code quality reviewer
│   ├── security-reviewer.md        # Security vulnerability scanner
│   ├── interrogator.md             # Requirements discoverer
│   ├── proposer.md                 # Failure analyzer / skill proposer
│   ├── skill-builder.md            # Skill materializer
│   └── delegation-router.md        # Task router
├── skills/
│   └── tool-selection-and-large-files/
│       └── SKILL.md                # Grep/file handling rules
├── docs/
│   └── plans/                      # Architecture & migration docs
├── tasks/
│   ├── todo.md                     # Current STAR plan
│   └── lessons.md                  # Captured lessons
├── .agentops/                      # Runtime state (auto-created)
│   ├── flags.json                  # Feature flags
│   ├── budget.json                 # Cost tracking
│   ├── audit.jsonl                 # Audit log
│   ├── telemetry.jsonl             # Telemetry events
│   ├── failures.jsonl              # Tool failures
│   ├── feedback-history.jsonl      # Skill proposal outcomes
│   ├── provenance.jsonl            # File source tracking
│   └── delegation.jsonl            # Delegation events
├── settings.json                   # Permission defaults
├── .mcp.json                       # MCP server config
├── LICENSE                         # MIT License
└── .gitignore                      # Excludes runtime logs
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
