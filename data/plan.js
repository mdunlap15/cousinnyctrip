// ============================================================================
// TRIP PLAN — every trip-specific value lives here: the dates, the travelers,
// the seeded running order for each day (a starting point, fully editable in
// the app), rainy-day swaps and the "book this now" list.
// Stops reference places in data/places.js by id ('p:<id>') or fixed-time
// custom stops defined in STOPS below ('x:<key>').
// ============================================================================
window.TRIP = {
  TITLE: 'Tatyana in New York',
  TITLE_RU: 'Таня в Нью-Йорке',
  SHORT: 'NYC 2026',
  SUB: 'Nine autumn days, one Park Slope apartment, the whole city within reach. The big sights are pencilled in; the tables, the shopping and the pace are yours to decide together.',
  SUB_RU: 'Девять осенних дней, квартира в Парк-Слоуп и весь город в шаговой доступности. Главное уже намечено карандашом — столики, шопинг и темп выбираете вместе.',
  TIMEZONE: 'America/New_York',
  HOME_LABEL: '490A 7th Ave, Park Slope',
  CHAT_HELLO: 'Hi! I know the whole trip — the plan, the library, the subway from 7th Avenue. Ask me anything, in English or по-русски.',
  CHAT_HELLO_RU: 'Привет! Я знаю всю поездку — план, все места, метро от 7-й авеню. Спрашивайте о чём угодно, по-русски или по-английски.',
  QUICKQS: ['What should we do right now?', "It's raining — replan today", 'Pick tonight\'s dinner near where we are', 'Помоги спланировать завтра'],
  QUICKQS_RU: ['Что нам делать прямо сейчас?', 'Идёт дождь — перепланируй день', 'Выбери ужин рядом с нами', 'Помоги спланировать завтра'],

  // [key, name, russian name, emoji]. Keys are stored in the shared votes/plan.
  TRAVELERS: [['Y', 'Yulia', 'Юля', '🌸'], ['T', 'Tatyana', 'Таня', '🌻'], ['M', 'Mike', 'Майк', '🎷']],

  FLIGHTS: [
    { key: 'out', who: 'Tatyana', date: '2026-09-26', legs: [
      { flight: 'LH 41', from: 'HAJ Hannover', to: 'FRA Frankfurt', dep: '08:40', arr: '09:40', note: '1 h 00' },
      { flight: 'LH 400', from: 'FRA Frankfurt', to: 'JFK New York (Terminal 1)', dep: '10:55', arr: '13:35', note: '8 h 40 · Economy' },
    ] },
    { key: 'back', who: 'Tatyana', date: '2026-10-04', legs: [
      { flight: 'LH 411', from: 'JFK New York (Terminal 1)', to: 'MUC Munich', dep: '17:30', arr: '07:20 +1', note: '7 h 50 · Economy' },
      { flight: 'LH 4072', from: 'MUC Munich', to: 'HAJ Hannover', dep: '11:15', arr: '12:25', note: '1 h 10 · Lufthansa City Airlines' },
    ] },
  ],

  // The day strip and everything else derive from DAYS.
  // hub = the day's centre of gravity (drives "which day fits this place?")
  DAYS: [
    { key: 'd0', date: '2026-09-26', dw: 'Sat', dwRu: 'Сб', dn: '26', hubs: ['home'],
      title: 'Landing day', titleRu: 'День прилёта',
      lede: 'LH 400 lands at 1:35 pm. Nothing is planned but a shower, a slow walk down 7th Avenue and an early, easy dinner — it is 3 a.m. in Hannover by the time dessert comes.',
      ledeRu: 'LH 400 садится в 13:35. Планов никаких: душ, неспешная прогулка по 7-й авеню и ранний лёгкий ужин — к десерту в Ганновере уже 3 часа ночи.' },
    { key: 'd1', date: '2026-09-27', dw: 'Sun', dwRu: 'Вс', dn: '27', hubs: ['home', 'prospect', 'dumbo'],
      title: 'Brooklyn first', titleRu: 'Сначала Бруклин',
      lede: 'A jet-lag-friendly Sunday that never leaves Brooklyn: brunch on 5th Avenue, the Long Meadow, the Botanic Garden, then the skyline from the Promenade and Pier 1 as the sun goes down. Mike joins for dinner in Brooklyn Heights.',
      ledeRu: 'Щадящее воскресенье, не выезжая из Бруклина: бранч на 5-й авеню, Лонг-Медоу, Ботанический сад, а на закате — панорама Манхэттена с Променада и пирса 1. Майк присоединяется к ужину в Бруклин-Хайтс.' },
    { key: 'd2', date: '2026-09-28', dw: 'Mon', dwRu: 'Пн', dn: '28', hubs: ['fidi', 'dumbo'],
      title: 'Liberty & Lower Manhattan', titleRu: 'Свобода и Нижний Манхэттен',
      lede: 'The 9:30 ferry to the Statue and Ellis Island, Wall Street and the 9/11 Memorial in the afternoon, then the Brooklyn Bridge on foot at golden hour — it ends in DUMBO, where Mike can meet you for dinner straight from work.',
      ledeRu: 'Паром в 9:30 к Статуе Свободы и на остров Эллис, днём Уолл-стрит и мемориал 9/11, а в золотой час — пешком по Бруклинскому мосту. Финал в Дамбо, куда Майк приедет на ужин прямо с работы.' },
    { key: 'd3', date: '2026-09-29', dw: 'Tue', dwRu: 'Вт', dn: '29', hubs: ['midtowne', 'midtownw'],
      title: 'Midtown icons & Broadway', titleRu: 'Мидтаун и Бродвей',
      lede: 'Grand Central, St. Patrick\'s and Rockefeller Center, lunch under the flags, a Fifth Avenue afternoon from Saks to Bergdorf, sunset from Top of the Rock — then the lights of Times Square before an 8 pm curtain.',
      ledeRu: 'Гранд-Сентрал, собор Святого Патрика и Рокфеллер-центр, обед под флагами, день на Пятой авеню от Saks до Bergdorf, закат с Top of the Rock — и огни Таймс-сквер перед спектаклем в 20:00.' },
    { key: 'd4', date: '2026-09-30', dw: 'Wed', dwRu: 'Ср', dn: '30', hubs: ['chelsea', 'wvillage'],
      title: 'High Line to the Village', titleRu: 'От Хай-Лайн до Виллиджа',
      lede: 'The Met is closed on Wednesdays, so this is the West Side day: Little Island, the Whitney, tacos in Chelsea Market, the High Line north to Hudson Yards, then Bleecker Street boutiques, an aperitivo, dinner with Mike and the 8 pm set at the Village Vanguard.',
      ledeRu: 'По средам Метрополитен закрыт, поэтому это день Вест-Сайда: Литтл-Айленд, Уитни, тако в Челси-Маркет, Хай-Лайн на север до Хадсон-Ярдс, бутики Бликер-стрит, аперитив, ужин с Майком и сет в 20:00 в Village Vanguard.' },
    { key: 'd5', date: '2026-10-01', dw: 'Thu', dwRu: 'Чт', dn: '1', hubs: ['ues'],
      title: 'Museum Mile & Central Park', titleRu: 'Музейная миля и Центральный парк',
      lede: 'Three unhurried hours in the Met, Viennese lunch at Café Sabarsky, Bethesda Terrace and Bow Bridge on foot, Madison Avenue windows, and a drink at Bemelmans before the cover charge kicks in.',
      ledeRu: 'Три неспешных часа в Метрополитен, венский обед в Café Sabarsky, пешком к террасе Бетесда и мосту Боу, витрины Мэдисон-авеню и бокал в Bemelmans до того, как начнут брать за вход.' },
    { key: 'd6', date: '2026-10-02', dw: 'Fri', dwRu: 'Пт', dn: '2', hubs: ['soho', 'les'],
      title: 'SoHo, Nolita & a Friday night', titleRu: 'Сохо, Нолита и вечер пятницы',
      lede: 'The shopping day: croissants at Lafayette, then Broadway, Prince and Greene Streets, lunch at Balthazar, Elizabeth Street boutiques and a Chinatown stroll. Mike joins for pizza at Rubirosa and a late show at the Comedy Cellar.',
      ledeRu: 'День шопинга: круассаны в Lafayette, потом Бродвей, Принс и Грин-стрит, обед в Balthazar, бутики Элизабет-стрит и прогулка по Чайнатауну. Майк присоединяется к пицце в Rubirosa и позднему шоу в Comedy Cellar.' },
    { key: 'd7', date: '2026-10-03', dw: 'Sat', dwRu: 'Сб', dn: '3', hubs: ['wburg', 'prospect'],
      title: 'Williamsburg & First Saturday', titleRu: 'Уильямсбург и первая суббота',
      lede: 'Coffee at Devoción, Bedford Avenue shops, Smorgasburg lunch on the waterfront and Domino Park — then the Brooklyn Museum\'s free First Saturday party and a farewell dinner on Vanderbilt Avenue, ten minutes from home.',
      ledeRu: 'Кофе в Devoción, магазины Бедфорд-авеню, обед на Smorgasburg у воды и Домино-парк, затем бесплатная «Первая суббота» в Бруклинском музее и прощальный ужин на Вандербилт-авеню, в десяти минутах от дома.' },
    { key: 'd8', date: '2026-10-04', dw: 'Sun', dwRu: 'Вс', dn: '4', hubs: ['home', 'southslope'],
      title: 'Slow morning, then JFK', titleRu: 'Тихое утро и JFK',
      lede: 'Pack, pastries at Winner, a last quiet walk through Green-Wood, and a taxi to Terminal 1 by 2 pm for the 5:30 flight to Munich.',
      ledeRu: 'Собрать чемодан, выпечка в Winner, последняя тихая прогулка по Грин-Вуд — и такси в Терминал 1 к 14:00 на рейс в Мюнхен в 17:30.' },
  ],

  // Where you actually arrive at and leave from, for places whose map pin is not
  // where you get on and off. The ferry islands are the obvious case: the pin
  // belongs on Liberty Island, but the travel time is to the Battery ticket hall.
  ACCESS: {
    'statue-of-liberty': [40.7030, -74.0150],   // Battery Park / Castle Clinton
    'ellis-island': [40.7030, -74.0150],
    'governors-island': [40.7016, -74.0122],    // Battery Maritime Building
    'staten-island-ferry': [40.7013, -74.0132], // Whitehall Terminal
    'roosevelt-island-tram': [40.7614, -73.9640],
    'brooklyn-bridge': [40.7128, -73.9997],     // Manhattan-side stair at City Hall
    'coney-island': [40.5776, -73.9812],        // Stillwell Av station
    'brighton-beach': [40.5776, -73.9613],
    'the-high-line': [40.7398, -74.0080],       // 14th St entrance, mid-park
    'green-wood-cemetery': [40.6580, -73.9940], // 25th St main gate
    'prospect-park': [40.6614, -73.9800],       // Bartel-Pritchard, the entrance nearest home
    'central-park': [40.7681, -73.9819],        // 72nd St / Bethesda side
  },

  // Fixed-time custom stops (not library places). p = [lat,lng]; q = where it ends if different.
  STOPS: {
    'land':   { t: '13:35', d: 75,  lock: true,  en: '✈️ LH 400 lands at JFK Terminal 1 — passport control + bags',            ru: '✈️ LH 400 садится в JFK, Терминал 1 — паспортный контроль и багаж', p: [40.6431, -73.7896], link: '#guide-arrival' },
    'taxi-home': { t: '14:50', d: 70, lock: false, en: '🚕 Taxi or Uber to Park Slope (~50–70 min · ~$85–100 with tolls & tip)', ru: '🚕 Такси или Uber в Парк-Слоуп (~50–70 мин · ~$85–100 с платными дорогами и чаевыми)', p: [40.6431, -73.7896], q: [40.6619, -73.9836], link: '#guide-arrival' },
    'settle': { t: '16:00', d: 120, lock: false, en: '🏠 Home: shower, unpack, a slow coffee walk down 7th Avenue',              ru: '🏠 Дом: душ, разобрать вещи, неспешный кофе на 7-й авеню', p: [40.6619, -73.9836] },
    'early-night': { t: '21:00', d: 30, lock: false, en: '🛏 Early night — it is 3 a.m. in Hannover',                          ru: '🛏 Пораньше спать — в Ганновере уже 3 часа ночи', p: [40.6619, -73.9836] },
    'rest-home': { t: '15:00', d: 90, lock: false, en: '🏠 Home for a rest — tea, feet up, change for the evening',            ru: '🏠 Домой передохнуть — чай, ноги вверх, переодеться к вечеру', p: [40.6619, -73.9836] },
    'rest-cafe': { t: '15:30', d: 45, lock: false, en: '☕ Sit-down break — coffee and a pastry somewhere with chairs',        ru: '☕ Посидеть в кафе — кофе с выпечкой там, где есть стулья', p: null },
    'r-to-whitehall': { t: '08:10', d: 35, lock: false, en: '🚇 R from 4th Ave–9th St to Whitehall St (~30 min) — be at Battery security by 8:50', ru: '🚇 Поезд R от 4th Ave–9th St до Whitehall St (~30 мин) — на досмотр у Бэттери к 8:50', p: [40.6703, -73.9884], q: [40.7030, -74.0130] },
    'coffee-fidi': { t: '16:45', d: 25, lock: false, en: '☕ Coffee break — La Colombe or Blue Bottle at Brookfield Place', ru: '☕ Кофе-пауза — La Colombe или Blue Bottle в Brookfield Place', p: [40.7128, -74.0150] },
    'sunset-pier1': { t: '18:35', d: 30, lock: false, en: '🌇 Sunset from Pebble Beach / Pier 1 (sun sets 6:42 pm)',            ru: '🌇 Закат с Pebble Beach / пирса 1 (солнце садится в 18:42)', p: [40.7027, -73.9944] },
    'broadway-show': { t: '20:00', d: 160, lock: true, en: '🎭 Broadway show, 8 pm curtain — pick it on the Plan tab (TKTS same-day or book ahead)', ru: '🎭 Бродвейский спектакль в 20:00 — выберите на вкладке План (TKTS в день показа или заранее)', p: [40.7590, -73.9850], link: '#explore-show' },
    'pre-show-bite': { t: '19:00', d: 45, lock: false, en: '🍕 Quick pre-show bite near the theater (Joe\'s Pizza on Broadway, or Urbanspace)', ru: '🍕 Быстрый перекус перед спектаклем (Joe\'s Pizza на Бродвее или Urbanspace)', p: [40.7580, -73.9860] },
    'times-square-night': { t: '22:45', d: 20, lock: false, en: '✨ Times Square after the show — the lights are the point, 20 minutes is plenty', ru: '✨ Таймс-сквер после спектакля — ради огней, двадцати минут хватит', p: [40.7580, -73.9855] },
    'subway-to-village': { t: '16:15', d: 20, lock: false, en: '🚇 A/C/E from 34th St–Hudson Yards to 14th St (~10 min)', ru: '🚇 A/C/E от 34th St–Hudson Yards до 14th St (~10 мин)', p: [40.7553, -74.0020], q: [40.7400, -74.0020] },
    'to-brooklyn-museum': { t: '15:15', d: 45, lock: false, en: '🚇 G to Hoyt–Schermerhorn, then 2/3 to Eastern Pkwy–Brooklyn Museum (~40 min)', ru: '🚇 G до Hoyt–Schermerhorn, затем 2/3 до Eastern Pkwy–Brooklyn Museum (~40 мин)', p: [40.7170, -73.9560], q: [40.6712, -73.9636] },
    'pack': { t: '09:30', d: 60, lock: false, en: '🧳 Pack — 23 kg checked bag on Lufthansa, boarding pass in the app', ru: '🧳 Собрать чемодан — 23 кг багажа на Lufthansa, посадочный в приложении', p: [40.6619, -73.9836] },
    'leave-for-jfk': { t: '14:00', d: 60, lock: true, en: '🚕 Leave for JFK Terminal 1 (Sunday traffic ~45 min · be there 3 h before LH 411)', ru: '🚕 Выезд в JFK, Терминал 1 (в воскресенье ~45 мин · быть за 3 часа до LH 411)', p: [40.6619, -73.9836], q: [40.6431, -73.7896], link: '#guide-departure' },
    'depart': { t: '17:30', d: 30, lock: true, en: '✈️ LH 411 to Munich, then LH 4072 to Hannover (12:25 Monday)', ru: '✈️ LH 411 в Мюнхен, затем LH 4072 в Ганновер (12:25 в понедельник)', p: [40.6431, -73.7896] },
  },

  // Seeded running order per day: [stopRef, 'HH:MM', minutes?] — minutes override the place default.
  // Deliberately 4–6 anchors a day with a real break in the middle: the app's pace
  // meter should read Comfortable or Full, never Crammed. Everything else that
  // belongs to the day's neighborhood lives in the library, one tap away.
  SEED: {
    d0: [['x:land', '13:35'], ['x:taxi-home', '14:50'], ['x:settle', '16:00'], ['p:al-di-la', '18:30', 90], ['x:early-night', '21:00']],
    // Sunday, jet-lagged: brunch, the park, a nap, then the skyline at sunset.
    d1: [['p:miriam', '10:30', 75], ['p:prospect-park', '12:00', 90], ['x:rest-home', '14:15', 75], ['p:brooklyn-heights-promenade', '16:30', 35], ['p:brooklyn-bridge-park', '17:15', 55], ['x:sunset-pier1', '18:35'], ['p:colonie', '19:30', 105]],
    // The ferry eats the morning; the afternoon is one loop on foot ending on the bridge.
    d2: [['x:r-to-whitehall', '08:10'], ['p:statue-of-liberty', '09:30', 210], ['p:wall-street-charging-bull', '13:35', 25], ['p:tin-building', '14:15', 65], ['p:911-memorial', '15:40', 50], ['x:coffee-fidi', '16:45'], ['p:brooklyn-bridge', '17:25', 55], ['p:dumbo-washington-street', '18:25', 15], ['p:cecconis-dumbo', '19:15', 105]],
    // Midtown is dense, so the stops are short; the evening is the point.
    d3: [['p:grand-central-terminal', '10:45', 40], ['p:st-patricks-cathedral', '11:35', 25], ['p:rockefeller-center', '12:05', 30], ['p:lodi', '12:45', 70], ['p:bergdorf-goodman', '14:10', 80], ['p:goodmans-bar-bergdorf', '15:40', 45], ['p:top-of-the-rock', '17:30', 70], ['x:pre-show-bite', '18:55'], ['x:broadway-show', '20:00'], ['x:times-square-night', '22:45']],
    // Met is closed today. West Side, north along the High Line, south to the Village.
    d4: [['p:little-island', '10:30', 30], ['p:whitney', '11:15', 120], ['p:chelsea-market', '13:25', 60], ['p:the-high-line', '14:35', 55], ['x:subway-to-village', '15:45'], ['p:bleecker-street', '16:15', 55], ['p:bar-pisellino', '17:20', 45], ['p:lartusi', '18:20', 95], ['p:village-vanguard', '20:00', 80]],
    // One big museum, one long lunch, the park on foot, a martini with a mural behind it.
    d5: [['p:the-met', '10:15', 165], ['p:cafe-sabarsky', '13:15', 75], ['p:central-park', '14:45', 85], ['p:madison-avenue', '16:20', 55], ['p:bemelmans-bar', '17:30', 70], ['p:jg-melon', '19:00', 75]],
    // The shopping day: one long stretch of it, then a Friday night with Mike.
    d6: [['p:lafayette-grand-cafe', '10:30', 45], ['p:soho-shopping', '11:25', 145], ['p:balthazar', '14:05', 80], ['p:elizabeth-street-nolita', '15:35', 60], ['x:rest-cafe', '16:50', 50], ['p:rubirosa', '18:15', 90], ['p:dante', '20:00', 55], ['p:comedy-cellar', '21:15', 90]],
    // Williamsburg in the morning, the free First Saturday party ten minutes from home.
    d7: [['p:devocion', '10:30', 40], ['p:bedford-avenue', '11:20', 85], ['p:smorgasburg-williamsburg', '12:55', 65], ['p:domino-park', '14:10', 30], ['x:to-brooklyn-museum', '15:00'], ['p:brooklyn-museum', '16:00', 150], ['p:olmsted', '19:00', 110], ['p:weather-up', '21:00', 55]],
    d8: [['x:pack', '09:30'], ['p:winner-park-slope', '10:45', 50], ['p:green-wood-cemetery', '11:45', 85], ['x:leave-for-jfk', '14:00'], ['x:depart', '17:30']],
  },

  // Rainy-day swaps, per day (place ids). Shown as one-tap suggestions when the forecast says rain.
  RAIN: {
    d1: ['brooklyn-museum', 'brooklyn-public-library', 'time-out-market', 'lappartement-4f'],
    d2: ['911-museum', 'the-oculus', 'tin-building', 'century-21', 'one-world-observatory'],
    d3: ['moma', 'morgan-library', 'summit-one-vanderbilt', 'bloomingdales', 'nordstrom-nyc'],
    d4: ['whitney', 'chelsea-market', 'chelsea-galleries', 'the-frankie-shop', 'artechouse'],
    d5: ['the-met', 'the-frick', 'neue-galerie', 'guggenheim', 'bloomingdales'],
    d6: ['tenement-museum', 'new-museum', 'the-realreal-soho', 'essex-market', 'mercer-labs'],
    d7: ['brooklyn-museum', 'industry-city', 'lilia', 'union-hall'],
  },

  // Book-this-now list. Links come from the place library (tickets / reserve).
  BOOK: [
    { id: 'statue-of-liberty', day: 'd2', by: '2026-09-24', en: 'Reserve the 9:30 am Statue City Cruises ferry with pedestal access — pedestal sells out days ahead, crown weeks ahead.', ru: 'Забронировать паром Statue City Cruises на 9:30 с доступом на пьедестал — пьедестал раскупают за дни, корону — за недели.' },
    { id: 'top-of-the-rock', day: 'd3', by: '2026-09-26', en: 'Timed ticket for 5:45 pm (sunset 6:40 pm) — the sunset slots go first.', ru: 'Билет на 17:45 (закат в 18:40) — закатные слоты уходят первыми.' },
    { id: 'lartusi', day: 'd4', by: '2026-09-23', en: 'Resy for 3 at 6:15 pm Wed Sep 30 (opens 30 days out; check for cancellations daily, or walk in at Via Carota at 5:30 instead).', ru: 'Столик на троих в Resy на 18:15 в среду 30 сентября (открывается за 30 дней; ловите отмены, или Via Carota без брони в 17:30).' },
    { id: 'village-vanguard', day: 'd4', by: '2026-09-25', en: 'Tickets for the 8 pm set on Wed Sep 30 — sold online, sells out on weekends.', ru: 'Билеты на сет в 20:00 в среду 30 сентября — продаются онлайн, по выходным раскупают.' },
    { id: 'comedy-cellar', day: 'd6', by: '2026-09-25', en: 'Reserve the late show on Fri Oct 2 (reservations open about a week ahead and go fast).', ru: 'Бронь на позднее шоу в пятницу 2 октября (бронирование открывается примерно за неделю и быстро заканчивается).' },
    { id: 'olmsted', day: 'd7', by: '2026-09-26', en: 'Farewell dinner for 3 on Sat Oct 3, 7:30 pm.', ru: 'Прощальный ужин на троих в субботу 3 октября, 19:30.' },
    { id: 'cecconis-dumbo', day: 'd2', by: '2026-09-26', en: 'Table for 3 on Mon Sep 28, 7:15 pm — or keep it casual at Time Out Market next door.', ru: 'Столик на троих в понедельник 28 сентября, 19:15 — или без брони в Time Out Market по соседству.' },
    { id: 'the-met', day: 'd5', by: '', en: 'No timed ticket needed; buy at the door or online. Closed Wednesdays.', ru: 'Билет по времени не нужен; купить на месте или онлайн. По средам закрыт.' },
    { id: 'whitney', day: 'd4', by: '', en: 'Buy online to skip the line (closed Tuesdays).', ru: 'Купить онлайн, чтобы не стоять в очереди (по вторникам закрыт).' },
    { id: 'x:broadway-show', day: 'd3', by: '2026-09-29', en: 'Pick the show on the Plan tab. TKTS (Times Square booth) sells same-day seats from 3 pm; TodayTix for rush/lottery.', ru: 'Выберите спектакль на вкладке План. TKTS (будка на Таймс-сквер) продаёт билеты на сегодня с 15:00; TodayTix — rush и лотерея.' },
  ],
};
