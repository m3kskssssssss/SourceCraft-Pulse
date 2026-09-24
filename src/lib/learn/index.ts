// Каталог статей и фильтры списка. Всё считается на сервере из объектов в коде.

import { ciSupplyChain } from './articles/ci-supply-chain';
import { commitsWorthReading } from './articles/commits-worth-reading';
import { dependenciesWithoutSurprises } from './articles/dependencies-without-surprises';
import { healthMetricsThatDontLie } from './articles/health-metrics-that-dont-lie';
import { licenseInFiveMinutes } from './articles/license-in-five-minutes';
import { readmeFirstScreen } from './articles/readme-first-screen';
import { secretsInGit } from './articles/secrets-in-git';
import { smallPullRequests } from './articles/small-pull-requests';
import { testsYouCanTrust } from './articles/tests-you-can-trust';
import { readingMinutes, timeBucket, type TimeBucket } from './reading-time';
import { LEVELS, type Article, type Level } from './types';

export type ArticleSummary = Omit<Article, 'body'> & { minutes: number };

const ALL: Article[] = [
  secretsInGit,
  readmeFirstScreen,
  commitsWorthReading,
  licenseInFiveMinutes,
  dependenciesWithoutSurprises,
  testsYouCanTrust,
  smallPullRequests,
  healthMetricsThatDontLie,
  ciSupplyChain,
];

function summarize(article: Article): ArticleSummary {
  const { body, ...rest } = article;
  return { ...rest, minutes: readingMinutes(body) };
}

export function getArticle(slug: string): (Article & { minutes: number }) | null {
  const article = ALL.find((a) => a.slug === slug);
  return article ? { ...article, minutes: readingMinutes(article.body) } : null;
}

export function allSlugs(): string[] {
  return ALL.map((a) => a.slug);
}

export type ArticleFilter = { q?: string; levels?: Level[]; time?: TimeBucket };

/** Поиск по заголовку, описанию, тегам и тексту статьи, без учёта регистра. */
export function listArticles(filter: ArticleFilter = {}): ArticleSummary[] {
  const q = filter.q?.trim().toLowerCase();
  return ALL.filter((a) => {
    if (filter.levels?.length && !filter.levels.includes(a.level)) return false;
    if (filter.time && timeBucket(readingMinutes(a.body)) !== filter.time) return false;
    if (q) {
      const haystack = [a.title, a.summary, ...a.tags, ...a.body.map(blockText)].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  })
    .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
    .map(summarize);
}

function blockText(block: Article['body'][number]): string {
  switch (block.type) {
    case 'list':
      return block.items.join(' ');
    case 'code':
      return block.code;
    case 'figure':
      return block.caption;
    default:
      return block.text;
  }
}
