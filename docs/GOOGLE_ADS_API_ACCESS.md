# Google Ads API — доступ через GCP `oceanic-craft-452806-c0` ([GGL])

Merchant API уже в проекте **`oceanic-craft-452806-c0`**. Ads API подключаем **в том же проекте**, OAuth — под **`alumineu.pl@gmail.com`**.

OAuth client из `alumineu-finance-ops` (проект flexy `929817317904`) **не использовать** для Ads.

## Что понадобится

| Переменная | Откуда |
|------------|--------|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | MCC **Alumineu MCC** `1145409300` → Admin → API center |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | `1145409300` (MCC) |
| `GOOGLE_ADS_CLIENT_ID` / `SECRET` | OAuth Desktop client в **oceanic-craft-452806-c0** |
| `token-ads.json` | `npm run ads:auth` (вход `alumineu.pl@gmail.com`) |

Sheets (`token.json` + `GOOGLE_CLIENT_ID`) могут остаться на flexy — это отдельный доступ.

## Шаги в Google Cloud (под `alumineu.pl@gmail.com`)

1. **Проект:** [oceanic-craft-452806-c0](https://console.cloud.google.com/home/dashboard?project=oceanic-craft-452806-c0)

2. **Включить API:** [Google Ads API → Enable](https://console.cloud.google.com/apis/library/googleads.googleapis.com?project=oceanic-craft-452806-c0)

3. **OAuth consent screen** (если ещё не настроен):
   - User type: External (или Internal для своего домена)
   - Test users: `alumineu.pl@gmail.com`

4. **Credentials → Create OAuth client ID → Desktop app**
   - Name: `alumineu-ads-desktop`
   - Authorized redirect URI: `http://localhost:3000/oauth2callback`

5. Скопировать Client ID / Secret в `.env`:

```env
GOOGLE_ADS_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=....

GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1145409300
GOOGLE_ADS_TOKEN_PATH=./token-ads.json
```

## Локальная авторизация

```bash
# после смены OAuth client — удалить старый token
rm -f token-ads.json

npm run ads:auth    # браузер → alumineu.pl@gmail.com → Allow
npm run ads:verify  # список 114 / 818 / 466
npm run ads:diagnose  # MCC vs прямой доступ к 818
```

Ошибка **«нет доступа к 818»** при `GOOGLE_ADS_LOGIN_CUSTOMER_ID=1145409300`: см. **[GOOGLE_ADS_FIX_818_ACCESS.md](./GOOGLE_ADS_FIX_818_ACCESS.md)** (привязать 818 к MCC в UI).

## Basic access (расход и кампании через API)

Test token видит только `listAccessibleCustomers`. Для `npm run ads:audit` нужен **Basic access**.

### Подать заявку

1. [ads.google.com](https://ads.google.com) → **Alumineu · Manager** (`114-540-9300`)
2. **Admin → API center**
3. Блок **Access level** → **Apply for Basic access** (или **Upgrade**)
4. Заполнить форму (текст ниже)
5. Submit → обычно **1–3 рабочих дня** (иногда быстрее)

### Текст для формы (English)

**Application purpose:**

```text
Internal read-only tooling for Alumineu sp. z o.o. (alumineu.pl, stretch ceiling
profiles e-commerce). We use the API to audit campaign spend, list active/paused
campaigns, and verify account structure under our own MCC (1145409300). We do not
offer API access to third parties. No automated campaign creation in phase 1.
```

**How will you use the API:**

```text
- Query campaign metrics (cost, clicks) for our account 8183930344
- List campaigns and manager links for compliance after agency offboarding
- Internal scripts in a private GitHub repo (alumineu-channel-google)
```

### После одобрения

```bash
npm run ads:audit
npm run ads:audit -- --customer=8183930344 --days=365
```

### Обязательно: 818 под MCC

Если audit пишет `login-customer-id`:

**Alumineu · Manager** → **Accounts** → убедиться, что **818-393-0344** в списке linked.

---

## Ожидаемый результат `ads:verify`

```
114-540-9300: Alumineu MCC [MCC]
818-393-0344: Alumineu sp. z o.o.
466-950-6698: AluminEU
```

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| `You need additional access` к проекту | Войти как владелец `oceanic-craft-452806-c0` или попросить роль Editor |
| `SERVICE_DISABLED` | Enable Google Ads API (ссылка выше), подождать 2–5 мин |
| `token.json без scope adwords` | `rm token-ads.json && npm run ads:auth` |
| OAuth client flexy | Задать `GOOGLE_ADS_CLIENT_ID/SECRET` из oceanic-craft |

## Ссылки

- [Google Ads API — Get started](https://developers.google.com/google-ads/api/docs/get-started/create-account-and-credentials)
- [Merchant API в том же репо](MERCHANT_CENTER_API_ACCESS.md)
