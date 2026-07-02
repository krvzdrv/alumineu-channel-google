# schema.org Product — черновик для Tilda (PL)

**Зачем:** Google Search и AI лучше понимают страницы товаров; дополняет Merchant feed.

**Сервисы:** alumineu.pl (Tilda), каталог из Sheets/MC.

**Статус:** шаблон готов; **нужны от вас** финальные URL страниц (или подтверждение, что `link` из фида = канонический URL).

---

## Шаблон JSON-LD (вставить в Tilda: Page → SEO → HTML в `<head>`)

Замените `PRODUCT_URL`, `PRODUCT_NAME`, `PRODUCT_IMAGE`, `SKU`, `PRICE`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "PRODUCT_NAME",
  "image": ["PRODUCT_IMAGE"],
  "description": "PRODUCT_DESCRIPTION",
  "sku": "SKU",
  "brand": {
    "@type": "Brand",
    "name": "Alumineu"
  },
  "offers": {
    "@type": "Offer",
    "url": "PRODUCT_URL",
    "priceCurrency": "PLN",
    "price": "PRICE",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Alumineu sp. z o.o."
    }
  }
}
</script>
```

---

## Organization (один раз на главной / kontakt)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Alumineu sp. z o.o.",
  "url": "https://alumineu.pl",
  "logo": "https://alumineu.pl/LOGO_URL",
  "sameAs": [
    "https://maps.app.goo.gl/Ske4Fh5WGanB7hij7"
  ]
}
</script>
```

---

## Следующий шаг GGL

После списка 5–10 URL от owner — сгенерировать готовые блоки из `feeds/google_merchant_from_meta_pl.csv` / Sheets (title, link, image_link, price).

**Команда (когда добавим):** `npm run schema:draft -- --limit=10`
