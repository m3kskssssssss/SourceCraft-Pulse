# Развёртывание Pulse на своём сервере

Стек: Ubuntu 22.04/24.04 + Node 22 + pnpm + Caddy (авто-TLS от Let's Encrypt) + systemd.
База — Neon Postgres (тот же URL, что использует Vercel). Локальный Postgres не нужен.

## Один шаг

На чистом сервере под `root`:

```bash
curl -fsSL https://raw.githubusercontent.com/m3kskssssssss/SourceCraft-Pulse/main/deploy/setup.sh -o /tmp/setup.sh
bash /tmp/setup.sh
```

Скрипт по очереди спросит секреты (`DATABASE_URL`, `SOURCECRAFT_PAT`, `AI_API_KEY`
и т.д.), затем всё поднимет сам:

1. Установит Node 22, pnpm, Caddy, git, build-tools.
2. Создаст пользователя `pulse` и склонирует репу в `/opt/pulse`.
3. Соберёт Next.js и накатит миграции Drizzle в Neon.
4. Развернёт `pulse-app.service` (Next.js на 3000) и `pulse-worker.timer`
   (запускает `pnpm worker` каждые 2 минуты).
5. Настроит Caddy: `source-craft-pulse.tech` → `127.0.0.1:3000` c авто-TLS.
6. Откроет 22/80/443 в ufw.

## Требования

- Домен указывает A-записью на IP сервера (нужно для TLS-сертификата).
- В сервере открыты 80 и 443.
- Neon-база уже создана, `DATABASE_URL` есть на руках.

## Обновление после git push

```bash
cd /opt/pulse
git pull
sudo -u pulse pnpm install --frozen-lockfile
sudo -u pulse pnpm build
sudo -u pulse pnpm db:migrate
systemctl restart pulse-app.service
```

## Диагностика

```bash
systemctl status pulse-app.service
systemctl status pulse-worker.timer
journalctl -u pulse-app.service -f
journalctl -u pulse-worker.service --since '30 min ago'
tail -f /var/log/caddy/pulse.log
```
