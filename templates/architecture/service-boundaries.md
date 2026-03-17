# Architecture Pattern: Service Boundaries

## When to Use

- Codebase has grown beyond a single team's cognitive capacity
- Multiple teams need to ship independently without merge conflicts
- You need clear dependency rules to prevent spaghetti imports
- Deciding between a monolith with strong module boundaries and microservices

## Pattern Description

Service boundaries define how a system is decomposed into modules or services, what each module owns, and the rules governing communication between them. Done well, boundaries enable independent development, testing, and deployment. Done poorly, they create distributed monoliths or circular dependency nightmares.

## Bounded Contexts (DDD)

Each bounded context owns a slice of the domain with its own ubiquitous language. The same real-world concept may have different representations in different contexts.

```typescript
// --- Billing context: a "User" is a billing account
// src/billing/types.ts
export interface BillingAccount {
  accountId: string;
  plan: 'free' | 'pro' | 'enterprise';
  paymentMethodId: string | null;
  invoiceEmail: string;
}

// --- Identity context: a "User" is an authentication principal
// src/identity/types.ts
export interface UserIdentity {
  userId: string;
  email: string;
  roles: string[];
  mfaEnabled: boolean;
  lastLoginAt: Date;
}

// These are NOT the same type. Each context defines
// only the fields it needs, using its own language.
```

## Module Structure: Package by Feature

Organise code around business capabilities, not technical layers:

```
src/
  projects/
    projects.controller.ts    # HTTP layer
    projects.service.ts       # Business logic
    projects.repository.ts    # Data access
    projects.types.ts         # Types scoped to this module
    projects.test.ts          # Tests for this module
    index.ts                  # Barrel export (public API)
  billing/
    billing.controller.ts
    billing.service.ts
    billing.repository.ts
    billing.types.ts
    billing.test.ts
    index.ts
  shared/
    errors.ts
    logger.ts
    middleware/
```

**Contrast with package-by-layer (avoid):**

```
src/
  controllers/     # Mixes all domains together
    projects.ts
    billing.ts
  services/
    projects.ts
    billing.ts
  repositories/
    projects.ts
    billing.ts
```

Package-by-layer scatters related code across directories and makes it impossible to reason about a single feature in isolation.

## Public API Surface (Barrel Exports)

Each module exposes a deliberate public API through its `index.ts`. Internal implementation details stay private.

```typescript
// src/projects/index.ts — the public API of the projects module
export { ProjectService } from './projects.service';
export type { Project, CreateProjectInput } from './projects.types';

// NOT exported: repository, internal helpers, database schemas
// Other modules may only import from this barrel file
```

## Dependency Rules

Define and enforce what can import what:

```typescript
/**
 * Dependency rules (enforce via eslint-plugin-import or eslint-plugin-boundaries):
 *
 * 1. Modules may import from `shared/` — shared utilities have no domain logic
 * 2. Modules must NOT import directly from another module's internals
 *    WRONG: import { projectRepo } from '../projects/projects.repository'
 *    RIGHT: import { ProjectService } from '../projects'
 * 3. Circular dependencies between modules are forbidden
 * 4. If module A needs data from module B, it calls B's public service API
 * 5. shared/ must NOT import from any domain module
 */

// ESLint boundaries configuration example
// .eslintrc.js
const boundaryRules = {
  'boundaries/element-types': [
    'error',
    {
      default: 'disallow',
      rules: [
        { from: 'projects', allow: ['shared'] },
        { from: 'billing', allow: ['shared'] },
        { from: 'shared', allow: ['shared'] },
        // projects and billing cannot import from each other
      ],
    },
  ],
};
```

## Cross-Module Communication

When modules need to collaborate, use explicit integration points:

```typescript
// Option 1: Direct service call (simpler, synchronous)
// src/billing/billing.service.ts
import { ProjectService } from '../projects';

export class BillingService {
  constructor(private projectService: ProjectService) {}

  async calculateUsage(accountId: string): Promise<UsageReport> {
    const projects = await this.projectService.listByAccount(accountId);
    return this.computeUsage(projects);
  }
}

// Option 2: Domain events (decoupled, asynchronous)
// src/projects/projects.service.ts
export class ProjectService {
  constructor(private eventBus: EventBus) {}

  async deleteProject(projectId: string): Promise<void> {
    await this.repository.delete(projectId);
    await this.eventBus.publish({
      type: 'project.deleted',
      data: { projectId },
    });
    // Billing module listens and cleans up independently
  }
}
```

## When to Split vs Keep Together

```typescript
/**
 * SPLIT into separate modules when:
 * - Different teams own different parts
 * - Different deployment cadences are needed
 * - Data ownership is clearly separable
 * - The bounded contexts have distinct ubiquitous languages
 *
 * KEEP TOGETHER when:
 * - Changes to A almost always require changes to B
 * - They share the same database tables
 * - Splitting would require distributed transactions
 * - The team is small enough to own the whole thing
 * - You are unsure — premature splitting is harder to undo than late splitting
 */
```

## Trade-offs

- **Upfront design cost:** Defining boundaries requires deep domain understanding early on.
- **Cross-cutting changes:** Features that span boundaries require coordination across modules.
- **Indirection overhead:** Service calls between modules add complexity versus direct function calls.
- **Duplication is sometimes correct:** Each context should own its types even if they look similar. Sharing types across boundaries creates coupling.

## Common Pitfalls

1. **Shared database tables across modules** — If two modules read/write the same table, they are not truly separated. One module should own the table and expose an API.
2. **God modules** — A `shared/` or `common/` directory that grows unbounded. Keep shared code limited to genuinely cross-cutting concerns (logging, errors, HTTP utilities).
3. **Barrel export everything** — Only export what other modules actually need. Internal helpers should remain private.
4. **Splitting too early** — Extracting a microservice before you understand the domain leads to wrong boundaries that are expensive to move.
5. **Circular dependencies** — If module A imports from B and B imports from A, extract the shared concept into a third module or use events to break the cycle.
6. **Ignoring runtime coupling** — Two services that must be deployed together and fail together are a distributed monolith, not microservices.
