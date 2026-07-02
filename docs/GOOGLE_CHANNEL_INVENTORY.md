# Google Channel — полный инвентарь технологий

**Владелец SSOT:** репозиторий `alumineu-channel-google` (агент **GGL · Merchant**).  
**Синхронизация с бизнес-моделью:**

- Sync статусов: [`docs/agents/BM_GOOGLE_CHANNEL_SYNC_PROMPT.md`](agents/BM_GOOGLE_CHANNEL_SYNC_PROMPT.md)
- Интеграция с BMC/graph: `alumineu-business-model/docs/agents/MDL_GOOGLE_MODEL_INTEGRATION_PROMPT.md` → агент **MDL**  
**Обновлено:** 2026-05-21  
**Решения owner:** [GOOGLE_OWNER_DECISIONS.md](GOOGLE_OWNER_DECISIONS.md) (PL first; GBP KPI = views + reviews)

---

## Как пользоваться

| Символ статуса | Значение |
|----------------|----------|
| ✅ | Внедрено и поддерживается |
| 🟡 | Частично / в работе |
| ⬜ | Не начато |
| 👁 | Watchlist (продукт ранний или не для PL/B2B) |
| ⛔ | Не применимо к модели Alumineu |

**Приоритет:** P0 (сейчас) → P3 (позже).  
**BM** — куда переносить в `alumineu-business-model` (узлы, capabilities, `implementation_backlog`).

Чекбоксы `- [ ]` / `- [x]` — операционный трекинг в этом файле; при синхронизации MDL переносит приоритеты в YAML, не дублируя весь текст.

---

## Контекст Alumineu

| Параметр | Значение |
|----------|----------|
| Модель | B2B: монтажники и партнёры, не розничный checkout |
| География | PL ~76% выручки; DE / RO / EU — расширение каталога |
| Роль в Google | **Производитель бренда** + **merchant** (свой каталог и цены) |
| Стратегия | Сначала **бесплатные** поверхности + измеримость; платный Ads — узко после GA4 |
| Репо исполнения | `alumineu-channel-google`, сайты Tilda, `alumineu-product-catalog` |

### Ключевые ID (операционная памятка)

| Система | ID / ресурс |
|---------|-------------|
| Ads MCC | 114-540-9300 |
| Ads клиент (primary) | 818-393-0344 |
| MCA Merchant | 5797974210 |
| MC PL | 5785188396 |
| GCP OAuth | `oceanic-craft-452806-c0` |
| Google account | `alumineu.pl@gmail.com` |
| GBP Maps | https://maps.app.goo.gl/Ske4Fh5WGanB7hij7 |

---

## Слой A — Каталог и витрина в Google (ядро)

### A1. Google Merchant Center (MCA / sub-accounts)

**Что это.** Центральный кабинет товарных данных для Google Shopping, бесплатных listings, Lens и связанных поверхностей. Без MC товары не попадают в товарную выдачу Google.

**Зачем Alumineu.** 137+ SKU профилей — «витрина в Google» для монтажников, которые ищут по названию/фото/бренду, не только через сайт.

**Бесплатно / платно.** Кабинет и **Free listings** — бесплатно; клики в **Shopping ads** — платно.

**Статус:** 🟡 MCA + PL sub; DE/RO/EU на policy review.

**Приоритет:** P0.

**BM:** `channel-google`, `impl-google-merchant`, `cap-google-business-search-operations`.

**Репо:** `docs/MERCHANT_*`, `npm run merchant:*`.

**Справка:** https://support.google.com/merchants/

- [x] MCA 5797974210, PL 5785188396
- [x] Primary source: Google Sheets (`10667412482`)
- [ ] DE / RO / EU — approved + free listings ON на каждом sub
- [ ] Link MC PL ↔ Ads 818

---

### A2. Free product listings (Surfaces across Google)

**Что это.** Органическое показание карточек товара (Shopping tab, Search, Images, Lens и др.) **без оплаты за клик**, при соблюдении политик и качества фида.

**Зачем Alumineu.** Основной бесплатный охват каталога; для B2B важнее узнаваемость SKU и бренда, чем impulsive buy.

**Бесплатно / платно.** Бесплатно (отдельно от Ads).

**Статус:** ✅ PL enabled; остальные — 🟡.

**Приоритет:** P0.

**BM:** `hyp-google-trust-loop` (косвенно), `impl-google-merchant`.

- [x] PL: Free listings ENABLED
- [ ] Еженедельный снимок: MC Marketing → Performance (UI) + `merchant:api:performance` (когда добавим скрипт)
- [ ] Понять нулевые API reports vs «нет трафика» vs «нет прав»

---

### A3. Product data feed (атрибуты MC)

**Что это.** Структурированные поля: `id`, `title`, `description`, `link`, `image_link`, `price`, `availability`, `shipping`, `gtin`/`mpn`, `product_type`, unit pricing и т.д.

**Зачем Alumineu.** Качество фида = одобрение SKU + релевантность в поиске и будущих **agentic** поверхностях.

**Бесплатно / платно.** Бесплатно.

**Статус:** ✅ PL 137 approved; pipeline Sheets → MC.

**Приоритет:** P0.

**BM:** `impl-google-merchant`, зависимость от `impl-catalog-ssot`.

**Репо:** `scripts/sync-merchant-sheet-from-meta.js`, `merchant:sheet:apply`, `MERCHANT_SHEETS_GOOGLE_API.md`.

- [x] Unit pricing measure/base в sync
- [x] Shipping align через `merchant:api:apply-business`
- [ ] Supplemental feed для экспериментов (UCP, promos) без риска primary
- [ ] Расширенные атрибуты под conversational discovery (когда Google откроет)

**Справка:** https://support.google.com/merchants/topic/6324338

---

### A4. Merchant API (замена Content API for Shopping)

**Что это.** REST API: products, sources, reports, users, business settings, Product Studio (alpha).

**Зачем Alumineu.** Автоматизация сверки, диагностика, CI; единый контур с Sheets и GCP SA.

**Бесплатно / платно.** API бесплатен; нужен GCP + developer contact.

**Статус:** 🟡 verify OK; `API_DEVELOPER` contact — доработка; performance reports пустые.

**Приоритет:** P0 (операции), P2 (Product Studio API).

**BM:** `impl-google-merchant`.

**Репо:** `docs/MERCHANT_CENTER_API_ACCESS.md`, `MERCHANT_API_DEVELOPER_FIX.md`, `npm run merchant:api:*`.

- [x] `merchant:api:verify`, list-products, compare-sheet
- [ ] Developer registration без 29-day warning
- [ ] `merchant:api:performance` в package.json + runbook

---

### A5. Google Sheets как SSOT фида

**Что это.** Таблица «Alumineu Merchant — PL» как primary data source в MC; синхронизация из Meta/CSV через OAuth.

**Зачем Alumineu.** Редактирование без ручного CSV; связка с `alumineu-product-catalog` / finance-ops OAuth.

**Статус:** ✅.

**Приоритет:** P0.

- [x] `npm run merchant:sheet:apply` + strict validation
- [ ] Multi-country tabs по `MERCHANT_MULTI_COUNTRY_RUNBOOK.md`

---

### A6. Store ratings (рейтинг магазина)

**Что это.** Агрегированная оценка **продавца** (не товара) рядом с listings/ads; источники: Google Customer Reviews, партнёры отзывов, Shopping reviews.

**Зачем Alumineu.** Доверие B2B: «можно заказать у этой фирмы».

**Бесплатно / платно.** Сбор через **Google Customer Reviews** — бесплатно.

**Статус:** ⬜.

**Приоритет:** P1 (после стабильных отгрузок и согласованного домена).

**BM:** новый track в `impl-google-merchant` или `cap-google-business-search-operations`.

- [ ] Подключить Google Customer Reviews в MC
- [ ] Домен/shop name в MC = домен отзывов

**Справка:** https://support.google.com/merchants/answer/190657

---

### A7. Product ratings (рейтинг на уровне SKU)

**Что это.** Звёзды и количество отзывов **на товар** в Shopping/listings.

**Зачем Alumineu.** Если появятся отзывы на конкретные профили — усиление карточки.

**Статус:** ⬜.

**Приоритет:** P2.

- [ ] Собрать отзывы на SKU или syndication partner
- [ ] Атрибуты `product_review` / aggregate в фиде

---

### A8. Promotions в Merchant Center

**Что это.** Промо-IDs для отображения скидок/акций в Shopping.

**Зачем Alumineu.** B2B реже; возможны сезонные акции для монтажников.

**Статус:** ⬜.

**Приоритет:** P3.

---

### A9. Loyalty program (атрибут MC)

**Что это.** Member price, member shipping, points для участников программы лояльности.

**Зачем Alumineu.** Имеет смысл только при формализованной B2B loyalty (`offer-installer-loyalty-program`).

**Статус:** ⛔ пока нет программы.

**Приоритет:** P3.

---

### A10. Automated discounts (MC add-on)

**Что это.** AI меняет цены в **платных** Shopping ads в пределах min price / COGS.

**Зачем Alumineu.** Только при масштабировании Shopping с маржинальными guardrails.

**Статус:** ⛔ до GA4 + paid Shopping теста.

**Приоритет:** P3.

---

### A11. Local inventory ads / free local listings

**Что это.** Показ наличия «рядом» для retail с физическими точками.

**Зачем Alumineu.** Склад B2B Piastów — не классический retail foot traffic.

**Статус:** ⛔.

---

## Слой B — Бренд-производитель (часто не знают)

### B1. Manufacturer Center

**Что это.** Отдельная бесплатная платформа для **производителя/владельца бренда**: rich content, видео, feature descriptions. Данные обогащают Google catalog; блок **«From the Manufacturer»** на Shopping.

**Зачем Alumineu.** Вы — завод и бренд Alumineu; это сильнее, чем только merchant feed с ценой. Контент производителя может отображаться поверх данных перепродавцов.

**Бесплатно / платно.** Бесплатно.

**Статус:** ⬜.

**Приоритет:** **P0** (параллельно с стабильным MC PL).

**BM:** расширить `channel-google` / новый `impl-google-manufacturer-center`.

- [ ] Создать Manufacturer Center account (PL/EU countries)
- [ ] Загрузить rich product content для топ-SKU
- [ ] YouTube монтаж/продукт → привязка в manufacturer feed

**Справка:** https://support.google.com/manufacturers/

**Отличие от MC:** MC = продажа (price, shipping); Manufacturer = «как задумал производитель».

---

### B2. Product Studio (в Merchant Center UI)

**Что это.** Бесплатные AI-инструменты в MC → Creative content: фон, upscale, remove background; генерация title/description (UI); видео — ограниченные страны (не PL для video gen).

**Зачем Alumineu.** Улучшение `image_link` без студии; PL язык поддерживается для image tools.

**Статус:** ⬜.

**Приоритет:** P1.

- [ ] Прогнать топ-20 SKU через Product Studio
- [ ] Обновить image_link в Sheets / MC

**Справка:** https://support.google.com/merchants/answer/13708167

---

### B3. Product Studio API (Merchant API, alpha)

**Что это.** Программная генерация/оптимизация изображений и текстов.

**Зачем Alumineu.** Масштаб после ручного пилота в UI.

**Статус:** 👁.

**Приоритет:** P2.

---

### B4. GTIN / MPN / brand consistency

**Что это.** Идентификаторы и бренд `Alumineu` для сопоставления SKU в Google.

**Зачем Alumineu.** Меньше дублей и ошибок сопоставления; основа для Manufacturer + MC.

**Статус:** 🟡 через MC.

**Приоритет:** P1.

- [ ] Аудит `gtin`/`mpn`/`brand` на всех 137 SKU

---

## Слой C — Локальное доверие (Google Business Profile)

### C1. Google Business Profile (GBP)

**Что это.** Карточка компании в Maps и Search: адрес, часы, телефон, фото, посты, Q&A, продукты/услуги.

**Зачем Alumineu.** Local trust для монтажников в PL; звонки и маршрут на склад/офис.

**Бесплатно / платно.** Бесплатно.

**Статус:** 🟡 карточка есть; регламент обновлений — нет.

**Приоритет:** P0.

**BM:** `channel-google`, `res-google-gbp`, `cap-google-business-search-operations`.

**Репо:** `docs/GOOGLE_REVIEWS_ACQUISITION.md` (часть trust loop).

- [x] Профиль опубликован (Maps link в channels.yaml)
- [ ] Регламент: фото, часы, услуги, ссылки на .pl / kontakt
- [ ] GBP Products/Services — ключевые линейки профилей
- [ ] Имя/домен согласованы с MC (store ratings)

---

### C2. Процесс Google-отзывов с фото (после отгрузки)

**Что это.** Операционный цикл: менеджер просит отзыв + фото монтажа → GBP + будущие store ratings.

**Зачем Alumineu.** UGC монтажей = доказательство для следующего монтажника.

**Статус:** 🟡 черновик runbook.

**Приоритет:** P0 (Wave 2 BM).

**BM:** `offer-google-reviews-with-photos`, `impl-google-reviews-process`, `act-google-reviews-after-shipment`.

- [x] `GOOGLE_REVIEWS_ACQUISITION.md`
- [ ] BPMN в processes + KPI OPI
- [x] **Owner C1.6:** KPI GBP = profile views + review count; **не** `zrodlo_leada` Maps

---

### C3. Google Customer Reviews

**Что это.** Post-delivery опрос → звёзды в store ratings.

**Зачем Alumineu.** Системный сбор без только «ручных» просьб менеджера.

**Статус:** ⬜.

**Приоритет:** P1.

---

## Слой D — Органический поиск и измеримость

### D1. Google Search Console (GSC)

**Что это.** Индексация, запросы, ошибки, rich results, sitemaps для alumineu.pl / .de / .ro / .com.

**Зачем Alumineu.** Видимость, что Google «видит» B2B-страницы; диагностика schema.

**Статус:** ⬜.

**Приоритет:** P0.

**BM:** `impl-google-measurement` (новый).

- [ ] Верификация всех доменов
- [ ] Sitemap + мониторинг product landing pages

---

### D2. GA4 (Google Analytics 4)

**Что это.** Веб-аналитика: источники, события, конверсии.

**Зачем Alumineu.** Связать free listings / SEO / GBP с заявками; закрыть дыру DWH (нет GA4 pipeline).

**Статус:** ⬜.

**Приоритет:** P0.

**BM:** `impl-google-measurement`, `impl-cac-ltv`, `hyp-google-trust-loop`.

- [ ] GA4 на все Tilda-сайты
- [ ] Key events: form, phone, catalog download
- [ ] CRM `zrodlo_leada` согласован с UTM

---

### D3. Google Tag Manager (GTM)

**Что это.** Контейнер тегов без правки Tilda при каждом изменении.

**Зачем Alumineu.** Управляемые события для GA4 + будущих Ads conversions.

**Статус:** ⬜.

**Приоритет:** P0.

---

### D4. Связка MC ↔ Google Ads ↔ GA4

**Что это.** Linked accounts: Merchant promotions, remarketing lists, consistent conversion measurement.

**Зачем Alumineu.** Единая атрибуция paid + organic Google.

**Статус:** 🟡 Ads brand live; link MC–818 — ⬜.

**Приоритет:** P1.

- [ ] MC PL linked to Ads 818
- [ ] GA4 linked to Ads
- [ ] Enhanced conversions (consent)

---

### D5. Looker Studio

**Что это.** Бесплатные дашборды: GA4 + GSC + MC + Ads.

**Зачем Alumineu.** Еженедельный обзор для owner без ручного копирования.

**Статус:** ⬜.

**Приоритет:** P1.

---

### D6. Structured data на сайте (schema.org)

**Что это.** JSON-LD: `Product`, `Organization`, `FAQPage`, `BreadcrumbList` на страницах Tilda.

**Зачем Alumineu.** Усиливает органику и **AI Overviews**; дублирует смысл фида для агентов.

**Статус:** ⬜.

**Приоритет:** P0.

**BM:** `channel-websites` + `impl-google-merchant`.

- [ ] Product schema на карточках каталога
- [ ] FAQ по монтажу/совместимости профилей

---

### D7. Core Web Vitals / PageSpeed

**Что это.** Метрики UX (LCP, INP, CLS) влияют на SEO и качество landing из MC.

**Зачем Alumineu.** `link` в фиде должен открываться быстро.

**Статус:** ⬜.

**Приоритет:** P1.

---

### D8. Cloudflare robots (SEO для ботов)

**Что это.** Worker отдаёт `robots.txt` для краулеров (в т.ч. Googlebot).

**Зачем Alumineu.** Контроль индексации витрины.

**Статус:** ✅ worker в репо.

**Репо:** `docs/MERCHANT_CLOUDFLARE_ROBOTS.md`.

- [ ] Сверить production robots с recommended

---

## Слой E — Контент и визуальный discovery

### E1. YouTube (@alumineu)

**Что это.** Органические видео монтажа/продуктов; возможна связка с Shopping/Manufacturer.

**Зачем Alumineu.** Обучение монтажников = доверие и поиск по бренду.

**Статус:** 🟡 канал есть (`channels.yaml` instagram block — отдельно).

**Приоритет:** P1.

**BM:** `channel-meta` / resources, не путать с Google channel node.

---

### E2. Google Lens / Visual search

**Что это.** Поиск по изображению; использует качественные product images из MC.

**Зачем Alumineu.** Монтажник фотографирует профиль на объекте → находит Alumineu.

**Статус:** 🟡 косвенно через MC images.

**Приоритет:** P1 (через Product Studio + фото объектов).

---

### E3. Google Images

**Что это.** Трафик из вкладки «Картинки».

**Зачем Alumineu.** Дополнительный органический канал для SKU с хорошими фото.

**Приоритет:** P2.

---

### E4. Google Trends / Alerts

**Что это.** Спрос по запросам и уведомления о упоминаниях.

**Зачем Alumineu.** Приоритизация контента PL/DE (np. sufity napinane, profile).

**Статус:** ⬜.

**Приоритет:** P2.

---

### E5. Google Postmaster Tools

**Что это.** Репутация домена для исходящей почты B2B.

**Зачем Alumineu.** Outreach менеджеров не в спам.

**Статус:** ⬜.

**Приоритет:** P2.

---

## Слой F — Платная реклама Google

### F1. Google Ads — Search (brand)

**Что это.** Текстовые объявления по запросам бренда «alumineu».

**Зачем Alumineu.** Защита бренда и перехват высокого intent.

**Статус:** ✅ небольшой spend на 818.

**Приоритет:** P1.

**BM:** отдельный paid slice; не смешать с free channel-google без атрибуции.

---

### F2. Google Ads — Shopping / Performance Max

**Что это.** Платные карточки товаров.

**Зачем Alumineu.** Тест ~80 PLN/day **после** GA4 и Basic API access; CPA gate 150–200 PLN.

**Статус:** 🟡 ELIGIBLE, не масштабировано.

**Приоритет:** P2.

**Репо:** `docs/GOOGLE_ADS_*`, `npm run ads:*`.

---

### F3. Google Ads API + MCC

**Что это.** Программный аудит кампаний, spend, автоматизация.

**Зачем Alumineu.** Прозрачность агентств; CI verify.

**Статус:** 🟡 OAuth OK; **Test** developer token; Basic access submitted.

**Приоритет:** P1.

- [x] `ads:auth`, `ads:verify`
- [ ] Basic access approved
- [ ] 818 under MCC 114
- [ ] `ads:audit` на 365d

---

### F4. Demand Gen / YouTube Ads

**Что это.** Охватные кампании с видео/креативами.

**Зачем Alumineu.** После доказанного organic YouTube.

**Статус:** ⬜.

**Приоритет:** P3.

---

### F5. Comparison Shopping Services (CSS)

**Что это.** EU-посредники для Shopping ads.

**Зачем Alumineu.** Только при крупных бюджетах Shopping.

**Статус:** ⛔.

---

## Слой G — Агенты и agentic commerce (новое)

### G1. Качественный MC-фид как «source code» для агентов

**Что это.** Полные атрибуты (материал, размеры, совместимость, сценарии использования) — вход для AI Mode, Gemini, будущих Business Agent.

**Зачем Alumineu.** Без плотных данных агент не рекомендует профиль при сложном запросе монтажника.

**Статус:** 🟡 базовый фид есть; conversational fields — нет.

**Приоритет:** P0 (непрерывно).

**BM:** `cap-google-agentic-readiness` (добавить при sync).

---

### G2. Universal Commerce Protocol (UCP)

**Что это.** Открытый протокол: discovery + checkout в AI Mode / Gemini; атрибут `native_commerce`, REST checkout sessions, MCP/A2A.

**Зачем Alumineu.** Будущие «купить в один клик» в AI; для B2B сейчас **watchlist** (US early access, счёт-фактура).

**Статус:** 👁 **отложено** (owner C1.5: PL first).

**Приоритет:** P3 после PL + GA4.

- [ ] Плотный фид + schema сейчас (PL)
- [ ] Interest form только после закрытия Wave A PL
- [ ] `native_commerce` supplemental feed

**Справка:** https://developers.google.com/merchant/ucp

---

### G3. Business Agent (брендовый чат в Search)

**Что это.** Виртуальный продавец на Google Search в голосе бренда (пилот US retailers).

**Зачем Alumineu.** Q&A по профилям без звонка менеджера — когда доступно в EU.

**Статус:** 👁 US pilot.

**Приоритет:** P3.

---

### G4. Новые conversational attributes (MC, 2025+)

**Что это.** Google добавляет атрибуты: ответы на частые вопросы, аксессуары, substitutes.

**Зачем Alumineu.** Прямо под запросы «какой профиль на нишу X».

**Статус:** 👁 rollout.

**Приоритет:** P1 когда доступно.

---

## Слой H — Инфраструктура в репозитории

| Компонент | Назначение | Статус |
|-----------|------------|--------|
| `oceanic-craft` GCP | OAuth Ads + Merchant, SA | ✅ |
| Sheets API + `token.json` | SSOT фида | ✅ |
| `google-ads-api` npm | Ads audit | 🟡 |
| Merchant API scripts | Catalog ops | ✅ |
| Cloudflare robots worker | SEO | 🟡 deploy |
| GSC API / GA4 Data API → DWH | Аналитика в data-platform | ⬜ |

---

## Слой I — Не использовать / отложено

| Технология | Причина |
|------------|---------|
| Buy on Google | Не B2B модель |
| Local inventory | Нет retail сети |
| Loyalty MC | Нет formal program |
| Automated discounts | До paid Shopping + margin rules |
| Google Ad Grants | Только NPO |
| UCP checkout сейчас | GEO / B2B invoice |

---

## Roadmap (волны)

### Wave A — 2–4 недели (P0, **PL only** — owner C1.5)

- [ ] Ежемесячный снимок GBP: **profile views** + **review count**
- [ ] GSC + sitemap **alumineu.pl** (остальные домены — Wave A2)
- [ ] GA4 + GTM **alumineu.pl**
- [ ] MC PL ↔ Ads 818 link
- [ ] GBP регламент + согласование с MC
- [ ] Manufacturer Center PL — заявка и первый rich upload

### Wave A2 — после PL-контура

- [ ] DE/RO/EU approval + free listings
- [ ] GSC/GA4 на .de / .ro / .com

### Wave B — 1–2 месяца (P1)

- [ ] Product Studio топ-SKU
- [ ] schema Product + FAQ на сайте
- [ ] Google Customer Reviews
- [ ] Looker Studio dashboard
- [ ] Отзывы: processes + OPI KPI
- [ ] `merchant:api:performance` weekly

### Wave C — квартал (P2)

- [ ] Product ratings в фиде
- [ ] Shopping test с GA4 guardrails
- [ ] Postmaster, Trends
- [ ] Supplemental feeds (promo, UCP prep)

### Wave D — по анонсам Google (P3)

- [ ] UCP / Business Agent EU
- [ ] Conversational MC attributes at scale
- [ ] Product Studio API automation

---

## Матрица → Business Model (для MDL-агента)

| Inventory ID | BM node / capability | implementation_backlog | Wave BM |
|--------------|----------------------|-------------------------|---------|
| A1–A5 | channel-google | impl-google-merchant | 4 |
| B1–B4 | channel-google | impl-google-manufacturer-center | 4 |
| C1–C3 | channel-google, offer-google-reviews | impl-google-reviews-process | 2 |
| D1–D7 | channel-google, channel-websites | impl-google-measurement | 4 |
| E1–E5 | channel-websites / resources | impl-google-merchant (часть) | 4 |
| F1–F3 | (paid — отдельная экономика) | impl-cac-ltv, ads docs | 4 |
| G1–G4 | channel-google | impl-google-agentic-readiness | 5 |

**SSOT narrative для Canvas:** после sync обновить `model/nodes/channel-google.md` и `docs/channels/GOOGLE_ECOSYSTEM.md` в business-model.

---

## Связанные документы в этом репо

| Документ | Тема |
|----------|------|
| [MERCHANT_MULTI_COUNTRY_RUNBOOK.md](MERCHANT_MULTI_COUNTRY_RUNBOOK.md) | PL/DE/RO/EU |
| [MERCHANT_CATALOG_RESET_RUNBOOK.md](MERCHANT_CATALOG_RESET_RUNBOOK.md) | Сброс каталога |
| [GOOGLE_REVIEWS_ACQUISITION.md](GOOGLE_REVIEWS_ACQUISITION.md) | Отзывы GBP |
| [GOOGLE_ADS_API_ACCESS.md](GOOGLE_ADS_API_ACCESS.md) | Ads API |
| [MERCHANT_SHEETS_GOOGLE_API.md](MERCHANT_SHEETS_GOOGLE_API.md) | Sheets |
| [agents/BM_GOOGLE_CHANNEL_SYNC_PROMPT.md](agents/BM_GOOGLE_CHANNEL_SYNC_PROMPT.md) | Промпт для MDL |

---

## История изменений

| Дата | Изменение |
|------|-----------|
| 2026-05-21 | Первая полная версия inventory + матрица BM |
