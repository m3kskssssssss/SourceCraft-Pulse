import { requireAdmin } from '@/app/actions/admin';
import { adminUpdateSettingsAction } from '@/app/actions/admin-settings';
import { Button, CardDiv, Chip, Field, Input } from '@/app/components/ui';
import { getSetting } from '@/lib/settings';
import { USER_CONCURRENT_ANALYSIS_LIMIT, USER_DAILY_ANALYSIS_LIMIT } from '@/lib/limits';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  await requireAdmin();

  const aiModel = await getSetting(
    'ai.model',
    process.env.AI_MODEL ?? 'deepseek/deepseek-v4.1-flash',
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

  return (
    <section>
      <Chip tone="outline">админ</Chip>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Настройки</h1>
      <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
        Значения переопределяют переменные окружения. Ключи API здесь не показываются и не
        редактируются.
      </p>

      <CardDiv tone="paper" className="mt-8 max-w-xl">
        <form action={adminUpdateSettingsAction} className="flex flex-col gap-5">
          <Field label="Активная модель (routerai)">
            <Input
              name="aiModel"
              defaultValue={String(aiModel)}
              placeholder="deepseek/deepseek-v4.1-flash"
            />
          </Field>
          <Field label="Месячный бюджет ИИ, ₽">
            <Input type="number" name="monthlyBudgetRub" defaultValue={String(budget)} />
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
    </section>
  );
}
