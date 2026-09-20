import { describe, expect, it } from 'vitest';
import { parseLockfiles } from '../lockfiles';

describe('parseLockfiles — package-lock.json v3', () => {
  const packageLockJson = JSON.stringify({
    name: 'demo',
    lockfileVersion: 3,
    packages: {
      '': { name: 'demo', version: '0.1.0' },
      'node_modules/left-pad': { version: '1.3.0' },
      'node_modules/@scope/thing': { version: '2.0.0' },
      'node_modules/foo/node_modules/bar': { version: '3.4.5' },
    },
  });

  it('вытаскивает все три пакета', () => {
    const result = parseLockfiles({ packageLockJson });
    const names = result.dependencies.map((d) => `${d.name}@${d.version}`).sort();
    expect(names).toEqual(['@scope/thing@2.0.0', 'bar@3.4.5', 'left-pad@1.3.0']);
  });

  it('всё в ecosystem: npm', () => {
    const result = parseLockfiles({ packageLockJson });
    expect(result.dependencies.every((d) => d.ecosystem === 'npm')).toBe(true);
  });
});

describe('parseLockfiles — pnpm-lock.yaml', () => {
  it('парсит формат v9 (snapshots) и режет peer-часть', () => {
    const yamlText = [
      "lockfileVersion: '9.0'",
      'packages:',
      '  react@18.3.0:',
      '    resolution: {integrity: sha512-xxx}',
      "  '@types/node@20.0.0':",
      '    resolution: {integrity: sha512-yyy}',
      'snapshots:',
      "  react@18.3.0(peer@1.0.0)':",
      '    dependencies: {}',
    ].join('\n');
    const result = parseLockfiles({ pnpmLockYaml: yamlText });
    const names = result.dependencies.map((d) => `${d.name}@${d.version}`).sort();
    expect(names).toContain('react@18.3.0');
    expect(names).toContain('@types/node@20.0.0');
  });
});

describe('parseLockfiles — unsupported', () => {
  it('прокидывает unsupported наружу', () => {
    const result = parseLockfiles({ unsupportedFound: ['Cargo.lock', 'go.sum'] });
    expect(result.unsupported).toEqual(['Cargo.lock', 'go.sum']);
    expect(result.dependencies).toEqual([]);
  });
});
