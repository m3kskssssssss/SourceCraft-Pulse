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

# Ставим pnpm, перебирая регистри, пока какая-нибудь реально не отдаст тарболл.
# Проверка «по факту скачивания» важнее пинга: registry.npmmirror.com, например,
# отдаёт метаданные, но тарболлы уводит на cdn.npmmirror.com, который из РФ
# может не открыться. Победившая регистри остаётся в /root/.npmrc — pnpm install
# ниже пойдёт через неё же. Своя регистри задаётся --build-arg NPM_REGISTRY=…
ARG NPM_REGISTRY=
ARG PNPM_VERSION=10.33.2
RUN set -eu; \
	corepack disable >/dev/null 2>&1 || true; \
	npm config set fetch-timeout 20000; \
	npm config set fetch-retries 1; \
	ok=0; \
	for r in ${NPM_REGISTRY} \
		https://registry.npmjs.org \
		https://registry.yarnpkg.com \
		https://mirrors.cloud.tencent.com/npm \
		https://repo.huaweicloud.com/repository/npm \
		https://registry.npmmirror.com; do \
		echo "npm: пробую ${r}"; \
		npm config set registry "$r"; \
		if npm install -g "pnpm@${PNPM_VERSION}"; then \
			echo "npm: работает ${r}"; \
			ok=1; \
			break; \
		fi; \
		echo "npm: ${r} не отдала пакет, пробую следующую"; \
	done; \
	if [ "$ok" != 1 ]; then \
		echo "Ни одна npm-регистри недоступна с этой машины."; \
		exit 1; \
	fi; \
	npm config set fetch-timeout 120000; \
	npm config set fetch-retries 3; \
	pnpm --version

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
