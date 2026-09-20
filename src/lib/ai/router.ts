// Реализация AiProvider поверх OpenAI-совместимого роутера (routerai.ru).
// Один HTTP-путь /chat/completions, стандартные поля usage.
//
// Замечено на живом ответе:
//   - usage.cost — стоимость запроса в USD (может отсутствовать у других роутеров)
//   - модель может подмениться (deepseek/deepseek-v4.1-flash → deepseek-flash);
//     оба значения сохраняем для аудита.

import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import type { AiCompleteInput, AiCompleteResult, AiProvider } from './provider';
import { AiProviderError } from './provider';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const RETRY_BASE_MS = 400;

// ---------- Схема ответа ----------

const chatChoiceSchema = z.object({
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
});

const chatUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative().optional(),
  completion_tokens: z.number().int().nonnegative().optional(),
  total_tokens: z.number().int().nonnegative().optional(),
  cost: z.number().optional(), // расширение роутера — стоимость в USD
});

const chatResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(chatChoiceSchema).min(1),
  usage: chatUsageSchema.optional(),
});

// ---------- Реализация ----------

export type RouterAiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch; // подмена для тестов
};

export class RouterAiProvider implements AiProvider {
  readonly name = 'routerai';
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;

  constructor(cfg: RouterAiConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.apiKey = cfg.apiKey;
    this.model = cfg.model;
    this.timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = cfg.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.fetchImpl = cfg.fetchImpl ?? fetch;
  }

  async complete(input: AiCompleteInput): Promise<AiCompleteResult> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    messages.push({ role: 'system', content: input.system });
    for (const shot of input.fewShot ?? []) {
      messages.push({ role: 'user', content: shot.user });
      messages.push({ role: 'assistant', content: shot.assistant });
    }
    messages.push({ role: 'user', content: input.user });

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: input.maxTokens ?? 1024,
    };
    // Часть OpenAI-compat серверов принимает response_format для строгого JSON.
    // Если провайдер его игнорирует — не страшно, Zod всё равно валидирует.
    if (input.json) {
      body.response_format = { type: 'json_object' };
    }

    const timeoutMs = input.timeoutMs ?? this.timeoutMs;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const started = Date.now();
      try {
        const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          const err = await extractError(response);
          if (attempt < this.maxAttempts) {
            lastError = err;
            await sleep(backoffMs(attempt));
            continue;
          }
          throw err;
        }
        if (!response.ok) {
          throw await extractError(response);
        }

        const raw = (await response.json()) as unknown;
        const parsed = chatResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw new AiProviderError(
            502,
            'invalid_response',
            `RouterAI вернул неожиданную структуру: ${parsed.error.message}`,
          );
        }
        const choice = parsed.data.choices[0]!;
        return {
          text: choice.message.content,
          promptTokens: parsed.data.usage?.prompt_tokens ?? 0,
          completionTokens: parsed.data.usage?.completion_tokens ?? 0,
          costUsd: parsed.data.usage?.cost ?? null,
          latencyMs: Date.now() - started,
          reportedModel: parsed.data.model ?? null,
        };
      } catch (err: unknown) {
        const isAbort =
          typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
        if (isAbort && attempt < this.maxAttempts) {
          lastError = err;
          await sleep(backoffMs(attempt));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error('RouterAI: retries exhausted');
  }
}

// ---------- helpers ----------

async function extractError(response: Response): Promise<AiProviderError> {
  let code: string | null = null;
  let msg = `RouterAI ${response.status}`;
  try {
    const text = await response.text();
    const json = JSON.parse(text) as { error?: { message?: string; code?: string; type?: string } };
    if (json.error) {
      code = json.error.code ?? json.error.type ?? null;
      msg = json.error.message ?? msg;
    } else if (text) {
      msg = text.slice(0, 200);
    }
  } catch {
    // ignore
  }
  return new AiProviderError(response.status, code, msg);
}

function backoffMs(attempt: number): number {
  const base = RETRY_BASE_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * base);
  return base + jitter;
}

// ---------- Фабрика ----------

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      'AI_BASE_URL / AI_API_KEY / AI_MODEL не заданы. Проверьте .env.',
    );
  }
  cached = new RouterAiProvider({ baseUrl, apiKey, model });
  return cached;
}

export function resetAiProviderForTesting(): void {
  cached = null;
}
