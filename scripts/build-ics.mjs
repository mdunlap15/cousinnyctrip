// Generates trip.ics (the seeded plan) by booting the app headlessly and asking
// the engine for its calendar export. Run: node scripts/build-ics.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dom = new JSDOM(read('index.html'), { url: 'https://mdunlap15.github.io/cousinnyctrip/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.fetch = () => Promise.resolve({ ok: true, json: async () => ({ daily: null }) });
window.scrollTo = () => {}; window.Element.prototype.scrollIntoView = () => {}; window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
for (const f of ['config.js', 'data/geo.js', 'data/plan.js', 'data/places.js', 'data/guide.js', 'app.js']) window.eval(read(f));
const ics = window.NYC.buildICS();
fs.writeFileSync(path.join(root, 'trip.ics'), ics);
console.log('wrote trip.ics with', (ics.match(/BEGIN:VEVENT/g) || []).length, 'events');
process.exit(0);
