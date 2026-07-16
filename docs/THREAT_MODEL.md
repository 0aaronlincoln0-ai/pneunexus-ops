# Threat model

Primary threats are cross-tenant access/IDOR, privilege escalation, session theft, CSRF, credential attacks, injection, unsafe uploads, formula injection, sensitive-network disclosure, audit tampering, dependency compromise, and future OT pivot/control risk.

Implemented Phase 1 mitigations include server-derived tenant context, capability checks, facility assignment checks, RLS policies, UUIDs, Zod validation, parameterized Drizzle access, field projection, HttpOnly/Secure/SameSite cookies, CSRF validation, session expiry/revocation, generic login errors, account lock and rate limiting, strict CSP/security headers, no-store responses, sanitized structured errors, append-only audit triggers, pinned dependencies, and CSV-cell escaping utilities/tests.

Residual risks requiring production work include distributed rate-limit storage, production identity/MFA/password-reset vendor selection, RLS runtime-role context and database grants, approved malware scanning/storage, centralized tamper-evident logging, SIEM/monitoring, key rotation, external penetration testing, full abuse/load testing, and all future OT integration controls. Automated PHI pattern detection has false positives and false negatives.
