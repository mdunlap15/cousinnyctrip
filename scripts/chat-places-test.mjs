// The concierge's recommendations in a real browser on a small phone: places in
// the reply are tappable, chips sit beneath it at a size a thumb can hit, and
// tapping a new place gives a filled-in idea that lands in the Plan tab.
// The concierge's answer is canned here, since the point is what the app does
// with it. Run: node scripts/chat-places-test.mjs [screenshot-dir]
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2] || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, rel === '/' ? 'index.html' : rel);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(8075, r));
let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

const places = JSON.parse(fs.readFileSync(path.join(root, 'data', 'places.js'), 'utf8').replace(/^[\s\S]*?window\.PLACES = /, '').replace(/;\s*$/, ''));
const lib = places.find(p => p.id === 'the-met') || places[0];
const CANNED = {
  reply: 'For sushi past 10 on a Wednesday, Sushi on Me in Williamsburg runs a late omakase, and Rosella in the East Village keeps its kitchen open late too. If you would rather stay in the museum mood first, ' + lib.name + ' is open until 9 on Fridays and Saturdays.',
  places: [
    { mention: 'Sushi on Me', ref: '', name: 'Sushi on Me', hood: 'Williamsburg', cat: 'eat', lat: 40.7106, lng: -73.9565, minutes: 90, why: 'a lively late omakase' },
    { mention: 'Rosella', ref: '', name: 'Rosella', hood: 'East Village', cat: 'eat', lat: 40.7262, lng: -73.9838, minutes: 75, why: 'sustainable sushi, open late' },
    { mention: lib.name, ref: 'p:' + lib.id, name: lib.name, hood: '', cat: 'museum', lat: null, lng: null, minutes: 150, why: '' },
  ],
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['iPhone SE'] });
const page = await ctx.newPage();
page.on('pageerror', e => bad('page threw: ' + e.message));
let sentLibrary = 0;
await page.route('**/chat', async (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  sentLibrary = typeof body.library === 'string' ? body.library.split('\n').length : 0;
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(CANNED) });
});
await page.goto('http://127.0.0.1:8075/', { waitUntil: 'domcontentloaded' });
await page.click('#tourskip', { timeout: 4000 }).catch(() => {});
await page.click('.who button[data-who="T"]').catch(() => {});
await page.click('.tbtn[data-tabbtn="chat"]');
await page.fill('#chatinput', 'Where is somewhere for sushi in Williamsburg that is open past 10pm on a Wednesday?');
await page.click('#chatsend');
await page.waitForSelector('#msgs .chatchip', { timeout: 5000 }).catch(() => bad('no place chips appeared under the reply'));

console.log('the reply:');
if (sentLibrary !== places.length) bad(`the request carried ${sentLibrary} library places, expected ${places.length}`);
const r = await page.evaluate(() => {
  const m = [...document.querySelectorAll('#msgs .msg.a')].pop();
  const vw = innerWidth;
  const chips = [...m.querySelectorAll('.chatchip')].map(c => { const b = c.getBoundingClientRect(); return { t: c.textContent.trim(), h: Math.round(b.height), w: Math.round(b.width), r: Math.round(b.right) }; });
  const links = [...m.querySelectorAll('.chatplace')].map(b => { const s = getComputedStyle(b); return { t: b.textContent, color: s.color, deco: s.textDecorationLine }; });
  const mb = m.getBoundingClientRect();
  return { vw, chips, links, msgRight: Math.round(mb.right) };
});
if (r.links.length !== 3) bad(`expected 3 linked places in the text, got ${r.links.length}: ${r.links.map(l => l.t).join(', ')}`);
else if (r.links.some(l => l.deco !== 'underline')) bad('a linked place is not visibly a link');
else ok(`three places are linked in the reply: ${r.links.map(l => '"' + l.t + '"').join(', ')}`);
const small = r.chips.filter(c => c.h < 34);
const off = r.chips.filter(c => c.r > r.vw);
if (small.length) bad('chips too small to tap: ' + JSON.stringify(small));
if (off.length) bad('chips run off the screen: ' + JSON.stringify(off));
if (!small.length && !off.length) ok(`${r.chips.length} chips beneath it, each at least ${Math.min(...r.chips.map(c => c.h))}px tall and on screen`);
// what is on screen the moment the reply lands, with no scrolling by hand
await page.waitForTimeout(300);
const seen = await page.evaluate(() => {
  const m = [...document.querySelectorAll('#msgs .msg.a')].pop();
  const box = document.querySelector('.chatin').getBoundingClientRect();
  const firstChip = m.querySelector('.chatchip').getBoundingClientRect();
  const top = m.getBoundingClientRect().top, head = document.querySelector('.appchrome').getBoundingClientRect().bottom;
  return { chipClear: firstChip.bottom <= box.top + 1, startVisible: top >= head - 1, fits: m.getBoundingClientRect().height <= innerHeight - 240 };
});
if (seen.fits && !seen.chipClear) bad('the reply fits on screen but its chips are hidden behind the message box');
else if (!seen.fits && !seen.startVisible) bad('a long reply opened somewhere other than its first line');
else ok(seen.fits ? 'the reply lands fully visible, chips clear of the message box' : 'a long reply opens at its first line, so it reads from the start');
if (shots) await page.screenshot({ path: path.join(shots, 'chat-reply.png') });

console.log('adding one:');
await page.locator('#msgs .msg.a').last().locator('.chatchip', { hasText: 'Rosella' }).click();
await page.waitForSelector('#sg-idea', { timeout: 3000 }).catch(() => bad('tapping a new place did not open its idea sheet'));
const sheet = await page.evaluate(() => {
  const btn = document.getElementById('sg-idea').getBoundingClientRect();
  return { name: document.getElementById('sg-name').value, min: document.getElementById('sg-min').value, btnVisible: btn.bottom <= innerHeight + 400 && btn.height > 30,
    links: [...document.querySelectorAll('#sheet .linkrow a')].map(a => a.textContent.trim()) };
});
if (sheet.name !== 'Rosella' || sheet.min !== '75') bad('the idea was not pre-filled: ' + JSON.stringify(sheet));
else ok(`the sheet opens pre-filled ("${sheet.name}", ${sheet.min} min) with ${sheet.links.join(' and ')}`);
const actionOnScreen = await page.evaluate(() => { const b = document.getElementById('sg-idea').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
if (!actionOnScreen) bad('"Add as idea" is not on screen when the sheet opens — it needs a scroll to reach');
else ok('"Add as idea" is on screen the moment the sheet opens, no scrolling');
await page.waitForTimeout(350);
if (shots) await page.screenshot({ path: path.join(shots, 'chat-suggested.png') });
await page.click('#sg-idea');
await page.waitForTimeout(400);
const chipNow = await page.locator('#msgs .msg.a').last().locator('.chatchip', { hasText: 'Rosella' }).textContent();
if (!/✓/.test(chipNow)) bad('the chip did not turn to ✓: ' + chipNow);
await page.click('.tbtn[data-tabbtn="plan"]');
await page.waitForTimeout(300);
const inPlan = await page.evaluate(() => [...document.querySelectorAll('#plan #proposals .voterow, #plan #onewants .glcard')].some(e => /Rosella/.test(e.textContent)));
if (!inPlan) bad('the new idea does not appear in the Plan tab');
else ok('one tap adds it, its chip turns to ✓, and it appears in the Plan tab with your vote');

console.log('a library place:');
await page.click('.tbtn[data-tabbtn="chat"]');
await page.locator('#msgs .msg.a').last().locator('.chatplace', { hasText: lib.name }).click();
await page.waitForTimeout(350);
const libSheet = await page.evaluate(() => ({ h: (document.querySelector('#sheet h3') || {}).textContent, links: [...document.querySelectorAll('#sheet .linkrow a')].map(a => a.textContent.trim()) }));
if (libSheet.h !== lib.name) bad('tapping a library place did not open its page: ' + JSON.stringify(libSheet));
else ok(`"${lib.name}" opens its own page: ${libSheet.links.join(', ')}`);
if (shots) await page.screenshot({ path: path.join(shots, 'chat-library.png') });

await browser.close(); server.close();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — the concierge\'s places are tappable and one tap turns them into ideas');
process.exit(failures ? 1 : 0);
