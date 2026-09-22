// Checks the app is actually installable on both platforms, and that the
// in-app hint matches the phone it is being read on.
// Run: node scripts/install-test.mjs
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
await new Promise(r => server.listen(8097, r));

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.error('  ✗ ' + m); };

// ---------- 1) the manifest, against Chrome's installability rules ----------
console.log('manifest:');
const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const f of ['name', 'short_name', 'start_url', 'display', 'icons']) if (!man[f]) bad(`manifest has no ${f}`);
if (!['standalone', 'fullscreen', 'minimal-ui'].includes(man.display)) bad(`display "${man.display}" will not install as an app`);
const sizes = (man.icons || []).map(i => i.sizes);
if (!sizes.includes('192x192')) bad('no 192x192 icon — Android will refuse to install');
if (!sizes.includes('512x512')) bad('no 512x512 icon — Android will refuse to install');
const maskable = (man.icons || []).some(i => String(i.purpose || '').includes('maskable'));
if (!maskable) bad('no maskable icon — the Android launcher will letterbox it');
for (const i of man.icons || []) {
  const p = path.join(root, i.src);
  if (!fs.existsSync(p)) bad(`icon missing on disk: ${i.src}`);
}
if (!man.theme_color) bad('no theme_color — the Android status bar will not be themed');
if (!failures) ok(`name "${man.name}", display ${man.display}, icons ${sizes.join(' + ')}, maskable, themed`);

// iOS needs its own tags, since it ignores most of the manifest
console.log('iOS tags:');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [re, what] of [
  [/name="apple-mobile-web-app-capable"\s+content="yes"/, 'apple-mobile-web-app-capable'],
  [/rel="apple-touch-icon"/, 'apple-touch-icon'],
  [/name="apple-mobile-web-app-title"/, 'apple-mobile-web-app-title'],
]) if (!re.test(html)) bad(`index.html is missing ${what}`);
if (fs.existsSync(path.join(root, 'icon-180.png'))) ok('apple-touch-icon present at 180×180 with a home-screen title');

// a service worker with a fetch handler is required for an Android install prompt
console.log('service worker:');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!/addEventListener\(\s*['"]fetch['"]/.test(sw)) bad('sw.js has no fetch handler — Android will not offer to install');
else ok('sw.js handles fetch, so Chrome treats the app as installable');

// ---------- 2) the in-app hint on each phone ----------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
for (const [label, device] of [['iPhone', devices['iPhone 13']], ['Android', devices['Pixel 7'] || devices['Pixel 5']]]) {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8097/', { waitUntil: 'domcontentloaded' });
  // the first-run tour hides the install banner while it is up — dismiss it first
  await page.waitForSelector('#tourwrap:not([hidden])', { timeout: 4000 }).catch(() => {});
  await page.click('#tourskip').catch(() => {});
  await page.waitForTimeout(500);
  const seen = await page.evaluate(() => {
    const vis = (el) => !!el && !el.hidden && getComputedStyle(el).display !== 'none';
    const banner = document.querySelector('.install');
    return {
      bannerShown: document.body.classList.contains('show-install') && vis(banner),
      ios: vis(document.getElementById('hint-ios')),
      android: vis(document.getElementById('hint-android')),
      text: (banner ? banner.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 90),
    };
  });
  console.log(`${label}:`);
  if (!seen.bannerShown) bad(`${label}: no install banner shown`);
  if (label === 'iPhone' && !seen.ios) bad('iPhone: the Safari "Add to Home Screen" hint is not the one showing');
  if (label === 'Android' && !seen.android) bad('Android: the Chrome menu hint is not the one showing');
  if (label === 'Android' && seen.ios) bad('Android: the iPhone hint is showing instead');
  if (!failures) ok(`${label}: "${seen.text}"`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS — installable on iPhone and Android, with the right hint on each');
process.exit(failures ? 1 : 0);
