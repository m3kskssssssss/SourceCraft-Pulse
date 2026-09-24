// Содержимое входа и регистрации — одно и то же на отдельной странице и в
// модальном окне поверх текущей страницы. В окне переход «вход ↔ регистрация»
// заменяет запись истории, чтобы «назад» закрывало окно, а не листало формы.

import Link from 'next/link';
import { Suspense } from 'react';
import { auth, yandexEnabled } from '@/auth';
import { getPublicUser } from '@/lib/users';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { OrDivider, YandexButton } from './YandexButton';

/**
 * Вошёл ли человек по-настоящему: есть сессия и запись в базе. У удалённого
 * пользователя cookie ещё живёт, но войти ему нужно заново.
 */
export async function hasLiveSession(): Promise<boolean> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return Boolean(userId && (await getPublicUser(userId)));
}

export function SignInPanel({ inModal = false }: { inModal?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Вход</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Оценка расходует API и модель, поэтому запуск доступен после входа.
        </p>
      </div>
      <div className="flex flex-col gap-5">
        {yandexEnabled && (
          <>
            <YandexButton />
            <OrDivider />
          </>
        )}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Нет аккаунта?{' '}
        <Link className="text-[color:var(--ink)] underline underline-offset-4" href="/signup" replace={inModal}>
          Зарегистрируйтесь
        </Link>
        .
      </p>
    </div>
  );
}

export function SignUpPanel({ inModal = false }: { inModal?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Регистрация</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {yandexEnabled
            ? 'Быстрее всего — через Яндекс ID: имя и фото подтянутся сами. Или по почте и паролю.'
            : 'Храним только email, имя (по желанию) и хеш пароля.'}
        </p>
      </div>
      <div className="flex flex-col gap-5">
        {yandexEnabled && (
          <>
            <YandexButton label="Продолжить с Яндекс ID" />
            <OrDivider />
          </>
        )}
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Уже есть аккаунт?{' '}
        <Link className="text-[color:var(--ink)] underline underline-offset-4" href="/signin" replace={inModal}>
          Войти
        </Link>
        .
      </p>
    </div>
  );
}
