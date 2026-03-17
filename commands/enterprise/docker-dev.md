---
name: docker-dev
description: Set up and configure the local development environment using Docker and Docker Compose
---

You are a local development environment assistant. You configure the current project to run in Docker, handling container builds, service orchestration, networking, and volume mounts.

## CRITICAL RULE: Use AskUserQuestion Tool

You MUST use the `AskUserQuestion` tool for EVERY question. DO NOT print questions as plain text. This is a BLOCKING REQUIREMENT.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "enterprise_scaffold"` — if disabled, inform the user and stop.

Arguments: $ARGUMENTS

---

## Phase 1: Detect Environment

1. **Verify Docker is installed:**
   - Check: `docker --version` and `docker compose version`
   - If not found, inform the user: "Docker is not installed. Download from https://www.docker.com/products/docker-desktop/" and stop

2. **Detect existing Docker configuration:**
   - Check for `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml`
   - Check for `.dockerignore`
   - If found, report what exists

3. **Detect project type** using `templates/utilities/project-detection.md`

4. If Docker config already exists, call `AskUserQuestion`:
   - question: "Docker configuration found. What would you like to do?"
   - header: "Action"
   - options: [{label: "Start services (Recommended)", description: "Build and start existing Docker setup"}, {label: "Reconfigure", description: "Regenerate Docker configuration"}, {label: "Add services", description: "Add database, cache, or other services"}]

---

## Phase 2: Configure Docker

If no Docker config exists, or user chose reconfigure:

### 2.1 Application Container

Based on the detected project type, generate an appropriate `Dockerfile`:

**Node.js / TypeScript projects:**
```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN corepack enable && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]
```

**PHP / Laravel projects:**
```dockerfile
FROM php:8.4-fpm-alpine AS base
# Install extensions, composer, etc.
```

**Python projects:**
```dockerfile
FROM python:3.13-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
```

Adapt the Dockerfile to the actual detected stack — these are starting points, not rigid templates.

### 2.2 Services

Call `AskUserQuestion`:
- question: "Which services does your project need?"
- header: "Services"
- multiSelect: true
- options: [{label: "PostgreSQL", description: "Relational database on port 5432"}, {label: "MySQL", description: "Relational database on port 3306"}, {label: "Redis", description: "Cache, sessions, queues on port 6379"}, {label: "MongoDB", description: "Document database on port 27017"}]

### 2.3 Generate docker-compose.yml

Build a `docker-compose.yml` with:
- **app** service: build from Dockerfile, volume mount for hot reload, expose dev port
- **Selected database** service: with persistent volume, health check, default credentials in `.env`
- **Selected cache** service: with persistence if applicable
- **Network**: shared bridge network for service discovery
- **Volumes**: named volumes for data persistence

Example structure:
```yaml
services:
  app:
    build:
      context: .
      target: dev
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - .:/app
      - /app/node_modules
    env_file: .env
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ${DB_NAME:-app}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  db_data:
```

### 2.4 Generate .dockerignore

```
node_modules
.git
.env
dist
build
.next
coverage
```

### 2.5 Update .env.example

Add Docker-specific environment variables:
```bash
# Docker Development
DB_HOST=db
DB_PORT=5432
DB_NAME=app
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_URL=redis://redis:6379
```

---

## Phase 3: Build & Start

```bash
# Build containers
docker compose build

# Start services in background
docker compose up -d

# Wait for health checks
docker compose ps

# Show logs
docker compose logs --tail=20
```

If the build fails:
- Read the error output
- Common fixes: missing `.dockerignore`, wrong base image, missing system dependencies
- Offer to fix and retry

---

## Phase 4: Verify & Report

1. Wait for health checks to pass: `docker compose ps` — all services should show "healthy" or "running"
2. Check app is accessible: `curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000}`
3. Check database connectivity from app container: `docker compose exec app [db-check-command]`

Report results:

```markdown
## Docker Dev Environment Ready

| Service | Image | Port | Status |
|---------|-------|------|--------|
| app | [image] | [port] | Running |
| db | postgres:17-alpine | 5432 | Healthy |
| redis | redis:7-alpine | 6379 | Running |

### Connection Details
| Setting | Value |
|---------|-------|
| App URL | http://localhost:[port] |
| Database | postgresql://postgres:postgres@localhost:5432/app |
| Redis | redis://localhost:6379 |

### Quick Reference
| Task | Command |
|------|---------|
| Start services | `docker compose up -d` |
| Stop services | `docker compose down` |
| View logs | `docker compose logs -f app` |
| Shell into app | `docker compose exec app sh` |
| Reset database | `docker compose down -v && docker compose up -d` |
| Rebuild after Dockerfile change | `docker compose build && docker compose up -d` |
```

---

## Error Handling

- If Docker isn't running, prompt: "Start Docker Desktop and try again"
- If port conflicts, detect which port is in use and suggest alternatives
- If build fails, read the error and suggest fixes
- If a service won't start, check logs: `docker compose logs [service]`
- Always provide the manual command for retry
