# Развёртывание Pulse через Docker Compose

Стек в контейнерах: Postgres 16, приложение Next.js, воркер очереди, Caddy
с автоматическим TLS от Let's Encrypt. Всё поднимается одной командой.

## Один шаг

На чистом Ubuntu 22.04/24.04 под `root`:

```bash
curl -fsSL https://raw.githubusercontent.com/m3kskssssssss/SourceCraft-Pulse/main/deploy/setup.sh -o /tmp/setup.sh
bash /tmp/setup.sh
```

Скрипт поставит Docker, склонирует репу в `/opt/pulse`, спросит недостающие
секреты, соберёт `.env`, поднимет контейнеры.

Спрашивает:
- `SOURCECRAFT_PAT` (скрыто)
- `AI_BASE_URL` — Enter (по умолчанию `https://routerai.ru/api/v1`)
- `AI_API_KEY` (скрыто)
- `AI_MODEL` — Enter (по умолчанию `openai/gpt-6-luna-pro`)
- `AI_MONTHLY_BUDGET_RUB` — Enter (500)
- `ADMIN_LOGIN` — Enter (`admin`)
- Пароль админа (скрыто, ≥ 20 символов)

`DB_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET` — сгенерирует сам.

## Требования

- Домен указывает A-записью на IP сервера (Caddy получит TLS-сертификат сам).
- Открыты 22/80/443 (ufw откроет).

## Ручной запуск

Если хочется без setup.sh:

```bash
git clone https://github.com/m3kskssssssss/SourceCraft-Pulse.git /opt/pulse
cd /opt/pulse
cp deploy/env.example .env
$EDITOR .env               # заполнить секреты
docker compose up -d --build
```

## Обновление

```bash
cd /opt/pulse
git pull
docker compose up -d --build
```

Или снова запустить `setup.sh` — идемпотентен.

## Логи и диагностика

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f worker
docker compose logs -f caddy
docker compose exec postgres psql -U pulse pulse
```

## Остановить / удалить

```bash
docker compose down            # остановить, оставить данные
docker compose down -v         # + удалить volume postgres (снесёт БД)
```
