# Backlog — GGL · Merchant

**SSOT задач этого репозитория.**
Dispatch — **чат** + `AGENTS.md`. Память работ — здесь.

Канон: [`alumineu-os/docs/REPO_BACKLOG_CANON.md`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/REPO_BACKLOG_CANON.md)  
Портфель: [`alumineu-os/docs/REPO_PORTFOLIO.md`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/REPO_PORTFOLIO.md)

## Now

| ID | Title | Status |
|----|-------|--------|
| GGL-018 | VAT: сверить excl. VAT со спекой Merchant Center для consumer EU | pending |
| GGL-019 | 9 SKU без main image — запросить у CAT или ручное назначение | pending |
| GGL-023 | Диагностика фидов NL/FR/ES после первого fetch (ожидание) | pending |
| GGL-027 | D-011: MC на живой XML WEB. NL/FR/ES/DE/RO/EU уже XML; PL — Sheets до DNS. После PL: удалить CSV / `plnToLocalRate` / `MERCHANT_PLN_TO_*` / convertPrice в sheet-sync, хэш → CAT. Цена фида — роль WEB (`amount_display`), не GGL | in progress |
| GGL-032 | Граница Free Listings: WEB = XML+цена из CAT; GGL = MC wiring. Зафиксировано в REPO_DATA_CONTRACT 2026-10-08; ждём подтверждение WEB | waiting WEB |
| GGL-031 | `token-gsc.json` умер (`invalid_grant`): Owner переводит экран согласия OAuth в In production → GGL заново выпускает токен (webmasters + siteverification + analytics.edit) → подтверждает `sc-domain:alumineu.de` (TXT уже стоит) | waiting Owner |
| GGL-030 | Доставка MC. Решение Owner 2026-09-28: тарифы — правда на сайте (WEB), MC только повторяет; сейчас суммы в MC (9.99 / 14.99 EUR, 49 RON, 50 PLN) — копия GGL. Страны: BE → фиды NL+FR, LU → FR+DE, AT → DE, убрать их из EU; PT — только со своим сайтом pt; отдельный аккаунт = отдельный сайт | waiting WEB (тарифы) |
| GGL-029 | ENDCAPP Y205 / Y206 в DE: Google требует color / age group / gender — нужна `g:google_product_category` в фиде (генератор WEB) | pending |
| GGL-028 | MC EU `5798434120`: `alumineu.com` vs `contract_sites` eu = `alumineu.eu` — решить при переключении | pending |

## Next

| ID | Title |
|----|-------|
| GGL-024 | Availability v2: подключить DAT per-variant (по запросу, сейчас in_stock дефолт) |
| GGL-001 | PL-first Merchant/GBP/GSC контур стабилен; feed из CAT |
| GGL-002 | Shopping test — только по явной команде Owner после GA4.pl |
| GGL-010 | GSC Generative AI на alumineu.pl: проверить показы страниц профилей в AI Overviews / AI Mode (отчёт с 3 июня 2026) |
| GGL-011 | `video_link` в Merchant-фиде PL (serving с 30 июня 2026): ролики монтажа профиля, не только Manufacturer |
| GGL-012 | Conversational attributes (supplemental, не primary): FAQ «какой профиль на нишу», связь профиль↔аксессуар, `document_link` на PDF `/katalog` |
| GGL-013 | Картинки фида ≥ 500×500 к 31 января 2027; сейчас у PL есть «слишком маленькое фото» — Product Studio upscale |
| GGL-014 | GBP под Ask Maps: полнота карточки (категория, фото, Q&A), не посты ради постов; Insights просмотров = 0 |
| GGL-015 | Free Listings → Gemini: после GGL-010 зафиксировать, попадает ли одобренный PL-фид в ответы ИИ (не только вкладка Shopping) |

## Done (последние 2–4 недели)

| ID | Title | Closed |
|----|-------|--------|
| GGL-025 | FIX: фиды и shipping NL/FR/ES перенесены из PL-аккаунта в отдельные sub-accounts | 2026-09-07 |
| GGL-021 | Merchant Center: заведены 3 фида NL/FR/ES (dataSources, daily fetch) | 2026-09-04 |
| GGL-022 | Merchant Center: настроены shipping services NL/FR/ES | 2026-09-04 |
| GGL-017 | Merchant feed NL/FR/ES: фиды live на WEB (API-route из CAT, 117 позиций each) | 2026-09-04 |
| GGL-026 | GSC `alumineu.eu` URL-prefix (FILE) + sitemap | 2026-09-14 |
| GGL-016 | GSC `alumineu.nl` URL-prefix + sitemap (HTML verify) | 2026-08-28 |
| GGL-DATA-01 | REPO_DATA_CONTRACT.md + Data & API в AGENTS.md | 2026-07-09 |
