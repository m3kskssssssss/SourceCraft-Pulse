#!/usr/bin/env bash
# Развёртывание Pulse через Docker Compose на чистом Ubuntu 22.04/24.04.
#
# Что делает:
#   1. Ставит Docker и compose-plugin (если не стоят).
#   2. Забирает код в /opt/pulse (git с фолбэком на tarball).
#   3. Спрашивает недостающие секреты → пишет /opt/pulse/.env.
#   4. docker compose up -d.
#   5. ufw: 22/80/443.
#
# Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/m3kskssssssss/SourceCraft-Pulse/main/deploy/setup.sh -o /tmp/setup.sh
#   bash /tmp/setup.sh
#
# Идемпотентен: повторный запуск обновит код и передеплоит.

set -euo pipefail

readonly REPO_URL="https://github.com/m3kskssssssss/SourceCraft-Pulse.git"
readonly TARBALL_URL="https://codeload.github.com/m3kskssssssss/SourceCraft-Pulse/tar.gz/refs/heads/main"
readonly APP_DIR="/opt/pulse"
readonly DOMAIN="source-craft-pulse.tech"

step() { printf "\n\033[1;34m▶ %s\033[0m\n" "$*"; }
info() { printf "  \033[36m%s\033[0m\n" "$*"; }
warn() { printf "  \033[33m⚠ %s\033[0m\n" "$*"; }
die()  { printf "\n\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Запускай от root: sudo bash setup.sh"

# ---------- 1. Docker ----------

step "Ставлю Docker (если нужно)"
if ! command -v docker >/dev/null; then
	export DEBIAN_FRONTEND=noninteractive
	apt-get update -qq
	apt-get install -y -qq ca-certificates curl gnupg lsb-release ufw openssl
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
	chmod a+r /etc/apt/keyrings/docker.gpg
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
	systemctl enable --now docker
fi
info "docker $(docker --version | awk '{print $3}' | tr -d ,)"
info "compose $(docker compose version --short)"

# ---------- 1.5. DNS для контейнеров ----------

# На Ubuntu /etc/resolv.conf указывает на systemd-resolved (127.0.0.53).
# Контейнер наследует этот адрес, но внутри него резолвера нет — любые
# обращения наружу падают с «connection refused». Прописываем демону
# настоящие апстримы хоста.
if [[ ! -f /etc/docker/daemon.json ]] && grep -q '127\.0\.0\.53' /etc/resolv.conf 2>/dev/null; then
	step "Прописываю DNS для контейнеров"
	upstream="$(grep -h '^nameserver' /run/systemd/resolve/resolv.conf 2>/dev/null | awk '{print $2}' | grep -v '^127\.' | head -2 || true)"
	[[ -z "$upstream" ]] && upstream="77.88.8.8
8.8.8.8"
	servers="$(printf '%s\n' "$upstream" | awk 'NR>1{printf ", "} {printf "\"%s\"", $0}')"
	printf '{\n  "dns": [%s]\n}\n' "$servers" > /etc/docker/daemon.json
	info "/etc/docker/daemon.json → dns [$servers]"
	systemctl restart docker
fi

# ---------- 2. Код ----------

step "Забираю код"
if [[ ! -d "$APP_DIR" ]]; then
	if timeout 30 git ls-remote --exit-code "$REPO_URL" HEAD >/dev/null 2>&1; then
		git clone --depth=1 "$REPO_URL" "$APP_DIR"
	else
		warn "github.com недоступен по 443. Скачиваю tarball через codeload."
		mkdir -p "$APP_DIR"
		curl -fsSL --connect-timeout 15 --max-time 120 "$TARBALL_URL" -o /tmp/pulse.tar.gz
		tar -xzf /tmp/pulse.tar.gz --strip-components=1 -C "$APP_DIR"
		rm -f /tmp/pulse.tar.gz
	fi
else
	info "Директория уже существует, обновляю"
	if [[ -d "$APP_DIR/.git" ]] && timeout 30 git -C "$APP_DIR" ls-remote --exit-code origin HEAD >/dev/null 2>&1; then
		git config --global --add safe.directory "$APP_DIR" || true
		git -C "$APP_DIR" fetch --depth=1 origin main
		git -C "$APP_DIR" reset --hard origin/main
	else
		warn "git недоступен, обновляю через tarball (существующий .env не трогаю)"
		local_env=""
		[[ -f "$APP_DIR/.env" ]] && local_env="$(cat "$APP_DIR/.env")"
		curl -fsSL --connect-timeout 15 --max-time 120 "$TARBALL_URL" -o /tmp/pulse.tar.gz
		# Заменяем всё, кроме .env; проще всего — удалить всё, распаковать заново
		find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +
		tar -xzf /tmp/pulse.tar.gz --strip-components=1 -C "$APP_DIR"
		[[ -n "$local_env" ]] && printf "%s" "$local_env" > "$APP_DIR/.env"
		rm -f /tmp/pulse.tar.gz
	fi
fi

# ---------- 2.5. Образ ----------

step "Беру образ Pulse"

# Сеть этой ВМ не тянет сборку (473 пакета с npm рвутся на полпути), поэтому
# основной путь — готовый образ из ghcr, собранный в GitHub Actions.
readonly GHCR_IMAGE="ghcr.io/m3kskssssssss/pulse:main"
if timeout 900 docker pull "$GHCR_IMAGE"; then
	PULSE_IMAGE="$GHCR_IMAGE"
	info "образ скачан из ghcr — сборка на сервере не нужна"
else
	warn "ghcr недоступен, собираю образ на месте (долго, нужна стабильная сеть)"
	docker build -t pulse-app:latest "$APP_DIR" || die "Сборка образа не удалась — смотри вывод выше"
	PULSE_IMAGE="pulse-app:latest"
fi

# ---------- 3. .env ----------

step "Собираю .env"

env_file="$APP_DIR/.env"
get_existing() {
	local key="$1"
	if [[ -f "$env_file" ]]; then
		grep "^${key}=" "$env_file" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"//;s/"$//' || true
	fi
	return 0
}

read_var() {
	local var="$1" prompt="$2" silent="${3:-0}" default="${4:-}"
	local value
	while :; do
		if [[ "$silent" == "1" ]]; then
			read -r -s -p "$prompt: " value || true
			printf "\n"
		else
			if [[ -n "$default" ]]; then
				read -r -p "$prompt [$default]: " value || true
				value="${value:-$default}"
			else
				read -r -p "$prompt: " value || true
			fi
		fi
		[[ -n "$value" ]] && break
		warn "Пусто. Введите значение или Ctrl+C."
	done
	printf -v "$var" "%s" "$value"
}

random_hex() { openssl rand -hex "$1"; }

echo ""
echo "  Заполняю переменные окружения. Enter — значение по умолчанию."
echo "  Секреты вводятся скрытно."
echo ""

CADDYFILE="$(get_existing CADDYFILE)"
CADDYFILE="${CADDYFILE:-Caddyfile.docker}"

DB_PASSWORD="$(get_existing DB_PASSWORD)"
DB_PASSWORD="${DB_PASSWORD:-$(random_hex 24)}"

AUTH_SECRET="$(get_existing AUTH_SECRET)"
AUTH_SECRET="${AUTH_SECRET:-$(random_hex 32)}"

CRON_SECRET="$(get_existing CRON_SECRET)"
CRON_SECRET="${CRON_SECRET:-$(random_hex 32)}"

SOURCECRAFT_PAT="$(get_existing SOURCECRAFT_PAT)"
read_var SOURCECRAFT_PAT "SOURCECRAFT_PAT" 1 "$SOURCECRAFT_PAT"

AI_BASE_URL="$(get_existing AI_BASE_URL)"
read_var AI_BASE_URL "AI_BASE_URL" 0 "${AI_BASE_URL:-https://routerai.ru/api/v1}"

AI_API_KEY="$(get_existing AI_API_KEY)"
read_var AI_API_KEY "AI_API_KEY" 1 "$AI_API_KEY"

AI_MODEL="$(get_existing AI_MODEL)"
read_var AI_MODEL "AI_MODEL" 0 "${AI_MODEL:-openai/gpt-6-luna-pro}"

AI_MONTHLY_BUDGET_RUB="$(get_existing AI_MONTHLY_BUDGET_RUB)"
read_var AI_MONTHLY_BUDGET_RUB "AI_MONTHLY_BUDGET_RUB" 0 "${AI_MONTHLY_BUDGET_RUB:-500}"

ADMIN_LOGIN="$(get_existing ADMIN_LOGIN)"
read_var ADMIN_LOGIN "ADMIN_LOGIN" 0 "${ADMIN_LOGIN:-admin}"

ADMIN_PASSWORD_HASH="$(get_existing ADMIN_PASSWORD_HASH)"
if [[ -z "$ADMIN_PASSWORD_HASH" ]]; then
	step "Генерирую хеш пароля админа (argon2id)"
	echo "  Пароль от 20 символов. Ввод скрыт."
	while :; do
		read -r -s -p "  Пароль админа: " admin_pw || true
		printf "\n"
		[[ ${#admin_pw} -ge 20 ]] && break
		warn "Слишком короткий, нужно ≥ 20 символов."
	done
	# Одноразово подтянем аргон в маленький контейнер, посчитаем хеш и удалим.
	hash_out="$(printf '%s\n' "$admin_pw" | docker run --rm -i "$PULSE_IMAGE" pnpm --silent exec tsx src/cli/admin-hash.ts)"
	unset admin_pw
	ADMIN_PASSWORD_HASH="$(printf "%s\n" "$hash_out" | { grep '^ADMIN_PASSWORD_HASH=' || true; } | tail -1 | sed 's/^ADMIN_PASSWORD_HASH=//')"
	[[ -n "$ADMIN_PASSWORD_HASH" ]] || die "Не удалось сгенерировать хеш пароля"
fi

# Docker Compose интерполирует ${...} в значениях .env, а argon2-хеш состоит
# из долларов. Удваиваем их: compose схлопнет обратно в одинарные.
ADMIN_PASSWORD_HASH_ESCAPED="${ADMIN_PASSWORD_HASH//'$'/'$$'}"

cat > "$env_file" <<EOF
# Автогенерирован deploy/setup.sh. Секреты — не коммитить.

DOMAIN=${DOMAIN}
CADDYFILE=${CADDYFILE}
PULSE_IMAGE=${PULSE_IMAGE}
DB_PASSWORD=${DB_PASSWORD}
AUTH_SECRET=${AUTH_SECRET}
CRON_SECRET=${CRON_SECRET}

SOURCECRAFT_PAT=${SOURCECRAFT_PAT}

AI_BASE_URL=${AI_BASE_URL}
AI_API_KEY=${AI_API_KEY}
AI_MODEL=${AI_MODEL}
AI_MONTHLY_BUDGET_RUB=${AI_MONTHLY_BUDGET_RUB}

ADMIN_LOGIN=${ADMIN_LOGIN}
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH_ESCAPED}
EOF
chmod 600 "$env_file"

# ---------- 4. compose up ----------

step "Поднимаю стек через docker compose"

# Прошлая, не-докерная версия деплоя ставила Caddy системным сервисом:
# он держит 80/443, и контейнер caddy не стартует.
if systemctl is-active --quiet caddy 2>/dev/null; then
	warn "Останавливаю системный caddy.service — 80/443 займёт контейнер"
	systemctl disable --now caddy || true
fi

# docker-proxy в выводе игнорируем: это наши же контейнеры с прошлого запуска.
busy="$(ss -lptnH 'sport = :80 or sport = :443' 2>/dev/null | grep -v docker-proxy || true)"
if [[ -n "$busy" ]]; then
	echo "$busy" >&2
	die "Порты 80/443 заняты процессом выше. Остановите его и запустите скрипт снова."
fi

cd "$APP_DIR"
docker compose pull --ignore-pull-failures 2>/dev/null || true
docker compose up -d

# ---------- 5. Firewall ----------

step "Настраиваю ufw"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
info "ufw включён"

# ---------- финиш ----------

echo ""
echo -e "\033[1;32m✓ Готово.\033[0m"
echo "  App:      https://${DOMAIN}"
echo "  Health:   https://${DOMAIN}/api/health"
echo "  Admin:    https://${DOMAIN}/admin/login  (login=${ADMIN_LOGIN})"
echo ""
echo "Контейнеры:"
echo "  docker compose -f ${APP_DIR}/compose.yaml ps"
echo "  docker compose -f ${APP_DIR}/compose.yaml logs -f app"
echo "  docker compose -f ${APP_DIR}/compose.yaml logs -f worker"
echo "  docker compose -f ${APP_DIR}/compose.yaml logs -f caddy"
echo ""
echo "TLS-сертификат Caddy получит автоматически при первом заходе на https://${DOMAIN}"
