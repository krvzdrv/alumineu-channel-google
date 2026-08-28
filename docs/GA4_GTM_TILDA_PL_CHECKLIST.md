# GA4 на alumineu.pl — чеклист (Wave A PL)

**Зачем:** видеть трафик с Google на сайт и базовые события. **Не заменяет** KPI карточки Maps (C1.6).

**Решение owner (2026-06-06):** **оставляем встроенную интеграцию Tilda → GA4**, GTM **не ставим** на Wave A.

**Сервисы:** Google Analytics 4, Tilda (сайт `.pl`).

---

## Зафиксированные ID

| Поле | Значение |
|------|----------|
| GA4 Account | `alumineu` · Account ID **355263165** |
| GA4 Property **alumineu.pl** | Property ID **489259413** |
| GA4 Web stream | Stream ID **11217718206** · `https://alumineu.pl` |
| **Measurement ID** | **`G-J48JDW2DJ5`** ✅ |
| GTM | **не используем** (отложено) |
| Сбор данных | ✅ активен (48h) |

### Другие properties (Wave A2 — после PL-контура)

| Сайт | Property ID |
|------|-------------|
| alumineu.de | 489262401 |
| alumineu.com | 523751490 |
| alumineu.ro | 509142858 |
| alumineu.nl | 551815498 |

---

## Owner: проверка в Tilda (один раз)

1. Tilda → проект **alumineu.pl** → **Настройки сайта** → **Аналитика** / **Google Analytics**.
2. Убедиться, что указан **`G-J48JDW2DJ5`** (или подключение к property alumineu.pl).
3. **Не добавлять** второй тег GA/GTM в «HTML перед `</head>`» — будет двойной счёт.
4. **Опубликовать** сайт после любых правок.

**Улучшенная статистика** в GA4 уже включена (page_view, scroll, outbound click и др.) — в UI потока это норма.

---

## Owner: связка Search Console ↔ GA4

1. [analytics.google.com](https://analytics.google.com) → property **alumineu.pl**.
2. **Admin** → **Связь с Search Console** / **Search Console links**.
3. Привязать ресурс GSC **`alumineu.pl`** (или `sc-domain:alumineu.pl`, если так заведён).
4. В GA4 появятся отчёты по поисковым запросам и landing pages (дополняет GSC API в репо).

GSC sitemap (если ещё не сдан): `https://alumineu.pl/sitemap.xml`

---

## Что даёт Tilda GA4 vs GTM (ограничения)

| Есть сейчас (Tilda GA4) | Нет без GTM / кода |
|-------------------------|-------------------|
| `page_view`, scroll, outbound clicks | Точный `click_phone` по каждой кнопке |
| Трафик по страницам | Кастомный `generate_lead` по формам Tilda |
| Realtime / отчёты GA4 | `view_item` по каталогу SKU |

**Следствие:** для Wave A достаточно page_view + GSC. События форм/телефона — **Wave B** или миграция на GTM по отдельному решению owner.

---

## GGL — следующие шаги

- [x] Measurement ID записан
- [ ] Подтвердить в Tilda один ID `G-J48JDW2DJ5` (owner визуально)
- [ ] GSC ↔ GA4 link alumineu.pl (owner, 2 мин)
- [ ] Shopping test (G-ADS-01) — **только по команде owner**, после согласования

---

## Статус Wave A

- [x] GA4 live на alumineu.pl (`G-J48JDW2DJ5`)
- [x] Owner: Tilda GA4, без GTM
- [ ] GSC ↔ GA4 link
- [ ] G-ADS-01 — по команде owner

---

## GTM (архив — не Wave A)

Если позже понадобятся события форм/телефона: создать контейнер на [tagmanager.google.com](https://tagmanager.google.com), **отключить** GA в настройках Tilda, вставить только GTM в HEAD.
