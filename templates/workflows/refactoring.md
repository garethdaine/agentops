# Workflow Template: Safe Refactoring

## Context Gathering

1. **Current state**
   - What code needs refactoring?
   - What is wrong with the current implementation?
   - What patterns is it using vs what patterns should it use?

2. **Target state**
   - What should the code look like after refactoring?
   - What patterns should be applied?
   - What quality attributes should improve? (readability, performance, maintainability)

3. **Constraints**
   - What can't change? (public APIs, database schema, external contracts)
   - What is the risk tolerance?
   - Is there test coverage for the affected code?

## Analysis Steps

### Step 1: Assess Current State
- Read all code to be refactored
- Map dependencies (what depends on this code?)
- Check test coverage (are there tests for this?)
- Identify the public interface (what must not change?)

### Step 2: Define Target State
- Describe the desired end state
- Identify which patterns to apply
- Define what "done" looks like
- Estimate the size of change

### Step 3: Plan Incremental Steps
Break the refactor into small, safe increments. Each increment must:
- Be independently deployable
- Not break existing tests
- Have a clear rollback path

### Step 4: Execute Incrementally
For each step:
1. Make the change
2. Run tests — they must pass
3. Verify no regressions
4. Commit (if appropriate)

### Step 5: Verify
- All existing tests pass
- New tests added for new patterns
- Public API unchanged (or migration documented)
- Performance not degraded

## Output Format

```
## Refactoring Summary

### Before
[Description of the original state]

### After
[Description of the refactored state]

### Changes Made
| Step | Change | Tests |
|------|--------|-------|
| 1 | [change] | Passing |
| 2 | [change] | Passing |

### Quality Improvement
- Readability: [improved/unchanged]
- Maintainability: [improved/unchanged]
- Performance: [improved/unchanged]
- Test coverage: [from X% to Y%]
```

## Quality Checks

- [ ] All existing tests pass after each step
- [ ] No public API changes (or documented)
- [ ] Code is simpler/clearer than before
- [ ] No new dependencies introduced unnecessarily
- [ ] Performance is equal or better
