# Google: связки для Merchant + Ads (без запуска рекламы)

**Ситуация Alumineu:** рекламу **пока не масштабируем**, но технические связи можно настроить заранее — как в Meta вы вешаете пиксель и каталог **до** больших кампаний.

| ID | Назначение |
|----|------------|
| Merchant PL | `5785188396` |
| Ads клиент | `818-393-0344` |
| MCC | `114-540-9300` |
| MCA (родитель MC) | `5797974210` |

---

## Meta vs Google — что чему соответствует

| Meta | Google | Нужно сейчас? |
|------|--------|---------------|
| **Каталог товаров** (Commerce Manager) | **Merchant Center** + фид (Sheets) | ✅ уже есть |
| **Пиксель / CAPI** (события на сайте) | **GA4** + тег через **GTM** (не «пиксель MC») | 🟡 когда будете мерить сайт |
| **Связка каталог ↔ Ads** | **Связка MC ↔ Google Ads** (`product_link`) | ✅ **рекомендуем сделать** |
| Бесплатные объявления каталога | **Free listings** (включены в MC) | ✅ работают **без** Ads |
| Платные карточки товаров | **Shopping / Performance Max** | ⏸ пока не запускаем |

**Важно:** отдельного «пикселя Merchant Center» нет. Для конверсий с сайта позже: GA4 → связь с Ads (импорт конверсий), опционально enhanced conversions.

---

## 1. Связка Merchant Center ↔ Google Ads (главное)

**Зачем без рекламы:**

- Готово к Shopping / PMax, когда решите включить бюджет.
- Один источник товаров для платных карточек.
- Меньше сюрпризов в UI («каталог не выбран»).

**На free listings не влияет** — они идут из MC напрямую.

### Способ A — из Merchant Center (часто проще)

1. Войти: [merchants.google.com](https://merchants.google.com) под `alumineu.pl@gmail.com`.
2. Выбрать аккаунт **PL `5785188396`** (или MCA, если линкуете с родителя).
3. **Settings** → **Ads** / **Linked accounts** (Связанные аккаунты).
4. **Link** → Google Ads account → **`818-393-0344`** (Alumineu sp. z o.o.).
5. В Google Ads **принять** приглашение (см. способ B шаг 4).

### Способ B — из Google Ads

1. [ads.google.com](https://ads.google.com) → аккаунт **818-393-0344** (лучше под MCC **114-540-9300**).
2. **Tools & settings** (Инструменты) → **Setup** → **Linked accounts** / **Связанные аккаунты**.
3. **Google Merchant Center** → **Link** → ID **`5785188396`**.
4. В Merchant Center **подтвердить** связь (двустороннее согласие).

### Проверка (GGL)

```bash
npm run ads:check-mc-link
```

Ожидаем: `OK — MC PL уже связан`.

---

## 2. MCC и Ads-аккаунт (не MC, но нужно для API)

| Шаг | Где | Зачем |
|-----|-----|--------|
| 818 под MCC 114 | Ads → Manager → Accounts | `ads:audit`, единый доступ |
| Basic access token | MCC → API Center | нормальные отчёты API |

Без этого API видит аккаунт, но не полный spend/кампании.

---

## 3. GA4 + Google Ads (аналог «пикселя» — позже)

Когда появятся `G-…` и GTM на alumineu.pl:

1. **GA4** → Admin → **Google Ads links** → связать property с **818**.
2. Импортировать конверсии (заявка, звонок, корзина B2B).
3. В Ads: **Goals** → проверить, что конверсии из GA4 видны.

См. [GA4_GTM_TILDA_PL_CHECKLIST.md](GA4_GTM_TILDA_PL_CHECKLIST.md).

**Без GA4** связка MC↔Ads всё равно полезна только для **товарных** кампаний, не для отслеживания звонков с карты Maps.

---

## 4. Что НЕ нужно делать сейчас

| Действие | Почему |
|----------|--------|
| Запуск Shopping / PMax | Owner: рекламу не запускаем |
| UCP / agentic checkout | отложено |
| Отдельный «Google pixel» на сайт | используется gtag/GA4 |
| CSS-посредник Shopping | только при больших бюджетах EU |

---

## 5. Чеклист готовности «связи без spend»

- [ ] MC `5785188396` ↔ Ads `8183930344` — `npm run ads:check-mc-link` → OK
- [ ] 818 привязан к MCC 114
- [ ] Free listings PL ON (уже)
- [ ] Доставка MC = 50 PLN (согласовано с сайтом)
- [ ] GA4/GTM — когда будут ID
- [ ] MC → Data sources → Update после правок фида

---

## Ссылки

- [Google: Link MC and Ads](https://support.google.com/google-ads/answer/12499498)
- [Google Ads API product_link](https://developers.google.com/google-ads/api/docs/shopping-ads/merchant-center)
- Старый краткий чеклист: [MC_ADS_LINK_CHECKLIST.md](MC_ADS_LINK_CHECKLIST.md)
