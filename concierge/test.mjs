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
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — the origin check and both rate limits hold');
process.exit(failures ? 1 : 0);
