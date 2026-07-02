# [GGL] Сброс каталога Merchant Center (Alumineu PL)

Пошаговый runbook для счёта **5785188396**: один primary-фид из Google Sheets **«Alumineu Merchant — PL»**, без дублей с сайта.

## Предусловия

- `.env`: `GOOGLE_MERCHANT_ID`, `GOOGLE_APPLICATION_MERCHANT_CREDENTIALS`, Sheets OAuth (`token.json`, `GOOGLE_MERCHANT_*`)
- `npm run merchant:api:verify` → OK
- `https://alumineu.pl/robots.txt` содержит блоки `User-agent: Googlebot` и `Allow: /`

## Текущие id источников (snapshot 2026-05-28)

| id | displayName | тип | товаров |
|----|-------------|-----|---------|
| `10667412482` | PRODUCTS SOURCE 1 | Google Sheets primary (feedLabel=PL, **lang=pl**) | 137 |

Старый ru-источник `10664644623` удалён в UI; осиротевшие productInputs очищены через API.

Found by Google / crawl: **выключен** (autofeed off). Источники `10664998540`, `10655660984`, `10664644623` — удалены.

Проверить актуально:

```bash
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:list-sources
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:list-products
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:compare-sheet -- --market=PL
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:audit-market -- --market=PL
```

---

## Фаза 0 — Preflight

```bash
curl -sS "https://alumineu.pl/robots.txt" | head -30
```

В MC: **Настройки → Доступ к URL** — домен `alumineu.pl` подтверждён.

---

## Фаза 1 — Диагностика

```bash
npm run merchant:api:list-sources
npm run merchant:api:list-products
```

Типичные коды до сброса: `image_link_crawling_not_allowed`, `item_missing_required_attribute`.

---

## Фаза 2 — Таблица фида

Таблица: `1M0VnJVUuOSgrka1EoQwkDK7W2usp3qM1V951DPjO1rw`, вкладка **Alumineu Merchant — PL** (gid `2043783323`).

```bash
npm run merchant:sheet:rename-tab   # если вкладка ещё не переименована
npm run merchant:sheet              # dry-run
MERCHANT_STRICT_VALIDATION=1 npm run merchant:sheet:apply
```

См. также [MERCHANT_SHEETS_GOOGLE_API.md](MERCHANT_SHEETS_GOOGLE_API.md).

---

## Фаза 3 — Убрать дубли с сайта (UI Merchant Center)

1. [Merchant Center](https://merchants.google.com/) → **Настройки** → **Источники данных**
2. Вкладка **Product sources** → секция **Found by Google** (источник `alumineu.pl`)
3. **⋮ → Stop managing products**

Ожидание: **4–8 часов**. Альтернатива: удалить 2 позиции вручную в **Товары** с фильтром по источнику.

> Не включайте «Hide all» без необходимости — жёстче и дольше.

---

## Фаза 4 — Удалить старый Google Sheets-источник (API)

```bash
npm run merchant:api:delete-source -- --dry-run --id=10664644623
npm run merchant:api:delete-source -- --apply --id=10664644623
```

Это удаляет источник **PRODUCTS SOURCE 1** и все товары с него. Подождите **15–60 мин**:

```bash
npm run merchant:api:list-products
```

---

## Фаза 5 — Переподключить фид (UI)

1. MC → **Настройки → Источники данных → Add data source**
2. **Google Sheets** → таблица `1M0VnJVUuOSgrka1EoQwkDK7W2usp3qM1V951DPjO1rw`
3. Вкладка: **Alumineu Merchant — PL**
4. Display name: **Alumineu Merchant — PL**
5. Страна **PL**, язык **pl (Polish)**, feed label **PL**

Первый fetch: **30 мин – несколько часов**.

> **2026-05-28:** фид пересоздан с `contentLanguage=pl` (источник `10667412482`). Язык `ru` больше не используется.

---

## Фаза 6 — Мониторинг и правки

```bash
npm run merchant:api:list-products
```

Цикл: правка таблицы → `npm run merchant:sheet:apply` → ждать processing → снова list.

| Проблема | Действие |
|----------|----------|
| `image_link_crawling_not_allowed` | Прямые URL картинок (не `drive.google.com/uc?id=…`); проверить robots для Googlebot-Image |
| `google_category_unrecognized` | Задать **numeric** GPC (напр. `7112` = Molding) в колонке `google product category`; текст `Ceiling Profiles` **нет** в таксономии Google |
| `item_missing_required_attribute` | Заполнить обязательные колонки (см. MERCHANT_SHEETS_GOOGLE_API.md) |
| `missing_potentially_required_attribute` | Опционально: unit pricing measure для товаров по весу/длине |
| Landing page / crawl | robots OK → подождать 24–48 ч повторного crawl |

---

## Команды (шпаргалка)

| Команда | Назначение |
|---------|------------|
| `npm run merchant:api:verify` | Проверка SA |
| `npm run merchant:api:list-sources` | Список источников |
| `npm run merchant:api:list-products` | Товары + issues |
| `npm run merchant:api:delete-source -- --apply --id=…` | Удалить источник |
| `npm run merchant:sheet:apply` | Синк Meta/CSV → таблица |
| `npm run merchant:api:reactivate-archived -- --apply --all` | Сброс productInputs для re-ingest Sheets |

Доступ API: [MERCHANT_CENTER_API_ACCESS.md](MERCHANT_CENTER_API_ACCESS.md).

---

## Статус выполнения (автоматизация)

| Шаг | Статус |
|-----|--------|
| Preflight robots.txt (Googlebot Allow) | OK |
| Переименование вкладки → **Alumineu Merchant — PL** | OK |
| `merchant:sheet:apply` (137 строк, strict validation) | OK |
| Удалены legacy-источники (`10664998540`, `10655660984`, `10664644623`) | OK |
| Переподключён Google Sheets → **PRODUCTS SOURCE 1** (`10667412482`, lang=**pl**) | OK |
| Found by Google (autofeed) | OFF |
| Orphan ru productInputs (136) | OK — очищены |
| **Финальная проверка 2026-05-28** | |

```
137 products | 0 DISAPPROVED | 1 data source (Sheets)
feedLabel=PL | contentLanguage=pl | countries=PL
Sheet ↔ MC: in sync (137/137)
audit-market PL: 8/8 OK
```

После каждого `merchant:sheet:apply` → **MC → PRODUCTS SOURCE 1 → Update**:

```bash
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:list-sources
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:list-products
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:compare-sheet -- --market=PL
GOOGLE_MERCHANT_ID=5785188396 npm run merchant:api:audit-market -- --market=PL
```

> `merchant:api:audit-account` на sub-account MCA возвращает 403 — используйте `audit-market --market=PL`.

