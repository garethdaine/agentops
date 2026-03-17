# Architecture Pattern: Integration Patterns

## Adapter Pattern

The primary pattern for integrating with external systems. Protects your domain from external API changes.

### Interface Definition

```typescript
/**
 * Define a typed interface for every external system integration.
 * This is the contract your domain depends on — NOT the external API shape.
 */
export interface ProcurementAdapter {
  getOrders(tenantId: string, filters?: OrderFilters): Promise<PaginatedResult<Order>>;
  getOrderById(tenantId: string, orderId: string): Promise<Order | null>;
  createOrder(tenantId: string, data: CreateOrderInput): Promise<Order>;
  updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<Order>;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}
```

### Mock Implementation

```typescript
/**
 * Mock adapter for development and testing.
 * Returns realistic data without hitting external APIs.
 */
export class MockProcurementAdapter implements ProcurementAdapter {
  private orders: Map<string, Order[]> = new Map();

  async getOrders(tenantId: string, filters?: OrderFilters): Promise<PaginatedResult<Order>> {
    const tenantOrders = this.orders.get(tenantId) ?? this.seedData(tenantId);
    // Apply filters, pagination...
    return { data: tenantOrders, total: tenantOrders.length, limit: 20, offset: 0 };
  }

  // ... implement all interface methods with in-memory data
}
```

### Real Implementation

```typescript
/**
 * Real adapter calling the external procurement API.
 * Handles auth, retries, error mapping, and response transformation.
 */
export class HttpProcurementAdapter implements ProcurementAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private httpClient: HttpClient,
  ) {}

  async getOrders(tenantId: string, filters?: OrderFilters): Promise<PaginatedResult<Order>> {
    const response = await this.httpClient.get(`${this.baseUrl}/orders`, {
      headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${this.apiKey}` },
      params: this.mapFilters(filters),
    });
    return this.mapResponse(response.data);
  }

  /** Map external API response to domain model */
  private mapResponse(external: ExternalOrderResponse): PaginatedResult<Order> {
    return {
      data: external.items.map(this.mapOrder),
      total: external.totalCount,
      limit: external.pageSize,
      offset: external.page * external.pageSize,
    };
  }
}
```

### Factory / DI Registration

```typescript
export function createProcurementAdapter(): ProcurementAdapter {
  if (env.NODE_ENV === 'test' || env.USE_MOCK_ADAPTERS === 'true') {
    return new MockProcurementAdapter();
  }
  return new HttpProcurementAdapter(env.PROCUREMENT_API_URL, env.PROCUREMENT_API_KEY, httpClient);
}
```

## Anti-Corruption Layer

Prevent external API models from leaking into your domain:
- Define your own domain types (never use external response types directly)
- Map at the adapter boundary
- Validate external responses before mapping
- Handle missing/unexpected fields gracefully

## Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeoutMs: number = 30_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure!.getTime() > this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new AppError('Service unavailable (circuit open)', { statusCode: 503 });
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Retry Policy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; backoffMs: number; retryableErrors?: string[] },
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === options.maxRetries) throw error;
      const isRetryable = error instanceof AppError && error.statusCode >= 500;
      if (!isRetryable) throw error;
      await sleep(options.backoffMs * Math.pow(2, attempt));
    }
  }
  throw new Error('Unreachable');
}
```

## Contract Testing

```typescript
/**
 * Contract tests verify that both mock and real adapters behave identically.
 * Run against mock in CI, against real in integration environment.
 */
describe('ProcurementAdapter contract', () => {
  const adapters = [
    ['mock', new MockProcurementAdapter()],
    // ['real', new HttpProcurementAdapter(...)],  // Enable in integration env
  ] as const;

  adapters.forEach(([name, adapter]) => {
    describe(name, () => {
      it('should return paginated orders for a tenant', async () => {
        const result = await adapter.getOrders('tenant-1');
        expect(result.data).toBeInstanceOf(Array);
        expect(result.total).toBeGreaterThanOrEqual(0);
      });

      it('should return null for non-existent order', async () => {
        const result = await adapter.getOrderById('tenant-1', 'non-existent');
        expect(result).toBeNull();
      });
    });
  });
});
```
