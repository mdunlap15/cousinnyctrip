// NYC 2026 Trip Concierge — tiny proxy so the Anthropic key never touches the client.
// Env: ANTHROPIC_API_KEY (required), MODEL (optional), TRIP_KEY (optional shared secret), PORT
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'claude-opus-5';
const TRIP_KEY = process.env.TRIP_KEY || 'nyc-2026';
const client = new Anthropic();

// ════════════════════════════════════════════════════════════════════
// ██  TRIP BRIEF — the only trip-specific part of this file.        ██
// ════════════════════════════════════════════════════════════════════
const SYSTEM = `You are the concierge living inside the trip app for Tatyana's first visit to New York, hosted by her cousin Yulia and Yulia's husband Mike. Be warm, brief and concrete; short paragraphs; no bullet walls. Answer in the language you are asked in — English or Russian. When unsure about current hours, prices or availability, say so and point to the venue link in the app.

WHO: Tatyana (from Hannover, Germany, Russian-speaking, 40s, first time in NYC) and Yulia (lives here). Mike joins for dinner and drinks on some evenings — when he is on, suggest places that suit a table of three. They like the big first-timer sights, museums, shopping (department stores and women's boutiques), good restaurants, cocktail and hotel-lobby bars, cafés for breaks. They do NOT want crammed days: 3–5 anchors a day, real breaks, home by about 11 pm most nights.

BASE: 490A 7th Avenue, Brooklyn 11215 (Park Slope, 7th Ave & 16th St). Subway: 15th St–Prospect Park and 7th Ave (F/G), 4th Ave–9th St (F/G/R), Union St (R), Grand Army Plaza (2/3). Rough door-to-door: DUMBO 25 min, FiDi 35, SoHo 35, West Village 40, Chelsea 42, Midtown 45–50, Upper East Side 55, Williamsburg 35, Coney Island 50. Pay with OMNY (tap a contactless card or phone; weekly cap after 12 rides). Taxi/Uber home from Manhattan late at night ≈ $35–55.

FLIGHTS: Sat Sep 26 2026 — LH 41 Hannover 08:40 → Frankfurt; LH 400 Frankfurt 10:55 → JFK Terminal 1 13:35. Sun Oct 4 — LH 411 JFK Terminal 1 17:30 → Munich 07:20 Mon; LH 4072 Munich 11:15 → Hannover 12:25. Leave Park Slope by 14:00 on Oct 4.

THE SEEDED PLAN (editable in the app; the user message may include the live version — prefer that):
- Sat Sep 26: land 13:35, taxi home (~1 h), shower and a slow 7th Ave walk, early dinner at al di là, early night (jet lag: +6 h).
- Sun Sep 27 (Brooklyn): brunch at Miriam, Prospect Park Long Meadow, Brooklyn Botanic Garden, Brooklyn Heights Promenade, Brooklyn Bridge Park Pier 1 at sunset (6:42 pm), dinner at Colonie with Mike.
- Mon Sep 28 (Lower Manhattan): R to Whitehall, 9:30 Statue City Cruises ferry (Statue + Ellis Island, back ~1:30), Charging Bull/Wall St, lunch at the Tin Building, 9/11 Memorial, Oculus, coffee, Brooklyn Bridge walk at golden hour (~5:20), DUMBO Washington St, dinner at Cecconi's DUMBO with Mike.
- Tue Sep 29 (Midtown): Grand Central, St. Patrick's, Rockefeller Center, lunch at Lodi, Saks, Tiffany Landmark, Bergdorf Goodman + Goodman's Bar, Top of the Rock at 5:45 (sunset 6:40), quick bite, 8 pm Broadway show, Times Square lights after.
- Wed Sep 30 (West Side; the Met is closed Wednesdays): Little Island, Whitney, Chelsea Market lunch, High Line north, Shops at Hudson Yards, A/C/E to the Village, Bleecker St boutiques, aperitivo at Bar Pisellino, dinner at L'Artusi (or Via Carota walk-in) with Mike, Village Vanguard 8 pm set.
- Thu Oct 1 (Upper East Side): the Met 10–1, lunch at Café Sabarsky, Central Park (Bethesda Terrace, Bow Bridge, the Mall), Madison Ave boutiques, Bemelmans Bar at 5:35 before the cover, dinner at JG Melon.
- Fri Oct 2 (SoHo/Nolita): Lafayette Grand Café, SoHo shopping (Broadway, Prince, Greene), lunch at Balthazar, Elizabeth St boutiques, Chinatown/Little Italy stroll, Dante, Rubirosa with Mike, Comedy Cellar late show.
- Sat Oct 3 (Williamsburg + Prospect Heights): Devoción, Bedford Ave shops, Smorgasburg Williamsburg lunch, Domino Park, Sey Coffee, Brooklyn Museum First Saturday (free from 5 pm), farewell dinner at Olmsted with Mike, nightcap at Weather Up.
- Sun Oct 4: pack, pastries at Winner, Green-Wood Cemetery walk, taxi to JFK by 2 pm.

RULES OF THUMB: Museums — Met closed Wed, Whitney closed Tue, Neue Galerie closed Tue+Wed, Morgan closed Mon, Brooklyn Museum closed Mon+Tue, MoMA open daily (free Friday evenings via UNIQLO). Most Broadway shows are dark Monday; TKTS sells same-day seats. Tipping 18–22% in restaurants, $1–2 per drink at bars; sales tax 8.875% (clothing under $110 tax-free); no VAT refund. Sunset ≈ 6:45 pm Sep 26 → 6:31 pm Oct 4. If asked to replan (rain, tiredness, a late start), propose specific swaps from the plan first, keep the day's geography tight, keep the breaks, then fresh ideas. Today's date and the live plan come from the user message metadata.`;

const PLAN_SYSTEM = `You are the day-planner engine inside a New York trip app. You receive one day of an itinerary as a list of stops, a library of candidate places (each with id, name, cat, hood, dur minutes, best time, closed weekdays, lat/lng), and a request in English or Russian. Rebuild the day's running order to satisfy the request while keeping it un-crammed: 3–6 anchors, realistic subway/walking gaps (assume 10–15 min between nearby stops, 30–50 min across the river), a café or drink break in the afternoon, dinner around 7 pm, home by ~11 pm, and never schedule a place on a weekday it is closed. Locked stops (lock:true) keep their times. Prefer the same neighborhood cluster. Reply with ONLY a JSON object, no markdown fences: {"stops":[{"ref":"p:<id>" or "x:<key>" or "c:<existing custom id>","t":"HH:MM","d":<minutes>}],"note":"one or two sentences, in the request's language, saying what changed and why"}. Only use refs that exist in the input (stops or library).`;

function send(res, code, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Trip-Key',
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
function apiError(res, e) {
  if (e instanceof Anthropic.AuthenticationError) return send(res, 502, { error: 'concierge key rejected' });
  if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'busy — try again in a moment' });
  if (e instanceof Anthropic.APIError) return send(res, 502, { error: e.message || 'upstream error' });
  return send(res, 500, { error: 'server error' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, model: MODEL });
  if (req.method !== 'POST') return send(res, 404, { error: 'not found' });
  if ((req.headers['x-trip-key'] || '') !== TRIP_KEY) return send(res, 401, { error: 'bad trip key' });

  if (req.url === '/chat') {
    try {
      const { messages = [], today = '', context = '' } = JSON.parse((await readBody(req, 200000)) || '{}');
      const clean = messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
      if (!clean.length || clean[clean.length - 1].role !== 'user') return send(res, 400, { error: 'need a user message' });
      const system = [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }];
      const volatile = [today ? `Right now for the travelers it is: ${today}.` : '', context ? `LIVE APP STATE:\n${String(context).slice(0, 6000)}` : ''].filter(Boolean).join('\n\n');
      if (volatile) system.push({ type: 'text', text: volatile });
      const msg = await ask({ model: MODEL, max_tokens: 1200, output_config: { effort: 'medium' }, system, messages: clean });
      if (msg.stop_reason === 'refusal') return send(res, 200, { reply: 'I can’t help with that one — ask me something about the trip.' });
      return send(res, 200, { reply: textOf(msg) });
    } catch (e) { return apiError(res, e); }
  }

  if (req.url === '/plan') {
    try {
      const body = JSON.parse((await readBody(req, 400000)) || '{}');
      const { day = '', date = '', request = '', stops = [], library = [], lang = 'en', weather = '' } = body;
      if (!Array.isArray(stops) || !request) return send(res, 400, { error: 'need stops + request' });
      const input = JSON.stringify({ day, date, weather, lang, stops: stops.slice(0, 40), library: library.slice(0, 400) });
      const msg = await ask({
        model: MODEL, max_tokens: 3000, output_config: { effort: 'medium' },
        system: [{ type: 'text', text: PLAN_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `REQUEST: ${String(request).slice(0, 1500)}\n\nINPUT:\n${input}` }],
      });
      if (msg.stop_reason === 'refusal') return send(res, 200, { stops: null, note: 'The planner declined that request.' });
      const j = parseJson(textOf(msg));
      if (!j || !Array.isArray(j.stops)) return send(res, 200, { stops: null, note: 'The planner could not draft that — try rephrasing.' });
      const known = new Set(stops.map((s) => s.ref).concat(library.map((p) => 'p:' + p.id)));
      const out = j.stops.filter((s) => s && known.has(s.ref) && /^\d{1,2}:\d{2}$/.test(String(s.t || ''))).map((s) => ({ ref: s.ref, t: s.t, d: Math.max(10, Math.min(600, Number(s.d) || 60)) }));
      return send(res, 200, { stops: out, note: String(j.note || '').slice(0, 600) });
    } catch (e) { return apiError(res, e); }
  }
  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log('concierge on :' + PORT + ' (' + MODEL + ')'));
