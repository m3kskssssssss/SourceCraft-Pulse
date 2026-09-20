// Требования безопасности для админского аккаунта.
// Общие константы, чтобы CLI генерации хеша и login-action работали одинаково.

export const ADMIN_PASSWORD_MIN_LENGTH = 20;
export const FORBIDDEN_ADMIN_LOGINS: readonly string[] = ['admin', 'root', 'administrator'];

export type LoginPolicyResult = { ok: true } | { ok: false; reason: string };

export function checkAdminLoginPolicy(login: string): LoginPolicyResult {
  if (!login || typeof login !== 'string') return { ok: false, reason: 'Логин не задан' };
  const trimmed = login.trim();
  if (trimmed !== login) return { ok: false, reason: 'Логин не должен содержать пробелов по краям' };
  if (FORBIDDEN_ADMIN_LOGINS.includes(login.toLowerCase())) {
    return { ok: false, reason: 'Такой логин слишком очевиден и запрещён' };
  }
  if (login.length < 4 || login.length > 64) {
    return { ok: false, reason: 'Логин должен быть от 4 до 64 символов' };
  }
  return { ok: true };
}

export function checkAdminPasswordPolicy(password: string): LoginPolicyResult {
  if (!password || typeof password !== 'string') return { ok: false, reason: 'Пароль не задан' };
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: `Пароль должен быть не короче ${ADMIN_PASSWORD_MIN_LENGTH} символов` };
  }
  return { ok: true };
}
