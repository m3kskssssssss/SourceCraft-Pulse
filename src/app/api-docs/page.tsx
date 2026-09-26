// Документация публичного API: что можно получить без браузера и как.
// Адрес сайта в примерах берём из запроса, чтобы команды копировались как есть.

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { CardDiv } from '../components/ui';

export const metadata: Metadata = {
  title: 'Публичный API — Pulse',
  description: 'Оценка репозиториев SourceCraft по HTTP: отчёт в JSON и Markdown, запуск оценки, рейтинг, бейдж.',
};

type Endpoint = {
  method: 'GET' | 'POST';
  path: string;
  what: string;
  curl: (origin: string) => string;
  notes?: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/public/analyze',
    what: 'Оценить публичный репозиторий. Ответ — полный отчёт в JSON.',
    curl: (o) =>
      `curl -X POST ${o}/api/public/analyze \\\n  -H 'content-type: application/json' \\\n  -d '{"repo":"ilugly/unit-converter"}'`,
    notes:
      'Оценка идёт прямо в запросе — обычно полминуты–минуту. Отчёт моложе 12 часов отдаётся сразу (cached: true); ?force=1 — пересчитать. Если репозиторий уже считается — 202 и statusUrl. Новых прогонов с одного адреса — не больше 5 в час. Поле repo принимает и org/repo, и ссылку на репозиторий.',
  },
  {
    method: 'GET',
    path: '/api/public/repos/{org}/{repo}/report',
    what: 'Полный отчёт последней опубликованной оценки: категории, метрики, штрафы, рекомендации, пробелы.',
    curl: (o) => `curl ${o}/api/public/repos/ilugly/unit-converter/report`,
    notes: '?format=md — тот же отчёт Markdown-документом.',
  },
  {
    method: 'GET',
    path: '/api/public/repos/{org}/{repo}',
    what: 'Короткая сводка: балл и баллы категорий.',
    curl: (o) => `curl ${o}/api/public/repos/ilugly/unit-converter`,
  },
  {
    method: 'GET',
    path: '/api/analyses/{id}/status',
    what: 'Статус оценки по её id: queued, running, done или failed, и текущая фаза.',
    curl: (o) => `curl ${o}/api/analyses/<id>/status`,
  },
  {
    method: 'GET',
    path: '/api/public/leaderboard',
    what: 'Рейтинг опубликованных репозиториев.',
    curl: (o) => `curl "${o}/api/public/leaderboard?sort=score&lang=TypeScript&limit=10"`,
    notes: 'Параметры: sort=score|forks, q — поиск по имени, lang — языки через запятую, limit до 100, offset.',
  },
  {
    method: 'GET',
    path: '/api/badge/{org}/{repo}.svg',
    what: 'SVG-бейдж с баллом для README.',
    curl: (o) => `curl ${o}/api/badge/ilugly/unit-converter.svg`,
  },
];

export default async function ApiDocsPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <section className="pt-10 pb-8 sm:pt-16">
        <h1 className="rise text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Публичный API</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-2)]">
          Всё, что показывают страницы рейтинга и анализа, доступно и программе — без ключа и регистрации:
          для скриптов, CI и своих дашбордов. Ответы — JSON; ошибки — поле <code>error</code> с понятным
          кодом HTTP. Отдаются только публичные данные: личная часть оценки владельца (AppSec, прогоны CI)
          через API не выходит.
        </p>
      </section>

      <div className="grid gap-4">
        {ENDPOINTS.map((e) => (
          <CardDiv key={`${e.method} ${e.path}`} tone="outline">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded-md bg-[color:var(--panel)] px-2 py-0.5 font-mono text-xs font-semibold">
                {e.method}
              </span>
              <code className="break-all font-mono text-sm">{e.path}</code>
            </div>
            <p className="mt-2 text-sm text-[color:var(--ink-2)]">{e.what}</p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-[color:var(--panel)] p-3 font-mono text-xs leading-relaxed">
              {e.curl(origin)}
            </pre>
            {e.notes && <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted)]">{e.notes}</p>}
          </CardDiv>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">Ограничения</h2>
        <ul className="mt-4 grid gap-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
          <li>Чтение — до 60 запросов в минуту с одного адреса; дальше 429 и заголовок Retry-After.</li>
          <li>Через API оцениваются только публичные репозитории. Приватные — в «Моих репозиториях» по вашему токену.</li>
          <li>
            Как считается балл — на странице{' '}
            <Link href="/methodology" className="underline">
              методики
            </Link>
            .
          </li>
        </ul>
      </section>
    </main>
  );
}
