// "Search all of New York", through the real UI on the smallest phone, with the
// concierge's answers stood in for: the button is there when the library has
// nothing, the results are readable and tappable, and one tap puts the place
// on the day (Add a stop) or opens it ready to add (Explore).
// Run: node scripts/lookup-test.mjs [screenshot-dir]
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
await new Promise(r => server.listen(8078, r));
let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

const NAMI = { name: 'Nami Nori', cat: 'eat', addr: '236 North 12th Street, Brooklyn', hood: 'Williamsburg', lat: 40.71971, lng: -73.95672, approx: false, web: 'https://www.naminori.nyc/', hours: 'Mo-Su 17:00-22:00', src: 'osm' };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
for (const [label, device, locale] of [['iPhone SE', devices['iPhone SE'], 'en-US'], ['iPhone SE', devices['iPhone SE'], 'ru-RU']]) {
  const ctx = await browser.newContext({ ...device, locale });
  const page = await ctx.newPage();
  page.on('pageerror', e => bad('page threw: ' + e.message));
  const asked = [];
  await ctx.route('**/places', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}'); asked.push(body);
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body.web ? { places: [Object.assign({}, NAMI, { name: 'Nami Nori West Village', addr: '33 Carmine St, New York', hood: 'West Village', src: 'web', approx: true })], source: 'web' } : { places: [NAMI, Object.assign({}, NAMI, { name: 'Nami Nori West Village', addr: '33 Carmine St, New York', hood: 'West Village', lat: 40.7302, lng: -74.0029 })], source: 'openstreetmap' }) });
  });
  await page.addInitScript(() => { try { localStorage.setItem('nyc-2026-tatyana-tour', 'done'); } catch (e) {} });
  await page.goto('http://127.0.0.1:8078/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const tag = label + ' ' + locale;
  console.log(tag + ' — Add a stop:');
  await page.click('.tbtn[data-tabbtn="days"]');
  await page.click('.chip[data-day="d2"]');
  await page.waitForTimeout(250);
  await page.click('.panel.is-active [data-addstop]');
  await page.waitForTimeout(250);
  await page.fill('#pk-q', 'Nami Nori');
  const go = page.locator('#pk-look [data-lkgo]').first();
  await go.scrollIntoViewIfNeeded();
  const gb = await go.boundingBox();
  if (!gb || gb.width < 200 || gb.x < 0 || gb.x + gb.width > 321) bad(`${tag}: the search button is not fully on screen: ${JSON.stringify(gb)}`); else ok('the search button is on screen and full width');
  if (shots) await page.screenshot({ path: `${shots}/${locale}-1-button.png` });
  await go.click();
  await page.waitForSelector('#pk-look .lkrow', { timeout: 4000 }).catch(() => bad(`${tag}: no results appeared`));
  await page.locator('#pk-look .lkrow').first().scrollIntoViewIfNeeded();
  const rb = await page.locator('#pk-look .lkrow .pk-b').first().boundingBox();
  if (!rb || rb.x + rb.width > 321 || rb.width < 30 || rb.height < 26) bad(`${tag}: a result's add button is not usable: ${JSON.stringify(rb)}`); else ok('each result has a tappable add button inside the screen');
  if (shots) await page.screenshot({ path: `${shots}/${locale}-2-results.png` });
  await page.locator('#pk-look .lkrow').first().click();
  await page.waitForTimeout(400);
  const onDay = await page.evaluate(() => { const N = window.NYC; const k = Object.keys(N.state.custom).find(x => (N.state.custom[x] || {}).name === 'Nami Nori'); return !!k && N.agIds('d2').includes('c:' + k); });
  const sheetClosed = await page.evaluate(() => document.getElementById('sheet').hidden);
  if (!onDay || !sheetClosed) bad(`${tag}: one tap did not add Nami Nori to the day and close the sheet`); else ok('one tap puts it on the day and closes the sheet');
  const row = page.locator('.panel.is-active .agrow', { hasText: 'Nami Nori' });
  if (!(await row.count())) bad(`${tag}: Nami Nori is not in the running order`);
  else { await row.first().scrollIntoViewIfNeeded(); if (shots) await page.screenshot({ path: `${shots}/${locale}-3-onday.png` }); ok('it shows in the running order'); }

  console.log(tag + ' — Explore:');
  await page.click('.tbtn[data-tabbtn="explore"]');
  await page.fill('#exsearch', 'nami nori west');
  await page.waitForTimeout(250);
  const eg = page.locator('#exlook [data-lkgo]').first();
  await eg.scrollIntoViewIfNeeded();
  await eg.click();
  await page.waitForSelector('#exlook .lkrow', { timeout: 4000 }).catch(() => bad(`${tag}: no Explore results appeared`));
  const lastRow = page.locator('#exlook .lkrow').nth(1);
  await lastRow.scrollIntoViewIfNeeded();
  if (shots) await page.screenshot({ path: `${shots}/${locale}-4-explore.png` });
  await lastRow.click();
  await page.waitForSelector('#sg-idea', { timeout: 3000 }).catch(() => bad(`${tag}: a found place did not open ready to add`));
  const ib = await page.locator('#sg-idea').boundingBox();
  if (!ib || ib.y + ib.height > 568 || ib.y < 0) bad(`${tag}: "Add as idea" is not on screen without scrolling: ${JSON.stringify(ib)}`); else ok('the found place opens with "Add as idea" on screen');
  if (shots) await page.screenshot({ path: `${shots}/${locale}-5-found.png` });
  const web = await page.locator('#exlook [data-lkgo]').count();
  if (!web) bad(`${tag}: no "search the web" offered after the map results`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — search all of New York works on a small phone, in English and Russian');
process.exit(failures ? 1 : 0);
