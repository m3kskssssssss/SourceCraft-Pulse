// Общие константы для админ-сессии. Отдельный файл, чтобы Edge-модуль
// admin-session-edge.ts мог их импортировать без риска задеть node:crypto.

export const ADMIN_COOKIE_NAME = 'pulse-admin-session';
export const ADMIN_SESSION_MAX_AGE_SEC = 2 * 3600;
