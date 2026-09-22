# NYC 2026 Concierge

Tiny proxy that lets the trip app talk to Claude without exposing an API key.

Endpoints (all need the `X-Trip-Key` header):

- `POST /chat` — trip-aware concierge. Body: `{ messages: [{role, content}], today, context }`. `context` is the text the app builds from the live plan (today's running order, the wishlist, who is on the phone).
- `POST /plan` — structured replan of one day. Body: `{ day, date, request, stops: [...], library: [...], lang }` → `{ stops: [{ ref, t, d }], note }`. The app applies the returned running order after the user confirms.
- `GET /health` → `{ ok: true, model }`.

## Deploy on Railway (2 minutes)

1. Railway → New Project → **Deploy from GitHub repo** → pick `cousinnyctrip`.
2. Settings → **Root Directory** → `concierge` (this folder has its own `package.json`).
3. Variables: `ANTHROPIC_API_KEY` (required), `TRIP_KEY` = `nyc-2026` (must match `TRIP_KEY` in the app's `config.js`). Optional: `MODEL` (default `claude-opus-5`).
4. Settings → Networking → **Generate Domain**. Paste that URL into `config.js` → `CONCIERGE_URL` in the app repo and push.

The model runs with server-side refusal fallbacks enabled (`fallbacks: "default"`), so a rare safety decline is retried on a sibling model inside the same call; remove `betas`/`fallbacks` in `index.js` if you would rather not.

## Retargeting for a new trip

Everything trip-specific lives in the marked **TRIP BRIEF** block at the top of `index.js`. The endpoints below it are the reusable engine.
