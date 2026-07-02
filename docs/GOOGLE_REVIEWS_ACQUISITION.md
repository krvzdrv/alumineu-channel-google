# Отзывы Google Business — канал acquisition (Wave 2, черновик)

**BM:** `../alumineu-business-model/docs/CONTENT_LOOP.md`  
**Runbook:** `../alumineu-processes/docs/POST_INSTALL_CONTENT_LOOP.md`  
**Статус:** черновик — системный сбор после монтажа

---

## Задача

Превращать завершённые монтажи в **local SEO** и доверие через отзывы Google Maps **с фото объекта**.

**KPI карточки (owner C1.6):** просмотры профиля в GBP Insights + **количество отзывов** — главные показатели; `Źródło leada` Maps **не** внедряем (клиент часто идёт с Maps на сайт/звонок). См. [GOOGLE_OWNER_DECISIONS.md](GOOGLE_OWNER_DECISIONS.md), BM: `docs/channels/GOOGLE_GBP_METRICS.md`.

---

## SSOT-ресурсы

| Ресурс | Значение |
|--------|----------|
| Профиль Google Business | https://maps.app.goo.gl/Ske4Fh5WGanB7hij7 |
| Hub registry | `alumineu-os/model/resource_registry.yaml` → `google_maps_piastow` |
| Merchant / catalog | Этот репозиторий — отдельно от отзывов (`MERCHANT_*.md`) |

---

## Триггер

Тот же, что у content loop:

- `Zrealizowane`  
- `is_product_order = true`, не `is_sample_only_order`  
- `status_wspolpracy` ∈ `Pierwsze zamówienie`, `Stali klienci`

---

## Минимальный процесс для menedżera

1. Отправить ссылку Maps + попросить отзыв **с фото** монтажа  
2. Создать KPI **OPI** (`Zebrać opinie`)  
3. Follow-up 7–14 дней, если нет отзыва  
4. Доля отзывов с фото — пока вручную, метрика в DAT позже

---

## KPI (план, kpi-ops)

| Метрика | Определение |
|---------|-------------|
| OPI | Задачи `Zebrać opinie` за период |
| Отзывы с фото | Вручную или GMB API — TBD |
| Просмотры профиля GBP | Insights, ежемесячно — **главный KPI** |
| Кол-во отзывов GBP | Reviews, ежемесячно — **главный KPI** |
| Входящие с Maps в CRM | **Out of scope** (owner C1.6) |

---

## Технический backlog

| Задача | Репозиторий |
|--------|-------------|
| Отчётность OPI | kpi-ops |
| Чтение GMB API (опционально) | channel-google |
| Срез в DAT | data-platform |

**ID реализации:** `impl-google-reviews-process`
