// The one link the other tests do not cover: the app in a real browser talking
// to the real proxy across origins. Boots the proxy with a fake key, serves the
// app from an allowed origin, sends a message from the Chat tab and checks the
// whole handshake — preflight, trip key, CORS on the reply, and what the app
// shows when the upstream says no. Then repeats from a disallowed origin.
// Run: node scripts/concierge-test.mjs
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROXY = 8084;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' };

// serve the app, but with config.js rewritten to point at the local proxy
function serve(port) {
  const s = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/config.js') {
      const cfg = fs.readFileSync(path.join(root, 'config.js'), 'utf8')
        .replace(/CONCIERGE_URL: "[^"]*"/, `CONCIERGE_URL: "http://127.0.0.1:${PROXY}"`);
      res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(cfg); return;
    }
    const p = path.join(root, rel === '/' ? 'index.html' : rel);
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(fs.readFileSync(p));
  });
  return new Promise((r) => s.listen(port, () => r(s)));
}

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

// the proxy, with its SHIPPED origin defaults — 127.0.0.1:8080 is on that list,
// 127.0.0.1:8081 deliberately is not
const proxy = spawn(process.execPath, [path.join(root, 'concierge', 'index.js')], {
  env: { ...process.env, PORT: String(PROXY), TRIP_KEY: 'nyc-2026', ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key', ALLOW_ORIGINS: undefined },
  stdio: ['ignore', 'pipe', 'pipe'],
});
delete proxy.env;
let boot = '';
proxy.stdout.on('data', (d) => { boot += d; }); proxy.stderr.on('data', (d) => { boot += d; });
await new Promise((r) => { const t = setInterval(() => { if (/listening on/.test(boot)) { clearInterval(t); r(); } }, 50); setTimeout(() => { clearInterval(t); r(); }, 6000); });
if (!/listening on/.test(boot)) { console.error('proxy did not start:\n' + boot); process.exit(1); }
console.log('proxy up with its shipped defaults:');
console.log('  ' + boot.trim().split('\n').filter((l) => /origins/.test(l)).join('').trim());

const allowed = await serve(8080);
const refused = await serve(8081);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

async function askFrom(origin) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  // Chromium reports the real request but not its CORS preflight, so a POST
  // appearing here is itself proof that the preflight was accepted.
  const seen = [];
  page.on('response', (r) => { if (r.url().includes(String(PROXY))) seen.push(`${r.request().method()} ${r.status()}`); });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.click('#tourskip').catch(() => {});
  await page.click('.tbtn[data-tabbtn="chat"]');
  await page.waitForTimeout(400);
  const setupVisible = await page.evaluate(() => !document.getElementById('chatsetup').hidden);
  await page.fill('#chatinput', 'Where should we eat near the Met?');
  await page.click('#chatsend');
  await page.waitForTimeout(2500);
  const msgs = await page.$$eval('#msgs .msg', (ns) => ns.map((n) => n.textContent.trim()));
  await ctx.close();
  return { seen, msgs, last: msgs[msgs.length - 1] || '', setupVisible };
}

console.log('from the app\'s own origin (127.0.0.1:8080, on the allowlist):');
const a = await askFrom('http://127.0.0.1:8080/');
if (a.setupVisible) bad('the Chat tab still shows its setup card — CONCIERGE_URL did not take');
else ok('the Chat tab is wired up, not showing the setup card');
if (!a.seen.some((s) => s.startsWith('POST'))) bad('the message never reached the proxy — the CORS preflight must have been refused');
else ok(`the preflight passes and the message reaches the proxy (${a.seen.filter((s) => s.startsWith('POST')).join(', ')})`);
// the fake key means the upstream refuses; the point is the app READS the reply,
// which it can only do if the CORS headers on the response are right
if (/key rejected/.test(a.last)) ok(`the app reads the proxy's reply across origins: "${a.last}"`);
else bad(`the app did not show the proxy's reply — it showed: "${a.last}"`);

console.log('from an origin that is not on the list (127.0.0.1:8081):');
const b = await askFrom('http://127.0.0.1:8081/');
const blocked = b.seen.every((s) => !s.startsWith('POST 200')) ;
if (!blocked) bad('a disallowed origin got a successful POST through');
else ok(`the browser is refused (${b.seen.join(', ') || 'blocked before any request'})`);
if (/key rejected/.test(b.last)) bad('a disallowed origin could still read the proxy\'s reply');
else ok(`the app falls back to its own error text instead: "${b.last}"`);

await browser.close(); allowed.close(); refused.close(); proxy.kill();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — the app and the proxy talk to each other, and only from the right origin');
process.exit(failures ? 1 : 0);
