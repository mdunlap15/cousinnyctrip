// NYC 2026 Trip Concierge — tiny proxy so the Anthropic key never touches the client.
// Env: ANTHROPIC_API_KEY (required), MODEL (optional), TRIP_KEY (optional shared secret), PORT
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'claude-opus-5';
const TRIP_KEY = process.env.TRIP_KEY || 'nyc-2026';
const client = new Anthropic();

// ---------------------------------------------------------------- guards
// The trip key is not a secret: it ships in the app's public config, so anyone
// who reads the repo has it. These two guards are what actually stands between
// a stranger and the API bill.
//
// ORIGIN is hygiene, not security. A browser cannot lie about it, so it stops
// another website from quietly using this proxy — but curl can send anything,
// so it does not stop a determined caller. The rate limits below are the part
// that bounds the spend.
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS === undefined
  ? 'https://mdunlap15.github.io,http://localhost:8080,http://127.0.0.1:8080'
  : process.env.ALLOW_ORIGINS)
  .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
const ORIGIN_OPEN = ALLOW_ORIGINS.includes('*') || ALLOW_ORIGINS.length === 0;

const RATE_PER_IP = Number(process.env.RATE_PER_IP || 20);      // requests…
const RATE_WINDOW_S = Number(process.env.RATE_WINDOW_S || 300); // …per this many seconds, per address
const RATE_PER_DAY = Number(process.env.RATE_PER_DAY || 250);   // authenticated calls to the model per rolling day

const ipHits = new Map();   // address -> [timestamps]
let dayHits = [];           // timestamps of calls that reached the model

function clientIp(req) {
  // Railway terminates TLS in front of us, so the caller is the first hop in
  // x-forwarded-for. Trusting it is fine here: the worst a forged one can do is
  // dodge the per-address limit, and the daily cap still holds.
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.socket.remoteAddress || 'unknown';
}
function prune(list, windowMs, now) {
  const cut = now - windowMs;
  let i = 0; while (i < list.length && list[i] < cut) i++;
  return i ? list.slice(i) : list;
}
// Per-address burst limit. Counts every POST, so a flood is throttled whether
// or not it carries the right key.
function ipLimited(req) {
  if (!(RATE_PER_IP > 0)) return 0;
  const now = Date.now(), win = RATE_WINDOW_S * 1000, ip = clientIp(req);
  const list = prune(ipHits.get(ip) || [], win, now);
  if (list.length >= RATE_PER_IP) { ipHits.set(ip, list); return Math.max(1, Math.ceil((list[0] + win - now) / 1000)); }
  list.push(now); ipHits.set(ip, list);
  if (ipHits.size > 5000) for (const [k, v] of ipHits) { if (!prune(v, win, now).length) ipHits.delete(k); }
  return 0;
}
// Daily ceiling on calls that actually cost money. Checked after the key, so a
// stranger guessing keys cannot burn the travellers' allowance.
function dayLimited() {
  if (!(RATE_PER_DAY > 0)) return 0;
  const now = Date.now(), win = 86400 * 1000;
  dayHits = prune(dayHits, win, now);
  if (dayHits.length >= RATE_PER_DAY) return Math.max(1, Math.ceil((dayHits[0] + win - now) / 1000));
  dayHits.push(now);
  return 0;
}

// ════════════════════════════════════════════════════════════════════
// ██  TRIP BRIEF — the only trip-specific part of this file.        ██
// ════════════════════════════════════════════════════════════════════
const SYSTEM = `You are the concierge living inside the trip app for Tatyana's first visit to New York, hosted by her cousin Yulia and Yulia's husband Mike. Be warm, brief and concrete; short paragraphs; no bullet walls. Answer in the language you are asked in — English, Russian or German. When unsure about current hours, prices or availability, say so and point to the venue link in the app.

WHO: Tatyana (from Hannover, Germany, Russian-speaking, 40s, first time in NYC) and Yulia (lives here). Mike joins for dinner and drinks on some evenings — when he is on, suggest places that suit a table of three. They like the big first-timer sights, museums, shopping (department stores and women's boutiques), good restaurants, cocktail and hotel-lobby bars, cafés for breaks. They do NOT want crammed days: 3–5 anchors a day, real breaks, home by about 11 pm most nights.

BASE: 490A 7th Avenue, Brooklyn 11215 (Park Slope, 7th Ave & 16th St). Subway: 15th St–Prospect Park and 7th Ave (F/G), 4th Ave–9th St (F/G/R), Union St (R), Grand Army Plaza (2/3). Rough door-to-door: DUMBO 25 min, FiDi 35, SoHo 35, West Village 40, Chelsea 42, Midtown 45–50, Upper East Side 55, Williamsburg 35, Coney Island 50. Pay with OMNY (tap a contactless card or phone; weekly cap after 12 rides). Taxi/Uber home from Manhattan late at night ≈ $35–55.

FLIGHTS: Sat Sep 26 2026 — LH 41 Hannover 08:40 → Frankfurt; LH 400 Frankfurt 10:55 → JFK Terminal 1 13:35. Sun Oct 4 — LH 411 JFK Terminal 1 17:30 → Munich 07:20 Mon; LH 4072 Munich 11:15 → Hannover 12:25. Leave Park Slope by 14:00 on Oct 4.

THE SEEDED PLAN (editable in the app; the user message may include the live version — prefer that):
- Sat Sep 26 (landing): lands JFK 13:35, taxi home (~1 h), shower and a slow 7th Ave walk, early dinner at al di là, early night (jet lag: +6 h).
- Sun Sep 27 (Midtown icons): Grand Central, St. Patrick's, Rockefeller Center, lunch at Lodi, Bergdorf Goodman, a drink at Goodman's Bar, Top of the Rock at 17:45 (sunset 18:45), then Mulberry Street for the Feast of San Gennaro's final night.
- Mon Sep 28 (High Line to the Village): Little Island, the Whitney, Chelsea Market lunch, the High Line south to north, subway to the Village, Bleecker St boutiques, aperitivo at Bar Pisellino, dinner at L'Artusi, the Village Vanguard 20:00 set.
- Tue Sep 29 (Liberty & Lower Manhattan): R to Whitehall, 09:30 Statue City Cruises ferry (Liberty + Ellis, back ~13:00), Charging Bull/Wall St, lunch at the Tin Building, 9/11 Memorial, coffee, Brooklyn Bridge on foot at golden hour, DUMBO Washington St, dinner at Cecconi's Dumbo with Mike.
- Wed Sep 30 (Brooklyn; the Met is closed Wednesdays): brunch at Miriam, Prospect Park Long Meadow, the afternoon off at home, Brooklyn Heights Promenade, Brooklyn Bridge Park Pier 1 at sunset, dinner at Colonie with Mike.
- Thu Oct 1 (Upper East Side; Café Sabarsky reopens today): the Met from 10:45, lunch at Café Sabarsky, Central Park on foot (Bethesda Terrace, the Mall), Bemelmans Bar at 17:00 before the cover, a quick bite, 20:00 Broadway show.
- Fri Oct 2 (SoHo, then the concert): Lafayette Grand Café, SoHo shopping (Broadway, Prince, Greene), lunch at Balthazar, Elizabeth St & Nolita, home to drop bags, early dinner at Sofreh 17:50 (it opens 17:30), then TEDDY SWIMS at Barclays Center, 19:00, Section 222 Row 13, two tickets. Barclays is a 15-minute walk or two stops from home.
- Sat Oct 3 (Williamsburg + First Saturday): Devoción, Bedford Ave shops, Smorgasburg lunch, Domino Park, then the Brooklyn Museum for First Saturday (free from 17:00), farewell dinner at Olmsted with Mike, nightcap at Weather Up.
- Sun Oct 4 (departure): pack, pastries at Winner, a Green-Wood Cemetery walk, leave Park Slope by 14:00 for a 17:30 flight.

RULES OF THUMB: Museums — Met closed Wed, Whitney closed Tue, Neue Galerie closed Tue+Wed, Morgan closed Mon, Brooklyn Museum closed Mon+Tue, MoMA open daily (free Friday evenings via UNIQLO). Those closures are why the week is ordered as it is: do not propose moving the Met off Thursday or the Whitney onto a Tuesday without saying what it costs. Most Broadway shows are dark Monday; TKTS sells same-day seats. Tipping 18–22% in restaurants, $1–2 per drink at bars; sales tax 8.875% (clothing under $110 tax-free); no VAT refund. Sunset ≈ 6:45 pm Sep 26 → 6:31 pm Oct 4. If asked to replan (rain, tiredness, a late start), propose specific swaps from the plan first, keep the day's geography tight, keep the breaks, then fresh ideas. Today's date and the live plan come from the user message metadata.`;

const PLAN_SYSTEM = `You are the day-planner engine inside a New York trip app. You receive one day of an itinerary as a list of stops, a library of candidate places (each with id, name, cat, hood, dur minutes, best time, closed weekdays, lat/lng), and a request in English or Russian. Rebuild the day's running order to satisfy the request while keeping it un-crammed: 3–6 anchors, realistic subway/walking gaps (assume 10–15 min between nearby stops, 30–50 min across the river), a café or drink break in the afternoon, dinner around 7 pm, home by ~11 pm, and never schedule a place on a weekday it is closed. Locked stops (lock:true) keep their times. Prefer the same neighborhood cluster. Reply with ONLY a JSON object, no markdown fences: {"stops":[{"ref":"p:<id>" or "x:<key>" or "c:<existing custom id>","t":"HH:MM","d":<minutes>}],"note":"one or two sentences, in the request's language, saying what changed and why"}. Only use refs that exist in the input (stops or library).`;

function originOf(req) { return String(req.headers.origin || '').trim().replace(/\/$/, ''); }
function originOk(req) { return ORIGIN_OPEN || ALLOW_ORIGINS.includes(originOf(req)); }
function send(res, code, body, headers = {}, req = null) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  // Echo one specific origin rather than a blanket *, so a browser on another
  // site cannot read a reply even if it manages to send the request.
  const o = req ? originOf(req) : '';
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN_OPEN ? '*' : (ALLOW_ORIGINS.includes(o) ? o : ALLOW_ORIGINS[0]),
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Trip-Key',
    'Vary': 'Origin',
    ...headers,
  });
  res.end(data);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > limit) { req.destroy(); reject(new Error('too large')); } });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}
function textOf(msg) { return (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim(); }
function parseJson(txt) {
  const cleaned = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned); } catch (e) {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}
// Server-side refusal fallbacks are opt-in; if the account or SDK rejects the beta, retry plainly.
async function ask(params) {
  try {
    return await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) return client.messages.create(params);
    throw e;
  }
}
function apiError(res, e, req) {
  if (e instanceof Anthropic.AuthenticationError) return send(res, 502, { error: 'concierge key rejected — check ANTHROPIC_API_KEY' }, {}, req);
  if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'busy — try again in a moment' }, {}, req);
  if (e instanceof Anthropic.APIError) return send(res, 502, { error: e.message || 'upstream error' }, {}, req);
  return send(res, 500, { error: 'server error' }, {}, req);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    // Refuse the preflight outright for a disallowed origin, so the browser
    // never even sends the real request.
    if (!originOk(req)) return send(res, 403, { error: 'origin not allowed' }, {}, req);
    return send(res, 204, '', {}, req);
  }
  // /health is deliberately open and free: it is how you check the deploy from
  // a browser or curl, and it never touches the model. The bare root answers the
  // same thing, so opening the domain shows something useful — and so a platform
  // health check pointed at / does not mark a working deploy as failed.
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/' || req.url === '')) {
    return send(res, 200, {
      ok: true,
      model: MODEL,
      key: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING — /chat and /plan will fail',
      port: String(PORT),
      origins: ORIGIN_OPEN ? 'any' : ALLOW_ORIGINS,
      limits: { perAddress: RATE_PER_IP + ' / ' + RATE_WINDOW_S + 's', perDay: RATE_PER_DAY, usedToday: dayHits.length },
    }, {}, req);
  }
  if (req.method !== 'POST') return send(res, 404, { error: 'not found' }, {}, req);

  if (!originOk(req)) return send(res, 403, { error: 'origin not allowed' }, {}, req);
  // Burst limit first: it costs nothing and applies whether or not the key is right.
  const ipWait = ipLimited(req);
  if (ipWait) return send(res, 429, { error: 'too many requests — try again shortly' }, { 'Retry-After': String(ipWait) }, req);
  if ((req.headers['x-trip-key'] || '') !== TRIP_KEY) return send(res, 401, { error: 'bad trip key' }, {}, req);
  // Daily ceiling last, so only real calls count against the day's allowance.
  const dayWait = dayLimited();
  if (dayWait) return send(res, 429, { error: 'daily limit reached — the concierge is back tomorrow' }, { 'Retry-After': String(dayWait) }, req);

  if (req.url === '/chat') {
    try {
      const { messages = [], today = '', context = '' } = JSON.parse((await readBody(req, 200000)) || '{}');
      const clean = messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
      if (!clean.length || clean[clean.length - 1].role !== 'user') return send(res, 400, { error: 'need a user message' }, {}, req);
      const system = [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }];
      const volatile = [today ? `Right now for the travelers it is: ${today}.` : '', context ? `LIVE APP STATE:\n${String(context).slice(0, 6000)}` : ''].filter(Boolean).join('\n\n');
      if (volatile) system.push({ type: 'text', text: volatile });
      const msg = await ask({ model: MODEL, max_tokens: 1200, output_config: { effort: 'medium' }, system, messages: clean });
      if (msg.stop_reason === 'refusal') return send(res, 200, { reply: 'I can’t help with that one — ask me something about the trip.' }, {}, req);
      return send(res, 200, { reply: textOf(msg) }, {}, req);
    } catch (e) { return apiError(res, e, req); }
  }

  if (req.url === '/plan') {
    try {
      const body = JSON.parse((await readBody(req, 400000)) || '{}');
      const { day = '', date = '', request = '', stops = [], library = [], lang = 'en', weather = '' } = body;
      if (!Array.isArray(stops) || !request) return send(res, 400, { error: 'need stops + request' }, {}, req);
      const input = JSON.stringify({ day, date, weather, lang, stops: stops.slice(0, 40), library: library.slice(0, 400) });
      const msg = await ask({
        model: MODEL, max_tokens: 3000, output_config: { effort: 'medium' },
        system: [{ type: 'text', text: PLAN_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `REQUEST: ${String(request).slice(0, 1500)}\n\nINPUT:\n${input}` }],
      });
      if (msg.stop_reason === 'refusal') return send(res, 200, { stops: null, note: 'The planner declined that request.' }, {}, req);
      const j = parseJson(textOf(msg));
      if (!j || !Array.isArray(j.stops)) return send(res, 200, { stops: null, note: 'The planner could not draft that — try rephrasing.' }, {}, req);
      const known = new Set(stops.map((s) => s.ref).concat(library.map((p) => 'p:' + p.id)));
      const out = j.stops.filter((s) => s && known.has(s.ref) && /^\d{1,2}:\d{2}$/.test(String(s.t || ''))).map((s) => ({ ref: s.ref, t: s.t, d: Math.max(10, Math.min(600, Number(s.d) || 60)) }));
      return send(res, 200, { stops: out, note: String(j.note || '').slice(0, 600) }, {}, req);
    } catch (e) { return apiError(res, e, req); }
  }
  send(res, 404, { error: 'not found' }, {}, req);
});

// Railway reaches a container over IPv6 on some stacks and IPv4 on others, and
// a server bound to only one of them is precisely the "Application failed to
// respond" screen. Bind dual-stack where the host has IPv6, fall back where it
// does not.
function announce() {
  const a = server.address();
  console.log('concierge listening on :' + PORT + ' (' + MODEL + ')');
  console.log('  bound to      : ' + (a && typeof a === 'object' ? a.address + ' ' + a.family + ' port ' + a.port : String(a)));
  console.log('  PORT env      : ' + (process.env.PORT === undefined ? 'not set — using the 3000 fallback' : process.env.PORT));
  console.log('  anthropic key : ' + (process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING — set ANTHROPIC_API_KEY'));
  console.log('  origins       : ' + (ORIGIN_OPEN ? 'any (ALLOW_ORIGINS=* or empty)' : ALLOW_ORIGINS.join(', ')));
  console.log('  rate limit    : ' + RATE_PER_IP + ' per ' + RATE_WINDOW_S + 's per address, ' + RATE_PER_DAY + ' per day total');
}
let fellBack = false;
server.on('listening', announce);        // fires once, on whichever bind succeeds
server.on('error', (e) => {
  if (!fellBack && ['EAFNOSUPPORT', 'EADDRNOTAVAIL', 'EINVAL'].includes(e.code)) {
    fellBack = true;
    console.warn('no IPv6 on this host (' + e.code + ') — binding 0.0.0.0 instead');
    server.listen(PORT, '0.0.0.0');
    return;
  }
  console.error('could not listen on :' + PORT + ' — ' + e.message);
  process.exit(1);
});
server.listen(PORT, '::');
