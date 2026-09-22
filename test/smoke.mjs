// Headless smoke test — run before EVERY deploy (npm test).
// 1) tag balance, 2) boots index.html in jsdom with config + data + app.js eval'd in
// order, 3) clicks the dock, every day chip, More-menu items, opens a place sheet,
// votes, builds the week, 4) checks trip data: seed refs resolve, coords in NYC,
// ids unique, day fits. STRICT (--strict) also fails on placeholder data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html');
const STRICT = process.env.STRICT === '1' || process.argv.includes('--strict');
let failures = 0;
const fail = (m) => { failures++; console.error('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

console.log('tag balance:');
for (const tag of ['div', 'section', 'button', 'span', 'main', 'header', 'footer', 'nav', 'label', 'a', 'select', 'p']) {
  const open = (html.match(new RegExp('<' + tag + '(?=[\\s>])', 'g')) || []).length;
  const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  if (open !== close) fail(`<${tag}> open ${open} != close ${close}`);
}
if (!failures) ok('all checked tags balanced');

console.log('boot:');
const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom; const { document } = window;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.fetch = () => Promise.resolve({ ok: true, json: async () => ({ daily: null }) });
window.scrollTo = () => {}; window.Element.prototype.scrollIntoView = () => {};
window.navigator.geolocation = { getCurrentPosition: () => {} };
window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.URL.createObjectURL = () => 'blob:x'; window.URL.revokeObjectURL = () => {};
try { window.localStorage.clear(); } catch (e) {}
let booted = true;
try {
  for (const f of ['config.js', 'data/geo.js', 'data/plan.js', 'data/places.js', 'data/guide.js', 'data/tour.js', 'app.js']) window.eval(read(f));
  ok('config + data + app.js eval\'d with no exception');
} catch (e) { booted = false; fail('script eval threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 5).join(' | ') : e)); }

if (booted) {
  const T = window.TRIP, NYC = window.NYC, PLACES = window.PLACES || [];
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  console.log('interactions:');
  const chips = [...document.querySelectorAll('.chip')];
  if (chips.length !== T.DAYS.length) fail(`chips ${chips.length} != DAYS ${T.DAYS.length}`); else ok(`daystrip: ${chips.length} chips`);
  for (const d of T.DAYS) if (!document.getElementById(d.key)) fail(`day panel #${d.key} missing`);
  const expect = { home: 'home', days: 'days', explore: 'explore', plan: 'plan', map: 'map', chat: 'chat', more: 'more' };
  for (const b of document.querySelectorAll('.tbtn')) { click(b); if (document.body.dataset.tab !== expect[b.dataset.tabbtn]) fail(`dock "${b.dataset.tabbtn}" -> data-tab="${document.body.dataset.tab}"`); }
  ok('dock: all buttons switch body[data-tab]');
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'more'));
  for (const m of document.querySelectorAll('#more .mitem')) { click(m); const ap = document.querySelector('.panel.is-active'); if (!ap || ap.id !== m.dataset.go) fail(`More item "${m.dataset.go}" did not navigate (active: ${ap && ap.id})`); click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'more')); }
  ok('More menu: every item navigates');
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'days'));
  for (const c of chips) { click(c); const p = document.querySelector('.panel.is-active'); if (!p || p.id !== c.dataset.day) fail(`chip ${c.dataset.day}: active panel is ${p && p.id}`); if (!document.querySelector('.agwrap[data-agday="' + c.dataset.day + '"] .agrow')) fail(`day ${c.dataset.day} has no running-order rows`); }
  ok('chips: every day panel activates with rows');
  // explore + sheet + vote
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'explore'));
  const cards = document.querySelectorAll('#exlist .card');
  if (!cards.length) fail('explore renders no cards'); else { click(cards[0]); if (document.getElementById('sheet').hidden) fail('tapping a card did not open the sheet'); else ok('explore: card opens the place sheet'); }
  NYC.me = 'Y'; const vb = document.querySelector('#sheet [data-vote="yes"]'); if (vb) { click(vb); }
  const firstId = cards.length ? cards[0].dataset.card : null;
  if (firstId && !(NYC.state.vote['p:' + firstId] && NYC.state.vote['p:' + firstId].Y === 'yes')) fail('voting from the sheet did not store the vote'); else ok('vote stored');
  document.querySelector('#sheet .closebtn') && click(document.querySelector('#sheet .closebtn'));
  // language toggle cycles en → ru → de → en, and every day page re-renders in each
  const lb = document.getElementById('langbtn');
  for (const want of ['ru', 'de', 'en']) {
    click(lb);
    if (document.body.dataset.lang !== want) fail(`langbtn: expected ${want}, got ${document.body.dataset.lang}`);
    if (document.documentElement.lang !== want) fail(`<html lang> not updated to ${want}`);
    const d0 = document.querySelector('#' + T.DAYS[1].key + ' .dt');
    if (!d0 || !d0.textContent.trim()) fail(`day title empty in ${want}`);
    const rows = document.querySelectorAll('.agwrap[data-agday="' + T.DAYS[1].key + '"] .agrow');
    if (!rows.length) fail(`running order empty in ${want}`);
    for (const r of rows) if (!r.querySelector('.ag-t').textContent.trim()) fail(`empty stop label in ${want}`);
  }
  ok('language toggle cycles en → ru → de, every day renders in each');
  // guided tour: every step must switch tab, find its element and say something
  console.log('tour:');
  const TOUR = (window.TOUR && window.TOUR.steps) || [];
  if (!TOUR.length) fail('data/tour.js defines no steps');
  for (const st of TOUR) {
    if (!st.key) fail('a tour step has no key');
    for (const f of ['title', 'titleRu', 'titleDe', 'body', 'bodyRu', 'bodyDe']) {
      if (!st[f] || !String(st[f]).trim()) fail(`tour step "${st.key}" has no ${f}`);
    }
    if (st.sel) { try { document.querySelector(st.sel); } catch (e) { fail(`tour step "${st.key}" selector is invalid: ${st.sel}`); } }
    if (st.day && !T.DAYS.some(d => d.key === st.day)) fail(`tour step "${st.key}" points at unknown day ${st.day}`);
  }
  ok(`${TOUR.length} steps, all trilingual`);
  for (const want of ['en', 'ru', 'de']) {
    while (document.body.dataset.lang !== want) click(lb);
    NYC.tourStart();
    if (!NYC.tourOn) { fail(`tour did not start in ${want}`); break; }
    const seen = [];
    for (let guard = 0; guard < TOUR.length + 4 && NYC.tourOn; guard++) {
      const i = NYC.tourStep;
      if (i < 0) { fail(`tour lost its place in ${want}`); break; }
      const ttl = document.getElementById('tourtitle').textContent.trim();
      const bdy = document.getElementById('tourbody').textContent.trim();
      if (!ttl) fail(`tour step ${TOUR[i].key} has an empty title in ${want}`);
      if (!bdy) fail(`tour step ${TOUR[i].key} has an empty body in ${want}`);
      if (want !== 'en' && ttl === TOUR[i].title && TOUR[i].title !== TOUR[i][want === 'ru' ? 'titleRu' : 'titleDe']) fail(`tour step ${TOUR[i].key} fell back to English in ${want}`);
      const st = TOUR[i];
      if (st.day && document.body.dataset.tab !== 'days') fail(`tour step ${st.key} did not open the day pages`);
      if (st.tab && !st.day && document.body.dataset.tab !== st.tab) fail(`tour step ${st.key} did not switch to the ${st.tab} tab (on ${document.body.dataset.tab})`);
      if (st.sel && !document.querySelector(st.sel)) fail(`tour step ${st.key} was shown but ${st.sel} is not in the DOM`);
      seen.push(st.key);
      click(document.getElementById('tournext'));
    }
    if (NYC.tourOn) { fail(`tour never finished in ${want}`); NYC.tourEnd(true); }
    if (seen.length !== TOUR.length) fail(`tour showed ${seen.length}/${TOUR.length} steps in ${want}: ${seen.join(',')}`);
    if (!document.getElementById('tourwrap').hidden) fail(`tour overlay stayed up after the last step in ${want}`);
  }
  ok('tour walks all ' + TOUR.length + ' steps in en, ru and de and closes at the end');
  // Back steps backwards, Skip closes it, and both remember that it was seen
  NYC.tourStart(); click(document.getElementById('tournext')); click(document.getElementById('tournext'));
  const mid = NYC.tourStep;
  click(document.getElementById('tourprev'));
  if (NYC.tourStep >= mid) fail('tour Back did not go back a step');
  click(document.getElementById('tourskip'));
  if (NYC.tourOn) fail('tour Skip did not close the tour');
  if (window.localStorage.getItem(NYC.TOURKEY) !== 'skipped') fail('Skip did not record that the tour was seen (' + NYC.TOURKEY + ')');
  ok('Back, Skip and the replay button behave');
  if (!document.getElementById('tourreplay')) fail('no "run the tour again" button in More');
  while (document.body.dataset.lang !== 'en') click(lb);

  // build week runs
  try { const r = NYC.buildWeek(); ok('buildWeek ran (' + Object.keys(r.plan).length + ' days touched)'); } catch (e) { fail('buildWeek threw: ' + e.message); }
  try { const ics = NYC.buildICS(); if (!/BEGIN:VEVENT/.test(ics)) fail('ICS has no events'); else ok('ICS builds (' + (ics.match(/BEGIN:VEVENT/g) || []).length + ' events)'); } catch (e) { fail('buildICS threw: ' + e.message); }

  console.log('trip data:');
  const ids = new Set(); PLACES.forEach(p => { if (ids.has(p.id)) fail('duplicate place id ' + p.id); ids.add(p.id); });
  PLACES.forEach(p => {
    if (!p.id || !p.name || !p.cat || !p.hood) fail('place missing core fields: ' + JSON.stringify(p).slice(0, 80));
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || p.lat < 40.49 || p.lat > 40.92 || p.lng < -74.27 || p.lng > -73.68) fail(`"${p.name}" coords outside NYC: ${p.lat},${p.lng}`);
    if (!['see', 'museum', 'show', 'eat', 'drink', 'cafe', 'shop', 'park', 'walk', 'daytrip'].includes(p.cat)) fail(`"${p.name}" bad cat ${p.cat}`);
    for (const u of ['web', 'tickets', 'reserve', 'menu', 'ig']) if (p[u] && !/^https?:\/\//.test(p[u])) fail(`"${p.name}" ${u} is not a URL: ${p[u]}`);
    if (Array.isArray(p.closed)) for (const c of p.closed) if (!['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(c)) fail(`"${p.name}" bad closed day ${c}`);
  });
  const missing = [];
  Object.entries(T.SEED).forEach(([d, arr]) => arr.forEach(([ref]) => { if (ref.startsWith('p:') && !ids.has(ref.slice(2))) missing.push(d + ':' + ref); if (ref.startsWith('x:') && !T.STOPS[ref.slice(2)]) fail('seed ' + d + ' references unknown stop ' + ref); }));
  if (missing.length) (STRICT ? fail : (m) => console.warn('  ! ' + m))('seed refs missing from the library: ' + missing.join(', '));
  else ok('every seeded place exists in the library');
  const rainMissing = []; Object.values(T.RAIN || {}).forEach(a => a.forEach(id => { if (!ids.has(id)) rainMissing.push(id); }));
  if (rainMissing.length) console.warn('  ! rain swaps missing from the library: ' + [...new Set(rainMissing)].join(', '));
  (T.BOOK || []).forEach(b => { if (!b.id.startsWith('x:') && !ids.has(b.id)) console.warn('  ! BOOK references missing place ' + b.id); });
  // closed-day conflicts in the seeded plan
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  T.DAYS.forEach(d => { const dow = DOW[new Date(d.date + 'T12:00:00').getDay()]; (T.SEED[d.key] || []).forEach(([ref]) => { const p = window.NYC.PL[ref.slice(2)]; if (ref.startsWith('p:') && p && Array.isArray(p.closed) && p.closed.includes(dow)) fail(`seeded ${p.name} on ${d.key} (${dow}) but it is closed that day`); }); });
  // stops scheduled before the door opens — a venue's own hours vs. the plan
  const opensAt = (h) => {
    if (!h) return null;
    const m = String(h).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[–\-—]/i);
    if (!m) return null;
    let hh = Number(m[1]); const mm = Number(m[2] || 0); const ap = (m[3] || '').toLowerCase();
    if (ap === 'pm' && hh < 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
    if (!ap && hh <= 7) hh += 12;
    return hh * 60 + mm;
  };
  T.DAYS.forEach(d => {
    for (const r of NYC.agReflow(d.key, NYC.agIds(d.key))) {
      const p = r.it.place; if (!p || !p.hours) continue;
      const o = opensAt(p.hours); if (o == null) continue;
      if (r.start < o - 5) console.warn(`  ! ${d.key}: ${p.name} is scheduled at ${Math.floor(r.start/60)}:${String(r.start%60).padStart(2,'0')} but opens ~${Math.floor(o/60)}:${String(o%60).padStart(2,'0')} ("${p.hours}")`);
    }
  });
  // pace of the seeded days
  T.DAYS.forEach(d => { const rows = NYC.agReflow(d.key, NYC.agIds(d.key)); const st = NYC.dayStats(d.key, rows); if (st.lvl >= 3) console.warn(`  ! ${d.key} seeded pace is crammed (${st.anchors} anchors, ${st.travel} min transit)`); });
  ok('seed/day sanity checked (' + PLACES.length + ' places)');
  if (STRICT) {
    if (PLACES.length < 150) fail('STRICT: library has only ' + PLACES.length + ' places');
    if (PLACES.some(p => p.verified === 'placeholder')) fail('STRICT: placeholder places still in data/places.js');
    if (!fs.existsSync(path.join(root, 'icon-192.png'))) fail('STRICT: icon-192.png missing');
    if (!fs.existsSync(path.join(root, 'trip.ics'))) fail('STRICT: trip.ics missing');
  }
}
console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
