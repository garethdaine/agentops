# Enterprise Pattern: Environment Validation

Generate the following environment validation pattern adapted to the project's chosen stack.

## Environment Schema (`src/lib/env.ts`)

```typescript
import { z } from 'zod';

/**
 * Define all required environment variables with types and defaults.
 * The app will fail fast at startup if any required variable is missing or invalid.
 */
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  SERVICE_NAME: z.string().default('{{project_name}}'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // {{#if database}}
  // Database
  DATABASE_URL: z.string().url(),
  // {{/if}}

  // {{#if auth_strategy}}
  // Auth
  // AUTH_SECRET: z.string().min(32),
  // {{/if}}

  // Add project-specific variables below
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment variables — import this instead of using process.env directly.
 * Guarantees type safety and presence of all required variables.
 */
export const env = validateEnv();
```

## .env.example Template

```bash
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
SERVICE_NAME={{project_name}}
LOG_LEVEL=debug

# Database (uncomment if database selected)
# DATABASE_URL=postgresql://user:password@localhost:5432/{{project_name}}?schema=public

# Authentication (uncomment if auth selected)
# AUTH_SECRET=generate-a-secret-at-least-32-chars-long
# AUTH_URL=http://localhost:3000

# External Services
# API_KEY=your-api-key-here
```

## Usage Notes

- Import `env` from `@/lib/env` instead of accessing `process.env` directly
- Add new environment variables to both the zod schema AND `.env.example`
- The schema validates at import time — if validation fails, the app exits immediately with clear error messages
- Use `z.coerce.number()` for numeric env vars (they're always strings in `process.env`)
- Mark optional variables with `.optional()` or `.default()`
