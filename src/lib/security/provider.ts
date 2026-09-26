// Провайдеры безопасности.
//
// Балл категории «Безопасность» по ТЗ считается только по данным SourceCraft
// AppSec. Пока их нет в публичном API, провайдер отвечает «нет данных» — и
// категория честно исключается из расчёта, а не подменяется своим сканом.
//
// OSV.dev — отдельный справочный провайдер: сверяет lock-файлы с открытой
// базой уязвимостей. Его результат показывается на странице анализа с
// подписью «по данным OSV.dev, не SourceCraft AppSec» и в балл не входит.

import { OsvDevProvider } from './osv-dev';
import { SourcecraftAppSecProvider } from './sourcecraft-appsec';
import type { SecurityProvider } from './types';

let appSec: SecurityProvider | null = null;
let osv: SecurityProvider | null = null;

/** Источник балла категории «Безопасность» — только AppSec. */
export function getSecurityProvider(): SecurityProvider {
  appSec ??= new SourcecraftAppSecProvider();
  return appSec;
}

/** Справочная проверка зависимостей по OSV.dev — в балл не входит. */
export function getDependencyAuditProvider(): SecurityProvider {
  osv ??= new OsvDevProvider();
  return osv;
}

export function resetSecurityProviderForTesting(): void {
  appSec = null;
  osv = null;
}
