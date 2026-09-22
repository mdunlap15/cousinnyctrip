# NYC 2026 Concierge

Tiny proxy that lets the trip app talk to Claude without exposing an API key.

Endpoints (all need the `X-Trip-Key` header):

- `POST /chat` — trip-aware concierge. Body: `{ messages: [{role, content}], today, context }`. `context` is the text the app builds from the live plan (today's running order, the wishlist, who is on the phone).
- `POST /plan` — structured replan of one day. Body: `{ day, date, request, stops: [...], library: [...], lang }` → `{ stops: [{ ref, t, d }], note }`. The app applies the returned running order after the user confirms.
- `GET /health` → `{ ok: true, model }`.

## Deploy on Railway (2 minutes)

1. Railway → New Project → **Deploy from GitHub repo** → pick `cousinnyctrip`.
2. Settings → **Root Directory** → `concierge` (this folder has its own `package.json`).
3. Variables: `ANTHROPIC_API_KEY` (required), `TRIP_KEY` = `nyc-2026` (must match `TRIP_KEY` in the app's `config.js`). Optional: `MODEL` (default `claude-opus-5`), plus the guard settings below.
4. Settings → Networking → **Generate Domain**, target port **3000**. Paste that URL into `config.js` → `CONCIERGE_URL` in the app repo and push.

## Checking a deploy

`GET /health` is open, free and never touches the model. It reports the port it
bound to, whether the API key is set, which origins are allowed and how much of
the day's allowance is spent — enough to tell a routing problem from a config one.

If Railway shows **"Application failed to respond"**, the container is up but
nothing answered on the routed port. In order of likelihood:

1. **Root Directory is not `concierge`.** The repo root is a static site with no
   `start` script, so Railway has nothing to run. Settings → Root Directory.
2. **Port mismatch.** The app binds `process.env.PORT` and falls back to 3000.
   Set the domain's target port to 3000, and add a `PORT=3000` variable if you
   want both sides pinned to the same number whatever Railway does.
3. **The build failed.** Deployments → the latest one → View Logs.

The server binds `::` dual-stack so it answers over IPv6 and IPv4, falling back
to `0.0.0.0` on a host with no IPv6. A server listening on only one family while
the platform routes over the other is the same "failed to respond" screen with a
healthy-looking log, so the boot output names the address and family it got.

A healthy boot prints the port, the bound address and family, the `PORT` it
read from the environment, whether the key is set, the allowed origins and the
rate limits.

## The two guards

The trip key ships in the app's public config, so it is not a secret — anyone
who reads the repo has it. These bound the damage:

| Variable | Default | What it does |
|---|---|---|
| `ALLOW_ORIGINS` | the Pages site + localhost | Comma-separated. A POST from any other origin, or with no `Origin` at all, gets 403. Set to `*` to switch off. |
| `RATE_PER_IP` | `20` | Requests per address per window, counted before the key check so a flood is throttled either way. |
| `RATE_WINDOW_S` | `300` | The window, in seconds. |
| `RATE_PER_DAY` | `250` | Calls that reach the model, per rolling day, across everyone. This is the spend ceiling. |
| `PREFLIGHT_TTL` | `86400` | Seconds a browser may reuse one CORS preflight. Without it every chat message pays for an extra round trip. Browsers clamp it to their own ceiling, so this is a request, not a promise. |

The origin check is hygiene, not security: a browser cannot lie about `Origin`,
so it stops another website using this proxy, but `curl` can send anything. The
rate limits are what actually bounds the bill. They live in memory, so a Railway
restart resets them, and the daily cap is shared — someone who has the key can
exhaust it and lock the travellers out until it rolls off. That is the trade for
a hard ceiling on spend. For a limit nothing can talk its way past, set a spend
limit on the Anthropic key itself.

Tightening `ALLOW_ORIGINS` is not instant: a browser that was allowed may reuse
its cached preflight until `PREFLIGHT_TTL` or its own ceiling runs out, whichever
is shorter. Removing an origin you actually need to lock out quickly means
setting `PREFLIGHT_TTL` to `0` as well. A refused preflight is never cached, so
this never works in the other direction.

`npm run test:proxy` boots the proxy with tiny limits and checks all of it
without spending anything. `npm run test:concierge` drives the app against it in
a real browser.

The model runs with server-side refusal fallbacks enabled (`fallbacks: "default"`), so a rare safety decline is retried on a sibling model inside the same call; remove `betas`/`fallbacks` in `index.js` if you would rather not.

## Retargeting for a new trip

Everything trip-specific lives in the marked **TRIP BRIEF** block at the top of `index.js`. The endpoints below it are the reusable engine.
