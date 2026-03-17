# Delivery Template: Test Plan

```markdown
# Test Plan — [Project/Feature Name]

**Version:** [1.0]
**Prepared by:** [name]
**Date:** [date]
**Status:** Draft / Approved / In Execution / Complete

## 1. Scope

### In Scope
- [Feature/component to test]
- [Feature/component to test]

### Out of Scope
- [What is NOT being tested and why]

## 2. Test Strategy

| Test Type | Scope | Framework | Responsibility |
|-----------|-------|-----------|---------------|
| Unit | Business logic, utilities | Vitest/Jest | Developer |
| Integration | API endpoints, database | Supertest | Developer |
| Component | UI components | Testing Library | Frontend dev |
| Contract | External API adapters | Pact/manual | Backend dev |
| E2E | Critical user flows | Playwright | QA |
| Performance | API response times | k6/Artillery | DevOps |
| Security | OWASP Top 10 | /agentops:review | Developer |

## 3. Test Environment

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| Local | localhost:3000 | SQLite/Docker | Development |
| CI | — | Docker | Automated pipeline |
| Staging | staging.example.com | Staging DB | Pre-production validation |
| Production | app.example.com | Production DB | Smoke tests only |

## 4. Entry Criteria
- [ ] Code complete and merged to feature branch
- [ ] Unit tests passing in CI
- [ ] Test environment provisioned and accessible
- [ ] Test data seeded

## 5. Exit Criteria
- [ ] All critical and high test cases passing
- [ ] No unresolved critical or high defects
- [ ] Test coverage meets target (statements >80%)
- [ ] Performance benchmarks within acceptable thresholds
- [ ] Security review completed with no critical findings

## 6. Test Cases

| ID | Category | Description | Priority | Status |
|----|----------|-------------|----------|--------|
| TC-001 | Functional | [test description] | Critical | Pass/Fail/Blocked |
| TC-002 | Security | [test description] | High | Pass/Fail/Blocked |

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Incomplete test data | Medium | High | Seed scripts verified before testing |
| Environment instability | Low | High | Fallback to local testing |

## 8. Schedule

| Phase | Start | End | Owner |
|-------|-------|-----|-------|
| Unit/Integration | [date] | [date] | Dev team |
| E2E | [date] | [date] | QA |
| Performance | [date] | [date] | DevOps |
| UAT | [date] | [date] | Client |
```
