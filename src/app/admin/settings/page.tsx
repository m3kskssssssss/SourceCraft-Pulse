import { requireAdmin } from '@/app/actions/admin';
import { adminUpdateSettingsAction } from '@/app/actions/admin-settings';
import { getSetting } from '@/lib/settings';
import { USER_CONCURRENT_ANALYSIS_LIMIT, USER_DAILY_ANALYSIS_LIMIT } from '@/lib/limits';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  await requireAdmin();

  // Значения по умолчанию — из окружения, но с fallback на константы.
  const aiModel = await getSetting('ai.model', process.env.AI_MODEL ?? 'deepseek/deepseek-v4.1-flash');
  const budget = await getSetting<number>(
    'ai.monthly_budget_rub',
    Number.parseFloat(process.env.AI_MONTHLY_BUDGET_RUB ?? '0'),
  );
  const userDaily = await getSetting<number>('limits.user_daily', USER_DAILY_ANALYSIS_LIMIT);
  const userConcurrent = await getSetting<number>('limits.user_concurrent', USER_CONCURRENT_ANALYSIS_LIMIT);

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Настройки</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Значения переопределяют переменные окружения. Ключи API здесь не показываются и не редактируются.
      </p>

      <form action={adminUpdateSettingsAction} className="mt-6 flex max-w-md flex-col gap-4">
        <Field
          label="Активная модель (routerai)"
          name="aiModel"
          defaultValue={String(aiModel)}
          placeholder="deepseek/deepseek-v4.1-flash"
        />
        <Field
          label="Месячный бюджет ИИ, ₽"
          name="monthlyBudgetRub"
          defaultValue={String(budget)}
          type="number"
        />
        <Field
          label="Лимит анализов в сутки на пользователя"
          name="userDaily"
          defaultValue={String(userDaily)}
          type="number"
        />
        <Field
          label="Одновременно в очереди"
          name="userConcurrent"
          defaultValue={String(userConcurrent)}
          type="number"
        />
        <button
          type="submit"
          className="self-start rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white"
        >
          Сохранить
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-full bg-neutral-100 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
      />
    </label>
  );
}
