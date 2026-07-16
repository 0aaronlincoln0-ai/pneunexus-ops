# Environment variables

| Variable           | Scope       |           Required | Purpose                                                                         |
| ------------------ | ----------- | -----------------: | ------------------------------------------------------------------------------- |
| `DATABASE_URL`     | Server only |                Yes | PostgreSQL TLS connection string                                                |
| `SESSION_SECRET`   | Server only | Yes for production | Key material for future session-token signing/rotation; minimum 32 random bytes |
| `APP_ORIGIN`       | Server only |                Yes | Exact trusted application origin for origin checks                              |
| `LOG_IP_ADDRESSES` | Server only |                 No | Policy switch; default `false`                                                  |
| `VITE_APP_ENV`     | Browser     |                 No | Non-secret environment label                                                    |

Never place database credentials, administrator credentials, signing keys, API keys, or storage secrets in `VITE_` variables. Production secrets must be held in Netlify’s protected environment configuration and rotated under an approved procedure.
