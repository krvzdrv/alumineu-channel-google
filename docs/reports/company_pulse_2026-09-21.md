# Company pulse — Google channel (срез 2026-09-21)

**Fetched:** 2026-09-21  
**GSC window (final):** 2026-08-22 → 2026-09-18 (28d); 7d = 2026-09-12 → 2026-09-18  
**Sources:** Search Console API, Merchant API, live feed HTTP  
**Не покрыто этим срезом:** GBP (`token-gbp` → `invalid_grant`), Ads spend, GA4 realtime

JSON: `company_pulse_gsc_2026-09-18.json`, `company_pulse_merchant_2026-09-21.json`

---

## 1. Search Console — где появляемся

| Property | Право | 28d clicks | 28d impressions | CTR | Pos | 7d c/i | Sitemap |
|----------|-------|----------:|----------------:|----:|----:|-------:|---------|
| `sc-domain:alumineu.pl` | Owner | **112** | **1392** | 8.0% | 15.5 | 34/310 | ok, 0 err |
| `sc-domain:alumineu.ro` | Owner | **49** | **543** | — | 15.1 | 15/141 | ok |
| `sc-domain:alumineu.com` | Owner | 5 | 124 | — | 5.5 | 2/34 | ok |
| `https://alumineu.nl/` | Owner | 1 | **81** | 1.2% | 24.5 | 0/39 | ok |
| `https://alumineu.fr/` | Owner | 2 | 29 | — | 55.2 | 0/12 | ok |
| `https://alumineu.es/` | Owner | 0 | 19 | — | 58.5 | 0/8 | ok |
| `https://alumineu.eu/` | Owner | 0 | **13** | — | 6.2 | 0/13 | **pending** first fetch |
| `sc-domain:alumineu.de` | **Unverified** | — | — | — | — | — | нет доступа к данным |

`https://alumineu.pl/` дублирует domain-property по цифрам (тот же трафик).

### Запросы с кликами / сильными показами

**PL (ядро компании)**  
- Бренд: `alumineu` 41c/64i, `alumineo` 14c/16i  
- Non-brand клики (единицы): `profile cieniowe`, `karnisz do sufitu napinanego`, `profile do sufitu napinanego`

**RO**  
- `alumineu` 3c; non-brand: `profil tavan extensibil` 2c / 33i (pos ~5.7)

**NL (растёт по показам)**  
- Без кликов за 28d в топе, но показы: `gordijnprofiel` 29i, `gordijnprofielen` 20i

**FR** — клик по бренду `alumineu`  
**ES** — слабые чужие/шумные запросы, 0 кликов  
**EU** — `slidene` 5i, `alumineu` 3i (ранние показы)  
**COM** — в основном бренд-imp без кликов

---

## 2. Merchant / Free Listings

| MC | Site | Products | Feed | Shipping | Homepage | Главный статус FL |
|----|------|--------:|------|----------|----------|-------------------|
| PL `5785188396` | alumineu.pl | 137 | Sheets primary | 2 services | claimed | FL не в топе issues*; шум `local_stores_lack_inventory` ×137 |
| DE `5798257792` | alumineu.de | 137 | Sheets FETCH | 1 | claimed | **pending_initial_policy_review** ×137 |
| RO `5798002953` | alumineu.ro | 137 | Sheets FETCH | 1 | claimed | **pending review** ×137 |
| EU `5798434120` | alumineu.com | 137 | Sheets | 1 | claimed | **pending review** ×137 + landing_page_error ×4 |
| NL `5849784515` | alumineu.nl | 107 | **URL fetch** live | 1 | claimed | **pending review** ×107 |
| FR `5849001558` | alumineu.fr | 107 | **URL fetch** live | 1 | claimed | **pending review** ×107 |
| ES `5849001567` | alumineu.es | 107 | **URL fetch** live | 1 | claimed | **pending review** ×107 |

### Live XML (HTTP сейчас)

| URL | HTTP | items / unique id |
|-----|-----:|------------------:|
| `…nl/feeds/google-merchant-nl.xml` | 200 | 117 / 107 |
| `…fr/…-fr.xml` | 200 | 117 / 107 |
| `…es/…-es.xml` | 200 | 117 / 107 |
| `…eu/…-eu.xml` | **404** | — |
| `…pl/…-pl.xml` | **403** | (PL всё ещё Sheets, не этот URL) |

Дубли `g:id` на NL/FR/ES: 117 item → 107 unique — часть вариантов схлопывается в MC.

---

## 3. Короткий вердикт на 21.09

1. **PL органика** — единственный заметный канал (≈4 клика/день). Бренд держит; non-brand всё ещё слабый.  
2. **RO** — второй по жизни в поиске; есть non-brand.  
3. **Новые витрины NL/FR/ES/EU** — индексация идёт (показы растут, особенно NL `gordijnprofiel*`), кликов почти нет — нормально для возраста домена.  
4. **DE GSC сломан для API** (`siteUnverifiedUser`) — цифр нет, нужен Owner в кабинете.  
5. **Free Listings** на NL/FR/ES/DE/RO/EU всё ещё в **initial policy review** — в выдаче FL не ждать, пока Google не снимет DISAPPROVED.  
6. **GBP Insights** — нет доступа (`invalid_grant`).

---

## 4. Нужны доступы Owner

```
1) GBP: npm run gbp:auth — войти alumineu.pl@gmail.com (insights сдохли).
2) GSC DE: в Search Console восстановить Owner на sc-domain:alumineu.de
   (сейчас siteUnverifiedUser — API пустой).
3) По желанию Ads: если нужен spend/ROAS в том же пульсе — npm run ads:auth.
```

GA4 Admin token жив (тот же OAuth, что GSC write); отдельный Data API срез по hostname можно снять следующей итерацией, если скажете.
