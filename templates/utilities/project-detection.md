# Project Detection Utility

When this utility is invoked, analyse the current project to detect the technology stack in use. Follow these steps exactly:

## Detection Steps

1. **Package Manager & Runtime**
   - Check for `package.json` → Node.js project
   - Check for `requirements.txt` / `pyproject.toml` / `setup.py` → Python project
   - Check for `go.mod` → Go project
   - Check for `Cargo.toml` → Rust project
   - Check for `Gemfile` → Ruby project
   - Check for `pom.xml` / `build.gradle` → Java/Kotlin project
   - Check for `*.csproj` / `*.sln` → .NET project

2. **Frontend Framework** (if Node.js)
   - Read `package.json` dependencies for: next, remix, astro, nuxt, vite, create-react-app, angular, svelte, vue
   - Check for `next.config.*`, `remix.config.*`, `astro.config.*`, `vite.config.*`, `angular.json`

3. **Backend Framework** (if Node.js)
   - Read `package.json` for: express, fastify, hono, nestjs, koa, @hapi/hapi
   - Check for `nest-cli.json`

4. **Database & ORM**
   - Check for `prisma/schema.prisma` → Prisma
   - Check for `drizzle.config.*` → Drizzle
   - Read `package.json` for: typeorm, sequelize, knex, mongoose, pg, mysql2, better-sqlite3
   - Check for `docker-compose.yml` and look for database services (postgres, mysql, redis, mongo)

5. **Authentication**
   - Read `package.json` for: next-auth, passport, jsonwebtoken, jose, @auth/core, clerk, supabase
   - Check for auth-related directories: `src/auth/`, `lib/auth/`, `app/api/auth/`

6. **Cloud & Infrastructure**
   - Check for `serverless.yml` / `serverless.ts` → Serverless Framework
   - Check for `terraform/` or `*.tf` → Terraform
   - Check for `cdk.json` → AWS CDK
   - Check for `Dockerfile`, `docker-compose.yml`
   - Check for `.github/workflows/` → GitHub Actions CI/CD
   - Check for `vercel.json`, `netlify.toml`, `fly.toml`

7. **Testing**
   - Read `package.json` for: jest, vitest, mocha, cypress, playwright, @testing-library/*
   - Check for `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`

8. **Code Quality**
   - Check for `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `biome.json`
   - Check for `tsconfig.json` → TypeScript
   - Check for `.editorconfig`

## Output Format

Present findings as a structured summary:

```
## Detected Stack

| Layer | Technology | Confidence |
|-------|-----------|------------|
| Runtime | Node.js 20 | High |
| Frontend | Next.js 14 (App Router) | High |
| Backend | Next.js API Routes | High |
| Database | PostgreSQL (via Prisma) | High |
| Auth | NextAuth.js v5 | Medium |
| Cloud | Vercel | High |
| CI/CD | GitHub Actions | High |
| Testing | Vitest + Playwright | High |
| Language | TypeScript (strict) | High |

### Key Observations
- [Notable patterns, conventions, or architecture decisions detected]
- [Any gaps or areas where the stack is unclear]
```

If no project is detected (empty directory), report: "No existing project detected. This is a greenfield project."
