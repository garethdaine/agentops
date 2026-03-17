# Workflow Template: Bug Investigation

## Context Gathering

1. **Symptom capture**
   - What is the observed behaviour?
   - What is the expected behaviour?
   - When did this start happening?
   - Is it reproducible? How often?
   - What environment (dev/staging/prod)?

2. **Reproduction steps**
   - Exact steps to reproduce
   - Required preconditions
   - Input data that triggers the bug
   - Error messages or logs

3. **Impact assessment**
   - How many users are affected?
   - Is there a workaround?
   - What is the business impact?
   - Priority: Critical / High / Medium / Low

## Analysis Steps

### Step 1: Reproduce
- Follow the reproduction steps exactly
- Capture logs, errors, and stack traces
- Identify the exact point of failure
- Note any environmental factors

### Step 2: Isolate
- Narrow down to the specific file/function
- Check recent changes (git log, git blame)
- Identify if this is a regression or a latent bug
- Determine the root cause (not just the symptom)

### Step 3: Root Cause Analysis
- What is the actual cause of the bug?
- Why wasn't this caught earlier?
- Are there similar patterns elsewhere that might have the same issue?
- Is this a code bug, a data bug, or a configuration bug?

### Step 4: Fix Proposal
- Describe the fix approach
- Assess risk of the fix (could it break other things?)
- Identify what tests need to be added
- Consider if a broader refactor is needed

### Step 5: Implementation
- Apply the fix
- Add regression test that proves the fix works
- Verify the fix doesn't break existing tests
- Check for similar issues in related code

## Output Format

```
## Bug Report

### Symptom
[What was observed]

### Root Cause
[What actually caused it]

### Fix Applied
[What was changed and why]

### Regression Test
[Test added to prevent recurrence]

### Related Risks
[Anything else that might be affected]
```

## Quality Checks

- [ ] Root cause identified (not just symptom patched)
- [ ] Regression test added
- [ ] Existing tests still pass
- [ ] Fix handles edge cases
- [ ] No performance regression introduced
