'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from './admin';
import { setSetting } from '@/lib/settings';
import { db } from '@/db/client';
import { events } from '@/db/schema';

const schema = z.object({
  aiModel: z.string().min(1).max(200).optional(),
  monthlyBudgetRub: z.coerce.number().nonnegative().max(1_000_000).optional(),
  userDaily: z.coerce.number().int().min(1).max(1000).optional(),
  userConcurrent: z.coerce.number().int().min(1).max(20).optional(),
});

export async function adminUpdateSettingsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse({
    aiModel: valueOrUndef(formData.get('aiModel')),
    monthlyBudgetRub: valueOrUndef(formData.get('monthlyBudgetRub')),
    userDaily: valueOrUndef(formData.get('userDaily')),
    userConcurrent: valueOrUndef(formData.get('userConcurrent')),
  });
  if (!parsed.success) return;

  const changes: Record<string, unknown> = {};
  if (parsed.data.aiModel !== undefined) {
    await setSetting('ai.model', parsed.data.aiModel);
    changes.aiModel = parsed.data.aiModel;
  }
  if (parsed.data.monthlyBudgetRub !== undefined) {
    await setSetting('ai.monthly_budget_rub', parsed.data.monthlyBudgetRub);
    changes.monthlyBudgetRub = parsed.data.monthlyBudgetRub;
  }
  if (parsed.data.userDaily !== undefined) {
    await setSetting('limits.user_daily', parsed.data.userDaily);
    changes.userDaily = parsed.data.userDaily;
  }
  if (parsed.data.userConcurrent !== undefined) {
    await setSetting('limits.user_concurrent', parsed.data.userConcurrent);
    changes.userConcurrent = parsed.data.userConcurrent;
  }

  await db.insert(events).values({
    kind: 'admin.settings.updated',
    payload: { by: admin.login, changes },
  });
  revalidatePath('/admin/settings');
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
