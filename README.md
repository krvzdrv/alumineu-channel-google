# Alumineu — Google channel

Репозиторий для интеграций и артефактов канала **Google** (Merchant Center, Ads, Measurement) в контуре Alumineu.

- Агент **GGL · Merchant** — старт: [`AGENTS.md`](AGENTS.md), задачи **chat-first**
- Канон: [`alumineu-os` / AGENT_OPERATING_SYSTEM](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_OPERATING_SYSTEM.md)

## Полный инвентарь технологий Google

Справочник «что это / зачем / статус / приоритет / связь с бизнес-моделью»:

- **[docs/GOOGLE_CHANNEL_INVENTORY.md](docs/GOOGLE_CHANNEL_INVENTORY.md)** — SSOT (GGL)
- **[docs/GOOGLE_OWNER_DECISIONS.md](docs/GOOGLE_OWNER_DECISIONS.md)** — решения owner (PL first, KPI GBP)
- **[docs/agents/BM_GOOGLE_CHANNEL_SYNC_PROMPT.md](docs/agents/BM_GOOGLE_CHANNEL_SYNC_PROMPT.md)** — handoff для агента бизнес-модели (MDL)
- В `alumineu-business-model`: [docs/channels/GOOGLE_ECOSYSTEM.md](../alumineu-business-model/docs/channels/GOOGLE_ECOSYSTEM.md), [MDL_GOOGLE_CHANNEL_SYNC_PROMPT.md](../alumineu-business-model/docs/agents/MDL_GOOGLE_CHANNEL_SYNC_PROMPT.md)

## Фид Merchant Center и Google Sheets

Синхронизация CSV (Meta или готового набора колонок MC) в вашу Google Таблицу через **Sheets API** и тот же OAuth, что в `alumineu-finance-ops`: см. [docs/MERCHANT_SHEETS_GOOGLE_API.md](docs/MERCHANT_SHEETS_GOOGLE_API.md). **Несколько стран (PL / DE / RO / COM):** [docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md](docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md). Официальный шаблон Merchant (xlsx) лежит в [feeds/templates/google_merchant_products_source_ru.xlsx](feeds/templates/google_merchant_products_source_ru.xlsx); данные пишутся **со строки 6**, строки 2–5 шаблона не затираются.

```bash
npm install
npm run merchant:sheet:apply
```

Доступ **Merchant API**, если счёт Merchant Center висит на **другой** учётке Google и для CI нужен только сервис-аккаунт: см. [docs/MERCHANT_CENTER_API_ACCESS.md](docs/MERCHANT_CENTER_API_ACCESS.md); проверка: `npm run merchant:api:verify` (переменные в [`.env.example`](.env.example)).

Сброс каталога и переподключение фида: [docs/MERCHANT_CATALOG_RESET_RUNBOOK.md](docs/MERCHANT_CATALOG_RESET_RUNBOOK.md).

Wave A PL (план и отчёты): [docs/GOOGLE_PL_WAVE_A_RUNBOOK.md](docs/GOOGLE_PL_WAVE_A_RUNBOOK.md), [docs/reports/google_pl_audit_2026-05-21.md](docs/reports/google_pl_audit_2026-05-21.md).

GBP KPI: `npm run gbp:auth` → `npm run gbp:insights` (просмотры 28d API) или `gbp:snapshot` вручную — [docs/GOOGLE_GBP_ACCESS.md](docs/GOOGLE_GBP_ACCESS.md).

Связка MC ↔ Ads (без запуска рекламы): [docs/MC_ADS_LINK_GUIDE.md](docs/MC_ADS_LINK_GUIDE.md), проверка: `npm run ads:check-mc-link`.

## Лицензия

MIT
