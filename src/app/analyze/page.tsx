// Страница /analyze — приземляемся сюда после автозапуска анализа гостя,
// который только что вошёл. Middleware гарантирует, что сюда попадает только
// авторизованный пользователь. Если пришли с ?target=org/repo — сразу
// запускаем действие; если без параметра — показываем форму.

import { AnalyzeForm } from '@/app/components/AnalyzeForm';
import { analyzeRepo } from '@/app/actions/analyze';

type PageProps = {
  searchParams: Promise<{ target?: string }>;
};

export default async function AnalyzePage({ searchParams }: PageProps) {
  const { target } = await searchParams;

  if (target) {
    // Автозапуск после логина. analyzeRepo либо редиректит на /a/<id>,
    // либо возвращает объект с ошибкой (тогда покажем форму с текстом).
    const result = await analyzeRepo(target);
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Не получилось запустить</h1>
        <p className="text-neutral-700">{result.error ?? 'Неизвестная ошибка'}</p>
        <AnalyzeForm defaultValue={target} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Оценить репозиторий</h1>
      <AnalyzeForm />
    </main>
  );
}
