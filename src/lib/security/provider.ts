// Фабрика провайдера безопасности.
// По умолчанию — OSV.dev. Реализация SourceCraft AppSec — заглушка,
// подключается флагом окружения только для будущей интеграции.

import { OsvDevProvider } from './osv-dev';
import { SourcecraftAppSecProvider } from './sourcecraft-appsec';
import type { SecurityProvider } from './types';

export type SecurityProviderName = 'osv_dev' | 'sourcecraft_appsec';

let cached: SecurityProvider | null = null;
let cachedName: SecurityProviderName | null = null;

export function getSecurityProvider(): SecurityProvider {
  const requested = (process.env.SECURITY_PROVIDER as SecurityProviderName | undefined) ?? 'osv_dev';
  if (cached && cachedName === requested) return cached;
  cached = requested === 'sourcecraft_appsec' ? new SourcecraftAppSecProvider() : new OsvDevProvider();
  cachedName = requested;
  return cached;
}

export function resetSecurityProviderForTesting(): void {
  cached = null;
  cachedName = null;
}
