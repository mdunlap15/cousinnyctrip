# Tatyana in New York — Sep 26 – Oct 4, 2026

A single-page, installable trip app for Tatyana's first week in New York, hosted by
Yulia and Mike in Park Slope. Live at **https://mdunlap15.github.io/cousinnyctrip/**
(GitHub Pages). Open it in Safari on the iPhone → Share → **Add to Home Screen**; it
gets its own icon and works offline.

## What's inside

- **Today** — what's happening now, the next stop, the week's weather at a glance
- **Days** — a running order per day you can drag, retime, extend and move between
  days; travel time between stops is computed from real subway/walk estimates and
  the day tells you how heavy it is and when you'd get home
- **Explore** — the places library (sights, museums, restaurants, bars, cafés,
  shopping) with links to sites, tickets, menus, reservations and Instagram, plus a
  **swipe mode** for rating places quickly
- **Plan** — everyone's votes sync between phones; what you both want floats up, and
  **Build my week** slots the winners into the days that actually fit them
- **Map** — every pin, filterable by category or by day, with "near me" and a
  "get me home" route back to 7th Avenue
- **Chat** — a concierge that knows the live plan, the library and the subway (EN/RU)
- **Bookings** — flights, a "book this now" checklist derived from the plan, your own
  reservations, and a calendar export of the live plan
- **Guide** — airport, subway from 7th Avenue, money, tipping, phones, weather, safety
- **Fully bilingual** — the РУС/ENG button switches the whole app; the choice sticks
- **Shows itself around** — a fourteen-step walkthrough runs on the first visit and
  can be replayed from More → Settings; edit the copy in `data/tour.js`

## Repo layout

```
index.html      markup only
app.css         styles
app.js          the engine (navigation, running order, votes, map, chat, calendar)
data/plan.js    THE TRIP: dates, travelers, seeded running order, rain swaps, bookings
data/places.js  the library (generated — see scripts/build-data.mjs)
data/geo.js     home base, transit hubs, the travel-time model
data/guide.js   the practical briefing (EN + RU + DE)
data/tour.js    the first-run walkthrough: what each step points at and says
concierge/      the Claude proxy to deploy on Railway
```

## Working on it

```bash
npm install
npm test                 # jsdom smoke test — run before every push
npm run test:strict      # also fails on placeholder data / missing icons
npm run build:data ../research   # regenerate data/places.js from research lanes
npm run build:ics        # regenerate trip.ics from the seeded plan
npm run test:tour        # the onboarding walkthrough, in a real browser on 3 phones
npm run test:offline     # loads the app, kills the network, reloads
npm run test:install     # manifest, iOS tags and the right install hint per phone
npm run serve            # http://localhost:8080
```

Bump `CACHE` in `sw.js` whenever `trip.ics` or the icons change.

## The two hookups

1. **Shared sync (Supabase)** — already configured in `config.js`; the same project as
   the Montreal and Japan apps, scoped by `TRIP_ID`. Votes, the running order, notes,
   reservations and checklists sync between phones in real time.
   Schema: `supabase/schema.sql`.
2. **Concierge (Railway)** — deploy `concierge/` (root directory = `concierge`), set
   `ANTHROPIC_API_KEY` and `TRIP_KEY=nyc-2026`, generate a domain, paste it into
   `config.js` → `CONCIERGE_URL`. Until then the Chat tab shows a setup card and the
   ✨ Replan button on each day falls back to the built-in swaps.

## A caveat worth repeating

Hours, prices and links were compiled in September 2026 from research and model
knowledge — they are **not** live-verified. Every card links to its source; tap
through before relying on a time. Anything uncertain is marked "confirm".
