// Ошибки клиента SourceCraft API. Отдельный файл, чтобы легко импортировать
// в местах, где нужно поймать конкретный тип и не тянуть весь клиент.

import { z } from 'zod';

/**
 * Схема тела ошибки API. Поля не всегда присутствуют, поэтому все опциональны.
 * Основано на наблюдаемом формате `{ error_code, request_id, message }` в OpenAPI.
 */
export const sourcecraftErrorBodySchema = z.object({
  error_code: z.string().optional(),
  request_id: z.string().optional(),
  message: z.string().optional(),
  code: z.union([z.string(), z.number()]).optional(),
});

export type SourcecraftErrorBody = z.infer<typeof sourcecraftErrorBodySchema>;

export class SourcecraftApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string | null,
    public readonly requestId: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'SourcecraftApiError';
  }

  static async fromResponse(response: Response): Promise<SourcecraftApiError> {
    let body: unknown = null;
    try {
      const text = await response.text();
      if (text) body = JSON.parse(text);
    } catch {
      // тело не JSON — оставляем null
    }
    const parsed = sourcecraftErrorBodySchema.safeParse(body);
    const errorCode = parsed.success ? parsed.data.error_code ?? null : null;
    const requestId = parsed.success ? parsed.data.request_id ?? null : null;
    const message = parsed.success
      ? parsed.data.message ?? `SourceCraft API ${response.status}`
      : `SourceCraft API ${response.status}`;
    return new SourcecraftApiError(response.status, errorCode, requestId, message);
  }
}

/**
 * Ошибка «репозиторий не найден или недоступен». Обёртка над 404,
 * чтобы вызывающий код мог мягко обрабатывать.
 */
export class SourcecraftNotFoundError extends SourcecraftApiError {
  constructor(errorCode: string | null, requestId: string | null, message: string) {
    super(404, errorCode, requestId, message);
    this.name = 'SourcecraftNotFoundError';
  }
}
