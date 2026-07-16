# PneuNexus Ops

**Every route. Every device. One operational truth.**

PneuNexus Ops is a secure, multi-tenant hospital infrastructure operations platform for documenting pneumatic-tube systems. Phase 1 provides invite-only authentication, explicit capabilities, tenant-scoped APIs, the executive dashboard, facility hierarchy, and asset registry.

> **No PHI in the standard deployment.** Do not enter patient, specimen, medication, prescription, diagnosis, medical-record, or other protected health information. Detection rules can warn or block likely prohibited content but cannot guarantee detection.

The platform does not control live pneumatic-tube equipment, does not store patient records, and must remain separated from operational-technology control networks. All included organization and equipment data is fictional demonstration data.

## Quick start

1. Install Node.js 22 and pnpm 11.
2. Copy `.env.example` to `.env` and replace `SESSION_SECRET`.
3. Start PostgreSQL: `docker compose up -d`.
4. Install packages: `pnpm install`.
5. Run `pnpm db:migrate` and `pnpm db:seed`.
6. Run `pnpm dev`, then open `http://localhost:5173`.

Demo login: `organization.admin@greatlakes.demo` / `DemoAccess!2026`. This credential is demonstration-only and must never be used in production.

## Verification

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

See [local development](docs/LOCAL_DEVELOPMENT.md), [deployment](docs/NETLIFY_DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), and the [production-readiness checklist](docs/PRODUCTION_READINESS.md).

## Status

Phase 1 is implemented. Topology editing and QR access are Phase 2; complete work-order, preventive-maintenance, inspection, and incident workflows are Phase 3; reporting, knowledge base, security-center screens, and audit UI are Phase 4; PWA/offline behavior, deeper accessibility/performance work, and final hardening are Phase 5. Unimplemented areas are not shown as functioning controls.

Designed to support healthcare security and compliance programs when deployed, configured, operated and contracted appropriately. Software features alone do not make an organization compliant. PneuNexus Ops is not “HIPAA certified.”
