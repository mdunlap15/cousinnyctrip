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

  // ---- the concierge's recommendations, tappable ----
  console.log('concierge replies with linked places:');
  NYC.me = 'T';
  const realFetch2 = window.fetch;
  let chatBody = null, nextChat = null;
  window.fetch = (url, opts) => {
    if (String(url).endsWith('/chat')) { chatBody = JSON.parse(opts.body); return Promise.resolve({ ok: true, json: async () => nextChat }); }
    return realFetch2(url, opts);
  };
  const ask = async (q) => {
    click(document.querySelector('.tbtn[data-tabbtn="chat"]'));
    document.getElementById('chatinput').value = q;
    click(document.getElementById('chatsend'));
    await new Promise(r => setTimeout(r, 60));
    const msgs = [...document.querySelectorAll('#msgs .msg.a')];
    return msgs[msgs.length - 1];
  };
  const libId = PLACES[0].id, libName = PLACES[0].name;
  nextChat = { reply: 'For late sushi try Sushi on Me in Williamsburg. <b>Or</b> ' + libName + ' first. Also somewhere unnamed.', places: [
    { mention: 'Sushi on Me', ref: '', name: 'Sushi on Me', hood: 'Williamsburg', cat: 'eat', lat: 40.7106, lng: -73.9565, minutes: 90, why: 'open until 1am' },
    { mention: libName, ref: 'p:' + libId, name: libName, hood: '', cat: 'eat', lat: null, lng: null, minutes: 60, why: '' },
    { mention: 'not in the text', ref: 'p:no-such-place', name: '<img src=x onerror=alert(1)>', hood: '', cat: 'eat', lat: 48.85, lng: 2.35, minutes: 60, why: '' },
    { mention: 'Sushi on Me', ref: '', name: 'Sushi on Me', hood: 'Williamsburg', cat: 'eat', lat: 40.7106, lng: -73.9565, minutes: 90, why: 'dupe' },
  ] };
  const m1 = await ask('Sushi open late?');
  if (!chatBody || typeof chatBody.library !== 'string' || chatBody.library.split('\n').length !== PLACES.length) fail('the chat request did not carry the library');
  else ok(`the concierge is sent the whole library (${chatBody.library.split('\n').length} places), so it can recommend from it by id`);
  if (!m1) fail('no reply rendered');
  else {
    const inline = [...m1.querySelectorAll('.chatplace')].map(b => b.textContent);
    const chips = [...m1.querySelectorAll('.chatchip .cn')].map(b => b.textContent);
    if (inline.join('|') !== ['Sushi on Me', libName].join('|')) fail('the places were not linked in the reply text: ' + JSON.stringify(inline));
    if (chips.length !== 3) fail('expected 3 chips (duplicate dropped, unmatched mention still gets one), got ' + JSON.stringify(chips));
    else ok(`the reply links "${inline.join('" and "')}" in the text, with ${chips.length} chips beneath; a repeat is dropped`);
    if (m1.querySelector('b, img') || document.querySelector('#msgs [onerror]')) fail('text from the model became live HTML');
    else if (!/<b>Or<\/b>/.test(m1.querySelector('.msgtext').textContent)) fail('the reply text was altered');
    else ok('whatever the model writes stays text: "<b>" and an <img onerror> name render as plain characters');
    // the library place opens its own full page
    click([...m1.querySelectorAll('.chatchip')].find(c => c.textContent.includes(libName)));
    if (document.getElementById('sheet').hidden || !document.querySelector('#sheet h3') || document.querySelector('#sheet h3').textContent !== libName) fail('tapping a library place did not open its page');
    else ok('a library place opens its full page — website, menu, hours, vote, add to a day');
    click(document.querySelector('#sheet .closebtn'));
    // a new place opens a pre-filled idea
    click(m1.querySelector('.chatplace'));
    const sg = { name: (document.getElementById('sg-name') || {}).value, min: (document.getElementById('sg-min') || {}).value, links: [...document.querySelectorAll('#sheet .linkrow a')].map(a => a.getAttribute('href')), loc: (document.querySelector('#sheet .custloc') || {}).textContent || '' };
    if (sg.name !== 'Sushi on Me' || sg.min !== '90') fail('the idea form was not pre-filled: ' + JSON.stringify(sg));
    else if (!sg.links.some(h => /google\.com\/maps\/search/.test(h) && /Sushi%20on%20Me/.test(h)) || !sg.links.some(h => /google\.com\/search\?q=/.test(h))) fail('no Google Maps / web search links for the new place: ' + JSON.stringify(sg.links));
    else if (!/Approximate/.test(sg.loc)) fail('the sheet does not say the location is approximate: ' + sg.loc);
    else ok('a place new to the app opens with the idea already filled in, Google Maps and web search links, and its location marked approximate');
    click(document.getElementById('sg-idea'));
    await new Promise(r => setTimeout(r, 30));
    const kS = Object.keys(NYC.state.custom).find(k => NYC.state.custom[k].name === 'Sushi on Me' && !NYC.state.custom[k].deleted);
    const cS = kS && NYC.state.custom[kS];
    if (!cS) fail('Add as idea did not create the idea');
    else if (!(cS.approx && cS.lat === 40.7106 && cS.hood === 'Williamsburg' && cS.note === 'open until 1am' && cS.cat === 'eat' && cS.from === 'concierge')) fail('the idea did not keep what the concierge said: ' + JSON.stringify(cS));
    else if (!(NYC.state.vote['c:' + kS] && NYC.state.vote['c:' + kS].T === 'yes')) fail('the idea was not voted for by the person who added it');
    else ok('one tap adds it to the ideas, with its neighbourhood, the concierge\'s note, an approximate location and your vote');
    await new Promise(r => setTimeout(r, 30));
    const st = [...m1.querySelectorAll('.chatchip')].find(c => c.textContent.includes('Sushi on Me'));
    if (!st || !st.classList.contains('done') || !/✓/.test(st.textContent)) fail('the chip did not change to ✓ after adding');
    // tapping it again opens the idea it became, not a second copy
    click(m1.querySelector('.chatplace'));
    if (document.getElementById('sg-idea')) fail('tapping an added place offered to add it again');
    else if (!document.getElementById('sh-cmap')) fail('tapping an added place did not open the idea it became');
    else ok('its chip turns to ✓, and tapping it again opens the idea instead of adding a duplicate');
    // editing just the website keeps the approximate location; a real map link replaces it
    document.getElementById('sh-cweb').value = 'sushionme.com';
    click(document.getElementById('sh-csave'));
    await new Promise(r => setTimeout(r, 120));
    if (NYC.state.custom[kS].lat !== 40.7106 || !NYC.state.custom[kS].approx) fail('editing only the website wiped the location');
    NYC.openPlace('c:' + kS);
    document.getElementById('sh-cmap').value = '40.7112, -73.9571';
    click(document.getElementById('sh-csave'));
    await new Promise(r => setTimeout(r, 120));
    if (NYC.state.custom[kS].lat !== 40.7112 || NYC.state.custom[kS].approx) fail('a pasted location did not replace the approximate one');
    else ok('editing the website keeps its location; pasting a map link makes it exact');
    click(document.querySelector('#sheet .closebtn'));
    // scheduled with an approximate location, the running order says so
    NYC.state.custom[kS] = Object.assign({}, NYC.state.custom[kS], { approx: true });
    NYC.state.agenda[DAY] = { ids: NYC.agIds(DAY).concat(['c:' + kS]), t: {}, d: {}, seen: [] };
    // state was changed directly here, which the app never does; a language
    // round-trip repaints everything the way a real save would
    for (let i = 0; i < 3; i++) click(document.getElementById('langbtn'));
    await new Promise(r => setTimeout(r, 40));
    const rowA = document.querySelector('.agwrap[data-agday="' + DAY + '"] .agrow[data-id="c:' + kS + '"] .nolocation');
    if (!rowA || !/approximate/.test(rowA.textContent)) fail('a stop with an approximate location is not labelled so in the running order');
    else ok('on a day, a stop placed by the concierge\'s estimate is labelled "approximate location"');
    delete NYC.state.custom[kS]; NYC.state.agenda = {};
  }
  // a reply in Russian: Cyrillic names must stay distinct places
  nextChat = { reply: 'Попробуйте Суши-бар Юки или Кафе Пушкин, а ещё Бар Звезда.', places: [
    { mention: 'Суши-бар Юки', ref: '', name: 'Суши-бар Юки', hood: 'Уильямсбург', cat: 'eat', lat: 40.71, lng: -73.96, minutes: 90, why: 'поздно открыт' },
    { mention: 'Кафе Пушкин', ref: '', name: 'Кафе Пушкин', hood: 'Мидтаун', cat: 'cafe', lat: 40.76, lng: -73.98, minutes: 45, why: '' },
    { mention: 'Бар Звезда', ref: '', name: 'Бар Звезда', hood: 'Сохо', cat: 'drink', lat: 40.72, lng: -74.0, minutes: 45, why: '' },
  ] };
  const mRu = await ask('Где поесть суши?');
  const ruChips = mRu ? [...mRu.querySelectorAll('.chatchip .cn')].map(c => c.textContent) : [];
  const ruLinks = mRu ? [...mRu.querySelectorAll('.chatplace')].map(c => c.textContent) : [];
  if (ruChips.length !== 3 || ruLinks.length !== 3) fail(`a Russian reply lost places: chips ${JSON.stringify(ruChips)}, links ${JSON.stringify(ruLinks)}`);
  else {
    click(mRu.querySelectorAll('.chatchip')[1]);
    click(document.getElementById('sg-idea'));
    await new Promise(r => setTimeout(r, 30));
    const added = Object.values(NYC.state.custom).filter(c => c && !c.deleted && /Пушкин|Юки|Звезда/.test(c.name)).map(c => c.name);
    await new Promise(r => setTimeout(r, 30));
    const states = [...mRu.querySelectorAll('.chatchip .cp')].map(c => c.textContent);
    if (added.join() !== 'Кафе Пушкин') fail('adding one Russian-named idea did not add exactly that one: ' + JSON.stringify(added));
    else if (states.join('') !== '＋✓＋') fail('only the added Russian-named place should show ✓, got ' + states.join(''));
    else ok('a reply in Russian keeps its three Cyrillic-named places apart, and adding one marks only that one');
    Object.keys(NYC.state.custom).forEach(k => { if (/Пушкин/.test((NYC.state.custom[k] || {}).name || '')) delete NYC.state.custom[k]; });
  }

  // ---- what the review found, each pinned by a test ----
  // (1) a share link pasted on a suggested place outranks the concierge's guess
  let resolved = 0;
  const realFetch3 = window.fetch;
  window.fetch = (url, opts) => {
    if (String(url).endsWith('/resolve')) { resolved++; return Promise.resolve({ ok: true, json: async () => ({ url: 'https://www.google.com/maps/place/Rosella/@40.72,-73.98,17z/data=!3d40.726201!4d-73.983801' }) }); }
    return window.__chatStub ? window.__chatStub(url, opts) : realFetch3(url, opts);
  };
  window.__chatStub = (url, opts) => String(url).endsWith('/chat') ? (chatBody = JSON.parse(opts.body), Promise.resolve({ ok: true, json: async () => nextChat })) : realFetch2(url, opts);
  nextChat = { reply: 'Rosella is lovely. Skip the Mets game; the Met is open late. Also Constructor and Rosella Sushi.', places: [
    { mention: 'Rosella', ref: '', name: 'Rosella', hood: 'East Village', cat: 'eat', lat: 40.7262, lng: -73.9838, minutes: 75, why: 'sushi' },
    { mention: 'the Met', ref: 'p:the-met', name: 'The Met', hood: '', cat: 'museum', lat: null, lng: null, minutes: 150, why: '' },
    { mention: 'Constructor', ref: '', name: 'Constructor', hood: '', cat: 'constructor', lat: null, lng: null, minutes: 60, why: '' },
  ] };
  const mR = await ask('Where for sushi?');
  const aMet = [...mR.querySelectorAll('.chatplace')].find(a => a.textContent === 'the Met');
  if (!aMet) fail('"the Met" was not linked');
  else {
    const before = aMet.previousSibling && aMet.previousSibling.textContent;
    if (/Skip the $/.test(before || '') || aMet.nextSibling && /^s /.test(aMet.nextSibling.textContent)) fail('"the Met" was linked inside "the Mets"');
    else ok('"the Met" is linked where it stands alone, not inside "the Mets"');
  }
  if ([...mR.querySelectorAll('.chatplace')].some(e => e.tagName !== 'A')) fail('inline mentions are not links, so they wrap as boxes');
  else ok('inline mentions are real links, so they wrap with the text');
  const cons = [...mR.querySelectorAll('.chatchip')].find(c => /Constructor/.test(c.textContent));
  if (!cons || /Object/.test(cons.textContent)) fail('a place named "Constructor" was mistaken for a built-in: ' + (cons && cons.textContent));
  else { click(cons); if (document.getElementById('sheet').hidden || !/Constructor/.test(document.querySelector('#sheet h3').textContent)) fail('tapping "Constructor" did not open its sheet'); else ok('a place named "Constructor" is just a place, not a built-in object'); click(document.querySelector('#sheet .closebtn')); }
  // rename before adding, with a short share link pasted
  click([...mR.querySelectorAll('.chatchip')].find(c => /Rosella/.test(c.textContent)));
  document.getElementById('sg-name').value = 'Rosella Sushi (East Village)';
  document.getElementById('sg-map').value = 'https://maps.app.goo.gl/Ros123';
  click(document.getElementById('sg-idea'));
  await new Promise(r => setTimeout(r, 80));
  const kR = Object.keys(NYC.state.custom).find(k => (NYC.state.custom[k] || {}).name === 'Rosella Sushi (East Village)');
  const cR = kR && NYC.state.custom[kR];
  if (!cR) fail('the renamed idea was not created');
  else if (!resolved) fail('the pasted share link was never sent to be expanded, because the concierge\'s guess got there first');
  else if (cR.approx || cR.lat !== 40.726201 || cR.needsResolve) fail('the expanded link did not replace the approximate location: ' + JSON.stringify(cR));
  else ok('a share link pasted on a suggested place is expanded and replaces the concierge\'s guess');
  await new Promise(r => setTimeout(r, 30));
  const chipR = [...mR.querySelectorAll('.chatchip')].find(c => /Rosella/.test(c.textContent));
  click(chipR);
  if (!/✓/.test(chipR.textContent)) fail('after renaming, the chip still offered ＋');
  else if (document.getElementById('sg-idea')) fail('after renaming, tapping the chip offered to add it again');
  else ok('renamed before adding, the chip still turns to ✓ and opens the idea it made');
  click(document.querySelector('#sheet .closebtn'));
  // (2) Directions to an approximate place go by name, never to the guessed point
  const kA = Object.keys(NYC.state.custom).find(k => (NYC.state.custom[k] || {}).name === 'Rosella Sushi (East Village)');
  NYC.state.custom[kA] = Object.assign({}, NYC.state.custom[kA], { approx: true, lat: 40.7262, lng: -73.9838, map: '' });
  NYC.openPlace('c:' + kA);
  const dir = [...document.querySelectorAll('#sheet .linkrow a')].find(a => a.textContent === 'Directions');
  if (!dir) fail('no Directions button on an approximate place');
  else if (/40\.72|-73\.98/.test(dir.getAttribute('href')) || !/destination=Rosella/.test(dir.getAttribute('href'))) fail('Directions to an approximate place used the guessed coordinates: ' + dir.getAttribute('href'));
  else ok('Directions to an approximately placed stop ask Google for it by name, not the guessed point');
  click(document.querySelector('#sheet .closebtn'));
  // (6) renaming a suggestion to the name of an idea that already exists: no
  //     second copy — it says so, casts the vote, and opens the existing idea
  NYC.state.vote['c:' + kA] = {};
  nextChat = { reply: 'Try Sushi Nomad tonight.', places: [{ mention: 'Sushi Nomad', ref: '', name: 'Sushi Nomad', hood: '', cat: 'eat', lat: null, lng: null, minutes: 60, why: '' }] };
  const mD = await ask('And again?');
  click(mD.querySelector('.chatchip'));
  if (!document.getElementById('sg-idea')) fail('a new suggestion did not open its idea sheet');
  else {
    const countBefore = Object.keys(NYC.state.custom).length;
    document.getElementById('sg-name').value = 'Rosella Sushi (East Village)';
    click(document.getElementById('sg-idea'));
    await new Promise(r => setTimeout(r, 30));
    const shown = document.getElementById('toast').textContent;
    if (Object.keys(NYC.state.custom).length !== countBefore) fail('adding an idea that already exists made a second one');
    else if (!(NYC.state.vote['c:' + kA] && NYC.state.vote['c:' + kA].T === 'yes')) fail('adding an idea that already exists did not cast the vote');
    else if (!/Already in your ideas/.test(shown)) fail('adding an idea that already exists did not say so (toast: "' + shown + '")');
    else if (!document.getElementById('sh-cmap') || document.querySelector('#sheet h3').textContent !== 'Rosella Sushi (East Village)') fail('the existing idea was not opened');
    else ok('adding an idea that already exists says so, votes for it and opens it, never duplicating it');
    click(document.querySelector('#sheet .closebtn'));
  }
  // (9) a planted category that names a built-in shows as an idea, not "undefined"
  NYC.state.custom.cproto = { name: 'Proto place', d: 60, t: '15:00', cat: 'constructor' };
  NYC.openPlace('c:cproto');
  const catTxt = (document.querySelector('#sheet .cat') || {}).textContent || '';
  if (/undefined/.test(catTxt)) fail('a synced category naming a built-in rendered as "undefined": ' + catTxt);
  else ok('a synced category that names a built-in falls back to "idea"');
  click(document.querySelector('#sheet .closebtn'));
  delete NYC.state.custom.cproto;
  // (13) failures read in the traveller's own language
  for (let i = 0; i < 1; i++) click(document.getElementById('langbtn'));   // → Russian
  nextChat = { error: 'The concierge is not set up right — its API key was refused.', code: 'setup' };
  const mSet = await ask('Привет');
  if (!mSet || !/Консьерж настроен неправильно/.test(mSet.textContent)) fail('a setup failure was not shown in Russian: ' + (mSet && mSet.textContent));
  else ok('a failure reads in the traveller\'s language: "' + mSet.textContent + '"');
  for (let i = 0; i < 2; i++) click(document.getElementById('langbtn'));   // → back to English
  Object.keys(NYC.state.custom).forEach(k => { if (/Rosella/.test((NYC.state.custom[k] || {}).name || '')) delete NYC.state.custom[k]; });
  window.fetch = realFetch2 && ((url, opts) => (String(url).endsWith('/chat') ? (chatBody = JSON.parse(opts.body), Promise.resolve({ ok: true, json: async () => nextChat })) : realFetch2(url, opts)));
  delete window.__chatStub;

  // an error from the proxy is shown, but never replayed to the model as its own words
  const before2 = JSON.stringify(chatBody.messages);
  nextChat = { error: 'Busy for a second — ask me again.', code: 'busy' };
  const m2 = await ask('And for dessert?');
  nextChat = { reply: 'Fine.', places: [] };
  await ask('Try again');
  const hist = chatBody.messages.map(m => m.role + ':' + m.content);
  if (!m2 || !/Busy/.test(m2.textContent)) fail('an error reply was not shown');
  else if (hist.some(h => /Busy/.test(h))) fail('an error message was sent back to the model as something it said');
  else ok('an error is shown to the traveller but kept out of the conversation the model sees');
  window.fetch = realFetch2;
  click(document.querySelector('.tbtn[data-tabbtn="home"]'));

  // ---- edits saved before the days were reshuffled follow their day ----
  // The real case: the Liberty day used to be Monday. An edit made to it then
  // (a stop removed, one added, lunch pinned) was saved as Monday's list, and
  // after the plan moved Liberty to Tuesday that list made Monday hold both
  // days' stops and left Tuesday empty.
  console.log('saved edits across a reshuffle:');
  const settle = () => new Promise(r => setTimeout(r, 20));
  const oldMon = ['x:r-to-whitehall', 'p:statue-of-liberty', 'p:wall-street-charging-bull', 'p:tin-building', 'p:911-memorial', 'x:coffee-fidi', 'p:brooklyn-bridge', 'p:dumbo-washington-street', 'p:cecconis-dumbo'];
  const staleRow = () => ({ ids: oldMon.filter(x => x !== 'p:wall-street-charging-bull').concat(['c:kold']), t: { 'p:tin-building': '13:15' }, d: {}, seen: oldMon.slice() });
  NYC.state.custom.kold = { name: 'Fraunces Tavern', d: 60, t: '12:30', cat: 'eat', lat: 40.7034, lng: -74.0113 };
  NYC.state.agenda = { d2: staleRow() };
  const planOf = (d) => T.SEED[d].map(x => x[0]);
  const mon = NYC.agIds('d2'), tue = NYC.agIds('d3');
  const tin = NYC.agReflow('d3', tue).find(r => r.it.id === 'p:tin-building');
  if (mon.join() !== planOf('d2').join()) fail('an edit saved before the reshuffle still decides Monday: ' + mon.join(', '));
  else if (!tue.includes('p:statue-of-liberty') || tue.includes('p:wall-street-charging-bull') || !tue.includes('c:kold')) fail('the old edit did not follow the Liberty day to Tuesday: ' + tue.join(', '));
  else if (!tin || tin.start !== 13 * 60 + 15) fail('the lunch pinned in the old edit lost its time on Tuesday');
  else ok('an edit saved before the reshuffle follows its day: Monday is as planned, Tuesday keeps the removal, the added stop and the pinned lunch');
  NYC.renderAll(); await settle();
  const paceOf = (d) => (document.querySelector('[data-pace="' + d + '"]') || {}).className || '';
  if (/\bp3\b/.test(paceOf('d2'))) fail('Monday still reads as crammed');
  else if (!document.querySelector('.agwrap[data-agday="d3"] [data-agreset]')) fail('Tuesday carries edits but offers no "reset to the plan"');
  else ok('neither day is crammed, and Tuesday offers to undo the edits it carries');
  // editing Monday afterwards must not throw away what belongs to Tuesday
  NYC.agSave('d2', NYC.agIds('d2').filter(x => x !== 'p:little-island'));
  const tue2 = NYC.agIds('d3');
  if (NYC.agIds('d2').includes('p:little-island')) fail('removing a stop from Monday did not stick');
  else if (!tue2.includes('c:kold') || tue2.includes('p:wall-street-charging-bull')) fail('saving Monday lost the edits that belong to Tuesday: ' + tue2.join(', '));
  else ok('editing Monday afterwards keeps the edits that belong to Tuesday');
  // pinning a time on Monday saves Monday as it now stands, not the old list
  NYC.state.agenda = { d2: staleRow() };
  NYC.renderAll(); await settle();
  const tb = document.querySelector('.agwrap[data-agday="d2"] .agrow[data-id="p:the-high-line"] .ag-time');
  click(tb);
  const tin2 = document.querySelector('.agwrap[data-agday="d2"] .ag-tin');
  if (!tin2) fail('tapping a time on Monday gave no time picker');
  else {
    tin2.value = '14:50'; tin2.dispatchEvent(new window.Event('change', { bubbles: true })); await settle();
    const mon3 = NYC.agIds('d2'), tue3 = NYC.agIds('d3');
    if (mon3.join() !== planOf('d2').join()) fail('pinning a time on Monday put the old Liberty stops back on it: ' + mon3.join(', '));
    else if (!tue3.includes('c:kold') || tue3.includes('p:wall-street-charging-bull')) fail('pinning a time on Monday lost Tuesday\'s edits: ' + tue3.join(', '));
    else if (NYC.agReflow('d2', mon3).find(r => r.it.id === 'p:the-high-line').start !== 14 * 60 + 50) fail('the pinned time on Monday did not stick');
    else ok('pinning a time on Monday keeps Monday as planned and Tuesday\'s edits where they belong');
  }
  // a smaller plan change: one stop moved to another day after a day was edited
  // (as if Balthazar used to be on the Met day). The edit stays; the stop
  // follows the plan — and pinning a time there must not write it back.
  const oldThu = planOf('d5').concat(['p:balthazar']);
  NYC.state.agenda = { d5: { ids: oldThu.slice(), t: { 'p:cafe-sabarsky': '13:40' }, d: {}, seen: oldThu.slice() } };
  const sab = NYC.agReflow('d5', NYC.agIds('d5')).find(r => r.it.id === 'p:cafe-sabarsky');
  if (NYC.agIds('d5').includes('p:balthazar') || !NYC.agIds('d6').includes('p:balthazar')) fail('a stop the plan has since moved stayed on the day it used to be on');
  else if (!sab || sab.start !== 13 * 60 + 40) fail('the edit saved on that day was lost when the plan moved one of its stops');
  else ok('when the plan moves one stop after a day was edited, the stop follows the plan and the edit stays');
  NYC.renderAll(); await settle();
  click(document.querySelector('.agwrap[data-agday="d5"] .agrow[data-id="p:the-met"] .ag-time'));
  const tin5 = document.querySelector('.agwrap[data-agday="d5"] .ag-tin');
  if (tin5) { tin5.value = '10:30'; tin5.dispatchEvent(new window.Event('change', { bubbles: true })); await settle(); }
  if (!tin5) fail('tapping a time on Thursday gave no time picker');
  else if (NYC.agIds('d5').includes('p:balthazar') || !NYC.agIds('d6').includes('p:balthazar')) fail('pinning a time wrote a stop the plan had moved back onto the old day');
  else ok('pinning a time afterwards does not write the moved stop back');
  // resetting Tuesday brings back the plan, and the old edits cannot return
  NYC.state.agenda = { d2: staleRow() };
  NYC.renderAll(); await settle();
  click(document.querySelector('.agwrap[data-agday="d3"] [data-agreset]')); await settle();
  if (NYC.agIds('d3').join() !== planOf('d3').join()) fail('reset did not bring Tuesday back to the plan: ' + NYC.agIds('d3').join(', '));
  else if (NYC.agIds('d2').join() !== planOf('d2').join()) fail('resetting Tuesday changed Monday');
  else {
    NYC.agSave('d2', NYC.agIds('d2'));   // the next save of Monday must not carry the old Tuesday edits along
    if (NYC.agIds('d3').join() !== planOf('d3').join() || (NYC.state.agenda.d2.carry || {}).d3) fail('after a reset, saving Monday brought the old Tuesday edits back');
    else ok('"reset to the plan" on Tuesday brings back the plan, and the old edits never return');
  }

  // The real reshuffle was a rotation: the old Brooklyn day is now Wednesday,
  // the old Liberty day Tuesday, the old Midtown day Sunday. With edits saved
  // on several old days, no save or reset may lose another day's edits, and a
  // save writes only the day that was edited (the other phone may have newer
  // rows for the others).
  const oldSun = ['p:grand-central-terminal', 'p:st-patricks-cathedral', 'p:rockefeller-center', 'p:lodi', 'p:bergdorf-goodman', 'p:goodmans-bar-bergdorf', 'p:top-of-the-rock', 'x:pre-show-bite', 'x:broadway-show', 'x:times-square-night'];
  const oldWed = ['p:miriam', 'p:prospect-park', 'x:rest-home', 'p:brooklyn-heights-promenade', 'p:brooklyn-bridge-park', 'x:sunset-pier1', 'p:colonie'];
  const rotation = () => ({
    d1: { ids: oldWed.filter(x => x !== 'p:brooklyn-bridge-park'), t: { 'p:miriam': '11:00' }, d: {}, seen: oldWed.slice() },
    d2: staleRow(),
    d3: { ids: oldSun.filter(x => x !== 'p:top-of-the-rock'), t: { 'p:lodi': '13:00' }, d: {}, seen: oldSun.slice() },
  });
  const pinAt = (d, id) => { const r = NYC.agReflow(d, NYC.agIds(d)).find(x => x.it.id === id); return r ? r.start : null; };
  const edits = () => ({
    wed: !NYC.agIds('d4').includes('p:brooklyn-bridge-park') && pinAt('d4', 'p:miriam') === 660,
    tue: !NYC.agIds('d3').includes('p:wall-street-charging-bull') && NYC.agIds('d3').includes('c:kold') && pinAt('d3', 'p:tin-building') === 795,
    sun: !NYC.agIds('d1').includes('p:top-of-the-rock') && pinAt('d1', 'p:lodi') === 780,
  });
  NYC.state.agenda = rotation();
  const e0 = edits();
  if (!(e0.wed && e0.tue && e0.sun)) fail('edits saved on three old days do not all show on their new days: ' + JSON.stringify(e0));
  else {
    const before = Object.assign({}, NYC.state.agenda);
    NYC.agSave('d2', NYC.agIds('d2').filter(x => x !== 'p:little-island'));
    const touched = Object.keys(NYC.state.agenda).filter(k => NYC.state.agenda[k] !== before[k]);
    const e1 = edits();
    if (touched.join() !== 'd2') fail('saving Monday wrote other days too: ' + touched.join(', '));
    else if (!(e1.wed && e1.tue && e1.sun) || NYC.agIds('d2').includes('p:little-island')) fail('saving Monday lost edits that belong to other days: ' + JSON.stringify(e1));
    else ok('with old edits on three days, saving Monday writes only Monday and keeps every other day\'s edits');
    NYC.state.agenda = rotation();
    NYC.renderAll(); await settle();
    const before2 = Object.assign({}, NYC.state.agenda);
    click(document.querySelector('.agwrap[data-agday="d3"] [data-agreset]')); await settle();
    const touched2 = Object.keys(NYC.state.agenda).filter(k => NYC.state.agenda[k] !== before2[k]);
    const e2 = edits();
    if (touched2.join() !== 'd3') fail('resetting Tuesday wrote other days too: ' + touched2.join(', '));
    else if (!(e2.wed && e2.sun) || NYC.agIds('d3').join() !== planOf('d3').join()) fail('resetting Tuesday lost another day\'s edits or did not reset: ' + JSON.stringify(e2));
    else ok('and resetting Tuesday resets only Tuesday, writing nothing else');
  }
  // the newest edits for a day win, wherever they are stored
  NYC.state.agenda = { d2: Object.assign(staleRow(), { at: Date.now() }), d3: { ids: planOf('d3').filter(x => x !== 'p:911-memorial'), t: {}, d: {}, seen: planOf('d3'), at: 1000 } };
  const tueNew = NYC.agIds('d3');
  if (tueNew.includes('p:911-memorial') && tueNew.includes('c:kold') && !tueNew.includes('p:wall-street-charging-bull')) ok('newer edits for a day beat older ones, wherever they are stored');
  else fail('older edits beat newer ones for Tuesday: ' + tueNew.join(', '));

  // ---- a day's title and summary follow what is actually on it ----
  console.log('day titles and summaries:');
  NYC.state.agenda = {};
  const LGS = ['en', 'ru', 'de'], SUF = { en: '', ru: 'Ru', de: 'De' };
  const badPlanned = T.DAYS.filter(d => LGS.some(lg => { const s = NYC.dayStory(d.key, lg); return s.mode !== 'planned' || s.title !== d['title' + SUF[lg]] || s.lede !== d['lede' + SUF[lg]]; }));
  if (badPlanned.length) fail('days as planned do not show their written text: ' + badPlanned.map(d => d.key).join(', '));
  else ok('as planned, every day shows its written title and summary in all three languages');
  // a small edit keeps the title but rewrites the summary around what is left
  NYC.agSave('d3', NYC.agIds('d3').filter(x => x !== 'p:wall-street-charging-bull'));
  const small = NYC.dayStory('d3', 'en');
  if (small.mode !== 'close' || small.title !== T.DAYS[3].title) fail('removing one small stop replaced the title: ' + small.title);
  else if (/Wall Street/.test(small.lede) || !/Statue of Liberty/.test(small.lede) || !/dinner at Cecconi/.test(small.lede) || !/^Morning: .*Afternoon: .*Evening: /.test(small.lede)) fail('the summary does not describe the day as it now is: ' + small.lede);
  else ok('one stop removed: the title stays, the summary is rewritten without it — "' + small.lede + '"');
  NYC.state.agenda = {};
  // move the day's headline to another day through the ⋯ menu, as a person would
  NYC.renderAll(); await settle();
  const libRow = document.querySelector('.agwrap[data-agday="d3"] .agrow[data-id="p:statue-of-liberty"]');
  click(libRow.querySelector('.ag-mv'));
  const toWed = [...libRow.querySelectorAll('.agmenu button')].find(b => b.textContent === 'Wed 30');
  if (!toWed) fail('the ⋯ menu offers no move to Wednesday');
  else {
    click(toWed); await settle();
    const tueEn = NYC.dayStory('d3', 'en'), wedEn = NYC.dayStory('d4', 'en');
    const head = (d) => document.querySelector('#' + d + ' .dt').textContent, lede = (d) => document.querySelector('#' + d + ' .dlede').textContent;
    if (tueEn.mode !== 'changed' || tueEn.title !== 'Lower Manhattan & DUMBO') fail('Tuesday without the Statue is still titled "' + tueEn.title + '"');
    else if (/Statue|Liberty/.test(tueEn.lede) || !/^Afternoon: .*Wall Street.*Evening: .*dinner at Cecconi/.test(tueEn.lede)) fail('Tuesday\'s summary does not match its stops: ' + tueEn.lede);
    else if (!/Statue of Liberty/.test(wedEn.title) || !/Statue of Liberty/.test(wedEn.lede) || wedEn.title === T.DAYS[4].title) fail('Wednesday does not mention the Statue it now holds: ' + wedEn.title + ' — ' + wedEn.lede);
    else if (head('d3') !== tueEn.title || lede('d3') !== tueEn.lede || head('d4') !== wedEn.title) fail('the day pages still show the old headings: "' + head('d3') + '" / "' + head('d4') + '"');
    else ok('the Statue moved to Wednesday: Tuesday is now "' + tueEn.title + '", Wednesday "' + wedEn.title + '", on the page too');
    const ru = NYC.dayStory('d4', 'ru'), de = NYC.dayStory('d4', 'de');
    if (!/Статуя Свободы/.test(ru.title) || !/^Утром — /.test(ru.lede) || !/Freiheitsstatue/.test(de.title) || !/^Vormittags: /.test(de.lede)) fail('the rewritten day is not in Russian and German: ' + ru.title + ' | ' + ru.lede + ' || ' + de.title + ' | ' + de.lede);
    else ok('and in Russian ("' + ru.title + '") and German ("' + de.title + '")');
    click(document.getElementById('langbtn')); await settle();
    if (document.querySelector('#d4 .dt').textContent !== ru.title) fail('switching to Russian did not show the rewritten title on the page');
    click(document.getElementById('langbtn')); click(document.getElementById('langbtn')); await settle();
    // where the day is, and what to do if it rains, follow the stops too
    const hubsWed = NYC.dayHubs('d4'), rainWed = NYC.dayRain('d4');
    const onTrip = new Set(); T.DAYS.forEach(d => NYC.agIds(d.key).forEach(id => onTrip.add(id)));
    if (!hubsWed.includes('fidi')) fail('Wednesday\'s neighbourhoods ignore the Statue it now holds: ' + hubsWed.join());
    else if (!rainWed.length || rainWed.some(id => onTrip.has('p:' + id))) fail('Wednesday\'s rain plan is empty or offers a stop already on the trip: ' + rainWed.join());
    else ok('the neighbourhoods and the rain plan follow the stops (' + hubsWed.join(', ') + '; rain: ' + rainWed.slice(0, 3).join(', ') + '…)');
  }
  // a stop the title names leaves, even though most of the day is still there
  NYC.state.agenda = {};
  NYC.agSave('d5', NYC.agIds('d5').filter(x => x !== 'p:central-park')); NYC.agInsert('d4', 'p:central-park');
  const thu = NYC.dayStory('d5', 'en');
  if (thu.mode !== 'changed' || thu.title === T.DAYS[5].title || !/Broadway/.test(thu.title)) fail('moving the Park off "' + T.DAYS[5].title + '" left the title as "' + thu.title + '"');
  else ok('moving the Park off "' + T.DAYS[5].title + '" rewrites its title: "' + thu.title + '"');
  // a rearranged day's rain plan never offers what is already on another day
  NYC.state.agenda = {};
  NYC.agSave('d4', NYC.agIds('d4').filter(x => ['p:brooklyn-heights-promenade', 'p:brooklyn-bridge-park', 'x:sunset-pier1', 'p:colonie'].indexOf(x) < 0));
  const rainBk = NYC.dayRain('d4'), onTrip2 = new Set(); T.DAYS.forEach(d => NYC.agIds(d.key).forEach(id => onTrip2.add(id)));
  if (!rainBk.length) fail('a rearranged day near home has no rain plan');
  else if (rainBk.some(id => onTrip2.has('p:' + id))) fail('a rearranged day\'s rain plan offers a stop already on another day (tapping it would take it off that day): ' + rainBk.join(', '));
  else ok('a rearranged day\'s rain plan offers only places not already on the trip (' + rainBk.slice(0, 3).join(', ') + '…)');
  // what the review of this change found, each pinned by a test
  const titleIn = (d) => LGS.map(lg => NYC.dayStory(d, lg).title);
  NYC.state.agenda = {}; NYC.agSave('d4', []); NYC.agInsert('d4', 'p:coney-island'); NYC.agInsert('d4', 'p:brighton-beach');
  const coney = titleIn('d4');
  if (coney.some(tl => /(.+) (&|и) \1/.test(tl) || /Coney Island.*Coney Island|Кони-Айленд.*Кони-Айленд/.test(tl))) fail('a title says the same name twice: ' + coney.join(' / '));
  else ok('a title never says the same name twice (' + coney[0] + ')');
  NYC.state.custom.kn1 = { name: 'Brunch with Anna & Co.', d: 90, t: '11:00' }; NYC.state.custom.kn2 = { name: 'Nail salon', d: 60, t: '15:00' };
  NYC.state.agenda = {}; NYC.agSave('d4', ['c:kn1', 'c:kn2']);
  const own = NYC.dayStory('d4', 'en');
  if (own.title === 'A quiet day at home' || !/Brunch with Anna/.test(own.title)) fail('a day of your own ideas without map links is titled "' + own.title + '"');
  else if (/\.\./.test(own.lede)) fail('a name ending in a full stop gets a second one: ' + own.lede);
  else ok('a day of your own unmapped ideas is titled by them ("' + own.title + '"), with no doubled full stop');
  delete NYC.state.custom.kn1; delete NYC.state.custom.kn2;
  NYC.state.agenda = {}; NYC.agSave('d5', NYC.agIds('d5').filter(x => x !== 'x:pre-show-bite'));
  if (!/lunch at Café Sabarsky/.test(NYC.dayStory('d5', 'en').lede)) fail('a 70-minute lunch at Café Sabarsky is not called lunch: ' + NYC.dayStory('d5', 'en').lede);
  else ok('a long midday stop at a café is lunch, not dessert');
  NYC.state.agenda = {}; NYC.agSave('d8', NYC.agIds('d8').filter(x => x !== 'p:green-wood-cemetery'));
  const dep = titleIn('d8');
  if (!/& flight home$/.test(dep[0]) || !/ и вылет домой$/.test(dep[1]) || !/Heimflug$/.test(dep[2])) fail('an ordinary noun is capitalised mid-title: ' + dep.join(' / '));
  else ok('"' + dep[0] + '" / "' + dep[1] + '": ordinary nouns stay lower-case mid-title');
  NYC.state.agenda = {};
  if (NYC.dayRain('d4').includes('brooklyn-museum')) fail('Wednesday\'s written rain plan offers the Brooklyn Museum, which is Saturday\'s (tapping it would take it off Saturday)');
  else ok('a written rain plan leaves out what is already on another day');
  NYC.agSave('d5', NYC.agIds('d5').filter(x => x !== 'p:central-park'));
  if (NYC.dayRain('d5').includes('neue-galerie')) fail('the rain plan offers the Neue Galerie, whose galleries are closed for the whole trip');
  else ok('the Neue Galerie, closed for the whole trip, is never offered');
  NYC.state.agenda = {};
  const AO = (id) => { const p = NYC.PL[id]; const a = window.GEO.areaOf(p.lat, p.lng); return a && a.key; };
  if (AO('central-park') !== 'centralpark' || AO('mad-museum') !== 'midtown' || AO('bergdorf-goodman') !== 'midtown') fail('neighbourhoods around Central Park South are wrong: ' + ['central-park', 'mad-museum', 'bergdorf-goodman'].map(AO).join(', '));
  else ok('Central Park is Central Park, Columbus Circle and Bergdorf are Midtown');

  // an emptied day says so, and nothing that depends on its area breaks
  NYC.state.agenda = {};
  NYC.agSave('d3', []);
  const free = LGS.map(lg => NYC.dayStory('d3', lg).title).join(' / ');
  let fits = null; try { fits = NYC.rankDays(NYC.PL['the-oculus']); } catch (e) { fail('ranking days threw with an empty day: ' + e.message); }
  if (free !== 'Free day / Свободный день / Freier Tag') fail('an empty day is titled ' + free);
  else if (NYC.dayHubs('d3').length || NYC.dayRain('d3').length) fail('an empty day still claims a neighbourhood or a rain plan');
  else if (!fits || fits.some(f => !Number.isFinite(f.score))) fail('ranking days gave nonsense with an empty day');
  else ok('an emptied day reads "' + free + '" and has no neighbourhood of its own');
  NYC.state.agenda = {};
  delete NYC.state.custom.kold;
  NYC.renderAll(); await settle();

  // ---- what a planted row in the shared table can and cannot do ----
  console.log('planted rows:');
  NYC.state.custom.long = { name: ' '.repeat(40000) + 'x', d: 60, t: '14:00' };
  NYC.state.custom.cproto2 = { name: 'Proto', d: 'abc', t: { h: 1 }, cat: '__proto__' };
  NYC.state.agenda = { d5: { ids: planOf('d5').concat([7, null, {}, 'x:constructor', 'c:constructor', 'p:toString', 'c:long', 'c:cproto2']), t: { 'p:the-met': { x: 1 }, 'p:cafe-sabarsky': '99:99:99' }, d: { 'p:the-met': 'abc', 'p:central-park': 1e9 }, seen: planOf('d5'), at: 1e15 } };
  let planted = null; const t0 = Date.now();
  try { NYC.renderAll(); await settle(); const rows = NYC.agReflow('d5', NYC.agIds('d5')); planted = rows.every(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end - r.start <= 720); LGS.forEach(lg => NYC.dayStory('d5', lg)); }
  catch (e) { fail('a planted row crashed the app: ' + e.message); }
  const took = Date.now() - t0;
  if (planted === false) fail('a planted row made the day\'s timings nonsense');
  else if (planted && took > 1500) fail('a planted 40,000-character name froze rendering for ' + took + ' ms');
  else if (planted) ok('junk ids, prototype names, bad times and durations and a 40,000-character name neither crash nor stall the app (' + took + ' ms)');
  NYC.state.custom.who1 = { name: 'An idea', d: 60, who: '<img id="pwn" src="x">' }; NYC.state.settings.names = { v: { Y: '<b id="pwn2">Y</b>' } };
  NYC.renderAll(); await settle();
  if (document.getElementById('pwn') || document.getElementById('pwn2')) fail('a synced name was rendered as HTML');
  else ok('synced names are shown as text, never as HTML');
  ['long', 'cproto2', 'who1'].forEach(k => { delete NYC.state.custom[k]; }); delete NYC.state.settings.names;
  NYC.state.agenda = {}; NYC.renderAll(); await settle();

  // ---- the tour's sheets ----
  console.log('tour sheets:');
  NYC.state.custom.topidea = { name: 'Our favourite idea', d: 60 }; NYC.state.vote['c:topidea'] = { Y: 'yes', T: 'yes' };
  NYC.renderAll(); await settle();
  const stepIx = (k) => NYC.TOUR.findIndex(s => s.key === k);
  NYC.tourStart(); NYC.tourGo(stepIx('explace'), 1); await settle();
  const h3 = (document.querySelector('#sheet h3') || {}).textContent || '';
  if (document.getElementById('sheet').hidden || /Our favourite idea/.test(h3) || document.getElementById('sh-cmap')) fail('the vote step opened your own idea rather than a place from the library: ' + h3);
  else ok('the vote step opens a place from the library even when one of your ideas tops the list ("' + h3 + '")');
  NYC.tourGo(stepIx('replanask'), 1); await settle();
  click(document.getElementById('langbtn')); await settle();
  const sheetRu = (document.querySelector('#sheet h3') || {}).textContent || '';
  if (!/Перепланировать/.test(sheetRu) || !/Консьерж|консьерж/.test(document.getElementById('tourbody').textContent)) fail('switching to Russian on the Replan step left the sheet in English: ' + sheetRu);
  else ok('switching language on a tour step with a sheet translates the sheet too');
  click(document.getElementById('langbtn')); click(document.getElementById('langbtn')); await settle();
  NYC.tourEnd(true);
  if (!document.getElementById('sheet').hidden || document.body.style.overflow === 'hidden') fail('ending the tour left its sheet open or the page locked');
  else ok('ending the tour closes its sheet and unlocks the page');
  delete NYC.state.custom.topidea; delete NYC.state.vote['c:topidea'];
  // search reads every language the app speaks
  const search = document.getElementById('exsearch');
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'explore'));
  const found = {};
  for (const q of ['пицца', 'Dachbar', 'pizza']) { search.value = q; search.dispatchEvent(new window.Event('input', { bubbles: true })); found[q] = document.querySelectorAll('#exlist .card').length; }
  search.value = ''; search.dispatchEvent(new window.Event('input', { bubbles: true }));
  if (!found['пицца'] || !found['Dachbar']) fail('searching in Russian or German finds nothing: ' + JSON.stringify(found));
  else ok('search works in Russian and German too (' + JSON.stringify(found) + ')');
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'home'));

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
  Object.keys(T.STOP_STORY || {}).forEach(k => { if (!T.STOPS[k]) fail('STOP_STORY describes an unknown stop ' + k); });
  T.DAYS.forEach(d => (d.titled || []).forEach(ref => { if (!T.SEED[d.key].some(x => x[0] === ref)) fail(d.key + ' title names ' + ref + ', which is not on that day'); }));
  const G2 = window.GEO; const noArea = [];
  Object.entries(T.SEED).forEach(([d, arr]) => arr.forEach(([ref]) => { if (!ref.startsWith('p:')) return; const p = PLACES.find(x => x.id === ref.slice(2)); if (p && !G2.areaOf(p.lat, p.lng)) noArea.push(ref); }));
  if (noArea.length) fail('seeded places with no neighbourhood name: ' + noArea.join(', ')); else ok('every seeded place has a neighbourhood name, and every titled stop is on its day');
  if ((T.TRAVELERS || []).length !== 2 || (T.TRAVELERS || []).some(t => /mike/i.test(t.join(' ')))) fail('the travellers are not just Yulia and Tatyana: ' + JSON.stringify(T.TRAVELERS));
  const mikeLeft = ['index.html', 'app.js', 'app.css', 'data/plan.js', 'data/places.js', 'data/guide.js', 'data/tour.js', 'concierge/index.js', 'manifest.webmanifest'].filter(f => /\bmikes?\b|🎷/i.test(read(f)) || /(^|[^а-яё])майк(?!елсон)/i.test(read(f)));   // (Sarah Michelson, «Майкелсон», is not him)
  if (mikeLeft.length) fail('Mike is still mentioned in: ' + mikeLeft.join(', '));
  else if (document.querySelector('[data-mike], .mikebtn, #nameM')) fail('the page still has a "Mike joins" control');
  else ok('the app is for Yulia and Tatyana only: no Mike in the data, the concierge brief or the page');
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
