// AI-задача №3: превращает три технические рекомендации в человекочитаемые.
// На вход — только «сухие» метрики; текстов из репозитория модель не видит.

import { z } from 'zod';
import type { AiCache } from '../cache';
import type { AiProvider } from '../provider';
import type { AiTelemetry } from '../telemetry';
import { runAiTask, type RunAiTaskResult } from '../runner';
import type { Recommendation } from '../../scoring/types';

const copySchema = z.object({
  recommendations: z
    .array(
      z.object({
        key: z.string(),
        title: z.string().max(120),
        explanation: z.string().max(400),
      }),
    )
    .max(3),
});

export type RecommendationCopy = z.infer<typeof copySchema>;

export type RecommendationCopyInput = {
  orgRepo: string;
  language: string | null;
  recommendations: Array<{
    key: string;
    category: string;
    original_title: string;
    effort: string;
    gain: number;
  }>;
};

const SYSTEM = `Ты пишешь короткие, конкретные советы для разработчиков open-source-проектов.
На вход — «сухие» рекомендации. Твоя задача:
- переформулировать каждую по-русски: одно ёмкое title (до 12 слов) и explanation (2 предложения, до 300 символов);
- в explanation объяснить, ПОЧЕМУ это важно для здоровья репозитория (без общих слов, привязать к open-source практикам);
- сохранить массив в том же порядке и с теми же key.
Отвечай ТОЛЬКО валидным JSON без markdown-ограждений.`;

function buildPrompt(input: RecommendationCopyInput): {
  system: string;
  user: string;
  maxTokens?: number;
} {
  return {
    system: SYSTEM,
    user: JSON.stringify(
      {
        repository: input.orgRepo,
        language: input.language,
        recommendations: input.recommendations,
      },
      null,
      2,
    ),
    maxTokens: 1400,
  };
}

export async function runRecommendationCopy(args: {
  provider: AiProvider;
  cache: AiCache;
  telemetry: AiTelemetry;
  orgRepo: string;
  language: string | null;
  recommendations: Recommendation[];
}): Promise<RunAiTaskResult<RecommendationCopy>> {
  const input: RecommendationCopyInput = {
    orgRepo: args.orgRepo,
    language: args.language,
    recommendations: args.recommendations.map((r) => ({
      key: r.key,
      category: r.category,
      original_title: r.title,
      effort: r.effort,
      gain: r.gain,
    })),
  };
  return runAiTask({
    provider: args.provider,
    cache: args.cache,
    telemetry: args.telemetry,
    task: 'recommendation_copy',
    input,
    schema: copySchema,
    buildPrompt,
    fallback: () => ({
      recommendations: args.recommendations.map((r) => ({
        key: r.key,
        title: r.title,
        explanation: 'Автоформулировка недоступна.',
      })),
    }),
  });
}
