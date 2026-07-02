# [GGL] Cloudflare Worker для `robots.txt` (PL · DE · RO · COM)

Tilda не даёт править корневой `robots.txt`. Worker на Cloudflare отдаёт **только** `https://<домен>/robots.txt`; остальной трафик — на Tilda без изменений.

**Зачем:** Merchant Center не может проверить landing pages, если Tilda закрыла каталог в `User-agent: *` (типично DE: `/produkte/zubehor/vorhanghaken`). Блок **Googlebot Allow: /** в начале файла снимает это для Google.

---

## Файлы в репозитории

| Путь | Назначение |
|------|------------|
| `cloudflare/alumineu-robots/src/index.js` | Worker: маршрутизация по hostname |
| `cloudflare/alumineu-robots/src/robots-bodies.js` | Тексты robots (генерируется скриптом) |
| `cloudflare/alumineu-robots/wrangler.toml` | Маршруты apex + www для 4 зон |
| `docs/alumineu.*-robots.downloaded.txt` | Снимок с Tilda (до Worker) |
| `docs/alumineu.*-robots.recommended.txt` | Googlebot + Tilda Disallow + Sitemap |
| `scripts/robots-txt-tool.js` | download → build → sync → verify |

---

## Статус зон (2026-06)

| Домен | Cloudflare | Worker route | Примечание |
|-------|------------|--------------|------------|
| **alumineu.pl** | Настроить / проверить | `wrangler.toml` | Эталон |
| **alumineu.de** | **NS → Cloudflare** | тот же Worker | DE MC: `landing_page_crawling_not_allowed` |
| **alumineu.ro** | Уже в CF (managed robots) | тот же Worker | Worker **заменяет** весь `/robots.txt` |
| **alumineu.com** | **NS → Cloudflare** | тот же Worker | Сначала `robots:download` после DNS |

---

## Шаг 0 — DNS (для .de и .com, если зоны ещё не в Cloudflare)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Add site** → `alumineu.de` / `alumineu.com`.
2. Импорт DNS или вручную скопировать записи с Tilda (A/CNAME как сейчас).
3. У регистратора сменить **NS** на Cloudflare → дождаться **Active**.
4. **SSL/TLS:** Full (strict) если Tilda отдаёт HTTPS.
5. Прокси (оранжевое облако) — как на `.pl` / `.ro`.

Без Active зоны `wrangler deploy` с `zone_name` не привяжет route.

---

## Шаг 1 — обновить тексты robots

```bash
cd alumineu-channel-google

# Скачать актуальный robots с каждого сайта (где доступен HTTPS)
npm run robots:download

# Добавить блок Googlebot → docs/*-robots.recommended.txt
npm run robots:build-recommended

# Сгенерировать cloudflare/.../robots-bodies.js
npm run robots:sync-worker
```

Или одной командой: `npm run robots:refresh`

**DE:** если `robots:download` не открывает сайт — правьте `docs/alumineu.de-robots.downloaded.txt` вручную (снимок Tilda), затем build + sync.

---

## Шаг 2 — деплой Worker (один Worker на все домены)

```bash
npm run cf:robots:login    # один раз
npm run cf:robots:deploy
```

Если deploy ругается на routes — в Dashboard: **Workers & Pages** → `alumineu-robots-txt` → **Triggers** → **Routes** → добавить для каждой зоны:

- `alumineu.de/robots.txt`
- `www.alumineu.de/robots.txt`
- (аналогично `.ro`, `.com`, `.pl`)

---

## Шаг 3 — проверка

```bash
npm run robots:verify
```

Вручную:

```bash
curl -sS "https://alumineu.de/robots.txt" | head -12
curl -sS "https://alumineu.ro/robots.txt" | head -12
```

Ожидается в начале:

```
User-agent: Googlebot
Allow: /
```

---

## Шаг 4 — Merchant Center

После смены robots подождите **24–48 ч**, затем для каждого sub-аккаунта:

**MC → Products → Feeds → primary source → Fetch now / Update**

Проверка DE API: `npm run merchant:api:audit-market -- --market=DE` — ошибки `landing_page_crawling_not_allowed` должны уйти (404 на битых URL — отдельно, правка ссылок на Tilda).

---

## Как устроен recommended

1. В начале — явный доступ **Googlebot / Googlebot-Image / AdsBot-Google**.
2. Ниже — ваши **Tilda Disallow** (служебные страницы, `/tilda/*`, политики).
3. **Каталог товаров** (`/produkte/`, `/produse/`, `/products/`) для Googlebot **не блокируется**, даже если в `User-agent: *` есть Disallow (Google следует своему блоку).

См. также: `docs/MERCHANT_CATALOG_RESET_RUNBOOK.md` (PL кейс).

---

## Обновление после правок в Tilda

1. `npm run robots:download`
2. `npm run robots:build-recommended`
3. `npm run robots:sync-worker`
4. `npm run cf:robots:deploy`
5. `npm run robots:verify`

API-ключ Cloudflare в чат **не передавать** — только `wrangler login` локально.
