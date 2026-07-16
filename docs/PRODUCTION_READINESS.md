# Production-readiness checklist

- [ ] Complete Phases 2–5 and all critical automated tests against PostgreSQL.
- [ ] Select and contract approved identity, database, file, email, and monitoring providers.
- [ ] Configure separate migration/runtime database roles, TLS, RLS context, backups, and restore tests.
- [ ] Implement enterprise MFA/password reset, distributed brute-force limiting, role-change session revocation, and access reviews.
- [ ] Approve data classification, retention, No-PHI policy, prohibited-content rules, and workforce training.
- [ ] Add CI lint/type/test/build, SAST, SCA, secret scanning, SBOM, artifact signing, and deployment approvals.
- [ ] Complete accessibility audit to WCAG 2.2 AA, performance/load tests, security review, and penetration test.
- [ ] Configure monitoring, alerting, SIEM retention, on-call ownership, incident exercises, RPO, and RTO.
- [ ] Validate Netlify headers, DNS/TLS, environment separation, preview access, and public-route exposure.
- [ ] Do not enable any OT integration until separately reviewed and explicitly approved.

No checklist completion or software feature alone makes an organization compliant.
