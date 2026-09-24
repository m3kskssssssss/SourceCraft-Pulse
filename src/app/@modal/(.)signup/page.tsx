// Вход/регистрация окном поверх текущей страницы: сюда попадает переход на
// /signup изнутри сайта. Прямая ссылка и обновление открывают обычную страницу.

import { AuthModal } from '@/app/components/AuthModal';
import { SignUpPanel, hasLiveSession } from '@/app/components/AuthPanels';

export default async function SignUpModal() {
  if (await hasLiveSession()) return null;
  return (
    <AuthModal>
      <SignUpPanel inModal />
    </AuthModal>
  );
}
