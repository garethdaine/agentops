# Architecture Pattern: API-First Design

## When to Use

- Building services consumed by multiple clients (web, mobile, CLI, third-party)
- Teams working in parallel on frontend and backend
- Public or partner-facing APIs where stability guarantees matter
- Microservice architectures where contracts prevent integration drift

## Pattern Description

API-first means the API contract is designed, reviewed, and agreed upon before any implementation begins. The OpenAPI specification becomes the single source of truth. Code is generated from the spec (not the other way around), and breaking changes follow a strict deprecation workflow.

## OpenAPI Spec as Source of Truth

Define your API contract before writing a single route handler:

```typescript
/**
 * Generate types directly from the OpenAPI spec.
 * Tools like openapi-typescript produce exact type definitions.
 *
 *   npx openapi-typescript ./api/openapi.yaml -o ./src/generated/api-types.ts
 */
import type { paths, components } from './generated/api-types';

// Request and response types are derived from the spec, not hand-written
type CreateProjectBody = components['schemas']['CreateProjectInput'];
type ProjectResponse = components['schemas']['Project'];
type ListProjectsParams = paths['/projects']['get']['parameters']['query'];
```

### Spec-Driven Validation Middleware

```typescript
import { OpenAPIValidator } from 'openapi-backend';

const validator = new OpenAPIValidator({
  definition: './api/openapi.yaml',
});

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const result = validator.validateRequest(req);
  if (result.errors && result.errors.length > 0) {
    throw new ValidationError('Request does not match API contract', {
      errors: result.errors,
    });
  }
  next();
}
```

## API Versioning Strategies

### URL Path Versioning (Recommended for Public APIs)

```typescript
// Simple, explicit, easy to route and cache
router.use('/api/v1/projects', v1ProjectRoutes);
router.use('/api/v2/projects', v2ProjectRoutes);
```

**Pros:** Visible in logs and debugging, easy CDN cache segmentation, simple routing.
**Cons:** URL pollution, clients must update base URLs on major version bumps.

### Header Versioning (Recommended for Internal APIs)

```typescript
export function versionRouter(req: Request, res: Response, next: NextFunction) {
  const version = req.headers['api-version'] ?? req.headers['accept-version'] ?? '1';
  req.apiVersion = parseInt(version as string, 10);
  next();
}

// Route handler checks version
async function getProjects(req: Request, res: Response) {
  if (req.apiVersion >= 2) {
    return res.json(await projectService.listV2(req.query));
  }
  return res.json(await projectService.listV1(req.query));
}
```

**Pros:** Clean URLs, fine-grained per-endpoint versioning.
**Cons:** Hidden from logs without explicit extraction, harder to cache.

### Query Parameter Versioning (Avoid for New APIs)

```typescript
// /api/projects?version=2
// Only appropriate for legacy systems or simple internal tools.
```

## Breaking Change Policy

Define what constitutes a breaking change and enforce it in CI:

```typescript
/**
 * BREAKING (requires major version bump):
 * - Removing an endpoint
 * - Removing or renaming a required field
 * - Changing a field type
 * - Narrowing allowed enum values
 * - Changing authentication requirements
 *
 * NON-BREAKING (minor or patch):
 * - Adding a new optional field to a response
 * - Adding a new endpoint
 * - Widening allowed enum values
 * - Adding optional query parameters
 */

// CI check: compare current spec against published baseline
// npx openapi-diff ./api/openapi-baseline.yaml ./api/openapi.yaml --breaking
```

## Deprecation Workflow

```typescript
/**
 * Step 1: Mark deprecated in spec and add Sunset header
 * Step 2: Log usage metrics for deprecated endpoints
 * Step 3: Notify consumers via changelog and response headers
 * Step 4: Remove after sunset date
 */
export function deprecationMiddleware(
  sunsetDate: string,
  replacementUrl?: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate);
    if (replacementUrl) {
      res.setHeader('Link', `<${replacementUrl}>; rel="successor-version"`);
    }
    logger.warn('Deprecated endpoint called', {
      path: req.path,
      sunsetDate,
      callerIp: req.ip,
      apiKey: req.headers['x-api-key'],
    });
    next();
  };
}

router.get(
  '/api/v1/projects',
  deprecationMiddleware('2025-09-01', '/api/v2/projects'),
  v1GetProjects,
);
```

## Contract Testing in CI

```typescript
describe('API contract', () => {
  it('should match the OpenAPI spec for GET /projects', async () => {
    const response = await request(app).get('/api/v1/projects').expect(200);

    const validation = validator.validateResponse(
      response.body,
      { method: 'GET', path: '/api/v1/projects', statusCode: 200 },
    );
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject requests missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .send({})
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });
});
```

## Trade-offs

- **Upfront cost:** Designing the spec first takes time but prevents costly rework later.
- **Tooling dependency:** You rely on code generation tools staying maintained.
- **Spec drift risk:** Without CI enforcement, implementation can diverge from the spec.
- **Team discipline:** Requires buy-in from all contributors to treat the spec as authoritative.

## Common Pitfalls

1. **Generating spec from code** — Inverts the intended flow. The spec should drive the code, not reflect it after the fact.
2. **Versioning too eagerly** — Not every change needs a new version. Additive changes are non-breaking.
3. **No sunset enforcement** — Marking endpoints deprecated without a removal date means they live forever.
4. **Ignoring error schemas** — Define error response shapes in the spec. Clients need to parse errors reliably.
5. **Skipping contract tests in CI** — The spec is only useful if violations break the build.
