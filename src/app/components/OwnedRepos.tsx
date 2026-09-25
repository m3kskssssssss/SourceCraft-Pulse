'use client';

// Клиентские кусочки вкладки «Мои репозитории»: форма добавления, кнопка
// проверки ключа и поля с кнопкой «Скопировать» (ключ, код бейджа).

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addOwnedRepoAction,
  claimTokenReposAction,
  scanTokenReposAction,
  verifyOwnedRepoAction,
  type RepoActionState,
  type TokenScanState,
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
 * Подтверждение личным токеном SourceCraft. Токен живёт только в этом поле:
 * на сервер он уходит с каждой из двух форм и там нигде не сохраняется.
 */
export function TokenImport() {
  const [token, setToken] = useState('');
  const [scan, scanAction, scanning] = useActionState(scanTokenReposAction, initialScan);
  const [claim, claimAction, claiming] = useActionState(claimTokenReposAction, initial);

  // Подтвердили — токен больше не нужен, в поле его не держим.
  useEffect(() => {
    if (claim.ok) setToken('');
  }, [claim]);

  const repos = scan.repos ?? [];
  const selectable = repos.filter((r) => r.owner && !r.added);

  return (
    <div className="flex flex-col gap-4">
      <form action={scanAction} className="flex flex-col gap-3">
        <Input
          type="password"
          name="token"
          required
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Личный токен SourceCraft (PAT)"
          aria-label="Личный токен SourceCraft"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="text"
            name="orgs"
            placeholder="Другие организации через запятую (необязательно)"
            className="sm:flex-1"
            aria-label="Другие организации"
          />
          <Button type="submit" disabled={scanning || !token} size="lg" className="sm:w-56">
            {scanning ? 'Ищем…' : 'Показать мои репозитории'}
          </Button>
        </div>
        {scan.error && <StateNote state={{ ok: false, error: scan.error }} />}
      </form>

      {scan.ok && (
        <form action={claimAction} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-[color:var(--ink-2)]">
            Токен принадлежит <b>{scan.user?.displayName ?? scan.user?.username ?? 'пользователю'}</b>
            {scan.user?.username && scan.user.displayName && ` (@${scan.user.username})`}.
            {repos.length > 0
              ? ' Подтвердить можно репозитории, где у вас роль admin или maintainer.'
              : ' Репозиториев не нашлось — укажите организации, в которых они лежат.'}
          </p>

          {repos.length > 0 && (
            <ul className="flex flex-col divide-y divide-[color:var(--line)] rounded-2xl border border-[color:var(--line)]">
              {repos.map((r) => {
                const slug = `${r.org}/${r.repo}`;
                const enabled = r.owner && !r.added;
                return (
                  <li key={slug}>
                    <label
                      className={
                        'flex items-start gap-3 px-4 py-3 text-sm ' +
                        (enabled ? 'cursor-pointer hover:bg-[color:var(--panel)]' : 'opacity-60')
                      }
                    >
                      <input
                        type="checkbox"
                        name="repo"
                        value={slug}
                        disabled={!enabled}
                        defaultChecked={enabled}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium [overflow-wrap:anywhere]">{slug}</span>
                        <span className="block text-xs text-[color:var(--muted)]">
                          {r.added
                            ? '✓ уже подтверждён'
                            : r.role
                              ? `роль: ${r.role}${r.owner ? '' : ' — нужна admin или maintainer'}`
                              : (r.note ?? 'роль не найдена')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {scan.notes && scan.notes.length > 0 && (
            <ul className="text-xs text-[color:var(--muted)]">
              {scan.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}

          {selectable.length > 0 && (
            <Button type="submit" disabled={claiming || !token} className="self-start">
              {claiming ? 'Подтверждаем…' : 'Подтвердить выбранные'}
            </Button>
          )}
          <StateNote state={claim} />
        </form>
      )}
    </div>
  );
}

const initialScan: TokenScanState = { ok: false };

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
