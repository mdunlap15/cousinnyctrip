// The onboarding tour, in a real browser with real layout: it must start by
// itself on a first visit, spotlight a genuine on-screen element at every step,
// keep its card inside the viewport and clear of the spotlight, and never run
// again once it has been finished or skipped.
// Run: node scripts/tour-test.mjs
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, rel === '/' ? 'index.html' : rel);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(8096, r));

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

// The step walk runs on the smallest phone either of them is likely to hold as
// well as a current one: the card and the spotlight have to share a short screen.
for (const [label, device, locale] of [['iPhone 13', devices['iPhone 13'], 'en-US'], ['iPhone SE', devices['iPhone SE'], 'de-DE'], ['Pixel 7', devices['Pixel 7'] || devices['Pixel 5'], 'ru-RU']]) {
const ctx = await browser.newContext({ ...device, locale });
const page = await ctx.newPage();
page.on('pageerror', e => bad('page threw: ' + e.message));
// the tour shows the search, it never runs one
let searches = 0; page.on('request', (r) => { if (/\/places$/.test(r.url())) searches++; });
const before = failures;

// ---------- 1) it starts by itself on a first visit ----------
console.log(label + ' — first run:');
await page.goto('http://127.0.0.1:8096/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#tourwrap:not([hidden])', { timeout: 6000 }).catch(() => bad(`${label}: the tour did not open by itself on a first visit`));
if (failures === before) ok('the tour opens by itself, no tap needed');

const steps = await page.evaluate(() => (window.TOUR.steps || []).map(s => ({ key: s.key, sel: s.sel, tab: s.tab, day: s.day, open: s.open })));
const vh = page.viewportSize().height, vw = page.viewportSize().width;

console.log(`${label} — ${steps.length} steps on ${vw}x${vh}, in ${await page.evaluate(() => document.body.dataset.lang)}:`);
const shown = [];
for (let n = 0; n < steps.length + 3; n++) {
  const on = await page.evaluate(() => window.NYC.tourOn);
  if (!on) break;
  const s = await page.evaluate(() => {
    const i = window.NYC.tourStep, st = window.NYC.TOUR[i];
    const spot = document.getElementById('tourspot'), card = document.getElementById('tourcard');
    const el = st.sel ? document.querySelector(st.sel) : null;
    const box = (n) => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
    return {
      i, key: st.key, sel: st.sel || '', tab: document.body.dataset.tab, open: st.open || '',
      sheetUp: !document.getElementById('sheet').hidden, inSheet: !!(el && el.closest('#sheet')),
      searchBox: document.getElementById('exsearch').value, lookBtn: !!document.querySelector('#exlook [data-lkgo]'),
      title: document.getElementById('tourtitle').textContent.trim(),
      body: document.getElementById('tourbody').textContent.trim(),
      spotHidden: spot.hidden, spot: spot.hidden ? null : box(spot), card: box(card),
      target: el ? box(el) : null,
      dots: document.querySelectorAll('#tourdots i.on').length,
      next: document.getElementById('tournext').textContent.trim(),
      prevHidden: document.getElementById('tourprev').hidden,
    };
  });
  shown.push(s.key);
  const where = `${label} step ${s.i + 1} "${s.key}"`;
  if (!s.title) bad(`${where}: no title`);
  if (!s.body) bad(`${where}: no body`);
  if (s.dots !== 1) bad(`${where}: ${s.dots} progress dots lit, expected 1`);
  if (s.i === 0 && !s.prevHidden) bad(`${where}: Back is offered on the first step`);
  if (s.sel) {
    if (!s.target) bad(`${where}: ${s.sel} is not in the DOM`);
    else if (s.target.w < 1 || s.target.h < 1) bad(`${where}: ${s.sel} has no box (${s.target.w}x${s.target.h})`);
    if (s.spotHidden) bad(`${where}: no spotlight although the step points at ${s.sel}`);
    else {
      if (s.spot.y < 0 || s.spot.b > vh + 1 || s.spot.x < 0 || s.spot.r > vw + 1) bad(`${where}: spotlight is off screen (${Math.round(s.spot.x)},${Math.round(s.spot.y)} ${Math.round(s.spot.w)}x${Math.round(s.spot.h)})`);
      if (s.target) {
        const ox = Math.max(0, Math.min(s.spot.r, s.target.r) - Math.max(s.spot.x, s.target.x));
        const oy = Math.max(0, Math.min(s.spot.b, s.target.b) - Math.max(s.spot.y, s.target.y));
        if (ox < Math.min(s.spot.w, s.target.w) * 0.7) bad(`${where}: spotlight is not over ${s.sel} horizontally (${Math.round(ox)}px of ${Math.round(s.target.w)})`);
        if (oy < Math.min(60, s.target.h) * 0.7) bad(`${where}: spotlight is not over ${s.sel} vertically (${Math.round(oy)}px of ${Math.round(s.target.h)})`);
      }
      const overlap = !(s.card.b <= s.spot.y || s.card.y >= s.spot.b);
      if (overlap) bad(`${where}: the card covers the thing it is pointing at`);
    }
  } else if (!s.spotHidden) bad(`${where}: a spotlight is shown but the step points at nothing`);
  if (s.key === 'exlookup' && (s.searchBox !== 'Nami Nori' || !s.lookBtn)) bad(`${where}: the example is not typed in, or the search button is not showing (box "${s.searchBox}")`);
  // a step that opens a sheet has it up, pointing inside it; every other step has none
  if (s.open && (!s.sheetUp || !s.inSheet)) bad(`${where}: the ${s.open} sheet is not open around ${s.sel}`);
  if (!s.open && s.sheetUp) bad(`${where}: a sheet the tour opened earlier is still up`);
  if (s.card.y < 0 || s.card.b > vh + 1) bad(`${where}: the card is off screen (top ${Math.round(s.card.y)}, bottom ${Math.round(s.card.b)}, viewport ${vh})`);
  if (s.i === steps.length - 1 && s.next.length < 2) bad(`${where}: the last step has no closing button`);
  await page.click('#tournext');
  await page.waitForTimeout(220);
}
const missed = steps.map(s => s.key).filter(k => !shown.includes(k));
if (missed.length) bad(`${label}: these steps never appeared: ${missed.join(', ')}`);
else if (failures === before) ok(`all ${steps.length} steps spotlight a real element, card on screen and clear of it`);
if (await page.evaluate(() => window.NYC.tourOn)) bad(`${label}: the tour was still open after the last step`);
else ok('the last step closes the tour');
const after = await page.evaluate(() => ({ box: document.getElementById('exsearch').value, look: document.getElementById('exlook').textContent.trim() }));
if (after.box || after.look) bad(`${label}: after the tour the Explore search still shows the tour's example ("${after.box}" / "${after.look.slice(0, 60)}")`);
else if (searches) bad(`${label}: the tour ran ${searches} real search(es)`);
else ok('the search step types an example without searching, and the search box is put back afterwards');
const sheetSteps = steps.filter(s => s.open).map(s => s.key);
if (sheetSteps.length < 2) bad(`${label}: expected the Replan and place steps to open sheets, found ${sheetSteps.join(', ') || 'none'}`);
if (label !== 'iPhone 13') { await ctx.close(); continue; }

// ---------- 2) it does not come back ----------
console.log('afterwards:');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
if (await page.evaluate(() => !document.getElementById('tourwrap') || document.getElementById('tourwrap').hidden)) ok('a second visit does not replay the tour');
else bad('the tour opened again on a second visit');

// ---------- 3) the replay button in More brings it back ----------
await page.click('.tbtn[data-tabbtn="more"]');
await page.waitForTimeout(250);
await page.click('#tourreplay');
await page.waitForTimeout(500);
if (await page.evaluate(() => window.NYC.tourOn)) ok('More → "Start the tour" replays it');
else bad('the replay button in More did not start the tour');
await page.evaluate(() => { const i = window.NYC.TOUR.findIndex(s => s.key === 'replanask'); window.NYC.tourGo(i, 1); });
await page.waitForTimeout(250);
await page.click('#tourskip');
await page.waitForTimeout(200);
if (await page.evaluate(() => window.NYC.tourOn)) bad('Skip did not close the tour');
else if (await page.evaluate(() => !document.getElementById('sheet').hidden)) bad('skipping the tour on the Replan step left the Replan sheet open');
else ok('skipping while the tour has a sheet open closes the sheet too');

// ---------- 4) it survives a language switch mid-tour ----------
await page.click('.tbtn[data-tabbtn="more"]');
await page.waitForTimeout(250);
await page.click('#tourreplay');
await page.waitForTimeout(400);
await page.click('#tournext'); await page.waitForTimeout(250);
const langBefore = await page.evaluate(() => ({ i: window.NYC.tourStep, t: document.getElementById('tourtitle').textContent.trim() }));
await page.click('#langbtn');
await page.waitForTimeout(350);
const langAfter = await page.evaluate(() => ({ i: window.NYC.tourStep, t: document.getElementById('tourtitle').textContent.trim(), lang: document.body.dataset.lang }));
if (langAfter.i !== langBefore.i) bad(`switching language mid-tour jumped from step ${langBefore.i} to ${langAfter.i}`);
else if (langAfter.t === langBefore.t) bad(`switching to ${langAfter.lang} left the tour text in English`);
else ok(`switching language mid-tour keeps your place and re-reads in ${langAfter.lang}`);

await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — the tour runs end to end on a phone');
process.exit(failures ? 1 : 0);
