---
name: gap-analysis
description: Analyze the current directory against the technology catalog to identify gaps, missing tooling, and improvement opportunities
---

You perform a gap analysis on the current working directory. Your job is to understand what exists, what's missing, and what could be improved — then present actionable findings.

Arguments: $ARGUMENTS

---

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for all interactive questions. DO NOT print questions as plain text.

---

## Phase 1: Detection — What Is This?

Before analyzing gaps, you must understand what you're looking at. Read the current directory and determine:

### For code projects:
- Read `package.json`, `composer.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`, `*.csproj`, or equivalent
- Read config files: `.env.example`, `docker-compose.yml`, `Dockerfile`, `.github/workflows/*.yml`, `tsconfig.json`, `vite.config.*`, `next.config.*`, `phpunit.xml`, `pest.php`, etc.
- Read `README.md` if it exists for project context
- Check for `.git` (version controlled?)
- Check directory structure (src/, app/, tests/, resources/, etc.)

### For non-code directories:
- Look at file types present (documents, spreadsheets, images, configs)
- Check for task management files (todo.md, tasks/, etc.)
- Check for documentation structure
- Identify the purpose from folder naming and contents

### Classification output:
Determine the **project type** and **maturity level**:
- **Type**: Laravel, Next.js, Python/FastAPI, Go service, Rust CLI, monorepo, documentation site, admin/ops, mixed, unknown
- **Maturity**: greenfield (just started), active development, mature/stable, legacy, non-code

---

## Phase 2: Stack Inventory

Read `templates/tech-catalog.json` from the AgentOps plugin directory (`${CLAUDE_PLUGIN_ROOT}/templates/tech-catalog.json`). If that fails, try the relative path from the current project.

Build an inventory of what the project currently uses by mapping detected technologies to catalog categories:

```markdown
## Current Stack

| Category | Detected | Source |
|----------|----------|--------|
| Language | PHP 8.3 | composer.json |
| Backend | Laravel 11 | composer.json |
| Frontend | Livewire 3 | composer.json |
| Database | MySQL | .env.example |
| ORM | Eloquent | (implicit from Laravel) |
| Testing | Pest | pest.php |
| CI/CD | GitHub Actions | .github/workflows/ |
| ... | ... | ... |
```

For each catalog category, mark it as:
- **Present** — technology detected and in use
- **Absent** — category applies but nothing detected
- **N/A** — category doesn't apply to this project type

---

## Phase 3: Gap Analysis

Compare the inventory against the catalog and best practices. Identify gaps across these dimensions:

### 3a. Missing Essentials
Things that are expected for this project type but absent:
- No testing framework detected
- No CI/CD pipeline
- No linter/formatter configured
- No `.env.example` (secrets documentation)
- No `README.md` or documentation
- No error tracking / observability
- No authentication when the app clearly needs it
- No type checking (TypeScript strict mode off, no PHPStan, no mypy)

### 3b. Upgrade Opportunities
Things that exist but could be improved:
- Outdated framework version (check `composer.json` / `package.json` version constraints)
- Using deprecated tools (e.g. OpenAI Assistants when Agents SDK exists, PlanetScale free tier gone)
- Missing complementary tools (e.g. has Laravel but no Pint/Larastan, has Next.js but no Zod)
- Test coverage gaps (has unit tests but no E2E, or vice versa)

### 3c. Architecture & Standards
Compare against design patterns and engineering principles:
- No clear architectural pattern detected
- Missing coding standards enforcement (no linter config, no `.editorconfig`)
- No conventional commits or changelog automation
- No dependency update strategy (Dependabot, Renovate)

### 3d. DevOps & Infrastructure
- No Docker / containerisation
- No environment parity (dev vs prod)
- No deployment pipeline
- No infrastructure as code
- No secrets management approach

### 3e. AI Readiness (if applicable)
- No AI/LLM integration when the project could benefit
- No MCP servers configured when using Claude Code
- Missing vector search capability for data-heavy apps

### 3f. Non-Code Gaps (for non-code directories)
- Missing documentation structure
- No version control
- No backup strategy
- Missing templates or standards
- No task tracking

---

## Phase 4: Severity Classification

Rate each gap:
- **Critical** — Blocking quality, security, or delivery. Fix now.
- **High** — Significant improvement. Fix this sprint.
- **Medium** — Nice to have. Plan for it.
- **Low** — Minor polish. Address when convenient.

Criteria:
- Security gaps are always Critical (no auth, exposed secrets, no dependency scanning)
- Missing tests for a production app = High
- No linter for a solo project = Low
- No CI/CD for a team project = High
- No observability for production = Critical

---

## Phase 5: Output

Present findings as:

```markdown
## Gap Analysis: [Project Name]

**Type:** [project type] | **Maturity:** [level] | **Stack:** [primary tech]
**Scanned:** [date] | **Catalog version:** [version]

### Current Stack
[Phase 2 table]

### Findings

#### Critical (X items)
| # | Gap | Category | Recommendation | Catalog Match |
|---|-----|----------|---------------|---------------|
| 1 | [what's missing] | [category] | [specific action] | [tech from catalog] |

#### High (X items)
[same table format]

#### Medium (X items)
[same table format]

#### Low (X items)
[same table format]

### Quick Wins
[Top 3 things that can be fixed in under 30 minutes, with specific commands or steps]

### Summary
- **Total gaps:** X (Y critical, Z high, W medium, V low)
- **Strongest areas:** [what's well-covered]
- **Weakest areas:** [biggest gaps]
```

---

## Arguments

### No arguments — Full analysis
Run all phases on the current directory.

### `--focus <area>` — Focused analysis
Only analyze a specific area. Valid areas:
- `testing` — Test coverage, frameworks, strategies
- `devops` — CI/CD, Docker, deployment, infrastructure
- `security` — Auth, secrets, dependencies, scanning
- `quality` — Linting, formatting, type checking, standards
- `architecture` — Patterns, structure, separation of concerns
- `ai` — AI/LLM readiness, MCP servers, vector search
- `observability` — Monitoring, logging, tracing, error tracking

### `--quick` — Quick scan
Skip detailed file reading. Only check top-level config files and produce a summary with critical/high gaps only.

---

## Guidelines

- Be specific in recommendations. Don't say "add testing" — say "add Pest with `composer require pestphp/pest --dev && ./vendor/bin/pest --init`"
- Reference catalog entries by name so the user can cross-reference with `/agentops:enterprise:tech-catalog`
- Don't recommend technologies that conflict with the existing stack (e.g. don't suggest Jest for a Laravel project)
- For non-code directories, adapt the analysis — don't force code-centric gaps onto admin tasks
- If the project is a greenfield with almost nothing, focus on the essential scaffolding gaps rather than listing every missing category
- When in doubt about whether a gap matters, err on the side of including it at a lower severity
