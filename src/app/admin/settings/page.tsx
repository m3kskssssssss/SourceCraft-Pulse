import { requireAdmin } from '@/app/actions/admin';
import {
  adminResetAiSpendAction,
  adminUpdateSettingsAction,
} from '@/app/actions/admin-settings';
import { ConfirmSubmit } from '@/app/components/ConfirmSubmit';
import { Button, CardDiv, Chip, Field, Input } from '@/app/components/ui';
import { getAiSpend } from '@/lib/admin-stats';
import { getSetting } from '@/lib/settings';
import { USER_CONCURRENT_ANALYSIS_LIMIT, USER_DAILY_ANALYSIS_LIMIT } from '@/lib/limits';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  await requireAdmin();

  const aiModel = await getSetting(
    'ai.model',
    process.env.AI_MODEL ?? 'openai/gpt-6-luna-pro',
  );
  const budget = await getSetting<number>(
    'ai.monthly_budget_rub',
    Number.parseFloat(process.env.AI_MONTHLY_BUDGET_RUB ?? '0'),
  );
  const userDaily = await getSetting<number>('limits.user_daily', USER_DAILY_ANALYSIS_LIMIT);
  const userConcurrent = await getSetting<number>(
    'limits.user_concurrent',
    USER_CONCURRENT_ANALYSIS_LIMIT,
  );
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
        <form action={adminUpdateSettingsAction} className="flex flex-col gap-5">
          <Field label="Активная модель (routerai)">
            <Input
              name="aiModel"
              defaultValue={String(aiModel)}
              placeholder="openai/gpt-6-luna-pro"
            />
          </Field>
          <Field
            label="Месячный бюджет ИИ, ₽"
            hint="0 — без лимита. По достижении лимита AI-задачи перестают выполняться."
          >
            <Input type="number" step="0.01" name="monthlyBudgetRub" defaultValue={String(budget)} />
          </Field>
          <Field label="Лимит анализов в сутки на пользователя">
            <Input type="number" name="userDaily" defaultValue={String(userDaily)} />
          </Field>
          <Field label="Одновременно в очереди">
            <Input type="number" name="userConcurrent" defaultValue={String(userConcurrent)} />
          </Field>
          <Button type="submit" size="lg" className="self-start">
            Сохранить
          </Button>
        </form>
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
