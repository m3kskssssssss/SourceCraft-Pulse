import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourcecraftAppSecProvider, enumName, toVulnerability } from '../security/sourcecraft-appsec';
import type { SecurityScanInput } from '../security/types';
import { appSecCategoryScore } from '../scoring/metrics/security';

const input: SecurityScanInput = {
  dependencies: [],
  hasSecurityMd: false,
  unsupportedLockfiles: [],
  repositoryId: '01a0c608-54ba-7663-8b5a-8732baab3f92',
  token: 'owner-token',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('enumName', () => {
  it('число — по порядку перечисления, строка — как имя', () => {
    const names = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    expect(enumName(4, names)).toBe('CRITICAL');
    expect(enumName('high', names)).toBe('HIGH');
    expect(enumName('3', names)).toBe('HIGH');
  });

  it('незнакомое значение не превращается в низкое', () => {
    expect(enumName(9, ['NONE', 'LOW'])).toBe('UNRECOGNIZED');
    expect(enumName(undefined, ['NONE'])).toBe('UNRECOGNIZED');
  });
});

describe('toVulnerability', () => {
  it('закрытые находки пропускает', () => {
    expect(toVulnerability({ severity: 4, status: 1 })).toBeNull();
    expect(toVulnerability({ severity: 4, status: 'RESOLVED_FP' })).toBeNull();
  });

  it('открытые и «в работе» оставляет, тип и критичность расшифровывает', () => {
    const open = toVulnerability({ ruleId: 'sqli', severity: 3, engineType: 3, status: 0, fileName: 'a.ts' });
    expect(open).toMatchObject({ id: 'sqli', severity: 'high', kind: 'sast', file: 'a.ts', fixedIn: null });
    const fixing = toVulnerability({ ruleId: 'x', severity: 2, engineType: 2, status: 'FIX_IN_PROGRESS' });
    expect(fixing).toMatchObject({ severity: 'medium', kind: 'sca' });
  });

  it('секрет помечает отдельным типом', () => {
    expect(toVulnerability({ ruleName: 'generic-api-key', severity: 3, engineType: 1, status: 0 })?.kind).toBe(
      'secret',
    );
  });
});

describe('SourcecraftAppSecProvider', () => {
  it('без токена владельца никуда не ходит', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await new SourcecraftAppSecProvider().scan({ ...input, token: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.available).toBe(false);
    expect(result.missing).toEqual(['sourcecraft_appsec_needs_owner_token']);
  });

  it('скана нет (404) — нет данных, а не «уязвимостей нет»', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Entity not found' }, 404)));
    const result = await new SourcecraftAppSecProvider().scan(input);
    expect(result.available).toBe(false);
    expect(result.missing).toEqual(['appsec_no_scan']);
  });

  it('чужой токен (403) — нет данных', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 403)));
    const result = await new SourcecraftAppSecProvider().scan(input);
    expect(result.missing).toEqual(['appsec_forbidden']);
  });

  it('незавершённый скан не считается', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ uuid: 's1', status: 0 })));
    const result = await new SourcecraftAppSecProvider().scan(input);
    expect(result.missing).toEqual(['appsec_scan_not_finished']);
  });

  it('завершённый скан: читает находки этого скана постранично', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.includes('/v1/scans/latest')) return json({ uuid: 's1', status: 1, timeFinished: 1_758_800_000_000 });
        if (!url.includes('pageToken')) {
          return json({ data: [{ ruleId: 'a', severity: 4, engineType: 2, status: 0 }], nextPageToken: 'p2', totalSize: 2 });
        }
        return json({ data: [{ ruleId: 'b', severity: 1, engineType: 3, status: 2 }], totalSize: 2 });
      }),
    );
    const result = await new SourcecraftAppSecProvider('https://appsec.test').scan(input);
    expect(result.available).toBe(true);
    expect(result.totalScanned).toBe(2);
    // Вторая находка исправлена — в список не попадает.
    expect(result.vulnerabilities.map((v) => v.id)).toEqual(['a']);
    expect(result.scannedAt).toMatch(/^2025-/);
    expect(calls[0]).toContain('gitRepo=01a0c608');
    expect(calls[1]).toContain('scanUuid=s1');
    expect(calls[2]).toContain('pageToken=p2');
  });
});

describe('appSecCategoryScore', () => {
  const base = { provider: 'sourcecraft_appsec' as const, available: true, totalScanned: 0, errors: [], missing: [] };

  it('без находок — 100, без данных — null', () => {
    expect(appSecCategoryScore({ ...base, vulnerabilities: [] })).toBe(100);
    expect(appSecCategoryScore({ ...base, available: false, vulnerabilities: [] })).toBeNull();
  });

  it('та же формула, что в оценке: critical и секрет снижают балл', () => {
    const finding = { package: '', version: null, ecosystem: 'appsec', summary: null, fixedIn: null };
    const score = appSecCategoryScore({
      ...base,
      vulnerabilities: [
        { ...finding, id: 'a', severity: 'critical', kind: 'sca' },
        { ...finding, id: 'b', severity: 'high', kind: 'secret' },
      ],
    });
    // critical: 1 из 3 → 66.7 × 0.35; high: 1 из 10 → 90 × 0.25; medium 100 × 0.15; секреты 0.
    expect(score).toBe(Math.round((200 / 3) * 0.35 + 90 * 0.25 + 100 * 0.15));
  });
});
