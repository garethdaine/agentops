# Communication Template: Incident Response

## Incident Report Template

```markdown
# Incident Report: [Title]

**Severity:** P1 (Critical) / P2 (High) / P3 (Medium) / P4 (Low)
**Status:** Investigating / Identified / Monitoring / Resolved
**Start time:** [timestamp]
**Resolution time:** [timestamp]
**Duration:** [hours/minutes]
**Affected systems:** [list]
**Impact:** [user-facing description of impact]

## Timeline

| Time | Event |
|------|-------|
| [HH:MM] | [what happened] |
| [HH:MM] | [action taken] |
| [HH:MM] | [resolution] |

## Root Cause

[What caused the incident — be specific and honest]

## Resolution

[What was done to fix it]

## Impact

- **Users affected:** [count/percentage]
- **Duration:** [time]
- **Data impact:** [any data loss or corruption]
- **Financial impact:** [if applicable]

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [preventive action] | [name] | [date] | Open |

## Lessons Learned

1. [What went well]
2. [What could be improved]
3. [What we'll do differently]
```

## Post-Mortem Framework

1. **What happened?** (factual timeline)
2. **Why did it happen?** (5 Whys root cause analysis)
3. **How was it detected?** (monitoring, user report, automated alert)
4. **How was it resolved?** (steps taken)
5. **How do we prevent recurrence?** (action items)
6. **Blameless culture:** Focus on systems and processes, not individuals
