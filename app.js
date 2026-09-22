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
const PL = {}; PLACES.forEach(p => { PL[p.id] = p; });
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
const fld = (o, base) => {
  if (!o) return '';
  const suffix = lang === 'ru' ? 'Ru' : (lang === 'de' ? 'De' : '');
  return (suffix && o[base + suffix]) || o[base] || '';
};
const S = {
  runningOrder: ['Running order', 'Расписание дня', 'Tagesablauf'], stops: ['stops', 'пункт(ов)', 'Stopps'],
  dragHint: ['hold a stop to drag it · tap a time to pin it · ⋯ moves, retimes or removes', 'зажмите пункт и тяните · нажмите на время, чтобы закрепить · ⋯ — перенести, изменить или убрать', 'Stopp halten und ziehen · auf die Zeit tippen, um sie festzusetzen · ⋯ verschiebt, ändert oder entfernt'],
  resetDay: ['↺ reset to the plan', '↺ вернуть план', '↺ Plan wiederherstellen'], homeBy: ['Home by', 'Дома к', 'Zu Hause gegen'], anchors: ['anchors', 'точек', 'Programmpunkte'], transit: ['in transit', 'в пути', 'unterwegs'],
  paceRelaxed: ['🟢 Relaxed', '🟢 Спокойно', '🟢 Entspannt'], paceComfy: ['🟢 Comfortable', '🟢 Комфортно', '🟢 Angenehm'], paceFull: ['🟡 Full day', '🟡 Насыщенно', '🟡 Voller Tag'], paceCrammed: ['🔴 Crammed', '🔴 Перегружено', '🔴 Zu voll'],
  paceHint: ['Too much for one day — the ⋯ menu on any stop moves it to a lighter day.', 'Слишком много для одного дня — через ⋯ у любого пункта его можно перенести в более свободный день.', 'Zu viel für einen Tag — über das ⋯-Menü lässt sich ein Stopp auf einen ruhigeren Tag schieben.'],
  mikeOn: ['🎷 Mike joins tonight', '🎷 Майк вечером с нами', '🎷 Mike ist heute Abend dabei'], mikeOff: ['🎷 Mike joins?', '🎷 Майк придёт?', '🎷 Kommt Mike mit?'],
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
  minutes: ['min', 'мин', 'Min'], places: ['places', 'мест', 'Orte'], noMatch: ['Nothing matches — try fewer filters.', 'Ничего не найдено — уберите фильтры.', 'Nichts gefunden — weniger Filter setzen.'],
  swipeHint: ['Swipe right = want, left = skip, up = maybe. Everyone\'s votes sync.', 'Вправо = хочу, влево = нет, вверх = может быть. Голоса синхронизируются.', 'Nach rechts = will ich, links = nein, hoch = vielleicht. Alle Stimmen werden synchronisiert.'],
  deckDone: ['You have rated everything in this view 🎉 — change the filter or head to Plan.', 'Вы оценили всё в этой подборке 🎉 — смените фильтр или загляните в План.', 'Du hast alles in dieser Auswahl bewertet 🎉 — Filter ändern oder weiter zum Plan.'],
  left: ['left to rate', 'осталось оценить', 'noch zu bewerten'], exitSwipe: ['✕ Exit swipe', '✕ Выйти', '✕ Swipe beenden'],
  bothWant: ['both want', 'хотите обе', 'wollen beide'], oneWants: ['one wants', 'хочет одна', 'will eine'], scheduled: ['scheduled', 'в плане', 'im Plan'], ratedByMe: ['rated by me', 'оценено мной', 'von mir bewertet'],
  nothingYet: ['Nothing here yet — rate a few places in Explore.', 'Пока пусто — оцените несколько мест в разделе «Места».', 'Noch nichts hier — bewertet ein paar Orte unter „Entdecken“.'],
  buildTitle: ['Build my week', 'Собрать неделю', 'Meine Woche bauen'], buildIntro: ['Everything you both want (and nobody vetoed) that is not in the plan yet, slotted into the day that fits its neighborhood and pace. Nothing is saved until you tap Apply.', 'Всё, чего хотите обе (и никто не против), чего ещё нет в плане, — по дням, подходящим по району и темпу. Ничего не сохраняется, пока вы не нажмёте «Применить».', 'Alles, was ihr beide wollt (und niemand abgelehnt hat) und noch nicht im Plan steht — einsortiert in den Tag, der vom Viertel und vom Tempo her passt. Gespeichert wird erst, wenn du auf Übernehmen tippst.'],
  apply: ['✓ Apply to the plan', '✓ Применить', '✓ In den Plan übernehmen'], cancel: ['Cancel', 'Отмена', 'Abbrechen'], nothingToAdd: ['Nothing to add — everything you both want is already in the plan.', 'Добавлять нечего — всё, чего хотите обе, уже в плане.', 'Nichts hinzuzufügen — alles, was ihr beide wollt, steht schon im Plan.'], noFit: ['no free day fits', 'нет подходящего дня', 'kein freier Tag passt'],
  applied: ['Added to the plan', 'Добавлено в план', 'Zum Plan hinzugefügt'],
  pickDay: ['Which day?', 'В какой день?', 'An welchem Tag?'], pickStop: ['Add a stop', 'Добавить пункт', 'Stopp hinzufügen'], custom: ['✎ Custom stop', '✎ Свой пункт', '✎ Eigener Stopp'], customName: ['What is it?', 'Что это?', 'Was ist es?'], customMin: ['min', 'мин', 'Min'], add: ['Add', 'Добавить', 'Hinzufügen'],
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
const CAT = {}; CATS.forEach(c => { CAT[c[0]] = { key: c[0], ico: c[1], en: c[2], ru: c[3], de: c[4], color: c[5] }; });
const catLabel = (k) => { const c = CAT[k] || CAT.idea; return c.ico + ' ' + L(c.en, c.ru, c.de); };
const catColor = (k) => (CAT[k] || CAT.idea).color;
const TAGS = [['first-timer', 'First-timer', 'Обязательно', 'Für Erstbesucher'], ['near-home', 'Near home', 'Рядом с домом', 'Nah bei uns'], ['rainy-day', 'Rainy day', 'На дождь', 'Bei Regen'], ['free', 'Free', 'Бесплатно', 'Kostenlos'], ['view', 'Views', 'Виды', 'Aussicht'], ['mike-evening', 'With Mike', 'С Майком', 'Mit Mike'], ['pre-dinner', 'Pre-dinner drink', 'Аперитив', 'Aperitif'], ['brunch', 'Brunch', 'Бранч', 'Brunch'], ['hidden-gem', 'Hidden gem', 'Нетуристическое', 'Geheimtipp'], ['splurge', 'Splurge', 'Роскошь', 'Luxus'], ['late-night', 'Late night', 'Поздний вечер', 'Spätabends'], ['dessert', 'Dessert', 'Десерт', 'Dessert']];
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOWL = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] };
const MON = { en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], ru: ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'], de: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'] };
const LOCALE = { en: 'en-US', ru: 'ru-RU', de: 'de-DE' };
const monthName = (date) => MON[lang][Number(String(date).split('-')[1]) - 1];
const longDate = (date) => { const p = String(date).split('-').map(Number); const wd = new Date(p[0], p[1] - 1, p[2]).getDay(); return DOWL[lang][wd] + ' ' + p[2] + ' ' + MON[lang][p[1] - 1]; };
// A stop's label in the current language; seeds carry en/ru/de, places carry nameRu/nameDe.
const stopLabel = (it) => { if (!it) return ''; if (it.place) return placeName(it.place); return L(it.en, it.ru, it.de); };

// ---------------------------------------------------------------- travelers + state
const TR = T.TRAVELERS || [];
let me = null; try { me = localStorage.getItem(LSK + '-who'); } catch (e) {}
function whoName(k) { const o = ((state.settings.names || {}).v || state.settings.names || {})[k]; if (o) return o; const tr = TR.find(x => x[0] === k); return tr ? L(tr[1], tr[2], tr[4] || tr[1]) : k; }
function whoEmoji(k) { const tr = TR.find(x => x[0] === k); return tr ? (tr[3] || '') : ''; }
const state = { vote: {}, agenda: {}, custom: {}, mike: {}, daynote: {}, note: {}, check: {}, resv: {}, settings: {}, pack: {} };
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
function dayTitle(d) { return fld(d, 'title'); }
function dayLede(d) { return fld(d, 'lede'); }
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
function votesFor(ref) { const v = state.vote[ref]; return (v && typeof v === 'object') ? v : {}; }
function voteScore(ref) { const v = votesFor(ref); let s = 0; ['Y', 'T'].forEach(k => { s += VOTEV[v[k]] || 0; }); if (v.M === 'yes') s += 1; if (v.M === 'no') s -= 1; return s; }
function bothWant(ref) { const v = votesFor(ref); return v.Y === 'yes' && v.T === 'yes'; }
function oneWants(ref) { const v = votesFor(ref); return (v.Y === 'yes' || v.T === 'yes') && !bothWant(ref) && v.Y !== 'no' && v.T !== 'no'; }
function setVote(ref, val) {
  if (!me) { toast(t('pickWhoFirst')); return; }
  const v = Object.assign({}, votesFor(ref));
  if (v[me] === val) delete v[me]; else v[me] = val;
  put('vote', ref, v);
}
function voteBadges(ref) {
  const v = votesFor(ref);
  return TR.map(tr => { const x = v[tr[0]]; if (!x) return ''; const ico = x === 'yes' ? '❤️' : (x === 'maybe' ? '🤔' : '✕'); return '<span class="vb ' + x + '" title="' + esc(whoName(tr[0])) + '">' + (tr[3] || tr[0]) + ico + '</span>'; }).join('');
}
function scheduledDays(ref) { const out = []; DAYKEYS.forEach(d => { if (agIds(d).indexOf(ref) >= 0) out.push(d); }); return out; }

// ---------------------------------------------------------------- running order data
const AGSEED = {}, AGDAYS = {}, SEEDT = {};
function bestTime(p) { return { morning: '10:00', afternoon: '14:00', sunset: '17:30', evening: '18:30', night: '21:00' }[p.best] || '12:00'; }
function seedFor(ref) {
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
    const s = (T.STOPS || {})[ref.slice(2)]; if (!s) return null;
    AGSEED[ref] = { id: ref, t: s.t, d: s.d || 30, lock: !!s.lock, en: s.en, ru: s.ru || s.en, p: s.p || null, q: s.q || null, link: s.link || null, x: true };
    return AGSEED[ref];
  }
  if (ref.startsWith('c:')) {
    const c = (state.custom || {})[ref.slice(2)]; if (!c || c.deleted) return null;
    AGSEED[ref] = { id: ref, t: c.t || '12:00', d: c.d || 60, lock: false, en: c.name, ru: c.name, p: (c.lat != null) ? [c.lat, c.lng] : null, q: null, custom: true, cat: 'idea' };
    return AGSEED[ref];
  }
  return null;
}
Object.entries(T.SEED || {}).forEach(([day, arr]) => {
  AGDAYS[day] = arr.map(it => { const ref = it[0]; const s = seedFor(ref); if (!s) return null; SEEDT[day + '|' + ref] = { t: it[1], d: it[2] }; return ref; }).filter(Boolean);
});
DAYKEYS.forEach(d => { AGDAYS[d] = AGDAYS[d] || []; });
function agClaimedBy(id, beforeDay) {
  const all = state.agenda || {};
  for (const d of DAYKEYS) { if (d === beforeDay) break; const s2 = all[d]; if (s2 && Array.isArray(s2.ids) && s2.ids.indexOf(id) >= 0) return d; }
  return null;
}
function agIds(day) {
  const all = state.agenda || {}; const st = all[day]; const claimed = new Set();
  Object.entries(all).forEach(([d2, s2]) => { if (d2 !== day && s2 && Array.isArray(s2.ids)) s2.ids.forEach(id => claimed.add(id)); });
  if (st && Array.isArray(st.ids)) {
    const mine = st.ids.filter(id => seedFor(id) && !agClaimedBy(id, day));
    const seen = new Set(st.seen || AGDAYS[day] || []); const have = new Set(st.ids);
    return mine.concat((AGDAYS[day] || []).filter(id => !seen.has(id) && !have.has(id) && !claimed.has(id)));
  }
  return (AGDAYS[day] || []).filter(id => !claimed.has(id));
}
function agState(day) { return (state.agenda || {})[day] || {}; }
function agOv(day) { return agState(day).t || {}; }
function agDur(day, id) { const st = agState(day); const o = (st.d || {})[id]; if (o) return o; const sd = SEEDT[day + '|' + id]; if (sd && sd.d) return sd.d; return seedFor(id).d; }
function agBase(day, id) { const ov = agOv(day); if (ov[id]) return agMin(ov[id]); const sd = SEEDT[day + '|' + id]; if (sd && sd.t) return agMin(sd.t); return agMin(seedFor(id).t); }
function agTravel(from, to) { const m = G.travelMin(from, to); return m == null ? null : m; }
function agTouched(day) {
  const st = agState(day); if (!st || !Array.isArray(st.ids)) return false;
  const seedOrder = AGDAYS[day] || []; const ids = st.ids.filter(x => seedOrder.indexOf(x) >= 0);
  const reordered = ids.some((x, i) => i > 0 && seedOrder.indexOf(x) < seedOrder.indexOf(ids[i - 1]));
  return reordered || Object.keys(st.t || {}).length > 0;
}
function agReflow(day, ids) {
  const touched = agTouched(day); const ov = agOv(day);
  const rows = []; let cur = null, prevQ = null;
  const isSeed = (id) => (AGDAYS[day] || []).indexOf(id) >= 0;
  const dayStart = ids.length ? Math.min.apply(null, ids.map(id => agBase(day, id))) : 600;
  ids.forEach((id, i) => {
    const it = seedFor(id); const seed = agBase(day, id); const d = agDur(day, id);
    const anchored = it.lock || ov[id] != null;
    let gap = 0, mode = '';
    // A stop with no location ("a café near here") happens where you already are.
    if (i > 0) { if (!it.p) { gap = 5; mode = 'same'; } else { const est = agTravel(prevQ, it.p); gap = (est != null) ? est : 10; mode = G.travelMode(prevQ, it.p); } }
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
function agSave(day, ids) { const st = agState(day); put('agenda', day, { ids, t: st.t || {}, d: st.d || {}, seen: (AGDAYS[day] || []).slice() }); }
function agSetTime(day, id, val) { const st = agState(day); const tt = Object.assign({}, st.t || {}); if (val) tt[id] = val; else delete tt[id]; put('agenda', day, { ids: Array.isArray(st.ids) ? st.ids : agIds(day), t: tt, d: st.d || {}, seen: (AGDAYS[day] || []).slice() }); }
function agSetDur(day, id, val) { const st = agState(day); const dd = Object.assign({}, st.d || {}); if (val) dd[id] = val; else delete dd[id]; put('agenda', day, { ids: Array.isArray(st.ids) ? st.ids : agIds(day), t: st.t || {}, d: dd, seen: (AGDAYS[day] || []).slice() }); }
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
    const c = r.it.place && r.it.place.cat;
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

// ---------------------------------------------------------------- day panels
function buildDayPanels() {
  const host = $('#dayhost'); if (!host) return;
  host.innerHTML = DAYS.map((d, i) => {
    return '<section class="panel" id="' + d.key + '" role="tabpanel">' +
      '<div class="dayhead"><div class="kicker"><span class="no">' + t('dayOf').toUpperCase() + ' ' + (i + 1) + '</span><span class="eyebrow"><span class="dl"></span><span class="wxsep"></span><span class="wx" data-wxday="' + d.key + '"></span></span></div>' +
      '<h2 class="dt"></h2><p class="lede dlede"></p>' +
      '<div class="daytools"><button class="mikebtn" type="button" data-mike="' + d.key + '" aria-pressed="false"></button><span class="pace" data-pace="' + d.key + '"></span></div><p class="pacehint" data-pacehint="' + d.key + '" hidden></p></div>' +
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
  $$('[data-mike]').forEach(b => { b.onclick = () => { const d = b.dataset.mike; put('mike', d, { on: !(state.mike[d] && state.mike[d].on) }); }; });
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
  const p = it.place; if (!p) return '';
  const bits = [placeSub(p), p.hood].filter(Boolean);
  const dow = dowOf(day);
  const closed = Array.isArray(p.closed) && p.closed.indexOf(dow) >= 0;
  return '<small>' + esc(bits.join(' · ')) + (closed ? ' · <b style="color:var(--red)">⚠ ' + t('closedThatDay') + '</b>' : '') + '</small>';
}
function renderAgenda(day) {
  const box = document.querySelector('.agwrap[data-agday="' + day + '"]'); if (!box) return;
  const ids = agIds(day); const rows = agReflow(day, ids);
  const touched = !!(agState(day) && Array.isArray(agState(day).ids));
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
      const ico = r.it.place ? (CAT[r.it.place.cat] || CAT.idea).ico : (r.it.custom ? '💡' : '');
      return conn + '<div class="agrow stop-' + cat + '" data-id="' + esc(r.it.id) + '" data-start="' + agPad(r.start) + '">' + grip +
        '<button type="button" class="ag-time' + (r.warn ? ' warn' : '') + (r.edited ? ' edited' : '') + '" title="' + t('tapTime') + '">' + (r.warn ? '⚠' : '') + tm + '</button>' +
        '<span class="ag-t"><span class="ag-ico">' + ico + '</span> ' + rowTitleHtml(r.it) + rowSub(r.it, day) + '</span>' +
        '<button class="ag-mv" type="button" title="' + t('moveOrRemove') + '">⋯</button></div>';
    }).join('') +
    '<div class="agsum">' + (st.homeBy != null ? '<b>' + t('homeBy') + ' ~' + agHM(st.homeBy) + '</b> · ' : '') + st.anchors + ' ' + t('anchors') + ' · ~' + st.travel + ' ' + t('minutes') + ' ' + t('transit') + ' · ' + Math.round(st.span / 6) / 10 + ' ' + L('h out', 'ч вне дома') + '</div>' +
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
  const rst = box.querySelector('[data-agreset]'); if (rst) rst.onclick = (e) => { e.stopPropagation(); put('agenda', day, null); toast(L('Day reset to the plan', 'День возвращён к плану')); };
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
  // rain box + mike + notes
  const rb = document.querySelector('[data-rainbox="' + day + '"]');
  if (rb) {
    const w = WX[day]; const list2 = (T.RAIN || {})[day] || [];
    if (w && w.rain && list2.length) {
      rb.hidden = false;
      rb.innerHTML = '<div class="rt">' + t('rainTitle') + '</div><div class="acts">' + list2.filter(id => PL[id]).map(id => '<button class="act" type="button" data-rainadd="' + esc(id) + '">' + (agIds(day).indexOf('p:' + id) >= 0 ? '✓ ' : '＋ ') + esc(placeName(PL[id])) + '</button>').join('') + '</div>';
      rb.querySelectorAll('[data-rainadd]').forEach(b => { b.onclick = () => { const ref = 'p:' + b.dataset.rainadd; if (agIds(day).indexOf(ref) >= 0) openPlace(b.dataset.rainadd); else { agInsert(day, ref); toast(t('applied')); } }; });
    } else rb.hidden = true;
  }
  const mb = document.querySelector('[data-mike="' + day + '"]');
  if (mb) { const on = !!(state.mike[day] && state.mike[day].on); mb.setAttribute('aria-pressed', String(on)); mb.textContent = on ? t('mikeOn') : t('mikeOff'); }
  const ta = document.querySelector('[data-daynote="' + day + '"]');
  if (ta && document.activeElement !== ta) { const n = state.daynote[day]; ta.value = (n && n.text) || ''; }
  const chip = document.querySelector('.chip[data-day="' + day + '"]'); if (chip) chip.classList.toggle('mike', !!(state.mike[day] && state.mike[day].on));
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
    if (hub && d.hubs) {
      if (d.hubs.indexOf(hub) >= 0) { score += 10; why = why || L('same neighborhood that day', 'в тот же район в этот день'); }
      else { const m = Math.min.apply(null, d.hubs.map(h => G.hubToHub(h, hub))); score += Math.max(0, (60 - m) / 6); if (!why && m <= 20) why = L('a short hop from that day\'s area', 'недалеко от района того дня'); }
    }
    const rows = agReflow(day, agIds(day)); const st = dayStats(day, rows);
    score -= Math.max(0, st.anchors - 4) * 2; if (st.lvl >= 3) score -= 20;
    if (day === 'd0') score -= 15; if (day === 'd8') score -= (p.tags || []).indexOf('near-home') >= 0 ? 0 : 25;
    if (p.mike && state.mike[day] && state.mike[day].on) { score += 3; why = why || L('Mike is with you that night', 'в этот вечер с вами Майк'); }
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
function linkChips(p) {
  const chips = [];
  if (p.web) chips.push(['site', p.web, t('website')]);
  if (p.tickets) chips.push(['tix', p.tickets, t('tickets')]);
  if (p.reserve) chips.push(['tix', p.reserve, t('reserve')]);
  if (p.menu) chips.push(['', p.menu, t('menu')]);
  if (p.ig) chips.push(['ig', p.ig, 'Instagram']);
  if (p.lat != null) { chips.push(['', G.mapsSearch((p.name || '') + ', ' + (p.addr || 'New York')), t('map')]); chips.push(['', G.mapsDir(null, [p.lat, p.lng]), t('directions')]); }
  return '<div class="linkrow">' + chips.map(c => '<a class="' + c[0] + '" href="' + esc(c[1]) + '" target="_blank" rel="noopener">' + esc(c[2]) + '</a>').join('') + '</div>';
}
function openPlace(id) {
  let p = PL[id]; let ref = 'p:' + id; let custom = null;
  if (!p && id.startsWith('c:')) { custom = (state.custom || {})[id.slice(2)]; if (!custom) return; ref = id; p = { id: id.slice(2), name: custom.name, cat: 'idea', hood: custom.hood || '', dur: custom.d || 60, why: '', tips: [], tags: [], custom: true }; }
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
    '<div class="meta">' + esc([p.hood, p.boro].filter(Boolean).join(', ')) + (hm != null ? ' · ~' + hm + ' ' + t('minutes') + ' ' + t('fromHome') : '') + (dow.length ? ' · <b style="color:var(--g-dark)">' + t('inPlan') + ': ' + dow.map(dayLabel).join(', ') + '</b>' : '') + '</div>' +
    (placeWhy(p) ? '<p class="why">' + esc(placeWhy(p)) + '</p>' : '') +
    linkChips(p) +
    (kv.length ? '<div class="kv">' + kv.map(x => '<div class="k">' + esc(x[0]) + '</div><div>' + esc(x[1]) + '</div>').join('') + '</div>' : '') +
    (placeTips(p).length ? '<ul class="tips">' + placeTips(p).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
    (p.tags && p.tags.length ? '<div class="tags">' + p.tags.slice(0, 6).map(x => '<span class="tag">' + esc(tagLabel(x)) + '</span>').join('') + '</div>' : '') +
    '<div class="votebox"><div class="vl">' + t('yourVote') + (me ? ' · ' + esc(whoName(me)) : '') + '<small>' + TR.map(tr => (v[tr[0]] ? (tr[3] || '') + ' ' + esc(whoName(tr[0])) + ': ' + (v[tr[0]] === 'yes' ? '❤️' : v[tr[0]] === 'maybe' ? '🤔' : '✕') : '')).filter(Boolean).join(' · ') + '</small></div>' +
    '<div class="vbtns">' + [['yes', '❤️'], ['maybe', '🤔'], ['no', '✕']].map(o => '<button type="button" data-vote="' + o[0] + '" aria-pressed="' + String(!!me && v[me] === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>' +
    '<div class="sheetacts"><button class="act go" type="button" id="sh-add">' + t('addToDay') + '</button>' + (custom ? '<button class="act" type="button" id="sh-del">' + t('delete') + '</button>' : '') + '</div>' +
    (p.conf && p.conf !== 'high' ? '<p class="gsub" style="margin-top:10px">' + t('confirm') + '</p>' : '');
  openSheet(html, () => {
    $$('#sheet [data-vote]').forEach(b => { b.onclick = () => { setVote(ref, b.dataset.vote); setTimeout(() => openPlace(id), 60); }; });
    $('#sh-add').onclick = () => pickDay(ref, p);
    const del = $('#sh-del'); if (del) del.onclick = () => { put('custom', id.slice(2), Object.assign({}, custom, { deleted: true })); closeSheet(); };
  });
}
function tagLabel(x) { const tg = TAGS.find(z => z[0] === x); return tg ? L(tg[1], tg[2], tg[3]) : x.replace(/-/g, ' '); }
function pickDay(ref, p) {
  const fits = rankDays(p || seedFor(ref).place || { tags: [] });
  const html = '<h3>' + t('pickDay') + '</h3><p class="meta">' + esc(stopLabel(seedFor(ref))) + '</p>' +
    fits.map(f => { const d = DAYBYKEY[f.day]; const placed = agIds(f.day).indexOf(ref) >= 0; return '<div class="pkrow" data-pick="' + f.day + '"><div class="pn">' + dayLabel(f.day) + ' · ' + esc(dayTitle(d)) + '<small>' + (f.closed ? '⚠ ' + t('closedThatDay') : (f.why || '')) + '</small></div><button type="button" class="pk-b' + (f.rec ? ' rec' : '') + '" ' + (f.closed ? 'disabled' : '') + '>' + (placed ? '✓' : (f.rec ? '★ ' + t('recommended') : '📅')) + '</button></div>'; }).join('');
  openSheet(html, () => { $$('#sheet [data-pick]').forEach(r => { const b = r.querySelector('.pk-b'); if (b.disabled) return; r.onclick = () => { agInsert(r.dataset.pick, ref); closeSheet(); toast(t('applied') + ' · ' + dayLabel(r.dataset.pick)); }; }); });
}
function openAddStop(day) {
  const d = DAYBYKEY[day]; const hubs = d.hubs || [];
  const near = (p) => { if (p.lat == null || !hubs.length) return 99; const h = G.nearestHub(p.lat, p.lng).hub.key; return Math.min.apply(null, hubs.map(x => G.hubToHub(x, h))); };
  const inDay = new Set(agIds(day));
  let cat = 'all', q = '';
  const render = () => {
    const list = PLACES.filter(p => !inDay.has('p:' + p.id) && (cat === 'all' || p.cat === cat || (cat === 'park' && p.cat === 'walk')) && (!q || (p.name + ' ' + (p.nameRu || '') + ' ' + p.hood + ' ' + (p.sub || '')).toLowerCase().indexOf(q) >= 0))
      .map(p => ({ p, n: near(p), s: voteScore('p:' + p.id) })).sort((a, b) => (a.n - b.n) || (b.s - a.s)).slice(0, 40);
    $('#pk-list').innerHTML = list.map(x => '<div class="pkrow" data-add="' + esc(x.p.id) + '"><div class="pn">' + (CAT[x.p.cat] || CAT.idea).ico + ' ' + esc(placeName(x.p)) + '<small>' + esc([placeSub(x.p), x.p.hood].filter(Boolean).join(' · ')) + (x.n < 99 ? ' · ~' + x.n + ' ' + t('minutes') : '') + ' ' + voteBadges('p:' + x.p.id) + '</small></div><button type="button" class="pk-b">＋</button></div>').join('') || '<p class="gsub">' + t('noMatch') + '</p>';
    $$('#pk-list [data-add]').forEach(r => { r.onclick = () => { agInsert(day, 'p:' + r.dataset.add); closeSheet(); toast(t('applied')); }; });
  };
  const html = '<h3>' + t('pickStop') + ' · ' + dayLabel(day) + '</h3><input class="pksearch" id="pk-q" type="search" placeholder="' + t('searchPh') + '" />' +
    '<div class="vchips small" id="pk-cats"><button class="vchip" type="button" data-c="all" aria-pressed="true">' + L('All', 'Все') + '</button>' + ['see', 'museum', 'show', 'eat', 'drink', 'cafe', 'shop', 'park'].map(c => '<button class="vchip" type="button" data-c="' + c + '">' + catLabel(c) + '</button>').join('') + '</div>' +
    '<div id="pk-list"></div><div class="grp"><h3 style="font-size:16px">' + t('custom') + '</h3><div class="exform"><input id="pk-cname" type="text" placeholder="' + t('customName') + '" /><input id="pk-cmin" type="number" inputmode="numeric" value="60" /><button type="button" id="pk-cadd">' + t('add') + '</button></div></div>';
  openSheet(html, () => {
    render();
    $('#pk-q').oninput = (e) => { q = e.target.value.trim().toLowerCase(); render(); };
    $$('#pk-cats .vchip').forEach(b => { b.onclick = () => { cat = b.dataset.c; $$('#pk-cats .vchip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }; });
    $('#pk-cadd').onclick = () => { const name = $('#pk-cname').value.trim(); if (!name) return; const k = String(Date.now()); const c = { name: name.slice(0, 120), d: Math.max(15, Number($('#pk-cmin').value) || 60), who: me, t: '14:00' }; state.custom[k] = c; put('custom', k, c); refreshCustomSeeds(); agInsert(day, 'c:' + k); closeSheet(); toast(t('applied')); };
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
    (((T.RAIN || {})[day] || []).length ? '<button class="act" type="button" id="rp-rain">' + t('rainSwap') + '</button>' : '') +
    '</div><div class="grp"><h3 style="font-size:16px">' + t('askAI') + '</h3><div class="exform two"><input id="rp-q" type="text" placeholder="' + t('askPlaceholder') + '" /><button type="button" id="rp-ask">✨</button></div><div id="rp-out"></div></div>';
  openSheet(html, () => {
    $('#rp-later').onclick = () => { if (!rows.length) return; const first = rows[0]; const st = agState(day); put('agenda', day, { ids: agIds(day), t: Object.assign({}, st.t || {}, { [first.it.id]: agPad(first.start + 60) }), d: st.d || {}, seen: (AGDAYS[day] || []).slice() }); closeSheet(); toast(t('shifted')); };
    $('#rp-lighter').onclick = () => {
      const cands = rows.filter(r => !r.it.lock).map(r => ({ r, s: r.it.place ? voteScore('p:' + r.it.place.id) : 0 })).sort((a, b) => a.s - b.s);
      const h = '<h3>' + t('whichDrop') + '</h3>' + cands.map(c => '<div class="pkrow" data-drop="' + esc(c.r.it.id) + '"><div class="pn">' + agHM(c.r.start) + ' ' + esc(stopLabel(c.r.it)) + '<small>' + (c.r.it.place ? voteBadges('p:' + c.r.it.place.id) : '') + '</small></div><button type="button" class="pk-b">✕</button></div>').join('');
      openSheet(h, () => { $$('#sheet [data-drop]').forEach(x => { x.onclick = () => { agSave(day, agIds(day).filter(id => id !== x.dataset.drop)); closeSheet(); toast(t('removed')); }; }); });
    };
    const rr = $('#rp-rain'); if (rr) rr.onclick = () => {
      const ids = agIds(day).filter(id => { const it = seedFor(id); return !(it.place && (it.place.tags || []).indexOf('outdoor') >= 0 && !it.lock); });
      const adds = ((T.RAIN || {})[day] || []).map(x => 'p:' + x).filter(r => PL[r.slice(2)] && ids.indexOf(r) < 0).slice(0, 3);
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
  const hubs = d.hubs || [];
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
      put('agenda', day, { ids, t: tt, d: dd, seen: (AGDAYS[day] || []).slice() }); closeSheet(); toast(t('applied'));
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
    if (q) { const hay = [p.name, p.nameRu, p.hood, p.sub, p.subRu, p.why, (p.tags || []).join(' ')].join(' ').toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  });
  if (EX.cat === 'all' || EX.cat === 'idea') Object.entries(state.custom || {}).forEach(([k, c]) => { if (c && !c.deleted && (!q || c.name.toLowerCase().indexOf(q) >= 0) && !EX.tags.size) list.push({ id: 'c:' + k, name: c.name, cat: 'idea', hood: '', sub: t('idea'), why: '', tags: [], custom: true, dur: c.d }); });
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
  cats.innerHTML = '<button class="vchip" type="button" data-c="all" aria-pressed="' + String(EX.cat === 'all') + '">' + L('All', 'Все') + '</button>' + ['see', 'museum', 'show', 'eat', 'drink', 'cafe', 'shop', 'park', 'daytrip', 'idea'].map(c => '<button class="vchip" type="button" data-c="' + c + '" aria-pressed="' + String(EX.cat === c) + '">' + catLabel(c) + '</button>').join('');
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
  if (EX.deck) { host.hidden = true; return; }
  host.hidden = false;
  host.innerHTML = list.length ? list.slice(0, 160).map(cardHtml).join('') : '<p class="gsub">' + t('noMatch') + '</p>';
  host.querySelectorAll('[data-card]').forEach(c => { c.onclick = () => openPlace(c.dataset.card); });
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
  $('#proposals').innerHTML = props.map(([k, c]) => { const ref = 'c:' + k; const v = votesFor(ref); return '<div class="voterow"><div class="vn"><a href="#" data-open="' + esc(ref) + '">' + esc(c.name) + '</a><small>' + (c.who ? whoName(c.who) + ' · ' : '') + (c.d || 60) + ' ' + t('minutes') + ' · ' + voteBadges(ref) + '</small></div><div class="vbtns">' + [['yes', '❤️'], ['maybe', '🤔'], ['no', '✕']].map(o => '<button type="button" data-v="' + o[0] + '" data-ref="' + esc(ref) + '" aria-pressed="' + String(!!me && v[me] === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>'; }).join('');
  const schedRefs = Array.from(sched).filter(x => !x.startsWith('x:'));
  $('#scheduled').innerHTML = schedRefs.length ? DAYKEYS.map(d => { const ids = agIds(d).filter(x => !x.startsWith('x:')); if (!ids.length) return ''; return '<div class="glg" style="margin-top:10px">' + dayLabel(d) + ' · ' + esc(dayTitle(DAYBYKEY[d])) + '</div>' + ids.map(ref => '<div class="voterow"><div class="vn"><a href="#" data-open="' + esc(seedFor(ref).place ? seedFor(ref).place.id : ref) + '">' + esc(nameOf(ref)) + '</a><small>' + voteBadges(ref) + '</small></div><div class="vwho">' + agHM(agReflow(d, agIds(d)).find(r => r.it.id === ref).start) + '</div></div>').join(''); }).join('') : '<p class="gsub">' + t('nothingYet') + '</p>';
  $$('#plan [data-open]').forEach(b => { b.onclick = (e) => { e.preventDefault(); openPlace(b.dataset.open); }; });
  $$('#plan [data-pick]').forEach(b => { b.onclick = () => { const ref = b.dataset.pick; pickDay(ref, seedFor(ref).place); }; });
  $$('#plan [data-v]').forEach(b => { b.onclick = () => setVote(b.dataset.ref, b.dataset.v); });
}

// ---------------------------------------------------------------- who
function renderWho() {
  $$('.whoslot').forEach(sl => {
    sl.innerHTML = '<p class="gsub" style="margin:0 0 6px">' + t('pickWho') + '</p><div class="who">' + TR.map(tr => '<button type="button" data-who="' + tr[0] + '" aria-pressed="' + String(me === tr[0]) + '">' + (tr[3] || '') + ' ' + esc(whoName(tr[0])) + '</button>').join('') + '</div>';
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
    html = '<div class="today"><div class="eyebrow">' + (showTomorrow ? t('tomorrow') : t('today')) + ' · ' + dayLabel(useKey) + (w ? ' · ' + w.ico + ' ' + w.hi + '°/' + w.lo + '°' : '') + (state.mike[useKey] && state.mike[useKey].on ? ' · 🎷' : '') + '</div><h3>' + esc(dayTitle(d)) + '</h3>' +
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
    wg.innerHTML = '<div class="wxstrip">' + DAYS.map(d => { const w = WX[d.key]; return '<div class="wxd' + (d.date === tk ? ' today' : '') + (state.mike[d.key] && state.mike[d.key].on ? ' mike' : '') + '" data-goday="' + d.key + '"><div class="d">' + dayLabel(d.key) + '</div><div class="i">' + (w ? w.ico : '·') + '</div><div class="t">' + (w ? w.hi + '°' : '') + '</div><div class="n">' + esc(dayTitle(d)) + '</div></div>'; }).join('') + '</div>';
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
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19 }).addTo(map);
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
    m.bindPopup('<b>' + esc(name) + '</b><br>' + (x.p ? esc([placeSub(x.p), x.p.hood].filter(Boolean).join(' · ')) + '<br><a href="#" data-mopen="' + esc(x.p.id) + '">' + L('Open', 'Открыть') + ' →</a>' : (x.start != null ? agHM(x.start) : '')));
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
const CHAT = { msgs: [] };
function addMsg(role, text, cls) { const d = document.createElement('div'); d.className = 'msg ' + (role === 'user' ? 'u' : 'a') + (cls ? ' ' + cls : ''); d.textContent = text; $('#msgs').appendChild(d); d.scrollIntoView({ block: 'end' }); return d; }
function chatContext() {
  const tk = todayKey(); const dk = DAYS.find(d => d.date === tk) || DAYS[0];
  const dayTxt = (k) => { const d = DAYBYKEY[k]; return dayLabel(k) + ' ' + d.title + ':\n' + agReflow(k, agIds(k)).map(r => '  ' + agHM(r.start) + ' ' + r.it.en + (r.it.place ? ' [' + r.it.place.hood + ']' : '')).join('\n') + (state.mike[k] && state.mike[k].on ? '\n  (Mike joins tonight)' : ''); };
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
    const r = await fetch(CFG.CONCIERGE_URL.replace(/\/$/, '') + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Trip-Key': CFG.TRIP_KEY || '' }, body: JSON.stringify({ messages: CHAT.msgs.slice(-12), today: new Date().toLocaleString(LOCALE[lang], { timeZone: T.TIMEZONE || 'America/New_York', dateStyle: 'full', timeStyle: 'short' }), context: chatContext() }) });
    const j = await r.json(); th.remove();
    const reply = (j && j.reply) || (j && j.error) || t('chatErr');
    addMsg('assistant', reply); CHAT.msgs.push({ role: 'assistant', content: reply });
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
  ['Y', 'T', 'M'].forEach(k => { const el = $('#name' + k); if (el && document.activeElement !== el) el.value = names[k] || ''; });
  const pp = $('#pacepick'); if (!pp) return;
  const cur = (state.settings.pace && state.settings.pace.v) || 'normal';
  pp.innerHTML = [['relaxed', t('paceRelaxedPick')], ['normal', t('paceNormalPick')], ['full', t('paceFullPick')]].map(x => '<button class="vchip" type="button" data-pace="' + x[0] + '" aria-pressed="' + String(cur === x[0]) + '">' + x[1] + '</button>').join('');
  pp.querySelectorAll('[data-pace]').forEach(b => { b.onclick = () => put('settings', 'pace', { v: b.dataset.pace }); });
}
function bindSettings() {
  ['Y', 'T', 'M'].forEach(k => { const el = $('#name' + k); if (!el) return; let h = null; el.addEventListener('input', () => { clearTimeout(h); h = setTimeout(() => { const v = Object.assign({}, (state.settings.names && state.settings.names.v) || {}); v[k] = el.value.trim().slice(0, 30); put('settings', 'names', { v }); }, 600); }); });
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

// ---------------------------------------------------------------- render all + init
function renderAll() {
  refreshCustomSeeds();
  renderWho(); renderAgendaAll(); renderPlan(); renderHome(); renderBookings(); renderNotes(); renderSettings(); renderTicker(); renderCount(); renderGuide();
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
  $('#propadd').onclick = () => { const name = $('#propin').value.trim(); if (!name) return; const k = String(Date.now()); const c = { name: name.slice(0, 120), d: Math.max(15, Number($('#propmin').value) || 90), who: me, t: '14:00' }; state.custom[k] = c; put('custom', k, c); refreshCustomSeeds(); if (me) setVote('c:' + k, 'yes'); $('#propin').value = ''; };
  $('#noteadd').onclick = () => { const v = $('#notein').value.trim(); if (!v) return; put('note', String(Date.now()), { who: me, text: v.slice(0, 500) }); $('#notein').value = ''; };
  $('#packadd').onclick = () => { const v = $('#packin').value.trim(); if (!v) return; put('pack', String(Date.now()), { text: v.slice(0, 120), who: me }); $('#packin').value = ''; };
  $('#resvadd').onclick = () => { const p = $('#resvplace').value.trim(); if (!p) return; put('resv', String(Date.now()), { place: p.slice(0, 120), when: $('#resvwhen').value, code: $('#resvcode').value.trim().slice(0, 120), who: me }); $('#resvplace').value = ''; $('#resvcode').value = ''; toast(t('saved')); };
  $('#icsexport').onclick = exportICS;
  $('#nearme').onclick = nearMe;
  $('#gohome').onclick = () => window.open(G.mapsDir(null, HOMEPT), '_blank', 'noopener');
  renderMapControls(); initChat();
  renderAll(); loadWeather(); sbInit();
  setInterval(() => { renderTicker(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderTicker(); renderHome(); } });
}
// expose a little for tests
window.NYC = { agIds, agReflow, dayStats, rankDays, buildWeek, seedFor, state, setTab, setDay, openPlace, buildICS, get me() { return me; }, set me(v) { me = v; }, PL };
init();
})();
