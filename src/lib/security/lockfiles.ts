// Парсеры lock-файлов. Возвращают массив ResolvedDependency в формате OSV
// (ecosystem = 'npm' | 'PyPI' | ...). Если файл не поддержан — добавляем его
// имя в unsupported и получатель отражает это в missing.
//
// В MVP поддерживаем: package-lock.json (npm), pnpm-lock.yaml.
// Всё остальное — записываем в unsupported как честный «нет данных».

import { parse as parseYaml } from 'yaml';
import type { ResolvedDependency } from './types';

export const SUPPORTED_LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml'] as const;

export const KNOWN_UNSUPPORTED_LOCKFILES = [
  'yarn.lock',
  'Cargo.lock',
  'go.sum',
  'poetry.lock',
  'Pipfile.lock',
  'Gemfile.lock',
  'composer.lock',
  'mix.lock',
] as const;

export type LockfilesInput = {
  packageLockJson?: string; // содержимое package-lock.json
  pnpmLockYaml?: string; // содержимое pnpm-lock.yaml
  /** Имена lock-файлов, встреченных в репо, но не поддержанных парсерами. */
  unsupportedFound?: string[];
};

export type LockfilesParseResult = {
  dependencies: ResolvedDependency[];
  unsupported: string[]; // lock-файлы, найденные в репо, но не разобранные
  errors: string[];
};

export function parseLockfiles(input: LockfilesInput): LockfilesParseResult {
  const dependencies: ResolvedDependency[] = [];
  const errors: string[] = [];
  const unsupported = [...(input.unsupportedFound ?? [])];

  if (input.packageLockJson) {
    try {
      dependencies.push(...parsePackageLock(input.packageLockJson));
    } catch (err) {
      errors.push(`package-lock.json: ${describe(err)}`);
    }
  }

  if (input.pnpmLockYaml) {
    try {
      dependencies.push(...parsePnpmLock(input.pnpmLockYaml));
    } catch (err) {
      errors.push(`pnpm-lock.yaml: ${describe(err)}`);
    }
  }

  return { dependencies: dedupe(dependencies), unsupported: dedupeStrings(unsupported), errors };
}

// ---------- package-lock.json ----------

type PackageLockV2 = {
  lockfileVersion?: number;
  packages?: Record<string, { version?: string; dev?: boolean; optional?: boolean }>;
  dependencies?: Record<string, { version?: string; requires?: Record<string, string> }>;
};

function parsePackageLock(text: string): ResolvedDependency[] {
  const data = JSON.parse(text) as PackageLockV2;
  const results: ResolvedDependency[] = [];

  // lockfileVersion 2/3 — используем поле "packages"
  if (data.packages) {
    for (const [key, value] of Object.entries(data.packages)) {
      if (!key) continue; // корневой пакет "" — пропускаем
      // Ключ вида "node_modules/foo" или "node_modules/@scope/bar" или "node_modules/foo/node_modules/bar"
      const name = extractPackageNameFromNodeModulesKey(key);
      if (!name || !value.version) continue;
      results.push({ ecosystem: 'npm', name, version: value.version });
    }
    return results;
  }

  // lockfileVersion 1 — используем "dependencies" (плоский рекурсивный обход)
  if (data.dependencies) {
    walkV1(data.dependencies, results);
  }
  return results;
}

function extractPackageNameFromNodeModulesKey(key: string): string | null {
  // Ищем последнее вхождение "node_modules/" и берём то, что после.
  const idx = key.lastIndexOf('node_modules/');
  if (idx < 0) return null;
  return key.slice(idx + 'node_modules/'.length);
}

function walkV1(
  deps: Record<string, { version?: string; requires?: Record<string, string>; dependencies?: Record<string, { version?: string }> }>,
  out: ResolvedDependency[],
): void {
  for (const [name, meta] of Object.entries(deps)) {
    if (meta.version) out.push({ ecosystem: 'npm', name, version: meta.version });
    if (meta.dependencies) walkV1(meta.dependencies, out);
  }
}

// ---------- pnpm-lock.yaml ----------

type PnpmLockRoot = {
  lockfileVersion?: string | number;
  // v9+: packages: Record<string, {...}> и snapshots: Record<string, {...}>
  packages?: Record<string, unknown>;
  snapshots?: Record<string, unknown>;
  // v6-v8: packages: Record<'/name@version', {...}>
};

function parsePnpmLock(text: string): ResolvedDependency[] {
  const doc = parseYaml(text) as PnpmLockRoot;
  const results: ResolvedDependency[] = [];
  const seen = new Set<string>();

  const consumeKey = (key: string): void => {
    // v9 формат: 'foo@1.2.3' или '@scope/foo@1.2.3'
    // v6-v8 формат: '/foo@1.2.3' или '/@scope/foo@1.2.3(peer@x)'
    let clean = key.startsWith('/') ? key.slice(1) : key;
    // Отрезаем peer-часть в скобках: 'foo@1.2.3(react@18.0.0)' → 'foo@1.2.3'
    const parenIdx = clean.indexOf('(');
    if (parenIdx > 0) clean = clean.slice(0, parenIdx);
    // Разбираем на name@version
    const at = clean.lastIndexOf('@');
    if (at <= 0) return; // scoped-имя начинается с '@', так что at > 0 обязательно
    const name = clean.slice(0, at);
    const version = clean.slice(at + 1);
    if (!name || !version) return;
    const dedupeKey = `${name}@${version}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    results.push({ ecosystem: 'npm', name, version });
  };

  if (doc.snapshots) {
    for (const key of Object.keys(doc.snapshots)) consumeKey(key);
  }
  if (doc.packages) {
    for (const key of Object.keys(doc.packages)) consumeKey(key);
  }

  return results;
}

// ---------- helpers ----------

function dedupe(deps: ResolvedDependency[]): ResolvedDependency[] {
  const seen = new Set<string>();
  const out: ResolvedDependency[] = [];
  for (const d of deps) {
    const k = `${d.ecosystem}/${d.name}@${d.version}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(d);
  }
  return out;
}

function dedupeStrings(items: string[]): string[] {
  return Array.from(new Set(items));
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
