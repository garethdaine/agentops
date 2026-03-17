# Mock Integration Framework: Adapter Pattern

## Overview

This template provides a complete adapter pattern for integrating with external enterprise systems. It includes an interface, mock implementation, real implementation, factory, and contract tests.

## File Structure

```
src/adapters/
  procurement/
    types.ts                 # Domain types (NOT external API types)
    procurement-adapter.ts   # Interface definition
    mock-adapter.ts          # Mock implementation (dev/test)
    http-adapter.ts          # Real HTTP implementation
    adapter-factory.ts       # Factory that selects implementation
    __tests__/
      contract.test.ts       # Contract tests (verify mock == real behaviour)
```

## Step 1: Domain Types (`types.ts`)

Define your domain types independently of external API schemas:

```typescript
export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';

export interface OrderItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  items: Omit<OrderItem, 'id'>[];
  currency?: string;
  metadata?: Record<string, string>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
```

## Step 2: Interface (`procurement-adapter.ts`)

```typescript
import type { Order, OrderStatus, CreateOrderInput, PaginatedResult } from './types';

export interface ProcurementAdapter {
  getOrders(tenantId: string, options?: { status?: OrderStatus; limit?: number; offset?: number }): Promise<PaginatedResult<Order>>;
  getOrderById(tenantId: string, orderId: string): Promise<Order | null>;
  createOrder(tenantId: string, input: CreateOrderInput): Promise<Order>;
  updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<Order>;
  deleteOrder(tenantId: string, orderId: string): Promise<void>;
}
```

## Step 3: Mock Implementation (`mock-adapter.ts`)

```typescript
import { randomUUID } from 'node:crypto';
import type { ProcurementAdapter } from './procurement-adapter';
import type { Order, OrderStatus, CreateOrderInput, PaginatedResult } from './types';

export class MockProcurementAdapter implements ProcurementAdapter {
  private store = new Map<string, Order>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    // Pre-populate with realistic demo data
    const demoOrders: Order[] = [
      {
        id: randomUUID(), tenantId: 'acme-corp', orderNumber: 'PO-2026-001',
        status: 'approved', currency: 'USD', totalAmount: 45_000,
        items: [{ id: randomUUID(), sku: 'SRV-ENT-100', description: 'Enterprise Server License', quantity: 10, unitPrice: 4_500 }],
        createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-10'),
      },
      // ... more seed data
    ];
    demoOrders.forEach((o) => this.store.set(o.id, o));
  }

  async getOrders(tenantId: string, options?: { status?: OrderStatus; limit?: number; offset?: number }): Promise<PaginatedResult<Order>> {
    let orders = [...this.store.values()].filter((o) => o.tenantId === tenantId);
    if (options?.status) orders = orders.filter((o) => o.status === options.status);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;
    return { data: orders.slice(offset, offset + limit), total: orders.length, limit, offset };
  }

  async getOrderById(tenantId: string, orderId: string): Promise<Order | null> {
    const order = this.store.get(orderId);
    if (!order || order.tenantId !== tenantId) return null;
    return order;
  }

  async createOrder(tenantId: string, input: CreateOrderInput): Promise<Order> {
    const order: Order = {
      id: randomUUID(), tenantId, orderNumber: `PO-${Date.now()}`,
      status: 'draft', currency: input.currency ?? 'USD',
      totalAmount: input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      items: input.items.map((i) => ({ ...i, id: randomUUID() })),
      createdAt: new Date(), updatedAt: new Date(),
    };
    this.store.set(order.id, order);
    return order;
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.getOrderById(tenantId, orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.status = status;
    order.updatedAt = new Date();
    return order;
  }

  async deleteOrder(tenantId: string, orderId: string): Promise<void> {
    const order = this.store.get(orderId);
    if (order?.tenantId === tenantId) this.store.delete(orderId);
  }
}
```

## Step 4: Factory (`adapter-factory.ts`)

```typescript
import type { ProcurementAdapter } from './procurement-adapter';
import { MockProcurementAdapter } from './mock-adapter';
// import { HttpProcurementAdapter } from './http-adapter';

export function createProcurementAdapter(): ProcurementAdapter {
  const useMock = process.env.USE_MOCK_ADAPTERS === 'true' || process.env.NODE_ENV === 'test';
  if (useMock) {
    return new MockProcurementAdapter();
  }
  // return new HttpProcurementAdapter(env.PROCUREMENT_API_URL, env.PROCUREMENT_API_KEY);
  throw new Error('Real procurement adapter not configured. Set USE_MOCK_ADAPTERS=true for development.');
}
```
