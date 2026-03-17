# Delivery Template: Knowledge Transfer Checklist

```markdown
# Knowledge Transfer Checklist — [Project Name]

**From:** [delivering team]
**To:** [receiving team/client]
**Date:** [date]

## Sessions

### Session 1: Architecture Overview (1-2 hours)
- [ ] High-level architecture walkthrough
- [ ] Key architectural decisions explained (link to ADRs)
- [ ] Module/service boundaries and responsibilities
- [ ] Data flow diagrams reviewed
- [ ] Integration points with external systems
- [ ] Security architecture (auth, RBAC, tenant isolation)
- [ ] Q&A

### Session 2: Codebase Walkthrough (2-3 hours)
- [ ] Repository structure and navigation
- [ ] Key files and their purposes
- [ ] Coding conventions and patterns
- [ ] Build process and tooling
- [ ] Testing approach and running tests
- [ ] Common development tasks (add endpoint, add model, etc.)
- [ ] Q&A

### Session 3: Operations & Deployment (1-2 hours)
- [ ] Deployment pipeline walkthrough
- [ ] Environment configuration
- [ ] Monitoring dashboards and alerting
- [ ] Log access and common queries
- [ ] Runbook walkthrough (startup, shutdown, troubleshooting)
- [ ] Backup and recovery procedures
- [ ] Q&A

### Session 4: Incident Response (30-60 minutes)
- [ ] Incident severity definitions
- [ ] Escalation procedures
- [ ] Common failure modes and their fixes
- [ ] Rollback procedures
- [ ] Communication templates for incidents
- [ ] Q&A

## Documentation Delivered
- [ ] Architecture overview document
- [ ] Operational runbook
- [ ] API documentation
- [ ] Environment setup guide
- [ ] ADR archive
- [ ] Test plan and current coverage report

## Access Transferred
- [ ] Source code repository (read + write)
- [ ] CI/CD pipeline (admin access)
- [ ] Cloud infrastructure console
- [ ] Monitoring and alerting dashboards
- [ ] Log aggregation platform
- [ ] Secret management system
- [ ] Domain registrar / DNS management
- [ ] Third-party service accounts (auth, email, storage)

## Knowledge Gaps Identified
| Gap | Impact | Remediation |
|-----|--------|-------------|
| [gap] | [impact] | [plan to address] |

## Sign-off
| Role | Name | Confirmed | Date |
|------|------|-----------|------|
| Delivering lead | [name] | [ ] | [date] |
| Receiving lead | [name] | [ ] | [date] |
```
