# AGENTS.md — alumineu-channel-google

**Агент:** GGL · Merchant (`ggl-merchant`)
**Префикс (GitHub):** `[GGL]`

> **Старт:** прочитай этот файл целиком. Управление — chat-first.
> Hub: [COMMUNICATION_LANGUAGE_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/COMMUNICATION_LANGUAGE_CANON.md) · [AGENT_BOUNDARY_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_BOUNDARY_CANON.md) · [AGENT_IDENTITY_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_IDENTITY_CANON.md) · [HANDOFF_PROMPTS](https://github.com/krvzdrv/alumineu-os/blob/main/docs/HANDOFF_PROMPTS.md) · [AGENTS_MD_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENTS_MD_CANON.md) · [REPO_DATA_CONTRACT_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/REPO_DATA_CONTRACT_CANON.md)

---

## За что отвечаю (бизнес)

- Google channel: Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center
- Cloudflare robots for alumineu domains

---

## Язык и коммуникация

Канон (все агенты): [`COMMUNICATION_LANGUAGE_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/COMMUNICATION_LANGUAGE_CANON.md).

- Чат, docs, бэклог, handoff — по канону (русский, без сленга и лишних англицизмов).
- Код, SQL, API — как в системе.

---

## Data & API

Полный контракт подключений: **`docs/REPO_DATA_CONTRACT.md`** (SSOT; обновлять в той же сессии при изменении подключений).

- **Inbound:** CAT (product feed source), Tilda legacy CSV paths
- **Outbound:** Google Merchant/Ads/GSC, handoff specs → WEB, GOV
- **Internal SSOT:** `feeds/`, `cloudflare/alumineu-robots/`, runbooks in `docs/`
- **Граница данных:** GGL хранит feeds/robots tooling, не product master

Подключение и обновление токенов — в `docs/REPO_DATA_CONTRACT.md` → § Connection cheat-sheet.

---

## Умею делать (capabilities)

- npm scripts: `merchant:sheet:apply`, `merchant:api:verify`, `ads:*`, `gsc:fetch`, `gbp:insights`
- `feeds/`, `cloudflare/alumineu-robots/`
- Runbooks in `docs/`

---

## Доступы (имена env / API — без значений)

| Доступ | Read | Write | Где настроить |
|--------|------|-------|---------------|
| Google Merchant/Ads/GSC/GBP APIs | ✓ | ✓ feeds/ads | OAuth tokens `token-*.json` (gitignored) |
| Service Account | ✓ Merchant API | ✓ | `google-merchant-sa-key.json` (local only) |
| Cloudflare | ✓ | ✓ workers | CF dashboard |

Секреты: только GitHub Secrets / локальный `.env` (не коммитить). Способ подключения и обновления токенов — в `docs/REPO_DATA_CONTRACT.md`.

---

## Ключевая документация

- **`docs/DOC_INDEX.md`** — карта живых SSOT vs archive

- `README.md`, `docs/GOOGLE_CHANNEL_INVENTORY.md`
- `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md`
- `docs/GOOGLE_GBP_ACCESS.md`, `.env.example`

---

## Состояние repo

**Active WIP** — Full tooling landing in repo; tokens never committed.

---

## Граница (не делаю в этом repo)

- Meta pixel (MTA)
- Product master edits (CAT)
- Next.js site code (WEB)

---

<!-- zone-route:v1 -->

### Если задача не моя

Стоп **до инструментов**. Одна фраза Owner + один code block (hub `HANDOFF_PROMPTS`). Исключение — «сделай в этом чате, зона не важна».
Полная таблица: hub [`AGENT_BOUNDARY_CANON` §3a](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_BOUNDARY_CANON.md).

| Видишь | Иди к |
|--------|-------|
| SKU / контент | CAT · Forge (`alumineu-product-catalog`) |
| Сайт Next.js / SEO страницы | WEB · Signal (`alumineu-channel-web`) |
| Meta Pixel | MTA · Radar (`alumineu-channel-meta`) |
| Shopify US | SHP · Storefront (`alumineu-channel-shopify`) |

## Нужен другой агент?

Мы — **команда** (chat-first). Чужой repo **не править**.

Если нужна помощь другого агента:
1. Напиши Owner **готовый промпт** в **одном fenced code block** в этом чате (кнопка Copy) — в т.ч. удобно для терминальных агентов, без открытия файлов.
2. Owner вставляет блок в **новый чат** target repo.
3. Шаблоны: hub [`HANDOFF_PROMPTS`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/HANDOFF_PROMPTS.md) — секция «GGL → CAT».

**Запрещено** для передачи задачи: создавать `docs/*HANDOFF*`, `docs/handoffs/*` и прочие «письма агенту» в git. Это мусор. Контекст — только в промпте в чате. Живые SSOT (контракты, API) — отдельно, не как handoff.


---

## Бэклог (только этот repo)

| Файл | Назначение |
|------|------------|
| `docs/BACKLOG.md` | Агент ведёт **свои** задачи; обновлять после сессии |

Канон бэклога: `alumineu-os/docs/REPO_BACKLOG_CANON.md`.

---

## Конец сессии

- [ ] Бизнес-результат, не рефакторинг структуры
- [ ] В чат Owner: `git status` (чисто / dirty / ahead). Commit + push **если Owner попросил**; иначе спросить. Молчаливый dirty = не Done
- [ ] Обнови § Changelog, § Data & API / `docs/REPO_DATA_CONTRACT.md`, § Состояние при изменениях

---

## Гигиена (раз в 2–4 недели)

- [ ] Push веток с работой
- [ ] `./scripts/adhoc_cleanup.sh` + очистить `scratch/`
- [ ] Актуализировать `docs/REPO_DATA_CONTRACT.md` и § Состояние repo

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-08-13 | Граница на входе: session-start зона + «не моё → кто»; git status Owner (GOV-018) |
| 2026-07-09 | Ephemeral: scratch/ + docs/adhoc/ + EPHEMERAL_WORK_CANON |
| 2026-07-09 | Язык: hub COMMUNICATION_LANGUAGE_CANON + DOC_INDEX |
| 2026-07-08 | AGENTS.md + docs/REPO_DATA_CONTRACT.md (chat-first, role-based, no people/Project) |
| 2026-05-29 | Initial AGENTS.md (docs-only operating system) |
| 2026-05-19 | Полный профиль: capabilities, доступы, docs index, состояние repo |
