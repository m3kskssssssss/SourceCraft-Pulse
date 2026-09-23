import { requireAdmin } from '@/app/actions/admin';
import { adminResetAiSpendAction } from '@/app/actions/admin-settings';
import { AdminSettingsForm } from '@/app/components/AdminSettingsForm';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { CardDiv, Chip } from '@/app/components/ui';
import { getAiSpend } from '@/lib/admin-stats';
import { readAdminSettings } from '@/lib/admin-settings';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  await requireAdmin();

  const values = await readAdminSettings();
  const spend = await getAiSpend();

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Настройки</h1>
      <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
        Значения переопределяют переменные окружения и применяются сразу — модель, бюджет и
        лимиты читаются отсюда на каждом прогоне. Ключи API здесь не показываются и не
        редактируются.
      </p>

      <CardDiv tone="paper" className="mt-8 max-w-xl">
        <AdminSettingsForm values={values} />
      </CardDiv>

      <CardDiv tone="outline" className="mt-6 max-w-xl">
        <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
          Расходы на ИИ
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <span>
            За сутки: <strong className="tabular-nums">{spend.todayRub.toFixed(2)} ₽</strong>
          </span>
          <span>
            За месяц: <strong className="tabular-nums">{spend.monthRub.toFixed(2)} ₽</strong>
          </span>
          <span className="text-[color:var(--muted)]">
            {spend.resetAt
              ? `Счётчик обнулён ${new Date(spend.resetAt).toLocaleString('ru-RU')}`
              : 'Счётчик ни разу не обнуляли'}
          </span>
        </div>
        <form action={adminResetAiSpendAction} className="mt-4">
          <ConfirmSubmit
            tone="danger"
            question="Обнулить счётчик расходов на ИИ? Журнал вызовов останется, но суммы будут считаться с этого момента."
          >
            Обнулить счётчик расходов
          </ConfirmSubmit>
        </form>
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Журнал вызовов и статистика по моделям остаются на месте — сдвигается только точка
          отсчёта, от которой считается бюджет.
        </p>
      </CardDiv>
    </section>
  );
}
