# Пакет для ручного подключения robots.txt (Cloudflare)

**Задача:** на сайтах Alumineu Tilda не даёт нормально править `robots.txt`.  
Нужно через **Cloudflare Worker** отдавать свой файл **только** по адресу `/robots.txt`, чтобы **Googlebot** мог обходить страницы каталога (Merchant Center / Shopping).

**Домены:** alumineu.pl · alumineu.de · alumineu.ro · alumineu.com (+ www)

---

## Что в этой папке

```
handoff/cloudflare-robots/
├── README.md                 ← эта инструкция
├── CHECKLIST.md              ← галочки для отчёта
├── RUNBOOK-TECH.md           ← подробности для технаря
├── robots/
│   ├── alumineu.pl.robots.txt    ← готовый текст для .pl
│   ├── alumineu.de.robots.txt    ← для .de
│   ├── alumineu.ro.robots.txt    ← для .ro
│   ├── alumineu.com.robots.txt   ← для .com (проверить после DNS)
│   ├── recommended/              ← те же файлы (длинные имена)
│   └── original-tilda/           ← как было на Tilda до правок (архив)
└── worker/
    ├── wrangler.toml             ← маршруты Cloudflare
    └── src/
        ├── index.js
        └── robots-bodies.js      ← все 4 текста внутри Worker
```

**Главное в каждом `.robots.txt`:** в начале файла блок:

```
User-agent: Googlebot
Allow: /
```

Без него Google не краулит часть каталога (на .de были ошибки Merchant).

---

## Порядок работ (кратко)

### 1. Cloudflare — зоны DNS

| Домен | Действие |
|-------|----------|
| alumineu.pl | Зона уже должна быть в CF — проверить Active |
| alumineu.ro | Обычно уже в CF |
| alumineu.de | Добавить сайт в CF, перенести NS, дождаться Active |
| alumineu.com | То же |

Записи DNS на Tilda **не менять** (A/CNAME как сейчас). Worker не трогает сайт, только `/robots.txt`.

### 2. Worker — деплой

**Вариант A (рекомендуется):** папка `worker/`

1. Установить [Node.js](https://nodejs.org/) LTS.
2. В терминале:
   ```bash
   cd worker
   npx wrangler login
   npx wrangler deploy
   ```
3. Если deploy ругается на routes — в [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → worker `alumineu-robots-txt` → **Triggers** → **Routes** — добавить вручную для каждого домена:
   - `alumineu.de/robots.txt`
   - `www.alumineu.de/robots.txt`
   - (и для .pl, .ro, .com)

**Вариант B:** создать Worker вручную в Dashboard, вставить код из `worker/src/index.js` + `robots-bodies.js` (нужен bundler или один файл — проще вариант A).

### 3. Проверка (обязательно)

Для каждого домена:

```bash
curl -sS "https://alumineu.de/robots.txt" | head -12
```

Должно быть **Googlebot** и **Allow: /** в первых строках.

Проверить и **www**: `https://www.alumineu.de/robots.txt`

### 4. Merchant Center (сообщить заказчику)

Через **24–48 часов** после смены robots:

- MC → Products → Feeds → primary Google Sheets → **Fetch now / Update**
- Отдельно для PL, DE, RO, EU sub-аккаунтов

---

## Если нужно обновить текст robots

1. Скачать текущий файл с сайта: `curl https://alumineu.de/robots.txt > original.txt`
2. В **начало** вставить блок Googlebot (см. любой файл из `robots/alumineu.*.robots.txt`, строки 1–9).
3. Обновить `worker/src/robots-bodies.js` или пересобрать через репозиторий (`npm run robots:refresh` в корне channel-google).
4. Снова `npx wrangler deploy`.

**alumineu.com:** файл `alumineu.com.robots.txt` — черновик; после появления DNS скачать живой robots с Tilda и добавить Googlebot-блок.

**alumineu.de:** перед деплоем желательно сверить `original-tilda/alumineu.de-robots.downloaded.txt` с живым сайтом.

---

## Контакты / вопросы

Технический runbook: `RUNBOOK-TECH.md`  
Репозиторий: `alumineu-channel-google` → `docs/MERCHANT_CLOUDFLARE_ROBOTS.md`

После выполнения — заполнить `CHECKLIST.md` и вернуть заказчику.
