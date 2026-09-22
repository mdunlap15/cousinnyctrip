// Checks the two guards in front of the API bill, without spending anything:
// the origin allowlist and the two rate limits. Boots the proxy on a spare port
// with tiny limits, then drives it with fetch.
// Run: node concierge/test.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8089, BASE = `http://127.0.0.1:${PORT}`;
const GOOD = 'https://mdunlap15.github.io', BAD = 'https://evil.example';
const KEY = 'test-key';

const child = spawn(process.execPath, [path.join(here, 'index.js')], {
  env: { ...process.env, PORT: String(PORT), TRIP_KEY: KEY, ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
         ALLOW_ORIGINS: GOOD, RATE_PER_IP: '5', RATE_WINDOW_S: '60', RATE_PER_DAY: '3' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let boot = '';
child.stdout.on('data', (d) => { boot += d; });
child.stderr.on('data', (d) => { boot += d; });
await new Promise((r) => { const t = setInterval(() => { if (/listening on/.test(boot)) { clearInterval(t); r(); } }, 50); setTimeout(() => { clearInterval(t); r(); }, 6000); });

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };
const post = (origin, key, url = '/chat') => fetch(BASE + url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(key ? { 'X-Trip-Key': key } : {}) },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
});

console.log('boot:');
if (!/listening on/.test(boot)) bad('the proxy did not start:\n' + boot);
else ok('starts and reports its config: ' + boot.trim().split('\n').slice(1).map((l) => l.trim()).join(' | '));

console.log('health:');
const h = await fetch(BASE + '/health').then((r) => r.json()).catch((e) => ({ error: String(e) }));
if (!h.ok) bad('/health did not answer ok: ' + JSON.stringify(h));
else ok(`/health answers: key ${h.key}, origins ${JSON.stringify(h.origins)}, ${h.limits.perAddress} per address`);
if (h.port !== String(PORT)) bad(`/health reports port ${h.port}, expected ${PORT}`);

console.log('origin check:');
const r1 = await post(BAD, KEY);
if (r1.status !== 403) bad(`a request from ${BAD} got ${r1.status}, expected 403`); else ok('a request from another site is refused');
const pre = await fetch(BASE + '/chat', { method: 'OPTIONS', headers: { Origin: BAD } });
if (pre.status !== 403) bad(`the preflight from ${BAD} got ${pre.status}, expected 403`); else ok('its preflight is refused too, so the browser never sends the real request');
const preOk = await fetch(BASE + '/chat', { method: 'OPTIONS', headers: { Origin: GOOD } });
if (preOk.status !== 204) bad(`the preflight from the app got ${preOk.status}, expected 204`);
else if (preOk.headers.get('access-control-allow-origin') !== GOOD) bad('the preflight did not echo the app origin back');
else ok('the app\'s own preflight passes and is echoed a single origin, not *');
const maxAge = Number(preOk.headers.get('access-control-max-age') || 0);
if (!(maxAge > 0)) bad('the preflight is not cacheable — every message will pay for an extra round trip');
else ok(`the browser may reuse that preflight for ${maxAge}s instead of repeating it per message`);
if (pre.headers.get('access-control-max-age')) bad('a refused preflight is being cached');
const r2 = await post(null, KEY);
if (r2.status !== 403) bad(`a request with no Origin got ${r2.status}, expected 403`); else ok('a request with no Origin at all is refused');

console.log('key check:');
const r3 = await post(GOOD, 'wrong-key');
if (r3.status !== 401) bad(`a wrong trip key got ${r3.status}, expected 401`); else ok('a wrong trip key is refused');

console.log('rate limits:');
// 5 per address per 60s; 4 are already spent above (r1 counted, r2 counted, r3 counted... only POSTs past the origin check count)
let seen429 = 0, seenOther = 0;
for (let i = 0; i < 8; i++) { const r = await post(GOOD, KEY); if (r.status === 429) seen429++; else seenOther++; }
if (!seen429) bad('hammering the proxy never produced a 429');
else ok(`the burst limit kicks in: ${seenOther} let through, ${seen429} refused with 429`);
const last = await post(GOOD, KEY);
if (last.status === 429 && !last.headers.get('retry-after')) bad('the 429 carries no Retry-After header');
else if (last.status === 429) ok(`a refused request says when to come back (Retry-After: ${last.headers.get('retry-after')}s)`);

// the daily cap is 3, and it only counts requests that got past the key check
const body = await last.json().catch(() => ({}));
if (last.status === 429 && !/daily|too many/.test(body.error || '')) bad('the 429 does not say why: ' + JSON.stringify(body));

console.log('the app itself still gets through:');
// a fresh address dodges the per-address window; the daily cap should now bite
const r4 = await fetch(BASE + '/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: GOOD, 'X-Trip-Key': KEY, 'X-Forwarded-For': '203.0.113.9' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
});
const b4 = await r4.json().catch(() => ({}));
if (r4.status === 429 && /daily/.test(b4.error || '')) ok('once the day\'s allowance is gone, even a new address is turned away');
else if (r4.status === 502 || r4.status === 200) ok('a request from the app reaches the model (upstream answered ' + r4.status + ')');
else bad(`a legitimate request got ${r4.status}: ${JSON.stringify(b4)}`);

child.kill();

// ---- the workspace header reaches the wire ----
// An org-level API key is refused unless the request names a workspace. Point
// the SDK at a local stand-in for the API and check what actually arrives.
console.log('workspace header:');
const http = await import('node:http');
let seenHeaders = null;
const fakeApi = http.createServer((req, res) => {
  seenHeaders = req.headers;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: 'claude-opus-5', stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'hello from the stand-in' }], usage: { input_tokens: 1, output_tokens: 1 } }));
});
await new Promise((r) => fakeApi.listen(8083, r));
const ws = spawn(process.execPath, [path.join(here, 'index.js')], {
  env: { ...process.env, PORT: '8082', TRIP_KEY: KEY, ANTHROPIC_API_KEY: 'sk-ant-org-level', ANTHROPIC_WORKSPACE_ID: 'wrkspc_test123',
         ANTHROPIC_BASE_URL: 'http://127.0.0.1:8083', ALLOW_ORIGINS: GOOD },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let wsBoot = ''; ws.stdout.on('data', (d) => { wsBoot += d; }); ws.stderr.on('data', (d) => { wsBoot += d; });
await new Promise((r) => { const t = setInterval(() => { if (/listening on/.test(wsBoot)) { clearInterval(t); r(); } }, 50); setTimeout(() => { clearInterval(t); r(); }, 6000); });
const wr = await fetch('http://127.0.0.1:8082/chat', { method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: GOOD, 'X-Trip-Key': KEY },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) });
const wj = await wr.json().catch(() => ({}));
if (!seenHeaders) bad('the proxy never called the API stand-in');
else if (seenHeaders['anthropic-workspace-id'] !== 'wrkspc_test123') bad(`the API got no workspace header (saw: ${seenHeaders['anthropic-workspace-id'] || 'none'})`);
else ok('with ANTHROPIC_WORKSPACE_ID set, every API call carries anthropic-workspace-id');
if (wj.reply !== 'hello from the stand-in') bad('the reply did not come back through: ' + JSON.stringify(wj));
else ok('and the reply comes back through to the app');
if (!/workspace\s+:\s+wrkspc_test123/.test(wsBoot)) bad('the boot log does not say which workspace is pinned');
ws.kill(); fakeApi.close();

// ---- the map-link resolver ----
// Driven with a scripted fetch, since the real short-link service is not
// reachable from a test. Each script maps a URL to the response it gets.
console.log('map link resolver:');
const { resolveMapsLink } = await import('./resolve.js');
function scripted(routes) {
  const calls = [];
  const f = async (href) => {
    calls.push(href);
    const r = routes[href];
    if (!r) throw new Error('unscripted fetch: ' + href);
    if (r === 'throw') throw new Error('network down');
    const headers = new Map(Object.entries(r.headers || {}));
    const body = r.body != null ? new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(r.body)); c.close(); } }) : null;
    return { status: r.status, headers: { get: (k) => headers.get(k.toLowerCase()) || null }, body };
  };
  f.calls = calls; return f;
}
const LONG = 'https://www.google.com/maps/place/Lucali/@40.6818,-73.999,17z/data=!3d40.681801!4d-73.999012';
async function check(label, input, routes, want) {
  const f = scripted(routes);
  const out = await resolveMapsLink(input, { fetchImpl: f, timeoutMs: 500 });
  const pass = want.url ? out.url === want.url : !!out.error;
  if (want.noFetch && f.calls.length) { bad(`${label}: it fetched ${f.calls[0]} when it should not have fetched anything`); return; }
  if (pass) ok(`${label}${want.url ? '' : ' — refused: ' + out.error}`); else bad(`${label}: got ${JSON.stringify(out)}`);
}
await check('a Google share link expands to the long URL with the coordinates', 'https://maps.app.goo.gl/AbC123',
  { 'https://maps.app.goo.gl/AbC123': { status: 302, headers: { location: LONG } } }, { url: LONG });
await check('an old goo.gl/maps link follows two hops', 'https://goo.gl/maps/Xyz',
  { 'https://goo.gl/maps/Xyz': { status: 301, headers: { location: 'https://maps.app.goo.gl/AbC123' } },
    'https://maps.app.goo.gl/AbC123': { status: 302, headers: { location: LONG } } }, { url: LONG });
await check('Google\'s EU consent page is read for its destination, never fetched', 'https://maps.app.goo.gl/Eu1',
  { 'https://maps.app.goo.gl/Eu1': { status: 302, headers: { location: 'https://consent.google.com/ml?continue=' + encodeURIComponent(LONG) } } }, { url: LONG });
await check('a page that points onward instead of redirecting is read (first 64 KB only)', 'https://maps.app.goo.gl/Pg1',
  { 'https://maps.app.goo.gl/Pg1': { status: 200, body: '<html><head><meta property="og:url" content="' + LONG + '"></head></html>' } }, { url: LONG });
await check('a long link is handed straight back with no fetch at all', LONG, {}, { url: LONG, noFetch: true });
// the ways it could be abused
await check('a redirect off to another site', 'https://maps.app.goo.gl/Bad1',
  { 'https://maps.app.goo.gl/Bad1': { status: 302, headers: { location: 'https://evil.example/steal' } } }, {});
await check('a look-alike host (google.com.evil.example)', 'https://maps.app.goo.gl/Bad2',
  { 'https://maps.app.goo.gl/Bad2': { status: 302, headers: { location: 'https://google.com.evil.example/maps/place/x' } } }, {});
await check('a downgrade to plain http', 'https://maps.app.goo.gl/Bad3',
  { 'https://maps.app.goo.gl/Bad3': { status: 302, headers: { location: 'http://www.google.com/maps/place/x' } } }, {});
await check('the cloud metadata address', 'http://169.254.169.254/latest/meta-data/', {}, { noFetch: true });
await check('an internal hostname', 'https://railway.internal/admin', {}, { noFetch: true });
await check('a consent page smuggling a non-map destination', 'https://consent.google.com/ml?continue=https://evil.example/', {}, { noFetch: true });
await check('an endless redirect loop', 'https://maps.app.goo.gl/Loop',
  { 'https://maps.app.goo.gl/Loop': { status: 302, headers: { location: 'https://maps.app.goo.gl/Loop' } } }, {});
await check('the map service being unreachable', 'https://maps.app.goo.gl/Down', { 'https://maps.app.goo.gl/Down': 'throw' }, {});

// ---- and the route in front of it ----
const rv = spawn(process.execPath, [path.join(here, 'index.js')], {
  env: { ...process.env, PORT: '8081', TRIP_KEY: KEY, ANTHROPIC_API_KEY: 'sk-x', ALLOW_ORIGINS: GOOD, RATE_PER_DAY: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let rvBoot = ''; rv.stdout.on('data', (d) => { rvBoot += d; }); rv.stderr.on('data', (d) => { rvBoot += d; });
await new Promise((r) => { const t = setInterval(() => { if (/listening on/.test(rvBoot)) { clearInterval(t); r(); } }, 50); setTimeout(() => { clearInterval(t); r(); }, 6000); });
const resolveCall = (key) => fetch('http://127.0.0.1:8081/resolve', { method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: GOOD, ...(key ? { 'X-Trip-Key': key } : {}) }, body: JSON.stringify({ url: LONG }) });
const rNoKey = await resolveCall(null);
if (rNoKey.status !== 401) bad(`/resolve without the trip key got ${rNoKey.status}, expected 401`); else ok('/resolve needs the trip key like everything else');
// a daily allowance of ONE: three resolves must all succeed and leave it untouched
let allOk = true;
for (let i = 0; i < 3; i++) { const r = await resolveCall(KEY); const j = await r.json(); if (r.status !== 200 || j.url !== LONG) allOk = false; }
const hh = await fetch('http://127.0.0.1:8081/health').then((r) => r.json());
if (!allOk) bad('/resolve did not answer with the expanded URL');
else if (hh.limits.usedToday !== 0) bad(`/resolve spent the model allowance (usedToday ${hh.limits.usedToday})`);
else ok('three resolves under a daily allowance of one: all served, allowance untouched');
rv.kill();

// ---- chat replies that name places ----
// A stand-in API that records the request and answers with whatever the test
// scripts next, so what the proxy asks for and what it passes on are both seen.
console.log('chat with linked places:');
const { parseChatReply } = await import('./chatformat.js');
let lastReq = null, nextAnswer = null;
const api2 = http.createServer(async (req, res) => {
  let b = ''; for await (const c of req) b += c;
  lastReq = JSON.parse(b || '{}');
  const a = nextAnswer || {};
  if (a.status) {
    res.writeHead(a.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type: 'error', error: { type: a.errType || 'not_found_error', message: a.message || 'not found' } }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ id: 'msg_y', type: 'message', role: 'assistant', model: 'claude-opus-5', stop_reason: a.stop || 'end_turn',
    content: [{ type: 'text', text: a.text || '' }], usage: { input_tokens: 1, output_tokens: 1 } }));
});
await new Promise((r) => api2.listen(8077, r));
const cp = spawn(process.execPath, [path.join(here, 'index.js')], {
  env: { ...process.env, PORT: '8076', TRIP_KEY: KEY, ANTHROPIC_API_KEY: 'sk-x', ANTHROPIC_BASE_URL: 'http://127.0.0.1:8077', ALLOW_ORIGINS: GOOD },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let cpBoot = ''; cp.stdout.on('data', (d) => { cpBoot += d; }); cp.stderr.on('data', (d) => { cpBoot += d; });
await new Promise((r) => { const t = setInterval(() => { if (/listening on/.test(cpBoot)) { clearInterval(t); r(); } }, 50); setTimeout(() => { clearInterval(t); r(); }, 6000); });
const LIB = 'the-met | The Metropolitan Museum of Art | museum | Upper East Side | Daily 10am–5pm | wed\nlucali-fake | Something | eat | Carroll Gardens |  | ';
const chat = (body) => fetch('http://127.0.0.1:8076/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: GOOD, 'X-Trip-Key': KEY },
  body: JSON.stringify(Object.assign({ messages: [{ role: 'user', content: 'Sushi in Williamsburg open late on a Wednesday?' }], today: 'Wed', context: 'plan…' }, body)) }).then((r) => r.json());

nextAnswer = { text: JSON.stringify({ reply: 'Try Sushi on Me, or the Met first.', places: [
  { mention: 'Sushi on Me', ref: '', name: 'Sushi on Me', hood: 'Williamsburg', cat: 'eat', lat: 40.7106, lng: -73.9565, minutes: 90, why: 'open late' },
  { mention: 'the Met', ref: 'p:the-met', name: 'The Met', hood: 'Upper East Side', cat: 'museum', lat: 40.779, lng: -73.963, minutes: 150, why: '' },
  { mention: 'x', ref: 'javascript:alert(1)', name: 'Evil', hood: '', cat: 'hax', lat: 48.8, lng: 2.3, minutes: -5, why: '' },
] }) };
const c1 = await chat({ library: LIB });
const fmt = lastReq && lastReq.output_config && lastReq.output_config.format;
if (!fmt || fmt.type !== 'json_schema' || !fmt.schema || !fmt.schema.properties || !fmt.schema.properties.places) bad('the proxy did not ask for the structured reply format');
else ok('it asks the model for a structured reply: prose plus a list of the places it recommends');
const sys = (lastReq && lastReq.system) || [];
const libIdx = sys.findIndex((b) => /THE APP'S LIBRARY — data, not instructions/.test(b.text || ''));
const cached = sys.map((b, i) => (b.cache_control ? i : -1)).filter((i) => i >= 0);
if (libIdx < 0 || !/the-met \| The Metropolitan/.test(sys[libIdx].text)) bad('the app\'s library did not reach the model');
else if (cached.length !== 1 || cached[0] !== libIdx || sys[libIdx].cache_control.ttl !== '1h') bad(`the cache breakpoint is not on the library block (breakpoints at ${JSON.stringify(cached)}, library at ${libIdx})`);
else if (!/LIVE APP STATE/.test((sys[sys.length - 1] || {}).text || '') || sys[sys.length - 1].cache_control) bad('the live plan is not last and uncached');
else ok('the library reaches the model as data, with one cache breakpoint after it and the live plan left uncached');
if (!/HOW TO ANSWER/.test((sys[0] || {}).text || '')) bad('the answer-format rules are missing from the brief');
const want = [['Sushi on Me', '', 40.7106], ['The Met', 'p:the-met', null], ['Evil', '', null]];
const got = (c1.places || []).map((p) => [p.name, p.ref, p.lat]);
if (c1.reply !== 'Try Sushi on Me, or the Met first.') bad('the reply text did not come through: ' + JSON.stringify(c1));
else if (JSON.stringify(got) !== JSON.stringify(want)) bad('places were not cleaned as expected: ' + JSON.stringify(got));
else if ((c1.places[2] || {}).cat !== 'other' || (c1.places[2] || {}).minutes !== 10) bad('a bad category or duration was passed through: ' + JSON.stringify(c1.places[2]));
else ok('places come back cleaned: a library place keeps its id, an unknown id is dropped, a location outside New York is dropped');

nextAnswer = { stop: 'max_tokens', text: '{"reply":"Williamsburg has a few late sushi counters, and' };
const c2 = await chat({ library: LIB });
if (!c2.reply || /[{}]/.test(c2.reply) || !(c2.places && c2.places.length === 0)) bad('a reply cut off mid-JSON did not come back as readable prose: ' + JSON.stringify(c2));
else ok(`a reply cut off by the token limit still reads: "${c2.reply}"`);

nextAnswer = { stop: 'refusal', text: '' };
const c3 = await chat({ library: LIB });
if (c3.reply || c3.code !== 'refusal' || (c3.places || []).length) bad('a refusal should come back as a coded failure, not as the model\'s reply: ' + JSON.stringify(c3));
else ok('a refusal comes back as a coded failure the app can translate, never as something the model said');

nextAnswer = { text: '' };
const cEmpty = await fetch('http://127.0.0.1:8076/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: GOOD, 'X-Trip-Key': KEY },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], library: LIB }) });
const cEmptyJ = await cEmpty.json();
if (cEmpty.status === 200 || cEmptyJ.reply || !cEmptyJ.code) bad('an empty answer was passed off as a reply: ' + cEmpty.status + ' ' + JSON.stringify(cEmptyJ));
else ok('an empty answer from the model is a coded failure, not an English stand-in reply');
// a workspace id that is wrong, or that the key cannot use, comes back as a 404
nextAnswer = { status: 404, message: 'Workspace `wrkspc_bad` not found.' };
const c404 = await fetch('http://127.0.0.1:8076/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: GOOD, 'X-Trip-Key': KEY },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) });
const c404j = await c404.json();
if (c404j.code !== 'setup') bad('a wrong workspace id should read as a setup problem, not "try again": ' + JSON.stringify(c404j));
else ok('a wrong workspace id reads as a setup problem, not as something retrying will fix');
nextAnswer = { text: 'Plain prose from a model that ignored the format.' };
const c4 = await chat({});
const sys4 = lastReq.system || [];
if (c4.reply !== 'Plain prose from a model that ignored the format.') bad('plain prose was not passed through: ' + JSON.stringify(c4));
else if (sys4.some((b) => /THE APP'S LIBRARY — data/.test(b.text || '')) || !sys4[0].cache_control) bad('with no library sent, the brief itself should carry the cache breakpoint');
else ok('an older app that sends no library still works, and plain prose is passed through as it is');

nextAnswer = { text: JSON.stringify({ reply: 'ok', places: [] }) };
// under the request-size limit, but well over the library cap
await chat({ library: 'x | y | eat | z |  | \n'.repeat(5000) });
const libBlock = (lastReq.system || []).find((b) => /THE APP'S LIBRARY — data/.test(b.text || ''));
if (!libBlock || libBlock.text.length > 60200) bad(`an oversized library was not capped (${libBlock && libBlock.text.length} chars)`);
else ok(`a caller cannot inflate the prompt: a ${Math.round(105000 / 1000)} KB library is cut to ${Math.round(libBlock.text.length / 1000)} KB`);
// and a request over the proxy's size limit is refused before it is even read
const tooBig = await fetch('http://127.0.0.1:8076/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: GOOD, 'X-Trip-Key': KEY },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], library: 'z'.repeat(300000) }) }).then((r) => r.status).catch(() => 'refused');
if (tooBig === 200) bad('a request over the size limit was accepted');
else ok('a request over the size limit is refused outright (' + tooBig + ')');
cp.kill(); api2.close();

console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — origin check, rate limits, workspace header, the map-link resolver and linked chat replies all hold');
process.exit(failures ? 1 : 0);
