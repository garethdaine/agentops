# AgentOps — Enterprise Guardrails & Delivery Lifecycle for Claude Code

A plugin for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) that wraps every session in 7 security layers, structures work with the STAR methodology, auto-pilots workflows, delegates to 12 specialist agents, learns from failures via self-evolution, and orchestrates full project builds from vision to merged PR.

37 slash commands | 44 hooks | 12 specialist agents | 49 templates | 32+ feature flags

**License:** MIT | **Version:** 0.9.0

---

## Quick Start

```bash
# Clone the plugin
git clone https://github.com/garethdaine/agentops.git agentops-plugin

# Run Claude Code with the plugin loaded
claude --plugin-dir ./agentops-plugin

# Or with permissions auto-approved
claude --plugin-dir ./agentops-plugin --dangerously-skip-permissions
```

On first session, the plugin auto-initializes `.agentops/` with default flags and budget.

---

## AgentOps vs GSD vs Superpowers

| Dimension | AgentOps | GSD (~31K stars) | Superpowers (~50K stars) |
|-----------|----------|-------------------|--------------------------|
| **Core identity** | Enterprise guardrailing + full delivery lifecycle | Spec-driven meta-prompting to beat context rot | Skills-based methodology with TDD enforcement |
| **Commands** | 37 | ~15 | ~10 (skill-based) |
| **Hooks** | 44 shell scripts across 7 lifecycle events | None (prompts only) | None (prompts only) |
| **Agents** | 12 specialist agents | 4 parallel researchers + planner | Code reviewer agent |
| **Security** | 7 layers (injection, exfiltration, supply-chain, Unicode, credential, path, env) | Minimal | None |
| **Self-evolution** | EvoSkill (failures → proposer → skill-builder → feedback loop) | KNOWLEDGE.md (manual) | Skill extraction (manual) |
| **TDD enforcement** | Mandatory RED→GREEN→REFACTOR + Nyquist rule (`<test>`/`<verify>`/`<done>` on every task); auto-test hook in sessions | Nyquist rule (verify required) | Code without tests = deleted |
| **Context strategy** | Fresh subagent per task (build_fresh_context) + session hooks | Fresh 200K context per subagent | Fresh context per subagent |
| **Parallel execution** | Wave-based with dependency graphs + 4 parallel researchers | Wave-based parallel execution | N/A |
| **Persuasion psychology** | 5 Cialdini techniques embedded in human gates | None | 5 Cialdini techniques |
| **Plan format** | STAR markdown + XML with Nyquist compliance (<test>/<verify>/<done>) | XML executable plans | Markdown plans |
| **Git workflow** | Configurable strategy (worktree / feature-branch / trunk-based); atomic commits per task, conventional commit format | Atomic commits, worktrees | Worktrees, atomic commits |
| **Review** | Two-stage: spec compliance (requirements mapping) + code quality (11 dimensions) | N/A | Two-stage review |
| **Feature flags** | 32+ independently toggleable with presets | Minimal settings | None |
| **Enterprise templates** | 49 templates (discovery → delivery → handover) | None | None |
| **Observability** | Audit logs, OTLP telemetry, file provenance, cost budgets | None | None |
| **Configurable autonomy** | guided / supervised / autonomous | N/A | N/A |
| **Linear integration** | Task sync (create, status update, close) | None | None |

### What AgentOps does that neither competitor does

1. **7-layer security system.** Injection scanning, exfiltration detection, Unicode/Glassworm defense, path traversal protection, credential redaction, env var guarding, and content trust — all running as hooks on every tool invocation.
2. **EvoSkill self-evolution.** The failure-collector → proposer → skill-builder → feedback-history pipeline auto-generates skills from failures. No manual intervention.
3. **Full observability.** Structured audit logs, OTLP telemetry export, file provenance tracking, and cost budgets with session-level granularity.
4. **8.5-phase build lifecycle.** From brainstorm to merged PR with state machine, resumability, human gates, parallel research, TDD enforcement, two-stage review, and Nyquist verification — all configurable via feature flags and autonomy levels.

---

## Architecture

The plugin integrates through four extension points:

| Extension Point | Location | Count | Purpose |
|-----------------|----------|-------|---------|
| **Hooks** | `hooks/hooks.json` | 44 | Intercept tool use at every lifecycle event |
| **Commands** | `commands/*.md` | 37 | User-facing slash commands (`/agentops:*`) |
| **Agents** | `agents/*.md` | 12 | Specialist subagents for analysis and execution |
| **Templates** | `templates/**/*.md` | 49 | Standards, architecture patterns, delivery docs |

Runtime state lives in `.agentops/` (auto-created, gitignored).

---

## The Build Command

`/agentops:build` is the master lifecycle command — it orchestrates a project from raw vision to merged, verified code.

### 8.5 Phases

| Phase | Name | What happens | Human gate? |
|-------|------|-------------|-------------|
| 1 | **BRAINSTORM** | Vision capture → 3 alternative framings → brief | Yes |
| 2 | **INTERROGATION** | 4 parallel researchers + exhaustive Q&A → requirements | Yes |
| 3 | **PLANNING** | STAR analysis → XML plan → 8-dimension validation | Yes |
| 4 | **TASK BREAKDOWN** | Parse XML → per-task TDD mini-plans → Linear sync | Yes |
| 4.5 | **SCAFFOLD** | Auto-scaffold new projects (conditional) | — |
| 5 | **EXECUTION** | Fresh subagent per task, wave-based parallelism, TDD enforced | Supervised only |
| 6 | **REVIEW** | Stage 1: spec compliance → Stage 2: code quality → fix wave | Yes |
| 7 | **VERIFICATION** | Nyquist audit + full test suite + E2E + compliance gates | Yes |
| 8 | **APPROVAL** | Summary → PR creation → Linear cleanup → lesson capture | Yes |

### Key features

- **Resumable state machine** — state saved to `.agentops/build-state.json` after each phase
- **Fresh context per task** — each execution task gets a fresh 200K-token subagent with full standards injection
- **Mandatory TDD** — RED→GREEN→REFACTOR enforced; no code without a failing test first
- **Nyquist compliance** — every task must have `<test>`, `<verify>`, and `<done>` in the XML plan
- **4 parallel researchers** — stack, architecture, features, pitfalls research runs concurrently
- **8-dimension plan validation** — completeness, dependency DAG, file ownership, task size, Nyquist, wave ordering, TDD ordering, commit quality
- **Two-stage review** — spec compliance reviewer maps every requirement to implementation; code quality reviewer checks 11 dimensions
- **Persuasion psychology** — Cialdini's 5 techniques (authority, commitment, scarcity, social proof, loss aversion) embedded in human gates
- **Quick mode** — `--quick` for brainstorm → plan → execute → verify (no interrogation, no PR)

---

## Security (7 Layers)

| Layer | Hook | What it blocks |
|-------|------|---------------|
| Command validation | `validate-command.sh` | `rm -rf /`, fork bombs, shell injection, destructive ops |
| Path validation | `validate-path.sh` | Path traversal, system dirs, sensitive dotfiles |
| Env protection | `validate-env.sh` | `PATH`/`HOME` reassignment, credential patterns |
| Injection detection | `injection-scan.sh` | Role-switching, authority markers, delimiter attacks |
| Exfiltration prevention | `exfiltration-check.sh` | `curl`/`wget` with sensitive files, base64+network combos |
| Credential redaction | `credential-redact.sh` | `.env`, `.pem`, `.key` access → audit + alert |
| Content trust | `content-trust.sh` | Flags external content as untrusted + optional LLM firewall |

Plus supply-chain defense: Unicode/Glassworm detection (`unicode-firewall.sh`), integrity verification (`integrity-verify.sh`), and lockfile auditing (`lockfile-audit.sh`).

---

## Commands (37)

### Core Commands

| Command | Purpose |
|---------|---------|
| `/agentops:build` | Master 8.5-phase project lifecycle — vision to merged PR |
| `/agentops:plan` | STAR-based implementation plan with checkable tasks |
| `/agentops:star` | Quick STAR analysis (lighter than plan) |
| `/agentops:interrogate` | Exhaustive requirements discovery — eliminates all assumptions |
| `/agentops:workflow` | 8-phase workflow mapping with YAML schemas and Mermaid diagrams |
| `/agentops:verify` | Verify task completion against STAR criteria |
| `/agentops:evolve` | Run EvoSkill self-improvement loop |
| `/agentops:code-field` | Code Field methodology (decompose, solve with confidence, verify) |
| `/agentops:code-analysis` | Structured code analysis on current project |
| `/agentops:lessons` | Display all captured lessons |
| `/agentops:lesson` | Capture a single lesson learned |
| `/agentops:compliance-check` | Run compliance gates manually |
| `/agentops:cost-report` | Session cost tracking and budget status |
| `/agentops:flags` | View or toggle feature flags |
| `/agentops:configure` | Unified configuration interface with presets |
| `/agentops:prune` | Clean up stale runtime state |
| `/agentops:supply-chain-scan` | Scan dependencies for supply-chain threats |
| `/agentops:unicode-scan` | Scan project for invisible Unicode characters |

### Enterprise Commands

| Command | Purpose |
|---------|---------|
| `/agentops:feature` | 6-phase structured feature build with configurable autonomy |
| `/agentops:scaffold` | Interactive project scaffolding with tech stack selection |
| `/agentops:review` | Unified code review (code-critic + security-reviewer agents) |
| `/agentops:test-gen` | AI-generated test suites with quality validation |
| `/agentops:reason` | Multi-step reasoning: Analyse → Design → Validate → Recommend |
| `/agentops:design` | Solution design — architecture proposals, risk assessment |
| `/agentops:adr` | Architecture Decision Records |
| `/agentops:brainstorm` | Structured brainstorming sessions |
| `/agentops:qa-check` | Pre-deployment QA: security, performance, accessibility |
| `/agentops:handover` | Client handover documentation and runbooks |
| `/agentops:onboard` | Generate onboarding guides from project structure |
| `/agentops:knowledge` | Search project knowledge base |
| `/agentops:status-report` | Client-facing status report from git history |
| `/agentops:tech-catalog` | Technology catalog and stack documentation |
| `/agentops:gap-analysis` | Gap analysis between current and desired state |
| `/agentops:dev-setup` | Developer environment setup guide |
| `/agentops:docker-dev` | Docker development environment configuration |
| `/agentops:e2e` | End-to-end test planning and execution |
| `/agentops:herd` | Multi-agent coordination for complex tasks |

---

## Specialist Agents (12)

### Core Agents

| Agent | Tools | Purpose |
|-------|-------|---------|
| `code-critic` | Read, Grep, Glob, Bash | 11-dimension code quality review |
| `security-reviewer` | Read, Grep, Glob, Bash, WebSearch | OWASP Top 10, CVE scanning, auth gaps |
| `interrogator` | Read, Grep, Glob, WebSearch | Requirements discovery and plan generation |
| `proposer` | Read, Grep, Glob | Failure analysis → skill proposals (EvoSkill) |
| `skill-builder` | Read, Grep, Glob, Bash | Materialize skill proposals into SKILL.md files |
| `delegation-router` | Read, Grep, Glob | Route tasks to appropriate specialist agents |

### Build Agents (Phase-specific)

| Agent | Phase | Tools | Purpose |
|-------|-------|-------|---------|
| `stack-researcher` | 2 | Read, Grep, Glob, WebSearch | Technology stack options with fit scores |
| `architecture-researcher` | 2 | Read, Grep, Glob, WebSearch | Architectural patterns and ADRs |
| `feature-researcher` | 2 | Read, Grep, Glob, WebSearch | MVP vs v2 scope, feature trade-offs |
| `pitfalls-researcher` | 2 | Read, Grep, Glob, WebSearch | Anti-patterns, failure modes, security pitfalls |
| `plan-validator` | 3 | Read, Grep, Glob | 8-dimension plan validation |
| `spec-compliance-reviewer` | 6 | Read, Grep, Glob, Bash | Requirement mapping + standards compliance |

---

## Hook System (44 hooks)

Hooks fire at 7 lifecycle events:

| Event | When | Example hooks |
|-------|------|---------------|
| `SessionStart` | Session begins | session-cleanup, star-preamble, code-field-preamble, lessons-check, budget-check, unicode-scan, integrity-verify, lockfile-audit |
| `PreToolUse` | Before tool executes | validate-command, validate-path, validate-env, injection-scan, exfiltration-check, star-gate, auto-plan, runtime-mode |
| `PostToolUse` | After tool completes | content-trust, unicode-firewall, integrity-verify, credential-redact, detect-test-run, standards-enforce, ai-guardrails, plan-gate, auto-test, auto-delegate, audit-log, telemetry |
| `PostToolUseFailure` | After tool fails | failure-collector, auto-lesson, evolve-gate, telemetry |
| `SubagentStart` | Subagent spawned | delegation-trust |
| `Stop` | Session ending | auto-verify, auto-evolve, compliance-gate |
| `SessionEnd` | Final cleanup | telemetry |

---

## EvoSkill Self-Evolution

```
Tool Failure → failure-collector.sh → failures.jsonl
                                          ↓
                                    /agentops:evolve
                                          ↓
                              proposer agent (analyze failures,
                              check existing skills & feedback)
                                          ↓
                                    Skill Proposal
                                          ↓
                              skill-builder agent (materialize SKILL.md)
                                          ↓
                              feedback-history.jsonl (record outcome)
```

Triggered automatically at session stop (if 2+ unprocessed failures exist) or manually via `/agentops:evolve`.

---

## Engineering Standards

The build system injects comprehensive engineering standards into every execution subagent:

- **SOLID** — all 5 principles with heuristics and code examples (SRP: ≤30 line functions, ≤200 line classes)
- **Clean Code** — naming, functions (≤3 params, command-query separation), error handling (typed hierarchy, correlation IDs)
- **DRY/KISS/YAGNI** — with clear thresholds (2+ locations = extract, 3+ uses before abstracting)
- **Design Patterns** — creational, structural, behavioral with selection heuristic ("name the problem it solves")
- **Action-Based Architecture** — single-purpose action classes for business logic
- **DDD** — aggregates, entities, value objects, domain services, ubiquitous language
- **Layered Architecture** — controller → service → domain → repository (no skipping, violations = CRITICAL)
- **Security** — injection prevention, secrets management, auth, input validation, data protection (all CRITICAL)
- **Testing** — Arrange-Act-Assert, red-first TDD, behaviour over implementation

Standards are enforced via `templates/standards/standards-checklist.md` during Phase 6 review.

---

## Feature Flags (32+)

All flags default to sensible values and are toggleable via `/agentops:flags` or `.agentops/flags.json`.

### Security flags
`command_validation_enabled`, `path_validation_enabled`, `env_validation_enabled`, `injection_scan_enabled`, `content_trust_enabled`, `exfiltration_detection_enabled`, `credential_redaction_enabled`, `llm_content_firewall_enabled`

### Workflow flags
`star_preamble_enabled`, `code_field_rules_enabled`, `plan_gate_enabled`, `verification_gate_enabled`, `test_gate_enabled`, `lessons_enabled`

### Automation flags
`auto_plan_enabled`, `auto_test_enabled`, `auto_verify_enabled`, `auto_lesson_enabled`, `auto_evolve_enabled`, `auto_delegate_enabled`

### Build lifecycle flags
`build_tdd_enforced`, `build_parallel_research`, `build_xml_plans`, `build_linear_sync`, `build_fresh_context`, `build_wave_parallel`, `build_nyquist_enforce`, `build_persuasion`, `build_quick_mode`, `build_scaffold_auto`, `build_standards_inject`, `standards_enforcement_mode`

### Enterprise flags
`enterprise_scaffold`, `ai_workflows`, `unified_review`, `architecture_guardrails`, `delivery_lifecycle`, `team_governance`, `client_comms`

### Autonomy levels
- **guided** (default) — all human gates active
- **supervised** — all human gates + step-level confirmation during execution
- **autonomous** — skip soft gates, only hard security gates remain

### Configuration presets
```bash
/agentops:configure preset minimal      # Security only, no automation
/agentops:configure preset standard     # Security + core automation
/agentops:configure preset enterprise   # All features, guided autonomy
/agentops:configure preset autonomous   # All features, minimal gates
```

---

## Observability

| System | File | Purpose |
|--------|------|---------|
| Audit log | `.agentops/audit.jsonl` | Every tool invocation with timestamp, session, tool, input |
| Telemetry | `.agentops/telemetry.jsonl` | Structured events with optional OTLP export |
| File provenance | `.agentops/provenance.jsonl` | Source and trust level of every file interaction |
| Cost tracking | `.agentops/budget.json` | Session budget with 80% warning threshold |
| Build execution | `.agentops/build-execution.jsonl` | Per-task execution log with TDD phase tracking |
| Failure log | `.agentops/failures.jsonl` | Tool failures for EvoSkill analysis |
| Integrity | `.agentops/integrity.jsonl` | SHA-256 manifest of agent-written files |

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENTOPS_MODE` | `standard` | Runtime mode (`safe`, `standard`, `full`, `unrestricted`) |
| `AGENTOPS_BUDGET_USD` | `5` | Session cost budget in USD |
| `OTLP_ENDPOINT` | _(none)_ | OpenTelemetry endpoint for telemetry forwarding |
| `LINEAR_API_KEY` | _(none)_ | Linear API key for build task sync |

### Key Files

| File | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin metadata |
| `hooks/hooks.json` | Master hook registry |
| `settings.json` | Plugin permission defaults |
| `.agentops/flags.json` | Feature flag toggles (auto-created) |
| `.agentops/budget.json` | Cost tracking (auto-created) |

---

## Directory Structure

```
agentops-plugin/
├── .claude-plugin/
│   └── plugin.json                 # Plugin metadata
├── hooks/                          # 44 shell scripts + hooks.json
│   ├── hooks.json                  # Master hook registry
│   ├── feature-flags.sh            # Shared flag library (facade)
│   ├── flag-utils.sh               # Core flag reading
│   ├── enforcement-lib.sh          # Enforcement actions
│   ├── patterns-lib.sh             # Shared patterns & thresholds
│   ├── redact-lib.sh               # Secret redaction
│   ├── evolve-lib.sh               # Failure tracking helpers
│   ├── unicode-lib.sh              # Unicode detection library
│   └── *.sh                        # Security, automation, compliance hooks
├── commands/                       # 37 slash commands
│   ├── build.md                    # /agentops:build (master lifecycle)
│   ├── plan.md                     # /agentops:plan (STAR planning)
│   ├── interrogate.md              # /agentops:interrogate (requirements)
│   ├── workflow.md                 # /agentops:workflow (process mapping)
│   └── enterprise/                 # 19 enterprise delivery commands
├── agents/                         # 12 specialist agents
│   ├── code-critic.md              # Code quality (11 dimensions)
│   ├── security-reviewer.md        # Security (OWASP, CVEs)
│   ├── stack-researcher.md         # Technology research (build Phase 2)
│   ├── architecture-researcher.md  # Architecture research (build Phase 2)
│   ├── feature-researcher.md       # Feature scoping (build Phase 2)
│   ├── pitfalls-researcher.md      # Failure modes (build Phase 2)
│   ├── plan-validator.md           # 8-dimension validation (build Phase 3)
│   └── spec-compliance-reviewer.md # Spec + standards review (build Phase 6)
├── templates/                      # 49 templates
│   ├── standards/                  # Engineering standards + checklist
│   ├── build/                      # Brief, task-plan, summary templates
│   ├── architecture/               # 8 architecture pattern templates
│   ├── delivery/                   # Discovery → deployment → handover
│   ├── communication/              # Stakeholder comms templates
│   ├── workflows/                  # Feature, refactor, spike, bug workflows
│   └── scaffolds/                  # Error handling, logging, health checks
├── tests/                          # BATS test suite
├── docs/                           # Architecture docs
├── settings.json                   # Plugin permission defaults
├── LICENSE                         # MIT
└── .gitignore
```

---

## Testing

The plugin includes a BATS test suite covering security hooks:

```bash
# Run all tests
bats tests/

# Run specific test file
bats tests/validate-command.bats
bats tests/injection-scan.bats
bats tests/exfiltration-check.bats
bats tests/validate-path.bats
bats tests/feature-flags.bats
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
