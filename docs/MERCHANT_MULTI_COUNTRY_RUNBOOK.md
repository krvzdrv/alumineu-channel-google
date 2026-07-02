# Multi-country Merchant Center ([GGL])

Один аккаунт MC **`5785188396`**, **отдельный сайт + primary feed + вкладка Sheets на рынок**.

| Рынок | Сайт | Страна(ы) MC | Язык фида | Валюта | Вкладка Sheets | `feedLabel` |
|-------|------|--------------|-----------|--------|----------------|-------------|
| **PL** | [alumineu.pl](https://alumineu.pl) | Poland | pl (сейчас в MC ru — см. migrate) | PLN | `Alumineu Merchant — PL` | `PL` |
| **DE** | [alumineu.de](https://alumineu.de) | Germany | de | EUR | `Alumineu Merchant — DE` | `DE` |
| **RO** | [alumineu.ro](https://alumineu.ro) | Romania | ro | RON | `Alumineu Merchant — RO` | `RO` |
| **COM** | [alumineu.com](https://alumineu.com) | EU без PL/DE/RO | en | EUR | `Alumineu Merchant — COM` | `COM` |

Конфиг рынков в коде: [`scripts/lib/merchant-markets.js`](../scripts/lib/merchant-markets.js).

---

## Порядок запуска (рекомендуемый)

### 1. PL — стабилизировать (если ещё не сделано)

1. MC → **PRODUCTS SOURCE 1** → **Update**
2. Business identity → logo
3. `npm run merchant:api:compare-sheet -- --market=PL`

### 2. Вкладки Sheets для новых рынков

```bash
npm run merchant:sheet:copy-tab -- --market=DE --apply
npm run merchant:sheet:copy-tab -- --market=RO --apply
npm run merchant:sheet:copy-tab -- --market=COM --apply
```

Копируется структура с PL (строка 1 — заголовки). Каталог заполняется sync-скриптом.

### 3. Источники данных

**Идеально:** отдельный Meta/Tilda экспорт на рынок:

| Рынок | Meta CSV | Tilda store CSV |
|-------|----------|-----------------|
| PL | `feeds/google_merchant_from_meta_pl.csv` | `feeds/tilda-store-export.csv` |
| DE | `feeds/google_merchant_from_meta_de.csv` | `feeds/tilda-store-export-de.csv` |
| RO | `feeds/google_merchant_from_meta_ro.csv` | `feeds/tilda-store-export-ro.csv` | Spreadsheet `1ARpPpYbjeBbdFOFnfIpLU4GVcToZRR5Hm_EtQ3cMhAo` |
| COM | `feeds/google_merchant_from_meta_com.csv` | `feeds/tilda-store-export-com.csv` |

**Пока нет локальных CSV:** скрипт берёт PL-файл и переписывает **link** (домен) и **price** (курс из `.env`):

```bash
MERCHANT_PLN_TO_EUR=0.23
MERCHANT_PLN_TO_RON=1.15
```

Тексты title/description останутся польскими — для Shopping лучше выгрузить каталог с `.de` / `.ro` / `.com`.

### 4. Заполнить вкладки

```bash
# dry-run
npm run merchant:sheet:de
npm run merchant:sheet:ro
npm run merchant:sheet:com

# запись в Sheets
npm run merchant:sheet:de:apply
npm run merchant:sheet:ro:apply
npm run merchant:sheet:com:apply
```

Общий синтаксис: `--market=DE` или env `MERCHANT_MARKET=DE`.

### 5. Merchant Center UI — страны и сайты

1. **Settings → Business info → Countries → Add countries**  
   - Germany, Romania  
   - для COM — страны из списка в `merchant-markets.js` (или сузить под реальную доставку)

2. **Settings → Business info → Websites and claims**  
   - Claim: `https://alumineu.de/`, `https://alumineu.ro/`, `https://alumineu.com/`

3. **Products → Feeds → Add primary feed → Google Sheets**  
   Для каждого рынка **новый** primary source:

   | Feed name (пример) | Spreadsheet | Tab | Target country | feedLabel | Content language |
   |--------------------|-------------|-----|----------------|-----------|------------------|
   | PRODUCTS SOURCE DE | та же книга | Alumineu Merchant — DE | Germany | DE | German (de) |
   | PRODUCTS SOURCE RO | … | Alumineu Merchant — RO | Romania | RO | Romanian (ro) |
   | PRODUCTS SOURCE COM | … | Alumineu Merchant — COM | см. ниже | COM | English (en) |

   **Важно:** `feedLabel` и `content language` после создания через UI **не меняются** через API — задайте правильно при создании.

4. После привязки каждого фида → **Update** на странице источника.

### 6. Доставка по рынкам (API)

```bash
# один рынок
npm run merchant:api:market-shipping -- --market=DE --apply

# все рынки (PL + DE + RO + COM) одним insert
npm run merchant:api:market-shipping -- --all --apply
```

Тарифы по умолчанию в `merchant-markets.js` (DE 9.99 EUR, RO 49 RON, COM 14.99 EUR, PL 50 PLN). Переопределение: `MERCHANT_SHIPPING_FLAT_RATE=12.50` + `--market=DE`.

### 7. Возврат, контакты, политики

- **Returns** — в MC для **каждой** добавленной страны (UI; API ограничен).
- **Customer service** — общий email/телефон OK; при желании `MERCHANT_SUPPORT_URI` per market в `.env` перед `merchant:api:apply-business`.
- На `.de` / `.ro` / `.com` — страницы доставки/возврата с **теми же суммами**, что в MC.

### 8. Сверка

```bash
npm run merchant:api:compare-sheet -- --market=DE
npm run merchant:api:audit-account
```

---

## `alumineu.com` (COM)

`.com` — **не одна страна**. Фид **COM** рассчитан на **остальную EU** (список в конфиге, без PL/DE/RO). Если продаёте только в 3–5 стран, отредактируйте `targetCountries` в `merchant-markets.js` и в MC добавьте **только эти** страны.

Альтернатива: вместо одного COM-фида — **отдельный primary feed на каждую страну** с тем же доменом `alumineu.com` (одинаковые link/EUR, разный `feedLabel` = ISO страны). Это сложнее в поддержке; текущий репозиторий стартует с одного COM-фида.

---

## Переменные `.env`

```bash
GOOGLE_MERCHANT_SPREADSHEET_ID=1M0VnJVUuOSgrka1EoQwkDK7W2usp3qM1V951DPjO1rw

# курсы для fallback PL → DE/RO/COM
MERCHANT_PLN_TO_EUR=0.23
MERCHANT_PLN_TO_RON=1.15

# активный рынок (если не передаёте --market=)
# MERCHANT_MARKET=DE
```

---

## npm-скрипты

| Команда | Назначение |
|---------|------------|
| `merchant:sheet:de` / `:de:apply` | Sync DE |
| `merchant:sheet:ro` / `:ro:apply` | Sync RO |
| `merchant:sheet:com` / `:com:apply` | Sync COM |
| `merchant:sheet:pl` / `:pl:apply` | Sync PL (явно) |
| `merchant:sheet:copy-tab` | Дублировать вкладку из PL |
| `merchant:api:market-shipping` | Доставка per market |

См. также: [MERCHANT_SHEETS_GOOGLE_API.md](MERCHANT_SHEETS_GOOGLE_API.md), [MERCHANT_BUSINESS_UI_CHECKLIST.md](MERCHANT_BUSINESS_UI_CHECKLIST.md).
