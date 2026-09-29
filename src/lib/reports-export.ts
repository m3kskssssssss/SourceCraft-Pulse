// Массовая выгрузка отчётов: что считается опубликованным и сколько PDF в части.

import { and, count, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { analyses } from '@/db/schema';

/** PDF рендерится дольше Markdown — отдаём частями, чтобы уложиться в maxDuration. */
export const PDF_PART = 60;

export const PUBLISHED_REPORTS = and(eq(analyses.isPublic, true), eq(analyses.status, 'done'));

export async function countPublishedReports(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(analyses).where(PUBLISHED_REPORTS);
  return row?.n ?? 0;
}
