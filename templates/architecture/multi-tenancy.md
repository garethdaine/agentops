# Architecture Pattern: Multi-Tenancy

## Tenant Context Propagation

Every request must carry tenant context. Extract once at the edge, propagate through the entire request lifecycle.

### Middleware

```typescript
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    throw new AuthenticationError('Tenant ID required');
  }
  // Validate tenant exists and is active
  req.tenantId = tenantId;
  next();
}
```

### AsyncLocalStorage for Deep Propagation

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContext {
  tenantId: string;
  userId?: string;
  permissions?: string[];
}

export const tenantStore = new AsyncLocalStorage<TenantContext>();

export function getCurrentTenant(): TenantContext {
  const ctx = tenantStore.getStore();
  if (!ctx) throw new Error('No tenant context — ensure tenantMiddleware is applied');
  return ctx;
}
```

## Database Isolation Strategies

### Row-Level Security (Recommended)

```sql
-- Every table has a tenant_id column
ALTER TABLE orders ADD COLUMN tenant_id TEXT NOT NULL;
CREATE INDEX idx_orders_tenant ON orders(tenant_id);

-- Prisma: always filter by tenant
const orders = await prisma.order.findMany({
  where: { tenantId: getCurrentTenant().tenantId, ...filters },
});
```

### Query Scoping Pattern

```typescript
/** Base repository that automatically scopes all queries by tenant */
export class TenantScopedRepository<T> {
  constructor(private model: PrismaModel<T>) {}

  async findMany(where: Partial<T>): Promise<T[]> {
    const { tenantId } = getCurrentTenant();
    return this.model.findMany({ where: { ...where, tenantId } });
  }

  async create(data: Omit<T, 'tenantId'>): Promise<T> {
    const { tenantId } = getCurrentTenant();
    return this.model.create({ data: { ...data, tenantId } });
  }
}
```

## Data Leakage Prevention

1. **Never trust client-provided tenant IDs for data access** — always derive from auth token
2. **Audit cross-tenant queries** — log and alert on any query that doesn't include tenant scoping
3. **Test isolation** — write tests that verify tenant A cannot see tenant B's data
4. **API response validation** — verify responses only contain data for the requesting tenant

## Tenant-Aware Caching

```typescript
function cacheKey(key: string): string {
  const { tenantId } = getCurrentTenant();
  return `tenant:${tenantId}:${key}`;
}
```

## Testing Multi-Tenancy

```typescript
describe('tenant isolation', () => {
  it('should not return orders from other tenants', async () => {
    await createOrder({ tenantId: 'tenant-a', item: 'Widget A' });
    await createOrder({ tenantId: 'tenant-b', item: 'Widget B' });

    const result = await getOrders('tenant-a');
    expect(result.every((o) => o.tenantId === 'tenant-a')).toBe(true);
    expect(result.some((o) => o.item === 'Widget B')).toBe(false);
  });
});
```
