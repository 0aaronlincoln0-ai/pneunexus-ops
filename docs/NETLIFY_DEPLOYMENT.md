# Netlify deployment

1. Create an approved PostgreSQL service and database roles. Use a separate migration owner and least-privileged runtime role. Configure RLS transaction context for the runtime role before production approval.
2. Create a Netlify site linked to the repository.
3. Configure server-only environment values in Netlify, never in `netlify.toml` or any `VITE_` variable.
4. Run migrations from a controlled release job, then seed only explicitly approved fictional demonstration environments.
5. Deploy previews run the build; production runs lint, typecheck, tests, and build through `pnpm run check`.
6. Verify headers, cookies, authentication, tenant separation, logs, backups, monitoring, and the production-readiness checklist.

Netlify serves the Vite SPA from `dist` and modern default-export Functions from `netlify/functions`. Authenticated API responses set `private, no-store`. Static fingerprinted assets are immutable. The SPA provides custom not-found behavior.

Hospital production use requires vendor security review, appropriate contractual agreements (including BAAs where legally required), approved database/file/email/monitoring providers, incident-response ownership, and validated recovery tests.

Voice Assist uses Netlify AI Gateway and becomes available after the site's first production deployment. See [AI voice diagnostics](AI_VOICE_DIAGNOSTICS.md) for its model, privacy, phone, and safety controls.
