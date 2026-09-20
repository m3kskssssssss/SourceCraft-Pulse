// Server-обёртка админки. Всю раскладку и подсветку пункта делает AdminShell.

import { adminSignOutAction } from '@/app/actions/admin';
import { AdminShell } from '@/app/components/AdminShell';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      signOut={
        <form action={adminSignOutAction}>
          <button
            type="submit"
            className="w-full rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink-2)] hover:bg-[color:var(--panel)]"
          >
            Выйти
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
