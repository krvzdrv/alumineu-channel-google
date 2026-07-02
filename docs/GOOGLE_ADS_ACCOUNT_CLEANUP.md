# Google Ads — порядок в аккаунтах ([GGL])

Целевая структура:

```
Alumineu · Manager (MCC)     114-540-9300
└── Alumineu · PL · Ads      818-393-0344   ← единственный рабочий client
    (466-950-6698 закрыть)
```

## Доступ через API (сейчас)

| Уровень | Статус |
|---------|--------|
| OAuth `alumineu.pl@gmail.com` | ✅ 3 аккаунта в `listAccessibleCustomers` |
| Developer token | ⚠️ **Test** — детали (расход, rename через API) **недоступны** |
| MCC → client link | ⚠️ **818/466 не привязаны** к 114 — нужно в UI |

После **Basic access** + link: `npm run ads:audit`

---

## Шаг 1 — Climbra off (оба client)

### 818-393-0344
- [x] **Managers** → ClimbRa `532-723-9329` → **Remove access**
- [ ] **Users** → `alumineuads@gmail.com` → **Remove access**

### 466-950-6698
- [ ] **Managers** → ClimbRa → **Remove access**
- [ ] **Users** → `alumineuads@gmail.com` → **Remove access**

---

## Шаг 2 — Переименовать (Admin → Account settings)

| ID | Было | Новое имя |
|----|------|-----------|
| 114-540-9300 | Alumineu MCC | **Alumineu · Manager** |
| 818-393-0344 | Alumineu sp. z o.o. | **Alumineu · PL · Ads** |
| 466-950-6698 | AluminEU | *(не переименовывать — закрыть)* |

---

## Шаг 3 — Link к своему MCC

**Alumineu · Manager** (`114`) → **Accounts** → **Link existing**:

1. `818-393-0344`
2. *(466 — только если ещё не закрыт, для переноса истории)*

В client → **Managers** → Accept **Alumineu · Manager** (если pending).

После link ClimbRa **не должна** остаться Owner — только ваш MCC.

---

## Шаг 4 — Остановить рекламу на 466

1. Аккаунт **466-950-6698**
2. **Campaigns** → все → **Pause**
3. **Admin → Billing** — убедиться, что списаний нет

---

## Шаг 5 — Закрыть лишний client 466

**466-950-6698** → **Admin → Account settings → Cancel account**

Условия Google: нет активных кампаний, нет неоплаченных счетов. История сохраняется ~11 мес. в read-only.

**818** — **не закрывать** (основной, юрлицо, Merchant PL).

---

## Шаг 6 — Basic access (для API-аудита)

MCC → **Admin → API center → Apply for Basic access**

После одобрения:

```bash
npm run ads:audit
```

---

## Шаг 7 — Merchant Center link (вручную)

MC sub PL `5785188396` → **Settings → Google Ads** → привязать **818-393-0344** только.

---

## Чеклист «порядок наведён»

- [ ] ClimbRa removed на 818 и 466
- [ ] `alumineuads@gmail.com` removed на обоих
- [ ] Имена: Manager / PL · Ads
- [ ] 818 linked под MCC 114
- [ ] 466 paused → cancelled
- [ ] Basic access requested
- [ ] MC → Ads link на 818
