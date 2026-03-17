# Delivery Template: Operational Runbook

```markdown
# Operational Runbook — [Project Name]

**Last Updated:** [date]
**Owner:** [team/person]
**Version:** [1.0]

## 1. System Overview

**Architecture:** [brief description — e.g., Next.js frontend, Express API, PostgreSQL, Redis, deployed on AWS ECS]

| Component | Technology | URL/Endpoint | Health Check |
|-----------|-----------|-------------|-------------|
| Frontend | [tech] | [URL] | [health URL] |
| API | [tech] | [URL] | [health URL] |
| Database | [tech] | [connection string ref] | [query] |
| Cache | [tech] | [connection string ref] | PING |

## 2. Startup / Shutdown

### Start Services
```bash
# Start database
docker compose up -d postgres redis

# Run migrations
npx prisma migrate deploy

# Start application
pnpm start
```

### Stop Services
```bash
# Graceful shutdown (drains connections)
kill -SIGTERM <pid>

# Or via Docker
docker compose down
```

### Restart Procedure
1. Notify stakeholders of planned restart
2. Stop accepting new connections (remove from load balancer)
3. Wait for in-flight requests to complete (30s grace period)
4. Stop services
5. Start services
6. Verify health checks pass
7. Add back to load balancer

## 3. Monitoring & Alerting

| Metric | Warning Threshold | Critical Threshold | Dashboard |
|--------|------------------|-------------------|-----------|
| API response time (p95) | >500ms | >2000ms | [link] |
| Error rate | >1% | >5% | [link] |
| CPU utilisation | >70% | >90% | [link] |
| Memory usage | >75% | >90% | [link] |
| Database connections | >80% pool | >95% pool | [link] |
| Disk usage | >80% | >90% | [link] |

## 4. Common Troubleshooting

### API returning 500 errors
1. Check application logs: `docker logs <container> --tail 100`
2. Check database connectivity: `SELECT 1` via psql
3. Check Redis connectivity: `redis-cli PING`
4. Check recent deployments: `git log --oneline -5`
5. If caused by recent deployment: rollback

### Database connection pool exhausted
1. Check current connections: `SELECT count(*) FROM pg_stat_activity`
2. Kill idle connections if needed
3. Review connection pool settings
4. Check for connection leaks (unclosed transactions)

### High memory usage
1. Check for memory leaks: monitor heap growth over time
2. Review recent code changes for unbounded caches or collections
3. Restart service if immediate relief needed
4. Profile with Node.js inspector if recurring

## 5. Backup & Recovery

| Data | Frequency | Retention | Location | Recovery Time |
|------|-----------|-----------|----------|--------------|
| Database | Daily + WAL | 30 days | [S3 bucket] | <1 hour |
| File uploads | Real-time (S3) | Indefinite | [S3 bucket] | <30 min |
| Application config | Git | Indefinite | Repository | <5 min |

### Recovery Procedure
1. Identify point-in-time for recovery
2. Restore database from backup
3. Verify data integrity
4. Replay WAL logs if needed for point-in-time recovery
5. Verify application functions correctly
6. Notify stakeholders

## 6. Scaling

| Trigger | Action | Limit |
|---------|--------|-------|
| CPU >70% sustained 5min | Add API instance | Max 10 instances |
| Memory >80% | Add API instance | Max 10 instances |
| Database connections >80% | Increase pool size | Max 100 |
| Response time p95 >1s | Add API instance + review queries | — |

## 7. Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| On-call engineer | [name] | [phone/slack] | Level 1 |
| Tech lead | [name] | [phone/slack] | Level 2 |
| Infrastructure | [name] | [phone/slack] | Level 3 |
```
