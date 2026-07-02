# [GGL] UI-чеклист бизнес-аккаунта Merchant Center

Счёт **5785188396** — шаги, которые **нельзя** выполнить через API.

## После каждого `merchant:sheet:apply`

1. MC → **Settings → Data sources → PRODUCTS SOURCE 1 → Update**
2. Через 30–60 мин: `npm run merchant:api:compare-sheet`

## Business identity (логотип)

1. MC → **Settings → Business info** (или Brand / Business identity)
2. Загрузить логотип Alumineu (квадрат, min ~512×512)
3. **Save**

## Customer service

1. **Settings → Customer service**
2. **Preferred contact method** → Phone или Email
3. **Save**

## Доставка на сайте vs MC

Если в MC задана ставка через `MERCHANT_SHIPPING_FLAT_RATE_PLN` (стандарт **50 PLN**), на сайте [dostawa](https://alumineu.pl/dostawa) / [wysylka-i-zwrot](https://alumineu.pl/wysylka-i-zwrot) должно быть согласованное описание (np. „50 zł” / „od 50 zł” lub „wycena indywidualna”).

Изменить ставку в API:

```bash
MERCHANT_SHIPPING_FLAT_RATE_PLN=50 MERCHANT_ALIGN_SHIPPING=1 npm run merchant:api:apply-business -- --apply
```

## Facebook

Только **Facebook Page** (не profile.php / /people/). Либо ссылка на Facebook уже на [kontakt](https://alumineu.pl/kontakt) — достаточно для доверия.

## Язык фида ru → pl (опционально)

```bash
npm run merchant:api:migrate-feed-lang
```

Затем в UI создать **новый** primary feed с **content language: pl**, удалить старый `ru` (см. вывод скрипта).

## Store Quality score

Появится после impressions в Free Listings (недели). Ускоритель — Shopping Ads (Programs → Shopping ads).

## Контроль

```bash
npm run merchant:api:audit-account
npm run merchant:api:list-products
npm run merchant:api:compare-sheet
```
