# AGENTS.md — alumineu-channel-google

**Агент:** GGL · Merchant
**Префикс (GitHub):** `[GGL]`

> **Старт:** прочитай этот файл целиком. Управление — chat-first.
> Hub: [AGENT_BOUNDARY_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_BOUNDARY_CANON.md) · [HANDOFF_PROMPTS](https://github.com/krvzdrv/alumineu-os/blob/main/docs/HANDOFF_PROMPTS.md) · [AGENTS_MD_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENTS_MD_CANON.md) · [REPO_DATA_CONTRACT_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/REPO_DATA_CONTRACT_CANON.md)

---

## За что отвечаю (бизнес)

- Google channel: Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center
- Cloudflare robots for alumineu domains

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

## Нужен другой агент?

Сформируй **Handoff** для Owner (не правь чужой repo):
→ `alumineu-os/docs/HANDOFF_PROMPTS.md` — секция «GGL → CAT»

---

## Бэклог (только этот repo)

| Файл | Назначение |
|------|------------|
| `docs/BACKLOG.md` | Агент ведёт **свои** задачи; обновлять после сессии |

Канон бэклога: `alumineu-os/docs/REPO_BACKLOG_CANON.md`.

---

## Конец сессии

- [ ] Бизнес-результат, не рефакторинг структуры
- [ ] `git commit` + `git push`
- [ ] Обнови § Changelog, § Data & API / `docs/REPO_DATA_CONTRACT.md`, § Состояние при изменениях

---

## Гигиена (раз в 2–4 недели)

- [ ] Push веток с работой
- [ ] Удалить ephemeral notes старше 30 дней
- [ ] Актуализировать `docs/REPO_DATA_CONTRACT.md` и § Состояние repo

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-07-08 | AGENTS.md + docs/REPO_DATA_CONTRACT.md (chat-first, role-based, no people/Project) |
| 2026-05-29 | Initial AGENTS.md (docs-only operating system) |
| 2026-05-19 | Полный профиль: capabilities, доступы, docs index, состояние repo |
