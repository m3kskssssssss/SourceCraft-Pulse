// Статьи раздела «Статьи»: типизированные объекты в коде, без базы и MDX.
// Тело — список блоков, чтобы вёрстку держал один компонент, а время чтения
// считалось по тем же словам, что видит читатель.

import type { CategoryKey } from '../scoring/types';

export const LEVELS = ['junior', 'middle', 'senior'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};

/**
 * Тематика статьи — та же категория, что в оценке репозитория: статья учит
 * подтягивать именно её. Подписи и цвета — из lib/category-meta.ts.
 */
export type Topic = CategoryKey;
export const TOPICS: readonly Topic[] = ['code', 'docs', 'activity', 'security'];

/** Сцены 8-битных анимаций для карточек — см. components/learn/scenes.ts. */
export type SceneId =
  | 'tank-wall'
  | 'signpost'
  | 'block-tower'
  | 'bus-pulse'
  | 'footprints'
  | 'bridge'
  | 'tightrope'
  | 'parcel-slot'
  | 'chain-lift'
  | 'space-shooter'
  | 'whack-a-mole'
  | 'rocket-launch'
  | 'fire-hose'
  | 'gate-guard'
  | 'pit-stop'
  | 'boss-slime'
  | 'ninja-slice'
  | 'relay-race'
  | 'grapple-climb'
  | 'meteor-defense'
  | 'hoop-shot';

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
  | 'metric-loop'
  | 'commit-anatomy'
  | 'commit-log-compare'
  | 'atomic-commits'
  | 'license-default'
  | 'license-spectrum'
  | 'test-pyramid'
  | 'test-risk-map'
  | 'flaky-trust'
  | 'pr-size-attention'
  | 'pr-split'
  | 'ci-trust-map'
  | 'pin-tag-vs-sha'
  | 'token-scope'
  | 'gitignore-layers'
  | 'repo-weight'
  | 'lint-vs-format'
  | 'lint-pipeline'
  | 'semver-bump'
  | 'changelog-sections'
  | 'release-flow'
  | 'error-paths'
  | 'log-levels'
  | 'structured-log'
  | 'protected-branch'
  | 'codeowners-map'
  | 'incident-timeline'
  | 'five-whys'
  | 'action-items'
  | 'contrib-funnel'
  | 'good-first-issue'
  | 'adr-anatomy'
  | 'adr-lifecycle'
  | 'todo-lifecycle'
  | 'debt-interest'
  | 'file-size-histogram'
  | 'split-by-responsibility'
  | 'cvss-vector'
  | 'vuln-triage'
  | 'issue-states'
  | 'issue-backlog-age';

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
  topic: Topic;
  tags: string[];
  scene: SceneId;
  /** ISO-дата публикации. */
  published: string;
  body: Block[];
};
