# Architecture Pattern: Caching Strategy

## When to Use

- Read-heavy workloads where the same data is requested repeatedly
- Expensive computations or queries that can tolerate slightly stale results
- Reducing latency for frequently accessed resources
- Protecting backend services from traffic spikes

## Pattern Description

Caching stores computed results closer to the consumer to avoid redundant work. Effective caching requires deliberate decisions about what to cache, where to cache it, how long entries remain valid, and how to invalidate them when the source data changes. The hardest part of caching is not adding it — it is invalidating it correctly.

## Cache Layers

```typescript
/**
 * Layer 1: Application memory (fastest, per-process, lost on restart)
 * Layer 2: Redis / Memcached (shared across processes, survives restarts)
 * Layer 3: CDN (edge cache for static and semi-static content)
 *
 * Check layers in order: memory -> Redis -> origin
 */

export interface CacheLayer {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export class TieredCache implements CacheLayer {
  constructor(
    private memory: CacheLayer,
    private redis: CacheLayer,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Check local memory first (sub-millisecond)
    const memResult = await this.memory.get<T>(key);
    if (memResult !== null) return memResult;

    // Fall back to Redis (1-2ms network hop)
    const redisResult = await this.redis.get<T>(key);
    if (redisResult !== null) {
      // Promote to memory cache with a shorter TTL
      await this.memory.set(key, redisResult, 30);
      return redisResult;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await Promise.all([
      this.memory.set(key, value, Math.min(ttlSeconds, 60)),
      this.redis.set(key, value, ttlSeconds),
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.memory.delete(key),
      this.redis.delete(key),
    ]);
  }
}
```

### In-Memory Cache Implementation

```typescript
export class MemoryCache implements CacheLayer {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
```

## Cache Key Design

```typescript
/**
 * Cache key rules:
 * 1. Include all parameters that affect the result
 * 2. Prefix with entity type for easy bulk invalidation
 * 3. Include tenant ID to prevent cross-tenant data leaks
 * 4. Keep keys human-readable for debugging
 * 5. Use a consistent separator (colon is conventional for Redis)
 */

export function buildCacheKey(parts: {
  entity: string;
  tenantId: string;
  id?: string;
  params?: Record<string, string | number | boolean>;
}): string {
  const base = `${parts.entity}:${parts.tenantId}`;
  if (parts.id) {
    return `${base}:${parts.id}`;
  }
  if (parts.params) {
    // Deterministic stringification — sort keys
    const sorted = Object.keys(parts.params)
      .sort()
      .map((k) => `${k}=${parts.params![k]}`)
      .join('&');
    return `${base}:list:${sorted}`;
  }
  return base;
}

// Examples:
// "project:tenant-abc:proj-123"
// "project:tenant-abc:list:page=1&status=active"
```

## Invalidation Strategies

### TTL-Based (Simplest)

```typescript
/**
 * Set a time-to-live and accept that data may be stale
 * for up to that duration. Appropriate when eventual
 * consistency is acceptable.
 */
await cache.set('project:tenant-1:proj-123', project, 300); // 5 minutes
```

### Event-Based Invalidation (Strongest Consistency)

```typescript
/**
 * Invalidate cache entries when the underlying data changes.
 * Requires an event bus or change data capture pipeline.
 */
eventBus.subscribe('project.updated', async (event) => {
  const key = buildCacheKey({
    entity: 'project',
    tenantId: event.data.tenantId,
    id: event.data.projectId,
  });
  await cache.delete(key);

  // Also invalidate list caches for this tenant
  await redis.deletePattern(`project:${event.data.tenantId}:list:*`);
});
```

### Write-Through

```typescript
/**
 * Update the cache synchronously on every write.
 * The cache is always consistent but writes are slower.
 */
export class WriteThroughRepository {
  constructor(
    private db: DatabaseClient,
    private cache: CacheLayer,
  ) {}

  async update(tenantId: string, id: string, data: UpdateInput): Promise<Project> {
    const updated = await this.db.update('projects', id, data);
    const key = buildCacheKey({ entity: 'project', tenantId, id });
    await this.cache.set(key, updated, 600);
    return updated;
  }
}
```

### Write-Behind (Write-Back)

```typescript
/**
 * Write to the cache immediately, persist to the database asynchronously.
 * Higher write throughput but risk of data loss if the cache fails
 * before the database write completes.
 */
export class WriteBehindRepository {
  constructor(
    private db: DatabaseClient,
    private cache: CacheLayer,
    private writeQueue: Queue,
  ) {}

  async update(tenantId: string, id: string, data: UpdateInput): Promise<void> {
    const key = buildCacheKey({ entity: 'project', tenantId, id });

    // Update cache immediately (fast path)
    const updated = { ...data, id, updatedAt: new Date().toISOString() };
    await this.cache.set(key, updated, 600);

    // Queue database write for async processing
    await this.writeQueue.add('db-write', {
      table: 'projects',
      id,
      data,
    });
  }
}
```

## Stampede Prevention

When a popular cache entry expires, many concurrent requests can hit the database simultaneously.

### Mutex Lock

```typescript
/**
 * Only one request computes the value while others wait.
 */
export async function getWithMutex<T>(
  cache: CacheLayer,
  redis: RedisClient,
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', { NX: true, EX: 10 });

  if (acquired) {
    try {
      const value = await computeFn();
      await cache.set(key, value, ttlSeconds);
      return value;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Another process is computing — wait and retry
  await sleep(50);
  return getWithMutex(cache, redis, key, computeFn, ttlSeconds);
}
```

### Probabilistic Early Expiration

```typescript
/**
 * Each request has a small probability of recomputing the value
 * before it actually expires, spreading the refresh load over time.
 *
 * XFetch algorithm: recompute with probability that increases
 * as the entry approaches its expiry time.
 */
export async function getWithEarlyExpiry<T>(
  cache: CacheLayer,
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const entry = await cache.getWithMetadata<T>(key);

  if (entry !== null) {
    const timeRemaining = entry.expiresAt - Date.now();
    const totalTtl = ttlSeconds * 1000;
    const beta = 1; // Tuning parameter

    // Probability of early recompute increases as expiry approaches
    const shouldRecompute =
      timeRemaining > 0 &&
      Math.random() < Math.exp((-timeRemaining / totalTtl) * beta);

    if (!shouldRecompute) {
      return entry.value;
    }
  }

  const value = await computeFn();
  await cache.set(key, value, ttlSeconds);
  return value;
}
```

## Cache Warming

```typescript
/**
 * Pre-populate the cache on application startup or deployment
 * to avoid cold-start latency for critical paths.
 */
export async function warmCache(
  db: DatabaseClient,
  cache: CacheLayer,
): Promise<void> {
  logger.info('Warming cache...');

  // Warm the most frequently accessed entities
  const activeTenants = await db.query<{ id: string }>(
    'SELECT id FROM tenants WHERE status = $1 ORDER BY last_active_at DESC LIMIT 100',
    ['active'],
  );

  for (const tenant of activeTenants) {
    const projects = await db.query(
      'SELECT * FROM projects WHERE tenant_id = $1 AND status = $2',
      [tenant.id, 'active'],
    );

    for (const project of projects) {
      const key = buildCacheKey({
        entity: 'project',
        tenantId: tenant.id,
        id: project.id,
      });
      await cache.set(key, project, 600);
    }
  }

  logger.info('Cache warming complete', {
    tenants: activeTenants.length,
  });
}

// Call on startup, after migrations
await warmCache(db, cache);
```

## Trade-offs

- **Consistency vs latency:** Longer TTLs mean faster reads but staler data. Event-based invalidation is more consistent but adds infrastructure complexity.
- **Memory cost:** Caching everything is wasteful. Cache hot data and let cold data go to origin.
- **Write-through vs write-behind:** Write-through is consistent but adds write latency. Write-behind is fast but risks data loss.
- **Tiered caching complexity:** Each layer adds operational surface area. Start with one layer and add more only when measurements justify it.

## Common Pitfalls

1. **No invalidation strategy** — Setting a TTL and hoping for the best leads to stale data bugs that are hard to reproduce.
2. **Cache keys missing a parameter** — If two different queries produce the same cache key, one overwrites the other with wrong data.
3. **Caching errors** — A failed database query cached for 5 minutes means 5 minutes of errors. Never cache error responses.
4. **Unbounded memory cache** — Without a max size and eviction policy (LRU), the process leaks memory. Set limits.
5. **Cross-tenant cache pollution** — Always include tenant ID in the cache key. A missing tenant prefix leaks data across tenants.
6. **Ignoring serialisation cost** — Serialising and deserialising large objects can negate the performance benefit of caching. Measure end-to-end latency.
