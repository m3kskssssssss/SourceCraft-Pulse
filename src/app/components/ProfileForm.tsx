'use client';

// Настройки профиля: три независимые формы — кто я, фото, пароль.
//
// Разделены сознательно: смена пароля не должна зависеть от того, заполнено
// ли «о себе», а загрузка фото — ждать, пока допишут контакты.
//
// Картинку ужимает сам браузер: в базу кладётся квадрат 256×256 в WebP, это
// десятки килобайт вместо нескольких мегабайт с телефонной камеры.

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  changePasswordAction,
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
  type ProfileState,
} from '@/app/actions/profile';
import type { PublicUser } from '@/lib/user-display';
import {
  CONTACT_META,
  CONTACT_ORDER,
  type ContactKind,
  type ContactLink,
} from '@/lib/contacts';
import { Avatar } from './Avatar';
import { Button, CardDiv, ContactBadge, Field, Input } from './ui';

const INITIAL: ProfileState = { ok: true };

/** Сторона квадрата, до которого ужимаем фото перед отправкой. */
const AVATAR_SIDE = 256;

export function ProfileForm({ user, email }: { user: PublicUser; email: string }) {
  return (
    <div className="grid gap-6">
      <AvatarCard user={user} />
      <DetailsCard user={user} email={email} />
      <PasswordCard />
    </div>
  );
}

// ---------- Фото ----------

function AvatarCard({ user }: { user: PublicUser }) {
  const [state, formAction, pending] = useActionState(uploadAvatarAction, INITIAL);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.savedAt) setPreview(null);
  }, [state]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const squared = await squareToWebp(file, AVATAR_SIDE);
      const transfer = new DataTransfer();
      transfer.items.add(squared);
      if (fileRef.current) fileRef.current.files = transfer.files;
      setPreview(URL.createObjectURL(squared));
      formRef.current?.requestSubmit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <CardDiv tone="paper">
      <h2 className="text-lg font-medium">Фото</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-full border border-[color:var(--line)] object-cover"
          />
        ) : (
          <Avatar user={user} size={72} />
        )}

        {/* Родной <input type="file"> не показываем: у него своя ширина под
            кнопку и «файл не выбран», сжиматься он не умеет и на телефоне
            распирал карточку. Видимая часть — обычная подпись-кнопка. */}
        <form ref={formRef} action={formAction} className="min-w-0">
          <input
            ref={fileRef}
            id="avatar-file"
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPick}
            className="sr-only"
          />
          <label
            htmlFor="avatar-file"
            className="inline-flex cursor-pointer items-center rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)] transition hover:bg-[color:var(--ink-2)]"
          >
            {pending || busy ? 'Загружаем…' : 'Выбрать файл'}
          </label>
        </form>

        {user.hasAvatar && (
          <form action={removeAvatarAction} className="min-w-0">
            <Button type="submit" variant="ghost" size="sm">
              Убрать фото
            </Button>
          </form>
        )}
      </div>

      <p className="mt-3 text-xs text-[color:var(--muted)]">
        Картинка обрезается по центру до квадрата {AVATAR_SIDE}×{AVATAR_SIDE}. Без фото рисуем
        инициалы.
      </p>
      {state.error && <p className="mt-2 text-sm text-[color:var(--ink)]">{state.error}</p>}
      {state.savedAt && !state.error && (
        <p className="mt-2 text-sm text-[color:var(--muted)]">Фото обновлено.</p>
      )}
    </CardDiv>
  );
}

// ---------- Кто я ----------

function DetailsCard({ user, email }: { user: PublicUser; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, INITIAL);

  return (
    <CardDiv tone="paper">
      <h2 className="text-lg font-medium">О себе</h2>
      <form action={formAction} className="mt-4 flex flex-col gap-5">
        <Field
          label="Отображаемый ник"
          hint="Им вас подписывают в обсуждениях. Пусто — возьмём ФИО, а если и его нет — логин."
        >
          <Input name="nickname" defaultValue={user.nickname ?? ''} maxLength={40} />
        </Field>
        <Field label="ФИО">
          <Input name="name" defaultValue={user.name ?? ''} maxLength={120} />
        </Field>
        <Field label="О себе" hint="Пара абзацев на странице профиля.">
          <textarea
            name="bio"
            rows={4}
            maxLength={2000}
            defaultValue={user.bio ?? ''}
            className="w-full resize-y rounded-2xl bg-[color:var(--panel)] px-4 py-3 text-[15px] outline-none transition focus:ring-2 focus:ring-[color:var(--ink)]"
          />
        </Field>
        <ContactsEditor initial={user.contacts} />

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={pending} className="self-start">
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          {!pending && state.error && (
            <span className="text-sm text-[color:var(--ink)]">{state.error}</span>
          )}
          {!pending && state.savedAt && !state.error && (
            <span className="text-sm text-[color:var(--muted)]">
              Сохранено · {new Date(state.savedAt).toLocaleTimeString('ru-RU')}
            </span>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs text-[color:var(--muted)]">
        Почта входа — {email}. Она никому не показывается: в профиле видно только ник, ФИО и
        контакты, которые вы сами написали.
      </p>
    </CardDiv>
  );
}

// ---------- Контакты ----------

/**
 * Контакты добавляются по кнопке: выбрал сеть — появилось поле под ник.
 * Свободного текста больше нет, потому что из него нельзя собрать ссылку, а
 * ради ссылки всё и затевалось.
 *
 * Поля уходят двумя параллельными списками (contactKind и contactValue)
 * внутри общей формы «О себе»: своя форма означала бы вторую кнопку
 * «Сохранить» рядом с такой же.
 */
function ContactsEditor({ initial }: { initial: ContactLink[] }) {
  const [links, setLinks] = useState<ContactLink[]>(initial);

  const used = new Set(links.map((l) => l.kind));
  const available = CONTACT_ORDER.filter((kind) => !used.has(kind));

  const add = (kind: ContactKind): void => {
    setLinks((prev) => [...prev, { kind, value: '' }]);
  };
  const change = (kind: ContactKind, value: string): void => {
    setLinks((prev) => prev.map((l) => (l.kind === kind ? { ...l, value } : l)));
  };
  const remove = (kind: ContactKind): void => {
    setLinks((prev) => prev.filter((l) => l.kind !== kind));
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-[color:var(--ink-2)]">Контакты</span>

      {links.length === 0 && (
        <p className="text-xs text-[color:var(--muted)]">
          Пока ни одного. Выберите сеть кнопкой ниже.
        </p>
      )}

      {/* Каждая сеть — отдельный блок: название и «убрать» сверху, поле под
          ними. В одну строку это складывалось только на широком экране, а на
          телефоне поле оставалось без ширины. */}
      {links.map((link) => {
        const meta = CONTACT_META[link.kind];
        return (
          <div
            key={link.kind}
            className="rounded-2xl border border-[color:var(--line)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-[color:var(--ink-2)]">
                <ContactBadge text={meta.badge} size={24} />
                <span className="truncate">{meta.title}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(link.kind)}
                aria-label={`Убрать ${meta.title}`}
                className="shrink-0 rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)]"
              >
                Убрать
              </button>
            </div>
            <input type="hidden" name="contactKind" value={link.kind} />
            <Input
              className="mt-2"
              name="contactValue"
              value={link.value}
              onChange={(event) => change(link.kind, event.target.value)}
              placeholder={meta.placeholder}
              maxLength={200}
              aria-label={meta.title}
            />
            <span className="mt-1.5 block text-xs text-[color:var(--muted)]">{meta.hint}</span>
          </div>
        );
      })}

      {available.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {available.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => add(kind)}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color:var(--line)] py-1.5 pl-1.5 pr-3.5 text-sm text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] hover:bg-[color:var(--panel)]"
            >
              <ContactBadge text={CONTACT_META[kind].badge} />
              <span className="truncate">+ {CONTACT_META[kind].title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Пароль ----------

function PasswordCard() {
  const [state, formAction, pending] = useActionState(changePasswordAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.savedAt && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <CardDiv tone="paper">
      <h2 className="text-lg font-medium">Пароль</h2>
      <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-5">
        <Field label="Текущий пароль">
          <Input type="password" name="current" autoComplete="current-password" />
        </Field>
        <Field label="Новый пароль" hint="От 8 символов.">
          <Input type="password" name="next" autoComplete="new-password" />
        </Field>
        <Field label="Новый пароль ещё раз">
          <Input type="password" name="repeat" autoComplete="new-password" />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={pending} className="self-start">
            {pending ? 'Меняем…' : 'Сменить пароль'}
          </Button>
          {!pending && state.error && (
            <span className="text-sm text-[color:var(--ink)]">{state.error}</span>
          )}
          {!pending && state.savedAt && !state.error && (
            <span className="text-sm text-[color:var(--muted)]">Пароль изменён.</span>
          )}
        </div>
      </form>
    </CardDiv>
  );
}

// ---------- helpers ----------

/**
 * Обрезает картинку по центру до квадрата и переводит в WebP. Делается в
 * браузере: снимок с телефона — это мегабайты, а в базе нужен аватар.
 * Если canvas почему-то не отдал результат, отправляем оригинал — сервер
 * всё равно проверит тип и размер.
 */
async function squareToWebp(file: File, side: number): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const cut = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(
      bitmap,
      (bitmap.width - cut) / 2,
      (bitmap.height - cut) / 2,
      cut,
      cut,
      0,
      0,
      side,
      side,
    );
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    );
    if (!blob) return file;
    return new File([blob], 'avatar.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}
