# Meta Pixel vs GA4 (Tilda alumineu.pl) — сверка и причины расхождений [GGL]

**Обновлено:** 2026-06-07  
**Сайт:** alumineu.pl  
**Meta:** Pixel `1282270847279518` + кастом `alumineu-channel-meta/dist/pl/pixel.pl.html` v16.3  
**GA4:** `G-J48JDW2DJ5` (Tilda native, **без GTM**)

---

## Главный вывод

**Полное совпадение цифр невозможно и не нужно как цель.** Meta и GA4 считают **разные сущности** разными правилами. Сверять нужно **попарно** (см. таблицу ниже), а не «всё в Meta» vs «всё в Analytics».

Самая частая ошибка: сравнивать Meta **ViewContent / Purchase** с GA4 **sessions** — в GA4 **нет** ecommerce-событий без GTM.

---

## Что установлено на сайте

| Система | Источник | События |
|---------|----------|---------|
| **Meta base** | Tilda → Analytics → Facebook Pixel | `PageView` (+ часть store от Tilda) |
| **Meta custom** | `pixel.pl.html` в Tilda HTML | `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` + interceptor UID→External ID, dedupe |
| **GA4** | Tilda → Analytics → GA4 `G-J48JDW2DJ5` | `page_view`, scroll, outbound_click (enhanced measurement) |

См. `docs/GA4_GTM_TILDA_PL_CHECKLIST.md`, `alumineu-channel-meta/docs/PROJECT.md`.

---

## Таблица «что с чем сравнивать»

| Meta (Events Manager) | GA4 (отчёт) | Ожидаемое соотношение |
|----------------------|-------------|------------------------|
| **PageView** | **Views** (`page_view`) | Близко ±15–40%; Meta часто **выше** (блокировщики режут по-разному, разный bot filter) |
| **ViewContent** | **Views** на URL `/produkty/...` | Meta **≥** GA4 (VC при смене варианта + Tilda + наш скрипт; dedupe только 2.5s) |
| **AddToCart** | — | В GA4 **0** без GTM — **не сравнивать** |
| **InitiateCheckout** | — | В GA4 **0** без GTM |
| **Purchase** | — | В GA4 **0** без GTM; сравнивать с CRM/заказами Tilda, не с GA4 |
| **Landing PageView** | **Landing page** | Сверять топ-10 URL за один период |

**Не сравнивать:** Meta PageView vs GA4 **sessions** (1 сессия = несколько page_view).

---

## Почему расходятся (по приоритету)

### 1. Разные определения метрик (структурно)

- GA4 Wave A = только **просмотры страниц**.
- Meta = **PageView + воронка магазина** (VC, ATC, IC, Purchase).
- Purchase в Meta есть; в GA4 как события **нет** → любое сравнение «конверсий» с GA4 ложное.

### 2. Двойной и тройной счёт в Meta

- Tilda шлёт свои `fbq` + наш `pixel.pl.html` шлёт свои.
- Interceptor **дедупит** только `ViewContent` / `AddToCart` (2.5s / 1.2s), **не PageView**.
- `ViewContent` при **смене варианта** на карточке — отдельный хит; GA4 = один `page_view` на загрузку.

### 3. Блокировщики и ITP

- Meta Pixel блокируется чаще (Safari, Firefox, adblock).
- GA4 тоже режется, но доля отказов **другая** → PageView Meta vs GA4 views расходятся.

### 4. Часовой пояс отчётов

- Meta Events Manager — timezone ad account / business.
- GA4 property — timezone в Admin.
- Сверять **один и тот же календарный день** в обоих UI после выравнивания TZ.

### 5. Двойной GA4-тег (проверить owner)

- В Tilda только **один** способ: Settings → Analytics → GA4 `G-J48JDW2DJ5`.
- **Не** дублировать gtag/GTM в «HTML перед `</head>`» — иначе GA4 **завышен** vs Meta.

### 6. Страницы без полного тега

- Popup cart, `/tilda/*` служебные пути — могут дать Meta-событие без полноценного GA4 page_view (редко, но возможно на Tilda Store).

### 7. Consent Mode / GDPR

- Если на PL включён cookie banner без «Marketing» — Meta может не стрелять, GA4 Analytics — стрелять (или наоборот, по настройке).

---

## Процедура сверки (owner + GGL, ~30 мин)

### Шаг 0 — Период

Один диапазон, например **последние 7 полных дней** (не «сегодня»).

Записать:

| Поле | Meta | GA4 |
|------|------|-----|
| Timezone | ? | Property settings |
| Property | Pixel `1282270847279518` | alumineu.pl `489259413` |

### Шаг 1 — Meta Events Manager

1. [business.facebook.com](https://business.facebook.com) → Events Manager → Pixel PL.
2. **Overview** → Events: PageView, ViewContent, AddToCart, Purchase (counts).
3. **Test Events** (опционально): открыть карточку товара, в корзину, checkout — увидеть цепочку.

### Шаг 2 — GA4

1. [analytics.google.com](https://analytics.google.com) → property **alumineu.pl**.
2. **Reports → Engagement → Pages and screens** → Views, тот же период.
3. Фильтр: `Page path contains /produkty` — для сравнения с ViewContent.
4. **Realtime** при тесте в браузере (вторая вкладка).

### Шаг 3 — Таблица сверки (заполнить)

```markdown
| Метрика | Meta (7d) | GA4 (7d) | Δ % | Вердикт |
|---------|----------:|---------:|----:|---------|
| PageView / page_view (all) | | | | |
| ViewContent (Meta) | | | | n/a vs total views |
| page_view /produkty/* only | | | | compare to VC |
| Purchase (Meta) | | | | GA4 n/a |
| Top URL #1 | | | | same path? |
```

### Шаг 4 — Браузерный тест (Chrome)

1. Incognito, без adblock (или с uBlock выключенным).
2. DevTools → Network: фильтр `facebook`, `google-analytics`, `collect`.
3. Открыть карточку SKU → записать: сколько `PageView`, сколько `ViewContent`, сколько `page_view` в GA4 (Realtime).
4. Вставить `alumineu-channel-meta/dist/tools/diagnostics.js` в консоль — лог `fbq` до dedupe.

### Шаг 5 — Интерпретация Δ

| Паттерн | Вероятная причина |
|---------|-------------------|
| Meta PageView **>>** GA4 views | Adblock, двойной Meta, или GA4 tag missing on part of site |
| GA4 views **>>** Meta PageView | Двойной GA4 gtag, или Meta blocked by consent |
| Meta ViewContent **>>** GA4 product views | Норма: variant changes + dual firing |
| Meta Purchase **>0**, GA4 purchases **0** | **Норма** без GTM |
| Top URLs разные | Разная атрибуция landing (Meta event source URL vs GA4 page path) |

---

## Что можно улучшить (если нужна ближе parity)

| Задача | Кто | Эффект |
|--------|-----|--------|
| Подтвердить **один** GA4 ID в Tilda, нет второго gtag | Owner | Убирает завышение GA4 |
| Выровнять timezone Meta ↔ GA4 | Owner | Сравнимые дни |
| GA4 **DebugView** + Meta **Test Events** на одном тесте | GGL/Owner | Понять расхождение на 1 визите |
| Wave B: GTM + `view_item` / `add_to_cart` / `purchase` зеркально Meta | WEB/GGL | Ecommerce parity (owner decision) |
| CAPI + dedup `eventID` server-side | CHN/Meta repo | Меньше потерь Purchase в Meta |

**Не рекомендуется сейчас:** гнаться за 1:1 PageView без GTM/ecommerce — дорого, мало пользы для Wave A.

---

## Ссылки

- GA4 checklist: `docs/GA4_GTM_TILDA_PL_CHECKLIST.md`
- Meta pixel: `../alumineu-channel-meta/docs/PROJECT.md`
- Pixel PL: `../alumineu-channel-meta/dist/pl/pixel.pl.html`
- Diagnostics: `../alumineu-channel-meta/dist/tools/diagnostics.js`
- Owner C1.6: GBP KPI отдельно от site analytics — `docs/GOOGLE_OWNER_DECISIONS.md`
