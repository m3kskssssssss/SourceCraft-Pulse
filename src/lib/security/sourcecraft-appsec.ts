// Провайдер SourceCraft AppSec — единственный источник балла «Безопасность».
//
// У AppSec свой API на отдельном хосте (appsec.sourcecraft.tech), в REST
// api.sourcecraft.tech его нет. Результаты сканеров он отдаёт только
// участникам репозитория: чужой токен получает 403. Поэтому ходим сюда только
// с токеном владельца, а без него честно отвечаем «нет данных».
//
// Эндпоинты:
//   GET /v1/scans/latest?gitRepo=<uuid>            — последний скан ветки по умолчанию
//   GET /v1/defect-groups?gitRepo=<uuid>&scanUuid=  — находки этого скана, постранично
// `gitRepo` — UUID репозитория из GET /repos/{org}/{repo}; путь org/repo API
// не принимает.
//
// Перечисления API отдаёт числами (protobuf), порядок — как в спецификации
// AppSec. Имена тоже принимаем: если API начнёт отдавать строки, разбор не
// сломается. Незнакомое значение не превращаем молча в «низкое».

import type {
  SecurityProvider,
  SecurityScanInput,
  SecurityScanResult,
  Severity,
  Vulnerability,
  VulnerabilityKind,
} from './types';

const APPSEC_BASE_URL = 'https://appsec.sourcecraft.tech';
const TIMEOUT_MS = 20_000;
/** Максимум API. */
const PAGE_SIZE = 250;
/** Больше тысячи групп дефектов для балла не нужно: шкала насыщается раньше. */
const MAX_PAGES = 4;

const SEVERITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const ENGINE_TYPES = [
  'UNSPECIFIED',
  'SECRETS',
  'SCA',
  'SAST',
  'SBOM_SPDX',
  'SBOM_CYCLONEDX',
  'DAST',
  'AI_AUDIT',
] as const;
const GROUP_STATUSES = [
  'OPEN',
  'RESOLVED_FIXED',
  'RESOLVED_FP',
  'RESOLVED_PROJECT_NOT_AFFECTED',
  'RESOLVED_TOLERABLE',
  'RESOLVED_DUPLICATE',
  'TRIAGE_IN_PROGRESS',
  'TRIAGED_TP',
  'FIX_IN_PROGRESS',
  'RESOLVED_AUTOFIXED',
] as const;
const SCAN_STATUSES = ['INITIATED', 'FINISHED', 'FAILED'] as const;

/**
 * Закрытые находки: исправлена, ложное срабатывание, не затрагивает, принятый
 * риск, дубликат. Всё остальное — в том числе незнакомый статус — считаем
 * открытым: спрятать реальную проблему хуже, чем показать лишнюю.
 */
const CLOSED_PREFIX = 'RESOLVED_';

type ScanSummary = {
  uuid?: string;
  status?: number | string;
  timeFinished?: number;
};

type DefectGroup = {
  id?: number | string;
  uuid?: string;
  ruleId?: string;
  ruleName?: string;
  severity?: number | string;
  engineType?: number | string;
  engine?: string;
  status?: number | string;
  fileName?: string;
};

type DefectGroupPage = {
  data?: DefectGroup[];
  nextPageToken?: string;
  totalSize?: number;
};

class AppSecHttpError extends Error {
  constructor(readonly status: number) {
    super(`appsec_http_${status}`);
  }
}

export class SourcecraftAppSecProvider implements SecurityProvider {
  readonly name = 'sourcecraft_appsec' as const;

  constructor(private readonly baseUrl: string = process.env.APPSEC_API_URL || APPSEC_BASE_URL) {}

  async scan(input: SecurityScanInput): Promise<SecurityScanResult> {
    if (!input.token) return this.noData('sourcecraft_appsec_needs_owner_token');
    if (!input.repositoryId) return this.noData('appsec_no_repository_id');

    try {
      const scan = await this.get<ScanSummary>('/v1/scans/latest', { gitRepo: input.repositoryId }, input.token);
      // 404: репозитория в AppSec нет — сканирование не включено или ещё не запускалось.
      if (scan === null) return this.noData('appsec_no_scan');
      if (enumName(scan.status, SCAN_STATUSES) !== 'FINISHED' || !scan.uuid) {
        return this.noData('appsec_scan_not_finished');
      }

      const vulnerabilities: Vulnerability[] = [];
      let total = 0;
      let seen = 0;
      let truncated = false;
      let pageToken = '';
      for (let page = 0; page < MAX_PAGES; page++) {
        const answer = await this.get<DefectGroupPage>(
          '/v1/defect-groups',
          {
            gitRepo: input.repositoryId,
            scanUuid: scan.uuid,
            pageSize: String(PAGE_SIZE),
            ...(pageToken ? { pageToken } : {}),
          },
          input.token,
        );
        const groups = answer?.data ?? [];
        seen += groups.length;
        total = typeof answer?.totalSize === 'number' ? answer.totalSize : seen;
        for (const group of groups) {
          const finding = toVulnerability(group);
          if (finding) vulnerabilities.push(finding);
        }
        pageToken = answer?.nextPageToken ?? '';
        if (!pageToken) break;
        if (page === MAX_PAGES - 1) truncated = true;
      }

      return {
        provider: this.name,
        available: true,
        vulnerabilities,
        totalScanned: Math.max(total, seen),
        errors: [],
        missing: truncated ? ['appsec_findings_truncated'] : [],
        scannedAt: epochToIso(scan.timeFinished),
        truncated,
      };
    } catch (err) {
      if (err instanceof AppSecHttpError && (err.status === 401 || err.status === 403)) {
        return this.noData('appsec_forbidden');
      }
      const reason = err instanceof Error ? err.message : 'appsec_failed';
      return { ...this.noData(), errors: [reason] };
    }
  }

  private noData(reason?: string): SecurityScanResult {
    return {
      provider: this.name,
      available: false,
      vulnerabilities: [],
      totalScanned: 0,
      errors: [],
      missing: reason ? [reason] : [],
    };
  }

  /** GET с таймаутом. 404 — null: «нет такой сущности», а не сбой. */
  private async get<T>(path: string, query: Record<string, string>, token: string): Promise<T | null> {
    const url = `${this.baseUrl}${path}?${new URLSearchParams(query)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new AppSecHttpError(response.status);
    return (await response.json()) as T;
  }
}

/** Открытая находка AppSec → общая модель уязвимости. Закрытые — null. */
export function toVulnerability(group: DefectGroup): Vulnerability | null {
  const status = enumName(group.status, GROUP_STATUSES);
  if (status.startsWith(CLOSED_PREFIX)) return null;

  // Секреты оцениваются отдельной метрикой и штрафом, поэтому критичность
  // оставляем той, что дал сканер: иначе один ключ бил бы по баллу трижды.
  const kind = toKind(enumName(group.engineType, ENGINE_TYPES));
  const severity = toSeverity(enumName(group.severity, SEVERITIES));
  const title = group.ruleName ?? group.ruleId ?? null;
  return {
    id: group.ruleId ?? group.uuid ?? String(group.id ?? title ?? 'appsec'),
    severity,
    package: group.fileName ?? title ?? '',
    version: null,
    ecosystem: group.engine ?? 'appsec',
    summary: title,
    // Открытая находка AppSec — это и есть «без исправления».
    fixedIn: null,
    kind,
    file: group.fileName ?? null,
  };
}

/** Число — по порядку перечисления, строка — как имя; прочее — UNRECOGNIZED. */
export function enumName(value: unknown, names: readonly string[]): string {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 0 && value < names.length ? names[value]! : 'UNRECOGNIZED';
  }
  if (typeof value === 'string' && value.trim()) {
    const upper = value.trim().toUpperCase();
    // Числа иногда приходят строкой: int64 в protobuf-JSON сериализуется так.
    if (/^\d+$/.test(upper)) return enumName(Number(upper), names);
    return upper;
  }
  return 'UNRECOGNIZED';
}

function toSeverity(name: string): Severity {
  switch (name) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    default:
      return 'unknown';
  }
}

function toKind(name: string): VulnerabilityKind {
  if (name === 'SECRETS') return 'secret';
  if (name === 'SCA') return 'sca';
  if (name === 'SAST') return 'sast';
  return 'other';
}

function epochToIso(value: unknown): string | null {
  const ms = typeof value === 'string' ? Number(value) : value;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
