# Нет доступа к 818 через API — что сделать ([GGL])

## Что означает ошибка

Типичный текст:

```text
USER_PERMISSION_DENIED
The caller does not have permission to access the customer with login-customer-id 1145409300
```

**Это не «сломанный API» и не «нет OAuth».**  
`alumineu.pl@gmail.com` **уже видит** аккаунт **818-393-0344** (`Alumineu · PL · Ads`), но в `.env` указан **MCC 114**, а **818 ещё не привязан под этим MCC** в Google Ads.

| Способ запроса | Сейчас |
|----------------|--------|
| Через MCC `114-540-9300` (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`) | ❌ отказ |
| Напрямую к `818-393-0344` (без login-customer-id) | ✅ имя аккаунта читается |

Проверка:

```bash
npm run ads:diagnose
```

---

## Шаг 1 (обязательно) — привязать 818 к своему MCC

Под **`alumineu.pl@gmail.com`**:

1. Откройте [ads.google.com](https://ads.google.com) → переключитесь на **Alumineu · Manager** (`114-540-9300`).
2. Слева **Accounts** (или **Sub-account settings**) → **Link existing account** / **Привязать существующий**.
3. Введите **`818-393-0344`** → отправить приглашение.
4. Переключитесь на **Alumineu · PL · Ads** (`818-393-0344`) → **Settings → Access and security → Managers** → **Accept** приглашение от **114-540-9300**.
5. Убедитесь, что **ClimbRa** и лишние пользователи (`alumineuads@gmail.com`) сняты — см. [GOOGLE_ADS_ACCOUNT_CLEANUP.md](./GOOGLE_ADS_ACCOUNT_CLEANUP.md).

После link (обычно сразу, иногда до ~24 ч):

```bash
npm run ads:diagnose    # via MCC login → OK
npm run ads:audit -- --customer=8183930344
```

---

## Шаг 2 — Basic access (для расхода и кампаний)

Developer token сейчас в режиме **Test** — список аккаунтов есть, детальный аудит расхода может быть ограничен.

1. MCC **114** → **Admin → API center** → **Apply for Basic access**
2. Текст заявки: [GOOGLE_ADS_API_ACCESS.md](./GOOGLE_ADS_API_ACCESS.md)

---

## Шаг 3 — связка Merchant ↔ Ads (без запуска рекламы)

Отдельно от MCC-link:

1. **Merchant Center PL** `5785188396` ↔ **Ads** `818` — [MC_ADS_LINK_GUIDE.md](./MC_ADS_LINK_GUIDE.md)
2. Проверка API (после шага 1):

```bash
npm run ads:check-mc-link
```

Сейчас по API: **0** активных `product_link` — связку нужно создать в UI.

---

## Временный обход (пока 818 не под MCC)

Скрипты в репозитории при ошибке MCC **автоматически повторяют запрос напрямую** к client (для чтения имени, MC link и т.п.).

Явно в `.env` (опционально):

```env
# GOOGLE_ADS_SKIP_LOGIN_CUSTOMER_ID=1
# или только для 818:
# GOOGLE_ADS_DIRECT_CUSTOMER_ID=8183930344
```

Долгосрочно всё равно нужен **шаг 1** — иначе manager-отчёты и единая иерархия в UI/API не сойдутся.

---

## ID для копирования

| Роль | ID |
|------|-----|
| MCC | `114-540-9300` |
| PL Ads | `818-393-0344` |
| MC PL | `578-518-8396` |
