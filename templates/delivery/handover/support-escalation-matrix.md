# Delivery Template: Support Escalation Matrix

```markdown
# Support Escalation Matrix — [Project Name]

**Effective from:** [date]
**Review date:** [date + 3 months]

## Severity Definitions

| Level | Definition | Example | Response Target | Resolution Target |
|-------|-----------|---------|----------------|-------------------|
| P1 — Critical | System down, data loss, security breach | Production API returning 500 for all users | 15 minutes | 4 hours |
| P2 — High | Major feature broken, significant user impact | Authentication failing for subset of users | 1 hour | 8 hours |
| P3 — Medium | Feature degraded, workaround available | Report generation slow but functional | 4 hours | 2 business days |
| P4 — Low | Minor issue, cosmetic, enhancement request | UI alignment issue on one browser | 1 business day | Next sprint |

## Escalation Path

### Level 1: Client Internal Team
**Handles:** Known issues, configuration changes, password resets, FAQ questions
**Contact:** [client support email/channel]
**Hours:** Business hours

### Level 2: Development Team
**Handles:** Bug investigation, code fixes, performance issues
**Contact:** [dev team email/Slack channel]
**Hours:** Business hours (P1/P2: on-call after hours)

### Level 3: Architecture / Infrastructure
**Handles:** System design issues, infrastructure failures, security incidents
**Contact:** [tech lead / architect contact]
**Hours:** On-call for P1 only

### Emergency
**Handles:** Security breaches, data loss, complete system failure
**Contact:** [emergency phone number]
**Process:** Call immediately, do not wait for email response

## Escalation Triggers

| Situation | Escalate To |
|-----------|------------|
| Issue unresolved past response target | Next level |
| Issue affects >50% of users | Level 2 minimum |
| Security incident suspected | Level 3 + emergency |
| Data loss or corruption | Level 3 + emergency |
| Client executive escalation | Level 3 |

## Communication Protocol

- P1/P2: Status updates every 30 minutes until resolved
- P3: Status update within 4 hours, then daily
- P4: Update in weekly status report
- All incidents: Post-mortem within 5 business days for P1/P2
```
