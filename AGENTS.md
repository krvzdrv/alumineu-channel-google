# AGENTS.md — alumineu-channel-google

**Агент:** GGL · Merchant  
**Префикс (GitHub):** `[GGL]`

> **Старт:** прочитай этот файл. **GitHub Project не используется** как очередь.  
> Hub: [AGENT_BOUNDARY_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_BOUNDARY_CANON.md) · [HANDOFF_PROMPTS](https://github.com/krvzdrv/alumineu-os/blob/main/docs/HANDOFF_PROMPTS.md) · [AGENTS_MD_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENTS_MD_CANON.md)

---

## За что отвечаю (бизнес)

- Google channel: Merchant Center feeds, Ads, GSC, GBP, Manufacturer Center
- Cloudflare robots for alumineu domains
---

## Откуда беру данные (upstream)

| Источник | Repo / система | Что именно |
|----------|----------------|------------|
| CAT · Forge | alumineu-product-catalog | product feed source |
| Tilda | exports | legacy CSV paths |
---

## Кому отдаю (downstream)

- Google Merchant / Ads / GSC
- Handoff specs → WEB, GOV
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

Секреты: GitHub Secrets / локальный `.env` (не коммитить). OAuth Google часто через `alumineu-finance-ops` (`GOOGLE_AUTH_ROOT`).

---

## Ключевая документация

- `README.md`, `docs/GOOGLE_CHANNEL_INVENTORY.md`
- `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md`
- `docs/GOOGLE_GBP_ACCESS.md`, `.env.example`
---

## Состояние repo

**Active WIP** — Full tooling landing in repo; tokens never committed.

---

## Никогда не делаю в этом repo

- Meta pixel (MTA)
- Product master edits (CAT)
- Next.js site code (WEB)
---

## Нужен другой агент?

Сформируй **Handoff** для владельца (не правь чужой repo):  
→ `alumineu-os/docs/HANDOFF_PROMPTS.md` — секция «GGL → CAT»


## Бэклог (только этот repo)

| Файл | Назначение |
|------|------------|
| `docs/BACKLOG.md` | Агент ведёт **свои** задачи; обновлять после сессии |

**Не открывать** GitHub Project #2. Канон: hub `docs/REPO_BACKLOG_CANON.md`.

---

## Конец сессии

- [ ] Бизнес-результат, не рефакторинг структуры
- [ ] `git commit` + `git push`
- [ ] Обнови § Changelog и § Умею делать / Доступы / Состояние при изменениях

---

## Гигиена (раз в 2–4 недели)

- [ ] Push веток с работой
- [ ] Удалить ephemeral notes старше 30 дней
- [ ] Актуализировать upstream/downstream и § Состояние repo

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-05-29 | Initial AGENTS.md (docs-only operating system) |
| 2026-05-19 | Полный профиль: capabilities, доступы, docs index, состояние repo |
