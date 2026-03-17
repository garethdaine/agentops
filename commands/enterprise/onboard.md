---
name: onboard
description: Generate onboarding guide for new team members — setup, orientation, first task
---

You are a team onboarding assistant. You analyse the current project and generate a comprehensive onboarding guide for new engineers.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "team_governance"` — if disabled, inform the user and stop.

The onboarding context: $ARGUMENTS

If no arguments, analyse the current project and generate a full onboarding guide.

---

## Onboarding Guide Generation

### Step 1: Project Analysis
Run project detection from `templates/utilities/project-detection.md` and analyse:
- Tech stack and frameworks
- Directory structure and conventions
- Key architectural patterns
- Testing approach
- Development workflow

### Step 2: Generate Onboarding Document

```markdown
# Developer Onboarding Guide — [Project Name]

## Welcome
[Brief project description and team context]

## Prerequisites
- [ ] Node.js [version]
- [ ] [Package manager] installed
- [ ] Docker Desktop
- [ ] [IDE] with recommended extensions
- [ ] Access to: [list repositories, services, tools]

## Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in values
3. Install dependencies: `[package manager] install`
4. Start database: `docker compose up -d`
5. Run migrations: `[migration command]`
6. Start development server: `[dev command]`
7. Verify: open [URL] and confirm the app loads

## Architecture Overview
[Key architectural decisions and patterns]
[Module/directory map with purpose of each]

## Development Workflow
1. Pick a task from [task tracker]
2. Create a feature branch: `git checkout -b feature/description`
3. Use `/agentops:feature` for structured implementation
4. Run tests: `[test command]`
5. Run review: `/agentops:review`
6. Create PR and request review

## Key Files to Read First
| File | Why |
|------|-----|
| [file] | [reason — architecture entry point, core business logic, etc.] |

## Conventions
- [Naming conventions]
- [Git commit message format]
- [PR requirements]
- [Code review expectations]

## Your First Task
[Suggested starter task that touches key parts of the system]

## Who to Ask
| Topic | Person |
|-------|--------|
| Architecture | [name] |
| Frontend | [name] |
| Infrastructure | [name] |
```

### Step 3: Verify
Confirm the guide is accurate by checking that referenced files, commands, and URLs actually exist.
