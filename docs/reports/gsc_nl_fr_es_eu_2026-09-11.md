# Search Console — NL / FR / ES / EU ([GGL])

**Period:** 2026-08-15 → 2026-09-11 (28 days, `dataState=final`)  
**Fetched:** 2026-09-14  
**JSON:** `docs/reports/gsc_nl_fr_es_eu_2026-09-11.json`

Coverage (indexed / not indexed / error) bulk API в Search Console нет — ниже Performance + sitemaps. Critical issues по API не отдаются отдельным Coverage-отчётом.

## Свойства

| Property | Permission | Sitemap | Last downloaded | Errors / warnings |
|----------|------------|---------|-----------------|-------------------|
| `https://alumineu.nl/` | siteOwner | `…/sitemap.xml` | 2026-09-12 | 0 / 0 |
| `https://alumineu.fr/` | siteOwner | `…/sitemap.xml` | 2026-09-14 | 0 / 0 |
| `https://alumineu.es/` | siteOwner | `…/sitemap.xml` | 2026-09-13 | 0 / 0 |
| `https://alumineu.eu/` | **siteUnverifiedUser** | не сдан | — | свойство добавлено 14.09, verify HTML pending |
| `sc-domain:alumineu.nl` / `.fr` / `.es` / `.eu` | нет | — | — | DNS domain-property не заводили |

## Performance (28d)

| Site | Clicks | Impressions | CTR | Avg position |
|------|-------:|------------:|----:|-------------:|
| NL | 1 | 42 | 2.38% | 26.9 |
| FR | 2 | 17 | 11.76% | 68.2 |
| ES | 0 | 11 | 0% | 70.4 |
| EU | — | — | — | нет доступа (unverified) |

### NL top pages

1. `/` — 1 clk / 3 imp  
2. `/over-ons` — 0 / 3  
3. `/privacyverklaring` — 0 / 3  

### FR top pages

1. `/` — 1 / 1  
2. `/produits/.../curtina-x412` — 1 / 1  
3. `/produits/ventilation/.../aerooom` — 0 / 9  

### ES top pages

1. `/productos/soluciones-de-interior` — 0 / 8  
2. `/productos/perfiles-de-clip` — 0 / 2  
3. `/` — 0 / 1  

## EU verification (блокер)

На проде у **всех** apex (nl/fr/es/eu) один и тот же meta content (`lAuE4wkm…` — токен NL).  
Для `https://alumineu.eu/` API Site Verification ждёт **другой** токен:

`GOOGLE_SITE_VERIFICATION` = `vtbmJANyZj7sm6Z881ycpfW5O1QKizGFMlcBtunvaDk`

После деплоя на Vercel Production проекта `.eu` — GGL подтвердит свойство и сдаст `https://alumineu.eu/sitemap.xml`.
