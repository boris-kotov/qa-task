# Toolshop — QA assessment (local instance only)

Оценка готовности к релизу: каталог → корзина → checkout (+ вход/регистрация в нужном объёме).
Документы: [TEST_PLAN](TEST_PLAN.md) · [TEST_CASES](TEST_CASES.md) · [BUGS](BUGS.md) · [RELEASE](RELEASE.md) · [AI_NOTES](AI_NOTES.md)

## Окружение
| | |
|---|---|
| ОС | macOS (Darwin 25.6.0) |
| Docker / Compose | 29.4.2 / v5.1.3 |
| Node / npm | v24.22.0 / 11.19.1 |
| Playwright | 1.64.1 (Chromium) |

## Версия приложения
- Репозиторий: `testsmith-io/practice-software-testing` (клон рядом, **не** в этом репо — лицензия запрещает распространение)
- `SPRINT=sprint5-with-bugs` (файл `.env` в корне клона)
- Commit: `ae7caecb811dd8952c09d997e69be7cb946ecd44` (Merge PR #857, 2026-10-11)
- Требования: `docs/user-stories/v5.md`, `docs/features.md`, Swagger http://localhost:8091/api/documentation

## Запуск приложения
Вариант: **сборка из исходников** (`docker compose up -d`).
Готовые образы (`docker-compose.prod.yml`) **не используются**: UI в них собран с `environment.prod.ts`,
где `apiUrl` указывает на публичный API, — UI ходил бы на публичный стенд вместо локального.

```bash
git clone https://github.com/testsmith-io/practice-software-testing.git toolshop-app
cd toolshop-app
git checkout ae7caecb811dd8952c09d997e69be7cb946ecd44
echo "SPRINT=sprint5-with-bugs" > .env
docker compose up -d
# подождать ~30 с, пока поднимется MariaDB
docker compose exec laravel-api php artisan migrate:fresh --seed
```
UI: http://localhost:4200 · API: http://localhost:8091

Изменения приложения: нет (кроме `SPRINT` в `.env` по инструкции задания). Если появятся — `app-changes/*.patch` + причина здесь.

## Запуск автотестов
```bash
# этот репозиторий лежит рядом с toolshop-app
npm ci
npx playwright install chromium
cp .env.example .env          # значения по умолчанию указывают на localhost
npm test                      # все тесты, HTML-отчёт: reports/html
npm run test:api | npm run test:ui
npm run report                # открыть отчёт
```

### Подготовка данных
- Каталог и демо-аккаунты — `migrate:fresh --seed` (вручную или `RESET_DB=true` в `.env` → один раз в `globalSetup` до старта воркеров).
- Каждый тест создаёт собственного пользователя и данные через API (уникальный e-mail), поэтому тесты независимы, запускаются по одному, в любом порядке и параллельно.
- `globalSetup` проверяет, что UI/API доступны и каталог не пуст.

### Защита от запросов вне локального стенда
- `src/config/env.ts` — `BASE_URL`/`API_URL` принимаются только с хостом `localhost`/`127.0.0.1`, иначе прогон не стартует.
- `src/fixtures.ts` — auto-fixture блокирует любой браузерный запрос не на localhost; XHR/fetch наружу роняет тест.

### Ожидаемые падения (дефекты)
_Заполняется по мере работы: тест → BUG-ID._

## Заимствованный код
_Нет / заполняется: источник → что взято → что изменено._

## Служебное (защита от ошибок сдачи)
- `npm run guard` — проверка репозитория: нет `.env`, кода приложения, ссылок на публичный стенд в коде, `.only`, неотредактированных личных данных в `ai_sessions/`, файлов > 50 МБ. Запускается git-хуками pre-commit/pre-push (`core.hooksPath=.githooks`).
- `.claude/settings.json` + `.claude/hooks/guard.mjs` — запреты для AI-агента (см. AI_NOTES.md). Самопроверка: `bash scripts/test-guard.sh`.
- `npm run sessions:export` — выгрузка полных транскриптов Claude Code в `ai_sessions/` с маскированием.

## Журнал времени
| Блок | Начало | Конец | Длительность | Что сделано |
|---|---|---|---|---|
| Развёртывание (не входит в 4 ч) | 2026-11-03 18:40 | | | подготовка репозитория, защитные настройки, клон приложения |
# qa-task
