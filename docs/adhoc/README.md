# docs/adhoc/ — сохранённые разовые срезы

Сюда кладём артефакт **только если Owner сказал сохранить** срез/таблицу/разбор.

Канон: [`EPHEMERAL_WORK_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/EPHEMERAL_WORK_CANON.md).

- Имя: `YYYY-MM-DD-slug.md` (+ при необходимости тот же slug с `.csv`)
- В `.md` обязателен frontmatter `created:` / `expires:` (по умолчанию +30 дней)
- Уборка: `./scripts/adhoc_cleanup.sh`
- Не путать с живым SSOT и с `docs/reports/` (снимки аудитов)
