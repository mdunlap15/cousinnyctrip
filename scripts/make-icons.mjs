// Renders the app icon (an SVG drawn below) to icon-180/192/512.png with the
// pre-installed Chromium. Run: node scripts/make-icons.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const svg = (size) => `<!DOCTYPE html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1A1D24"/><stop offset="1" stop-color="#0F1115"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFD25A"/><stop offset="1" stop-color="#F5B700"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- taxi-yellow sun behind the skyline -->
  <circle cx="330" cy="215" r="96" fill="url(#sun)"/>
  <!-- skyline: Brooklyn Bridge tower + towers -->
  <g fill="#F6F1E7">
    <rect x="70" y="250" width="34" height="170"/>
    <rect x="112" y="205" width="26" height="215"/>
    <rect x="146" y="290" width="40" height="130"/>
    <rect x="196" y="160" width="30" height="260"/>
    <rect x="211" y="128" width="4" height="40"/>
    <rect x="236" y="230" width="44" height="190"/>
    <rect x="290" y="270" width="26" height="150"/>
    <rect x="324" y="300" width="60" height="120"/>
    <rect x="392" y="240" width="30" height="180"/>
    <rect x="430" y="280" width="24" height="140"/>
  </g>
  <!-- bridge cables -->
  <g stroke="#F6F1E7" stroke-width="6" fill="none" stroke-linecap="round">
    <path d="M40 300 C 150 380, 260 380, 470 300"/>
    <path d="M40 330 C 150 400, 260 400, 470 330"/>
  </g>
  <rect x="30" y="420" width="452" height="14" rx="7" fill="#F5B700"/>
  <!-- subway-bullet initials -->
  <circle cx="110" cy="112" r="46" fill="#FF6319"/>
  <text x="110" y="130" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="52" fill="#fff">F</text>
  <circle cx="200" cy="112" r="46" fill="#6CBE45"/>
  <text x="200" y="130" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="52" fill="#fff">G</text>
</svg></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
for (const size of [512, 192, 180]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(svg(size));
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  fs.writeFileSync(path.join(root, `icon-${size}.png`), buf);
  console.log('wrote icon-' + size + '.png', buf.length, 'bytes');
}
await browser.close();
