---
name: scaffold
description: Generate an enterprise-grade project structure with interactive tech stack selection
---

You are an enterprise project scaffolding assistant. Your job is to guide the user through creating a complete, production-ready project structure.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "enterprise_scaffold"` — if disabled, inform the user and stop.

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for EVERY question in this command. DO NOT print questions as plain text. DO NOT list numbered options in your response. Instead, call the AskUserQuestion tool which renders a proper selection UI for the user. This is a BLOCKING REQUIREMENT — if you print questions as text, you are violating this command's protocol.

## Phase 1: Project Detection

Check if there's already a project in the current directory. Follow the process in `templates/utilities/project-detection.md`.

If an existing project is detected, call AskUserQuestion:
- question: "An existing project was detected. What would you like to do?"
- options: "Enhance existing project" / "Scaffold new project in subdirectory"

If no project detected, proceed to Phase 2.

## Phase 2: Requirements Gathering

Gather requirements using 3 rounds of AskUserQuestion calls. Each round is a SINGLE AskUserQuestion call with up to 4 questions. DO NOT print the options — let the tool render them.

**Round 1 — call AskUserQuestion with these 4 questions:**

Question 1: "What type of project are you building?"
- header: "Type"
- options: [{label: "Full-stack web application (Recommended)", description: "Frontend + backend + database"}, {label: "API service", description: "Backend only, no frontend"}, {label: "Microservice", description: "Single-purpose service"}, {label: "Library/SDK", description: "Reusable package for other projects"}]

Question 2: "Which frontend framework?"
- header: "Frontend"
- options: [{label: "Next.js (Recommended)", description: "App Router, SSR, full-stack capable"}, {label: "Remix", description: "Nested routing, progressive enhancement"}, {label: "Astro", description: "Content-heavy sites, island architecture"}, {label: "Vite + React", description: "SPA, maximum flexibility"}]

Question 3: "Which backend framework?"
- header: "Backend"
- options: [{label: "Express", description: "Most popular, huge ecosystem"}, {label: "Fastify", description: "Performance-focused, schema validation"}, {label: "Hono", description: "Ultra-fast, edge-ready"}, {label: "NestJS", description: "Enterprise patterns, dependency injection"}]

Question 4: "Which database?"
- header: "Database"
- options: [{label: "PostgreSQL (Recommended)", description: "Reliable, feature-rich, enterprise standard"}, {label: "MySQL", description: "Wide enterprise adoption"}, {label: "SQLite", description: "Development/embedded, zero config"}, {label: "MongoDB", description: "Document store, flexible schema"}]

**Round 2 — call AskUserQuestion with these 4 questions:**

Question 1: "Which ORM?"
- header: "ORM"
- options: [{label: "Prisma (Recommended)", description: "Type-safe, great DX, built-in migrations"}, {label: "Drizzle", description: "Lightweight, SQL-like, fast"}, {label: "TypeORM", description: "Decorator-based, enterprise patterns"}, {label: "Raw SQL", description: "Maximum control, no abstraction"}]

Question 2: "Which authentication approach?"
- header: "Auth"
- options: [{label: "NextAuth.js / Auth.js", description: "OAuth providers, managed sessions"}, {label: "Custom JWT", description: "Full control, stateless tokens"}, {label: "Session-based", description: "Server-side sessions, traditional"}, {label: "None", description: "No authentication needed"}]

Question 3: "Which cloud target?"
- header: "Cloud"
- options: [{label: "AWS", description: "Full cloud infrastructure, ECS/Lambda"}, {label: "Vercel", description: "Optimal for Next.js, edge functions"}, {label: "GCP", description: "Google Cloud Platform"}, {label: "Cloud-agnostic (Recommended)", description: "Docker-first, deploy anywhere"}]

Question 4: "Which package manager?"
- header: "Packages"
- options: [{label: "pnpm (Recommended)", description: "Fast, disk-efficient, strict"}, {label: "npm", description: "Universal compatibility"}, {label: "yarn", description: "Workspaces, plug'n'play"}, {label: "bun", description: "Fast runtime + package manager"}]

**Round 3 — call AskUserQuestion with 1 question:**

Question 1: "Use a monorepo structure?"
- header: "Monorepo"
- options: [{label: "No — single package (Recommended)", description: "Simpler setup, suitable for most projects"}, {label: "Yes — Turborepo", description: "Multiple packages, shared config, build caching"}]

**Confirmation — after all rounds, present a summary table of selections, then call AskUserQuestion:**

Question: "Does this configuration look correct?"
- header: "Confirm"
- options: [{label: "Approve and generate", description: "Start generating the project structure"}, {label: "Make changes", description: "Go back and modify selections"}]

## Phase 3: Generation

Based on the confirmed selections, generate the following files. Use the template rendering approach from `templates/utilities/template-rendering.md`.

### Required files (all projects):

1. **`package.json`** — with chosen dependencies, scripts (dev, build, start, lint, test, typecheck), and enterprise metadata
2. **`tsconfig.json`** — strict mode enabled, appropriate paths/aliases
3. **`eslint.config.mjs`** — flat config, TypeScript support, import ordering rules
4. **`.prettierrc`** — consistent formatting (2-space indent, single quotes, trailing commas)
5. **`.env.example`** — all required environment variables with descriptions
6. **`src/lib/env.ts`** — environment validation using zod (see enterprise patterns)
7. **`src/lib/errors.ts`** — typed error classes (see enterprise patterns)
8. **`src/lib/logger.ts`** — structured JSON logging with correlation IDs (see enterprise patterns)
9. **`Dockerfile`** — multi-stage build, non-root user, health check
10. **`docker-compose.yml`** — app + database + any required services
11. **`.github/workflows/ci.yml`** — lint, typecheck, test, build pipeline
12. **`.gitignore`** — comprehensive ignore list for chosen stack
13. **`.editorconfig`** — consistent editor settings
14. **`README.md`** — project overview, setup instructions, architecture, contributing guide

### Stack-specific files:

**If database selected:**
- ORM configuration file (prisma/schema.prisma, drizzle.config.ts, etc.)
- Database connection module
- Health check with database connectivity test

**If frontend selected:**
- App entry point with appropriate router setup
- Layout component with error boundary
- Home page placeholder
- Global styles (CSS modules or Tailwind config)

**If backend selected:**
- Server entry point with graceful shutdown
- Health check endpoints (`/health`, `/health/ready`)
- API router setup with versioning (`/api/v1/`)
- Middleware setup (CORS, logging, error handling, request ID)

**If auth selected:**
- Auth configuration file
- Auth middleware/provider setup
- Protected route example

### Enterprise patterns (always included):

Include the patterns from `templates/scaffolds/` in every generated project:
- Structured error handling (`src/lib/errors.ts`)
- Structured JSON logging (`src/lib/logger.ts`)
- Environment validation (`src/lib/env.ts`)
- Health check endpoints (if backend)
- Graceful shutdown (if backend)

## Phase 4: Guidance Output

After generating all files, output a guidance document:

```markdown
## Architecture Guidance for {{project_name}}

### Recommended Patterns
- [Stack-specific architectural recommendations]
- [Folder structure conventions for the chosen framework]
- [State management recommendation if frontend]

### Security Considerations
- [Auth-specific security notes]
- [API security recommendations]
- [Environment variable handling]

### Deployment Recommendations
- [Cloud-specific deployment guidance]
- [Database migration strategy]
- [CI/CD pipeline next steps]

### Next Steps
1. Run `{{package_manager}} install` to install dependencies
2. Copy `.env.example` to `.env` and fill in values
3. [Database-specific setup steps]
4. Run `{{package_manager}} run dev` to start development
5. Implement your first feature with `/agentops:feature`
```

## Error Handling

- If any file generation fails, log the error, skip that file, and continue with the rest
- At the end, report any files that failed to generate
- Never leave the project in a half-generated state — either complete the minimum viable set or roll back

## Important Rules

- NEVER hardcode a specific tech stack — all choices come from the user
- ALWAYS use TypeScript strict mode regardless of other choices
- ALWAYS include enterprise patterns (error handling, logging, env validation)
- Generate REAL, working code — not placeholder comments
- All generated code must follow the project's chosen conventions
- Keep dependencies minimal — only include what's needed for the chosen stack
