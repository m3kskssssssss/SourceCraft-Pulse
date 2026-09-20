// Интерфейс AI-провайдера. Одна реализация RouterAiProvider — OpenAI-совместимый
// прокси https://routerai.ru. Роутер сам возвращает `usage.cost` в USD,
// поэтому мы не ведём таблицу тарифов: реальная цена приходит от роутера,
// пересчитываем в рубли по константному курсу.

export type AiCompleteInput = {
  /** Системный промпт (роль system). */
  system: string;
  /** Пользовательский промпт (роль user). */
  user: string;
  /** Опциональные ассистент-эхо-примеры для few-shot. */
  fewShot?: Array<{ user: string; assistant: string }>;
  /** Максимум новых токенов в ответе. */
  maxTokens?: number;
  /** Просить строгий JSON-выход. Не гарантия — валидируем через Zod вне. */
  json?: boolean;
  /** Таймаут запроса. */
  timeoutMs?: number;
};

export type AiCompleteResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  /** Стоимость запроса, если провайдер её вернул. Может быть null. */
  costUsd: number | null;
  latencyMs: number;
  /** Что провайдер сам сообщил про модель (у роутера отличается от нашего alias). */
  reportedModel: string | null;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  complete(input: AiCompleteInput): Promise<AiCompleteResult>;
}

// ---------- Ошибки ----------

export class AiProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly providerCode: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
