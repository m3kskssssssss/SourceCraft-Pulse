import { requireAdmin } from '@/app/actions/admin';
import { Bar, CardDiv, Chip, Stat } from '@/app/components/ui';
import { getAiSpend } from '@/lib/admin-stats';
import { getNumberSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

function fmtRub(n: number): string {
  return `${n.toFixed(2)} ₽`;
}

export default async function AdminAiPage() {
  await requireAdmin();
  const spend = await getAiSpend();
  // Бюджет берём из настроек, а не из окружения: именно по этому значению
  // рубятся AI-задачи (assertUnderMonthlyBudget). Раньше здесь читалось
  // окружение, и новый лимит из админки на этой странице не появлялся.
  const budget = await getNumberSetting('ai.monthly_budget_rub', 'AI_MONTHLY_BUDGET_RUB', 0);
  const budgetShare = budget > 0 ? Math.min(1, spend.monthRub / budget) : 0;
  const budgetRemaining = budget > 0 ? Math.max(0, budget - spend.monthRub) : null;

  return (
    <section>
      <Chip tone="outline">Админка</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">ИИ и расходы</h1>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Сегодня" value={fmtRub(spend.todayRub)} />
        <Stat label="За месяц" value={fmtRub(spend.monthRub)} />
        <Stat label="За всё время" value={fmtRub(spend.allTimeRub)} />
      </div>

      {budget > 0 && (
        <CardDiv tone="paper" className="mt-6">
          <div className="flex items-baseline justify-between text-xs uppercase tracking-widest text-[color:var(--muted)]">
            <span>Месячный бюджет</span>
            <span>
              {fmtRub(spend.monthRub)} / {fmtRub(budget)}
            </span>
          </div>
          <Bar value={Math.round(budgetShare * 100)} className="mt-3" height={8} />
          <div className="mt-2 text-xs text-[color:var(--muted)]">
            Остаток: {budgetRemaining !== null ? fmtRub(budgetRemaining) : '—'}
          </div>
        </CardDiv>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Разбивка по провайдеру и модели</h2>
        {spend.byProviderModel.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">Вызовов пока не было.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)]">
            <table className="w-full text-sm">
              <thead className="text-left text-[color:var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-normal">Провайдер</th>
                  <th className="px-5 py-3 font-normal">Модель</th>
                  <th className="px-5 py-3 text-right font-normal">Вызовов</th>
                  <th className="px-5 py-3 text-right font-normal">Расход</th>
                </tr>
              </thead>
              <tbody>
                {spend.byProviderModel.map((row) => (
                  <tr
                    key={`${row.provider}-${row.model}`}
                    className="border-t border-[color:var(--line)]"
                  >
                    <td className="px-5 py-3">{row.provider}</td>
                    <td className="px-5 py-3 font-mono text-xs">{row.model}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.callsN}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{fmtRub(row.costRub)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CardDiv tone="paper" className="mt-8">
        <div className="text-xs uppercase tracking-widest text-[color:var(--muted)]">Кэш</div>
        <div className="mt-2 text-sm">
          Попаданий: <strong>{(spend.cachedRatio * 100).toFixed(1)}%</strong> · сэкономлено{' '}
          <strong>{fmtRub(spend.savedRub)}</strong>
        </div>
      </CardDiv>
    </section>
  );
}
