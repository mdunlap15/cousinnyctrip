// Real-browser check: loads the app in Chromium at iPhone size, walks the tabs,
// screenshots each, and fails on any console error or unhandled rejection.
// Run: node scripts/shots.mjs [outdir]
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, '.shots');
fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(8099, r));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
// the first-run tour covers the screen; scripts/tour-test.mjs walks it properly,
// these shots are of the app underneath
await page.waitForSelector('#tourwrap:not([hidden])', { timeout: 4000 }).catch(() => {});
await page.click('#tourskip').catch(() => {});
await page.waitForTimeout(600);

const shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(out, name + '.png'), fullPage: false }); console.log('  · ' + name); };
const tab = async (which) => { await page.click(`.tbtn[data-tabbtn="${which}"]`); await page.waitForTimeout(350); };

console.log('screenshots:');
await shot('01-home');
// pick a traveler so voting works
await page.click('#home .who button:nth-child(2)').catch(() => {});
await tab('days'); await shot('02-day-today');
await page.click('.chip[data-day="d2"]'); await shot('03-day-d2');
await page.click('.chip[data-day="d5"]'); await shot('04-day-d5');
await tab('explore'); await shot('05-explore');
await page.click('#exlist .card'); await page.waitForTimeout(400); await shot('06-place-sheet');
await page.click('#sheet .closebtn');
await page.click('#swipebtn'); await page.waitForTimeout(400); await shot('07-swipe');
await page.click('#swipebtn');
await tab('plan'); await shot('08-plan');
await tab('map'); await page.waitForTimeout(2200); await shot('09-map');
await tab('chat'); await shot('10-chat');
await tab('more'); await shot('11-more');
await page.click('#more .mitem[data-go="bookings"]'); await shot('12-bookings');
await tab('more'); await page.click('#more .mitem[data-go="guide"]');
await page.click('#guidesections details:first-child summary'); await shot('13-guide');
// Russian
await page.click('#langbtn'); await page.waitForTimeout(400); await shot('14-guide-ru');
await tab('days'); await shot('15-day-ru');
await page.click('#langbtn');

// tall capture of one full day for reading the running order
await page.setViewportSize({ width: 390, height: 1400 });
await tab('days'); await page.click('.chip[data-day="d3"]'); await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, '16-day-d3-tall.png'), fullPage: true });
console.log('  · 16-day-d3-tall');

await browser.close(); server.close();
if (errors.length) { console.error('\nRUNTIME ERRORS:'); errors.forEach(e => console.error('  ✗ ' + e)); process.exit(1); }
console.log('\nno console errors');
process.exit(0);
