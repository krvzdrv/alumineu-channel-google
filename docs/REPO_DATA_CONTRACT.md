```yaml
repo: alumineu-channel-google
agent: GGL-Merchant
purpose: Google channel — Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center + Cloudflare robots
updated_at: 2026-09-03
inbound:
  - source: alumineu-product-catalog (CAT · Forge)
    what: product feed source
    interface: Postgres view / CSV / repo read
    auth: уточнить при первом подключении
    env: []
    token_file: null
    access: read
    status: active
    contract_date: 2026-09-03
    contract_note: Auto-feed Merchant NL/FR/ES — маппинг полей согласован, первая волна только NL
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
| Google Merchant / Ads / GSC / GBP | feeds, ads, GSC data, GBP insights | Google APIs | `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md` | read+write | `merchant:feed:nl:generate`, `merchant:sheet:apply`, `merchant:api:verify`, `ads:*`, `gsc:fetch`, `gbp:insights` |
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
      feeds/google-merchant-nl.xml  ·  cloudflare/alumineu-robots/  ·  npm scripts
              │
              ▼
        WEB · Signal (host /feeds/*.xml)
              │
              ▼
   Google Merchant Center (scheduled fetch)
```

**Схема фида (новая, 2026-09-03):**
1. CAT экспортирует CSV (product_variants + localizations + media + prices)
2. GGL генерирует XML: `npm run merchant:feed:nl:generate`
3. WEB хостит `/feeds/google-merchant.xml` (статический файл или API route)
4. Merchant Center забирает фид по URL (scheduled fetch, ежедневно)

**Схема фида (старая, legacy):**
- CSV → Google Sheets → Merchant Center (вручную, через `merchant:sheet:apply`)
- Используется для PL/DE/RO пока нет CAT-контракта

```
CAT (product feed)  Tilda (legacy CSV)
   │                     │
   └──────────┬──────────┘
              ▼
   [alumineu-channel-google]
      feeds/  ·  cloudflare/alumineu-robots/  ·  npm scripts
              │
   ┌──────────┼──────────┐
   ▼          ▼          ▼
Google Merchant/Ads/GSC/GBP   WEB (handoff)   GOV (handoff)
```

## Boundaries

**Делает:**
- Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center tooling
- Cloudflare robots для alumineu domains
- npm scripts для sheet/api/ads/gsc/gbp

**Не делает:**
- Meta pixel (MTA)
- Product master edits (CAT)
- Next.js site code (WEB)

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
| `g:price` | `contract_site_product_prices.amount_display` + `currency_display` | только NL (EUR, indicative). FR/ES `site_price_rules` нет — стартовать нельзя |
| `g:brand` | `products.brand` | |
| `g:condition` | `new` | константа |
| `g:gtin` | отсутствует | `identifier_exists=false` |
| `g:availability` | DAT `inventory_position_wms_adjusted` по `identity_external_code` (`kod_eu`) | variant grain — вне CAT, как на PDP |

### Дыры и блокеры

1. **Цены — только NL.** `site_price_rules` есть только для `alumineu_nl` (EUR, indicative, PLN×1.10/4.24, excl. VAT). FR/ES `site_price_rules` отсутствуют — фид FR/ES стартовать нельзя до решения Owner.
2. **Цена indicative** — та же цифра на PDP, консистентно; твёрдый EUR — вопрос Owner/PRC, не блокер при parity с PDP.
3. **VAT:** цена excl. VAT — сверить со спекой Merchant для consumer EU (сторона GGL/Owner).
4. **Изображения:** 9 SKU без `main` — нужно решение от CAT или ручное назначение.

### Рекомендация

Первая волна фида — **только NL**. FR/ES подключатся, когда CAT запишет `site_price_rules` (сигнал от Owner).

## Connection cheat-sheet

### Google Merchant/Ads/GSC/GBP APIs (OAuth)
- **Where token lives:** `token-*.json` OAuth token files (gitignored, local). `token-gsc.json` / `token-ga4.json` — write-scopes `webmasters` + `siteverification` + `analytics.edit` (вход `alumineu.pl@gmail.com`).
- **Connect (~1 min):** `cp .env.example .env`, fill env vars; place `token-*.json` locally (gitignored). Run `npm run merchant:api:verify` / `ads:*` / `gsc:fetch` / `gbp:insights`.
- **Refresh when expired:** OAuth refresh token flow → regenerate `token-*.json`. См. `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md` и `docs/GOOGLE_GBP_ACCESS.md`.
- **GCP APIs (проект `oceanic-craft-452806-c0` / `820829065208`):** Site Verification + Analytics Admin включены 2026-08-28. GA4 NL: property `551815498` (account `355263165`). Measurement ID и токен site-verification — не в git (Vercel / Owner).
- **GSC NL (2026-08-28):** URL-prefix `https://alumineu.nl/` подтверждён HTML-тегом (`siteOwner`). Sitemap `https://alumineu.nl/sitemap.xml` сдан. Domain-property `sc-domain:alumineu.nl` нет (DNS TXT на hoster.by не клали).

### Service Account (Merchant API)
- **Where token lives:** `google-merchant-sa-key.json` (local only, **не коммитить**).
- **Connect:** place key file locally, point env var (см. `.env.example`); service account authorised in Merchant Center.
- **Refresh when expired:** service account keys не expire автоматически; rotate вручную в Google Cloud → IAM → Service Accounts → Keys.

### Cloudflare workers (robots)
- **Where token lives:** CF dashboard (API token в `.env`, gitignored).
- **Connect:** `cloudflare/alumineu-robots/` deploy via CF dashboard / wrangler; token в локальном `.env`.
- **Refresh when expired:** rotate API token в CF dashboard → My Profile → API Tokens.
