# Architecture Pattern: Database Patterns

## When to Use

- Any application with persistent state beyond trivial key-value storage
- Systems that require schema evolution over time without downtime
- Read-heavy workloads that need query optimisation and replica routing
- Multi-service architectures where connection management becomes critical

## Pattern Description

Database patterns cover the full lifecycle of data management: how schemas evolve through migrations, how connections are pooled and managed, how queries are optimised, and how read/write workloads are distributed. Getting these fundamentals right prevents the most common class of production incidents.

## Migration Management

Migrations must be versioned, reversible, and safe to run against a live database.

```typescript
/**
 * Migration file naming convention:
 *   YYYYMMDDHHMMSS_descriptive_name.ts
 *   20250315120000_add_projects_table.ts
 *
 * Each migration has an up() and down() function.
 * down() must perfectly reverse up().
 */

// 20250315120000_add_projects_table.ts
export async function up(db: DatabaseClient): Promise<void> {
  await db.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(db.fn.uuid());
    table.text('tenant_id').notNullable().index();
    table.text('name').notNullable();
    table.text('status').notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now());
  });

  // Composite index for the most common query pattern
  await db.schema.raw(
    'CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status)',
  );
}

export async function down(db: DatabaseClient): Promise<void> {
  await db.schema.dropTableIfExists('projects');
}
```

### Safe Migration Practices

```typescript
/**
 * Rules for zero-downtime migrations:
 *
 * 1. NEVER rename a column in one step. Instead:
 *    Step 1: Add new column, backfill data
 *    Step 2: Deploy code that writes to both columns
 *    Step 3: Deploy code that reads from new column only
 *    Step 4: Drop old column
 *
 * 2. NEVER add a NOT NULL column without a default value
 *    to an existing table with data.
 *
 * 3. Adding an index on a large table — use CONCURRENTLY:
 */
export async function up(db: DatabaseClient): Promise<void> {
  // CREATE INDEX CONCURRENTLY does not lock the table for writes
  await db.schema.raw(
    'CREATE INDEX CONCURRENTLY idx_orders_created ON orders(created_at)',
  );
}

// CONCURRENTLY indexes cannot run inside a transaction,
// so mark this migration as non-transactional if your tool supports it.
export const config = { transaction: false };
```

## Connection Pooling

```typescript
/**
 * Connection pool sizing formula (PostgreSQL):
 *   pool_size = (core_count * 2) + effective_spindle_count
 *
 * For a typical 4-core cloud instance with SSDs: pool_size ~= 10
 * Each Node.js process gets its own pool. With 4 processes: 10 / 4 = 2-3 per process.
 */
export function createPool(config: DatabaseConfig): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,

    // Pool sizing
    min: 2,                    // Minimum idle connections
    max: 10,                   // Maximum connections per process
    idleTimeoutMillis: 30_000, // Close idle connections after 30s
    connectionTimeoutMillis: 5_000, // Fail fast if no connection available

    // Statement timeout to prevent runaway queries
    statement_timeout: 30_000,
  });
}

// Health check: verify pool is functional
export async function checkDatabaseHealth(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
```

## Query Optimisation Checklist

```typescript
/**
 * Before deploying a new query to production:
 *
 * 1. Run EXPLAIN ANALYZE on a representative dataset
 * 2. Check for sequential scans on large tables (Seq Scan)
 * 3. Verify index usage (Index Scan or Index Only Scan)
 * 4. Check estimated vs actual row counts — large discrepancies
 *    mean stale statistics (run ANALYZE)
 * 5. Look for nested loops with high row counts
 * 6. Check for implicit type casts that prevent index usage
 */

// Example: detecting slow queries at runtime
export function queryWithTiming<T>(
  pool: Pool,
  sql: string,
  params: unknown[],
  label: string,
): Promise<T[]> {
  const start = performance.now();
  return pool.query(sql, params).then((result) => {
    const duration = performance.now() - start;
    if (duration > 100) {
      logger.warn('Slow query detected', { label, duration, sql });
    }
    return result.rows as T[];
  });
}
```

## Indexing Strategy

```typescript
/**
 * Index type selection guide (PostgreSQL):
 *
 * B-tree (default):
 *   - Equality and range queries (=, <, >, BETWEEN)
 *   - ORDER BY, GROUP BY
 *   - Most common choice
 *
 * GIN (Generalized Inverted Index):
 *   - JSONB containment (@>, ?)
 *   - Full-text search (tsvector)
 *   - Array containment (@>, &&)
 *
 * GiST (Generalized Search Tree):
 *   - Geometric/spatial data
 *   - Range types (overlaps, contains)
 *   - Nearest-neighbour searches
 *
 * BRIN (Block Range Index):
 *   - Very large tables where values correlate with physical order
 *   - Time-series data (created_at on append-only tables)
 *   - Tiny index size compared to B-tree
 */

// Practical index examples
export async function up(db: DatabaseClient): Promise<void> {
  // B-tree: exact lookups and range scans
  await db.schema.raw(
    'CREATE INDEX idx_orders_status ON orders(status) WHERE status != \'completed\'',
  );

  // GIN: querying JSONB metadata
  await db.schema.raw(
    'CREATE INDEX idx_projects_metadata ON projects USING gin(metadata jsonb_path_ops)',
  );

  // Composite index: column order matters — put equality columns first
  await db.schema.raw(
    'CREATE INDEX idx_events_tenant_time ON events(tenant_id, created_at DESC)',
  );
}
```

## Read Replica Routing

```typescript
/**
 * Route read-only queries to replicas, writes to the primary.
 * Beware of replication lag — recently written data may not be
 * available on replicas immediately.
 */
export class RoutingDatabase {
  constructor(
    private primary: Pool,
    private replicas: Pool[],
  ) {}

  private nextReplicaIndex = 0;

  /** Route to primary for writes */
  async write<T>(sql: string, params: unknown[]): Promise<T[]> {
    const result = await this.primary.query(sql, params);
    return result.rows as T[];
  }

  /** Round-robin across read replicas */
  async read<T>(sql: string, params: unknown[]): Promise<T[]> {
    const replica = this.replicas[this.nextReplicaIndex % this.replicas.length];
    this.nextReplicaIndex++;
    const result = await replica.query(sql, params);
    return result.rows as T[];
  }

  /**
   * Read from primary when you need to read-your-own-writes.
   * Use sparingly — this adds load to the primary.
   */
  async readFromPrimary<T>(sql: string, params: unknown[]): Promise<T[]> {
    const result = await this.primary.query(sql, params);
    return result.rows as T[];
  }
}
```

## Advisory Locks

```typescript
/**
 * Advisory locks for application-level mutual exclusion.
 * Use when you need to prevent concurrent execution of a
 * critical section across multiple processes.
 */
export async function withAdvisoryLock<T>(
  pool: Pool,
  lockId: number,
  fn: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    // pg_try_advisory_lock returns immediately (non-blocking)
    const lockResult = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [lockId],
    );

    if (!lockResult.rows[0].acquired) {
      throw new ConflictError('Could not acquire lock — another process holds it');
    }

    const result = await fn();
    return result;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    client.release();
  }
}

// Usage: prevent concurrent migration runs
await withAdvisoryLock(pool, 1001, async () => {
  await runPendingMigrations();
});
```

## Transaction Isolation Levels

```typescript
/**
 * Isolation levels (from least to most strict):
 *
 * READ COMMITTED (PostgreSQL default):
 *   Each statement sees only committed data. Good for most workloads.
 *
 * REPEATABLE READ:
 *   The transaction sees a snapshot from its start. Use for reports
 *   or calculations that read the same data multiple times.
 *
 * SERIALIZABLE:
 *   Full isolation — transactions behave as if run sequentially.
 *   Highest safety, highest contention. Use for financial operations.
 */
export async function transferFunds(
  pool: Pool,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    const from = await client.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
      [fromAccountId],
    );
    if (from.rows[0].balance < amount) {
      throw new ValidationError('Insufficient funds');
    }

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromAccountId],
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Trade-offs

- **Migration safety vs speed:** Zero-downtime migrations require more steps but avoid service interruption.
- **Pool size:** Too small causes connection starvation under load. Too large wastes database memory and can degrade performance.
- **Read replicas:** Reduce primary load but introduce replication lag. Not every read can tolerate stale data.
- **Stronger isolation:** Prevents anomalies but increases transaction conflicts and retries.
- **Index count:** More indexes speed reads but slow writes and consume storage.

## Common Pitfalls

1. **Irreversible migrations** — Every migration must have a working `down()`. Test it before deploying.
2. **Missing indexes on foreign keys** — Unindexed foreign keys cause sequential scans on JOIN and DELETE operations.
3. **N+1 queries** — Loading a list and then querying each item individually. Use JOINs or batch queries.
4. **Long-running transactions** — Hold locks as briefly as possible. Move non-database work outside the transaction.
5. **No connection timeout** — Without statement and connection timeouts, a single slow query can exhaust the pool.
6. **Ignoring EXPLAIN output** — Query plans change as data grows. Review plans periodically, not just at development time.
