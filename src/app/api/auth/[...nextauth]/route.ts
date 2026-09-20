// Роут-обёртка Auth.js. Экспортирует GET/POST для всех /api/auth/* путей.

import { handlers } from '@/auth';

export const { GET, POST } = handlers;

export const dynamic = 'force-dynamic';
