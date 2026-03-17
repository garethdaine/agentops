# Communication Template: Post-Mortem / RCA

*Distinct from the incident response template — this is the after-action review conducted 2-5 days after an incident is resolved.*

```markdown
# Post-Mortem: [Incident Title]

**Incident date:** [date]
**Post-mortem date:** [date]
**Severity:** P1 / P2 / P3
**Duration:** [hours/minutes from detection to resolution]
**Author:** [name]
**Attendees:** [names of post-mortem participants]

---

## Summary

[2-3 sentences: what happened, who was affected, how it was resolved]

---

## Timeline

| Time (UTC) | Event |
|-----------|-------|
| [HH:MM] | [First sign of issue — alert, user report, monitoring] |
| [HH:MM] | [Issue acknowledged by on-call] |
| [HH:MM] | [Investigation started] |
| [HH:MM] | [Root cause identified] |
| [HH:MM] | [Fix deployed] |
| [HH:MM] | [Monitoring confirms resolution] |
| [HH:MM] | [All-clear communicated to stakeholders] |

---

## Root Cause Analysis

### What happened?
[Factual description of the failure chain]

### 5 Whys
1. **Why** did [symptom] occur? → Because [cause 1]
2. **Why** did [cause 1] happen? → Because [cause 2]
3. **Why** did [cause 2] happen? → Because [cause 3]
4. **Why** did [cause 3] happen? → Because [cause 4]
5. **Why** did [cause 4] happen? → Because [root cause]

### Contributing Factors
- [Factor that made the impact worse or detection slower]
- [Factor — e.g., missing monitoring, documentation gap, test gap]

---

## Impact

| Metric | Value |
|--------|-------|
| Users affected | [count or percentage] |
| Duration | [time] |
| Revenue impact | [if applicable] |
| Data affected | [any data loss/corruption — be specific] |
| SLA breach | Yes/No — [details] |

---

## What Went Well

1. [Thing that worked — detection, response, communication]
2. [Thing that worked]
3. [Thing that worked]

## What Went Poorly

1. [Thing that didn't work — slow detection, unclear runbook, missing test]
2. [Thing that didn't work]
3. [Thing that didn't work]

## Where We Got Lucky

1. [Thing that could have been worse but wasn't — acknowledge luck explicitly]

---

## Action Items

| # | Action | Type | Owner | Due Date | Status |
|---|--------|------|-------|----------|--------|
| 1 | [preventive action] | Prevention | [name] | [date] | Open |
| 2 | [detective action — better monitoring] | Detection | [name] | [date] | Open |
| 3 | [process improvement] | Process | [name] | [date] | Open |

**Types:**
- **Prevention** — stop this from happening again
- **Detection** — catch it faster next time
- **Mitigation** — reduce impact if it does happen
- **Process** — improve response procedures

---

## Follow-up Review

**Scheduled:** [date, 2-4 weeks after post-mortem]
**Purpose:** Verify all action items are completed and effective

---

*This post-mortem is blameless. We focus on systems and processes, not individuals. The goal is to learn and improve, not to assign fault.*
```
