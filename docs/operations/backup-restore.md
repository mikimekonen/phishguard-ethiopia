# Database Backup & Restore (Production)

## Scope
This guide targets production deployments of PhishGuard Ethiopia using Postgres. Adjust commands for your hosting provider.

## Backups (Daily)
- Enable automated daily backups at the provider level.
- Retain at least 30 days of backups.
- Store encryption keys in a secure vault.

### Manual Backup
```bash
pg_dump -Fc "$DATABASE_URL" -f /backups/phishguard-$(date +%F).dump
```

### Verify Backup
```bash
pg_restore -l /backups/phishguard-YYYY-MM-DD.dump | head -n 20
```

## Restore
```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" /backups/phishguard-YYYY-MM-DD.dump
```

## Disaster Recovery Checklist
- Validate service health endpoints after restore.
- Re-run integrity checks for audit logs.
- Confirm export hash verification for recent reports.
- Document incident timeline and corrective actions.
