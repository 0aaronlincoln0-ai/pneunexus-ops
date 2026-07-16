# Security controls matrix

| Area             | Phase 1 control                                            | Evidence                            | Remaining production decision                 |
| ---------------- | ---------------------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| Tenant isolation | Organization predicates, facility checks, RLS migration    | Functions, tenant tests, migration  | Separate DB roles and transaction context     |
| Authorization    | Explicit role-permission capabilities                      | `capabilities.ts`, seed mappings    | Formal access recertification workflow        |
| Sessions         | Opaque hashed tokens, expiry, revocation, secure cookie    | Auth/session Functions              | Enterprise IdP, MFA, reset provider           |
| CSRF             | Per-session token required on mutation                     | Session/device Functions            | Origin monitoring and regression suite        |
| Input            | Zod schemas and prohibited-content warning/block           | Validation/device Function          | Approved rule governance                      |
| Logging          | Correlation IDs, sanitized error events, append-only audit | HTTP/audit providers, trigger       | SIEM and retention approval                   |
| Data exposure    | Field-level projection and no-store caching                | Bootstrap Function, Netlify headers | Export/report approval workflow               |
| Supply chain     | Exact dependency versions, lockfile, tests                 | `package.json`, lockfile            | CI SCA/SAST/secret scan/SBOM gates            |
| Uploads          | Provider abstraction only; UI unavailable                  | Provider contract                   | Storage, malware scanning, signature checks   |
| OT safety        | No connection or command feature                           | Architecture                        | Separate reviewed read-only connector program |
