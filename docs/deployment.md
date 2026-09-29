# Сборка и запуск

## 1. Требования

| Компонент | Версия |
|---|---|
| Node.js | 20 или новее (проверено на 22) |
| pnpm | 10 (`packageManager: pnpm@10.33.2`) |
| PostgreSQL | 16 или Neon |
| Токен SourceCraft | персональный токен (PAT) с правом чтения |
| ИИ-роутер | OpenAI-совместимый, например RouterAI. Необязателен: без него анализ идёт без модели |

## 2. Получение исходного кода

```bash
git clone https://git.sourcecraft.dev/lct-hackaton-2026/case-18-repo-health-score-team-59.git pulse
cd pulse
```

Репозиторий: <https://sourcecraft.dev/lct-hackaton-2026/case-18-repo-health-score-team-59>.

## 3. Локальный запуск

```bash
pnpm install
cp .env.example .env        # заполните переменные (раздел 6)
pnpm db:migrate             # применить миграции к DATABASE_URL
pnpm dev                    # http://localhost:3000
```

Проверка:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","db":"ok"}
```

Прод-сборка: `pnpm build && pnpm start`. `pnpm build` сам применяет миграции, если задан
`DATABASE_URL`.

Локальная база PostgreSQL для разработки:

```bash
docker run -d --name pulse-db -e POSTGRES_PASSWORD=pulse -e POSTGRES_DB=pulse -p 5432:5432 postgres:16
# DATABASE_URL=postgres://postgres:pulse@localhost:5432/pulse
```

## 4. Развёртывание на Vercel (демонстрационный стенд)

1. Создайте базу в Neon и скопируйте pooled-строку подключения (хост с `-pooler`,
   `?sslmode=require`). Это `DATABASE_URL`.
2. Импортируйте репозиторий в Vercel. Миграции применяются на этапе сборки.
3. Задайте переменные окружения (раздел 6).
4. Включите Fluid compute. Без него функции завершаются раньше 300 с, и анализ крупных
   репозиториев не успевает.
5. Настройте внешний планировщик (раздел 5). На тарифе Hobby встроенный cron Vercel
   срабатывает не чаще раза в сутки, поэтому маршруты `/api/cron/*` вызываются извне.
6. Для входа через Яндекс ID зарегистрируйте приложение на `oauth.yandex.ru` с Redirect URI
   `https://<домен>/api/auth/callback/yandex`.

## 5. Расписание плановых задач

Все маршруты принимают `GET` и `POST` с заголовком `Authorization: Bearer $CRON_SECRET`.

| Маршрут | Расписание | Назначение |
|---|---|---|
| `/api/cron/commit-check` | 00:00 и 12:00 МСК (допустимо ежечасно) | проверка новых коммитов и переоценка изменившихся |
| `/api/cron/refresh-public` | ежечасно | пересчёт публичных оценок, изменившихся по данным каталога |
| `/api/cron/catalog` | раз в сутки | обход каталога SourceCraft |
| `/api/cron/catalog-run` | ежеминутно, пока в админке включён прогон каталога | оценка неоценённых репозиториев каталога |
| `/api/cron/refresh-badges` | 00:00 по `BADGE_REFRESH_TZ` | пересчёт подтверждённых репозиториев владельцев |
| `/api/cron/sync-tokens` | каждые 5 минут | синхронизация «Моих репозиториев» по сохранённым токенам |

Пример вызова:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<домен>/api/cron/commit-check
```

Повторный вызов маршрута в том же окне безопасен: уже выполненная работа не повторяется,
незавершённая доделывается.

## 6. Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | да | строка подключения PostgreSQL |
| `AUTH_SECRET` | да | ключ подписи сессий: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | да на сервере | публичный адрес приложения |
| `AUTH_TRUST_HOST` | да за прокси | `true` на Vercel и за Caddy |
| `SOURCECRAFT_PAT` | да | токен API SourceCraft для публичных данных |
| `CRON_SECRET` | да для расписания | секрет маршрутов `/api/cron/*` и запуска анализов диспетчерами |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH` | для админки | логин и хэш пароля (`pnpm admin:hash`, пароль от 20 символов) |
| `AUTH_YANDEX_ID`, `AUTH_YANDEX_SECRET` | для Яндекс ID | учётные данные OAuth-приложения |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | для ИИ | OpenAI-совместимый роутер и модель |
| `AI_MONTHLY_BUDGET_RUB` | нет | месячный бюджет на модель, ₽ (по умолчанию 150) |
| `USD_RUB_RATE` | нет | курс для пересчёта стоимости вызовов (по умолчанию 95) |
| `APPSEC_API_URL` | нет | адрес AppSec (по умолчанию `https://appsec.sourcecraft.tech`) |
| `TOKEN_ENCRYPTION_KEY` | нет | ключ шифрования личных токенов (32 байта base64); иначе выводится из `AUTH_SECRET` |
| `CATALOG_SYNC_HOURS` | нет | период обхода каталога воркером, ч (по умолчанию 24; 0 — не обходить) |
| `CATALOG_AUTO_ANALYZE` | нет | сколько неоценённых репозиториев каталога ставить в очередь воркером (по умолчанию 0) |
| `PUBLIC_REFRESH_DAYS` | нет | пересчёт публичной оценки по возрасту, дней (по умолчанию 0 — выключен) |
| `PUBLIC_REFRESH_BATCH` | нет | сколько устаревших публичных оценок ставить в очередь за запуск воркера (по умолчанию 2) |
| `BADGE_REFRESH_TZ` | нет | часовой пояс суточного пересчёта своих репозиториев (по умолчанию `Europe/Moscow`) |
| `WORKER_CONCURRENCY`, `WORKER_BATCH_SIZE`, `WORKER_MAX_SECONDS` | нет | параметры воркера (3, 6, 900) |
| `COMMIT_CHECK_SECONDS` | нет | время воркера на проверку коммитов, с (по умолчанию 120; 0 — не проверять) |

## 7. Развёртывание в Docker Compose

`compose.yaml` поднимает PostgreSQL 16, миграции, приложение, воркер очереди и Caddy с
автоматическим TLS. Порядок установки на сервер описан в [deploy/README.md](../deploy/README.md).

```bash
cp deploy/env.example .env   # заполните секреты
docker compose up -d --build
```

В этом варианте плановые задачи выполняет воркер. Внешний планировщик не нужен.

## 8. Команды

| Команда | Назначение |
|---|---|
| `pnpm dev`, `pnpm build`, `pnpm start` | разработка, прод-сборка с миграциями, запуск |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | TypeScript, ESLint, Vitest |
| `pnpm db:migrate`, `pnpm db:generate` | применение и генерация миграций |
| `pnpm collect <org> <repo> [--score] [--ai]` | сбор фактов о репозитории и расчёт оценки из консоли |
| `pnpm worker` | обработка очереди анализов и плановых задач |
| `pnpm catalog:sync [--enqueue=N]` | обход каталога SourceCraft; при `--enqueue` — постановка N неоценённых в очередь |
| `pnpm backfill:reviews [--limit=N] [--dry-run]` | догрузить сводку ревью PR в уже посчитанные публичные анализы: только API, без клона и ИИ |
| `pnpm backfill:empty-commits [--limit=N] [--dry-run]` | досчитать пустые коммиты в уже посчитанных публичных анализах: клон истории за 90 дней, без ИИ, балл не меняется |
| `pnpm seed:repos [--auto] [--count=N]` | постановка выбранных репозиториев в очередь |
| `pnpm gen:api` | обновление типов из OpenAPI SourceCraft |
| `pnpm ai:ping` | проверка подключения к модели и кэша |
| `pnpm admin:hash` | хэш пароля администратора |

## 9. Воспроизведение результатов

1. **Движок оценки.** `pnpm test` выполняет контрольные сценарии методики
   ([methodology.md](methodology.md), раздел 9). Сети и базы не требуется.
2. **Оценка конкретного репозитория без базы.**

   ```bash
   pnpm collect <org> <repo> --score
   ```

   Команда собирает факты через API SourceCraft и git-клон и печатает результат расчёта:
   баллы категорий, метрики, штрафы, рекомендации. Без флага `--ai` результат полностью
   детерминирован для одного и того же состояния репозитория и даты запуска: метрики свежести
   и окна 90 дней отсчитываются от текущего дня.
3. **Полный путь через интерфейс.** Войдите, откройте «Оценить», введите `org/repo`. После
   завершения анализа отчёт доступен на `/a/<id>` и выгружается в Markdown
   (`/a/<id>/report.md`) и PDF (`/a/<id>/export/report.pdf`).
4. **Повторный запуск.** Кнопка «Оценить заново» создаёт новый анализ. История оценок на
   карточке репозитория показывает оба запуска с изменением балла.
