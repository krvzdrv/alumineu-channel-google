# Решения owner — Google channel

**Обновлено:** 2026-06-06  
**Синхронизация в BM:** `alumineu-business-model/docs/BACKLOG.md` (C1.5, C1.6)

---

## C1.5 — География и приоритет

**Решение:** Сейчас **в первую очередь PL** — Merchant PL, GBP, Manufacturer, GA4 на alumineu.pl, отзывы. DE / RO / EU и agentic (UCP) — **после** закрытия PL-контура, не параллельный sprint.

**Следствие для backlog:**

- Wave A = только PL stack.
- `impl-google-agentic-readiness` / UCP — не раньше стабильного PL + GA4.

---

## C1.6 — GBP: как измеряем успех (без `Źródło leada` Maps)

**Контекст:** Клиент часто находит компанию в **Google Maps**, но дальше звонит, пишет с **сайта** или набирает **телефон с карточки**. Путь разветвлённый — надёжно отнести заказ к «Google Maps» в CRM (`zrodlo_leada`) **нельзя**.

**Решение owner:**

| Не делаем (сейчас) | Делаем (метрики **факта** для динамики) |
|--------------------|----------------------------------------|
| Обязательный токен `Źródło leada` = Google Maps | **Просмотры профиля** (Insights) — снимок раз в месяц, сравнение MoM |
| Плановые/целевые KPI в репозитории от owner | **Количество отзывов** — факт; рост = эффект процесса, не «цель 100» |
| CRM как primary proof для GBP | Доля отзывов с фото — по желанию, не обязательна для snapshot |

**Дополнительно (не заменяют GBP KPI):**

- Процесс запроса отзыва после отгрузки (OPI / % запросов) — см. `offer-google-reviews-with-photos`.
- GA4 — для сайта и Merchant/SEO, не для разрезания «Maps vs site» на 100%.
- MC performance — отдельно для каталога PL.

**Канал `channel-google` считается «работающим» по локальному контуру**, когда растут просмотры карточки и отзывы при живом регламенте обновления GBP — **без** требования CRM-атрибуции Maps.

---

## G-UC-P-01 — UCP / agentic checkout

**Решение:** **Отложено.** Фокус PL; UCP/Business Agent — watchlist в [GOOGLE_CHANNEL_INVENTORY.md](GOOGLE_CHANNEL_INVENTORY.md) § G.

---

## G-CRM-01 — `Źródło leada` Google Maps / organic

**Решение:** **Не внедряем** как обязательный KPI канала. Закрыто решением **C1.6**.

---

## GA4-PL-01 — Измеримость alumineu.pl

**Решение owner (2026-06-06):** **встроенная интеграция Tilda → GA4**, без GTM на Wave A.

| Факт | Значение |
|------|----------|
| Measurement ID | `G-J48JDW2DJ5` |
| Property ID | `489259413` |
| Сбор данных | активен |

**Следствие:** не вставлять GTM/второй gtag в Tilda HEAD; связать GSC ↔ GA4 в Admin; кастомные события (телефон, форма) — Wave B или отдельное решение.

Чеклист: `docs/GA4_GTM_TILDA_PL_CHECKLIST.md`

---

## G-ADS-01 — Shopping test

**Решение owner (2026-06-06):** тест Shopping/PMax **только по явной команде owner**, не автостартом агента. Ориентир из backlog: ~**80 PLN/day** после live GA4 на alumineu.pl.

**Следствие:** GGL не включает кампании без запроса; при старте — brand guardrails + CPA gate 150–200 PLN из inventory.

---

## O6 — Каталог PDF на сайте

**Факт:** актуальные каталоги доступны в разделе **`/katalog`** на alumineu.pl (и локальные аналоги на .de / .ro / .com). SEO: индексировать landing + ссылки с хабов (месяц 3 плана).

---

## O7 — Конкуренты DE

**Контекст owner:** в Германии конкурируют в т.ч. **польские и литовские** поставщики профилей для натяжных потолков, не только локальные бренды (Profildirekt и т.п.). Keyword Planner DE и SERP — с учётом cross-border supply.

---

## O8 — Partnerski для badge-ссылок

**Источник данных:** Supabase `raw_companies` (`typ_ceny = Partnerski`) — репо `alumineu-data-platform`, синк Planfix. Выгрузку top-N по обороту делает DAT/GGL, не owner вручную.

---

## O9 — Gate DE после PL

**Подтверждено owner:** согласен с **C1.5** — DE Merchant / DE SEO только после закрытия PL-контура. Критерии: `GOOGLE_CHANNEL_INVENTORY.md` Wave A + `GOOGLE_DOMINATION_PLAN_6M` §6.1.
