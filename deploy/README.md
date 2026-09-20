# Развёртывание Pulse на своём сервере

Стек: Ubuntu 22.04/24.04 + Node 22 + pnpm + Postgres 16 (локально) + Caddy
(авто-TLS от Let's Encrypt) + systemd. Vercel/Neon не участвуют.

## Один шаг

На чистом сервере под `root`:

```bash
curl -fsSL https://raw.githubusercontent.com/m3kskssssssss/SourceCraft-Pulse/main/deploy/setup.sh -o /tmp/setup.sh
bash /tmp/setup.sh
```

Скрипт по очереди спросит секреты (`SOURCECRAFT_PAT`, `AI_API_KEY` и т.д.),
затем всё поднимет сам:

1. Установит Node 22, pnpm, Caddy, Postgres, git, build-tools.
2. Создаст роль и БД в Postgres, сгенерирует и сохранит пароль в `/root/.pulse-db-pass`.
3. Создаст пользователя `pulse` и склонирует репу в `/opt/pulse`.
4. Соберёт Next.js и накатит миграции Drizzle.
5. Развернёт `pulse-app.service` (Next.js на 3000) и `pulse-worker.timer`
   (запускает `pnpm worker` каждые 2 минуты).
6. Настроит Caddy: `source-craft-pulse.tech` → `127.0.0.1:3000` с авто-TLS.
7. Откроет 22/80/443 в ufw.

## Требования

- Домен должен указывать A-записью на IP сервера (нужно для TLS-сертификата).
- В сервере открыты 80 и 443.

## Обновление после git push

```bash
cd /opt/pulse
sudo -u pulse git pull
sudo -u pulse pnpm install --frozen-lockfile
sudo -u pulse pnpm build
sudo -u pulse pnpm db:migrate
systemctl restart pulse-app.service
```

Или проще — запусти `setup.sh` ещё раз, он идемпотентен.

## Диагностика

```bash
systemctl status pulse-app.service
systemctl status pulse-worker.timer
journalctl -u pulse-app.service -f
journalctl -u pulse-worker.service --since '30 min ago'
tail -f /var/log/caddy/pulse.log
psql "$(grep DATABASE_URL /opt/pulse/.env | cut -d= -f2- | tr -d '\"')"
```
