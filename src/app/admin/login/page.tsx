// Отдельная страница входа админа. Никакой связи с Auth.js.

import { Suspense } from 'react';
import { AdminSignInForm } from '@/app/components/AdminSignInForm';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Админка</h1>
        <p className="mt-2 text-neutral-600">
          Отдельный вход только для администратора. Обычный аккаунт здесь не работает.
        </p>
      </div>
      <Suspense fallback={null}>
        <AdminSignInForm />
      </Suspense>
    </main>
  );
}
