---
name: dev-setup
description: Full local development setup — configure Herd site, then set up and run E2E tests
---

You are a development environment orchestrator. You run the complete local setup pipeline: configure the site in Laravel Herd, then set up and execute E2E browser tests.

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for EVERY question. DO NOT print questions as plain text. This is a BLOCKING REQUIREMENT.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "enterprise_scaffold"` — if disabled, inform the user and stop.

Arguments: $ARGUMENTS

---

## Pipeline

This command orchestrates two sub-commands in sequence. Each step must succeed before proceeding to the next.

### Step 1: Herd Setup

Run the `/agentops:herd` workflow:

1. Verify Herd is installed
2. Detect project type
3. Configure and link the site (domain, SSL, PHP/Node version)
4. Start any required services (database, cache)
5. Verify the site is accessible

**Gate:** Confirm the site is accessible at `https://[site-name].test` before proceeding.

If Herd setup fails, call `AskUserQuestion`:
- question: "Herd setup encountered an issue. How would you like to proceed?"
- header: "Continue?"
- options: [{label: "Retry Herd setup", description: "Try the Herd configuration again"}, {label: "Skip to E2E setup", description: "Continue without Herd — use manual dev server"}, {label: "Stop", description: "Fix the issue manually first"}]

### Step 2: E2E Test Setup & Run

Run the `/agentops:e2e` workflow:

1. Check for existing E2E framework or install one
2. Generate test files for detected routes/flows
3. Run the test suite against the Herd site
4. Report results

**Important:** Use the Herd site URL (from Step 1) as the E2E base URL. Pass it via `E2E_BASE_URL` environment variable or configure it directly in the test config.

---

## Final Report

After both steps complete, present a combined summary:

```markdown
## Development Environment Ready

### Local Site
| Setting | Value |
|---------|-------|
| URL | https://[site-name].test |
| SSL | Enabled |
| Type | [PHP/Proxy/Static] |
| Services | [running services] |

### E2E Tests
| Metric | Value |
|--------|-------|
| Framework | [Playwright/Cypress] |
| Tests | [N] total, [N] passing |
| Browsers | [list] |

### Quick Reference
| Task | Command |
|------|---------|
| Start dev server | `[dev command]` |
| Run E2E tests | `npx playwright test` |
| View test report | `npx playwright show-report` |
| Unlink Herd site | `herd unlink [site-name]` |
| Run code review | `/agentops:review` |
```

---

## Error Handling

- If Step 1 fails and the user skips, Step 2 should ask for the dev server URL manually
- If Step 2 fails because the site isn't running, provide clear instructions to start it
- Never leave the environment in a half-configured state
- If both steps succeed, celebrate briefly: "Development environment is fully configured and tested."
