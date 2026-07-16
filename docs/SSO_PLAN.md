# Future enterprise SSO plan

Select an identity provider before implementation. Add an `AuthenticationProvider` supporting SAML 2.0 or OpenID Connect with signed/encrypted assertion validation as appropriate, exact issuer/audience/redirect checks, PKCE for OIDC, nonce/state, clock-skew limits, key rotation, domain/invitation policy, MFA context, and generic failures.

Use SCIM or an approved provisioning contract for joiner/mover/leaver automation. External groups map to reviewed server-controlled roles and facility assignments; profile metadata never becomes authorization input. Role/assignment changes increment authorization version and revoke active sessions. Provide break-glass access, IdP outage procedures, metadata/certificate rotation, audit events, and staged tenant rollout.
