# Architecture Pattern: Event-Driven Architecture

## When to Use

- Decoupling producers from consumers so they can evolve independently
- Processing that can tolerate eventual consistency (order fulfilment, notifications, analytics)
- Fan-out scenarios where one action triggers multiple downstream reactions
- Replacing synchronous chains that create fragile coupling between services

## Pattern Description

Event-driven architecture uses events as the primary communication mechanism between components. A producer emits an event describing something that happened. One or more consumers react to that event independently. The producer does not know (or care) who consumes the event or what they do with it.

## Event Schema Design (CloudEvents)

Use a standardised envelope to ensure interoperability across services:

```typescript
/**
 * CloudEvents-compliant event envelope.
 * See https://cloudevents.io for the full specification.
 */
export interface DomainEvent<T = unknown> {
  /** Unique event identifier */
  id: string;
  /** Reverse-DNS event type, e.g. 'com.acme.order.created' */
  type: string;
  /** Event origin, e.g. 'orders-service' */
  source: string;
  /** CloudEvents spec version */
  specversion: '1.0';
  /** ISO 8601 timestamp */
  time: string;
  /** Content type of the data payload */
  datacontenttype: 'application/json';
  /** The event payload */
  data: T;
  /** Optional: subject the event relates to */
  subject?: string;
}

// Factory function for consistent event creation
export function createEvent<T>(
  type: string,
  source: string,
  data: T,
  subject?: string,
): DomainEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    source,
    specversion: '1.0',
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data,
    subject,
  };
}
```

## Event Bus Abstraction

```typescript
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

/**
 * In-memory implementation for development and testing.
 * Swap for SQS/EventBridge/Redis Streams in production.
 */
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();

  async publish(event: DomainEvent): Promise<void> {
    const subscribers = this.handlers.get(event.type) ?? [];
    await Promise.allSettled(subscribers.map((h) => h(event)));
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }
}
```

## Idempotency

Consumers must handle receiving the same event more than once. At-least-once delivery is the norm for most message systems.

```typescript
export class IdempotentHandler<T> {
  constructor(
    private store: IdempotencyStore,
    private handler: EventHandler<T>,
  ) {}

  async handle(event: DomainEvent<T>): Promise<void> {
    const alreadyProcessed = await this.store.exists(event.id);
    if (alreadyProcessed) {
      logger.info('Skipping duplicate event', { eventId: event.id });
      return;
    }

    await this.handler(event);
    await this.store.markProcessed(event.id, { ttlSeconds: 86400 * 7 });
  }
}

export interface IdempotencyStore {
  exists(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, options?: { ttlSeconds: number }): Promise<void>;
}

// Redis-backed implementation
export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private redis: RedisClient) {}

  async exists(eventId: string): Promise<boolean> {
    const result = await this.redis.get(`idempotency:${eventId}`);
    return result !== null;
  }

  async markProcessed(eventId: string, options?: { ttlSeconds: number }): Promise<void> {
    await this.redis.set(`idempotency:${eventId}`, '1', { EX: options?.ttlSeconds ?? 604800 });
  }
}
```

## Dead Letter Queue Handling

When a consumer fails repeatedly, move the event to a dead letter queue for manual inspection:

```typescript
export class RetryableConsumer<T> {
  constructor(
    private handler: EventHandler<T>,
    private dlq: DeadLetterQueue,
    private maxRetries: number = 3,
  ) {}

  async process(event: DomainEvent<T>, attemptCount: number): Promise<void> {
    try {
      await this.handler(event);
    } catch (error) {
      if (attemptCount >= this.maxRetries) {
        logger.error('Max retries exceeded, sending to DLQ', {
          eventId: event.id,
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
        await this.dlq.send(event, {
          error: error instanceof Error ? error.message : String(error),
          attempts: attemptCount,
          failedAt: new Date().toISOString(),
        });
        return;
      }
      throw error; // Let the queue infrastructure retry
    }
  }
}

export interface DeadLetterQueue {
  send(event: DomainEvent, metadata: Record<string, unknown>): Promise<void>;
}
```

## Event Ordering Guarantees

Most message systems guarantee ordering only within a partition or message group:

```typescript
/**
 * Use a consistent partition key so events for the same entity
 * are processed in order.
 *
 * SQS FIFO: MessageGroupId
 * Kafka: partition key
 * Redis Streams: stream key
 */
export function publishOrderEvent(event: DomainEvent<OrderData>): Promise<void> {
  return queue.send({
    body: JSON.stringify(event),
    // All events for the same order go to the same partition
    messageGroupId: event.data.orderId,
    // Deduplication ID for exactly-once in FIFO queues
    messageDeduplicationId: event.id,
  });
}
```

## Saga / Choreography Pattern

Coordinate multi-step workflows through event chains rather than a central orchestrator:

```typescript
/**
 * Example: Order fulfilment saga via choreography
 *
 * 1. OrderService emits 'order.placed'
 * 2. PaymentService listens, charges card, emits 'payment.captured'
 * 3. InventoryService listens, reserves stock, emits 'inventory.reserved'
 * 4. ShippingService listens, creates shipment, emits 'shipment.created'
 *
 * Compensating actions if any step fails:
 * - 'payment.failed'  -> OrderService cancels the order
 * - 'inventory.insufficient' -> PaymentService refunds, OrderService cancels
 */

// Payment service consumer
eventBus.subscribe('order.placed', async (event: DomainEvent<OrderPlaced>) => {
  try {
    const payment = await paymentService.charge(event.data.paymentMethodId, event.data.total);
    await eventBus.publish(createEvent('payment.captured', 'payment-service', {
      orderId: event.data.orderId,
      paymentId: payment.id,
    }));
  } catch (error) {
    await eventBus.publish(createEvent('payment.failed', 'payment-service', {
      orderId: event.data.orderId,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
});

// Order service listens for compensation
eventBus.subscribe('payment.failed', async (event: DomainEvent<PaymentFailed>) => {
  await orderService.cancel(event.data.orderId, event.data.reason);
});
```

## Trade-offs

- **Eventual consistency:** Consumers process events asynchronously. The system is not immediately consistent after a write.
- **Debugging difficulty:** Tracing a request across event chains requires correlation IDs and distributed tracing.
- **Ordering complexity:** Global ordering is expensive. Design for partition-level ordering or tolerate out-of-order delivery.
- **Schema evolution:** Changing event shapes requires versioning and backward-compatible consumers.
- **Operational overhead:** Dead letter queues, retry policies, and monitoring infrastructure must be maintained.

## Common Pitfalls

1. **Fat events with too much data** — Include only what consumers need. Large payloads increase coupling and bandwidth costs.
2. **Missing idempotency** — At-least-once delivery means duplicates will happen. Every consumer must handle them.
3. **Synchronous event processing disguised as async** — Publishing an event and then polling for the result defeats the purpose.
4. **No dead letter queue** — Failed events that disappear silently cause data loss.
5. **Tight schema coupling** — Consumers that break when a new field is added to an event are too tightly coupled. Use tolerant readers.
6. **Ignoring backpressure** — A fast producer can overwhelm a slow consumer. Use queue depth monitoring and rate limiting.
