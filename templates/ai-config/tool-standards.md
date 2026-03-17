# Shared AI Configuration: Tool Standards

## Approved AI Tools by Task

| Task | Primary Tool | Alternative | Notes |
|------|-------------|-------------|-------|
| Architecture decisions | Claude (Opus) | — | Needs deep reasoning |
| Feature implementation | Claude Code | Cursor | Structured workflow via /agentops:feature |
| Code review | Claude Code | — | Via /agentops:review |
| Bug investigation | Claude Code | — | Via bug-investigation workflow |
| Documentation | Claude (Sonnet) | — | Fast, high-quality prose |
| Test generation | Claude Code | — | Via /agentops:test-gen |
| Refactoring | Claude Code | Cursor | Via refactoring workflow |

## AI Output Quality Standards

### Code Quality
- Generated code must pass TypeScript strict mode
- No `any` types unless explicitly justified
- All functions must handle error cases
- No placeholder values (TODO, FIXME, example.com)
- Follows existing project patterns and conventions

### Documentation Quality
- Clear, concise, professional tone
- No hallucinated links or references
- All code examples must be syntactically correct
- Technical accuracy verified against codebase

### Review Quality
- All findings must reference specific file:line locations
- Fix suggestions must be concrete and implementable
- Severity ratings must be justified
- No false positives from pattern matching

## Model Selection Guide

| Consideration | Use Opus/Large | Use Sonnet/Medium | Use Haiku/Small |
|---------------|---------------|-------------------|-----------------|
| Architecture | Yes | — | — |
| Complex features | Yes | — | — |
| Simple features | — | Yes | — |
| Code review | Yes | Yes | — |
| Documentation | — | Yes | — |
| Quick questions | — | — | Yes |
| Content filtering | — | — | Yes |

## Prompt Library Index

| Category | Template | Location |
|----------|----------|----------|
| Feature build | feature-implementation.md | templates/workflows/ |
| Bug fix | bug-investigation.md | templates/workflows/ |
| Refactoring | refactoring.md | templates/workflows/ |
| Architecture | architecture-decision.md | templates/workflows/ |
| Spike | spike-exploration.md | templates/workflows/ |
