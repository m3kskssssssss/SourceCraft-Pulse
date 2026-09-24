// Старый адрес «Моих оценок». Своей страницы у него больше нет: прогоны
// переехали на стену профиля, там же ими и управляют. Остаётся редирект —
// адрес мог остаться в закладках и в чужих ссылках.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function MyAnalysesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin');
  redirect(`/u/${userId}`);
}
