// Реальный SecurityProvider поверх https://osv.dev.
// Отправляем зависимости батчами в POST /v1/querybatch (до 1000 пакетов).
// В ответ приходят массивы уязвимостей — сопоставляем по индексу.

import { z } from 'zod';
import type {
  SecurityProvider,
  SecurityScanInput,
  SecurityScanResult,
  Severity,
  Vulnerability,
} from './types';

const OSV_ENDPOINT = 'https://api.osv.dev/v1/querybatch';
const BATCH_LIMIT = 1000;
const TIMEOUT_MS = 30_000;

const osvQuerySchema = z.object({
  results: z.array(
    z.object({
      vulns: z
        .array(
          z.object({
            id: z.string(),
          }),
        )
        .optional(),
    }),
  ),
});

const osvDetailSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  severity: z
    .array(z.object({ type: z.string().optional(), score: z.string().optional() }))
    .optional(),
  database_specific: z
    .object({
      severity: z.string().optional(),
    })
    .optional(),
  affected: z
    .array(
      z.object({
        package: z
          .object({ name: z.string().optional(), ecosystem: z.string().optional() })
          .optional(),
        ranges: z
          .array(
            z.object({
              type: z.string().optional(),
              events: z
                .array(z.object({ introduced: z.string().optional(), fixed: z.string().optional() }))
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export class OsvDevProvider implements SecurityProvider {
  readonly name = 'osv_dev' as const;

  async scan(input: SecurityScanInput): Promise<SecurityScanResult> {
    const errors: string[] = [];
    const missing: string[] = [];
    for (const lock of input.unsupportedLockfiles) {
      missing.push(`deps_lockfile_unsupported:${lock}`);
    }

    if (input.dependencies.length === 0) {
      return {
        provider: this.name,
        available: true,
        vulnerabilities: [],
        totalScanned: 0,
        errors,
        missing: missing.length > 0 ? missing : ['no_supported_lockfile_found'],
      };
    }

    // batch requests
    const vulnIds = new Map<string, { dep: (typeof input.dependencies)[number] }>();
    for (let start = 0; start < input.dependencies.length; start += BATCH_LIMIT) {
      const chunk = input.dependencies.slice(start, start + BATCH_LIMIT);
      const body = {
        queries: chunk.map((d) => ({
          package: { name: d.name, ecosystem: d.ecosystem },
          version: d.version,
        })),
      };

      let json: unknown;
      try {
        json = await fetchJson(OSV_ENDPOINT, body);
      } catch (err) {
        errors.push(`osv_batch_failed: ${describe(err)}`);
        continue;
      }

      const parsed = osvQuerySchema.safeParse(json);
      if (!parsed.success) {
        errors.push(`osv_batch_parse_failed: ${parsed.error.message}`);
        continue;
      }

      parsed.data.results.forEach((entry, i) => {
        const dep = chunk[i];
        if (!dep) return;
        for (const v of entry.vulns ?? []) {
          if (!vulnIds.has(v.id)) vulnIds.set(v.id, { dep });
        }
      });
    }

    // получить детали для каждого уникального id (severity, fixedIn)
    const vulnerabilities: Vulnerability[] = [];
    for (const [id, { dep }] of vulnIds) {
      let detail: unknown = null;
      try {
        detail = await fetchJson(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, null, 'GET');
      } catch (err) {
        errors.push(`osv_detail_failed:${id}: ${describe(err)}`);
      }

      const parsed = detail ? osvDetailSchema.safeParse(detail) : null;
      const severity = parsed?.success ? extractSeverity(parsed.data) : 'unknown';
      const fixedIn = parsed?.success ? extractFixedIn(parsed.data, dep.name) : null;
      const summary = parsed?.success ? parsed.data.summary ?? null : null;

      vulnerabilities.push({
        id,
        severity,
        package: dep.name,
        version: dep.version,
        ecosystem: dep.ecosystem,
        summary,
        fixedIn,
      });
    }

    return {
      provider: this.name,
      available: true,
      vulnerabilities,
      totalScanned: input.dependencies.length,
      errors,
      missing,
    };
  }
}

// ---------- helpers ----------

async function fetchJson(
  url: string,
  body: unknown,
  method: 'GET' | 'POST' = 'POST',
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        'User-Agent': 'Pulse/0.1',
      },
      body: method !== 'GET' && body !== null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`osv.dev ${method} ${url} → ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractSeverity(detail: z.infer<typeof osvDetailSchema>): Severity {
  const raw = detail.database_specific?.severity?.toLowerCase();
  if (raw === 'critical' || raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  // fallback: CVSS score
  const cvss = detail.severity?.find((s) => s.type === 'CVSS_V3' || s.type === 'CVSS_V2');
  if (cvss?.score) {
    const match = /(\d+(?:\.\d+)?)/.exec(cvss.score);
    if (match) {
      const value = Number.parseFloat(match[1]!);
      if (value >= 9) return 'critical';
      if (value >= 7) return 'high';
      if (value >= 4) return 'medium';
      if (value > 0) return 'low';
    }
  }
  return 'unknown';
}

function extractFixedIn(detail: z.infer<typeof osvDetailSchema>, name: string): string[] | null {
  const versions: string[] = [];
  for (const affected of detail.affected ?? []) {
    if (affected.package?.name && affected.package.name !== name) continue;
    for (const range of affected.ranges ?? []) {
      for (const ev of range.events ?? []) {
        if (ev.fixed) versions.push(ev.fixed);
      }
    }
  }
  return versions.length > 0 ? Array.from(new Set(versions)) : null;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
