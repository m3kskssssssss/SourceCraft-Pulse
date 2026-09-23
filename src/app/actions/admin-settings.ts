'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from './admin';
import { setSetting } from '@/lib/settings';
import { readAdminSettings, type AdminSettingsValues } from '@/lib/admin-settings';
import { db } from '@/db/client';
import { events } from '@/db/schema';

const schema = z.object({
  aiModel: z.string().min(1).max(200).optional(),
  monthlyBudgetRub: z.coerce.number().nonnegative().max(1_000_000).optional(),
  userDaily: z.coerce.number().int().min(1).max(1000).optional(),
  userConcurrent: z.coerce.number().int().min(1).max(20).optional(),
});

/** Подписи полей для сообщений: в форме они по-русски, а ключи — по-английски. */
const FIELD_LABELS = {
  aiModel: 'модель',
  monthlyBudgetRub: 'бюджет',
  userDaily: 'лимит в сутки',
  userConcurrent: 'одновременно в очереди',
} as const;

function labelOf(key: unknown): string {
  const k = String(key);
  return k in FIELD_LABELS ? FIELD_LABELS[k as keyof typeof FIELD_LABELS] : k;
}

/**
 * Что вернуть форме. Раньше экшен был `void` и на неверном значении просто
 * молча выходил: со стороны это выглядело так, будто админка не сохраняет
 * ничего. Теперь форма знает и про успех, и про причину отказа, и получает
 * перечитанные из базы значения.
 */
export type AdminSettingsState =
  | { status: 'idle' }
  | { status: 'saved'; at: string; changed: string[]; values: AdminSettingsValues }
  | { status: 'error'; message: string };

export async function adminUpdateSettingsAction(
  _prev: AdminSettingsState,
  formData: FormData,
): Promise<AdminSettingsState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse({
    aiModel: valueOrUndef(formData.get('aiModel')),
    monthlyBudgetRub: valueOrUndef(formData.get('monthlyBudgetRub')),
    userDaily: valueOrUndef(formData.get('userDaily')),
    userConcurrent: valueOrUndef(formData.get('userConcurrent')),
  });
  if (!parsed.success) {
    // Проверка общая на всю форму: одно негодное значение отменяет сохранение
    // целиком, поэтому важно назвать именно его.
    const bad = [
      ...new Set(
        parsed.error.issues.map((issue) => labelOf(issue.path[0])),
      ),
    ];
    return {
      status: 'error',
      message: `Не сохранено — негодное значение: ${bad.join(', ')}.`,
    };
  }

  const changes: Record<string, unknown> = {};
  const changed: string[] = [];
  if (parsed.data.aiModel !== undefined) {
    await setSetting('ai.model', parsed.data.aiModel);
    changes.aiModel = parsed.data.aiModel;
    changed.push(FIELD_LABELS.aiModel);
  }
  if (parsed.data.monthlyBudgetRub !== undefined) {
    await setSetting('ai.monthly_budget_rub', parsed.data.monthlyBudgetRub);
    changes.monthlyBudgetRub = parsed.data.monthlyBudgetRub;
    changed.push(FIELD_LABELS.monthlyBudgetRub);
  }
  if (parsed.data.userDaily !== undefined) {
    await setSetting('limits.user_daily', parsed.data.userDaily);
    changes.userDaily = parsed.data.userDaily;
    changed.push(FIELD_LABELS.userDaily);
  }
  if (parsed.data.userConcurrent !== undefined) {
    await setSetting('limits.user_concurrent', parsed.data.userConcurrent);
    changes.userConcurrent = parsed.data.userConcurrent;
    changed.push(FIELD_LABELS.userConcurrent);
  }

  await db.insert(events).values({
    kind: 'admin.settings.updated',
    payload: { by: admin.login, changes },
  });
  revalidatePath('/admin/settings');
  // Бюджет виден и на странице расходов — её тоже пересобираем.
  revalidatePath('/admin/ai');

  // Отдаём не отправленное, а перечитанное: если что-то не легло, это сразу
  // видно в полях.
  return {
    status: 'saved',
    at: new Date().toISOString(),
    changed,
    values: await readAdminSettings(),
  };
}

function valueOrUndef(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

/**
 * Обнуляет счётчик расходов на ИИ: журнал вызовов остаётся, но суммы считаются
 * с этого момента. Так лимит бюджета можно снять, не теряя историю.
 */
export async function adminResetAiSpendAction(): Promise<void> {
  const admin = await requireAdmin();
  const at = new Date().toISOString();
  await setSetting('ai.spend_reset_at', at);
  await db.insert(events).values({
    kind: 'admin.ai.spend_reset',
    payload: { by: admin.login, at },
  });
  revalidateTag('ai-spend');
  revalidatePath('/admin/ai');
  revalidatePath('/admin/settings');
  revalidatePath('/admin');
}
