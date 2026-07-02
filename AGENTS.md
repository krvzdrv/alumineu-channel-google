# AGENTS.md — alumineu-channel-google

**Агент:** GGL · Merchant  
**Префикс (GitHub):** `[GGL]`

> **Старт:** прочитай этот файл. **GitHub Project не используется** как очередь.  
> Hub: [AGENT_BOUNDARY_CANON](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_BOUNDARY_CANON.md) · [HANDOFF_PROMPTS](https://github.com/krvzdrv/alumineu-os/blob/main/docs/HANDOFF_PROMPTS.md)

---

## За что отвечаю (бизнес)

- Google Merchant, Ads feeds, GBP tooling

---

## Откуда беру данные (upstream)

| Источник | Repo | Что именно |
|----------|------|------------|
| CAT | alumineu-product-catalog | catalog export / CSV |

---

## Кому отдаю (downstream)

- Google Shopping / Ads

---

## Никогда не делаю в этом repo

- Planfix sync
- KPI bot

---

## Нужен другой агент?

Сформируй **Handoff** для владельца (не правь чужой repo):  
→ `alumineu-os/docs/HANDOFF_PROMPTS.md` — секция «GGL → CAT»

---

## Конец сессии

- [ ] Бизнес-результат, не рефакторинг структуры
- [ ] `git commit` + `git push`
- [ ] Обнови § Changelog если менялись границы

---

## Гигиена (раз в 2–4 недели)

- [ ] Push веток с работой
- [ ] Удалить `docs/notes/*` старше 30 дней
- [ ] Проверить upstream/downstream таблицы

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-05-29 | Initial AGENTS.md (docs-only operating system) |
