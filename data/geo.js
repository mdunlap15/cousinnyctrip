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

  // Neighbourhood names for writing about a day ("Chelsea & the Village"). Finer
  // than the hubs, which only need to be right about travel: a stop belongs to
  // the area with the nearest point, and some areas need several points to
  // cover their shape. [key, English, Russian, German, [[lat, lng], …]]
  const AREAS = [
    ['parkslope', 'Park Slope', 'Парк-Слоуп', 'Park Slope', [[40.6680, -73.9810], [40.6760, -73.9780]]],
    ['prospectpark', 'Prospect Park', 'Проспект-парк', 'Prospect Park', [[40.6620, -73.9690], [40.6540, -73.9700]]],
    ['prospect', 'Prospect Heights', 'Проспект-Хайтс', 'Prospect Heights', [[40.6775, -73.9665], [40.6800, -73.9740]]],
    ['greenwood', 'Green-Wood', 'Грин-Вуд', 'Green-Wood', [[40.6540, -73.9920]]],
    ['sunsetpark', 'Sunset Park', 'Сансет-Парк', 'Sunset Park', [[40.6555, -74.0070], [40.6460, -74.0100]]],
    ['carroll', 'Carroll Gardens', 'Кэрролл-Гарденс', 'Carroll Gardens', [[40.6800, -73.9960], [40.6870, -73.9930]]],
    ['redhook', 'Red Hook', 'Ред-Хук', 'Red Hook', [[40.6770, -74.0120]]],
    ['bkheights', 'Brooklyn Heights', 'Бруклин-Хайтс', 'Brooklyn Heights', [[40.6960, -73.9950], [40.6920, -73.9990]]],
    ['dumbo', 'DUMBO', 'Дамбо', 'DUMBO', [[40.7030, -73.9890], [40.7040, -73.9950]]],
    ['fortgreene', 'Fort Greene', 'Форт-Грин', 'Fort Greene', [[40.6890, -73.9750], [40.6905, -73.9840]]],
    ['wburg', 'Williamsburg', 'Уильямсбург', 'Williamsburg', [[40.7155, -73.9600], [40.7100, -73.9570], [40.7200, -73.9560]]],
    ['greenpoint', 'Greenpoint', 'Гринпойнт', 'Greenpoint', [[40.7300, -73.9540]]],
    ['bushwick', 'Bushwick', 'Бушвик', 'Bushwick', [[40.7050, -73.9220]]],
    ['coney', 'Coney Island', 'Кони-Айленд', 'Coney Island', [[40.5750, -73.9800], [40.5770, -73.9610]]],
    ['harbor', 'the harbor', 'гавань', 'der Hafen', [[40.6892, -74.0445], [40.6995, -74.0396], [40.6895, -74.0168]]],
    ['fidi', 'Lower Manhattan', 'Нижний Манхэттен', 'Lower Manhattan', [[40.7075, -74.0110], [40.7115, -74.0135], [40.7060, -74.0030], [40.7128, -74.0060], [40.7035, -74.0165]]],
    ['tribeca', 'Tribeca', 'Трайбека', 'Tribeca', [[40.7185, -74.0090]]],
    ['chinatown', 'Chinatown', 'Чайнатаун', 'Chinatown', [[40.7155, -73.9975]]],
    ['soho', 'SoHo', 'Сохо', 'SoHo', [[40.7240, -74.0010], [40.7225, -73.9970], [40.7200, -73.9975], [40.7270, -73.9935]]],
    ['les', 'the Lower East Side', 'Нижний Ист-Сайд', 'Lower East Side', [[40.7185, -73.9880], [40.7160, -73.9850]]],
    ['evillage', 'the East Village', 'Ист-Виллидж', 'East Village', [[40.7265, -73.9830], [40.7290, -73.9890]]],
    ['wvillage', 'the Village', 'Гринвич-Виллидж', 'Greenwich Village', [[40.7340, -74.0030], [40.7310, -73.9985], [40.7360, -74.0060]]],
    ['chelsea', 'Chelsea', 'Челси', 'Chelsea', [[40.7440, -74.0040], [40.7410, -74.0080], [40.7470, -74.0010]]],
    ['hudsonyards', 'Hudson Yards', 'Хадсон-Ярдс', 'Hudson Yards', [[40.7535, -74.0015]]],
    ['flatiron', 'Flatiron', 'Флэтайрон', 'Flatiron', [[40.7410, -73.9895], [40.7359, -73.9906], [40.7450, -73.9880]]],
    ['midtown', 'Midtown', 'Мидтаун', 'Midtown', [[40.7580, -73.9855], [40.7527, -73.9772], [40.7587, -73.9787], [40.7536, -73.9832], [40.7625, -73.9740], [40.7610, -73.9680], [40.7505, -73.9934], [40.7665, -73.9815]]],
    ['centralpark', 'Central Park', 'Центральный парк', 'Central Park', [[40.7655, -73.9745], [40.7712, -73.9742], [40.7690, -73.9755], [40.7760, -73.9690], [40.7850, -73.9650]]],
    ['ues', 'the Upper East Side', 'Верхний Ист-Сайд', 'Upper East Side', [[40.7736, -73.9590], [40.7790, -73.9612], [40.7700, -73.9640], [40.7830, -73.9560]]],
    ['uws', 'the Upper West Side', 'Верхний Вест-Сайд', 'Upper West Side', [[40.7810, -73.9760], [40.7730, -73.9830], [40.7870, -73.9730]]],
    ['harlem', 'Harlem', 'Гарлем', 'Harlem', [[40.8090, -73.9480], [40.8100, -73.9580]]],
    ['uptown', 'Upper Manhattan', 'Верхний Манхэттен', 'Upper Manhattan', [[40.8600, -73.9330], [40.8420, -73.9400]]],
    ['roosevelt', 'Roosevelt Island', 'остров Рузвельт', 'Roosevelt Island', [[40.7620, -73.9500]]],
    ['lic', 'Long Island City', 'Лонг-Айленд-Сити', 'Long Island City', [[40.7450, -73.9500], [40.7470, -73.9570]]],
    ['astoria', 'Astoria', 'Астория', 'Astoria', [[40.7640, -73.9230], [40.7560, -73.9260]]],
    ['flushing', 'Flushing', 'Флашинг', 'Flushing', [[40.7580, -73.8300], [40.7500, -73.8450]]],
    ['bronx', 'the Bronx', 'Бронкс', 'die Bronx', [[40.8296, -73.9262], [40.8506, -73.8770], [40.8623, -73.8800]]],
    ['staten', 'Staten Island', 'Статен-Айленд', 'Staten Island', [[40.6437, -74.0736]]],
    ['jfk', 'JFK', 'JFK', 'JFK', [[40.6431, -73.7896]]],
  ].map(a => ({ key: a[0], en: a[1], ru: a[2], de: a[3], pts: a[4] }));
  // The area a point is in, or null when it is nowhere near any of them.
  function areaOf(lat, lng) {
    if (lat == null || lng == null) return null;
    let best = null, bd = Infinity;
    AREAS.forEach(a => a.pts.forEach(p => { const d = haversine(lat, lng, p[0], p[1]); if (d < bd) { bd = d; best = a; } }));
    return bd <= 3 ? best : null;
  }

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

  root.GEO = { HOME, HUBS, HUB, PAIRS, AREAS, areaOf, haversine, nearestHub, hubToHub, travelMin, travelMode, fromHome, walkMin, mapsDir, mapsSearch, parseMapsLink, isShortMapHost };
})(typeof window !== 'undefined' ? window : globalThis);
