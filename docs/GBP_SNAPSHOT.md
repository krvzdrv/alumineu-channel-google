# GBP — ежемесячный снимок (факт, не цели)

**Зачем:** owner C1.6 — смотреть **динамику** работы с карточкой Google Maps, а не «плановые» показатели.

| Это | Это не |
|-----|--------|
| Сколько **сейчас** просмотров и отзывов (факт из Google) | Целевые KPI, бюджеты, «должны вырасти до X» |
| Сравнение **месяц к месяцу** (выросло / упало) | Обязательство owner задать target |

Цели в бизнес-модели (25% запросов отзывов и т.д.) — отдельный процесс; **сюда их не вносим**.

## Откуда взять числа (текущая динамика)

**Автоматически (после `npm run gbp:auth`):**

```bash
npm run gbp:insights    # просмотры 28d + snapshot в jsonl
npm run gbp:history
```

**Вручную (fallback):**

1. [business.google.com](https://business.google.com/) → Alumineu → Performance → Profile views (28d).
2. Reviews на карточке.

## Кто может снять цифры

| Метрика | GGL автоматически | Нужен вход owner |
|---------|-------------------|------------------|
| Просмотры профиля (28d) | ✅ `gbp:insights` (после `gbp:auth`) | — |
| Число отзывов | ✅ Places key или `gbp:fetch-public` | — |

См. [GOOGLE_GBP_ACCESS.md](GOOGLE_GBP_ACCESS.md).

## Записать в репозиторий

```bash
cd alumineu-channel-google
npm run gbp:insights
# или вручную:
npm run gbp:snapshot -- --views=1234 --reviews=42
```

История:

```bash
npm run gbp:history
```

Файл: `data/gbp_snapshots.jsonl` (можно коммитить — это не секреты).

## Связь с бизнес-моделью

- KPI: `kpi-gbp-profile-views`, `kpi-gbp-review-count` в `strategy_scorecard.yaml`
- Канон: `alumineu-business-model/docs/channels/GOOGLE_GBP_METRICS.md`
