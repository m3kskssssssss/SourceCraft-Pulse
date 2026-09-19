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
- **ИИ:** DeepSeek или YandexGPT, переключается переменной окружения `AI_PROVIDER`
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
- `pnpm db:generate` — сгенерировать SQL-миграции из `src/db/schema.ts`
- `pnpm db:migrate` — применить миграции к БД из `DATABASE_URL`
- `pnpm db:push` — dev-режим Drizzle, пушит схему без миграций
- `pnpm db:seed` — заглушка; реальный seed появится на Этапе 3

## Структура

```
src/
├── app/                       # маршруты App Router
│   ├── api/health/route.ts    # /api/health — SELECT 1
│   ├── r/[org]/[repo]/page.tsx
│   ├── admin/page.tsx
│   ├── layout.tsx
│   ├── page.tsx               # публичный рейтинг
│   └── globals.css
└── db/
    ├── schema.ts              # 10 таблиц (users, accounts, sessions,
    │                          #   verification_tokens, repositories,
    │                          #   analyses, analysis_jobs, ai_calls,
    │                          #   ai_cache, events)
    ├── client.ts              # Drizzle over neon-http для приложения
    ├── migrate.ts             # tsx-скрипт для pnpm db:migrate
    └── seed.ts                # заглушка
drizzle/                       # SQL-миграции и meta (коммитятся)
drizzle.config.ts              # конфиг drizzle-kit (Neon Postgres)
```

## Прогресс

- [x] Этап 1 — каркас, схема БД, health-эндпоинт, деплой
- [ ] Этап 2 — SourceCraft-клиент, сбор фактов, воркер
- [ ] Этап 3 — движок оценки + тесты + seed по реальным данным
- [ ] Этап 4 — слой ИИ, кэш, учёт затрат, лимит бюджета
- [ ] Этап 5 — авторизация Auth.js, гостевой доступ, лимиты
- [ ] Этап 6 — публичный рейтинг, публичный API, SVG-бейдж
- [ ] Этап 7 — админка (сводка, расходы, очередь, настройки)
- [ ] Этап 8 — визуальная полировка под чёрно-белую тему
