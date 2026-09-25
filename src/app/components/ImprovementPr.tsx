'use client';

// Блок «Предложить pull request» на странице анализа своего репозитория:
// что Pulse может добавить, зачем, с превью файлов — и кнопка, которая
// создаёт настоящий PR на SourceCraft.

import { useActionState } from 'react';
import Link from 'next/link';
import { createImprovementPrAction, type ImprovementPrState } from '@/app/actions/improvements';
import type { Improvement } from '@/lib/improvements/plan';
import { Button, CardDiv, Chip } from './ui';

const initial: ImprovementPrState = { ok: false };

export function ImprovementPr({
  analysisId,
  items,
  blocker,
  slug,
}: {
  analysisId: string;
  items: Improvement[];
  blocker: 'no_token' | 'token_invalid' | 'no_branch' | null;
  slug: string;
}) {
  const [state, formAction, pending] = useActionState(createImprovementPrAction, initial);

  if (state.ok) {
    return (
      <CardDiv tone="outline" className="flex flex-col gap-3">
        <div className="text-lg font-semibold">✓ Pull request создан</div>
        <p className="text-sm text-[color:var(--ink-2)]">
          {state.slug ? `PR №${state.slug}` : 'PR'} из ветки{' '}
          <code className="font-mono text-xs [overflow-wrap:anywhere]">{state.branch}</code> ждёт вашего ревью в{' '}
          {slug}. Посмотрите изменения и примите их в SourceCraft — после слияния нажмите «Оценить
          заново», и балл вырастет.
        </p>
        <ul className="text-sm text-[color:var(--ink-2)]">
          {(state.addedPaths ?? []).map((p) => (
            <li key={p}>
              + <code className="font-mono text-xs">{p}</code>
            </li>
          ))}
        </ul>
        {(state.skippedPaths ?? []).length > 0 && (
          <p className="text-xs text-[color:var(--muted)]">
            Уже появились в репозитории, не трогали: {(state.skippedPaths ?? []).join(', ')}
          </p>
        )}
        {state.repoUrl && (
          <a
            href={state.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="self-start rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
          >
            Открыть репозиторий в SourceCraft ↗
          </a>
        )}
      </CardDiv>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="analysisId" value={analysisId} />

      {items.map((item) => (
        <CardDiv key={item.key} tone="outline" className="p-4 sm:p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="item" value={item.key} defaultChecked className="mt-1 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-medium">{item.title}</span>
                {item.gain !== null && item.gain > 0 && <Chip tone="ink">+{item.gain} к оценке</Chip>}
              </span>
              <span className="mt-1 block text-sm text-[color:var(--ink-2)]">{item.why}</span>
              {item.note && (
                <span className="mt-1 block text-xs text-[color:var(--muted)]">⚠ {item.note}</span>
              )}
            </span>
          </label>
          {item.files.map((file) => (
            <details key={file.path} className="mt-3 pl-7">
              <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
                Показать <code className="font-mono">{file.path}</code>
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded-2xl bg-[color:var(--panel)] p-3 font-mono text-xs leading-relaxed text-[color:var(--ink-2)]">
                {file.content}
              </pre>
            </details>
          ))}
        </CardDiv>
      ))}

      {blocker === 'no_token' || blocker === 'token_invalid' ? (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {blocker === 'no_token'
            ? 'PR создаётся от вашего имени по личному токену SourceCraft. '
            : 'Сохранённый токен больше не действует. '}
          <Link href="/repos" className="underline underline-offset-4">
            Сохраните токен в «Моих репозиториях»
          </Link>{' '}
          — с правом создавать ветки (роль developer или выше).
        </p>
      ) : blocker === 'no_branch' ? (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          Не знаем основную ветку репозитория — оцените его заново.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} size="lg" className="self-start">
            {pending ? 'Создаём ветку и PR…' : 'Создать pull request на SourceCraft'}
          </Button>
          <p className="text-xs text-[color:var(--muted)]">
            Ничего не сливаем сами: появится ветка и PR в {slug}, решение за вами. Существующие файлы
            не изменяются.
          </p>
        </div>
      )}

      {state.error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
