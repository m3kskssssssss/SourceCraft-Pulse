// Главная — публичный рейтинг репозиториев. Пока заглушка.
// Реальный список появится на Этапе 3 (реальные оценки) и Этапе 6 (публикация).

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Pulse</h1>
      <p className="mt-4 text-lg text-neutral-600">
        Оценка здоровья открытых репозиториев платформы SourceCraft.
      </p>
      <section className="mt-12">
        <h2 className="text-xl font-medium">Рейтинг</h2>
        <p className="mt-2 text-neutral-500">
          Пока пусто. Рейтинг наполнится, как только появятся первые опубликованные анализы.
        </p>
      </section>
    </main>
  );
}
