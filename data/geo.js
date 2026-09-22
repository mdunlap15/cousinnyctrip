// ============================================================================
// GEO — home base, transit hubs and the door-to-door travel-time model.
// Pure functions, no DOM: the running order, the day planner and the smoke
// test all use this. Times are deliberately a little generous (real trips
// include stairs, waiting on the platform and a wrong turn or two).
// ============================================================================
(function (root) {
  const HOME = { key: 'home', name: '490A 7th Ave (home)', nameRu: '490A 7-я авеню (дом)', lat: 40.6619, lng: -73.9836, hood: 'Park Slope' };

  // Subway hubs. `home` = minutes door-to-door from the apartment (walk to
  // 15th St–Prospect Park / 7th Ave F/G, wait, ride, walk out the other end).
  const HUBS = [
    { key: 'home',      name: 'Park Slope',              lat: 40.6619, lng: -73.9836, home: 0 },
    { key: 'southslope',name: 'Green-Wood / Sunset Park', lat: 40.6560, lng: -73.9950, home: 18 },
    { key: 'prospect',  name: 'Prospect Heights',        lat: 40.6720, lng: -73.9640, home: 22 },
    { key: 'carroll',   name: 'Carroll Gardens / Cobble Hill', lat: 40.6815, lng: -73.9950, home: 20 },
    { key: 'redhook',   name: 'Red Hook',                lat: 40.6770, lng: -74.0120, home: 35 },
    { key: 'dumbo',     name: 'DUMBO / Brooklyn Heights', lat: 40.7010, lng: -73.9900, home: 25 },
    { key: 'wburg',     name: 'Williamsburg',            lat: 40.7165, lng: -73.9585, home: 35 },
    { key: 'greenpoint',name: 'Greenpoint',              lat: 40.7300, lng: -73.9545, home: 42 },
    { key: 'bushwick',  name: 'Bushwick',                lat: 40.7060, lng: -73.9230, home: 48 },
    { key: 'coney',     name: 'Coney Island / Brighton', lat: 40.5760, lng: -73.9760, home: 50 },
    { key: 'fidi',      name: 'FiDi / World Trade',      lat: 40.7110, lng: -74.0110, home: 35 },
    { key: 'soho',      name: 'SoHo / Nolita / Chinatown', lat: 40.7225, lng: -73.9985, home: 35 },
    { key: 'les',       name: 'Lower East Side / East Village', lat: 40.7240, lng: -73.9880, home: 35 },
    { key: 'wvillage',  name: 'West Village',            lat: 40.7340, lng: -74.0030, home: 40 },
    { key: 'chelsea',   name: 'Chelsea / Meatpacking',   lat: 40.7430, lng: -74.0040, home: 42 },
    { key: 'flatiron',  name: 'Flatiron / Union Square', lat: 40.7385, lng: -73.9890, home: 40 },
    { key: 'midtownw',  name: 'Midtown West / Times Sq', lat: 40.7580, lng: -73.9860, home: 45 },
    { key: 'midtowne',  name: 'Midtown East / Grand Central', lat: 40.7530, lng: -73.9760, home: 48 },
    { key: 'ues',       name: 'Upper East Side',         lat: 40.7770, lng: -73.9630, home: 55 },
    { key: 'uws',       name: 'Upper West Side',         lat: 40.7790, lng: -73.9790, home: 52 },
    { key: 'harlem',    name: 'Harlem',                  lat: 40.8090, lng: -73.9480, home: 60 },
    { key: 'lic',       name: 'Long Island City / Astoria', lat: 40.7470, lng: -73.9450, home: 50 },
    { key: 'roosevelt', name: 'Roosevelt Island',        lat: 40.7620, lng: -73.9500, home: 48 },
    { key: 'bronx',     name: 'Yankee Stadium',          lat: 40.8296, lng: -73.9262, home: 65 },
    { key: 'jfk',       name: 'JFK Airport',             lat: 40.6413, lng: -73.7781, home: 60 },
  ];
  const HUB = {}; HUBS.forEach(h => { HUB[h.key] = h; });

  // Hub-to-hub subway minutes (door-to-door, symmetric). Missing pairs fall
  // back to the formula below. Keys are 'a|b' with a < b alphabetically.
  const PAIRS = {
    'dumbo|fidi': 15, 'dumbo|soho': 20, 'dumbo|les': 22, 'dumbo|wburg': 28, 'dumbo|midtownw': 35, 'dumbo|midtowne': 35, 'dumbo|carroll': 18, 'dumbo|prospect': 25,
    'fidi|soho': 15, 'fidi|les': 18, 'fidi|wvillage': 18, 'fidi|chelsea': 22, 'fidi|flatiron': 20, 'fidi|midtownw': 25, 'fidi|midtowne': 25, 'fidi|ues': 40, 'fidi|uws': 38, 'fidi|wburg': 35, 'fidi|carroll': 25,
    'les|soho': 12, 'les|wvillage': 18, 'les|flatiron': 18, 'les|chelsea': 22, 'les|midtownw': 28, 'les|midtowne': 28, 'les|ues': 35, 'les|wburg': 18, 'les|uws': 40,
    'soho|wvillage': 12, 'soho|chelsea': 18, 'soho|flatiron': 15, 'soho|midtownw': 22, 'soho|midtowne': 25, 'soho|ues': 35, 'soho|uws': 35, 'soho|wburg': 30,
    'chelsea|wvillage': 12, 'chelsea|flatiron': 15, 'chelsea|midtownw': 15, 'chelsea|midtowne': 22, 'chelsea|ues': 35, 'chelsea|uws': 25,
    'flatiron|wvillage': 15, 'flatiron|midtownw': 15, 'flatiron|midtowne': 15, 'flatiron|ues': 28, 'flatiron|uws': 28, 'flatiron|wburg': 30,
    'midtowne|midtownw': 12, 'midtowne|ues': 18, 'midtowne|uws': 22, 'midtowne|roosevelt': 18, 'midtowne|lic': 20, 'midtowne|harlem': 28, 'midtowne|wburg': 35, 'midtowne|wvillage': 22,
    'midtownw|ues': 25, 'midtownw|uws': 15, 'midtownw|harlem': 22, 'midtownw|wburg': 35, 'midtownw|wvillage': 18, 'midtownw|lic': 25, 'midtownw|bronx': 28,
    'ues|uws': 22, 'ues|harlem': 18, 'ues|roosevelt': 15, 'ues|wvillage': 35,
    'uws|harlem': 15, 'uws|wvillage': 28,
    'greenpoint|wburg': 12, 'greenpoint|lic': 18, 'greenpoint|les': 30, 'bushwick|wburg': 18, 'bushwick|les': 30,
    'carroll|redhook': 20, 'carroll|soho': 30, 'carroll|fidi': 25, 'home|redhook': 35, 'home|southslope': 18,
    'coney|fidi': 50, 'coney|soho': 55, 'home|coney': 50,
    'jfk|fidi': 60, 'jfk|midtowne': 60, 'jfk|midtownw': 65, 'jfk|dumbo': 55, 'jfk|wburg': 65,
  };
  HUBS.forEach(h => { if (h.key !== 'home') PAIRS[['home', h.key].sort().join('|')] = h.home; });

  function haversine(a, b, c, d) {
    const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nearestHub(lat, lng) {
    let best = null, bd = Infinity;
    HUBS.forEach(h => { const d = haversine(lat, lng, h.lat, h.lng); if (d < bd) { bd = d; best = h; } });
    return { hub: best, km: bd };
  }
  const walkMin = (km) => Math.max(3, Math.round(km * 1.25 * 13)); // 13 min/km at a stroll, 1.25 route factor
  function hubToHub(a, b) {
    if (a === b) return 0;
    const k = [a, b].sort().join('|');
    if (PAIRS[k] != null) return PAIRS[k];
    const A = HUB[a], B = HUB[b];
    const km = haversine(A.lat, A.lng, B.lat, B.lng) * 1.3;
    const cross = (A.key.match(/^(home|southslope|prospect|carroll|redhook|dumbo|wburg|greenpoint|bushwick|coney)$/) ? 1 : 0) !== (B.key.match(/^(home|southslope|prospect|carroll|redhook|dumbo|wburg|greenpoint|bushwick|coney)$/) ? 1 : 0);
    return Math.round((14 + km * 2.6 + (cross ? 8 : 0)) / 5) * 5;
  }
  // Door-to-door minutes between two [lat,lng] points; null if either is unknown.
  // maxWalkKm raises the walking cutoff — pass a larger number when the walk is
  // itself the point (crossing Central Park to get to Bethesda Terrace is not a
  // journey you would take a train for, even though it is nearly two kilometres).
  function travelMin(from, to, maxWalkKm) {
    if (!from || !to) return null;
    const straight = haversine(from[0], from[1], to[0], to[1]);
    if (straight < 0.1) return 0;
    // New Yorkers walk a mile without thinking about it, and below ~1.7 km walking
    // beats waiting for a train anyway.
    if (straight <= (maxWalkKm || 1.7)) return walkMin(straight);
    const A = nearestHub(from[0], from[1]), B = nearestHub(to[0], to[1]);
    let mins = hubToHub(A.hub.key, B.hub.key);
    if (mins === 0) mins = Math.max(walkMin(straight), 10);
    // extra walking from the far side of a hub (the first 600 m is already inside the estimate)
    mins += Math.max(0, walkMin(Math.max(0, A.km - 0.6))) + Math.max(0, walkMin(Math.max(0, B.km - 0.6)));
    return Math.min(180, Math.round(mins / 5) * 5);
  }
  const fromHome = (lat, lng) => travelMin([HOME.lat, HOME.lng], [lat, lng]);
  // Which travel mode the estimate assumes — for the little labels
  function travelMode(from, to, maxWalkKm) {
    if (!from || !to) return '';
    const km = haversine(from[0], from[1], to[0], to[1]);
    if (km < 0.1) return 'same';
    if (km <= (maxWalkKm || 1.7)) return 'walk';
    return 'subway';
  }
  // Google Maps transit directions deep link
  function mapsDir(from, to, mode) {
    const o = from ? (from[0] + ',' + from[1]) : 'Current+Location';
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(o) + '&destination=' + encodeURIComponent(to[0] + ',' + to[1]) + '&travelmode=' + (mode || 'transit');
  }
  function mapsSearch(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }

  // ---- map links pasted by hand ----
  // Reads a location out of whatever someone pastes when adding their own stop:
  // a Google or Apple Maps link, or a bare "40.7128, -74.0060". Returns null if
  // it is not a map link at all, otherwise { lat, lng, name, needsResolve }.
  // lat/lng are null when the link carries no coordinates. needsResolve means
  // it is a share link (maps.app.goo.gl, maps.apple/p/…) whose coordinates only
  // appear after following a redirect — which a browser cannot do across
  // origins, so the concierge proxy does it.
  function isGoogleMapsHost(h, path) {
    return (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(h) && path.indexOf('/maps') === 0) || /^maps\.google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(h);
  }
  function isShortMapHost(h, path) {
    return h === 'maps.app.goo.gl' || (h === 'goo.gl' && path.indexOf('/maps') === 0) || h === 'maps.apple';
  }
  function parseMapsLink(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    const good = (a, b) => isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0);
    const pair = (str) => { const m = String(str || '').match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/); return m && good(+m[1], +m[2]) ? [+m[1], +m[2]] : null; };
    // a bare coordinate pair
    const bare = raw.match(/^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
    if (bare) return good(+bare[1], +bare[2]) ? { lat: +bare[1], lng: +bare[2], name: '', needsResolve: false } : null;
    let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return null; }
    const h = u.hostname.toLowerCase(), path = u.pathname, q = u.searchParams;
    const apple = h === 'maps.apple.com';
    const google = isGoogleMapsHost(h, path);
    const short = isShortMapHost(h, path);
    if (!apple && !google && !short) return null;
    const dec = (x) => { try { return decodeURIComponent(String(x).replace(/\+/g, ' ')).trim(); } catch (e) { return String(x).trim(); } };
    let lat = null, lng = null, name = '';
    const take = (c) => { if (c && lat == null) { lat = c[0]; lng = c[1]; } };
    // Most precise first. Google's !3d…!4d… is the place itself; @lat,lng is only
    // where the map happened to be centred.
    const full = u.href;
    const bang = full.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)(?![\s\S]*!3d)/);
    if (bang && good(+bang[1], +bang[2])) take([+bang[1], +bang[2]]);
    ['coordinate', 'll', 'sll', 'q', 'query', 'destination', 'daddr', 'center'].forEach((k) => { if (q.has(k)) take(pair(q.get(k))); });
    const at = path.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (at && good(+at[1], +at[2])) take([+at[1], +at[2]]);
    // a name, when the link carries one
    const placeSeg = path.match(/\/maps\/place\/([^/@]+)/);
    if (placeSeg) name = dec(placeSeg[1]);
    ['name', 'q', 'query'].forEach((k) => { if (!name && q.has(k) && !pair(q.get(k))) name = dec(q.get(k)); });
    if (apple && !name && q.has('address')) name = dec(q.get('address')).split(',')[0];
    return { lat, lng, name: name.slice(0, 120), needsResolve: lat == null && short };
  }

  root.GEO = { HOME, HUBS, HUB, PAIRS, haversine, nearestHub, hubToHub, travelMin, travelMode, fromHome, walkMin, mapsDir, mapsSearch, parseMapsLink, isShortMapHost };
})(typeof window !== 'undefined' ? window : globalThis);
