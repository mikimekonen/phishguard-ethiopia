# Regulatory & Audit Readiness (NBE-Style)

This document provides a practical checklist aligned to common expectations for Ethiopian banking security audits.

## Evidence & Audit Trail
- Tamper-evident audit log chaining (hash + prevHash).
- Export hash + signature included in PDF/CSV exports.
- Evidence attachments tied to detection logs.

## Access Control
- Role-based access control (superadmin/admin/analyst/viewer).
- Tenant separation per bank.
- Enforced authentication with short-lived tokens.

## Monitoring & Incident Response
- Case workflow with analyst notes and status transitions.
- Export job queue to avoid blocking critical operations.
- Documented escalation playbooks per risk tier.

## Data Protection
- Encrypt sensitive data at rest (DB + backup encryption).
- Mask sensitive fields in exports.
- Maintain retention and deletion policies.

## Reporting
- Daily/weekly executive summaries.
- Evidence-ready PDF reports with export signatures.
- CSV exports for SOC/forensics ingestion.

## Operational Controls
- Rate limiting on public endpoints.
- Backups + restore procedures tested quarterly.
- Change management and release logging.

## Recommended Attachments for Audits
- System architecture diagram.
- List of roles and permissions.
- Export hash verification procedure.
- Incident response playbook.
