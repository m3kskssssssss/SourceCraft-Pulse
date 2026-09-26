'use client';

// Блок «Предложить pull request» на странице анализа своего репозитория.
//
// Ход дела:
//   1) «Подготовить изменения» — сервер скачивает репозиторий, модель готовит
//      правки документации и кода, Pulse проверяет их и считает дифф;
//   2) две вкладки — «Документация» и «Код»: у каждого пункта галочка и
//      раскрывающийся дифф, сверху — сколько примерно баллов добавят
//      отмеченные правки (пересчитывается на каждой галочке);
//   3) «Создать pull request» — ветка и PR на SourceCraft от имени владельца;
//   4) вопрос «PR приняли?»: да — репозиторий уходит на переоценку.

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  answerPrMergedAction,
  createImprovementPrAction,
  type ImprovementPrState,
} from '@/app/actions/improvements';
import type { DiffLine } from '@/lib/improvements/edits';
import {
  PROPOSAL_STAGES,
  summarizeGains,
  type ProposalItem,
  type ProposalNotes,
  type ProposalSection,
} from '@/lib/improvements/proposal';
import { Button, CardDiv, Chip, cx } from './ui';

/** Пункт без содержимого файла: в браузер уходит только дифф. */
export type ProposalItemView = Omit<ProposalItem, 'content'>;

export type ProposalView = {
  id: string;
  status: 'preparing' | 'ready' | 'failed' | 'submitted';
  stage: string | null;
  startedAt: string;
  error: string | null;
  items: ProposalItemView[];
  notes: ProposalNotes | null;
  prBranch: string | null;
  prSlug: string | null;
  applied: string[];
  skipped: Array<{ path: string; reason: string }>;
  mergedAnswer: 'yes' | 'no' | null;
  reevaluationId: string | null;
};

type Blocker = 'no_token' | 'token_invalid' | 'no_branch' | null;

export function ImprovementPr({
  analysisId,
  slug,
  repoUrl,
  blocker,
  isPrivate,
  proposal,
  prStatus,
}: {
  analysisId: string;
  slug: string;
  repoUrl: string | null;
  blocker: Blocker;
  isPrivate: boolean;
  proposal: ProposalView | null;
  /** Статус PR по данным SourceCraft; null — не узнали. */
  prStatus: string | null;
}) {
  if (blocker) return <BlockerNote blocker={blocker} />;

  if (proposal?.status === 'preparing') {
    return <Preparing analysisId={analysisId} startedAt={proposal.startedAt} initialStage={proposal.stage} launch={false} />;
  }
  if (proposal?.status === 'ready') {
    return <Studio analysisId={analysisId} slug={slug} proposal={proposal} />;
  }
  if (proposal?.status === 'submitted' && proposal.mergedAnswer !== 'no') {
    return <Submitted analysisId={analysisId} slug={slug} repoUrl={repoUrl} proposal={proposal} prStatus={prStatus} />;
  }
  return (
    <Intro
      analysisId={analysisId}
      isPrivate={isPrivate}
      failed={proposal?.status === 'failed' ? (proposal.error ?? 'неизвестная ошибка') : null}
      declined={proposal?.mergedAnswer === 'no'}
    />
  );
}

// ---------- Старт ----------

function Intro({
  analysisId,
  isPrivate,
  failed,
  declined,
}: {
  analysisId: string;
  isPrivate: boolean;
  failed: string | null;
  declined: boolean;
}) {
  const [started, setStarted] = useState(false);
  if (started) {
    return <Preparing analysisId={analysisId} startedAt={new Date().toISOString()} initialStage="clone" launch />;
  }
  return (
    <CardDiv tone="outline" className="flex flex-col gap-4">
      {declined && (
        <p className="text-sm text-[color:var(--ink-2)]">
          Прошлый PR не приняли — можно подготовить новый набор правок.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <SectionTeaser
          title="Документация"
          text="README дополним или напишем по данным репозитория, добавим LICENSE, CONTRIBUTING и другие недостающие файлы."
        />
        <SectionTeaser
          title="Код"
          text={
            isPrivate
              ? 'Приватный код во внешнюю модель не отправляем — только .gitignore и .editorconfig.'
              : 'Модель прочитает файлы, которые смотрел ревьюер, и предложит точечные исправления по его находкам.'
          }
        />
      </div>
      <p className="text-xs text-[color:var(--muted)]">
        Займёт 1–3 минуты. Ничего не отправляется, пока вы не посмотрите каждую правку и не нажмёте
        «Создать pull request».
      </p>
      <Button size="lg" className="self-start" onClick={() => setStarted(true)}>
        Подготовить изменения
      </Button>
      {failed && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          Прошлая попытка не удалась: {failed}
        </p>
      )}
    </CardDiv>
  );
}

function SectionTeaser({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--panel)] p-4">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-sm text-[color:var(--ink-2)]">{text}</p>
    </div>
  );
}

// ---------- Подготовка ----------

const POLL_MS = 2_500;

function Preparing({
  analysisId,
  startedAt,
  initialStage,
  launch,
}: {
  analysisId: string;
  startedAt: string;
  initialStage: string | null;
  /** Запустить подготовку (кнопка) или только следить (подготовка уже идёт). */
  launch: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<string | null>(initialStage);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!launch) return;
    fetch(`/api/improvements/${analysisId}`, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error === 'no_token' ? 'нужен токен SourceCraft' : `сервер ответил ${res.status}`);
          return;
        }
        finish();
      })
      // Обрыв соединения не значит, что подготовка встала: опрос её дождётся.
      .catch(() => undefined);
  }, [analysisId, launch, finish]);

  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000))), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/improvements/${analysisId}`, { cache: 'no-store' });
        const body = (await res.json()) as { status?: string; stage?: string | null };
        if (body.stage) setStage(body.stage);
        if (body.status && body.status !== 'preparing' && body.status !== 'none') finish();
      } catch {
        // Сеть мигнула — спросим в следующий раз.
      }
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [analysisId, startedAt, finish]);

  const current = PROPOSAL_STAGES.findIndex((s) => s.key === stage);
  return (
    <CardDiv tone="outline" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-base font-semibold">Готовим изменения…</div>
        <div className="font-mono text-xs tabular-nums text-[color:var(--muted)]">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {PROPOSAL_STAGES.map((s, i) => (
          <li
            key={s.key}
            className={cx(
              'flex items-center gap-3 text-sm transition',
              i < current && 'text-[color:var(--muted)]',
              i === current && 'font-medium text-[color:var(--ink)]',
              i > current && 'text-[color:var(--muted)] opacity-60',
            )}
          >
            <span className="w-4 text-center">{i < current ? '✓' : i === current ? <Spinner /> : '·'}</span>
            {s.label}
          </li>
        ))}
      </ol>
      <p className="text-xs text-[color:var(--muted)]">
        Можно уйти со страницы — подготовка продолжится, результат будет здесь.
      </p>
      {error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          Не получилось начать: {error}
        </p>
      )}
    </CardDiv>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--ink)]" />
  );
}

// ---------- Выбор правок ----------

const SECTION_TITLES: Record<ProposalSection, string> = { docs: 'Документация', code: 'Код' };

function Studio({ analysisId, slug, proposal }: { analysisId: string; slug: string; proposal: ProposalView }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ImprovementPrState, FormData>(createImprovementPrAction, {
    ok: false,
  });
  const [tab, setTab] = useState<ProposalSection>(() =>
    proposal.items.some((i) => i.section === 'docs') || !proposal.items.some((i) => i.section === 'code')
      ? 'docs'
      : 'code',
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposal.items.map((i) => i.id)));
  const [restart, setRestart] = useState(false);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const gains = useMemo(
    () =>
      summarizeGains(
        proposal.items as ProposalItem[],
        selected,
        proposal.notes?.caps ?? { docs: 100, code: 100, total: 100 },
      ),
    [proposal.items, proposal.notes, selected],
  );
  const bySection = (section: ProposalSection) => proposal.items.filter((i) => i.section === section);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setAll = (section: ProposalSection, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of bySection(section)) {
        if (on) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });

  if (restart) {
    return <Preparing analysisId={analysisId} startedAt={new Date().toISOString()} initialStage="clone" launch />;
  }

  if (proposal.items.length === 0) {
    return (
      <CardDiv tone="outline" className="flex flex-col gap-3">
        <div className="text-base font-semibold">Предложить нечего</div>
        <p className="text-sm text-[color:var(--ink-2)]">
          Все базовые файлы на месте, а модель не нашла правок, в которых была бы уверена.
        </p>
        <SectionNotes notes={proposal.notes} />
        <Button variant="ghost" className="self-start" onClick={() => setRestart(true)}>
          Подготовить заново
        </Button>
      </CardDiv>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="proposalId" value={proposal.id} />

      {/* Сколько примерно добавят отмеченные правки. */}
      <CardDiv tone="outline" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tabular-nums">≈ +{fmt(gains.total)}</span>
          <span className="text-sm text-[color:var(--muted)]">к оценке, если слить всё отмеченное</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <GainBox title="За документацию" value={gains.docs} accent="var(--accent-docs)" />
          <GainBox title="За код" value={gains.code} accent="var(--accent-code)" />
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          Оценка примерная: её считают модель и движок Pulse по прошлому анализу. Точный балл покажет
          переоценка после слияния.
        </p>
      </CardDiv>

      <div role="tablist" className="flex gap-2">
        {(['docs', 'code'] as const).map((section) => {
          const list = bySection(section);
          const chosen = list.filter((i) => selected.has(i.id)).length;
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={tab === section}
              onClick={() => setTab(section)}
              className={cx(
                'flex-1 rounded-2xl border px-4 py-3 text-left transition sm:flex-none sm:min-w-52',
                tab === section
                  ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]'
                  : 'border-[color:var(--line)] hover:bg-[color:var(--panel)]',
              )}
            >
              <div className="text-sm font-semibold">{SECTION_TITLES[section]}</div>
              <div className={cx('text-xs', tab === section ? 'opacity-80' : 'text-[color:var(--muted)]')}>
                {list.length === 0 ? 'нет правок' : `выбрано ${chosen} из ${list.length} · ≈ +${fmt(section === 'docs' ? gains.docs : gains.code)}`}
              </div>
            </button>
          );
        })}
      </div>

      {(['docs', 'code'] as const).map((section) => {
        const list = bySection(section);
        const note = proposal.notes?.[section] ?? null;
        return (
          // Скрытая вкладка остаётся в форме: её галочки тоже уходят в PR.
          <div key={section} role="tabpanel" hidden={tab !== section} className="flex flex-col gap-3">
            {note && (
              <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">{note}</p>
            )}
            {list.length > 1 && (
              <div className="flex gap-3 text-xs">
                <button type="button" className="underline underline-offset-4" onClick={() => setAll(section, true)}>
                  Отметить все
                </button>
                <button type="button" className="underline underline-offset-4" onClick={() => setAll(section, false)}>
                  Снять все
                </button>
              </div>
            )}
            {list.length === 0 && !note && (
              <p className="text-sm text-[color:var(--muted)]">В этом разделе предложить нечего.</p>
            )}
            {list.map((item) => (
              <ItemCard key={item.id} item={item} checked={selected.has(item.id)} onToggle={() => toggle(item.id)} />
            ))}
            {section === 'code' && list.some((i) => i.source === 'ai') && (
              <p className="text-xs text-[color:var(--muted)]">
                ⚠ Правки кода подготовлены моделью и не проверялись запуском. Прогоните сборку и тесты
                в ветке PR перед слиянием.
              </p>
            )}
          </div>
        );
      })}

      {(proposal.notes?.rejected.length ?? 0) > 0 && (
        <details className="text-xs text-[color:var(--muted)]">
          <summary className="cursor-pointer">
            Не прошли проверку и в список не вошли: {proposal.notes!.rejected.length}
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-4">
            {proposal.notes!.rejected.map((r, i) => (
              <li key={i}>
                <code className="font-mono">{r.path}</code> — {r.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={pending || selected.size === 0}>
            {pending ? 'Создаём ветку и PR…' : `Создать pull request · ${selected.size}`}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setRestart(true)}>
            Подготовить заново
          </Button>
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          Ничего не сливаем сами: появится ветка и PR в {slug}, решение за вами. Если файл успел
          измениться после подготовки, его правку пропустим.
        </p>
      </div>

      {state.error && (
        <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">{state.error}</p>
      )}
    </form>
  );
}

function GainBox({ title, value, accent }: { title: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--panel)] p-3 sm:p-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-xs text-[color:var(--muted)]">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">≈ +{fmt(value)}</div>
    </div>
  );
}

function ItemCard({ item, checked, onToggle }: { item: ProposalItemView; checked: boolean; onToggle: () => void }) {
  return (
    <CardDiv tone="outline" className={cx('p-4 transition sm:p-5', !checked && 'opacity-60')}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="item"
          value={item.id}
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium">{item.title}</span>
            {item.gain !== null && item.gain > 0 && <Chip tone="ink">≈ +{fmt(item.gain)}</Chip>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--muted)]">
            <code className="font-mono [overflow-wrap:anywhere]">{item.path}</code>
            <span>·</span>
            <span>{item.action === 'create' ? 'новый файл' : 'изменение'}</span>
            <span>·</span>
            <span>{item.source === 'ai' ? 'подготовлено ИИ' : 'шаблон Pulse'}</span>
          </span>
          <span className="mt-2 block text-sm text-[color:var(--ink-2)]">{item.why}</span>
          {item.note && <span className="mt-1 block text-xs text-[color:var(--muted)]">⚠ {item.note}</span>}
        </span>
      </label>
      <details className="mt-3 pl-7">
        <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
          Подробности изменений ·{' '}
          <span className="text-[color:var(--accent-security)]">+{item.diff.added}</span>{' '}
          <span className="text-[color:var(--accent-activity)]">−{item.diff.removed}</span>
        </summary>
        <DiffView lines={item.diff.lines} truncated={item.diff.truncated} />
      </details>
    </CardDiv>
  );
}

function DiffView({ lines, truncated }: { lines: DiffLine[]; truncated: boolean }) {
  return (
    <div className="mt-2 max-h-96 overflow-auto rounded-2xl bg-[color:var(--panel)] py-2 font-mono text-xs leading-relaxed">
      {lines.map((line, i) =>
        line.t === 'gap' ? (
          <div key={i} className="px-3 py-1 text-[color:var(--muted)]">
            ··· {line.skipped} строк без изменений
          </div>
        ) : (
          <div
            key={i}
            className={cx(
              'whitespace-pre px-3',
              line.t === 'add' && 'bg-[color-mix(in_srgb,var(--accent-security)_14%,transparent)]',
              line.t === 'del' &&
                'bg-[color-mix(in_srgb,var(--accent-activity)_14%,transparent)] text-[color:var(--muted)]',
              line.t === 'ctx' && 'text-[color:var(--ink-2)]',
            )}
          >
            <span className="mr-2 select-none opacity-60">{line.t === 'add' ? '+' : line.t === 'del' ? '−' : ' '}</span>
            {line.text || ' '}
          </div>
        ),
      )}
      {truncated && <div className="px-3 py-1 text-[color:var(--muted)]">… дифф обрезан для превью</div>}
    </div>
  );
}

function SectionNotes({ notes }: { notes: ProposalNotes | null }) {
  const list = [notes?.docs, notes?.code].filter((n): n is string => Boolean(n));
  if (list.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-xs text-[color:var(--muted)]">
      {Array.from(new Set(list)).map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

// ---------- После PR ----------

const PR_STATUS_TEXT: Record<string, string> = {
  merged: 'по данным SourceCraft PR уже слит ✓',
  merging: 'SourceCraft сейчас сливает PR',
  open: 'по данным SourceCraft PR ещё открыт',
  draft: 'по данным SourceCraft PR — черновик',
  discarded: 'по данным SourceCraft PR закрыт без слияния',
};

function Submitted({
  analysisId,
  slug,
  repoUrl,
  proposal,
  prStatus,
}: {
  analysisId: string;
  slug: string;
  repoUrl: string | null;
  proposal: ProposalView;
  prStatus: string | null;
}) {
  const applied = proposal.items.filter((i) => proposal.applied.includes(i.id));
  return (
    <CardDiv tone="outline" className="flex flex-col gap-4">
      <div className="text-lg font-semibold">✓ Pull request создан</div>
      <p className="text-sm text-[color:var(--ink-2)]">
        {proposal.prSlug ? `PR №${proposal.prSlug}` : 'PR'} из ветки{' '}
        <code className="font-mono text-xs [overflow-wrap:anywhere]">{proposal.prBranch}</code> ждёт вашего
        ревью в {slug}.
      </p>
      <ul className="flex flex-col gap-1 text-sm text-[color:var(--ink-2)]">
        {applied.map((item) => (
          <li key={item.id} className="[overflow-wrap:anywhere]">
            {item.action === 'create' ? '+' : '~'} <code className="font-mono text-xs">{item.path}</code> —{' '}
            {item.title}
          </li>
        ))}
      </ul>
      {proposal.skipped.length > 0 && (
        <p className="text-xs text-[color:var(--muted)]">
          Не вошли: {proposal.skipped.map((s) => `${s.path} (${s.reason})`).join(', ')}
        </p>
      )}
      {repoUrl && (
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="self-start rounded-full border border-[color:var(--line)] px-4 py-2 text-sm transition hover:bg-[color:var(--panel)]"
        >
          Открыть репозиторий в SourceCraft ↗
        </a>
      )}

      {proposal.mergedAnswer === 'yes' ? (
        <div className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          Отправили репозиторий на переоценку.{' '}
          <Link href="/repos" className="underline underline-offset-4">
            Статус — в «Моих репозиториях»
          </Link>
          {proposal.reevaluationId && (
            <>
              {' · '}
              <Link href={`/a/${proposal.reevaluationId}`} className="underline underline-offset-4">
                новая оценка
              </Link>
            </>
          )}
        </div>
      ) : (
        <form action={answerPrMergedAction} className="flex flex-col gap-3 border-t border-[color:var(--line)] pt-4">
          <input type="hidden" name="analysisId" value={analysisId} />
          <input type="hidden" name="proposalId" value={proposal.id} />
          <div>
            <div className="text-base font-semibold">Pull request приняли?</div>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Если слили — отправим репозиторий на переоценку, и новый балл появится в «Моих
              репозиториях».
              {prStatus && PR_STATUS_TEXT[prStatus] && <> Сейчас {PR_STATUS_TEXT[prStatus]}.</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="answer" value="yes">
              Да, приняли — переоценить
            </Button>
            <Button type="submit" name="answer" value="no" variant="ghost">
              Нет, отклонили
            </Button>
          </div>
        </form>
      )}
    </CardDiv>
  );
}

function BlockerNote({ blocker }: { blocker: Exclude<Blocker, null> }) {
  return (
    <p className="rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
      {blocker === 'no_branch' ? (
        'Не знаем основную ветку репозитория — оцените его заново.'
      ) : (
        <>
          {blocker === 'no_token'
            ? 'Правки готовятся и PR создаётся от вашего имени по личному токену SourceCraft. '
            : 'Сохранённый токен больше не действует. '}
          <Link href="/repos" className="underline underline-offset-4">
            Сохраните токен в «Моих репозиториях»
          </Link>{' '}
          — с правом создавать ветки (роль developer или выше).
        </>
      )}
    </p>
  );
}

function fmt(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}
