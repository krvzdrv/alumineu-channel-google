# Wave A PL — план выполнения (GGL)

**Owner KPI:** GBP profile views + review count (C1.6). **Гео:** PL first (C1.5).

| # | Пункт | Зачем | Сервисы | Нужно от owner |
|---|--------|-------|---------|----------------|
| 1 | Аудит PL каталога | Убедиться, что фид и MC совпадают | Sheets, MC API, Meta/catalog | `.env` / SA; OK на read-only |
| 2 | Скрипт `gbp:snapshot` | Фиксировать KPI карточки каждый месяц | GBP (ручной ввод или CSV) | 2 числа раз в месяц |
| 3 | Отчёт audit + baseline GBP | Одна страница «где мы» | GitHub docs | Baseline views/reviews |
| 4 | GA4 `.pl` (Tilda native) | Измеримость сайта | Tilda, GA4 | `G-J48JDW2DJ5` ✅; GSC link |
| 5 | Черновик schema.org | SEO + AI для карточек | Tilda `.pl` | URLs топ-SKU |
| 6 | MC↔Ads link verify | Сквозная аналитика paid | Ads + MC UI | Клик в UI если API не видит |
| 7 | Developer / API health | Нет блокеров API | GCP, MC | Email contact в MC если warn |

Выполнение: отчёты в `docs/reports/`.

## Статус выполнения (2026-05-21)

| # | Статус | Артефакт |
|---|--------|----------|
| 1 | ✅ | [google_pl_audit_2026-05-21.md](reports/google_pl_audit_2026-05-21.md) |
| 2 | ✅ скрипт | `npm run gbp:snapshot`, [GBP_SNAPSHOT.md](GBP_SNAPSHOT.md) |
| 3 | ✅ | отчёт audit |
| 4 | 🟡 | [GA4_GTM_TILDA_PL_CHECKLIST.md](GA4_GTM_TILDA_PL_CHECKLIST.md) — GA4 ✅; GSC↔GA4 link |
| 5 | 🟡 | [SCHEMA_ORG_TILDA_PL.md](SCHEMA_ORG_TILDA_PL.md) — ждём URL |
| 6 | 🟡 | MC↔Ads — manual UI |
| 7 | ⚠️ | API_DEVELOPER — см. MERCHANT_API_DEVELOPER_FIX |
