// Предложение pull request: что хранится в improvement_proposals и как
// считается ожидаемый прирост балла.
//
// Без БД и сети: этот модуль импортирует и клиентский блок на странице
// анализа — он пересчитывает «≈ +N баллов» при каждой галочке.

import type { LineDiff } from './edits';

export type ProposalSection = 'docs' | 'code';

export type ProposalItem = {
  /** Уникален внутри предложения: из браузера приходят только id. */
  id: string;
  section: ProposalSection;
  /** Шаблон Pulse или правка модели. */
  source: 'template' | 'ai';
  action: 'create' | 'modify';
  path: string;
  title: string;
  /** Зачем — для экрана и описания PR. */
  why: string;
  /** Что проверить перед слиянием. */
  note?: string;
  /** Версия файла, от которой считалась правка; null — файл создаётся. */
  baseOid: string | null;
  /** Итоговое содержимое файла — ровно оно уйдёт в PR. */
  content: string;
  diff: LineDiff;
  /** Ожидаемый прирост общего балла; null — оценить не вышло. */
  gain: number | null;
};

export type ProposalNotes = {
  /** Почему ИИ не предложил правок в разделе — показываем честно. */
  docs: string | null;
  code: string | null;
  /** Правки модели, которые не прошли проверку: фрагмент не нашёлся и т. п. */
  rejected: Array<{ path: string; reason: string }>;
  /** Больше этого раздел не добавит: категория не бывает выше 100. */
  caps: { docs: number; code: number; total: number };
};

export const PROPOSAL_STAGES = [
  { key: 'clone', label: 'Скачиваем репозиторий' },
  { key: 'read', label: 'Читаем документацию и код' },
  { key: 'ai', label: 'Модель готовит правки' },
  { key: 'check', label: 'Проверяем и собираем дифф' },
] as const;

export function proposalStageLabel(key: string | null | undefined): string {
  return PROPOSAL_STAGES.find((s) => s.key === key)?.label ?? 'Готовим изменения';
}

/**
 * Ожидаемый прирост по разделам для выбранных пунктов. Приросты складываются,
 * но не больше потолка раздела и общего «до 100»: обещать больше, чем
 * возможно, нельзя. Это оценка, а не гарантия — на экране так и пишем.
 */
export function summarizeGains(
  items: ProposalItem[],
  selected: ReadonlySet<string>,
  caps: ProposalNotes['caps'],
): { docs: number; code: number; total: number } {
  const sum = (section: ProposalSection) =>
    items
      .filter((item) => item.section === section && selected.has(item.id))
      .reduce((acc, item) => acc + (item.gain ?? 0), 0);
  const docs = Math.min(sum('docs'), caps.docs);
  const code = Math.min(sum('code'), caps.code);
  const total = Math.min(docs + code, caps.total);
  return { docs: round1(docs), code: round1(code), total: round1(total) };
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Текст описания PR: что меняется и почему, по разделам. */
export function pullRequestDescription(items: ProposalItem[], analysisUrl: string | null): string {
  const section = (key: ProposalSection, title: string) => {
    const list = items.filter((item) => item.section === key);
    if (list.length === 0) return [];
    return [
      `## ${title}`,
      '',
      ...list.flatMap((item) => [
        `### ${item.title}`,
        '',
        `\`${item.path}\` — ${item.action === 'create' ? 'новый файл' : 'изменение'}${
          item.source === 'ai' ? ', подготовлено ИИ' : ''
        }`,
        '',
        item.why,
        ...(item.note ? ['', `> ${item.note}`] : []),
        '',
      ]),
    ];
  };
  const hasAiCode = items.some((item) => item.section === 'code' && item.source === 'ai');
  const lines = [
    'Pulse предлагает улучшения документации и кода. Слить или нет — решение за вами.',
    '',
    ...section('docs', 'Документация'),
    ...section('code', 'Код'),
  ];
  if (hasAiCode) {
    lines.push(
      '> ⚠ Правки кода подготовлены моделью и не проверялись запуском сборки или тестов. Прогоните их локально перед слиянием.',
      '',
    );
  }
  if (analysisUrl) lines.push(`Оценка репозитория, по которой собраны изменения: ${analysisUrl}`);
  return lines.join('\n');
}
