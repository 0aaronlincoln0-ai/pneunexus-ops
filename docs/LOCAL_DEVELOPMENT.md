# Local development

The standard Vite development server includes a local-only administrator account for interface
development: username `admin`, password `admin`. This shortcut is compiled out of production
builds. Set `VITE_LOCAL_ADMIN=false` when testing the real Netlify authentication endpoints.

## Requirements

- Node.js 22, pnpm 11, Docker Desktop, and Git
- A local copy of `.env.example` named `.env`

Generate `SESSION_SECRET` with an approved cryptographic random generator and use at least 32 random bytes. Do not commit `.env`. Start PostgreSQL with `docker compose up -d`, then run `pnpm db:migrate`, `pnpm db:seed`, and `pnpm dev`.

`pnpm dev` starts reliable UI-only Vite development. To emulate Netlify Functions at `/api/*`, enable the integration explicitly before starting Vite:

```powershell
$env:ENABLE_NETLIFY_DEV = "true"
pnpm dev
```

On Windows, Netlify function packaging requires permission to create symbolic links. Enable Windows Developer Mode or use an elevated terminal, and avoid OneDrive-controlled directories if symlink creation returns `EPERM`.

Database timestamps are stored in UTC. UI dates use the browser/user locale; organization timezone preference is stored for server-side scheduled processing in later phases.

## Database workflow

- Edit `server/db/schema.ts`.
- Generate a migration with `pnpm db:generate`.
- Review generated SQL, especially organization keys, indexes, foreign keys, and RLS impact.
- Apply with `pnpm db:migrate`; never edit a migration already applied in production.
- Seed data is idempotent at the fictional organization level.

If a local database must be reset, destroy only the named development Docker volume after confirming no needed data exists. Production data must use the documented backup and restoration workflow.
