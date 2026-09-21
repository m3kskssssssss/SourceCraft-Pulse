// Отдельная страница входа админа. Никакой связи с Auth.js.

import { Suspense } from 'react';
import { AdminSignInForm } from '@/app/components/AdminSignInForm';
import { Chip } from '@/app/components/ui';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
      <div>
        <Chip tone="ink">Админка</Chip>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Служебный вход</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Отдельный вход только для администратора. Обычный аккаунт здесь не работает.
        </p>
      </div>
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)]">
        <Suspense fallback={null}>
          <AdminSignInForm />
        </Suspense>
      </div>
    </main>
  );
}
