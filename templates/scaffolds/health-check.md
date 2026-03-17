# Enterprise Pattern: Health Check Endpoints

Generate the following health check pattern adapted to the project's chosen framework.

## Health Check Routes

### Liveness Check (`/health`)

Returns 200 if the process is alive. No dependency checks — used by load balancers and container orchestrators for basic liveness.

```typescript
// GET /health
export function healthHandler(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: env.SERVICE_NAME,
    uptime: process.uptime(),
  });
}
```

### Readiness Check (`/health/ready`)

Returns 200 only if all dependencies are reachable. Used by orchestrators to determine if the service can accept traffic.

```typescript
interface HealthComponent {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTimeMs?: number;
  details?: Record<string, unknown>;
}

async function checkDatabase(): Promise<HealthComponent> {
  const start = Date.now();
  try {
    // Adapt to chosen ORM/database driver
    // Prisma: await prisma.$queryRaw`SELECT 1`
    // Drizzle: await db.execute(sql`SELECT 1`)
    // Raw: await pool.query('SELECT 1')
    return {
      name: 'database',
      status: 'healthy',
      responseTimeMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// Add more dependency checks as needed:
// async function checkRedis(): Promise<HealthComponent> { ... }
// async function checkExternalApi(): Promise<HealthComponent> { ... }

// GET /health/ready
export async function readinessHandler(req: Request, res: Response) {
  const checks = await Promise.all([
    checkDatabase(),
    // checkRedis(),
    // checkExternalApi(),
  ]);

  const allHealthy = checks.every((c) => c.status === 'healthy');
  const hasDegraded = checks.some((c) => c.status === 'degraded');

  const overallStatus = allHealthy ? 'ok' : hasDegraded ? 'degraded' : 'unavailable';
  const statusCode = allHealthy ? 200 : hasDegraded ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: env.SERVICE_NAME,
    uptime: process.uptime(),
    components: checks,
  });
}
```

## Response Format

```json
{
  "status": "ok",
  "timestamp": "2026-03-17T14:00:00.000Z",
  "service": "acme-portal",
  "uptime": 3600.5,
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "responseTimeMs": 2
    }
  ]
}
```

## Usage Notes

- `/health` should be fast and dependency-free — never add database checks to liveness
- `/health/ready` should check ALL critical dependencies
- Set appropriate timeouts on dependency checks (2-5 seconds max)
- In Kubernetes: use `/health` for `livenessProbe` and `/health/ready` for `readinessProbe`
- Consider adding a `/health/startup` for slow-starting services
