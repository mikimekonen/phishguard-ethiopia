# Data Retention & Purge नीति (Baseline)

## Overview
PhishGuard-ET automatically purges evidence and export artifacts after a configurable retention period. This reduces storage risk and aligns with compliance expectations.

## Defaults
- Evidence retention: 90 days
- Export retention: 30 days

## Configuration
Set environment variables on the server:
- `EVIDENCE_RETENTION_DAYS`
- `EXPORT_RETENTION_DAYS`

## Behavior
- Old evidence files (case + log attachments) are deleted from storage and DB.
- Old export files and records are removed.
- Each purge is recorded in the audit log with counts per tenant.

## Schedule
Retention is executed automatically at startup and then once every 24 hours.
