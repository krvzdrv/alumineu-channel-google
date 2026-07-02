# Handoff: синхронизация Google Channel → Business Model

**От:** GGL · Merchant (`alumineu-channel-google`)  
**Кому:** MDL · Canvas (`alumineu-business-model`)  
**Префикс комментариев MDL:** `[MDL]`  
**SSOT технологий Google:** [`../GOOGLE_CHANNEL_INVENTORY.md`](../GOOGLE_CHANNEL_INVENTORY.md)

Дублирующие промпты для запуска **внутри business-model:**

- **Sync статусов:** `alumineu-business-model/docs/agents/MDL_GOOGLE_CHANNEL_SYNC_PROMPT.md`
- **Интеграция с BMC/graph/gaps:** `alumineu-business-model/docs/agents/MDL_GOOGLE_MODEL_INTEGRATION_PROMPT.md`

---

## Когда запускать

- После существенного обновления `GOOGLE_CHANNEL_INVENTORY.md` в channel-google.
- При смене статуса Wave A/B (GA4, Manufacturer Center, MC multi-country).
- Перед закрытием `impl-google-merchant` или переводом `channel-google` из `partial` → `validated`.

**Не делать:** копировать весь inventory в YAML; в модели — **решения, приоритеты, связи**, не справочник Google.

---

## Шаг 0 — Прочитать SSOT (channel-google)

Обязательно, в порядке:

1. `docs/GOOGLE_CHANNEL_INVENTORY.md` — полный инвентарь (слои A–I, чеклисты, roadmap).
2. `docs/GOOGLE_REVIEWS_ACQUISITION.md` — Wave 2 отзывы.
3. `docs/MERCHANT_MULTI_COUNTRY_RUNBOOK.md` — гео.
4. `docs/GOOGLE_ADS_ACCOUNT_CLEANUP.md` + `GOOGLE_ADS_API_ACCESS.md` — paid/API.
5. `README.md` — npm scripts.

Опционально по задаче: `MERCHANT_*`, `MERCHANT_BUSINESS_UI_CHECKLIST.md`.

---

## Шаг 1 — Прочитать текущую модель (business-model)

| Файл | Зачем |
|------|--------|
| `model/channels.yaml` → `google` | Канал и repos |
| `model/nodes.yaml` → `channel-google`, `offer-google-reviews-with-photos` | Graph definitions |
| `model/nodes/channel-google.md` | Narrative |
| `model/hypotheses.yaml` → `hyp-google-trust-loop` | Критерий подтверждения канала |
| `model/implementation_backlog.yaml` | `impl-google-merchant`, `impl-google-reviews-process` |
| `model/capability_backlog.yaml` → `cap-google-business-search-operations` | Capability deliverables |
| `model/planned.yaml` | `planned-google-*` |
| `docs/channels/GOOGLE_ECOSYSTEM.md` | Сводка после прошлого sync |

Правила языка: `docs/DOCUMENTATION_LANGUAGE.md`.

---

## Шаг 2 — Что переносить в модель (правило отбора)

**Включать в BM**, если выполняется хотя бы одно:

1. Влияет на **канал привлечения** или **доверие** (GBP, отзывы, organic, free listings).
2. Требует **владельца**, **cadence** или **KPI** (не «одноразовая настройка»).
3. Зависит от **другого репо** (`product-catalog`, `data-platform`, `processes`, `kpi-ops`).
4. Уже есть **node/capability/impl** — нужно обновить статус или `done_definition`.

**Не включать отдельным impl**, если:

- Чисто технический скрипт без управленческого смысла (оставить ссылку в `evidence_source` inventory).
- ⛔ / 👁 с P3 и без owner decision — только строка в `GOOGLE_ECOSYSTEM.md` § Watchlist.

---

## Шаг 3 — Куда класть в YAML

### 3.1 `model/channels.yaml` → `id: google`

Обновить:

- `notes` — 3–7 буллетов: что ✅ / 🟡 / следующий шаг (без копипасты всего inventory).
- `inventory_ssot` — путь к `../alumineu-channel-google/docs/GOOGLE_CHANNEL_INVENTORY.md`.
- `google_stack` — краткий список слоёв (см. шаблон в `docs/channels/GOOGLE_ECOSYSTEM.md`).

Не менять `status: partial` на `active`, пока `hyp-google-trust-loop` не выполнен.

### 3.2 `model/implementation_backlog.yaml`

Существующие:

| ID | Действие MDL |
|----|----------------|
| `impl-google-merchant` | Расширить `done_definition` и `wave_4_delivered` по чеклистам Wave A/B из inventory |
| `impl-google-reviews-process` | Сверить с `GOOGLE_REVIEWS_ACQUISITION.md`; не дублировать BPMN |

Добавить при первом sync (если ещё нет):

| ID | title_ru | priority |
|----|----------|----------|
| `impl-google-measurement` | GA4, GTM, Search Console, Looker Studio | P0 |
| `impl-google-manufacturer-center` | Manufacturer Center + Product Studio | P1 |
| `impl-google-agentic-readiness` | Плотный фид, schema, watchlist UCP/Business Agent | P2 |

Каждый item:

```yaml
repos: [alumineu-channel-google, ...]
bm_ref: channel-google
inventory_ref: ../alumineu-channel-google/docs/GOOGLE_CHANNEL_INVENTORY.md#<anchor>
owner_intent: "..." # одно предложение PL/RU
done_definition: # 3–6 проверяемых буллетов
```

### 3.3 `model/capability_backlog.yaml`

Обновить `cap-google-business-search-operations.required_artifacts` — добавить ссылки на:

- `impl-google-measurement`
- `impl-google-manufacturer-center`
- `docs/channels/GOOGLE_ECOSYSTEM.md`

Опционально новая capability:

- `cap-google-agentic-readiness` — problem: агенты не видят тонкий фид; artifacts: schema, supplemental, watchlist UCP.

### 3.4 `model/nodes/channel-google.md`

Кратко: слои A–G в prose; ссылка на inventory; критерий готовности без изменения порогов 25%/10% без решения owner.

### 3.5 `model/planned.yaml`

- `planned-google-acquisition` — уточнить, что включает free listings + GBP + SEO, не только Maps.
- При необходимости: `planned-google-measurement` → ref `impl-google-measurement`.

### 3.6 `docs/channels/GOOGLE_ECOSYSTEM.md`

Таблица «технология → impl → статус → P» — **единственное** место в BM с полной таблицей; обновлять при каждом sync.

### 3.7 `docs/BACKLOG.md`

Одна строка в Remediation, если owner decision нужен (например UCP, `zrodlo_leada` Maps).

**Не трогать без задачи:** `business_model_canvas.yaml` composition, UI React, `dist/`.

---

## Шаг 4 — Гипотеза и KPI

`hyp-google-trust-loop`:

- В `success_signals` добавить измеримые сигналы из inventory: GA4 sessions from Google, MC performance impressions, store rating presence.
- В `missing_evidence` — явно: нет GA4, нет Manufacturer Center, нет GSC.

Связь KPI: `kpi-google-review-request-rate` — без изменения формулы; при новых метриках — proposal в `kpi-ops`, не в MDL SSOT.

---

## Шаг 5 — Отчёт после sync

Создать или дополнить `docs/reports/google_channel_sync_YYYY-MM-DD.md`:

```markdown
## Summary
- Inventory version: channel-google @ <commit or date>
- Items updated: channels.yaml, impl-*, cap-*, GOOGLE_ECOSYSTEM.md

## Status deltas
| ID | Was | Now |

## Owner decisions needed
| ID | Question |

## Out of scope (watchlist)
- UCP checkout, Business Agent US, ...
```

Комментарий в GitHub issue (если есть карточка channel-google): `[MDL] Google channel sync:` + ссылка на отчёт.

---

## Шаг 6 — Чеклист готовности sync

- [ ] `channels.yaml#google` ссылается на inventory SSOT
- [ ] `GOOGLE_ECOSYSTEM.md` таблица совпадает с inventory (статусы)
- [ ] Нет противоречия: free listings ✅ в inventory ↔ notes в channels
- [ ] `impl-google-merchant` done_definition покрывает Wave A минимум
- [ ] Paid Ads не описан как «бесплатный канал» в `channel-google` node
- [ ] `npm run` / технические детали только в `evidence_source`, не в canvas narrative

---

## Промпт для вставки в чат MDL-агента

```
Ты MDL · Canvas. Задача: синхронизировать канал Google в business-model с SSOT в alumineu-channel-google.

1. Прочитай alumineu-channel-google/docs/GOOGLE_CHANNEL_INVENTORY.md целиком.
2. Прочитай alumineu-business-model/docs/agents/MDL_GOOGLE_CHANNEL_SYNC_PROMPT.md (этот файл в BM-репо).
3. Обнови model/channels.yaml#google, implementation_backlog (impl-google-* + новые impl если нет), cap-google-business-search-operations, model/nodes/channel-google.md, docs/channels/GOOGLE_ECOSYSTEM.md.
4. Не копируй справочник Google в YAML — только управленческие артефакты, приоритеты, done_definition, ссылки.
5. Создай docs/reports/google_channel_sync_YYYY-MM-DD.md с deltas и вопросами owner.
6. Префикс коммита [MDL]. Не меняй dist/ и UI без отдельной задачи.
```

---

## Контакты репозиториев

| Репо | Агент | Роль |
|------|-------|------|
| alumineu-channel-google | GGL | Inventory SSOT, scripts, Merchant/Ads |
| alumineu-business-model | MDL | Canvas, backlog, hypotheses |
| alumineu-processes | — | BPMN отзывов |
| alumineu-data-platform | DAT | GA4 pipeline (будущее) |
| alumineu-kpi-ops | — | OPI, отчёты |
