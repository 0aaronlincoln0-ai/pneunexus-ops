# Known limitations

- Phase 1 has no topology editor, connection versioning, or QR workflow (Phase 2).
- Work-order, preventive-maintenance, inspection, and incident data support dashboard metrics but their full workflows are Phase 3.
- Reports, asynchronous exports, knowledge base, security-center screens, and audit viewer are Phase 4.
- PWA/offline drafts, complete accessibility automation, performance hardening, and full test coverage are Phase 5.
- Demo authentication is not enterprise SSO; MFA enrollment and password reset require a selected provider.
- Function-instance rate limiting is best-effort; production needs an approved distributed limiter.
- File upload is deliberately unavailable until approved storage, type/signature validation, size limits, malware scanning, and retention exist.
- RLS is included, but production database roles and per-transaction tenant context require deployment validation.
- PHI detection is heuristic and cannot guarantee detection.
- No live OT integration or equipment control exists.
