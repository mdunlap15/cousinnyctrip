// Proves the install promise: load the app, let the service worker cache it,
// then cut the network and reload. The app must still open and render a day.
// Run: node scripts/offline-test.mjs
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' };
let serving = true;
const server = http.createServer((req, res) => {
  if (!serving) { req.socket.destroy(); return; }            // simulate being offline
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, rel === '/' ? 'index.html' : rel);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(8098, r));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'allow' });
const page = await ctx.newPage();
let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

// 1) first visit, service worker installs and caches the shell
await page.goto('http://127.0.0.1:8098/', { waitUntil: 'networkidle' });
const registered = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.register('sw.js').catch(e => ({ error: String(e) }));
  if (reg && reg.error) return reg.error;
  await navigator.serviceWorker.ready;
  return 'ready';
});
if (registered !== 'ready') bad('service worker did not register: ' + registered); else ok('service worker registered and ready');

// a first visit opens the onboarding tour, which deliberately blocks taps; the
// rest of this test is about the app, so dismiss it the way a reader would
await page.waitForSelector('#tourwrap:not([hidden])', { timeout: 4000 }).catch(() => {});
await page.click('#tourskip').catch(() => {});
await page.waitForTimeout(200);

// give the install handler time to populate the cache, then confirm what is in it
await page.waitForTimeout(2500);
const cached = await page.evaluate(async () => {
  const keys = await caches.keys();
  if (!keys.length) return { keys: [], urls: [] };
  const c = await caches.open(keys[0]);
  const reqs = await c.keys();
  return { keys, urls: reqs.map(r => new URL(r.url).pathname) };
});
if (!cached.keys.length) bad('nothing was cached'); else ok(`cache "${cached.keys[0]}" holds ${cached.urls.length} entries`);
for (const need of ['/index.html', '/app.js', '/app.css', '/data/places.js', '/data/plan.js', '/data/tour.js']) {
  if (!cached.urls.includes(need)) bad(`${need} is not in the cache — it will not open offline`);
}
if (!failures) ok('every file the app needs is cached');

// 2) cut the network and reload
serving = false;
await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => bad('offline reload threw: ' + e.message));
await page.waitForTimeout(1500);

const state = await page.evaluate(() => ({
  title: document.title,
  days: document.querySelectorAll('.chip').length,
  places: (window.PLACES || []).length,
  rows: document.querySelectorAll('.agrow').length,
  tabs: document.querySelectorAll('.tbtn').length,
}));
if (!state.days) bad('no day chips rendered offline'); else ok(`offline: ${state.days} days, ${state.places} places, ${state.rows} running-order rows`);
if (!state.places) bad('the places library did not load offline');

// 3) the app is still interactive with no network
await page.click('.tbtn[data-tabbtn="explore"]').catch(() => {});
await page.waitForTimeout(600);
const cards = await page.locator('#exlist .card').count();
if (!cards) bad('Explore rendered no cards offline'); else ok(`offline: Explore lists ${cards} cards`);
await page.click('.tbtn[data-tabbtn="days"]').catch(() => {});
await page.waitForTimeout(400);
const active = await page.evaluate(() => { const p = document.querySelector('.panel.is-active'); return p && p.id; });
if (!active) bad('navigation broke offline'); else ok(`offline: navigation works (showing ${active})`);

await browser.close(); server.close();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — the app opens and works with no network');
process.exit(failures ? 1 : 0);
