# Google PL — аудит (автоматический)

**Дата:** 2026-05-21  
**Агент:** GGL · `alumineu-channel-google`  
**Owner KPI:** GBP profile views + review count ([GOOGLE_GBP_METRICS.md](../../alumineu-business-model/docs/channels/GOOGLE_GBP_METRICS.md))

---

## Пункт 1 — Каталог Merchant PL ✅

**Что сделано:** проверка через Merchant API и сверка с Google Sheets.

**Зачем:** free listings и Shopping показывают только корректный фид; расхождение sheet↔MC ломает доверие и одобрение SKU.

**Сервисы:** Google Merchant Center PL `5785188396`, Sheets `PRODUCTS SOURCE 1`, GCP SA `oceanic-craft`.

| Проверка | Результат |
|----------|-----------|
| API доступ | OK |
| Товаров в MC | **137** |
| DISAPPROVED | **0** |
| Источник | 1× primary Google Sheets `10667412482`, feedLabel=PL, lang=pl |
| Sheet ↔ MC | **In sync** (137 / 137) |
| Market audit PL | **8× OK** — homepage alumineu.pl claimed, shipping **50 PLN** (standard) |

**Команды:** `merchant:api:verify`, `list-products`, `compare-sheet`, `audit-market --market=PL`

**Нужно от вас после каждого `merchant:sheet:apply`:** MC UI → Data sources → **Update** (см. `MERCHANT_BUSINESS_UI_CHECKLIST.md`).

---

## Пункт 2 — GBP KPI snapshot 🟡

**Что сделано:** скрипт `npm run gbp:snapshot` → `data/gbp_snapshots.jsonl`.

**Зачем:** фиксировать owner C1.6 — просмотры профиля и число отзывов без CRM Maps.

**Сервисы:** Google Business Profile (данные вводите вы из Insights).

**Нужно от вас (один раз для baseline):**

```bash
npm run gbp:snapshot -- --views=<ЧИСЛО_ИЗ_INSIGHTS> --reviews=<ЧИСЛО_ОТЗЫВОВ> --reviews-with-photo=<опционально>
```

См. `docs/GBP_SNAPSHOT.md`.

---

## Пункт 3 — Ads API 🟡

| Проверка | Результат |
|----------|-----------|
| OAuth | OK (`token-ads.json`) |
| MCC 114-540-9300 | Alumineu · Manager |
| Client 818-393-0344 | доступен; имя/spend — после **Basic access** + link под MCC |
| 466-950-6698 | всё ещё в списке accessible (закрыть в UI если не нужен) |

**Нужно от вас:** 818 под MCC 114; дождаться Basic access → `npm run ads:audit -- --customer=8183930344`.

---

## Пункт 4 — Merchant API developer ⚠️

| Account | API_DEVELOPER на users |
|---------|------------------------|
| MCA 5797974210 | alumineu.pl@gmail.com ❌; SA ❌ |
| PL 5785188396 | users не отдаются API |

**Нужно от вас:** `docs/MERCHANT_API_DEVELOPER_FIX.md` (контакт / Email-only access в MC).

---

## Пункт 5 — Что отложено (PL first)

| Задача | Статус |
|--------|--------|
| DE/RO/EU MC go-live | после PL Wave A |
| UCP / agentic | watchlist (C1.5) |
| Manufacturer Center | следующий пункт GGL после baseline GBP |
| GA4/GTM | чеклист готов → `docs/GA4_GTM_TILDA_PL_CHECKLIST.md` |

---

## Следующий шаг GGL

1. Ждём от вас **baseline GBP** (2 числа) → запись через `gbp:snapshot`.
2. По вашим **GA4 Measurement ID / GTM container** — вставки для Tilda.
3. Топ-10 URL каталога `.pl` → черновик `schema.org` Product.
