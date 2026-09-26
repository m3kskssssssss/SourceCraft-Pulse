import { describe, expect, it } from 'vitest';
import { lineDiff } from '../edits';
import { pullRequestDescription, summarizeGains, type ProposalItem } from '../proposal';

function item(over: Partial<ProposalItem> & Pick<ProposalItem, 'id' | 'section'>): ProposalItem {
  return {
    source: 'template',
    action: 'create',
    path: `${over.id}.md`,
    title: `Пункт ${over.id}`,
    why: 'Зачем',
    baseOid: null,
    content: 'x\n',
    diff: lineDiff('', 'x\n'),
    gain: 1,
    ...over,
  };
}

describe('summarizeGains', () => {
  const items = [
    item({ id: 'a', section: 'docs', gain: 3 }),
    item({ id: 'b', section: 'docs', gain: 2.5 }),
    item({ id: 'c', section: 'code', gain: 4 }),
    item({ id: 'd', section: 'code', gain: null }),
  ];
  const caps = { docs: 100, code: 100, total: 100 };

  it('складывает только отмеченные пункты по разделам', () => {
    expect(summarizeGains(items, new Set(['a', 'c', 'd']), caps)).toEqual({ docs: 3, code: 4, total: 7 });
    expect(summarizeGains(items, new Set(['a', 'b']), caps)).toEqual({ docs: 5.5, code: 0, total: 5.5 });
  });

  it('не обещает больше потолка раздела и общего до 100', () => {
    expect(summarizeGains(items, new Set(['a', 'b', 'c']), { docs: 4, code: 100, total: 6 })).toEqual({
      docs: 4,
      code: 4,
      total: 6,
    });
  });
});

describe('pullRequestDescription', () => {
  it('делит правки на документацию и код и предупреждает о непроверенном коде', () => {
    const text = pullRequestDescription(
      [
        item({ id: 'lic', section: 'docs', title: 'Добавить LICENSE (MIT)', path: 'LICENSE' }),
        item({ id: 'fix', section: 'code', source: 'ai', action: 'modify', title: 'Обработать ошибку', path: 'src/a.ts' }),
      ],
      null,
    );
    expect(text).toContain('## Документация');
    expect(text).toContain('### Добавить LICENSE (MIT)');
    expect(text).toContain('## Код');
    expect(text).toContain('`src/a.ts` — изменение, подготовлено ИИ');
    expect(text).toContain('не проверялись запуском');
  });
});
