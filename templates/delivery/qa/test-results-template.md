# Delivery Template: Test Results Report

```markdown
# Test Results Report — [Project/Feature Name]

**Date:** [date]
**Tester:** [name]
**Environment:** [staging/production]
**Build:** [commit hash or version]

## Executive Summary

[2-3 sentences: overall result, key findings, recommendation to proceed or hold]

## Results Overview

| Metric | Value |
|--------|-------|
| Total test cases | [N] |
| Passed | [N] ([%]) |
| Failed | [N] ([%]) |
| Blocked | [N] ([%]) |
| Skipped | [N] ([%]) |

## Coverage

| Category | Statements | Branches | Functions | Lines |
|----------|-----------|----------|-----------|-------|
| Overall | [%] | [%] | [%] | [%] |
| Critical paths | [%] | [%] | [%] | [%] |

## Failed Test Cases

| ID | Description | Expected | Actual | Severity | Status |
|----|-------------|----------|--------|----------|--------|
| TC-NNN | [description] | [expected] | [actual] | Critical/High/Med | Open/Fixed |

## Defects Found

| ID | Title | Severity | Status | Assigned To |
|----|-------|----------|--------|-------------|
| DEF-001 | [title] | Critical/High/Med/Low | Open/Fixed/Deferred | [name] |

## Performance Results

| Endpoint | p50 | p95 | p99 | Target | Status |
|----------|-----|-----|-----|--------|--------|
| GET /api/orders | [ms] | [ms] | [ms] | <200ms | Pass/Fail |

## Recommendation

- [ ] **GO** — All critical tests pass, no unresolved critical defects
- [ ] **CONDITIONAL GO** — Minor issues to address post-deployment
- [ ] **NO GO** — Critical issues must be resolved before deployment
```
