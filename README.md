# Pulse

Веб-сервис оценки здоровья открытых репозиториев платформы [SourceCraft](https://sourcecraft.tech). Пользователь вводит `org/repo`, сервис собирает данные через публичный API, считает оценку 0–100, объясняет её и даёт конкретные рекомендации. Опубликованные анализы попадают в общий рейтинг.

Хакатонный проект.

## Стек

- Next.js 15 (App Router), TypeScript strict, pnpm
- Postgres на Neon + Drizzle ORM + drizzle-kit
- Tailwind CSS
- Zod, Auth.js v5, Vitest (только для движка оценки)
- Деплой на Vercel Hobby

Подробнее — в [`CLAUDE.md`](./CLAUDE.md).

## Требования

- Node.js ≥ 20
- pnpm ≥ 10
- Аккаунт [Neon](https://neon.tech) (бесплатный уровень) для Postgres
- Позднее (Этап 2+): personal access token SourceCraft
- Позднее (Этап 4+): ключ DeepSeek или Яндекса

## Установка

```bash
pnpm install
cp .env.example .env
# заполните хотя бы DATABASE_URL
```

## База данных

```bash
# сгенерировать SQL-миграции из схемы (после правки src/db/schema.ts)
pnpm db:generate

# применить миграции к базе, указанной в DATABASE_URL
pnpm db:migrate

# альтернатива для локальной разработки — пушить схему без миграций
pnpm db:push

# наполнение (на Этапе 1 — заглушка; настоящий seed появится на Этапе 3)
pnpm db:seed
```

## Разработка

```bash
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # прод-сборка
pnpm start        # запуск прод-сборки локально
```

## Проверка соединения с БД

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","db":"ok"}
```

## Деплой на Vercel

1. Импортируйте репозиторий на [vercel.com/new](https://vercel.com/new).
2. Подключите Neon как integration (или задайте `DATABASE_URL` вручную).
3. Заполните все переменные из `.env.example` в настройках проекта Vercel.
4. Перед первым запуском выполните `pnpm db:migrate` локально с боевым `DATABASE_URL` — Vercel не запускает миграции автоматически.
5. Cron на Hobby-тарифе ограничен: наши `/api/cron/*` — это защищённые HTTP-эндпоинты, которые дёргает любой внешний планировщик заголовком `Authorization: Bearer $CRON_SECRET`.

## Структура

```
src/
├── app/               # маршруты (App Router)
│   ├── api/health/    # проверка соединения с БД
│   ├── r/[org]/[repo] # карточка репозитория
│   ├── admin/         # админка
│   ├── layout.tsx
│   └── page.tsx       # публичный рейтинг
└── db/
    ├── schema.ts      # таблицы Drizzle
    ├── client.ts      # клиент для приложения
    ├── migrate.ts     # tsx-скрипт для pnpm db:migrate
    └── seed.ts        # tsx-скрипт для pnpm db:seed
drizzle/               # сгенерированные SQL-миграции
```

## Прогресс по этапам

- [x] Этап 1 — каркас, схема БД, health-эндпоинт, деплой
- [x] Этап 2 — SourceCraft-клиент, сбор фактов, воркер
- [x] Этап 3 — движок оценки + тесты + seed по реальным данным
- [x] Этап 4 — слой ИИ, кэш, учёт затрат, лимит бюджета
- [x] Этап 5 — авторизация Auth.js, гостевой доступ, лимиты
- [x] Этап 6 — публичный рейтинг, публичный API, SVG-бейдж
- [x] Этап 7 — админка (сводка, расходы, очередь, настройки)
