// Главная — рейтинг + форма запуска. Форма доступна гостям: если гость
// жмёт «Оценить», server action увидит, что пользователя нет, и редиректит
// на /signin с сохранённым returnTo. После входа анализ стартует сам.

import { AnalyzeForm } from './components/AnalyzeForm';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Pulse</h1>
      <p className="mt-4 text-lg text-neutral-600">
        Оценка здоровья открытых репозиториев платформы SourceCraft.
      </p>

      <section className="mt-10 rounded-3xl bg-neutral-100 p-6">
        <h2 className="text-xl font-medium">Оценить репозиторий</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Введите адрес репозитория с SourceCraft. Гостю мы сначала предложим войти.
        </p>
        <div className="mt-4">
          <AnalyzeForm />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-medium">Рейтинг</h2>
        <p className="mt-2 text-neutral-500">
          Пока пусто. Рейтинг наполнится, как только появятся первые опубликованные анализы.
        </p>
      </section>
    </main>
  );
}
