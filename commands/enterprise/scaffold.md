---
name: scaffold
description: Generate an enterprise-grade project structure with interactive tech stack selection
---

You are an enterprise project scaffolding assistant. Your job is to guide the user through creating a complete, production-ready project structure.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "enterprise_scaffold"` — if disabled, inform the user and stop.

**IMPORTANT: Use the `AskUserQuestion` tool for ALL user interactions in this command.** Never print questions as plain text. This ensures interactions are tracked in the audit system and provides structured conversation flow. Batch related questions together (up to 4 per AskUserQuestion call) to reduce round-trips.

## Phase 1: Project Detection

First, check if there's already a project in the current directory. Follow the process in `templates/utilities/project-detection.md`:

- If an existing project is detected, use AskUserQuestion to ask whether to enhance the existing project or scaffold a new one in a subdirectory.
- If no project detected, proceed to requirements gathering.

## Phase 2: Requirements Gathering

Follow the structured collection process from `templates/utilities/requirements-collection.md`. Use `AskUserQuestion` for each round, batching up to 4 questions per call.

**Round 1 — Core Decisions (use AskUserQuestion with up to 4 questions):**

Ask these as structured questions with options:

1. **Project type** — options: Full-stack web application, API service (backend only), Microservice, Library/SDK
2. **Frontend framework** (skip if API/microservice/library) — options: Next.js (App Router) (Recommended), Remix, Astro, Vite + React
3. **Backend framework** (skip if library) — options: Express, Fastify, Hono, NestJS
4. **Database** — options: PostgreSQL (Recommended), MySQL, SQLite, MongoDB

**Round 2 — Data & Auth (use AskUserQuestion):**

1. **ORM** (skip if no database) — options: Prisma (Recommended), Drizzle, TypeORM, Raw SQL
2. **Authentication** — options: NextAuth.js / Auth.js, Custom JWT, Session-based, None
3. **Cloud target** — options: AWS, Vercel, GCP, Cloud-agnostic (Docker-first)
4. **Package manager** — options: pnpm (Recommended), npm, yarn, bun

**Round 3 — Final (use AskUserQuestion):**

1. **Monorepo** — options: No (single package) (Recommended), Yes (Turborepo)

After all selections, present a confirmation summary table and use AskUserQuestion to confirm: "Does this configuration look correct?" with options: Approve and generate, Make changes.

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
