# Requirements Collection Utility

When this utility is invoked, use structured prompting to gather requirements from the user. Follow the framework below to ensure complete, unambiguous requirements.

## Collection Framework

### Step 1: Context Setting
Before asking questions, summarise what you already know:
- What the user has stated so far
- What you've detected from the project (via project-detection utility)
- What assumptions you're making

### Step 2: Structured Questions
Present questions in grouped sections. Use numbered multi-choice where possible to reduce friction.

**Format for multi-choice questions:**
```
**[Category]: [Question]**
1. Option A — brief description
2. Option B — brief description
3. Option C — brief description
4. Other — specify

Your choice:
```

**Format for open-ended questions:**
```
**[Category]: [Question]**
Context: [Why this matters for the decision]
Default: [Suggested default if the user doesn't have a preference]
```

### Step 3: Decision Tree Logic
After each answer, determine if follow-up questions are needed:
- If user picks a frontend framework → ask about routing strategy, state management
- If user picks a database → ask about ORM preference, migration strategy
- If user picks auth → ask about provider, session strategy, role model
- If user picks cloud → ask about deployment model, scaling requirements

### Step 4: Confirmation
Before proceeding, present a complete summary of all collected requirements and ask for confirmation:

```
## Requirements Summary

| Decision | Choice | Notes |
|----------|--------|-------|
| Project type | Full-stack web app | — |
| Frontend | Next.js 14 | App Router |
| Backend | Next.js API Routes + tRPC | Type-safe API |
| Database | PostgreSQL | Managed (Supabase) |
| ORM | Prisma | With migrations |
| Auth | NextAuth.js v5 | Google + GitHub OAuth |
| Cloud | Vercel | Edge runtime where possible |
| Monorepo | No | Single package |

Does this look correct? (yes / make changes)
```

## Guidelines

- Never assume a technology choice — always ask
- Offer sensible defaults based on detected stack and common patterns
- Keep questions concise — respect the user's time
- Group related decisions together (don't ask about database migrations before confirming database choice)
- If the user says "you decide" or "whatever you recommend", state your recommendation with reasoning and ask for confirmation
- Maximum 3 rounds of questions before presenting the summary
