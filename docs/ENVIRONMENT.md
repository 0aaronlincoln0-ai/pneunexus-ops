# Environment variables

| Variable              | Scope       |           Required | Purpose                                                                          |
| --------------------- | ----------- | -----------------: | -------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Server only |                Yes | PostgreSQL TLS connection string                                                 |
| `SESSION_SECRET`      | Server only | Yes for production | Key material for future session-token signing/rotation; minimum 32 random bytes  |
| `APP_ORIGIN`          | Server only |                Yes | Exact trusted application origin for origin checks                               |
| `LOG_IP_ADDRESSES`    | Server only |                 No | Policy switch; default `false`                                                   |
| `OPENAI_API_KEY`      | Server only |      One AI option | Direct OpenAI credential or a value automatically injected by Netlify AI Gateway |
| `OPENAI_BASE_URL`     | Server only |                 No | Automatically injected when Netlify AI Gateway handles OpenAI requests           |
| `AI_DIAGNOSTIC_MODEL` | Server only |                 No | Approved diagnostic model; default `gpt-4o-mini`                                 |
| `VITE_APP_ENV`        | Browser     |                 No | Non-secret environment label                                                     |

Never place database credentials, administrator credentials, signing keys, API keys, or storage secrets in `VITE_` variables. Production secrets must be held in Netlify’s protected environment configuration and rotated under an approved procedure.

## Pocket Technician on Netlify

The browser never receives the OpenAI credential. `POST /api/diagnose` runs server-side and reads one
of the following private deployment options:

1. Netlify AI Gateway: enable AI for the Netlify site. The modern Netlify Function runtime injects
   the private OpenAI provider configuration automatically, so no application secret is added.
2. Direct OpenAI: add a newly created `OPENAI_API_KEY` as a secret Netlify environment variable,
   then optionally set `AI_DIAGNOSTIC_MODEL=gpt-4o-mini`.

For a direct OpenAI key, use the Netlify UI environment-variable editor, mark the value as secret,
scope it to Functions, and select the intended deploy contexts. Avoid passing secrets on command
lines because they can be retained in shell history.

Use the same variables for `deploy-preview` only when preview diagnostics are intentionally enabled.
Never put the key in `.env.example`, a `VITE_` variable, source code, browser storage, or a Netlify
build log.
