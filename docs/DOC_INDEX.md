# Карта документации — alumineu-channel-google

**Агент:** GGL · Merchant  
**Обновлено:** 2026-07-09  
**Канон гигиены:** [`DOC_HYGIENE_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/DOC_HYGIENE_CANON.md)

Живые файлы ниже — SSOT. Архив не править как канон.

## Старт сессии

| Файл | Зачем |
|------|--------|
| `AGENTS.md` | зона, доступы, границы |
| [`COMMUNICATION_LANGUAGE_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/COMMUNICATION_LANGUAGE_CANON.md) | язык чата и docs |
| `docs/BACKLOG.md` | свои задачи |
| `docs/REPO_DATA_CONTRACT.md` | подключения API/данных |
| `docs/DOC_INDEX.md` | эта карта |

## Hub (L1) — универсально

| Файл | Зачем |
|------|--------|
| [`COMMUNICATION_LANGUAGE_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/COMMUNICATION_LANGUAGE_CANON.md) | как говорим |
| [`DOC_HYGIENE_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/DOC_HYGIENE_CANON.md) | где правда в docs |
| [`AGENT_OPERATING_SYSTEM`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_OPERATING_SYSTEM.md) | как работаем |
| [`AGENT_BOUNDARY_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/AGENT_BOUNDARY_CANON.md) | границы зон |
| [`REPO_DATA_CONTRACT_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/REPO_DATA_CONTRACT_CANON.md) | канон контракта |
| [`REPO_BACKLOG_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/REPO_BACKLOG_CANON.md) | канон бэклога |
| [`HANDOFF_PROMPTS`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/HANDOFF_PROMPTS.md) | передача другому агенту |

## Локальные SSOT (L2)

| Файл | Зачем |
|------|--------|
| `docs/GOOGLE_CHANNEL_INVENTORY.md` | инвентарь Google-канала |
| `docs/REPO_DATA_CONTRACT.md` | подключения |
| `docs/BACKLOG.md` | бэклог |

## Архив / снимки

- docs/reports/
- docs/queries/ — рабочие выгрузки


## Разовая работа (не SSOT)

| Куда | Когда |
|------|--------|
| Чат | Срез / таблица / анализ по умолчанию |
| `scratch/` | Локальный файл для прогона (не в git) |
| `docs/adhoc/` | Только если Owner сказал сохранить (+ `expires:`) |

Канон: [`EPHEMERAL_WORK_CANON`](https://github.com/krvzdrv/alumineu-os/blob/main/docs/EPHEMERAL_WORK_CANON.md). Уборка: `./scripts/adhoc_cleanup.sh`.

## Правила

- Не плодить новые `.md`, если можно обновить SSOT из таблицы выше.
- Разовые заметки — с датой; через 30 дней удалить или в archive.
- Локальный язык **дополняет** hub-канон, не заменяет.
