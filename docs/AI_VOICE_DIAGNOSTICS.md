# AI voice diagnostics

Voice Assist is a phone-first, multimodal troubleshooting layer. A technician can type an observation, use the browser microphone, or attach a camera photo. The assistant returns one protocol-grounded check, reads it aloud, and waits for the observed result before advancing.

## Trust boundary

- Approved troubleshooting guides remain the repair authority. The model receives only the three most relevant guide excerpts, the current selected guide, completed-step indexes, and up to eight short conversation turns.
- Photos are compressed in the browser to a maximum 1280-pixel dimension and sent only with the current turn. They are evidence, not authorization. The app must not be used to photograph patients, specimens, medication, labels, monitors, or other clinical information.
- The OpenAI credential and Netlify AI Gateway base URL exist only in the Netlify Function runtime. They are never exposed through a `VITE_` variable or sent to the browser.
- Prompt and response content is not written to the application database or audit log. The audit event records only the model, selected guide, whether an image was supplied, and safety/escalation flags.
- The assistant cannot control equipment, connect to a hospital tube-system server, or bypass lockout/tagout, infection-control, electrical, IT, or site-authorization boundaries.

## Request flow

1. The browser captures a short speech transcript or typed message and optionally compresses one equipment photo.
2. The authenticated `/api/diagnose` Netlify Function validates CSRF, capability, request size, rate limit, and likely prohibited content.
3. Deterministic retrieval selects the closest approved protocol excerpts.
4. Netlify AI Gateway proxies a structured OpenAI Responses API request.
5. The server validates the strict JSON response before returning it.
6. The phone displays the single next check and uses device speech synthesis to read it aloud.

## Deployment

AI Gateway requires a Netlify production deployment before it is available. Set `AI_DIAGNOSTIC_MODEL` to an AI Gateway-supported vision model; the default is `gpt-5-mini`. Netlify supplies `OPENAI_API_KEY` and `OPENAI_BASE_URL` to the function. Do not create public equivalents.

The normal Vite development server uses a deterministic local preview. It exercises the voice, photo, conversation, and protocol-step interface without pretending that cloud photo interpretation is active. Use `netlify dev` after the site has a production deploy to test the real gateway locally.

## Operational controls

- Current application rate limit: 24 diagnostic turns per technician per 15 minutes, in addition to Netlify/account limits.
- Maximum text report: 1,200 characters; conversation: eight turns; image data URL: 1.8 MB.
- Model timeout: 20 seconds with one retry.
- On ambiguity or hazardous work, the output schema supports a mandatory safety stop and escalation reason.
- Before hospital production use, validate model behavior against a reviewed fault-case set, obtain privacy/security approval, configure monitoring and cost alerts, and test the exact target phones and browsers.
