// Общие типы для SecurityProvider'ов. Совпадают формой с тем, что понадобится
// движку оценки на Этапе 3.

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export type Vulnerability = {
  id: string; // GHSA-*, CVE-*, OSV-* и т. п.
  severity: Severity;
  package: string;
  version: string | null;
  ecosystem: string; // 'npm', 'PyPI', ...
  summary: string | null;
  fixedIn: string[] | null; // список версий, где исправлено
};

/** Разобранная запись из lock-файла. */
export type ResolvedDependency = {
  ecosystem: string; // формат OSV, например 'npm', 'PyPI'
  name: string;
  version: string;
};

export type SecurityScanInput = {
  /** Резолвленные зависимости из lock-файлов (npm, pnpm, poetry, ...). */
  dependencies: ResolvedDependency[];
  /** Флаги наличия ключевых файлов (SECURITY.md и т.п.) — пригодится Этапу 3. */
  hasSecurityMd: boolean;
  /** Отсутствующие / не поддержанные lock-файлы, чтобы честно отчитаться в missing. */
  unsupportedLockfiles: string[];
};

export type SecurityScanResult = {
  provider: 'sourcecraft_appsec' | 'osv_dev';
  available: boolean;
  vulnerabilities: Vulnerability[];
  totalScanned: number;
  errors: string[];
  missing: string[];
};

export interface SecurityProvider {
  readonly name: SecurityScanResult['provider'];
  scan(input: SecurityScanInput): Promise<SecurityScanResult>;
}
