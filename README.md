# Wonex-Mini Multi-Session

Password-protected web login for QR or WhatsApp pairing-code authentication.

## Railway variables

Required:
- `WEB_PASSWORD` = your private web-panel password

Recommended:
- `PORT` = Railway can provide this automatically; `3000` is fine as fallback
- `MAX_SESSIONS` = e.g. `10`

Optional:
- `BOT_NAME`
- `OWNER_NAME`
- `BOT_PREFIX`
- `WORK_MODE`
- Firebase variables

## Run locally

```bash
npm install
npm start
```

Open the Railway/public URL in a browser.

## Important

Each WhatsApp number gets its own folder under `sessions/<number>`.

For production, local filesystem session storage is not ideal. A persistent disk/volume or a database-backed auth store should be used so sessions survive redeploys.

The web panel is password protected and includes basic in-memory rate limiting. Do not publish the web password.
