// Клиент SourceCraft Public REST API.
//
// Одна инстанция на процесс через getSourcecraftClient(). Все методы:
//   - типизированы по components["schemas"] из types.gen.ts
//   - имеют retry на 429/5xx (экспоненциальный backoff + jitter, до 3 попыток)
//   - имеют таймаут 20 секунд через AbortController
//   - идут через общий семафор параллелизма (лимит 4)
//   - на ошибку кидают SourcecraftApiError с распакованным error_code и request_id
//
// Пагинация — cursor-based: у списковых ответов есть `next_page_token`.
// Для перебора всех страниц используйте асинхронный итератор через paginate().

import { setTimeout as sleep } from 'node:timers/promises';
import type { components } from './types.gen';
import { SourcecraftApiError, SourcecraftNotFoundError } from './errors';
import { Semaphore } from './semaphore';

// ---------- Публичные псевдонимы схем ----------

export type Repository = components['schemas']['Repository'];
export type RepositoryVisibility = components['schemas']['Repository.Visibility'];
export type RepositoryCounters = components['schemas']['RepositoryCounters'];
export type UserProfile = components['schemas']['UserProfile'];
export type Branch = components['schemas']['Branch'];
export type Tag = components['schemas']['v1.Tag'];
export type Release = components['schemas']['Release'];
export type PullRequest = components['schemas']['PullRequest'];
export type Issue = components['schemas']['Issue'];
export type TreeEntry = components['schemas']['TreeEntry'];
export type CiRun = components['schemas']['Run'];
export type SubjectRole = components['schemas']['SubjectRole'];
export type RepoRole = components['schemas']['RepoRole'];

// ---------- Общие настройки ----------

const DEFAULT_BASE_URL = 'https://api.sourcecraft.tech';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_CONCURRENCY = 4;
const RETRY_BASE_MS = 200;

/**
 * Лимит api.sourcecraft.tech — 10 запросов в секунду (ответ организаторов
 * хакатона). Семафор ограничивает только число одновременных запросов, а
 * быстрые ответы легко дают больше десяти в секунду — отсюда 429. Держим
 * запас: не чаще одного старта запроса в 125 мс, то есть 8 в секунду.
 * Очередь общая на процесс: и клиент Pulse, и клиенты с токенами
 * пользователей ходят в один и тот же хост.
 */
const MIN_REQUEST_INTERVAL_MS = 125;
let nextRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextRequestAt);
  nextRequestAt = slot + MIN_REQUEST_INTERVAL_MS;
  if (slot > now) await sleep(slot - now);
}

type QueryValue = string | number | boolean | undefined | null;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  timeoutMs?: number;
  maxAttempts?: number;
  /** Разрешить 404 — вернуть null вместо ошибки. */
  allowNotFound?: boolean;
};

export type PageParams = {
  pageSize?: number;
  pageToken?: string;
};

type PageResponse<K extends string, T> = { [P in K]?: T[] } & { next_page_token?: string };

// ---------- Клиент ----------

export class SourcecraftClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly semaphore: Semaphore;
  private readonly userAgent: string;

  constructor(options: {
    token: string;
    baseUrl?: string;
    concurrency?: number;
    userAgent?: string;
  }) {
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.semaphore = new Semaphore(options.concurrency ?? DEFAULT_CONCURRENCY);
    this.userAgent = options.userAgent ?? 'Pulse/0.1 (+https://github.com/m3kskssssssss/SourceCraft-Pulse)';
  }

  // ---- Ядро ----

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    return this.semaphore.run(async () => {
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        await throttle();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(this.buildUrl(path, options.query), {
            method,
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: 'application/json',
              'User-Agent': this.userAgent,
              ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });

          if (response.status === 404 && options.allowNotFound) {
            return null as T;
          }

          if (response.status >= 200 && response.status < 300) {
            // 204 без тела — редкость, но возможна
            if (response.status === 204) return null as T;
            return (await response.json()) as T;
          }

          if (isRetryable(response.status) && attempt < maxAttempts) {
            lastError = await SourcecraftApiError.fromResponse(response);
            await sleep(backoffMs(attempt));
            continue;
          }

          if (response.status === 404) {
            const err = await SourcecraftApiError.fromResponse(response);
            throw new SourcecraftNotFoundError(err.errorCode, err.requestId, err.message);
          }

          throw await SourcecraftApiError.fromResponse(response);
        } catch (error: unknown) {
          // Сетевая ошибка / abort / retry на исключении
          const isAbort =
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name?: string }).name === 'AbortError';
          const isRetryableError = isAbort || isNetworkError(error);

          if (error instanceof SourcecraftApiError && !isRetryable(error.status)) {
            throw error;
          }
          if (isRetryableError && attempt < maxAttempts) {
            lastError = error;
            await sleep(backoffMs(attempt));
            continue;
          }
          throw error;
        } finally {
          clearTimeout(timer);
        }
      }

      throw lastError ?? new Error('SourceCraft: retries exhausted');
    });
  }

  // ---- Итератор страниц ----

  /**
   * Оборачивает пагинационный вызов в асинхронный итератор.
   * Пример: `for await (const item of client.paginate(...)) { ... }`
   */
  async *paginate<K extends string, T>(
    fetcher: (params: PageParams) => Promise<PageResponse<K, T>>,
    itemsKey: K,
    initialPageSize?: number,
  ): AsyncIterableIterator<T> {
    let pageToken: string | undefined = undefined;
    for (;;) {
      const page: PageResponse<K, T> = await fetcher({
        pageSize: initialPageSize,
        pageToken,
      });
      const items = page[itemsKey] ?? [];
      for (const item of items) yield item;
      pageToken = page.next_page_token;
      if (!pageToken) return;
    }
  }

  /** Собирает все страницы в массив, ограничиваясь maxItems. */
  async collect<K extends string, T>(
    fetcher: (params: PageParams) => Promise<PageResponse<K, T>>,
    itemsKey: K,
    maxItems: number,
    pageSize?: number,
  ): Promise<T[]> {
    const result: T[] = [];
    for await (const item of this.paginate(fetcher, itemsKey, pageSize)) {
      result.push(item);
      if (result.length >= maxItems) break;
    }
    return result;
  }

  // ---- Эндпоинты ----

  /**
   * Discover: список репозиториев, доступных токену.
   * Публичного глобального списка нет, поэтому это по факту «репозитории вашего/-их
   * SourceCraft-аккаунта(ов)». Для seed на демо этого достаточно.
   */
  discoverRepositories(
    params: PageParams & { filter?: string; sortBy?: string } = {},
  ): Promise<PageResponse<'repositories', Repository>> {
    return this.request('/repos', {
      query: {
        ...pageQuery(params),
        filter: params.filter,
        sort_by: params.sortBy,
      },
    });
  }

  getRepository(orgSlug: string, repoSlug: string): Promise<Repository> {
    return this.request<Repository>(`/repos/${encode(orgSlug)}/${encode(repoSlug)}`);
  }

  /** Профиль владельца токена. С общим токеном Pulse — сам Pulse, с личным — пользователь. */
  getCurrentUser(): Promise<UserProfile> {
    return this.request<UserProfile>('/user');
  }

  /**
   * Репозитории, доступные владельцу токена: личные и из его организаций.
   * GET /me/repos — эндпоинт добавлен SourceCraft во время хакатона
   * (объявление от 23.09) и в нашей копии спецификации его ещё нет, поэтому
   * тип ответа — тот же, что у списка репозиториев организации.
   */
  listMyRepositories(params: PageParams = {}): Promise<PageResponse<'repositories', Repository>> {
    return this.request('/me/repos', { query: pageQuery(params) });
  }

  /** CI-прогоны репозитория. Отдаются только с токеном участника репозитория. */
  listCiRuns(
    orgSlug: string,
    repoSlug: string,
    params: PageParams = {},
  ): Promise<PageResponse<'runs', CiRun>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/cicd/runs`, {
      query: pageQuery(params),
    });
  }

  listOrganizationRepositories(
    orgSlug: string,
    params: PageParams = {},
  ): Promise<PageResponse<'repositories', Repository>> {
    return this.request(`/orgs/${encode(orgSlug)}/repos`, { query: pageQuery(params) });
  }

  /** Открыть pull request из уже отправленной ветки. */
  createPullRequest(
    orgSlug: string,
    repoSlug: string,
    body: components['schemas']['CreatePullRequestBody'],
  ): Promise<PullRequest> {
    return this.request<PullRequest>(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/pulls`, {
      method: 'POST',
      body,
      // Повтор POST создал бы второй PR — пробуем один раз.
      maxAttempts: 1,
    });
  }

  listRepoRoles(
    orgSlug: string,
    repoSlug: string,
    params: PageParams = {},
  ): Promise<PageResponse<'subject_roles', SubjectRole>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/roles`, {
      query: pageQuery(params),
    });
  }

  listContributors(
    orgSlug: string,
    repoSlug: string,
    params: PageParams = {},
  ): Promise<PageResponse<'contributors', UserProfile>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/contributors`, {
      query: pageQuery(params),
    });
  }

  listTree(
    orgSlug: string,
    repoSlug: string,
    params: PageParams & { revision?: string; path?: string; recursive?: boolean } = {},
  ): Promise<PageResponse<'trees', TreeEntry>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/trees`, {
      query: {
        ...pageQuery(params),
        revision: params.revision,
        path: params.path,
        recursive: params.recursive,
      },
    });
  }

  listBranches(
    orgSlug: string,
    repoSlug: string,
    params: PageParams & { filter?: string; sortBy?: string } = {},
  ): Promise<PageResponse<'branches', Branch>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/branches`, {
      query: {
        ...pageQuery(params),
        filter: params.filter,
        sort_by: params.sortBy,
      },
    });
  }

  listTags(
    orgSlug: string,
    repoSlug: string,
    params: PageParams & { filter?: string; sortBy?: string } = {},
  ): Promise<PageResponse<'tags', Tag>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/tags`, {
      query: {
        ...pageQuery(params),
        filter: params.filter,
        sort_by: params.sortBy,
      },
    });
  }

  listReleases(
    orgSlug: string,
    repoSlug: string,
    params: PageParams & { sortBy?: string } = {},
  ): Promise<PageResponse<'releases', Release>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/releases`, {
      query: {
        ...pageQuery(params),
        sort_by: params.sortBy,
      },
    });
  }

  getLatestRelease(orgSlug: string, repoSlug: string): Promise<Release | null> {
    return this.request<Release | null>(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/releases/latest`,
      { allowNotFound: true },
    );
  }

  listPullRequests(
    orgSlug: string,
    repoSlug: string,
    params: PageParams & { filter?: string; sortBy?: string } = {},
  ): Promise<PageResponse<'pull_requests', PullRequest>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/pulls`, {
      query: {
        ...pageQuery(params),
        filter: params.filter,
        sort_by: params.sortBy,
      },
    });
  }

  getPullRequest(orgSlug: string, repoSlug: string, pullSlug: string): Promise<PullRequest> {
    return this.request<PullRequest>(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/pulls/${encode(pullSlug)}`,
    );
  }

  listPullRequestComments(
    orgSlug: string,
    repoSlug: string,
    pullSlug: string,
    params: PageParams = {},
  ) {
    return this.request(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/pulls/${encode(pullSlug)}/comments`,
      { query: pageQuery(params) },
    );
  }

  listPullRequestFiles(
    orgSlug: string,
    repoSlug: string,
    pullSlug: string,
    params: PageParams = {},
  ) {
    return this.request(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/pulls/${encode(pullSlug)}/files`,
      { query: pageQuery(params) },
    );
  }

  listPullRequestReviewers(
    orgSlug: string,
    repoSlug: string,
    pullSlug: string,
    params: PageParams = {},
  ) {
    return this.request(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/pulls/${encode(pullSlug)}/reviewers`,
      { query: pageQuery(params) },
    );
  }

  listIssues(
    orgSlug: string,
    repoSlug: string,
    params: PageParams & { filter?: string; sortBy?: string } = {},
  ): Promise<PageResponse<'issues', Issue>> {
    return this.request(`/repos/${encode(orgSlug)}/${encode(repoSlug)}/issues`, {
      query: {
        ...pageQuery(params),
        filter: params.filter,
        sort_by: params.sortBy,
      },
    });
  }

  getIssue(orgSlug: string, repoSlug: string, issueSlug: string): Promise<Issue> {
    return this.request<Issue>(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/issues/${encode(issueSlug)}`,
    );
  }

  listIssueComments(orgSlug: string, repoSlug: string, issueSlug: string, params: PageParams = {}) {
    return this.request(
      `/repos/${encode(orgSlug)}/${encode(repoSlug)}/issues/${encode(issueSlug)}/comments`,
      { query: pageQuery(params) },
    );
  }
}

// ---------- Утилиты ----------

function encode(segment: string): string {
  return encodeURIComponent(segment);
}

function pageQuery(params: PageParams): Record<string, QueryValue> {
  return {
    page_size: params.pageSize,
    page_token: params.pageToken,
  };
}

function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function isNetworkError(error: unknown): boolean {
  // fetch кидает TypeError на сетевых сбоях; undici-варианты также распознаём.
  if (error instanceof TypeError) return true;
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH'].includes(code)) {
      return true;
    }
  }
  return false;
}

function backoffMs(attempt: number): number {
  const base = RETRY_BASE_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * base);
  return base + jitter;
}

// ---------- Фабрика ----------

let cached: SourcecraftClient | null = null;

export function getSourcecraftClient(): SourcecraftClient {
  if (cached) return cached;
  const token = process.env.SOURCECRAFT_PAT;
  if (!token) {
    throw new Error(
      'SOURCECRAFT_PAT не задан. Получите personal access token в SourceCraft и добавьте в .env.',
    );
  }
  cached = new SourcecraftClient({ token });
  return cached;
}

/** Только для тестов — сбрасывает закешированную инстанцию. */
export function resetSourcecraftClientForTesting(): void {
  cached = null;
}
