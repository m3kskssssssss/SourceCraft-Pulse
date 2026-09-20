# Общий образ для приложения и воркера. Не мучаем multi-stage —
# для хакатона проще держать один тяжёлый образ, но с рабочим tsx для миграций.

FROM node:22-alpine

# git — для клонирования репозиториев в воркере;
# libc6-compat — прекомпилированные бинарники Node (swc) любят glibc.
# Компилятор не нужен: argon2 0.45 кладёт в prebuilds/ готовый musl-бинарник.
#
# Если dl-cdn.alpinelinux.org недоступен (типично для серверов в РФ: apk тогда
# падает с кодом, равным числу запрошенных пакетов) — переключаемся на зеркало.
ARG ALPINE_MIRROR=https://mirror.yandex.ru/mirrors/alpine
RUN set -eu; \
	if ! apk add --no-cache git libc6-compat; then \
		echo "apk: dl-cdn недоступен, переключаюсь на ${ALPINE_MIRROR}"; \
		for f in /etc/apk/repositories /etc/apk/repositories.d/*; do \
			if [ -f "$f" ]; then \
				sed -i "s|https\?://dl-cdn\.alpinelinux\.org/alpine|${ALPINE_MIRROR}|g" "$f"; \
			fi; \
		done; \
		apk add --no-cache git libc6-compat; \
	fi

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# 1) зависимости отдельным слоем, чтобы кешировались между сборками
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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
