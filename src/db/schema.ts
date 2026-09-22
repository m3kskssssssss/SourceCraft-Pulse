// Схема БД для Pulse. Одна миграция на весь начальный набор таблиц,
// чтобы не разносить схему по множеству мелких миграций между этапами.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------- Перечисления ----------

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const analysisStatusEnum = pgEnum('analysis_status', [
  'queued',
  'running',
  'done',
  'failed',
]);

// ---------- Пользователи и авторизация ----------
// Часть колонок нужна Auth.js v5 (email, emailVerified, image, name),
// часть — прикладная (role, provider*). Полностью придерживаемся адаптера Drizzle
// для Auth.js: users, accounts, sessions, verificationTokens.

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  image: text('image'), // Auth.js использует это поле
  provider: text('provider'),
  providerId: text('provider_id'),
  /** argon2id-хеш пароля для credentials-провайдера. Null для OAuth-пользователей. */
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull().default('user'),
  blockedAt: timestamp('blocked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// ---------- Репозитории и анализы ----------

export const repositories = pgTable(
  'repositories',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgSlug: varchar('org_slug', { length: 128 }).notNull(),
    repoSlug: varchar('repo_slug', { length: 128 }).notNull(),
    language: text('language'),
    description: text('description'),
    defaultBranch: text('default_branch'),
    cloneUrl: text('clone_url'),
    webUrl: text('web_url'),
    forksCount: integer('forks_count'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    orgRepoUnique: uniqueIndex('repositories_org_repo_unique').on(t.orgSlug, t.repoSlug),
    // Фильтр рейтинга по языку и сортировка «по популярности».
    byLanguage: index('repositories_language_idx').on(t.language),
    byForks: index('repositories_forks_count_idx').on(t.forksCount.desc()),
  }),
);

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: analysisStatusEnum('status').notNull().default('queued'),
    /** 'project' | 'material' | 'unclear' — подборку ссылок не оцениваем как код. */
    kind: text('kind'),
    /** Текущая фаза прогона (см. lib/stages.ts). Нужна странице ожидания. */
    stage: text('stage'),
    score: integer('score'),
    categoryScores: jsonb('category_scores'),
    metrics: jsonb('metrics'),
    recommendations: jsonb('recommendations'),
    missing: jsonb('missing'),
    isPublic: boolean('is_public').notNull().default(false),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => ({
    byRepo: index('analyses_repository_id_idx').on(t.repositoryId),
    byRequestedBy: index('analyses_requested_by_idx').on(t.requestedBy),
    byPublic: index('analyses_is_public_idx').on(t.isPublic),
    // Рейтинг: отбор по «опубликован и посчитан» плюс сортировка по баллу.
    byPublicScore: index('analyses_public_score_idx').on(
      t.isPublic,
      t.status,
      t.score.desc(),
    ),
    // История репозитория и «последний публичный прогон».
    byRepoFinished: index('analyses_repo_finished_idx').on(t.repositoryId, t.finishedAt.desc()),
  }),
);

// ---------- Очередь фоновых задач ----------

export const analysisJobs = pgTable(
  'analysis_jobs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    attempts: integer('attempts').notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),
    lockedBy: text('locked_by'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byLockedAt: index('analysis_jobs_locked_at_idx').on(t.lockedAt),
    byAnalysis: index('analysis_jobs_analysis_id_idx').on(t.analysisId),
  }),
);

// ---------- Учёт вызовов ИИ ----------

export const aiCalls = pgTable(
  'ai_calls',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    analysisId: uuid('analysis_id').references(() => analyses.id, {
      onDelete: 'set null',
    }),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    task: text('task').notNull(), // 'readme_rubric' | 'code_review' | 'pr_issues_digest' | 'recommendation_copy'
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    costRub: numeric('cost_rub', { precision: 12, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull().default(0),
    status: text('status').notNull(), // 'ok' | 'cached' | 'error' | 'budget_exceeded'
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byCreatedAt: index('ai_calls_created_at_idx').on(t.createdAt),
    byAnalysis: index('ai_calls_analysis_id_idx').on(t.analysisId),
  }),
);

// Кэш ответов ИИ по хэшу входа. Ключ — SHA-256 от «task + input».
export const aiCache = pgTable(
  'ai_cache',
  {
    hash: text('hash').primaryKey(),
    task: text('task').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    response: jsonb('response').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
);

// ---------- Настройки приложения (для админки) ----------
// Ключ → JSON. Известные ключи:
//   ai.model            — активная модель роутера
//   ai.monthly_budget   — месячный бюджет ИИ в рублях
//   limits.user_daily   — суточный лимит анализов на пользователя
//   limits.user_concurrent — одновременных анализов на пользователя

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
});

// ---------- Общий журнал событий для админки ----------

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byCreatedAt: index('events_created_at_idx').on(t.createdAt),
    byKind: index('events_kind_idx').on(t.kind),
  }),
);
