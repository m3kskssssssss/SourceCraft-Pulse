// Настройки своего профиля. Чужой профиль — /u/[id], он только для чтения.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProfileForm } from '@/app/components/ProfileForm';
import { Chip } from '@/app/components/ui';
import { getOwnProfile } from '@/lib/users';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin?returnTo=%2Fprofile');

  const profile = await getOwnProfile(userId);
  if (!profile) redirect('/signin?returnTo=%2Fprofile');

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <header className="rise">
        <Chip tone="outline">Профиль</Chip>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Так вас видят в обсуждениях и на{' '}
          <Link href={`/u/${profile.id}`} className="underline underline-offset-4 hover:no-underline">
            своей странице
          </Link>
          .
        </p>
      </header>

      <div className="rise mt-8" style={{ animationDelay: '60ms' }}>
        <ProfileForm user={profile} email={profile.email} />
      </div>
    </main>
  );
}
