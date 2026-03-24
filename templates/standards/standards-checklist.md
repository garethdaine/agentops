# Engineering Standards — Quick-Reference Checklist

Use this checklist during Phase 6 spec-compliance review. One rule per line. Every item is checkable.

---

## SOLID

### Single Responsibility Principle
- [ ] No function exceeds 30 lines
- [ ] No class exceeds 200 lines
- [ ] Every file has exactly one primary export
- [ ] No function name contains "and" or "or" indicating dual responsibility

### Open/Closed Principle
- [ ] No `switch` or long `if/else if` chains on type — use Strategy/polymorphism
- [ ] Adding new behaviour does not require modifying existing classes
- [ ] Extension points use interfaces, not concrete base classes

### Liskov Substitution Principle
- [ ] Subclasses do not strengthen preconditions
- [ ] Subclasses do not weaken postconditions
- [ ] No subclass method throws `UnsupportedOperationException` / equivalent

### Interface Segregation Principle
- [ ] No interface has methods that implementors must stub or no-op
- [ ] Interfaces are small and focused on a single concern
- [ ] Multiple specific interfaces preferred over one fat interface

### Dependency Inversion Principle
- [ ] No `new ConcreteClass()` instantiation inside business logic
- [ ] All external dependencies injected via constructor
- [ ] Business logic depends on interfaces, not concrete implementations

---

## Clean Code

### Naming
- [ ] All function names are verb phrases
- [ ] All boolean variables/props use question form (`is`, `has`, `can`, `should`)
- [ ] No single-letter variable names outside trivial loops
- [ ] No unexplained abbreviations

### Functions
- [ ] Each function operates at a single level of abstraction
- [ ] No function has more than 3 parameters (or uses a parameter object)
- [ ] No boolean flag parameters
- [ ] Functions either do something OR return something (command-query separation)

### Error Handling
- [ ] No empty `catch` blocks
- [ ] All errors are typed (domain-specific error classes)
- [ ] Correlation IDs propagated in all log entries
- [ ] Input validated at system boundaries (HTTP handlers, CLI args, webhook payloads)

---

## DRY / KISS / YAGNI
- [ ] No logic duplicated in 2+ locations
- [ ] No speculative features or extension points not required by current scope
- [ ] No abstractions with fewer than 3 concrete uses
- [ ] No "Manager", "Helper", or "Util" classes without a clear bounded purpose

---

## Design Patterns
- [ ] Patterns applied only where the problem they solve exists
- [ ] No strategy pattern applied speculatively
- [ ] Factory/Builder used where construction complexity warrants it
- [ ] Adapter used when integrating third-party interfaces with mismatched contracts

---

## Action-Based Architecture
- [ ] Every user-initiated state change is an Action class
- [ ] Action classes have exactly one public method
- [ ] Action classes are fully injectable (no `new` inside)
- [ ] Actions do not contain repository SQL — they call repository interfaces

---

## Layered Architecture
- [ ] Controllers contain no business logic
- [ ] Application services / actions contain no SQL or ORM calls
- [ ] Domain objects do not import from infrastructure layer
- [ ] No layer is skipped (controller → service → domain → repository)
- [ ] No circular imports between layers

---

## Modular Structure
- [ ] Code is organised by feature/domain, not technical layer
- [ ] Each module has a barrel `index.ts` exporting its public API only
- [ ] Test files co-located with source files
- [ ] `shared/` contains only cross-cutting utilities, no domain logic
- [ ] No circular imports between modules

---

## Testing
- [ ] All test descriptions use "should {behaviour} when {condition}" form
- [ ] Every test follows Arrange-Act-Assert structure
- [ ] No tests pass before the implementation is written (TDD RED phase confirmed)
- [ ] No test uses `toBeDefined()` or `toBeTruthy()` as the only assertion
- [ ] All mocked dependencies are verified with `.toHaveBeenCalledWith(...)`
- [ ] No `it.skip` or `describe.skip` on critical paths

---

## Security (Critical — any violation is CRITICAL severity)
- [ ] No raw SQL string concatenation
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All API POST/PUT/PATCH handlers have input validation schemas (zod/joi/yup)
- [ ] Auth middleware applied to all routes handling user data
- [ ] No user-controlled values rendered in HTML without sanitisation
- [ ] No sensitive data in URL query parameters

---

## Performance
- [ ] No database calls inside loops (N+1 pattern)
- [ ] No `findMany()` / `SELECT *` without `limit`/`take`
- [ ] All list endpoints have pagination
- [ ] No synchronous file I/O in request handlers
