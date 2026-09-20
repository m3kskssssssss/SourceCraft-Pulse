# Общий образ для приложения и воркера. Не мучаем multi-stage —
# для хакатона проще держать один тяжёлый образ, но с рабочим tsx для миграций
# и argon2 native-модулями.

FROM node:22-alpine

# git — для клонирования репозиториев в воркере;
# python/make/g++ — для сборки native-модулей argon2;
# libc6-compat — прекомпилированные бинарники Node любят glibc.
RUN apk add --no-cache git python3 make g++ libc6-compat curl

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# 1) зависимости отдельным слоем, чтобы кешировались между сборками
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2) исходники и сборка Next.js
COPY . .

# Next.js на этапе сборки эвалуирует модули маршрутов; наш db/client.ts
# бросает, если DATABASE_URL пуст. Даём заглушку — на runtime compose
# перезапишет реальными значениями.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    AUTH_SECRET=dummy-for-build
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

# Дефолт — приложение. Воркер и миграции запускаются compose'ом через
# переопределённый command.
CMD ["pnpm", "start"]
