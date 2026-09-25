'use client';

// Клиентские кусочки вкладки «Мои репозитории»: синхронизация по токену,
// панель настроек, форма добавления по ключу, проверка ключа и поля с кнопкой
// «Скопировать» (ключ, код бейджа).

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addOwnedRepoAction,
  syncTokenReposAction,
  verifyOwnedRepoAction,
  type RepoActionState,
  type TokenSyncState,
} from '@/app/actions/repos';
import { Button, Input } from './ui';

const initial: RepoActionState = { ok: false };

export function AddOwnedRepoForm() {
  const [state, formAction, pending] = useActionState(addOwnedRepoAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          name="target"
          required
          placeholder="org/repo или https://sourcecraft.dev/org/repo"
          className="sm:flex-1"
          aria-label="Адрес репозитория"
        />
        <Button type="submit" disabled={pending} size="lg" className="sm:w-40">
          {pending ? 'Добавляем…' : 'Добавить'}
        </Button>
      </div>
      <StateNote state={state} />
    </form>
  );
}

export function VerifyOwnedRepo({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(verifyOwnedRepoAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'Проверяем…' : 'Проверить ключ'}
      </Button>
      <StateNote state={state} />
      {state.analysisId && (
        <Link
          href={`/a/${state.analysisId}`}
          className="text-sm underline underline-offset-4 hover:no-underline"
        >
          Смотреть первую оценку →
        </Link>
      )}
    </form>
  );
}

/**
 * Синхронизация по личному токену SourceCraft. Токен живёт только в этом поле
 * и уходит на сервер одним запросом; после успеха поле очищается.
 */
export function TokenSync() {
  const [token, setToken] = useState('');
  const [state, formAction, pending] = useActionState(syncTokenReposAction, initialSync);

  useEffect(() => {
    if (state.ok) setToken('');
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        type="password"
        name="token"
        required
        autoComplete="off"
        spellCheck={false}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Вставьте токен: pv1_…"
        aria-label="Личный токен SourceCraft"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          name="orgs"
          placeholder="Другие организации через запятую — необязательно"
          className="sm:flex-1"
          aria-label="Другие организации"
        />
        <Button type="submit" disabled={pending || !token} size="lg" className="sm:w-48">
          {pending ? 'Ищем репозитории…' : 'Синхронизировать'}
        </Button>
      </div>

      {state.error && <StateNote state={{ ok: false, error: state.error }} />}
      {state.ok && <SyncReport state={state} />}
    </form>
  );
}

const initialSync: TokenSyncState = { ok: false };

function SyncReport({ state }: { state: TokenSyncState }) {
  const who = state.user?.displayName ?? state.user?.username ?? 'пользователя';
  const added = state.added ?? [];
  const already = state.already ?? [];
  const skipped = state.skipped ?? [];
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
      <p>
        Токен {who}
        {state.user?.username && state.user.displayName && ` (@${state.user.username})`}.{' '}
        {added.length > 0
          ? `✓ Добавлено: ${added.length}. Первые оценки уже в очереди — карточки ниже.`
          : already.length > 0
            ? 'Новых репозиториев нет — всё уже в списке.'
            : 'Подходящих репозиториев не нашлось.'}
      </p>
      {skipped.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
            Пропущено: {skipped.length}
          </summary>
          <ul className="mt-1 space-y-0.5 text-xs text-[color:var(--muted)]">
            {skipped.map((s) => (
              <li key={s.slug} className="[overflow-wrap:anywhere]">
                {s.slug} — {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      {(state.notes ?? []).map((note) => (
        <p key={note} className="text-xs text-[color:var(--muted)]">
          {note}
        </p>
      ))}
    </div>
  );
}

/**
 * Шапка страницы с кнопкой «Изменить настройки» и сама панель настроек под
 * ней. Шапку и содержимое панели рисует сервер — здесь только раскрытие.
 */
export function RepoSettings({
  header,
  defaultOpen,
  children,
}: {
  header: React.ReactNode;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">{header}</div>
        <Button
          type="button"
          variant={open ? 'secondary' : 'ghost'}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start sm:self-auto"
        >
          <GearIcon />
          {open ? 'Скрыть настройки' : 'Изменить настройки'}
        </Button>
      </div>
      {open && <div className="rise mt-6 flex flex-col gap-4">{children}</div>}
    </>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

function StateNote({ state }: { state: RepoActionState }) {
  const text = state.error ?? state.message;
  if (!text) return null;
  return (
    <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
      {state.error ? text : `✓ ${text}`}
    </p>
  );
}

/** Строка с моноширинным текстом и кнопкой копирования. */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <code
        aria-label={label}
        className="flex-1 overflow-x-auto break-all rounded-2xl bg-[color:var(--panel)] px-4 py-3 font-mono text-xs text-[color:var(--ink-2)]"
      >
        {value || 'Готовим…'}
      </code>
      <button
        type="button"
        onClick={async () => {
          if (!value) return;
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // ignore
          }
        }}
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-xs font-medium hover:bg-[color:var(--panel)] sm:min-w-[128px]"
      >
        {copied ? '✓ Скопировано' : 'Скопировать'}
      </button>
    </div>
  );
}

/**
 * Код карточки для README. Адрес сайта берём со страницы, как и BadgeMarkdown:
 * за прокси сервер не всегда знает свой внешний origin.
 */
export function CardBadgeMarkdown({ org, repo }: { org: string; repo: string }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const src = origin && `${origin}/api/card/${org}/${repo}.svg`;
  const markdown = src && `[![Pulse](${src})](${origin}/r/${org}/${repo})`;

  return (
    <div className="flex flex-col gap-3">
      {src && (
        // Сам SVG из нашего же маршрута: next/image тут только мешал бы.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Pulse: ${org}/${repo}`} width={440} height={132} className="max-w-full" />
      )}
      <CopyField value={markdown} label="Markdown карточки" />
    </div>
  );
}
