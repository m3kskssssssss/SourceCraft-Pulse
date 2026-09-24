// Страница /analyze — приземляемся сюда после автозапуска анализа гостя,
// который только что вошёл. Middleware гарантирует, что сюда попадает только
// авторизованный пользователь. Если пришли с ?target=org/repo — сразу
// запускаем действие; если без параметра — показываем форму.

import { AnalyzeForm } from '@/app/components/AnalyzeForm';
import { HowAnalysisWorks } from '@/app/components/HowAnalysisWorks';
import { Planet } from '@/app/components/Planet';
import { analyzeRepo } from '@/app/actions/analyze';

type PageProps = {
  searchParams: Promise<{ target?: string }>;
};

export default async function AnalyzePage({ searchParams }: PageProps) {
  const { target } = await searchParams;

  if (target) {
    const result = await analyzeRepo(target);
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Анализ не запустился</h1>
        </div>
        <div className="rounded-2xl bg-[color:var(--panel)] px-5 py-4 text-sm text-[color:var(--ink-2)]">
          {result.error ?? 'Неизвестная ошибка'}
        </div>
        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-5">
          <AnalyzeForm defaultValue={target} />
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute -right-40 -top-24 -z-10 hidden sm:block">
        <Planet size={420} variant="backdrop" />
      </div>
      <div className="rise">
        <h1 className="text-4xl font-semibold tracking-tight">Оценить репозиторий</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Адрес репозитория с SourceCraft или пара org/repo. Результат обновляется сам.
        </p>
      </div>
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper-2)] p-5">
        <AnalyzeForm />
      </div>
      <div className="rise mt-4" style={{ animationDelay: '120ms' }}>
        <HowAnalysisWorks />
      </div>
    </main>
  );
}
