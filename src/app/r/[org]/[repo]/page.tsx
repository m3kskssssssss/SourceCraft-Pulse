// Карточка репозитория. Пока заглушка — только показываем org/repo из URL.
// Реальные данные и оценка появятся на Этапе 3.

type PageProps = {
  params: Promise<{ org: string; repo: string }>;
};

export default async function RepositoryPage({ params }: PageProps) {
  const { org, repo } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-neutral-500">Карточка репозитория</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {org}/{repo}
      </h1>
      <p className="mt-6 text-neutral-500">
        Сбор данных и оценка появятся на Этапе 3. Пока это заглушка, показывающая, что маршрут работает.
      </p>
    </main>
  );
}
