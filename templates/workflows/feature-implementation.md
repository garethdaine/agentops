# Workflow Template: Feature Implementation

## Context Gathering

Before starting implementation, collect and verify:

1. **Existing codebase state**
   - What framework/stack is in use? (run project detection)
   - What patterns does the existing code follow?
   - What testing framework is configured?
   - What are the naming conventions?

2. **Feature requirements**
   - What exactly should this feature do?
   - Who is the end user?
   - What are the acceptance criteria?
   - Are there performance requirements?
   - Are there security considerations?

3. **Integration context**
   - What existing code will this feature interact with?
   - Are there external APIs or services involved?
   - What database tables/models are affected?
   - Are there UI components to create or modify?

## Analysis Steps

### Step 1: Codebase Analysis
- Identify all files relevant to this feature
- Map the data flow for the feature
- Identify shared utilities and patterns to reuse
- Flag any technical debt that might affect implementation

### Step 2: Architecture Proposal
- Define the component boundaries
- Choose appropriate patterns (repository, service, controller, etc.)
- Plan the data model changes (if any)
- Define the API contract (if applicable)

### Step 3: Implementation Plan
- Break down into ordered tasks with dependencies
- Estimate complexity per task (S/M/L)
- Identify risk points (security, performance, integration)
- Define test strategy per component

### Step 4: Implementation
For each task in order:
1. Announce the task before starting
2. Write the implementation code
3. Write the corresponding tests
4. Verify the code compiles/passes linting
5. Confirm integration with existing code

### Step 5: Verification
- Run all tests (new and existing)
- Check for TypeScript errors
- Verify lint compliance
- Manual smoke test if applicable

## Output Format

### Implementation Summary
```
Feature: [name]
Tasks completed: [N/N]
Files created: [list]
Files modified: [list]
Tests added: [count]
Test status: All passing / [failures]
```

## Quality Checks

- [ ] All new functions have JSDoc/TSDoc comments
- [ ] Error cases are handled (not just happy path)
- [ ] Input validation at system boundaries
- [ ] No hardcoded values (use env/config)
- [ ] No console.log left in production code (use logger)
- [ ] Tests cover both success and failure paths
- [ ] Existing tests still pass
