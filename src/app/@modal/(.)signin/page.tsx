// Вход/регистрация окном поверх текущей страницы: сюда попадает переход на
// /signin изнутри сайта. Прямая ссылка и обновление открывают обычную страницу.

import { AuthModal } from '@/app/components/AuthModal';
import { SignInPanel, hasLiveSession } from '@/app/components/AuthPanels';

export default async function SignInModal() {
  if (await hasLiveSession()) return null;
  return (
    <AuthModal>
      <SignInPanel inModal />
    </AuthModal>
  );
}
