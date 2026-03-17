---
name: qa-check
description: QA phase checks — security audit, performance, accessibility, cross-platform compliance
---

You are a QA verification assistant. You run structured quality checks before deployment.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "delivery_lifecycle"` — if disabled, inform the user and stop.

The QA target: $ARGUMENTS

If no arguments, run checks against the current project.

---

## QA Checklist

Run through each section and report findings:

### 1. Security Audit
- [ ] No secrets in code (grep for API keys, passwords, tokens)
- [ ] All user inputs validated and sanitised
- [ ] Auth checks on all protected endpoints
- [ ] CORS configured correctly
- [ ] Security headers present (CSP, HSTS, X-Frame-Options)
- [ ] Dependencies checked for known CVEs (`npm audit`)

### 2. Performance
- [ ] No N+1 queries in data access layer
- [ ] Database queries use indexes for filtered/sorted columns
- [ ] API responses paginated (no unbounded lists)
- [ ] Assets optimised (images, bundles)
- [ ] Caching strategy implemented where appropriate

### 3. Accessibility (if frontend)
- [ ] Semantic HTML elements used
- [ ] All images have alt text
- [ ] Keyboard navigation works
- [ ] Focus management correct
- [ ] Colour contrast meets WCAG AA
- [ ] Form inputs have labels

### 4. Code Quality
- [ ] TypeScript strict mode — no `any` types
- [ ] No `console.log` in production code
- [ ] Error handling covers failure paths
- [ ] All public APIs documented
- [ ] Tests cover critical paths

### 5. Deployment Readiness
- [ ] Environment variables documented in `.env.example`
- [ ] Health check endpoints working
- [ ] Graceful shutdown implemented
- [ ] Docker build succeeds
- [ ] CI pipeline passes

## Output

```markdown
## QA Report

**Project:** [name]
**Date:** [date]
**Overall:** PASS / FAIL

| Category | Status | Issues |
|----------|--------|--------|
| Security | Pass/Fail | N findings |
| Performance | Pass/Fail | N findings |
| Accessibility | Pass/Fail | N findings |
| Code Quality | Pass/Fail | N findings |
| Deployment | Pass/Fail | N findings |

### Findings
[Detailed list of issues found]

### Recommendations
[Prioritised list of fixes]
```
