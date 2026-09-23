/* ============================================================================
   Tatyana in New York — app engine.
   Reads: window.TRIP (data/plan.js), window.PLACES (data/places.js),
   window.GEO (data/geo.js), window.GUIDE (data/guide.js), window.TRIP_CONFIG.
   Everything trip-specific lives in those files; this engine is generic.
   ============================================================================ */
(function () {
'use strict';
const CFG = window.TRIP_CONFIG || {};
const T = window.TRIP || { DAYS: [], TRAVELERS: [], STOPS: {}, SEED: {}, RAIN: {}, BOOK: [], FLIGHTS: [] };
const G = window.GEO;
const PLACES = Array.isArray(window.PLACES) ? window.PLACES : [];
const GUIDE = window.GUIDE || { sections: [] };
const PL = Object.create(null); PLACES.forEach(p => { PL[p.id] = p; });
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// own properties only: keys can come from the shared table, and 'constructor' is not a place
const hasOwn = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const LSK = CFG.TRIP_ID || 'nyc-trip';
window.APP_BUILD = 'v1 · 22 Sep 2026';
const DAYS = T.DAYS || [];
const DAYKEYS = DAYS.map(d => d.key);
const DAYBYKEY = {}; DAYS.forEach(d => { DAYBYKEY[d.key] = d; });
const HOMEPT = [G.HOME.lat, G.HOME.lng];

// ---------------------------------------------------------------- i18n
const LANGS = ['en', 'ru', 'de'];
const LANGBTN = { en: 'РУС', ru: 'DEU', de: 'ENG' };   // the button shows what you get next
let lang = 'en';
try { lang = localStorage.getItem(LSK + '-lang') || ''; } catch (e) {}
if (LANGS.indexOf(lang) < 0) { // first run: follow the phone
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  lang = LANGS.indexOf(nav) >= 0 ? nav : 'en';
}
const LI = () => LANGS.indexOf(lang);
const RL = () => lang === 'ru';           // kept: "is a non-English script" checks
const DE = () => lang === 'de';
// L(en, ru, de) — falls back to Russian then English when a translation is missing
const L = (en, ru, de) => (lang === 'ru' ? (ru || en) : (lang === 'de' ? (de || en) : en));
// pick a per-language field off an object: fld(p,'why') -> p.whyDe / p.whyRu / p.why
const fld = (o, base) => fldIn(o, base, lang);
function fldIn(o, base, lg) {
  if (!o) return '';
  if (lg === 'en') return o[base] || '';
  const suffix = lg === 'ru' ? 'Ru' : 'De';
  // Two naming conventions live side by side: camelCase fields on places and days
  // (whyDe), SHOUTY ones on the trip object (CHAT_HELLO_DE). Try both.
  return o[base + suffix] || o[base + suffix.toUpperCase()] || o[base] || '';
}
const S = {
  runningOrder: ['Running order', 'Расписание дня', 'Tagesablauf'], stops: ['stops', 'пункт(ов)', 'Stopps'],
  dragHint: ['hold a stop to drag it · tap a time to pin it · ⋯ moves, retimes or removes', 'зажмите пункт и тяните · нажмите на время, чтобы закрепить · ⋯ — перенести, изменить или убрать', 'Stopp halten und ziehen · auf die Zeit tippen, um sie festzusetzen · ⋯ verschiebt, ändert oder entfernt'],
  resetDay: ['↺ reset to the plan', '↺ вернуть план', '↺ Plan wiederherstellen'], homeBy: ['Home by', 'Дома к', 'Zu Hause gegen'], anchors: ['anchors', 'точек', 'Programmpunkte'], transit: ['in transit', 'в пути', 'unterwegs'],
  paceRelaxed: ['🟢 Relaxed', '🟢 Спокойно', '🟢 Entspannt'], paceComfy: ['🟢 Comfortable', '🟢 Комфортно', '🟢 Angenehm'], paceFull: ['🟡 Full day', '🟡 Насыщенно', '🟡 Voller Tag'], paceCrammed: ['🔴 Crammed', '🔴 Перегружено', '🔴 Zu voll'],
  paceHint: ['Too much for one day — the ⋯ menu on any stop moves it to a lighter day.', 'Слишком много для одного дня — через ⋯ у любого пункта его можно перенести в более свободный день.', 'Zu viel für einen Tag — über das ⋯-Menü lässt sich ein Stopp auf einen ruhigeren Tag schieben.'],
  addStop: ['＋ Add a stop', '＋ Добавить пункт', '＋ Stopp hinzufügen'], suggestBreak: ['☕ Suggest a break', '☕ Предложить паузу', '☕ Pause vorschlagen'], replan: ['✨ Replan', '✨ Перепланировать', '✨ Neu planen'], shareDay: ['↗ Share day', '↗ Поделиться днём', '↗ Tag teilen'], rainPlan: ['🌧 Rain plan', '🌧 План на дождь', '🌧 Regenplan'],
  dayNotes: ['Day notes — shared with the others', 'Заметки к дню — видят все', 'Notizen zum Tag — für alle sichtbar'],
  walk: ['min walk', 'мин пешком', 'Min zu Fuß'], subway: ['min by subway', 'мин на метро', 'Min mit der U-Bahn'], free: ['min free', 'мин свободно', 'Min frei'], travel: ['min travel', 'мин в пути', 'Min Fahrt'], slack: ['min slack', 'мин запаса', 'Min Puffer'],
  fixed: ['Fixed-time anchor', 'Фиксированное время', 'Feste Uhrzeit'], drag: ['Drag', 'Перетащить', 'Ziehen'], moveOrRemove: ['Move, retime or remove', 'Перенести, изменить или убрать', 'Verschieben, umlegen oder entfernen'], tapTime: ['Tap to pin a time', 'Нажмите, чтобы закрепить время', 'Tippen, um die Zeit festzusetzen'],
  remove: ['✕ Remove from this day', '✕ Убрать из этого дня', '✕ Aus diesem Tag entfernen'], removed: ['Removed — "↺ reset" brings the plan back', 'Убрано — «↺ вернуть план» всё восстановит', 'Entfernt — «↺ Plan wiederherstellen» holt alles zurück'], moved: ['Moved to', 'Перенесено на', 'Verschoben auf'],
  closedThatDay: ['closed that day', 'в этот день закрыто', 'an dem Tag geschlossen'], recommended: ['best fit', 'лучше всего', 'passt am besten'],
  wantIt: ['❤️ Want', '❤️ Хочу', '❤️ Will ich'], maybeIt: ['🤔 Maybe', '🤔 Может быть', '🤔 Vielleicht'], skipIt: ['✕ Skip', '✕ Нет', '✕ Nein'],
  yourVote: ['Your vote', 'Ваш голос', 'Deine Stimme'], pickWho: ['Whose phone is this?', 'Чей это телефон?', 'Wessen Handy ist das?'], pickWhoFirst: ['Tap your name first (Today tab)', 'Сначала выберите своё имя (вкладка «Сегодня»)', 'Zuerst den eigenen Namen antippen (Tab „Heute“)'],
  addToDay: ['📅 Add to a day', '📅 Добавить в день', '📅 Zu einem Tag hinzufügen'], inPlan: ['In the plan', 'В плане', 'Im Plan'], website: ['Website', 'Сайт', 'Website'], tickets: ['Tickets', 'Билеты', 'Tickets'], reserve: ['Reserve', 'Бронь', 'Reservieren'], menu: ['Menu', 'Меню', 'Speisekarte'], map: ['Map', 'Карта', 'Karte'], directions: ['Directions', 'Маршрут', 'Route'],
  fromHome: ['from home', 'от дома', 'von zu Hause'], hours: ['Hours', 'Часы', 'Öffnungszeiten'], price: ['Price', 'Цена', 'Preis'], booking: ['Booking', 'Бронирование', 'Buchung'], typical: ['Typical visit', 'Обычно', 'Übliche Dauer'], closed: ['Closed', 'Закрыто', 'Geschlossen'], address: ['Address', 'Адрес', 'Adresse'], confirm: ['Details compiled Sep 2026 from memory — confirm on the site.', 'Данные собраны в сентябре 2026 по памяти — проверьте на сайте.', 'Angaben von September 2026 — bitte auf der Website prüfen.'],
  tourSkip: ['Skip', 'Пропустить', 'Überspringen'], tourBack: ['Back', 'Назад', 'Zurück'], tourNext: ['Next', 'Дальше', 'Weiter'], tourDone: ['Got it', 'Понятно', 'Alles klar'],
  tourAgain: ['Tour — swipe or tap Next', 'Обзор — листайте или нажимайте «Дальше»', 'Rundgang — wischen oder auf Weiter tippen'],
  minutes: ['min', 'мин', 'Min'], places: ['places', 'мест', 'Orte'], noMatch: ['Nothing matches — try fewer filters.', 'Ничего не найдено — уберите фильтры.', 'Nichts gefunden — weniger Filter setzen.'],
  swipeHint: ['Swipe right = want, left = skip, up = maybe. Everyone\'s votes sync.', 'Вправо = хочу, влево = нет, вверх = может быть. Голоса синхронизируются.', 'Nach rechts = will ich, links = nein, hoch = vielleicht. Alle Stimmen werden synchronisiert.'],
  deckDone: ['You have rated everything in this view 🎉 — change the filter or head to Plan.', 'Вы оценили всё в этой подборке 🎉 — смените фильтр или загляните в План.', 'Du hast alles in dieser Auswahl bewertet 🎉 — Filter ändern oder weiter zum Plan.'],
  left: ['left to rate', 'осталось оценить', 'noch zu bewerten'], exitSwipe: ['✕ Exit swipe', '✕ Выйти', '✕ Swipe beenden'],
  bothWant: ['both want', 'хотите обе', 'wollen beide'], oneWants: ['one wants', 'хочет одна', 'will eine'], scheduled: ['scheduled', 'в плане', 'im Plan'], ratedByMe: ['rated by me', 'оценено мной', 'von mir bewertet'],
  nothingYet: ['Nothing here yet — rate a few places in Explore.', 'Пока пусто — оцените несколько мест в разделе «Места».', 'Noch nichts hier — bewertet ein paar Orte unter „Entdecken“.'],
  buildTitle: ['Build my week', 'Собрать неделю', 'Meine Woche bauen'], buildIntro: ['Everything you both want (and nobody vetoed) that is not in the plan yet, slotted into the day that fits its neighborhood and pace. Nothing is saved until you tap Apply.', 'Всё, чего хотите обе (и никто не против), чего ещё нет в плане, — по дням, подходящим по району и темпу. Ничего не сохраняется, пока вы не нажмёте «Применить».', 'Alles, was ihr beide wollt (und niemand abgelehnt hat) und noch nicht im Plan steht — einsortiert in den Tag, der vom Viertel und vom Tempo her passt. Gespeichert wird erst, wenn du auf Übernehmen tippst.'],
  apply: ['✓ Apply to the plan', '✓ Применить', '✓ In den Plan übernehmen'], cancel: ['Cancel', 'Отмена', 'Abbrechen'], nothingToAdd: ['Nothing to add — everything you both want is already in the plan.', 'Добавлять нечего — всё, чего хотите обе, уже в плане.', 'Nichts hinzuzufügen — alles, was ihr beide wollt, steht schon im Plan.'], noFit: ['no free day fits', 'нет подходящего дня', 'kein freier Tag passt'],
  applied: ['Added to the plan', 'Добавлено в план', 'Zum Plan hinzugefügt'],
  pickDay: ['Which day?', 'В какой день?', 'An welchem Tag?'], pickStop: ['Add a stop', 'Добавить пункт', 'Stopp hinzufügen'], custom: ['✎ Custom stop', '✎ Свой пункт', '✎ Eigener Stopp'], customName: ['What is it?', 'Что это?', 'Was ist es?'],
  mapLink: ['Map link — optional', 'Ссылка на карту — по желанию', 'Kartenlink — optional'],
  mapLinkPh: ['Map link — optional', 'Ссылка на карту — по желанию', 'Kartenlink — optional'],
  mapLinkHow: ['In Google or Apple Maps, tap Share → Copy, and paste it here. It puts the stop on the map and makes the travel to and from it real.', 'В Google или Apple Картах нажмите «Поделиться» → «Скопировать» и вставьте сюда. Так место появится на карте, а время в пути будет настоящим.', 'In Google oder Apple Maps auf „Teilen“ → „Kopieren“ tippen und hier einfügen. So kommt der Stopp auf die Karte und die Fahrzeiten stimmen.'],
  webLink: ['Website or menu — optional', 'Сайт или меню — по желанию', 'Website/Speisekarte — optional'],
  pinned: ['📍 On the map — travel times to and from it are real', '📍 На карте — время в пути туда и обратно настоящее', '📍 Auf der Karte — Fahrzeiten hin und zurück stimmen'],
  unpinned: ['No location yet — the app assumes you are already there. Add a map link for real travel times.', 'Места пока нет — приложение считает, что вы уже там. Добавьте ссылку на карту, чтобы время в пути было точным.', 'Noch kein Ort — die App nimmt an, ihr seid schon dort. Mit einem Kartenlink stimmen die Fahrzeiten.'],
  noLocation: ['no location — travel not counted', 'нет места — дорога не учтена', 'kein Ort — Weg nicht gezählt'],
  resolving: ['Finding it on the map…', 'Ищу на карте…', 'Suche auf der Karte…'],
  resolvedOk: ['Found it — travel times updated', 'Найдено — время в пути обновлено', 'Gefunden — Fahrzeiten aktualisiert'],
  resolvedNo: ['Link saved, but the exact spot could not be found', 'Ссылка сохранена, но точное место не найдено', 'Link gespeichert, aber der genaue Ort wurde nicht gefunden'],
  badMapLink: ['That is not a Google or Apple Maps link', 'Это не ссылка Google или Apple Карт', 'Das ist kein Google- oder Apple-Maps-Link'],
  badWebLink: ['That website link does not look right', 'Ссылка на сайт выглядит неверно', 'Der Website-Link sieht nicht richtig aus'],
  editLinks: ['Links & location', 'Ссылки и место', 'Links & Ort'],
  pinnedName: ['📍 Pinned place', '📍 Место на карте', '📍 Markierter Ort'],
  fromConcierge: ['Suggested by the concierge', 'Совет консьержа', 'Tipp vom Concierge'],
  lookupAll: ['🔎 Search all of New York for “{q}”', '🔎 Искать «{q}» по всему Нью-Йорку', '🔎 In ganz New York nach „{q}“ suchen'],
  lookupNotHere: ['Not in the list?', 'Нет в списке?', 'Nicht in der Liste?'],
  lookupBusy: ['Searching New York…', 'Ищу по Нью-Йорку…', 'Suche in New York…'],
  lookupWebBusy: ['Searching the web — this takes about twenty seconds…', 'Ищу в интернете — это секунд двадцать…', 'Suche im Web — das dauert etwa zwanzig Sekunden…'],
  lookupNone: ['Nothing by that name on the map.', 'На карте ничего с таким названием.', 'Auf der Karte nichts unter diesem Namen.'],
  lookupWebNone: ['The web search found nothing by that name in New York either.', 'Поиск в интернете тоже ничего не нашёл в Нью-Йорке.', 'Auch im Web nichts unter diesem Namen in New York.'],
  lookupWeb: ['🌐 Not the one? Search the web', '🌐 Не то? Искать в интернете', '🌐 Nicht dabei? Im Web suchen'],
  lookupWebOnly: ['🌐 Search the web for it', '🌐 Поискать в интернете', '🌐 Im Web danach suchen'],
  lookupErr: ['The search did not work — try again in a moment.', 'Поиск не сработал — попробуйте через минуту.', 'Die Suche hat nicht geklappt — gleich noch einmal versuchen.'],
  lookupLimit: ['The web search is used up for today — the map search still works.', 'Поиск в интернете на сегодня исчерпан — поиск по карте работает.', 'Die Websuche ist für heute aufgebraucht — die Kartensuche geht weiter.'],
  lookupOffline: ['No connection — the search needs the internet.', 'Нет связи — для поиска нужен интернет.', 'Keine Verbindung — die Suche braucht Internet.'],
  inTheApp: ['already in the app', 'уже в приложении', 'schon in der App'],
  foundOsm: ['Found on OpenStreetMap', 'Найдено на OpenStreetMap', 'Gefunden bei OpenStreetMap'], foundGoogle: ['Found on Google', 'Найдено в Google', 'Gefunden bei Google'], foundWeb: ['Found on the web', 'Найдено в интернете', 'Im Web gefunden'],
  onGoogleMaps: ['Google Maps', 'Google Карты', 'Google Maps'],
  searchWeb: ['Search the web', 'Найти в интернете', 'Im Web suchen'],
  approxLoc: ['📍 Approximate location, from the concierge. Travel times are estimates; paste a map link to pin it exactly.', '📍 Место приблизительное, со слов консьержа. Время в пути — оценка; вставьте ссылку на карту, чтобы уточнить.', '📍 Ungefährer Ort, laut Concierge. Fahrzeiten sind Schätzungen; mit einem Kartenlink wird er genau.'],
  approxShort: ['approximate location', 'место приблизительно', 'Ort ungefähr'],
  addAsIdeaH: ['Add it to your ideas', 'Добавить в идеи', 'Zu euren Ideen hinzufügen'],
  addAsIdea: ['＋ Add as idea', '＋ В идеи', '＋ Als Idee'],
  ideaAdded: ['Added to your ideas — it is in Plan', 'Добавлено в идеи — оно в «Плане»', 'Zu den Ideen hinzugefügt — steht im Plan'],
  alreadyIdea: ['Already in your ideas', 'Уже в ваших идеях', 'Schon in euren Ideen'],
  adjustFirst: ['Change the name, time or links first', 'Сначала изменить название, время или ссылки', 'Vorher Name, Dauer oder Links ändern'],
  chatBusy: ['Busy for a moment — ask me again.', 'Секунду занят — спросите ещё раз.', 'Kurz beschäftigt — frag mich gleich noch einmal.'],
  chatSetup: ['The concierge is not set up right — the trip organiser needs to check it.', 'Консьерж настроен неправильно — организатору поездки нужно проверить.', 'Der Concierge ist nicht richtig eingerichtet — der Reiseplaner muss nachsehen.'],
  chatRefusal: ['I can’t help with that one — ask me something about the trip.', 'С этим я помочь не могу — спросите что-нибудь о поездке.', 'Dabei kann ich nicht helfen — frag mich etwas zur Reise.'], customMin: ['min', 'мин', 'Min'], add: ['Add', 'Добавить', 'Hinzufügen'],
  breakTitle: ['A break near', 'Пауза рядом с', 'Eine Pause in der Nähe von'], breakNone: ['No café or bar in the library near that stop — add one from Explore.', 'В библиотеке нет кафе или бара рядом — добавьте из раздела «Места».', 'Kein Café und keine Bar in der Nähe dieses Stopps — füge eine über „Entdecken“ hinzu.'],
  replanTitle: ['Replan this day', 'Перепланировать день', 'Diesen Tag neu planen'], later: ['☀️ Start an hour later', '☀️ Начать на час позже', '☀️ Eine Stunde später starten'], lighter: ['🪶 Make it lighter — drop a stop', '🪶 Сделать легче — убрать пункт', '🪶 Leichter machen — einen Stopp streichen'], rainSwap: ['🌧 Swap outdoor stops for the rain plan', '🌧 Заменить уличное на план для дождя', '🌧 Außenstopps gegen den Regenplan tauschen'], askAI: ['✨ Ask the concierge', '✨ Спросить консьержа', '✨ Den Concierge fragen'], askPlaceholder: ['e.g. We\'re tired — one museum, a long lunch, home by 9', 'например: мы устали — один музей, долгий обед, домой к 9', 'z. B.: Wir sind müde — ein Museum, langes Mittagessen, um 21 Uhr zu Hause'], thinking: ['Drafting…', 'Думаю…', 'Entwurf läuft…'], applyDraft: ['✓ Apply this draft', '✓ Применить', '✓ Entwurf übernehmen'],
  aiOff: ['The concierge is not connected yet (see the Chat tab).', 'Консьерж пока не подключён (см. вкладку «Чат»).', 'Der Concierge ist noch nicht verbunden (siehe Tab „Chat“).'], shifted: ['Day shifted an hour later', 'День сдвинут на час позже', 'Tag um eine Stunde nach hinten verschoben'], whichDrop: ['Which stop goes?', 'Какой пункт убрать?', 'Welcher Stopp fällt weg?'],
  daysToGo: ['days to go', 'дней до поездки', 'Tage'], dayOf: ['Day', 'День', 'Tag'], of: ['of', 'из', 'von'], today: ['Today', 'Сегодня', 'Heute'], tomorrow: ['Tomorrow', 'Завтра', 'Morgen'], nextUp: ['Next up', 'Дальше', 'Als Nächstes'], nowAt: ['Now', 'Сейчас', 'Jetzt'], openDay: ['Open the day', 'Открыть день', 'Tag öffnen'], getHome: ['⌂ Get me home', '⌂ Домой', '⌂ Nach Hause'], wrap: ['That was the trip — the plan pages are the memory book now.', 'Поездка позади — страницы дней теперь на память.', 'Das war die Reise — die Tagesseiten sind jetzt das Erinnerungsbuch.'],
  beforeIntro: ['The week is sketched in; rate places in Explore, book the handful of things that sell out, and the app takes it from there.', 'Неделя намечена; оцените места в разделе «Места», забронируйте то немногое, что раскупают, — остальное сделает приложение.', 'Die Woche ist skizziert. Bewertet Orte unter „Entdecken“, bucht die paar Dinge, die ausverkauft sind — den Rest macht die App.'],
  toBook: ['still to book', 'ещё забронировать', 'noch zu buchen'], allBooked: ['everything that needed booking is booked', 'всё, что нужно было забронировать, забронировано', 'alles Nötige ist gebucht'],
  flightOut: ['To New York', 'В Нью-Йорк', 'Nach New York'], flightBack: ['Home to Hannover', 'Домой в Ганновер', 'Zurück nach Hannover'], locked: ['booked', 'забронировано', 'gebucht'], lockedOf: ['of', 'из', 'von'],
  save: ['Save', 'Сохранить', 'Speichern'], saved: ['Saved', 'Сохранено', 'Gespeichert'], noResv: ['No reservations logged yet.', 'Броней пока нет.', 'Noch keine Reservierungen eingetragen.'],
  icsDone: ['Calendar file ready — open it to add the events', 'Файл календаря готов — откройте его, чтобы добавить события', 'Kalenderdatei fertig — zum Eintragen öffnen'],
  notesEmpty: ['No notes yet.', 'Заметок пока нет.', 'Noch keine Notizen.'], delete: ['delete', 'удалить', 'löschen'],
  nearNone: ['Location not available — allow it in Settings, or open the map.', 'Геолокация недоступна — разрешите её в настройках или откройте карту.', 'Standort nicht verfügbar — in den Einstellungen erlauben oder die Karte öffnen.'], locating: ['Locating…', 'Определяю…', 'Standort wird ermittelt…'], near: ['Nearest to you', 'Ближе всего к вам', 'Am nächsten bei dir'],
  syncOn: ['sync on', 'синхронизация включена', 'Sync aktiv'], syncOff: ['saving on this phone only', 'сохраняется только на этом телефоне', 'wird nur auf diesem Handy gespeichert'],
  chatOffline: ['The concierge needs a connection.', 'Консьержу нужно соединение.', 'Der Concierge braucht eine Verbindung.'], chatErr: ['The concierge is not answering — try again in a moment.', 'Консьерж не отвечает — попробуйте чуть позже.', 'Der Concierge antwortet nicht — gleich noch einmal versuchen.'],
  updating: ['Updating…', 'Обновляю…', 'Wird aktualisiert…'], copied: ['Copied', 'Скопировано', 'Kopiert'],
  rainTitle: ['Rain in the forecast — indoor swaps for this day', 'В прогнозе дождь — варианты под крышей на этот день', 'Regen gemeldet — Alternativen drinnen für diesen Tag'],
  paceRelaxedPick: ['Relaxed', 'Спокойный', 'Entspannt'], paceNormalPick: ['Comfortable', 'Комфортный', 'Angenehm'], paceFullPick: ['Full', 'Насыщенный', 'Voll'],
  ideasHead: ['Your ideas', 'Ваши идеи', 'Eure Ideen'], idea: ['idea', 'идея', 'Idee'],
  filters: ['Filters', 'Фильтры', 'Filter'], swipeMode: ['Swipe', 'Свайп', 'Swipe'],
  fillGap: ['tap to fill', 'заполнить', 'tippen zum Füllen'], fillGapTitle: ['Fill this gap', 'Чем заполнить', 'Diese Lücke füllen'], fillGapNone: ['Nothing in the library fits that window nearby — browse everything instead.', 'Ничего подходящего рядом на это время — посмотрите весь список.', 'Nichts in der Nähe passt in dieses Zeitfenster — sieh dir stattdessen alles an.'], detour: ['detour', 'крюк', 'Umweg'],
  sortRank: ['Sort: our votes', 'Сортировка: наши голоса', 'Sortierung: unsere Stimmen'], sortNear: ['Sort: closest to home', 'Сортировка: ближе к дому', 'Sortierung: am nächsten'], sortAz: ['Sort: A–Z', 'Сортировка: А–Я', 'Sortierung: A–Z'], sortHood: ['Sort: neighborhood', 'Сортировка: район', 'Sortierung: Viertel'],
  searchPh: ['Search: rooftop, pizza, Sézane, Williamsburg…', 'Поиск: крыша, пицца, Sézane, Уильямсбург…', 'Suche: Dachbar, Pizza, Sézane, Williamsburg…'],
};
const t = (k) => { const v = S[k]; if (!v) return k; return v[LI()] || v[0]; };
const CATS = [
  ['see', '🗽', 'Sights', 'Достопримечательности', 'Sehenswertes', '#FF6319'], ['museum', '🖼', 'Museums', 'Музеи', 'Museen', '#0039A6'], ['show', '🎭', 'Shows & events', 'Шоу и события', 'Shows & Events', '#B933AD'],
  ['eat', '🍽', 'Eat', 'Еда', 'Essen', '#EE352E'], ['drink', '🍸', 'Drinks', 'Бары', 'Bars', '#F5B700'], ['cafe', '☕', 'Cafés', 'Кафе', 'Cafés', '#8a6f47'],
  ['shop', '🛍', 'Shopping', 'Шопинг', 'Shopping', '#FF3EA5'], ['park', '🌳', 'Parks & walks', 'Парки и прогулки', 'Parks & Spaziergänge', '#6CBE45'], ['walk', '🚶', 'Walks', 'Прогулки', 'Spaziergänge', '#6CBE45'],
  ['daytrip', '🚌', 'Day trips', 'Поездки', 'Tagesausflüge', '#00933C'], ['idea', '💡', 'Your ideas', 'Ваши идеи', 'Eure Ideen', '#5D6170'],
];
const CAT = Object.create(null); CATS.forEach(c => { CAT[c[0]] = { key: c[0], ico: c[1], en: c[2], ru: c[3], de: c[4], color: c[5] }; });
const catLabel = (k) => { const c = CAT[k] || CAT.idea; return c.ico + ' ' + L(c.en, c.ru, c.de); };
const catColor = (k) => (CAT[k] || CAT.idea).color;
const TAGS = [['first-timer', 'First-timer', 'Обязательно', 'Für Erstbesucher'], ['near-home', 'Near home', 'Рядом с домом', 'Nah bei uns'], ['rainy-day', 'Rainy day', 'На дождь', 'Bei Regen'], ['free', 'Free', 'Бесплатно', 'Kostenlos'], ['view', 'Views', 'Виды', 'Aussicht'], ['pre-dinner', 'Pre-dinner drink', 'Аперитив', 'Aperitif'], ['brunch', 'Brunch', 'Бранч', 'Brunch'], ['hidden-gem', 'Hidden gem', 'Нетуристическое', 'Geheimtipp'], ['splurge', 'Splurge', 'Роскошь', 'Luxus'], ['late-night', 'Late night', 'Поздний вечер', 'Spätabends'], ['dessert', 'Dessert', 'Десерт', 'Dessert']];
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOWL = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] };
const MON = { en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], ru: ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'], de: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'] };
const LOCALE = { en: 'en-US', ru: 'ru-RU', de: 'de-DE' };
const monthName = (date) => MON[lang][Number(String(date).split('-')[1]) - 1];
const num = (n) => (lang === 'en' ? String(n) : String(n).replace('.', ','));
const longDate = (date) => { const p = String(date).split('-').map(Number); const wd = new Date(p[0], p[1] - 1, p[2]).getDay(); return DOWL[lang][wd] + ' ' + p[2] + ' ' + MON[lang][p[1] - 1]; };
// A stop's label in the current language; seeds carry en/ru/de, places carry nameRu/nameDe.
const stopLabel = (it) => { if (!it) return ''; if (it.place) return placeName(it.place); return L(it.en, it.ru, it.de); };

// ---------------------------------------------------------------- travelers + state
const TR = T.TRAVELERS || [];
let me = null; try { me = localStorage.getItem(LSK + '-who'); } catch (e) {}
// (validated against TRIP.VOTERS once the voter list is built, below)
function whoName(k) { const nm = ((state.settings.names || {}).v || state.settings.names || {}), o = hasOwn(nm, k) ? nm[k] : null; if (typeof o === 'string' && o.trim()) return o.slice(0, 30); const tr = TR.find(x => x[0] === k); return tr ? L(tr[1], tr[2], tr[4] || tr[1]) : k; }
function whoEmoji(k) { const tr = TR.find(x => x[0] === k); return tr ? (tr[3] || '') : ''; }
const state = { vote: {}, agenda: {}, custom: {}, daynote: {}, note: {}, check: {}, resv: {}, settings: {}, pack: {} };
function localLoad() { try { const s = JSON.parse(localStorage.getItem(LSK + '-shared') || '{}'); Object.keys(s).forEach(k => { state[k] = Object.assign({}, state[k] || {}, s[k]); }); } catch (e) {} }
function localSave() { try { localStorage.setItem(LSK + '-shared', JSON.stringify(state)); } catch (e) {} }
localLoad();
let sb = null;
const SB_TABLE = 'mtlqc_items';
const SYNC_PENDING = {};
function syncRemoteFresh(key) { const w = SYNC_PENDING[key]; if (!w) return true; if (w.n > 0) return false; return (Date.now() - w.t) > 2500; }
async function put(kind, k, v) {
  const key = kind + '|' + k;
  const w = SYNC_PENDING[key] || (SYNC_PENDING[key] = { n: 0, t: 0 });
  w.n++;
  state[kind] = state[kind] || {}; state[kind][k] = v; localSave(); queueRender();
  if (sb) { try { await sb.from(SB_TABLE).upsert({ trip_id: CFG.TRIP_ID, kind, k, v, updated_at: new Date().toISOString() }, { onConflict: 'trip_id,kind,k' }); } catch (e) {} }
  w.n--; w.t = Date.now();
}
async function sbInit() {
  const setupCards = () => $$('#plansetup,#notesetup').forEach(el => { el.hidden = false; el.innerHTML = L('<b>Sync is off</b> (saving on this phone only). Check <code>config.js</code>.', '<b>Синхронизация выключена</b> (данные только на этом телефоне). Проверьте <code>config.js</code>.'); });
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { setupCards(); return; }
  try {
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    const { data, error } = await sb.from(SB_TABLE).select('kind,k,v').eq('trip_id', CFG.TRIP_ID);
    if (error) throw error;
    (data || []).forEach(r => { state[r.kind] = state[r.kind] || {}; state[r.kind][r.k] = r.v; });
    localSave();
    sb.channel('trip').on('postgres_changes', { event: '*', schema: 'public', table: SB_TABLE, filter: 'trip_id=eq.' + CFG.TRIP_ID }, payload => {
      const r = payload.new; if (!r || !r.kind) return;
      if (!syncRemoteFresh(r.kind + '|' + r.k)) return;
      state[r.kind] = state[r.kind] || {}; state[r.kind][r.k] = r.v; localSave(); queueRender();
    }).subscribe();
    const ss = $('#syncstate'); if (ss) ss.textContent = '☁️ ' + t('syncOn');
    queueRender();
  } catch (e) { sb = false; setupCards(); const ss = $('#syncstate'); if (ss) ss.textContent = t('syncOff'); }
}

// ---------------------------------------------------------------- helpers
function toast(msg) { try { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('on'), 2000); } catch (e) {} }
function agMin(tm) { const p = String(tm || '0:00').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); }
function agHM(m) { m = Math.max(0, Math.min(m, 1439)); return String(Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0'); }
function agPad(m) { m = Math.max(0, Math.min(m, 1439)); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function todayKey() { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
function dayOfKey(dayKey) { const d = DAYBYKEY[dayKey]; if (!d) return null; return DAYKEYS.indexOf(dayKey); }
function dowOf(dayKey) { const d = DAYBYKEY[dayKey]; if (!d) return null; const p = d.date.split('-').map(Number); return DOW[new Date(p[0], p[1] - 1, p[2]).getDay()]; }
const DWL = { ru: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'], de: ['So','Mo','Di','Mi','Do','Fr','Sa'] };
function dayLabel(dayKey) { const d = DAYBYKEY[dayKey]; if (!d) return dayKey; const p = d.date.split('-').map(Number); const wd = new Date(p[0], p[1]-1, p[2]).getDay(); const nm = lang === 'en' ? d.dw : (DWL[lang] ? DWL[lang][wd] : d.dw); return nm + ' ' + d.dn; }
function dayTitle(d) { return d ? dayStory(d.key).title : ''; }
function dayLede(d) { return d ? dayStory(d.key).lede : ''; }
function placeName(p) { return fld(p, 'name') || p.name; }
function placeWhy(p) { return fld(p, 'why'); }
function placeSub(p) { return fld(p, 'sub'); }
function placeHours(p) { return fld(p, 'hours'); }
function placePrice(p) { return fld(p, 'price'); }
function placeLead(p) { return fld(p, 'lead'); }
function placeTips(p) { const a = fld(p, 'tips'); return Array.isArray(a) ? a : (Array.isArray(p.tips) ? p.tips : []); }
const HOMEMIN = {};
function fromHomeMin(p) { if (!p || p.lat == null) return null; if (HOMEMIN[p.id] == null) HOMEMIN[p.id] = G.fromHome(p.lat, p.lng); return HOMEMIN[p.id]; }
let RENDER_Q = null;
function queueRender() { if (RENDER_Q) return; RENDER_Q = requestAnimationFrame(() => { RENDER_Q = null; renderAll(); }); }
function refreshCustomSeeds() { Object.keys(state.custom || {}).forEach(k => { delete AGSEED['c:' + k]; seedFor('c:' + k); }); }
function md(txt) {
  // tiny markdown: paragraphs, **bold**, *em*, "- " bullets, [text](url)
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return String(txt || '').split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*-\s/.test(l))) return '<ul>' + lines.map(l => '<li>' + inline(l.replace(/^\s*-\s/, '')) + '</li>').join('') + '</ul>';
    return '<p>' + inline(block.trim()).replace(/\n/g, '<br>') + '</p>';
  }).join('');
}

// ---------------------------------------------------------------- votes
const VOTEV = { yes: 2, maybe: 1, no: -2 };
// Only the people in TRIP.VOTERS rate places (all the travellers unless it says otherwise).
const VOTERS = (Array.isArray(T.VOTERS) && T.VOTERS.length) ? T.VOTERS.filter(k => TR.some(t => t[0] === k)) : TR.map(t => t[0]);
const isVoter = (k) => VOTERS.indexOf(k) >= 0;
if (me && !isVoter(me)) { me = null; try { localStorage.removeItem(LSK + '-who'); } catch (e) {} }
function votesFor(ref) { const v = state.vote[ref]; return (v && typeof v === 'object') ? v : {}; }
function voteScore(ref) { const v = votesFor(ref); return VOTERS.reduce((s, k) => s + (VOTEV[v[k]] || 0), 0); }
function bothWant(ref) { const v = votesFor(ref); return VOTERS.length > 0 && VOTERS.every(k => v[k] === 'yes'); }
function oneWants(ref) { const v = votesFor(ref); return VOTERS.some(k => v[k] === 'yes') && !bothWant(ref) && !VOTERS.some(k => v[k] === 'no'); }
function setVote(ref, val) {
  if (!me) { toast(t('pickWhoFirst')); return; }
  const v = Object.assign({}, votesFor(ref));
  if (v[me] === val) delete v[me]; else v[me] = val;
  put('vote', ref, v);
}
function voteBadges(ref) {
  const v = votesFor(ref);
  return TR.filter(tr => isVoter(tr[0])).map(tr => { const x = v[tr[0]]; if (!x) return ''; const ico = x === 'yes' ? '❤️' : (x === 'maybe' ? '🤔' : '✕'); return '<span class="vb ' + x + '" title="' + esc(whoName(tr[0])) + '">' + (tr[3] || tr[0]) + ico + '</span>'; }).join('');
}
function scheduledDays(ref) { const out = []; DAYKEYS.forEach(d => { if (agIds(d).indexOf(ref) >= 0) out.push(d); }); return out; }

// ---------------------------------------------------------------- running order data
const AGSEED = Object.create(null), AGDAYS = {}, SEEDT = Object.create(null), AGSETS = {};
function bestTime(p) { return { morning: '10:00', afternoon: '14:00', sunset: '17:30', evening: '18:30', night: '21:00' }[p.best] || '12:00'; }
function seedFor(ref) {
  if (typeof ref !== 'string') return null;   // a synced row can hold anything
  if (AGSEED[ref]) return AGSEED[ref];
  if (ref.startsWith('p:')) {
    const p = PL[ref.slice(2)];
    if (!p) { AGSEED[ref] = { id: ref, t: '12:00', d: 60, lock: false, en: '⚠️ ' + ref.slice(2), ru: '⚠️ ' + ref.slice(2), p: null, q: null, missing: true }; return AGSEED[ref]; }
    // Route to the access point when the pin is not where you arrive (ferry islands,
    // a park entrance, the Manhattan end of the bridge) — the pin stays on the map.
    const acc = (T.ACCESS || {})[p.id];
    const pt = acc || ((p.lat != null) ? [p.lat, p.lng] : null);
    AGSEED[ref] = { id: ref, t: bestTime(p), d: p.dur || 60, lock: false, en: p.name, ru: p.nameRu || p.name, p: pt, q: pt, pin: (p.lat != null) ? [p.lat, p.lng] : null, place: p };
    return AGSEED[ref];
  }
  if (ref.startsWith('x:')) {
    const s = hasOwn(T.STOPS, ref.slice(2)) ? T.STOPS[ref.slice(2)] : null; if (!s) return null;
    AGSEED[ref] = { id: ref, t: s.t, d: s.d || 30, lock: !!s.lock, en: s.en, ru: s.ru || s.en, de: s.de || s.en, p: s.p || null, q: s.q || null, link: s.link || null, x: true };
    return AGSEED[ref];
  }
  if (ref.startsWith('c:')) {
    const c = hasOwn(state.custom, ref.slice(2)) ? state.custom[ref.slice(2)] : null; if (!c || typeof c !== 'object' || c.deleted) return null;
    // synced from the shared table: a bounded name, a real time and a sane length
    const la = coord(c.lat), ln = coord(c.lng), nm = String(c.name == null ? '' : c.name).slice(0, 120), dn = Number(c.d);
    const tm = (typeof c.t === 'string' && /^\d{1,2}:\d{2}$/.test(c.t)) ? c.t : '12:00';
    AGSEED[ref] = { id: ref, t: tm, d: (dn >= 5 && dn <= 720) ? dn : 60, lock: false, en: nm, ru: nm, de: nm, kind: (typeof c.cat === 'string' && CAT[c.cat]) ? c.cat : 'idea', p: (la != null && ln != null) ? [la, ln] : null, q: null, custom: true, cat: 'idea', approx: !!c.approx && la != null };
    return AGSEED[ref];
  }
  return null;
}
Object.entries(T.SEED || {}).forEach(([day, arr]) => {
  AGDAYS[day] = arr.map(it => { const ref = it[0]; const s = seedFor(ref); if (!s) return null; SEEDT[day + '|' + ref] = { t: it[1], d: it[2] }; return ref; }).filter(Boolean);
});
DAYKEYS.forEach(d => { AGDAYS[d] = AGDAYS[d] || []; AGSETS[d] = new Set(AGDAYS[d]); });
// A saved day stores the list it had when it was last edited, and the plan it
// was edited against ("seen"). The plan can change afterwards — a redeploy that
// moves a whole day, say — so a saved list is read as the edits it records,
// never as a frozen copy: stops the traveller put there stay, stops the plan
// still puts there stay, and stops the plan has since moved to another day
// follow the plan. Reading it as a frozen copy is how one small edit made
// before a reshuffle once left one day with two days' stops and the next empty.
function agClaims(day) {
  const st = agState(day); if (!isRow(st) || st.plan) return null;
  const base = new Set(Array.isArray(st.seen) ? st.seen : (AGDAYS[day] || []));
  const now = new Set(AGDAYS[day] || []);
  return st.ids.filter(id => seedFor(id) && (!base.has(id) || now.has(id)));
}
// The same stop can only live on one day; if two saved days both hold it (two
// phones editing at once), the earlier day keeps it.
function agClaimedBy(id, beforeDay) {
  for (const d of DAYKEYS) { if (d === beforeDay) break; const c = agClaims(d); if (c && c.indexOf(id) >= 0) return d; }
  return null;
}
function agIds(day) {
  const claimed = new Set();
  DAYKEYS.forEach(d2 => { if (d2 === day) return; const c = agClaims(d2); if (c) c.forEach(id => claimed.add(id)); });
  const seed = AGDAYS[day] || [];
  const mine = agClaims(day);
  if (!mine) return seed.filter(id => !claimed.has(id));
  const st = agState(day);
  const base = new Set(Array.isArray(st.seen) ? st.seen : seed), had = new Set(st.ids);
  const kept = mine.filter(id => !agClaimedBy(id, day));
  // what the plan has put on this day since it was saved, slotted in by its
  // planned time among what the traveller kept, in the traveller's order
  const arrivals = seed.filter(id => !base.has(id) && !had.has(id) && !claimed.has(id));
  if (!arrivals.length) return kept;
  const out = []; let a = 0;
  kept.forEach(id => { const tk = agBase(day, id); while (a < arrivals.length && agBase(day, arrivals[a]) <= tk) out.push(arrivals[a++]); out.push(id); });
  while (a < arrivals.length) out.push(arrivals[a++]);
  return out;
}
// Where a saved day's edits belong now. Normally its own day. But if the plan
// has since moved that day's stops elsewhere as a block (a reshuffle), the
// edits follow the stops: pins, removals and additions made to "the Liberty
// day" belong to the Liberty day, whichever date it is on now. Judged by which
// day's current plan holds most of what the saved day was edited against.
function agHome(key, st) {
  if (!st || !Array.isArray(st.seen) || !st.seen.length) return key;
  const seen = st.seen;
  const overlap = (d) => { const s2 = AGSETS[d]; let n = 0; seen.forEach(id => { if (s2 && s2.has(id)) n++; }); return n; };
  let best = key, bestN = overlap(key);
  DAYKEYS.forEach(d => { const n = overlap(d); if (n > bestN) { best = d; bestN = n; } });
  return (best !== key && bestN * 2 >= seen.length) ? best : key;
}
const isRow = (st) => !!st && typeof st === 'object' && Array.isArray(st.ids);
// When a row was saved. Rows from before this was recorded count as oldest; a
// time from the future (the shared table is writable by anyone) counts as none.
function agAt(st) { const at = Number(st && st.at); return (Number.isFinite(at) && at > 0 && at < Date.now() + 864e5) ? at : 0; }
// The saved row that speaks for each day. Candidates are every stored row and
// every row carried inside another (see agWrite), each at the day its edits now
// belong to; the newest wins, and between rows of the same age the day's own.
// Worked out once per change: every write (and every synced row) replaces the
// stored row object, so the same objects mean the same answer.
let AGROWS = null;
function agRows() {
  const all = state.agenda || {};
  if (AGROWS && AGROWS.all === all && DAYKEYS.every(k => AGROWS.refs[k] === all[k])) return AGROWS.rows;
  const best = {}, refs = {};
  const offer = (h, st, own) => { const at = agAt(st), cur = best[h]; if (!cur || at > cur.at || (at === cur.at && own && !cur.own)) best[h] = { st, at, own }; };
  DAYKEYS.forEach(k => {
    const st = all[k]; refs[k] = st;
    if (!st || typeof st !== 'object') return;
    if (isRow(st)) { const h = agHome(k, st); offer(h, st, h === k); }
    const c = st.carry;
    if (c && typeof c === 'object') DAYKEYS.forEach(d => { if (hasOwn(c, d) && isRow(c[d])) offer(agHome(d, c[d]), c[d], false); });
  });
  const rows = {}; Object.keys(best).forEach(h => { rows[h] = best[h].st; });
  AGROWS = { all, refs, rows };
  return rows;
}
function agState(day) { return agRows()[day] || {}; }
// Every write to a day goes through here, and it only ever writes that day's
// own row: the other phone may have newer rows for the other days that this
// one has not seen yet. A row stored under this day that still speaks for
// another day (its edits followed a reshuffle there) travels inside the new
// row as `carry`, so saving Monday never loses Tuesday's edits. Resetting a day
// writes a newer "as planned" row, which outranks any older edits for it,
// wherever they are stored.
function agWrite(day, row) {
  const all = state.agenda || {}, speak = agRows(), old = all[day], carry = {};
  if (old && typeof old === 'object') {
    const held = [];
    if (isRow(old)) held.push(old);
    if (old.carry && typeof old.carry === 'object') DAYKEYS.forEach(d => { if (hasOwn(old.carry, d) && isRow(old.carry[d])) held.push(old.carry[d]); });
    held.forEach(r => DAYKEYS.forEach(h => { if (h !== day && speak[h] === r) carry[h] = { ids: r.ids, t: r.t, d: r.d, seen: r.seen, at: agAt(r) }; }));
  }
  const out = row === null ? { plan: true, ids: [], t: {}, d: {}, seen: (AGDAYS[day] || []).slice() } : Object.assign({}, row);
  delete out.carry; out.at = Date.now();
  if (Object.keys(carry).length) out.carry = carry;
  put('agenda', day, out);
}
// Pinned times and durations come from the shared table: only well-formed ones count.
function agOv(day) { const t = agState(day).t, o = {}; if (t && typeof t === 'object') Object.keys(t).forEach(k => { if (typeof t[k] === 'string' && /^\d{1,2}:\d{2}$/.test(t[k])) o[k] = t[k]; }); return o; }
function agDurs(day) { const d = agState(day).d, o = {}; if (d && typeof d === 'object') Object.keys(d).forEach(k => { const v = Number(d[k]); if (Number.isFinite(v) && v >= 5 && v <= 720) o[k] = v; }); return o; }
function agDur(day, id) { const st = agState(day); const o = Number(hasOwn(st.d, id) ? st.d[id] : NaN); if (Number.isFinite(o) && o >= 5 && o <= 720) return o; const sd = SEEDT[day + '|' + id]; if (sd && sd.d) return sd.d; return seedFor(id).d; }
function agBase(day, id) { const ov = agOv(day); if (ov[id]) return agMin(ov[id]); const sd = SEEDT[day + '|' + id]; if (sd && sd.t) return agMin(sd.t); return agMin(seedFor(id).t); }
// How far people will walk depends on what they are walking to: approaching a park
// or a named walk IS the outing, so allow a longer stroll before calling it a ride.
function walkCap(a, b) {
  const big = (it) => { const c = it && it.place && it.place.cat; return c === 'park' || c === 'walk'; };
  return (big(a) || big(b)) ? 2.6 : 1.7;
}
function agTravel(from, to, cap) { const m = G.travelMin(from, to, cap); return m == null ? null : m; }
function agTouched(day, cur) {
  const st = agState(day); if (!isRow(st) || st.plan) return false;
  const on = cur || agIds(day), here = new Set(on);
  const seedOrder = AGDAYS[day] || []; const ids = on.filter(x => seedOrder.indexOf(x) >= 0);
  const reordered = ids.some((x, i) => i > 0 && seedOrder.indexOf(x) < seedOrder.indexOf(ids[i - 1]));
  // a pinned time only counts while its stop is still on this day
  return reordered || Object.keys(agOv(day)).some(k => here.has(k));
}
// Does the day differ from the plan in any way worth offering to undo?
function agDiffers(day, cur) {
  const st = agState(day); if (!isRow(st) || st.plan) return false;
  const on = cur || agIds(day), plan = (AGDAYS[day] || []).filter(id => on.indexOf(id) >= 0 || !agClaimedElsewhere(id, day));
  if (on.join() !== plan.join()) return true;
  const here = new Set(on);
  return Object.keys(agOv(day)).some(k => here.has(k)) || on.some(k => hasOwn(st.d, k));
}
function agClaimedElsewhere(id, day) { return DAYKEYS.some(d2 => d2 !== day && (agClaims(d2) || []).indexOf(id) >= 0); }
function agReflow(day, ids) {
  const touched = agTouched(day, ids); const ov = agOv(day);
  const rows = []; let cur = null, prevQ = null;
  const isSeed = (id) => (AGDAYS[day] || []).indexOf(id) >= 0;
  const dayStart = ids.length ? Math.min.apply(null, ids.map(id => agBase(day, id))) : 600;
  ids.forEach((id, i) => {
    const it = seedFor(id); const seed = agBase(day, id); const d = agDur(day, id);
    const anchored = it.lock || ov[id] != null;
    let gap = 0, mode = '';
    // A stop with no location ("a café near here") happens where you already are.
    if (i > 0) { if (!it.p) { gap = 5; mode = 'same'; } else { const cap = walkCap(seedFor(ids[i - 1]), it); const est = agTravel(prevQ, it.p, cap); gap = (est != null) ? est : 10; mode = G.travelMode(prevQ, it.p, cap); } }
    let start, warn = false;
    if (i === 0) start = seed;
    else if (anchored) { start = seed; warn = cur + gap > seed + 5; }
    else if (!touched && isSeed(id)) start = Math.max(seed, cur + gap);
    else start = Math.max(cur + gap, 540);
    cur = Math.max(cur == null ? 0 : cur, start + d);
    rows.push({ it, start, end: start + d, d, warn, edited: ov[id] != null, gap, mode });
    prevQ = it.q || it.p || prevQ;
  });
  return rows;
}
function agSave(day, ids) { agWrite(day, { ids, t: agOv(day), d: agDurs(day), seen: (AGDAYS[day] || []).slice() }); }
// A pin or a duration saves the day as it now stands (agIds), not the raw
// stored list: a stored list can still hold stops the plan has since moved
// away, and writing it back against today's plan would pin them here again.
function agSetTime(day, id, val) { const tt = agOv(day); if (val) tt[id] = val; else delete tt[id]; agWrite(day, { ids: agIds(day), t: tt, d: agDurs(day), seen: (AGDAYS[day] || []).slice() }); }
function agSetDur(day, id, val) { const dd = agDurs(day); if (val) dd[id] = val; else delete dd[id]; agWrite(day, { ids: agIds(day), t: agOv(day), d: dd, seen: (AGDAYS[day] || []).slice() }); }
function agInsert(day, ref, opts) {
  opts = opts || {};
  const it = seedFor(ref); if (!it) return;
  const ids = agIds(day).filter(x => x !== ref);
  const rows = agReflow(day, ids);
  const want = opts.at != null ? opts.at : agMin(it.t);
  let idx = rows.findIndex(r => r.start > want); if (idx < 0) idx = ids.length;
  if (opts.after) { const i2 = ids.indexOf(opts.after); if (i2 >= 0) idx = i2 + 1; }
  ids.splice(idx, 0, ref);
  // the same stop can only live on one day
  DAYKEYS.forEach(d => { if (d !== day && agIds(d).indexOf(ref) >= 0) agSave(d, agIds(d).filter(x => x !== ref)); });
  agSave(day, ids);
  if (opts.at != null) agSetTime(day, ref, agPad(opts.at));
}
// How heavy is this day? Counts real minutes (stops + travel), not stop count:
// a 25-minute look at a cathedral is not the same load as three hours in the Met.
// Stops that happen at home (a rest, packing, an early night) are free.
function dayStats(day, rows) {
  const out = rows.filter(r => !(r.it.p && G.haversine(r.it.p[0], r.it.p[1], HOMEPT[0], HOMEPT[1]) < 0.25));
  const anchors = out.filter(r => !r.it.x).length;
  // Sitting down counts half: an evening in a theatre seat or over dinner is time
  // spent, but it is not what makes a day exhausting. Daytime legwork counts full.
  const restful = (r) => {
    if (r.start < 17 * 60) return false;
    const c = (r.it.place && r.it.place.cat) || (r.it.custom && r.it.kind !== 'idea' && r.it.kind);
    if (c) return c === 'eat' || c === 'drink' || c === 'cafe' || c === 'show';
    return r.d >= 40; // an evening block with no category is a meal or a show
  };
  const majors = out.filter(r => r.d >= 45 && !restful(r)).length;
  const travel = rows.reduce((s, r, i) => s + (i > 0 ? r.gap : 0), 0);
  const active = out.reduce((s, r) => s + r.d * (restful(r) ? 0.5 : 1), 0);
  const last = rows[rows.length - 1];
  const homeGap = last ? (agTravel(last.it.q || last.it.p, HOMEPT) || 0) : 0;
  const homeBy = last ? last.end + homeGap : null;
  const span = rows.length && homeBy != null ? homeBy - rows[0].start : 0;
  const load = active + travel;
  const pref = (state.settings.pace && state.settings.pace.v) || 'normal';
  const k = pref === 'relaxed' ? 0.82 : (pref === 'full' ? 1.2 : 1);
  let lvl;
  if (load > 640 * k || span > 13.5 * 60 || majors > 7 * k) lvl = 3;
  else if (load > 470 * k || majors > 5 * k) lvl = 2;
  else if (load > 330 * k) lvl = 1;
  else lvl = 0;
  return { anchors, majors, travel, active, load, span, homeBy, lvl };
}
function paceLabel(lvl) { return [t('paceRelaxed'), t('paceComfy'), t('paceFull'), t('paceCrammed')][lvl]; }

// ---------------------------------------------------------------- what the day is about
// Each day has a title and a summary written for it as planned. Once its stops
// change (moved to another day, removed, added), those can describe a day that
// no longer exists, so they are written afresh from what is actually on it: the
// title from the neighbourhoods where the day is spent and anything headline
// (a concert, a show, the flight), the summary by morning, afternoon and evening.
const STOP_STORY = T.STOP_STORY || {};
const STORYW = {
  en: { parts: ['Morning', 'Afternoon', 'Evening'], sep: ': ', and: ' and ', amp: ' & ', more: (n) => n + ' more',
    free: 'Free day', home: 'A quiet day at home', freeLede: 'Nothing planned yet — add a stop, or move one here from another day with its ⋯ menu.',
    brunch: 'brunch at', lunch: 'lunch at', bite: 'a bite at', dinner: 'dinner at', breakfast: 'breakfast at', coffee: 'coffee at', dessert: 'dessert at', drinks: 'drinks at' },
  ru: { parts: ['Утром', 'Днём', 'Вечером'], sep: ' — ', and: ' и ', amp: ' и ', more: (n) => 'ещё ' + n,
    free: 'Свободный день', home: 'Тихий день дома', freeLede: 'Пока ничего не запланировано — добавьте пункт или перенесите сюда пункт из другого дня через его меню ⋯.',
    brunch: 'бранч в', lunch: 'обед в', bite: 'перекус в', dinner: 'ужин в', breakfast: 'завтрак в', coffee: 'кофе в', dessert: 'десерт в', drinks: 'по бокалу в' },
  de: { parts: ['Vormittags', 'Nachmittags', 'Abends'], sep: ': ', and: ' und ', amp: ' & ', more: (n) => n + ' weitere',
    free: 'Freier Tag', home: 'Ein ruhiger Tag zu Hause', freeLede: 'Noch nichts geplant — einen Stopp hinzufügen oder über sein ⋯-Menü einen von einem anderen Tag hierher verschieben.',
    brunch: 'Brunch im', lunch: 'Mittagessen im', bite: 'ein Happen im', dinner: 'Abendessen im', breakfast: 'Frühstück im', coffee: 'Kaffee im', dessert: 'Nachtisch im', drinks: 'Drinks im' },
};
const LGI = { en: 0, ru: 1, de: 2 };
// What a stop contributes to the story, or null for a ride between places.
function storyOf(id) {
  const it = seedFor(id); if (!it) return null;
  if (it.x) { const s = hasOwn(STOP_STORY, id.slice(2)) ? STOP_STORY[id.slice(2)] : null; return s ? { it, event: s.event || null, brief: s.brief || null, common: !!s.common } : null; }
  const c = it.custom && hasOwn(state.custom, id.slice(2)) ? state.custom[id.slice(2)] : null;
  return { it, cat: it.place ? it.place.cat : (c && typeof c.cat === 'string' && CAT[c.cat] ? c.cat : 'idea') };
}
const isStory = (id) => !!storyOf(id);
// A name without its explanatory tail: "Tin Building by Jean-Georges (South
// Street Seaport)" → "Tin Building by Jean-Georges", "Лоди — кафе в …" → "Лоди".
function shortName(nm) {
  // no backtracking regexes: a name can come from the shared table
  const full = String(nm == null ? '' : nm).slice(0, 160).trim();
  let s = full;
  if (s.endsWith(')')) { const i = s.lastIndexOf('('); if (i > 0) s = s.slice(0, i).trim(); }
  const m = s.search(/\s[—–]\s/); if (m > 0) s = s.slice(0, m).trim();
  return s || full;
}
// The name to use in a given language. Russian texts name restaurants, cafés and
// bars by their own (Latin) names, the way the written summaries do, so that
// "ужин в L'Artusi" never has to decline a transliteration.
function nameIn(it, lg, venue) {
  let nm;
  if (it.place) nm = lg === 'en' || (lg === 'ru' && venue) ? it.place.name : (fldIn(it.place, 'name', lg) || it.place.name);
  else nm = lg === 'ru' ? it.ru : (lg === 'de' ? (it.de || it.en) : it.en);
  nm = shortName(nm);
  return lg === 'en' ? nm.replace(/^The /, 'the ') : nm;
}
function dayPoint(it, pin) { const p = (pin && it.pin) || it.p; return (p && coord(p[0]) != null && coord(p[1]) != null) ? p : null; }
const atHome = (p) => G.haversine(p[0], p[1], HOMEPT[0], HOMEPT[1]) < 0.25;
function joinList(items, lg, max) {
  const W = STORYW[lg]; let list = items.slice();
  if (max && list.length > max) { const extra = list.length - (max - 1); list = list.slice(0, max - 1).concat([W.more(extra)]); }
  if (list.length < 2) return list.join('');
  return list.slice(0, -1).join(', ') + W.and + list[list.length - 1];
}
const upFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
function storyPhrase(row, lg) {
  const st = row.story, W = STORYW[lg];
  if (st.brief) return st.brief[LGI[lg]] || st.brief[0];
  const m = row.start, tags = (st.it.place && st.it.place.tags) || [];
  let kind = null;
  if (st.cat === 'eat') kind = m < 11 * 60 + 30 ? 'brunch' : (m < 15 * 60 + 30 ? 'lunch' : (m < 17 * 60 ? 'bite' : 'dinner'));
  else if (st.cat === 'cafe') kind = m < 11 * 60 ? 'breakfast' : (m >= 11 * 60 + 30 && m < 15 * 60 + 30 && row.d >= 60 ? 'lunch' : (tags.indexOf('dessert') >= 0 ? 'dessert' : 'coffee'));
  else if (st.cat === 'drink') kind = 'drinks';
  return kind ? W[kind] + ' ' + nameIn(st.it, lg, true) : nameIn(st.it, lg, false);
}
function storyRows(day, ids) {
  return agReflow(day, ids).map(r => Object.assign({}, r, { story: storyOf(r.it.id) })).filter(r => r.story);
}
// The title's parts are chosen once for all three languages, so switching
// language never changes what the title says, only the words.
function genTitle(rows, lg) {
  const W = STORYW[lg];
  if (!rows.length) return W.free;
  const parts = [], used = new Set();
  const named = (it) => ({ en: nameIn(it, 'en', false), ru: nameIn(it, 'ru', false), de: nameIn(it, 'de', false) });
  // headliners: the fixed events, and any long show or dated event from the library
  rows.forEach(r => {
    const st = r.story, p = st.it.place;
    if (st.event) { parts.push({ txt: { en: st.event[0], ru: st.event[1] || st.event[0], de: st.event[2] || st.event[0] }, at: r.start, w: Infinity, common: !!st.common }); used.add(r); }
    else if (p && p.cat === 'show' && (r.d >= 120 || eventDate(p))) { parts.push({ txt: named(st.it), at: r.start, w: Infinity }); used.add(r); }
  });
  // one sight big enough to be the day's reason (the Statue, the Met), by name
  const star = rows.filter(r => !used.has(r) && ['see', 'museum', 'park', 'walk', 'daytrip'].indexOf(r.story.cat) >= 0 && r.d >= 150).sort((a, b) => b.d - a.d)[0];
  if (star) { parts.push({ txt: named(star.story.it), at: star.start, w: star.d }); used.add(star); }
  // then where the rest of the day is spent, by time there (home doesn't count)
  const areas = {}, unplaced = [];
  rows.forEach(r => {
    if (used.has(r)) return; const pt = dayPoint(r.story.it, true); if (pt && atHome(pt)) return;
    const a = pt ? G.areaOf(pt[0], pt[1]) : null; if (!a) { unplaced.push(r); return; }
    const o = areas[a.key] || (areas[a.key] = { a, w: 0, at: r.start }); o.w += r.d; o.at = Math.min(o.at, r.start);
  });
  // never the same name twice ("Coney Island & Coney Island"): an area already
  // said by a headliner's name is not said again
  const said = (tx) => parts.some(x => LANGS.some(l => { const a = x.txt[l].toLowerCase(), b = tx[l].toLowerCase(); return a.indexOf(b) >= 0 || b.indexOf(a) >= 0; }));
  const ranked = Object.values(areas).sort((x, y) => y.w - x.w);
  const total = ranked.reduce((sum, o) => sum + o.w, 0);
  ranked.forEach((o, i) => { const tx = { en: o.a.en, ru: o.a.ru, de: o.a.de }; if ((i === 0 || o.w >= total * 0.25) && !said(tx)) parts.push({ txt: tx, at: o.at, w: o.w }); });
  // stops with no neighbourhood (your own ideas without a map link, somewhere
  // far out) are named themselves when nothing else describes the day, or
  // when one of them is the biggest thing in it
  unplaced.sort((a, b) => b.d - a.d).forEach((r, i) => { if (i < 2 && (!ranked.length || r.d >= ranked[0].w)) { const tx = named(r.story.it); if (!said(tx)) parts.push({ txt: tx, at: r.start, w: r.d }); } });
  if (!parts.length) return W.home;
  // at most three parts, short enough for a phone in every language: the
  // smallest part goes first
  // "Park Slope & flight home": a common noun is lower-case after the first part (German capitalises nouns anyway)
  const join = (list, l) => { const tx = list.map((x, i) => (i > 0 && x.common && l !== 'de') ? x.txt[l].charAt(0).toLowerCase() + x.txt[l].slice(1) : x.txt[l]); return tx.length < 2 ? tx[0] : tx.slice(0, -1).join(', ') + STORYW[l].amp + tx[tx.length - 1]; };
  const keep = parts.slice().sort((x, y) => y.w - x.w);
  while (keep.length > 1 && (keep.length > 3 || LANGS.some(l => join(keep, l).length > 44))) keep.pop();
  keep.sort((x, y) => x.at - y.at);
  return upFirst(join(keep, lg));
}
function genLede(rows, lg) {
  const W = STORYW[lg];
  if (!rows.length) return W.freeLede;
  const parts = [[], [], []];
  rows.forEach(r => { parts[r.start < 12 * 60 ? 0 : (r.start < 17 * 60 ? 1 : 2)].push(storyPhrase(r, lg)); });
  return parts.map((ph, i) => { if (!ph.length) return ''; const tx = W.parts[i] + W.sep + joinList(ph, lg, 4); return /[.!?…]$/.test(tx) ? tx : tx + '.'; }).filter(Boolean).join(' ');
}
// The stops that carry the story, as a set.
const storySet = (ids) => ids.filter(isStory).slice().sort().join('|');
function dayIsAsPlanned(day, ids) { return storySet(ids) === storySet(AGDAYS[day] || []); }
// The written title survives smaller changes: every stop it names is still
// there, and at least three quarters of the day (by time) is still the plan.
function titleHolds(day, ids) {
  const d = DAYBYKEY[day]; const plan = (AGDAYS[day] || []).filter(isStory), cur = ids.filter(isStory);
  if ((d.titled || []).some(id => cur.indexOf(id) < 0)) return false;
  const seedDur = (id) => { const sd = SEEDT[day + '|' + id]; return (sd && sd.d) || seedFor(id).d || 30; };
  let kept = 0, lost = 0, added = 0;
  plan.forEach(id => { if (cur.indexOf(id) >= 0) kept += agDur(day, id); else lost += seedDur(id); });
  cur.forEach(id => { if (plan.indexOf(id) < 0) added += agDur(day, id); });
  return kept > 0 && kept >= 0.75 * (kept + lost) && kept >= 0.75 * (kept + added);
}
// How far the day has moved from its plan: 'planned' (the same stops),
// 'close' (the written title still holds) or 'changed'.
function dayMode(day, ids) { return dayIsAsPlanned(day, ids) ? 'planned' : (titleHolds(day, ids) ? 'close' : 'changed'); }
function dayStory(day, lg) {
  lg = lg || lang;
  const d = DAYBYKEY[day]; if (!d) return { title: '', lede: '', mode: 'planned' };
  const ids = agIds(day), mode = dayMode(day, ids);
  if (mode === 'planned') return { title: fldIn(d, 'title', lg), lede: fldIn(d, 'lede', lg), mode };
  const rows = storyRows(day, ids);
  return { title: mode === 'close' ? fldIn(d, 'title', lg) : genTitle(rows, lg), lede: genLede(rows, lg), mode };
}
// Where the day happens, for "which day suits this place?", the stop picker and
// the rain plan: the written hubs while the title still holds, else the travel
// hubs where its stops are, by time spent (none at all for an empty day).
function dayHubs(day) {
  const d = DAYBYKEY[day]; const ids = agIds(day);
  if (dayMode(day, ids) !== 'changed') return d.hubs || [];
  const w = {};
  ids.filter(isStory).forEach(id => { const it = seedFor(id); const pt = dayPoint(it, false); if (!pt) return; const h = G.nearestHub(pt[0], pt[1]).hub.key; w[h] = (w[h] || 0) + agDur(day, id); });
  const ranked = Object.keys(w).sort((a, b) => w[b] - w[a]); const total = ranked.reduce((s, h) => s + w[h], 0);
  return ranked.filter((h, i) => i === 0 || w[h] >= total * 0.15).slice(0, 3);
}
// Indoor swaps for a rainy day: the written list while the title still holds,
// else museums and indoor rainy-day places near wherever the day now is.
function dayRain(day) {
  const ids = agIds(day);
  const dow = dowOf(day), open = (p) => !(Array.isArray(p.closed) && p.closed.indexOf(dow) >= 0);
  // anything already on another day is left out: adding it here would quietly take it off that day
  const elsewhere = (id) => DAYKEYS.some(d2 => d2 !== day && agIds(d2).indexOf('p:' + id) >= 0);
  if (dayMode(day, ids) !== 'changed') return ((T.RAIN || {})[day] || []).filter(id => PL[id] && open(PL[id]) && !elsewhere(id));
  const hubs = dayHubs(day); if (!hubs.length) return [];
  const on = new Set(); DAYKEYS.forEach(d2 => agIds(d2).forEach(id => on.add(id)));
  return PLACES.filter(p => {
    if (p.lat == null || on.has('p:' + p.id)) return false;
    const tags = p.tags || [];
    if (tags.indexOf('outdoor') >= 0 || !open(p)) return false;
    return p.cat === 'museum' || (tags.indexOf('rainy-day') >= 0 && (p.cat === 'see' || p.cat === 'shop'));
  }).map(p => { const h = G.nearestHub(p.lat, p.lng).hub.key; return { p, n: Math.min.apply(null, hubs.map(x => G.hubToHub(x, h))), s: voteScore('p:' + p.id) }; })
    .filter(x => x.s >= 0 && x.n <= 25).sort((a, b) => (a.n - b.n) || (b.s - a.s)).slice(0, 5).map(x => x.p.id);
}

// ---------------------------------------------------------------- day panels
function buildDayPanels() {
  const host = $('#dayhost'); if (!host) return;
  host.innerHTML = DAYS.map((d, i) => {
    return '<section class="panel" id="' + d.key + '" role="tabpanel">' +
      '<div class="dayhead"><div class="kicker"><span class="no">' + t('dayOf').toUpperCase() + ' ' + (i + 1) + '</span><span class="eyebrow"><span class="dl"></span><span class="wxsep"></span><span class="wx" data-wxday="' + d.key + '"></span></span></div>' +
      '<h2 class="dt"></h2><p class="lede dlede"></p>' +
      '<div class="daytools"><span class="pace" data-pace="' + d.key + '"></span></div><p class="pacehint" data-pacehint="' + d.key + '" hidden></p></div>' +
      '<div class="rainbox" data-rainbox="' + d.key + '" hidden></div>' +
      '<div class="agwrap open" data-agday="' + d.key + '"></div>' +
      '<div class="dayacts"><button class="act ok" type="button" data-addstop="' + d.key + '"></button><button class="act" type="button" data-break="' + d.key + '"></button><button class="act site" type="button" data-replan="' + d.key + '"></button><button class="act" type="button" data-share="' + d.key + '"></button></div>' +
      '<div class="daynote"><textarea data-daynote="' + d.key + '"></textarea></div>' +
      '</section>';
  }).join('');
  $$('[data-addstop]').forEach(b => { b.onclick = () => openAddStop(b.dataset.addstop); });
  $$('[data-break]').forEach(b => { b.onclick = () => suggestBreak(b.dataset.break); });
  $$('[data-replan]').forEach(b => { b.onclick = () => openReplan(b.dataset.replan); });
  $$('[data-share]').forEach(b => { b.onclick = () => shareDay(b.dataset.share); });
  $$('[data-daynote]').forEach(ta => { let h = null; ta.addEventListener('input', () => { clearTimeout(h); h = setTimeout(() => put('daynote', ta.dataset.daynote, { text: ta.value.slice(0, 2000) }), 700); }); });
}
function paintDayHeads() {
  DAYS.forEach((d, i) => {
    const sec = document.getElementById(d.key); if (!sec) return;
    sec.querySelector('.no').textContent = t('dayOf').toUpperCase() + ' ' + (i + 1);
    sec.querySelector('.dl').textContent = dayLabel(d.key) + ' · ' + monthName(d.date);
    sec.querySelector('.dt').textContent = dayTitle(d);
    sec.querySelector('.dlede').textContent = dayLede(d);
    sec.querySelector('[data-addstop]').textContent = t('addStop');
    sec.querySelector('[data-break]').textContent = t('suggestBreak');
    sec.querySelector('[data-replan]').textContent = t('replan');
    sec.querySelector('[data-share]').textContent = t('shareDay');
    sec.querySelector('[data-daynote]').placeholder = t('dayNotes');
  });
}

// ---------------------------------------------------------------- render: running order
let AG_DRAG = false, AG_LASTDRAG = 0;
document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.agmenu,.ag-mv')) $$('.agmenu').forEach(m => m.remove()); }, true);
document.addEventListener('click', function (e) { if (AG_LASTDRAG && (Date.now() - AG_LASTDRAG) < 450 && e.target.closest('.aglist')) { e.preventDefault(); e.stopPropagation(); } }, true);
function rowTitleHtml(it) {
  const ttl = stopLabel(it);
  if (it.place) return '<button type="button" class="ag-link" data-openplace="' + esc(it.place.id) + '">' + esc(ttl) + '</button>';
  if (it.link && it.link.startsWith('#guide-')) return '<button type="button" class="ag-link" data-goguide="' + esc(it.link.slice(7)) + '">' + esc(ttl) + '</button>';
  if (it.link && it.link.startsWith('#explore-')) return '<button type="button" class="ag-link" data-goexplore="' + esc(it.link.slice(9)) + '">' + esc(ttl) + '</button>';
  if (it.custom) return '<button type="button" class="ag-link" data-openplace="' + esc(it.id) + '">' + esc(ttl) + '</button>';
  return esc(ttl);
}
function rowSub(it, day) {
  if (it.custom && !it.p) return '<small class="nolocation">' + esc(t('noLocation')) + '</small>';
  if (it.custom && it.approx) return '<small class="nolocation">' + esc(t('approxShort')) + '</small>';
  if (it.custom) { const c = hasOwn(state.custom, it.id.slice(2)) ? state.custom[it.id.slice(2)] : null; return c && typeof c.hood === 'string' && c.hood ? '<small>' + esc(c.hood.slice(0, 60)) + '</small>' : ''; }
  const p = it.place; if (!p) return '';
  const bits = [placeSub(p), p.hood].filter(Boolean);
  const dow = dowOf(day);
  const closed = Array.isArray(p.closed) && p.closed.indexOf(dow) >= 0;
  return '<small>' + esc(bits.join(' · ')) + (closed ? ' · <b style="color:var(--red)">⚠ ' + t('closedThatDay') + '</b>' : '') + '</small>';
}
function renderAgenda(day) {
  const box = document.querySelector('.agwrap[data-agday="' + day + '"]'); if (!box) return;
  const ids = agIds(day); const rows = agReflow(day, ids);
  const touched = agDiffers(day, ids);
  const range = rows.length ? agHM(rows[0].start) + '–' + agHM(rows[rows.length - 1].end) : '';
  const st = dayStats(day, rows);
  box.innerHTML = '<div class="aghead" data-agtoggle><span>🕐 <b>' + t('runningOrder') + '</b> · ' + rows.length + ' ' + t('stops') + ' · ' + range + '</span><span class="chev">▾</span></div>' +
    '<div class="aglist">' + rows.map((r, i) => {
      const tm = agHM(r.start) + '–' + agHM(r.end);
      const grip = r.it.lock ? '<span class="ag-handle ag-fixed" title="' + t('fixed') + '">🔒</span>' : '<span class="ag-handle" title="' + t('drag') + '">☰</span>';
      let conn = '';
      if (i > 0) {
        const diff = r.start - rows[i - 1].end, g = r.gap, slack = diff - g; let lbl = '';
        const unit = r.mode === 'walk' ? t('walk') : t('subway');
        if (g <= 0 && diff > 0) lbl = '↓ ' + diff + ' ' + t('free');
        else if (g > 0 && slack <= 10) lbl = '↓ ~' + (diff > 0 ? diff : g) + ' ' + unit;
        else if (g > 0) lbl = '↓ ~' + g + ' ' + unit + ' · ' + slack + ' ' + t('slack');
        // A real hole in the day is an offer, not a complaint: tap it to fill it.
        const fillable = slack >= 45;
        if (fillable) lbl = (lbl || '↓ ' + diff + ' ' + t('free')) + ' · ' + t('fillGap');
        if (lbl) conn = '<div class="aggap' + (g >= 45 ? ' long' : '') + (fillable ? ' fill' : '') + '"' + (fillable ? ' data-gap="' + i + '" role="button" tabindex="0"' : '') + '>' + lbl + '</div>';
      }
      const cat = r.it.place ? r.it.place.cat : (r.it.x ? 'x' : 'idea');
      const ico = r.it.place ? (CAT[r.it.place.cat] || CAT.idea).ico : (r.it.custom ? (CAT[r.it.kind] || CAT.idea).ico : '');
      return conn + '<div class="agrow stop-' + cat + '" data-id="' + esc(r.it.id) + '" data-start="' + agPad(r.start) + '">' + grip +
        '<button type="button" class="ag-time' + (r.warn ? ' warn' : '') + (r.edited ? ' edited' : '') + '" title="' + t('tapTime') + '">' + (r.warn ? '⚠' : '') + tm + '</button>' +
        '<span class="ag-t"><span class="ag-ico">' + ico + '</span> ' + rowTitleHtml(r.it) + rowSub(r.it, day) + '</span>' +
        '<button class="ag-mv" type="button" title="' + t('moveOrRemove') + '">⋯</button></div>';
    }).join('') +
    '<div class="agsum">' + (st.homeBy != null ? '<b>' + t('homeBy') + ' ~' + agHM(st.homeBy) + '</b> · ' : '') + st.anchors + ' ' + t('anchors') + ' · ~' + st.travel + ' ' + t('minutes') + ' ' + t('transit') + ' · ' + num(Math.round(st.span / 6) / 10) + ' ' + L('h out', 'ч вне дома', 'h außer Haus') + '</div>' +
    '<div class="agfoot"><span>' + t('dragHint') + '</span>' + (touched ? '<button type="button" data-agreset>' + t('resetDay') + '</button>' : '') + '</div></div>';
  // pace pill + hint
  const pp = document.querySelector('[data-pace="' + day + '"]'); if (pp) { pp.className = 'pace p' + st.lvl; pp.textContent = paceLabel(st.lvl); }
  const ph = document.querySelector('[data-pacehint="' + day + '"]'); if (ph) { ph.hidden = st.lvl < 3; ph.textContent = t('paceHint'); }
  // time picker
  box.querySelectorAll('.ag-time').forEach(tb => {
    tb.onclick = (e) => {
      e.stopPropagation(); const row = tb.closest('.agrow'); const id = row.dataset.id; if (row.querySelector('.ag-tin')) return;
      const inp = document.createElement('input'); inp.type = 'time'; inp.className = 'ag-tin'; inp.value = row.dataset.start; inp.step = 300;
      tb.replaceWith(inp); inp.focus(); try { if (inp.showPicker) inp.showPicker(); } catch (err) {}
      let done = false;
      const commit = () => { if (done) return; done = true; const v = inp.value; if (v && v !== row.dataset.start) agSetTime(day, id, v); else renderAgenda(day); };
      inp.addEventListener('change', commit); inp.addEventListener('blur', () => setTimeout(commit, 150));
    };
  });
  box.querySelector('[data-agtoggle]').onclick = () => { box.classList.toggle('open'); };
  box.querySelectorAll('[data-gap]').forEach(gp => { gp.onclick = (e) => { e.stopPropagation(); fillGap(day, Number(gp.dataset.gap)); }; });
  const rst = box.querySelector('[data-agreset]'); if (rst) rst.onclick = (e) => { e.stopPropagation(); agWrite(day, null); toast(L('Day reset to the plan', 'День возвращён к плану', 'Tag auf den Plan zurückgesetzt')); };
  box.querySelectorAll('[data-openplace]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); openPlace(b.dataset.openplace); }; });
  box.querySelectorAll('[data-goguide]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); goGuide(b.dataset.goguide); }; });
  box.querySelectorAll('[data-goexplore]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); EX.cat = b.dataset.goexplore; setTab('explore'); }; });
  const list = box.querySelector('.aglist');
  // ⋯ menus: move to day / duration / remove
  box.querySelectorAll('.ag-mv').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation(); const row = btn.closest('.agrow'); const id = row.dataset.id;
      const old = row.querySelector('.agmenu'); if (old) { old.remove(); return; }
      $$('.agmenu').forEach(m => m.remove());
      const menu = document.createElement('div'); menu.className = 'agmenu';
      const it = seedFor(id);
      if (!it.lock) {
        const fits = it.place ? rankDays(it.place) : null;
        DAYKEYS.forEach(d => {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = dayLabel(d);
          const fit = fits ? fits.find(f => f.day === d) : null;
          b.disabled = d === day || (fit && fit.closed);
          if (fit && fit.rec && d !== day) b.classList.add('rec');
          if (fit && fit.closed) b.title = t('closedThatDay');
          b.onclick = (ev) => { ev.stopPropagation(); agSave(day, agIds(day).filter(x => x !== id)); agInsert(d, id); toast(t('moved') + ' ' + dayLabel(d)); };
          menu.appendChild(b);
        });
        const dur = document.createElement('div'); dur.className = 'agmenu ag-dur'; dur.style.position = 'static'; dur.style.boxShadow = 'none'; dur.style.border = '0'; dur.style.padding = '0'; dur.style.gridTemplateColumns = 'repeat(6,1fr)';
        [30, 45, 60, 90, 120, 180].forEach(m => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m + '′'; if (agDur(day, id) === m) b.classList.add('rec'); b.onclick = (ev) => { ev.stopPropagation(); agSetDur(day, id, m); }; dur.appendChild(b); });
        menu.appendChild(dur);
      }
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'ag-rm'; rm.textContent = t('remove');
      rm.onclick = (ev) => { ev.stopPropagation(); agSave(day, agIds(day).filter(x => x !== id)); toast(t('removed')); };
      menu.appendChild(rm); row.appendChild(menu);
    };
  });
  // drag to reorder
  function agDragTo(row, y) {
    const sibs = Array.prototype.slice.call(list.querySelectorAll('.agrow')).filter(s => s !== row); let placed = false;
    for (const s of sibs) { const r = s.getBoundingClientRect(); if (y < r.top + r.height / 2) { if (s.previousElementSibling !== row) list.insertBefore(row, s); placed = true; break; } }
    if (!placed) { const foot = list.querySelector('.agsum'); if (foot) list.insertBefore(row, foot); else list.appendChild(row); }
  }
  box.querySelectorAll('.agrow').forEach(row => {
    const def = seedFor(row.dataset.id); if (!def || def.lock) return;
    let timer = null, active = false, sx = 0, sy = 0;
    const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const begin = () => { active = true; AG_DRAG = true; row.classList.add('dragging'); try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {} };
    const finish = () => {
      clearTimer(); document.removeEventListener('pointermove', onDocMove); document.removeEventListener('pointerup', onDocUp); document.removeEventListener('pointercancel', onDocUp);
      if (!active) return; active = false; AG_DRAG = false; row.classList.remove('dragging');
      const ids = Array.prototype.slice.call(list.querySelectorAll('.agrow')).map(r => r.dataset.id); const cur = agIds(day); AG_LASTDRAG = Date.now();
      if (ids.join() !== cur.join()) agSave(day, ids); else renderAgenda(day);
    };
    const onDocMove = (ev) => { if (active) agDragTo(row, ev.clientY); };
    const onDocUp = () => finish();
    row.addEventListener('touchmove', (ev) => { const tc = ev.touches && ev.touches[0]; if (active) { ev.preventDefault(); if (tc) agDragTo(row, tc.clientY); } else if (timer && tc && (Math.abs(tc.clientY - sy) > 12 || Math.abs(tc.clientX - sx) > 12)) clearTimer(); }, { passive: false });
    row.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.ag-time,.ag-mv,.agmenu,.ag-tin,.ag-link')) return;
      sx = ev.clientX; sy = ev.clientY;
      document.addEventListener('pointermove', onDocMove); document.addEventListener('pointerup', onDocUp); document.addEventListener('pointercancel', onDocUp);
      if (ev.target.closest('.ag-handle')) { ev.preventDefault(); begin(); } else timer = setTimeout(() => { timer = null; begin(); }, 320);
    });
  });
  // rain box + notes
  const rb = document.querySelector('[data-rainbox="' + day + '"]');
  if (rb) {
    const w = WX[day]; const list2 = (w && w.rain) ? dayRain(day) : [];
    if (list2.length) {
      rb.hidden = false;
      rb.innerHTML = '<div class="rt">' + t('rainTitle') + '</div><div class="acts">' + list2.map(id => '<button class="act" type="button" data-rainadd="' + esc(id) + '">' + (agIds(day).indexOf('p:' + id) >= 0 ? '✓ ' : '＋ ') + esc(placeName(PL[id])) + '</button>').join('') + '</div>';
      rb.querySelectorAll('[data-rainadd]').forEach(b => { b.onclick = () => { const ref = 'p:' + b.dataset.rainadd; if (agIds(day).indexOf(ref) >= 0) openPlace(b.dataset.rainadd); else { agInsert(day, ref); toast(t('applied')); } }; });
    } else rb.hidden = true;
  }
  const ta = document.querySelector('[data-daynote="' + day + '"]');
  if (ta && document.activeElement !== ta) { const n = state.daynote[day]; ta.value = (n && n.text) || ''; }
}
function renderAgendaAll() { if (AG_DRAG) return; DAYKEYS.forEach(renderAgenda); }

// ---------------------------------------------------------------- day fit + planner
function rankDays(p, opts) {
  opts = opts || {};
  const hub = (p.lat != null) ? G.nearestHub(p.lat, p.lng).hub.key : null;
  const dated = eventDate(p);
  const out = DAYKEYS.map(day => {
    const d = DAYBYKEY[day]; const dow = dowOf(day);
    const closed = Array.isArray(p.closed) && p.closed.indexOf(dow) >= 0;
    let score = 0, why = '';
    if (dated) { if (dated === d.date) { score += 100; why = L('on that date', 'в эту дату'); } else score -= 100; }
    const hubs = dayHubs(day);
    if (hub && hubs.length) {
      if (hubs.indexOf(hub) >= 0) { score += 10; why = why || L('same neighborhood that day', 'в тот же район в этот день'); }
      else { const m = Math.min.apply(null, hubs.map(h => G.hubToHub(h, hub))); score += Math.max(0, (60 - m) / 6); if (!why && m <= 20) why = L('a short hop from that day\'s area', 'недалеко от района того дня'); }
    }
    const rows = agReflow(day, agIds(day)); const st = dayStats(day, rows);
    score -= Math.max(0, st.anchors - 4) * 2; if (st.lvl >= 3) score -= 20;
    if (day === 'd0') score -= 15; if (day === 'd8') score -= (p.tags || []).indexOf('near-home') >= 0 ? 0 : 25;
    if (closed) score -= 1000;
    return { day, score, closed, why };
  });
  const best = Math.max.apply(null, out.map(o => o.score));
  out.forEach(o => { o.rec = !o.closed && o.score === best && best > -50; });
  return out;
}
function eventDate(p) {
  if (!p.hours) return null;
  const m = String(p.hours).match(/(Sep|Oct|сен|окт)[a-z]*\.?\s*(\d{1,2})/i) || String(p.hours).match(/(\d{1,2})\s*(Sep|Oct|сен|окт)/i);
  if (!m) return null;
  const mon = /oct|окт/i.test(m[0]) ? '10' : '09'; const dayN = m[2] && /^\d+$/.test(m[2]) ? m[2] : m[1];
  const key = '2026-' + mon + '-' + String(dayN).padStart(2, '0');
  return DAYS.some(d => d.date === key) ? key : null;
}
function buildWeek() {
  const seen = new Set(); DAYKEYS.forEach(d => agIds(d).forEach(id => seen.add(id)));
  const cands = PLACES.filter(p => !seen.has('p:' + p.id) && (bothWant('p:' + p.id) || voteScore('p:' + p.id) >= 2))
    .map(p => ({ p, s: voteScore('p:' + p.id) + (bothWant('p:' + p.id) ? 3 : 0) + ((p.tags || []).indexOf('first-timer') >= 0 ? 1 : 0) })).sort((a, b) => b.s - a.s);
  Object.entries(state.custom || {}).forEach(([k, c]) => { if (!c || c.deleted) return; const ref = 'c:' + k; if (!seen.has(ref) && voteScore(ref) >= 2) cands.push({ p: { id: k, custom: true, name: c.name, dur: c.d || 60, best: 'afternoon', lat: c.lat, lng: c.lng, tags: [] }, s: voteScore(ref), ref }); });
  const plan = {}; const skipped = [];
  const virtual = {}; DAYKEYS.forEach(d => { virtual[d] = agIds(d).slice(); });
  cands.forEach(c => {
    const p = c.p; const ref = c.ref || ('p:' + p.id);
    const fits = rankDays(p).filter(f => !f.closed && f.score > -50).sort((a, b) => b.score - a.score);
    let chosen = null;
    for (const f of fits) {
      const rows = agReflow(f.day, virtual[f.day]); const st = dayStats(f.day, rows);
      if (st.lvl <= 1 || (st.lvl === 2 && p.cat === 'drink')) { chosen = f; break; }
    }
    if (!chosen) { skipped.push(p); return; }
    if (!seedFor(ref)) seedFor(ref);
    const rowsNow = agReflow(chosen.day, virtual[chosen.day]); const want = agMin(seedFor(ref).t);
    let idx = rowsNow.findIndex(r => r.start > want); if (idx < 0) idx = virtual[chosen.day].length;
    virtual[chosen.day].splice(idx, 0, ref);
    (plan[chosen.day] = plan[chosen.day] || []).push({ ref, p, why: chosen.why });
  });
  return { plan, skipped, virtual };
}
function openBuildWeek() {
  const r = buildWeek(); const days = Object.keys(r.plan);
  if (!days.length) { openSheet('<h3>' + t('buildTitle') + '</h3><p class="why">' + (r.skipped.length ? esc(r.skipped.map(p => placeName(p)).join(', ')) + ' — ' + t('noFit') : t('nothingToAdd')) + '</p>'); return; }
  let html = '<h3>' + t('buildTitle') + '</h3><p class="why">' + t('buildIntro') + '</p><div class="preview">';
  DAYKEYS.forEach(d => {
    if (!r.plan[d]) return;
    html += '<div class="pd">' + dayLabel(d) + ' · ' + esc(dayTitle(DAYBYKEY[d])) + '</div>';
    agReflow(d, r.virtual[d]).forEach(row => { const added = r.plan[d].some(a => a.ref === row.it.id); html += '<div class="pr' + (added ? ' add' : '') + '"><span class="tt">' + agHM(row.start) + '</span>' + (added ? '＋ ' : '') + esc(stopLabel(row.it)) + '</div>'; });
  });
  html += '</div>' + (r.skipped.length ? '<p class="gsub">' + t('noFit') + ': ' + esc(r.skipped.map(p => placeName(p)).join(', ')) + '</p>' : '') +
    '<div class="sheetacts"><button class="act go" type="button" id="bw-apply">' + t('apply') + '</button><button class="act" type="button" id="bw-cancel">' + t('cancel') + '</button></div>';
  openSheet(html, () => {
    $('#bw-apply').onclick = () => { days.forEach(d => agSave(d, r.virtual[d])); closeSheet(); toast(t('applied')); };
    $('#bw-cancel').onclick = closeSheet;
  });
}

// ---------------------------------------------------------------- sheets
function openSheet(html, after) {
  const sh = $('#sheet'), bk = $('#sheetback'); if (!sh) return;
  $('#sheetbody').innerHTML = '<button class="closebtn" type="button" aria-label="Close">×</button>' + html;
  sh.hidden = false; bk.hidden = false; sh.scrollTop = 0; document.body.style.overflow = 'hidden';
  sh.querySelector('.closebtn').onclick = closeSheet; bk.onclick = closeSheet;
  if (after) after();
}
function closeSheet() { const sh = $('#sheet'), bk = $('#sheetback'); if (!sh) return; sh.hidden = true; bk.hidden = true; document.body.style.overflow = ''; }
// Anything that becomes an href passes through here. The shared table is
// writable with the public key, so a stop's links are untrusted however they
// were entered: only http(s) survives, never javascript: or data:.
function safeHref(u) { const x = String(u || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(x) ? x : ''; }
// Same for coordinates: a finite number or nothing, so a bad record cannot
// turn a day's timings into NaN.
function coord(v) { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return (typeof n === 'number' && isFinite(n)) ? n : null; }
function linkChips(p) {
  const chips = [];
  if (p.web) chips.push(['site', p.web, t('website')]);
  if (p.tickets) chips.push(['tix', p.tickets, t('tickets')]);
  if (p.reserve) chips.push(['tix', p.reserve, t('reserve')]);
  if (p.menu) chips.push(['', p.menu, t('menu')]);
  if (p.ig) chips.push(['ig', p.ig, 'Instagram']);
  const where = (p.name || '') + ', ' + (p.addr || [p.hood, 'New York'].filter(Boolean).join(', '));
  if (p.mapUrl) chips.push(['', p.mapUrl, t('map')]);
  else if (p.lat != null) chips.push(['', G.mapsSearch(where), t('map')]);
  // A location the concierge only estimated could be blocks out, so directions
  // to it are asked for by name and Google finds the real door.
  if (p.lat != null) chips.push(['', p.approx ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(where) + '&travelmode=transit' : G.mapsDir(null, [p.lat, p.lng]), t('directions')]);
  return '<div class="linkrow">' + chips.filter(c => safeHref(c[1])).map(c => '<a class="' + c[0] + '" href="' + esc(safeHref(c[1])) + '" target="_blank" rel="noopener">' + esc(c[2]) + '</a>').join('') + '</div>';
}
function openPlace(id) {
  let p = PL[id]; let ref = 'p:' + id; let custom = null;
  if (!p && id.startsWith('c:')) {
    custom = (state.custom || {})[id.slice(2)]; if (!custom) return; ref = id;
    p = { id: id.slice(2), name: custom.name, cat: CAT[custom.cat] ? custom.cat : 'idea', hood: custom.hood || '', dur: custom.d || 60, why: custom.note || '', tips: [], tags: [], custom: true,
      lat: (coord(custom.lat) != null && coord(custom.lng) != null) ? coord(custom.lat) : null, lng: (coord(custom.lat) != null && coord(custom.lng) != null) ? coord(custom.lng) : null,
      web: safeHref(custom.web), mapUrl: safeHref(custom.map),
      addr: typeof custom.addr === 'string' ? custom.addr.slice(0, 160) : '', hours: typeof custom.hours === 'string' ? custom.hours.slice(0, 300) : '' };
    p.approx = !!custom.approx && p.lat != null;
    // a share link that never got expanded (offline at the time): try again now
    if (custom.map && (custom.lat == null || (custom.approx && custom.needsResolve))) resolveCustom(id.slice(2), true);
  }
  if (!p) return;
  const hm = fromHomeMin(p); const dow = scheduledDays(ref); const v = votesFor(ref);
  const closed = Array.isArray(p.closed) && p.closed.length ? p.closed.map(c => DOWL[lang][DOW.indexOf(c)]).join(', ') : '';
  const kv = [];
  if (placeHours(p)) kv.push([t('hours'), placeHours(p)]);
  if (closed) kv.push([t('closed'), closed]);
  if (placePrice(p)) kv.push([t('price'), placePrice(p)]);
  if (placeLead(p)) kv.push([t('booking'), placeLead(p)]);
  if (p.dur) kv.push([t('typical'), '~' + p.dur + ' ' + t('minutes')]);
  if (p.addr) kv.push([t('address'), p.addr]);
  const html = '<div class="cat" style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--f)">' + catLabel(p.cat) + (p.sub ? ' · ' + esc(placeSub(p)) : '') + '</div>' +
    '<h3>' + esc(placeName(p)) + '</h3>' +
    '<div class="meta">' + [esc([p.hood, p.boro].filter(Boolean).join(', ')), hm != null ? '~' + hm + ' ' + t('minutes') + ' ' + t('fromHome') : '', dow.length ? '<b style="color:var(--g-dark)">' + t('inPlan') + ': ' + dow.map(dayLabel).join(', ') + '</b>' : ''].filter(Boolean).join(' · ') + '</div>' +
    (placeWhy(p) ? '<p class="why">' + esc(placeWhy(p)) + '</p>' : '') +
    linkChips(p) +
    (kv.length ? '<div class="kv">' + kv.map(x => '<div class="k">' + esc(x[0]) + '</div><div>' + esc(x[1]) + '</div>').join('') + '</div>' : '') +
    (placeTips(p).length ? '<ul class="tips">' + placeTips(p).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
    (p.tags && p.tags.length ? '<div class="tags">' + p.tags.slice(0, 6).map(x => '<span class="tag">' + esc(tagLabel(x)) + '</span>').join('') + '</div>' : '') +
    '<div class="shdecide"><div class="votebox"><div class="vl">' + t('yourVote') + (me ? ' · ' + esc(whoName(me)) : '') + '<small>' + TR.filter(tr => isVoter(tr[0])).map(tr => (v[tr[0]] ? (tr[3] || '') + ' ' + esc(whoName(tr[0])) + ': ' + (v[tr[0]] === 'yes' ? '❤️' : v[tr[0]] === 'maybe' ? '🤔' : '✕') : '')).filter(Boolean).join(' · ') + '</small></div>' +
    '<div class="vbtns">' + [['yes', '❤️'], ['maybe', '🤔'], ['no', '✕']].map(o => '<button type="button" data-vote="' + o[0] + '" aria-pressed="' + String(!!me && v[me] === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>' +
    (custom ? '<p class="gsub custloc">' + (p.lat != null ? (custom.approx ? t('approxLoc') : t('pinned')) : t('unpinned')) + '</p>' +
      '<details class="custedit"' + (p.lat == null || custom.approx ? ' open' : '') + '><summary>' + t('editLinks') + '</summary>' +
      '<div class="exform links"><input id="sh-cmap" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('mapLinkPh')) + '" aria-label="' + esc(t('mapLink')) + '" value="' + esc(safeHref(custom.map)) + '" />' +
      '<input id="sh-cweb" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('webLink')) + '" aria-label="' + esc(t('webLink')) + '" value="' + esc(safeHref(custom.web)) + '" />' +
      '<button type="button" id="sh-csave">' + t('save') + '</button></div><p class="gsub">' + esc(t('mapLinkHow')) + '</p></details>' : '') +
    '<div class="sheetacts"><button class="act go" type="button" id="sh-add">' + t('addToDay') + '</button>' + (custom ? '<button class="act" type="button" id="sh-del">' + t('delete') + '</button>' : '') + '</div></div>' +
    (p.conf && p.conf !== 'high' ? '<p class="gsub" style="margin-top:10px">' + t('confirm') + '</p>' : '');
  openSheet(html, () => {
    $$('#sheet [data-vote]').forEach(b => { b.onclick = () => { setVote(ref, b.dataset.vote); setTimeout(() => openPlace(id), 60); }; });
    $('#sh-add').onclick = () => pickDay(ref, p);
    const del = $('#sh-del'); if (del) del.onclick = () => { put('custom', id.slice(2), Object.assign({}, custom, { deleted: true })); closeSheet(); };
    const csave = $('#sh-csave');
    if (csave) csave.onclick = () => {
      const k = id.slice(2), mapRaw = $('#sh-cmap').value, webRaw = $('#sh-cweb').value;
      const L2 = customLinks(mapRaw, webRaw); if (L2.err) { toast(L2.err); return; }
      // A changed map link replaces the location, so a stale pin cannot survive
      // an edit; editing only the website leaves the location alone.
      const mapChanged = String(mapRaw || '').trim() !== String(safeHref(custom.map) || '').trim();
      const reset = mapChanged ? { map: '', lat: null, lng: null, needsResolve: false, approx: false } : {};
      const upd = Object.assign({}, custom, { web: '' }, reset, L2.fields);
      if (L2.fields.lat != null) upd.approx = false;
      delete upd.mapName; delete HOMEMIN[k];
      put('custom', k, upd); refreshCustomSeeds();
      if (upd.needsResolve) resolveCustom(k); else toast(t('saved'));
      setTimeout(() => openPlace(id), 80);
    };
  });
}
function tagLabel(x) { const tg = TAGS.find(z => z[0] === x); return tg ? L(tg[1], tg[2], tg[3]) : x.replace(/-/g, ' '); }
function pickDay(ref, p) {
  const it0 = seedFor(ref);
  const fits = rankDays(p || (it0 && it0.place) || (it0 && it0.p ? { lat: it0.p[0], lng: it0.p[1], tags: [] } : { tags: [] }));
  const html = '<h3>' + t('pickDay') + '</h3><p class="meta">' + esc(stopLabel(seedFor(ref))) + '</p>' +
    fits.map(f => { const d = DAYBYKEY[f.day]; const placed = agIds(f.day).indexOf(ref) >= 0; return '<div class="pkrow" data-pick="' + f.day + '"><div class="pn">' + dayLabel(f.day) + ' · ' + esc(dayTitle(d)) + '<small>' + (f.closed ? '⚠ ' + t('closedThatDay') : (f.why || '')) + '</small></div><button type="button" class="pk-b' + (f.rec ? ' rec' : '') + '" ' + (f.closed ? 'disabled' : '') + '>' + (placed ? '✓' : (f.rec ? '★ ' + t('recommended') : '📅')) + '</button></div>'; }).join('');
  openSheet(html, () => { $$('#sheet [data-pick]').forEach(r => { const b = r.querySelector('.pk-b'); if (b.disabled) return; r.onclick = () => { agInsert(r.dataset.pick, ref); closeSheet(); toast(t('applied') + ' · ' + dayLabel(r.dataset.pick)); }; }); });
}
// ---- your own stops: map links, website, and where they actually are ----
// Reads the two optional link fields. Returns { fields } to merge into the
// custom stop, or { err } with a message for the traveller.
function customLinks(mapRaw, webRaw) {
  const fields = {};
  const m = String(mapRaw || '').trim(), w = String(webRaw || '').trim();
  if (m) {
    const got = G.parseMapsLink(m);
    if (!got) return { err: t('badMapLink') };
    // keep the link itself so Map opens exactly what they shared; a bare
    // "lat, lng" has no link to keep
    const isPair = /^\s*-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+\s*$/.test(m);
    fields.map = isPair ? '' : (/^https?:\/\//i.test(m) ? m : 'https://' + m).slice(0, 2000);
    if (got.lat != null) { fields.lat = got.lat; fields.lng = got.lng; }
    if (got.name) fields.mapName = got.name;
    fields.needsResolve = !!got.needsResolve;
  }
  if (w) {
    const href = /^https?:\/\//i.test(w) ? w : 'https://' + w;
    let u = null; try { u = new URL(href); } catch (e) {}
    if (!u || !/\./.test(u.hostname) || /\s/.test(w)) return { err: t('badWebLink') };
    fields.web = u.href.slice(0, 2000);
  }
  return { fields };
}
// Short share links carry no coordinates until someone follows the redirect,
// which the browser cannot do across origins — so the concierge does it. If
// that is unreachable the link is still kept (Map and Directions still work)
// and the next time the stop is opened, it tries again.
const RESOLVING = {};
async function resolveCustom(k, quiet) {
  const c = (state.custom || {})[k];
  // An exact location is final; an approximate one (the concierge's guess)
  // gives way to a share link that is still waiting to be expanded.
  if (!c || !safeHref(c.map) || (coord(c.lat) != null && !(c.approx && c.needsResolve)) || RESOLVING[k] || !CFG.CONCIERGE_URL || !navigator.onLine) return;
  RESOLVING[k] = true;
  if (!quiet) toast(t('resolving'));
  try {
    const r = await fetch(CFG.CONCIERGE_URL.replace(/\/$/, '') + '/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Trip-Key': CFG.TRIP_KEY || '' }, body: JSON.stringify({ url: c.map }) });
    const j = await r.json().catch(() => ({}));
    const got = j && j.url ? G.parseMapsLink(j.url) : null;
    const now = (state.custom || {})[k]; if (!now) return;
    if (got && got.lat != null) {
      const upd = Object.assign({}, now, { lat: got.lat, lng: got.lng, needsResolve: false, approx: false, map: j.url });
      if (got.name && (now.name === t('pinnedName') || !now.name)) upd.name = got.name.slice(0, 120);
      delete HOMEMIN[k];
      put('custom', k, upd);
      if (!quiet) toast(t('resolvedOk'));
    } else if (!quiet) toast(t('resolvedNo'));
  } catch (e) { if (!quiet) toast(t('resolvedNo')); }
  finally { delete RESOLVING[k]; }
}
// Creates a custom stop from a name, a duration and the two optional links.
// Returns its key, or null (with a toast) when a link is not usable.
// extra: what the concierge knew about a place it suggested — neighbourhood, a
// one-line note, and an approximate location, used only when no map link gives
// an exact one, and always labelled as approximate.
function makeCustom(name, mins, mapRaw, webRaw, extra) {
  const L2 = customLinks(mapRaw, webRaw);
  if (L2.err) { toast(L2.err); return null; }
  const f = L2.fields;
  const nm = String(name || '').trim() || f.mapName || (f.map ? t('pinnedName') : '');
  if (!nm) return null;
  const k = String(Date.now());
  const c = Object.assign({ name: nm.slice(0, 120), d: Math.max(15, Number(mins) || 60), who: me, t: '14:00' }, f);
  delete c.mapName;
  if (extra) {
    const la = coord(extra.lat), ln = coord(extra.lng);
    // an exact point (a map search found it) is not marked approximate
    if (c.lat == null && la != null && ln != null) { c.lat = la; c.lng = ln; c.approx = !extra.exact; }
    if (extra.hood) c.hood = String(extra.hood).slice(0, 60);
    if (extra.addr) c.addr = String(extra.addr).slice(0, 160);
    if (extra.hours) c.hours = String(extra.hours).slice(0, 300);
    if (extra.note) c.note = String(extra.note).slice(0, 240);
    if (extra.cat && CAT[extra.cat]) c.cat = extra.cat;
    if (extra.from) c.from = String(extra.from).slice(0, 20);
    if (typeof extra.t === 'string' && /^\d{1,2}:\d{2}$/.test(extra.t)) c.t = extra.t;
  }
  state.custom[k] = c; put('custom', k, c); refreshCustomSeeds();
  if (c.needsResolve) resolveCustom(k);
  return k;
}
// Letters and digits from any script survive: a name in Cyrillic must not
// collapse to nothing, or every Russian-named place would look like the same one.
const normName = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^the\s+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function findCustomByName(name) {
  const n = normName(name); if (!n) return null;
  return Object.keys(state.custom || {}).find(k => { const c = state.custom[k]; return c && !c.deleted && normName(c.name) === n; }) || null;
}
// ---------------------------------------------------------------- search all of New York
// Anywhere in the city, not just the library: the concierge's server looks the
// name up on the map (OpenStreetMap, or Google when it has a key) and, on a
// tap, on the web. What comes back is checked again here — names capped, a
// location only if it is in New York, a website only if it is a real link.
const DEFMIN = { eat: 90, drink: 60, cafe: 30, museum: 120, see: 45, show: 150, shop: 60, park: 60, walk: 60, daytrip: 240, idea: 60 };
// when in the day it goes, until someone drags it: a restaurant looked up by
// name is most often dinner, a bar the drink before it
const DEFTIME = { eat: '19:00', drink: '17:30', cafe: '15:30', show: '20:00', museum: '11:00', see: '11:00' };
function normFound(raw) {
  if (!Array.isArray(raw)) return [];
  const s = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
  return raw.slice(0, 8).map(x => {
    if (!x || typeof x !== 'object') return null;
    const name = s(x.name, 120); if (!name) return null;
    const la = coord(x.lat), ln = coord(x.lng), here = inNycBox(la, ln);
    const cat = (typeof x.cat === 'string' && CAT[x.cat]) ? x.cat : 'idea';
    return { lib: libByName(name, here ? la : null, here ? ln : null), name, cat, hood: s(x.hood, 60), addr: s(x.addr, 160), hours: s(x.hours, 300),
      web: safeHref(typeof x.web === 'string' ? x.web : '') || '', lat: here ? la : null, lng: here ? ln : null, exact: here && !x.approx,
      src: ['osm', 'google', 'web'].indexOf(x.src) >= 0 ? x.src : '', minutes: DEFMIN[cat] || 60, why: '' };
  }).filter(Boolean);
}
async function lookupPlaces(q, web, near) {
  if (!navigator.onLine) { const e = new Error('offline'); e.code = 'offline'; throw e; }
  // a map search answers in a second or two, the web in under a minute; past that, give up
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), web ? 90000 : 20000) : null;
  try {
    const r = await fetch(CFG.CONCIERGE_URL.replace(/\/$/, '') + '/places', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Trip-Key': CFG.TRIP_KEY || '' }, body: JSON.stringify({ q, web: !!web, near: near || '' }), signal: ac ? ac.signal : undefined });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error('lookup ' + r.status); e.code = (j && typeof j.code === 'string') ? j.code : 'error'; throw e; }
    return normFound(j && j.places);
  } finally { if (timer) clearTimeout(timer); }
}
const foundLine = (s) => t(s === 'google' ? 'foundGoogle' : s === 'web' ? 'foundWeb' : 'foundOsm');
// The idea you already have for this place, if any: the same name, and no
// location yet or one within a few hundred metres. Another branch of a chain,
// across town, is another place.
function sameCustom(f) {
  const names = [normName(f.name)].concat(f.hood ? [normName(f.name + ' ' + f.hood)] : []).filter(Boolean);
  if (!names.length) return null;
  // one already pinned right there beats one with no location yet
  let near = null, loose = null;
  Object.keys(state.custom || {}).forEach(k => {
    const c = state.custom[k];
    if (!c || typeof c !== 'object' || c.deleted || names.indexOf(normName(c.name)) < 0) return;
    const la = coord(c.lat), ln = coord(c.lng);
    if (la == null || ln == null || f.lat == null) { if (!loose) loose = k; }
    else if (G.haversine(la, ln, f.lat, f.lng) <= 0.3 && !near) near = k;
  });
  return near || loose;
}
// A found place as an idea of your own. If you already have it, what the search
// found fills in what the idea lacks (an exact spot, the address, the hours);
// if you have another place by that name, this one is told apart by neighbourhood.
function customFromFound(f) {
  const k = sameCustom(f);
  if (k) {
    const c = state.custom[k], up = Object.assign({}, c);
    if ((coord(c.lat) == null || c.approx) && f.lat != null && (f.exact || coord(c.lat) == null)) { up.lat = f.lat; up.lng = f.lng; up.approx = !f.exact; delete up.needsResolve; }
    ['addr', 'hours', 'hood'].forEach(x => { if (!c[x] && f[x]) up[x] = f[x]; });
    if (!safeHref(c.web) && safeHref(f.web)) up.web = safeHref(f.web);
    if (!(typeof c.cat === 'string' && CAT[c.cat] && c.cat !== 'idea') && f.cat !== 'idea') up.cat = f.cat;
    if (JSON.stringify(up) !== JSON.stringify(c)) { state.custom[k] = up; put('custom', k, up); refreshCustomSeeds(); }
    return k;
  }
  const name = findCustomByName(f.name) && f.hood ? f.name + ' (' + f.hood + ')' : f.name;
  return makeCustom(name, f.minutes, '', f.web, { lat: f.lat, lng: f.lng, exact: f.exact, hood: f.hood, addr: f.addr, hours: f.hours, cat: f.cat, note: f.why, from: 'lookup', t: DEFTIME[f.cat] });
}
// The search button and its results, drawn into `host` from `st` (so a
// re-render of the page around it keeps what was found). onPick gets a place.
function drawLookup(host, st, onPick, opts) {
  if (!host) return;
  opts = opts || {};
  const near = opts.near || '', lead = opts.lead || '';
  if (!CFG.CONCIERGE_URL || !st.q || st.q.length < 2 || (opts.live && !opts.live())) { host.innerHTML = ''; return; }
  const row = (f, i) => {
    const done = f.lib ? scheduledDays('p:' + f.lib.id).length > 0 : !!sameCustom(f);
    const bits = [catLabel(f.cat), f.hood || f.addr, f.lib ? t('inTheApp') : ''].filter(Boolean).join(' · ');
    return '<div class="pkrow lkrow" data-lk="' + i + '"><div class="pn">' + esc(f.name) + '<small>' + esc(bits) + (f.addr && f.hood ? '<br>' + esc(f.addr) : '') + '</small></div><button type="button" class="pk-b">' + (done ? '✓' : '＋') + '</button></div>';
  };
  let html = '';
  if (!st.list && !st.busy && !st.err) html = '<button class="act lkgo" type="button" data-lkgo="map">' + esc(t('lookupAll').replace('{q}', st.q)) + '</button>';
  if (st.busy) html = '<p class="gsub lkmsg">' + esc(t(st.busy === 'web' ? 'lookupWebBusy' : 'lookupBusy')) + '</p>';
  if (st.err) html = '<p class="gsub lkmsg">' + esc(t(st.err === 'offline' ? 'lookupOffline' : st.err === 'limit' ? 'lookupLimit' : 'lookupErr')) + '</p>' + (st.err === 'limit' ? '' : '<button class="act lkgo" type="button" data-lkgo="' + (st.src === 'web' ? 'web' : 'map') + '">' + esc(st.src === 'web' ? t('lookupWebOnly') : t('lookupAll').replace('{q}', st.q)) + '</button>');
  if (st.list && !st.busy) {
    html = (st.list.length ? '<p class="gsub lkmsg">' + esc(foundLine(st.src)) + '</p>' + st.list.map(row).join('') : '<p class="gsub lkmsg">' + esc(t(st.src === 'web' ? 'lookupWebNone' : 'lookupNone')) + '</p>') +
      (st.src === 'web' ? '' : '<button class="act lkgo" type="button" data-lkgo="web">' + esc(t(st.list.length ? 'lookupWeb' : 'lookupWebOnly')) + '</button>');
  }
  host.innerHTML = '<div class="lookup">' + (lead ? '<p class="lklead">' + esc(lead) + '</p>' : '') + html + '</div>';
  host.querySelectorAll('[data-lkgo]').forEach(b => { b.onclick = async (e) => {
    e.stopPropagation();
    const web = b.dataset.lkgo === 'web', q = st.q;
    st.busy = web ? 'web' : 'map'; st.err = ''; drawLookup(host, st, onPick, opts);
    try { const list = await lookupPlaces(q, web, near); if (st.q !== q) return; st.list = list; st.src = web ? 'web' : (list[0] && list[0].src) || 'osm'; }
    catch (err) { if (st.q !== q) return; st.err = err.code || 'error'; st.src = web ? 'web' : 'map'; }
    st.busy = ''; drawLookup(host, st, onPick, opts);
  }; });
  host.querySelectorAll('[data-lk]').forEach(r => { r.onclick = (e) => { e.stopPropagation(); const f = st.list && st.list[Number(r.dataset.lk)]; if (f) onPick(f); }; });
}
// Explore keeps its own search across re-renders (a synced vote redraws the list).
const LOOK = { q: '', list: null, src: '', busy: '', err: '' };
function lookFor(st, q) { if (st.q !== q) { st.q = q; st.list = null; st.src = ''; st.busy = ''; st.err = ''; } }
function openAddStop(day) {
  const hubs = dayHubs(day);
  const near = (p) => { if (p.lat == null || !hubs.length) return 99; const h = G.nearestHub(p.lat, p.lng).hub.key; return Math.min.apply(null, hubs.map(x => G.hubToHub(x, h))); };
  const inDay = new Set(agIds(day));
  let cat = 'all', q = '';
  const look = { q: '', list: null, src: '', busy: '', err: '' };
  const area = hubs.length && G.HUB[hubs[0]] ? G.HUB[hubs[0]].name : '';
  const pickFound = (f) => {
    const ref = f.lib ? 'p:' + f.lib.id : (() => { const k = customFromFound(f); return k ? 'c:' + k : null; })();
    if (!ref) return;
    agInsert(day, ref); closeSheet(); toast(t('applied'));
  };
  const render = () => {
    const list = PLACES.filter(p => !inDay.has('p:' + p.id) && (cat === 'all' || p.cat === cat || (cat === 'park' && p.cat === 'walk')) && (!q || (p.name + ' ' + (p.nameRu || '') + ' ' + p.hood + ' ' + (p.sub || '')).toLowerCase().indexOf(q) >= 0))
      .map(p => ({ p, n: near(p), s: voteScore('p:' + p.id) })).sort((a, b) => (a.n - b.n) || (b.s - a.s)).slice(0, 40);
    $('#pk-list').innerHTML = list.map(x => '<div class="pkrow" data-add="' + esc(x.p.id) + '"><div class="pn">' + (CAT[x.p.cat] || CAT.idea).ico + ' ' + esc(placeName(x.p)) + '<small>' + esc([placeSub(x.p), x.p.hood].filter(Boolean).join(' · ')) + (x.n < 99 ? ' · ~' + x.n + ' ' + t('minutes') : '') + ' ' + voteBadges('p:' + x.p.id) + '</small></div><button type="button" class="pk-b">＋</button></div>').join('') || '<p class="gsub">' + t('noMatch') + '</p>';
    $$('#pk-list [data-add]').forEach(r => { r.onclick = () => { agInsert(day, 'p:' + r.dataset.add); closeSheet(); toast(t('applied')); }; });
    lookFor(look, ($('#pk-q') || {}).value ? $('#pk-q').value.trim() : '');
    drawLookup($('#pk-look'), look, pickFound, { near: area, lead: t('lookupNotHere') });
  };
  const html = '<h3>' + t('pickStop') + ' · ' + dayLabel(day) + '</h3><input class="pksearch" id="pk-q" type="search" placeholder="' + t('searchPh') + '" />' +
    '<div class="vchips small" id="pk-cats"><button class="vchip" type="button" data-c="all" aria-pressed="true">' + L('All', 'Все', 'Alle') + '</button>' + ['see', 'museum', 'show', 'eat', 'drink', 'cafe', 'shop', 'park'].map(c => '<button class="vchip" type="button" data-c="' + c + '">' + catLabel(c) + '</button>').join('') + '</div>' +
    '<div id="pk-list"></div><div id="pk-look"></div><div class="grp"><h3 style="font-size:16px">' + t('custom') + '</h3><div class="exform"><input id="pk-cname" type="text" placeholder="' + t('customName') + '" /><input id="pk-cmin" type="number" inputmode="numeric" value="60" /><button type="button" id="pk-cadd">' + t('add') + '</button></div>' +
    '<div class="exform links"><input id="pk-cmap" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('mapLinkPh')) + '" aria-label="' + esc(t('mapLink')) + '" /><input id="pk-cweb" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('webLink')) + '" aria-label="' + esc(t('webLink')) + '" /></div><p class="gsub">' + esc(t('mapLinkHow')) + '</p></div>';
  openSheet(html, () => {
    render();
    $('#pk-q').oninput = (e) => { q = e.target.value.trim().toLowerCase(); render(); };
    $$('#pk-cats .vchip').forEach(b => { b.onclick = () => { cat = b.dataset.c; $$('#pk-cats .vchip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }; });
    $('#pk-cadd').onclick = () => {
      const k = makeCustom($('#pk-cname').value, $('#pk-cmin').value, $('#pk-cmap').value, $('#pk-cweb').value);
      if (!k) return;
      agInsert(day, 'c:' + k); closeSheet();
      if (!(state.custom[k] || {}).needsResolve) toast(t('applied'));
    };
  });
}
function suggestBreak(day) {
  const rows = agReflow(day, agIds(day)); if (!rows.length) { openAddStop(day); return; }
  let anchor = rows.filter(r => r.end <= 18 * 60 && r.it.p).pop() || rows.filter(r => r.it.p).pop();
  if (!anchor) { openAddStop(day); return; }
  const pt = anchor.it.q || anchor.it.p; const wantCat = anchor.end < 16 * 60 + 30 ? 'cafe' : 'drink';
  const inDay = new Set(agIds(day));
  const cands = PLACES.filter(p => (p.cat === wantCat || (wantCat === 'drink' && (p.tags || []).indexOf('pre-dinner') >= 0)) && p.lat != null && !inDay.has('p:' + p.id))
    .map(p => ({ p, km: G.haversine(pt[0], pt[1], p.lat, p.lng) })).filter(x => x.km <= 1.6).sort((a, b) => a.km - b.km).slice(0, 7);
  const html = '<h3>' + t('breakTitle') + ' ' + esc(stopLabel(anchor.it)) + '</h3><p class="meta">' + agHM(anchor.end) + ' · ' + catLabel(wantCat) + '</p>' +
    (cands.length ? cands.map(x => '<div class="pkrow" data-brk="' + esc(x.p.id) + '"><div class="pn">' + esc(placeName(x.p)) + '<small>' + esc([placeSub(x.p), x.p.hood].filter(Boolean).join(' · ')) + ' · ' + G.walkMin(x.km) + ' ' + t('walk') + ' ' + voteBadges('p:' + x.p.id) + '</small></div><button type="button" class="pk-b">＋</button></div>').join('') : '<p class="gsub">' + t('breakNone') + '</p>');
  openSheet(html, () => { $$('#sheet [data-brk]').forEach(r => { r.onclick = () => { const p = PL[r.dataset.brk]; const km = G.haversine(pt[0], pt[1], p.lat, p.lng); agInsert(day, 'p:' + p.id, { after: anchor.it.id, at: anchor.end + G.walkMin(km) }); closeSheet(); toast(t('applied')); }; }); });
}
// Fill an empty stretch between two stops with something they actually want that
// sits between them geographically and fits in the time available.
function fillGap(day, idx) {
  const rows = agReflow(day, agIds(day)); const before = rows[idx - 1], after = rows[idx];
  if (!before || !after) return;
  const slack = after.start - before.end - after.gap;
  const from = before.it.q || before.it.p, to = after.it.p;
  const inDay = new Set(agIds(day)); const dow = dowOf(day);
  const cands = PLACES.filter(p => {
    if (p.lat == null || inDay.has('p:' + p.id)) return false;
    if (Array.isArray(p.closed) && p.closed.indexOf(dow) >= 0) return false;
    if (voteScore('p:' + p.id) < 0) return false;
    const inA = from ? agTravel(from, [p.lat, p.lng]) : 0;
    const outB = to ? agTravel([p.lat, p.lng], to) : 0;
    const need = inA + Math.min(p.dur || 60, 90) + outB;
    return need <= slack + after.gap + 15;
  }).map(p => {
    const inA = from ? agTravel(from, [p.lat, p.lng]) : 0, outB = to ? agTravel([p.lat, p.lng], to) : 0;
    return { p, detour: inA + outB - after.gap, stay: Math.min(p.dur || 60, Math.max(30, slack - (inA + outB - after.gap))), score: voteScore('p:' + p.id) * 8 + (bothWant('p:' + p.id) ? 20 : 0) - (inA + outB) };
  }).sort((a, b) => b.score - a.score).slice(0, 8);
  const html = '<h3>' + t('fillGapTitle') + '</h3><p class="meta">' + agHM(before.end) + '–' + agHM(after.start) + ' · ' + slack + ' ' + t('minutes') + ' ' + t('free') + ' · ' + esc(stopLabel(before.it)) + ' → ' + esc(stopLabel(after.it)) + '</p>' +
    (cands.length ? cands.map(x => '<div class="pkrow" data-fill="' + esc(x.p.id) + '" data-stay="' + x.stay + '"><div class="pn">' + (CAT[x.p.cat] || CAT.idea).ico + ' ' + esc(placeName(x.p)) + '<small>' + esc([placeSub(x.p), x.p.hood].filter(Boolean).join(' · ')) + ' · +' + Math.max(0, Math.round(x.detour)) + ' ' + t('minutes') + ' ' + t('detour') + ' ' + voteBadges('p:' + x.p.id) + '</small></div><button type="button" class="pk-b' + (bothWant('p:' + x.p.id) ? ' rec' : '') + '">＋ ' + x.stay + '′</button></div>').join('') : '<p class="gsub">' + t('fillGapNone') + '</p>') +
    '<div class="sheetacts"><button class="act" type="button" id="fg-browse">' + t('addStop') + '</button></div>';
  openSheet(html, () => {
    $$('#sheet [data-fill]').forEach(r => { r.onclick = () => { const id = r.dataset.fill; const stay = Number(r.dataset.stay); const inA = from ? agTravel(from, [PL[id].lat, PL[id].lng]) : 0; agInsert(day, 'p:' + id, { after: before.it.id, at: before.end + inA }); agSetDur(day, 'p:' + id, stay); closeSheet(); toast(t('applied')); }; });
    $('#fg-browse').onclick = () => openAddStop(day);
  });
}
function openReplan(day) {
  const rows = agReflow(day, agIds(day));
  const html = '<h3>' + t('replanTitle') + ' · ' + dayLabel(day) + '</h3>' +
    '<div class="sheetacts" style="flex-direction:column;align-items:stretch">' +
    '<button class="act" type="button" id="rp-later">' + t('later') + '</button>' +
    '<button class="act" type="button" id="rp-lighter">' + t('lighter') + '</button>' +
    (dayRain(day).length ? '<button class="act" type="button" id="rp-rain">' + t('rainSwap') + '</button>' : '') +
    '</div><div class="grp" id="rp-askgrp"><h3 style="font-size:16px">' + t('askAI') + '</h3><div class="exform two"><input id="rp-q" type="text" placeholder="' + t('askPlaceholder') + '" /><button type="button" id="rp-ask">✨</button></div><div id="rp-out"></div></div>';
  openSheet(html, () => {
    $('#rp-later').onclick = () => { if (!rows.length) return; const first = rows[0]; agWrite(day, { ids: agIds(day), t: Object.assign(agOv(day), { [first.it.id]: agPad(first.start + 60) }), d: agDurs(day), seen: (AGDAYS[day] || []).slice() }); closeSheet(); toast(t('shifted')); };
    $('#rp-lighter').onclick = () => {
      const cands = rows.filter(r => !r.it.lock).map(r => ({ r, s: r.it.place ? voteScore('p:' + r.it.place.id) : 0 })).sort((a, b) => a.s - b.s);
      const h = '<h3>' + t('whichDrop') + '</h3>' + cands.map(c => '<div class="pkrow" data-drop="' + esc(c.r.it.id) + '"><div class="pn">' + agHM(c.r.start) + ' ' + esc(stopLabel(c.r.it)) + '<small>' + (c.r.it.place ? voteBadges('p:' + c.r.it.place.id) : '') + '</small></div><button type="button" class="pk-b">✕</button></div>').join('');
      openSheet(h, () => { $$('#sheet [data-drop]').forEach(x => { x.onclick = () => { agSave(day, agIds(day).filter(id => id !== x.dataset.drop)); closeSheet(); toast(t('removed')); }; }); });
    };
    const rr = $('#rp-rain'); if (rr) rr.onclick = () => {
      const ids = agIds(day).filter(id => { const it = seedFor(id); return !(it.place && (it.place.tags || []).indexOf('outdoor') >= 0 && !it.lock); });
      const adds = dayRain(day).map(x => 'p:' + x).filter(r => ids.indexOf(r) < 0).slice(0, 3);
      agSave(day, ids); adds.forEach(r => agInsert(day, r)); closeSheet(); toast(t('applied'));
    };
    $('#rp-ask').onclick = () => askPlanner(day, $('#rp-q').value.trim());
    $('#rp-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') askPlanner(day, $('#rp-q').value.trim()); });
  });
}
async function askPlanner(day, req) {
  const out = $('#rp-out'); if (!req) return;
  if (!CFG.CONCIERGE_URL) { out.innerHTML = '<p class="gsub">' + t('aiOff') + '</p>'; return; }
  out.innerHTML = '<p class="gsub">' + t('thinking') + '</p>';
  const d = DAYBYKEY[day]; const rows = agReflow(day, agIds(day));
  const hubs = dayHubs(day);
  const lib = PLACES.filter(p => p.lat != null).map(p => ({ p, n: hubs.length ? Math.min.apply(null, hubs.map(h => G.hubToHub(h, G.nearestHub(p.lat, p.lng).hub.key))) : 0, s: voteScore('p:' + p.id) }))
    .sort((a, b) => (b.s - a.s) || (a.n - b.n)).slice(0, 220).map(x => ({ id: x.p.id, name: x.p.name, cat: x.p.cat, hood: x.p.hood, dur: x.p.dur, best: x.p.best, closed: x.p.closed || [], lat: x.p.lat, lng: x.p.lng, votes: x.s }));
  const body = { day, date: d.date, request: req, lang, weather: WX[day] ? (WX[day].ico + ' ' + WX[day].hi + '°/' + WX[day].lo + '°' + (WX[day].rain ? ' rain' : '')) : '',
    stops: rows.map(r => ({ ref: r.it.id, name: r.it.en, t: agHM(r.start), d: r.d, lock: !!r.it.lock, lat: r.it.p ? r.it.p[0] : null, lng: r.it.p ? r.it.p[1] : null })), library: lib };
  try {
    const r = await fetch(CFG.CONCIERGE_URL.replace(/\/$/, '') + '/plan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Trip-Key': CFG.TRIP_KEY || '' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j || !Array.isArray(j.stops) || !j.stops.length) { out.innerHTML = '<p class="gsub">' + esc((j && j.note) || t('chatErr')) + '</p>'; return; }
    const cur = new Set(agIds(day));
    out.innerHTML = '<div class="preview">' + j.stops.map(s => { const it = seedFor(s.ref); return '<div class="pr' + (cur.has(s.ref) ? '' : ' add') + '"><span class="tt">' + esc(s.t) + '</span>' + (cur.has(s.ref) ? '' : '＋ ') + esc(it ? stopLabel(it) : s.ref) + '</div>'; }).join('') +
      agIds(day).filter(id => !j.stops.some(s => s.ref === id)).map(id => { const it = seedFor(id); return '<div class="pr rm"><span class="tt">–</span>' + esc(stopLabel(it)) + '</div>'; }).join('') + '</div>' +
      (j.note ? '<p class="why">' + esc(j.note) + '</p>' : '') + '<div class="sheetacts"><button class="act go" type="button" id="rp-apply">' + t('applyDraft') + '</button></div>';
    $('#rp-apply').onclick = () => {
      const ids = j.stops.map(s => s.ref).filter(ref => seedFor(ref)); const tt = {}, dd = {};
      j.stops.forEach(s => { if (seedFor(s.ref)) { tt[s.ref] = s.t.padStart(5, '0'); if (s.d) dd[s.ref] = s.d; } });
      DAYKEYS.forEach(d2 => { if (d2 !== day) { const rest = agIds(d2).filter(x => ids.indexOf(x) < 0); if (rest.length !== agIds(d2).length) agSave(d2, rest); } });
      agWrite(day, { ids, t: tt, d: dd, seen: (AGDAYS[day] || []).slice() }); closeSheet(); toast(t('applied'));
    };
  } catch (e) { out.innerHTML = '<p class="gsub">' + t('chatErr') + '</p>'; }
}
function shareDay(day) {
  const d = DAYBYKEY[day]; const rows = agReflow(day, agIds(day));
  const txt = dayLabel(day) + ' — ' + dayTitle(d) + '\n' + rows.map(r => agHM(r.start) + '  ' + stopLabel(r.it) + (r.it.place && r.it.place.hood ? ' (' + r.it.place.hood + ')' : '')).join('\n') + '\n\n' + location.href.split('#')[0];
  if (navigator.share) navigator.share({ title: dayTitle(d), text: txt }).catch(() => {});
  else (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(t('copied'))).catch(() => toast(txt.slice(0, 80)));
}

// ---------------------------------------------------------------- explore
const EX = { cat: 'all', tags: new Set(), q: '', sort: 'rank', deck: false };
function exFiltered() {
  const q = EX.q.toLowerCase();
  let list = PLACES.filter(p => {
    if (EX.cat !== 'all' && !(p.cat === EX.cat || (EX.cat === 'park' && p.cat === 'walk'))) return false;
    for (const tg of EX.tags) if ((p.tags || []).indexOf(tg) < 0) return false;
    if (q) { const hay = [p.name, p.nameRu, p.nameDe, p.hood, p.sub, p.subRu, p.subDe, p.why, p.whyRu, p.whyDe, (p.tags || []).join(' ')].join(' ').toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  });
  Object.entries(state.custom || {}).forEach(([k, c]) => {
    if (!c || typeof c !== 'object' || c.deleted || typeof c.name !== 'string' || EX.tags.size) return;
    const kind = (typeof c.cat === 'string' && CAT[c.cat]) ? c.cat : 'idea';
    if (!(EX.cat === 'all' || EX.cat === 'idea' || EX.cat === kind)) return;
    if (q && (c.name + ' ' + (typeof c.hood === 'string' ? c.hood : '')).toLowerCase().indexOf(q) < 0) return;
    list.push({ id: 'c:' + k, name: c.name.slice(0, 120), cat: kind, hood: typeof c.hood === 'string' ? c.hood.slice(0, 60) : '', sub: t('idea'), why: '', tags: [], custom: true, dur: c.d });
  });
  const rank = (p) => { const ref = p.custom ? p.id : 'p:' + p.id; return voteScore(ref) * 10 + ((p.tags || []).indexOf('first-timer') >= 0 ? 5 : 0) + ((p.tags || []).indexOf('iconic') >= 0 ? 4 : 0) + (p.conf === 'low' ? -3 : 0); };
  if (EX.sort === 'rank') list.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  else if (EX.sort === 'near') list.sort((a, b) => (fromHomeMin(a) == null ? 999 : fromHomeMin(a)) - (fromHomeMin(b) == null ? 999 : fromHomeMin(b)));
  else if (EX.sort === 'az') list.sort((a, b) => placeName(a).localeCompare(placeName(b)));
  else list.sort((a, b) => (a.hood || '').localeCompare(b.hood || '') || placeName(a).localeCompare(placeName(b)));
  return list;
}
function cardHtml(p) {
  const ref = p.custom ? p.id : 'p:' + p.id; const hm = p.custom ? null : fromHomeMin(p); const days = scheduledDays(ref);
  const meta = [placeSub(p), p.hood, hm != null ? '~' + hm + ' ' + t('minutes') : '', placePrice(p)].filter(Boolean).join(' · ');
  const tags = (p.tags || []).slice(0, 3);
  return '<div class="card' + (p.conf === 'low' ? ' conf-low' : '') + '" data-card="' + esc(p.custom ? p.id : p.id) + '"><div class="top"><div><h4>' + (CAT[p.cat] || CAT.idea).ico + ' ' + esc(placeName(p)) + '</h4><div class="meta">' + esc(meta) + '</div></div><div class="votes">' + voteBadges(ref) + '</div></div>' +
    (placeWhy(p) ? '<p class="why">' + esc(placeWhy(p).length > 150 ? placeWhy(p).slice(0, 147) + '…' : placeWhy(p)) + '</p>' : '') +
    '<div class="tags">' + days.map(d => '<span class="tag day">📅 ' + dayLabel(d) + '</span>').join('') + tags.map(x => '<span class="tag' + (x === 'first-timer' || x === 'iconic' ? ' hot' : '') + '">' + esc(tagLabel(x)) + '</span>').join('') + '</div></div>';
}
function renderExplore() {
  const host = $('#exlist'); if (!host) return;
  const cats = $('#excats');
  cats.innerHTML = '<button class="vchip" type="button" data-c="all" aria-pressed="' + String(EX.cat === 'all') + '">' + L('All', 'Все', 'Alle') + '</button>' + ['see', 'museum', 'show', 'eat', 'drink', 'cafe', 'shop', 'park', 'daytrip', 'idea'].map(c => '<button class="vchip" type="button" data-c="' + c + '" aria-pressed="' + String(EX.cat === c) + '">' + catLabel(c) + '</button>').join('');
  cats.querySelectorAll('.vchip').forEach(b => { b.onclick = () => { EX.cat = b.dataset.c; renderExplore(); if (EX.deck) deckStart(); }; });
  const tg = $('#extags');
  const tt = $('#tagtoggle');
  if (tt) { const n = EX.tags.size; tt.textContent = (n ? '● ' : '') + t('filters') + (n ? ' (' + n + ')' : ''); tt.setAttribute('aria-pressed', String(!tg.hidden)); tt.onclick = () => { tg.hidden = !tg.hidden; renderExplore(); }; }
  tg.innerHTML = TAGS.map(x => '<button class="vchip" type="button" data-t="' + x[0] + '" aria-pressed="' + String(EX.tags.has(x[0])) + '">' + esc(L(x[1], x[2], x[3])) + '</button>').join('');
  tg.querySelectorAll('.vchip').forEach(b => { b.onclick = () => { if (EX.tags.has(b.dataset.t)) EX.tags.delete(b.dataset.t); else EX.tags.add(b.dataset.t); renderExplore(); }; });
  const list = exFiltered();
  $('#excount').textContent = list.length + ' ' + t('places');
  const sel = $('#exsort'); sel.value = EX.sort; Array.from(sel.options).forEach(o => { o.textContent = t({ rank: 'sortRank', near: 'sortNear', az: 'sortAz', hood: 'sortHood' }[o.value]); });
  $('#exsearch').placeholder = t('searchPh');
  const lk = $('#exlook');
  if (EX.deck) { host.hidden = true; if (lk) lk.innerHTML = ''; return; }
  host.hidden = false;
  host.innerHTML = list.length ? list.slice(0, 160).map(cardHtml).join('') : '<p class="gsub">' + t('noMatch') + '</p>';
  host.querySelectorAll('[data-card]').forEach(c => { c.onclick = () => openPlace(c.dataset.card); });
  lookFor(LOOK, EX.q);
  drawLookup(lk, LOOK, (f) => {
    if (f.lib) { openPlace(f.lib.id); return; }
    const k = sameCustom(f);
    if (k) openPlace('c:' + customFromFound(f)); else openSuggested(f);
  }, { lead: t('lookupNotHere'), live: () => !EX.deck });
}
// swipe deck
const DECK = { queue: [], i: 0 };
function deckStart() {
  EX.deck = true; document.body.dataset.deck = '1'; $('#deck').hidden = false; $('#exlist').hidden = true;
  $('#swipebtn').textContent = t('exitSwipe');
  DECK.queue = exFiltered().filter(p => !p.custom && !votesFor('p:' + p.id)[me]); DECK.i = 0;
  renderDeck();
}
function deckStop() { EX.deck = false; delete document.body.dataset.deck; $('#deck').hidden = true; $('#swipebtn').textContent = '🃏 ' + t('swipeMode'); paintFallbacks(); renderExplore(); }
function renderDeck() {
  const host = $('#deck'); if (!host) return;
  if (!me) { host.innerHTML = '<div class="deckdone">' + t('pickWhoFirst') + '</div><div class="whoslot"></div>'; renderWho(); return; }
  const left = DECK.queue.length - DECK.i;
  if (left <= 0) { host.innerHTML = '<div class="deckdone">' + t('deckDone') + '</div>'; return; }
  const p = DECK.queue[DECK.i]; const nx = DECK.queue[DECK.i + 1];
  const card = (q, top) => { const hm = fromHomeMin(q); return '<div class="dcard" ' + (top ? 'id="dtop"' : 'style="transform:scale(.96) translateY(10px);opacity:.8"') + '><div class="stamp yes">' + L('WANT', 'ХОЧУ') + '</div><div class="stamp no">' + L('SKIP', 'НЕТ') + '</div><div class="stamp maybe">' + L('MAYBE', 'МОЖЕТ') + '</div><div class="cat">' + catLabel(q.cat) + (q.sub ? ' · ' + esc(placeSub(q)) : '') + '</div><h4>' + esc(placeName(q)) + '</h4><div class="meta">' + esc([q.hood, hm != null ? '~' + hm + ' ' + t('minutes') + ' ' + t('fromHome') : '', placePrice(q)].filter(Boolean).join(' · ')) + '</div><div class="why">' + esc(placeWhy(q)) + (placeTips(q)[0] ? '<br><br><i>' + esc(placeTips(q)[0]) + '</i>' : '') + '</div><div class="votes">' + voteBadges('p:' + q.id) + '</div></div>'; };
  host.innerHTML = '<div class="deckmeta"><span>' + left + ' ' + t('left') + '</span><span>' + esc(whoName(me)) + '</span></div><div class="deckhold">' + (nx ? card(nx, false) : '') + card(p, true) + '</div>' +
    '<div class="deckbtns"><button class="b-no" type="button" data-d="no">✕</button><button class="b-maybe" type="button" data-d="maybe">🤔</button><button class="b-yes" type="button" data-d="yes">❤️</button></div><p class="gsub" style="text-align:center">' + t('swipeHint') + '</p>';
  host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => deckDecide(b.dataset.d); });
  const top = $('#dtop'); let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, moved = false;
  top.addEventListener('pointerdown', (e) => { dragging = true; moved = false; sx = e.clientX; sy = e.clientY; top.classList.add('snap'); top.setPointerCapture(e.pointerId); });
  top.addEventListener('pointermove', (e) => { if (!dragging) return; dx = e.clientX - sx; dy = e.clientY - sy; if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true; top.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx / 18) + 'deg)'; top.querySelector('.stamp.yes').style.opacity = Math.max(0, Math.min(1, dx / 90)); top.querySelector('.stamp.no').style.opacity = Math.max(0, Math.min(1, -dx / 90)); top.querySelector('.stamp.maybe').style.opacity = Math.max(0, Math.min(1, -dy / 90 - Math.abs(dx) / 120)); });
  const end = () => { if (!dragging) return; dragging = false; top.classList.remove('snap'); if (dx > 90) deckDecide('yes'); else if (dx < -90) deckDecide('no'); else if (dy < -90) deckDecide('maybe'); else { top.style.transform = ''; top.querySelectorAll('.stamp').forEach(s => s.style.opacity = 0); if (!moved) openPlace(p.id); } dx = dy = 0; };
  top.addEventListener('pointerup', end); top.addEventListener('pointercancel', end);
}
function deckDecide(val) {
  const p = DECK.queue[DECK.i]; if (!p) return;
  const top = $('#dtop'); if (top) { top.style.transform = val === 'yes' ? 'translate(120vw,-20px) rotate(20deg)' : (val === 'no' ? 'translate(-120vw,-20px) rotate(-20deg)' : 'translate(0,-120vh)'); top.style.opacity = '0'; }
  setVote('p:' + p.id, val); DECK.i++; setTimeout(renderDeck, 220);
}

// ---------------------------------------------------------------- plan tab
function renderPlan() {
  if (!$('#planstats')) return;
  const pm = $('#propmap'), pw = $('#propweb');
  if (pm) { pm.placeholder = t('mapLinkPh'); pm.setAttribute('aria-label', t('mapLink')); }
  if (pw) { pw.placeholder = t('webLink'); pw.setAttribute('aria-label', t('webLink')); }
  const refs = PLACES.map(p => 'p:' + p.id).concat(Object.keys(state.custom || {}).filter(k => state.custom[k] && !state.custom[k].deleted).map(k => 'c:' + k));
  const both = refs.filter(bothWant), one = refs.filter(oneWants);
  const sched = new Set(); DAYKEYS.forEach(d => agIds(d).forEach(id => sched.add(id)));
  const mine = me ? refs.filter(r => votesFor(r)[me]).length : 0;
  $('#planstats').innerHTML = [[both.length, t('bothWant')], [one.length, t('oneWants')], [Array.from(sched).filter(x => !x.startsWith('x:')).length, t('scheduled')]].map(x => '<div class="pstat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('');
  const nameOf = (ref) => { const it = seedFor(ref); return it ? stopLabel(it) : ref; };
  const item = (ref, cls) => {
    const days = scheduledDays(ref); const it = seedFor(ref); const p = it && it.place;
    return '<div class="glcard ' + cls + (days.length ? ' done' : '') + '"><div class="glmain"><div class="gln"><button type="button" data-open="' + esc(p ? p.id : ref) + '">' + esc(nameOf(ref)) + '</button></div><div class="glg">' + esc(p ? [placeSub(p), p.hood].filter(Boolean).join(' · ') : t('idea')) + ' · ' + voteBadges(ref) + '</div>' +
      '<div class="glacts"><button type="button" class="' + (days.length ? 'placed' : '') + '" data-pick="' + esc(ref) + '">' + (days.length ? '📅 ' + days.map(dayLabel).join(', ') : '📅 ' + t('addToDay')) + '</button></div></div></div>';
  };
  $('#bothwant').innerHTML = both.length ? both.map(r => item(r, '')).join('') : '<p class="gsub">' + t('nothingYet') + '</p>';
  $('#onewants').innerHTML = one.length ? one.map(r => item(r, 'one')).join('') : '<p class="gsub">' + t('nothingYet') + '</p>';
  const props = Object.entries(state.custom || {}).filter(([k, c]) => c && !c.deleted).sort((a, b) => Number(b[0]) - Number(a[0]));
  $('#proposals').innerHTML = props.map(([k, c]) => { const ref = 'c:' + k; const v = votesFor(ref); return '<div class="voterow"><div class="vn"><a href="#" data-open="' + esc(ref) + '">' + esc(c.name) + '</a><small>' + (c.who ? esc(whoName(c.who)) + ' · ' : '') + (Number(c.d) >= 5 && Number(c.d) <= 720 ? Number(c.d) : 60) + ' ' + t('minutes') + ' · ' + voteBadges(ref) + '</small></div><div class="vbtns">' + [['yes', '❤️'], ['maybe', '🤔'], ['no', '✕']].map(o => '<button type="button" data-v="' + o[0] + '" data-ref="' + esc(ref) + '" aria-pressed="' + String(!!me && v[me] === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>'; }).join('');
  const schedRefs = Array.from(sched).filter(x => !x.startsWith('x:'));
  $('#scheduled').innerHTML = schedRefs.length ? DAYKEYS.map(d => { const ids = agIds(d).filter(x => !x.startsWith('x:')); if (!ids.length) return ''; return '<div class="glg" style="margin-top:10px">' + dayLabel(d) + ' · ' + esc(dayTitle(DAYBYKEY[d])) + '</div>' + ids.map(ref => '<div class="voterow"><div class="vn"><a href="#" data-open="' + esc(seedFor(ref).place ? seedFor(ref).place.id : ref) + '">' + esc(nameOf(ref)) + '</a><small>' + voteBadges(ref) + '</small></div><div class="vwho">' + agHM(agReflow(d, agIds(d)).find(r => r.it.id === ref).start) + '</div></div>').join(''); }).join('') : '<p class="gsub">' + t('nothingYet') + '</p>';
  $$('#plan [data-open]').forEach(b => { b.onclick = (e) => { e.preventDefault(); openPlace(b.dataset.open); }; });
  $$('#plan [data-pick]').forEach(b => { b.onclick = () => { const ref = b.dataset.pick; pickDay(ref, seedFor(ref).place); }; });
  $$('#plan [data-v]').forEach(b => { b.onclick = () => setVote(b.dataset.ref, b.dataset.v); });
}

// ---------------------------------------------------------------- who
function renderWho() {
  $$('.whoslot').forEach(sl => {
    sl.innerHTML = '<p class="gsub" style="margin:0 0 6px">' + t('pickWho') + '</p><div class="who">' + TR.filter(tr => isVoter(tr[0])).map(tr => '<button type="button" data-who="' + tr[0] + '" aria-pressed="' + String(me === tr[0]) + '">' + (tr[3] || '') + ' ' + esc(whoName(tr[0])) + '</button>').join('') + '</div>';
  });
  $$('.who button').forEach(b => { b.onclick = () => { me = b.dataset.who; try { localStorage.setItem(LSK + '-who', me); } catch (e) {} queueRender(); if (EX.deck) deckStart(); }; });
}

// ---------------------------------------------------------------- weather
const WX = {};
const WXICON = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
function loadWeather() {
  if (!DAYS.length) return;
  const Q = 'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=' + encodeURIComponent(T.TIMEZONE || 'America/New_York') + '&start_date=' + DAYS[0].date + '&end_date=' + DAYS[DAYS.length - 1].date;
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + G.HOME.lat + '&longitude=' + G.HOME.lng + '&' + Q).then(r => r.json()).then(src => {
    if (!src || !src.daily || !src.daily.time) return;
    DAYS.forEach(d => {
      const i = src.daily.time.indexOf(d.date); if (i < 0 || src.daily.temperature_2m_max[i] == null) return;
      const code = src.daily.weather_code[i]; const pp = (src.daily.precipitation_probability_max || [])[i];
      WX[d.key] = { hi: Math.round(src.daily.temperature_2m_max[i]), lo: Math.round(src.daily.temperature_2m_min[i]), code, ico: WXICON[code] || '🌡️', rain: code >= 51 || (pp != null && pp >= 55) };
    });
    paintWeather(); renderAgendaAll(); renderHome();
  }).catch(() => {});
}
function paintWeather() {
  DAYS.forEach(d => { const w = WX[d.key]; if (!w) return; $$('.wx[data-wxday="' + d.key + '"]').forEach(el => { el.textContent = w.ico + ' ' + w.hi + '° / ' + w.lo + '°'; const sep = el.parentNode && el.parentNode.querySelector('.wxsep'); if (sep) sep.textContent = ' · '; }); $$('.cwx[data-cwxday="' + d.key + '"]').forEach(el => { el.textContent = w.ico + w.hi + '°'; }); });
}

// ---------------------------------------------------------------- home / today
function renderHome() {
  const tc = $('#todaycard'); if (!tc) return;
  const now = new Date(); const tk = todayKey();
  const DD = DAYS.map(d => d.date.split('-').map(Number));
  const start = new Date(DD[0][0], DD[0][1] - 1, DD[0][2]), end = new Date(DD[DD.length - 1][0], DD[DD.length - 1][1] - 1, DD[DD.length - 1][2]);
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pending = bookItems().filter(b => !(state.check[b.key] && state.check[b.key].on)).length;
  let html = '';
  if (d0 < start) {
    const n = Math.round((start - d0) / 864e5);
    html = '<div class="today"><div class="eyebrow">' + n + ' ' + t('daysToGo') + '</div><h3>' + esc(fld(T, 'TITLE_') || T.TITLE) + '</h3><p>' + t('beforeIntro') + '</p>' +
      '<div class="acts wrap2"><button class="act site" type="button" data-go="explore">' + L('Rate places', 'Оценить места') + '</button><button class="act" type="button" data-go="bookings">' + (pending ? pending + ' ' + t('toBook') : t('allBooked')) + '</button><button class="act" type="button" data-goday="' + DAYKEYS[0] + '">' + L('See the plan', 'Смотреть план') + '</button></div></div>';
  } else if (d0 <= end) {
    const dk = DAYS.find(d => d.date === tk); const dayKey = dk ? dk.key : DAYKEYS[0];
    const rows = agReflow(dayKey, agIds(dayKey)); const nowMin = now.getHours() * 60 + now.getMinutes();
    const nextIdx = rows.findIndex(r => r.end > nowMin);
    const showTomorrow = nowMin > 22 * 60 && DAYKEYS.indexOf(dayKey) < DAYKEYS.length - 1;
    const useKey = showTomorrow ? DAYKEYS[DAYKEYS.indexOf(dayKey) + 1] : dayKey; const useRows = showTomorrow ? agReflow(useKey, agIds(useKey)) : rows;
    const d = DAYBYKEY[useKey]; const w = WX[useKey];
    html = '<div class="today"><div class="eyebrow">' + (showTomorrow ? t('tomorrow') : t('today')) + ' · ' + dayLabel(useKey) + (w ? ' · ' + w.ico + ' ' + w.hi + '°/' + w.lo + '°' : '') + '</div><h3>' + esc(dayTitle(d)) + '</h3>' +
      useRows.map((r, i) => '<div class="trow' + (!showTomorrow && i === nextIdx ? ' next' : '') + '"><span class="tt">' + agHM(r.start) + '</span><span>' + (!showTomorrow && i === nextIdx ? '▶ ' : '') + esc(stopLabel(r.it)) + '</span></div>').join('') +
      '<div class="acts wrap2"><button class="act site" type="button" data-goday="' + useKey + '">' + t('openDay') + '</button><a class="act" href="' + esc(G.mapsDir(null, HOMEPT)) + '" target="_blank" rel="noopener">' + t('getHome') + '</a><button class="act" type="button" data-go="chat">✨ ' + L('Ask', 'Спросить') + '</button></div></div>';
  } else {
    html = '<div class="today"><div class="eyebrow">' + esc(fld(T, 'TITLE_') || T.TITLE) + '</div><h3>🗽</h3><p>' + t('wrap') + '</p><div class="acts"><button class="act site" type="button" data-goday="' + DAYKEYS[0] + '">' + t('openDay') + '</button></div></div>';
  }
  tc.innerHTML = html;
  tc.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => setTab(b.dataset.go); });
  tc.querySelectorAll('[data-goday]').forEach(b => { b.onclick = () => setDay(b.dataset.goday, null); });
  // week glance
  const wg = $('#weekglance');
  if (wg) {
    wg.innerHTML = '<div class="wxstrip">' + DAYS.map(d => { const w = WX[d.key]; return '<div class="wxd' + (d.date === tk ? ' today' : '') + '" data-goday="' + d.key + '"><div class="d">' + dayLabel(d.key) + '</div><div class="i">' + (w ? w.ico : '·') + '</div><div class="t">' + (w ? w.hi + '°' : '') + '</div><div class="n">' + esc(dayTitle(d)) + '</div></div>'; }).join('') + '</div>';
    wg.querySelectorAll('[data-goday]').forEach(b => { b.onclick = () => setDay(b.dataset.goday, null); });
  }
  const hm = $('#homemenu');
  if (hm) {
    const items = [['days', L('Days', 'Дни'), L('The running order, day by day', 'Расписание по дням')], ['explore', L('Explore', 'Места'), L('Sights, tables, bars, shops', 'Места, столики, бары, магазины')], ['plan', L('Plan', 'План'), L('Votes → build the week', 'Голоса → собрать неделю')], ['map', L('Map', 'Карта'), L('Pins, routes, near me', 'Точки, маршруты, рядом')], ['bookings', L('Bookings', 'Брони'), L('Flights, tickets, tables', 'Рейсы, билеты, столики')], ['guide', L('Guide', 'Гид'), L('Airport, subway, money', 'Аэропорт, метро, деньги')]];
    hm.innerHTML = items.map(x => '<button class="mitem" type="button" data-go="' + x[0] + '"><b>' + x[1] + '</b><span>' + x[2] + '</span></button>').join('');
    hm.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { if (b.dataset.go === 'days') setDay(currentDay, null); else setTab(b.dataset.go); }; });
  }
  const hb = $('#homebook');
  if (hb) { const list = bookItems().filter(b => !(state.check[b.key] && state.check[b.key].on)).slice(0, 4); hb.innerHTML = list.length ? '<h3>' + L('Book next', 'Забронировать') + '</h3>' + list.map(b => '<div class="exrow"><span>' + (b.url ? '<a href="' + esc(b.url) + '" target="_blank" rel="noopener">' : '') + esc(b.title) + (b.url ? '</a>' : '') + '<small>' + esc(b.sub) + '</small></span></div>').join('') : ''; }
  [['en', T.SUB], ['ru', T.SUB_RU || T.SUB], ['de', T.SUB_DE || T.SUB]].forEach(([k, v]) => { const el = $('#hero-sub-' + k); if (el) el.textContent = v || ''; });
}

// ---------------------------------------------------------------- bookings
function bookItems() {
  const out = []; const seenRef = new Set();
  (T.BOOK || []).forEach(b => {
    const ref = b.id.startsWith('x:') ? b.id : 'p:' + b.id; seenRef.add(ref); const p = PL[b.id];
    out.push({ key: 'book:' + b.id, title: p ? placeName(p) : (seedFor(ref) ? stopLabel(seedFor(ref)) : b.id), sub: (b.day ? dayLabel(b.day) + ' · ' : '') + L(b.en, b.ru, b.de) + (b.by ? ' · ' + L('by', 'до', 'bis') + ' ' + b.by.slice(5).replace('-', '/') : ''), url: p ? (p.tickets || p.reserve || p.web || '') : '', day: b.day });
  });
  DAYKEYS.forEach(d => agIds(d).forEach(ref => {
    if (seenRef.has(ref)) return; const it = seedFor(ref); const p = it && it.place; if (!p) return;
    if ((p.lead && !/walk-?in/i.test(p.lead)) || (p.tags || []).indexOf('reservation-needed') >= 0) { seenRef.add(ref); out.push({ key: 'book:' + p.id, title: placeName(p), sub: dayLabel(d) + ' · ' + (placeLead(p) || t('reserve')), url: p.tickets || p.reserve || p.web || '', day: d }); }
  }));
  return out;
}
function renderBookings() {
  const fl = $('#flights'); if (!fl) return;
  fl.innerHTML = (T.FLIGHTS || []).map(f => '<div class="bk"><div class="bk-kind">' + (f.key === 'out' ? t('flightOut') : t('flightBack')) + ' · ' + esc(f.who) + '</div><div class="bk-title">' + esc(longDate(f.date)) + '</div><div class="bk-line"></div>' + f.legs.map(l => '<div class="leg"><span class="fl">' + esc(l.flight) + '</span><span class="rt">' + esc(l.from) + ' ' + esc(l.dep) + ' → ' + esc(l.to) + ' ' + esc(l.arr) + '<small>' + esc(l.note) + '</small></span></div>').join('') + '</div>').join('');
  const items = bookItems(); const done = items.filter(b => state.check[b.key] && state.check[b.key].on).length;
  $('#ptext').innerHTML = '<b>' + done + ' ' + t('lockedOf') + ' ' + items.length + '</b> ' + t('locked');
  $('#pfill').style.width = (items.length ? Math.round(done / items.length * 100) : 0) + '%';
  $('#booklist').innerHTML = items.map(b => '<label><input type="checkbox" data-chk="' + esc(b.key) + '" ' + (state.check[b.key] && state.check[b.key].on ? 'checked' : '') + ' /><span>' + (b.url ? '<a href="' + esc(b.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(b.title) + ' ↗</a>' : esc(b.title)) + '<small>' + esc(b.sub) + '</small></span></label>').join('');
  $$('#booklist [data-chk]').forEach(c => { c.onchange = () => put('check', c.dataset.chk, { on: c.checked, who: me }); });
  const rl = $('#resvlist'); const rs = Object.entries(state.resv || {}).filter(([k, r]) => r && !r.deleted).sort((a, b) => String(a[1].when).localeCompare(String(b[1].when)));
  rl.innerHTML = rs.length ? rs.map(([k, r]) => '<div class="exrow"><span><b>' + esc(r.place) + '</b><small>' + esc((r.when || '').replace('T', ' ')) + (r.code ? ' · ' + esc(r.code) : '') + (r.who ? ' · ' + esc(whoName(r.who)) : '') + '</small></span><button class="x" type="button" data-rdel="' + esc(k) + '">✕</button></div>').join('') : '<p class="gsub">' + t('noResv') + '</p>';
  $$('#resvlist [data-rdel]').forEach(b => { b.onclick = () => put('resv', b.dataset.rdel, Object.assign({}, state.resv[b.dataset.rdel], { deleted: true })); });
}
function buildICS() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tatyana in New York//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + (T.TITLE || 'NYC'), 'X-WR-TIMEZONE:America/New_York',
    'BEGIN:VTIMEZONE', 'TZID:America/New_York', 'BEGIN:DAYLIGHT', 'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST', 'END:STANDARD', 'END:VTIMEZONE'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const escI = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  DAYKEYS.forEach(d => {
    const date = DAYBYKEY[d].date.replace(/-/g, '');
    agReflow(d, agIds(d)).forEach((r, i) => {
      const p = r.it.place; const tm = (m) => agPad(m).replace(':', '') + '00';
      lines.push('BEGIN:VEVENT', 'UID:' + LSK + '-' + d + '-' + i + '-' + r.it.id.replace(/[^a-z0-9]/gi, '') + '@nyc', 'DTSTAMP:' + stamp, 'DTSTART;TZID=America/New_York:' + date + 'T' + tm(r.start), 'DTEND;TZID=America/New_York:' + date + 'T' + tm(Math.min(r.end, 1439)),
        'SUMMARY:' + escI((p ? (CAT[p.cat] || CAT.idea).ico + ' ' : '') + r.it.en), 'LOCATION:' + escI(p ? (p.name + ', ' + (p.addr || 'New York')) : ''), 'DESCRIPTION:' + escI((p ? [p.why, p.hours ? 'Hours: ' + p.hours : '', p.price ? 'Price: ' + p.price : '', p.web].filter(Boolean).join('\n') : '') + '\n' + location.href.split('#')[0]), 'END:VEVENT');
    });
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function exportICS() {
  const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'tatyana-nyc-2026.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  toast(t('icsDone'));
}

// ---------------------------------------------------------------- guide + notes
function renderGuide() {
  const host = $('#guidesections'); if (!host) return;
  host.innerHTML = (GUIDE.sections || []).map(s => '<details class="gsec" id="guide-' + esc(s.key) + '"><summary>' + esc(s.icon) + ' ' + esc(fld(s, 'title') || s.title) + '<span class="chev">▾</span></summary><div class="gbody">' + md(L(s.en, s.ru, s.de)) + '</div></details>').join('');
  const ht = $('#hubtable');
  if (ht) ht.innerHTML = G.HUBS.filter(h => h.key !== 'home').sort((a, b) => a.home - b.home).map(h => '<div class="hubrow"><span>' + esc(h.name) + '</span><span class="m">~' + h.home + ' ' + t('minutes') + '</span></div>').join('');
  const ev = $('#eventlist');
  if (ev) {
    const list = PLACES.map(p => ({ p, date: eventDate(p) })).filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date));
    ev.innerHTML = list.length ? list.map(x => '<div class="ecard" data-open="' + esc(x.p.id) + '"><div class="et">' + esc(placeHours(x.p)) + '</div><div class="ev">' + esc(placeName(x.p)) + '</div><div class="es">' + esc(placeWhy(x.p)) + '</div></div>').join('') : '<p class="gsub">' + L('Dated events appear here once the library has them.', 'События с датами появятся здесь, когда будут в библиотеке.') + '</p>';
    ev.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => openPlace(b.dataset.open); });
  }
}
function goGuide(key) { setTab('guide'); setTimeout(() => { const el = document.getElementById('guide-' + key); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 80); }
const PACK_DEFAULT = [['esta', 'ESTA approval screenshot + passport', 'Скриншот ESTA + паспорт'], ['ins', 'Travel insurance policy number', 'Номер страхового полиса'], ['adapter', 'US plug adapter (type A/B)', 'Переходник для розеток США (тип A/B)'], ['card', 'Contactless card for the subway (OMNY)', 'Бесконтактная карта для метро (OMNY)'], ['esim', 'eSIM bought and ready to activate', 'eSIM куплена и готова к активации'], ['shoes', 'Walking shoes (15,000 steps a day)', 'Обувь для 15 000 шагов в день'], ['layer', 'Light jacket / trench for evenings', 'Лёгкая куртка или тренч на вечер'], ['umbrella', 'Compact umbrella', 'Компактный зонт'], ['dress', 'One smart-casual outfit (Bemelmans, Broadway)', 'Один наряд smart casual (Bemelmans, Бродвей)'], ['tote', 'Foldable tote for shopping', 'Складная сумка для покупок'], ['meds', 'Medicines in original packaging', 'Лекарства в оригинальной упаковке'], ['apps', 'Apps: MTA, Citymapper, Uber, Resy, TodayTix', 'Приложения: MTA, Citymapper, Uber, Resy, TodayTix']];
function renderNotes() {
  const nl = $('#notelist'); if (!nl) return;
  const notes = Object.entries(state.note || {}).filter(([k, n]) => n && !n.deleted).sort((a, b) => Number(b[0]) - Number(a[0]));
  nl.innerHTML = notes.length ? notes.map(([k, n]) => '<div class="exrow"><span>' + esc(n.text) + '<small>' + esc(n.who ? whoName(n.who) : '') + ' · ' + new Date(Number(k)).toLocaleDateString(LOCALE[lang], { month: 'short', day: 'numeric' }) + '</small></span>' + (n.who === me ? '<button class="x" type="button" data-ndel="' + esc(k) + '">✕</button>' : '') + '</div>').join('') : '<p class="gsub">' + t('notesEmpty') + '</p>';
  $$('#notelist [data-ndel]').forEach(b => { b.onclick = () => put('note', b.dataset.ndel, Object.assign({}, state.note[b.dataset.ndel], { deleted: true })); });
  const pl = $('#packlist');
  const items = PACK_DEFAULT.map(x => ({ key: 'pack:' + x[0], label: L(x[1], x[2], x[3]) })).concat(Object.entries(state.pack || {}).filter(([k, p]) => p && !p.deleted).map(([k, p]) => ({ key: 'pack:' + k, label: p.text, custom: k })));
  pl.innerHTML = items.map(it => '<label><input type="checkbox" data-chk="' + esc(it.key) + '" ' + (state.check[it.key] && state.check[it.key].on ? 'checked' : '') + ' /><span>' + esc(it.label) + '</span></label>').join('');
  $$('#packlist [data-chk]').forEach(c => { c.onchange = () => put('check', c.dataset.chk, { on: c.checked, who: me }); });
}

// ---------------------------------------------------------------- map
let map = null, markers = [], route = null, activeCats = new Set(Object.keys(CAT)), mapDay = 'all';
function buildMap() {
  if (map || !window.L || !$('#lmap')) return;
  map = window.L.map('lmap', { zoomControl: true }).setView([40.715, -73.975], 12);
  // OpenStreetMap's own tiles: free and keyless for an app this size, on the
  // condition of the credit line (and no bulk downloading, which this never
  // does). CARTO's, used before, began stamping "API KEY REQUIRED" on every
  // tile. If these stop loading, the Humanitarian OpenStreetMap style — also
  // keyless — takes over.
  const TILES = [
    ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }],
    ['https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, subdomains: 'abc', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, style by the Humanitarian OpenStreetMap Team' }],
  ];
  let tiles = window.L.tileLayer(TILES[0][0], TILES[0][1]).addTo(map), tileErrs = 0;
  tiles.on('tileerror', () => {
    if (++tileErrs !== 6) return;   // a few failures happen on any flaky connection; a run of them means the server is refusing
    map.removeLayer(tiles); tiles = window.L.tileLayer(TILES[1][0], TILES[1][1]).addTo(map);
  });
  window.L.marker(HOMEPT, { icon: window.L.divIcon({ className: '', html: '<div class="pin home"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map).bindPopup('<b>🏠 ' + esc(fld(G.HOME, 'name') || G.HOME.name) + '</b>');
  drawMarkers();
  setTimeout(() => map.invalidateSize(), 200);
}
function drawMarkers() {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m)); markers = []; if (route) { map.removeLayer(route); route = null; }
  let pts = [];
  if (mapDay === 'all') pts = PLACES.filter(p => p.lat != null && activeCats.has(p.cat)).map(p => ({ p, pt: [p.lat, p.lng] }));
  else { pts = agReflow(mapDay, agIds(mapDay)).map(r => ({ p: r.it.place, pt: r.it.pin || r.it.p, it: r.it, start: r.start })).filter(x => x.pt); }
  pts.forEach(x => {
    const color = x.p ? catColor(x.p.cat) : '#5D6170';
    const m = window.L.marker(x.pt, { icon: window.L.divIcon({ className: '', html: '<div class="pin" style="background:' + color + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(map);
    const name = x.p ? placeName(x.p) : stopLabel(x.it);
    m.bindPopup('<b>' + esc(name) + '</b><br>' + (x.p ? esc([placeSub(x.p), x.p.hood].filter(Boolean).join(' · ')) + '<br><a href="#" data-mopen="' + esc(x.p.id) + '">' + L('Open', 'Открыть') + ' →</a>' : (x.start != null ? agHM(x.start) : '') + (x.it && x.it.approx ? ' · ' + esc(t('approxShort')) : '') + (x.it && x.it.custom ? '<br><a href="#" data-mopen="' + esc(x.it.id) + '">' + L('Open', 'Открыть', 'Öffnen') + ' →</a>' : '')));
    m.on('popupopen', (e) => { const a = e.popup.getElement().querySelector('[data-mopen]'); if (a) a.onclick = (ev) => { ev.preventDefault(); openPlace(a.dataset.mopen); }; });
    markers.push(m);
  });
  if (mapDay !== 'all' && pts.length > 1) { route = window.L.polyline([HOMEPT].concat(pts.map(x => x.pt)), { color: '#111318', weight: 3, dashArray: '6 8', opacity: .7 }).addTo(map); map.fitBounds(route.getBounds().pad(0.15)); }
}
function renderMapControls() {
  const mf = $('#mapfilters'); if (!mf) return;
  mf.innerHTML = ['see', 'museum', 'show', 'eat', 'drink', 'cafe', 'shop', 'park'].map(c => '<button class="act mfilter" type="button" data-cat="' + c + '" aria-pressed="' + String(activeCats.has(c)) + '">' + catLabel(c) + '</button>').join('');
  mf.querySelectorAll('.mfilter').forEach(b => { b.onclick = () => { const c = b.dataset.cat; const group = c === 'park' ? ['park', 'walk'] : [c]; if (activeCats.has(c)) group.forEach(g => activeCats.delete(g)); else group.forEach(g => activeCats.add(g)); mapDay = 'all'; renderMapControls(); drawMarkers(); }; });
  const md2 = $('#mapdays');
  md2.innerHTML = '<button class="act mfilter" type="button" data-day="all" aria-pressed="' + String(mapDay === 'all') + '">' + L('All pins', 'Все точки') + '</button>' + DAYKEYS.map(d => '<button class="act mfilter" type="button" data-day="' + d + '" aria-pressed="' + String(mapDay === d) + '">' + dayLabel(d) + '</button>').join('');
  md2.querySelectorAll('.mfilter').forEach(b => { b.onclick = () => { mapDay = b.dataset.day; renderMapControls(); drawMarkers(); }; });
}
function nearMe() {
  const st = $('#nearstatus'); st.textContent = t('locating');
  if (!navigator.geolocation) { st.textContent = t('nearNone'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const la = pos.coords.latitude, ln = pos.coords.longitude; st.textContent = '';
    const list = PLACES.filter(p => p.lat != null).map(p => ({ p, km: G.haversine(la, ln, p.lat, p.lng) })).sort((a, b) => a.km - b.km).slice(0, 14);
    $('#nearlist').innerHTML = '<div class="glg">' + t('near') + '</div>' + list.map(x => '<div class="nearrow" data-open="' + esc(x.p.id) + '"><span><b>' + esc(placeName(x.p)) + '</b> <span style="color:var(--soft)">' + esc(placeSub(x.p)) + '</span></span><span class="dist">' + (x.km < 1 ? Math.round(x.km * 1000) + ' m' : x.km.toFixed(1) + ' km') + ' · ' + G.walkMin(x.km) + '′</span></div>').join('');
    $$('#nearlist [data-open]').forEach(r => { r.onclick = () => openPlace(r.dataset.open); });
    if (map) { map.setView([la, ln], 15); window.L.circleMarker([la, ln], { radius: 8, color: '#0039A6', fillColor: '#0039A6', fillOpacity: .6 }).addTo(map); }
  }, () => { st.textContent = t('nearNone'); }, { enableHighAccuracy: true, timeout: 8000 });
}

// ---------------------------------------------------------------- chat
const CHAT = { msgs: [], chips: [] };
// The library as the concierge sees it: one line per place, sorted so the text
// is byte-for-byte the same on every request and the proxy's prompt cache holds.
let CHATLIB = null;
function chatLibrary() {
  if (CHATLIB) return CHATLIB;
  const flat = (x) => String(x == null ? '' : x).replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  CHATLIB = PLACES.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(p => [p.id, flat(p.name), p.cat, flat(p.hood), flat(p.hours).slice(0, 70), (p.closed || []).join(',')].join(' | ')).join('\n');
  return CHATLIB;
}
// A library place the concierge named without its id: match on the exact name,
// but only when any location it gave is close, so one branch of a chain is not
// mistaken for another.
let PLBYNAME = null;
function libByName(name, la, ln) {
  // "The Metropolitan Museum of Art (The Met Fifth Avenue)" is also found as
  // "The Metropolitan Museum of Art"
  if (!PLBYNAME) { PLBYNAME = Object.create(null); PLACES.forEach(p => { [p.name, shortName(p.name)].forEach(nm => { const k = normName(nm); if (k && !PLBYNAME[k]) PLBYNAME[k] = p; }); }); }
  const n = normName(name); if (!n) return null;
  let hit = PLBYNAME[n] || PLBYNAME[normName(shortName(name))] || null;
  if (hit && la != null && ln != null && G.haversine(la, ln, hit.lat, hit.lng) > 1.5) hit = null;
  // or the same place under a fuller or shorter name, right where the library has it
  if (!hit && la != null && ln != null && n.length >= 4) {
    const words = ' ' + n + ' ';
    hit = PLACES.find(p => { if (p.lat == null || G.haversine(la, ln, p.lat, p.lng) > 0.15) return false; const a = normName(shortName(p.name)); return a.length >= 4 && (words.indexOf(' ' + a + ' ') >= 0 || (' ' + a + ' ').indexOf(words) >= 0); }) || null;
  }
  return hit;
}
// What came back from the proxy is re-checked here: ids must be ours, names are
// capped, locations must be in New York, and nothing is ever used as a URL.
const inNycBox = (la, ln) => la != null && ln != null && la > 40.4 && la < 41.0 && ln > -74.35 && ln < -73.6;
function normPlaces(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [], seen = new Set();
  raw.slice(0, 12).forEach(x => {
    if (!x || typeof x !== 'object') return;
    const id = typeof x.ref === 'string' && x.ref.indexOf('p:') === 0 ? x.ref.slice(2) : '';
    const la0 = coord(x.lat), ln0 = coord(x.lng), here = inNycBox(la0, ln0);
    const lib = (id && Object.prototype.hasOwnProperty.call(PL, id) ? PL[id] : null) || libByName(x.name, here ? la0 : null, here ? ln0 : null);
    const name = (lib ? lib.name : String(typeof x.name === 'string' && x.name.trim() ? x.name : (x.mention || ''))).trim().slice(0, 120);
    if (!name) return;
    const key = lib ? 'p:' + lib.id : 'n:' + normName(name);
    if (seen.has(key)) return; seen.add(key);
    out.push({
      lib, name,
      mention: typeof x.mention === 'string' ? x.mention.slice(0, 160) : '',
      hood: typeof x.hood === 'string' ? x.hood.slice(0, 60) : '',
      cat: (typeof x.cat === 'string' && CAT[x.cat]) ? x.cat : 'idea',
      lat: !lib && here ? la0 : null, lng: !lib && here ? ln0 : null,
      minutes: Math.max(15, Math.min(480, parseInt(x.minutes, 10) || 60)),
      why: typeof x.why === 'string' ? x.why.slice(0, 240) : '',
    });
  });
  return out;
}
const liveCustom = (k) => !!(k && state.custom && state.custom[k] && !state.custom[k].deleted);
function chatPlaceState(pl) {
  if (pl.lib) { const ref = 'p:' + pl.lib.id; return (scheduledDays(ref).length || (me && votesFor(ref)[me] === 'yes')) ? '✓' : '＋'; }
  return (liveCustom(pl.k) || findCustomByName(pl.name)) ? '✓' : '＋';
}
function refreshChatChips() {
  (CHAT.chips || []).forEach(x => { const st = chatPlaceState(x.pl); x.el.textContent = st; x.el.parentNode.classList.toggle('done', st === '✓'); });
}
function openChatPlace(pl) {
  if (pl.lib) { openPlace(pl.lib.id); return; }
  const k = liveCustom(pl.k) ? pl.k : findCustomByName(pl.name);
  if (k) { openPlace('c:' + k); return; }
  openSuggested(pl);
}
// A place the concierge suggested that is not in the library: what it said about
// it, honest links to look it up, and the idea form already filled in.
function openSuggested(pl) {
  const q = pl.name + (pl.addr ? ', ' + pl.addr : (pl.hood ? ', ' + pl.hood : '')) + ', New York';
  const kv = [[t('address'), pl.addr], [t('hours'), pl.hours]].filter(x => x[1]);
  const hm = pl.lat != null ? G.fromHome(pl.lat, pl.lng) : null;
  const html = '<div class="cat" style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--f)">' + catLabel(pl.cat) + ' · ' + esc(pl.src ? foundLine(pl.src) : t('fromConcierge')) + '</div>' +
    '<h3>' + esc(pl.name) + '</h3>' +
    '<div class="meta">' + [esc(pl.hood), hm != null ? '~' + hm + ' ' + t('minutes') + ' ' + t('fromHome') : ''].filter(Boolean).join(' · ') + '</div>' +
    (pl.why ? '<p class="why">' + esc(pl.why) + '</p>' : '') +
    (kv.length ? '<div class="kv">' + kv.map(x => '<div class="k">' + esc(x[0]) + '</div><div>' + esc(x[1]) + '</div>').join('') + '</div>' : '') +
    '<div class="linkrow">' + (safeHref(pl.web) ? '<a class="site" href="' + esc(safeHref(pl.web)) + '" target="_blank" rel="noopener">' + esc(t('website')) + '</a>' : '') + '<a' + (safeHref(pl.web) ? '' : ' class="site"') + ' href="' + esc(G.mapsSearch(q)) + '" target="_blank" rel="noopener">' + esc(t('onGoogleMaps')) + '</a><a href="' + esc('https://www.google.com/search?q=' + encodeURIComponent(q)) + '" target="_blank" rel="noopener">' + esc(t('searchWeb')) + '</a></div>' +
    // the two things you came here to do, before anything optional
    '<div class="sheetacts"><button class="act go" type="button" id="sg-idea">' + esc(t('addAsIdea')) + '</button><button class="act" type="button" id="sg-day">' + esc(t('addToDay')) + '</button></div>' +
    '<p class="gsub custloc">' + esc(pl.lat != null ? (pl.exact ? t('pinned') : t('approxLoc')) : t('unpinned')) + '</p>' +
    '<details class="custedit"><summary>' + esc(t('adjustFirst')) + '</summary>' +
    '<div class="exform nm"><input id="sg-name" type="text" value="' + esc(pl.name) + '" aria-label="' + esc(t('customName')) + '" /><input id="sg-min" type="number" inputmode="numeric" value="' + pl.minutes + '" aria-label="' + esc(t('minutes')) + '" /></div>' +
    '<div class="exform links"><input id="sg-map" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('mapLinkPh')) + '" aria-label="' + esc(t('mapLink')) + '" /><input id="sg-web" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('webLink')) + '" aria-label="' + esc(t('webLink')) + '" value="' + esc(safeHref(pl.web) || '') + '" /></div>' +
    '<p class="gsub">' + esc(t('mapLinkHow')) + '</p></details>';
  openSheet(html, () => {
    // Returns { k, dup }: dup means an idea by that name already existed and
    // nothing new was made.
    const create = () => {
      const typed = $('#sg-name').value;
      if (pl.src && !$('#sg-map').value.trim() && (!typed.trim() || normName(typed) === normName(pl.name))) {
        // found by the search and not changed by hand: the same rules as one tap
        const had = sameCustom(pl);
        const k = customFromFound(Object.assign({}, pl, { minutes: Number($('#sg-min').value) || pl.minutes, web: $('#sg-web').value.trim() || pl.web }));
        if (!k) return null;
        pl.k = k;
        if (me && !(votesFor('c:' + k)[me] === 'yes')) setVote('c:' + k, 'yes');
        return { k, dup: !!had };
      }
      const dup = findCustomByName(typed || pl.name);
      const k = dup || makeCustom(typed, $('#sg-min').value, $('#sg-map').value, $('#sg-web').value, { lat: pl.lat, lng: pl.lng, exact: !!pl.exact, hood: pl.hood, addr: pl.addr, hours: pl.hours, note: pl.why, cat: pl.cat, from: pl.src ? 'lookup' : 'concierge', t: DEFTIME[pl.cat] });
      if (!k) return null;
      pl.k = k;
      if (me && !(votesFor('c:' + k)[me] === 'yes')) setVote('c:' + k, 'yes');
      return { k, dup: !!dup };
    };
    $('#sg-idea').onclick = () => {
      const r = create(); if (!r) return;
      refreshChatChips();
      if (r.dup) { toast(t('alreadyIdea')); openPlace('c:' + r.k); return; }
      closeSheet(); toast(t('ideaAdded'));
    };
    $('#sg-day').onclick = () => { const r = create(); if (!r) return; refreshChatChips(); pickDay('c:' + r.k); };
  });
}
// The concierge's reply, with the places it recommended made tappable: the
// first mention of each in the text, and a row of chips beneath. Built from DOM
// nodes, never innerHTML, so nothing the model writes can become markup.
function addReply(text, places) {
  const d = document.createElement('div'); d.className = 'msg a';
  const body = document.createElement('div'); body.className = 'msgtext';
  const spans = [];
  const wordCh = (c) => !!c && /[\p{L}\p{N}]/u.test(c);
  const free = (a, b) => !spans.some(x => a < x.end && b > x.start);
  // Every occurrence is considered: a standalone one that overlaps nothing
  // wins; failing that, the first that overlaps nothing. Matching is done on
  // the original text, so indices never drift under case-folding.
  const locate = (m) => {
    const pat = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const flags of ['gu', 'giu']) {
      const re = new RegExp(pat, flags); let loose = null, hit;
      while ((hit = re.exec(text))) {
        const a = hit.index, b = a + hit[0].length;
        if (b > a && free(a, b)) {
          if (!wordCh(text[a - 1]) && !wordCh(text[b])) return { a, b };
          if (!loose) loose = { a, b };
        }
        re.lastIndex = a + 1;
      }
      if (loose) return loose;
    }
    return null;
  };
  places.forEach((pl, i) => {
    const m = String(pl.mention || pl.name || '').trim(); if (m.length < 2) return;
    const f = locate(m); if (f) spans.push({ start: f.a, end: f.b, i });
  });
  spans.sort((a, b) => a.start - b.start);
  let pos = 0;
  spans.forEach(x => {
    if (x.start > pos) body.appendChild(document.createTextNode(text.slice(pos, x.start)));
    const b = document.createElement('a'); b.href = '#'; b.className = 'chatplace'; b.textContent = text.slice(x.start, x.end);
    b.onclick = (ev) => { ev.preventDefault(); openChatPlace(places[x.i]); };
    body.appendChild(b); pos = x.end;
  });
  if (pos < text.length) body.appendChild(document.createTextNode(text.slice(pos)));
  d.appendChild(body);
  if (places.length) {
    const row = document.createElement('div'); row.className = 'chatchips';
    places.forEach(pl => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'chatchip';
      const ico = document.createElement('span'); ico.className = 'ci'; ico.textContent = (CAT[pl.lib ? pl.lib.cat : pl.cat] || CAT.idea).ico;
      const nm = document.createElement('span'); nm.className = 'cn'; nm.textContent = pl.lib ? placeName(pl.lib) : pl.name;
      const st = document.createElement('span'); st.className = 'cp';
      c.append(ico, nm, st); c.onclick = () => openChatPlace(pl);
      row.appendChild(c); CHAT.chips.push({ el: st, pl });
    });
    d.appendChild(row);
  }
  $('#msgs').appendChild(d); refreshChatChips();
  // Show the whole reply when it fits between the header and the message box;
  // when it does not, open at its first line so it reads from the start.
  const ab = $('.appchrome') && $('.appchrome').getBoundingClientRect(), cb = $('.chatin') && $('.chatin').getBoundingClientRect();
  const room = (ab && cb && cb.top > ab.bottom) ? cb.top - ab.bottom - 16 : (window.innerHeight || 700) - 240;
  d.scrollIntoView({ block: d.getBoundingClientRect().height > room ? 'start' : 'end' });
  return d;
}
function addMsg(role, text, cls) { const d = document.createElement('div'); d.className = 'msg ' + (role === 'user' ? 'u' : 'a') + (cls ? ' ' + cls : ''); d.textContent = text; $('#msgs').appendChild(d); d.scrollIntoView({ block: 'end' }); return d; }
function chatContext() {
  const tk = todayKey(); const dk = DAYS.find(d => d.date === tk) || DAYS[0];
  const dayTxt = (k) => { return dayLabel(k) + ' ' + dayStory(k, 'en').title + ':\n' + agReflow(k, agIds(k)).map(r => '  ' + agHM(r.start) + ' ' + r.it.en + (r.it.place ? ' [' + r.it.place.hood + ']' : '')).join('\n'); };
  const next = DAYKEYS[DAYKEYS.indexOf(dk.key) + 1];
  const wish = PLACES.filter(p => voteScore('p:' + p.id) > 0).sort((a, b) => voteScore('p:' + b.id) - voteScore('p:' + a.id)).slice(0, 15).map(p => p.name + ' (' + p.hood + (bothWant('p:' + p.id) ? ', both want' : '') + ')').join('; ');
  return 'Phone belongs to: ' + (me ? whoName(me) : 'unknown') + '\nCURRENT PLAN\n' + dayTxt(dk.key) + (next ? '\n' + dayTxt(next) : '') + '\nWISHLIST (top votes): ' + (wish || 'none yet') + (WX[dk.key] ? '\nWEATHER ' + dk.key + ': ' + WX[dk.key].hi + '/' + WX[dk.key].lo + '°C' + (WX[dk.key].rain ? ' rain likely' : '') : '');
}
async function sendChat(text) {
  if (!text) return; const inp = $('#chatinput'), btn = $('#chatsend');
  addMsg('user', text); CHAT.msgs.push({ role: 'user', content: text }); inp.value = ''; btn.disabled = true;
  const th = addMsg('assistant', '…', 'think');
  try {
    if (!navigator.onLine) throw new Error('offline');
    const r = await fetch(CFG.CONCIERGE_URL.replace(/\/$/, '') + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Trip-Key': CFG.TRIP_KEY || '' }, body: JSON.stringify({ messages: CHAT.msgs.slice(-12), today: new Date().toLocaleString(LOCALE[lang], { timeZone: T.TIMEZONE || 'America/New_York', dateStyle: 'full', timeStyle: 'short' }), context: chatContext(), library: chatLibrary() }) });
    const j = await r.json(); th.remove();
    if (j && typeof j.reply === 'string' && j.reply) {
      addReply(j.reply, normPlaces(j.places));
      CHAT.msgs.push({ role: 'assistant', content: j.reply });
    } else {
      // A failure is shown in the reader's language, and never fed back to the
      // model as something it said. The proxy's English detail is in its log.
      const code = j && j.code;
      addMsg('assistant', t(code === 'busy' ? 'chatBusy' : code === 'setup' ? 'chatSetup' : code === 'refusal' ? 'chatRefusal' : 'chatErr'), 'think');
    }
  } catch (e) { th.remove(); addMsg('assistant', navigator.onLine ? t('chatErr') : t('chatOffline'), 'think'); }
  btn.disabled = false;
}
function initChat() {
  if (!CFG.CONCIERGE_URL) { $('#chatsetup').hidden = false; $('#chatbox').hidden = true; return; }
  $('#chatsetup').hidden = true; $('#chatbox').hidden = false;
  const paint = () => { $('#quickqs').innerHTML = (fld(T, 'QUICKQS_') || T.QUICKQS || []).map(q => '<button class="act" type="button">' + esc(q) + '</button>').join(''); $$('#quickqs .act').forEach(b => { b.onclick = () => sendChat(b.textContent); }); };
  paint(); document.addEventListener('langchange', paint);
  if (!$('#msgs').children.length) addMsg('assistant', fld(T, 'CHAT_HELLO_') || T.CHAT_HELLO);
  $('#chatsend').onclick = () => sendChat($('#chatinput').value.trim());
  $('#chatinput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat($('#chatinput').value.trim()); });
}

// ---------------------------------------------------------------- settings
function renderSettings() {
  const names = (state.settings.names && state.settings.names.v) || {};
  TR.forEach(tr => { const el = $('#name' + tr[0]); if (el && document.activeElement !== el) el.value = names[tr[0]] || ''; });
  const pp = $('#pacepick'); if (!pp) return;
  const cur = (state.settings.pace && state.settings.pace.v) || 'normal';
  pp.innerHTML = [['relaxed', t('paceRelaxedPick')], ['normal', t('paceNormalPick')], ['full', t('paceFullPick')]].map(x => '<button class="vchip" type="button" data-pace="' + x[0] + '" aria-pressed="' + String(cur === x[0]) + '">' + x[1] + '</button>').join('');
  pp.querySelectorAll('[data-pace]').forEach(b => { b.onclick = () => put('settings', 'pace', { v: b.dataset.pace }); });
}
function bindSettings() {
  TR.map(tr => tr[0]).forEach(k => { const el = $('#name' + k); if (!el) return; let h = null; el.addEventListener('input', () => { clearTimeout(h); h = setTimeout(() => { const v = Object.assign({}, (state.settings.names && state.settings.names.v) || {}); v[k] = el.value.trim().slice(0, 30); put('settings', 'names', { v }); }, 600); }); });
}

// ---------------------------------------------------------------- navigation
const TABPANEL = { home: 'home', explore: 'explore', plan: 'plan', map: 'map', chat: 'chat', more: 'more', bookings: 'bookings', guide: 'guide', notes: 'notes' };
const DOCK = { home: 'home', explore: 'explore', plan: 'plan', map: 'map', chat: 'chat', more: 'more', bookings: 'more', guide: 'more', notes: 'more' };
let panels = [], dockBtns = [], chips = [];
let currentTab = 'home', currentDay = DAYKEYS[0] || 'd0';
function showPanelEl(id, slide) { panels.forEach(p => { p.classList.remove('is-active', 'slide-l', 'slide-r'); if (p.id === id) { p.classList.add('is-active'); if (slide) p.classList.add(slide); } }); window.scrollTo({ top: 0, behavior: 'auto' }); }
function render(slide) {
  document.body.dataset.tab = currentTab;
  const hl = currentTab === 'days' ? 'days' : (DOCK[currentTab] || 'more');
  dockBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tabbtn === hl)));
  chips.forEach(c => c.setAttribute('aria-selected', String(c.dataset.day === currentDay)));
  if (currentTab === 'days') { showPanelEl(currentDay, slide); const ac = chips.find(c => c.dataset.day === currentDay); if (ac) ac.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
  else showPanelEl(TABPANEL[currentTab] || 'home', null);
  document.dispatchEvent(new CustomEvent('tabshow', { detail: currentTab }));
}
function setTab(tab) { if (tab === 'days') { setDay(currentDay, null); return; } if (tab === currentTab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } currentTab = tab; render(null); }
function setDay(day, slide) { currentDay = day; currentTab = 'days'; render(slide); }
function initNav() {
  const strip = $('.daystrip');
  DAYS.forEach((d, i) => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === 0)); b.dataset.day = d.key; b.innerHTML = '<span class="dw">' + esc(d.dw) + '</span><span class="dn">' + esc(d.dn) + '</span><span class="cwx" data-cwxday="' + d.key + '"></span>'; strip.appendChild(b); });
  panels = $$('.panel'); dockBtns = $$('.tbtn'); chips = $$('.chip');
  dockBtns.forEach(b => b.addEventListener('click', () => { if (b.dataset.tabbtn === 'days') setDay(currentDay, null); else setTab(b.dataset.tabbtn); }));
  chips.forEach(c => c.addEventListener('click', () => { const from = DAYKEYS.indexOf(currentDay), to = DAYKEYS.indexOf(c.dataset.day); setDay(c.dataset.day, to > from ? 'slide-l' : (to < from ? 'slide-r' : null)); }));
  $$('.mitem[data-go]').forEach(m => m.addEventListener('click', () => setTab(m.dataset.go)));
  let tX = null, tY = null;
  document.addEventListener('touchstart', e => { if (currentTab !== 'days' || e.touches.length !== 1 || AG_DRAG) { tX = null; return; } if (e.target.closest('.daystrip, .tabbar, .aglist, .sheet')) { tX = null; return; } tX = e.touches[0].clientX; tY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => { if (tX === null || currentTab !== 'days') return; const dx = e.changedTouches[0].clientX - tX, dy = e.changedTouches[0].clientY - tY; tX = null; if (Math.abs(dx) < 64 || Math.abs(dy) > 56) return; const i = DAYKEYS.indexOf(currentDay); if (dx < 0 && i < DAYKEYS.length - 1) setDay(DAYKEYS[i + 1], 'slide-l'); else if (dx > 0 && i > 0) setDay(DAYKEYS[i - 1], 'slide-r'); }, { passive: true });
  document.addEventListener('tabshow', (e) => { if (e.detail === 'map') { if (window.L) buildMap(); else { const w = setInterval(() => { if (window.L) { clearInterval(w); buildMap(); } }, 200); setTimeout(() => clearInterval(w), 8000); } } if (e.detail === 'explore') renderExplore(); });
  const relabel = () => chips.forEach(c => { const d = DAYBYKEY[c.dataset.day]; if (d) c.querySelector('.dw').textContent = dayLabel(d.key).split(' ')[0]; });
  document.addEventListener('langchange', relabel); relabel();
  // smart start: during the trip open today's page
  const tk = DAYS.find(d => d.date === todayKey()); if (tk) { currentTab = 'days'; currentDay = tk.key; }
  render(null);
  try { const c = chips.find(c => c.dataset.day === (tk && tk.key)); if (c) c.classList.add('today'); } catch (e) {}
}

// ---------------------------------------------------------------- up next + countdown
function renderTicker() {
  const box = $('#upnext'); if (!box) return;
  const tk = DAYS.find(d => d.date === todayKey()); if (!tk) { box.classList.remove('on'); return; }
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  const rows = agReflow(tk.key, agIds(tk.key)); const nxt = rows.find(r => r.start > nowMin);
  if (!nxt) { box.classList.remove('on'); return; }
  box.querySelector('.un-k').textContent = t('nextUp'); box.querySelector('.un-t').textContent = agHM(nxt.start) + ' — ' + stopLabel(nxt.it);
  box.querySelector('.un-s').textContent = nxt.it.place ? [placeSub(nxt.it.place), nxt.it.place.hood].filter(Boolean).join(' · ') : ''; box.classList.add('on');
}
function renderCount() {
  const els = $$('.tripcount'); if (!DAYS.length) return;
  const DD = DAYS.map(d => d.date.split('-').map(Number)); const start = new Date(DD[0][0], DD[0][1] - 1, DD[0][2]), end = new Date(DD[DD.length - 1][0], DD[DD.length - 1][1] - 1, DD[DD.length - 1][2]);
  const now = new Date(); const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()); let txt = null;
  if (d0 < start) { const n = Math.round((start - d0) / 864e5); txt = L('<b>' + n + '</b> day' + (n === 1 ? '' : 's') + ' to go', '<b>' + n + '</b> ' + ((n % 10 === 1 && n % 100 !== 11) ? 'день' : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'дня' : 'дней')) + ' до поездки', '<b>noch ' + n + '</b> Tag' + (n === 1 ? '' : 'e')); }
  else if (d0 <= end) { const n = Math.round((d0 - start) / 864e5) + 1; txt = L('<b>Day ' + n + '</b> of ' + DD.length, '<b>День ' + n + '</b> из ' + DD.length, '<b>Tag ' + n + '</b> von ' + DD.length); }
  if (txt) els.forEach(el => { el.innerHTML = txt; el.hidden = false; });
}

// ---------------------------------------------------------------- language + platform
// A block with no translation in the current language falls back to English
// rather than vanishing — so a half-translated page still reads.
function paintFallbacks() {
  const want = lang === 'en' ? null : 'L-' + lang;
  $$('.L-en').forEach(el => {
    if (!want) { el.classList.remove('L-fallback'); return; }
    const sib = el.parentNode ? Array.from(el.parentNode.children).some(c => c !== el && c.classList && c.classList.contains(want)) : false;
    el.classList.toggle('L-fallback', !sib);
  });
}
function paintLang() {
  document.body.dataset.lang = lang; document.documentElement.lang = lang;
  const btn = $('#langbtn'); if (btn) btn.textContent = LANGBTN[lang];
  paintFallbacks(); paintDayHeads();
}
function initLang() {
  paintLang();
  $('#langbtn').addEventListener('click', () => { lang = LANGS[(LI() + 1) % LANGS.length]; try { localStorage.setItem(LSK + '-lang', lang); } catch (e) {} paintLang(); document.dispatchEvent(new CustomEvent('langchange', { detail: lang })); renderAll(); if (EX.deck) renderDeck(); });
}
function initPlatform() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => { const poke = () => { try { reg.update(); } catch (e) {} }; poke(); document.addEventListener('visibilitychange', () => { if (!document.hidden) poke(); }); window.addEventListener('focus', poke); }).catch(() => {});
      let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
    });
  }
  try {
    const ua = navigator.userAgent || ''; const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); const isAndroid = /Android/.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let dismissed = false; try { dismissed = localStorage.getItem(LSK + '-noinstall') === '1'; } catch (e) {}
    if (!dismissed && isIOS && !standalone) document.body.classList.add('show-install');
    if (!dismissed && isAndroid && !standalone) { $('#hint-ios').hidden = true; $('#hint-android').hidden = false; document.body.classList.add('show-install'); }
    const ix = $('#installx'); if (ix) ix.onclick = () => { document.body.classList.remove('show-install'); try { localStorage.setItem(LSK + '-noinstall', '1'); } catch (e) {} };
    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; const b = $('#a2hs'); b.classList.add('on'); b.onclick = () => { deferred.prompt(); deferred.userChoice.finally(() => { document.body.classList.remove('show-install'); deferred = null; }); }; });
  } catch (e) {}
  try { const sbn = $('#sharebtn'); if (navigator.share) { sbn.classList.add('on'); sbn.addEventListener('click', () => navigator.share({ title: T.TITLE || document.title, url: location.href }).catch(() => {})); } } catch (e) {}
  try {
    $('#buildstamp').textContent = ' ' + (window.APP_BUILD || 'dev');
    $('#forceupdate').onclick = async () => { try { if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update())); } if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } } catch (e) {} toast(t('updating')); setTimeout(() => location.reload(), 600); };
  } catch (e) {}
}

// ---------------------------------------------------------------- guided tour
// A coach-mark walkthrough: each step switches to the right tab (and day),
// spotlights a real element and explains it. Steps live in data/tour.js so the
// copy can be edited without touching the engine. A step whose element is not
// on screen is skipped rather than shown pointing at nothing.
const TOURKEY = LSK + '-tour';
const TOUR = (window.TOUR && Array.isArray(window.TOUR.steps)) ? window.TOUR.steps : [];
let TI = -1, TOURON = false;

// jsdom and other layout-less hosts report every box as 0x0; trust the DOM there.
function hasLayout() { try { const b = document.body.getBoundingClientRect(); return b.width > 0 || b.height > 0; } catch (e) { return false; } }
function tourFind(sel) {
  let el = null; try { el = document.querySelector(sel); } catch (e) { return null; }
  if (!el || el.closest('[hidden]')) return null;
  if (!hasLayout()) return el;
  const r = el.getBoundingClientRect();
  return (r.width > 0 && r.height > 0) ? el : null;
}
function tourStage(s) {
  if (s.day && DAYBYKEY[s.day]) { if (currentTab !== 'days' || currentDay !== s.day) setDay(s.day, null); }
  else if (s.tab === 'days') { if (currentTab !== 'days') setDay(currentDay, null); }
  else if (s.tab && s.tab !== currentTab) setTab(s.tab);
  tourSheet(s);
}
// A step can open a sheet to point at something inside it (the concierge box in
// Replan, the vote buttons on a place). The tour closes what it opened as soon
// as it moves to a step that doesn't want it, and when it ends.
let TOURSHEET = '';
function tourSheet(s) {
  const want = s && s.open ? s.open + '|' + currentDay + '|' + lang : '';   // a language switch reopens it translated
  if (want === TOURSHEET) return;
  if (TOURSHEET) { TOURSHEET = ''; try { closeSheet(); } catch (e) {} }
  if (!want) return;
  if (s.open === 'replan') openReplan(currentDay);
  else if (s.open === 'place') {
    // a place from the library, whatever the list shows (one of your own ideas
    // has a different page; a search may have emptied the list)
    const c = Array.prototype.slice.call(document.querySelectorAll('#exlist .card')).find(x => PL[x.dataset.card]);
    const id = c ? c.dataset.card : (PLACES.find(p => p.lat != null) || {}).id; if (!id) return;
    openPlace(id);
  }
  else return;
  TOURSHEET = want;
}
function tourSeek(i, dir) {
  while (i >= 0 && i < TOUR.length) {
    const s = TOUR[i]; tourStage(s);
    if (!s.sel || tourFind(s.sel)) return i;
    i += dir;
  }
  return -1;
}
// Is this element carried by the page (scrolling moves it) or pinned to the
// screen? A sticky day strip or the fixed language button must not be scrolled at.
function tourPinned(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const pos = getComputedStyle(n).position;
    if (pos === 'fixed' || pos === 'sticky') return true;
  }
  return false;
}
// The band we are allowed to use: under the floating language pill, above the
// dock. Both are measured rather than guessed, because the safe-area insets on
// a notched phone move them and a fixed number would put the card behind one.
function tourBand() {
  const vh = window.innerHeight || 780;
  let dock = 100, top = 54;
  try {
    const sh = document.getElementById('sheet'), up = sh && !sh.hidden;
    const tb = document.querySelector('.tabbar'); const r = tb && tb.getBoundingClientRect();
    if (up) dock = 8;   // a sheet covers the dock, so its strip is ours
    else if (r && r.height > 0) dock = Math.max(70, Math.round(vh - r.top) + 10);
    const lb = document.getElementById('langbtn'); const lr = lb && lb.getBoundingClientRect();
    if (lr && lr.height > 0) top = Math.max(12, Math.round(lr.bottom) + 10);
  } catch (e) {}
  return { top, vh, usable: Math.max(160, vh - dock - top) };
}
// Scroll so that the element and the card both fit in the band. A target taller
// than the room left over keeps its top slab lit rather than pushing the card off.
function tourScroll(el, ch) {
  const sh = el.closest('.sheet');
  if (sh) {
    // bring it to the top of what the sheet shows, leaving the rest for the card
    const b = tourBand(), r = el.getBoundingClientRect(), top = Math.max(sh.getBoundingClientRect().top, b.top) + 12;
    const delta = Math.round(r.top - top);
    if (Math.abs(delta) >= 3) sh.scrollTop += delta;
    return;
  }
  if (tourPinned(el)) return;
  const b = tourBand(), r = el.getBoundingClientRect();
  const want = Math.min(r.height + 16, Math.max(90, b.usable - ch - 28));
  const ty = b.top + Math.max(0, Math.round((b.usable - want - ch - 28) / 2)) + 8;
  const delta = Math.round(r.top - ty);
  if (Math.abs(delta) < 3) return;
  try { window.scrollBy(0, delta); } catch (e) {}
}
function tourPlace(el) {
  const wrap = $('#tourwrap'), spot = $('#tourspot'), card = $('#tourcard');
  if (!wrap) return;
  const vw = window.innerWidth || 390, b = tourBand();
  if (!el || !hasLayout()) { wrap.classList.add('nospot'); spot.hidden = true; card.classList.add('mid'); card.style.top = ''; card.style.bottom = ''; return; }
  wrap.classList.remove('nospot'); card.classList.remove('mid');
  card.style.maxHeight = ''; card.classList.remove('clipped');   // measure the card's natural height first
  const ch = card.offsetHeight || 200, pad = 8, gap = 14;
  const r = el.getBoundingClientRect();
  let x = Math.max(6, r.left - pad), w = Math.min(vw - 12, r.width + pad * 2);
  let y = r.top - pad, h = r.height + pad * 2;
  // never let the spotlight eat the room the card needs
  h = Math.min(h, Math.max(70, b.usable - ch - gap * 2));
  // an element pinned to the screen (the language pill, the sticky day strip)
  // sits where it sits — only page content gets pulled into the band
  const lo = tourPinned(el) ? 6 : b.top;
  y = Math.min(Math.max(y, lo), Math.max(lo, b.top + b.usable - h));
  spot.hidden = false;
  spot.style.left = x + 'px'; spot.style.top = y + 'px'; spot.style.width = w + 'px'; spot.style.height = h + 'px';
  const below = Math.max(y + h + gap, b.top);
  const roomBelow = (b.top + b.usable) - below, roomAbove = (y - gap) - b.top;
  if (below + ch <= b.top + b.usable) card.style.top = below + 'px';
  else if (ch <= roomAbove) card.style.top = (y - gap - ch) + 'px';
  // Neither side fits the whole card — a small screen with a long paragraph.
  // Take the roomier side and let the text scroll rather than cover the thing
  // the step is pointing at.
  else if (roomBelow >= roomAbove) { card.style.top = below + 'px'; card.style.maxHeight = roomBelow + 'px'; }
  else { card.style.top = b.top + 'px'; card.style.maxHeight = roomAbove + 'px'; }
  // a faded bottom edge says "there is more text here" rather than looking broken
  card.classList.toggle('clipped', !!card.style.maxHeight);
  card.style.bottom = '';
}
function tourPaint(i) {
  TI = i; const s = TOUR[i]; if (!s) return;
  $('#tourico').textContent = s.icon || '✦';
  $('#tourtitle').textContent = fld(s, 'title') || s.title || '';
  $('#tourbody').textContent = fld(s, 'body') || s.body || '';
  $('#tourskip').textContent = t('tourSkip');
  $('#tourprev').textContent = t('tourBack'); $('#tourprev').hidden = i === 0;
  $('#tournext').textContent = i === TOUR.length - 1 ? t('tourDone') : t('tourNext');
  $('#tourdots').innerHTML = TOUR.map((x, k) => '<i class="' + (k === i ? 'on' : (k < i ? 'was' : '')) + '"></i>').join('');
  $('#tourcard').setAttribute('aria-label', (fld(s, 'title') || '') + ' — ' + (i + 1) + '/' + TOUR.length);
  const el = s.sel ? tourFind(s.sel) : null;
  if (el && hasLayout()) tourScroll(el, $('#tourcard').offsetHeight || 200);
  tourPlace(el);
  requestAnimationFrame(() => { if (TOURON && TI === i) tourPlace(s.sel ? tourFind(s.sel) : null); });
}
function tourGo(i, dir) {
  if (!TOURON) return;
  dir = dir < 0 ? -1 : 1;
  const n = tourSeek(i, dir);
  if (n >= 0) { tourPaint(n); return; }
  if (dir < 0 && TI >= 0) { tourStage(TOUR[TI]); tourPaint(TI); return; }
  tourEnd(true);
}
function tourBuild() {
  if ($('#tourwrap')) return;
  const w = document.createElement('div');
  w.className = 'tourwrap'; w.id = 'tourwrap'; w.hidden = true;
  w.innerHTML = '<div class="tourspot" id="tourspot" hidden></div>' +
    '<div class="tourcard" id="tourcard" role="dialog" aria-modal="true" aria-live="polite">' +
    '<div class="ttop"><span class="tico" id="tourico"></span><button type="button" class="tskip" id="tourskip"></button></div>' +
    '<h4 id="tourtitle"></h4><p id="tourbody"></p>' +
    '<div class="tnav"><span class="tdots" id="tourdots" aria-hidden="true"></span>' +
    '<span class="tbtns"><button type="button" class="tprev" id="tourprev"></button><button type="button" class="tnext" id="tournext"></button></span></div></div>';
  document.body.appendChild(w);
  // tapping the dimmed area moves on; the card itself is for reading
  w.addEventListener('click', (e) => { if (e.target.closest('#tourcard')) return; tourGo(TI + 1, 1); });
  $('#tourskip').onclick = (e) => { e.stopPropagation(); tourEnd(false); };
  $('#tourprev').onclick = (e) => { e.stopPropagation(); tourGo(TI - 1, -1); };
  $('#tournext').onclick = (e) => { e.stopPropagation(); tourGo(TI + 1, 1); };
  document.addEventListener('keydown', (e) => {
    if (!TOURON) return;
    if (e.key === 'Escape') { e.preventDefault(); tourEnd(false); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); tourGo(TI + 1, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); tourGo(TI - 1, -1); }
  });
  let rz = null, sq = false;
  const reposition = () => { const s = TOUR[TI]; tourPlace(s && s.sel ? tourFind(s.sel) : null); };
  window.addEventListener('resize', () => { if (!TOURON) return; clearTimeout(rz); rz = setTimeout(reposition, 120); });
  window.addEventListener('scroll', () => { if (!TOURON || sq) return; sq = true; requestAnimationFrame(() => { sq = false; if (TOURON) reposition(); }); }, { passive: true });
  document.addEventListener('langchange', () => { if (TOURON && TI >= 0) { tourSheet(TOUR[TI]); tourPaint(TI); } });
}
function tourStart() {
  if (!TOUR.length) return;
  try { if (EX.deck) deckStop(); } catch (e) {}
  try { closeSheet(); } catch (e) {}
  tourBuild();
  TOURON = true; document.body.classList.add('tour-on');
  // the app scrolls smoothly by default; during the tour that animation would
  // fight the spotlight, so pin it to instant for the duration
  try { document.documentElement.style.scrollBehavior = 'auto'; } catch (e) {}
  $('#tourwrap').hidden = false;
  tourGo(0, 1);
}
function tourEnd(done) {
  TOURON = false; TI = -1;
  tourSheet(null);
  const w = $('#tourwrap'); if (w) { w.hidden = true; w.classList.remove('nospot'); }
  document.body.classList.remove('tour-on');
  try { document.documentElement.style.scrollBehavior = ''; } catch (e) {}
  try { localStorage.setItem(TOURKEY, done ? 'done' : 'skipped'); } catch (e) {}
}
function tourSeen() { try { return !!localStorage.getItem(TOURKEY); } catch (e) { return true; } }

// ---------------------------------------------------------------- render all + init
function renderAll() {
  refreshCustomSeeds();
  renderWho(); paintDayHeads(); renderAgendaAll(); renderPlan(); renderHome(); renderBookings(); renderNotes(); renderSettings(); renderTicker(); renderCount(); renderGuide(); refreshChatChips();
  if (currentTab === 'explore') renderExplore();
  if (map) { renderMapControls(); drawMarkers(); }
}
function init() {
  buildDayPanels(); initLang(); initNav(); initPlatform(); bindSettings();
  $('#exsearch').addEventListener('input', (e) => { EX.q = e.target.value.trim(); renderExplore(); });
  $('#exsort').addEventListener('change', (e) => { EX.sort = e.target.value; renderExplore(); });
  $('#swipebtn').onclick = () => { if (EX.deck) deckStop(); else deckStart(); };
  $('#gotoswipe').onclick = () => { setTab('explore'); deckStart(); };
  $('#buildweek').onclick = openBuildWeek;
  $('#propadd').onclick = () => {
    const k = makeCustom($('#propin').value, $('#propmin').value || 90, $('#propmap').value, $('#propweb').value);
    if (!k) return;
    if (me) setVote('c:' + k, 'yes');
    ['#propin', '#propmap', '#propweb'].forEach(sel => { $(sel).value = ''; });
  };
  $('#noteadd').onclick = () => { const v = $('#notein').value.trim(); if (!v) return; put('note', String(Date.now()), { who: me, text: v.slice(0, 500) }); $('#notein').value = ''; };
  $('#packadd').onclick = () => { const v = $('#packin').value.trim(); if (!v) return; put('pack', String(Date.now()), { text: v.slice(0, 120), who: me }); $('#packin').value = ''; };
  $('#resvadd').onclick = () => { const p = $('#resvplace').value.trim(); if (!p) return; put('resv', String(Date.now()), { place: p.slice(0, 120), when: $('#resvwhen').value, code: $('#resvcode').value.trim().slice(0, 120), who: me }); $('#resvplace').value = ''; $('#resvcode').value = ''; toast(t('saved')); };
  const trb = $('#tourreplay'); if (trb) trb.onclick = () => tourStart();
  $('#icsexport').onclick = exportICS;
  $('#nearme').onclick = nearMe;
  $('#gohome').onclick = () => window.open(G.mapsDir(null, HOMEPT), '_blank', 'noopener');
  renderMapControls(); initChat();
  renderAll(); loadWeather(); sbInit();
  if (TOUR.length && !tourSeen()) setTimeout(() => { if (!TOURON) tourStart(); }, 900);
  setInterval(() => { renderTicker(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderTicker(); renderHome(); } });
}
// expose a little for tests
window.NYC = { renderAll, normPlaces, chatLibrary, addReply, agIds, agReflow, agSave, agInsert, agWrite, dayStory, dayHubs, dayRain, dayStats, rankDays, buildWeek, seedFor, state, setTab, setDay, openPlace, buildICS, tourStart, tourEnd, tourGo, TOURKEY, get tourStep() { return TI; }, get tourOn() { return TOURON; }, TOUR, get me() { return me; }, set me(v) { me = v; }, PL };
init();
})();
