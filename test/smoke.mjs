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

  // ---- your own stops, with a map link ----
  console.log('custom stops with map links:');
  const G = window.GEO;
  const LUCALI = 'https://www.google.com/maps/place/Lucali/@40.6818,-73.9990,17z/data=!3d40.681801!4d-73.999012';
  // the parser, on the shapes people actually paste
  const shapes = [
    ['Google place link', LUCALI, 40.681801, -73.999012],
    ['Google, German domain', 'https://www.google.de/maps/place/Balthazar/@40.7226,-73.9981,17z', 40.7226, -73.9981],
    ['Apple Maps', 'https://maps.apple.com/?ll=40.6818,-73.9990&q=Lucali', 40.6818, -73.999],
    ['a bare "lat, lng"', '40.7128, -74.0060', 40.7128, -74.006],
  ];
  for (const [label, url, la, ln] of shapes) { const r = G.parseMapsLink(url); if (!r || r.lat !== la || r.lng !== ln) fail(`parser: ${label} gave ${JSON.stringify(r)}`); }
  if (!(G.parseMapsLink('https://maps.app.goo.gl/AbC') || {}).needsResolve) fail('parser: a share link is not flagged for resolving');
  for (const nope of ['https://example.com/?q=40.7,-74.0', 'https://google.com.evil.example/maps/@40.7,-74.0,17z', 'just some words']) if (G.parseMapsLink(nope)) fail(`parser accepted a non-map link: ${nope}`);
  ok('the parser reads Google, Apple and bare coordinates, and refuses look-alikes');

  const addViaDay = (day, name, mapLink, web) => {
    click(document.querySelector('[data-addstop="' + day + '"]'));
    document.getElementById('pk-cname').value = name;
    document.getElementById('pk-cmin').value = '75';
    document.getElementById('pk-cmap').value = mapLink || '';
    document.getElementById('pk-cweb').value = web || '';
    click(document.getElementById('pk-cadd'));
  };
  const customKeyNamed = (name) => Object.keys(NYC.state.custom || {}).find(k => NYC.state.custom[k] && NYC.state.custom[k].name === name && !NYC.state.custom[k].deleted);
  const rowFor = (day, ref) => NYC.agReflow(day, NYC.agIds(day)).find(r => r.it.id === ref);
  const DAY = T.DAYS[1].key;

  // 1) with a long Google link: real coordinates, real travel
  addViaDay(DAY, 'Pizza at Lucali', LUCALI, 'lucali.com');
  const kPinned = customKeyNamed('Pizza at Lucali');
  if (!kPinned) fail('adding a stop with a map link did not create it');
  else {
    const c = NYC.state.custom[kPinned];
    if (c.lat !== 40.681801 || c.lng !== -73.999012) fail(`the map link did not set the location: ${c.lat},${c.lng}`);
    if (c.web !== 'https://lucali.com/') fail(`a website typed without https:// was not tidied: ${c.web}`);
    if (NYC.agIds(DAY).indexOf('c:' + kPinned) < 0) fail('the pinned stop did not land on the day');
    const r = rowFor(DAY, 'c:' + kPinned);
    if (!r || r.mode === 'same' || !r.mode) fail(`travel to the pinned stop is not being worked out (mode "${r && r.mode}", gap ${r && r.gap})`);
    else ok(`a pasted Google link pins the stop, and getting there is costed as a ${r.gap}-min ${r.mode === 'walk' ? 'walk' : 'subway ride'}`);
    await new Promise(r => setTimeout(r, 40));   // the running order repaints on the next frame
    const rowEl = document.querySelector('.agwrap[data-agday="' + DAY + '"] .agrow[data-id="c:' + kPinned + '"]');
    if (!rowEl) fail('the pinned stop is not in the day\'s running order on screen');
    else if (rowEl.querySelector('.nolocation')) fail('a pinned stop is still labelled as having no location');
  }

  // 2) without a link: kept, but honestly flagged
  addViaDay(DAY, 'Nails, somewhere', '', '');
  await new Promise(r => setTimeout(r, 40));
  const kLoose = customKeyNamed('Nails, somewhere');
  const rl = kLoose && rowFor(DAY, 'c:' + kLoose);
  if (!rl) fail('a stop with no link was not added');
  else if (rl.mode !== 'same') fail(`a stop with no location is being given travel time (${rl.mode})`);
  else {
    const el = document.querySelector('.agwrap[data-agday="' + DAY + '"] .agrow[data-id="c:' + kLoose + '"] .nolocation');
    if (!el || !el.textContent.trim()) fail('a stop with no location does not say its travel is not counted');
    else ok(`a stop with no link is kept, and the running order says: "${el.textContent.trim()}"`);
  }

  // 3) bad input is refused, with nothing created
  const before = Object.keys(NYC.state.custom).length;
  addViaDay(DAY, 'Bad map', 'https://example.com/somewhere', '');
  addViaDay(DAY, 'Bad web', LUCALI, 'not a website');
  if (Object.keys(NYC.state.custom).length !== before) fail('a stop with an unusable link was created anyway');
  else ok('a link that is not a map, or a website that is not one, is refused and nothing is created');
  click(document.querySelector('#sheet .closebtn'));

  // 4) a share link is resolved through the concierge, then pinned
  const realFetch = window.fetch;
  let resolveBody = null;
  window.fetch = (url, opts) => {
    if (String(url).endsWith('/resolve')) { resolveBody = JSON.parse(opts.body); return Promise.resolve({ ok: true, json: async () => ({ url: LUCALI }) }); }
    return realFetch(url, opts);
  };
  addViaDay(DAY, '', 'https://maps.app.goo.gl/AbC123', '');
  await new Promise(r => setTimeout(r, 60));
  const kShort = Object.keys(NYC.state.custom).find(k => NYC.state.custom[k].map && /Lucali/.test(NYC.state.custom[k].map) && NYC.state.custom[k].name === 'Lucali');
  window.fetch = realFetch;
  if (!resolveBody || resolveBody.url !== 'https://maps.app.goo.gl/AbC123') fail('a share link was not sent to the concierge to be expanded');
  else if (!kShort) fail('a resolved share link did not pin the stop or pick up its name: ' + JSON.stringify(Object.values(NYC.state.custom).slice(-1)));
  else ok('a share link with no name is expanded by the concierge, pinned, and named from the link ("' + NYC.state.custom[kShort].name + '")');

  // 5) a stop's own sheet: links shown, and a location can be added afterwards
  NYC.openPlace('c:' + kPinned);
  const hrefs = [...document.querySelectorAll('#sheet .linkrow a')].map(a => a.getAttribute('href'));
  if (!hrefs.includes('https://lucali.com/')) fail('the stop sheet has no Website button');
  if (!hrefs.includes(LUCALI)) fail('the stop sheet\'s Map button does not open the link that was shared');
  if (!hrefs.some(h => /maps\/dir/.test(h))) fail('the stop sheet has no Directions button');
  if (!/~\d+/.test(document.querySelector('#sheet .meta').textContent)) fail('the stop sheet does not say how far it is from home');
  else ok('its sheet has Website, the shared Map link, Directions, and the time from home');
  NYC.openPlace('c:' + kLoose);
  document.getElementById('sh-cmap').value = '40.7033, -73.9881';
  click(document.getElementById('sh-csave'));
  await new Promise(r => setTimeout(r, 120));
  if (NYC.state.custom[kLoose].lat !== 40.7033) fail('adding a location to an existing stop did not stick');
  else if (rowFor(DAY, 'c:' + kLoose).mode === 'same') fail('after adding a location, travel to the stop is still not counted');
  else ok('a stop added without a link can be given one later, and its travel is then counted');
  click(document.querySelector('#sheet .closebtn'));

  // 6) records written straight into the shared table, bypassing the form.
  // The table is writable with the public key, so these are what a stranger
  // could plant. Nothing from them may become a script URL or break a day.
  const hostile = {
    evil1: { name: 'Innocent café', d: 60, t: '15:00', web: 'javascript:alert(document.cookie)', map: 'javascript:alert(1)', lat: 40.72, lng: -73.99 },
    evil2: { name: 'Bad coords', d: 60, t: '15:30', lat: '<img src=x onerror=alert(1)>', lng: 'nope', web: 'data:text/html,<script>alert(1)</script>' },
    evil3: { name: '<img src=x onerror=alert(1)>', d: 60, t: '16:00', web: 'https://ok.example/"onmouseover="alert(1)' },
  };
  Object.assign(NYC.state.custom, hostile);
  NYC.agIds(DAY); // make sure seeds are fresh
  for (const k of Object.keys(hostile)) {
    NYC.openPlace('c:' + k);
    const html = document.getElementById('sheet').innerHTML;
    const hrefs = [...document.querySelectorAll('#sheet a[href]')].map(a => a.getAttribute('href'));
    if (hrefs.some(h => /^\s*(javascript|data|vbscript):/i.test(h))) fail(`a planted record (${k}) produced a script URL: ${hrefs.join(' ')}`);
    if (/onerror=|onmouseover=/.test(html.replace(/&quot;|&lt;|&gt;|&amp;/g, ''))) {
      // escaped text is fine; a live attribute is not
      if (document.querySelector('#sheet [onerror], #sheet [onmouseover]')) fail(`a planted record (${k}) injected a live event handler`);
    }
  }
  click(document.querySelector('#sheet .closebtn'));
  // a planted record on a day must not turn its timings into nonsense
  NYC.state.agenda[DAY] = { ids: NYC.agIds(DAY).concat(['c:evil2']), t: {}, d: {}, seen: [] };
  const rows = NYC.agReflow(DAY, NYC.agIds(DAY));
  if (rows.some(r => !Number.isFinite(r.start) || !Number.isFinite(r.end))) fail('a record with junk coordinates broke the day\'s timings');
  else ok('records planted in the shared table cannot become script links, live HTML, or broken timings');
  for (const k of Object.keys(hostile)) delete NYC.state.custom[k];

  // tidy up so the rest of the suite sees the seeded plan
  for (const k of [kPinned, kLoose, kShort].filter(Boolean)) {
    NYC.state.custom[k] = Object.assign({}, NYC.state.custom[k], { deleted: true });
  }
  NYC.state.agenda = {};

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
