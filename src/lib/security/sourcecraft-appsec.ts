// Заглушка провайдера, соответствующая SourceCraft AppSec.
// Результатов у AppSec в публичном REST API сейчас нет —
// возвращаем «нет данных» с честной пометкой в missing.

import type { SecurityProvider, SecurityScanInput, SecurityScanResult } from './types';

export class SourcecraftAppSecProvider implements SecurityProvider {
  readonly name = 'sourcecraft_appsec' as const;

  async scan(_input: SecurityScanInput): Promise<SecurityScanResult> {
    return {
      provider: this.name,
      available: false,
      vulnerabilities: [],
      totalScanned: 0,
      errors: [],
      missing: ['sourcecraft_appsec_not_public'],
    };
  }
}
