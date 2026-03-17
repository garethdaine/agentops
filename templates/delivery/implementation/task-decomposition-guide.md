# Delivery Template: Task Decomposition Guide

## Hierarchy

```
Epic (business capability)
  └── Story (user-facing value)
       └── Task (implementable unit of work)
            └── Sub-task (atomic step)
```

## Sizing Guide

| Size | Description | Typical Effort | Example |
|------|-------------|---------------|---------|
| XS | Trivial change, no unknowns | <2 hours | Fix typo, update config value |
| S | Well-understood, single file | 2-4 hours | Add validation to existing endpoint |
| M | Multiple files, some complexity | 1-2 days | New API endpoint with tests |
| L | Cross-cutting, moderate unknowns | 3-5 days | New service with adapter integration |
| XL | Significant scope, high unknowns | 1-2 weeks | New module or subsystem — break this down further |

**Rule: If a task is XL, it must be decomposed further.** No task should take more than 5 days.

## Decomposition Checklist

For each story, identify:

1. **Data model changes** — New tables, columns, migrations, indexes
2. **Backend logic** — Service functions, business rules, validation
3. **API layer** — Route handlers, middleware, request/response schemas
4. **Frontend** — Components, pages, state management, API calls
5. **Integration** — External API adapters, contracts, mocks
6. **Tests** — Unit, integration, contract, E2E for each component
7. **Documentation** — API docs, ADRs, README updates
8. **Infrastructure** — Environment variables, Docker changes, CI/CD updates

## Dependency Mapping

For each task, document:
- **Depends on:** [which tasks must complete first]
- **Blocks:** [which tasks are waiting on this]
- **Can parallelize with:** [tasks that can run simultaneously]

## Example Decomposition

**Story:** "As a user, I can view my procurement orders filtered by status"

| # | Task | Size | Dependencies |
|---|------|------|-------------|
| 1 | Add Order model to Prisma schema + migration | S | — |
| 2 | Create OrderRepository with tenant-scoped queries | M | 1 |
| 3 | Create OrderService with filtering logic | M | 2 |
| 4 | Create GET /api/v1/orders endpoint | M | 3 |
| 5 | Add input validation schema (zod) | S | 4 |
| 6 | Write unit tests for OrderService | M | 3 |
| 7 | Write integration tests for orders endpoint | M | 4 |
| 8 | Create OrderList frontend component | M | 4 |
| 9 | Add status filter UI with query params | S | 8 |
| 10 | Write component tests | S | 8, 9 |
