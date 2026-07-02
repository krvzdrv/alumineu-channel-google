# Manufacturer Center — PL pilot (Alumineu) [GGL]

**Обновлено:** 2026-06-07  
**Модель:** brand owner, контрактное производство (OEM) — допустимо.  
**Связка:** Merchant PL `5785188396` → sync в Manufacturer после одобрения.

---

## Перед стартом — критично

| Требование Google | Alumineu |
|-------------------|----------|
| Роль | **Brand owner** (не retailer, не data partner) |
| **Business email на домене компании** | Нужен **`...@alumineu.pl`** — `alumineu.pl@gmail.com` **не подходит** для поля business email |
| Google Account для входа | Может остаться `alumineu.pl@gmail.com` |
| Сайт | `https://alumineu.pl` |
| Merchant Center ID | **`5785188396`** (привязать при регистрации) |

Если нет ящика `@alumineu.pl`: Google Workspace / Zoho / алиас на хостинге — минимум один ящик для verification.

---

## Шаг 1 — Регистрация (owner, ~15 мин)

1. Откройте [manufacturers.google.com](https://manufacturers.google.com/) под Google Account (`alumineu.pl@gmail.com` OK для входа).
2. **Business type:** **Brand owner**
3. **Business information:**

| Поле | Значение |
|------|----------|
| Business name | `Alumineu` (или полное из KRS) |
| Website | `https://alumineu.pl` |
| Business email | **`kontakt@alumineu.pl`** или ваш `@alumineu.pl` |
| Headquarters | **Poland** · Piastów (Wincentego Witosa 34 — как в GBP) |

4. **Brand information:**

| Поле | Значение |
|------|----------|
| Brand name | `Alumineu` (без ®, без Sp. z o.o.) |
| Brand website | `https://alumineu.pl` |

5. **Merchant Center ID:** `5785188396` → link / sync
6. Примите Terms → **Join Manufacturer Center**
7. **Подтвердите business email** — письмо на `@alumineu.pl` (обязательно)

Сроки: аккаунт ~2 рабочих дня, бренд до ~2 недель.  
Справка: [Sign up](https://support.google.com/manufacturers/answer/7064831)

---

## Шаг 2 — После одобрения аккаунта

### Вариант A (рекомендуется): Sync из Merchant Center

Manufacturer Center → **Sync from Merchant Center** (связанный `5785188396`).  
Те же `id`, `brand`, `title`, `image` — без дублирования вручную.

### Вариант B: Пилотный фид 20 SKU

```bash
npm run manufacturer:export-pilot
```

Файл: `feeds/manufacturer_pilot_pl.tsv` — первые 20 топ-линеек (INVISIA, LIGHTRA, …).

Дополните в Manufacturer UI поля **description**, **feature**, **video_link** для rich content.

---

## GTIN / MPN (важно)

В Merchant PL сейчас: `identifier exists = no`, GTIN пустой.

| Поле | Пилот |
|------|-------|
| **MPN** | slug из каталога (`invisia_x201`, `lightra_x015`) — в pilot feed |
| **GTIN** | Пусто на старте; для полного Manufacturer spec позже — **GS1 Poland** или sync MC и смотреть Diagnostics |

Не выдумывать GTIN — иначе disapproval.

---

## Документы «про запас» (не загружаются в форму)

- KRS / выписка Alumineu sp. z o.o.
- Товарный знак **Alumineu** / **INVISIA** (EUIPO/UPRP), если есть
- Договор OEM: права на дизайн и бренд у Alumineu
- Страницы «producent» на `alumineu.pl`

---

## DoD (Wave A gate §6.1)

- [ ] Заявка Manufacturer Center подана
- [ ] Business email `@alumineu.pl` подтверждён
- [ ] Бренд `Alumineu` verified (или pending < 2 нед)
- [ ] MC `5785188396` linked
- [ ] Sync MC → Manufacturer **или** pilot 20 SKU uploaded
- [ ] Diagnostics: 0 critical на pilot SKU

---

## Ссылки

- [Policy requirements](https://support.google.com/manufacturers/answer/6124032)
- [Product data spec](https://support.google.com/manufacturers/answer/6124116)
- [MC vs Manufacturer feed](https://support.google.com/manufacturers/answer/7073012)
- Merchant PL audit: `docs/reports/google_pl_audit_2026-05-21.md`
