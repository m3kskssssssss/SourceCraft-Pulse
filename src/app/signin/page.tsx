import { redirect } from 'next/navigation';
import { SignInPanel, hasLiveSession } from '@/app/components/AuthPanels';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  if (await hasLiveSession()) redirect('/');
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="rise rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-6 shadow-[var(--shadow-1)] sm:p-8">
        <SignInPanel />
      </div>
    </main>
  );
}
