// Статьи раздела «Статьи»: типизированные объекты в коде, без базы и MDX.
// Тело — список блоков, чтобы вёрстку держал один компонент, а время чтения
// считалось по тем же словам, что видит читатель.

export const LEVELS = ['junior', 'middle', 'senior'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};

/** Сцены 8-битных анимаций для карточек — см. components/learn/scenes.ts. */
export type SceneId = 'tank-wall' | 'signpost' | 'block-tower' | 'bus-pulse';

/** Иллюстрации внутри статей — см. components/learn/Figures.tsx. */
export type FigureId =
  | 'secret-history'
  | 'secret-flow'
  | 'secret-response'
  | 'readme-first-screen'
  | 'readme-depth'
  | 'semver-ranges'
  | 'lockfile-tree'
  | 'update-cadence'
  | 'bus-factor-share'
  | 'activity-shapes'
  | 'metric-loop';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'code'; code: string; lang?: string }
  | { type: 'note'; text: string }
  | { type: 'figure'; id: FigureId; caption: string };

export type Article = {
  slug: string;
  title: string;
  /** Одна строка для карточки. */
  summary: string;
  level: Level;
  tags: string[];
  scene: SceneId;
  /** ISO-дата публикации. */
  published: string;
  body: Block[];
};
