#!/usr/bin/env bash
# Полное разворачивание Pulse на чистом Ubuntu 22.04/24.04.
#
# Что делает:
#   1. Ставит Node 22, pnpm, Caddy, Postgres 16, git, build-tools для argon2.
#   2. Создаёт пользователя pulse, БД pulse c ролью pulse.
#   3. Клонирует репу в /opt/pulse.
#   4. Спрашивает недостающие секреты (SC PAT, AI key, пароль админа).
#   5. Пишет .env (chmod 600), собирает Next.js, накатывает миграции.
#   6. Разворачивает systemd: pulse-app.service + pulse-worker.timer (каждые 2 мин).
#   7. Кладёт Caddyfile — TLS автоматом от Let's Encrypt.
#   8. Открывает 22/80/443 в ufw.
#
# Запуск (от root):
#   curl -fsSL https://raw.githubusercontent.com/m3kskssssssss/SourceCraft-Pulse/main/deploy/setup.sh -o /tmp/setup.sh
#   bash /tmp/setup.sh
#
# Идемпотентен: повторный запуск переиспользует БД и обновляет код.

set -euo pipefail

# ---------- параметры ----------

readonly REPO_URL="https://github.com/m3kskssssssss/SourceCraft-Pulse.git"
readonly APP_DIR="/opt/pulse"
readonly APP_USER="pulse"
readonly LOG_DIR="/var/log/pulse"
readonly DOMAIN="source-craft-pulse.tech"
readonly APP_PORT="3000"
readonly DB_NAME="pulse"
readonly DB_USER="pulse"

# ---------- helpers ----------

step() { printf "\n\033[1;34m▶ %s\033[0m\n" "$*"; }
info() { printf "  \033[36m%s\033[0m\n" "$*"; }
warn() { printf "  \033[33m⚠ %s\033[0m\n" "$*"; }
die()  { printf "\n\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

require_root() {
	[[ $EUID -eq 0 ]] || die "Запускай от root: sudo bash setup.sh"
}

read_secret() {
	local var="$1" prompt="$2" silent="${3:-0}" default="${4:-}"
	local value
	while :; do
		if [[ "$silent" == "1" ]]; then
			read -r -s -p "$prompt: " value
			printf "\n"
		else
			if [[ -n "$default" ]]; then
				read -r -p "$prompt [$default]: " value
				value="${value:-$default}"
			else
				read -r -p "$prompt: " value
			fi
		fi
		[[ -n "$value" ]] && break
		warn "Пусто. Введите значение или Ctrl+C."
	done
	printf -v "$var" "%s" "$value"
}

random_hex() { openssl rand -hex "$1"; }

# ---------- 1. система ----------

require_root

step "Обновляю пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

step "Ставлю базовые пакеты"
apt-get install -y -qq \
	curl ca-certificates gnupg lsb-release git \
	build-essential python3 pkg-config \
	debian-keyring debian-archive-keyring apt-transport-https \
	ufw openssl

# ---------- 2. Node 22 + pnpm ----------

step "Ставлю Node.js 22"
if ! node --version 2>/dev/null | grep -q "^v22"; then
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
	apt-get install -y -qq nodejs
fi
info "node $(node --version), npm $(npm --version)"

step "Ставлю pnpm через corepack"
corepack enable
corepack prepare pnpm@10.33.2 --activate
ln -sf "$(command -v pnpm)" /usr/bin/pnpm
info "pnpm $(pnpm --version)"

# ---------- 3. Caddy ----------

step "Ставлю Caddy"
if ! command -v caddy >/dev/null; then
	curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
		| gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		> /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -qq
	apt-get install -y -qq caddy
fi
info "caddy $(caddy version | head -1)"

# ---------- 4. Postgres 16 ----------

step "Ставлю Postgres"
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable --now postgresql
PG_VERSION="$(psql --version | grep -oE '[0-9]+' | head -1)"
info "postgres $PG_VERSION"

step "Создаю роль ${DB_USER} и БД ${DB_NAME}"
DB_PASSWORD_FILE="/root/.pulse-db-pass"
if [[ -f "$DB_PASSWORD_FILE" ]]; then
	DB_PASSWORD="$(cat "$DB_PASSWORD_FILE")"
	info "Пароль БД уже сгенерирован ранее (${DB_PASSWORD_FILE})"
else
	DB_PASSWORD="$(random_hex 24)"
	printf "%s" "$DB_PASSWORD" > "$DB_PASSWORD_FILE"
	chmod 600 "$DB_PASSWORD_FILE"
	info "Пароль БД сгенерирован и сохранён в ${DB_PASSWORD_FILE}"
fi

sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
	|| sudo -u postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}'"
# Обновим пароль на всякий случай (если файл был перезаписан).
sudo -u postgres psql -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
	|| sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"

# ---------- 5. Пользователь и директории ----------

step "Создаю пользователя ${APP_USER} и директории"
if ! id "$APP_USER" &>/dev/null; then
	useradd --system --create-home --shell /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR" "$LOG_DIR" /var/log/caddy
chown -R "$APP_USER:$APP_USER" "$LOG_DIR"

# ---------- 6. Репозиторий ----------

step "Клонирую/обновляю репозиторий"
if [[ -d "$APP_DIR/.git" ]]; then
	git -C "$APP_DIR" fetch --depth=1 origin main
	git -C "$APP_DIR" reset --hard origin/main
else
	git clone --depth=1 "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------- 7. Env ----------

step "Собираю .env"

existing_env="$APP_DIR/.env"
get_existing() {
	local key="$1"
	[[ -f "$existing_env" ]] && grep "^${key}=" "$existing_env" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

echo ""
echo "  Заполняю переменные окружения. Enter — значение по умолчанию."
echo "  Секреты вводятся скрытно."
echo ""

SOURCECRAFT_PAT="$(get_existing SOURCECRAFT_PAT)"
read_secret SOURCECRAFT_PAT "SOURCECRAFT_PAT" 1 "$SOURCECRAFT_PAT"

AI_BASE_URL="$(get_existing AI_BASE_URL)"
read_secret AI_BASE_URL "AI_BASE_URL" 0 "${AI_BASE_URL:-https://routerai.ru/v1}"

AI_API_KEY="$(get_existing AI_API_KEY)"
read_secret AI_API_KEY "AI_API_KEY" 1 "$AI_API_KEY"

AI_MODEL="$(get_existing AI_MODEL)"
read_secret AI_MODEL "AI_MODEL" 0 "${AI_MODEL:-deepseek/deepseek-v3.1-flash}"

AI_MONTHLY_BUDGET_RUB="$(get_existing AI_MONTHLY_BUDGET_RUB)"
read_secret AI_MONTHLY_BUDGET_RUB "AI_MONTHLY_BUDGET_RUB (₽)" 0 "${AI_MONTHLY_BUDGET_RUB:-500}"

ADMIN_LOGIN="$(get_existing ADMIN_LOGIN)"
read_secret ADMIN_LOGIN "ADMIN_LOGIN" 0 "${ADMIN_LOGIN:-admin}"

ADMIN_PASSWORD_HASH="$(get_existing ADMIN_PASSWORD_HASH)"

AUTH_SECRET="$(get_existing AUTH_SECRET)"
if [[ -z "$AUTH_SECRET" ]]; then
	AUTH_SECRET="$(random_hex 32)"
	info "Сгенерировал AUTH_SECRET (64 hex)."
fi

CRON_SECRET="$(get_existing CRON_SECRET)"
if [[ -z "$CRON_SECRET" ]]; then
	CRON_SECRET="$(random_hex 32)"
fi

cat > "$APP_DIR/.env" <<EOF
# Автогенерирован скриптом deploy/setup.sh. Не коммитить.

DATABASE_URL="${DATABASE_URL}"
AUTH_SECRET="${AUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"

SOURCECRAFT_PAT="${SOURCECRAFT_PAT}"

AI_BASE_URL="${AI_BASE_URL}"
AI_API_KEY="${AI_API_KEY}"
AI_MODEL="${AI_MODEL}"
AI_MONTHLY_BUDGET_RUB="${AI_MONTHLY_BUDGET_RUB}"

ADMIN_LOGIN="${ADMIN_LOGIN}"
ADMIN_PASSWORD_HASH="${ADMIN_PASSWORD_HASH}"

CRON_SECRET="${CRON_SECRET}"

NODE_ENV=production
WORKER_BATCH_SIZE=5
EOF
chmod 600 "$APP_DIR/.env"
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"

# ---------- 8. Установка зависимостей и сборка ----------

step "Устанавливаю зависимости (pnpm install)"
sudo -u "$APP_USER" bash -lc "cd $APP_DIR && pnpm install --frozen-lockfile"

# Если хеша админа не было — генерируем.
if [[ -z "${ADMIN_PASSWORD_HASH}" ]]; then
	step "Генерирую хеш пароля админа (argon2id)"
	echo "  Пароль от 20 символов. Ввод скрыт."
	while :; do
		read -r -s -p "  Придумай пароль админа: " admin_pw
		printf "\n"
		[[ ${#admin_pw} -ge 20 ]] && break
		warn "Слишком короткий, нужно ≥ 20 символов."
	done
	hash_out="$(sudo -u "$APP_USER" bash -lc "cd $APP_DIR && printf '%s\n' '$admin_pw' | pnpm --silent exec tsx src/cli/admin-hash.ts")"
	unset admin_pw
	ADMIN_PASSWORD_HASH="$(printf "%s\n" "$hash_out" | grep '^ADMIN_PASSWORD_HASH=' | tail -1 | sed 's/^ADMIN_PASSWORD_HASH=//')"
	[[ -n "$ADMIN_PASSWORD_HASH" ]] || die "Не удалось сгенерировать хеш пароля"
	sed -i "s|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH=\"${ADMIN_PASSWORD_HASH}\"|" "$APP_DIR/.env"
fi

step "Собираю Next.js (pnpm build)"
sudo -u "$APP_USER" bash -lc "cd $APP_DIR && pnpm build"

step "Накатываю миграции Drizzle"
sudo -u "$APP_USER" bash -lc "cd $APP_DIR && pnpm db:migrate"

# ---------- 9. systemd ----------

step "Разворачиваю systemd-юниты"
install -m 644 "$APP_DIR/deploy/pulse-app.service"    /etc/systemd/system/pulse-app.service
install -m 644 "$APP_DIR/deploy/pulse-worker.service" /etc/systemd/system/pulse-worker.service
install -m 644 "$APP_DIR/deploy/pulse-worker.timer"   /etc/systemd/system/pulse-worker.timer
systemctl daemon-reload
systemctl restart pulse-app.service
systemctl enable pulse-app.service pulse-worker.timer
systemctl restart pulse-worker.timer
info "pulse-app: $(systemctl is-active pulse-app.service)"
info "pulse-worker.timer: $(systemctl is-active pulse-worker.timer)"

# ---------- 10. Caddy ----------

step "Кладу Caddyfile и перезагружаю Caddy"
install -m 644 "$APP_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy
info "caddy: $(systemctl is-active caddy)"

# ---------- 11. Firewall ----------

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
echo "БД:"
echo "  psql \"${DATABASE_URL}\""
echo "  Пароль БД лежит в /root/.pulse-db-pass"
echo ""
echo "Логи:"
echo "  journalctl -u pulse-app.service -f"
echo "  journalctl -u pulse-worker.service --since '10 min ago'"
echo "  tail -f /var/log/caddy/pulse.log"
echo ""
echo "TLS-сертификат Caddy получит автоматически при первом заходе на https://${DOMAIN}"
