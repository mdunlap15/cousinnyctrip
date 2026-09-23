// ============================================================================
// TOUR — the first-run walkthrough. Each step spotlights a real element and
// explains it. `sel` is the element to highlight (the first match wins);
// `tab` is the tab to switch to first; `day` opens a day page; `open` opens a
// sheet ('replan' for the day, 'place' for the first place in Explore) that is
// closed again when the tour moves on; `demo: 'lookup'` types `example` into the
// Explore search (without searching) and restores the search box afterwards.
// A step whose element is missing is skipped rather than shown pointing at
// nothing, so the tour survives layout changes.
// ============================================================================
window.TOUR = {
  steps: [
    { key: 'welcome', tab: 'home', sel: null, icon: '🗽',
      title: 'Welcome to your week',
      titleRu: 'Добро пожаловать в вашу неделю',
      titleDe: 'Willkommen zu eurer Woche',
      body: 'Nine days in New York, already sketched out. Nothing here is fixed: every stop can be moved, retimed or swapped, and you decide together what the week actually looks like. This takes a minute.',
      bodyRu: 'Девять дней в Нью-Йорке — уже намечены. Ничего не высечено в камне: любую точку можно передвинуть, изменить время или заменить, и как именно пройдёт неделя, вы решаете вместе. Это займёт минуту.',
      bodyDe: 'Neun Tage in New York, schon skizziert. Nichts davon steht fest: Jeder Stopp lässt sich verschieben, umlegen oder austauschen, und wie die Woche wirklich aussieht, entscheidet ihr gemeinsam. Das hier dauert eine Minute.' },

    { key: 'who', tab: 'home', sel: '#home .who', icon: '👋',
      title: 'Tap your name first',
      titleRu: 'Сначала нажмите своё имя',
      titleDe: 'Tippt zuerst euren Namen an',
      body: 'This tells the app whose phone it is, so your ratings show up as yours and the other phones see them within a second. Do it once; it remembers.',
      bodyRu: 'Так приложение поймёт, чей это телефон: ваши оценки будут подписаны, а на других телефонах появятся через секунду. Достаточно одного раза — дальше запомнит.',
      bodyDe: 'Damit weiß die App, wessen Handy das ist: Eure Bewertungen werden euch zugeordnet und erscheinen auf den anderen Handys binnen einer Sekunde. Einmal antippen genügt, den Rest merkt sie sich.' },

    { key: 'today', tab: 'home', sel: '#todaycard .today', icon: '📍',
      title: 'Today, at a glance',
      titleRu: 'Сегодня — одним взглядом',
      titleDe: 'Heute auf einen Blick',
      body: 'Before the trip this counts down. During it, it shows the day\'s running order with the next stop marked, the weather, and a button that routes you home to 7th Avenue from wherever you are.',
      bodyRu: 'До поездки здесь идёт обратный отсчёт. Во время — расписание дня с отмеченной следующей точкой, погода и кнопка, которая построит маршрут домой на 7-ю авеню, где бы вы ни были.',
      bodyDe: 'Vor der Reise läuft hier der Countdown. Währenddessen zeigt es den Tagesablauf mit dem nächsten Stopp, das Wetter und eine Taste, die euch von überall nach Hause zur 7th Avenue navigiert.' },

    { key: 'days', tab: 'days', day: 'd1', sel: '.daystrip', icon: '📅',
      title: 'One page per day',
      titleRu: 'Одна страница на каждый день',
      titleDe: 'Eine Seite pro Tag',
      body: 'Tap a date up here, or swipe left and right anywhere on the page to move between days. The little number under each date is that day\'s forecast.',
      bodyRu: 'Нажмите дату наверху или листайте страницу влево-вправо, чтобы переходить между днями. Маленькая цифра под датой — прогноз погоды на этот день.',
      bodyDe: 'Tippt oben auf ein Datum oder wischt auf der Seite nach links und rechts, um zwischen den Tagen zu wechseln. Die kleine Zahl unter dem Datum ist die Vorhersage für diesen Tag.' },

    { key: 'order', tab: 'days', day: 'd1', sel: '.panel.is-active .agrow', icon: '✋',
      title: 'This is the part you edit',
      titleRu: 'Вот это вы и редактируете',
      titleDe: 'Das hier ist der Teil, den ihr bearbeitet',
      body: 'Hold a stop and drag it to reorder the day. Tap its time to pin it. Tap ⋯ to change how long you stay, move it to another day, or take it out. Everything recalculates as you go.',
      bodyRu: 'Зажмите пункт и перетащите, чтобы изменить порядок дня. Нажмите на время, чтобы закрепить его. Нажмите ⋯, чтобы изменить длительность, перенести в другой день или убрать. Всё пересчитывается на ходу.',
      bodyDe: 'Haltet einen Stopp gedrückt und zieht ihn, um den Tag umzusortieren. Tippt auf die Uhrzeit, um sie festzusetzen. Über ⋯ ändert ihr die Dauer, verschiebt ihn auf einen anderen Tag oder nehmt ihn heraus. Alles rechnet sich sofort neu.' },

    { key: 'travel', tab: 'days', day: 'd1', sel: '.panel.is-active .aggap', icon: '🚇',
      title: 'The gaps are real travel time',
      titleRu: 'Промежутки — это реальная дорога',
      titleDe: 'Die Lücken sind echte Fahrzeit',
      body: 'Between stops the app works out how long it actually takes by subway or on foot from Park Slope, so a day cannot quietly become impossible. Where a gap is underlined, tap it and it offers something nearby you have said yes to.',
      bodyRu: 'Между точками приложение считает, сколько на самом деле занимает дорога на метро или пешком от Парк-Слоуп, — так что день не станет незаметно невыполнимым. Если промежуток подчёркнут, нажмите на него: приложение предложит что-то рядом, чему вы сказали «да».',
      bodyDe: 'Zwischen den Stopps rechnet die App aus, wie lange es mit der U-Bahn oder zu Fuß ab Park Slope wirklich dauert — so wird ein Tag nicht unbemerkt unmöglich. Ist eine Lücke unterstrichen, tippt sie an: Dann schlägt sie etwas in der Nähe vor, zu dem ihr Ja gesagt habt.' },

    { key: 'pace', tab: 'days', day: 'd1', sel: '.panel.is-active .pace', icon: '🟢',
      title: 'How heavy the day is',
      titleRu: 'Насколько день загружен',
      titleDe: 'Wie voll der Tag ist',
      body: 'Green is comfortable, amber is a full day, red means too much. It counts real minutes, not stops, and an evening sitting down at dinner or in a theatre counts as half. If it turns red, drop something.',
      bodyRu: 'Зелёный — комфортно, жёлтый — насыщенный день, красный — перебор. Считаются реальные минуты, а не количество точек, и вечер за ужином или в зале считается за половину. Если загорелся красный — уберите что-нибудь.',
      bodyDe: 'Grün heißt angenehm, Gelb ein voller Tag, Rot zu viel. Gezählt werden echte Minuten, nicht Stopps — und ein Abend beim Essen oder im Theater zählt nur halb. Wird es rot, streicht etwas.' },

    { key: 'replan', tab: 'days', day: 'd1', sel: '.panel.is-active [data-replan]', icon: '🌧',
      title: 'When the day goes wrong',
      titleRu: 'Когда день пошёл не так',
      titleDe: 'Wenn der Tag schiefgeht',
      body: 'Rain, a late start, or simply too tired? Tap ✨ Replan. Its quick fixes shift the whole day an hour later, drop the stop you care least about, or swap the outdoor things for indoor ones. If it rains, the day page offers the indoor swaps by itself.',
      bodyRu: 'Дождь, поздний подъём или просто нет сил? Нажмите «✨ Перепланировать». Быстрые варианты сдвинут весь день на час позже, уберут то, что нужно меньше всего, или заменят уличное на то, что под крышей. Если пойдёт дождь, страница дня предложит замены сама.',
      bodyDe: 'Regen, ein später Start oder einfach zu müde? Tippt auf „✨ Neu planen“. Die schnellen Varianten verschieben den ganzen Tag um eine Stunde, streichen den Stopp, der euch am wenigsten wichtig ist, oder tauschen Draußen gegen Drinnen. Bei Regen bietet die Tagesseite die Alternativen von selbst an.' },

    // `open` opens a sheet for the step (and closes it when the tour moves on)
    { key: 'replanask', tab: 'days', day: 'd1', open: 'replan', sel: '#rp-askgrp', icon: '✨',
      title: 'Or let the concierge redo the day',
      titleRu: 'Или попросите консьержа переделать день',
      titleDe: 'Oder lasst den Concierge den Tag umbauen',
      body: 'At the bottom of Replan, tell the concierge what you want in your own words — “add a rooftop bar before dinner”, “swap the museum for shopping”, “we’re tired: one sight and home by nine”. It drafts a new running order from the places in here: new stops marked ＋, dropped ones struck through. Nothing changes until you tap ✓ Apply this draft.',
      bodyRu: 'Внизу окна «Перепланировать» напишите консьержу своими словами, чего хочется: «добавь бар на крыше перед ужином», «замени музей на шопинг», «мы устали: одно место и домой к девяти». Он составит новое расписание из мест этого приложения: новые пункты отмечены ＋, убранные — зачёркнуты. Ничего не изменится, пока вы не нажмёте «✓ Применить».',
      bodyDe: 'Unten in „Neu planen“ sagt ihr dem Concierge in euren eigenen Worten, was ihr wollt — „noch eine Dachbar vor dem Abendessen“, „statt Museum lieber Shopping“, „wir sind müde: eine Sehenswürdigkeit und um neun zu Hause“. Er entwirft aus den Orten hier einen neuen Tagesablauf: neue Stopps mit ＋, gestrichene durchgestrichen. Nichts ändert sich, bis ihr auf „✓ Entwurf übernehmen“ tippt.' },

    { key: 'explore', tab: 'explore', sel: '#exlist .card', icon: '🔍',
      title: 'Everything else worth doing',
      titleRu: 'Всё остальное, что стоит сделать',
      titleDe: 'Alles andere, was sich lohnt',
      body: 'Over three hundred places: sights, museums, restaurants, bars, cafés and shops. Tap any card for the opening hours, the price, what to order, and links straight to the website, the menu, tickets or a table.',
      bodyRu: 'Больше трёхсот мест: достопримечательности, музеи, рестораны, бары, кафе и магазины. Нажмите на любую карточку — там часы работы, цены, что заказать и ссылки прямо на сайт, меню, билеты или бронь.',
      bodyDe: 'Über dreihundert Orte: Sehenswürdigkeiten, Museen, Restaurants, Bars, Cafés und Läden. Tippt eine Karte an für Öffnungszeiten, Preis, was man bestellt — und Links direkt zur Website, zur Karte, zu Tickets oder zum Tisch.' },

    { key: 'exfind', tab: 'explore', sel: '#exfind', icon: '🧭',
      title: 'Narrow it down',
      titleRu: 'Сузьте выбор',
      titleDe: 'Eingrenzen',
      body: 'Search by name, dish or neighbourhood; the chips pick a category, and Filters adds the rest — free, near home, good on a rainy day. Sort by your votes, or by how close things are to home.',
      bodyRu: 'Ищите по названию, блюду или району; кнопки выбирают категорию, а «Фильтры» добавляют остальное — бесплатно, рядом с домом, на дождливый день. Сортируйте по вашим голосам или по тому, насколько близко к дому.',
      bodyDe: 'Sucht nach Namen, Gericht oder Viertel; die Chips wählen eine Kategorie, „Filter“ ergänzt den Rest — kostenlos, nah bei uns, gut bei Regen. Sortiert nach euren Stimmen oder danach, wie nah etwas an der Wohnung liegt.' },

    // `demo` sets the page up for the step: here, an example typed into the
    // Explore search so its "search all of New York" button is showing. Nothing
    // is actually searched, and the search box is put back afterwards.
    { key: 'exlookup', tab: 'explore', demo: 'lookup', example: 'Nami Nori', sel: '#exlook .lookup', icon: '🌐',
      title: 'Not in the app? Find it anyway',
      titleRu: 'Нет в приложении? Найдите всё равно',
      titleDe: 'Nicht in der App? Trotzdem finden',
      body: 'Type the name of any place in New York — a restaurant someone mentioned, a bar, a shop — and tap 🔎 Search all of New York. If the map does not know it, 🌐 Search the web finds it online. Tap a result to put it in your ideas or straight onto a day.',
      bodyRu: 'Наберите название любого места в Нью-Йорке — ресторана, который вам посоветовали, бара, магазина — и нажмите кнопку 🔎 поиска по всему Нью-Йорку. Если на карте его нет, кнопка 🌐 найдёт его в интернете. Нажмите на результат — и место попадёт в ваши идеи или сразу в нужный день.',
      bodyDe: 'Tippt den Namen eines beliebigen Ortes in New York ein — ein Restaurant, das euch jemand empfohlen hat, eine Bar, einen Laden — und dann auf 🔎 „In ganz New York … suchen“. Kennt die Karte ihn nicht, findet 🌐 „Im Web suchen“ ihn online. Ein Tipp auf ein Ergebnis legt ihn zu euren Ideen oder direkt auf einen Tag.' },

    { key: 'explace', tab: 'explore', open: 'place', sel: '#sheet .shdecide', icon: '❤️',
      title: 'Vote, then put it on a day',
      titleRu: 'Голосуйте — и в нужный день',
      titleDe: 'Abstimmen, dann auf einen Tag legen',
      body: 'Every place has its own page: hours, prices, what to order, links. Rate it here — ❤️ yes, 🤔 maybe, ✕ no. The other phones see it at once, and what you agree on rises to the top. 📅 Add to a day suggests the day it fits best: the right neighbourhood, open that weekday, not already full.',
      bodyRu: 'У каждого места своя страница: часы работы, цены, что заказать, ссылки. Оцените его здесь — ❤️ «да», 🤔 «может быть», ✕ «нет». Другие телефоны увидят это сразу, а то, в чём вы сходитесь, поднимется наверх. «📅 Добавить в день» подскажет, какой день подходит лучше всего: нужный район, открыто в этот день недели, день ещё не перегружен.',
      bodyDe: 'Jeder Ort hat seine eigene Seite: Öffnungszeiten, Preise, was man bestellt, Links. Bewertet ihn hier — ❤️ ja, 🤔 vielleicht, ✕ nein. Die anderen Handys sehen es sofort, und worin ihr euch einig seid, steigt nach oben. „📅 Zu einem Tag hinzufügen“ schlägt den Tag vor, der am besten passt: das richtige Viertel, an dem Wochentag geöffnet, noch nicht voll.' },

    { key: 'swipe', tab: 'explore', sel: '#swipebtn', icon: '🃏',
      title: 'The fast way to choose',
      titleRu: 'Быстрый способ выбрать',
      titleDe: 'Der schnelle Weg zu entscheiden',
      body: 'Swipe mode deals the places one at a time: right for yes, left for no, up for maybe. Ten minutes each on the sofa and the app knows what your week should be.',
      bodyRu: 'В режиме свайпа места показываются по одному: вправо — «да», влево — «нет», вверх — «может быть». По десять минут на диване на человека — и приложение уже знает, какой должна быть ваша неделя.',
      bodyDe: 'Im Swipe-Modus kommen die Orte einzeln: rechts ja, links nein, hoch vielleicht. Zehn Minuten pro Person auf dem Sofa, und die App weiß, wie eure Woche aussehen sollte.' },

    { key: 'plan', tab: 'plan', sel: '#buildweek', icon: '✨',
      title: 'Turn the votes into a week',
      titleRu: 'Превратить голоса в неделю',
      titleDe: 'Aus den Stimmen eine Woche machen',
      body: 'Everything you said yes to gathers here, what most of you want first. This button slots those into the days that actually fit them — right neighbourhood, open that weekday, without overfilling anything — and shows you the result before saving.',
      bodyRu: 'Всё, чему вы сказали «да», собирается здесь — сначала то, чего хочет большинство. Эта кнопка расставит их по дням, которые действительно подходят: нужный район, открыто в этот день недели, без перегруза — и покажет результат до сохранения.',
      bodyDe: 'Alles, wozu ihr Ja gesagt habt, sammelt sich hier — zuerst, was die meisten von euch wollen. Diese Taste verteilt es auf die Tage, die wirklich passen — richtiges Viertel, an dem Wochentag geöffnet, ohne etwas zu überfüllen — und zeigt euch das Ergebnis vor dem Speichern.' },

    { key: 'chat', tab: 'chat', sel: '#chatbox', icon: '💬',
      title: 'Ask the concierge anything',
      titleRu: 'Спросите консьержа о чём угодно',
      titleDe: 'Fragt den Concierge alles',
      body: 'It knows your plan, all three hundred places in here, and how long each one takes from Park Slope. Ask it in your own language: what to swap when it rains, somewhere to eat near the Met, whether a shop opens on a Sunday. Tap any place it suggests to open it, or to add it to your ideas. The ✨ Replan button on each day asks it too.',
      bodyRu: 'Он знает ваш план, все триста мест из этого приложения и сколько до каждого добираться от Парк-Слоуп. Спрашивайте на своём языке: что заменить в дождь, где поесть рядом с Метрополитен, работает ли магазин в воскресенье. Нажмите на любое предложенное им место, чтобы открыть его или добавить в идеи. Кнопка «✨ Перепланировать» на каждом дне обращается к нему же.',
      bodyDe: 'Er kennt euren Plan, alle dreihundert Orte hier drin und wie lange jeder einzelne von Park Slope aus dauert. Fragt ihn in eurer eigenen Sprache: was man bei Regen tauscht, wo man in der Nähe des Met isst, ob ein Laden sonntags öffnet. Tippt auf einen Ort, den er vorschlägt, um ihn zu öffnen oder zu euren Ideen hinzuzufügen. Die Taste „✨ Neu planen“ an jedem Tag fragt ihn ebenfalls.' },

    { key: 'lang', tab: 'home', sel: '#langbtn', icon: '🌍',
      title: 'English, Russian, German',
      titleRu: 'Английский, русский, немецкий',
      titleDe: 'Englisch, Russisch, Deutsch',
      body: 'This button switches the whole app, every place description included. Each phone keeps its own language, so one of you can read it in Russian while another reads German.',
      bodyRu: 'Эта кнопка переключает всё приложение, включая описания всех мест. У каждого телефона свой язык, так что на одном можно читать по-русски, а на другом — по-немецки.',
      bodyDe: 'Diese Taste schaltet die ganze App um, samt aller Ortsbeschreibungen. Jedes Handy behält seine eigene Sprache — auf dem einen liest man Russisch, auf dem anderen Deutsch.' },

    { key: 'done', tab: 'home', sel: null, icon: '🎉',
      title: 'That\'s everything',
      titleRu: 'Вот и всё',
      titleDe: 'Das war alles',
      body: 'Start by rating a few places, then press Build my week — or just ask the concierge where to begin. You can run this tour again any time from More. Have a wonderful trip.',
      bodyRu: 'Начните с оценки нескольких мест, потом нажмите «Собрать неделю» — или просто спросите консьержа, с чего начать. Этот тур можно запустить снова в любой момент из раздела «Ещё». Прекрасной вам поездки!',
      bodyDe: 'Fangt damit an, ein paar Orte zu bewerten, und drückt dann „Woche bauen“ — oder fragt einfach den Concierge, womit ihr anfangen sollt. Diese Tour könnt ihr jederzeit unter „Mehr“ noch einmal starten. Habt eine wunderbare Reise.' },
  ],
};
