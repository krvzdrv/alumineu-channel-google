# Merchant API — developer contact ([GGL])

**Обновлено:** 2026-06-06  
Письмо Google: **«Update your API developer registration within 29 days»** для **5785188396** (Alumineu PL).

---

## Как устроено у Alumineu (не путать два UI)

| Место | Что видите | Что это значит |
|-------|------------|----------------|
| **MCA** `5797974210` → People | `alumineu.pl@gmail.com` · Admin, Standard, Performance | Обычный пользователь кабинета. **Галочки «API developer» здесь нет** — GCP не зарегистрирован на MCA. |
| **PL sub** `5785188396` → People | Пусто | Нормально: user наследуется с parent MCA. |
| **PL sub** `5785188396` → **Email-only access** | `alumineu.pl@gmail.com` · **Alumineu API** · Verified | ✅ **Это и есть API developer contact** для уведомлений Google. |

При `registerGcp` на PL, если email **не** в People на этом sub, Google создаёт **Email-only contact** — не отдельную галочку в Manage access на MCA.

**Скрипт `merchant:api:developer-status`** смотрит роль `API_DEVELOPER` у **users** на MCA → показывает `❌`, хотя контакт в UI **Verified**. На работу API это **не влияет**, если `merchant:api:verify` OK.

---

## Диагностика (через API)

| Счёт | GCP linked | Contact |
|------|------------|---------|
| **MCA parent** `5797974210` | ❌ | `alumineu.pl@gmail.com` — ADMIN (без `API_DEVELOPER` в users API) |
| **PL sub** `5785188396` | ✅ `820829065208` | Email-only · Alumineu API · Verified (в UI) |

```bash
npm run merchant:api:developer-status
npm run merchant:api:verify          # главный критерий: должен быть OK
```

---

## Письмо «Подтвердите адрес» (29 мая)

Ссылка **«Принять это изменение»** одноразовая. Если открываете позже:

> *Срок действия ссылки истек или вы уже использовали её*

— контакт **уже подтверждён**. Повторно ту же ссылку использовать **нельзя**.

Новое письмо — только после **Remove + Add** в Email-only (см. ниже) или свежей кнопки **Update contact** в новом письме Google.

---

## Повторно запросить письмо подтверждения

Через API **нельзя**: `unregisterGcp` / `registerGcp` на PL требуют user в **People** на `5785188396`; owner там только в Email-only.

```bash
npm run merchant:api:reregister-contact   # UI-шаги в терминале
```

**Owner, UI (PL `5785188396`):**

1. **Settings → Access and services → Email-only access**
2. `alumineu.pl@gmail.com` → **Manage** → **Remove person**
3. **Add person** → `alumineu.pl@gmail.com`, имя `Alumineu API` → Save
4. На почту: «Подтвердите адрес…» → **Принять это изменение** (14 дней)

Admin на MCA parent при этом **не снимается**.

---

## Что НЕ работает (проверено)

| Действие | Результат |
|----------|-----------|
| `users.patch` + `API_DEVELOPER` от SA или OAuth owner | 200, но в ответе только `ADMIN` |
| `registerGcp` на PL от SA / OAuth owner | 403 — user не в People на PL |
| `registerGcp` на MCA | 409 — GCP уже на PL sub |
| `users.delete` email-only contact | 404 — contact не в users API |
| Галочка **API developer** в Manage на MCA | **Не показывается** (нет registration на MCA) |

Скрипты `merchant:auth` + `merchant:api:grant-developer` для этой схемы **не дают** `API_DEVELOPER` в users API — оставлены для других счетов / будущей миграции GCP на MCA.

---

## Критерий «всё ок»

| Проверка | Ожидание |
|----------|----------|
| `npm run merchant:api:verify` | ✅ OK |
| UI PL → Email-only | `alumineu.pl@gmail.com` · Verified |
| Письмо Google 29 days | Можно игнорировать, если verify OK и Email-only Verified |

Блокировка API (`AUTH_GCP_NOT_REGISTERED`) — только если **30+ дней** нет ни одного developer contact и не добавлен backup.

---

## Полный доступ через API (без UI Remove/Add)

См. **[MERCHANT_API_OPERATOR_ACCESS.md](./MERCHANT_API_OPERATOR_ACCESS.md)** — PL operator + migrate GCP на MCA.

Кратко:

```bash
# .env: MERCHANT_PL_OPERATOR_EMAIL=… (не на MCA)
npm run merchant:api:invite-pl-operator   # принять invite в почте
npm run merchant:auth:pl
npm run merchant:api:migrate-gcp-mca
npm run merchant:api:reregister-contact-api  # дальше без UI
```

Клик **Принять** в письме на `alumineu.pl@gmail.com` после migrate — по-прежнему нужен owner (Google шлёт на человека, не в API).

---

## Контакты

| Поле | Значение |
|------|----------|
| Developer email | `alumineu.pl@gmail.com` |
| GCP project | `oceanic-craft-452806-c0` |
| GCP number | `820829065208` |
| MCA | `5797974210` |
| PL sub | `5785188396` |
