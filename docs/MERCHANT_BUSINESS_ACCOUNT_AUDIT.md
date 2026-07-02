# [GGL] Аудит бизнес-аккаунта Merchant Center (Alumineu)

Счёт: **5785188396** · Сайт: **alumineu.pl** · Рынок: **PL**

```bash
npm run merchant:api:audit-account
npm run merchant:api:compare-sheet
npm run merchant:api:apply-business -- --apply
```

UI-only: [MERCHANT_BUSINESS_UI_CHECKLIST.md](MERCHANT_BUSINESS_UI_CHECKLIST.md)

---

## Снимок (28 мая 2026)

| Область | Статус |
|---------|--------|
| Каталог | 136–137 active, 0 archived |
| DISAPPROVED | 0 |
| Free listings | ENABLED |
| Домен | alumineu.pl claimed |
| Источник | 1× Sheets (lang **ru**, feedLabel PL) |
| Customer service | biuro@alumineu.pl, +48 532 263 193, kontakt |
| Returns | wysylka-i-zwrot |
| Autofeed | OFF |

### ⚠️ Открыто

| # | Задача | Как |
|---|--------|-----|
| 1 | Business identity (логотип) | UI — см. UI checklist |
| 2 | 137 sheet vs 136 MC | UI Update feed + compare-sheet |
| 3 | unit pricing (если останется) | merchant:sheet:apply |
| 4 | Доставка vs сайт | MERCHANT_SHIPPING_FLAT_RATE_PLN + apply-business |
| 5 | Фид ru→pl | migrate-feed-lang + UI новый primary |

### `.env` (apply-business)

```env
MERCHANT_SUPPORT_EMAIL=biuro@alumineu.pl
MERCHANT_SUPPORT_PHONE=+48532263193
MERCHANT_SUPPORT_URI=https://alumineu.pl/kontakt
MERCHANT_DISABLE_AUTOFEED=1
MERCHANT_SHIPPING_MIN_TRANSIT_DAYS=1
MERCHANT_SHIPPING_MAX_TRANSIT_DAYS=3
MERCHANT_SHIPPING_SERVICE_NAME=Dostawa PL
MERCHANT_SHIPPING_FLAT_RATE_PLN=50
MERCHANT_ALIGN_SHIPPING=1
MERCHANT_DISABLE_AUTO_IMPROVEMENTS=1
```

---

## Связанные документы

- [MERCHANT_CATALOG_RESET_RUNBOOK.md](MERCHANT_CATALOG_RESET_RUNBOOK.md)
- [MERCHANT_SHEETS_GOOGLE_API.md](MERCHANT_SHEETS_GOOGLE_API.md)
- [MERCHANT_CENTER_API_ACCESS.md](MERCHANT_CENTER_API_ACCESS.md)
