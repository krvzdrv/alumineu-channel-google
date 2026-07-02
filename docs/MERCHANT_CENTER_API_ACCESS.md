# Доступ к Merchant API при другом Google-аккаунте Merchant Center ([GGL])

Merchant Center живёт под **любым** аккаунтом Google («аккаунт маркетинга»). Проект **GCP и сервисный аккаунт** можно держать под **другим** аккаунтом («инфра/разработка»). Связка делается **одним действием**: в Merchant добавляете **email сервис-аккаунта** (`…@PROJECT_ID.iam.gserviceaccount.com`) как пользователя. Это **не** синхронизирует личные аккаунты между собой и **не** требует входить в MC под тем же аккаунтом, где создан GCP-проект.

Официальная база: [доступ по service account к Merchant API](https://developers.google.com/merchant/api/guides/authorization/access-your-account).

## Что понадобится

| Сущность | Где брать |
|----------|-----------|
| **Merchant ID** | Вверху [Merchant Center](https://merchants.google.com/) (числовой идентификатор счёта) |
| **GCP-проект** | Консоль [Google Cloud](https://console.cloud.google.com/) — под любым аккаунтом удобнее всего там, где у вас биллинг/CI |
| **Включённый API** | В том же проекте: **Merchant API** ([library](https://console.cloud.google.com/apis/library/merchantapi.googleapis.com)) |
| **JSON-ключ сервис-аккаунта** | IAM → Сервисные аккаунты → ключ **JSON** (скачивается один раз) |
| **Права в MC** | Пользователь с ролью, достаточной для ваших операций (для многих сценариев Google указывает **Admin**, если нужно менять настройки аккаунта) |

Область OAuth для вызовов API: **`https://www.googleapis.com/auth/content`** (см. [справку по методу products.list](https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.products/list)).

## Шаги (рекомендуемый путь: сервисный аккаунт → CI → другой аккаунт Merchant)

Делает **владелец GCP** (может быть не тот человек/почта, что у Merchant Center).

1. В **Google Cloud Console** выбрать или создать проект → включить **Merchant API**.
2. **Credentials** → **Create credentials** → **Service account**. Роль проекта можете взять минимальную (на доступ к Merchant вликует именно инвайт в MC): например Project → Viewer по [замечанию Google](https://developers.google.com/merchant/api/guides/authorization/access-your-account).
3. Открыть сервисный аккаунт → **Keys** → **Add key** → JSON → сохранить файл **у себя** (не коммитить).
4. Скопировать **email вида** `merchant-auto@YOUR_PROJECT.iam.gserviceaccount.com`.

Делает **администратор Merchant Center** под **аккаунтом, где висит нужный счёт Merchant** (может быть «другой» почтой полностью):

5. Открыть [Merchant Center](https://merchants.google.com/) → **Настройки** → **Доступ и сервисы** (или актуальный аналог) → вкладка **Люди и доступ** ([справка по уровням доступа](https://support.google.com/merchants/answer/1637190)).
6. **Добавить пользователя** → в качестве email указать **адрес сервис-аккаунта**, задать уровень доступа (минимально необходимый; см. задачу). Сохранить.

7. **Зарегистрировать GCP-проект в Merchant** (обязательно для Merchant API): один раз `npm run merchant:api:register-gcp` — [`developerRegistration:registerGcp`](https://developers.google.com/merchant/api/reference/rest/accounts_v1/accounts.developerRegistration/registerGcp). В `.env`: `MERCHANT_DEVELOPER_EMAIL` — обычная почта Google (не SA). Без этого шага verify вернёт **401 GCP_NOT_REGISTERED**.

Локально/в CI:

8. Выставить путь к JSON и Merchant ID — см. [`.env.example`](../.env.example) (`GOOGLE_MERCHANT_ID`, `GOOGLE_APPLICATION_MERCHANT_CREDENTIALS`).
9. Подождать **~5 минут** после register-gcp, затем `npm run merchant:api:verify` — успех = **HTTP 200**.

## Альтернатива: пользовательOAuth (не сервис-аккаунт)

Подходит для отладки с ноутбука: OAuth-клиент (Desktop/Web) в GCP, затем авторизация **под той же учётной записью**, у которой есть доступ к нужному счёту Merchant. Поток почти как в [`alumineu-finance-ops`](https://github.com/krvzdrv/alumineu-finance-ops) (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `token.json`), но в **consent scopes** нужно добавить **`https://www.googleapis.com/auth/content`**. Отдельно от синка Sheets: там по-прежнему только `spreadsheets` — это **разные токены** или один refresh-токен с **несколькими** scope после повторной выдачи согласия.

Для приложений широкой аудитории Google может потребовать [проверку OAuth-приложения](https://support.google.com/googleforwork/answer/16203986); для «Internal» / свой домен ограничения мягче.

## GitHub Actions (когда дойдёте до пайплайна)

Принцип как в finance-ops: секрет типа содержимого JSON-ключа **или** секрет только с путём не подойдёт в CI без записи файла — обычно кладут **весь JSON** в секрет (`MERCHANT_SA_JSON`), шаг записывает `merchant-sa.json` в `$RUNNER_TEMP`, задаёт `GOOGLE_APPLICATION_MERCHANT_CREDENTIALS`. Ключ не светится в репозитории и не в чате.

## Troubleshooting

| Симптом | Что проверить |
|---------|----------------|
| **403 PERMISSION_DENIED** | Email SA точно добавлен в **этот** Merchant ID; роль достаточна; подождите 5–15 мин после инвайта |
| **401 GCP_NOT_REGISTERED** | Выполните `npm run merchant:api:register-gcp`, подождите ~5 мин |
| **404 / wrong account** | `GOOGLE_MERCHANT_ID` = тот счёт MC, где пригласили SA |
| **401 / invalid_grant** | JSON ключ не того SA, ключ отозван, часы машины не в норме |
| **API not enabled** | В том же GCP-проекте, ключ которого используете, включён Merchant API |

## Ссылки

- [Merchant API — авторизация (service account)](https://developers.google.com/merchant/api/guides/authorization/access-your-account)
- [Проверка доступа](https://developers.google.com/merchant/api/guides/accounts/verify-api-access)
- [products.list REST](https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.products/list)
