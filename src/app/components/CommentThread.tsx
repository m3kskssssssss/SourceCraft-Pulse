'use client';

// Обсуждение под анализом: форма сверху, ветки снизу, ответ одним уровнем.
//
// Глубже одного уровня не уходим сознательно: в ленте на полтора экрана
// лесенка из отступов читается хуже, чем плоский список ответов с указанием,
// кому отвечают.

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { addCommentAction, deleteCommentAction, type SocialState } from '@/app/actions/social';
import type { CommentNode } from '@/lib/social';
import type { PublicUser } from '@/lib/user-display';
import { Avatar } from './Avatar';
import { Button, EmptyState } from './ui';

const INITIAL: SocialState = { ok: true };

export function CommentThread({
  analysisId,
  comments,
  viewer,
  total,
}: {
  analysisId: string;
  comments: CommentNode[];
  viewer: PublicUser | null;
  total: number;
}) {
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Обсуждение</h2>
        <span className="text-sm text-[color:var(--muted)]">
          {total > 0 ? `${total} ${pluralComments(total)}` : 'пока пусто'}
        </span>
      </div>

      {viewer ? (
        <CommentForm
          analysisId={analysisId}
          viewer={viewer}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSent={() => setReplyTo(null)}
        />
      ) : (
        <p className="mt-5 rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          <Link href="/signin" className="underline underline-offset-4 hover:no-underline">
            Войдите
          </Link>
          , чтобы оставить комментарий.
        </p>
      )}

      {comments.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Обсуждения ещё нет"
          hint="Первый комментарий об этом репозитории может быть вашим."
        />
      ) : (
        <ol className="mt-8 grid gap-6">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Comment
                comment={comment}
                viewer={viewer}
                onReply={(name) => setReplyTo({ id: comment.id, name })}
              />
              {comment.replies.length > 0 && (
                <ol className="mt-4 grid gap-4 border-l border-[color:var(--line)] pl-4 sm:pl-6">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <Comment
                        comment={reply}
                        viewer={viewer}
                        onReply={(name) => setReplyTo({ id: comment.id, name })}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CommentForm({
  analysisId,
  viewer,
  replyTo,
  onCancelReply,
  onSent,
}: {
  analysisId: string;
  viewer: PublicUser;
  replyTo: { id: string; name: string } | null;
  onCancelReply: () => void;
  onSent: () => void;
}) {
  const [state, formAction, pending] = useActionState(addCommentAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Отправилось — чистим поле. Не отправилось — текст остаётся на месте:
  // потерять набранное из-за чужой ошибки обиднее всего.
  useEffect(() => {
    if (state.ok && !state.error) {
      formRef.current?.reset();
      onSent();
    }
    // onSent намеренно не в зависимостях: он пересоздаётся на каждый рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (replyTo) areaRef.current?.focus();
  }, [replyTo]);

  return (
    <form ref={formRef} action={formAction} className="mt-5 flex gap-3">
      <Avatar user={viewer} size={36} className="mt-1" />
      <div className="min-w-0 flex-1">
        <input type="hidden" name="analysisId" value={analysisId} />
        {replyTo && <input type="hidden" name="parentId" value={replyTo.id} />}

        {replyTo && (
          <div className="mb-2 flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <span>Ответ для {replyTo.name}</span>
            <button
              type="button"
              onClick={onCancelReply}
              className="underline underline-offset-4 hover:no-underline"
            >
              отменить
            </button>
          </div>
        )}

        <textarea
          ref={areaRef}
          name="body"
          rows={3}
          maxLength={4000}
          required
          placeholder={replyTo ? 'Ваш ответ' : 'Что думаете об этом репозитории?'}
          className="w-full resize-y rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-[15px] outline-none transition placeholder:text-[color:var(--muted-2)] focus:ring-2 focus:ring-[color:var(--ink)]"
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Отправляем…' : replyTo ? 'Ответить' : 'Отправить'}
          </Button>
          {state.error && <span className="text-sm text-[color:var(--ink)]">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}

function Comment({
  comment,
  viewer,
  onReply,
}: {
  comment: CommentNode;
  viewer: PublicUser | null;
  onReply: (name: string) => void;
}) {
  if (comment.deleted) {
    return (
      <div className="flex gap-3 text-sm text-[color:var(--muted-2)]">
        <Avatar user={null} size={32} />
        <span className="pt-2">Комментарий удалён.</span>
      </div>
    );
  }

  const isMine = Boolean(viewer && comment.author && viewer.id === comment.author.id);

  return (
    <div className="flex gap-3">
      <Avatar user={comment.author} size={32} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          {comment.author ? (
            <Link
              href={`/u/${comment.author.id}`}
              className="text-[15px] font-medium tracking-tight hover:underline"
            >
              {comment.author.displayName}
            </Link>
          ) : (
            <span className="text-[15px] font-medium tracking-tight">Удалённый пользователь</span>
          )}
          <span className="text-xs text-[color:var(--muted-2)]">
            {formatDateTime(comment.createdAt)}
            {comment.editedAt && ' · изменён'}
          </span>
        </div>

        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--ink-2)]">
          {comment.body}
        </p>

        <div className="mt-2 flex items-center gap-4 text-xs text-[color:var(--muted)]">
          {viewer && (
            <button
              type="button"
              onClick={() => onReply(comment.author?.displayName ?? 'автора')}
              className="transition hover:text-[color:var(--ink)]"
            >
              Ответить
            </button>
          )}
          {isMine && (
            <form action={deleteCommentAction}>
              <input type="hidden" name="commentId" value={comment.id} />
              <button type="submit" className="transition hover:text-[color:var(--ink)]">
                Удалить
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pluralComments(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'комментарий';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'комментария';
  return 'комментариев';
}
