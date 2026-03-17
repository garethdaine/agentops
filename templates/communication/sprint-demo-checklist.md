# Communication Template: Sprint Demo Checklist

## Pre-Demo Preparation (day before)

### Environment
- [ ] Demo environment stable and accessible
- [ ] Test data seeded and representative
- [ ] All features deployed and verified
- [ ] No pending database migrations
- [ ] Environment matches production closely enough for credibility

### Content
- [ ] Feature list for demo confirmed with product owner
- [ ] Demo script written with exact steps
- [ ] Backup plan for each feature (what if it fails?)
- [ ] Screenshots captured in case of live demo failure
- [ ] No debug logging or test data visible

### Logistics
- [ ] Meeting invite sent with agenda
- [ ] Screen sharing tested
- [ ] Recording set up (if applicable)
- [ ] Time allocated: 5 min per feature + 10 min Q&A

## Demo Script Structure

```markdown
### 1. Opening (2 minutes)
- Sprint goal reminder
- What was committed vs delivered

### 2. Feature Walkthrough (5 min per feature)
For each feature:
- **Context:** Why this matters (business value, not technical detail)
- **Demo:** Show the working feature (happy path)
- **Edge case:** Show one error case handled gracefully
- **Questions:** Pause for stakeholder input

### 3. Technical Highlights (3 minutes)
- Architecture decisions made this sprint
- Technical debt addressed
- Performance improvements (with metrics if available)

### 4. Blockers & Risks (2 minutes)
- Any unresolved blockers
- Risks to upcoming work
- Decisions needed from stakeholders

### 5. Next Sprint Preview (3 minutes)
- Planned work for next sprint
- Dependencies or input needed from client

### 6. Q&A (10 minutes)
- Open floor for questions
- Capture action items
```

## Post-Demo Follow-up

- [ ] Send demo recording (if recorded)
- [ ] Send summary email with key decisions and action items
- [ ] Update task tracker with any scope changes discussed
- [ ] Log new requirements or feedback captured during Q&A
- [ ] Schedule follow-up meetings for decisions needed
