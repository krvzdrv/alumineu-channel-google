```yaml
repo: alumineu-channel-google
agent: GGL-Merchant
purpose: Google channel — Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center + Cloudflare robots
updated_at: 2026-09-26
inbound:
  - source: alumineu-product-catalog (CAT · Forge)
    what: product feed source (SKU, titles, prices, URLs, media, markets)
    interface: "live XML NL/FR/ES: WEB API-route из CAT; прямой доступ — CAT contract_* (consumer_contract.yaml → ggl). Не копировать факты в git."
    auth: CAT anon key (read-only) — только публичный ключ
    env: [CAT_SUPABASE_URL, CAT_SUPABASE_ANON_KEY]
    token_file: null
    access: read
    status: active-via-WEB
    contract_date: 2026-09-03
    contract_note: Auto-feed Merchant NL/FR/ES — маппинг полей согласован; инвентаризация копий 2026-09-26 (D-011)
  - source: Tilda
    what: legacy CSV paths (exports)
    interface: CSV
    auth: file download
    env: []
    token_file: null
    access: read
    status: active
outbound:
  - consumer: Google Merchant Center / Ads / GSC / GBP
    what: feeds, ads, search console data, business profile insights
    interface: Google APIs (Merchant, Ads, Search Console, Business Profile)
    contract_ref: docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md
    access: read+write
  - consumer: WEB · Signal
    what: handoff specs (GSC/SEO intel)
    interface: docs handoff
    contract_ref: null
    access: read-only
  - consumer: GOV · Atlas
    what: handoff specs
    interface: docs handoff
    contract_ref: null
    access: read-only
stores:
  - feeds/
  - cloudflare/alumineu-robots/
  - OAuth token-*.json (gitignored, local)
  - google-merchant-sa-key.json (local only, service account)
```

## Purpose

Google channel: Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center; Cloudflare robots для alumineu domains. Tooling активно дописывается; токены никогда не коммитятся.

## Inbound — откуда берём данные

| Source | What | Interface | Auth/env | Access | Notes |
|--------|------|-----------|----------|--------|-------|
| CAT · Forge (alumineu-product-catalog) | product feed source | Postgres view / CSV / repo read | уточнить при первом подключении | read | SSOT товаров — в CAT. Контракт 2026-09-03: auto-feed Merchant NL/FR/ES |
| Tilda | legacy CSV paths (exports) | CSV | file download | read | legacy, для миграции |

## Outbound — кому отдаём

| Consumer | What | Interface | Contract_ref | Access | Notes |
|----------|------|-----------|--------------|--------|-------|
| Google Merchant / Ads / GSC / GBP | feeds, ads, GSC data, GBP insights | Google APIs | `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md` | read+write | `merchant:feed:{nl,fr,es}:generate`, `merchant:sheet:apply`, `merchant:api:verify`, `ads:*`, `gsc:fetch`, `gbp:insights` |
| WEB · Signal | handoff specs (GSC/SEO intel) | docs handoff | — | read-only | WEB читает GGL docs |
| GOV · Atlas | handoff specs | docs handoff | — | read-only | operating canon sync |

## Internal stores

- `feeds/` — Merchant Center feed files
- `cloudflare/alumineu-robots/` — robots workers
- OAuth `token-*.json` (gitignored, local)
- `google-merchant-sa-key.json` (local only, service account key)
- `.env` + `.env.example` (vars, не коммитить значения)

## Data flow

```
CAT (product feed)  Tilda (legacy CSV)
   │                     │
   └──────────┬──────────┘
              ▼
   [alumineu-channel-google]
      cloudflare/alumineu-robots/  ·  npm scripts
              │
              ▼
        WEB · Signal (API-route /feeds/*.xml from CAT)
              │
              ▼
   Google Merchant Center (scheduled fetch)
```

**Схема фида (live, 2026-09-04):**
1. WEB · Signal хостит живые фиды напрямую из CAT (API-route, не статика)
2. Фиды всегда актуальны: цены/URL/фото/тексты читаются из CAT при запросе
3. CDN-кеш 24 ч + ревалидация по CAT-вебхуку
4. Merchant Center забирает фид по URL (scheduled fetch, ежедневно)

**Live URLs (WEB-hosted):**
| Market | URL | Статус | Позиций |
|--------|-----|--------|---------|
| NL | `https://alumineu.nl/feeds/google-merchant-nl.xml` | ✅ Live | 117 |
| FR | `https://alumineu.fr/feeds/google-merchant-fr.xml` | ✅ Live | 117 |
| ES | `https://alumineu.es/feeds/google-merchant-es.xml` | ✅ Live | 117 |
| DE | `https://alumineu.de/feeds/google-merchant-de.xml` | ✅ Live (WEB 6db0c68, 2026-09-27) | 117 |
| RO | `https://alumineu.ro/feeds/google-merchant-ro.xml` | ✅ Live, RON | 117 |
| PL | `https://alumineu.pl/feeds/google-merchant-pl.xml` | ⏳ 404 до переключения DNS alumineu.pl на Vercel (Owner) | 117 (локально у WEB) |

С WEB 6db0c68 цена в фиде — по рынку домена (раньше все фиды отдавали цену NL). У 6 SKU с несколькими углами `g:id` = SKU + тип угла (`FLOATIA NX302-inside-corner`); остальные `g:id` = SKU. Товары без цены (ENDCAPP Y213 / Y214) и без фото main в фид не попадают.

**Схема фида (legacy):**
- CSV → Google Sheets → Merchant Center (вручную, через `merchant:sheet:apply`)
- Остались только PL (до DNS) и EU (`alumineu.com`, GGL-028). DE / RO переведены на живой XML 2026-09-28.

## Boundaries

**Делает:**
- Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center tooling
- Cloudflare robots для alumineu domains
- npm scripts для sheet/api/ads/gsc/gbp

**Не делает:**
- Meta pixel (MTA)
- Product master edits (CAT)
- Next.js site code (WEB)

## Факты (один факт — одно место)

Канон Owner 2026-09-26 / CAT D-011. У факта один владелец; GGL хранит только свои данные и подачу в Google.

### Чьи храним (GGL)

| Факт | Где | Примечание |
|------|-----|------------|
| Merchant sub-account IDs, dataSource IDs | `scripts/lib/merchant-markets.js`, этот контракт | Google MC wiring |
| Shipping flat rates / transit для MC | `merchant-markets.js`, `add-merchant-shipping-*.js` | подача Google, не цена SKU |
| OAuth / SA / GSC-GBP-Ads токены | `token-*.json`, SA key (gitignored) | доступы канала |
| GSC/GBP snapshots, Ads audits | `docs/reports/`, `data/` | наблюдения Google API |
| Cloudflare robots bodies | `cloudflare/alumineu-robots/` | crawl policy доменов |

### Чьи читаем (CAT) — откуда

| Факт CAT | Как читаем сейчас | Целевой источник (CAT 7c07deb, 2026-09-27) |
|----------|-------------------|------------------|
| SKU, title, description, brand, media, PDP URL, price | Live: WEB `https://alumineu.{nl,fr,es}/feeds/google-merchant-*.xml` (из CAT) | Живой XML у WEB; PL / DE / RO — тот же маршрут (запрос WEB) |
| Рынки / сайты / локаль / валюта | `merchant-markets.js` (копия) | `contract_sites` (`site_code`, `base_url`, `locale_code`, `status`, `currency`), фильтр `status = 'live'` |
| Курсы валют | `plnToLocalRate`, `.env` (копия) | `contract_currency_rates` (`currency`, `pln_per_unit`, `valid_from`) — **только справочно** |
| Цена на сайте | CSV (копия) | `contract_site_product_prices` (`variant_id`, `site_code`, `amount_display`, `currency_display`, `price_type = 'list'`) — наценка и курс уже внутри, **не пересчитывать** |
| Цена PL | CSV (копия) | `contract_product_prices`: `price_type = 'list'`, `currency = 'PLN'`, `site_id IS NULL`, `variant_id IS NOT NULL`, `effective_to IS NULL` |
| Адрес страницы | CSV (копия) | `contract_sites.base_url` + `contract_product_seo_pages.url_path` (`entity_type = 'product'`, `is_active`) |
| Название | CSV (копия) | `contract_product_localizations.title` (локаль сайта) |
| Фото | CSV (копия) | `contract_product_media` (`role = 'main'`, `owned_url`, `link_sort`) |
| id / gtin | CSV (копия) | `contract_product_master_flat` (`variant_sku`, `kod_eu`, `gtin`); связка вариант → товар — `contract_catalog_variants` |
| Страницы support / returns | `merchant-markets.js` (хардкод; returns обновлены 2026-09-28 по ответу WEB) | **Не CAT** — WEB `lib/seo/chrome-paths.ts` (ключ `delivery`); страницы контактов WEB ещё не назвал |

Прямой доступ к БД каталога — только `CAT_SUPABASE_URL` + anon key + `contract_*`. Новый select — сначала строка в CAT `consumer_contract.yaml → consumers.ggl`. Чужой `.env` / токены CAT не читать.

**Почему не свои курсы:** `0.23` / `1.15` без наценки R02 дают цену примерно на 11 % ниже сайта (MAGTRAK X508 DE: сайт 28,02 EUR, по 0.23 — 24,84 EUR). Цену только из `contract_site_product_prices`.

### Копии (долг) — не заводить новые

| Файл / место | Факт CAT (копия) | Кто читает у нас | Чем заменить |
|--------------|------------------|------------------|--------------|
| `feeds/google_merchant_from_meta_{pl,de,ro,eu}.csv` | SKU, title, description, price, link, image | `sync-merchant-sheet-from-meta.js`, sheet apply PL/DE/RO/EU | Live CAT/WEB feed или `contract_*` export; CSV не SSOT |
| `feeds/tilda-store-export*.csv`, `feeds/catalog-meta-pl.csv` | SKU, названия, фото, URL Tilda | sheet sync / legacy | То же; legacy до миграции PL |
| `feeds/manufacturer_pilot_pl.tsv` | SKU, title, description, link | Manufacturer Center pilot | `contract_*` / тот же product master |
| `scripts/lib/merchant-markets.js` → `siteOrigin`, `currency`, `contentLanguage`, path URI support/returns | рынок / сайт / локаль / валюта / адреса страниц | все `merchant:*` multi-country | `contract_sites`; support / returns — контракт WEB |
| `scripts/lib/merchant-markets.js` → `plnToLocalRate` 0.23 / 1.15; `.env` `MERCHANT_PLN_TO_EUR` / `MERCHANT_PLN_TO_RON` | курсы PLN→EUR / PLN→RON (не канон 4.24 / 0.83 / 3.60) | `convertPriceCell`, fallback rewrite PL→DE/RO/EU | `contract_site_product_prices` (цена готовая); удалить после GGL-027 |
| `scripts/generate-merchant-feed.js` → `MARKETS.*.baseUrl/currency/locale` + channel title/description | сайт / валюта / локаль; подписи канала фида | локальная генерация XML (legacy path) | Live WEB feed; channel copy — GGL-подача или CAT SEO если это перевод сайта |
| `docs/REPO_DATA_CONTRACT.md` § дыры (список SKU без main) | перечень SKU | люди / диагностика | ссылка на CAT issue/view, не дублировать список SKU как SSOT |
| `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md` | документированные курсы 0.23 / 1.15 | операторы | указать «курс только из CAT» |

**Не найдено в GGL:** канонические курсы `EUR 4.24` / `RON 0.83` / `USD 3.60`, наценки `R01` / `R02` — копий нет.

**Не считаем копией CAT:** ID аккаунтов Google, shipping MC, GSC/Ads performance reports (URL страниц там — наблюдение Google, не master).

### Как закрыть долг

CAT ответил 2026-09-27 (коммит CAT `7c07deb`): view есть, копии GGL записаны в CAT `knowledge_map` со статусом «долг GGL». Данные CAT для PL / DE / RO готовы (адрес и название — 0 пропусков; цена — нет у ENDCAPP Y213 / Y214; фото main — нет у 9 SKU).

1. **WEB:** живой XML — DE / RO готово (6db0c68); PL — после переключения DNS alumineu.pl (Owner).
2. **GGL:** MC DE / RO переведены с Google Sheets на живой XML 2026-09-28 (тот же источник, заменён `fetchUri`). PL — после DNS (GGL-027).
3. **GGL:** после переключения убрать из git `feeds/*.csv`, `tilda-store-export*`, `plnToLocalRate`, `MERCHANT_PLN_TO_*`; хэш коммита — CAT, чтобы снял copies.
4. **Расхождение EU:** MC EU (`5798434120`) смотрит на `alumineu.com`, а в `contract_sites` живой сайт `eu` = `alumineu.eu`. Решить при переключении (GGL-028).

## CAT · Forge — Merchant auto-feed contract (2026-09-03)

### Маппинг полей (источник — контрактные view CAT)

| Поле фида | Источник CAT | Примечание |
|-----------|--------------|------------|
| `g:id` | `product_variants.sku` + `'-'` + `variant_key` | sku НЕ уникален на варианте — 188 вариантов / 122 sku |
| `g:item_group_id` | `products.sku` | |
| `g:title` | `product_localizations.title` | locale сайта, 126/126 заполнено |
| `g:description` | `product_seo_pages.meta_description` | активной PDP сайта, 126/126 (nl/fr/es) |
| `g:link` | `sites.base_url` + `product_seo_pages.url_path` | |
| `g:image_link` | `contract_product_media.owned_url` where `role='main'` | дыра: 9 SKU без main — DECORRA L005/W005/W010/W015, ENDCAPP Y213/Y214, INSERTA Y001/Y002, LIGHTRA NX030 S |
| `g:additional_image_link` | `owned_url` where `role` in (`close_up`, `interior`, `dimensions`), sort `link_sort` | |
| `g:price` | `contract_site_product_prices.amount_display` + `currency_display` | EUR preview (indicative, PLN→EUR), excl. VAT. Все 3 рынка, parity с PDP |
| `g:brand` | `products.brand` | |
| `g:condition` | `new` | константа |
| `g:gtin` | отсутствует | `identifier_exists=false` |
| `g:availability` | `in_stock` (витринный дефолт) | DAT per-variant в резерве (v2) |

### Дыры и блокеры (актуальные)

1. **VAT:** цена excl. VAT — сверить со спекой Merchant для consumer EU (сторона GGL/Owner).
2. **Изображения:** 9 SKU без `main` — нужно решение от CAT или ручное назначение.
3. **Availability:** сейчас `in_stock` для всех. Точный сток per-variant из DAT — в резерве (v2), по запросу.

### Снятые блокеры (2026-09-04)

- ~~Цены только NL~~ → Цены есть на всех рынках (EUR preview, indicative, parity с PDP)
- ~~FR/ES site_price_rules отсутствуют~~ → WEB поднял фиды для всех 3 рынков

## Merchant Center — текущая конфигурация (2026-09-04)

### MCA структура (Multi-Client Account)

**MCA ID:** `5797974210`

| Sub-account | Название | Тип фида | Страна | Язык | Статус |
|-------------|----------|----------|--------|------|--------|
| 5785188396 | Alumineu PL | Google Sheets | PL | pl | ✅ Active |
| 5798257792 | Alumineu DE | — | DE | de | ✅ Active |
| 5798002953 | Alumineu RO | — | RO | ro | ✅ Active |
| 5798434120 | Alumineu EU | — | EU-27 | en | ✅ Active |
| **5849784515** | **Alumineu NL** | **FETCH** | **NL** | **nl** | **✅ Created** |
| **5849001558** | **Alumineu FR** | **FETCH** | **FR** | **fr** | **✅ Created** |
| **5849001567** | **Alumineu ES** | **FETCH** | **ES** | **es** | **✅ Created** |

### Data Sources (фиды) — новые sub-accounts

| Sub-account | Data Source ID | Название | URL фида | Fetch |
|-------------|----------------|----------|----------|-------|
| 5849784515 (NL) | 10722508632 | alumineu-nl | `https://alumineu.nl/feeds/google-merchant-nl.xml` | Daily |
| 5849001558 (FR) | 10722508674 | alumineu-fr | `https://alumineu.fr/feeds/google-merchant-fr.xml` | Daily |
| 5849001567 (ES) | 10723519534 | alumineu-es | `https://alumineu.es/feeds/google-merchant-es.xml` | Daily |
| 5798257792 (DE) | 10682373936 | PRODUCTS SOURCE DE | `https://alumineu.de/feeds/google-merchant-de.xml` (с 2026-09-28; было `drive://1-a8S1X6JHgxvPYYiYu3tGocBLKgS-HzZrR5HXMpVbDs`) | Daily |
| 5798002953 (RO) | 10683104125 | PRODUCTS SOURCE RO | `https://alumineu.ro/feeds/google-merchant-ro.xml` (с 2026-09-28; было `drive://1ARpPpYbjeBbdFOFnfIpLU4GVcToZRR5Hm_EtQ3cMhAo`) | Daily |

Переключение и откат: `node scripts/create-merchant-feed-sources.js --market=de|ro --apply --fetch-now` (меняет `fetchUri` у существующего основного источника, второй не создаёт).

### Политики возврата (2026-09-28)

Страница доставки WEB — одна на сайт, в ней сроки доставки и возврат. Источник у WEB: `lib/seo/chrome-paths.ts`, ключ `delivery`. Для Merchant — URL без якоря.

Условия (как на сайте и в разметке Offer / Organization у WEB): 14 дней после доставки, почтой, обратную доставку оплачивает клиент (`CUSTOMER_PAYING_ACTUAL_FEE`, `CUSTOMER_RESPONSIBILITY`). До 2026-09-28 политики в MC ошибочно обещали бесплатный возврат и не указывали срок.

| Sub-account | Policy ID | URL |
|-------------|-----------|-----|
| 5798257792 (DE) | 9337993149 | `https://alumineu.de/lieferung` |
| 5798002953 (RO) | 9336900313 | `https://alumineu.ro/livrare` |
| 5849784515 (NL) | 9336900340 | `https://alumineu.nl/levering` |
| 5849001558 (FR) | 9336899818 | `https://alumineu.fr/livraison` |
| 5849001567 (ES) | 9337993224 | `https://alumineu.es/envio` |
| 5798434120 (EU) | 9019528374 | `https://alumineu.com/shipping-and-returns` — старые условия (бесплатный возврат), не трогали, GGL-028 |
| 5785188396 (PL) | 8925363183 | `https://alumineu.pl/wysylka-i-zwrot` (Tilda) — старые условия, сверить после DNS |

Прежние DE / RO вели на страницы Tilda, которые на новом сайте отдают 404. Тело страницы доставки DE / RO пока на английском (у WEB не приняты переводы).

### Shipping Services

| Sub-account | Сервис | Страна | Flat Rate | Transit |
|-------------|--------|--------|-----------|---------|
| 5785188396 (PL) | Dostawa PL | PL | 50 PLN | 1-3 дня |
| 5785188396 (PL) | Versand DE | DE | 9.99 EUR | 2-5 дней |
| **5849784515 (NL)** | **Verzending NL** | **NL** | **9.99 EUR** | **2-5 дней** |
| **5849001558 (FR)** | **Livraison FR** | **FR** | **14.99 EUR** | **3-7 дней** |
| **5849001567 (ES)** | **Envío ES** | **ES** | **14.99 EUR** | **3-7 дней** |
| 5798257792 (DE) | Versand DE | DE | 9.99 EUR | 2-5 дней |
| 5798002953 (RO) | Livrare RO | RO | 49 RON | 2-5 дней |
| 5798434120 (EU) | Shipping EU | 27 стран, в т.ч. BE / LU / PT / AT / NL / FR / ES | 14.99 EUR | 3-7 дней |

Сверено 2026-09-28. Домашние страницы всех аккаунтов подтверждены (claimed), поэтому для nl / fr / es / de / ro Google может брать доставку из MC вместо `shippingDetails` в разметке (WEB убрал пустую заглушку 2026-09-28). `alumineu.eu` не привязан ни к одному аккаунту (EU = `alumineu.com`) — GGL-028.

Тарифы 9.99 / 14.99 EUR, 49 RON, 50 PLN — не подтверждены Owner как публичная цена доставки (на сайте стоимость «в оферте»). Расширение стран (NL+BE, FR+BE+LU, ES+PT, DE+AT) — решение Owner, GGL-030.

### Налоги (Tax Settings)

⚠️ **Не настроены.** Требуется конфигурация VAT для NL/FR/ES в Merchant Center UI. См. GGL-018.

### Что ожидает первого fetch

- Продукты из фидов NL/FR/ES появятся в своих sub-accounts после первого scheduled fetch (ежедневно).
- Диагностика атрибутов станет доступна после обработки.
- **Исправлено:** ранее фиды и shipping были ошибочно созданы в PL-аккаунте (5785188396) — удалены оттуда.

## Connection cheat-sheet

### Google Merchant/Ads/GSC/GBP APIs (OAuth)
- **Where token lives:** `token-*.json` OAuth token files (gitignored, local). `token-gsc.json` / `token-ga4.json` — write-scopes `webmasters` + `siteverification` + `analytics.edit` (вход `alumineu.pl@gmail.com`).
- **Connect (~1 min):** `cp .env.example .env`, fill env vars; place `token-*.json` locally (gitignored). Run `npm run merchant:api:verify` / `ads:*` / `gsc:fetch` / `gbp:insights`.
- **Refresh when expired:** OAuth refresh token flow → regenerate `token-*.json`. См. `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md` и `docs/GOOGLE_GBP_ACCESS.md`.
- **GCP APIs (проект `oceanic-craft-452806-c0` / `820829065208`):** Site Verification + Analytics Admin включены 2026-08-28. GA4 NL: property `551815498` (account `355263165`). Measurement ID и токен site-verification — не в git (Vercel / Owner).
- **GSC NL (2026-08-28):** URL-prefix `https://alumineu.nl/` подтверждён HTML-тегом (`siteOwner`). Sitemap `https://alumineu.nl/sitemap.xml` сдан. Domain-property `sc-domain:alumineu.nl` нет (DNS TXT на hoster.by не клали).
- **GSC NL/FR/ES/EU (2026-09-14):** срез `docs/reports/gsc_nl_fr_es_eu_2026-09-11.md`. URL-prefix `siteOwner` у `.nl`/`.fr`/`.es`/`.eu`. EU подтверждён FILE (`google5c6bd815fb268f07.html`), sitemap сдан. Domain-property нет.

### Service Account (Merchant API)
- **Where token lives:** `google-merchant-sa-key.json` (local only, **не коммитить**).
- **Connect:** place key file locally, point env var (см. `.env.example`); service account authorised in Merchant Center.
- **Refresh when expired:** service account keys не expire автоматически; rotate вручную в Google Cloud → IAM → Service Accounts → Keys.

### Cloudflare workers (robots)
- **Where token lives:** CF dashboard (API token в `.env`, gitignored).
- **Connect:** `cloudflare/alumineu-robots/` deploy via CF dashboard / wrangler; token в локальном `.env`.
- **Refresh when expired:** rotate API token в CF dashboard → My Profile → API Tokens.
