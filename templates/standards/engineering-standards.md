# Engineering Standards

This document is injected into every execution subagent during a build. All code produced MUST comply with these standards. Deviations are flagged by the spec-compliance reviewer in Phase 6.

---

## SOLID Principles

### Single Responsibility Principle (SRP)

Every class, module, and function should have exactly one reason to change.

**Heuristics:**
- Functions: ≤30 lines. If you exceed this, split into smaller named functions.
- Classes: ≤200 lines. If you exceed this, extract a collaborator.
- Files: one primary export per file. Do not combine unrelated classes or functions in a single file.
- If you find yourself saying "and" when describing what a function does, it has two responsibilities.

```typescript
// BAD: Two responsibilities — fetching AND formatting
async function getUserReport(userId: string): Promise<string> {
  const user = await db.users.findById(userId);
  const orders = await db.orders.findByUser(userId);
  return `${user.name}: ${orders.length} orders, total: ${orders.reduce(...)}`;
}

// GOOD: Separate concerns
async function getUserWithOrders(userId: string): Promise<UserWithOrders> {
  const user = await userRepository.findById(userId);
  const orders = await orderRepository.findByUserId(userId);
  return { user, orders };
}

function formatUserReport(data: UserWithOrders): string {
  return `${data.user.name}: ${data.orders.length} orders, total: ${calculateTotal(data.orders)}`;
}
```

### Open/Closed Principle (OCP)

Code should be open for extension, closed for modification.

**Heuristics:**
- Use the Strategy pattern or dependency injection instead of `switch` chains on type.
- Adding new behaviour means adding a new class/function — not modifying existing ones.
- When you find yourself adding `else if` to an existing block, consider whether a new strategy/handler is the right move.

```typescript
// BAD: Every new payment type requires modifying this function
function processPayment(type: string, amount: number) {
  if (type === 'stripe') { ... }
  else if (type === 'paypal') { ... }
  else if (type === 'crypto') { ... } // New type = modify existing code
}

// GOOD: New payment type = new class, zero changes to existing code
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor { ... }
class PayPalProcessor implements PaymentProcessor { ... }
class CryptoProcessor implements PaymentProcessor { ... }

function processPayment(processor: PaymentProcessor, amount: number) {
  return processor.process(amount);
}
```

### Liskov Substitution Principle (LSP)

Subtypes must be substitutable for their base types without altering program correctness.

**Heuristics:**
- Do NOT strengthen preconditions in a subclass (e.g., adding null checks the base doesn't require).
- Do NOT weaken postconditions (e.g., returning a narrower type or throwing where the base doesn't).
- If a subclass overrides a method and throws `UnsupportedOperationException`, it violates LSP — extract a separate interface instead.
- Test by asking: "If I swap this subtype for its base type, do all existing tests still pass?"

### Interface Segregation Principle (ISP)

Clients should not be forced to depend on interfaces they do not use.

**Heuristics:**
- Small, focused interfaces over one fat interface.
- Multiple specific interfaces are better than one generic interface with optional methods.
- If a class implementing an interface must provide a stub/no-op for any method, split the interface.

```typescript
// BAD: Everything in one interface
interface Repository<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<T[]>;  // Not all repos need this
  exportToCsv(): string;                // Definitely not all repos
}

// GOOD: Segregated interfaces composed as needed
interface Readable<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
}
interface Writable<T> {
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
interface Searchable<T> {
  search(query: string): Promise<T[]>;
}
```

### Dependency Inversion Principle (DIP)

High-level modules should not depend on low-level modules. Both should depend on abstractions.

**Heuristics:**
- Use constructor injection. Do NOT instantiate concrete dependencies inside a class.
- No `new ConcreteClass()` in business logic — dependencies are injected.
- Depend on interfaces/abstract types, not concrete implementations.
- Repositories, services, and external clients are always injected.

```typescript
// BAD: Hard-coupled to Stripe
class OrderService {
  private stripe = new StripeClient(process.env.STRIPE_KEY); // Concrete dep, untestable
}

// GOOD: Depends on abstraction, injected
class OrderService {
  constructor(private readonly paymentProcessor: PaymentProcessor) {}
}
```

---

## Clean Code

### Naming

- **Reveal intent.** Names should explain WHY, not HOW.
- **Functions:** verb phrases (`calculateTotal`, `sendWelcomeEmail`, `validateUserInput`)
- **Booleans:** question form (`isActive`, `hasPermission`, `canAccessResource`, `shouldRetry`)
- **Classes:** noun phrases, no "Manager", "Handler", "Processor" suffixes unless genuinely appropriate (`UserRepository`, not `UserManager`)
- **Constants:** SCREAMING_SNAKE_CASE for module-level constants (`MAX_RETRY_ATTEMPTS`)
- Avoid single-letter variables outside of math-heavy code or trivially-scoped loops.
- Avoid abbreviations unless universally understood (`url`, `id`, `db` are fine; `usrMgr` is not).

### Functions

- **One abstraction level per function.** A function should either orchestrate OR compute, not both.
- **Command-query separation:** Functions either DO something (commands) or RETURN something (queries) — not both. Functions that both mutate state and return a value are confusing.
- **Stepdown rule:** Functions call only functions one level below them in abstraction.
- **Max 3 parameters.** More than 3: introduce a parameter object.
- **No flag parameters.** A boolean argument is a sign the function should be split in two.

```typescript
// BAD: Does and returns, flag parameter, mixed abstraction
async function processUser(userId: string, sendEmail: boolean): Promise<User> {
  const raw = await db.query(`SELECT * FROM users WHERE id = ?`, [userId]);
  const user = { id: raw.id, name: raw.name, email: raw.email };
  await db.query(`UPDATE users SET last_seen = NOW() WHERE id = ?`, [userId]);
  if (sendEmail) await mailer.send(user.email, 'Welcome back');
  return user;
}

// GOOD: Single responsibility, no flag parameter
async function findUser(userId: string): Promise<User> {
  return userRepository.findById(userId);
}

async function recordUserLogin(userId: string): Promise<void> {
  await userRepository.updateLastSeen(userId, new Date());
}

async function sendLoginEmail(user: User): Promise<void> {
  await emailService.send(user.email, 'Welcome back');
}
```

### Error Handling

- **Typed error hierarchy.** Define domain-specific error classes. Never throw raw `Error` with a string message from business logic.
- **Never swallow errors.** Empty `catch` blocks are forbidden. Log at minimum.
- **Correlation IDs.** Every request should have a correlation ID propagated through all log entries and error objects.
- **Fail fast at boundaries.** Validate all external input at the point of entry. Do not let invalid data propagate into the domain.

```typescript
// BAD
try {
  await processOrder(order);
} catch (e) {} // Swallowed

// GOOD
class OrderProcessingError extends AppError {
  constructor(message: string, public readonly orderId: string, cause?: Error) {
    super(message, 'ORDER_PROCESSING_FAILED', { orderId }, cause);
  }
}

try {
  await processOrder(order);
} catch (error) {
  logger.error('Order processing failed', { orderId: order.id, correlationId, error });
  throw new OrderProcessingError('Failed to process order', order.id, error as Error);
}
```

---

## DRY — Don't Repeat Yourself

- **2+ locations = extract.** If the same logic appears in two places, extract it. Three is a certainty.
- **Knowledge duplication = single source of truth.** The same business rule should live in exactly one place. If you update it, you should only need to update it in one file.
- **DRY applies to knowledge, not syntax.** Two `for` loops that happen to look similar are not a DRY violation if they represent different concepts.

---

## KISS / YAGNI

- **Simplest correct solution first.** Before adding abstraction, ask: does the simpler version solve the problem?
- **YAGNI (You Aren't Gonna Need It).** Do not implement features or abstractions "in case we need them later." Implement what is required now.
- **No speculative generality.** Hooks, extension points, and plugin systems not required by current features must not be added.
- **Three similar lines are better than a premature abstraction.** Only extract when the pattern is stable and has 3+ concrete uses.

---

## Design Patterns

Apply patterns when NOT applying them creates a named problem. Do not apply patterns speculatively.

Reference: [refactoring.guru](https://refactoring.guru/design-patterns)

### Creational

| Pattern | Use when |
|---------|----------|
| **Factory Method** | Object creation logic is complex or varies by subtype; callers shouldn't know the concrete class |
| **Builder** | Object requires many optional parameters or a multi-step construction process |
| **Singleton** | Prefer Dependency Injection. Use Singleton only for stateless utilities (loggers, config readers) where a single instance is provably correct |

### Structural

| Pattern | Use when |
|---------|----------|
| **Adapter** | Integrating a third-party library whose interface doesn't match your domain's needs |
| **Decorator** | Adding cross-cutting behaviour (logging, caching, validation) to an existing object without subclassing |
| **Facade** | Simplifying a complex subsystem behind a clean, high-level interface for callers |
| **Proxy** | Controlling access to a resource — lazy loading, access control, logging |

### Behavioral

| Pattern | Use when |
|---------|----------|
| **Strategy** | Interchangeable algorithms or behaviours; replaces switch chains on type |
| **Observer** | One-to-many event propagation; decouples producers from consumers |
| **Command** | Encapsulating a request as an object — enables undo, queuing, logging |
| **Template Method** | Invariant algorithm structure with variable steps; base class defines the skeleton |
| **Chain of Responsibility** | A request passes through a chain of handlers; each decides to handle or pass on |

**Selection heuristic:** Before applying a pattern, name the problem it solves. If you can't name the problem, you don't need the pattern.

---

## Action-Based Architecture

For business logic: use single-purpose action classes.

- **One public method** (`execute` or `handle`).
- **One responsibility** — the class name describes exactly what it does.
- **Fully injectable** — all dependencies injected via constructor.
- **No side effects beyond the stated purpose.**

```typescript
// GOOD: Action class
class CreateOrderAction {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    await this.inventoryService.reserve(input.items);
    const order = Order.create(input);
    await this.orderRepository.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order));
    return order;
  }
}
```

Use action classes for:
- Every user-initiated state change (create, update, delete, transition)
- Complex business operations with multiple steps
- Operations that publish domain events

---

## Domain-Driven Design (DDD)

Apply DDD where domain complexity warrants it. For simple CRUD, DDD adds unnecessary ceremony.

| Concept | Rule |
|---------|------|
| **Aggregate** | Cluster of related objects with a single entry point (Aggregate Root). Only the root is referenced from outside. Enforce invariants at the aggregate root. |
| **Entity** | Has identity (`id`). Two entities are equal if their IDs match, regardless of other field values. |
| **Value Object** | No identity. Immutable. Two value objects are equal if all their fields match. |
| **Domain Service** | Stateless logic that doesn't naturally belong to any entity or value object. |
| **Application Service / Action** | Orchestrates use cases. Has no domain logic itself — calls domain objects and infrastructure. |
| **Repository** | Interface defined in the domain layer. Implementation in the infrastructure layer. |
| **Ubiquitous Language** | Use the business's language in code. Class names, method names, and variable names should match how domain experts talk about the problem. |

---

## Layered Architecture

**Layer order (no skipping):**

```
Controller (HTTP/GraphQL/CLI)
  └── Application Service / Action
        └── Domain (Entities, Aggregates, Domain Services)
              └── Repository Interface
                    └── Repository Implementation (Infrastructure)
                          └── Database / External Services
```

- A controller must not contain business logic — it delegates to an application service or action.
- An application service must not contain SQL or ORM calls — it uses repository interfaces.
- Domain objects must not depend on infrastructure (no `import prisma from '...'` in domain code).
- Violation of layering is a CRITICAL finding in code review.

---

## Modular Structure

- **Feature-based modules.** Group by business capability, not technical layer.
- **Co-located tests.** Test files live next to the code they test (`foo.service.ts` → `foo.service.test.ts`).
- **Barrel exports.** Each module exposes a deliberate public API via `index.ts`. Internal implementation details are not exported.
- **Shared kernel.** Cross-cutting concerns (errors, logging, HTTP utilities, config) live in `shared/` or `lib/`. This directory must NOT contain domain logic.
- **No circular dependencies.** Module A may not import from Module B if Module B imports from Module A.

---

## Testing Standards

- **Tests document behaviour, not implementation.** Test descriptions use the form: "should {do something} when {condition}".
- **Arrange-Act-Assert.** Structure every test with a clear setup, a single action, and explicit assertions.
- **One assertion concept per test.** Multiple `expect` calls are fine if they all verify the same behaviour.
- **No magic numbers in assertions.** Use named constants or setup variables.
- **Test the contract, not the internals.** Do not test private methods directly.
- **Red first.** In TDD, the test MUST fail before implementation. A test that passes without implementation is a broken test.
