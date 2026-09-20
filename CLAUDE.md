# Pulse — оценка здоровья репозиториев SourceCraft

Веб-сервис, куда пользователь вводит `org/repo` с [SourceCraft](https://sourcecraft.tech), получает оценку 0–100 по четырём категориям, объяснение и рекомендации. Опубликованные анализы попадают в общий рейтинг.

Хакатонный проект. Горизонт — несколько дней. Важен рабочий вертикальный срез, а не полнота.

## Стек (не обсуждается)

- **Приложение:** Next.js 15 (App Router), TypeScript strict, pnpm
- **База:** Postgres на Neon free tier, Drizzle ORM, drizzle-kit миграции
- **Стили:** Tailwind CSS, без готовых UI-китов — компоненты пишем сами
- **Валидация:** Zod для всего, что приходит извне
- **Тесты:** Vitest, только на движке оценки и парсерах
- **Авторизация:** Auth.js (next-auth) v5 с адаптером Drizzle
- **ИИ:** через OpenAI-совместимый роутер (RouterAI, `AI_BASE_URL`/`AI_API_KEY`/`AI_MODEL`); usage.cost роутер возвращает сам
- **Хостинг:** Vercel Hobby

## Ограничения Vercel Hobby

- serverless-функции короткие; долгие задачи — во внешний воркер через очередь `analysis_jobs`
- cron на Hobby ≤ 1 раза в сутки с точностью до часа → `/api/cron/*` дёргаются извне заголовком `Authorization: Bearer $CRON_SECRET`
- нет постоянного диска; `git clone` — только в воркере, в `/tmp`, `--filter=blob:none --bare`, с немедленным удалением
- никаких фоновых процессов, живущих дольше ответа

## Договорённости

- **Языки:** UI-тексты и комментарии — на русском; код, идентификаторы, ключи БД, commit-сообщения — на английском.
- **Секреты:** только через переменные окружения. `.env.example` в репозитории, `.env` — никогда.
- **API SourceCraft:** ничего не выдумывать. Нет поля в спецификации — честно помечаем «нет данных» в интерфейсе.
- **Этапы:** один этап = один коммит с осмысленным сообщением. Не коммитим сломанное состояние.
- **Скоуп:** пишем только то, что нужно текущему этапу. Никаких абстракций «на будущее».

## Чего не делаем

Аналитика, Sentry, Storybook, микросервисы, Docker, Redis, GraphQL, очереди сложнее одной таблицы в Postgres.

## Команды

- `pnpm install` — установка зависимостей
- `pnpm dev` — dev-сервер на http://localhost:3000
- `pnpm build` — прод-сборка
- `pnpm start` — запуск прод-сборки
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint (flat config через FlatCompat)
- `pnpm test` / `pnpm test:watch` — Vitest, только движок оценки и парсеры
- `pnpm gen:api` — скачать/сконвертировать OpenAPI SourceCraft и обновить `types.gen.ts`
- `pnpm collect <org> <repo> [--score] [--ai]` — сбор фактов; `--score` печатает AnalysisResult; `--ai` также прогоняет три AI-задачи через RouterAI
- `pnpm ai:ping` — проверка RouterAI: маленький запрос + повтор из кэша
- `pnpm worker` — прогон воркера очереди `analysis_jobs`
- `pnpm seed:repos [--auto] [--count=N]` — поставить репозитории в очередь
- `pnpm db:generate` — сгенерировать SQL-миграции из `src/db/schema.ts`
- `pnpm db:migrate` — применить миграции к БД из `DATABASE_URL`
- `pnpm db:push` — dev-режим Drizzle, пушит схему без миграций
- `pnpm db:seed` — заглушка; реальный seed появится на Этапе 3

## Структура

```
src/
├── app/                          # маршруты App Router
│   ├── api/health/route.ts       # /api/health — SELECT 1
│   ├── r/[org]/[repo]/page.tsx
│   ├── admin/page.tsx
│   ├── layout.tsx
│   ├── page.tsx                  # публичный рейтинг
│   └── globals.css
├── cli/
│   └── collect.ts                # pnpm collect <org> <repo>
├── db/
│   ├── schema.ts                 # 10 таблиц Drizzle
│   ├── client.ts                 # neon-http, для приложения (короткоживущие serverless)
│   ├── worker-client.ts          # pg-Pool, только для воркера (FOR UPDATE SKIP LOCKED)
│   ├── migrate.ts                # pnpm db:migrate
│   ├── seed.ts                   # заглушка
│   └── seed-repos.ts             # pnpm seed:repos
├── lib/
│   ├── collect.ts                # collectRepoFacts(org, repo) → RepoFacts
│   ├── ai/
│   │   ├── provider.ts           # интерфейс AiProvider
│   │   ├── router.ts             # реализация поверх OpenAI-compat роутера
│   │   ├── cache.ts              # InMemoryAiCache + SHA-256 hashKey
│   │   ├── telemetry.ts          # ConsoleAiTelemetry, usdToRub
│   │   ├── budget.ts             # assertUnderMonthlyBudget
│   │   ├── runner.ts             # runAiTask: cache + budget + zod + retry + fallback
│   │   └── tasks/                # readme-rubric.ts, pr-issues-digest.ts, recommendation-copy.ts
│   ├── scoring/
│   │   ├── index.ts              # scoreRepo(facts, {aiDocsScore?}) → AnalysisResult
│   │   ├── config.ts             # веса, пороги, штрафы, effort
│   │   ├── types.ts              # MetricScore, CategoryScore, AnalysisResult, Recommendation
│   │   ├── normalize.ts          # linearScore/logScore/boolScore/clamp
│   │   ├── facts-helpers.ts      # isUnknown(), safeShare()
│   │   ├── recommendations.ts    # top-3 через симуляцию
│   │   └── metrics/              # activity.ts, code.ts, security.ts, docs.ts
│   │   └── __tests__/            # Vitest фикстуры + тесты
│   ├── git/
│   │   ├── clone.ts              # withBareClone() + readFileFromClone() (только воркер)
│   │   ├── history.ts            # analyzeGitHistory / analyzeGitHistoryInClone
│   │   ├── log-parser.ts         # чистый парсер git log --numstat
│   │   └── secrets.ts            # regex-детектор секретов в диффах
│   ├── security/
│   │   ├── types.ts              # SecurityProvider интерфейс + типы
│   │   ├── provider.ts           # фабрика getSecurityProvider()
│   │   ├── osv-dev.ts            # реальная реализация через api.osv.dev
│   │   ├── sourcecraft-appsec.ts # заглушка «нет данных»
│   │   └── lockfiles.ts          # парсеры package-lock.json + pnpm-lock.yaml
│   └── sourcecraft/
│       ├── client.ts             # SourcecraftClient + getSourcecraftClient()
│       ├── errors.ts             # SourcecraftApiError, SourcecraftNotFoundError
│       ├── semaphore.ts          # ограничитель параллелизма
│       ├── types.gen.ts          # сгенерированные типы (pnpm gen:api)
│       └── openapi/              # swagger.json + openapi3.json (обе коммитятся)
└── worker/
    └── run.ts                    # обычный Node-скрипт, pnpm worker
scripts/
└── gen-api.ts                    # конвертер swagger2openapi + генерация types.gen.ts
seeds/
└── repos.json                    # список org/repo для seed:repos
.github/workflows/
└── worker.yml                    # ручной workflow_dispatch для воркера
drizzle/                          # SQL-миграции и meta (коммитятся)
drizzle.config.ts                 # конфиг drizzle-kit (Neon Postgres)
```

## Прогресс

- [x] Этап 1 — каркас, схема БД, health-эндпоинт, деплой
- [x] Этап 2 — SourceCraft-клиент, сбор фактов, воркер
- [x] Этап 3 — движок оценки + Vitest (seed по реальным данным отложен до подключения Neon)
- [x] Этап 4 — слой ИИ через RouterAI, кэш, учёт затрат, лимит бюджета (Drizzle-версии кэша/телеметрии отложены до Neon)
- [ ] Этап 5 — авторизация Auth.js, гостевой доступ, лимиты
- [ ] Этап 6 — публичный рейтинг, публичный API, SVG-бейдж
- [ ] Этап 7 — админка (сводка, расходы, очередь, настройки)
- [ ] Этап 8 — визуальная полировка под чёрно-белую тему
