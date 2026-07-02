# Merchant API — полный доступ через API ([GGL])

**Зачем:** сейчас GCP зарегистрирован на **PL sub** `5785188396`, а `alumineu.pl@gmail.com` — только на **MCA** `5797974210`. Google не даёт `registerGcp` / `unregisterGcp` / Email-only contact менять через API без user **напрямую** на том счёте, где висит GCP.

**Решение:** один раз настроить **PL operator** + перенести GCP на **MCA** (рекомендация Google). После этого GGL управляет developer contact через API.

---

## Что получим после настройки

| Действие | До | После migrate |
|----------|-----|----------------|
| `merchant:api:verify` | ✅ | ✅ |
| `registerGcp` / `unregisterGcp` | ❌ (403) | ✅ через MCA token |
| `API_DEVELOPER` в users API | ❌ | ✅ на MCA |
| Письмо подтверждения contact | только UI Remove/Add | `merchant:api:reregister-contact-api` |
| Email-only на PL | вручную | не нужен (contact на MCA) |

---

## Однократная настройка (owner ~15 мин)

### 0. Выбрать PL operator email

**Требование:** Gmail/Workspace, **не** в People на MCA `5797974210`.

| Подходит | Не подходит |
|----------|-------------|
| `volosevich.flexy@gmail.com` (если не в MCA) | `alumineu.pl@gmail.com` (уже Admin на MCA) |
| Новый ящик `alumineu-merchant-api@gmail.com` | SA `merchant-api-alumineu@…` (не получает письма) |

В `.env`:

```env
MERCHANT_PL_OPERATOR_EMAIL=your-operator@gmail.com
MERCHANT_DEVELOPER_EMAIL=alumineu.pl@gmail.com
```

### 1. GCP OAuth redirect (один раз)

В OAuth client `oceanic-craft` добавить:

```
http://localhost:3002/oauth2callback
```

### 2. MCA admin token (если нет)

```bash
npm run merchant:auth    # alumineu.pl@gmail.com → token-merchant.json
```

### 3. Пригласить operator на PL sub

```bash
npm run merchant:api:invite-pl-operator
```

→ На `MERCHANT_PL_OPERATOR_EMAIL` придёт приглашение в Merchant Center — **принять**.

### 4. OAuth PL operator

```bash
npm run merchant:auth:pl   # вход под operator email → token-merchant-pl.json
```

### 5. Миграция GCP PL → MCA

```bash
npm run merchant:api:migrate-gcp-mca
```

→ На `alumineu.pl@gmail.com` может прийти **новое** письмо «Подтвердите адрес» — **Принять** (14 дней).

### 6. Проверка

```bash
npm run merchant:api:developer-status
npm run merchant:api:verify
```

Ожидаем: GCP на MCA `5797974210`, `alumineu.pl@gmail.com` с `API_DEVELOPER=✅`.

---

## Дальше — всё через API (GGL)

```bash
# Новое письмо подтверждения contact (без UI Remove/Add)
npm run merchant:api:reregister-contact-api
```

---

## Токены в репо

| Файл | Кто | Для чего |
|------|-----|----------|
| `token-merchant.json` | `alumineu.pl@gmail.com` | MCA admin, register на MCA |
| `token-merchant-pl.json` | PL operator | unregister на PL (один раз) |
| Service account JSON | SA | Каталог, products, CI |

Все в `.gitignore`.

---

## Почему нельзя только `alumineu.pl@gmail.com`

Google MCA: пользователь на **parent** не считается «directly added» на **sub**. Поэтому:

- `registerGcp` на PL → 403
- `users.create` alumineu.pl на PL → 400 (already on parent)
- Email-only contact не в `users` API → delete/patch недоступны

PL operator (отдельный email только на sub) снимает блокировку для шага unregister; дальше всё ведём с MCA.

---

## Ссылки

- [Register as a developer](https://developers.google.com/merchant/api/guides/quickstart/registration)
- [MERCHANT_API_DEVELOPER_FIX.md](./MERCHANT_API_DEVELOPER_FIX.md) — текущая схема Email-only
