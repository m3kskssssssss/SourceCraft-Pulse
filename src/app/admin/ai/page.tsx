import { requireAdmin } from '@/app/actions/admin';
import { getAiSpend } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

function fmtRub(n: number): string {
  return `${n.toFixed(2)}₽`;
}

export default async function AdminAiPage() {
  await requireAdmin();
  const spend = await getAiSpend();
  const budget = Number.parseFloat(process.env.AI_MONTHLY_BUDGET_RUB ?? '0');
  const budgetShare = budget > 0 ? Math.min(1, spend.monthRub / budget) : 0;
  const budgetRemaining = budget > 0 ? Math.max(0, budget - spend.monthRub) : null;

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">ИИ и расходы</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card label="Сегодня" value={fmtRub(spend.todayRub)} />
        <Card label="За месяц" value={fmtRub(spend.monthRub)} />
        <Card label="За всё время" value={fmtRub(spend.allTimeRub)} />
      </div>

      {budget > 0 && (
        <section className="mt-6 rounded-3xl bg-neutral-100 p-4">
          <div className="text-xs text-neutral-500">
            Месячный бюджет: {fmtRub(budget)} · остаток{' '}
            {budgetRemaining !== null ? fmtRub(budgetRemaining) : '—'}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full bg-neutral-900"
              style={{ width: `${Math.round(budgetShare * 100)}%` }}
            />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Разбивка по провайдеру и модели</h2>
        {spend.byProviderModel.length === 0 ? (
          <p className="mt-2 text-neutral-500">Вызовов пока не было.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2">Провайдер</th>
                <th>Модель</th>
                <th className="text-right">Вызовов</th>
                <th className="text-right">Расход</th>
              </tr>
            </thead>
            <tbody>
              {spend.byProviderModel.map((row) => (
                <tr key={`${row.provider}-${row.model}`} className="border-t border-neutral-200">
                  <td className="py-2">{row.provider}</td>
                  <td>{row.model}</td>
                  <td className="text-right tabular-nums">{row.callsN}</td>
                  <td className="text-right tabular-nums">{fmtRub(row.costRub)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8 rounded-3xl bg-neutral-100 p-4">
        <div className="text-xs text-neutral-500">Кэш</div>
        <div className="mt-2 text-sm">
          Попаданий: {(spend.cachedRatio * 100).toFixed(1)}% · сэкономлено {fmtRub(spend.savedRub)}
        </div>
      </section>
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-neutral-100 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
