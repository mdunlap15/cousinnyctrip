// Adding your own stop with a map link, through the real UI on a phone:
// the fields are on screen and usable, the stop lands on the day with real
// travel time to it, and its sheet carries the shared links.
// Run: node scripts/custom-stop-test.mjs [screenshot-dir]
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
await new Promise(r => server.listen(8079, r));
let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['iPhone SE'] });   // the smallest screen they might hold
const page = await ctx.newPage();
page.on('pageerror', e => bad('page threw: ' + e.message));
await page.goto('http://127.0.0.1:8079/', { waitUntil: 'domcontentloaded' });
await page.click('#tourskip', { timeout: 4000 }).catch(() => {});
await page.click('.tbtn[data-tabbtn="days"]');
await page.click('.chip[data-day="d1"]');
await page.waitForTimeout(300);

console.log('the form, on a small phone:');
await page.click('.panel.is-active [data-addstop]');
await page.waitForTimeout(300);
await page.locator('#pk-cmap').scrollIntoViewIfNeeded();
const boxes = await page.evaluate(() => ['#pk-cname', '#pk-cmin', '#pk-cadd', '#pk-cmap', '#pk-cweb'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return { s, w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) }; }));
const vw = page.viewportSize().width;
for (const b of boxes) {
  if (b.w < 40 || b.h < 30) bad(`${b.s} is too small to use (${b.w}×${b.h})`);
  if (b.l < 0 || b.r > vw) bad(`${b.s} runs off the screen (${b.l}–${b.r} of ${vw})`);
}
const mapBox = boxes.find(b => b.s === '#pk-cmap');
if (mapBox.w < vw * 0.6) bad(`the map link field is cramped (${mapBox.w}px wide) — a long link will be unreadable`);
if (!failures) ok(`every field is on screen and big enough; the map link gets ${mapBox.w}px of a ${vw}px screen`);
if (shots) await page.screenshot({ path: path.join(shots, 'custom-form.png') });

console.log('adding one:');
const LINK = 'https://www.google.com/maps/place/Lucali/@40.6818,-73.9990,17z/data=!3d40.681801!4d-73.999012';
await page.fill('#pk-cname', 'Pizza at Lucali');
await page.fill('#pk-cmap', LINK);
await page.fill('#pk-cweb', 'lucali.com');
await page.click('#pk-cadd');
await page.waitForTimeout(500);
const row = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.panel.is-active .agrow')];
  const el = rows.find(r => /Lucali/.test(r.textContent)); if (!el) return null;
  let gap = el.previousElementSibling; while (gap && !gap.classList.contains('aggap')) gap = gap.previousElementSibling === null ? null : (gap.classList.contains('agrow') ? null : gap.previousElementSibling);
  return { text: el.textContent.replace(/\s+/g, ' ').trim(), gap: el.previousElementSibling && el.previousElementSibling.classList.contains('aggap') ? el.previousElementSibling.textContent.trim() : '', noloc: !!el.querySelector('.nolocation') };
});
if (!row) bad('the stop did not appear in the day\'s running order');
else {
  if (row.noloc) bad('the stop is marked as having no location despite the map link');
  if (!/min (by subway|walk)/.test(row.gap)) bad(`the gap before it does not show real travel: "${row.gap}"`);
  else ok(`it lands on the day, and the line above it reads "${row.gap}"`);
}
if (shots) { await page.locator('.panel.is-active .agrow', { hasText: 'Lucali' }).scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(shots, 'custom-row.png') }); }

console.log('its sheet:');
await page.locator('.panel.is-active .agrow', { hasText: 'Lucali' }).locator('.ag-link').click();
await page.waitForTimeout(350);
const sheet = await page.evaluate(() => ({
  links: [...document.querySelectorAll('#sheet .linkrow a')].map(a => [a.textContent.trim(), a.getAttribute('href')]),
  status: (document.querySelector('#sheet .custloc') || {}).textContent || '',
  meta: (document.querySelector('#sheet .meta') || {}).textContent || '',
}));
const has = (label, pred) => sheet.links.some(([t, h]) => t === label && pred(h));
if (!has('Website', h => h === 'https://lucali.com/')) bad('no Website button to lucali.com');
if (!has('Map', h => h === LINK)) bad('the Map button does not open the link that was shared');
if (!has('Directions', h => /maps\/dir/.test(h))) bad('no Directions button');
if (!/On the map/.test(sheet.status)) bad(`the sheet does not say the stop is on the map: "${sheet.status}"`);
if (!/~\d+ min from home/.test(sheet.meta)) bad(`the sheet does not say how far it is from home: "${sheet.meta}"`);
if (sheet.links.length >= 3 && /On the map/.test(sheet.status)) ok(`${sheet.links.map(l => l[0]).join(', ')}; "${sheet.meta.trim()}"`);
if (shots) await page.screenshot({ path: path.join(shots, 'custom-sheet.png') });

await browser.close(); server.close();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — your own stops get a map pin, real travel times and their links');
process.exit(failures ? 1 : 0);
