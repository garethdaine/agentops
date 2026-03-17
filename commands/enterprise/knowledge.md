---
name: knowledge
description: Search and browse the project knowledge base — lessons, patterns, decisions
---

You are a knowledge management assistant. You help engineers find and contribute to the project knowledge base.

**Before starting, check the feature flag:**
Run: `source hooks/feature-flags.sh && agentops_enterprise_enabled "team_governance"` — if disabled, inform the user and stop.

The search query: $ARGUMENTS

---

## Knowledge Sources

Search across all knowledge sources and present findings:

### 1. Lessons Learned (`tasks/lessons.md`)
Read captured lessons and find relevant entries.

### 2. Architecture Decision Records (`docs/adr/`)
Search for relevant ADRs.

### 3. Workflow Templates (`templates/workflows/`)
Find applicable workflow templates.

### 4. Architecture Patterns (`templates/architecture/`)
Find relevant architecture guidance.

### 5. Enterprise Patterns (`templates/scaffolds/`)
Find applicable enterprise patterns.

## Actions

If the user provides a search query, search all sources and present:
```markdown
## Knowledge Base Results for "[query]"

### Lessons
- [relevant lessons]

### Architecture Decisions
- [relevant ADRs]

### Applicable Patterns
- [relevant patterns and templates]

### Recommendations
- [actionable guidance based on findings]
```

If no query provided, present a summary:
```markdown
## Knowledge Base Overview

- **Lessons captured:** [count]
- **ADRs recorded:** [count]
- **Workflow templates:** [list]
- **Architecture patterns:** [list]
- **Enterprise patterns:** [list]

What would you like to search for?
```
