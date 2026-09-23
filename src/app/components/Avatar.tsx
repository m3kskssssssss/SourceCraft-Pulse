// Аватар пользователя. Есть фото — показываем его, нет — чёрно-белую
// заглушку с инициалами: она читается лучше безликого силуэта и остаётся
// в теме сайта.

import Link from 'next/link';
import { initialsOf, type PublicUser } from '@/lib/user-display';
import { cx } from './ui';

export type AvatarProps = {
  user: Pick<PublicUser, 'id' | 'displayName' | 'hasAvatar' | 'avatarVersion'> | null;
  size?: number;
  className?: string;
};

export function Avatar({ user, size = 36, className }: AvatarProps) {
  const label = user?.displayName ?? 'Удалённый пользователь';
  const initials = user ? initialsOf(label) : '—';

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-[color:var(--line)] bg-[color:var(--panel)]',
        'font-medium leading-none text-[color:var(--ink-2)]',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      title={label}
    >
      {user?.hasAvatar ? (
        // Обычный <img>: next/image здесь ничего не даёт — картинка уже
        // ужата до аватарного размера, а версия в адресе нужна, чтобы после
        // замены фото браузер не показывал прежнее.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/users/${user.id}/avatar${user.avatarVersion ? `?v=${user.avatarVersion}` : ''}`}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}

/** Аватар с именем: подпись под комментарием и строка в профиле. */
export function UserChip({
  user,
  size = 32,
  subtitle,
  className,
}: {
  user: PublicUser | null;
  size?: number;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <Avatar user={user} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium tracking-tight">
          {user?.displayName ?? 'Удалённый пользователь'}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-[color:var(--muted)]">{subtitle}</span>
        )}
      </span>
    </>
  );

  if (!user) {
    return <span className={cx('inline-flex items-center gap-2.5', className)}>{body}</span>;
  }

  return (
    <Link
      href={`/u/${user.id}`}
      className={cx(
        'inline-flex items-center gap-2.5 rounded-full transition hover:opacity-80',
        className,
      )}
    >
      {body}
    </Link>
  );
}
