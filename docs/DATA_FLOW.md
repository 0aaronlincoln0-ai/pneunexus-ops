# Data-flow and classification

1. The browser sends credentials to the login Function over HTTPS.
2. The Function returns generic failures or sets an HttpOnly, Secure, SameSite=Strict opaque session cookie; a separate CSRF value stays only in application memory.
3. A protected request resolves the server-controlled organization, membership, role capabilities, and facility assignments.
4. Zod validates input; the service applies organization and facility predicates; Drizzle issues parameterized queries.
5. Sensitive infrastructure fields are projected only for explicitly authorized users. Mutations append sanitized audit events with request correlation IDs.

| Class                    | Examples                                             | Standard handling                                   |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| Public                   | Product name, generic health status                  | May appear unauthenticated                          |
| Internal                 | Asset tag, equipment type, work-order status         | Authenticated, tenant scoped, no public cache       |
| Sensitive infrastructure | IP, MAC, VLAN, topology, security configuration      | Explicit capability, excluded from ordinary exports |
| Secret                   | Password hashes, cookies, keys, database credentials | Server-only, never logged or exported               |
| Prohibited               | PHI, patient/specimen/medication records             | Do not collect; warn/block detection is limited     |
