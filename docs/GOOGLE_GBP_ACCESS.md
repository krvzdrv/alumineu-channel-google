# Доступ к Google Business Profile — GGL

**Обновлено:** 2026-06-06

## Что умеем после `gbp:auth`

| Команда | Назначение |
|---------|------------|
| `npm run gbp:auth` | OAuth → `token-gbp.json` (scope `business.manage`) |
| `npm run gbp:verify` | Accounts, location, просмотры за 28 дней |
| `npm run gbp:insights` | API → запись в `data/gbp_snapshots.jsonl` |
| `npm run gbp:snapshot` | Ручной ввод (fallback) |
| `npm run gbp:fetch-public` | Только рейтинг/отзывы (Places, без просмотров) |

**Просмотры профиля (28 дней)** = сумма метрик Performance API:

- `BUSINESS_IMPRESSIONS_DESKTOP_MAPS`
- `BUSINESS_IMPRESSIONS_DESKTOP_SEARCH`
- `BUSINESS_IMPRESSIONS_MOBILE_MAPS`
- `BUSINESS_IMPRESSIONS_MOBILE_SEARCH`

Это соответствует «Wyświetlenia profilu» в Insights (impressions).

---

## Однократная настройка GCP (oceanic-craft-452806-c0)

Под `alumineu.pl@gmail.com`:

0. **Заявка на доступ к GBP API** (обязательно, иначе квота **0 QPM** → `429`):
   - [GBP API contact form](https://developers.google.com/my-business/content/prereqs) → **Application for Basic API Access**
   - Project number: **820829065208** (oceanic-craft-452806-c0)
   - Email: **alumineu.pl@gmail.com** (owner/manager карточки Piastów)
   - GBP verified 60+ days, сайт alumineu.pl на карточке
   - После одобрения квота станет **300 QPM** (проверка: GCP → APIs → Quotas)

1. **Включить API:**
   - [My Business Account Management API](https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com?project=oceanic-craft-452806-c0)
   - [My Business Business Information API](https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com?project=oceanic-craft-452806-c0)
   - [Business Profile Performance API](https://console.cloud.google.com/apis/library/businessprofileperformance.googleapis.com?project=oceanic-craft-452806-c0)

2. **OAuth client** (тот же Desktop app, что для Ads/GSC):
   - Credentials → ваш OAuth 2.0 Client ID
   - **Authorized redirect URIs** — добавить:
     - `http://localhost:3001/oauth2callback` (GBP)
     - `http://localhost:3000/oauth2callback` (GSC/Ads — если ещё нет)

3. **OAuth consent screen:** test user `alumineu.pl@gmail.com` (если External).

`.env` — те же `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` (или `GOOGLE_GBP_*` override).

---

## Авторизация

```bash
cd alumineu-channel-google
npm run gbp:auth
# браузер → alumineu.pl@gmail.com → Allow
npm run gbp:verify
npm run gbp:insights
```

Токен: `token-gbp.json` (в `.gitignore`).

---

## Ежемесячный регламент (owner C1.6)

```bash
npm run gbp:insights
npm run gbp:history
```

Или вручную: `npm run gbp:snapshot -- --views=N --reviews=N`

---

## Credentials matrix

| Доступ | Просмотры Insights | Отзывы |
|--------|-------------------|--------|
| `token-gbp.json` + Performance API | ✅ | — |
| Places API key | — | ✅ (опционально в gbp:insights) |
| Публичные Maps | ❌ | ✅ (gbp:fetch-public) |
| Service account (Merchant) | ❌ | ❌ |

---

## Troubleshooting

| Ошибка | Решение |
|--------|---------|
| `redirect_uri_mismatch` | Добавить `localhost:3001/oauth2callback` в OAuth client |
| API not enabled | Включить 3 API выше в GCP |
| 403 / permission | Войти как владелец карточки GBP |
| Несколько locations | Задать `GBP_LOCATION_NAME=locations/XXXX` в `.env` |

Кэш location: `data/gbp_location.json` (после первого успешного `gbp:verify`).
