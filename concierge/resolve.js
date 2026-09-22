// Expands a map share link (maps.app.goo.gl/…, maps.apple/p/…) into the long
// URL it stands for, so the app can read the coordinates out of it. A browser
// cannot do this itself: the redirect crosses origins and comes back opaque.
//
// Following a URL someone hands you is how servers get tricked into fetching
// things they should not (SSRF), so this is deliberately narrow:
//   • https only, and every hop must land on a known map host — checked by
//     exact hostname, so google.com.evil.com is not google.com;
//   • at most a few hops, each with a short timeout;
//   • it returns a URL and nothing else. No response body ever leaves here.
// It stops as soon as the link is no longer a short one, so it never downloads
// the (heavy) map page itself.

const SHORT = (h, p) => h === 'maps.app.goo.gl' || (h === 'goo.gl' && p.startsWith('/maps')) || h === 'maps.apple';
const GOOGLE = (h, p) => (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(h) && p.startsWith('/maps')) || /^maps\.google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(h);
const APPLE = (h) => h === 'maps.apple.com';
// Google sends EU visitors via a consent page first; the real destination is
// in its continue= parameter. It is read, never fetched.
const CONSENT = (h) => h === 'consent.google.com';

function parse(href) { try { return new URL(href); } catch (e) { return null; } }
function allowed(u) {
  if (!u || u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase(), p = u.pathname;
  return SHORT(h, p) || GOOGLE(h, p) || APPLE(h) || CONSENT(h);
}
const isShort = (u) => SHORT(u.hostname.toLowerCase(), u.pathname);

// A phone's user agent: the short-link service answers a browser with a plain
// redirect, which is all we want from it.
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export async function resolveMapsLink(input, { fetchImpl = fetch, maxHops = 5, timeoutMs = 6000 } = {}) {
  let cur = parse(String(input || '').trim());
  if (!allowed(cur)) return { error: 'not a map link' };
  if (CONSENT(cur.hostname)) cur = parse(cur.searchParams.get('continue') || '');
  if (!allowed(cur)) return { error: 'not a map link' };

  for (let hop = 0; hop <= maxHops; hop++) {
    if (!isShort(cur)) return { url: cur.href };          // expanded: hand it back

    let res;
    try {
      res = await fetchImpl(cur.href, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) { return { error: 'could not reach the map service' }; }

    let nextHref = res.headers && res.headers.get('location');
    if (!nextHref && res.status >= 200 && res.status < 300 && res.body) {
      // No redirect header: some short links answer with a page that points
      // onward instead. Look in the first 64 KB for a map URL, and no further.
      const text = await readCapped(res, 65536);
      const m = text.match(/https:\/\/(?:www\.)?google\.[a-z.]{2,8}\/maps\/[^"'<>\s\\]+|https:\/\/maps\.apple\.com\/[^"'<>\s\\]+/);
      if (m) nextHref = m[0].replace(/&amp;/g, '&');
    } else if (res.body && typeof res.body.cancel === 'function') {
      try { await res.body.cancel(); } catch (e) {}
    }
    if (!nextHref) return { error: 'the link did not lead anywhere' };

    let next = parse(new URL(nextHref, cur.href).href);
    if (next && CONSENT(next.hostname)) next = parse(next.searchParams.get('continue') || '');
    if (!allowed(next)) return { error: 'the link led somewhere that is not a map' };
    cur = next;
  }
  return { error: 'too many redirects' };
}

async function readCapped(res, cap) {
  const reader = res.body.getReader(); const chunks = []; let n = 0;
  try {
    while (n < cap) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
  } finally { try { await reader.cancel(); } catch (e) {} }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, cap).toString('utf8');
}
