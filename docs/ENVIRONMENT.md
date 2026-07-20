# Environment variables

| Variable              | Scope       |           Required | Purpose                                                                         |
| --------------------- | ----------- | -----------------: | ------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Server only |                Yes | PostgreSQL TLS connection string                                                |
| `SESSION_SECRET`      | Server only | Yes for production | Key material for future session-token signing/rotation; minimum 32 random bytes |
| `APP_ORIGIN`          | Server only |                Yes | Exact trusted application origin for origin checks                              |
| `LOG_IP_ADDRESSES`    | Server only |                 No | Policy switch; default `false`                                                  |
| `OPENAI_API_KEY`      | Server only |      One AI option | Resovii-owned OpenAI credential; never sent to customers or browsers            |
| `OPENAI_BASE_URL`     | Server only |      One AI option | Automatically supplied by Netlify AI Gateway                                    |
| `AI_DIAGNOSTIC_MODEL` | Server only |                 No | Approved diagnostic model; default `gpt-5.6-sol`                                |
| `VITE_APP_ENV`        | Browser     |                 No | Non-secret environment label                                                    |

Never place database credentials, administrator credentials, signing keys, API keys, or storage secrets in `VITE_` variables. Production secrets must be held in Netlify’s protected environment configuration and rotated under an approved procedure.

## Pocket Technician on Netlify

The browser never receives the OpenAI credential. `POST /api/diagnose` runs server-side and reads one
of the following private deployment options:

1. Owner settings: organization admins can save the Resovii-owned OpenAI API key at `/owner-settings`.
   The server encrypts it and uses it for every user in that organization.
2. Direct OpenAI environment key: add `OPENAI_API_KEY` as a secret Netlify environment variable, then
   optionally set `AI_DIAGNOSTIC_MODEL=gpt-5.6-sol`.
3. Netlify AI Gateway: enable AI for the Netlify site. Netlify supplies `OPENAI_BASE_URL`; do not add
   an OpenAI key for this option.

For a direct OpenAI key, use the Netlify UI environment-variable editor or run this from a signed-in
terminal after the new key exists:

```powershell
pnpm --package=netlify-cli dlx netlify env:set OPENAI_API_KEY "<new-key>" --secret --context production
pnpm --package=netlify-cli dlx netlify env:set AI_DIAGNOSTIC_MODEL "gpt-5.6-sol" --context production
```

Use the same variables for `deploy-preview` only when preview diagnostics are intentionally enabled.
Never put the key in `.env.example`, a `VITE_` variable, source code, browser storage, or a Netlify
build log.
