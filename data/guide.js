// ============================================================================
// GUIDE — the practical briefing: getting in and out, the subway from 7th
// Avenue, money, phones, weather, safety. Each section has EN + RU bodies in a
// tiny markdown (paragraphs, **bold**, "- " bullets, [text](url) links).
// Facts marked (confirm) were written from memory in Sep 2026 — tap through.
// ============================================================================
window.GUIDE = {
  sections: [
    { key: 'arrival', icon: '🛬', title: 'Arrival · Sat Sep 26', titleRu: 'Прилёт · сб 26 сентября',
      en: `**LH 400 lands at JFK Terminal 1 at 1:35 pm.** Lufthansa has used Terminal 1 for years; JFK's *New Terminal One* opens in phases during 2026, so glance at the terminal on the boarding pass and at [jfkairport.com](https://www.jfkairport.com/) the day before (confirm). Passport control with ESTA usually takes 30–60 minutes on a Saturday afternoon; bags another 15. Expect to be kerbside around 2:45–3:00 pm.

**Best with luggage: yellow taxi or Uber/Lyft to Park Slope.** Follow the *Taxi* signs (never accept a ride from someone soliciting inside). JFK → Brooklyn is metered (the $70 flat fare is only for Manhattan): plan on **$75–90 + tip**, about **50–70 minutes** via the Belt Parkway and Prospect Expressway. Uber/Lyft pick up at the designated rideshare area and cost about the same.

**Cheapest: AirTrain + subway (~$12, ~75–90 min).** AirTrain ($8.50, tap OMNY at the exit) to *Jamaica Station*, then either the **E train** to Jay St–MetroTech and the **F/G** two stops to 15th St–Prospect Park (home is a 6-minute walk), or the **LIRR** from Jamaica to *Atlantic Terminal* (20 min, CityTicket ~$7) then the **R** to 4th Ave–9th St and a 12-minute uphill walk. Fine for a light bag, tiring after nine hours in the air.

**On the day:** Yulia can track LH 400 on [FlightAware](https://flightaware.com/live/flight/DLH400). Meeting at Terminal 1 arrivals and sharing a taxi home is the nicest welcome.`,
      ru: `**LH 400 садится в JFK, Терминал 1, в 13:35.** Lufthansa много лет летает в Терминал 1; в 2026 году поэтапно открывается *New Terminal One*, поэтому накануне проверьте терминал в посадочном и на [jfkairport.com](https://www.jfkairport.com/) (уточнить). Паспортный контроль по ESTA в субботу днём обычно занимает 30–60 минут, багаж — ещё 15. На улице вы окажетесь примерно в 14:45–15:00.

**С чемоданом удобнее всего — жёлтое такси или Uber/Lyft до Парк-Слоуп.** Идите по указателям *Taxi* (никогда не садитесь к тем, кто предлагает подвезти внутри терминала). JFK → Бруклин по счётчику (фиксированные $70 — только в Манхэттен): рассчитывайте на **$75–90 + чаевые**, около **50–70 минут** по Belt Parkway и Prospect Expressway. Uber/Lyft забирают в специальной зоне и стоят примерно столько же.

**Дешевле всего — AirTrain + метро (~$12, ~75–90 мин).** AirTrain ($8.50, приложите карту к OMNY на выходе) до *Jamaica Station*, затем либо **поезд E** до Jay St–MetroTech и **F/G** две остановки до 15th St–Prospect Park (до дома 6 минут пешком), либо **LIRR** от Jamaica до *Atlantic Terminal* (20 мин, CityTicket ~$7), потом **R** до 4th Ave–9th St и 12 минут пешком в горку. Нормально с лёгкой сумкой, утомительно после девяти часов в воздухе.

**В день прилёта:** Юля может следить за LH 400 на [FlightAware](https://flightaware.com/live/flight/DLH400). Встретить в зале прилёта Терминала 1 и вместе доехать домой на такси — самый тёплый вариант.` },
    { key: 'departure', icon: '🛫', title: 'Departure · Sun Oct 4', titleRu: 'Вылет · вс 4 октября',
      en: `**LH 411 leaves JFK Terminal 1 at 5:30 pm** (Munich 7:20 am Monday, then LH 4072 at 11:15 to Hannover, landing 12:25). Check in online 23 hours before; Lufthansa's economy allowance on this fare is one 23 kg checked bag plus 8 kg cabin (confirm on the booking).

**Leave Park Slope by 2:00 pm.** Sunday afternoon traffic is light — a taxi or Uber takes 40–55 minutes — and 3 hours before an international departure is the comfortable buffer. Book the car the night before if you want a fixed price.

**At JFK:** security at Terminal 1 can be slow on Sunday evenings; there is a reasonable food court after security but nothing worth arriving early for. Any shopping over the duty-free allowance goes in the checked bag — and there is no sales-tax refund in New York, so don't look for a customs desk.

**Time change on landing:** Munich is 6 hours ahead of New York. Sleep on the plane after the meal; the Monday connection is short.`,
      ru: `**LH 411 вылетает из JFK, Терминал 1, в 17:30** (Мюнхен 07:20 в понедельник, затем LH 4072 в 11:15 в Ганновер, прилёт 12:25). Онлайн-регистрация открывается за 23 часа; в эконом-тарифе Lufthansa обычно один чемодан 23 кг плюс 8 кг ручной клади (уточните в бронировании).

**Выезжайте из Парк-Слоуп к 14:00.** В воскресенье днём дороги свободные — такси или Uber едут 40–55 минут, — а 3 часа до международного вылета — комфортный запас. Чтобы цена была фиксированной, закажите машину накануне вечером.

**В JFK:** досмотр в Терминале 1 воскресным вечером бывает медленным; после досмотра есть приличный фуд-корт, но ради него приезжать заранее не стоит. Покупки сверх нормы беспошлинного ввоза — в чемодан; возврата налога с продаж в Нью-Йорке нет, так что таможенное окно искать не нужно.

**Смена времени по прилёте:** Мюнхен на 6 часов впереди Нью-Йорка. Поспите в самолёте после ужина — стыковка в понедельник короткая.` },
    { key: 'subway', icon: '🚇', title: 'The subway from 7th Avenue', titleRu: 'Метро от 7-й авеню',
      en: `**Pay with OMNY:** tap any contactless Visa/Mastercard, Apple Pay or Google Pay at the turnstile — no MetroCard, no app. Each ride is **$3.00** (fare rose in January 2026; confirm) and after **12 paid rides in a Monday–Sunday week on the same card**, the rest of the week is free. Use the *same* card or phone every time so the cap counts; Tatyana's German contactless card works fine.

**Stations near home (490A 7th Ave, at 16th St):**
- **15th St–Prospect Park (F/G)** — 6 min walk east along 16th St to Bartel-Pritchard Square. The F goes straight to Manhattan: Delancey/LES 25 min, Broadway-Lafayette/SoHo 28, W 4th/Village 30, 14th/Chelsea 33, 42nd–Bryant Park 38, Rockefeller Center 42, Lexington–63rd for the Upper East Side 48. The G goes to Carroll Gardens, Williamsburg (Metropolitan Av, 25 min) and Greenpoint.
- **7th Ave (F/G)** — at 9th St, 9 min walk; same lines, Park Slope's main street on the way.
- **4th Ave–9th St (F/G/R)** — 12 min; the **R** is the local to Union St, Atlantic Av–Barclays (2/3/4/5/B/D/Q/N transfers), Whitehall St for the Statue ferry (30 min), Cortlandt St for the WTC (32), Prince St for SoHo, Union Square, 34th, Times Square (48).
- **Grand Army Plaza (2/3)** — 15 min walk up through the park's edge; express to Clark St (Brooklyn Heights), Wall St, Chambers, 14th, Times Square (35), 72nd, and the Upper West Side / Natural History.
- **7th Ave (B/Q)** at Flatbush — 15 min; the Q reaches 57th St and the Upper East Side's Second Avenue line (72nd–96th) without changing.

**Express vs local:** diamond-shaped bullets on the board mean express — it skips stations. Weekend service changes are constant: check the **MTA app** or [new.mta.info](https://new.mta.info/) on Saturday and Sunday mornings, and the *Weekender* posters in the station. Trains run all night; after midnight the F comes every 20 minutes, so a $35–55 Uber home from Manhattan is the sane option after a late show.

**Etiquette:** let people off first, stand right on escalators, backpacks off in a full car, no eye contact required. Ask the booth or any New Yorker — people are genuinely helpful when asked.`,
      ru: `**Оплата через OMNY:** просто прикладывайте бесконтактную Visa/Mastercard, Apple Pay или Google Pay к турникету — ни MetroCard, ни приложения не нужно. Поездка стоит **$3.00** (тариф подняли в январе 2026; уточнить), а после **12 оплаченных поездок за неделю с понедельника по воскресенье одной картой** остаток недели бесплатно. Прикладывайте всегда *одну и ту же* карту или телефон, чтобы считался лимит; немецкая бесконтактная карта Тани подходит.

**Станции рядом с домом (490A 7th Ave, у 16-й улицы):**
- **15th St–Prospect Park (F/G)** — 6 минут пешком на восток по 16-й улице до Bartel-Pritchard Square. F идёт прямо в Манхэттен: Delancey/Лоуэр-Ист-Сайд 25 мин, Broadway-Lafayette/Сохо 28, W 4th/Виллидж 30, 14th/Челси 33, 42nd–Bryant Park 38, Rockefeller Center 42, Lexington–63rd для Верхнего Ист-Сайда 48. G идёт в Кэрролл-Гарденс, Уильямсбург (Metropolitan Av, 25 мин) и Гринпойнт.
- **7th Ave (F/G)** — у 9-й улицы, 9 минут пешком; те же линии, по пути главная улица Парк-Слоуп.
- **4th Ave–9th St (F/G/R)** — 12 минут; **R** — локальный поезд до Union St, Atlantic Av–Barclays (пересадки на 2/3/4/5/B/D/Q/N), Whitehall St к парому на Статую (30 мин), Cortlandt St к ВТЦ (32), Prince St в Сохо, Union Square, 34th, Times Square (48).
- **Grand Army Plaza (2/3)** — 15 минут пешком вдоль парка; экспресс до Clark St (Бруклин-Хайтс), Wall St, Chambers, 14th, Times Square (35), 72nd и Верхнего Вест-Сайда / Музея естественной истории.
- **7th Ave (B/Q)** на Флэтбуш — 15 минут; Q без пересадок доезжает до 57th St и до линии Второй авеню в Верхнем Ист-Сайде (72nd–96th).

**Экспресс и локальный:** ромбовидный значок на табло — экспресс, он пропускает станции. По выходным маршруты постоянно меняют: утром в субботу и воскресенье смотрите **приложение MTA** или [new.mta.info](https://new.mta.info/) и плакаты *Weekender* на станции. Поезда ходят всю ночь; после полуночи F ходит раз в 20 минут, так что после позднего шоу Uber домой из Манхэттена за $35–55 — разумный вариант.

**Этикет:** сначала выпускайте выходящих, на эскалаторе стойте справа, в полном вагоне снимайте рюкзак, смотреть в глаза необязательно. Спрашивайте в будке или любого ньюйоркца — на вопрос люди отвечают охотно.` },
    { key: 'money', icon: '💵', title: 'Money, tipping & tax', titleRu: 'Деньги, чаевые и налоги',
      en: `**Cards everywhere**, including the subway and most food carts; keep $40–60 in small bills for tips, a slice, a flea market. ATMs at Chase/Citi/TD branches charge non-customers about $3; the ones in bodegas charge more.

**Tipping is not optional:** restaurants **18–22%** on the pre-tax total (20% is the easy default; the card machine will offer buttons), bars **$1–2 per drink** or 20% on a tab, taxis and Uber **15–20%**, hotel-bar table service 20%, hair or nails 20%, coat check $2. Counter coffee: round up or skip.

**Sales tax** of 8.875% is added at the register, so prices on shelves are pre-tax. **Clothing and shoes under $110 per item are tax-free in New York City** — most boutique purchases qualify; a $300 dress does not. There is **no VAT-style refund** for tourists.

**Menus:** appetizer + main + a glass of wine lands at $70–110 per person before tip at the restaurants in this app marked $$$; $$ places about half that; pizza slices $4–5; cocktails $18–26; a hotel-lobby-bar drink $24–30.`,
      ru: `**Карты принимают везде**, включая метро и большинство фуд-каров; держите $40–60 мелкими купюрами на чаевые, кусок пиццы, блошиный рынок. Банкоматы в отделениях Chase/Citi/TD берут с чужих клиентов около $3; в мини-маркетах — больше.

**Чаевые обязательны:** в ресторанах **18–22%** от суммы до налога (20% — простое правило; терминал предложит кнопки), в барах **$1–2 за напиток** или 20% от счёта, такси и Uber **15–20%**, в баре отеля с обслуживанием за столиком 20%, парикмахер или маникюр 20%, гардероб $2. Кофе у стойки — округлите или пропустите.

**Налог с продаж** 8,875% добавляют на кассе, поэтому цены на полках указаны без налога. **Одежда и обувь дешевле $110 за вещь в Нью-Йорке не облагаются налогом** — под это подпадает большинство покупок в бутиках; платье за $300 — нет. **Возврата налога для туристов нет.**

**Ориентиры по счёту:** закуска + основное + бокал вина — $70–110 на человека до чаевых в ресторанах, отмеченных в приложении $$$; в местах $$ примерно вдвое меньше; кусок пиццы $4–5; коктейли $18–26; напиток в лобби-баре отеля $24–30.` },
    { key: 'phone', icon: '📱', title: 'Phone, plugs & paperwork', titleRu: 'Телефон, розетки и документы',
      en: `**ESTA** must already be approved for a German passport before boarding (apply at [esta.cbp.dhs.gov](https://esta.cbp.dhs.gov/), $40, ideally 72 hours ahead; it is valid two years). Keep a screenshot of the approval and of the return flight — officers sometimes ask where you are staying: *490A 7th Avenue, Brooklyn 11215, at my cousin's*.

**Mobile data:** an eSIM is the painless option — [Airalo](https://www.airalo.com/united-states-esim) or [Holafly](https://esim.holafly.com/) US plans (buy before flying, activate on landing); or a T-Mobile prepaid SIM in any T-Mobile store. EU roaming packages for the US are usually expensive per day. The apartment, cafés and most museums have Wi-Fi; LinkNYC kiosks on the street give free gigabit Wi-Fi.

**Plugs:** US type A/B, 120 V. Phones and laptops are fine with a simple adapter; a European hair dryer or straightener needs a 120 V-capable one (most dual-voltage ones are — check the label).

**Apps to install now:** MTA (subway), Citymapper (best door-to-door directions), Uber and Lyft, Resy and OpenTable (tables), TodayTix (theater), Google Maps offline map of NYC. This app works offline once added to the home screen.`,
      ru: `**ESTA** для немецкого паспорта должна быть одобрена ещё до посадки (заявка на [esta.cbp.dhs.gov](https://esta.cbp.dhs.gov/), $40, лучше за 72 часа; действует два года). Сохраните скриншот одобрения и обратного билета — на границе иногда спрашивают, где вы остановитесь: *490A 7th Avenue, Brooklyn 11215, у кузины*.

**Мобильный интернет:** проще всего eSIM — тарифы США у [Airalo](https://www.airalo.com/united-states-esim) или [Holafly](https://esim.holafly.com/) (купить до вылета, активировать по прилёте); либо предоплаченная SIM T-Mobile в любом магазине T-Mobile. Европейский роуминг в США обычно дорог по дням. В квартире, кафе и большинстве музеев есть Wi-Fi; киоски LinkNYC на улицах раздают бесплатный быстрый Wi-Fi.

**Розетки:** американские типа A/B, 120 В. Телефонам и ноутбукам достаточно простого переходника; европейскому фену или утюжку нужна модель на 120 В (большинство — с переключаемым напряжением, проверьте на этикетке).

**Приложения, которые стоит поставить сейчас:** MTA (метро), Citymapper (лучшие маршруты от двери до двери), Uber и Lyft, Resy и OpenTable (столики), TodayTix (театр), офлайн-карта Нью-Йорка в Google Maps. Это приложение работает офлайн, если добавить его на главный экран.` },
    { key: 'weather', icon: '🍂', title: 'Weather & what to pack', titleRu: 'Погода и что взять',
      en: `**Late September into early October is New York's best week:** typical highs of 20–23 °C, lows around 13–15 °C, low humidity, roughly one wet day in three. Evenings on the water (Pier 1, the Brooklyn Bridge, rooftops) feel 5 degrees cooler with the breeze.

**Pack:** one warm layer for evenings (a light jacket or trench), a compact umbrella, and above all **shoes you can walk 15,000 steps in** — the plan averages 8–12 km a day on foot. Cocktail bars and the Broadway night are smart-casual, never formal; Bemelmans and Le Bernardin are the only places where jeans-and-sneakers would feel underdressed.

**Sun:** rises about 6:45 am and sets **6:45 pm on Sep 26, drifting to 6:31 pm by Oct 4** — the sunset stops in the plan (Pier 1, Top of the Rock) are timed to that. The live forecast on each day page is from Open-Meteo for Park Slope.`,
      ru: `**Конец сентября — начало октября — лучшая неделя Нью-Йорка:** обычно днём 20–23 °C, ночью 13–15 °C, сухо, дождь примерно в один день из трёх. Вечером у воды (пирс 1, Бруклинский мост, крыши) из-за ветра ощущается градусов на пять холоднее.

**Что взять:** одну тёплую вещь на вечер (лёгкую куртку или тренч), компактный зонт и главное — **обувь, в которой можно пройти 15 000 шагов**: план предполагает 8–12 км пешком в день. В коктейльных барах и на бродвейский вечер — smart casual, никакого дресс-кода; разве что в Bemelmans и Le Bernardin в джинсах и кроссовках будет чуть неловко.

**Солнце:** встаёт около 6:45, садится **в 18:45 26 сентября и в 18:31 к 4 октября** — закатные точки в плане (пирс 1, Top of the Rock) рассчитаны на это. Прогноз на страницах дней — живой, от Open-Meteo для Парк-Слоуп.` },
    { key: 'safety', icon: '🆘', title: 'Safety & emergencies', titleRu: 'Безопасность и экстренные случаи',
      en: `New York in 2026 is safer than its reputation: the tourist neighborhoods and everything in this app are fine at any hour with normal city sense — phone in a front pocket in Times Square and on crowded platforms, bag zipped in Chinatown crowds, an Uber rather than a long walk after midnight.

- **Emergency: 911** (police, fire, ambulance). Non-emergency city help: **311**.
- **Nearest ER to home:** NewYork-Presbyterian Brooklyn Methodist Hospital, 506 6th St at 7th Ave — a 12-minute walk up the avenue. Urgent care (walk-in, no appointment, ~$150–250 without insurance): CityMD on 7th Ave near 9th St (confirm hours).
- **Pharmacies** along 7th Avenue (Walgreens/Duane Reade, CVS); pharmacists can suggest over-the-counter equivalents of German medicines — bring the packaging.
- **German Consulate General New York:** 871 United Nations Plaza, +1 212 610 9700 — for a lost passport (file a police report first at any precinct; 78th Precinct is at 6th Ave & Bergen St).
- **Travel insurance:** keep the policy number and the 24-hour line in your phone; US care is billed in full without it.
- **Lost & found:** subway items → MTA Lost & Found at 34th St–Penn Station; taxis → the receipt's medallion number at [nyc.gov/taxi](https://www.nyc.gov/site/tlc/passengers/lost-property.page).`,
      ru: `Нью-Йорк в 2026 году безопаснее своей репутации: туристические районы и всё, что есть в этом приложении, спокойно посещать в любое время с обычной городской осторожностью — телефон в переднем кармане на Таймс-сквер и на переполненных платформах, сумка застёгнута в толпе Чайнатауна, после полуночи Uber вместо долгой прогулки.

- **Экстренный номер: 911** (полиция, пожарные, скорая). Городская справочная не для экстренных случаев: **311**.
- **Ближайшая скорая к дому:** NewYork-Presbyterian Brooklyn Methodist Hospital, 506 6th St на углу 7th Ave — 12 минут пешком по авеню. Urgent care (без записи, ~$150–250 без страховки): CityMD на 7th Ave у 9th St (уточнить часы).
- **Аптеки** вдоль 7-й авеню (Walgreens/Duane Reade, CVS); фармацевт подскажет аналог немецкого лекарства — возьмите с собой упаковку.
- **Генконсульство Германии в Нью-Йорке:** 871 United Nations Plaza, +1 212 610 9700 — при утере паспорта сначала заявление в любом полицейском участке (78-й участок — 6th Ave и Bergen St).
- **Страховка:** номер полиса и круглосуточную линию держите в телефоне; без страховки медицина в США оплачивается полностью.
- **Потерянные вещи:** в метро → MTA Lost & Found на 34th St–Penn Station; в такси → по номеру медальона из чека на [nyc.gov/taxi](https://www.nyc.gov/site/tlc/passengers/lost-property.page).` },
    { key: 'passes', icon: '🎟️', title: 'Tickets, passes & lines', titleRu: 'Билеты, пассы и очереди',
      en: `**Skip the bundles.** CityPASS (about $150 for five attractions) only pays off if you do four or more paid sights; this plan has two or three (Statue ferry ~$25 with pedestal, Top of the Rock ~$45–60, the Met $30), so buy individually — each card in the app links straight to the official ticket page.

**Book ahead, in this order:** Statue City Cruises with pedestal (sells out), Top of the Rock sunset slot, the Wednesday dinner (Resy opens 30 days out), Village Vanguard, Comedy Cellar, the farewell dinner. Everything else is walk-up.

**Broadway for less:** the **TKTS booth** under the red steps in Times Square sells same-day seats at 20–50% off from 3 pm (11 am for matinees; show the app's list before queuing). **TodayTix** runs digital lotteries and rush tickets released each morning. Most shows are dark on Monday; Tuesday and Wednesday evenings are the easiest to get into.

**Museums for free:** MoMA is free on Friday evenings (UNIQLO Free Fridays, timed tickets released online at 4 pm), the Whitney on Friday evenings and second Sundays, the Brooklyn Museum on First Saturday (Oct 3, 5–11 pm), and the Met, Natural History and Brooklyn Museum are pay-what-you-wish for New York State residents — Yulia pays what she likes, Tatyana pays full price (confirm current rules on each site).`,
      ru: `**Пакеты не нужны.** CityPASS (около $150 за пять достопримечательностей) окупается, только если платных мест четыре и больше; в этом плане их два-три (паром к Статуе ~$25 с пьедесталом, Top of the Rock ~$45–60, Метрополитен $30), так что покупайте по отдельности — каждая карточка в приложении ведёт прямо на официальную страницу билетов.

**Бронировать заранее, в таком порядке:** Statue City Cruises с пьедесталом (распродаётся), закатный слот Top of the Rock, ужин в среду (Resy открывается за 30 дней), Village Vanguard, Comedy Cellar, прощальный ужин. Всё остальное — без брони.

**Бродвей дешевле:** будка **TKTS** под красными ступенями на Таймс-сквер продаёт билеты на сегодня со скидкой 20–50% с 15:00 (на дневные — с 11:00; список показов смотрите в приложении до очереди). **TodayTix** проводит цифровые лотереи и выкладывает rush-билеты каждое утро. По понедельникам большинство шоу не идёт; во вторник и среду вечером попасть проще всего.

**Музеи бесплатно:** MoMA — вечером в пятницу (UNIQLO Free Fridays, билеты по времени появляются онлайн в 16:00), Уитни — вечером в пятницу и во второе воскресенье, Бруклинский музей — в первую субботу (3 октября, 17:00–23:00), а Метрополитен, Музей естественной истории и Бруклинский музей для жителей штата Нью-Йорк — «плати сколько хочешь»: Юля платит сколько хочет, Таня — полную цену (проверьте правила на сайтах).` },
    { key: 'home', icon: '🏡', title: 'Home turf: Park Slope', titleRu: 'Свой район: Парк-Слоуп',
      en: `The apartment sits at the quiet end of 7th Avenue, six blocks below the F/G at 9th Street and a five-minute walk from Prospect Park at Bartel-Pritchard Square. **7th Avenue** is the daily street (bagels, pharmacies, a Key Food, Winner bakery a few blocks north); **5th Avenue**, one long block downhill, is the restaurant and bar street (al di là, Fonda, Stone Park Cafe, Miriam, Union Hall, Blueprint). **Prospect Park West** and the brownstone side streets between 1st and 9th are the postcard.

**Coffee near home:** Café Regular (11th St), Winner (7th Ave at 8th), Colson Patisserie (9th St at 6th Ave), Gorilla Coffee (5th Ave). **Bagels:** Bagel Pub (7th Ave at 7th St) or Terrace Bagels (Windsor Terrace). **Groceries and wine:** Key Food on 7th, Union Market on 7th, the Park Slope Food Coop is members-only. **Green-Wood Cemetery's** main gate is a 15-minute walk south — the best quiet walk in Brooklyn.

**Late-night home:** the F at 15th St runs all night; from Manhattan a taxi is $35–55 and 30–40 minutes. From Williamsburg the G is direct; from DUMBO the F from York St is 15 minutes.`,
      ru: `Квартира — в тихом конце 7-й авеню, в шести кварталах от станции F/G на 9-й улице и в пяти минутах пешком от Проспект-парка у Bartel-Pritchard Square. **7-я авеню** — улица на каждый день (бейглы, аптеки, супермаркет Key Food, пекарня Winner в нескольких кварталах к северу); **5-я авеню**, одним длинным кварталом ниже, — улица ресторанов и баров (al di là, Fonda, Stone Park Cafe, Miriam, Union Hall, Blueprint). **Prospect Park West** и боковые улочки с браунстоунами между 1-й и 9-й — та самая открытка.

**Кофе рядом с домом:** Café Regular (11-я улица), Winner (7-я авеню у 8-й), Colson Patisserie (9-я улица у 6-й авеню), Gorilla Coffee (5-я авеню). **Бейглы:** Bagel Pub (7-я авеню у 7-й улицы) или Terrace Bagels (Виндзор-Террас). **Продукты и вино:** Key Food на 7-й, Union Market на 7-й; Park Slope Food Coop — только для членов. **Главные ворота кладбища Грин-Вуд** — 15 минут пешком на юг, лучшая тихая прогулка в Бруклине.

**Домой поздно вечером:** F от 15th St ходит всю ночь; из Манхэттена такси — $35–55 и 30–40 минут. Из Уильямсбурга G идёт напрямую; из Дамбо F от York St — 15 минут.` },
    { key: 'russian', icon: '🥟', title: 'Russian & German New York', titleRu: 'Русский и немецкий Нью-Йорк',
      en: `**Brighton Beach** is the Russian-speaking boardwalk at the end of the B/Q (about 50 minutes from home): Brighton Beach Avenue under the elevated tracks, the *Tatiana* and *Volna* boardwalk restaurants, Taste of Russia and the bakeries for a picnic on the sand, then a walk west along the boardwalk to Coney Island. Best as a sunny late-afternoon-into-dinner outing; the amusement park runs weekends only in the autumn.

**Russian food in Manhattan:** Mari Vanna (Gramercy, a kitschy dacha with pelmeni and infused vodkas), Russian Samovar (Theater District, live piano) and Veselka (East Village, the 24-hour Ukrainian diner everyone loves) — check each is still open before going.

**German comforts:** Zum Schneider closed, but Paulaner Brauhaus in Nolita (confirm), Loreley Beer Garden (Lower East Side), Radegast Hall in Williamsburg (beer hall with a retractable roof) and Schaller & Weber on the Upper East Side (the 1937 German butcher and grocery, near the Met day) are all still there. Sausages at Schaller's Stube next door are a fine lunch.`,
      ru: `**Брайтон-Бич** — русскоязычная набережная в конце линии B/Q (около 50 минут от дома): Brighton Beach Avenue под эстакадой, рестораны *Tatiana* и *Volna* на променаде, Taste of Russia и пекарни для пикника на песке, затем прогулка на запад по дощатой набережной до Кони-Айленда. Лучше всего — солнечным поздним днём с переходом в ужин; парк аттракционов осенью работает только по выходным.

**Русская еда в Манхэттене:** Mari Vanna (Грамерси, китчевая дача с пельменями и настойками), Russian Samovar (Театральный квартал, живое пианино) и Veselka (Ист-Виллидж, круглосуточная украинская закусочная, которую любят все) — перед походом проверьте, что каждое место ещё открыто.

**Немецкое:** Zum Schneider закрылся, но Paulaner Brauhaus в Нолите (уточнить), Loreley Beer Garden (Лоуэр-Ист-Сайд), Radegast Hall в Уильямсбурге (пивной зал с раздвижной крышей) и Schaller & Weber на Верхнем Ист-Сайде (немецкий мясник и бакалея с 1937 года, рядом с музейным днём) на месте. Сосиски в Schaller's Stube по соседству — отличный обед.` },
  ],
};
