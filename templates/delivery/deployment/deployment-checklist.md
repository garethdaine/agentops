# Delivery Template: Deployment Checklist

## Pre-Deployment

- [ ] All tests passing in CI
- [ ] Code review approved
- [ ] QA check completed (`/agentops:qa-check`)
- [ ] Environment variables configured in target environment
- [ ] Database migrations tested in staging
- [ ] Feature flags configured for gradual rollout
- [ ] Rollback plan documented and tested
- [ ] Monitoring/alerting configured
- [ ] Stakeholders notified of deployment window

## Deployment

- [ ] Create deployment tag/release
- [ ] Run database migrations
- [ ] Deploy application
- [ ] Verify health check endpoints respond
- [ ] Run smoke tests against deployed environment
- [ ] Verify key user flows work end-to-end
- [ ] Check error rates in monitoring
- [ ] Check response times in monitoring

## Post-Deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Verify no performance degradation
- [ ] Update status page / notify stakeholders
- [ ] Close related tickets/issues
- [ ] Update documentation if needed
- [ ] Schedule post-deployment review if significant changes

## Rollback Procedure

1. Identify the issue triggering rollback
2. Revert to previous deployment tag
3. Run rollback database migrations (if applicable)
4. Verify health checks pass
5. Notify stakeholders of rollback
6. Document what went wrong for post-mortem

## Zero-Downtime Deployment Patterns

- **Blue/Green:** Maintain two identical environments, switch traffic
- **Canary:** Route small percentage of traffic to new version, gradually increase
- **Rolling:** Update instances one at a time behind load balancer
- **Feature flags:** Deploy code but gate features behind flags
